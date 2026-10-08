"use client";

import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@/client/lib/utils";

const DropdownMenu = Menu.Root;
const DropdownMenuTrigger = Menu.Trigger;
const DropdownMenuGroup = Menu.Group;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof Menu.Popup>,
  React.ComponentPropsWithoutRef<typeof Menu.Popup> & { sideOffset?: number }
>(({ className, sideOffset = 6, ...props }, ref) => (
  <Menu.Portal>
    <Menu.Positioner sideOffset={sideOffset} className="z-50 outline-none">
      <Menu.Popup
        ref={ref}
        className={cn(
          "min-w-[12rem] overflow-hidden rounded-xl border border-border bg-surface-elevated p-1.5 text-foreground shadow-2xl shadow-black/60 outline-none animate-fade-in-up",
          className
        )}
        {...props}
      />
    </Menu.Positioner>
  </Menu.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof Menu.Item>,
  React.ComponentPropsWithoutRef<typeof Menu.Item>
>(({ className, ...props }, ref) => (
  <Menu.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors",
      "data-[highlighted]:bg-surface-hover data-[highlighted]:text-foreground text-muted-foreground hover:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      "[&_svg]:size-4 [&_svg]:shrink-0",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof Menu.Separator>,
  React.ComponentPropsWithoutRef<typeof Menu.Separator>
>(({ className, ...props }, ref) => (
  <Menu.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border/80", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

/**
 * Standalone menu label — usable anywhere inside the content.
 */
const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-3 py-1.5 text-[11px] font-semibold text-muted-foreground font-mono uppercase tracking-wider", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

/** Accessible group label — MUST be used inside `DropdownMenuGroup`. */
const DropdownMenuGroupLabel = React.forwardRef<
  React.ElementRef<typeof Menu.GroupLabel>,
  React.ComponentPropsWithoutRef<typeof Menu.GroupLabel>
>(({ className, ...props }, ref) => (
  <Menu.GroupLabel
    ref={ref}
    className={cn("px-3 py-1.5 text-[11px] font-semibold text-muted-foreground font-mono uppercase tracking-wider", className)}
    {...props}
  />
));
DropdownMenuGroupLabel.displayName = "DropdownMenuGroupLabel";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroupLabel,
};
