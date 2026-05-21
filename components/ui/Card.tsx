import { HTMLAttributes } from "react";
import { clsx } from "clsx";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  accent?: boolean;
};

export function Card({ className, accent = false, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-bone/10 bg-charcoal/78 p-5 shadow-cantina backdrop-blur",
        accent && "border-mezcal/35 bg-mezcal/10 shadow-glow",
        className,
      )}
      {...props}
    />
  );
}
