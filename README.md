# Foundation

Esteban's starter template for all new projects.

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui (Radix + Nova preset)
- Neon Postgres (when needed)
- Vercel (deployment)

## Getting Started
1. Create a new repo from this template
2. Clone it locally
3. Run `npm install`
4. Run `npm run dev`
5. Start building

## Design System
Live design system lives in `src/app/globals.css` — edit there for style changes
`src/styles/design-tokens.ts` is a reference document only, not the live source
`api-global-solutions-design-system/` is an optional local reference folder and is gitignored; canonical brand assets used by the app are in `public/brand/`

## Design Philosophy
- Target aesthetic: premium SaaS-level polish
- Typography: strong hierarchy, dramatic size contrast
- Color: mostly neutral, accent used sparingly
- Density: data-rich but never cluttered
- Whitespace: deliberate, not filler
- Every component intentional and premium, never default

## Folder Structure
- `src/components/ui` — shadcn/ui components
- `src/components/layout` — Layout components (header, footer, sidebar)
- `src/components/shared` — Reusable components across pages
- `src/lib` — Utilities, helpers, API clients
- `src/hooks` — Custom React hooks
- `src/types` — TypeScript type definitions
- `src/styles` — Reference tokens and shared style utilities only (live theme is in src/app/globals.css)
- `public/images` — Static images

## Rules
- TypeScript only, no JavaScript
- Tailwind CSS for all styling
- shadcn/ui as a base — always customize to match Design Philosophy, never use default appearance as-is
- Clean, lightweight code — no unnecessary dependencies
