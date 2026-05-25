import { type LoteriaCard, type WinMode } from "@/lib/loteria";
import { calculateFinancialBreakdown } from "@/lib/finance";
import type { QrCampaign } from "@/lib/types";
import { getRestaurantById } from "@/lib/restaurants/restaurantStorage";
import { normalizeRestaurantSlug } from "@/lib/restaurants/slug";
import { getCardById, getDeckCards, normalizeDeckId, type DeckId } from "@/lib/decks";

export type SessionStatus = "active" | "completed" | "cancelled" | "closed_without_winner";
export type AutoplayStatus = "idle" | "countdown" | "playing" | "paused" | "finished";

export type Session = {
  id: string;
  batchId?: string;
  restaurantId: string;
  restaurantName: string;
  operatorUserId?: string;
  operatorUsername?: string;
  operatorRole?: "manager" | "play" | "supervisor";
  createdAt: string;
  startedAt: string;
  endedAt?: string;
  lastUpdatedAt: string;
  mode: WinMode;
  deckId: DeckId;
  activeTables: number;
  tablePrice: number;
  restaurantCommissionPercent: number;
  restaurantCommissionAmount: number;
  hlCommissionMode: "fixed" | "percent";
  hlCommissionValue: number;
  hlCommissionAmount: number;
  commissionTotalPercent: number;
  commissionTotalAmount: number;
  hlFixedFee: number;
  restaurantNetAmount: number;
  commissionPercent: number;
  commissionHLPercent: number;
  commissionRestaurantPercent: number;
  commissionNetPercent: number;
  commissionHLAmount: number;
  commissionRestaurantAmount: number;
  commissionNetAmount: number;
  grossRevenue: number;
  prizeAmount: number;
  basePrizeAmount: number;
  accumulatedContributionAmount: number;
  accumulatedPrizeAmount: number;
  accumulatedAppliedAt?: string;
  gameType: "normal" | "special" | "accumulated_special";
  calledCards: string[];
  winnerFolio?: string;
  winnerCards: string[];
  autoplayStatus: AutoplayStatus;
  autoplayIntervalSeconds: number;
  preStartCountdownSeconds: number;
  preStartStartedAt?: string;
  autoplayStartedAt?: string;
  playStartedAt?: string;
  playEndedAt?: string;
  activePromotions?: QrCampaign[];
  status: SessionStatus;
  durationSeconds: number;
};

export const sessionsStorageKey = "hoster-live:sessions";

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}`;
}

function calculateDurationSeconds(startedAt: string, endedAt = new Date().toISOString()) {
  const startedTime = new Date(startedAt).getTime();
  const endedTime = new Date(endedAt).getTime();

  if (!Number.isFinite(startedTime) || !Number.isFinite(endedTime)) {
    return 0;
  }

  return Math.max(0, Math.round((endedTime - startedTime) / 1000));
}

function calculatePlayDurationSeconds(session: Partial<Session>, endedAt = new Date().toISOString()) {
  return session.playStartedAt ? calculateDurationSeconds(session.playStartedAt, endedAt) : 0;
}

function hashSeed(value: string) {
  return value.split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}

function seededShuffle(cards: LoteriaCard[], seed: number) {
  const shuffled = [...cards];
  let state = seed || 1;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const randomIndex = state % (index + 1);
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

export function getSessionDeck(sessionId: string, deckId?: string) {
  return seededShuffle(getDeckCards(deckId), hashSeed(sessionId));
}

export function findSessionCard(cardId: string, deckId?: string) {
  return getCardById(deckId, cardId);
}

export function hydrateSessionCards(cardIds: string[], deckId?: string) {
  return cardIds
    .map((cardId) => findSessionCard(cardId, deckId))
    .filter((card): card is LoteriaCard => Boolean(card));
}

export function getSessions(): Session[] {
  if (!hasLocalStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(sessionsStorageKey);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Session[];
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    const sessions = parsedValue.map(normalizeSession);
    saveSessions(sessions);
    return sessions;
  } catch {
    return [];
  }
}

function normalizeSession(session: Partial<Session>): Session {
  const fallbackRestaurantId = "rancho-viejo";
  const restaurant =
    getRestaurantById(session.restaurantId ?? "") ??
    getRestaurantById(session.restaurantName ?? "") ??
    getRestaurantById(fallbackRestaurantId);
  const restaurantId = restaurant?.id ?? normalizeRestaurantSlug(session.restaurantId, fallbackRestaurantId);
  const deckId = normalizeDeckId(session.deckId ?? restaurant?.activeDeck);
  const breakdown = calculateFinancialBreakdown({
    activeTables: session.activeTables ?? 0,
    tablePrice: session.tablePrice ?? 0,
    restaurantCommissionPercent: session.restaurantCommissionPercent,
    hlCommissionMode: session.hlCommissionMode,
    hlCommissionValue: session.hlCommissionValue,
    hlFixedFee: session.hlFixedFee,
    commissionHLAmount: session.commissionHLAmount,
    commissionHLPercent: session.commissionHLPercent,
    commissionRestaurantPercent: session.commissionRestaurantPercent,
    commissionPercent: session.commissionPercent,
  });

  return {
    id: session.id ?? createSessionId(),
    batchId: session.batchId,
    restaurantId,
    restaurantName: session.restaurantName ?? restaurant?.name ?? "Rancho Viejo",
    operatorUserId: session.operatorUserId,
    operatorUsername: session.operatorUsername,
    operatorRole: session.operatorRole,
    createdAt: session.createdAt ?? new Date().toISOString(),
    startedAt: session.startedAt ?? session.createdAt ?? new Date().toISOString(),
    endedAt: session.endedAt,
    lastUpdatedAt: session.lastUpdatedAt ?? session.createdAt ?? new Date().toISOString(),
    mode: session.mode ?? "four_corners",
    deckId,
    activeTables: session.activeTables ?? 0,
    tablePrice: session.tablePrice ?? 0,
    restaurantCommissionPercent:
      session.restaurantCommissionPercent ?? breakdown.restaurantCommissionPercent,
    restaurantCommissionAmount:
      session.restaurantCommissionAmount ?? breakdown.restaurantCommissionAmount,
    hlCommissionMode: session.hlCommissionMode ?? breakdown.hlCommissionMode,
    hlCommissionValue: session.hlCommissionValue ?? breakdown.hlCommissionValue,
    hlCommissionAmount: session.hlCommissionAmount ?? breakdown.hlCommissionAmount,
    commissionTotalPercent: session.commissionTotalPercent ?? breakdown.commissionTotalPercent,
    commissionTotalAmount: session.commissionTotalAmount ?? breakdown.commissionTotalAmount,
    hlFixedFee: session.hlFixedFee ?? breakdown.hlFixedFee,
    restaurantNetAmount: session.restaurantNetAmount ?? breakdown.restaurantNetAmount,
    commissionPercent: session.commissionPercent ?? breakdown.commissionNetPercent,
    commissionHLPercent: session.commissionHLPercent ?? breakdown.commissionHLPercent,
    commissionRestaurantPercent:
      session.commissionRestaurantPercent ?? breakdown.commissionRestaurantPercent,
    commissionNetPercent: session.commissionNetPercent ?? breakdown.commissionNetPercent,
    commissionHLAmount: session.commissionHLAmount ?? breakdown.commissionHLAmount,
    commissionRestaurantAmount:
      session.commissionRestaurantAmount ?? breakdown.commissionRestaurantAmount,
    commissionNetAmount: session.commissionNetAmount ?? breakdown.commissionNetAmount,
    grossRevenue: session.grossRevenue ?? breakdown.grossRevenue,
    prizeAmount: session.prizeAmount ?? breakdown.prizeAmount,
    basePrizeAmount: session.basePrizeAmount ?? session.prizeAmount ?? breakdown.prizeAmount,
    accumulatedContributionAmount: session.accumulatedContributionAmount ?? 0,
    accumulatedPrizeAmount: session.accumulatedPrizeAmount ?? 0,
    accumulatedAppliedAt: session.accumulatedAppliedAt,
    gameType: session.gameType ?? "normal",
    calledCards: session.calledCards ?? [],
    winnerFolio: session.winnerFolio,
    winnerCards: session.winnerCards ?? [],
    autoplayStatus:
      session.autoplayStatus ?? (session.status !== "active" ? "finished" : "idle"),
    autoplayIntervalSeconds: session.autoplayIntervalSeconds ?? 5,
    preStartCountdownSeconds: session.preStartCountdownSeconds ?? 60,
    preStartStartedAt: session.preStartStartedAt,
    autoplayStartedAt: session.autoplayStartedAt,
    playStartedAt: session.playStartedAt,
    playEndedAt: session.playEndedAt,
    activePromotions: session.activePromotions ?? [],
    status:
      (session.status as string | undefined) === "finalized"
        ? "completed"
        : session.status ?? "active",
    durationSeconds: session.durationSeconds ?? 0,
  };
}

function saveSessions(sessions: Session[]) {
  if (!hasLocalStorage()) {
    return sessions;
  }

  window.localStorage.setItem(sessionsStorageKey, JSON.stringify(sessions));
  return sessions;
}

function syncSessionToSupabase(session: Session) {
  void import("@/lib/supabase/persistence").then(({ upsertSessionToSupabase }) =>
    upsertSessionToSupabase(session),
  );
}

function finalizeSession(session: Session, endedAt: string): Session {
  return normalizeSession({
    ...session,
    endedAt,
    status: "closed_without_winner",
    autoplayStatus: "finished",
    lastUpdatedAt: endedAt,
    playEndedAt: session.playEndedAt ?? endedAt,
    durationSeconds: session.durationSeconds || calculatePlayDurationSeconds(session, endedAt),
  });
}

export function getSessionById(sessionId: string) {
  return getSessions().find((session) => session.id === sessionId);
}

export function createSession(
  session: Omit<
    Session,
    | "id"
    | "createdAt"
    | "operatorUserId"
    | "operatorUsername"
    | "operatorRole"
    | "batchId"
    | "startedAt"
    | "endedAt"
    | "calledCards"
    | "deckId"
    | "lastUpdatedAt"
    | "commissionHLPercent"
    | "restaurantCommissionPercent"
    | "restaurantCommissionAmount"
    | "hlCommissionMode"
    | "hlCommissionValue"
    | "hlCommissionAmount"
    | "commissionTotalPercent"
    | "commissionTotalAmount"
    | "hlFixedFee"
    | "restaurantNetAmount"
    | "commissionRestaurantPercent"
    | "commissionNetPercent"
    | "commissionHLAmount"
    | "commissionRestaurantAmount"
    | "commissionNetAmount"
    | "grossRevenue"
    | "basePrizeAmount"
    | "accumulatedContributionAmount"
    | "accumulatedPrizeAmount"
    | "accumulatedAppliedAt"
    | "gameType"
    | "winnerFolio"
    | "winnerCards"
    | "autoplayStatus"
    | "autoplayIntervalSeconds"
    | "preStartCountdownSeconds"
    | "preStartStartedAt"
    | "autoplayStartedAt"
    | "playStartedAt"
    | "playEndedAt"
    | "activePromotions"
    | "status"
    | "durationSeconds"
  > &
    Partial<
      Pick<
        Session,
        | "id"
        | "createdAt"
        | "operatorUserId"
        | "operatorUsername"
        | "operatorRole"
        | "startedAt"
        | "batchId"
        | "calledCards"
        | "deckId"
        | "lastUpdatedAt"
        | "commissionHLPercent"
        | "restaurantCommissionPercent"
        | "restaurantCommissionAmount"
        | "hlCommissionMode"
        | "hlCommissionValue"
        | "hlCommissionAmount"
        | "commissionTotalPercent"
        | "commissionTotalAmount"
        | "hlFixedFee"
        | "restaurantNetAmount"
        | "commissionRestaurantPercent"
        | "commissionNetPercent"
        | "commissionHLAmount"
        | "commissionRestaurantAmount"
        | "commissionNetAmount"
        | "grossRevenue"
        | "basePrizeAmount"
        | "accumulatedContributionAmount"
        | "accumulatedPrizeAmount"
        | "accumulatedAppliedAt"
        | "gameType"
        | "winnerFolio"
        | "winnerCards"
        | "autoplayStatus"
        | "autoplayIntervalSeconds"
        | "preStartCountdownSeconds"
        | "preStartStartedAt"
        | "autoplayStartedAt"
        | "playStartedAt"
        | "playEndedAt"
        | "activePromotions"
        | "status"
        | "durationSeconds"
      >
    >,
) {
  const now = new Date().toISOString();
  const restaurant =
    getRestaurantById(session.restaurantId) ??
    getRestaurantById(session.restaurantName) ??
    getRestaurantById("rancho-viejo");
  const restaurantId = restaurant?.id ?? normalizeRestaurantSlug(session.restaurantId, "rancho-viejo");
  const deckId = normalizeDeckId(session.deckId ?? restaurant?.activeDeck);
  const breakdown = calculateFinancialBreakdown({
    activeTables: session.activeTables,
    tablePrice: session.tablePrice,
    restaurantCommissionPercent: session.restaurantCommissionPercent,
    hlCommissionMode: session.hlCommissionMode,
    hlCommissionValue: session.hlCommissionValue,
    hlFixedFee: session.hlFixedFee,
    commissionHLAmount: session.commissionHLAmount,
    commissionHLPercent: session.commissionHLPercent,
    commissionRestaurantPercent: session.commissionRestaurantPercent,
    commissionPercent: session.commissionPercent,
  });
  const createdSession: Session = {
    id: session.id ?? createSessionId(),
    batchId: session.batchId,
    restaurantId,
    restaurantName: restaurant?.name ?? session.restaurantName,
    operatorUserId: session.operatorUserId,
    operatorUsername: session.operatorUsername,
    operatorRole: session.operatorRole,
    createdAt: session.createdAt ?? now,
    startedAt: session.startedAt ?? now,
    lastUpdatedAt: session.lastUpdatedAt ?? now,
    mode: session.mode,
    deckId,
    activeTables: session.activeTables,
    tablePrice: session.tablePrice,
    restaurantCommissionPercent:
      session.restaurantCommissionPercent ?? breakdown.restaurantCommissionPercent,
    restaurantCommissionAmount:
      session.restaurantCommissionAmount ?? breakdown.restaurantCommissionAmount,
    hlCommissionMode: session.hlCommissionMode ?? breakdown.hlCommissionMode,
    hlCommissionValue: session.hlCommissionValue ?? breakdown.hlCommissionValue,
    hlCommissionAmount: session.hlCommissionAmount ?? breakdown.hlCommissionAmount,
    commissionTotalPercent: session.commissionTotalPercent ?? breakdown.commissionTotalPercent,
    commissionTotalAmount: session.commissionTotalAmount ?? breakdown.commissionTotalAmount,
    hlFixedFee: session.hlFixedFee ?? breakdown.hlFixedFee,
    restaurantNetAmount: session.restaurantNetAmount ?? breakdown.restaurantNetAmount,
    commissionPercent: session.commissionPercent ?? breakdown.commissionNetPercent,
    commissionHLPercent: session.commissionHLPercent ?? breakdown.commissionHLPercent,
    commissionRestaurantPercent:
      session.commissionRestaurantPercent ?? breakdown.commissionRestaurantPercent,
    commissionNetPercent: session.commissionNetPercent ?? breakdown.commissionNetPercent,
    commissionHLAmount: session.commissionHLAmount ?? breakdown.commissionHLAmount,
    commissionRestaurantAmount:
      session.commissionRestaurantAmount ?? breakdown.commissionRestaurantAmount,
    commissionNetAmount: session.commissionNetAmount ?? breakdown.commissionNetAmount,
    grossRevenue: session.grossRevenue ?? breakdown.grossRevenue,
    prizeAmount: session.prizeAmount ?? breakdown.prizeAmount,
    basePrizeAmount: session.basePrizeAmount ?? session.prizeAmount ?? breakdown.prizeAmount,
    accumulatedContributionAmount: session.accumulatedContributionAmount ?? 0,
    accumulatedPrizeAmount: session.accumulatedPrizeAmount ?? 0,
    accumulatedAppliedAt: session.accumulatedAppliedAt,
    gameType: session.gameType ?? "normal",
    calledCards: [],
    winnerFolio: undefined,
    winnerCards: [],
    autoplayStatus: "idle",
    autoplayIntervalSeconds: session.autoplayIntervalSeconds ?? 5,
    preStartCountdownSeconds: session.preStartCountdownSeconds ?? 60,
    preStartStartedAt: session.preStartStartedAt,
    autoplayStartedAt: session.autoplayStartedAt,
    playStartedAt: session.playStartedAt,
    playEndedAt: session.playEndedAt,
    activePromotions: session.activePromotions ?? [],
    status: "active",
    durationSeconds: session.durationSeconds ?? 0,
  };
  const finalizedCurrentSessions = getSessions().map((currentSession) =>
    currentSession.restaurantId === createdSession.restaurantId &&
    currentSession.status === "active"
      ? finalizeSession(currentSession, now)
      : currentSession,
  );

  saveSessions([createdSession, ...finalizedCurrentSessions]);
  return createdSession;
}

export function updateSession(
  sessionId: string,
  updates: Partial<Omit<Session, "id">>,
  options: { syncSupabase?: boolean } = {},
) {
  const sessions = getSessions();
  const now = new Date().toISOString();
  const updatedSessions = sessions.map((session) => {
    if (session.id !== sessionId) {
      return session;
    }

    const nextSession: Partial<Session> = {
      ...session,
      ...updates,
      lastUpdatedAt: now,
    };

    if (updates.autoplayStatus === "playing" && !session.playStartedAt) {
      nextSession.playStartedAt = now;
    }

    if (
      (updates.autoplayStatus === "finished" || updates.status !== undefined || updates.winnerFolio) &&
      session.playStartedAt &&
      !session.playEndedAt
    ) {
      const playEndedAt = updates.playEndedAt ?? updates.endedAt ?? now;
      nextSession.playEndedAt = playEndedAt;
      nextSession.durationSeconds = calculatePlayDurationSeconds(
        { ...session, ...nextSession },
        playEndedAt,
      );
    }

    return normalizeSession(nextSession);
  });

  saveSessions(updatedSessions);
  const updatedSession = updatedSessions.find((session) => session.id === sessionId);
  if (updatedSession && options.syncSupabase !== false) {
    syncSessionToSupabase(updatedSession);
  }
  return updatedSession;
}

export function closeSession(sessionId: string, updates: Partial<Omit<Session, "id">> = {}) {
  const session = getSessionById(sessionId);

  if (!session) {
    return undefined;
  }

  const endedAt = updates.endedAt ?? new Date().toISOString();

  const nextStatus = updates.status ?? (session.winnerFolio || updates.winnerFolio ? "completed" : "closed_without_winner");

  const closedSession = updateSession(sessionId, {
    ...updates,
    endedAt,
    status: nextStatus,
    autoplayStatus: "finished",
    playEndedAt: updates.playEndedAt ?? session.playEndedAt ?? endedAt,
    durationSeconds:
      (updates.durationSeconds ??
      session.durationSeconds) ||
      calculatePlayDurationSeconds(session, endedAt),
  });

  if (closedSession?.status === "completed") {
    void import("@/lib/accumulated/accumulatedStorage").then(
      ({ applyCompletedSessionToAccumulated }) =>
        applyCompletedSessionToAccumulated(closedSession),
    );
  }

  return closedSession;
}

export function cancelSession(sessionId: string) {
  const session = getSessionById(sessionId);

  if (!session) {
    return undefined;
  }

  const endedAt = new Date().toISOString();

  return updateSession(sessionId, {
    endedAt,
    status: "cancelled",
    autoplayStatus: "finished",
    playEndedAt: session.playEndedAt ?? endedAt,
    durationSeconds: session.durationSeconds || calculatePlayDurationSeconds(session, endedAt),
  });
}

export function getActiveSessionByRestaurantId(restaurantId: string) {
  const slug = getRestaurantById(restaurantId)?.id ?? normalizeRestaurantSlug(restaurantId);
  return getSessions().find(
    (session) => session.restaurantId === slug && session.status === "active",
  );
}

export function getActiveSession(restaurantId?: string) {
  if (restaurantId) {
    return getActiveSessionByRestaurantId(restaurantId);
  }

  return getSessions().find(
    (session) => session.status === "active",
  );
}
