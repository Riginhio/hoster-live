export const gameAudioEnabledStorageKey = "hoster-live:audio-enabled";

type BrowserAudioWindow = typeof globalThis & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getAudioContextClass() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const audioWindow = globalThis as BrowserAudioWindow;
  return audioWindow.AudioContext || audioWindow.webkitAudioContext;
}

export function getStoredAudioEnabled() {
  if (!hasLocalStorage()) {
    return false;
  }

  return window.localStorage.getItem(gameAudioEnabledStorageKey) === "true";
}

export function setStoredAudioEnabled(enabled: boolean) {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.setItem(gameAudioEnabledStorageKey, String(enabled));
}

export async function unlockGameAudio() {
  const AudioContextClass = getAudioContextClass();

  if (!AudioContextClass) {
    setStoredAudioEnabled(true);
    return true;
  }

  try {
    const context = new AudioContextClass();

    if (context.state === "suspended") {
      await context.resume();
    }

    const gain = context.createGain();
    const oscillator = context.createOscillator();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    oscillator.frequency.setValueAtTime(220, context.currentTime);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.03);

    window.setTimeout(() => {
      void context.close();
    }, 80);

    setStoredAudioEnabled(true);
    return true;
  } catch {
    setStoredAudioEnabled(false);
    return false;
  }
}

export function playGameTone(kind: "card" | "winner", enabled = getStoredAudioEnabled()) {
  if (!enabled) {
    return;
  }

  const AudioContextClass = getAudioContextClass();

  if (!AudioContextClass) {
    return;
  }

  try {
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(kind === "winner" ? 0.18 : 0.12, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === "winner" ? 0.72 : 0.18));

    const playOscillator = (frequency: number, start: number, duration: number) => {
      const oscillator = context.createOscillator();
      oscillator.type = kind === "winner" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + start);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + start);
      oscillator.stop(context.currentTime + start + duration);
    };

    if (kind === "winner") {
      playOscillator(392, 0, 0.18);
      playOscillator(523.25, 0.16, 0.2);
      playOscillator(659.25, 0.34, 0.28);
    } else {
      playOscillator(740, 0, 0.14);
    }

    window.setTimeout(() => {
      void context.close();
    }, kind === "winner" ? 900 : 280);
  } catch {
    // Browser audio is best-effort and must never break the live screen.
  }
}
