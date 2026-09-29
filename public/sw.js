// Service Worker for Compensador de Horas
// Handles background alarms, notifications, IndexedDB state, and offline triggers

const CACHE_NAME = 'compensador-v2';
const DB_NAME = 'compensador_alarms_db';
const DB_VERSION = 1;
const STORE_NAME = 'scheduled_alarms';

// Files to cache for offline use (including alarm.wav for SW to access)
const FILES_TO_CACHE = [
  './alarm.wav',
  './favicon.png',
  './icon-192.png',
];

// ─── Lifecycle ───────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── IndexedDB helpers ───────────────────────────────────────────────────────

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

async function saveAlarmsToDB(alarms) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise((res, rej) => {
      const req = store.clear();
      req.onsuccess = res;
      req.onerror = rej;
    });
    for (const alarm of alarms) {
      store.put(alarm);
    }
  } catch (err) {
    console.error('[SW] Error saving alarms to IndexedDB:', err);
  }
}

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

// ─── Notification trigger ─────────────────────────────────────────────────────
// NOTE: The `sound` property in NotificationOptions is defined in the Push API spec
// and IS honored by Chrome for Android and some versions of Edge on desktop.
// On iOS Safari and Firefox it may be silently ignored (the OS/browser handles
// its own notification sound instead). This is the ONLY way to play audio from
// a background/closed PWA — Web Audio API is unavailable when the page is inactive.

async function triggerNotification(alarm) {
  const title = `🔔 Alarme: ${alarm.title || 'Marcação de Ponto'}`;

  // Resolve the absolute URL for alarm.wav so the browser can find it
  const alarmSoundUrl = new URL('./alarm.wav', self.location.href).href;

  const options = {
    body: alarm.message || `Faltam ${alarm.advanceMinutes || 2} minutos para sua marcação às ${alarm.targetTime}!`,
    icon: './icon-192.png',
    badge: './favicon.png',
    // 'sound' is the standard Push API notification sound field.
    // Chrome on Android respects this when the URL points to a cached audio file.
    sound: alarmSoundUrl,
    tag: `alarm-${alarm.id || 'generic'}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 800, 300, 800],
    data: {
      alarmId: alarm.id,
      targetTime: alarm.targetTime,
      url: './',
    },
    actions: [
      { action: 'punch_now', title: '✅ Bater Ponto' },
      { action: 'snooze_2',  title: '⏱️ Adiar 2 min' },
    ],
  };

  try {
    await self.registration.showNotification(title, options);
    console.log('[SW] Notification shown for alarm:', alarm.id);
  } catch (err) {
    console.error('[SW] Failed to show notification:', err);
  }
}

// ─── Alarm checker ────────────────────────────────────────────────────────────

async function checkDueAlarms() {
  const now = Date.now();
  const alarms = await getAlarmsFromDB();

  for (const alarm of alarms) {
    if (alarm.triggerTimestamp && alarm.triggerTimestamp <= now + 30000) {
      await triggerNotification(alarm);
      await removeAlarmFromDB(alarm.id);
    }
  }
}

// Poll every 15 seconds while the SW is alive
setInterval(() => {
  checkDueAlarms();
}, 15000);

// ─── Message handler ──────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SCHEDULE_ALARMS') {
    const alarms = payload || [];
    saveAlarmsToDB(alarms);

    // Try TimestampTrigger API if supported (Chrome Origin Trial / experimental)
    if ('showTrigger' in Notification.prototype && typeof TimestampTrigger !== 'undefined') {
      alarms.forEach((alarm) => {
        if (alarm.triggerTimestamp && alarm.triggerTimestamp > Date.now()) {
          const alarmSoundUrl = new URL('./alarm.wav', self.location.href).href;
          self.registration.showNotification(`🔔 Alarme: ${alarm.title}`, {
            body: alarm.message || `Horário de marcação próximo às ${alarm.targetTime}!`,
            icon: './icon-192.png',
            badge: './favicon.png',
            sound: alarmSoundUrl,
            tag: `alarm-${alarm.id}`,
            showTrigger: new TimestampTrigger(alarm.triggerTimestamp),
            vibrate: [400, 150, 400, 150, 800, 300, 800],
            renotify: true,
            requireInteraction: true,
            data: { alarmId: alarm.id, targetTime: alarm.targetTime, url: './' },
            actions: [
              { action: 'punch_now', title: '✅ Bater Ponto' },
              { action: 'snooze_2',  title: '⏱️ Adiar 2 min' },
            ],
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
        message: '🎉 Notificação de teste recebida! O alarme em segundo plano está funcionando.',
        advanceMinutes: 2,
      });
    }, delayMs);

  } else if (type === 'CLEAR_ALARMS') {
    saveAlarmsToDB([]);
  }
});

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'snooze_2') {
    setTimeout(() => {
      triggerNotification({
        id: 'snoozed-alarm',
        title: 'Lembrete Adiado (2 min)',
        targetTime: '--:--',
        message: 'Aviso adiado: 2 minutos se passaram. Lembre-se de bater seu ponto!',
        advanceMinutes: 2,
      });
    }, 2 * 60 * 1000);
    return;
  }

  if (action === 'punch_now') {
    // Open/focus the app and signal that a punch should happen
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({ type: 'NOTIFICATION_PUNCH_NOW', data });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('./#punch-now');
        }
      })
    );
    return;
  }

  // Default click: open/focus the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_PUNCH_CLICKED', data });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./#alarm-active');
      }
    })
  );
});

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'check-alarms') {
    event.waitUntil(checkDueAlarms());
  }
});

// ─── Push event (for future server-side push) ─────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(triggerNotification(data));
  } catch {
    event.waitUntil(triggerNotification({ id: 'push', title: 'Alarme', targetTime: '--:--' }));
  }
});
