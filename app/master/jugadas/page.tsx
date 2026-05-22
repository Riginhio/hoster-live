"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Trophy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Layout } from "@/components/layout/Layout";
import { getSessions, type Session, type SessionStatus } from "@/lib/sessions/sessionStorage";

const inputClassName =
  "h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal/70";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getGrossRevenue(session: Session) {
  return session.activeTables * session.tablePrice;
}

function getRestaurantCommission(session: Session) {
  return getGrossRevenue(session) * (session.commissionPercent / 100);
}

function getHosterLiveRevenue(session: Session) {
  return Math.max(0, getGrossRevenue(session) - getRestaurantCommission(session) - session.prizeAmount);
}

function statusLabel(status: SessionStatus) {
  return status === "active" ? "Activa" : "Finalizada";
}

function statusClassName(status: SessionStatus) {
  if (status === "active") {
    return "bg-agave/16 text-agave ring-agave/35";
  }

  return "bg-mezcal/14 text-mezcal ring-mezcal/28";
}

export default function MasterJugadasPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [restaurantFilter, setRestaurantFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | SessionStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const restaurantOptions = useMemo(
    () => Array.from(new Set(sessions.map((session) => session.restaurantName))),
    [sessions],
  );
  const modeOptions = useMemo(
    () => Array.from(new Set(sessions.map((session) => session.mode))),
    [sessions],
  );

  const filteredSessions = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return sessions.filter((session) => {
      const matchesRestaurant =
        restaurantFilter === "all" || session.restaurantName === restaurantFilter;
      const matchesMode = modeFilter === "all" || session.mode === modeFilter;
      const matchesStatus = statusFilter === "all" || session.status === statusFilter;
      const matchesSearch =
        normalizedSearchTerm.length === 0 ||
        session.restaurantName.toLowerCase().includes(normalizedSearchTerm) ||
        (session.winnerFolio ?? "").toLowerCase().includes(normalizedSearchTerm);

      return matchesRestaurant && matchesMode && matchesStatus && matchesSearch;
    });
  }, [modeFilter, restaurantFilter, searchTerm, sessions, statusFilter]);

  const kpis = useMemo(() => {
    const finalizedSessions = filteredSessions.filter((session) => session.status === "finalized");

    return [
      {
        label: "Jugadas totales",
        value: String(filteredSessions.length),
        note: `${finalizedSessions.length} finalizadas`,
      },
      {
        label: "Ingreso bruto",
        value: formatCurrency(
          filteredSessions.reduce((total, session) => total + getGrossRevenue(session), 0),
        ),
        note: "Suma de tablas vendidas",
      },
      {
        label: "Premios entregados",
        value: formatCurrency(
          finalizedSessions.reduce((total, session) => total + session.prizeAmount, 0),
        ),
        note: "Pozo liquidado",
      },
      {
        label: "Utilidad Hoster Live",
        value: formatCurrency(
          filteredSessions.reduce((total, session) => total + getHosterLiveRevenue(session), 0),
        ),
        note: "Revenue calculado",
      },
    ];
  }, [filteredSessions]);

  return (
    <Layout title="Historial de Jugadas" eyebrow="HOSTER LIVE">
      <div className="mb-6 overflow-hidden rounded-lg border border-mezcal/25 bg-[radial-gradient(circle_at_18%_0%,rgba(217,164,65,0.16),transparent_34rem),linear-gradient(135deg,rgba(20,17,15,0.92),rgba(8,7,6,0.96))] p-5 shadow-cantina">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-mezcal">
          Game sessions
        </p>
        <h2 className="mt-3 font-display text-4xl text-bone md:text-5xl">
          Historial financiero por jugada
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-bone/62">
          Sesiones persistentes en localStorage, listas para migrarse a Supabase.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="bg-bone/[0.035]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-mezcal">
              {kpi.label}
            </p>
            <p className="mt-3 font-display text-4xl text-bone">{kpi.value}</p>
            <p className="mt-2 text-sm text-bone/55">{kpi.note}</p>
          </Card>
        ))}
      </section>

      <Card className="mt-6 bg-bone/[0.035]">
        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr]">
          <label className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bone/35"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar restaurante o folio ganador"
              className={`${inputClassName} w-full pl-10`}
            />
          </label>
          <select
            value={restaurantFilter}
            onChange={(event) => setRestaurantFilter(event.target.value)}
            className={inputClassName}
          >
            <option value="all">Todos los restaurantes</option>
            {restaurantOptions.map((restaurant) => (
              <option key={restaurant} value={restaurant}>
                {restaurant}
              </option>
            ))}
          </select>
          <select
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value)}
            className={inputClassName}
          >
            <option value="all">Todas las modalidades</option>
            {modeOptions.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | SessionStatus)}
            className={inputClassName}
          >
            <option value="all">Todos</option>
            <option value="active">Activas</option>
            <option value="finalized">Finalizadas</option>
          </select>
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden p-0">
        <div className="flex flex-col gap-2 border-b border-bone/10 px-5 py-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-mezcal">
              Historial
            </p>
            <h3 className="mt-1 font-display text-2xl text-bone">Jugadas realizadas</h3>
          </div>
          <p className="text-sm text-bone/45">{filteredSessions.length} registros visibles</p>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-bone/55">
            Aun no hay sesiones persistentes. Inicia una jugada desde el panel gerente.
          </div>
        ) : null}

        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead className="bg-bone/[0.035] text-left text-xs uppercase tracking-[0.16em] text-bone/45">
              <tr>
                <th className="px-5 py-4 font-semibold">Restaurante</th>
                <th className="px-5 py-4 font-semibold">Fecha</th>
                <th className="px-5 py-4 font-semibold">Modalidad</th>
                <th className="px-5 py-4 font-semibold">Tablas</th>
                <th className="px-5 py-4 font-semibold">Ingreso</th>
                <th className="px-5 py-4 font-semibold">Comision</th>
                <th className="px-5 py-4 font-semibold">Premio</th>
                <th className="px-5 py-4 font-semibold">HL revenue</th>
                <th className="px-5 py-4 font-semibold">Ganador</th>
                <th className="px-5 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bone/10">
              {filteredSessions.map((session) => (
                <tr key={session.id} className="bg-charcoal/35 transition hover:bg-bone/[0.035]">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-bone">{session.restaurantName}</p>
                    <p className="mt-1 text-xs text-bone/45">
                      {Math.round(session.durationSeconds / 60)} min
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm text-bone/68">
                    {formatDate(session.startedAt)} - {formatTime(session.startedAt)}
                  </td>
                  <td className="px-5 py-4 text-sm text-bone/68">{session.mode}</td>
                  <td className="px-5 py-4 text-sm text-bone/68">
                    {session.activeTables} x {formatCurrency(session.tablePrice)}
                  </td>
                  <td className="px-5 py-4 font-semibold text-bone">
                    {formatCurrency(getGrossRevenue(session))}
                  </td>
                  <td className="px-5 py-4 text-sm text-bone/68">
                    {session.commissionPercent}% - {formatCurrency(getRestaurantCommission(session))}
                  </td>
                  <td className="px-5 py-4 text-sm text-mezcal">
                    {formatCurrency(session.prizeAmount)}
                  </td>
                  <td className="px-5 py-4 font-semibold text-agave">
                    {formatCurrency(getHosterLiveRevenue(session))}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-mezcal/12 px-3 py-1 text-xs font-bold text-mezcal ring-1 ring-mezcal/25">
                      <Trophy size={13} />
                      {session.winnerFolio ?? "Pendiente"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClassName(
                        session.status,
                      )}`}
                    >
                      {statusLabel(session.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 xl:hidden">
          {filteredSessions.map((session) => (
            <article
              key={session.id}
              className="rounded-lg border border-bone/10 bg-bone/[0.035] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl text-bone">{session.restaurantName}</p>
                  <p className="mt-1 text-sm text-bone/52">
                    {formatDate(session.startedAt)} - {formatTime(session.startedAt)} -{" "}
                    {session.mode}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClassName(
                    session.status,
                  )}`}
                >
                  {statusLabel(session.status)}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-bone/42">Ingreso</p>
                  <p className="mt-1 font-semibold text-bone">
                    {formatCurrency(getGrossRevenue(session))}
                  </p>
                </div>
                <div>
                  <p className="text-bone/42">Utilidad HL</p>
                  <p className="mt-1 font-semibold text-agave">
                    {formatCurrency(getHosterLiveRevenue(session))}
                  </p>
                </div>
                <div>
                  <p className="text-bone/42">Premio</p>
                  <p className="mt-1 font-semibold text-mezcal">
                    {formatCurrency(session.prizeAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-bone/42">Ganador</p>
                  <p className="mt-1 font-semibold text-bone">
                    {session.winnerFolio ?? "Pendiente"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </Layout>
  );
}
