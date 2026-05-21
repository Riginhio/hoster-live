import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

type LayoutProps = {
  children: ReactNode;
  title: string;
  eyebrow?: string;
};

export function Layout({ children, title, eyebrow }: LayoutProps) {
  return (
    <div className="screen-safe cantina-grid flex bg-obsidian/60">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Header title={title} eyebrow={eyebrow} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:py-8">
          {children}
          <footer className="mt-8 border-t border-bone/10 pt-4 text-xs font-semibold uppercase tracking-[0.22em] text-bone/35">
            Powered by Hoster Live
          </footer>
        </main>
      </div>
    </div>
  );
}
