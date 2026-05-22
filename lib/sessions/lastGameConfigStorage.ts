import type { WinMode } from "@/lib/loteria";

export type LastGameConfig = {
  activeTables: number;
  tablePrice: number;
  mode: WinMode;
  createdAt: string;
};

type LastGameConfigByRestaurant = Record<string, LastGameConfig>;

export const lastGameConfigStorageKey = "hoster-live:last-game-config";

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWinMode(value: unknown): value is WinMode {
  return (
    value === "four_corners" ||
    value === "x_shape" ||
    value === "center_four" ||
    value === "full_card"
  );
}

function normalizeConfig(value: unknown): LastGameConfig | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.activeTables !== "number" ||
    typeof value.tablePrice !== "number" ||
    typeof value.createdAt !== "string" ||
    !isWinMode(value.mode)
  ) {
    return null;
  }

  return {
    activeTables: value.activeTables,
    tablePrice: value.tablePrice,
    mode: value.mode,
    createdAt: value.createdAt,
  };
}

function getLastGameConfigs(): LastGameConfigByRestaurant {
  if (!hasLocalStorage()) {
    return {};
  }

  const rawValue = window.localStorage.getItem(lastGameConfigStorageKey);

  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!isRecord(parsedValue)) {
      return {};
    }

    return Object.entries(parsedValue).reduce<LastGameConfigByRestaurant>(
      (configs, [restaurantId, config]) => {
        const normalizedConfig = normalizeConfig(config);

        if (normalizedConfig) {
          configs[restaurantId] = normalizedConfig;
        }

        return configs;
      },
      {},
    );
  } catch {
    return {};
  }
}

export function getLastGameConfig(restaurantId: string) {
  return getLastGameConfigs()[restaurantId] ?? null;
}

export function saveLastGameConfig(restaurantId: string, config: LastGameConfig) {
  const configs = {
    ...getLastGameConfigs(),
    [restaurantId]: config,
  };

  if (hasLocalStorage()) {
    window.localStorage.setItem(lastGameConfigStorageKey, JSON.stringify(configs));
  }

  return config;
}
