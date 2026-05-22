export type UserRole = "master" | "gerente" | "tv";

export type MockUser = {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  restaurantId?: string;
  restaurantName?: string;
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
    restaurantId: user.restaurantId,
    restaurantName: user.restaurantName,
  };
}
