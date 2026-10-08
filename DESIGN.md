# Design Style Guide

## Aesthetic Direction

**Command-center technical, built for watching something alive.** This is Pulsewire — a
multiplayer AI workspace where teams watch and steer long-running agent tasks together. The
UI should feel like a dark cockpit/mission-control surface: calm charcoal-black panels most of
the time, punctuated by a single vivid signal color that means "the agent is live right now."
It should never feel like a generic SaaS dashboard (no gray/white cards, no blue gradients) —
it should feel technical, fast, and quietly alive, the way a terminal or flight-deck display
does. Human actions (comments, redirects, takeovers) get their own cool accent color so at a
glance you can tell "agent output" from "a person did this."

## Color Palette

Dark-only theme, defined as `@theme` tokens in `src/client/index.css`:

- `--color-background` `#0a0c12` — app background, near-black with a blue cast
- `--color-surface` `#11141c` — base panel/card background
- `--color-surface-elevated` `#171b26` — raised panels (modals, input bars, nested cards)
- `--color-surface-hover` `#1d222f` — hover state for rows/list items
- `--color-border` `#262c3b` / `--color-border-strong` `#343c4f` — hairline dividers
- `--color-foreground` `#e9ecf4` — primary text
- `--color-muted-foreground` `#8e96ab` — secondary text
- `--color-faint-foreground` `#5c6478` — tertiary/disabled text
- `--color-signal` `#c4f042` (+ `-foreground` `#0a0c12`, `-muted` `#2b3312`) — **agent-live**
  color: status dots, running badges, plan/output step accents, primary CTA
- `--color-steer` `#45d6e8` (+ `-foreground`, `-muted`) — **human action** color: redirects,
  comments, presence avatars, takeover controls
- `--color-destructive` `#ff6161` (+ `-foreground`, `-muted`) — errors, failed runs, delete
- `--color-warning` `#ffb648` (+ `-foreground`, `-muted`) — needs-input / paused states

Usage rule: lime (`signal`) = the agent speaking or running; cyan (`steer`) = a human acting.
Never mix the two for the same kind of event.

## Typography

- **Display/headings**: Space Grotesk (`--font-display`) — geometric, technical, slightly
  futuristic. Used for page titles, session titles, section headers.
- **Body**: IBM Plex Sans (`--font-sans`) — clean, engineering-tool neutrality. Default body
  font (set on `body`).
- **Monospace**: JetBrains Mono (`--font-mono`) — used for agent step content, code snippets,
  task prompts, timestamps, status badges. Reinforces the "engineering tool" feel.

All three are imported from Google Fonts at the top of `index.css`.

## Spacing & Radius

- Radius scale is small-to-medium, never fully pill-shaped except small status dots/badges:
  `--radius-sm` 0.4rem (badges, chips), `--radius-md` 0.65rem (buttons, inputs),
  `--radius-lg` 0.9rem (cards), `--radius-xl` 1.2rem (large panels/modals).
- Panels use generous internal padding (`p-5`/`p-6`) with `gap-3`/`gap-4` between stacked
  elements. Hairline 1px borders (`--color-border`) separate panels instead of heavy shadows —
  shadows are reserved for floating/portalled elements (dialogs, dropdowns).

## Motion & Animation

- `animate-fade-in` — simple opacity-in for page-level content.
- `animate-fade-in-up` — entrance for cards/sections (title blocks, form panels).
- `animate-slide-in-right` — new agent step appearing at the bottom of a live feed.
- `animate-pulse-glow` — soft lime glow pulse on the "agent is live" status dot / running badge.
- `animate-blink-cursor` — blinking block cursor next to "thinking..." text, terminal-style.
- `animate-shimmer` — shimmer sweep for skeleton/loading placeholders.

Use these utilities consistently: anything agent-generated that streams in live should use
`animate-slide-in-right`; status indicators that mean "currently running" should use
`animate-pulse-glow`.
