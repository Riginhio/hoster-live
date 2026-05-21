import type { RestaurantConfig } from "@/lib/types";

export const restaurants: RestaurantConfig[] = [
  {
    id: "rancho-viejo",
    name: "Rancho Viejo",
    active: true,
    businessType: "restaurante_bar",
    managerName: "Carolina Mendez",
    managerWhatsapp: "8112345678",
    managerEmail: "carolina@ranchoviejo.mx",
    ownerName: "Eduardo Villarreal",
    ownerWhatsapp: "8187654321",
    address: "Av. Revolucion 1200, Monterrey, NL",
    googleMapsUrl: "https://maps.google.com/?q=Rancho+Viejo+Monterrey",
    instagramUrl: "https://instagram.com/ranchoviejo",
    facebookUrl: "https://facebook.com/ranchoviejo",
    tiktokUrl: "",
    averageHostesses: 6,
    strongDays: ["jueves", "viernes", "sabado"],
    estimatedGamesPerWeek: 9,
    audienceType: "Adultos 28-45, grupos despues de oficina y celebraciones.",
    notes: "Cuenta con buena respuesta en noches de musica regional y promociones por mesa.",
    enabledGames: ["loteria"],
    allowedTableCounts: [20, 30, 50],
    allowedPrices: [50, 100, 150, 200, 300],
    commissionPercent: 20,
    allowedModes: ["four_corners", "x_shape", "center_four"],
    theme: {
      primaryColor: "#d9a441",
      secondaryColor: "#1fa187",
    },
  },
  {
    id: "doroteo",
    name: "Doroteo",
    active: true,
    businessType: "antro",
    managerName: "Sofia Garza",
    managerWhatsapp: "8111122233",
    managerEmail: "operacion@doroteo.mx",
    ownerName: "Marco Trevino",
    ownerWhatsapp: "8199988877",
    address: "Calz. San Pedro 410, San Pedro Garza Garcia, NL",
    googleMapsUrl: "https://maps.google.com/?q=Doroteo+San+Pedro",
    instagramUrl: "https://instagram.com/doroteomx",
    facebookUrl: "https://facebook.com/doroteomx",
    tiktokUrl: "https://tiktok.com/@doroteomx",
    averageHostesses: 10,
    strongDays: ["viernes", "sabado"],
    estimatedGamesPerWeek: 6,
    audienceType: "Joven adulto 23-35, alto consumo en fin de semana.",
    notes: "Perfil ideal para activaciones cortas antes del pico de DJ.",
    enabledGames: ["loteria"],
    allowedTableCounts: [20, 30, 50],
    allowedPrices: [100, 150, 200, 300],
    commissionPercent: 25,
    allowedModes: ["four_corners", "x_shape"],
    theme: {
      primaryColor: "#1fa187",
      secondaryColor: "#c0392b",
    },
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
