"use client";

import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/StatCard";
import { getSessions, type Session } from "@/lib/sessions/sessionStorage";
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

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const totals = useMemo(
    () =>
      sessions.reduce(
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
    [sessions],
  );

  const byRestaurant = useMemo(
    () =>
      Array.from(
        sessions.reduce((map, session) => {
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
    [sessions],
  );

  return (
    <Layout title="Cortes" eyebrow="Master">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Ingreso bruto" value={formatCurrency(totals.grossRevenue)} note="Ventas" />
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
