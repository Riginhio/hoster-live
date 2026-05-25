import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";

export type UserRole = "master" | "gerente" | "tv";

export type MockUser = {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  restaurantId?: string;
  restaurantName?: string;
  venueRole?: "manager" | "play" | "supervisor";
  restaurantIds?: string[];
  brandName?: string;
  userId?: string;
};

export type AuthUser = Omit<MockUser, "password">;

export const mockUsers: MockUser[] = [
  {
    email: "master@hosterlive.mx",
    password: "Hoster123",
    role: "master",
    name: "Master Admin",
  },
  {
    email: "gerente@hosterlive.mx",
    password: "Hoster123",
    role: "gerente",
    name: "Carolina Mendez",
    restaurantId: "rancho-viejo",
    restaurantName: "Rancho Viejo",
    venueRole: "manager",
    userId: "mock-gerente-rancho-viejo",
  },
  {
    email: "tv@hosterlive.mx",
    password: "Hoster123",
    role: "tv",
    name: "Pantalla Rancho Viejo",
    restaurantId: "rancho-viejo",
    restaurantName: "Rancho Viejo",
  },
];

export function toAuthUser(user: MockUser): AuthUser {
  return {
    email: user.email,
    role: user.role,
    name: user.name,
    restaurantId: user.restaurantId ? normalizeRestaurantSlug(user.restaurantId) : undefined,
    restaurantName: user.restaurantName,
    venueRole: user.venueRole,
    restaurantIds: user.restaurantIds,
    brandName: user.brandName,
    userId: user.userId,
  };
}
