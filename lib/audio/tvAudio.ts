export const tvAudioEnabledStorageKey = "hoster-live:tv-audio-enabled";
export const tvAudioVolumeStorageKey = "hoster-live:tv-audio-volume";

export type TvAudioSound = "countdown" | "start" | "card" | "winner" | "standby";

type AudioMap = Record<TvAudioSound, string>;

const soundSources: AudioMap = {
  countdown: "/audio/countdown-tick.wav",
  start: "/audio/game-start.wav",
  card: "/audio/card-cantada.wav",
  winner: "/audio/winner.wav",
  standby: "/audio/standby-loop.wav",
};

const soundCache = new Map<TvAudioSound, HTMLAudioElement>();
let standbyAudio: HTMLAudioElement | null = null;

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function hasAudioElement() {
  return typeof window !== "undefined" && typeof window.Audio !== "undefined";
}

function clampVolume(volume: number) {
  if (!Number.isFinite(volume)) {
    return 0.8;
  }

  return Math.max(0, Math.min(1, volume));
}

function createAudioElement(sound: TvAudioSound) {
  const audio = new Audio(soundSources[sound]);
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  audio.volume = getStoredTvAudioVolume();
  return audio;
}

function ensureAudio(sound: TvAudioSound) {
  if (!hasAudioElement()) {
    return null;
  }

  const cached = soundCache.get(sound);
  if (cached) {
    return cached;
  }

  const audio = createAudioElement(sound);
  soundCache.set(sound, audio);
  return audio;
}

export function getStoredTvAudioEnabled() {
  if (!hasLocalStorage()) {
    return false;
  }

  return window.localStorage.getItem(tvAudioEnabledStorageKey) === "true";
}

export function setStoredTvAudioEnabled(enabled: boolean) {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.setItem(tvAudioEnabledStorageKey, String(enabled));
}

export function getStoredTvAudioVolume() {
  if (!hasLocalStorage()) {
    return 0.8;
  }

  const rawValue = window.localStorage.getItem(tvAudioVolumeStorageKey);
  return clampVolume(rawValue ? Number(rawValue) : 0.8);
}

export function setStoredTvAudioVolume(volume: number) {
  if (!hasLocalStorage()) {
    return;
  }

  const safeVolume = clampVolume(volume);
  window.localStorage.setItem(tvAudioVolumeStorageKey, String(safeVolume));
}

export function preloadTvAudio() {
  if (!hasAudioElement()) {
    return;
  }

  (Object.keys(soundSources) as TvAudioSound[]).forEach((sound) => {
    const audio = ensureAudio(sound);
    if (audio) {
      audio.load();
    }
  });
}

export async function unlockTvAudio() {
  const audio = ensureAudio("start");

  if (!audio) {
    setStoredTvAudioEnabled(true);
    return true;
  }

  try {
    audio.currentTime = 0;
    audio.volume = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = getStoredTvAudioVolume();
    setStoredTvAudioEnabled(true);
    return true;
  } catch {
    setStoredTvAudioEnabled(false);
    return false;
  }
}

export function stopTvAudio() {
  soundCache.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });

  if (standbyAudio) {
    standbyAudio.pause();
    standbyAudio.currentTime = 0;
  }
}

export function playTvSound(sound: Exclude<TvAudioSound, "standby">, enabled = getStoredTvAudioEnabled()) {
  if (!enabled) {
    return false;
  }

  const audio = ensureAudio(sound);

  if (!audio) {
    return false;
  }

  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = getStoredTvAudioVolume();
    void audio.play();
    return true;
  } catch {
    return false;
  }
}

export function startStandbyAudio(enabled = getStoredTvAudioEnabled()) {
  if (!enabled) {
    stopStandbyAudio();
    return false;
  }

  const audio = ensureAudio("standby");

  if (!audio) {
    return false;
  }

  try {
    if (standbyAudio !== audio) {
      stopStandbyAudio();
      standbyAudio = audio;
    }

    standbyAudio.loop = true;
    standbyAudio.volume = getStoredTvAudioVolume() * 0.55;
    if (standbyAudio.paused) {
      void standbyAudio.play();
    }
    return true;
  } catch {
    return false;
  }
}

export function stopStandbyAudio() {
  if (!standbyAudio) {
    return;
  }

  standbyAudio.pause();
  standbyAudio.currentTime = 0;
}
