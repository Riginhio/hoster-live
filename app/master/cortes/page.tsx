"use client";

import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/Button";
import { getSessions, type Session } from "@/lib/sessions/sessionStorage";
import { getRestaurants } from "@/lib/restaurants/restaurantStorage";
import type { RestaurantConfig } from "@/lib/types";
import { decks, type DeckId } from "@/lib/decks";
import {
  getSessionGrossRevenue,
  getSessionHlFixedFee,
  getSessionPrizeAmount,
  getSessionRestaurantCommissionAmount,
  getSessionRestaurantNetAmount,
} from "@/lib/sessions/sessionFinancials";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function CortesPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>([]);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deckFilter, setDeckFilter] = useState<"all" | DeckId>("all");

  useEffect(() => {
    setSessions(getSessions());
    setRestaurants(getRestaurants());
  }, []);

  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) => {
        const startedAt = session.startedAt.slice(0, 10);
        const matchesRestaurant =
          selectedRestaurantIds.length === 0 || selectedRestaurantIds.includes(session.restaurantId);
        const matchesDateFrom = !dateFrom || startedAt >= dateFrom;
        const matchesDateTo = !dateTo || startedAt <= dateTo;
        const matchesDeck = deckFilter === "all" || session.deckId === deckFilter;

        return matchesRestaurant && matchesDateFrom && matchesDateTo && matchesDeck;
      }),
    [dateFrom, dateTo, deckFilter, selectedRestaurantIds, sessions],
  );

  const totals = useMemo(
    () =>
      filteredSessions.reduce(
        (summary, session) => ({
          grossRevenue: summary.grossRevenue + getSessionGrossRevenue(session),
          hlFixedFee: summary.hlFixedFee + getSessionHlFixedFee(session),
          commissionRestaurant:
            summary.commissionRestaurant + getSessionRestaurantCommissionAmount(session),
          restaurantNet: summary.restaurantNet + getSessionRestaurantNetAmount(session),
          prizes: summary.prizes + getSessionPrizeAmount(session),
          durationSeconds: summary.durationSeconds + (session.durationSeconds ?? 0),
        }),
        {
          grossRevenue: 0,
          hlFixedFee: 0,
          commissionRestaurant: 0,
          restaurantNet: 0,
          prizes: 0,
          durationSeconds: 0,
        },
      ),
    [filteredSessions],
  );

  const byRestaurant = useMemo(
    () =>
      Array.from(
        filteredSessions.reduce((map, session) => {
          const current = map.get(session.restaurantId) ?? {
            name: session.restaurantName,
            games: 0,
            grossRevenue: 0,
            hlFixedFee: 0,
            commissionRestaurant: 0,
            restaurantNet: 0,
            prizes: 0,
            durationSeconds: 0,
          };

          map.set(session.restaurantId, {
            name: current.name,
            games: current.games + 1,
            grossRevenue: current.grossRevenue + getSessionGrossRevenue(session),
            hlFixedFee: current.hlFixedFee + getSessionHlFixedFee(session),
            commissionRestaurant:
              current.commissionRestaurant + getSessionRestaurantCommissionAmount(session),
            restaurantNet: current.restaurantNet + getSessionRestaurantNetAmount(session),
            prizes: current.prizes + getSessionPrizeAmount(session),
            durationSeconds: current.durationSeconds + (session.durationSeconds ?? 0),
          });

          return map;
        }, new Map<string, { name: string; games: number; grossRevenue: number; hlFixedFee: number; commissionRestaurant: number; restaurantNet: number; prizes: number; durationSeconds: number }>()),
      ).map(([, value]) => value),
    [filteredSessions],
  );

  const chartRows = byRestaurant.length ? byRestaurant : [];
  const maxRevenue = Math.max(1, ...chartRows.map((row) => row.grossRevenue));

  function toggleRestaurant(restaurantId: string) {
    setSelectedRestaurantIds((currentIds) =>
      currentIds.includes(restaurantId)
        ? currentIds.filter((id) => id !== restaurantId)
        : [...currentIds, restaurantId],
    );
  }

  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Corte Hoster Live", 14, 18);
    pdf.setFontSize(10);
    pdf.text(`Sesiones: ${filteredSessions.length}`, 14, 28);
    pdf.text(`Ingreso bruto: ${formatCurrency(totals.grossRevenue)}`, 14, 36);
    pdf.text(`Comision Hoster Live: ${formatCurrency(totals.hlFixedFee)}`, 14, 44);
    pdf.text(`Tablas vendidas: ${filteredSessions.reduce((sum, session) => sum + session.activeTables, 0)}`, 14, 52);

    let y = 68;
    pdf.setFontSize(8);
    byRestaurant.forEach((restaurant) => {
      pdf.text(
        `${restaurant.name} | Jugadas ${restaurant.games} | Ingreso ${formatCurrency(restaurant.grossRevenue)} | HL ${formatCurrency(restaurant.hlFixedFee)}`,
        14,
        y,
      );
      y += 7;
      if (y > 260) {
        pdf.addPage();
        y = 18;
      }
    });

    pdf.save("hoster-live-cortes.pdf");
  }

  return (
    <Layout title="Cortes" eyebrow="Master">
      <Card className="mb-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_12rem_auto]">
          <div className="grid gap-2 rounded-lg border border-bone/10 bg-obsidian/38 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/42">
              Restaurantes / sucursales
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {restaurants.map((restaurant) => (
                <label key={restaurant.id} className="flex items-center gap-2 text-sm font-semibold text-bone/72">
                  <input
                    type="checkbox"
                    checked={selectedRestaurantIds.includes(restaurant.id)}
                    onChange={() => toggleRestaurant(restaurant.id)}
                  />
                  {restaurant.name}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none transition focus:border-mezcal/70"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none transition focus:border-mezcal/70"
            />
          </div>
          <select
            value={deckFilter}
            onChange={(event) => setDeckFilter(event.target.value as "all" | DeckId)}
            className="h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none transition focus:border-mezcal/70"
          >
            <option value="all">Todos los decks</option>
            {Object.values(decks).map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.label}
              </option>
            ))}
          </select>
          <Button onClick={() => void downloadPdf()}>Descargar PDF</Button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Ingreso bruto" value={formatCurrency(totals.grossRevenue)} note="Ventas" />
        <StatCard label="Jugadas" value={String(filteredSessions.length)} note="Sesiones filtradas" />
        <StatCard
          label="Tablas vendidas"
          value={String(filteredSessions.reduce((sum, session) => sum + session.activeTables, 0))}
          note="Total"
        />
        <StatCard label="Fee HL" value={formatCurrency(totals.hlFixedFee)} note="Hoster Live" />
        <StatCard
          label="Comision restaurante"
          value={formatCurrency(totals.commissionRestaurant)}
          note="Venue"
        />
        <StatCard label="Restaurante neto" value={formatCurrency(totals.restaurantNet)} note="Despues de fee HL" />
        <StatCard label="Premios" value={formatCurrency(totals.prizes)} note="Entregados" />
        <StatCard label="Duracion" value={formatDuration(totals.durationSeconds)} note="Tiempo jugado" />
      </div>
      <Card className="mt-6">
        <h2 className="font-display text-3xl text-bone">Grafica de ingresos</h2>
        <div className="mt-5 grid gap-3">
          {chartRows.map((row) => (
            <div key={row.name}>
              <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-[0.14em] text-bone/45">
                <span>{row.name}</span>
                <span>{formatCurrency(row.grossRevenue)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-bone/10">
                <div
                  className="h-full rounded-full bg-mezcal"
                  style={{ width: `${Math.max(4, (row.grossRevenue / maxRevenue) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="mt-6 overflow-hidden p-0">
        <div className="border-b border-bone/10 px-5 py-4">
          <h2 className="font-display text-3xl text-bone">Resumen por restaurante</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse">
            <thead className="bg-bone/[0.035] text-left text-xs uppercase tracking-[0.16em] text-bone/45">
              <tr>
                <th className="px-5 py-4">Restaurante</th>
                <th className="px-5 py-4">Jugadas</th>
                <th className="px-5 py-4">Ingreso bruto</th>
                <th className="px-5 py-4">Fee HL</th>
                <th className="px-5 py-4">Comision restaurante</th>
                <th className="px-5 py-4">Restaurante neto</th>
                <th className="px-5 py-4">Premios</th>
                <th className="px-5 py-4">Operador</th>
                <th className="px-5 py-4">Duracion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bone/10">
              {byRestaurant.map((restaurant) => (
                <tr key={restaurant.name} className="bg-charcoal/35">
                  <td className="px-5 py-4 font-semibold text-bone">{restaurant.name}</td>
                  <td className="px-5 py-4 text-bone/62">{restaurant.games}</td>
                  <td className="px-5 py-4 text-bone/62">{formatCurrency(restaurant.grossRevenue)}</td>
                  <td className="px-5 py-4 text-agave">{formatCurrency(restaurant.hlFixedFee)}</td>
                  <td className="px-5 py-4 text-bone/62">
                    {formatCurrency(restaurant.commissionRestaurant)}
                  </td>
                  <td className="px-5 py-4 text-mezcal">{formatCurrency(restaurant.restaurantNet)}</td>
                  <td className="px-5 py-4 text-bone/62">{formatCurrency(restaurant.prizes)}</td>
                  <td className="px-5 py-4 text-bone/62">Varios</td>
                  <td className="px-5 py-4 text-bone/62">
                    {formatDuration(restaurant.durationSeconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  );
}
