import { promoItems } from "@/components/game/mockData";

export function PromoPanel() {
  return (
    <section className="rounded-lg border border-mezcal/20 bg-charcoal/80 p-4 shadow-cantina backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-mezcal">HOSTER LIVE</p>
        <h2 className="font-display text-2xl text-bone">Promociones</h2>
      </div>
      <div className="space-y-3">
        {promoItems.map((promo) => (
          <article key={promo.title} className="rounded-lg border border-bone/10 bg-bone/[0.045] p-4">
            <span className="mb-3 inline-flex rounded-full bg-chile/18 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#ff8b7f]">
              {promo.tag}
            </span>
            <h3 className="font-display text-2xl text-bone">{promo.title}</h3>
            <p className="mt-1 text-sm text-bone/58">{promo.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
