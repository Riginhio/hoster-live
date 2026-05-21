import Link from "next/link";
import { BarChart3, Clapperboard, LayoutDashboard, MonitorPlay, Store, Table2 } from "lucide-react";

const links = [
  { href: "/master", label: "Master", icon: LayoutDashboard },
  { href: "/master/restaurantes", label: "Restaurantes", icon: Store },
  { href: "/master/cortes", label: "Cortes", icon: BarChart3 },
  { href: "/gerente", label: "Gerente", icon: Clapperboard },
  { href: "/tv/demo-cantina", label: "Pantalla TV", icon: MonitorPlay },
  { href: "/admin/tablas", label: "Tablas", icon: Table2 },
];

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-bone/10 bg-obsidian/70 p-4 backdrop-blur lg:block">
      <Link href="/master" className="mb-8 flex items-center gap-3 rounded-lg border border-mezcal/25 bg-mezcal/10 p-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-mezcal text-lg font-black text-obsidian">
          LC
        </div>
        <div>
          <p className="font-display text-xl text-bone">Loteria Cantina</p>
          <p className="text-xs uppercase tracking-[0.22em] text-bone/45">Premium Play</p>
        </div>
      </Link>
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
    </aside>
  );
}
