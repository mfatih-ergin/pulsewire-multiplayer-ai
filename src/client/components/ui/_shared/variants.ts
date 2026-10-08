export type Variant = "solid" | "outline" | "ghost" | "link" | "soft";
export type Color = "neutral" | "primary" | "destructive";

export const DEFAULT_VARIANT: Variant = "solid";
export const DEFAULT_COLOR: Color = "neutral";

/**
 * Base classes shared by Button and IconButton.
 * Ring width/offset live here; ring *color* lives per variant×color cell below
 * so tailwind-merge resolves to a single ring color.
 */
export const CONTROL_BASE =
  "inline-flex items-center justify-center whitespace-nowrap font-medium cursor-pointer " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed " +
  "[&_svg]:pointer-events-none [&_svg]:shrink-0";

/**
 * variant (style treatment) × color (intent) → Tailwind classes.
 * `solid` + `neutral` is the signal-lime button (agent/primary CTA).
 * `primary` doubles as the "steer" (human action) cyan accent.
 */
export const VARIANT_COLOR: Record<Variant, Record<Color, string>> = {
  solid: {
    neutral:
      "bg-signal text-signal-foreground shadow hover:brightness-110 active:brightness-95 focus-visible:ring-signal",
    primary:
      "bg-steer text-steer-foreground shadow hover:brightness-110 active:brightness-95 focus-visible:ring-steer",
    destructive:
      "bg-destructive text-destructive-foreground shadow-sm hover:brightness-110 active:brightness-95 focus-visible:ring-destructive",
  },
  outline: {
    neutral:
      "border border-border-strong bg-transparent text-foreground shadow-sm hover:bg-surface-hover active:bg-surface focus-visible:ring-border-strong",
    primary:
      "border border-steer/40 bg-transparent text-steer shadow-sm hover:bg-steer-muted active:bg-steer-muted focus-visible:ring-steer",
    destructive:
      "border border-destructive/40 bg-transparent text-destructive shadow-sm hover:bg-destructive-muted active:bg-destructive-muted focus-visible:ring-destructive",
  },
  ghost: {
    neutral:
      "text-foreground hover:bg-surface-hover active:bg-surface focus-visible:ring-border-strong",
    primary:
      "text-steer hover:bg-steer-muted active:bg-steer-muted focus-visible:ring-steer",
    destructive:
      "text-destructive hover:bg-destructive-muted active:bg-destructive-muted focus-visible:ring-destructive",
  },
  link: {
    neutral:
      "text-foreground underline-offset-4 hover:underline focus-visible:ring-border-strong",
    primary:
      "text-steer underline-offset-4 hover:underline focus-visible:ring-steer",
    destructive:
      "text-destructive underline-offset-4 hover:underline focus-visible:ring-destructive",
  },
  soft: {
    neutral:
      "bg-surface-elevated text-foreground shadow-sm hover:bg-surface-hover active:bg-surface focus-visible:ring-border-strong",
    primary:
      "bg-steer-muted text-steer shadow-sm hover:brightness-110 active:brightness-95 focus-visible:ring-steer",
    destructive:
      "bg-destructive-muted text-destructive shadow-sm hover:brightness-110 active:brightness-95 focus-visible:ring-destructive",
  },
};

export function variantColorClasses(variant: Variant, color: Color): string {
  return VARIANT_COLOR[variant][color];
}
