import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  return (
    <main className="screen-safe cantina-grid grid place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-lg bg-mezcal text-xl font-black text-obsidian">
            LC
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-mezcal">
            Acceso privado
          </p>
          <h1 className="mt-2 font-display text-4xl text-bone">Loteria Cantina</h1>
          <p className="mt-3 text-sm text-bone/58">
            Panel mock para operar restaurantes, jugadas y pantallas TV.
          </p>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-bone/70">Correo</span>
            <input
              className="h-12 w-full rounded-lg border border-bone/10 bg-obsidian/70 px-4 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal"
              placeholder="gerente@cantina.mx"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-bone/70">Password</span>
            <input
              type="password"
              className="h-12 w-full rounded-lg border border-bone/10 bg-obsidian/70 px-4 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal"
              placeholder="********"
            />
          </label>
          <ButtonLink href="/master" className="w-full">Entrar al panel</ButtonLink>
        </div>
      </Card>
    </main>
  );
}
