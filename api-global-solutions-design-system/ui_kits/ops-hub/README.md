# Ops Hub — API Global Solutions UI Kit

Hi-fi recreation of a crew-accommodations operations dashboard in the API brand system.

## Screens included
- **Overview** — KPI tiles, region room-night chart, live activity panel, rooming-list table
- **IROPS** — incident hero card, response queue with suggested relocations
- **Billing** — reconciliation totals and invoice batches

## Files
- `index.html` — interactive shell; click nav items to switch screens
- `Core.jsx` — Sidebar, Topbar, KPI tile, StatusBadge, Lucide-style Ico
- `Overview.jsx` — Overview screen composition
- `Screens.jsx` — IROPS + Billing screens

## Notes
Built from the **API brand guidelines** (navy `#273B6E`, green `#78BC43`) combined with the structural pattern of Esteban's `foundation-webapp` (Tailwind + shadcn-style utility composition). The foundation repo is a generic SaaS scaffold — its palette was replaced with API's actual brand colors, and the "+" motif from the API logo is used as decorative rhythm on hero surfaces.

This is **not** production code — components are cosmetic-only recreations meant for mocks and prototypes.
