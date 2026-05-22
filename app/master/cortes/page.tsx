"use client";

import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/StatCard";
import { getSessions, type Session } from "@/lib/sessions/sessionStorage";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function getGrossRevenue(session: Session) {
  return session.grossRevenue ?? session.activeTables * session.tablePrice;
}

function getCommissionHL(session: Session) {
  return session.commissionHLAmount ?? getGrossRevenue(session) * ((session.commissionHLPercent ?? 0) / 100);
}

function getCommissionRestaurant(session: Session) {
  return (
    session.commissionRestaurantAmount ??
    getGrossRevenue(session) *
      ((session.commissionRestaurantPercent ?? session.commissionPercent ?? 0) / 100)
  );
}

function getCommissionNet(session: Session) {
  return session.commissionNetAmount ?? getCommissionHL(session) + getCommissionRestaurant(session);
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
          grossRevenue: summary.grossRevenue + getGrossRevenue(session),
          commissionHL: summary.commissionHL + getCommissionHL(session),
          commissionRestaurant:
            summary.commissionRestaurant + getCommissionRestaurant(session),
          commissionNet: summary.commissionNet + getCommissionNet(session),
          prizes: summary.prizes + session.prizeAmount,
        }),
        {
          grossRevenue: 0,
          commissionHL: 0,
          commissionRestaurant: 0,
          commissionNet: 0,
          prizes: 0,
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
            commissionHL: 0,
            commissionRestaurant: 0,
            commissionNet: 0,
            prizes: 0,
          };

          map.set(session.restaurantId, {
            name: current.name,
            games: current.games + 1,
            grossRevenue: current.grossRevenue + getGrossRevenue(session),
            commissionHL: current.commissionHL + getCommissionHL(session),
            commissionRestaurant:
              current.commissionRestaurant + getCommissionRestaurant(session),
            commissionNet: current.commissionNet + getCommissionNet(session),
            prizes: current.prizes + session.prizeAmount,
          });

          return map;
        }, new Map<string, { name: string; games: number; grossRevenue: number; commissionHL: number; commissionRestaurant: number; commissionNet: number; prizes: number }>()),
      ).map(([, value]) => value),
    [sessions],
  );

  return (
    <Layout title="Cortes" eyebrow="Master">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Ingreso bruto" value={formatCurrency(totals.grossRevenue)} note="Ventas" />
        <StatCard label="Comision HL" value={formatCurrency(totals.commissionHL)} note="Hoster Live" />
        <StatCard
          label="Comision restaurante"
          value={formatCurrency(totals.commissionRestaurant)}
          note="Venue"
        />
        <StatCard label="Comision neta" value={formatCurrency(totals.commissionNet)} note="HL + venue" />
        <StatCard label="Premios" value={formatCurrency(totals.prizes)} note="Entregados" />
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
                <th className="px-5 py-4">Comision HL</th>
                <th className="px-5 py-4">Comision restaurante</th>
                <th className="px-5 py-4">Comision neta</th>
                <th className="px-5 py-4">Premios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bone/10">
              {byRestaurant.map((restaurant) => (
                <tr key={restaurant.name} className="bg-charcoal/35">
                  <td className="px-5 py-4 font-semibold text-bone">{restaurant.name}</td>
                  <td className="px-5 py-4 text-bone/62">{restaurant.games}</td>
                  <td className="px-5 py-4 text-bone/62">{formatCurrency(restaurant.grossRevenue)}</td>
                  <td className="px-5 py-4 text-agave">{formatCurrency(restaurant.commissionHL)}</td>
                  <td className="px-5 py-4 text-bone/62">
                    {formatCurrency(restaurant.commissionRestaurant)}
                  </td>
                  <td className="px-5 py-4 text-mezcal">{formatCurrency(restaurant.commissionNet)}</td>
                  <td className="px-5 py-4 text-bone/62">{formatCurrency(restaurant.prizes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  );
}
