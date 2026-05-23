"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/auth/AuthProvider";

export default function JugadaEspecialAliasPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.venueRole !== "play") {
      router.replace("/gerente/nueva-jugada");
    }
  }, [currentUser?.venueRole, router]);

  return (
    <Layout title="Jugada especial" eyebrow="Gerente">
      <Card accent className="border-chile/35 bg-chile/10">
        <h2 className="font-display text-3xl text-bone">Acceso restringido</h2>
        <p className="mt-2 text-sm text-bone/60">
          Tu usuario Play solo puede lanzar jugadas normales desde Inicio.
        </p>
      </Card>
    </Layout>
  );
}
