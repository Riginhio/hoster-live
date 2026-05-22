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
import { saveLastGameConfig } from "@/lib/sessions/lastGameConfigStorage";
import { getActiveBoardBatch } from "@/lib/boards/boardBatchStorage";
import { getActiveQrCampaignsForRestaurant } from "@/lib/qr/qrCampaignStorage";

const modeLabels: Record<WinMode, string> = {
  four_corners: "4 esquinas",
  x_shape: "X",
  center_four: "4 centrales",
  full_card: "Llena",
};

export default function NuevaJugadaPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<DemoGameConfig>(() => createDefaultDemoConfig());
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>(() => getRestaurants());
  const [savedConfig, setSavedConfig] = useState<DemoGameConfig | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === config.restaurantId) ?? restaurants[0],
    [config.restaurantId, restaurants],
  );
  const selectedActiveBatch = useMemo(
    () => getActiveBoardBatch(selectedRestaurant.id) ?? null,
    [selectedRestaurant.id],
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
    } catch {
      setRestaurants(getRestaurants());
      setConfig(createDefaultDemoConfig(currentUser?.restaurantId));
    }
  }, [currentUser?.restaurantId]);

  const financialBreakdown = calculateFinancialBreakdown({
    activeTables: config.activeTables,
    tablePrice: config.tablePrice,
    commissionHLPercent: selectedRestaurant.commissionHLPercent,
    commissionRestaurantPercent: selectedRestaurant.commissionRestaurantPercent,
  });
  const calculatedPrize = financialBreakdown.prizeAmount;

  function updateConfig(partialConfig: Partial<DemoGameConfig>) {
    setSavedConfig(null);
    setConfig((currentConfig) => {
      const nextRestaurantId = partialConfig.restaurantId ?? currentConfig.restaurantId;
      const restaurant =
        restaurants.find((item) => item.id === nextRestaurantId) ?? restaurants[0];

      if (nextRestaurantId !== currentConfig.restaurantId) {
        return {
          ...createDefaultDemoConfig(restaurant.id),
          mode: restaurant.allowedModes[0],
          tablePrice: restaurant.allowedPrices[0] ?? 100,
          activeTables: restaurant.allowedTableCounts[0] ?? 20,
          commissionPercent: restaurant.commissionHLPercent + restaurant.commissionRestaurantPercent,
          calculatedPrize: calculateFinancialBreakdown({
            activeTables: restaurant.allowedTableCounts[0] ?? 20,
            tablePrice: restaurant.allowedPrices[0] ?? 100,
            commissionHLPercent: restaurant.commissionHLPercent,
            commissionRestaurantPercent: restaurant.commissionRestaurantPercent,
          }).prizeAmount,
        };
      }

      const activeTables = partialConfig.activeTables ?? currentConfig.activeTables;
      const tablePrice = partialConfig.tablePrice ?? currentConfig.tablePrice;
      const commissionPercent = restaurant.commissionHLPercent + restaurant.commissionRestaurantPercent;
      const breakdown = calculateFinancialBreakdown({
        activeTables,
        tablePrice,
        commissionHLPercent: restaurant.commissionHLPercent,
        commissionRestaurantPercent: restaurant.commissionRestaurantPercent,
      });

      return {
        ...currentConfig,
        ...partialConfig,
        restaurantId: restaurant.id,
        activeTables,
        tablePrice,
        commissionPercent,
        calculatedPrize: breakdown.prizeAmount,
      };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextConfig: DemoGameConfig = {
      ...config,
      commissionPercent:
        selectedRestaurant.commissionHLPercent + selectedRestaurant.commissionRestaurantPercent,
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
      localStorage.setItem(configStorageKey, JSON.stringify(nextConfig));
      createSession({
        batchId: activeBatch.id,
        restaurantId: selectedRestaurant.id,
        restaurantName: selectedRestaurant.name,
        mode: nextConfig.mode,
        activeTables: nextConfig.activeTables,
        tablePrice: nextConfig.tablePrice,
        commissionPercent: nextConfig.commissionPercent,
        commissionHLPercent: selectedRestaurant.commissionHLPercent,
        commissionRestaurantPercent: selectedRestaurant.commissionRestaurantPercent,
        commissionNetPercent: financialBreakdown.commissionNetPercent,
        commissionHLAmount: financialBreakdown.commissionHLAmount,
        commissionRestaurantAmount: financialBreakdown.commissionRestaurantAmount,
        commissionNetAmount: financialBreakdown.commissionNetAmount,
        grossRevenue: financialBreakdown.grossRevenue,
        prizeAmount: financialBreakdown.prizeAmount,
        autoplayStatus: "idle",
        autoplayIntervalSeconds: 5,
        preStartCountdownSeconds: 60,
        activePromotions: getActiveQrCampaignsForRestaurant(selectedRestaurant.id),
      });
      saveLastGameConfig(selectedRestaurant.id, {
        activeTables: nextConfig.activeTables,
        tablePrice: nextConfig.tablePrice,
        mode: nextConfig.mode,
        createdAt: nextConfig.createdAt ?? new Date().toISOString(),
      });
    } catch {
      // La experiencia local puede seguir funcionando aunque el navegador bloquee almacenamiento.
    }

    setFormError(null);
    setConfig(nextConfig);
    setSavedConfig(nextConfig);
    router.push("/gerente/jugada-activa");
  }

  return (
    <Layout title="Jugada especial" eyebrow="Gerente">
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

            <fieldset>
              <legend className="mb-2 block text-sm font-semibold text-bone/70">
                Tablas activas
              </legend>
              <div className="grid grid-cols-3 gap-3">
                {selectedRestaurant.allowedTableCounts.map((option) => (
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
              <legend className="mb-2 block text-sm font-semibold text-bone/70">Modalidad</legend>
              <div className="grid gap-3 md:grid-cols-3">
                {selectedRestaurant.allowedModes.map((option) => (
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
                {selectedRestaurant.allowedPrices.map((price) => (
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
              <Button type="submit">
                <Play className="h-4 w-4" />
                Iniciar jugada
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
              <dt className="text-bone/45">Comision HL</dt>
              <dd className="mt-1 font-semibold text-bone">
                {financialBreakdown.commissionHLPercent}% - ${financialBreakdown.commissionHLAmount}
              </dd>
            </div>
            <div>
              <dt className="text-bone/45">Comision restaurante</dt>
              <dd className="mt-1 font-semibold text-bone">
                {financialBreakdown.commissionRestaurantPercent}% - $
                {financialBreakdown.commissionRestaurantAmount}
              </dd>
            </div>
            <div>
              <dt className="text-bone/45">Comision neta</dt>
              <dd className="mt-1 font-semibold text-bone">
                {financialBreakdown.commissionNetPercent}% - $
                {financialBreakdown.commissionNetAmount}
              </dd>
            </div>
            <div>
              <dt className="text-bone/45">Premio calculado</dt>
              <dd className="mt-1 text-2xl font-black text-bone">${calculatedPrize}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </Layout>
  );
}
