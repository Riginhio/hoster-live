import Link from "next/link";
import {
  BarChart3,
  Clapperboard,
  LayoutDashboard,
  MonitorPlay,
  Store,
  Table2,
  TrendingUp,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { getSupabaseConfigStatus } from "@/lib/supabase/client";

const links = [
  { href: "/master", label: "Master", icon: LayoutDashboard },
  { href: "/master/dashboard", label: "Dashboard", icon: TrendingUp },
  { href: "/master/restaurantes", label: "Restaurantes", icon: Store },
  { href: "/master/cortes", label: "Cortes", icon: BarChart3 },
  { href: "/gerente", label: "Gerente", icon: Clapperboard },
  { href: "/tv/rancho-viejo", label: "Pantalla TV", icon: MonitorPlay },
  { href: "/admin/tablas", label: "Tablas", icon: Table2 },
];

export function Sidebar() {
  const supabaseStatus = getSupabaseConfigStatus();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-bone/10 bg-obsidian/70 p-4 backdrop-blur lg:block">
      <Link href="/master" className="mb-8 flex items-center gap-3 rounded-lg border border-mezcal/25 bg-mezcal/10 p-3">
        <BrandMark className="h-11 w-11" textClassName="text-lg" />
        <div>
          <p className="font-display text-xl text-bone">HOSTER LIVE</p>
          <p className="text-xs uppercase tracking-[0.22em] text-bone/45">
            Hospitality Gaming Platform
          </p>
        </div>
      </Link>
      <div
        className={`mb-4 rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] ${
          supabaseStatus.connected
            ? "border-agave/25 bg-agave/10 text-agave"
            : "border-mezcal/25 bg-mezcal/10 text-mezcal"
        }`}
        title={supabaseStatus.message}
      >
        {supabaseStatus.connected ? "Supabase conectado" : "Modo local"}
      </div>
      <nav className="space-y-1">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-bone/70 transition hover:bg-bone/10 hover:text-bone"
          >
            <item.icon size={18} className="text-mezcal" />
            {item.label}
          </Link>
        ))}
      </nav>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-bone/30">
        Powered by Hoster Live
      </p>
    </aside>
  );
}
