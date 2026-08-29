import { type ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 " +
  "text-[15px] font-medium transition-colors min-h-[44px] disabled:opacity-50 " +
  "disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-primary text-surface-solid hover:bg-accent-primary-hover",
  ghost:
    "bg-transparent text-ink-primary border border-strong hover:bg-surface-1",
  danger: "bg-danger text-surface-solid hover:opacity-90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className,
  ...rest
}: ButtonProps) {
  return <button className={cx(base, variants[variant], className)} {...rest} />;
}
