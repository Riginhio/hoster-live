import type { BusinessType, RestaurantConfig } from "@/lib/types";
import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";
import { normalizeDeckId, type GameId } from "@/lib/decks";
import { upsertRestaurantsToSupabase } from "@/lib/supabase/persistence";

export const restaurantsStorageKey = "loteria:restaurants";

export const demoRestaurant: RestaurantConfig = {
  id: "rancho-viejo",
  slug: "rancho-viejo",
  name: "Rancho Viejo",
  logoUrl: "",
  active: true,
  isActive: true,
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
  audienceType: ["Adultos 30 a 45"],
  audienceNotes: "Grupos despues de oficina y celebraciones.",
  notes: "Cuenta con buena respuesta en noches de musica regional y promociones por mesa.",
  restaurantCommissionPercent: 30,
  hlCommissionMode: "fixed",
  hlCommissionValue: 300,
  hlFixedFee: 300,
  activeDeck: "loteria",
  commissionPercent: 20,
  commissionHLPercent: 0,
  commissionRestaurantPercent: 20,
  allowedTableCounts: [20, 30, 50],
  allowedPrices: [50, 100, 150, 200, 300],
  allowedModes: ["four_corners", "x_shape", "center_four", "full_card"],
  enabledGames: ["loteria"],
  activeGames: ["loteria"],
  enabledDecks: ["loteria", "worldcup2026"],
  primaryColor: "#d9a441",
  secondaryColor: "#1fa187",
  accentColor: "#c0392b",
  autoplayDefault: true,
  autoplayInterval: 5000,
  showClock: true,
  showSponsors: true,
  showPromotions: true,
  showQRPromo: true,
  promoTitle: "Noche de Loteria Live",
  promoSubtitle: "Conserva tu tabla y participa hasta el cierre de la jugada.",
  promoImageUrl: "",
  standbyTitle: "HOSTER LIVE",
  standbySubtitle: "La proxima jugada esta por comenzar",
  standbyImageUrl: "",
  standbyPromoText: "Compra tus tablas con tu hostess",
  standbyCtaText: "Pide tu tabla ahora",
  standbyCtaQrUrl: "",
  standbyRotatePromotions: true,
  instagram: "https://instagram.com/ranchoviejo",
  facebook: "https://facebook.com/ranchoviejo",
  tiktok: "",
  qrCampaignId: "",
  theme: {
    primaryColor: "#d9a441",
    secondaryColor: "#1fa187",
  },
};

export const doroteoRestaurant: RestaurantConfig = {
  id: "doroteo",
  slug: "doroteo",
  name: "Doroteo",
  logoUrl: "",
  active: true,
  isActive: true,
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
  audienceType: ["Jovenes"],
  audienceNotes: "Alto consumo en fin de semana.",
  notes: "Perfil ideal para activaciones cortas antes del pico de DJ.",
  restaurantCommissionPercent: 30,
  hlCommissionMode: "fixed",
  hlCommissionValue: 300,
  hlFixedFee: 300,
  activeDeck: "loteria",
  commissionPercent: 25,
  commissionHLPercent: 0,
  commissionRestaurantPercent: 25,
  allowedTableCounts: [20, 30, 50],
  allowedPrices: [100, 150, 200, 300],
  allowedModes: ["four_corners", "x_shape", "full_card"],
  enabledGames: ["loteria"],
  activeGames: ["loteria"],
  enabledDecks: ["loteria", "worldcup2026"],
  primaryColor: "#1fa187",
  secondaryColor: "#c0392b",
  accentColor: "#d9a441",
  autoplayDefault: true,
  autoplayInterval: 3000,
  showClock: true,
  showSponsors: true,
  showPromotions: true,
  showQRPromo: true,
  promoTitle: "Loteria de alto consumo",
  promoSubtitle: "Premios live antes del pico de DJ.",
  promoImageUrl: "",
  standbyTitle: "HOSTER LIVE",
  standbySubtitle: "La proxima jugada esta por comenzar",
  standbyImageUrl: "",
  standbyPromoText: "Compra tus tablas con tu hostess",
  standbyCtaText: "Pide tu tabla ahora",
  standbyCtaQrUrl: "",
  standbyRotatePromotions: true,
  instagram: "https://instagram.com/doroteomx",
  facebook: "https://facebook.com/doroteomx",
  tiktok: "https://tiktok.com/@doroteomx",
  qrCampaignId: "",
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

function normalizeAudienceTypes(value: unknown, fallback: string[] = ["Mixto / general"]) {
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.length > 0 ? value : fallback;
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return fallback;
}

function normalizeGameIds(value: unknown, fallback: GameId[] = ["loteria"]): GameId[] {
  return Array.isArray(value) && value.includes("loteria") ? ["loteria"] : fallback;
}

function normalizeRestaurant(value: Partial<RestaurantConfig>): RestaurantConfig {
  const requestedSlug = normalizeRestaurantSlug(value.slug ?? value.id ?? value.name, demoRestaurant.slug);
  const fallback = fallbackById.get(requestedSlug) ?? fallbackById.get(value.id ?? "") ?? demoRestaurant;
  const slug = normalizeRestaurantSlug(value.slug ?? value.id ?? value.name, fallback.slug);
  const active = value.isActive ?? value.active ?? true;
  const commissionHLPercent = normalizeNumber(value.commissionHLPercent, 0);
  const commissionRestaurantPercent = normalizeNumber(
    value.commissionRestaurantPercent,
    normalizeNumber(value.commissionPercent, fallback.commissionRestaurantPercent),
  );
  const restaurantCommissionPercent = normalizeNumber(
    value.restaurantCommissionPercent,
    commissionRestaurantPercent,
  );
  const legacyCommissionHLAmount = (value as Partial<RestaurantConfig> & { commissionHLAmount?: number }).commissionHLAmount;
  const hlFixedFee = normalizeNumber(
    value.hlFixedFee,
    normalizeNumber(legacyCommissionHLAmount, fallback.hlFixedFee),
  );
  const hlCommissionMode = value.hlCommissionMode === "percent" ? "percent" : "fixed";
  const hlCommissionValue = normalizeNumber(value.hlCommissionValue, hlFixedFee);
  const commissionNetPercent = commissionHLPercent + commissionRestaurantPercent;

  return {
    id: slug,
    slug,
    name: normalizeText(value.name, fallback.name),
    logoUrl: normalizeText(value.logoUrl, fallback.logoUrl),
    active,
    isActive: active,
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
    audienceType: normalizeAudienceTypes(value.audienceType, fallback.audienceType),
    audienceNotes: normalizeText(value.audienceNotes, fallback.audienceNotes),
    notes: normalizeText(value.notes, fallback.notes),
    restaurantCommissionPercent,
    hlCommissionMode,
    hlCommissionValue,
    hlFixedFee,
    activeDeck: normalizeDeckId(value.activeDeck),
    commissionPercent: commissionNetPercent,
    commissionHLPercent,
    commissionRestaurantPercent: restaurantCommissionPercent,
    allowedTableCounts: value.allowedTableCounts?.length
      ? value.allowedTableCounts
      : fallback.allowedTableCounts,
    allowedPrices: value.allowedPrices?.length ? value.allowedPrices : fallback.allowedPrices,
    allowedModes: value.allowedModes?.length ? value.allowedModes : fallback.allowedModes,
    enabledGames: value.enabledGames?.length ? value.enabledGames : fallback.enabledGames,
    activeGames: normalizeGameIds(value.activeGames ?? value.enabledGames, fallback.activeGames),
    enabledDecks:
      value.enabledDecks?.length
        ? value.enabledDecks.map(normalizeDeckId)
        : [normalizeDeckId(value.activeDeck), ...(fallback.enabledDecks ?? [])].filter(
            (deckId, index, decks) => decks.indexOf(deckId) === index,
          ),
    primaryColor: normalizeText(
      value.primaryColor,
      value.theme?.primaryColor ?? fallback.primaryColor,
    ),
    secondaryColor: normalizeText(
      value.secondaryColor,
      value.theme?.secondaryColor ?? fallback.secondaryColor,
    ),
    accentColor: normalizeText(value.accentColor, fallback.accentColor),
    autoplayDefault: value.autoplayDefault ?? fallback.autoplayDefault,
    autoplayInterval: normalizeNumber(value.autoplayInterval, fallback.autoplayInterval),
    showClock: value.showClock ?? fallback.showClock,
    showSponsors: value.showSponsors ?? fallback.showSponsors,
    showPromotions: value.showPromotions ?? fallback.showPromotions,
    showQRPromo: value.showQRPromo ?? fallback.showQRPromo,
    promoTitle: normalizeText(value.promoTitle, fallback.promoTitle),
    promoSubtitle: normalizeText(value.promoSubtitle, fallback.promoSubtitle),
    promoImageUrl: normalizeText(value.promoImageUrl, fallback.promoImageUrl),
    standbyTitle: normalizeText(value.standbyTitle, fallback.standbyTitle),
    standbySubtitle: normalizeText(value.standbySubtitle, fallback.standbySubtitle),
    standbyImageUrl: normalizeText(value.standbyImageUrl, fallback.standbyImageUrl),
    standbyPromoText: normalizeText(value.standbyPromoText, fallback.standbyPromoText),
    standbyCtaText: normalizeText(value.standbyCtaText, fallback.standbyCtaText),
    standbyCtaQrUrl: normalizeText(value.standbyCtaQrUrl, fallback.standbyCtaQrUrl),
    standbyRotatePromotions:
      value.standbyRotatePromotions ?? fallback.standbyRotatePromotions,
    instagram: normalizeText(value.instagram, value.instagramUrl ?? fallback.instagram),
    facebook: normalizeText(value.facebook, value.facebookUrl ?? fallback.facebook),
    tiktok: normalizeText(value.tiktok, value.tiktokUrl ?? fallback.tiktok),
    qrCampaignId: normalizeText(value.qrCampaignId, fallback.qrCampaignId),
    theme: {
      primaryColor: normalizeText(
        value.theme?.primaryColor,
        value.primaryColor ?? fallback.primaryColor,
      ),
      secondaryColor: normalizeText(
        value.theme?.secondaryColor,
        value.secondaryColor ?? fallback.secondaryColor,
      ),
    },
  };
}

function mergeDefaultRestaurants(restaurants: RestaurantConfig[]) {
  const uniqueRestaurants = Array.from(
    restaurants
      .reduce<Map<string, RestaurantConfig>>((map, restaurant) => {
        map.set(restaurant.id, restaurant);
        return map;
      }, new Map())
      .values(),
  );
  const knownIds = new Set(uniqueRestaurants.map((restaurant) => restaurant.id));
  const missingDefaults = defaultRestaurants.filter((restaurant) => !knownIds.has(restaurant.id));

  return [...uniqueRestaurants, ...missingDefaults];
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

  const normalizedRestaurants = Array.from(
    restaurants
      .map(normalizeRestaurant)
      .reduce<Map<string, RestaurantConfig>>((map, restaurant) => {
        map.set(restaurant.id, restaurant);
        return map;
      }, new Map())
      .values(),
  );
  window.localStorage.setItem(restaurantsStorageKey, JSON.stringify(normalizedRestaurants));
  void upsertRestaurantsToSupabase(normalizedRestaurants);
  return normalizedRestaurants;
}

export function createRestaurant(
  restaurant: Partial<RestaurantConfig> & Pick<RestaurantConfig, "name">,
) {
  const restaurants = getRestaurants();
  const slug = normalizeRestaurantSlug(restaurant.slug ?? restaurant.name);
  const createdRestaurant = normalizeRestaurant({
    ...restaurant,
    id: slug,
    slug,
  });

  saveRestaurants([...restaurants.filter((current) => current.id !== createdRestaurant.id), createdRestaurant]);
  void upsertRestaurantsToSupabase([createdRestaurant]);
  return createdRestaurant;
}

export function updateRestaurant(
  restaurantId: string,
  updates: Partial<Omit<RestaurantConfig, "id">>,
) {
  const restaurants = getRestaurants();
  const targetSlug = normalizeRestaurantSlug(restaurantId);
  const updatedRestaurants = restaurants.map((restaurant) =>
    restaurant.id === targetSlug || restaurant.slug === targetSlug
      ? normalizeRestaurant({ ...restaurant, ...updates, id: updates.slug ?? restaurant.slug })
      : restaurant,
  );

  saveRestaurants(updatedRestaurants);
  void upsertRestaurantsToSupabase(updatedRestaurants);
  const nextSlug = normalizeRestaurantSlug(updates.slug ?? targetSlug);
  return updatedRestaurants.find((restaurant) => restaurant.id === nextSlug);
}

export function toggleRestaurant(restaurantId: string) {
  const restaurants = getRestaurants();
  const targetSlug = normalizeRestaurantSlug(restaurantId);
  const updatedRestaurants = restaurants.map((restaurant) =>
    restaurant.id === targetSlug || restaurant.slug === targetSlug
      ? { ...restaurant, active: !restaurant.active, isActive: !restaurant.active }
      : restaurant,
  );

  saveRestaurants(updatedRestaurants);
  void upsertRestaurantsToSupabase(updatedRestaurants);
  return updatedRestaurants.find((restaurant) => restaurant.id === targetSlug);
}

export function getRestaurantById(restaurantId: string) {
  const targetSlug = normalizeRestaurantSlug(restaurantId);
  return getRestaurants().find(
    (restaurant) =>
      restaurant.id === targetSlug ||
      restaurant.slug === targetSlug ||
      normalizeRestaurantSlug(restaurant.name) === targetSlug,
  );
}

export function archiveRestaurant(restaurantId: string) {
  const restaurants = getRestaurants();
  const targetSlug = normalizeRestaurantSlug(restaurantId);
  const updatedRestaurants = restaurants.map((restaurant) =>
    restaurant.id === targetSlug || restaurant.slug === targetSlug
      ? { ...restaurant, active: false, isActive: false }
      : restaurant,
  );

  saveRestaurants(updatedRestaurants);
  void upsertRestaurantsToSupabase(updatedRestaurants);
  return updatedRestaurants.find((restaurant) => restaurant.id === targetSlug);
}
