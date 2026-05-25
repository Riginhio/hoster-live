"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, MonitorPlay, Save } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getRestaurants } from "@/lib/restaurants/restaurantStorage";
import type { RestaurantConfig } from "@/lib/types";
import { getSessions } from "@/lib/sessions/sessionStorage";
import { getSupabaseConfigStatus } from "@/lib/supabase/client";
import { readImageFileAsDataUrl } from "@/lib/browserFiles";
import {
  getTvControls,
  clearTvControl,
  sendTvControl,
  upsertTvControl,
  type TvControl,
  type TvOverrideType,
} from "@/lib/tv/tvControlStorage";

export default function MasterTvsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>([]);
  const [sessions, setSessions] = useState(getSessions);
  const [controls, setControls] = useState<TvControl[]>([]);
  const supabaseStatus = getSupabaseConfigStatus();

  useEffect(() => {
    setRestaurants(getRestaurants().filter((restaurant) => restaurant.isActive));
    setSessions(getSessions());
    setControls(getTvControls());
  }, []);

  const getControl = useCallback((restaurantId: string) => {
    return (
      controls.find((control) => control.restaurantId === restaurantId) ?? {
        restaurantId,
        disabled: false,
        overrideType: "none" as TvOverrideType,
        message: "",
        imageUrl: "",
        durationSeconds: 15,
        visibleUntil: "",
        updatedAt: "",
      }
    );
  }, [controls]);

  function updateControl(restaurantId: string, updates: Partial<TvControl>) {
    const currentControl = getControl(restaurantId);
    upsertTvControl({ ...currentControl, ...updates, restaurantId });
    setControls(getTvControls());
  }

  const rows = useMemo(
    () =>
      restaurants.map((restaurant) => {
        const latestSession = sessions.find((session) => session.restaurantId === restaurant.id);
        const control =
          controls.find((currentControl) => currentControl.restaurantId === restaurant.id) ??
          getControl(restaurant.id);

        return {
          restaurant,
          route: `/tv/${restaurant.id}`,
          status: supabaseStatus.connected ? "Realtime listo" : "Modo local",
          lastActivity: latestSession?.lastUpdatedAt ?? latestSession?.createdAt,
          autoplayStatus: latestSession?.autoplayStatus ?? "standby",
          control,
        };
      }),
    [controls, getControl, restaurants, sessions, supabaseStatus.connected],
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
            <div className="mt-4 grid gap-3 border-t border-bone/10 pt-4">
              <label className="flex items-center justify-between rounded-lg border border-bone/10 bg-obsidian/50 px-3 py-2 text-sm font-semibold text-bone/72">
                Apagar TV temporalmente
                <input
                  type="checkbox"
                  checked={row.control.disabled}
                  onChange={(event) =>
                    updateControl(row.restaurant.id, { disabled: event.target.checked })
                  }
                />
              </label>
              <select
                value={row.control.overrideType}
                onChange={(event) =>
                  updateControl(row.restaurant.id, {
                    overrideType: event.target.value as TvOverrideType,
                  })
                }
                className="h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none transition focus:border-mezcal/70"
              >
                <option value="none">Sin envio especial</option>
                <option value="banner">Banner</option>
                <option value="image">Imagen</option>
                <option value="message">Mensaje personalizado</option>
              </select>
              <textarea
                value={row.control.message}
                onChange={(event) => updateControl(row.restaurant.id, { message: event.target.value })}
                className="min-h-20 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 py-2 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal/70"
                placeholder="Mensaje personalizado"
              />
              <input
                value={row.control.imageUrl}
                onChange={(event) => updateControl(row.restaurant.id, { imageUrl: event.target.value })}
                className="h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal/70"
                placeholder="URL de banner o imagen"
              />
              <select
                value={row.control.durationSeconds}
                onChange={(event) =>
                  updateControl(row.restaurant.id, { durationSeconds: Number(event.target.value) })
                }
                className="h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none transition focus:border-mezcal/70"
              >
                <option value={5}>5 segundos</option>
                <option value={15}>15 segundos</option>
                <option value={30}>30 segundos</option>
                <option value={60}>1 minuto</option>
                <option value={300}>5 minutos</option>
              </select>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    updateControl(row.restaurant.id, {
                      imageUrl: await readImageFileAsDataUrl(file),
                      overrideType: "image",
                    });
                  }}
                  className="text-sm font-semibold text-bone/60 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-mezcal file:px-3 file:text-sm file:font-black file:text-obsidian"
                />
                <Button
                  onClick={() => {
                    sendTvControl({
                      ...row.control,
                      restaurantId: row.restaurant.id,
                      overrideType:
                        row.control.overrideType === "none"
                          ? row.control.imageUrl
                            ? "image"
                            : "message"
                          : row.control.overrideType,
                    });
                    setControls(getTvControls());
                  }}
                >
                  <Save size={16} />
                  Enviar mensaje
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    clearTvControl(row.restaurant.id);
                    setControls(getTvControls());
                  }}
                >
                  <Save size={16} />
                  Quitar mensaje
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
