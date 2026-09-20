import { CalculatedAlarm } from '../types';

let swRegistration: ServiceWorkerRegistration | null = null;

export interface ScheduledBackgroundAlarm {
  id: string;
  title: string;
  targetTime: string;
  alarmTriggerTime: string;
  triggerTimestamp: number;
  advanceMinutes: number;
  message: string;
}

/**
 * Register Service Worker for PWA & Background Alarms
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported in this browser.');
    return null;
  }

  try {
    // Use a base-relative path so it works on GitHub Pages subpaths (e.g. /Compensador-de-horas/)
    const swUrl = new URL('./sw.js', window.location.href).href;
    const scopeUrl = new URL('./', window.location.href).href;
    const reg = await navigator.serviceWorker.register(swUrl, { scope: scopeUrl });
    swRegistration = reg;
    console.log('[BackgroundAlarmManager] Service Worker registered:', reg);
    return reg;
  } catch (err) {
    console.error('[BackgroundAlarmManager] SW registration failed:', err);
    return null;
  }
}

/**
 * Converts a "HH:MM" time string today to an epoch timestamp in milliseconds.
 */
function getTimestampForTimeToday(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
    0
  );
  return target.getTime();
}

/**
 * Syncs current calculated upcoming alarms with the Service Worker and IndexedDB
 */
export async function syncUpcomingAlarmsWithSW(
  alarms: CalculatedAlarm[],
  advanceMinutes: number = 2
): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const nowMs = Date.now();
  const scheduled: ScheduledBackgroundAlarm[] = [];

  alarms.forEach((alarm) => {
    if (!alarm.enabled || !alarm.alarmTriggerTime || alarm.alarmTriggerTime === '--:--') return;

    const triggerMs = getTimestampForTimeToday(alarm.alarmTriggerTime);
    // Only schedule alarms that are in the future (or within the next minute)
    if (triggerMs > nowMs - 60000) {
      scheduled.push({
        id: alarm.id,
        title: alarm.title,
        targetTime: alarm.scheduledTargetTime,
        alarmTriggerTime: alarm.alarmTriggerTime,
        triggerTimestamp: triggerMs,
        advanceMinutes,
        message: `Faltam ${advanceMinutes} minuto${advanceMinutes > 1 ? 's' : ''} para sua marcação de ${alarm.title} às ${alarm.scheduledTargetTime}!`,
      });
    }
  });

  const worker = navigator.serviceWorker.controller || (await navigator.serviceWorker.ready).active;
  if (worker) {
    worker.postMessage({
      type: 'SCHEDULE_ALARMS',
      payload: scheduled,
    });
  }
}

/**
 * Requests the Service Worker to send a test notification after a delay (e.g. 5 seconds)
 * to allow the user to minimize/close the app and test background delivery.
 */
export async function triggerTestBackgroundNotification(delaySeconds: number = 5): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  // Ensure notification permission is requested
  if ('Notification' in window && Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
  }

  const worker = navigator.serviceWorker.controller || (await navigator.serviceWorker.ready).active;
  if (worker) {
    worker.postMessage({
      type: 'TEST_NOTIFICATION_AFTER_DELAY',
      payload: { delayMs: delaySeconds * 1000 },
    });
    return true;
  }
  return false;
}

/**
 * Returns summary info on SW & Notification readiness
 */
export function getBackgroundAlarmCapabilities() {
  const isSWSupported = 'serviceWorker' in navigator;
  const isNotificationSupported = 'Notification' in window;
  const permission = isNotificationSupported ? Notification.permission : 'unsupported';
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  return {
    isSWSupported,
    isNotificationSupported,
    permission,
    isStandalone,
  };
}
