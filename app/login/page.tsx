"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BrandMark } from "@/components/brand/BrandMark";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("master@hosterlive.mx");
  const [password, setPassword] = useState("Hoster123");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = login(email, password);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    router.push(result.redirectTo);
  }

  return (
    <main className="screen-safe cantina-grid grid place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandMark className="mx-auto mb-5 h-16 w-16" textClassName="text-xl" />
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-mezcal">
            Acceso privado
          </p>
          <h1 className="mt-2 font-display text-4xl text-bone">HOSTER LIVE</h1>
          <p className="mt-3 text-sm text-bone/58">
            Hospitality Gaming Platform para operar venues, experiencias de juego y pantallas live.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-bone/70">Correo</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-lg border border-bone/10 bg-obsidian/70 px-4 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal"
              placeholder="gerente@hosterlive.mx"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-bone/70">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-lg border border-bone/10 bg-obsidian/70 px-4 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal"
              placeholder="********"
            />
          </label>
          {error ? (
            <p className="rounded-lg border border-chile/30 bg-chile/10 px-3 py-2 text-sm font-semibold text-[#ff9b91]">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            Entrar al panel
          </Button>
        </form>
        <div className="mt-5 rounded-lg border border-bone/10 bg-bone/[0.035] p-3 text-xs text-bone/55">
          <p className="font-semibold text-bone/70">Usuarios mock:</p>
          <p className="mt-1">master@hosterlive.mx / Hoster123</p>
          <p>gerente@hosterlive.mx / Hoster123</p>
          <p>tv@hosterlive.mx / Hoster123</p>
        </div>
        <p className="mt-8 text-center text-xs font-semibold uppercase tracking-[0.22em] text-bone/35">
          Powered by Hoster Live
        </p>
      </Card>
    </main>
  );
}
