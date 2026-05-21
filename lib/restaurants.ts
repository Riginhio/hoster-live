import type { WinMode } from "@/lib/loteria";

export type RestaurantConfig = {
  id: string;
  name: string;
  enabledGames: string[];
  allowedTableCounts: number[];
  allowedPrices: number[];
  commissionPercent: number;
  allowedModes: WinMode[];
};

export const restaurants: RestaurantConfig[] = [
  {
    id: "cantina-la-nacional",
    name: "Cantina La Nacional",
    enabledGames: ["loteria"],
    allowedTableCounts: [20, 30, 50],
    allowedPrices: [50, 100, 150, 200, 250, 300],
    commissionPercent: 20,
    allowedModes: ["four_corners", "x_shape", "center_four"],
  },
];

export function calculatePrize(
  activeTables: number,
  tablePrice: number,
  commissionPercent: number,
) {
  return Math.round(activeTables * tablePrice * (1 - commissionPercent / 100));
}

export function getRestaurantById(restaurantId: string) {
  return restaurants.find((restaurant) => restaurant.id === restaurantId) ?? restaurants[0];
}
