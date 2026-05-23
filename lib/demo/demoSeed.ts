import { createDefaultDemoConfig } from "@/lib/demoConfig";
import { upsertManagerUser, getManagerUsers } from "@/lib/auth/managerUsersStorage";
import { saveLastGameConfig } from "@/lib/sessions/lastGameConfigStorage";
import { getRestaurants } from "@/lib/restaurants/restaurantStorage";

const demoModeKey = "hoster-live:demo-seeded";

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function ensureDemoSeed() {
  if (!hasLocalStorage() || process.env.NEXT_PUBLIC_HOSTER_DEMO_MODE !== "true") {
    return;
  }

  if (window.localStorage.getItem(demoModeKey) === "true") {
    return;
  }

  getRestaurants();
  const existingUsers = getManagerUsers();
  const hasDemoManager = existingUsers.some((user) => user.username === "demo-manager@hosterlive.mx");
  const hasDemoPlay = existingUsers.some((user) => user.username === "demo-play@hosterlive.mx");

  if (!hasDemoManager) {
    upsertManagerUser({
      username: "demo-manager@hosterlive.mx",
      password: "Demo123",
      name: "Demo Manager",
      restaurantId: "rancho-viejo",
      role: "manager",
      active: true,
    });
  }

  if (!hasDemoPlay) {
    upsertManagerUser({
      username: "demo-play@hosterlive.mx",
      password: "Demo123",
      name: "Demo Play",
      restaurantId: "rancho-viejo",
      role: "play",
      active: true,
    });
  }

  saveLastGameConfig("rancho-viejo", {
    activeTables: createDefaultDemoConfig("rancho-viejo").activeTables,
    tablePrice: createDefaultDemoConfig("rancho-viejo").tablePrice,
    mode: createDefaultDemoConfig("rancho-viejo").mode,
    createdAt: new Date().toISOString(),
  });

  window.localStorage.setItem(demoModeKey, "true");
}

