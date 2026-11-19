# Trackr design system (v2)

Direction: **paper and blueprint, polished product** (2026-11-18). One white working surface lifted off a warm ground, dense small type, pills for every small control, and spring motion for anything that arrives. The reference study is `artifacts/tsenta-ui-study.md` (local); we take patterns and measurements from it, never source, assets or copy.

## Tokens (src/app/theme.css, tailwind.config.ts)

Every colour and shadow is a CSS variable, so dark mode swaps whole scales instead of components carrying `dark:` variants.

| Role | Light | Dark | Utility |
| --- | --- | --- | --- |
| Ground | `#f6f5f1` warm off-white | `#0c0c0b` | `bg-background` |
| Surface (raised) | white | `#171715` | `bg-surface` |
| Ink | `#26251e` | `#f5f5f3` | `text-slate-900` |
| Secondary text | `slate-600/500/400`, all ≥ 4.5:1 | stays bright (≥ 6.8:1), not mirrored | `text-slate-600` |
| Hairlines and muted fills | `slate-200` / `slate-100` | | `border-slate-200`, `bg-slate-100` |
| Accent | `#2456d6` blueprint | `#7b9cff` | `bg-accent` / `text-accent` |
| Label on accent | white | near-black | `text-accent-ink` |
| Stage (landing) | the page's inverse in either theme | | `bg-stage`, `text-stage-ink` |

`violet`, `purple`, `sky` and `indigo` all resolve to the blueprint scale: one accent hue. Status hues (emerald, rose, red, amber) mean one thing each.

### Radius
Controls 8px (`rounded-md`), inputs and small cards 10px (`rounded-lg`), cards 14px (`rounded-xl`), panels and dialogs 18px (`rounded-2xl`), sheets 24px (`rounded-3xl`). Chips, filters, tabs, nav items and small actions are `rounded-full`.

### Elevation
- `shadow-sm` is a **ring**: a 1px hairline plus two soft layers. A raised surface uses it *instead of* a border (`bg-surface shadow-sm rounded-xl`).
- `shadow` / `shadow-md`: cards that lift on hover, segmented-control thumbs.
- `shadow-lg`: popovers and menus. `shadow-xl`: the phone tab bar, sheets. `shadow-2xl`: dialogs and the command palette.
- In dark mode the ring is a light hairline and the drop shadows only deepen.
- Glass (`backdrop-blur`) is for things that sit over scrolling content: the sticky header, the tab bar, overlay backdrops. Nothing else.

## Type
- **Geist** (`font-sans`) for everything, headings included. Headings set tight (-0.025em), semibold.
- **Zilla Slab** (`font-wordmark`) only for the "trackr" wordmark, in the nav and the footer.
- In-app sizes run small and dense: 13–14px body, 11–12px labels, 15px for inputs on phones. Page titles 28–36px, no larger inside the app.
- Labels are sentence case. Tracked uppercase only for tiny table headers.

## Shell
- Sticky frosted header: the wordmark, pill nav with a raised white pill on the active item (a `layoutId` spring), a ⌘K search field, the theme toggle and a ghost "Sign out".
- ⌘K / Ctrl+K command palette (`components/CommandPalette.tsx`): jump to a page, search jobs, or ask Scout. Open it from anywhere with `openPalette()`.
- Phones: a floating bottom tab bar (Applications, Resume, Discover, Profile) for signed-in users; the hamburger menu holds the rest. `main` gets bottom padding when the bar is present.

## Motion (src/lib/motion-tokens.ts)
- Hover and colour changes: CSS `150ms`, default ease. Things arriving in CSS: `ease-out` (`cubic-bezier(.23,1,.32,1)`).
- Springs, framer-motion:

  | Preset | Stiffness/damping | Use |
  | --- | --- | --- |
  | `springs.modal` | 260/32 | Dialogs and the palette (from scale .96, y −8) |
  | `springs.sheet` | 320/30 | Sheets and drawers sliding in from an edge |
  | `springs.list` | 320/28 | Items entering, leaving and reflowing (`layout`) |
  | `springs.tap` | 400/18 | `whileTap={{ scale: .92 }}` on tab-bar buttons and chips |
  | `springs.glide` | 450/32 | Shared-element pills (`layoutId`): nav, tabs, palette selection |

- Drag and drop is dnd-kit: the dragged item becomes a faded ghost and its siblings slide aside.
- Entrances on marketing pages are CSS: `.enter`, `.rise`, `.page-enter`, `.wordmark-settle`. Lenis smooth scroll and GSAP stay on the landing.
- Everything respects `prefers-reduced-motion` (use `useReducedMotion` to drop transforms, keep fades).
- Not used: DecryptedText, Vanta waves, SpotlightCard, ShinyBadge.
