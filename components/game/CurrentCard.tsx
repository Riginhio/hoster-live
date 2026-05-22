import Image from "next/image";

type CurrentCardProps = {
  name?: string;
  number?: string;
  image?: string;
};

export function CurrentCard({
  name = "El Gallo",
  number = "01",
  image = "/cards/01-gallo.png",
}: CurrentCardProps) {
  return (
    <section className="flex min-h-[410px] flex-col items-center justify-center rounded-lg border border-mezcal/35 bg-[radial-gradient(circle_at_50%_20%,rgba(217,164,65,0.18),rgba(20,17,15,0.92)_48%,rgba(8,7,6,0.98)_100%)] p-5 text-center shadow-cantina md:min-h-[580px] xl:min-h-[680px]">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-mezcal/40 bg-mezcal/15 text-lg font-black text-mezcal md:h-20 md:w-20 md:text-2xl">
        {number}
      </div>
      <div className="relative aspect-[0.63] w-full max-w-[360px] overflow-hidden rounded-lg border-2 border-mezcal bg-bone shadow-glow md:max-w-[460px] xl:max-w-[540px]">
        <Image
          src={image}
          alt={name}
          width={720}
          height={1141}
          className="h-full w-full object-contain"
          priority
        />
      </div>
      <p className="mt-5 text-sm font-semibold uppercase tracking-[0.28em] text-bone/50">
        Carta actual
      </p>
    </section>
  );
}
