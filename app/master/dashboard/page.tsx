"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CircleDollarSign, Trophy } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import {
  dashboardKpis as mockDashboardKpis,
  recentGameActivity as mockRecentGameActivity,
  restaurantRanking as mockRestaurantRanking,
  weeklyMetrics as mockWeeklyMetrics,
} from "@/lib/mockAnalytics";
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

function statusLabel(status: string) {
  if (status === "active") {
    return "Activo";
  }

  if (status === "finalized") {
    return "Finalizado";
  }

  if (status === "paused") {
    return "Pausado";
  }

  return "Revision";
}

function statusClassName(status: string) {
  if (status === "active") {
    return "bg-agave/16 text-agave ring-agave/35";
  }

  if (status === "finalized") {
    return "bg-mezcal/14 text-mezcal ring-mezcal/28";
  }

  if (status === "paused") {
    return "bg-bone/8 text-bone/52 ring-bone/10";
  }

  return "bg-mezcal/14 text-mezcal ring-mezcal/28";
}

export default function MasterDashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const sessionMetrics = useMemo(() => {
    const validSessions = sessions.filter((session) => session.status !== "active" || session.calledCards.length > 0);
    const grossRevenue = validSessions.reduce((total, session) => total + getSessionGrossRevenue(session), 0);
    const hosterCommission = validSessions.reduce(
      (total, session) => total + getSessionHlFixedFee(session),
      0,
    );
    const restaurantCommission = validSessions.reduce(
      (total, session) => total + getSessionRestaurantCommissionAmount(session),
      0,
    );
    const restaurantNet = validSessions.reduce((total, session) => total + getSessionRestaurantNetAmount(session), 0);
    const prizes = validSessions.reduce((total, session) => total + getSessionPrizeAmount(session), 0);
    const hosterLiveRevenue = hosterCommission;
    const ticketAverage =
      validSessions.length > 0
        ? Math.round(grossRevenue / validSessions.reduce((total, session) => total + session.activeTables, 0))
        : 0;
    const sessionsWithDuration = validSessions.filter((session) => session.durationSeconds > 0);
    const averageDuration =
      sessionsWithDuration.length > 0
        ? Math.round(
            sessionsWithDuration.reduce((total, session) => total + session.durationSeconds, 0) /
              sessionsWithDuration.length,
          )
        : 0;

    return {
      validSessions,
      grossRevenue,
      hosterCommission,
      restaurantCommission,
      restaurantNet,
      prizes,
      hosterLiveRevenue,
      ticketAverage,
      averageDuration,
    };
  }, [sessions]);

  const dashboardKpis =
    sessions.length === 0
      ? mockDashboardKpis
      : [
          {
            label: "Ingreso bruto",
            value: formatCurrency(sessionMetrics.grossRevenue),
            note: "Sesiones persistentes",
          },
          {
            label: "Comision restaurantes",
            value: formatCurrency(sessionMetrics.restaurantCommission),
            note: "Calculada por sesion",
          },
          {
            label: "Restaurante neto",
            value: formatCurrency(sessionMetrics.restaurantNet),
            note: "Despues de fee HL",
          },
          {
            label: "Utilidad Hoster Live",
            value: formatCurrency(sessionMetrics.hosterLiveRevenue),
            note: "Fee fijo por jugada",
          },
          {
            label: "Premios entregados",
            value: formatCurrency(sessionMetrics.prizes),
            note: "Premios registrados",
          },
          {
            label: "Jugadas activas",
            value: String(sessions.filter((session) => session.status === "active").length),
            note: "Sesiones abiertas",
          },
          {
            label: "Ticket promedio",
            value: formatCurrency(sessionMetrics.ticketAverage),
            note: "Por tabla registrada",
          },
          {
            label: "Duracion promedio",
            value: formatDuration(sessionMetrics.averageDuration),
            note: "Tiempo real en playing",
          },
        ];

  const restaurantRanking =
    sessions.length === 0
      ? mockRestaurantRanking
      : Array.from(
          sessions.reduce((map, session) => {
            const current = map.get(session.restaurantId) ?? {
              name: session.restaurantName,
              games: 0,
              grossRevenue: 0,
              profit: 0,
              status: "finalized",
            };
            const profit = getSessionHlFixedFee(session);

            map.set(session.restaurantId, {
              ...current,
              games: current.games + 1,
              grossRevenue: current.grossRevenue + getSessionGrossRevenue(session),
              profit: current.profit + profit,
              status: session.status === "active" ? "active" : current.status,
            });

            return map;
          }, new Map<string, { name: string; games: number; grossRevenue: number; profit: number; status: string }>()),
        )
          .map(([, value]) => value)
          .sort((left, right) => right.grossRevenue - left.grossRevenue);

  const recentGameActivity =
    sessions.length === 0
      ? mockRecentGameActivity
      : sessions.slice(0, 5).map((session) => ({
          restaurant: session.restaurantName,
          mode: session.mode,
          prize: getSessionPrizeAmount(session),
          time: new Date(session.startedAt).toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

  const weeklyMetrics =
    sessions.length === 0
      ? mockWeeklyMetrics
      : Object.values(
          sessions.reduce(
            (map, session) => {
              const day = new Date(session.startedAt).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "2-digit",
              });
              const current = map[day] ?? { day, revenue: 0, games: 0 };
              current.revenue += getSessionGrossRevenue(session);
              current.games += 1;
              map[day] = current;
              return map;
            },
            {} as Record<string, { day: string; revenue: number; games: number }>,
          ),
        );

  const maxRevenue = Math.max(1, ...weeklyMetrics.map((metric) => metric.revenue));
  const maxGames = Math.max(1, ...weeklyMetrics.map((metric) => metric.games));

  return (
    <Layout title="Dashboard Ejecutivo" eyebrow="HOSTER LIVE">
      <div className="mb-6 overflow-hidden rounded-lg border border-mezcal/25 bg-[radial-gradient(circle_at_18%_0%,rgba(217,164,65,0.16),transparent_34rem),linear-gradient(135deg,rgba(20,17,15,0.92),rgba(8,7,6,0.96))] p-5 shadow-cantina">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-mezcal">
              Hospitality Gaming Platform
            </p>
            <h2 className="mt-3 font-display text-4xl text-bone md:text-5xl">
              Finanzas y operacion live
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bone/62">
              Vista mock local para medir ingresos, utilidad, premios y desempeno por venue antes
              de conectar backend real.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-agave/20 bg-agave/10 px-4 py-3">
              <Activity className="mx-auto h-5 w-5 text-agave" />
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-agave">Live</p>
            </div>
            <div className="rounded-lg border border-mezcal/20 bg-mezcal/10 px-4 py-3">
              <CircleDollarSign className="mx-auto h-5 w-5 text-mezcal" />
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-mezcal">
                Yield
              </p>
            </div>
            <div className="rounded-lg border border-bone/10 bg-bone/[0.045] px-4 py-3">
              <Trophy className="mx-auto h-5 w-5 text-bone/70" />
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-bone/55">
                Prize
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboardKpis.map((kpi, index) => (
          <Card
            key={kpi.label}
            className={index === 2 ? "border-agave/25 bg-agave/8" : "bg-bone/[0.035]"}
          >
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-mezcal">
              {kpi.label}
            </p>
            <p className="mt-3 font-display text-4xl text-bone">{kpi.value}</p>
            <p className="mt-2 text-sm text-bone/55">{kpi.note}</p>
          </Card>
        ))}
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-bone/10 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-mezcal">
                Ranking restaurantes
              </p>
              <h3 className="mt-1 font-display text-2xl text-bone">Top financiero</h3>
            </div>
            <BarChart3 className="h-5 w-5 text-agave" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="bg-bone/[0.035] text-left text-xs uppercase tracking-[0.18em] text-bone/45">
                <tr>
                  <th className="px-5 py-4 font-semibold">Nombre</th>
                  <th className="px-5 py-4 font-semibold">Juegos</th>
                  <th className="px-5 py-4 font-semibold">Ingreso bruto</th>
                  <th className="px-5 py-4 font-semibold">Utilidad</th>
                  <th className="px-5 py-4 font-semibold">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bone/10">
                {restaurantRanking.map((restaurant) => (
                  <tr
                    key={restaurant.name}
                    className="bg-charcoal/35 transition hover:bg-bone/[0.035]"
                  >
                    <td className="px-5 py-4 font-semibold text-bone">{restaurant.name}</td>
                    <td className="px-5 py-4 text-bone/68">{restaurant.games}</td>
                    <td className="px-5 py-4 text-bone/68">
                      {formatCurrency(restaurant.grossRevenue)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-agave">
                      {formatCurrency(restaurant.profit)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClassName(
                          restaurant.status,
                        )}`}
                      >
                        {statusLabel(restaurant.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-mezcal">
                Grafica semanal
              </p>
              <h3 className="mt-1 font-display text-2xl text-bone">Ingresos y juegos</h3>
            </div>
            <div className="text-right text-xs font-semibold text-bone/45">
              <p>
                <span className="text-mezcal">Ingresos</span> /{" "}
                <span className="text-agave">Juegos</span>
              </p>
            </div>
          </div>

          <div className="mt-6 grid h-80 grid-cols-7 items-end gap-3">
            {weeklyMetrics.map((metric) => {
              const revenueHeight = Math.max(12, Math.round((metric.revenue / maxRevenue) * 100));
              const gamesHeight = Math.max(10, Math.round((metric.games / maxGames) * 100));

              return (
                <div key={metric.day} className="flex h-full min-w-0 flex-col justify-end gap-2">
                  <div className="flex flex-1 items-end justify-center gap-1">
                    <div
                      className="w-full max-w-8 rounded-t-lg bg-mezcal shadow-glow"
                      style={{ height: `${revenueHeight}%` }}
                      title={`${metric.day}: ${formatCurrency(metric.revenue)}`}
                    />
                    <div
                      className="w-full max-w-8 rounded-t-lg bg-agave/90"
                      style={{ height: `${gamesHeight}%` }}
                      title={`${metric.day}: ${metric.games} juegos`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-bone/55">
                      {metric.day}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-bone/35">
                      {metric.games}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-mezcal">
              Actividad reciente
            </p>
            <h3 className="mt-1 font-display text-2xl text-bone">Ultimas jugadas</h3>
          </div>
          <p className="text-sm text-bone/45">Mock local estructurado</p>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          {recentGameActivity.map((activity, index) => (
            <article
              key={`${activity.restaurant}-${activity.time}-${index}`}
              className="rounded-lg border border-bone/10 bg-bone/[0.035] p-4"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-agave">
                {activity.time}
              </p>
              <h4 className="mt-2 font-display text-2xl text-bone">{activity.restaurant}</h4>
              <p className="mt-2 text-sm text-bone/58">{activity.mode}</p>
              <p className="mt-4 text-xl font-black text-mezcal">
                {formatCurrency(activity.prize)}
              </p>
            </article>
          ))}
        </div>
      </Card>
    </Layout>
  );
}
