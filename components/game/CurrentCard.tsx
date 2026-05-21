type CurrentCardProps = {
  name?: string;
  number?: string;
};

export function CurrentCard({ name = "El Gallo", number = "01" }: CurrentCardProps) {
  return (
    <section className="flex min-h-[410px] flex-col items-center justify-center rounded-lg border border-mezcal/35 bg-[radial-gradient(circle_at_50%_20%,rgba(217,164,65,0.18),rgba(20,17,15,0.92)_48%,rgba(8,7,6,0.98)_100%)] p-5 text-center shadow-cantina md:min-h-[580px] xl:min-h-[680px]">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-mezcal/40 bg-mezcal/15 text-lg font-black text-mezcal md:h-20 md:w-20 md:text-2xl">
        {number}
      </div>
      <div className="relative aspect-[3/4] w-full max-w-[360px] rounded-lg border-2 border-mezcal bg-bone p-3 shadow-glow md:max-w-[460px] xl:max-w-[540px]">
        <div className="flex h-full flex-col justify-between rounded-md border-2 border-obsidian/85 bg-[linear-gradient(145deg,#f7edd9,#d8b56a)] p-5 text-obsidian">
          <div className="flex items-center justify-between text-sm font-black uppercase tracking-[0.22em]">
            <span>Loteria</span>
            <span>{number}</span>
          </div>
          <div className="grid flex-1 place-items-center">
            <div className="rounded-lg border-4 border-obsidian px-8 py-6 font-display text-[5rem] leading-none md:text-[8rem] xl:text-[10rem]">
              LC
            </div>
          </div>
          <h2 className="font-display text-5xl leading-none md:text-7xl xl:text-8xl">{name}</h2>
        </div>
      </div>
      <p className="mt-5 text-sm font-semibold uppercase tracking-[0.28em] text-bone/50">
        Carta actual
      </p>
    </section>
  );
}
