"use client";

/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Megaphone, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/brand/BrandMark";
import type { LoteriaBoard, LoteriaCard } from "@/lib/loteria";
import type { WinMode } from "@/lib/loteria";
import {
  configStorageKey,
  createDefaultDemoConfig,
  parseStoredDemoConfig,
  type DemoGameConfig,
} from "@/lib/demoConfig";
import { getRestaurantById } from "@/lib/restaurants";
import {
  getActiveSessionByRestaurantId,
  getSessionById,
  hydrateSessionCards,
  type Session,
} from "@/lib/sessions/sessionStorage";
import {
  getActiveBoardBatch,
  getBoardBatches,
  toLoteriaBoards,
} from "@/lib/boards/boardBatchStorage";
import { getActiveQrCampaignsForRestaurant } from "@/lib/qr/qrCampaignStorage";
import {
  getStoredAudioEnabled,
  playGameTone,
  setStoredAudioEnabled,
  unlockGameAudio,
} from "@/lib/audio/gameAudio";
import { getSupabaseClientDebugStatus, getSupabaseConfigStatus } from "@/lib/supabase/client";
import {
  getActiveRealtimeSessionByRestaurantId,
  getLatestRealtimeSessionDebugByRestaurantId,
  isTerminalRealtimeSession,
  realtimeSessionToSession,
  subscribeToRestaurantSession,
  type RestaurantSessionChannelStatus,
  type RealtimeSessionDebugRow,
  updateRealtimeSession,
} from "@/lib/supabase/sessionRealtime";
import { getDeckCards } from "@/lib/decks";
import { getTvControl, type TvControl } from "@/lib/tv/tvControlStorage";
import { preloadDeckImages, resetDeckPreloadCache } from "@/lib/decks/preloadImages";
import { reconcileSessionByClock, sessionRuntimeChanged } from "@/lib/sessions/sessionRuntime";

type GameScreenProps = {
  restaurantId: string;
};

type WinnerState = {
  board: LoteriaBoard;
  winningCards: LoteriaCard[];
};

const modeLabels: Record<WinMode, string> = {
  four_corners: "4 esquinas",
  x_shape: "X",
  center_four: "4 centrales",
  full_card: "Llena",
};

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

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

function getSessionSyncSignature(session: Session) {
  return [
    session.id,
    session.lastUpdatedAt,
    session.autoplayStatus,
    session.calledCards.length,
    session.winnerFolio ?? "",
  ].join("|");
}

export function GameScreen({ restaurantId }: GameScreenProps) {
  const [config, setConfig] = useState<DemoGameConfig>(() =>
    createDefaultDemoConfig(restaurantId),
  );
  const [calledCards, setCalledCards] = useState<LoteriaCard[]>([]);
  const [winner, setWinner] = useState<WinnerState | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [playElapsedSeconds, setPlayElapsedSeconds] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [realtimeSession, setRealtimeSession] = useState<Session | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "supabase-polling" | "empty" | "disconnected" | "fallback">("fallback");
  const [channelStatus, setChannelStatus] = useState<RestaurantSessionChannelStatus | "NO_CLIENT">("NO_CLIENT");
  const [lastRealtimeError, setLastRealtimeError] = useState("");
  const [lastRealtimeSessionFound, setLastRealtimeSessionFound] = useState(false);
  const [latestRealtimeDebugRow, setLatestRealtimeDebugRow] = useState<RealtimeSessionDebugRow | null>(null);
  const [lastEventReceived, setLastEventReceived] = useState("sin eventos");
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const [tvControl, setTvControl] = useState<TvControl | undefined>();
  const lastSyncSignatureRef = useRef("");
  const previousCalledCountRef = useRef(0);
  const previousWinnerFolioRef = useRef<string | undefined>(undefined);
  const lastImageTimingRef = useRef("");
  const previousDeckIdRef = useRef<string | undefined>(undefined);
  const lastRuntimeWriteSignatureRef = useRef("");
  const supabaseStatus = getSupabaseConfigStatus();
  const supabaseDebugStatus = getSupabaseClientDebugStatus();
  const missingSupabaseVariables = supabaseStatus.missingVariables.join(", ");
  const syncBadgeLabel =
    realtimeStatus === "connected"
      ? "Realtime conectado"
      : realtimeStatus === "supabase-polling"
        ? "Supabase polling"
        : realtimeStatus === "empty"
        ? "Sin sesi?n realtime"
        : realtimeStatus === "disconnected"
        ? "Realtime desconectado"
        : "Fallback local";
  const tvDeliveryLabel =
    realtimeStatus === "connected"
      ? "Carta enviada"
      : realtimeStatus === "supabase-polling"
        ? "Sincronizando TV..."
        : realtimeStatus === "disconnected"
          ? "Reconectando realtime"
          : syncBadgeLabel;

  const restaurant = getRestaurantById(restaurantId);
  const tvRestaurantId = restaurant.id;
  const realtimeRestaurantId = tvRestaurantId;
  const restaurantPrimary = restaurant.primaryColor || restaurant.theme.primaryColor;
  const restaurantSecondary = restaurant.secondaryColor || restaurant.theme.secondaryColor;
  const restaurantAccent = restaurant.accentColor || "#d9a441";
  const currentCard = calledCards[calledCards.length - 1] ?? null;
  const isAccumulatedGame = activeSession?.gameType === "accumulated_special";
  const activePromotions = activeSession?.activePromotions ?? [];
  const deckSize = getDeckCards(activeSession?.deckId ?? restaurant.activeDeck).length;
  const standbyTitle = restaurant.standbyTitle || "HOSTER LIVE";
  const standbySubtitle =
    restaurant.standbySubtitle || "La proxima jugada esta por comenzar";
  const standbyPromoText =
    restaurant.standbyPromoText || "Compra tus tablas con tu hostess";
  const standbyCtaText = restaurant.standbyCtaText || "Pide tu tabla ahora";
  const standbyPromotions = restaurant.standbyRotatePromotions
    ? getActiveQrCampaignsForRestaurant(tvRestaurantId, "tv_standby")
    : [];
  const visualStatus = activeSession?.autoplayStatus === "countdown"
    ? "countdown"
    : activeSession?.status && activeSession.status !== "active"
      ? "finished"
      : winner
        ? "winner"
      : activeSession?.autoplayStatus ?? "idle";
  const activeSessionId = activeSession?.id ?? realtimeSession?.id ?? latestRealtimeDebugRow?.id ?? "-";
  const sessionStatus =
    activeSession?.status ??
    realtimeSession?.status ??
    latestRealtimeDebugRow?.status ??
    "sin sesion";

  function handleReconnectTv() {
    console.info("[HOSTER LIVE][TV] Reconectar TV solicitado", {
      restaurantId: realtimeRestaurantId,
      activeSessionId,
      sessionStatus,
      channelStatus,
    });
    setLastEventReceived(`reconexion manual ${new Date().toLocaleTimeString("es-MX")}`);
    lastSyncSignatureRef.current = "";
    previousCalledCountRef.current = 0;
    previousWinnerFolioRef.current = undefined;
    setActiveSession(null);
    setRealtimeSession(null);
    setCalledCards([]);
    setWinner(null);
    setLatestRealtimeDebugRow(null);
    setLastRealtimeSessionFound(false);
    setRealtimeStatus(supabaseStatus.connected ? "supabase-polling" : "fallback");
    setReconnectNonce((current) => current + 1);
  }

  useEffect(() => {
    console.info("[HOSTER LIVE][TV] debug", {
      restaurantId: realtimeRestaurantId,
      activeSessionId,
      sessionStatus,
      channelStatus,
      realtimeStatus,
      lastEventReceived,
    });
  }, [
    activeSessionId,
    channelStatus,
    lastEventReceived,
    realtimeRestaurantId,
    realtimeStatus,
    sessionStatus,
  ]);

  useEffect(() => {
    const nextDeckId = activeSession?.deckId ?? restaurant.activeDeck;

    if (previousDeckIdRef.current && previousDeckIdRef.current !== nextDeckId) {
      setCalledCards([]);
      setWinner(null);
      lastImageTimingRef.current = "";
      previousCalledCountRef.current = 0;
      previousWinnerFolioRef.current = undefined;
      resetDeckPreloadCache(previousDeckIdRef.current);
    }

    previousDeckIdRef.current = nextDeckId;
    void preloadDeckImages(activeSession?.deckId ?? restaurant.activeDeck, "tv");
  }, [activeSession?.deckId, restaurant.activeDeck]);

  useEffect(() => {
    if (!currentCard) {
      return;
    }

    const timingLabel = `[HL timing] TV render final ${currentCard.id}`;
    console.time(timingLabel);
    requestAnimationFrame(() => {
      console.timeEnd(timingLabel);
    });
  }, [currentCard]);

  useEffect(() => {
    const refreshTvControl = () => setTvControl(getTvControl(tvRestaurantId));

    refreshTvControl();
    window.addEventListener("storage", refreshTvControl);
    const intervalId = window.setInterval(refreshTvControl, 2000);

    return () => {
      window.removeEventListener("storage", refreshTvControl);
      window.clearInterval(intervalId);
    };
  }, [tvRestaurantId]);

  const statusLabel = useMemo(() => {
    const labels: Record<string, string> = {
      idle: "En espera",
      countdown: "Cuenta regresiva",
      playing: "En vivo",
      paused: "Pausada",
      winner: "Ganador",
      finished: "Finalizada",
    };

    return labels[visualStatus] ?? "En espera";
  }, [visualStatus]);

  useEffect(() => {
    function syncSession() {
      try {
        const activeRestaurantSession =
          realtimeSession?.status === "active"
            ? realtimeSession
            : getActiveSessionByRestaurantId(tvRestaurantId);
        const currentStoredSession = activeSession?.id
          ? getSessionById(activeSession.id)
          : undefined;
        const storedSession = activeRestaurantSession ?? currentStoredSession;

        if (storedSession) {
          const previousSessionId = activeSession?.id;
          const syncSignature = getSessionSyncSignature(storedSession);

          if (
            lastSyncSignatureRef.current === syncSignature &&
            storedSession.autoplayStatus !== "playing" &&
            storedSession.autoplayStatus !== "countdown"
          ) {
            return;
          }

          lastSyncSignatureRef.current = syncSignature;
          const sessionIdChanged = previousSessionId && previousSessionId !== storedSession.id;
          const sessionBatch = storedSession.batchId
            ? getBoardBatches().find((batch) => batch.id === storedSession.batchId)
            : getActiveBoardBatch(tvRestaurantId);
          const nextBoards = sessionBatch ? toLoteriaBoards(sessionBatch.boards) : [];
          const reconciledSession = reconcileSessionByClock(storedSession, nextBoards);
          const nextCalledCards = hydrateSessionCards(reconciledSession.calledCards, reconciledSession.deckId);
          const isCountdownSession = reconciledSession.autoplayStatus === "countdown";

          if (sessionRuntimeChanged(storedSession, reconciledSession)) {
            const writeSignature = [
              reconciledSession.id,
              reconciledSession.autoplayStatus,
              reconciledSession.calledCards.length,
              reconciledSession.winnerFolio ?? "",
              reconciledSession.playEndedAt ?? "",
            ].join("|");

            if (lastRuntimeWriteSignatureRef.current !== writeSignature) {
              lastRuntimeWriteSignatureRef.current = writeSignature;
              void updateRealtimeSession(reconciledSession.id, {
                autoplayStatus: reconciledSession.autoplayStatus,
                calledCards: reconciledSession.calledCards,
                winnerFolio: reconciledSession.winnerFolio,
                winnerCards: reconciledSession.winnerCards,
                autoplayStartedAt: reconciledSession.autoplayStartedAt,
                playStartedAt: reconciledSession.playStartedAt,
                playEndedAt: reconciledSession.playEndedAt,
                durationSeconds: reconciledSession.durationSeconds,
                lastUpdatedAt: reconciledSession.lastUpdatedAt,
              });
            }
          }

          if (sessionIdChanged) {
            setCalledCards([]);
            setWinner(null);
            setCountdownRemaining(0);
            previousCalledCountRef.current = 0;
            previousWinnerFolioRef.current = undefined;
          }

          setActiveSession(reconciledSession);
          setConfig({
            restaurantId: reconciledSession.restaurantId,
            activeTables: reconciledSession.activeTables,
            mode: reconciledSession.mode,
            tablePrice: reconciledSession.tablePrice,
            commissionPercent: reconciledSession.commissionPercent,
            restaurantCommissionPercent: reconciledSession.restaurantCommissionPercent,
            hlCommissionMode: reconciledSession.hlCommissionMode,
            hlCommissionValue: reconciledSession.hlCommissionValue,
            hlFixedFee: reconciledSession.hlFixedFee,
            calculatedPrize: reconciledSession.prizeAmount,
            createdAt: reconciledSession.createdAt,
          });
          if (reconciledSession.calledCards.length > previousCalledCountRef.current) {
            const timingLabel = `[HL timing] TV recepcion ${reconciledSession.calledCards.at(-1)}`;
            console.time(timingLabel);
            console.timeEnd(timingLabel);
          }
          setCalledCards(isCountdownSession ? [] : nextCalledCards);

          if (!isCountdownSession && !sessionIdChanged) {
            if (reconciledSession.calledCards.length > previousCalledCountRef.current) {
              playGameTone("card", audioEnabled);
            }

            if (reconciledSession.winnerFolio && reconciledSession.winnerFolio !== previousWinnerFolioRef.current) {
              playGameTone("winner", audioEnabled);
            }
          }

          previousCalledCountRef.current = isCountdownSession ? 0 : reconciledSession.calledCards.length;
          previousWinnerFolioRef.current = reconciledSession.winnerFolio;

          if (
            !isCountdownSession &&
            reconciledSession.winnerFolio &&
            reconciledSession.winnerCards.length > 0
          ) {
            const winningBoard = nextBoards.find(
              (board) => board.folio === reconciledSession.winnerFolio,
            );

            setWinner(
              winningBoard
                ? {
                    board: winningBoard,
                    winningCards: hydrateSessionCards(reconciledSession.winnerCards, reconciledSession.deckId),
                  }
                : null,
            );
          } else {
            setWinner(null);
          }

          return;
        }

        lastSyncSignatureRef.current = "none";
        setActiveSession(null);
        setRealtimeSession(null);
        setWinner(null);
        setCalledCards([]);
        previousCalledCountRef.current = 0;
        previousWinnerFolioRef.current = undefined;

        const parsedConfig = parseStoredDemoConfig(
          localStorage.getItem(configStorageKey),
          tvRestaurantId,
        );

        setConfig(
          parsedConfig.restaurantId === tvRestaurantId
            ? parsedConfig
            : createDefaultDemoConfig(tvRestaurantId),
        );
      } catch {
        setConfig(createDefaultDemoConfig(tvRestaurantId));
      }
    }

    syncSession();
    const intervalId = globalThis.setInterval(syncSession, 900);
    window.addEventListener("storage", syncSession);

    return () => {
      globalThis.clearInterval(intervalId);
      window.removeEventListener("storage", syncSession);
    };
  }, [activeSession?.id, activeSession?.lastUpdatedAt, audioEnabled, realtimeSession, tvRestaurantId]);

  useEffect(() => {
    if (!supabaseStatus.connected) {
      setRealtimeStatus("fallback");
      setRealtimeSession(null);
      setChannelStatus("NO_CLIENT");
      setLastRealtimeError(missingSupabaseVariables);
      setLastRealtimeSessionFound(false);
      setLatestRealtimeDebugRow(null);
      setLastEventReceived(`fallback local ${new Date().toLocaleTimeString("es-MX")}`);
      return;
    }

    let isMounted = true;
    let latestChannelStatus: RestaurantSessionChannelStatus | "NO_CLIENT" = "NO_CLIENT";

    async function queryRealtimeSession() {
      try {
        const [result, debugResult] = await Promise.all([
          getActiveRealtimeSessionByRestaurantId(realtimeRestaurantId),
          getLatestRealtimeSessionDebugByRestaurantId(realtimeRestaurantId),
        ]);

        if (!isMounted) {
          return;
        }

        setLatestRealtimeDebugRow(debugResult.data);
        setLastEventReceived(
          result.data
            ? `poll ${new Date().toLocaleTimeString("es-MX")} ${result.data.status}/${result.data.autoplay_status}`
            : `poll ${new Date().toLocaleTimeString("es-MX")} sin sesion`,
        );

        if (result.error) {
          setRealtimeStatus("disconnected");
          setLastRealtimeError(result.error.message);
          setLastRealtimeSessionFound(false);
          return;
        }

        setLastRealtimeError(debugResult.error?.message ?? "");
        setLastRealtimeSessionFound(Boolean(result.data));
        setRealtimeStatus(
          latestChannelStatus === "SUBSCRIBED"
            ? "connected"
            : result.data
              ? "supabase-polling"
              : "empty",
        );
        setRealtimeSession(result.data ? realtimeSessionToSession(result.data) : null);
      } catch {
        if (isMounted) {
          setRealtimeStatus("disconnected");
          setLastRealtimeError("No se pudo consultar Supabase.");
          setLastRealtimeSessionFound(false);
        }
      }
    }

    void queryRealtimeSession();
    const realtimePollingId = globalThis.setInterval(queryRealtimeSession, 2500);

    const unsubscribe = subscribeToRestaurantSession(
      realtimeRestaurantId,
      (session) => {
        if (session?.called_cards?.length) {
          const timingLabel = `[HL timing] TV recepcion realtime ${session.called_cards.at(-1)}`;
          console.time(timingLabel);
          console.timeEnd(timingLabel);
        }
        const nextSession = session && !isTerminalRealtimeSession(session) ? realtimeSessionToSession(session) : null;
        setRealtimeSession(nextSession);
        setLastRealtimeSessionFound(Boolean(nextSession));
        if (!nextSession) {
          setActiveSession(null);
          setCalledCards([]);
          setWinner(null);
          previousCalledCountRef.current = 0;
          previousWinnerFolioRef.current = undefined;
          lastRuntimeWriteSignatureRef.current = "";
        }
        setLatestRealtimeDebugRow(
          session
            ? {
                id: session.id,
                restaurant_id: session.restaurant_id,
                status: session.status,
                autoplay_status: session.autoplay_status,
                last_updated_at: session.last_updated_at,
              }
            : null,
        );
        setLastEventReceived(
          session
            ? `realtime ${new Date().toLocaleTimeString("es-MX")} ${session.status}/${session.autoplay_status}`
            : `realtime ${new Date().toLocaleTimeString("es-MX")} sin payload`,
        );
        console.info("[HOSTER LIVE][TV] realtime event", {
          restaurantId: realtimeRestaurantId,
          activeSessionId: session?.id ?? "-",
          sessionStatus: session?.status ?? "-",
          autoplayStatus: session?.autoplay_status ?? "-",
          calledCards: session?.called_cards?.length ?? 0,
        });
        setRealtimeStatus(nextSession ? "connected" : "empty");
      },
      (state) => {
        latestChannelStatus = state.status;
        setChannelStatus(state.status);
        setLastEventReceived(`canal ${state.status} ${new Date().toLocaleTimeString("es-MX")}`);
        console.info("[HOSTER LIVE][TV] realtime channel", {
          restaurantId: realtimeRestaurantId,
          status: state.status,
          label: state.label,
        });

        if (state.status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
          setLastRealtimeError("");
        } else {
          setRealtimeStatus((currentStatus) =>
            currentStatus === "connected" || currentStatus === "supabase-polling"
              ? "supabase-polling"
              : currentStatus,
          );
          setLastRealtimeError(`Canal ${state.status}`);
          void queryRealtimeSession();
        }
      },
    );

    return () => {
      isMounted = false;
      globalThis.clearInterval(realtimePollingId);
      unsubscribe();
    };
  }, [missingSupabaseVariables, realtimeRestaurantId, reconnectNonce, supabaseStatus.connected]);

  useEffect(() => {
    setAudioEnabled(getStoredAudioEnabled());
  }, []);

  useEffect(() => {
    const updateElapsed = () => setPlayElapsedSeconds(getPlayElapsedSeconds(activeSession));

    updateElapsed();
    const intervalId = globalThis.setInterval(updateElapsed, 1000);
    return () => globalThis.clearInterval(intervalId);
  }, [activeSession]);

  useEffect(() => {
    const updateCountdown = () => setCountdownRemaining(getCountdownRemainingSeconds(activeSession));

    updateCountdown();
    const intervalId = globalThis.setInterval(updateCountdown, 500);
    return () => globalThis.clearInterval(intervalId);
  }, [activeSession]);

  async function enableAudio() {
    const unlocked = await unlockGameAudio();
    setAudioEnabled(unlocked);
  }

  function disableAudio() {
    setStoredAudioEnabled(false);
    setAudioEnabled(false);
  }

  if (tvControl?.disabled) {
    return (
      <div className="screen-safe grid place-items-center bg-obsidian p-8">
        <section className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-mezcal">
            Pantalla temporalmente desactivada
          </p>
          <h1 className="mt-4 font-display text-6xl text-bone">{restaurant.name}</h1>
        </section>
      </div>
    );
  }

  const tvOverlay = <TvBroadcastOverlay control={tvControl} restaurantName={restaurant.name} />;

  if (visualStatus === "countdown") {
    return (
      <div className="screen-safe cantina-grid grid place-items-center bg-obsidian p-4 md:p-8">
        {tvOverlay}
        <SyncModeBadge label={tvDeliveryLabel} status={realtimeStatus} className="fixed right-4 top-4 z-50" />
        <RealtimeDebugPanel
          channelStatus={channelStatus}
          clientCreated={supabaseDebugStatus.clientCreated}
          error={lastRealtimeError}
          hasAnonKey={supabaseDebugStatus.hasAnonKey}
          hasSession={lastRealtimeSessionFound}
          hasUrl={supabaseDebugStatus.hasUrl}
          latestRow={latestRealtimeDebugRow}
          activeSessionId={activeSessionId}
          lastEventReceived={lastEventReceived}
          onReconnect={handleReconnectTv}
          restaurantId={realtimeRestaurantId}
          sessionStatus={sessionStatus}
        />
        <section
          className="grid min-h-[calc(100vh-4rem)] w-full max-w-[1800px] place-items-center rounded-lg border border-mezcal/35 bg-[radial-gradient(circle_at_50%_18%,rgba(217,164,65,0.28),rgba(20,17,15,0.92)_48%,rgba(8,7,6,0.99)_100%)] p-6 text-center shadow-cantina md:p-10"
          style={{
            borderColor: `${restaurantPrimary}66`,
            boxShadow: `0 0 42px ${restaurantPrimary}22`,
          }}
        >
          <div className="w-full max-w-6xl">
            <div className="mb-5 flex justify-end">
              {audioEnabled ? (
                <Button variant="secondary" onClick={disableAudio}>
                  <Volume2 size={18} />
                  Sonido activo
                </Button>
              ) : (
                <Button onClick={enableAudio}>
                  <VolumeX size={18} />
                  Activar sonido
                </Button>
              )}
            </div>
            <div className="mx-auto mb-8 flex w-fit items-center gap-3 rounded-lg border border-bone/10 bg-obsidian/60 px-4 py-3">
              {restaurant.logoUrl ? (
                <img
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  className="h-12 w-12 rounded-lg border border-bone/10 bg-bone/8 object-contain p-1"
                />
              ) : (
                <BrandMark className="h-12 w-12" textClassName="text-base" />
              )}
              <div className="text-left">
                <p
                  className="text-xs font-black uppercase tracking-[0.28em]"
                  style={{ color: restaurantAccent }}
                >
                  {restaurant.name}
                </p>
                <p className="font-display text-3xl text-bone">HOSTER LIVE</p>
              </div>
            </div>

            <p className="text-sm font-black uppercase tracking-[0.36em] text-mezcal">
              {isAccumulatedGame ? "ACUMULADO" : "Nueva jugada por comenzar"}
            </p>
            <h1 className="mt-4 font-display text-[6rem] leading-none text-bone md:text-[11rem]">
              {formatCountdown(countdownRemaining)}
            </h1>

            <div className="mx-auto mt-7 grid max-w-4xl gap-3 md:grid-cols-4">
              <StatusTile label="Restaurante" value={restaurant.name} color={restaurantPrimary} />
              <StatusTile label="Modalidad" value={modeLabels[config.mode]} />
              <StatusTile label="Tablas" value={String(config.activeTables)} color={restaurantSecondary} />
              <StatusTile label="Premio" value={`$${config.calculatedPrize}`} />
            </div>
            {isAccumulatedGame ? (
              <div className="mx-auto mt-5 w-fit rounded-lg border border-mezcal/45 bg-mezcal/15 px-6 py-4 shadow-glow">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-mezcal">
                  Premio acumulado total
                </p>
                <p className="mt-1 font-display text-5xl text-bone">
                  ${config.calculatedPrize}
                </p>
              </div>
            ) : null}

            <p className="mt-9 text-xs font-black uppercase tracking-[0.3em] text-agave">
              Promos activas durante esta jugada
            </p>
            <div className="mx-auto mt-4 grid max-w-5xl gap-4 md:grid-cols-2">
              {activePromotions.length ? (
                activePromotions.map((promotion) => (
                  <div
                    key={promotion.id}
                    className="rounded-lg border border-bone/10 bg-obsidian/62 p-5 text-left"
                  >
                    <div className="flex gap-3">
                      <Megaphone className="mt-1 shrink-0 text-mezcal" size={22} />
                      <div>
                        <p className="font-display text-3xl text-bone">{promotion.title}</p>
                        <p className="mt-2 text-sm leading-6 text-bone/65">
                          {promotion.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-bone/10 bg-obsidian/62 p-5 text-bone/60 md:col-span-2">
                  Promos activas durante esta jugada
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (visualStatus === "finished" || visualStatus === "idle") {
    return (
      <div className="screen-safe cantina-grid grid place-items-center bg-obsidian p-4 md:p-8">
        {tvOverlay}
        <SyncModeBadge label={tvDeliveryLabel} status={realtimeStatus} className="fixed right-4 top-4 z-50" />
        <RealtimeDebugPanel
          channelStatus={channelStatus}
          clientCreated={supabaseDebugStatus.clientCreated}
          error={lastRealtimeError}
          hasAnonKey={supabaseDebugStatus.hasAnonKey}
          hasSession={lastRealtimeSessionFound}
          hasUrl={supabaseDebugStatus.hasUrl}
          latestRow={latestRealtimeDebugRow}
          activeSessionId={activeSessionId}
          lastEventReceived={lastEventReceived}
          onReconnect={handleReconnectTv}
          restaurantId={realtimeRestaurantId}
          sessionStatus={sessionStatus}
        />
        <section
          className="relative grid min-h-[calc(100vh-4rem)] w-full max-w-[1800px] overflow-hidden rounded-lg border border-bone/10 bg-[radial-gradient(circle_at_50%_12%,rgba(217,164,65,0.18),rgba(31,161,135,0.12)_32%,rgba(20,17,15,0.94)_58%,rgba(8,7,6,0.99)_100%)] p-6 shadow-cantina md:p-10"
          style={{
            borderColor: `${restaurantPrimary}55`,
            boxShadow: `0 0 42px ${restaurantPrimary}20`,
          }}
        >
          {restaurant.standbyImageUrl ? (
            <img
              src={restaurant.standbyImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-[0.18]"
            />
          ) : null}
          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center">
            <div>
              <div className="mb-10 flex items-center gap-4">
                {restaurant.logoUrl ? (
                  <img
                    src={restaurant.logoUrl}
                    alt={restaurant.name}
                    className="h-16 w-16 rounded-lg border border-bone/10 bg-bone/8 object-contain p-1.5"
                  />
                ) : (
                  <BrandMark className="h-16 w-16" textClassName="text-lg" />
                )}
                <div>
                  <p
                    className="text-xs font-black uppercase tracking-[0.3em]"
                    style={{ color: restaurantAccent }}
                  >
                    {restaurant.name}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.22em] text-bone/45">
                    HOSTER LIVE
                  </p>
                </div>
              </div>

              <p className="text-xs font-black uppercase tracking-[0.34em] text-mezcal">
                {isAccumulatedGame ? "ACUMULADO" : "Proxima jugada por comenzar"}
              </p>
              <h1 className="mt-4 max-w-5xl font-display text-6xl leading-none text-bone md:text-8xl">
                {standbyTitle}
              </h1>
              <p className="mt-5 max-w-3xl text-3xl font-semibold leading-tight text-bone/72 md:text-4xl">
                {standbySubtitle}
              </p>
              <p className="mt-8 max-w-2xl rounded-lg border border-mezcal/25 bg-mezcal/10 px-5 py-4 text-2xl font-black text-mezcal shadow-glow">
                {standbyPromoText}
              </p>

              {restaurant.standbyCtaQrUrl ? (
                <div className="mt-5 inline-flex max-w-full flex-col rounded-lg border border-bone/10 bg-obsidian/65 px-5 py-4 text-left">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-agave">
                    {standbyCtaText}
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-bone/65">
                    {restaurant.standbyCtaQrUrl}
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-xl font-semibold text-bone/62">{standbyCtaText}</p>
              )}
              <div className="mt-6">
                {audioEnabled ? (
                  <Button variant="secondary" onClick={disableAudio}>
                    <Volume2 size={18} />
                    Sonido activo
                  </Button>
                ) : (
                  <Button onClick={enableAudio}>
                    <VolumeX size={18} />
                    Activar sonido
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-lg border border-bone/10 bg-obsidian/68 p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-agave">
                  Compra tus tablas con tu hostess
                </p>
                <p className="mt-2 font-display text-4xl text-bone">
                  Proxima jugada por comenzar
                </p>
              </div>

              {standbyPromotions.length ? (
                <div className="grid gap-3">
                  {standbyPromotions.slice(0, 3).map((promotion) => (
                    <div
                      key={promotion.id}
                      className="rounded-lg border border-bone/10 bg-bone/[0.045] p-4"
                    >
                      {promotion.bannerImageUrl ? (
                        <img
                          src={promotion.bannerImageUrl}
                          alt=""
                          className="mb-3 h-28 w-full rounded-lg object-cover"
                        />
                      ) : null}
                      <div className="flex gap-3">
                        {promotion.sponsorLogoUrl ? (
                          <img
                            src={promotion.sponsorLogoUrl}
                            alt={promotion.sponsorName}
                            className="h-10 w-10 shrink-0 rounded-lg bg-bone object-contain p-1"
                          />
                        ) : (
                          <Megaphone className="mt-1 shrink-0 text-mezcal" size={20} />
                        )}
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-mezcal">
                            {promotion.sponsorName || "Promo activa"}
                          </p>
                          <p className="mt-1 font-display text-2xl text-bone">
                            {promotion.title}
                          </p>
                          <p className="mt-1 text-sm leading-5 text-bone/62">
                            {promotion.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {activeSession?.status && activeSession.status !== "active" ? (
                <div className="rounded-lg border border-agave/20 bg-agave/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-agave">
                    Ultima tabla ganadora
                  </p>
                  <p className="mt-2 font-display text-4xl text-bone">
                    {activeSession.winnerFolio ?? "Cerrada"}
                  </p>
                  {winner?.winningCards.length ? (
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {winner.winningCards.map((card) => (
                        <Image
                          key={card.id}
                          src={card.image}
                          alt={card.name}
                          width={90}
                          height={140}
                          className="h-20 w-full rounded border border-bone/10 object-contain"
                        />
                      ))}
                    </div>
                  ) : null}
                  {activeSession.durationSeconds ? (
                    <p className="mt-3 text-sm font-semibold text-bone/62">
                      Ultima jugada: {formatDuration(activeSession.durationSeconds)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="screen-safe cantina-grid bg-obsidian p-4 md:p-6">
      {tvOverlay}
      <SyncModeBadge label={tvDeliveryLabel} status={realtimeStatus} className="fixed right-4 top-4 z-50" />
      <RealtimeDebugPanel
        channelStatus={channelStatus}
        clientCreated={supabaseDebugStatus.clientCreated}
        error={lastRealtimeError}
        hasAnonKey={supabaseDebugStatus.hasAnonKey}
        hasSession={lastRealtimeSessionFound}
        hasUrl={supabaseDebugStatus.hasUrl}
        latestRow={latestRealtimeDebugRow}
        activeSessionId={activeSessionId}
        lastEventReceived={lastEventReceived}
        onReconnect={handleReconnectTv}
        restaurantId={realtimeRestaurantId}
        sessionStatus={sessionStatus}
      />
      <div className="mx-auto grid h-full max-w-[1500px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="order-2 rounded-lg border border-bone/10 bg-obsidian/70 p-4 shadow-cantina backdrop-blur xl:order-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-bone">Historial</h2>
            <span className="rounded-full bg-agave/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-agave">
              {calledCards.length}/{deckSize}
            </span>
          </div>
          <div className="grid max-h-[56vh] gap-3 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-1">
            {[...calledCards].reverse().map((card, index) => {
              const isLatest = index === 0;

              return (
                <div
                  key={`${card.id}-${calledCards.length - index}`}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                    isLatest
                      ? "border-mezcal bg-mezcal/15 shadow-glow"
                      : "border-bone/10 bg-bone/[0.04]"
                  }`}
                >
                  <Image
                    src={card.image}
                    alt={card.name}
                    width={90}
                    height={140}
                    className="h-12 w-9 shrink-0 rounded-md border border-bone/10 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-bone">{card.name}</p>
                    {card.confederation ? (
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-mezcal">
                        {card.confederation}
                      </p>
                    ) : null}
                    <p className={isLatest ? "text-xs text-mezcal" : "text-xs text-bone/45"}>
                      {isLatest
                        ? "Carta mas reciente"
                        : `Carta ${String(card.number).padStart(2, "0")}`}
                    </p>
                  </div>
                </div>
              );
            })}
            {calledCards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-bone/15 p-5 text-sm text-bone/55">
                Aun no se han cantado cartas.
              </div>
            ) : null}
          </div>
          {activePromotions.length ? (
            <div className="mt-4 border-t border-bone/10 pt-4">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-mezcal">
                Promociones
              </p>
              <div className="grid gap-3">
                {activePromotions.slice(0, 2).map((promotion) => (
                  <div key={promotion.id} className="overflow-hidden rounded-lg border border-bone/10 bg-bone/[0.04]">
                    {promotion.bannerImageUrl ? (
                      <img src={promotion.bannerImageUrl} alt="" className="h-24 w-full object-cover" />
                    ) : null}
                    <div className="p-3">
                      <div className="flex items-center gap-2">
                        {promotion.sponsorLogoUrl ? (
                          <img
                            src={promotion.sponsorLogoUrl}
                            alt={promotion.sponsorName}
                            className="h-8 w-8 rounded bg-bone object-contain p-1"
                          />
                        ) : null}
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-mezcal">
                          {promotion.sponsorName || restaurant.name}
                        </p>
                      </div>
                      <p className="mt-2 font-display text-xl text-bone">{promotion.title}</p>
                      <p className="mt-1 text-xs leading-5 text-bone/62">{promotion.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <main className="order-1 flex min-w-0 flex-col gap-4 xl:order-2">
          <div
            className="flex flex-col gap-4 rounded-lg border border-bone/10 bg-charcoal/70 px-4 py-3 shadow-cantina backdrop-blur md:flex-row md:items-center md:justify-between"
            style={{
              borderColor: `${restaurantPrimary}55`,
              boxShadow: `0 0 34px ${restaurantPrimary}22`,
            }}
          >
            <div className="flex items-center gap-3">
              {restaurant.logoUrl ? (
                <img
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  className="h-12 w-12 rounded-lg border border-bone/10 bg-bone/8 object-contain p-1"
                />
              ) : (
                <BrandMark className="h-12 w-12" textClassName="text-base" />
              )}
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-[0.28em]"
                  style={{ color: restaurantAccent }}
                >
                  {restaurant.name}
                </p>
                <h1 className="font-display text-3xl text-bone md:text-5xl">HOSTER LIVE</h1>
                {isAccumulatedGame ? (
                  <span className="mt-2 inline-flex rounded-full border border-mezcal/40 bg-mezcal/15 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-mezcal">
                    ACUMULADO
                  </span>
                ) : null}
              </div>
            </div>
            {activeSession ? (
              <div className="rounded-lg border border-bone/10 bg-obsidian/55 px-4 py-3 text-right">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/45">
                  Tiempo de jugada
                </p>
                <p className="font-display text-3xl text-bone">
                  {formatDuration(playElapsedSeconds)}
                </p>
              </div>
            ) : null}
            <div className="grid grid-cols-4 gap-2 text-center">
              <StatusTile label="Estado" value={statusLabel} />
              <StatusTile label="Tablas" value={String(config.activeTables)} color={restaurantSecondary} />
              <StatusTile label="Modo" value={modeLabels[config.mode]} color={restaurantPrimary} />
              <StatusTile label="Costo" value={`$${config.tablePrice}`} />
            </div>
          </div>

          {false ? (
            <section className="grid min-h-[620px] place-items-center rounded-lg border border-mezcal/35 bg-[radial-gradient(circle_at_50%_20%,rgba(217,164,65,0.24),rgba(20,17,15,0.92)_48%,rgba(8,7,6,0.98)_100%)] p-6 text-center shadow-cantina">
              <div className="w-full max-w-5xl">
                <p className="text-sm font-black uppercase tracking-[0.34em] text-mezcal">
                  Inicia la promo de jugada
                </p>
                <h2 className="mt-4 font-display text-6xl leading-none text-bone md:text-8xl">
                  {formatCountdown(countdownRemaining)}
                </h2>
                <p className="mt-4 font-display text-4xl text-bone">
                  La jugada está por comenzar
                </p>
                <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
                  {activePromotions.length ? (
                    activePromotions.map((promotion) => (
                      <div key={promotion.id} className="rounded-lg border border-bone/10 bg-obsidian/62 p-5 text-left">
                        <div className="flex gap-3">
                          <Megaphone className="mt-1 shrink-0 text-mezcal" size={22} />
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-mezcal">
                              Promo activa
                            </p>
                            <h3 className="mt-2 font-display text-3xl text-bone">
                              {promotion.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-bone/65">
                              {promotion.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-bone/10 bg-obsidian/62 p-5 text-bone/60 md:col-span-2">
                      Promos activas durante esta jugada
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : false ? (
            <section className="grid min-h-[620px] place-items-center rounded-lg border border-bone/10 bg-[radial-gradient(circle_at_50%_20%,rgba(31,161,135,0.16),rgba(20,17,15,0.92)_48%,rgba(8,7,6,0.98)_100%)] p-6 text-center shadow-cantina">
              <div className="max-w-3xl">
                <p className="text-xs font-black uppercase tracking-[0.34em] text-agave">
                  HOSTER LIVE
                </p>
                <h2 className="mt-4 font-display text-6xl leading-none text-bone md:text-8xl">
                  Jugada finalizada
                </h2>
                <p className="mt-5 text-2xl font-semibold text-bone/65">
                  Esperando nueva jugada
                </p>
                <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-bone/10 bg-obsidian/55 p-4">
                    <p className="text-bone/45">Cartas cantadas</p>
                    <p className="mt-1 text-3xl font-black text-bone">{calledCards.length}/{deckSize}</p>
                  </div>
                  <div className="rounded-lg border border-bone/10 bg-obsidian/55 p-4">
                    <p className="text-bone/45">Ganadora</p>
                    <p className="mt-1 text-3xl font-black text-mezcal">
                      {activeSession?.winnerFolio ?? "Cerrada"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ) : (
          <section className="flex min-h-[620px] flex-col items-center justify-center rounded-lg border border-mezcal/35 bg-[radial-gradient(circle_at_50%_20%,rgba(217,164,65,0.18),rgba(20,17,15,0.92)_48%,rgba(8,7,6,0.98)_100%)] p-5 text-center shadow-cantina">
            <div className="mb-4">
              {audioEnabled ? (
                <Button variant="secondary" onClick={disableAudio}>
                  <Volume2 size={18} />
                  Sonido activo
                </Button>
              ) : (
                <Button onClick={enableAudio}>
                  <VolumeX size={18} />
                  Activar sonido
                </Button>
              )}
            </div>
            <p className="mb-5 text-xs font-black uppercase tracking-[0.28em] text-mezcal">
                {statusLabel}
              </p>
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-mezcal/40 bg-mezcal/15 text-lg font-black text-mezcal md:h-20 md:w-20 md:text-2xl">
                {currentCard ? String(currentCard.number).padStart(2, "0") : "--"}
              </div>
              <div className="relative aspect-[0.63] w-full max-w-[360px] overflow-hidden rounded-lg border-2 border-mezcal bg-bone shadow-glow md:max-w-[440px]">
                {currentCard ? (
                  <Image
                    src={currentCard.image}
                    alt={currentCard.name}
                    width={720}
                    height={1141}
                    className="h-full w-full object-contain"
                    priority
                    onLoad={() => {
                      if (lastImageTimingRef.current === currentCard.id) {
                        return;
                      }

                      lastImageTimingRef.current = currentCard.id;
                      const timingLabel = `[HL timing] TV carga imagen ${currentCard.id}`;
                      console.time(timingLabel);
                      console.timeEnd(timingLabel);
                    }}
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-[linear-gradient(145deg,#f7edd9,#d8b56a)] p-5 text-obsidian">
                    <BrandMark
                      className="h-36 w-36 border-obsidian/65 shadow-none md:h-44 md:w-44"
                      textClassName="text-[4rem] leading-none md:text-[5rem]"
                    />
                  </div>
                )}
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.28em] text-bone/50">
                {currentCard?.name ?? "Carta actual"}
              </p>
              {currentCard?.confederation ? (
                <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-mezcal">
                  {currentCard.confederation}
                </p>
              ) : null}
            </section>
          )}
        </main>

      </div>

      {winner ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-obsidian/88 p-4 backdrop-blur">
          <div className="winner-overlay w-full max-w-4xl rounded-lg border border-mezcal/50 bg-[radial-gradient(circle_at_50%_0%,rgba(217,164,65,0.32),rgba(20,17,15,0.96)_48%,rgba(8,7,6,0.98)_100%)] p-6 text-center shadow-glow md:p-10">
            <p className="text-sm font-black uppercase tracking-[0.36em] text-mezcal md:text-base">
              TABLA GANADORA
            </p>
            <h2 className="mt-4 font-display text-6xl leading-none text-bone md:text-8xl">
              {winner.board.folio}
            </h2>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-agave">
              Premio
            </p>
            <p className="mt-1 text-5xl font-black text-bone md:text-7xl">
              ${config.calculatedPrize}
            </p>
            <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {winner.winningCards.map((card) => (
                <div key={card.id} className="rounded-lg border border-bone/10 bg-bone/[0.04] p-2">
                  <Image
                    src={card.image}
                    alt={card.name}
                    width={120}
                    height={190}
                    className="mx-auto h-32 w-auto rounded object-contain"
                  />
                  <p className="mt-2 text-xs font-semibold text-bone/70">{card.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-bone/35">
        Powered by Hoster Live
      </p>
    </div>
  );
}

function SyncModeBadge({
  label,
  status,
  className,
}: {
  label: string;
  status: "connected" | "supabase-polling" | "empty" | "disconnected" | "fallback";
  className?: string;
}) {
  return (
    <span
      className={`rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] backdrop-blur ${
        status === "connected"
          ? "border-agave/30 bg-agave/12 text-agave"
          : status === "supabase-polling"
            ? "border-mezcal/30 bg-mezcal/12 text-mezcal"
          : status === "empty"
            ? "border-bone/20 bg-obsidian/70 text-bone/70"
          : status === "disconnected"
            ? "border-chile/30 bg-chile/12 text-[#ff9b91]"
            : "border-mezcal/30 bg-obsidian/70 text-mezcal"
      } ${className ?? ""}`}
    >
      {label}
    </span>
  );
}

function TvBroadcastOverlay({
  control,
  restaurantName,
}: {
  control?: TvControl;
  restaurantName: string;
}) {
  if (
    !control ||
    control.overrideType === "none" ||
    !control.visibleUntil ||
    new Date(control.visibleUntil).getTime() <= Date.now()
  ) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 top-20 z-[60] mx-auto max-w-4xl">
      <div className="overflow-hidden rounded-lg border border-mezcal/45 bg-obsidian/92 shadow-glow backdrop-blur">
        {control.imageUrl ? (
          <img
            src={control.imageUrl}
            alt=""
            className={`w-full object-cover ${
              control.overrideType === "banner" ? "max-h-56" : "max-h-[60vh]"
            }`}
          />
        ) : null}
        {control.message ? (
          <div className="p-6 text-center">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-mezcal">
              {restaurantName}
            </p>
            <p className="mt-3 font-display text-4xl leading-tight text-bone md:text-6xl">
              {control.message}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RealtimeDebugPanel({
  activeSessionId,
  channelStatus,
  clientCreated,
  error,
  hasAnonKey,
  hasSession,
  hasUrl,
  lastEventReceived,
  latestRow,
  onReconnect,
  restaurantId,
  sessionStatus,
}: {
  activeSessionId: string;
  channelStatus: RestaurantSessionChannelStatus | "NO_CLIENT";
  clientCreated: boolean;
  error: string;
  hasAnonKey: boolean;
  hasSession: boolean;
  hasUrl: boolean;
  lastEventReceived: string;
  latestRow: RealtimeSessionDebugRow | null;
  onReconnect: () => void;
  restaurantId: string;
  sessionStatus: string;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-bone/10 bg-obsidian/88 p-3 text-[11px] font-semibold text-bone/62 shadow-cantina backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-mezcal">
          Realtime debug
        </p>
        <button
          type="button"
          onClick={onReconnect}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-bone/10 bg-bone/10 px-3 text-xs font-black text-bone transition hover:bg-bone/15"
        >
          <RefreshCw size={14} />
          Reconectar TV
        </button>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        <dt>Supabase URL cargada</dt>
        <dd className={hasUrl ? "text-agave" : "text-[#ff9b91]"}>{hasUrl ? "si" : "no"}</dd>
        <dt>Anon key cargada</dt>
        <dd className={hasAnonKey ? "text-agave" : "text-[#ff9b91]"}>{hasAnonKey ? "si" : "no"}</dd>
        <dt>Cliente creado</dt>
        <dd className={clientCreated ? "text-agave" : "text-[#ff9b91]"}>{clientCreated ? "si" : "no"}</dd>
        <dt>Canal</dt>
        <dd className="text-bone">{channelStatus}</dd>
        <dt>Restaurant ID</dt>
        <dd className="text-bone">{restaurantId}</dd>
        <dt>Active session ID</dt>
        <dd className="max-w-32 truncate text-bone">{activeSessionId}</dd>
        <dt>Session status</dt>
        <dd className="text-bone">{sessionStatus}</dd>
        <dt>Ultimo evento</dt>
        <dd className="max-w-36 truncate text-bone">{lastEventReceived}</dd>
        <dt>Sesion Supabase</dt>
        <dd className={hasSession ? "text-agave" : "text-mezcal"}>{hasSession ? "si" : "no"}</dd>
        <dt>Ultima row</dt>
        <dd className={latestRow ? "text-agave" : "text-mezcal"}>{latestRow ? "si" : "no"}</dd>
        <dt>Row id</dt>
        <dd className="max-w-32 truncate text-bone">{latestRow?.id ?? "-"}</dd>
        <dt>Row restaurant_id</dt>
        <dd className="text-bone">{latestRow?.restaurant_id ?? "-"}</dd>
        <dt>Row autoplay</dt>
        <dd className="text-bone">{latestRow?.autoplay_status ?? "-"}</dd>
        <dt>Row status</dt>
        <dd className="text-bone">{latestRow?.status ?? "-"}</dd>
        <dt>Row updated_at</dt>
        <dd className="max-w-36 truncate text-bone">{latestRow?.last_updated_at ?? "-"}</dd>
      </dl>
      {error ? (
        <p className="mt-2 rounded border border-chile/25 bg-chile/10 p-2 text-[#ff9b91]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function StatusTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg px-3 py-3" style={{ backgroundColor: color ? `${color}22` : undefined }}>
      <p className="text-xs uppercase tracking-[0.18em] text-bone/45">{label}</p>
      <p className="truncate text-lg font-black text-bone">{value}</p>
    </div>
  );
}
