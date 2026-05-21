import { ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-mezcal text-obsidian shadow-glow hover:bg-[#f0b84d]",
  secondary: "bg-bone/10 text-bone ring-1 ring-bone/15 hover:bg-bone/15",
  ghost: "text-bone/80 hover:bg-bone/10 hover:text-bone",
  danger: "bg-chile text-bone hover:bg-[#d84b3d]",
};

export function buttonClassName(variant: ButtonVariant = "primary", className?: string) {
  return clsx(
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-mezcal focus:ring-offset-2 focus:ring-offset-obsidian disabled:cursor-not-allowed disabled:opacity-50",
    buttonVariants[variant],
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, className)}
      {...props}
    />
  );
}
