/**
 * Audio synthesizer for work alarms using the Web Audio API.
 * Synthesizes an authentic, crisp electronic digital alarm "bip bip" (beep beep)
 * with zero external dependencies, working 100% offline and reliably.
 */

let audioCtx: AudioContext | null = null;
let activeLoopInterval: number | null = null;
let activeGainNodes: GainNode[] = [];

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Creates a single electronic digital beep with clean envelope
 */
function scheduleSingleBeep(
  ctx: AudioContext,
  masterGain: GainNode,
  startTime: number,
  duration: number = 0.085,
  frequency: number = 1100
): void {
  const oscMain = ctx.createOscillator();
  const oscHarmonic = ctx.createOscillator();
  const beepGain = ctx.createGain();

  // Piezo alarm tone blend: pure 1100Hz tone + crisp upper harmonic
  oscMain.type = 'sine';
  oscMain.frequency.setValueAtTime(frequency, startTime);

  oscHarmonic.type = 'triangle';
  oscHarmonic.frequency.setValueAtTime(frequency * 2, startTime);

  // Fast, punchy envelope without audio click/pop
  const attackTime = 0.006;
  const releaseTime = 0.008;

  beepGain.gain.setValueAtTime(0.0001, startTime);
  beepGain.gain.linearRampToValueAtTime(0.85, startTime + attackTime);
  beepGain.gain.setValueAtTime(0.85, startTime + duration - releaseTime);
  beepGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscMain.connect(beepGain);
  oscHarmonic.connect(beepGain);
  beepGain.connect(masterGain);

  activeGainNodes.push(beepGain);

  oscMain.start(startTime);
  oscHarmonic.start(startTime);

  oscMain.stop(startTime + duration + 0.01);
  oscHarmonic.stop(startTime + duration + 0.01);
}

/**
 * Plays the signature electronic "bip-bip" digital alarm pattern.
 * If doubleBurst is true, plays: "bip-bip ... bip-bip" (4 beeps).
 * If false, plays a quick double beep: "bip-bip" (2 beeps).
 */
export function playBeepBeep(volume: number = 0.85, doubleBurst: boolean = true): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.min(1, Math.max(0.05, volume)), now);
    masterGain.connect(ctx.destination);
    activeGainNodes.push(masterGain);

    // Beep 1 & 2: "bip-bip"
    scheduleSingleBeep(ctx, masterGain, now + 0.00, 0.085, 1150);
    scheduleSingleBeep(ctx, masterGain, now + 0.15, 0.085, 1150);

    if (doubleBurst) {
      // Short pause then Beep 3 & 4: "bip-bip"
      scheduleSingleBeep(ctx, masterGain, now + 0.38, 0.085, 1150);
      scheduleSingleBeep(ctx, masterGain, now + 0.53, 0.085, 1150);
    }
  } catch (err) {
    console.error('Failed to play web audio bip-bip:', err);
  }
}

// Backward-compatible alias
export const playChime = (volume: number = 0.85) => playBeepBeep(volume, true);

/**
 * Starts continuous alarm loop: plays the digital "bip-bip ... bip-bip"
 * every 1.6 seconds until dismissed or snoozed.
 */
export function startAlarmLoop(volume: number = 0.85): void {
  stopAlarmLoop();

  // Play immediately
  playBeepBeep(volume, true);

  // Repeat every 1600ms
  activeLoopInterval = window.setInterval(() => {
    playBeepBeep(volume, true);
  }, 1600);
}

/**
 * Stops any playing alarm loop immediately and cuts off all active sound
 */
export function stopAlarmLoop(): void {
  if (activeLoopInterval !== null) {
    window.clearInterval(activeLoopInterval);
    activeLoopInterval = null;
  }

  // Gracefully silence all active sounds
  if (audioCtx) {
    const now = audioCtx.currentTime;
    activeGainNodes.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0, now);
      } catch {
        // Gain node might already be disconnected
      }
    });
    activeGainNodes = [];
  }
}

/**
 * Requests browser notification permission safely
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.warn('Could not request notification permission:', err);
    return 'denied';
  }
}

/**
 * Sends a native system/desktop/mobile notification if granted.
 * Prefers ServiceWorkerRegistration.showNotification for robust background & mobile support.
 */
export async function sendDesktopNotification(title: string, body: string): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    // Vibrate device if supported
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([500, 250, 500, 250, 500]);
      } catch (e) {
        // Ignore vibration errors
      }
    }

    // Try sending via Service Worker registration first (works best on mobile background/PWA)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/favicon.png',
            sound: '/alarm.wav',
            tag: 'work-compensation-alarm',
            renotify: true,
            requireInteraction: true,
            vibrate: [500, 250, 500, 250, 500],
            actions: [
              { action: 'snooze_2', title: '⏱️ Adiar 2 min' },
            ],
          } as NotificationOptions & { renotify?: boolean; vibrate?: number[]; sound?: string; actions?: { action: string; title: string }[] });
          return;
        }
      } catch (err) {
        console.warn('Service Worker notification failed, falling back to window Notification:', err);
      }
    }

    // Fallback standard Notification
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'work-compensation-alarm',
      });
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  }
}

