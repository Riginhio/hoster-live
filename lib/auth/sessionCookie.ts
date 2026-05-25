import type { AuthUser } from "@/lib/auth/mockUsers";

export const authCookieName = "hoster-live-auth";

export type AuthCookiePayload = Pick<
  AuthUser,
  | "email"
  | "role"
  | "name"
  | "restaurantId"
  | "restaurantName"
  | "venueRole"
  | "restaurantIds"
  | "brandName"
  | "userId"
>;

function safeEncode(value: string) {
  return encodeURIComponent(value);
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export function serializeAuthCookie(payload: AuthCookiePayload) {
  return safeEncode(JSON.stringify(payload));
}

export function parseAuthCookieValue(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(safeDecode(value)) as AuthCookiePayload;

    if (!parsedValue || typeof parsedValue.email !== "string" || typeof parsedValue.role !== "string") {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

export function setAuthCookie(payload: AuthCookiePayload) {
  if (typeof document === "undefined") {
    return;
  }

  const maxAge = 60 * 60 * 24 * 14;
  document.cookie = `${authCookieName}=${serializeAuthCookie(payload)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function clearAuthCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${authCookieName}=; path=/; max-age=0; samesite=lax`;
}
