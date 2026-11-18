# Trackr design system

Direction: **stone and blueprint, split stage** (dealt by tasteskill v2, seed 178254351, 2026-11-18).

## Tokens (src/app/theme.css)

Every colour is a CSS variable, so dark mode swaps whole scales instead of components carrying `dark:` variants.

| Role | Light | Dark | Utility |
| --- | --- | --- | --- |
| Ground | `#e7e6e2` stone | `#0f0f0e` true neutral | `bg-background` |
| Surface | `#f7f6f3` | `#181816` | `bg-surface` |
| Ink | `#26251e` | `#f5f5f3` | `text-slate-900` |
| Secondary text | `slate-600/500/400`, all ≥ 4.5:1 | stays bright (≥ 6.8:1), not mirrored | `text-slate-600` |
| Accent | `#2456d6` blueprint | `#7b9cff` | `bg-accent` / `text-accent` |
| Label on accent | white | near-black | `text-accent-ink` |
| Stage (landing) | the page's inverse in either theme | | `bg-stage`, `text-stage-ink` |

`violet`, `purple`, `sky` and `indigo` all resolve to the blueprint scale: one accent hue.

## Type

- **Zilla Slab** (`font-serif`) for display: page titles, section headings, the wordmark. Never italic.
- **Inter** (`font-sans`) for everything people work in.

## Rules

- Radius: one tight family. Cards 8px (`rounded-lg` … `rounded-3xl` all map to 8px), controls 6px (`rounded-md`), pills `rounded-full`.
- No glass: `backdrop-blur-*` generates nothing. No gradients, no glows.
- Shadows only on what floats (menus, dialogs: `shadow-lg` and up). `shadow-sm`/`shadow`/`shadow-md` are `none`.
- The accent fills one primary action per screen; secondary actions are outlined.
- Labels are sentence case at 13px or more. No tracked uppercase.

## Motion

- Lenis smooth scroll, Magnet on the landing's primary action, framer layout animation for the board's travelling card.
- Entrances are CSS: `.enter` (on load, stagger with `[--d:80ms]`), `.rise`/`.rise-2`/`.rise-3` (scroll view timelines), `.page-enter` (route change). Content is never hidden if script fails. All respect `prefers-reduced-motion`.
- Signature move: the footer wordmark settles from 94% to full size as it scrolls in (`.wordmark-settle`).
- Not used: DecryptedText, Vanta waves, SpotlightCard, ShinyBadge (removed 2026-11-18).
