import { type HTMLAttributes } from "react";
import { cx } from "@/lib/cx";

interface GlassProps extends HTMLAttributes<HTMLDivElement> {
  /** Use the more opaque fill where text contrast matters. */
  strong?: boolean;
}

/**
 * Liquid-glass surface. Restrict to nav, frames, and modals — never wrap long
 * body text in it (guidelines §5, §9).
 */
export function Glass({ strong, className, children, ...rest }: GlassProps) {
  return (
    <div
      className={cx("glass", strong && "glass-strong", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
