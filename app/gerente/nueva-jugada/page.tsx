"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Play, Tv } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { WinMode } from "@/lib/loteria";
import {
  configStorageKey,
  createDefaultDemoConfig,
  parseStoredDemoConfig,
  type DemoGameConfig,
} from "@/lib/demoConfig";
import { calculatePrize, restaurants } from "@/lib/restaurants";

const modeLabels: Record<WinMode, string> = {
  four_corners: "4 esquinas",
  x_shape: "X",
  center_four: "4 centrales",
};

export default function NuevaJugadaPage() {
  const [config, setConfig] = useState<DemoGameConfig>(() => createDefaultDemoConfig());
  const [savedConfig, setSavedConfig] = useState<DemoGameConfig | null>(null);

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === config.restaurantId) ?? restaurants[0],
    [config.restaurantId],
  );

  useEffect(() => {
    try {
      setConfig(parseStoredDemoConfig(localStorage.getItem(configStorageKey)));
    } catch {
      setConfig(createDefaultDemoConfig());
    }
  }, []);

  const calculatedPrize = calculatePrize(
    config.activeTables,
    config.tablePrice,
    selectedRestaurant.commissionPercent,
  );

  function updateConfig(partialConfig: Partial<DemoGameConfig>) {
    setSavedConfig(null);
    setConfig((currentConfig) => {
      const nextRestaurantId = partialConfig.restaurantId ?? currentConfig.restaurantId;
      const restaurant =
        restaurants.find((item) => item.id === nextRestaurantId) ?? restaurants[0];

      if (nextRestaurantId !== currentConfig.restaurantId) {
        return createDefaultDemoConfig(restaurant.id);
      }

      const activeTables = partialConfig.activeTables ?? currentConfig.activeTables;
      const tablePrice = partialConfig.tablePrice ?? currentConfig.tablePrice;
      const commissionPercent = restaurant.commissionPercent;

      return {
        ...currentConfig,
        ...partialConfig,
        restaurantId: restaurant.id,
        activeTables,
        tablePrice,
        commissionPercent,
        calculatedPrize: calculatePrize(activeTables, tablePrice, commissionPercent),
      };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextConfig: DemoGameConfig = {
      ...config,
      commissionPercent: selectedRestaurant.commissionPercent,
      calculatedPrize,
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(configStorageKey, JSON.stringify(nextConfig));
    } catch {
      // La experiencia local puede seguir funcionando aunque el navegador bloquee almacenamiento.
    }

    setConfig(nextConfig);
    setSavedConfig(nextConfig);
  }

  return (
    <Layout title="Nueva Jugada" eyebrow="Gerente">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-3xl text-bone">Configuracion live</h2>
              <p className="mt-2 max-w-2xl text-sm text-bone/60">
                Esta configuracion se guarda en este navegador para probar el motor local.
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

          <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-bone/70">Restaurante</span>
              <select
                value={config.restaurantId}
                onChange={(event) => updateConfig({ restaurantId: event.target.value })}
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

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-bone/10 bg-bone/[0.04] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-bone/45">
                  Comision restaurante
                </p>
                <p className="mt-1 text-3xl font-black text-bone">
                  {selectedRestaurant.commissionPercent}%
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
              <dt className="text-bone/45">Comision</dt>
              <dd className="mt-1 font-semibold text-bone">
                {selectedRestaurant.commissionPercent}%
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
