import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { BrandMark } from "@/components/brand/BrandMark";

export default function LoginPage() {
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
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-bone/70">Correo</span>
            <input
              className="h-12 w-full rounded-lg border border-bone/10 bg-obsidian/70 px-4 text-bone outline-none transition placeholder:text-bone/30 focus:border-mezcal"
              placeholder="gerente@hosterlive.mx"
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
        <p className="mt-8 text-center text-xs font-semibold uppercase tracking-[0.22em] text-bone/35">
          Powered by Hoster Live
        </p>
      </Card>
    </main>
  );
}
