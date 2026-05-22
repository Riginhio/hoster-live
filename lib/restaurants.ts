import { defaultRestaurants, getRestaurantById as getStoredRestaurantById } from "@/lib/storage/restaurants";

export const restaurants = defaultRestaurants;

export function calculatePrize(
  activeTables: number,
  tablePrice: number,
  commissionPercent: number,
) {
  return Math.round(activeTables * tablePrice * (1 - commissionPercent / 100));
}

export function getRestaurantById(restaurantId: string) {
  return getStoredRestaurantById(restaurantId) ?? restaurants[0];
}
