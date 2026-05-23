"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MonitorPlay } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { getRestaurants } from "@/lib/restaurants/restaurantStorage";
import type { RestaurantConfig } from "@/lib/types";
import { getSessions } from "@/lib/sessions/sessionStorage";
import { getSupabaseConfigStatus } from "@/lib/supabase/client";

export default function MasterTvsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>([]);
  const [sessions, setSessions] = useState(getSessions);
  const supabaseStatus = getSupabaseConfigStatus();

  useEffect(() => {
    setRestaurants(getRestaurants().filter((restaurant) => restaurant.isActive));
    setSessions(getSessions());
  }, []);

  const rows = useMemo(
    () =>
      restaurants.map((restaurant) => {
        const latestSession = sessions.find((session) => session.restaurantId === restaurant.id);

        return {
          restaurant,
          route: `/tv/${restaurant.id}`,
          status: supabaseStatus.connected ? "Realtime listo" : "Modo local",
          lastActivity: latestSession?.lastUpdatedAt ?? latestSession?.createdAt,
          autoplayStatus: latestSession?.autoplayStatus ?? "standby",
        };
      }),
    [restaurants, sessions, supabaseStatus.connected],
  );

  return (
    <Layout title="TVs" eyebrow="Master operativo">
      <Card accent className="mb-5">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg border border-mezcal/30 bg-mezcal/12 text-mezcal">
            <MonitorPlay size={24} />
          </div>
          <div>
            <h2 className="font-display text-3xl text-bone">Pantallas por restaurante</h2>
            <p className="mt-1 text-sm text-bone/55">
              Rutas listas para abrir en Smart TV, navegador o mini PC.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <Card key={row.restaurant.id} className="bg-bone/[0.035]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-mezcal">
                  {row.status}
                </p>
                <h3 className="mt-2 font-display text-3xl text-bone">{row.restaurant.name}</h3>
                <p className="mt-2 text-sm text-bone/55">{row.route}</p>
              </div>
              <Link
                href={row.route}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-bone/10 bg-bone/[0.05] px-3 text-sm font-semibold text-bone/72 transition hover:bg-bone/10"
              >
                <ExternalLink size={16} />
                Abrir
              </Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-bone/10 bg-obsidian/50 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-bone/38">Estado</p>
                <p className="mt-1 font-semibold text-bone">{row.autoplayStatus}</p>
              </div>
              <div className="rounded-lg border border-bone/10 bg-obsidian/50 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-bone/38">Ultima actividad</p>
                <p className="mt-1 font-semibold text-bone">
                  {row.lastActivity
                    ? new Date(row.lastActivity).toLocaleString("es-MX")
                    : "Sin sesiones"}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
