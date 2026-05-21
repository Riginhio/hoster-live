import type { BusinessType, RestaurantConfig } from "@/lib/types";

export const restaurantsStorageKey = "loteria:restaurants";

export const demoRestaurant: RestaurantConfig = {
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
  commissionPercent: 20,
  allowedTableCounts: [20, 30, 50],
  allowedPrices: [50, 100, 150, 200, 300],
  allowedModes: ["four_corners", "x_shape", "center_four"],
  enabledGames: ["loteria"],
  theme: {
    primaryColor: "#d9a441",
    secondaryColor: "#1fa187",
  },
};

export const doroteoRestaurant: RestaurantConfig = {
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
  commissionPercent: 25,
  allowedTableCounts: [20, 30, 50],
  allowedPrices: [100, 150, 200, 300],
  allowedModes: ["four_corners", "x_shape"],
  enabledGames: ["loteria"],
  theme: {
    primaryColor: "#1fa187",
    secondaryColor: "#c0392b",
  },
};

export const defaultRestaurants: RestaurantConfig[] = [demoRestaurant, doroteoRestaurant];

const fallbackById = new Map(defaultRestaurants.map((restaurant) => [restaurant.id, restaurant]));

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isBusinessType(value: unknown): value is BusinessType {
  return (
    value === "bar" ||
    value === "restaurante_bar" ||
    value === "antro" ||
    value === "restaurante_hostes" ||
    value === "restaurante_familiar" ||
    value === "salon_eventos" ||
    value === "activacion_temporal" ||
    value === "otro"
  );
}

function normalizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeStringArray(value: unknown, fallback: string[] = []) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fallback;
}

function normalizeRestaurant(value: Partial<RestaurantConfig>): RestaurantConfig {
  const fallback = fallbackById.get(value.id ?? "") ?? demoRestaurant;

  return {
    id: value.id ?? crypto.randomUUID(),
    name: normalizeText(value.name, fallback.name),
    active: value.active ?? true,
    businessType: isBusinessType(value.businessType) ? value.businessType : fallback.businessType,
    managerName: normalizeText(value.managerName, fallback.managerName),
    managerWhatsapp: normalizeText(value.managerWhatsapp, fallback.managerWhatsapp),
    managerEmail: normalizeText(value.managerEmail, fallback.managerEmail),
    ownerName: normalizeText(value.ownerName, fallback.ownerName),
    ownerWhatsapp: normalizeText(value.ownerWhatsapp, fallback.ownerWhatsapp),
    address: normalizeText(value.address, fallback.address),
    googleMapsUrl: normalizeText(value.googleMapsUrl, fallback.googleMapsUrl),
    instagramUrl: normalizeText(value.instagramUrl, fallback.instagramUrl),
    facebookUrl: normalizeText(value.facebookUrl, fallback.facebookUrl),
    tiktokUrl: normalizeText(value.tiktokUrl, fallback.tiktokUrl),
    averageHostesses: normalizeNumber(value.averageHostesses, fallback.averageHostesses),
    strongDays: normalizeStringArray(value.strongDays, fallback.strongDays),
    estimatedGamesPerWeek: normalizeNumber(
      value.estimatedGamesPerWeek,
      fallback.estimatedGamesPerWeek,
    ),
    audienceType: normalizeText(value.audienceType, fallback.audienceType),
    notes: normalizeText(value.notes, fallback.notes),
    commissionPercent: normalizeNumber(value.commissionPercent, fallback.commissionPercent),
    allowedTableCounts: value.allowedTableCounts?.length
      ? value.allowedTableCounts
      : fallback.allowedTableCounts,
    allowedPrices: value.allowedPrices?.length ? value.allowedPrices : fallback.allowedPrices,
    allowedModes: value.allowedModes?.length ? value.allowedModes : fallback.allowedModes,
    enabledGames: value.enabledGames?.length ? value.enabledGames : fallback.enabledGames,
    theme: value.theme ?? fallback.theme ?? {
      primaryColor: "#d9a441",
      secondaryColor: "#1fa187",
    },
  };
}

function mergeDefaultRestaurants(restaurants: RestaurantConfig[]) {
  const knownIds = new Set(restaurants.map((restaurant) => restaurant.id));
  const missingDefaults = defaultRestaurants.filter((restaurant) => !knownIds.has(restaurant.id));

  return [...restaurants, ...missingDefaults];
}

export function getRestaurants(): RestaurantConfig[] {
  if (!hasLocalStorage()) {
    return defaultRestaurants;
  }

  const storedRestaurants = window.localStorage.getItem(restaurantsStorageKey);

  if (!storedRestaurants) {
    saveRestaurants(defaultRestaurants);
    return defaultRestaurants;
  }

  try {
    const parsedRestaurants = JSON.parse(storedRestaurants) as RestaurantConfig[];

    if (!Array.isArray(parsedRestaurants) || parsedRestaurants.length === 0) {
      saveRestaurants(defaultRestaurants);
      return defaultRestaurants;
    }

    const restaurants = mergeDefaultRestaurants(parsedRestaurants.map(normalizeRestaurant));
    saveRestaurants(restaurants);
    return restaurants;
  } catch {
    saveRestaurants(defaultRestaurants);
    return defaultRestaurants;
  }
}

export function saveRestaurants(restaurants: RestaurantConfig[]) {
  if (!hasLocalStorage()) {
    return restaurants;
  }

  window.localStorage.setItem(restaurantsStorageKey, JSON.stringify(restaurants));
  return restaurants;
}

export function createRestaurant(
  restaurant: Omit<RestaurantConfig, "id" | "active" | "enabledGames" | "theme"> &
    Partial<Pick<RestaurantConfig, "id" | "active" | "enabledGames" | "theme">>,
) {
  const restaurants = getRestaurants();
  const createdRestaurant: RestaurantConfig = {
    id: restaurant.id ?? crypto.randomUUID(),
    name: restaurant.name,
    active: restaurant.active ?? true,
    businessType: restaurant.businessType,
    managerName: restaurant.managerName,
    managerWhatsapp: restaurant.managerWhatsapp,
    managerEmail: restaurant.managerEmail,
    ownerName: restaurant.ownerName,
    ownerWhatsapp: restaurant.ownerWhatsapp,
    address: restaurant.address,
    googleMapsUrl: restaurant.googleMapsUrl,
    instagramUrl: restaurant.instagramUrl,
    facebookUrl: restaurant.facebookUrl,
    tiktokUrl: restaurant.tiktokUrl,
    averageHostesses: restaurant.averageHostesses,
    strongDays: restaurant.strongDays,
    estimatedGamesPerWeek: restaurant.estimatedGamesPerWeek,
    audienceType: restaurant.audienceType,
    notes: restaurant.notes,
    commissionPercent: restaurant.commissionPercent,
    allowedTableCounts: restaurant.allowedTableCounts,
    allowedPrices: restaurant.allowedPrices,
    allowedModes: restaurant.allowedModes,
    enabledGames: restaurant.enabledGames ?? ["loteria"],
    theme: restaurant.theme ?? {
      primaryColor: "#d9a441",
      secondaryColor: "#1fa187",
    },
  };

  saveRestaurants([...restaurants, createdRestaurant]);
  return createdRestaurant;
}

export function updateRestaurant(
  restaurantId: string,
  updates: Partial<Omit<RestaurantConfig, "id">>,
) {
  const restaurants = getRestaurants();
  const updatedRestaurants = restaurants.map((restaurant) =>
    restaurant.id === restaurantId ? { ...restaurant, ...updates } : restaurant,
  );

  saveRestaurants(updatedRestaurants);
  return updatedRestaurants.find((restaurant) => restaurant.id === restaurantId);
}

export function toggleRestaurant(restaurantId: string) {
  const restaurants = getRestaurants();
  const updatedRestaurants = restaurants.map((restaurant) =>
    restaurant.id === restaurantId ? { ...restaurant, active: !restaurant.active } : restaurant,
  );

  saveRestaurants(updatedRestaurants);
  return updatedRestaurants.find((restaurant) => restaurant.id === restaurantId);
}
