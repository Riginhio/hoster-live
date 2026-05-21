import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const restaurants = ["La Nacional", "Salon Tequila", "Cantina Reforma", "El Mezcalito"];

export default function RestaurantesPage() {
  return (
    <Layout title="Restaurantes" eyebrow="Master">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl text-bone/62">Directorio mock de restaurantes conectados al sistema.</p>
        <Button>Nuevo restaurante</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {restaurants.map((name, index) => (
          <Card key={name}>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-mezcal">
              Restaurante {index + 1}
            </p>
            <h2 className="mt-3 font-display text-3xl text-bone">{name}</h2>
            <p className="mt-3 text-sm text-bone/55">Pantalla TV activa, promociones cargadas.</p>
            <div className="mt-5 h-2 rounded-full bg-bone/10">
              <div className="h-2 rounded-full bg-agave" style={{ width: `${65 + index * 8}%` }} />
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
