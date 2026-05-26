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
import { getManagerUsers } from "@/lib/auth/managerUsersStorage";
import { clearAuthCookie, parseAuthCookieValue, setAuthCookie } from "@/lib/auth/sessionCookie";
import { ensureDemoSeed } from "@/lib/demo/demoSeed";

type LoginResult =
  | { ok: true; user: AuthUser; redirectTo: string }
  | { ok: false; error: string };

type AuthContextValue = {
  currentUser: AuthUser | null;
  isReady: boolean;
  login: (email: string, password: string) => LoginResult;
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

  const login = useCallback((email: string, password: string): LoginResult => {
    const normalizedEmail = email.trim().toLowerCase();
    const managerUser = getManagerUsers().find(
      (user) => user.active && user.username.toLowerCase() === normalizedEmail && user.password === password,
    );

    if (managerUser) {
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
        mockUser.email.toLowerCase() === normalizedEmail && mockUser.password === password,
    );

    if (!user) {
      return { ok: false, error: "Credenciales invalidas para HOSTER LIVE." };
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
