import { clsx } from "clsx";

type BrandMarkProps = {
  className?: string;
  textClassName?: string;
};

export function BrandMark({ className, textClassName }: BrandMarkProps) {
  return (
    <div
      className={clsx(
        "grid place-items-center rounded-lg border border-mezcal/35 bg-[linear-gradient(135deg,rgba(217,164,65,0.98),rgba(31,161,135,0.88))] shadow-glow",
        className,
      )}
    >
      <span
        className={clsx(
          "font-black tracking-[0.08em] text-obsidian",
          textClassName,
        )}
      >
        HL
      </span>
    </div>
  );
}
