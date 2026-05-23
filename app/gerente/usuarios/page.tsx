"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Power, Trash2, X } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  deleteManagerUser,
  getManagerUsers,
  toggleManagerUser,
  upsertManagerUser,
  type ManagerUser,
} from "@/lib/auth/managerUsersStorage";

const inputClassName =
  "h-11 rounded-lg border border-bone/12 bg-bone/[0.045] px-3 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal/70";

export default function GerenteUsuariosPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<ManagerUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [editingUserId, setEditingUserId] = useState("");
  const isPlay = currentUser?.venueRole === "play";

  function refreshUsers() {
    setUsers(
      getManagerUsers().filter(
        (user) => user.restaurantId === currentUser?.restaurantId && user.role === "play",
      ),
    );
  }

  useEffect(() => {
    refreshUsers();
    // refreshUsers reads the latest localStorage snapshot for the current restaurant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.restaurantId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser?.restaurantId || isPlay || !username.trim()) {
      return;
    }

    const existingUser = users.find((user) => user.id === editingUserId);
    upsertManagerUser({
      id: editingUserId || undefined,
      username,
      password: password || "Hoster123",
      name: name || username,
      restaurantId: currentUser.restaurantId,
      role: "play",
      active: existingUser?.active ?? true,
    });
    setEditingUserId("");
    setUsername("");
    setPassword("");
    setName("");
    refreshUsers();
  }

  function handleToggle(userId: string) {
    toggleManagerUser(userId);
    refreshUsers();
  }

  function handleEdit(user: ManagerUser) {
    setEditingUserId(user.id);
    setUsername(user.username);
    setPassword(user.password);
    setName(user.name);
  }

  function handleDelete(userId: string) {
    deleteManagerUser(userId);
    if (editingUserId === userId) {
      setEditingUserId("");
      setUsername("");
      setPassword("");
      setName("");
    }
    refreshUsers();
  }

  function cancelEdit() {
    setEditingUserId("");
    setUsername("");
    setPassword("");
    setName("");
  }

  return (
    <Layout title="Usuarios Play" eyebrow="Gerente">
      {isPlay ? (
        <Card accent className="border-chile/35 bg-chile/10">
          <h2 className="font-display text-3xl text-bone">Acceso restringido</h2>
          <p className="mt-2 text-sm text-bone/60">
            Los usuarios Play no pueden administrar usuarios.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <Card>
            <h2 className="font-display text-3xl text-bone">
              {editingUserId ? "Editar usuario Play" : "Crear usuario Play"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-5 grid gap-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nombre"
                className={inputClassName}
              />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Usuario"
                className={inputClassName}
              />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password mock"
                className={inputClassName}
              />
              <Button type="submit">
                <Plus size={16} />
                {editingUserId ? "Actualizar Play" : "Crear Play"}
              </Button>
              {editingUserId ? (
                <Button type="button" variant="secondary" onClick={cancelEdit}>
                  <X size={16} />
                  Cancelar
                </Button>
              ) : null}
            </form>
          </Card>

          <Card>
            <h2 className="font-display text-3xl text-bone">Usuarios del restaurante</h2>
            <div className="mt-5 grid gap-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 rounded-lg border border-bone/10 bg-bone/[0.035] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-bone">{user.name}</p>
                    <p className="mt-1 text-sm text-bone/50">
                      {user.username} · {user.active ? "activo" : "inactivo"}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleEdit(user)}
                  >
                    <Pencil size={16} />
                    Editar
                  </Button>
                  <Button
                    variant={user.active ? "danger" : "primary"}
                    onClick={() => handleToggle(user.id)}
                  >
                    <Power size={16} />
                    {user.active ? "Desactivar" : "Activar"}
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(user.id)}>
                    <Trash2 size={16} />
                    Borrar
                  </Button>
                </div>
              ))}
              {users.length === 0 ? (
                <p className="rounded-lg border border-bone/10 bg-bone/[0.035] p-4 text-sm text-bone/55">
                  Aun no hay usuarios Play para este restaurante.
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
}
