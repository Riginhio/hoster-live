import { loteriaCards, type LoteriaCard, type WinMode } from "@/lib/loteria";
import { calculateFinancialBreakdown } from "@/lib/finance";
import type { QrCampaign } from "@/lib/types";

export type SessionStatus = "active" | "finalized";
export type AutoplayStatus = "idle" | "countdown" | "playing" | "paused" | "finished";

export type Session = {
  id: string;
  batchId?: string;
  restaurantId: string;
  restaurantName: string;
  createdAt: string;
  startedAt: string;
  endedAt?: string;
  lastUpdatedAt: string;
  mode: WinMode;
  activeTables: number;
  tablePrice: number;
  commissionPercent: number;
  commissionHLPercent: number;
  commissionRestaurantPercent: number;
  commissionNetPercent: number;
  commissionHLAmount: number;
  commissionRestaurantAmount: number;
  commissionNetAmount: number;
  grossRevenue: number;
  prizeAmount: number;
  calledCards: string[];
  winnerFolio?: string;
  winnerCards: string[];
  autoplayStatus: AutoplayStatus;
  autoplayIntervalSeconds: number;
  preStartCountdownSeconds: number;
  preStartStartedAt?: string;
  autoplayStartedAt?: string;
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

export function getSessionDeck(sessionId: string) {
  return seededShuffle(loteriaCards, hashSeed(sessionId));
}

export function findSessionCard(cardId: string) {
  return loteriaCards.find(
    (card) =>
      card.id === cardId ||
      card.slug === cardId ||
      `el-${card.slug}` === cardId ||
      `la-${card.slug}` === cardId ||
      `las-${card.slug}` === cardId,
  );
}

export function hydrateSessionCards(cardIds: string[]) {
  return cardIds
    .map((cardId) => findSessionCard(cardId))
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
    return Array.isArray(parsedValue) ? parsedValue.map(normalizeSession) : [];
  } catch {
    return [];
  }
}

function normalizeSession(session: Partial<Session>): Session {
  const breakdown = calculateFinancialBreakdown({
    activeTables: session.activeTables ?? 0,
    tablePrice: session.tablePrice ?? 0,
    commissionHLPercent: session.commissionHLPercent,
    commissionRestaurantPercent: session.commissionRestaurantPercent,
    commissionPercent: session.commissionPercent,
  });

  return {
    id: session.id ?? createSessionId(),
    batchId: session.batchId,
    restaurantId: session.restaurantId ?? "rancho-viejo",
    restaurantName: session.restaurantName ?? "Rancho Viejo",
    createdAt: session.createdAt ?? new Date().toISOString(),
    startedAt: session.startedAt ?? session.createdAt ?? new Date().toISOString(),
    endedAt: session.endedAt,
    lastUpdatedAt: session.lastUpdatedAt ?? session.createdAt ?? new Date().toISOString(),
    mode: session.mode ?? "four_corners",
    activeTables: session.activeTables ?? 0,
    tablePrice: session.tablePrice ?? 0,
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
    calledCards: session.calledCards ?? [],
    winnerFolio: session.winnerFolio,
    winnerCards: session.winnerCards ?? [],
    autoplayStatus:
      session.autoplayStatus ?? (session.status === "finalized" ? "finished" : "idle"),
    autoplayIntervalSeconds: session.autoplayIntervalSeconds ?? 5,
    preStartCountdownSeconds: session.preStartCountdownSeconds ?? 60,
    preStartStartedAt: session.preStartStartedAt,
    autoplayStartedAt: session.autoplayStartedAt,
    activePromotions: session.activePromotions ?? [],
    status: session.status ?? "active",
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

function finalizeSession(session: Session, endedAt: string): Session {
  return normalizeSession({
    ...session,
    endedAt,
    status: "finalized",
    autoplayStatus: "finished",
    lastUpdatedAt: endedAt,
    durationSeconds: calculateDurationSeconds(session.startedAt, endedAt),
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
    | "batchId"
    | "startedAt"
    | "endedAt"
    | "calledCards"
    | "lastUpdatedAt"
    | "commissionHLPercent"
    | "commissionRestaurantPercent"
    | "commissionNetPercent"
    | "commissionHLAmount"
    | "commissionRestaurantAmount"
    | "commissionNetAmount"
    | "grossRevenue"
    | "winnerFolio"
    | "winnerCards"
    | "autoplayStatus"
    | "autoplayIntervalSeconds"
    | "preStartCountdownSeconds"
    | "preStartStartedAt"
    | "autoplayStartedAt"
    | "activePromotions"
    | "status"
    | "durationSeconds"
  > &
    Partial<
      Pick<
        Session,
        | "id"
        | "createdAt"
        | "startedAt"
        | "batchId"
        | "calledCards"
        | "lastUpdatedAt"
        | "commissionHLPercent"
        | "commissionRestaurantPercent"
        | "commissionNetPercent"
        | "commissionHLAmount"
        | "commissionRestaurantAmount"
        | "commissionNetAmount"
        | "grossRevenue"
        | "winnerFolio"
        | "winnerCards"
        | "autoplayStatus"
        | "autoplayIntervalSeconds"
        | "preStartCountdownSeconds"
        | "preStartStartedAt"
        | "autoplayStartedAt"
        | "activePromotions"
        | "status"
        | "durationSeconds"
      >
    >,
) {
  const now = new Date().toISOString();
  const breakdown = calculateFinancialBreakdown({
    activeTables: session.activeTables,
    tablePrice: session.tablePrice,
    commissionHLPercent: session.commissionHLPercent,
    commissionRestaurantPercent: session.commissionRestaurantPercent,
    commissionPercent: session.commissionPercent,
  });
  const createdSession: Session = {
    id: session.id ?? createSessionId(),
    batchId: session.batchId,
    restaurantId: session.restaurantId,
    restaurantName: session.restaurantName,
    createdAt: session.createdAt ?? now,
    startedAt: session.startedAt ?? now,
    lastUpdatedAt: session.lastUpdatedAt ?? now,
    mode: session.mode,
    activeTables: session.activeTables,
    tablePrice: session.tablePrice,
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
    calledCards: [],
    winnerFolio: undefined,
    winnerCards: [],
    autoplayStatus: "idle",
    autoplayIntervalSeconds: session.autoplayIntervalSeconds ?? 5,
    preStartCountdownSeconds: session.preStartCountdownSeconds ?? 60,
    preStartStartedAt: session.preStartStartedAt,
    autoplayStartedAt: session.autoplayStartedAt,
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

export function updateSession(sessionId: string, updates: Partial<Omit<Session, "id">>) {
  const sessions = getSessions();
  const updatedSessions = sessions.map((session) =>
    session.id === sessionId
      ? normalizeSession({ ...session, ...updates, lastUpdatedAt: new Date().toISOString() })
      : session,
  );

  saveSessions(updatedSessions);
  return updatedSessions.find((session) => session.id === sessionId);
}

export function closeSession(sessionId: string, updates: Partial<Omit<Session, "id">> = {}) {
  const session = getSessionById(sessionId);

  if (!session) {
    return undefined;
  }

  const endedAt = updates.endedAt ?? new Date().toISOString();

  return updateSession(sessionId, {
    ...updates,
    endedAt,
    status: "finalized",
    autoplayStatus: "finished",
    durationSeconds: calculateDurationSeconds(session.startedAt, endedAt),
  });
}

export function getActiveSessionByRestaurantId(restaurantId: string) {
  return getSessions().find(
    (session) => session.restaurantId === restaurantId && session.status === "active",
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
