import { Layout } from "@/components/layout/Layout";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/StatCard";

export default function GerentePage() {
  return (
    <Layout title="Panel Gerente" eyebrow="HOSTER LIVE">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Mesas activas" value="24" note="Capacidad actual" />
        <StatCard label="Pozo" value="$9,800" note="Premio simulado" />
        <StatCard label="Ronda" value="07" note="Lista para iniciar" />
      </div>
      <Card accent className="mt-6">
        <h2 className="font-display text-4xl text-bone">Preparar nueva jugada</h2>
        <p className="mt-3 max-w-2xl text-bone/62">
          Configura mesas, premio y experiencia visible en la pantalla live.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/gerente/nueva-jugada">Crear jugada</ButtonLink>
          <ButtonLink href="/gerente/jugada-activa" variant="secondary">
            Jugada activa
          </ButtonLink>
          <ButtonLink href="/gerente/tablas" variant="secondary">
            Ver tablas
          </ButtonLink>
        </div>
      </Card>
    </Layout>
  );
}
