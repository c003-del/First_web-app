import type { Config } from "tailwindcss";

/**
 * Design tokens live in `src/app/globals.css` as CSS custom properties so they
 * are the single source of truth (and editable at runtime via the admin theme
 * controls later). Tailwind maps to those variables here — never hard-code hex
 * values in components.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        "surface-solid": "var(--surface-solid)",
        "ink-primary": "var(--ink-primary)",
        "ink-secondary": "var(--ink-secondary)",
        "ink-muted": "var(--ink-muted)",
        "ink-disabled": "var(--ink-disabled)",
        "accent-primary": "var(--accent-primary)",
        "accent-primary-hover": "var(--accent-primary-hover)",
        "accent-rose": "var(--accent-rose)",
        "accent-sage": "var(--accent-sage)",
        "accent-butter": "var(--accent-butter)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        focus: "var(--focus)",
      },
      borderColor: {
        soft: "var(--border-soft)",
        strong: "var(--border-strong)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
