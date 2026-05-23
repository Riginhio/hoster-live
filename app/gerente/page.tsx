"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Play, Sparkles, Table2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/components/auth/AuthProvider";
import type { WinMode } from "@/lib/loteria";
import type { DeckId } from "@/lib/decks";
import { calculateFinancialBreakdown } from "@/lib/finance";
import { getActiveBoardBatch, type BoardBatch } from "@/lib/boards/boardBatchStorage";
import { getRestaurants } from "@/lib/restaurants/restaurantStorage";
import {
  getLastGameConfig,
  saveLastGameConfig,
  type LastGameConfig,
} from "@/lib/sessions/lastGameConfigStorage";
import { createSession } from "@/lib/sessions/sessionStorage";
import { getActiveQrCampaignsForRestaurant } from "@/lib/qr/qrCampaignStorage";
import { createRealtimeSession } from "@/lib/supabase/sessionRealtime";
import type { RestaurantConfig } from "@/lib/types";

const quickTableCounts = [20, 30, 50];

const modeLabels: Record<WinMode, string> = {
  four_corners: "4 esquinas",
  x_shape: "Figura X",
  center_four: "Centro 4",
  full_card: "Llena",
};
const normalModeOptions: WinMode[] = ["four_corners", "center_four", "x_shape", "full_card"];

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
    lastConfig && [50, 100, 150].includes(lastConfig.tablePrice)
      ? lastConfig.tablePrice
      : [50, 100, 150].find((price) => restaurant.allowedPrices.includes(price)) ?? 50;
  const allowedNormalModes = normalModeOptions.filter((mode) => restaurant.allowedModes.includes(mode));
  const mode =
    lastConfig && allowedNormalModes.includes(lastConfig.mode)
      ? lastConfig.mode
      : allowedNormalModes[0] ?? "four_corners";

  return {
    activeTables,
    tablePrice,
    mode,
    deckId: restaurant.enabledDecks[0] ?? restaurant.activeDeck,
  };
}

export default function GerentePage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>([]);
  const [activeBatch, setActiveBatch] = useState<BoardBatch | null>(null);
  const [draftGame, setDraftGame] = useState<DraftGame | null>(null);
  const [lastConfig, setLastConfig] = useState<LastGameConfig | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const venueRole = currentUser?.venueRole ?? "manager";
  const isPlay = venueRole === "play";

  useEffect(() => {
    const loadedRestaurants = getRestaurants().filter((restaurant) => restaurant.isActive);
    const restaurant = getFallbackRestaurant(loadedRestaurants, currentUser?.restaurantId);

    setRestaurants(loadedRestaurants);
    setActiveBatch(restaurant ? getActiveBoardBatch(restaurant.id) ?? null : null);
    setLastConfig(restaurant ? getLastGameConfig(restaurant.id) : null);
  }, [currentUser?.restaurantId]);

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

  function openQuickGame(activeTables: number) {
    if (!restaurant) {
      return;
    }

    setFeedback(null);

    if (!activeBatch) {
      setFeedback("No hay lote activo para este restaurante");
      return;
    }

    if (activeTables > activeBatch.quantity) {
      setFeedback(`El lote activo solo tiene ${activeBatch.quantity} tablas disponibles.`);
      return;
    }

    setDraftGame(getDraftConfig(restaurant, activeTables));
  }

  function startQuickGame() {
    if (!restaurant || !activeBatch || !draftGame || !financialBreakdown) {
      return;
    }

    const commissionPercent = restaurant.restaurantCommissionPercent;
    const createdAt = new Date().toISOString();

    const createdSession = createSession({
      batchId: activeBatch.id,
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
      prizeAmount: financialBreakdown.prizeAmount,
      autoplayStatus: "idle",
      autoplayIntervalSeconds: 5,
      preStartCountdownSeconds: 60,
      activePromotions: getActiveQrCampaignsForRestaurant(restaurant.id),
      operatorUserId: currentUser?.userId,
      operatorUsername: currentUser?.email ?? currentUser?.name,
      operatorRole: venueRole,
      createdAt,
    });
    void createRealtimeSession(createdSession);

    const savedConfig = saveLastGameConfig(restaurant.id, {
      activeTables: draftGame.activeTables,
      tablePrice: draftGame.tablePrice,
      mode: draftGame.mode,
      createdAt,
    });

    setLastConfig(savedConfig);
    setDraftGame(null);
    setFeedback("Jugada iniciada y guardada como ultima configuracion del restaurante.");
    router.push("/gerente/jugada-activa");
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
            <ButtonLink href="/gerente/nueva-jugada" variant="secondary">
              <Sparkles className="h-4 w-4" />
              Jugada especial
            </ButtonLink>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {quickTableCounts.map((tableCount) => (
            <Button
              key={tableCount}
              onClick={() => openQuickGame(tableCount)}
              disabled={!restaurant || !activeBatch}
              className="h-24 flex-col"
            >
              <Table2 className="h-5 w-5" />
              Repetir jugada {tableCount}
            </Button>
          ))}
          {!isPlay ? (
            <ButtonLink
              href="/gerente/nueva-jugada"
              variant="secondary"
              className="h-24 flex-col"
            >
              <Sparkles className="h-5 w-5" />
              Jugada especial
            </ButtonLink>
          ) : null}
        </div>

        {feedback ? (
          <p className="mt-5 rounded-lg border border-mezcal/30 bg-mezcal/10 px-3 py-2 text-sm font-semibold text-mezcal">
            {feedback}
          </p>
        ) : null}
      </Card>

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
              <Button variant="ghost" onClick={() => setDraftGame(null)}>
                Cerrar
              </Button>
            </div>

            <fieldset className="mt-5">
              {restaurant.enabledDecks.length > 1 ? (
                <div className="mb-4">
                  <legend className="mb-2 text-sm font-semibold text-bone/70">Deck</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {restaurant.enabledDecks.map((deckId) => (
                      <button
                        key={deckId}
                        type="button"
                        onClick={() => setDraftGame((current) => current && { ...current, deckId })}
                        className={`h-12 rounded-lg border px-4 text-sm font-black transition ${
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
              <legend className="mb-2 text-sm font-semibold text-bone/70">Modalidad</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {normalModeOptions
                  .filter((mode) => restaurant.allowedModes.includes(mode))
                  .map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDraftGame((current) => current && { ...current, mode })}
                    className={`h-12 rounded-lg border px-4 text-sm font-black transition ${
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
              <Button variant="secondary" onClick={() => setDraftGame(null)}>
                Cancelar
              </Button>
              <Button onClick={startQuickGame}>
                <Play className="h-4 w-4" />
                Iniciar jugada
              </Button>
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
