import { Layout } from "@/components/layout/Layout";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/StatCard";

export default function GerentePage() {
  return (
    <Layout title="Panel Gerente" eyebrow="Cantina La Nacional">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Mesas activas" value="24" note="Capacidad mock actual" />
        <StatCard label="Pozo" value="$9,800" note="Premio simulado" />
        <StatCard label="Ronda" value="07" note="Lista para iniciar" />
      </div>
      <Card accent className="mt-6">
        <h2 className="font-display text-4xl text-bone">Preparar nueva jugada</h2>
        <p className="mt-3 max-w-2xl text-bone/62">
          Configura mesas, premio y promociones visibles en la pantalla TV.
        </p>
        <ButtonLink href="/gerente/nueva-jugada" className="mt-6">Crear jugada</ButtonLink>
      </Card>
    </Layout>
  );
}
