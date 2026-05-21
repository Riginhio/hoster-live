import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const tables = Array.from({ length: 12 }, (_, index) => index + 1);

export default function TablasPage() {
  return (
    <Layout title="Admin de Tablas" eyebrow="Administrador">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-bone/62">Generador visual mock de tablas para futuras rondas.</p>
        <Button>Generar paquete</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tables.map((table) => (
          <Card key={table} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl text-bone">Tabla {table}</h2>
              <span className="text-xs font-bold text-mezcal">Mock</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 16 }, (_, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-md border border-bone/10 bg-bone/[0.055]"
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
