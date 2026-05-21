import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/StatCard";

export default function CortesPage() {
  return (
    <Layout title="Cortes" eyebrow="Master">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Hoy" value="$18,450" note="Corte mock acumulado" />
        <StatCard label="Semana" value="$126,300" note="Ventas simuladas" />
        <StatCard label="Tickets" value="294" note="Participaciones registradas" />
      </div>
      <Card className="mt-6">
        <h2 className="font-display text-3xl text-bone">Resumen por restaurante</h2>
        <div className="mt-5 overflow-hidden rounded-lg border border-bone/10">
          {["La Nacional", "Salon Tequila", "Cantina Reforma"].map((name) => (
            <div key={name} className="grid gap-3 border-b border-bone/10 p-4 text-sm last:border-b-0 md:grid-cols-4">
              <span className="font-semibold text-bone">{name}</span>
              <span className="text-bone/60">12 jugadas</span>
              <span className="text-bone/60">$6,150</span>
              <span className="text-agave">Corte listo</span>
            </div>
          ))}
        </div>
      </Card>
    </Layout>
  );
}
