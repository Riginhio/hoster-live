"use client";

import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSessions, type Session } from "@/lib/sessions/sessionStorage";
import { decks } from "@/lib/decks";
import {
  getSessionGrossRevenue,
  getSessionHlFixedFee,
  getSessionPrizeAmount,
  getSessionRestaurantNetAmount,
} from "@/lib/sessions/sessionFinancials";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function modeLabel(mode: string) {
  if (mode === "four_corners") return "4 esquinas";
  if (mode === "x_shape") return "Figura X";
  if (mode === "center_four") return "Centro 4";
  if (mode === "full_card") return "Llena";
  return mode;
}

function getGameType(session: Session) {
  return session.activeTables > 50 ? "Especial" : "Normal";
}

export default function GerenteReportesPage() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const isPlay = currentUser?.venueRole === "play";

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const restaurantSessions = useMemo(
    () => sessions.filter((session) => session.restaurantId === currentUser?.restaurantId),
    [currentUser?.restaurantId, sessions],
  );

  const totals = useMemo(
    () =>
      restaurantSessions.reduce(
        (accumulator, session) => ({
          games: accumulator.games + 1,
          completed: accumulator.completed + (session.status === "completed" ? 1 : 0),
          cancelled: accumulator.cancelled + (session.status === "cancelled" ? 1 : 0),
          closedWithoutWinner:
            accumulator.closedWithoutWinner +
            (session.status === "closed_without_winner" ? 1 : 0),
          grossRevenue: accumulator.grossRevenue + getSessionGrossRevenue(session),
          prizeAmount: accumulator.prizeAmount + getSessionPrizeAmount(session),
          restaurantNetAmount:
            accumulator.restaurantNetAmount + getSessionRestaurantNetAmount(session),
          hlAmount: accumulator.hlAmount + getSessionHlFixedFee(session),
        }),
        {
          games: 0,
          completed: 0,
          cancelled: 0,
          closedWithoutWinner: 0,
          grossRevenue: 0,
          prizeAmount: 0,
          restaurantNetAmount: 0,
          hlAmount: 0,
        },
      ),
    [restaurantSessions],
  );

  return (
    <Layout title="Reportes" eyebrow="Gerente">
      {isPlay ? (
        <Card accent className="border-chile/35 bg-chile/10">
          <h2 className="font-display text-3xl text-bone">Acceso restringido</h2>
          <p className="mt-2 text-sm text-bone/60">Los usuarios Play no pueden ver reportes.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/45">Jugadas</p>
              <p className="mt-2 text-3xl font-black text-bone">{totals.games}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/45">Completadas</p>
              <p className="mt-2 text-3xl font-black text-bone">{totals.completed}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/45">Canceladas</p>
              <p className="mt-2 text-3xl font-black text-bone">{totals.cancelled}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/45">Sin ganador</p>
              <p className="mt-2 text-3xl font-black text-bone">{totals.closedWithoutWinner}</p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/45">Bruto</p>
              <p className="mt-2 text-3xl font-black text-bone">
                {formatCurrency(totals.grossRevenue)}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/45">Premio</p>
              <p className="mt-2 text-3xl font-black text-bone">
                {formatCurrency(totals.prizeAmount)}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/45">
                Neto restaurante
              </p>
              <p className="mt-2 text-3xl font-black text-bone">
                {formatCurrency(totals.restaurantNetAmount)}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/45">HL</p>
              <p className="mt-2 text-3xl font-black text-bone">{formatCurrency(totals.hlAmount)}</p>
            </Card>
          </div>

          <Card className="mt-6 overflow-hidden p-0">
            <div className="border-b border-bone/10 px-5 py-4">
              <h2 className="font-display text-3xl text-bone">Desglose de jugadas</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse">
                <thead className="bg-bone/[0.035] text-left text-xs uppercase tracking-[0.14em] text-bone/45">
                  <tr>
                    <th className="px-5 py-4">Timestamp</th>
                    <th className="px-5 py-4">Tipo</th>
                    <th className="px-5 py-4">Modalidad</th>
                    <th className="px-5 py-4">Deck</th>
                    <th className="px-5 py-4">Tablas</th>
                    <th className="px-5 py-4">Costo</th>
                    <th className="px-5 py-4">Operador</th>
                    <th className="px-5 py-4">Total individual</th>
                    <th className="px-5 py-4">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bone/10">
                  {restaurantSessions.map((session) => (
                    <tr key={session.id} className="bg-charcoal/35">
                      <td className="px-5 py-4 text-bone/62">
                        {new Date(session.startedAt).toLocaleString("es-MX")}
                      </td>
                      <td className="px-5 py-4 font-semibold text-bone">{getGameType(session)}</td>
                      <td className="px-5 py-4 text-bone/62">{modeLabel(session.mode)}</td>
                      <td className="px-5 py-4 text-bone/62">
                        {decks[session.deckId]?.label ?? session.deckId}
                      </td>
                      <td className="px-5 py-4 text-bone/62">{session.activeTables}</td>
                      <td className="px-5 py-4 text-bone/62">{formatCurrency(session.tablePrice)}</td>
                      <td className="px-5 py-4 text-bone/62">
                        {session.operatorUsername ?? session.operatorRole ?? "Sin operador"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-mezcal">
                        {formatCurrency(getSessionGrossRevenue(session))}
                      </td>
                      <td className="px-5 py-4 text-bone/62">{session.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </Layout>
  );
}
