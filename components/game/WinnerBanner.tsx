type WinnerBannerProps = {
  winner?: string;
};

export function WinnerBanner({ winner = "Mesa 12 - Los Compadres" }: WinnerBannerProps) {
  return (
    <div className="rounded-lg border border-mezcal/35 bg-[linear-gradient(90deg,rgba(192,57,43,0.35),rgba(217,164,65,0.22),rgba(31,161,135,0.28))] px-5 py-4 shadow-glow">
      <div className="flex flex-col gap-2 text-center md:flex-row md:items-center md:justify-between md:text-left">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-mezcal">
          Ultimo ganador
        </p>
        <p className="font-display text-3xl text-bone md:text-4xl">{winner}</p>
        <p className="text-sm font-semibold text-bone/70">Premio live confirmado</p>
      </div>
    </div>
  );
}
