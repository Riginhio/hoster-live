"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("master@hosterlive.mx");
  const [password, setPassword] = useState("Hoster123");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = login(email, password);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    router.push(result.redirectTo);
  }

  return (
    <main className="screen-safe relative isolate overflow-hidden bg-[#050403] text-bone">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(217,164,65,0.23),transparent_28rem),radial-gradient(circle_at_18%_80%,rgba(31,161,135,0.13),transparent_25rem),linear-gradient(135deg,#050403_0%,#11100e_42%,#030202_100%)]" />
      <div className="login-ambient-glow absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mezcal/16 blur-3xl" />
      <div className="login-light-sweep absolute inset-x-[-20%] top-[8%] h-48 rotate-[-8deg] bg-[linear-gradient(90deg,transparent,rgba(217,164,65,0.16),transparent)] blur-2xl" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(244,234,215,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(244,234,215,0.02)_1px,transparent_1px)] bg-[size:42px_42px] opacity-35" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(0deg,#050403_18%,transparent)]" />

      <section className="login-fade relative z-10 grid min-h-screen min-h-dvh place-items-center px-4 py-8">
        <div className="w-full max-w-[30rem]">
          <div className="mb-8 text-center">
            <div className="relative mx-auto mb-6 w-fit">
              <div className="absolute inset-[-1.3rem] rounded-full bg-mezcal/22 blur-2xl" />
              <BrandMark
                className="relative h-20 w-20 border-mezcal/55 bg-[linear-gradient(135deg,#f6d37a,#d9a441_44%,#8f6618)] shadow-[0_0_52px_rgba(217,164,65,0.42)]"
                textClassName="text-2xl"
              />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.42em] text-mezcal">
              Night Lounge Experience
            </p>
            <h1 className="mt-4 font-display text-6xl leading-none text-bone drop-shadow-[0_0_28px_rgba(217,164,65,0.22)] sm:text-7xl">
              HOSTER LIVE
            </h1>
            <p className="mt-4 text-lg font-semibold tracking-[0.18em] text-bone/78">
              Conecta. Juega. Disfruta.
            </p>
            <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-bone/52">
              Plataforma premium para experiencias nightlife, hospitality gaming y pantallas live.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-mezcal/18 bg-[#0d0b09]/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.58),0_0_70px_rgba(217,164,65,0.08)] backdrop-blur-xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between border-b border-bone/10 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-mezcal">
                  Acceso privado
                </p>
                <p className="mt-1 text-sm text-bone/48">Operación Hoster Live</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-mezcal shadow-[0_0_18px_rgba(217,164,65,0.9)]" />
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-bone/70">Correo</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-lg border border-bone/10 bg-black/35 px-4 text-bone outline-none transition placeholder:text-bone/28 focus:border-mezcal/70 focus:shadow-[0_0_24px_rgba(217,164,65,0.12)]"
                  placeholder="gerente@hosterlive.mx"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-bone/70">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-lg border border-bone/10 bg-black/35 px-4 text-bone outline-none transition placeholder:text-bone/28 focus:border-mezcal/70 focus:shadow-[0_0_24px_rgba(217,164,65,0.12)]"
                  placeholder="********"
                />
              </label>
              {error ? (
                <p className="rounded-lg border border-chile/30 bg-chile/10 px-3 py-2 text-sm font-semibold text-[#ff9b91]">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                className="group relative h-12 w-full overflow-hidden rounded-lg border border-mezcal/45 bg-[linear-gradient(135deg,#f2c766,#d9a441_45%,#9f711c)] px-5 text-sm font-black uppercase tracking-[0.18em] text-obsidian shadow-[0_0_34px_rgba(217,164,65,0.28)] transition hover:scale-[1.01] hover:shadow-[0_0_46px_rgba(217,164,65,0.38)] focus:outline-none focus:ring-2 focus:ring-mezcal/55"
              >
                <span className="absolute inset-y-0 left-[-35%] w-1/3 skew-x-[-18deg] bg-white/28 transition duration-700 group-hover:left-[115%]" />
                <span className="relative">Iniciar sesión</span>
              </button>
            </div>
          </form>

          <div className="mt-5 rounded-lg border border-bone/10 bg-black/25 p-3 text-xs text-bone/45 backdrop-blur">
            <p className="font-semibold text-bone/68">Usuarios mock:</p>
            <p className="mt-1">master@hosterlive.mx / Hoster123</p>
            <p>gerente@hosterlive.mx / Hoster123</p>
            <p>tv@hosterlive.mx / Hoster123</p>
          </div>

          <p className="mt-8 text-center text-xs font-semibold uppercase tracking-[0.24em] text-bone/32">
            Luxury hospitality tech
          </p>
        </div>
      </section>
    </main>
  );
}
