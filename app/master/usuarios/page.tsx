"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Pencil, Power, Plus, Trash2, X } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getRestaurants } from "@/lib/restaurants/restaurantStorage";
import type { RestaurantConfig } from "@/lib/types";
import {
  deleteManagerUser,
  getManagerUsers,
  refreshManagerUsersFromSupabase,
  toggleManagerUser,
  upsertManagerUser,
  type ManagerUser,
} from "@/lib/auth/managerUsersStorage";

const initialFormState = {
  id: "",
  username: "",
  password: "",
  name: "",
  restaurantId: "rancho-viejo",
  restaurantIds: ["rancho-viejo"],
  brandName: "",
  role: "manager" as "manager" | "play" | "supervisor",
  active: true,
};

export default function MasterUsuariosPage() {
  const [restaurants, setRestaurants] = useState<RestaurantConfig[]>([]);
  const [users, setUsers] = useState<ManagerUser[]>([]);
  const [formState, setFormState] = useState(initialFormState);
  const [error, setError] = useState("");

  function refresh() {
    const activeRestaurants = getRestaurants().filter((restaurant) => restaurant.isActive);
    setRestaurants(activeRestaurants);
    setUsers(getManagerUsers());
  }

  useEffect(() => {
    refresh();
    void refreshManagerUsersFromSupabase().then((result) => setUsers(result.users));
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUsername = formState.username.trim().toLowerCase();
    const latestUsers = getManagerUsers();
    const duplicateUser = latestUsers.find(
      (user) => user.id !== formState.id && user.username.trim().toLowerCase() === normalizedUsername,
    );

    if (!normalizedUsername || !formState.password.trim() || !formState.name.trim()) {
      setError("Nombre, usuario y password son obligatorios.");
      return;
    }

    if (duplicateUser) {
      setError("Este usuario ya existe. Usa otro nombre de usuario.");
      return;
    }

    const existingUser = users.find((user) => user.id === formState.id);
    const savedUser = upsertManagerUser({
      username: normalizedUsername,
      password: formState.password.trim(),
      name: formState.name.trim(),
      restaurantId: formState.restaurantId,
      restaurantIds:
        formState.role === "supervisor" ? formState.restaurantIds : [formState.restaurantId],
      brandName: formState.brandName.trim(),
      id: formState.id || undefined,
      role: formState.role,
      active: existingUser?.active ?? formState.active,
    });

    if (!savedUser) {
      setError("Este usuario ya existe. Usa otro nombre de usuario.");
      return;
    }

    setError("");
    setFormState({
      ...initialFormState,
      restaurantId: restaurants[0]?.id ?? "rancho-viejo",
      restaurantIds: restaurants[0]?.id ? [restaurants[0].id] : ["rancho-viejo"],
    });
    refresh();
  }

  function handleToggle(userId: string) {
    toggleManagerUser(userId);
    refresh();
  }

  function handleDelete(userId: string) {
    deleteManagerUser(userId);
    setFormState((current) => (current.id === userId ? { ...current, id: "", active: true } : current));
    refresh();
  }

  function resetForm() {
    setFormState({
      ...initialFormState,
      restaurantId: restaurants[0]?.id ?? "rancho-viejo",
      restaurantIds: restaurants[0]?.id ? [restaurants[0].id] : ["rancho-viejo"],
    });
    setError("");
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
              <p className="text-sm text-bone/50">Login operativo por restaurante</p>
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
              onChange={(event) => setFormState((current) => ({ ...current, role: event.target.value as "manager" | "play" | "supervisor" }))}
              className="h-11 w-full rounded-lg border border-bone/10 bg-bone/[0.045] px-3 text-bone outline-none focus:border-mezcal"
            >
              <option value="manager">Manager</option>
              <option value="play">Play</option>
              <option value="supervisor">Supervisor / Grupo</option>
            </select>
            {formState.role === "supervisor" ? (
              <input
                value={formState.brandName}
                onChange={(event) => setFormState((current) => ({ ...current, brandName: event.target.value }))}
                className="h-11 w-full rounded-lg border border-bone/10 bg-bone/[0.045] px-3 text-bone outline-none focus:border-mezcal"
                placeholder="Marca / grupo (ej. La Greta)"
              />
            ) : null}
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
            {formState.role === "supervisor" ? (
              <div className="grid gap-2 rounded-lg border border-bone/10 bg-obsidian/38 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-bone/42">
                  Sucursales visibles
                </p>
                {restaurants.map((restaurant) => (
                  <label key={restaurant.id} className="flex items-center gap-2 text-sm font-semibold text-bone/72">
                    <input
                      type="checkbox"
                      checked={formState.restaurantIds.includes(restaurant.id)}
                      onChange={() =>
                        setFormState((current) => ({
                          ...current,
                          restaurantIds: current.restaurantIds.includes(restaurant.id)
                            ? current.restaurantIds.filter((id) => id !== restaurant.id)
                            : [...current.restaurantIds, restaurant.id],
                        }))
                      }
                    />
                    {restaurant.name}
                  </label>
                ))}
              </div>
            ) : null}
            <Button type="submit" className="w-full">
              <Plus size={16} />
              {formState.id ? "Actualizar usuario" : "Guardar usuario"}
            </Button>
            {error ? <p className="text-sm font-semibold text-[#ff9b91]">{error}</p> : null}
            {formState.id ? (
              <Button type="button" variant="secondary" className="w-full" onClick={resetForm}>
                <X size={16} />
                Cancelar edicion
              </Button>
            ) : null}
          </form>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-bone/10 px-5 py-4">
            <h2 className="font-display text-3xl text-bone">Usuarios por restaurante</h2>
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
                    {user.role === "supervisor" ? (
                      <p className="mt-1 text-xs font-semibold text-bone/45">
                        {user.brandName || "Grupo sin nombre"} / {user.restaurantIds.length} sucursales
                      </p>
                    ) : null}
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
                          restaurantIds: user.restaurantIds,
                          brandName: user.brandName,
                          role: user.role,
                          active: user.active,
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
                    <Button variant="danger" onClick={() => handleDelete(user.id)}>
                      <Trash2 size={16} />
                      Borrar
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
