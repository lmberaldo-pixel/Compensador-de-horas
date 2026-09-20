// Service Worker for Compensador de Horas
// Handles background alarms, notifications, IndexedDB state, and offline triggers

const CACHE_NAME = 'compensador-v1';
const DB_NAME = 'compensador_alarms_db';
const DB_VERSION = 1;
const STORE_NAME = 'scheduled_alarms';

// Standard Lifecycle
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Open or initialize IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save alarms to IndexedDB
async function saveAlarmsToDB(alarms) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // Clear old scheduled items
    await new Promise((res, rej) => {
      const req = store.clear();
      req.onsuccess = res;
      req.onerror = rej;
    });
    // Add new ones
    for (const alarm of alarms) {
      store.put(alarm);
    }
  } catch (err) {
    console.error('[SW] Error saving alarms to IndexedDB:', err);
  }
}

// Read alarms from IndexedDB
async function getAlarmsFromDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[SW] Error reading alarms from IndexedDB:', err);
    return [];
  }
}

// Remove an alarm from IndexedDB once fired
async function removeAlarmFromDB(alarmId) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(alarmId);
  } catch (err) {
    console.error('[SW] Error removing alarm:', err);
  }
}

// Show native notification
async function triggerNotification(alarm) {
  const title = `🔔 Alarme: ${alarm.title || 'Marcação de Ponto'}`;
  const options = {
    body: alarm.message || `Faltam ${alarm.advanceMinutes || 2} minutos para sua marcação às ${alarm.targetTime}!`,
    icon: '/icon-192.png',
    badge: '/favicon.png',
    sound: '/alarm.wav',
    tag: `alarm-${alarm.id || 'generic'}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [500, 250, 500, 250, 500],
    data: {
      alarmId: alarm.id,
      targetTime: alarm.targetTime,
      url: '/',
    },
    actions: [
      { action: 'snooze_2', title: '⏱️ Adiar 2 min' }
    ]
  };

  try {
    await self.registration.showNotification(title, options);
  } catch (err) {
    console.error('[SW] Failed to show notification:', err);
  }
}

// Check due alarms
async function checkDueAlarms() {
  const now = Date.now();
  const alarms = await getAlarmsFromDB();
  
  for (const alarm of alarms) {
    if (alarm.triggerTimestamp && alarm.triggerTimestamp <= now + 30000) {
      // Trigger if due or due within next 30 sec and not already fired
      await triggerNotification(alarm);
      await removeAlarmFromDB(alarm.id);
    }
  }
}

// Interval loop in SW (runs when SW is alive)
setInterval(() => {
  checkDueAlarms();
}, 15000);

// Listen for messages from client windows
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SCHEDULE_ALARMS') {
    const alarms = payload || [];
    saveAlarmsToDB(alarms);

    // Try TimestampTrigger if NotificationTriggers API is supported
    if ('showTrigger' in Notification.prototype && typeof TimestampTrigger !== 'undefined') {
      alarms.forEach((alarm) => {
        if (alarm.triggerTimestamp && alarm.triggerTimestamp > Date.now()) {
          self.registration.showNotification(`🔔 Alarme: ${alarm.title}`, {
            body: alarm.message || `Horário de marcação próximo às ${alarm.targetTime}!`,
            icon: '/icon-192.png',
            badge: '/favicon.png',
            sound: '/alarm.wav',
            tag: `alarm-${alarm.id}`,
            showTrigger: new TimestampTrigger(alarm.triggerTimestamp),
            vibrate: [500, 250, 500, 250, 500],
            data: { alarmId: alarm.id, targetTime: alarm.targetTime, url: '/' },
            actions: [
              { action: 'snooze_2', title: '⏱️ Adiar 2 min' }
            ]
          }).catch(console.warn);
        }
      });
    }
  } else if (type === 'TEST_NOTIFICATION_AFTER_DELAY') {
    const delayMs = payload?.delayMs || 5000;
    setTimeout(() => {
      triggerNotification({
        id: 'test-alarm',
        title: 'Teste de Alarme com App Fechado',
        targetTime: new Date(Date.now() + delayMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: '🎉 Notificação de teste recebida com sucesso! O alarme em segundo plano está ativo e funcionando no seu dispositivo.',
        advanceMinutes: 2,
      });
    }, delayMs);
  } else if (type === 'CLEAR_ALARMS') {
    saveAlarmsToDB([]);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'snooze_2') {
    // Schedule a snooze notification 2 minutes from now
    setTimeout(() => {
      triggerNotification({
        id: 'snoozed-alarm',
        title: 'Lembrete Adiado (2 min)',
        targetTime: '--:--',
        message: 'Aviso adiado: 2 minutos se passaram. Lembre-se de bater seu ponto!',
        advanceMinutes: 2
      });
    }, 2 * 60 * 1000);
    return;
  }

  // Open or focus the app window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_PUNCH_CLICKED', data });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/#alarm-active');
      }
    })
  );
});

// Handle background sync event if triggered by browser
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-alarms') {
    event.waitUntil(checkDueAlarms());
  }
});
