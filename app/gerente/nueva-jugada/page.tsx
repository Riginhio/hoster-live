"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Play, Tv } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/auth/AuthProvider";
import type { WinMode } from "@/lib/loteria";
import {
  configStorageKey,
  createDefaultDemoConfig,
  parseStoredDemoConfig,
  type DemoGameConfig,
} from "@/lib/demoConfig";
import { getRestaurants } from "@/lib/restaurants/restaurantStorage";
import type { RestaurantConfig } from "@/lib/types";
import { calculateFinancialBreakdown } from "@/lib/finance";
import { createSession } from "@/lib/sessions/sessionStorage";
import {
  saveLastGameConfig,
  saveLastGameConfigByType,
} from "@/lib/sessions/lastGameConfigStorage";
import { getActiveQrCampaignsForRestaurant } from "@/lib/qr/qrCampaignStorage";
import { createRealtimeSession } from "@/lib/supabase/sessionRealtime";
import type { DeckId } from "@/lib/decks";
import { getActiveBoardBatchByDeck } from "@/lib/boards/boardBatchStorage";
import { preloadDeckImages } from "@/lib/decks/preloadImages";

const modeLabels: Record<WinMode, string> = {
  four_corners: "4 esquinas",
  x_shape: "X",
  center_four: "4 centrales",
  full_card: "Llena",
};
const specialModeOptions: WinMode[] = ["four_corners", "center_four", "x_shape", "full_card"];

export default function NuevaJugadaPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<DemoGameConfig>(() => createDefaultDemoConfig());
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>(() => getRestaurants());
  const [savedConfig, setSavedConfig] = useState<DemoGameConfig | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState<DeckId>("loteria");
  const [isPreparingGame, setIsPreparingGame] = useState(false);
  const isPlay = currentUser?.venueRole === "play";

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === config.restaurantId) ?? restaurants[0],
    [config.restaurantId, restaurants],
  );
  const selectedActiveBatch = useMemo(
    () => getActiveBoardBatchByDeck(selectedRestaurant.id, selectedDeckId) ?? null,
    [selectedDeckId, selectedRestaurant.id],
  );

  useEffect(() => {
    try {
      const loadedRestaurants = getRestaurants().filter((restaurant) => restaurant.isActive);
      const managerRestaurant =
        loadedRestaurants.find((restaurant) => restaurant.id === currentUser?.restaurantId) ??
        loadedRestaurants[0];

      const loadedConfig = parseStoredDemoConfig(
        localStorage.getItem(configStorageKey),
        managerRestaurant?.id ?? currentUser?.restaurantId,
      );

      setRestaurants(loadedRestaurants);
      setConfig(
        managerRestaurant && loadedConfig.restaurantId !== managerRestaurant.id
          ? createDefaultDemoConfig(managerRestaurant.id)
          : loadedConfig,
      );
      setSelectedDeckId(managerRestaurant?.enabledDecks[0] ?? managerRestaurant?.activeDeck ?? "loteria");
    } catch {
      setRestaurants(getRestaurants());
      setConfig(createDefaultDemoConfig(currentUser?.restaurantId));
    }
  }, [currentUser?.restaurantId]);

  const financialBreakdown = calculateFinancialBreakdown({
    activeTables: config.activeTables,
    tablePrice: config.tablePrice,
    restaurantCommissionPercent: selectedRestaurant.restaurantCommissionPercent,
    hlCommissionMode: selectedRestaurant.hlCommissionMode,
    hlCommissionValue: selectedRestaurant.hlCommissionValue,
    hlFixedFee: selectedRestaurant.hlFixedFee,
  });
  const calculatedPrize = financialBreakdown.prizeAmount;
  const availableSpecialTables = useMemo(
    () =>
      selectedRestaurant.allowedTableCounts,
    [selectedRestaurant.allowedTableCounts],
  );
  const availableSpecialPrices = useMemo(
    () => selectedRestaurant.allowedPrices,
    [selectedRestaurant.allowedPrices],
  );
  const availableSpecialModes = useMemo(
    () => specialModeOptions.filter((mode) => selectedRestaurant.allowedModes.includes(mode)),
    [selectedRestaurant.allowedModes],
  );

  useEffect(() => {
    if (!selectedRestaurant.enabledDecks.includes(selectedDeckId)) {
      setSelectedDeckId(selectedRestaurant.enabledDecks[0] ?? selectedRestaurant.activeDeck);
    }
  }, [selectedDeckId, selectedRestaurant.activeDeck, selectedRestaurant.enabledDecks]);

  useEffect(() => {
    const nextActiveTables = availableSpecialTables.includes(config.activeTables)
      ? config.activeTables
      : availableSpecialTables[0] ?? 50;
    const nextTablePrice = availableSpecialPrices.includes(config.tablePrice)
      ? config.tablePrice
      : selectedRestaurant.allowedPrices.includes(selectedRestaurant.defaultTablePrice)
        ? selectedRestaurant.defaultTablePrice
        : availableSpecialPrices[0] ?? 100;
    const nextMode = availableSpecialModes.includes(config.mode)
      ? config.mode
      : availableSpecialModes[0] ?? specialModeOptions[0];

    if (
      nextActiveTables !== config.activeTables ||
      nextTablePrice !== config.tablePrice ||
      nextMode !== config.mode
    ) {
      updateConfig({
        activeTables: nextActiveTables,
        tablePrice: nextTablePrice,
        mode: nextMode,
      });
    }
    // updateConfig derives from the current restaurant/config state; the guarded setters above prevent loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    availableSpecialModes,
    availableSpecialPrices,
    availableSpecialTables,
    config.activeTables,
    config.mode,
    config.tablePrice,
  ]);

  function updateConfig(partialConfig: Partial<DemoGameConfig>) {
    setSavedConfig(null);
    setConfig((currentConfig) => {
      const nextRestaurantId = partialConfig.restaurantId ?? currentConfig.restaurantId;
      const restaurant =
        restaurants.find((item) => item.id === nextRestaurantId) ?? restaurants[0];

      if (nextRestaurantId !== currentConfig.restaurantId) {
        const nextActiveTables =
          restaurant.allowedTableCounts[0] ?? 50;
        const nextTablePrice =
          restaurant.allowedPrices.includes(restaurant.defaultTablePrice)
            ? restaurant.defaultTablePrice
            : restaurant.allowedPrices[0] ?? 100;
        const nextMode =
          specialModeOptions.find((mode) => restaurant.allowedModes.includes(mode)) ??
          specialModeOptions[0];
        setSelectedDeckId(restaurant.enabledDecks[0] ?? restaurant.activeDeck);

        return {
          ...createDefaultDemoConfig(restaurant.id),
          mode: nextMode,
          tablePrice: nextTablePrice,
          activeTables: nextActiveTables,
          commissionPercent: restaurant.restaurantCommissionPercent,
          restaurantCommissionPercent: restaurant.restaurantCommissionPercent,
          hlCommissionMode: restaurant.hlCommissionMode,
          hlCommissionValue: restaurant.hlCommissionValue,
          hlFixedFee: restaurant.hlFixedFee,
          calculatedPrize: calculateFinancialBreakdown({
            activeTables: nextActiveTables,
            tablePrice: nextTablePrice,
            restaurantCommissionPercent: restaurant.restaurantCommissionPercent,
            hlCommissionMode: restaurant.hlCommissionMode,
            hlCommissionValue: restaurant.hlCommissionValue,
            hlFixedFee: restaurant.hlFixedFee,
          }).prizeAmount,
        };
      }

      const activeTables = partialConfig.activeTables ?? currentConfig.activeTables;
      const tablePrice = partialConfig.tablePrice ?? currentConfig.tablePrice;
      const commissionPercent = restaurant.restaurantCommissionPercent;
      const breakdown = calculateFinancialBreakdown({
        activeTables,
        tablePrice,
        restaurantCommissionPercent: restaurant.restaurantCommissionPercent,
        hlCommissionMode: restaurant.hlCommissionMode,
        hlCommissionValue: restaurant.hlCommissionValue,
        hlFixedFee: restaurant.hlFixedFee,
      });

      return {
        ...currentConfig,
        ...partialConfig,
        restaurantId: restaurant.id,
        activeTables,
        tablePrice,
        commissionPercent,
        restaurantCommissionPercent: restaurant.restaurantCommissionPercent,
        hlFixedFee: restaurant.hlFixedFee,
        calculatedPrize: breakdown.prizeAmount,
      };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPlay) {
      setFormError("Tu usuario Play solo puede iniciar jugadas normales.");
      return;
    }

    const nextConfig: DemoGameConfig = {
      ...config,
      commissionPercent: selectedRestaurant.restaurantCommissionPercent,
      restaurantCommissionPercent: selectedRestaurant.restaurantCommissionPercent,
      hlCommissionMode: selectedRestaurant.hlCommissionMode,
      hlCommissionValue: selectedRestaurant.hlCommissionValue,
      hlFixedFee: selectedRestaurant.hlFixedFee,
      calculatedPrize,
      createdAt: new Date().toISOString(),
    };
    const activeBatch = selectedActiveBatch;

    if (!activeBatch) {
      setFormError("No hay lote activo para este restaurante");
      return;
    }

    if (nextConfig.activeTables > activeBatch.quantity) {
      setFormError(
        `El lote activo solo tiene ${activeBatch.quantity} tablas disponibles.`,
      );
      return;
    }

    try {
      setIsPreparingGame(true);
      localStorage.setItem(configStorageKey, JSON.stringify(nextConfig));
      const createdSession = createSession({
        batchId: activeBatch.id,
        restaurantId: selectedRestaurant.id,
        restaurantName: selectedRestaurant.name,
        mode: nextConfig.mode,
        deckId: selectedDeckId,
        activeTables: nextConfig.activeTables,
        tablePrice: nextConfig.tablePrice,
        restaurantCommissionPercent: selectedRestaurant.restaurantCommissionPercent,
        restaurantCommissionAmount: financialBreakdown.restaurantCommissionAmount,
        hlCommissionMode: financialBreakdown.hlCommissionMode,
        hlCommissionValue: financialBreakdown.hlCommissionValue,
        hlCommissionAmount: financialBreakdown.hlCommissionAmount,
        commissionTotalPercent: financialBreakdown.commissionTotalPercent,
        commissionTotalAmount: financialBreakdown.commissionTotalAmount,
        hlFixedFee: financialBreakdown.hlFixedFee,
        restaurantNetAmount: financialBreakdown.restaurantNetAmount,
        commissionPercent: nextConfig.commissionPercent,
        commissionHLPercent: financialBreakdown.commissionHLPercent,
        commissionRestaurantPercent: selectedRestaurant.restaurantCommissionPercent,
        commissionNetPercent: financialBreakdown.commissionNetPercent,
        commissionHLAmount: financialBreakdown.commissionHLAmount,
        commissionRestaurantAmount: financialBreakdown.commissionRestaurantAmount,
        commissionNetAmount: financialBreakdown.commissionNetAmount,
        grossRevenue: financialBreakdown.grossRevenue,
        prizeAmount: financialBreakdown.prizeAmount,
        autoplayStatus: "idle",
        autoplayIntervalSeconds: Math.max(3, Math.round(selectedRestaurant.autoplayInterval / 1000)),
        preStartCountdownSeconds: 60,
        activePromotions: getActiveQrCampaignsForRestaurant(selectedRestaurant.id, "general"),
        operatorUserId: currentUser?.userId,
        operatorUsername: currentUser?.email ?? currentUser?.name,
        operatorRole: currentUser?.venueRole ?? "manager",
      });
      saveLastGameConfig(selectedRestaurant.id, {
        activeTables: nextConfig.activeTables,
        tablePrice: nextConfig.tablePrice,
        mode: nextConfig.mode,
        createdAt: nextConfig.createdAt ?? new Date().toISOString(),
      });
      saveLastGameConfigByType(selectedRestaurant.id, "special", {
        activeTables: nextConfig.activeTables,
        tablePrice: nextConfig.tablePrice,
        mode: nextConfig.mode,
        createdAt: nextConfig.createdAt ?? new Date().toISOString(),
      });
      setFormError(null);
      setConfig(nextConfig);
      setSavedConfig(nextConfig);
      router.push("/gerente/jugada-activa");
      void createRealtimeSession(createdSession);
      void preloadDeckImages(selectedDeckId, "especial-start");
      return;
    } catch {
      // La experiencia local puede seguir funcionando aunque el navegador bloquee almacenamiento.
      setIsPreparingGame(false);
    }
  }

  return (
    <Layout title="Jugada especial" eyebrow="Gerente">
      {isPlay ? (
        <Card accent className="border-chile/35 bg-chile/10">
          <h2 className="font-display text-3xl text-bone">Jugada especial no disponible</h2>
          <p className="mt-2 text-sm text-bone/60">
            Tu usuario Play solo puede lanzar jugadas normales desde Inicio.
          </p>
        </Card>
      ) : (
      <>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-3xl text-bone">Configuracion completa</h2>
              <p className="mt-2 max-w-2xl text-sm text-bone/60">
                Ajusta tablas, costo, modalidad, notas y usa el lote activo del restaurante.
              </p>
            </div>
            <Link
              href={`/tv/${config.restaurantId}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-bone/10 px-4 text-sm font-semibold text-bone ring-1 ring-bone/15 transition hover:bg-bone/15"
            >
              <Tv className="h-4 w-4" />
              Vista TV
            </Link>
          </div>

          {!selectedActiveBatch ? (
            <div className="mt-5 rounded-lg border border-chile/30 bg-chile/10 p-4">
              <p className="font-display text-2xl text-bone">
                No hay lote activo para este restaurante
              </p>
              <p className="mt-2 text-sm leading-6 text-bone/62">
                Contacta a Master para activar un lote antes de iniciar esta jugada.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-bone/10 px-4 text-sm font-semibold text-bone ring-1 ring-bone/15 transition hover:bg-bone/15"
                >
                  Contactar master
                </Link>
                <Link
                  href="/gerente"
                  className="inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-bone/80 transition hover:bg-bone/10 hover:text-bone"
                >
                  Regresar
                </Link>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-bone/70">Restaurante</span>
              <select
                value={config.restaurantId}
                onChange={(event) => updateConfig({ restaurantId: event.target.value })}
                disabled={Boolean(currentUser?.restaurantId)}
                className="h-12 w-full rounded-lg border border-bone/10 bg-obsidian/70 px-4 text-bone outline-none focus:border-mezcal"
              >
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedRestaurant.enabledDecks.length > 1 ? (
              <fieldset>
                <legend className="mb-2 block text-sm font-semibold text-bone/70">Deck</legend>
                <div className="grid grid-cols-2 gap-3">
                  {selectedRestaurant.enabledDecks.map((deckId) => (
                    <button
                      key={deckId}
                      type="button"
                      onClick={() => setSelectedDeckId(deckId)}
                      className={`h-12 rounded-lg border px-4 text-sm font-black transition ${
                        selectedDeckId === deckId
                          ? "border-mezcal bg-mezcal text-obsidian shadow-glow"
                          : "border-bone/10 bg-bone/[0.04] text-bone hover:bg-bone/10"
                      }`}
                    >
                      {deckId === "worldcup2026" ? "FIFA 2026" : "Loteria"}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <fieldset>
              <legend className="mb-2 block text-sm font-semibold text-bone/70">
                Tablas activas
              </legend>
              <div className="grid grid-cols-3 gap-3">
                {availableSpecialTables.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateConfig({ activeTables: option })}
                    className={`h-12 rounded-lg border px-4 text-sm font-black transition ${
                      config.activeTables === option
                        ? "border-mezcal bg-mezcal text-obsidian shadow-glow"
                        : "border-bone/10 bg-bone/[0.04] text-bone hover:bg-bone/10"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-bone/70">Notas</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Notas internas para esta jugada especial"
                className="w-full resize-none rounded-lg border border-bone/10 bg-obsidian/70 px-4 py-3 text-sm text-bone outline-none placeholder:text-bone/35 focus:border-mezcal"
              />
            </label>

            <div className="rounded-lg border border-agave/25 bg-agave/10 px-4 py-3 text-sm font-semibold text-agave">
              Se usara lote activo: {selectedActiveBatch?.name ?? "sin lote activo"}
            </div>

            <fieldset>
              <legend className="mb-2 block text-sm font-semibold text-bone/70">Modalidad de juego</legend>
              <div className="grid gap-3 md:grid-cols-3">
                {availableSpecialModes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateConfig({ mode: option })}
                    className={`h-12 rounded-lg border px-4 text-sm font-black transition ${
                      config.mode === option
                        ? "border-agave bg-agave text-obsidian"
                        : "border-bone/10 bg-bone/[0.04] text-bone hover:bg-bone/10"
                    }`}
                  >
                    {modeLabels[option]}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 block text-sm font-semibold text-bone/70">
                Costo por tabla
              </legend>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {availableSpecialPrices.map((price) => (
                  <button
                    key={price}
                    type="button"
                    onClick={() => updateConfig({ tablePrice: price })}
                    className={`h-12 rounded-lg border px-4 text-sm font-black transition ${
                      config.tablePrice === price
                        ? "border-mezcal bg-mezcal text-obsidian shadow-glow"
                        : "border-bone/10 bg-bone/[0.04] text-bone hover:bg-bone/10"
                    }`}
                  >
                    ${price}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-bone/10 bg-bone/[0.04] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-bone/45">
                  Ingreso bruto
                </p>
                <p className="mt-1 text-3xl font-black text-bone">
                  ${financialBreakdown.grossRevenue}
                </p>
              </div>
              <div className="rounded-lg border border-bone/10 bg-bone/[0.04] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-bone/45">
                  Comision neta
                </p>
                <p className="mt-1 text-3xl font-black text-bone">
                  {financialBreakdown.commissionNetPercent}%
                </p>
              </div>
              <div className="rounded-lg border border-mezcal/35 bg-mezcal/10 p-4 shadow-glow">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-mezcal">
                  Premio calculado
                </p>
                <p className="mt-1 text-3xl font-black text-bone">${calculatedPrize}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isPreparingGame} className="min-h-12 w-full sm:w-auto">
                <Play className="h-4 w-4" />
                {isPreparingGame ? "Preparando jugada..." : "Iniciar jugada"}
              </Button>
              {savedConfig ? (
                <p className="text-sm font-semibold text-agave">
                  Jugada live lista para {selectedRestaurant.name}.
                </p>
              ) : null}
            </div>
            {formError ? (
              <p className="rounded-lg border border-chile/30 bg-chile/10 px-3 py-2 text-sm font-semibold text-[#ff9b91]">
                {formError}
              </p>
            ) : null}
          </form>
        </Card>

        <Card accent>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-mezcal">Preview</p>
          <h3 className="mt-2 font-display text-3xl text-bone">{selectedRestaurant.name}</h3>
          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="text-bone/45">Tablas activas</dt>
              <dd className="mt-1 text-2xl font-black text-bone">{config.activeTables}</dd>
            </div>
            <div>
              <dt className="text-bone/45">Modalidad</dt>
              <dd className="mt-1 font-semibold text-bone">{modeLabels[config.mode]}</dd>
            </div>
            <div>
              <dt className="text-bone/45">Costo tabla</dt>
              <dd className="mt-1 font-semibold text-bone">${config.tablePrice}</dd>
            </div>
            <div>
              <dt className="text-bone/45">Ingreso bruto</dt>
              <dd className="mt-1 font-semibold text-bone">
                ${financialBreakdown.grossRevenue}
              </dd>
            </div>
            <div>
              <dt className="text-bone/45">Fee HL</dt>
              <dd className="mt-1 font-semibold text-bone">
                {financialBreakdown.hlCommissionMode === "percent"
                  ? `${financialBreakdown.hlCommissionValue}% - $${financialBreakdown.hlCommissionAmount}`
                  : `$${financialBreakdown.hlCommissionAmount}`}
              </dd>
            </div>
            <div>
              <dt className="text-bone/45">Comision restaurante</dt>
              <dd className="mt-1 font-semibold text-bone">
                {financialBreakdown.restaurantCommissionPercent}% - $
                {financialBreakdown.restaurantCommissionAmount}
              </dd>
            </div>
            <div>
              <dt className="text-bone/45">Comision total</dt>
              <dd className="mt-1 font-semibold text-bone">
                {financialBreakdown.commissionTotalPercent}% - $
                {financialBreakdown.commissionTotalAmount}
              </dd>
            </div>
            <div>
              <dt className="text-bone/45">Restaurante neto</dt>
              <dd className="mt-1 font-semibold text-bone">
                ${financialBreakdown.restaurantNetAmount}
              </dd>
            </div>
            <div>
              <dt className="text-bone/45">Premio calculado</dt>
              <dd className="mt-1 text-2xl font-black text-bone">${calculatedPrize}</dd>
            </div>
          </dl>
        </Card>
      </div>
      </>
      )}
    </Layout>
  );
}
