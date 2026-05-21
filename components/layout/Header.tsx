import Link from "next/link";
import { Bell, Crown, Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/brand/BrandMark";

type HeaderProps = {
  title: string;
  eyebrow?: string;
};

export function Header({ title, eyebrow = "HOSTER LIVE" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-bone/10 bg-obsidian/82 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BrandMark className="h-7 w-7 lg:hidden" textClassName="text-xs" />
            <p className="truncate text-xs font-semibold uppercase tracking-[0.24em] text-mezcal">
              {eyebrow}
            </p>
          </div>
          <h1 className="truncate font-display text-2xl text-bone md:text-3xl">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="h-10 w-10 px-0 md:hidden" aria-label="Menu">
            <Menu size={18} />
          </Button>
          <Button variant="ghost" className="hidden h-10 w-10 px-0 md:inline-flex" aria-label="Alertas">
            <Bell size={18} />
          </Button>
          <div className="hidden items-center gap-2 rounded-lg border border-mezcal/25 bg-mezcal/10 px-3 py-2 text-sm font-semibold text-mezcal md:flex">
            <Crown size={16} />
            Hospitality Gaming Platform
          </div>
          <Link href="/login" className="hidden text-sm text-bone/60 transition hover:text-bone lg:block">
            Salir
          </Link>
        </div>
      </div>
    </header>
  );
}
