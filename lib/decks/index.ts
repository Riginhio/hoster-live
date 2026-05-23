import { loteriaCards, type LoteriaCard } from "@/lib/loteria";
import { worldCup2026Cards } from "@/lib/decks/worldcup2026";

export type DeckId = "loteria" | "worldcup2026";
export type GameId = "loteria";

export type DeckDefinition = {
  id: DeckId;
  name: string;
  label: string;
  cards: LoteriaCard[];
};

export const decks: Record<DeckId, DeckDefinition> = {
  loteria: {
    id: "loteria",
    name: "Loteria",
    label: "Loteria clasica",
    cards: loteriaCards,
  },
  worldcup2026: {
    id: "worldcup2026",
    name: "FIFA World Cup 2026",
    label: "Selecciones FIFA 2026",
    cards: worldCup2026Cards,
  },
};

export function normalizeDeckId(deckId?: string): DeckId {
  return deckId === "worldcup2026" || deckId === "fifa2026" ? "worldcup2026" : "loteria";
}

export function getDeckById(deckId?: string) {
  return decks[normalizeDeckId(deckId)];
}

export function getDeckCards(deckId?: string) {
  return getDeckById(deckId).cards;
}

export function getCardByNumber(deckId: string | undefined, number: number) {
  return getDeckCards(deckId).find((card) => card.number === number);
}

export function getCardById(deckId: string | undefined, cardId: string) {
  return getDeckCards(deckId).find(
    (card) =>
      card.id === cardId ||
      card.slug === cardId ||
      `el-${card.slug}` === cardId ||
      `la-${card.slug}` === cardId ||
      `las-${card.slug}` === cardId,
  );
}
