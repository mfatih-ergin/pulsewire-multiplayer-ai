import * as React from "react";

import { cn } from "@/client/lib/utils";
import type { Color } from "./_shared/variants";

export type BadgeVariant = "solid" | "soft" | "outline";

/** Static (non-interactive) variant×color classes for badges. */
const BADGE_CLASSES: Record<BadgeVariant, Record<Color, string>> = {
  solid: {
    neutral: "bg-signal text-signal-foreground",
    primary: "bg-steer text-steer-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  },
  soft: {
    neutral: "bg-surface-elevated text-foreground",
    primary: "bg-steer-muted text-steer",
    destructive: "bg-destructive-muted text-destructive",
  },
  outline: {
    neutral: "border border-border-strong text-foreground",
    primary: "border border-steer/40 text-steer",
    destructive: "border border-destructive/40 text-destructive",
  },
};

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  /** @default "soft" */
  variant?: BadgeVariant;
  /** @default "neutral" */
  color?: Color;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "soft", color = "neutral", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_CLASSES[variant][color],
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
