import type { WinMode } from "@/lib/loteria";
import { getRestaurantById } from "@/lib/restaurants/restaurantStorage";
import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";

export type LastGameConfig = {
  activeTables: number;
  tablePrice: number;
  mode: WinMode;
  createdAt: string;
  gameType?: "normal_30" | "normal_50" | "special";
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
    gameType:
      value.gameType === "normal_30" || value.gameType === "normal_50" || value.gameType === "special"
        ? value.gameType
        : undefined,
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
          const [rawRestaurantId, gameType] = restaurantId.split(":");
          const slug = getRestaurantById(rawRestaurantId)?.id ?? normalizeRestaurantSlug(rawRestaurantId);
          configs[gameType ? `${slug}:${gameType}` : slug] = normalizedConfig;
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
  const slug = getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId);
  return getLastGameConfigs()[slug] ?? null;
}

export function getLastGameConfigByType(
  restaurantId: string,
  gameType: NonNullable<LastGameConfig["gameType"]>,
) {
  const slug = getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId);
  return getLastGameConfigs()[`${slug}:${gameType}`] ?? null;
}

export function saveLastGameConfig(restaurantId: string, config: LastGameConfig) {
  const slug = getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId);
  const configs = {
    ...getLastGameConfigs(),
    [slug]: config,
  };

  if (hasLocalStorage()) {
    window.localStorage.setItem(lastGameConfigStorageKey, JSON.stringify(configs));
  }

  return config;
}

export function saveLastGameConfigByType(
  restaurantId: string,
  gameType: NonNullable<LastGameConfig["gameType"]>,
  config: LastGameConfig,
) {
  const slug = getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId);
  const nextConfig = { ...config, gameType };
  const configs = {
    ...getLastGameConfigs(),
    [`${slug}:${gameType}`]: nextConfig,
  };

  if (hasLocalStorage()) {
    window.localStorage.setItem(lastGameConfigStorageKey, JSON.stringify(configs));
  }

  return nextConfig;
}
