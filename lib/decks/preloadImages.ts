import { getDeckCards } from "@/lib/decks";

const preloadedDecks = new Set<string>();
const preloadedImages = new Set<string>();

function preloadImage(src: string) {
  if (!src || preloadedImages.has(src) || typeof window === "undefined") {
    return Promise.resolve();
  }

  preloadedImages.add(src);

  return new Promise<void>((resolve) => {
    const image = new window.Image();

    image.onload = () => resolve();
    image.onerror = () => {
      console.warn("[HOSTER LIVE] No se pudo precargar imagen de carta", { src });
      resolve();
    };
    image.src = src;
  });
}

export async function preloadDeckImages(deckId?: string, label = "deck") {
  const cacheKey = deckId ?? "loteria";

  if (preloadedDecks.has(cacheKey)) {
    return;
  }

  preloadedDecks.add(cacheKey);
  const timingLabel = `[HL timing] preload imagenes ${label}:${cacheKey}`;
  console.time(timingLabel);
  await Promise.all(getDeckCards(deckId).map((card) => preloadImage(card.image)));
  console.timeEnd(timingLabel);
}

export function resetDeckPreloadCache(deckId?: string) {
  if (deckId) {
    preloadedDecks.delete(deckId);
    getDeckCards(deckId).forEach((card) => preloadedImages.delete(card.image));
    return;
  }

  preloadedDecks.clear();
  preloadedImages.clear();
}
