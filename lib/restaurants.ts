import { defaultRestaurants, getRestaurantById as getStoredRestaurantById } from "@/lib/storage/restaurants";

export const restaurants = defaultRestaurants;

export function calculatePrize(
  activeTables: number,
  tablePrice: number,
  restaurantCommissionPercent: number,
) {
  return Math.round(activeTables * tablePrice * (1 - restaurantCommissionPercent / 100));
}

export function getRestaurantById(restaurantId: string) {
  return getStoredRestaurantById(restaurantId) ?? restaurants[0];
}
