"use client";

import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSessions, type Session } from "@/lib/sessions/sessionStorage";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
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
          grossRevenue: accumulator.grossRevenue + session.grossRevenue,
          prizeAmount: accumulator.prizeAmount + session.prizeAmount,
          restaurantNetAmount: accumulator.restaurantNetAmount + session.restaurantNetAmount,
          hlAmount: accumulator.hlAmount + session.hlCommissionAmount,
        }),
        { games: 0, grossRevenue: 0, prizeAmount: 0, restaurantNetAmount: 0, hlAmount: 0 },
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
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/45">Jugadas</p>
            <p className="mt-2 text-3xl font-black text-bone">{totals.games}</p>
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
      )}
    </Layout>
  );
}
