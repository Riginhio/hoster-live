"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/auth/AuthProvider";
import type { UserRole } from "@/lib/auth/mockUsers";

type AuthGuardProps = {
  children: React.ReactNode;
  allowedRoles: UserRole[];
};

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { currentUser, isReady, hasRole, logout } = useAuth();

  if (!isReady) {
    return (
      <main className="screen-safe cantina-grid grid place-items-center bg-obsidian px-4">
        <BrandMark className="h-16 w-16" textClassName="text-xl" />
      </main>
    );
  }

  if (!currentUser || !hasRole(allowedRoles)) {
    return (
      <main className="screen-safe cantina-grid grid place-items-center bg-obsidian px-4 py-10">
        <Card className="w-full max-w-lg text-center">
          <BrandMark className="mx-auto mb-5 h-16 w-16" textClassName="text-xl" />
          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-lg border border-mezcal/25 bg-mezcal/10 text-mezcal">
            <LockKeyhole size={22} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-mezcal">
            Acceso restringido
          </p>
          <h1 className="mt-3 font-display text-4xl text-bone">Permiso insuficiente</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-bone/58">
            Esta seccion requiere un rol autorizado de HOSTER LIVE. Inicia sesion con una cuenta
            compatible para continuar.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {currentUser ? (
              <Button onClick={logout} variant="secondary">
                Cerrar sesion
              </Button>
            ) : null}
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-mezcal px-4 text-sm font-semibold text-obsidian shadow-glow transition hover:bg-[#f0b84d]"
            >
              Ir a login
            </Link>
          </div>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-bone/35">
            Powered by Hoster Live
          </p>
        </Card>
      </main>
    );
  }

  return children;
}
