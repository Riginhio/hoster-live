export function normalizeRestaurantSlug(value: unknown, fallback = "restaurante") {
  const normalizedValue =
    typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
  const slug = normalizedValue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}
