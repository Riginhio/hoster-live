import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";

export type BoardValidationPayload = {
  restaurantId: string;
  restaurantName?: string;
  batchId: string;
  batchName?: string;
  folio: string;
};

function base64UrlEncode(value: string) {
  const encodedValue =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(value)))
      : Buffer.from(value, "utf-8").toString("base64");

  return encodedValue
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return typeof atob === "function"
    ? decodeURIComponent(escape(atob(padded)))
    : Buffer.from(padded, "base64").toString("utf-8");
}

export function encodeBoardValidationPayload(payload: BoardValidationPayload) {
  return base64UrlEncode(
    JSON.stringify({
      ...payload,
      restaurantId: normalizeRestaurantSlug(payload.restaurantId),
    }),
  );
}

export function decodeBoardValidationPayload(payload: string): BoardValidationPayload | null {
  try {
    const decodedValue = payload.trim().startsWith("{")
      ? decodeURIComponent(payload)
      : base64UrlDecode(payload);
    const parsedValue = JSON.parse(decodedValue) as Partial<BoardValidationPayload>;

    if (!parsedValue.restaurantId || !parsedValue.batchId || !parsedValue.folio) {
      return null;
    }

    return {
      restaurantId: normalizeRestaurantSlug(parsedValue.restaurantId),
      restaurantName: parsedValue.restaurantName,
      batchId: parsedValue.batchId,
      batchName: parsedValue.batchName,
      folio: parsedValue.folio,
    };
  } catch {
    return null;
  }
}

export function createValidationUrl(payload: BoardValidationPayload, origin?: string) {
  const baseUrl =
    origin ??
    (typeof window !== "undefined" && window.location.origin ? window.location.origin : "");

  return `${baseUrl}/validate/${encodeBoardValidationPayload(payload)}`;
}
