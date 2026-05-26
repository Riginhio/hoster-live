import {
  type LoteriaBoard,
  type LoteriaCard,
} from "@/lib/loteria";
import { getDeckCards, normalizeDeckId, type DeckId, type GameId } from "@/lib/decks";
import { encodeBoardValidationPayload } from "@/lib/qr/qrPayload";
import { getRestaurantById } from "@/lib/restaurants/restaurantStorage";
import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";
import type { Session } from "@/lib/sessions/sessionStorage";
import type { RestaurantConfig } from "@/lib/types";
import {
  getBoardBatchesFromSupabase,
  upsertBoardBatchesToSupabase,
} from "@/lib/supabase/persistence";

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
  gameId: GameId;
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
  const id = deckId === "loteria" ? `batch-${slug}-default` : `batch-${slug}-${deckId}-default`;
  const validFrom = "2026-05-01";
  const validTo = "2026-12-31";

  return {
    id,
    restaurantId: slug,
    gameId: "loteria",
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

function createOperationalBatch(input: {
  id: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  gameId?: GameId;
  deckId: DeckId;
  quantity: number;
  status?: BoardBatchStatus;
  validFrom?: string;
  validTo?: string;
  createdAt?: string;
}): BoardBatch {
  const slug = normalizeRestaurantSlug(input.restaurantId);
  const validFrom = input.validFrom ?? new Date().toISOString().slice(0, 10);
  const validTo =
    input.validTo ??
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    id: input.id,
    restaurantId: slug,
    gameId: input.gameId ?? "loteria",
    deckId: normalizeDeckId(input.deckId),
    restaurantName: input.restaurantName,
    name: input.name,
    quantity: input.quantity,
    status: input.status ?? "active",
    validFrom,
    validTo,
    boards: createBoardsForBatch(input.id, slug, input.quantity, input.deckId),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export const defaultBoardBatches: BoardBatch[] = [
  createDefaultBatch("rancho-viejo", "Rancho Viejo", "Lote operativo Rancho Viejo"),
  createDefaultBatch("rancho-viejo", "Rancho Viejo", "Lote FIFA Rancho Viejo", "worldcup2026"),
  createDefaultBatch("doroteo", "Doroteo", "Lote operativo Doroteo"),
  createDefaultBatch("doroteo", "Doroteo", "Lote FIFA Doroteo", "worldcup2026"),
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
    gameId: batch.gameId ?? "loteria",
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
    saveBoardBatches(defaultBoardBatches, { syncSupabase: false });
    return defaultBoardBatches;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as BoardBatch[];
    const batches = Array.isArray(parsedValue)
      ? mergeDefaultBatches(parsedValue.map(normalizeBatch))
      : defaultBoardBatches;
    saveBoardBatches(batches, { syncSupabase: false });
    return batches;
  } catch {
    saveBoardBatches(defaultBoardBatches, { syncSupabase: false });
    return defaultBoardBatches;
  }
}

export function saveBoardBatches(
  batches: BoardBatch[],
  options: { syncSupabase?: boolean } = {},
) {
  if (!hasLocalStorage()) {
    return batches;
  }

  const normalizedBatches = batches.map(normalizeBatch);
  window.localStorage.setItem(boardBatchesStorageKey, JSON.stringify(normalizedBatches));
  if (options.syncSupabase !== false) {
    void upsertBoardBatchesToSupabase(normalizedBatches);
  }
  return normalizedBatches;
}

export async function refreshBoardBatchesFromSupabase() {
  const result = await getBoardBatchesFromSupabase();

  if (result.mode !== "supabase" || result.error || !result.data?.length) {
    return {
      batches: getBoardBatches(),
      source: "localStorage",
      error: result.error,
    };
  }

  return {
    batches: saveBoardBatches(result.data),
    source: "Supabase",
    error: null,
  };
}

export function getActiveBoardBatch(restaurantId: string) {
  const slug = getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId);
  return getBoardBatches().find(
    (batch) => batch.restaurantId === slug && batch.status === "active",
  );
}

export function getActiveBoardBatchByDeck(restaurantId: string, deckId: DeckId) {
  const slug = getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId);
  return getBoardBatches().find(
    (batch) =>
      batch.restaurantId === slug &&
      batch.deckId === deckId &&
      batch.status === "active",
  );
}

export function createBoardBatch(input: {
  restaurantId: string;
  restaurantName: string;
  name: string;
  gameId?: GameId;
  deckId?: DeckId;
  quantity: number;
  validFrom: string;
  validTo: string;
  activate?: boolean;
}) {
  const id = createId("batch");
  const restaurant = getRestaurantById(input.restaurantId) ?? getRestaurantById(input.restaurantName);
  const restaurantId = restaurant?.id ?? normalizeRestaurantSlug(input.restaurantId);
  const deckId = normalizeDeckId(input.deckId ?? restaurant?.activeDeck);
  const batch = createOperationalBatch({
    id,
    restaurantId,
    gameId: input.gameId,
    deckId,
    restaurantName: restaurant?.name ?? input.restaurantName,
    name: input.name,
    quantity: input.quantity,
    status: input.activate ?? true ? "active" : "inactive",
    validFrom: input.validFrom,
    validTo: input.validTo,
  });
  const currentBatches = getBoardBatches();
  const nextBatches =
    batch.status === "active"
      ? currentBatches.map((currentBatch) =>
          currentBatch.restaurantId === batch.restaurantId &&
          currentBatch.deckId === batch.deckId &&
          currentBatch.status === "active"
            ? { ...currentBatch, status: "inactive" as const }
            : currentBatch,
        )
      : currentBatches;

  saveBoardBatches([batch, ...nextBatches]);
  return batch;
}

export function ensureBoardBatchForSession(session: Session) {
  const batches = getBoardBatches();
  const existingBatch =
    (session.batchId ? batches.find((batch) => batch.id === session.batchId) : undefined) ??
    batches.find(
      (batch) =>
        batch.restaurantId === session.restaurantId &&
        batch.deckId === session.deckId &&
        batch.status === "active",
    );

  if (existingBatch) {
    return existingBatch;
  }

  const restaurant = getRestaurantById(session.restaurantId);
  const allowedQuantity =
    restaurant?.allowedTableCounts
      ?.slice()
      .sort((left, right) => left - right)
      .find((count) => count >= session.activeTables) ?? session.activeTables;
  const quantity = Math.max(session.activeTables, allowedQuantity, 30);
  const batchId = session.batchId ?? `batch-${session.restaurantId}-${session.deckId}-auto`;
  const generatedBatch = createOperationalBatch({
    id: batchId,
    restaurantId: session.restaurantId,
    restaurantName: restaurant?.name ?? session.restaurantName,
    name: `Lote operativo ${restaurant?.name ?? session.restaurantName}`,
    gameId: "loteria",
    deckId: session.deckId,
    quantity,
    status: "active",
    createdAt: session.createdAt,
  });
  const nextBatches = [
    generatedBatch,
    ...batches.map((batch) =>
      batch.restaurantId === generatedBatch.restaurantId &&
      batch.deckId === generatedBatch.deckId &&
      batch.status === "active"
        ? { ...batch, status: "inactive" as const }
        : batch,
    ),
  ];

  saveBoardBatches(nextBatches);
  console.info("[HOSTER LIVE][TABLAS] lote generado para sesion", {
    restaurantId: session.restaurantId,
    sessionId: session.id,
    batchId,
    deckId: session.deckId,
    quantity,
  });
  return generatedBatch;
}

export function ensureActiveBoardBatchForRestaurant(
  restaurant: RestaurantConfig,
  deckId: DeckId = restaurant.activeDeck,
  minimumQuantity?: number,
) {
  const existingBatch = getActiveBoardBatchByDeck(restaurant.id, deckId);

  if (existingBatch) {
    return existingBatch;
  }

  const allowedQuantity =
    restaurant.allowedTableCounts
      ?.slice()
      .sort((left, right) => left - right)
      .find((count) => count >= (minimumQuantity ?? 0)) ??
    restaurant.allowedTableCounts?.[0] ??
    minimumQuantity ??
    30;
  const quantity = Math.max(allowedQuantity, minimumQuantity ?? 0, 30);
  const batch = createOperationalBatch({
    id: `batch-${restaurant.id}-${deckId}-auto`,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    name: `Lote operativo ${restaurant.name}`,
    gameId: "loteria",
    deckId,
    quantity,
    status: "active",
  });

  saveBoardBatches([batch, ...getBoardBatches()]);
  console.info("[HOSTER LIVE][LOTES] lote activo generado", {
    restaurantId: restaurant.id,
    batchId: batch.id,
    deckId,
    quantity,
  });
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

    if (
      batch.restaurantId === selectedBatch.restaurantId &&
      batch.deckId === selectedBatch.deckId &&
      batch.status === "active"
    ) {
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

export function deactivateBoardBatch(batchId: string) {
  const updatedBatches = getBoardBatches().map((batch) =>
    batch.id === batchId ? { ...batch, status: "inactive" as const } : batch,
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
