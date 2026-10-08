import React from "react";
import { cn } from "@/client/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-800/70 border border-zinc-700/40", className)}
      {...props}
    />
  );
}
