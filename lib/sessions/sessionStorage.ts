import { loteriaCards, type LoteriaCard, type WinMode } from "@/lib/loteria";

export type SessionStatus = "active" | "finalized";

export type Session = {
  id: string;
  batchId?: string;
  restaurantId: string;
  restaurantName: string;
  createdAt: string;
  startedAt: string;
  endedAt?: string;
  mode: WinMode;
  activeTables: number;
  tablePrice: number;
  commissionPercent: number;
  prizeAmount: number;
  calledCards: string[];
  winnerFolio?: string;
  winnerCards: string[];
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
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  if (!hasLocalStorage()) {
    return sessions;
  }

  window.localStorage.setItem(sessionsStorageKey, JSON.stringify(sessions));
  return sessions;
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
    | "winnerFolio"
    | "winnerCards"
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
        | "winnerFolio"
        | "winnerCards"
        | "status"
        | "durationSeconds"
      >
    >,
) {
  const now = new Date().toISOString();
  const createdSession: Session = {
    id: session.id ?? createSessionId(),
    batchId: session.batchId,
    restaurantId: session.restaurantId,
    restaurantName: session.restaurantName,
    createdAt: session.createdAt ?? now,
    startedAt: session.startedAt ?? now,
    mode: session.mode,
    activeTables: session.activeTables,
    tablePrice: session.tablePrice,
    commissionPercent: session.commissionPercent,
    prizeAmount: session.prizeAmount,
    calledCards: session.calledCards ?? [],
    winnerFolio: session.winnerFolio,
    winnerCards: session.winnerCards ?? [],
    status: session.status ?? "active",
    durationSeconds: session.durationSeconds ?? 0,
  };

  saveSessions([createdSession, ...getSessions()]);
  return createdSession;
}

export function updateSession(sessionId: string, updates: Partial<Omit<Session, "id">>) {
  const sessions = getSessions();
  const updatedSessions = sessions.map((session) =>
    session.id === sessionId ? { ...session, ...updates } : session,
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
    durationSeconds: calculateDurationSeconds(session.startedAt, endedAt),
  });
}

export function getActiveSession(restaurantId?: string) {
  return getSessions().find(
    (session) =>
      session.status === "active" && (!restaurantId || session.restaurantId === restaurantId),
  );
}
