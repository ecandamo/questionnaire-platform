# API Global Solutions — Design System

Live, filesystem-based design system for **API Global Solutions** — the global leader in crew accommodation and travel logistics technology. API serves airlines, cargo carriers, rail operators, and cruise lines across hotel sourcing, crew lodging, ground transportation, irregular-operations (IROPS) response, and billing at scale.

API is a **tech-first company supported by top-notch services** (sourcing, planning, operations, billing). The visual system should feel like modern operations software — confident, data-dense, calm, and unmistakably navy-and-green.

## Sources used

| Source | Access | What I pulled |
|---|---|---|
| `uploads/api-brand-guidelines.pdf` | ✅ read | Brand colors (Navy `#273B6E`, Green `#78BC43`, Gray `#7F7F7F`, Light Gray `#D4D9E1`), brand fonts (**Sailec** marketing, **Century Gothic** docs), logo rules, "Clear Zone" rule built around the "+" in the logo |
| `uploads/api-logo-blue.svg` + `api-logo-white.svg` | ✅ read | Wordmark. The class-less blue version was rewritten with explicit fills; also produced navy/green/white variants |
| `github.com/ecandamo/foundation-webapp` | ✅ read | Next.js + Tailwind + shadcn/ui starter. **This is a generic scaffold — not the real API product.** I lifted its *structure* (OKLCH token file pattern, shadcn button composition, design-tokens.ts reference format) but replaced its navy/teal/amber palette with API's actual brand colors. Imported source lives in `_source/` for reference |

> **Caveat:** No real API product codebase or Figma was provided, and the PDF brand guidelines don't cover UI-level patterns. The UI kit is therefore a **plausible-fit recreation** of what an API operations dashboard would look like, built from the brand DNA — not a 1:1 copy of a shipping product.

---

## Repository index

```
.
├── README.md                    ← you are here
├── SKILL.md                     ← portable skill card
├── colors_and_type.css          ← all tokens (colors, type, spacing, radii, shadows, motion)
├── assets/                      ← logos + motifs
│   ├── api-logo-navy.svg
│   ├── api-logo-green.svg
│   ├── api-logo-white.svg
│   └── api-plus-mark.svg
├── preview/                     ← Design System tab cards (one concept per file)
├── ui_kits/
│   └── ops-hub/                 ← Operations dashboard UI kit (Overview, IROPS, Billing)
│       ├── index.html
│       ├── Core.jsx
│       ├── Overview.jsx
│       └── Screens.jsx
└── _source/                     ← imported foundation-webapp files, for reference only
```

---

## Content fundamentals

**Voice.** Operational, confident, practical. API talks to dispatchers, crew schedulers, ops directors, and finance controllers — not consumers. Copy should sound like it belongs on an operations console.

**Point of view.**
- Prefer the second person ("Confirm the rooming list") over first ("We'll confirm…")
- Use imperative verbs in actions and labels ("Release block", "Accept & notify", "Reconcile")
- Avoid marketing fluff and emoji

**Casing.**
- Sentence case for UI labels, buttons, table headers — e.g. "Crew lodging", not "Crew Lodging"
- ALL CAPS for tiny eyebrow labels only, always with wide tracking (≥ 0.12em)
- Title Case allowed in marketing display headlines only

**Numbers & units.** Always tabular-numerics, always explicit units. Examples: "3,241 rooms", "$138 /room-night", "+5h delay", "22 pax". Never "lots of" or "many".

**Tone examples.**
- ✅ "IROPS triggered — JL 006. 22 crew impacted. Suggested relocation: Pullman HND (14 rooms available)."
- ✅ "Rate addendum drafted. Sofitel CDG contract expires in 4 days."
- ❌ "Uh oh! Something happened with your flight 😬"

**Emoji, unicode icons?** No emoji. No unicode icon hacks. Icons are Lucide SVGs only.

---

## Visual foundations

**Colors.** Navy is the brand's serious, executive voice; green is operational, active, "go". Most surfaces are white or very pale ink; navy shows up on primary buttons, sidebars, nav chrome, and data hero surfaces. Green is used sparingly — active nav markers, primary CTA inside navy surfaces, live-activity pulses, positive deltas.

**Type.** Mulish (Sailec substitute) is the default; Questrial (Century Gothic substitute) is reserved for documents/PPT; JetBrains Mono for PNRs, IDs, money, and chart ticks. Strong size contrast — KPI numerals at 30–48px, body at 13–15px.

**Backgrounds.** Flat. `#FFFFFF` on cards, `#F7F8FB` on page chrome, `#0B1428` on sidebars and data heroes. Hero surfaces can use a dot-grid at 22px spacing or a giant light-opacity "+" as decoration. No photographic backgrounds in UI. No gradients except the single navy→deeper-navy used on IROPS hero surfaces.

**Animation.** Subtle. Hovers lift by 1px with a 180ms ease-out. Pulse dot on live status (2s loop). No bounces, no parallax, no page-transition animations.

**Hover.** Buttons darken by ~8–10% and lift 1px. Table rows tint to `#FAFBFD`. Secondary buttons switch border from `#D4D9E1` → `#273B6E`.

**Press.** 120ms, no color change, `translateY(1px)`.

**Borders.** `#EEF0F5` for interior dividers, `#E4E7EE` for control borders, `#D4D9E1` (brand light gray) for structural separators.

**Shadows.** All navy-tinted (`rgb(39 59 110 / α)`). Five-step elevation: `xs` (flat), `sm` (rest), `md` (hover), `lg` (menu), `xl` (modal).

**Transparency & blur.** Used rarely; only on modal scrims (navy at 40% alpha, no blur). Glassmorphism is not part of this brand.

**Image tone.** When photography is used, prefer cool neutral tones, mild contrast, no heavy grading.

**Radii.** `xs 3px` (tags), `sm 6px` (small chips), `md 10px` (inputs, nav items), `lg 14px` (cards, primary buttons), `xl 20px+` (hero surfaces), `pill` (badges and pill buttons).

**Cards.** 1px border `#EEF0F5` + 12–14px radius + tiny navy-tinted shadow on rest, bigger shadow on hover. Never shadow-only — always border + shadow together.

**Layout rules.** Fixed sidebar (232px), fixed topbar (64px). Content centers at 1280px max. 28px gutters between major cards, 16px between KPI tiles.

---

## Iconography

- **System:** [Lucide](https://lucide.dev) (packaged as `lucide-react ^0.577` in the foundation repo).
- **Style:** 2px stroke, round line-caps and joins, no fills, square 24×24 viewBox, rendered at 16–20px in UI.
- **Color:** `currentColor` — icons take color from their parent.
- **No emoji, no unicode icons, no PNG icons.** Ever.
- **The one exception** is the "+" plus sign — it is a brand element, not a generic icon. Use it large (80px+) on hero surfaces, never as a tiny glyph. See `assets/api-plus-mark.svg`.

The full Lucide set is available via CDN (`https://cdn.jsdelivr.net/npm/lucide-static@latest`). A hand-selected working subset is inlined in `ui_kits/ops-hub/Core.jsx` (<Ico name="…" />).

---

## Approved typography

The brand fonts **Sailec** and **Century Gothic** are commercial licenses. After review, the following Google Fonts alternates are **approved as the official typefaces** for this design system — they are the live fonts in `colors_and_type.css` and should be used as-is, not as temporary stand-ins.

| Role | Family | Source |
|---|---|---|
| Display / UI (replaces Sailec) | **Mulish** | Google Fonts |
| Documents / PPT (replaces Century Gothic) | **Questrial** | Google Fonts |
| Data / code / PNRs / money | **JetBrains Mono** | Google Fonts |

All three are free, open-licensed (OFL), and available via the same `@import` already wired into `colors_and_type.css` — no further action needed.

---

## Open questions / next steps

- Is there a real product codebase or Figma I should mirror instead of the generic `foundation-webapp`? Import via the toolbar and I'll rebuild the UI kit against it.
- How many products should be covered? (Only Ops Hub is built today — add marketing site, crew mobile app, supplier portal?)
- Is the "+" motif allowed as a decorative background element at scale, or strictly reserved for the logo and its clear-zone rule?
