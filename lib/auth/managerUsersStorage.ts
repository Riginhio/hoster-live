import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";
import {
  deleteManagerUserFromSupabase,
  getManagerUsersFromSupabase,
  upsertManagerUsersToSupabase,
} from "@/lib/supabase/persistence";

export type ManagerUser = {
  id: string;
  username: string;
  password: string;
  name: string;
  restaurantId: string;
  restaurantIds: string[];
  brandName: string;
  role: "restaurant_admin" | "manager" | "play" | "super_admin" | "tv";
  active: boolean;
  createdAt: string;
};

export const managerUsersStorageKey = "hoster-live:manager-users";

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `manager-${Date.now()}`;
}

function normalizeRole(role: Partial<ManagerUser>["role"] | "supervisor") {
  if (role === "supervisor" || role === "super_admin") {
    return "super_admin";
  }

  if (role === "restaurant_admin" || role === "play" || role === "tv" || role === "manager") {
    return role;
  }

  return "manager";
}

function normalizeUser(user: Partial<ManagerUser>): ManagerUser {
  return {
    id: user.id ?? createId(),
    username: (user.username ?? "gerente").trim().toLowerCase(),
    password: (user.password ?? "Hoster123").trim(),
    name: user.name ?? "Gerente",
    restaurantId: normalizeRestaurantSlug(user.restaurantId, "rancho-viejo"),
    restaurantIds: user.restaurantIds?.length
      ? user.restaurantIds.map((restaurantId) => normalizeRestaurantSlug(restaurantId))
      : [normalizeRestaurantSlug(user.restaurantId, "rancho-viejo")],
    brandName: user.brandName ?? "",
    role: normalizeRole(user.role as Partial<ManagerUser>["role"] | "supervisor"),
    active: user.active ?? true,
    createdAt: user.createdAt ?? new Date().toISOString(),
  };
}

export function getManagerUsers(): ManagerUser[] {
  if (!hasLocalStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(managerUsersStorageKey);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as ManagerUser[];
    const users = Array.isArray(parsedValue) ? parsedValue.map(normalizeUser) : [];
    saveManagerUsers(users, { syncSupabase: false });
    return users;
  } catch {
    return [];
  }
}

export function saveManagerUsers(users: ManagerUser[], options: { syncSupabase?: boolean } = {}) {
  if (!hasLocalStorage()) {
    return users;
  }

  window.localStorage.setItem(managerUsersStorageKey, JSON.stringify(users.map(normalizeUser)));

  if (options.syncSupabase !== false) {
    void upsertManagerUsersToSupabase(users);
  }

  return users;
}

export async function refreshManagerUsersFromSupabase() {
  const result = await getManagerUsersFromSupabase();

  if (result.mode !== "supabase" || result.error || !result.data) {
    return {
      users: getManagerUsers(),
      source: "localStorage",
      error: result.error,
    };
  }

  return {
    users: saveManagerUsers(result.data, { syncSupabase: false }),
    source: "Supabase",
    error: null,
  };
}

export function upsertManagerUser(user: Partial<ManagerUser> & Pick<ManagerUser, "username" | "restaurantId">) {
  const users = getManagerUsers();
  const normalizedUser = normalizeUser(user);
  const duplicateUser = users.find(
    (currentUser) =>
      currentUser.id !== normalizedUser.id &&
      currentUser.username.trim().toLowerCase() === normalizedUser.username,
  );

  if (duplicateUser) {
    return undefined;
  }

  saveManagerUsers([
    normalizedUser,
    ...users.filter((currentUser) => currentUser.id !== normalizedUser.id),
  ]);
  return normalizedUser;
}

export function toggleManagerUser(userId: string) {
  const users = getManagerUsers();
  const updatedUsers = users.map((user) =>
    user.id === userId ? { ...user, active: !user.active } : user,
  );
  saveManagerUsers(updatedUsers);
  return updatedUsers.find((user) => user.id === userId);
}

export function deleteManagerUser(userId: string) {
  const users = getManagerUsers();
  const updatedUsers = users.filter((user) => user.id !== userId);
  saveManagerUsers(updatedUsers);
  void deleteManagerUserFromSupabase(userId);
  return updatedUsers;
}
