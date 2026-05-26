import { checkWinner, type LoteriaBoard } from "@/lib/loteria";
import { getSessionDeck, type Session } from "@/lib/sessions/sessionStorage";

function addSeconds(isoDate: string, seconds: number) {
  const time = new Date(isoDate).getTime();

  if (!Number.isFinite(time)) {
    return new Date().toISOString();
  }

  return new Date(time + seconds * 1000).toISOString();
}

function getElapsedCardCount(session: Session, nowMs: number) {
  const startedAt = session.autoplayStartedAt
    ? new Date(session.autoplayStartedAt).getTime()
    : Number.NaN;
  const intervalSeconds = Math.max(1, session.autoplayIntervalSeconds || 5);

  if (!Number.isFinite(startedAt) || nowMs < startedAt) {
    return session.calledCards.length;
  }

  return Math.floor((nowMs - startedAt) / (intervalSeconds * 1000)) + 1;
}

export function reconcileSessionByClock(
  session: Session,
  boards: LoteriaBoard[],
  now = new Date(),
): Session {
  if (session.status !== "active" || session.winnerFolio || session.autoplayStatus === "finished") {
    return session;
  }

  let nextSession: Session = { ...session };
  const nowMs = now.getTime();

  if (nextSession.autoplayStatus === "countdown" && nextSession.preStartStartedAt) {
    const countdownStartedAt = new Date(nextSession.preStartStartedAt).getTime();
    const countdownMs = Math.max(0, nextSession.preStartCountdownSeconds || 0) * 1000;

    if (Number.isFinite(countdownStartedAt) && nowMs >= countdownStartedAt + countdownMs) {
      const autoplayStartedAt = addSeconds(
        nextSession.preStartStartedAt,
        nextSession.preStartCountdownSeconds || 0,
      );

      nextSession = {
        ...nextSession,
        autoplayStatus: "playing",
        autoplayStartedAt,
        playStartedAt: nextSession.playStartedAt ?? autoplayStartedAt,
      };
    }
  }

  if (nextSession.autoplayStatus !== "playing") {
    return nextSession;
  }

  const deck = getSessionDeck(nextSession.id, nextSession.deckId);
  const expectedCount = Math.min(deck.length, getElapsedCardCount(nextSession, nowMs));
  const currentCount = nextSession.calledCards.length;

  if (expectedCount <= currentCount) {
    return nextSession;
  }

  const nextCalledCards = deck.slice(0, expectedCount).map((card) => card.id);
  const winningBoard = boards
    .map((board) => ({
      board,
      result: checkWinner(board, nextCalledCards, nextSession.mode),
    }))
    .find(({ result }) => result.hasWon);
  const lastUpdatedAt = now.toISOString();

  if (winningBoard) {
    return {
      ...nextSession,
      calledCards: nextCalledCards,
      winnerFolio: winningBoard.board.folio,
      winnerCards: winningBoard.result.winningCards.map((card) => card.id),
      autoplayStatus: "finished",
      playEndedAt: nextSession.playEndedAt ?? lastUpdatedAt,
      durationSeconds: nextSession.playStartedAt
        ? Math.max(0, Math.round((nowMs - new Date(nextSession.playStartedAt).getTime()) / 1000))
        : nextSession.durationSeconds,
      lastUpdatedAt,
    };
  }

  if (expectedCount >= deck.length) {
    return {
      ...nextSession,
      calledCards: nextCalledCards,
      autoplayStatus: "finished",
      playEndedAt: nextSession.playEndedAt ?? lastUpdatedAt,
      durationSeconds: nextSession.playStartedAt
        ? Math.max(0, Math.round((nowMs - new Date(nextSession.playStartedAt).getTime()) / 1000))
        : nextSession.durationSeconds,
      lastUpdatedAt,
    };
  }

  return {
    ...nextSession,
    calledCards: nextCalledCards,
    lastUpdatedAt,
  };
}

export function sessionRuntimeChanged(previous: Session, next: Session) {
  return (
    previous.autoplayStatus !== next.autoplayStatus ||
    previous.calledCards.length !== next.calledCards.length ||
    previous.winnerFolio !== next.winnerFolio ||
    previous.playStartedAt !== next.playStartedAt ||
    previous.playEndedAt !== next.playEndedAt
  );
}
