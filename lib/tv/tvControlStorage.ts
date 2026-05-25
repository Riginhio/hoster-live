export type TvOverrideType = "none" | "banner" | "image" | "message";

export type TvControl = {
  restaurantId: string;
  disabled: boolean;
  overrideType: TvOverrideType;
  message: string;
  imageUrl: string;
  durationSeconds: number;
  visibleUntil: string;
  updatedAt: string;
};

const storageKey = "hoster-live:tv-controls";

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeControl(control: Partial<TvControl> & Pick<TvControl, "restaurantId">): TvControl {
  return {
    restaurantId: control.restaurantId,
    disabled: control.disabled ?? false,
    overrideType: control.overrideType ?? "none",
    message: control.message ?? "",
    imageUrl: control.imageUrl ?? "",
    durationSeconds: control.durationSeconds ?? 15,
    visibleUntil: control.visibleUntil ?? "",
    updatedAt: control.updatedAt ?? new Date().toISOString(),
  };
}

export function getTvControls(): TvControl[] {
  if (!hasLocalStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as TvControl[];
    return Array.isArray(parsed) ? parsed.map(normalizeControl) : [];
  } catch {
    return [];
  }
}

export function getTvControl(restaurantId: string) {
  return getTvControls().find((control) => control.restaurantId === restaurantId);
}

export function upsertTvControl(control: Partial<TvControl> & Pick<TvControl, "restaurantId">) {
  const controls = getTvControls();
  const normalizedControl = normalizeControl({ ...control, updatedAt: new Date().toISOString() });
  const nextControls = [
    normalizedControl,
    ...controls.filter((currentControl) => currentControl.restaurantId !== control.restaurantId),
  ];

  if (hasLocalStorage()) {
    window.localStorage.setItem(storageKey, JSON.stringify(nextControls));
  }

  return normalizedControl;
}

export function sendTvControl(control: Partial<TvControl> & Pick<TvControl, "restaurantId">) {
  const durationSeconds = control.durationSeconds ?? 15;
  return upsertTvControl({
    ...control,
    durationSeconds,
    visibleUntil: new Date(Date.now() + durationSeconds * 1000).toISOString(),
  });
}

export function clearTvControl(restaurantId: string) {
  return upsertTvControl({
    restaurantId,
    disabled: false,
    overrideType: "none",
    message: "",
    imageUrl: "",
    visibleUntil: "",
  });
}
