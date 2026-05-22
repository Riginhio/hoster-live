"use client";

/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Megaphone } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { getWinPattern, type LoteriaBoard, type LoteriaCard } from "@/lib/loteria";
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
  updateSession,
  type Session,
} from "@/lib/sessions/sessionStorage";
import {
  getActiveBoardBatch,
  getBoardBatches,
  toLoteriaBoards,
} from "@/lib/boards/boardBatchStorage";
import { getActiveQrCampaignsForRestaurant } from "@/lib/qr/qrCampaignStorage";

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
  const [batchBoards, setBatchBoards] = useState<LoteriaBoard[]>([]);
  const [calledCards, setCalledCards] = useState<LoteriaCard[]>([]);
  const [winner, setWinner] = useState<WinnerState | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const lastSyncSignatureRef = useRef("");

  const restaurant = getRestaurantById(restaurantId);
  const restaurantPrimary = restaurant.primaryColor || restaurant.theme.primaryColor;
  const restaurantSecondary = restaurant.secondaryColor || restaurant.theme.secondaryColor;
  const restaurantAccent = restaurant.accentColor || "#d9a441";
  const activeBoards = batchBoards.slice(0, config.activeTables);
  const currentCard = calledCards[calledCards.length - 1] ?? null;
  const winningCardIds = new Set(winner?.winningCards.map((card) => card.id) ?? []);
  const patternPositions = getWinPattern(config.mode);
  const previewBoard = winner?.board ?? activeBoards[0] ?? null;
  const activePromotions = activeSession?.activePromotions ?? [];
  const standbyTitle = restaurant.standbyTitle || "HOSTER LIVE";
  const standbySubtitle =
    restaurant.standbySubtitle || "La proxima jugada esta por comenzar";
  const standbyPromoText =
    restaurant.standbyPromoText || "Compra tus tablas con tu hostess";
  const standbyCtaText = restaurant.standbyCtaText || "Pide tu tabla ahora";
  const standbyPromotions = restaurant.standbyRotatePromotions
    ? getActiveQrCampaignsForRestaurant(restaurantId)
    : [];
  const visualStatus = activeSession?.autoplayStatus === "countdown"
    ? "countdown"
    : activeSession?.status === "finalized"
      ? "finished"
      : winner
        ? "winner"
        : activeSession?.autoplayStatus ?? "idle";

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
        const activeRestaurantSession = getActiveSessionByRestaurantId(restaurantId);
        const currentStoredSession = activeSession?.id
          ? getSessionById(activeSession.id)
          : undefined;
        const storedSession = activeRestaurantSession ?? currentStoredSession;

        if (storedSession) {
          const syncSignature = getSessionSyncSignature(storedSession);

          if (lastSyncSignatureRef.current === syncSignature) {
            return;
          }

          lastSyncSignatureRef.current = syncSignature;
          const sessionIdChanged = activeSession?.id && activeSession.id !== storedSession.id;
          const sessionBatch = storedSession.batchId
            ? getBoardBatches().find((batch) => batch.id === storedSession.batchId)
            : getActiveBoardBatch(restaurantId);
          const nextBoards = sessionBatch ? toLoteriaBoards(sessionBatch.boards) : [];
          const nextCalledCards = hydrateSessionCards(storedSession.calledCards);
          const isCountdownSession = storedSession.autoplayStatus === "countdown";

          if (sessionIdChanged) {
            setCalledCards([]);
            setWinner(null);
            setCountdownRemaining(0);
          }

          setBatchBoards(nextBoards);
          setActiveSession(storedSession);
          setConfig({
            restaurantId: storedSession.restaurantId,
            activeTables: storedSession.activeTables,
            mode: storedSession.mode,
            tablePrice: storedSession.tablePrice,
            commissionPercent: storedSession.commissionPercent,
            calculatedPrize: storedSession.prizeAmount,
            createdAt: storedSession.createdAt,
          });
          setCalledCards(isCountdownSession ? [] : nextCalledCards);

          if (
            !isCountdownSession &&
            storedSession.winnerFolio &&
            storedSession.winnerCards.length > 0
          ) {
            const winningBoard = nextBoards.find(
              (board) => board.folio === storedSession.winnerFolio,
            );

            setWinner(
              winningBoard
                ? {
                    board: winningBoard,
                    winningCards: hydrateSessionCards(storedSession.winnerCards),
                  }
                : null,
            );
          } else {
            setWinner(null);
          }

          return;
        }

        const activeBatch = getActiveBoardBatch(restaurantId);
        lastSyncSignatureRef.current = "none";
        setBatchBoards(activeBatch ? toLoteriaBoards(activeBatch.boards) : []);
        setActiveSession(null);
        setWinner(null);
        setCalledCards([]);

        const parsedConfig = parseStoredDemoConfig(
          localStorage.getItem(configStorageKey),
          restaurantId,
        );

        setConfig(
          parsedConfig.restaurantId === restaurantId
            ? parsedConfig
            : createDefaultDemoConfig(restaurantId),
        );
      } catch {
        setConfig(createDefaultDemoConfig(restaurantId));
      }
    }

    syncSession();
    const intervalId = globalThis.setInterval(syncSession, 900);
    window.addEventListener("storage", syncSession);

    return () => {
      globalThis.clearInterval(intervalId);
      window.removeEventListener("storage", syncSession);
    };
  }, [activeSession?.id, activeSession?.lastUpdatedAt, restaurantId]);

  useEffect(() => {
    if (!restaurant.showClock) {
      return;
    }

    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    };

    updateClock();
    const intervalId = globalThis.setInterval(updateClock, 1000);
    return () => globalThis.clearInterval(intervalId);
  }, [restaurant.showClock]);

  useEffect(() => {
    const updateCountdown = () => setCountdownRemaining(getCountdownRemainingSeconds(activeSession));

    updateCountdown();
    const intervalId = globalThis.setInterval(updateCountdown, 500);
    return () => globalThis.clearInterval(intervalId);
  }, [activeSession]);

  useEffect(() => {
    if (
      activeSession?.autoplayStatus === "countdown" &&
      countdownRemaining <= 0 &&
      activeSession.status === "active"
    ) {
      updateSession(activeSession.id, {
        autoplayStatus: "playing",
        autoplayStartedAt: new Date().toISOString(),
      });
    }
  }, [activeSession, countdownRemaining]);

  if (visualStatus === "countdown") {
    return (
      <div className="screen-safe cantina-grid grid place-items-center bg-obsidian p-4 md:p-8">
        <section
          className="grid min-h-[calc(100vh-4rem)] w-full max-w-[1800px] place-items-center rounded-lg border border-mezcal/35 bg-[radial-gradient(circle_at_50%_18%,rgba(217,164,65,0.28),rgba(20,17,15,0.92)_48%,rgba(8,7,6,0.99)_100%)] p-6 text-center shadow-cantina md:p-10"
          style={{
            borderColor: `${restaurantPrimary}66`,
            boxShadow: `0 0 42px ${restaurantPrimary}22`,
          }}
        >
          <div className="w-full max-w-6xl">
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
              Nueva jugada por comenzar
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
                Proxima jugada por comenzar
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
                      <div className="flex gap-3">
                        <Megaphone className="mt-1 shrink-0 text-mezcal" size={20} />
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-mezcal">
                            Promo activa
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

              {activeSession?.status === "finalized" ? (
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
      <div className="mx-auto grid h-full max-w-[1800px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
        <aside className="order-2 rounded-lg border border-bone/10 bg-obsidian/70 p-4 shadow-cantina backdrop-blur xl:order-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-bone">Historial</h2>
            <span className="rounded-full bg-agave/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-agave">
              {calledCards.length}/54
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
              </div>
            </div>
            {restaurant.showClock ? (
              <div className="rounded-lg border border-bone/10 bg-obsidian/55 px-4 py-3 text-right">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/45">Hora</p>
                <p className="font-display text-3xl text-bone">{currentTime}</p>
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
                    <p className="mt-1 text-3xl font-black text-bone">{calledCards.length}/54</p>
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
            </section>
          )}
        </main>

        <aside className="order-3 rounded-lg border border-bone/10 bg-charcoal/78 p-4 shadow-cantina backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-agave">
                {winner ? "Tabla ganadora" : "Tabla demo"}
              </p>
              <h2 className="font-display text-3xl text-bone">{previewBoard?.folio ?? "Sin lote"}</h2>
            </div>
            <span className="rounded-full bg-mezcal/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-mezcal">
              {modeLabels[config.mode]}
            </span>
          </div>

          {previewBoard ? (
            <div className="grid grid-cols-4 gap-2">
              {previewBoard.cards.flatMap((row, rowIndex) =>
                row.map((card, colIndex) => {
                  const isCalled = calledCards.some((calledCard) => calledCard.id === card.id);
                  const isPattern = patternPositions.some(
                    (position) => position.row === rowIndex && position.col === colIndex,
                  );
                  const isWinningCard = winningCardIds.has(card.id);

                  return (
                    <div
                      key={card.id}
                      className={`flex aspect-square min-w-0 flex-col justify-between rounded-lg border p-2 text-center transition ${
                        isWinningCard
                          ? "border-mezcal bg-mezcal text-obsidian shadow-glow"
                          : isCalled
                            ? "border-agave/60 bg-agave/20 text-bone"
                            : isPattern
                              ? "border-mezcal/45 bg-mezcal/10 text-bone"
                              : "border-bone/10 bg-bone/[0.04] text-bone/70"
                      }`}
                    >
                      <Image
                        src={card.image}
                        alt={card.name}
                        width={90}
                        height={140}
                        className="min-h-0 flex-1 rounded object-cover"
                      />
                      <span className="mt-1 text-[10px] font-black">
                        {String(card.number).padStart(2, "0")}
                      </span>
                    </div>
                  );
                }),
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-bone/15 p-5 text-sm text-bone/55">
              No hay lote activo disponible para este restaurante.
            </div>
          )}

          <div className="mt-5 grid gap-3 text-sm">
            <div className="rounded-lg border border-bone/10 bg-obsidian/55 p-3">
              <p className="text-bone/45">Tablas revisadas</p>
              <p className="mt-1 text-2xl font-black text-bone">{activeBoards.length}</p>
            </div>
            <div className="rounded-lg border border-bone/10 bg-obsidian/55 p-3">
              <p className="text-bone/45">Cartas cantadas</p>
              <p className="mt-1 text-2xl font-black text-bone">{calledCards.length}/54</p>
            </div>
          </div>
        </aside>
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
