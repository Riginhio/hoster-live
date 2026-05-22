import Image from "next/image";
import { calledCards } from "@/components/game/mockData";
import { cardsCatalog } from "@/lib/cards/catalog";

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
        {calledCards.map((card, index) => {
          const catalogCard = cardsCatalog.find((item) => item.name === card);

          return (
          <div
            key={card}
            className="flex items-center gap-3 rounded-lg border border-bone/10 bg-bone/[0.04] p-3"
          >
            <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md border border-mezcal/25 bg-mezcal/10">
              {catalogCard ? (
                <Image
                  src={catalogCard.image}
                  alt={catalogCard.name}
                  width={90}
                  height={140}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-bone">{card}</p>
              <p className="text-xs text-bone/45">Cantada hace {index + 1} min</p>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
