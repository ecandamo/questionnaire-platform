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
Design tokens live in `src/styles/design-tokens.ts`
Tailwind config extends from these tokens

## Folder Structure
- `src/components/ui` — shadcn/ui components
- `src/components/layout` — Layout components (header, footer, sidebar)
- `src/components/shared` — Reusable components across pages
- `src/lib` — Utilities, helpers, API clients
- `src/hooks` — Custom React hooks
- `src/types` — TypeScript type definitions
- `src/styles` — Design tokens, global styles
- `public/images` — Static images

## Rules
- TypeScript only, no JavaScript
- Tailwind CSS for all styling
- shadcn/ui components before building custom ones
- Clean, lightweight code — no unnecessary dependencies
