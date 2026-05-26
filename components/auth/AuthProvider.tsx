"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockUsers, toAuthUser, type AuthUser, type UserRole } from "@/lib/auth/mockUsers";
import {
  getManagerUsers,
  refreshManagerUsersFromSupabase,
} from "@/lib/auth/managerUsersStorage";
import { refreshRestaurantsFromSupabase } from "@/lib/restaurants/restaurantStorage";
import { clearAuthCookie, parseAuthCookieValue, setAuthCookie } from "@/lib/auth/sessionCookie";
import { ensureDemoSeed } from "@/lib/demo/demoSeed";

type LoginResult =
  | { ok: true; user: AuthUser; redirectTo: string }
  | { ok: false; error: string };

type AuthContextValue = {
  currentUser: AuthUser | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
};

const authStorageKey = "hoster-live:auth-user";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getRedirectForRole(user: AuthUser) {
  if (user.role === "master") {
    return "/master/dashboard";
  }

  if (user.role === "gerente") {
    return "/gerente";
  }

  return `/tv/${user.restaurantId ?? "rancho-viejo"}`;
}

function normalizeAuthInput(value: string) {
  return value.trim().toLowerCase();
}

function buildAuthError(message: string) {
  return { ok: false as const, error: message };
}

function parseStoredUser(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as AuthUser;
    const validUser = mockUsers.find(
      (user) => user.email === parsedValue.email && user.role === parsedValue.role,
    );

    if (validUser) {
      return toAuthUser(validUser);
    }

    if (parsedValue.role === "gerente" || parsedValue.role === "tv") {
      const managerUser = getManagerUsers().find(
        (user) => user.active && user.username === parsedValue.email,
      );

      if (managerUser?.role === "tv") {
        return {
          email: managerUser.username,
          role: "tv" as const,
          name: managerUser.name,
          restaurantId: managerUser.restaurantId,
          restaurantIds: managerUser.restaurantIds,
          brandName: managerUser.brandName,
          venueRole: "tv" as const,
          userId: managerUser.id,
        };
      }

      return managerUser
        ? {
            email: managerUser.username,
            role: "gerente" as const,
            name: managerUser.name,
            restaurantId: managerUser.restaurantId,
            restaurantIds: managerUser.restaurantIds,
            brandName: managerUser.brandName,
            venueRole: managerUser.role,
            userId: managerUser.id,
          }
        : null;
    }

    return null;
  } catch {
    return null;
  }
}

function hydrateFromCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("hoster-live-auth="))
    ?.split("=")[1];

  return parseAuthCookieValue(cookieValue);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    ensureDemoSeed();
    const storedUser = parseStoredUser(window.localStorage.getItem(authStorageKey));
    const cookieUser = hydrateFromCookie();
    const nextUser = storedUser ?? cookieUser;

    if (nextUser && !storedUser) {
      window.localStorage.setItem(authStorageKey, JSON.stringify(nextUser));
    }

    setCurrentUser(nextUser);
    setIsReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const normalizedEmail = normalizeAuthInput(email);
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      return buildAuthError("Usuario y password son obligatorios.");
    }

    const refreshedRestaurants = await refreshRestaurantsFromSupabase();
    const restaurantSource = refreshedRestaurants.source;
    const restaurants = refreshedRestaurants.restaurants;

    const managerUsersResult = await refreshManagerUsersFromSupabase();
    const managerUsers = managerUsersResult.users;

    const managerUser = managerUsers.find(
      (user) => user.active && normalizeAuthInput(user.username) === normalizedEmail,
    );

    if (managerUser) {
      const restaurant =
        restaurants.find(
          (item) =>
            item.id === managerUser.restaurantId ||
            item.slug === managerUser.restaurantId ||
            normalizeAuthInput(item.name) === managerUser.restaurantId,
        ) ?? null;

      if (!restaurant) {
        return buildAuthError("Restaurante no encontrado.");
      }

      if (!restaurant.active && restaurantSource === "Supabase") {
        return buildAuthError("Restaurante inactivo.");
      }

      if (managerUser.password.trim() !== normalizedPassword) {
        return buildAuthError("Password incorrecta.");
      }

      const isTvUser = managerUser.role === "tv";
      const authUser: AuthUser = {
        email: managerUser.username,
        role: isTvUser ? "tv" : "gerente",
        name: managerUser.name,
        restaurantId: managerUser.restaurantId,
        restaurantIds: managerUser.restaurantIds,
        brandName: managerUser.brandName,
        venueRole: managerUser.role,
        userId: managerUser.id,
      };
      window.localStorage.setItem(authStorageKey, JSON.stringify(authUser));
      setAuthCookie(authUser);
      setCurrentUser(authUser);
      return { ok: true, user: authUser, redirectTo: getRedirectForRole(authUser) };
    }

    const user = mockUsers.find(
      (mockUser) =>
        mockUser.email.toLowerCase() === normalizedEmail && mockUser.password.trim() === normalizedPassword,
    );

    if (!user) {
      const existingRemoteUser = managerUsers.find(
        (item) => normalizeAuthInput(item.username) === normalizedEmail,
      );

      if (existingRemoteUser) {
        return buildAuthError(
          existingRemoteUser.active ? "Password incorrecta." : "Usuario inactivo.",
        );
      }

      return buildAuthError("Usuario no encontrado.");
    }

    const authUser = toAuthUser(user);
    window.localStorage.setItem(authStorageKey, JSON.stringify(authUser));
    setAuthCookie(authUser);
    setCurrentUser(authUser);

    return { ok: true, user: authUser, redirectTo: getRedirectForRole(authUser) };
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(authStorageKey);
    clearAuthCookie();
    setCurrentUser(null);
  }, []);

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]) => {
      if (!currentUser) {
        return false;
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      return allowedRoles.includes(currentUser.role);
    },
    [currentUser],
  );

  const value = useMemo(
    () => ({
      currentUser,
      isReady,
      login,
      logout,
      hasRole,
    }),
    [currentUser, hasRole, isReady, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
