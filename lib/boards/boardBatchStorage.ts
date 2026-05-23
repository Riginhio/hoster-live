import {
  type LoteriaBoard,
  type LoteriaCard,
} from "@/lib/loteria";
import { getDeckCards, normalizeDeckId, type DeckId } from "@/lib/decks";
import { encodeBoardValidationPayload } from "@/lib/qr/qrPayload";
import { getRestaurantById } from "@/lib/restaurants/restaurantStorage";
import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";

export type BoardBatchStatus = "active" | "inactive" | "archived";

export type Board = {
  id: string;
  batchId: string;
  restaurantId: string;
  deckId: DeckId;
  folio: string;
  cards: LoteriaCard[][];
  qrPayload: string;
  isActive: boolean;
};

export type BoardBatch = {
  id: string;
  restaurantId: string;
  deckId: DeckId;
  restaurantName: string;
  name: string;
  quantity: number;
  status: BoardBatchStatus;
  validFrom: string;
  validTo: string;
  boards: Board[];
  createdAt: string;
};

export const boardBatchesStorageKey = "hoster-live:board-batches";

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}

function seededShuffle(cards: LoteriaCard[], seed: number) {
  const shuffled = [...cards];
  let state = seed;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const randomIndex = state % (index + 1);
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function createBoardCards(seed: number, deckId: DeckId) {
  const selectedCards = seededShuffle(getDeckCards(deckId), seed).slice(0, 16);

  return [
    selectedCards.slice(0, 4),
    selectedCards.slice(4, 8),
    selectedCards.slice(8, 12),
    selectedCards.slice(12, 16),
  ];
}

function createBoardsForBatch(
  batchId: string,
  restaurantId: string,
  quantity: number,
  deckId: DeckId,
): Board[] {
  const slug = getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId);

  return Array.from({ length: quantity }, (_, index) => {
    const folio = `HL-${String(index + 1).padStart(3, "0")}`;

    return {
      id: `${batchId}-${folio}`,
      batchId,
      restaurantId: slug,
      deckId,
      folio,
      cards: createBoardCards(index + 1401, deckId),
      qrPayload: encodeBoardValidationPayload({
        batchId,
        restaurantId: slug,
        folio,
      }),
      isActive: true,
    };
  });
}

function createDefaultBatch(
  restaurantId: string,
  restaurantName: string,
  name: string,
  deckId: DeckId = "loteria",
): BoardBatch {
  const slug = normalizeRestaurantSlug(restaurantId);
  const id = `batch-${slug}-default`;
  const validFrom = "2026-05-01";
  const validTo = "2026-12-31";

  return {
    id,
    restaurantId: slug,
    deckId,
    restaurantName,
    name,
    quantity: 50,
    status: "active",
    validFrom,
    validTo,
    boards: createBoardsForBatch(id, slug, 50, deckId),
    createdAt: "2026-05-21T00:00:00.000Z",
  };
}

export const defaultBoardBatches: BoardBatch[] = [
  createDefaultBatch("rancho-viejo", "Rancho Viejo", "Lote operativo Rancho Viejo"),
  createDefaultBatch("doroteo", "Doroteo", "Lote operativo Doroteo"),
];

function normalizeBatch(batch: BoardBatch): BoardBatch {
  const restaurant =
    getRestaurantById(batch.restaurantId) ??
    getRestaurantById(batch.restaurantName) ??
    getRestaurantById("rancho-viejo");
  const restaurantId = restaurant?.id ?? normalizeRestaurantSlug(batch.restaurantId, "rancho-viejo");
  const deckId = normalizeDeckId(batch.deckId ?? restaurant?.activeDeck);
  const deckCardIds = new Set(getDeckCards(deckId).map((card) => card.id));
  const hasCompatibleBoards =
    batch.boards?.length &&
    batch.boards.every((board) => board.cards.flat().every((card) => deckCardIds.has(card.id)));

  return {
    ...batch,
    restaurantId,
    deckId,
    restaurantName: restaurant?.name ?? batch.restaurantName,
    boards: hasCompatibleBoards
      ? batch.boards.map((board) => ({
          ...board,
          restaurantId,
          deckId: normalizeDeckId(board.deckId ?? deckId),
          qrPayload: encodeBoardValidationPayload({
            batchId: board.batchId,
            restaurantId,
            folio: board.folio,
          }),
        }))
      : createBoardsForBatch(batch.id, restaurantId, batch.quantity, deckId),
  };
}

function mergeDefaultBatches(batches: BoardBatch[]) {
  const existingIds = new Set(batches.map((batch) => batch.id));
  const missingDefaults = defaultBoardBatches.filter((batch) => !existingIds.has(batch.id));

  return [...batches, ...missingDefaults];
}

export function getBoardBatches(): BoardBatch[] {
  if (!hasLocalStorage()) {
    return defaultBoardBatches;
  }

  const rawValue = window.localStorage.getItem(boardBatchesStorageKey);

  if (!rawValue) {
    saveBoardBatches(defaultBoardBatches);
    return defaultBoardBatches;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as BoardBatch[];
    const batches = Array.isArray(parsedValue)
      ? mergeDefaultBatches(parsedValue.map(normalizeBatch))
      : defaultBoardBatches;
    saveBoardBatches(batches);
    return batches;
  } catch {
    saveBoardBatches(defaultBoardBatches);
    return defaultBoardBatches;
  }
}

export function saveBoardBatches(batches: BoardBatch[]) {
  if (!hasLocalStorage()) {
    return batches;
  }

  window.localStorage.setItem(boardBatchesStorageKey, JSON.stringify(batches));
  return batches;
}

export function getActiveBoardBatch(restaurantId: string) {
  const slug = getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId);
  return getBoardBatches().find(
    (batch) => batch.restaurantId === slug && batch.status === "active",
  );
}

export function createBoardBatch(input: {
  restaurantId: string;
  restaurantName: string;
  name: string;
  quantity: number;
  validFrom: string;
  validTo: string;
  activate?: boolean;
}) {
  const id = createId("batch");
  const restaurant = getRestaurantById(input.restaurantId) ?? getRestaurantById(input.restaurantName);
  const restaurantId = restaurant?.id ?? normalizeRestaurantSlug(input.restaurantId);
  const deckId = normalizeDeckId(restaurant?.activeDeck);
  const batch: BoardBatch = {
    id,
    restaurantId,
    deckId,
    restaurantName: restaurant?.name ?? input.restaurantName,
    name: input.name,
    quantity: input.quantity,
    status: input.activate ?? true ? "active" : "inactive",
    validFrom: input.validFrom,
    validTo: input.validTo,
    boards: createBoardsForBatch(id, restaurantId, input.quantity, deckId),
    createdAt: new Date().toISOString(),
  };
  const currentBatches = getBoardBatches();
  const nextBatches =
    batch.status === "active"
      ? currentBatches.map((currentBatch) =>
          currentBatch.restaurantId === batch.restaurantId && currentBatch.status === "active"
            ? { ...currentBatch, status: "inactive" as const }
            : currentBatch,
        )
      : currentBatches;

  saveBoardBatches([batch, ...nextBatches]);
  return batch;
}

export function activateBoardBatch(batchId: string) {
  const batches = getBoardBatches();
  const selectedBatch = batches.find((batch) => batch.id === batchId);

  if (!selectedBatch) {
    return undefined;
  }

  const updatedBatches = batches.map((batch) => {
    if (batch.id === batchId) {
      return { ...batch, status: "active" as const };
    }

    if (batch.restaurantId === selectedBatch.restaurantId && batch.status === "active") {
      return { ...batch, status: "inactive" as const };
    }

    return batch;
  });

  saveBoardBatches(updatedBatches);
  return updatedBatches.find((batch) => batch.id === batchId);
}

export function archiveBoardBatch(batchId: string) {
  const updatedBatches = getBoardBatches().map((batch) =>
    batch.id === batchId ? { ...batch, status: "archived" as const } : batch,
  );

  saveBoardBatches(updatedBatches);
  return updatedBatches.find((batch) => batch.id === batchId);
}

export function toLoteriaBoards(boards: Board[]): LoteriaBoard[] {
  return boards.map((board) => ({
    folio: board.folio,
    cards: board.cards,
  }));
}
