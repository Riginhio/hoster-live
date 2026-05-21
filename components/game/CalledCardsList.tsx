import { calledCards } from "@/components/game/mockData";

export function CalledCardsList() {
  return (
    <section className="rounded-lg border border-bone/10 bg-obsidian/70 p-4 shadow-cantina backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl text-bone">Historial</h2>
        <span className="rounded-full bg-agave/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-agave">
          {calledCards.length}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {calledCards.map((card, index) => (
          <div
            key={card}
            className="flex items-center gap-3 rounded-lg border border-bone/10 bg-bone/[0.04] p-3"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-mezcal/15 text-sm font-black text-mezcal">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-bone">{card}</p>
              <p className="text-xs text-bone/45">Cantada hace {index + 1} min</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
