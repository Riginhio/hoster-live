"use client";

import Link from "next/link";
import {
  BarChart3,
  Clapperboard,
  History,
  LayoutDashboard,
  MonitorPlay,
  QrCode,
  Radio,
  Sparkles,
  Store,
  Table2,
  TrendingUp,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { getSupabaseConfigStatus } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import type { UserRole } from "@/lib/auth/mockUsers";

type SidebarLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
  venueRoles?: Array<"manager" | "play">;
};

const links: SidebarLink[] = [
  { href: "/master", label: "Master", icon: LayoutDashboard, roles: ["master"] },
  { href: "/master/dashboard", label: "Dashboard", icon: TrendingUp, roles: ["master"] },
  { href: "/master/jugadas", label: "Jugadas", icon: History, roles: ["master"] },
  { href: "/master/lotes", label: "Lotes", icon: Table2, roles: ["master"] },
  { href: "/master/qr-campaigns", label: "QR Marketing", icon: QrCode, roles: ["master"] },
  { href: "/master/restaurantes", label: "Restaurantes", icon: Store, roles: ["master"] },
  { href: "/master/usuarios", label: "Usuarios gerente", icon: Users, roles: ["master"] },
  { href: "/master/tvs", label: "TVs", icon: MonitorPlay, roles: ["master"] },
  { href: "/master/cortes", label: "Cortes", icon: BarChart3, roles: ["master"] },
  { href: "/gerente", label: "Inicio", icon: Clapperboard, roles: ["gerente"] },
  { href: "/gerente/nueva-jugada", label: "Jugada especial", icon: Sparkles, roles: ["gerente"], venueRoles: ["manager"] },
  { href: "/gerente/jugada-activa", label: "Jugada activa", icon: Radio, roles: ["gerente"] },
  { href: "/gerente/tablas", label: "Tablas", icon: Table2, roles: ["gerente"] },
  { href: "/gerente/reportes", label: "Reportes", icon: BarChart3, roles: ["gerente"], venueRoles: ["manager"] },
  { href: "/gerente/promociones", label: "Promociones", icon: QrCode, roles: ["gerente"], venueRoles: ["manager"] },
  { href: "/gerente/usuarios", label: "Usuarios", icon: Users, roles: ["gerente"], venueRoles: ["manager"] },
  { href: "/tv/rancho-viejo", label: "Pantalla TV", icon: MonitorPlay, roles: ["tv"] },
  { href: "/admin/tablas", label: "Tablas", icon: Table2, roles: ["master"] },
];

export function Sidebar() {
  const supabaseStatus = getSupabaseConfigStatus();
  const { currentUser } = useAuth();
  const visibleLinks = links.filter((item) => {
    if (!currentUser || !item.roles.includes(currentUser.role as UserRole)) {
      return false;
    }

    return !item.venueRoles || item.venueRoles.includes(currentUser.venueRole ?? "manager");
  });

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
        {visibleLinks.map((item) => (
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
