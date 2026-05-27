export const tvAudioEnabledStorageKey = "hoster-live:tv-audio-enabled";
export const tvAudioVolumeStorageKey = "hoster-live:tv-audio-volume";

export type TvAudioSound = "countdown" | "start" | "card" | "winner" | "standby";

export type TvAudioPlayResult =
  | { ok: true; source: string }
  | { ok: false; error: string; source?: string };

type SoundSources = Record<TvAudioSound, { mp3: string; wav: string }>;

const soundSources: SoundSources = {
  countdown: {
    mp3: "/audio/countdown-tick.mp3",
    wav: "/audio/countdown-tick.wav",
  },
  start: {
    mp3: "/audio/game-start.mp3",
    wav: "/audio/game-start.wav",
  },
  card: {
    mp3: "/audio/card-cantada.mp3",
    wav: "/audio/card-cantada.wav",
  },
  winner: {
    mp3: "/audio/winner.mp3",
    wav: "/audio/winner.wav",
  },
  standby: {
    mp3: "/audio/standby-loop.mp3",
    wav: "/audio/standby-loop.wav",
  },
};

const activeOneShotAudios = new Set<HTMLAudioElement>();
let standbyAudio: HTMLAudioElement | null = null;

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function hasAudioElement() {
  return typeof window !== "undefined" && typeof window.Audio !== "undefined";
}

function clampVolume(volume: number) {
  if (!Number.isFinite(volume)) {
    return 0.65;
  }

  return Math.max(0, Math.min(1, volume));
}

function formatAudioError(error: unknown) {
  if (error instanceof DOMException) {
    return `${error.name}: ${error.message}`;
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return typeof error === "string" ? error : "Error de audio desconocido";
}

function getSourceList(sound: TvAudioSound) {
  const sources = soundSources[sound];
  return [sources.mp3, sources.wav];
}

function trackOneShotAudio(audio: HTMLAudioElement) {
  activeOneShotAudios.add(audio);
  const cleanup = () => {
    audio.removeEventListener("ended", cleanup);
    audio.removeEventListener("error", cleanup);
    activeOneShotAudios.delete(audio);
  };

  audio.addEventListener("ended", cleanup);
  audio.addEventListener("error", cleanup);
}

function createAudioElement(source: string, volume: number, loop = false) {
  const audio = new Audio(source);
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  audio.loop = loop;
  audio.muted = false;
  audio.volume = clampVolume(volume);
  audio.load();
  return audio;
}

async function playSource(source: string, volume: number, loop = false) {
  const audio = createAudioElement(source, volume, loop);

  if (!loop) {
    trackOneShotAudio(audio);
  }

  try {
    const result = audio.play();
    if (result && typeof result.then === "function") {
      await result;
    }

    return { ok: true as const, source };
  } catch (error) {
    if (!loop) {
      activeOneShotAudios.delete(audio);
    }

    audio.pause();
    audio.currentTime = 0;
    return { ok: false as const, error: formatAudioError(error), source };
  }
}

async function playWithFallback(sound: TvAudioSound, volume: number, loop = false): Promise<TvAudioPlayResult> {
  const sources = getSourceList(sound);
  let lastError = "";

  for (const source of sources) {
    const result = await playSource(source, volume, loop);
    if (result.ok) {
      return result;
    }

    lastError = result.error;
  }

  return {
    ok: false,
    error: lastError || "No se pudo reproducir el audio",
  };
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
    return 0.65;
  }

  const rawValue = window.localStorage.getItem(tvAudioVolumeStorageKey);
  return clampVolume(rawValue ? Number(rawValue) : 0.65);
}

export function setStoredTvAudioVolume(volume: number) {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.setItem(tvAudioVolumeStorageKey, String(clampVolume(volume)));
}

export function preloadTvAudio() {
  if (!hasAudioElement()) {
    return;
  }

  (Object.keys(soundSources) as TvAudioSound[]).forEach((sound) => {
    const volume = getStoredTvAudioVolume();
    getSourceList(sound).forEach((source) => {
      const audio = createAudioElement(source, volume);
      audio.pause();
    });
  });
}

export async function playTestSound(enabled = getStoredTvAudioEnabled()) {
  if (!enabled) {
    return { ok: false as const, error: "Audio desactivado" };
  }

  return playWithFallback("card", getStoredTvAudioVolume(), false);
}

export async function unlockTvAudio() {
  const result = await playTestSound(true);
  if (result.ok) {
    setStoredTvAudioEnabled(true);
  } else {
    setStoredTvAudioEnabled(false);
  }

  return result;
}

export async function playTvSound(sound: Exclude<TvAudioSound, "standby">, enabled = getStoredTvAudioEnabled()) {
  if (!enabled) {
    return { ok: false as const, error: "Audio desactivado" };
  }

  return playWithFallback(sound, getStoredTvAudioVolume(), false);
}

export function stopTvAudio() {
  activeOneShotAudios.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
  activeOneShotAudios.clear();

  if (standbyAudio) {
    standbyAudio.pause();
    standbyAudio.currentTime = 0;
  }
}

export async function startStandbyAudio(enabled = getStoredTvAudioEnabled()) {
  if (!enabled) {
    stopStandbyAudio();
    return { ok: false as const, error: "Audio desactivado" };
  }

  const volume = getStoredTvAudioVolume() * 0.55;
  const sources = getSourceList("standby");
  let lastError = "";

  for (const source of sources) {
    const audio = createAudioElement(source, volume, true);

    try {
      const result = audio.play();
      if (result && typeof result.then === "function") {
        await result;
      }

      if (standbyAudio && standbyAudio !== audio) {
        standbyAudio.pause();
        standbyAudio.currentTime = 0;
      }

      standbyAudio = audio;
      return { ok: true as const, source };
    } catch (error) {
      lastError = formatAudioError(error);
    }
  }

  return { ok: false as const, error: lastError || "No se pudo reproducir audio de espera" };
}

export function stopStandbyAudio() {
  if (!standbyAudio) {
    return;
  }

  standbyAudio.pause();
  standbyAudio.currentTime = 0;
}
