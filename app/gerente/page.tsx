"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Play, Sparkles, Table2, Trophy, X } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/components/auth/AuthProvider";
import type { WinMode } from "@/lib/loteria";
import type { DeckId } from "@/lib/decks";
import { calculateFinancialBreakdown } from "@/lib/finance";
import {
  getActiveBoardBatch,
  getActiveBoardBatchByDeck,
  type BoardBatch,
} from "@/lib/boards/boardBatchStorage";
import { refreshRestaurantsFromSupabase } from "@/lib/restaurants/restaurantStorage";
import {
  getLastGameConfig,
  saveLastGameConfig,
  saveLastGameConfigByType,
  type LastGameConfig,
} from "@/lib/sessions/lastGameConfigStorage";
import { cancelSession, createSession } from "@/lib/sessions/sessionStorage";
import { getActiveQrCampaignsForRestaurant } from "@/lib/qr/qrCampaignStorage";
import { closeRealtimeSession, createRealtimeSession } from "@/lib/supabase/sessionRealtime";
import type { RestaurantConfig } from "@/lib/types";
import { preloadDeckImages } from "@/lib/decks/preloadImages";
import {
  getAccumulatedSummary,
  getActiveAccumulatedWeek,
} from "@/lib/accumulated/accumulatedStorage";

const quickTableCounts = [30, 50];

const modeLabels: Record<WinMode, string> = {
  four_corners: "4 esquinas",
  x_shape: "Figura X",
  center_four: "Centro 4",
  full_card: "Llena",
};
const normalModeOptions: WinMode[] = ["four_corners", "center_four", "x_shape", "full_card"];
const supabaseSyncTimeoutMs = 5000;

type RealtimeCreateResult = Awaited<ReturnType<typeof createRealtimeSession>>;

type DraftGame = {
  activeTables: number;
  tablePrice: number;
  mode: WinMode;
  deckId: DeckId;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function getFallbackRestaurant(restaurants: RestaurantConfig[], restaurantId?: string) {
  return restaurants.find((restaurant) => restaurant.id === restaurantId) ?? restaurants[0] ?? null;
}

function getDraftConfig(restaurant: RestaurantConfig, activeTables: number): DraftGame {
  const lastConfig = getLastGameConfig(restaurant.id);
  const tablePrice =
    restaurant.allowedPrices.includes(restaurant.defaultTablePrice)
      ? restaurant.defaultTablePrice
      : restaurant.allowedPrices[0] ?? 50;
  const allowedNormalModes = normalModeOptions.filter((mode) => restaurant.allowedModes.includes(mode));
  const mode =
    lastConfig && allowedNormalModes.includes(lastConfig.mode)
      ? lastConfig.mode
      : allowedNormalModes[0] ?? "four_corners";

  return {
    activeTables,
    tablePrice,
    mode,
    deckId: restaurant.activeDeck ?? restaurant.enabledDecks[0] ?? "loteria",
  };
}

function navigateToActiveGame(router: ReturnType<typeof useRouter>) {
  router.push("/gerente/jugada-activa");
  window.setTimeout(() => {
    if (window.location.pathname !== "/gerente/jugada-activa") {
      window.location.href = "/gerente/jugada-activa";
    }
  }, 700);
}

function createRealtimeSessionWithTimeout(
  session: Parameters<typeof createRealtimeSession>[0],
): Promise<RealtimeCreateResult> {
  let timedOut = false;
  const realtimePromise = createRealtimeSession(session).catch(
    (error): RealtimeCreateResult => ({
      data: null,
      error: error instanceof Error ? error : new Error("No se pudo sincronizar con Supabase."),
      mode: "supabase",
    }),
  );
  const timeoutPromise = new Promise<RealtimeCreateResult>((resolve) => {
    window.setTimeout(() => {
      timedOut = true;
      resolve({
        data: null,
        error: new Error("Supabase tardo mas de 5 segundos. Reintenta iniciar la jugada."),
        mode: "supabase",
      });
    }, supabaseSyncTimeoutMs);
  });

  void realtimePromise.then((result) => {
    if (timedOut && result.data?.id) {
      void closeRealtimeSession(result.data.id, { status: "cancelled" });
    }
  });

  return Promise.race([realtimePromise, timeoutPromise]);
}

export default function GerentePage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>([]);
  const [activeBatch, setActiveBatch] = useState<BoardBatch | null>(null);
  const [draftGame, setDraftGame] = useState<DraftGame | null>(null);
  const [lastConfig, setLastConfig] = useState<LastGameConfig | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSpecialModalOpen, setIsSpecialModalOpen] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const venueRole = currentUser?.venueRole ?? "manager";
  const isPlay = venueRole === "play";

  useEffect(() => {
    let isMounted = true;

    async function syncRestaurants() {
      const result = await refreshRestaurantsFromSupabase();
      const loadedRestaurants = result.restaurants.filter((restaurant) => restaurant.isActive);
      const restaurant = getFallbackRestaurant(loadedRestaurants, currentUser?.restaurantId);

      if (!isMounted) {
        return;
      }

      setRestaurants(loadedRestaurants);
      setActiveBatch(restaurant ? getActiveBoardBatch(restaurant.id) ?? null : null);
      setLastConfig(restaurant ? getLastGameConfig(restaurant.id) : null);
      console.info("[HOSTER LIVE][GERENTE] debug", {
        user: currentUser?.email ?? currentUser?.name,
        restaurantId: currentUser?.restaurantId,
        enabledDecks: restaurant?.enabledDecks,
        activeGames: restaurant?.activeGames,
        source: result.source,
      });
    }

    void syncRestaurants();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.email, currentUser?.name, currentUser?.restaurantId]);

  useEffect(() => {
    if (!draftGame) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [draftGame]);

  useEffect(() => {
    if (!isSpecialModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSpecialModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSpecialModalOpen]);

  const restaurant = useMemo(
    () => getFallbackRestaurant(restaurants, currentUser?.restaurantId),
    [currentUser?.restaurantId, restaurants],
  );

  const financialBreakdown = useMemo(() => {
    if (!restaurant || !draftGame) {
      return null;
    }

    return calculateFinancialBreakdown({
      activeTables: draftGame.activeTables,
      tablePrice: draftGame.tablePrice,
      restaurantCommissionPercent: restaurant.restaurantCommissionPercent,
      hlCommissionMode: restaurant.hlCommissionMode,
      hlCommissionValue: restaurant.hlCommissionValue,
      hlFixedFee: restaurant.hlFixedFee,
    });
  }, [draftGame, restaurant]);
  const accumulatedSummary = useMemo(
    () => (restaurant ? getAccumulatedSummary(restaurant.id) : null),
    [restaurant],
  );

  function openQuickGame(activeTables: number) {
    if (!restaurant) {
      return;
    }

    setFeedback(null);

    if (!activeBatch) {
      setFeedback("No hay lote activo para este restaurante");
      return;
    }

    if (!restaurant.allowedTableCounts.includes(activeTables)) {
      setFeedback("Esa cantidad de tablas no esta habilitada por Master.");
      return;
    }

    if (activeTables > activeBatch.quantity) {
      setFeedback(`El lote activo solo tiene ${activeBatch.quantity} tablas disponibles.`);
      return;
    }

    const nextDraft = getDraftConfig(restaurant, activeTables);
    const deckBatch = getActiveBoardBatchByDeck(restaurant.id, nextDraft.deckId);

    if (!deckBatch) {
      setFeedback("No hay lote activo para el deck seleccionado.");
      return;
    }

    setActiveBatch(deckBatch);
    setDraftGame(nextDraft);
  }

  async function startQuickGame() {
    if (!restaurant || !activeBatch || !draftGame || !financialBreakdown) {
      return;
    }

    const deckBatch = getActiveBoardBatchByDeck(restaurant.id, draftGame.deckId);

    if (!deckBatch) {
      setFeedback("No hay lote activo para el deck seleccionado.");
      return;
    }

    setIsStartingGame(true);
    setFeedback("Creando sesion...");
    const commissionPercent = restaurant.restaurantCommissionPercent;
    const createdAt = new Date().toISOString();
    const accumulatedContribution =
      restaurant.accumulatedEnabled && draftGame.activeTables <= 50
        ? Math.min(restaurant.accumulatedAmountPerGame, financialBreakdown.prizeAmount)
        : 0;
    const basePrizeAmount = financialBreakdown.prizeAmount;

    const createdSession = createSession({
      batchId: deckBatch.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      mode: draftGame.mode,
      deckId: draftGame.deckId,
      activeTables: draftGame.activeTables,
      tablePrice: draftGame.tablePrice,
      restaurantCommissionPercent: restaurant.restaurantCommissionPercent,
      restaurantCommissionAmount: financialBreakdown.restaurantCommissionAmount,
      hlCommissionMode: financialBreakdown.hlCommissionMode,
      hlCommissionValue: financialBreakdown.hlCommissionValue,
      hlCommissionAmount: financialBreakdown.hlCommissionAmount,
      commissionTotalPercent: financialBreakdown.commissionTotalPercent,
      commissionTotalAmount: financialBreakdown.commissionTotalAmount,
      hlFixedFee: financialBreakdown.hlFixedFee,
      restaurantNetAmount: financialBreakdown.restaurantNetAmount,
      commissionPercent,
      commissionHLPercent: financialBreakdown.commissionHLPercent,
      commissionRestaurantPercent: restaurant.restaurantCommissionPercent,
      commissionNetPercent: financialBreakdown.commissionNetPercent,
      commissionHLAmount: financialBreakdown.commissionHLAmount,
      commissionRestaurantAmount: financialBreakdown.commissionRestaurantAmount,
      commissionNetAmount: financialBreakdown.commissionNetAmount,
      grossRevenue: financialBreakdown.grossRevenue,
      prizeAmount: Math.max(0, basePrizeAmount - accumulatedContribution),
      basePrizeAmount,
      accumulatedContributionAmount: accumulatedContribution,
      accumulatedPrizeAmount: 0,
      gameType: "normal",
      autoplayStatus: "idle",
      autoplayIntervalSeconds: Math.max(3, Math.round(restaurant.autoplayInterval / 1000)),
      preStartCountdownSeconds: 60,
      activePromotions: getActiveQrCampaignsForRestaurant(restaurant.id, "general"),
      operatorUserId: currentUser?.userId,
      operatorUsername: currentUser?.email ?? currentUser?.name,
      operatorRole: venueRole,
      createdAt,
    });
    const savedConfig = saveLastGameConfig(restaurant.id, {
      activeTables: draftGame.activeTables,
      tablePrice: draftGame.tablePrice,
      mode: draftGame.mode,
      createdAt,
    });
    saveLastGameConfigByType(
      restaurant.id,
      draftGame.activeTables === 50 ? "normal_50" : "normal_30",
      {
        activeTables: draftGame.activeTables,
        tablePrice: draftGame.tablePrice,
        mode: draftGame.mode,
        createdAt,
      },
    );

    setFeedback("Sincronizando con Supabase...");
    const realtimeResult = await createRealtimeSessionWithTimeout(createdSession);

    if (realtimeResult.mode !== "supabase") {
      cancelSession(createdSession.id);
      setIsStartingGame(false);
      setFeedback("Error: Supabase no esta configurado. La TV no puede sincronizar entre dispositivos.");
      return;
    }

    if (realtimeResult.error || !realtimeResult.data) {
      cancelSession(createdSession.id);
      setIsStartingGame(false);
      setFeedback(
        `Error: ${
          realtimeResult.error?.message ?? "sin respuesta"
        }`,
      );
      return;
    }

    setFeedback("Sesion creada");
    setLastConfig(savedConfig);
    setDraftGame(null);
    navigateToActiveGame(router);
    void preloadDeckImages(draftGame.deckId, "gerente-start");
  }

  async function startAccumulatedGame() {
    if (!restaurant || isPlay) {
      return;
    }

    const activeWeek = getActiveAccumulatedWeek(restaurant.id);

    if (!restaurant.accumulatedEnabled || activeWeek.amount <= 0) {
      setFeedback("No hay acumulado disponible para crear esta jugada.");
      return;
    }

    const deckBatch = getActiveBoardBatchByDeck(restaurant.id, restaurant.activeDeck);
    const activeTables = restaurant.accumulatedTableCount;

    if (!deckBatch) {
      setFeedback("No hay lote activo para el deck del restaurante.");
      return;
    }

    if (!restaurant.allowedTableCounts.includes(activeTables)) {
      setFeedback("La cantidad de tablas del acumulado no esta permitida por Master.");
      return;
    }

    if (activeTables > deckBatch.quantity) {
      setFeedback(`El lote activo solo tiene ${deckBatch.quantity} tablas disponibles.`);
      return;
    }

    setIsStartingGame(true);
    setFeedback("Creando sesion...");
    const createdAt = new Date().toISOString();
    const breakdown = calculateFinancialBreakdown({
      activeTables,
      tablePrice: restaurant.accumulatedTablePrice,
      restaurantCommissionPercent: restaurant.restaurantCommissionPercent,
      hlCommissionMode: restaurant.hlCommissionMode,
      hlCommissionValue: restaurant.hlCommissionValue,
      hlFixedFee: restaurant.hlFixedFee,
    });
    const basePrizeAmount = breakdown.prizeAmount;
    const createdSession = createSession({
      batchId: deckBatch.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      mode: "full_card",
      deckId: restaurant.activeDeck,
      activeTables,
      tablePrice: restaurant.accumulatedTablePrice,
      restaurantCommissionPercent: restaurant.restaurantCommissionPercent,
      restaurantCommissionAmount: breakdown.restaurantCommissionAmount,
      hlCommissionMode: breakdown.hlCommissionMode,
      hlCommissionValue: breakdown.hlCommissionValue,
      hlCommissionAmount: breakdown.hlCommissionAmount,
      commissionTotalPercent: breakdown.commissionTotalPercent,
      commissionTotalAmount: breakdown.commissionTotalAmount,
      hlFixedFee: breakdown.hlFixedFee,
      restaurantNetAmount: breakdown.restaurantNetAmount,
      commissionPercent: restaurant.restaurantCommissionPercent,
      commissionHLPercent: breakdown.commissionHLPercent,
      commissionRestaurantPercent: restaurant.restaurantCommissionPercent,
      commissionNetPercent: breakdown.commissionNetPercent,
      commissionHLAmount: breakdown.commissionHLAmount,
      commissionRestaurantAmount: breakdown.commissionRestaurantAmount,
      commissionNetAmount: breakdown.commissionNetAmount,
      grossRevenue: breakdown.grossRevenue,
      prizeAmount: basePrizeAmount + activeWeek.amount,
      basePrizeAmount,
      accumulatedContributionAmount: 0,
      accumulatedPrizeAmount: activeWeek.amount,
      gameType: "accumulated_special",
      autoplayStatus: "idle",
      autoplayIntervalSeconds: Math.max(3, Math.round(restaurant.autoplayInterval / 1000)),
      preStartCountdownSeconds: 60,
      activePromotions: getActiveQrCampaignsForRestaurant(restaurant.id, "general"),
      operatorUserId: currentUser?.userId,
      operatorUsername: currentUser?.email ?? currentUser?.name,
      operatorRole: venueRole,
      createdAt,
    });
    setFeedback("Sincronizando con Supabase...");
    const realtimeResult = await createRealtimeSessionWithTimeout(createdSession);

    if (realtimeResult.mode !== "supabase" || realtimeResult.error || !realtimeResult.data) {
      cancelSession(createdSession.id);
      setIsStartingGame(false);
      setFeedback(
        `Error: ${
          realtimeResult.error?.message ?? "sin respuesta"
        }`,
      );
      return;
    }

    setFeedback("Sesion creada");
    navigateToActiveGame(router);
    void preloadDeckImages(restaurant.activeDeck, "gerente-acumulado");
  }

  return (
    <Layout title="Gerente" eyebrow="Panel rapido HOSTER LIVE">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Restaurante"
          value={restaurant?.name ?? "Sin restaurante"}
          note="Operacion del gerente"
        />
        <StatCard
          label="Lote activo"
          value={activeBatch ? String(activeBatch.quantity) : "Sin lote"}
          note={activeBatch?.name ?? "No hay lote activo"}
        />
        <StatCard
          label="Ultimo costo"
          value={lastConfig ? formatCurrency(lastConfig.tablePrice) : "Primer costo"}
          note={lastConfig ? `${lastConfig.activeTables} tablas` : "Se usara el permitido inicial"}
        />
      </div>

      {!activeBatch ? (
        <Card accent className="mt-6 border-chile/35 bg-chile/10">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-chile/35 bg-chile/15 text-[#ff9b91]">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="font-display text-3xl text-bone">
                  No hay lote activo para este restaurante
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-bone/62">
                  Activa un lote desde Master o contacta al equipo operativo antes de iniciar una
                  jugada.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/login" variant="secondary">
                Contactar master
              </ButtonLink>
              <ButtonLink href="/gerente/jugada-activa" variant="ghost">
                Regresar
              </ButtonLink>
            </div>
          </div>
        </Card>
      ) : null}

      <Card accent className="mt-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-mezcal">
              Inicio express
            </p>
            <h2 className="mt-2 font-display text-4xl text-bone">Iniciar jugada rapidamente</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bone/62">
              Repite tablas y costo del restaurante; solo confirma la modalidad antes de arrancar.
            </p>
          </div>
          {!isPlay ? (
            <Button variant="secondary" onClick={() => setIsSpecialModalOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Jugada especial
            </Button>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {quickTableCounts.map((tableCount) => (
            <Button
              key={tableCount}
              onClick={() => openQuickGame(tableCount)}
              disabled={!restaurant || !activeBatch}
              className="h-24 min-w-0 flex-col text-base"
            >
              <Table2 className="h-5 w-5" />
              Repetir jugada {tableCount}
            </Button>
          ))}
        </div>

        {feedback ? (
          <p className="mt-5 rounded-lg border border-mezcal/30 bg-mezcal/10 px-3 py-2 text-sm font-semibold text-mezcal">
            {feedback}
          </p>
        ) : null}
      </Card>

      {accumulatedSummary ? (
        <Card accent className="mt-6 border-agave/30 bg-agave/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-agave">
                Acumulado semanal
              </p>
              <h2 className="mt-2 font-display text-4xl text-bone">
                {formatCurrency(accumulatedSummary.activeWeek.amount)}
              </h2>
              <p className="mt-2 text-sm font-semibold text-bone/65">
                Semana {accumulatedSummary.activeWeek.weekStart} a {accumulatedSummary.activeWeek.weekEnd} · Dia:{" "}
                {accumulatedSummary.day} · Proximo: {accumulatedSummary.nextDate}
              </p>
              <p className="mt-1 text-sm text-bone/55">Modalidad: Tabla llena</p>
            </div>
            {!isPlay ? (
              <Button
                onClick={startAccumulatedGame}
                disabled={
                  isStartingGame ||
                  !accumulatedSummary.enabled ||
                  accumulatedSummary.activeWeek.amount <= 0
                }
                className="min-h-12 w-full md:w-auto"
              >
                <Trophy className="h-4 w-4" />
                Crear jugada acumulado
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {draftGame && restaurant && financialBreakdown ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-obsidian/80 px-3 py-4 backdrop-blur">
          <Card accent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto overscroll-contain">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-mezcal">
                  Confirmar modalidad
                </p>
                <h3 className="mt-2 font-display text-4xl text-bone">
                  Repetir jugada {draftGame.activeTables}
                </h3>
              </div>
              <Button variant="ghost" onClick={() => setDraftGame(null)} disabled={isStartingGame}>
                Cerrar
              </Button>
            </div>

            <fieldset className="mt-5">
              {!isPlay && restaurant.enabledDecks.length > 1 ? (
                <div className="mb-4">
                  <legend className="mb-2 text-sm font-semibold text-bone/70">Deck</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {restaurant.enabledDecks.map((deckId) => (
                      <button
                        key={deckId}
                        type="button"
                        disabled={isStartingGame}
                        onClick={() => {
                          setDraftGame((current) => current && { ...current, deckId });
                          setActiveBatch(getActiveBoardBatchByDeck(restaurant.id, deckId) ?? null);
                        }}
                        className={`h-14 rounded-lg border px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          draftGame.deckId === deckId
                            ? "border-mezcal bg-mezcal text-obsidian"
                            : "border-bone/10 bg-bone/[0.04] text-bone hover:bg-bone/10"
                        }`}
                      >
                        {deckId === "worldcup2026" ? "FIFA 2026" : "Loteria"}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <legend className="mb-2 text-sm font-semibold text-bone/70">Modalidad de juego</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {normalModeOptions
                  .filter((mode) => restaurant.allowedModes.includes(mode))
                  .map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDraftGame((current) => current && { ...current, mode })}
                    disabled={isStartingGame}
                    className={`h-14 rounded-lg border px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      draftGame.mode === mode
                        ? "border-agave bg-agave text-obsidian"
                        : "border-bone/10 bg-bone/[0.04] text-bone hover:bg-bone/10"
                    }`}
                  >
                      {modeLabels[mode]}
                    </button>
                  ))}
              </div>
            </fieldset>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <PreviewItem label="Tablas" value={String(draftGame.activeTables)} />
              <PreviewItem label="Costo por tabla" value={formatCurrency(draftGame.tablePrice)} />
              <PreviewItem label="Ingreso bruto" value={formatCurrency(financialBreakdown.grossRevenue)} />
              <PreviewItem
                label="Fee HL"
                value={
                  financialBreakdown.hlCommissionMode === "percent"
                    ? `${financialBreakdown.hlCommissionValue}% - ${formatCurrency(financialBreakdown.hlCommissionAmount)}`
                    : formatCurrency(financialBreakdown.hlCommissionAmount)
                }
              />
              <PreviewItem
                label="Comision restaurante"
                value={`${financialBreakdown.restaurantCommissionPercent}% - ${formatCurrency(
                  financialBreakdown.restaurantCommissionAmount,
                )}`}
              />
              <PreviewItem
                label="Restaurante neto"
                value={formatCurrency(financialBreakdown.restaurantNetAmount)}
              />
              <PreviewItem
                label="Comision total"
                value={`${financialBreakdown.commissionTotalPercent}% - ${formatCurrency(
                  financialBreakdown.commissionTotalAmount,
                )}`}
              />
              <PreviewItem
                label="Premio calculado"
                value={formatCurrency(financialBreakdown.prizeAmount)}
                highlight
              />
            </dl>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => setDraftGame(null)} disabled={isStartingGame}>
                Cancelar
              </Button>
              <Button onClick={startQuickGame} disabled={isStartingGame} className="min-h-12">
                <Play className="h-4 w-4" />
                {isStartingGame ? "Preparando jugada..." : "Iniciar jugada"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {isSpecialModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-obsidian/80 px-3 py-4 backdrop-blur">
          <Card accent className="w-full max-w-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-mezcal">
                  Jugada especial
                </p>
                <h3 className="mt-2 font-display text-4xl text-bone">Configurar sin iniciar</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSpecialModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-lg bg-bone/8 text-bone/70 transition hover:bg-bone/12"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-bone/62">
              Abre la configuracion completa de jugada especial. No se crea ni corre una jugada
              hasta confirmar el formulario.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsSpecialModalOpen(false)}>
                Cerrar
              </Button>
              <ButtonLink href="/gerente/nueva-jugada">
                <Sparkles className="h-4 w-4" />
                Configurar especial
              </ButtonLink>
            </div>
          </Card>
        </div>
      ) : null}
    </Layout>
  );
}

function PreviewItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight
          ? "border-mezcal/35 bg-mezcal/10 shadow-glow"
          : "border-bone/10 bg-bone/[0.04]"
      }`}
    >
      <dt className="text-xs font-bold uppercase tracking-[0.18em] text-bone/45">{label}</dt>
      <dd className="mt-1 text-lg font-black text-bone">{value}</dd>
    </div>
  );
}
