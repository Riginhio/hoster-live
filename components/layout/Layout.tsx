"use client";

import { ReactNode, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

type LayoutProps = {
  children: ReactNode;
  title: string;
  eyebrow?: string;
};

export function Layout({ children, title, eyebrow }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="screen-safe cantina-grid flex bg-obsidian/60">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="min-w-0 flex-1">
        <Header title={title} eyebrow={eyebrow} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 md:px-6 lg:py-8">
          {children}
          <footer className="mt-8 border-t border-bone/10 pt-4 text-xs font-semibold uppercase tracking-[0.22em] text-bone/35">
            Powered by Hoster Live
          </footer>
        </main>
      </div>
    </div>
  );
}
