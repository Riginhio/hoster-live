"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Ban,
  CircleDollarSign,
  Clock3,
  Megaphone,
  Pause,
  Play,
  Power,
  Radio,
  ScanSearch,
  SkipForward,
  Trophy,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/auth/AuthProvider";
import { BrandMark } from "@/components/brand/BrandMark";
import { checkWinner, type LoteriaBoard, type LoteriaCard, type WinMode } from "@/lib/loteria";
import {
  cancelSession,
  closeSession,
  getActiveSession,
  getSessionById,
  getSessionDeck,
  hydrateSessionCards,
  updateSession,
  type Session,
} from "@/lib/sessions/sessionStorage";
import {
  getActiveBoardBatchByDeck,
  getBoardBatches,
  toLoteriaBoards,
  type BoardBatch,
} from "@/lib/boards/boardBatchStorage";
import {
  getStoredAudioEnabled,
  playGameTone,
  setStoredAudioEnabled,
  unlockGameAudio,
} from "@/lib/audio/gameAudio";
import { getSupabaseConfigStatus } from "@/lib/supabase/client";
import {
  closeRealtimeSession,
  createRealtimeSession,
  getLatestRealtimeSessionByRestaurantId,
  realtimeSessionToSession,
  type RealtimeSessionUpdate,
  updateRealtimeSession,
} from "@/lib/supabase/sessionRealtime";
import { preloadDeckImages, resetDeckPreloadCache } from "@/lib/decks/preloadImages";
import { decks } from "@/lib/decks";

const modeLabels: Record<WinMode, string> = {
  four_corners: "4 esquinas",
  x_shape: "Figura X",
  center_four: "Centro 4",
  full_card: "Llena",
};

const speedOptions = [3000, 5000, 8000];
const countdownOptions = [60, 180, 300];

type WinnerState = {
  folio: string;
  cards: LoteriaCard[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCountdownRemainingSeconds(session: Session | null) {
  if (!session?.preStartStartedAt || session.autoplayStatus !== "countdown") {
    return session?.preStartCountdownSeconds ?? 0;
  }

  const startedAt = new Date(session.preStartStartedAt).getTime();

  if (!Number.isFinite(startedAt)) {
    return session.preStartCountdownSeconds;
  }

  const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
  return Math.max(0, session.preStartCountdownSeconds - elapsedSeconds);
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getPlayElapsedSeconds(session: Session | null) {
  if (!session?.playStartedAt) {
    return session?.durationSeconds ?? 0;
  }

  if (session.playEndedAt) {
    return session.durationSeconds;
  }

  return Math.max(0, Math.floor((Date.now() - new Date(session.playStartedAt).getTime()) / 1000));
}

function getBatchForSession(session: Session) {
  if (session.batchId) {
    return getBoardBatches().find((batch) => batch.id === session.batchId) ?? null;
  }

  return getActiveBoardBatchByDeck(session.restaurantId, session.deckId) ?? null;
}

function getWinnerFromSession(session: Session | null): WinnerState | null {
  if (!session?.winnerFolio) {
    return null;
  }

  return {
    folio: session.winnerFolio,
    cards: hydrateSessionCards(session.winnerCards, session.deckId),
  };
}

function syncRealtimeFromSession(
  session: Session,
  updates: RealtimeSessionUpdate,
  timingLabel?: string,
) {
  if (timingLabel) {
    console.time(`${timingLabel} escritura Supabase`);
  }

  return updateRealtimeSession(session.id, {
    ...updates,
    lastUpdatedAt: session.lastUpdatedAt,
  }).then((result) => {
    if (timingLabel) {
      console.timeEnd(`${timingLabel} escritura Supabase`);
      console.time(`${timingLabel} emision realtime`);
      console.timeEnd(`${timingLabel} emision realtime`);
    }

    if (result.mode === "supabase" && (result.error || !result.data)) {
      console.warn("[HOSTER LIVE] Fallo sync realtime; reintentando insert completo.", result.error);
      void createRealtimeSession(session);
    }

    return result;
  }).catch((error) => {
    if (timingLabel) {
      console.timeEnd(`${timingLabel} escritura Supabase`);
    }
    console.warn("[HOSTER LIVE] No se pudo sincronizar TV.", error);
    return null;
  });
}

export default function JugadaActivaPage() {
  const { currentUser } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [activeBatch, setActiveBatch] = useState<BoardBatch | null>(null);
  const [calledCards, setCalledCards] = useState<LoteriaCard[]>([]);
  const [winner, setWinner] = useState<WinnerState | null>(null);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [playElapsedSeconds, setPlayElapsedSeconds] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [tvSyncStatus, setTvSyncStatus] = useState<"idle" | "syncing" | "sent" | "warning" | "reconnecting">("idle");
  const [lastImageTimingCardId, setLastImageTimingCardId] = useState("");
  const [syncSource, setSyncSource] = useState("localStorage");
  const previousDeckIdRef = useRef<string | undefined>(undefined);
  const supabaseStatus = getSupabaseConfigStatus();

  const restaurantId = currentUser?.restaurantId;

  const activeBoards = useMemo<LoteriaBoard[]>(() => {
    if (!activeBatch || !session) {
      return [];
    }

    return toLoteriaBoards(activeBatch.boards).slice(0, session.activeTables);
  }, [activeBatch, session]);

  const deck = session ? getSessionDeck(session.id, session.deckId) : [];
  const deckSize = deck.length || 54;
  const currentCard = calledCards[calledCards.length - 1] ?? null;
  const nextCard = session ? deck[session.calledCards.length] ?? null : null;
  const progressPercent = Math.round((calledCards.length / deckSize) * 100);
  const statusLabel = session?.status === "active" ? "activa" : session?.status ?? "cerrada";
  const autoplayStatus = session?.autoplayStatus ?? "idle";
  const activePromotions = session?.activePromotions ?? [];
  const tvSyncLabel =
    tvSyncStatus === "syncing"
      ? "Sincronizando TV..."
      : tvSyncStatus === "sent"
        ? "Carta enviada"
        : tvSyncStatus === "warning"
          ? "TV pendiente"
          : supabaseStatus.connected
            ? "Realtime listo"
            : "Reconectando realtime";

  useEffect(() => {
    if (!session?.deckId) {
      return;
    }

    if (previousDeckIdRef.current && previousDeckIdRef.current !== session.deckId) {
      setCalledCards([]);
      setWinner(null);
      setLastImageTimingCardId("");
      resetDeckPreloadCache(previousDeckIdRef.current);
    }

    previousDeckIdRef.current = session.deckId;

    void preloadDeckImages(session.deckId, "gerente");
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    setIntervalMs((session.autoplayIntervalSeconds ?? 5) * 1000);
  }, [session]);

  useEffect(() => {
    if (!currentCard) {
      return;
    }

    const timingLabel = `[HL timing] gerente render final ${currentCard.id}`;
    console.time(timingLabel);
    requestAnimationFrame(() => {
      console.timeEnd(timingLabel);
    });
  }, [currentCard]);

  const syncActiveSession = useCallback(async () => {
    if (!restaurantId) {
      setSession(null);
      setActiveBatch(null);
      setCalledCards([]);
      setWinner(null);
      return;
    }

    const remoteResult = await getLatestRealtimeSessionByRestaurantId(restaurantId);
    const remoteSession = remoteResult.data ? realtimeSessionToSession(remoteResult.data) : null;
    const activeSession = session?.id ? getSessionById(session.id) : getActiveSession(restaurantId);
    const latestLocalSession =
      getActiveSession(restaurantId) ??
      (session?.id ? getSessionById(session.id) : undefined) ??
      null;
    const normalizedSession =
      activeSession?.status === "active"
        ? activeSession
        : remoteSession ?? latestLocalSession ?? null;

    setSession(normalizedSession);
    setActiveBatch(normalizedSession ? getBatchForSession(normalizedSession) : null);
    setCalledCards(
      normalizedSession ? hydrateSessionCards(normalizedSession.calledCards, normalizedSession.deckId) : [],
    );
    setWinner(getWinnerFromSession(normalizedSession));
    setSyncSource(remoteSession ? "Supabase" : "localStorage");
    console.info("[HOSTER LIVE][GERENTE ACTIVA] debug", {
      user: currentUser?.email ?? currentUser?.name,
      restaurantId,
      latestSessionId: normalizedSession?.id,
      latestSessionDeckId: normalizedSession?.deckId,
      latestSessionStatus: normalizedSession?.status,
      source: remoteSession ? "Supabase" : "localStorage",
    });

  }, [currentUser?.email, currentUser?.name, restaurantId, session?.id]);

  useEffect(() => {
    void syncActiveSession();
    const intervalId = globalThis.setInterval(() => void syncActiveSession(), 2500);
    const handleStorage = () => void syncActiveSession();
    window.addEventListener("storage", handleStorage);
    return () => {
      globalThis.clearInterval(intervalId);
      window.removeEventListener("storage", handleStorage);
    };
  }, [syncActiveSession]);

  useEffect(() => {
    const updateCountdown = () => setCountdownRemaining(getCountdownRemainingSeconds(session));

    updateCountdown();
    const intervalId = globalThis.setInterval(updateCountdown, 500);
    return () => globalThis.clearInterval(intervalId);
  }, [session]);

  useEffect(() => {
    setAudioEnabled(getStoredAudioEnabled());
  }, []);

  useEffect(() => {
    const updateElapsed = () => setPlayElapsedSeconds(getPlayElapsedSeconds(session));

    updateElapsed();
    const intervalId = globalThis.setInterval(updateElapsed, 1000);
    return () => globalThis.clearInterval(intervalId);
  }, [session]);

  const advanceSession = useCallback((sessionId: string) => {
    const clickTimingLabel = `[HL timing] cantar carta ${Date.now()}`;
    console.time(`${clickTimingLabel} click cantar carta`);
    const latestSession = getSessionById(sessionId);

    if (!latestSession || latestSession.status !== "active" || latestSession.winnerFolio) {
      console.timeEnd(`${clickTimingLabel} click cantar carta`);
      return;
    }

    console.time(`${clickTimingLabel} calculo local`);
    if (latestSession.autoplayStatus !== "playing") {
      console.timeEnd(`${clickTimingLabel} click cantar carta`);
      return;
    }

    const latestDeck = getSessionDeck(latestSession.id, latestSession.deckId);
    const nextSessionCard = latestDeck[latestSession.calledCards.length];
    const sessionBatch = getBatchForSession(latestSession);
    const sessionBoards = sessionBatch
      ? toLoteriaBoards(sessionBatch.boards).slice(0, latestSession.activeTables)
      : [];

    if (!nextSessionCard) {
      console.timeEnd(`${clickTimingLabel} calculo local`);
      console.timeEnd(`${clickTimingLabel} click cantar carta`);
      return;
    }

    const nextCalledCardIds = [...latestSession.calledCards, nextSessionCard.id];
    const winningBoard = sessionBoards
      .map((board) => ({
        board,
        result: checkWinner(board, nextCalledCardIds, latestSession.mode),
      }))
      .find(({ result }) => result.hasWon);
    const updates: Partial<Omit<Session, "id">> = {
      calledCards: nextCalledCardIds,
    };

    if (winningBoard) {
      updates.winnerFolio = winningBoard.board.folio;
      updates.winnerCards = winningBoard.result.winningCards.map((card) => card.id);
      updates.autoplayStatus = "finished";
    }
    console.timeEnd(`${clickTimingLabel} calculo local`);

    console.time(`${clickTimingLabel} actualizacion local state`);
    const updatedSession =
      updateSession(latestSession.id, updates, { syncSupabase: false }) ?? latestSession;
    const nextHydratedCards = hydrateSessionCards(updatedSession.calledCards, updatedSession.deckId);

    setSession(updatedSession);
    setActiveBatch(sessionBatch);
    setCalledCards(nextHydratedCards);
    setWinner(getWinnerFromSession(updatedSession));
    setTvSyncStatus("syncing");
    console.timeEnd(`${clickTimingLabel} actualizacion local state`);
    playGameTone(winningBoard ? "winner" : "card", audioEnabled);
    console.timeEnd(`${clickTimingLabel} click cantar carta`);

    void syncRealtimeFromSession(
      updatedSession,
      {
        calledCards: updatedSession.calledCards,
        winnerFolio: updatedSession.winnerFolio,
        winnerCards: updatedSession.winnerCards,
        autoplayStatus: updatedSession.autoplayStatus,
        playStartedAt: updatedSession.playStartedAt,
        playEndedAt: updatedSession.playEndedAt,
        durationSeconds: updatedSession.durationSeconds,
      },
      clickTimingLabel,
    ).then((result) => {
      setTvSyncStatus(result && !result.error ? "sent" : "warning");
    });

  }, [audioEnabled]);

  const callNextCard = useCallback(() => {
    if (!session?.id || winner || !nextCard) {
      return;
    }

    advanceSession(session.id);
  }, [advanceSession, nextCard, session?.id, winner]);

  useEffect(() => {
    if (!session?.id || autoplayStatus !== "countdown") {
      return;
    }

    if (countdownRemaining <= 0) {
      const updatedSession = updateSession(session.id, {
        autoplayStatus: "playing",
        autoplayStartedAt: new Date().toISOString(),
      }, { syncSupabase: false });
      if (updatedSession) {
        void syncRealtimeFromSession(updatedSession, {
          autoplayStatus: updatedSession.autoplayStatus,
          autoplayStartedAt: updatedSession.autoplayStartedAt,
          playStartedAt: updatedSession.playStartedAt,
        });
      }
      void syncActiveSession();
    }
  }, [autoplayStatus, countdownRemaining, session?.id, syncActiveSession]);

  useEffect(() => {
    if (!session?.id || autoplayStatus !== "playing" || winner) {
      return;
    }

    const intervalId = globalThis.setInterval(
      () => advanceSession(session.id),
      (session.autoplayIntervalSeconds ?? intervalMs / 1000) * 1000,
    );
    return () => globalThis.clearInterval(intervalId);
  }, [advanceSession, autoplayStatus, intervalMs, session?.autoplayIntervalSeconds, session?.id, winner]);

  function closeActiveSession() {
    if (!session) {
      return;
    }

    const closedSession = closeSession(session.id, {
      calledCards: session.calledCards,
      winnerFolio: session.winnerFolio,
      winnerCards: session.winnerCards,
      autoplayStatus: "finished",
    });
    if (closedSession) {
      void closeRealtimeSession(closedSession.id, {
        status: closedSession.status,
        calledCards: closedSession.calledCards,
        winnerFolio: closedSession.winnerFolio,
        winnerCards: closedSession.winnerCards,
        playEndedAt: closedSession.playEndedAt,
        durationSeconds: closedSession.durationSeconds,
        lastUpdatedAt: closedSession.lastUpdatedAt,
      });
    }
    setSession(null);
    setActiveBatch(null);
    setCalledCards([]);
    setWinner(null);
  }

  function cancelActiveSession() {
    if (!session) {
      return;
    }

    const cancelledSession = cancelSession(session.id);
    if (cancelledSession) {
      void closeRealtimeSession(cancelledSession.id, {
        status: "cancelled",
        calledCards: cancelledSession.calledCards,
        playEndedAt: cancelledSession.playEndedAt,
        durationSeconds: cancelledSession.durationSeconds,
        lastUpdatedAt: cancelledSession.lastUpdatedAt,
      });
    }
    setSession(null);
    setActiveBatch(null);
    setCalledCards([]);
    setWinner(null);
  }

  async function enableAudio() {
    const unlocked = await unlockGameAudio();
    setAudioEnabled(unlocked);
  }

  function disableAudio() {
    setStoredAudioEnabled(false);
    setAudioEnabled(false);
  }

  function startCountdown() {
    if (!session) {
      return;
    }

    const updatedSession = updateSession(session.id, {
      autoplayStatus: "countdown",
      preStartCountdownSeconds: countdownSeconds,
      preStartStartedAt: new Date().toISOString(),
      autoplayStartedAt: undefined,
    }, { syncSupabase: false });
    if (updatedSession) {
      void syncRealtimeFromSession(updatedSession, {
        autoplayStatus: updatedSession.autoplayStatus,
        preStartCountdownSeconds: updatedSession.preStartCountdownSeconds,
        preStartStartedAt: updatedSession.preStartStartedAt,
        autoplayStartedAt: updatedSession.autoplayStartedAt,
      });
    }
    void syncActiveSession();
  }

  function startAutoplayDirect() {
    if (!session) {
      return;
    }

    const updatedSession = updateSession(session.id, {
      autoplayStatus: "playing",
      autoplayIntervalSeconds: intervalMs / 1000,
      autoplayStartedAt: new Date().toISOString(),
    }, { syncSupabase: false });
    if (updatedSession) {
      void syncRealtimeFromSession(updatedSession, {
        autoplayStatus: updatedSession.autoplayStatus,
        autoplayIntervalSeconds: updatedSession.autoplayIntervalSeconds,
        autoplayStartedAt: updatedSession.autoplayStartedAt,
        playStartedAt: updatedSession.playStartedAt,
      });
    }
    void syncActiveSession();
  }

  function pauseAutoplay() {
    if (!session) {
      return;
    }

    const updatedSession = updateSession(session.id, {
      autoplayStatus: "paused",
    }, { syncSupabase: false });
    if (updatedSession) {
      void syncRealtimeFromSession(updatedSession, {
        autoplayStatus: updatedSession.autoplayStatus,
      });
    }
    void syncActiveSession();
  }

  function resumeAutoplay() {
    if (!session) {
      return;
    }

    const updatedSession = updateSession(session.id, {
      autoplayStatus: "playing",
      autoplayStartedAt: session.autoplayStartedAt ?? new Date().toISOString(),
    }, { syncSupabase: false });
    if (updatedSession) {
      void syncRealtimeFromSession(updatedSession, {
        autoplayStatus: updatedSession.autoplayStatus,
        autoplayStartedAt: updatedSession.autoplayStartedAt,
      });
    }
    void syncActiveSession();
  }

  if (!session) {
    return (
      <Layout title="Jugada activa" eyebrow="HOSTER LIVE">
        <Card accent className="mx-auto max-w-3xl text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg border border-mezcal/35 bg-mezcal/10 text-mezcal shadow-glow">
            <Radio size={30} />
          </div>
          <h2 className="mt-5 font-display text-5xl text-bone">No hay jugada activa</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-bone/60">
            Crea una jugada para el restaurante del gerente y esta pantalla tomara el control
            operativo en vivo.
          </p>
          <ButtonLink href="/gerente" className="mt-6">
            Ir al panel rapido
          </ButtonLink>
        </Card>
      </Layout>
    );
  }

  if (session.status !== "active") {
    const finalStatusLabel =
      session.status === "completed"
        ? "Jugada finalizada"
        : session.status === "cancelled"
          ? "Jugada cancelada"
          : "Cerrada sin ganador";

    return (
      <Layout title="Jugada activa" eyebrow="HOSTER LIVE">
        <Card accent className="mx-auto max-w-4xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-mezcal">
                {finalStatusLabel}
              </p>
              <h2 className="mt-2 font-display text-5xl text-bone">{session.restaurantName}</h2>
              <p className="mt-2 text-sm font-semibold text-bone/60">
                Source: {syncSource} · Session {session.id.slice(0, 12)}
              </p>
            </div>
            <ButtonLink href="/gerente" variant="secondary">
              Volver al panel
            </ButtonLink>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoTile label="Deck" value={decks[session.deckId]?.label ?? session.deckId} />
            <InfoTile label="Lote" value={activeBatch?.name ?? "Sin lote local"} />
            <InfoTile label="Ganador" value={session.winnerFolio ?? "Sin ganador"} />
            <InfoTile label="Cartas" value={`${calledCards.length}/${deckSize}`} />
            <InfoTile label="Modalidad" value={modeLabels[session.mode]} />
            <InfoTile label="Premio" value={formatCurrency(session.prizeAmount)} />
            <InfoTile label="Estado" value={session.status} />
            <InfoTile label="Actualizada" value={new Date(session.lastUpdatedAt).toLocaleString("es-MX")} />
          </div>
          {calledCards.length ? (
            <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6 md:grid-cols-9">
              {calledCards.slice(-18).reverse().map((card) => (
                <MiniCard key={card.id} card={card} />
              ))}
            </div>
          ) : null}
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Jugada activa" eyebrow="HOSTER LIVE">
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <span
          className={`rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] ${
            tvSyncStatus === "syncing"
              ? "border-mezcal/30 bg-mezcal/10 text-mezcal"
              : tvSyncStatus === "sent"
                ? "border-agave/30 bg-agave/10 text-agave"
                : tvSyncStatus === "warning"
                  ? "border-chile/30 bg-chile/10 text-[#ff9b91]"
                  : "border-bone/10 bg-bone/[0.04] text-bone/55"
          }`}
        >
          {tvSyncLabel}
        </span>
        <span
          className={`rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] ${
            supabaseStatus.connected
              ? "border-agave/30 bg-agave/10 text-agave"
              : "border-mezcal/30 bg-mezcal/10 text-mezcal"
          }`}
          title={supabaseStatus.message}
        >
          {supabaseStatus.connected ? "Realtime conectado" : "Fallback local"}
        </span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card accent className="bg-charcoal/90">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <BrandMark className="h-12 w-12" textClassName="text-base" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.26em] text-mezcal">
                  Operacion en vivo
                </p>
                <h2 className="font-display text-4xl text-bone">{session.restaurantName}</h2>
              </div>
            </div>
            <span
              className={`w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
                session.status === "active"
                  ? "border-agave/35 bg-agave/12 text-agave"
                  : "border-bone/15 bg-bone/[0.04] text-bone/55"
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Session ID" value={session.id.slice(0, 12)} />
            <InfoTile label="Juego" value="Loteria" />
            <InfoTile label="Deck" value={decks[session.deckId]?.label ?? session.deckId} />
            <InfoTile label="Lote" value={activeBatch?.name ?? "Sin lote"} />
            <InfoTile label="Modalidad" value={modeLabels[session.mode]} />
            <InfoTile label="Tablas en juego" value={String(session.activeTables)} />
            <InfoTile label="Costo tabla" value={formatCurrency(session.tablePrice)} />
            <InfoTile label="Operador" value={session.operatorUsername ?? session.operatorRole ?? "Sin operador"} />
            <InfoTile label="Premio" value={formatCurrency(session.prizeAmount)} />
            <InfoTile label="Cartas cantadas" value={`${calledCards.length}/${deckSize}`} />
            <InfoTile label="Estado" value={autoplayStatus} />
            <InfoTile label="Tiempo de jugada" value={formatDuration(playElapsedSeconds)} />
          </div>
        </Card>

        <Card className="bg-bone/[0.045]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-bone/45">
            Progreso operativo
          </p>
          <div className="mt-4 space-y-4">
            <ProgressRow icon={Clock3} label="Cartas cantadas" value={`${calledCards.length}/${deckSize}`} />
            <ProgressRow icon={ScanSearch} label="Tablas revisadas" value={String(activeBoards.length)} />
            <ProgressRow icon={Trophy} label="Folio ganador" value={winner?.folio ?? "Pendiente"} />
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-bone/10">
                <div
                  className="h-full rounded-full bg-agave transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-bone/45">{progressPercent}% del mazo operativo</p>
            </div>
          </div>
        </Card>
      </div>

      {autoplayStatus === "idle" || autoplayStatus === "countdown" ? (
        <Card accent className="mt-4 border-mezcal/40 bg-[radial-gradient(circle_at_50%_0%,rgba(217,164,65,0.18),rgba(20,17,15,0.94)_52%,rgba(8,7,6,0.98)_100%)]">
          <div className="grid gap-5 lg:grid-cols-[1fr_24rem] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-mezcal">
                Preinicio
              </p>
              <h3 className="mt-2 font-display text-5xl text-bone">
                La jugada está por comenzar
              </h3>
              <p className="mt-2 text-sm font-semibold text-bone/62">
                Promos activas durante esta jugada
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {activePromotions.length ? (
                  activePromotions.map((promotion) => (
                    <div key={promotion.id} className="rounded-lg border border-bone/10 bg-bone/[0.04] p-4">
                      <div className="flex items-start gap-3">
                        <Megaphone className="mt-1 shrink-0 text-mezcal" size={18} />
                        <div>
                          <p className="font-black text-bone">{promotion.title}</p>
                          <p className="mt-1 text-sm leading-5 text-bone/58">{promotion.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-bone/15 p-4 text-sm text-bone/55">
                    No hay promociones activas configuradas para esta jugada.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-bone/10 bg-obsidian/55 p-4">
              {autoplayStatus === "countdown" ? (
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-mezcal">
                    Cuenta regresiva
                  </p>
                  <p className="mt-2 font-display text-7xl leading-none text-bone">
                    {countdownRemaining}
                  </p>
                  <p className="mt-2 text-sm text-bone/55">segundos restantes</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-bone/45">
                    Duracion del preinicio
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {countdownOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setCountdownSeconds(option)}
                        className={`h-12 rounded-lg border text-sm font-black transition ${
                          countdownSeconds === option
                            ? "border-mezcal bg-mezcal text-obsidian shadow-glow"
                            : "border-bone/10 bg-bone/[0.04] text-bone hover:bg-bone/10"
                        }`}
                      >
                        {option / 60} min
                      </button>
                    ))}
                  </div>
                  <Button onClick={startCountdown} className="mt-4 w-full">
                    <Play size={18} />
                    Iniciar cuenta regresiva
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {winner ? (
        <Card className="mt-4 border-mezcal/45 bg-[linear-gradient(90deg,rgba(217,164,65,0.22),rgba(31,161,135,0.16),rgba(217,164,65,0.12))] shadow-glow">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-mezcal">
                TABLA GANADORA
              </p>
              <h3 className="mt-2 font-display text-5xl text-bone">{winner.folio}</h3>
              <p className="mt-2 text-sm font-semibold text-bone/65">
                Premio {formatCurrency(session.prizeAmount)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {winner.cards.map((card) => (
                  <MiniCard key={card.id} card={card} />
                ))}
              </div>
            </div>
            <Button onClick={closeActiveSession}>
              <BadgeCheck size={18} />
              Cerrar jugada
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <Card className="bg-[radial-gradient(circle_at_50%_0%,rgba(217,164,65,0.18),rgba(20,17,15,0.94)_44%,rgba(8,7,6,0.98)_100%)]">
          <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:justify-center">
            {audioEnabled ? (
              <Button variant="secondary" onClick={disableAudio} className="min-h-12 w-full lg:w-auto">
                <Volume2 size={18} />
                Sonido activo
              </Button>
            ) : (
              <Button variant="secondary" onClick={enableAudio} className="min-h-12 w-full lg:w-auto">
                <VolumeX size={18} />
                Sonido inactivo
              </Button>
            )}
            <Button
              onClick={callNextCard}
              disabled={!nextCard || Boolean(winner) || autoplayStatus !== "playing"}
              className="min-h-12 w-full lg:w-auto"
            >
              <SkipForward size={18} />
              Cantar siguiente carta
            </Button>
            <Button
              variant="secondary"
              onClick={startAutoplayDirect}
              disabled={!nextCard || Boolean(winner) || autoplayStatus === "playing"}
              className="min-h-12 w-full lg:w-auto"
            >
              <Play size={18} />
              Iniciar autoplay directo
            </Button>
            <Button
              variant="secondary"
              onClick={pauseAutoplay}
              disabled={autoplayStatus !== "playing" && autoplayStatus !== "countdown"}
              className="min-h-12 w-full lg:w-auto"
            >
              <Pause size={18} />
              Pausar
            </Button>
            <Button
              variant="secondary"
              onClick={resumeAutoplay}
              disabled={autoplayStatus !== "paused"}
              className="min-h-12 w-full lg:w-auto"
            >
              <Play size={18} />
              Reanudar
            </Button>
            <Button variant="secondary" onClick={cancelActiveSession} className="min-h-12 w-full lg:w-auto">
              <Ban size={18} />
              Cancelar jugada
            </Button>
            <Button variant="danger" onClick={closeActiveSession} className="min-h-12 w-full lg:w-auto">
              <Power size={18} />
              {winner ? "Finalizar jugada" : "Cerrar sin ganador"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {speedOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  if (autoplayStatus !== "idle") {
                    return;
                  }
                  setIntervalMs(option);
                  if (session) {
                    const updatedSession = updateSession(session.id, {
                      autoplayIntervalSeconds: option / 1000,
                    }, { syncSupabase: false });
                    if (updatedSession) {
                      void syncRealtimeFromSession(updatedSession, {
                        autoplayIntervalSeconds: updatedSession.autoplayIntervalSeconds,
                      });
                    }
                    void syncActiveSession();
                  }
                }}
                disabled={autoplayStatus !== "idle"}
                className={`h-9 rounded-lg border px-4 text-xs font-black transition ${
                  intervalMs === option
                    ? "border-agave bg-agave text-obsidian"
                    : "border-bone/10 bg-bone/[0.04] text-bone/70 hover:bg-bone/10 disabled:cursor-not-allowed disabled:opacity-45"
                }`}
              >
                {option / 1000}s
              </button>
            ))}
          </div>

          <div className="mt-6 grid place-items-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full border border-mezcal/40 bg-mezcal/15 text-2xl font-black text-mezcal">
              {currentCard ? String(currentCard.number).padStart(2, "0") : "--"}
            </div>
            <div className="relative aspect-[0.63] w-full max-w-[390px] overflow-hidden rounded-lg border-2 border-mezcal bg-bone shadow-glow">
              {currentCard ? (
                <Image
                  src={currentCard.image}
                  alt={currentCard.name}
                  width={720}
                  height={1141}
                  className="h-full w-full object-contain"
                  priority
                  onLoad={() => {
                    if (lastImageTimingCardId === currentCard.id) {
                      return;
                    }

                    setLastImageTimingCardId(currentCard.id);
                    const timingLabel = `[HL timing] gerente carga imagen ${currentCard.id}`;
                    console.time(timingLabel);
                    console.timeEnd(timingLabel);
                  }}
                />
              ) : (
                <div className="grid h-full place-items-center bg-[linear-gradient(145deg,#f7edd9,#d8b56a)] p-6 text-obsidian">
                  <BrandMark
                    className="h-36 w-36 border-obsidian/65 shadow-none"
                    textClassName="text-[4rem] leading-none"
                  />
                </div>
              )}
            </div>
            <p className="mt-4 text-sm font-black uppercase tracking-[0.28em] text-bone/50">
              {currentCard?.name ?? "Carta actual"}
            </p>
            {currentCard?.confederation ? (
              <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-mezcal">
                {currentCard.confederation}
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="bg-charcoal/88">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-mezcal">
                Historial
              </p>
              <h3 className="font-display text-3xl text-bone">{calledCards.length}/{deckSize}</h3>
            </div>
            <CircleDollarSign className="text-agave" size={28} />
          </div>
          <div className="mt-4 max-h-[620px] space-y-2 overflow-auto pr-1">
            {[...calledCards].reverse().map((card, index) => (
              <div
                key={`${card.id}-${calledCards.length - index}`}
                className={`grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-lg border p-2 ${
                  index === 0
                    ? "border-mezcal bg-mezcal/12 shadow-glow"
                    : "border-bone/10 bg-bone/[0.04]"
                }`}
              >
                <Image
                  src={card.image}
                  alt={card.name}
                  width={72}
                  height={114}
                  className="h-12 w-9 rounded bg-bone object-contain p-0.5"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-bone">{card.name}</p>
                  {card.confederation ? (
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-mezcal">
                      {card.confederation}
                    </p>
                  ) : null}
                  <p className="text-xs text-bone/45">
                    Carta {String(card.number).padStart(2, "0")}
                  </p>
                </div>
                <span className="rounded-full bg-obsidian/70 px-2 py-1 text-xs font-black text-mezcal">
                  #{calledCards.length - index}
                </span>
              </div>
            ))}
            {calledCards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-bone/15 p-5 text-center text-sm text-bone/55">
                Aun no se han cantado cartas.
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </Layout>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-bone/10 bg-obsidian/45 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/40">{label}</p>
      <p className="mt-2 truncate text-sm font-black text-bone">{value}</p>
    </div>
  );
}

function ProgressRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-bone/10 bg-obsidian/45 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="shrink-0 text-mezcal" size={18} />
        <p className="truncate text-sm text-bone/62">{label}</p>
      </div>
      <p className="shrink-0 text-sm font-black text-bone">{value}</p>
    </div>
  );
}

function MiniCard({ card }: { card: LoteriaCard }) {
  return (
    <div className="w-20 rounded-lg border border-bone/10 bg-obsidian/55 p-1.5 text-center">
      <Image
        src={card.image}
        alt={card.name}
        width={96}
        height={152}
        className="mx-auto h-20 w-auto rounded object-contain"
      />
      <p className="mt-1 truncate text-[10px] font-semibold text-bone/70">{card.name}</p>
    </div>
  );
}
