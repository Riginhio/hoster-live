import type { WinMode } from "@/lib/loteria";
import { calculatePrize, getRestaurantById } from "@/lib/restaurants";

export type DemoGameConfig = {
  restaurantId: string;
  activeTables: number;
  mode: WinMode;
  tablePrice: number;
  commissionPercent: number;
  calculatedPrize: number;
  createdAt?: string;
};

export const configStorageKey = "loteria:demo-config";
export const defaultRestaurantId = "rancho-viejo";

const modes: WinMode[] = ["four_corners", "x_shape", "center_four"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asMode(value: unknown) {
  return typeof value === "string" && modes.includes(value as WinMode)
    ? (value as WinMode)
    : undefined;
}

export function createDefaultDemoConfig(restaurantId = defaultRestaurantId): DemoGameConfig {
  const restaurant = getRestaurantById(restaurantId);
  const activeTables = restaurant.allowedTableCounts[restaurant.allowedTableCounts.length - 1];
  const tablePrice = restaurant.allowedPrices[0];
  const commissionPercent = restaurant.commissionPercent;

  return {
    restaurantId: restaurant.id,
    activeTables,
    mode: restaurant.allowedModes[0],
    tablePrice,
    commissionPercent,
    calculatedPrize: calculatePrize(activeTables, tablePrice, commissionPercent),
  };
}

export function normalizeDemoConfig(
  value: unknown,
  fallbackRestaurantId = defaultRestaurantId,
): DemoGameConfig {
  if (!isRecord(value)) {
    return createDefaultDemoConfig(fallbackRestaurantId);
  }

  const rawRestaurantId =
    typeof value.restaurantId === "string" ? value.restaurantId : fallbackRestaurantId;
  const restaurant = getRestaurantById(rawRestaurantId);
  const activeTables =
    asNumber(value.activeTables) ??
    asNumber(value.activeBoards) ??
    restaurant.allowedTableCounts[restaurant.allowedTableCounts.length - 1];
  const tablePrice =
    asNumber(value.tablePrice) ?? asNumber(value.pricePerBoard) ?? restaurant.allowedPrices[0];
  const commissionPercent = asNumber(value.commissionPercent) ?? restaurant.commissionPercent;
  const mode = asMode(value.mode) ?? restaurant.allowedModes[0];
  const safeActiveTables = restaurant.allowedTableCounts.includes(activeTables)
    ? activeTables
    : restaurant.allowedTableCounts[restaurant.allowedTableCounts.length - 1];
  const safeTablePrice = restaurant.allowedPrices.includes(tablePrice)
    ? tablePrice
    : restaurant.allowedPrices[0];
  const safeMode = restaurant.allowedModes.includes(mode) ? mode : restaurant.allowedModes[0];

  return {
    restaurantId: restaurant.id,
    activeTables: safeActiveTables,
    mode: safeMode,
    tablePrice: safeTablePrice,
    commissionPercent,
    calculatedPrize:
      asNumber(value.calculatedPrize) ??
      calculatePrize(safeActiveTables, safeTablePrice, commissionPercent),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
  };
}

export function parseStoredDemoConfig(
  rawValue: string | null,
  fallbackRestaurantId = defaultRestaurantId,
) {
  if (!rawValue) {
    return createDefaultDemoConfig(fallbackRestaurantId);
  }

  try {
    return normalizeDemoConfig(JSON.parse(rawValue), fallbackRestaurantId);
  } catch {
    return createDefaultDemoConfig(fallbackRestaurantId);
  }
}
