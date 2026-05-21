import { Layout } from "@/components/layout/Layout";
import { StatCard } from "@/components/StatCard";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";

export default function MasterPage() {
  return (
    <Layout title="Panel Master">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Restaurantes" value="12" note="Red hospitality activa" />
        <StatCard label="Jugadas hoy" value="38" note="Promedio por venue" />
        <StatCard label="Cortes" value="$84k" note="Ingresos simulados" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card accent>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-mezcal">
            HOSTER LIVE
          </p>
          <h2 className="mt-2 font-display text-4xl text-bone">
            Hospitality Gaming Platform
          </h2>
          <p className="mt-3 max-w-2xl text-bone/62">
            Vista ejecutiva para administrar venues, cortes y pantallas live con una experiencia
            oscura premium.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/master/restaurantes">Ver restaurantes</ButtonLink>
            <ButtonLink href="/master/cortes" variant="secondary">Revisar cortes</ButtonLink>
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-2xl text-bone">Actividad reciente</h3>
          <div className="mt-4 space-y-3 text-sm text-bone/65">
            <p>Rancho Viejo preparo una nueva jugada.</p>
            <p>Doroteo actualizo su pantalla live.</p>
            <p>Admin genero tablas para ronda nocturna.</p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
