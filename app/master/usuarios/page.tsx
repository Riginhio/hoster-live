"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Pencil, Power, Plus } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getRestaurants } from "@/lib/restaurants/restaurantStorage";
import type { RestaurantConfig } from "@/lib/types";
import {
  getManagerUsers,
  toggleManagerUser,
  upsertManagerUser,
  type ManagerUser,
} from "@/lib/auth/managerUsersStorage";

export default function MasterUsuariosPage() {
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>([]);
  const [users, setUsers] = useState<ManagerUser[]>([]);
  const [formState, setFormState] = useState({
    id: "",
    username: "gerente@hosterlive.mx",
    password: "Hoster123",
    name: "Gerente",
    restaurantId: "rancho-viejo",
    role: "manager" as "manager" | "play",
  });

  function refresh() {
    setRestaurants(getRestaurants().filter((restaurant) => restaurant.isActive));
    setUsers(getManagerUsers());
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    upsertManagerUser({
      username: formState.username,
      password: formState.password,
      name: formState.name,
      restaurantId: formState.restaurantId,
      id: formState.id || undefined,
      role: formState.role,
      active: true,
    });
    setFormState((current) => ({ ...current, id: "" }));
    refresh();
  }

  function handleToggle(userId: string) {
    toggleManagerUser(userId);
    refresh();
  }

  return (
    <Layout title="Usuarios gerente" eyebrow="Master operativo">
      <div className="grid gap-4 xl:grid-cols-[24rem_1fr]">
        <Card accent>
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-mezcal/30 bg-mezcal/12 text-mezcal">
              <KeyRound size={18} />
            </div>
            <div>
              <h2 className="font-display text-2xl text-bone">Alta rapida</h2>
              <p className="text-sm text-bone/50">Login mock por restaurante</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={formState.name}
              onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              className="h-11 w-full rounded-lg border border-bone/10 bg-bone/[0.045] px-3 text-bone outline-none focus:border-mezcal"
              placeholder="Nombre"
            />
            <select
              value={formState.role}
              onChange={(event) => setFormState((current) => ({ ...current, role: event.target.value as "manager" | "play" }))}
              className="h-11 w-full rounded-lg border border-bone/10 bg-bone/[0.045] px-3 text-bone outline-none focus:border-mezcal"
            >
              <option value="manager">Manager</option>
              <option value="play">Play</option>
            </select>
            <input
              value={formState.username}
              onChange={(event) => setFormState((current) => ({ ...current, username: event.target.value }))}
              className="h-11 w-full rounded-lg border border-bone/10 bg-bone/[0.045] px-3 text-bone outline-none focus:border-mezcal"
              placeholder="username"
            />
            <input
              value={formState.password}
              onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
              className="h-11 w-full rounded-lg border border-bone/10 bg-bone/[0.045] px-3 text-bone outline-none focus:border-mezcal"
              placeholder="password"
            />
            <select
              value={formState.restaurantId}
              onChange={(event) => setFormState((current) => ({ ...current, restaurantId: event.target.value }))}
              className="h-11 w-full rounded-lg border border-bone/10 bg-bone/[0.045] px-3 text-bone outline-none focus:border-mezcal"
            >
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
            <Button type="submit" className="w-full">
              <Plus size={16} />
              {formState.id ? "Actualizar usuario" : "Guardar usuario"}
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-bone/10 px-5 py-4">
            <h2 className="font-display text-3xl text-bone">Gerentes activos</h2>
          </div>
          <div className="divide-y divide-bone/10">
            {users.map((user) => {
              const restaurant = restaurants.find((item) => item.id === user.restaurantId);

              return (
                <div key={user.id} className="flex flex-col gap-3 bg-charcoal/35 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-bone">{user.name}</p>
                    <p className="text-sm text-bone/52">{user.username}</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mezcal">
                      {restaurant?.name ?? user.restaurantId} · {user.role}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setFormState({
                          id: user.id,
                          username: user.username,
                          password: user.password,
                          name: user.name,
                          restaurantId: user.restaurantId,
                          role: user.role,
                        })
                      }
                    >
                      <Pencil size={16} />
                      Editar
                    </Button>
                    <Button variant={user.active ? "secondary" : "ghost"} onClick={() => handleToggle(user.id)}>
                      <Power size={16} />
                      {user.active ? "Activo" : "Inactivo"}
                    </Button>
                  </div>
                </div>
              );
            })}
            {users.length === 0 ? (
              <p className="px-5 py-8 text-sm text-bone/50">Aun no hay gerentes configurados.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
