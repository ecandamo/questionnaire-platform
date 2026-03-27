# Foundation - Claude Code Rules

## Stack
- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui (Radix, Nova preset)
- Neon Postgres (when needed)
- Vercel (deployment)

## Rules
- TypeScript only, never JavaScript
- Tailwind for all styling, no CSS modules or inline styles
- shadcn/ui components before custom ones
- Server components by default, client only when needed
- Clean, lightweight code — no unnecessary dependencies
- Design tokens in src/styles/design-tokens.ts

## Next.js 16 — Known Breaking Changes
- Middleware is now `src/proxy.ts` with `export function proxy()` — NEVER use `middleware.ts`
- Route handler `params` are async: always `const { id } = await params`

## Radix UI
- Uses unified `radix-ui` package — import as `import { Dialog as DialogPrimitive } from "radix-ui"`
- Do NOT import from `@radix-ui/react-*` scoped packages

## Database Initialization
- Never initialize Neon / Drizzle at module top-level — builds crash when DATABASE_URL is absent
- Use lazy factory pattern (see src/lib/db/index.ts)

## File Structure
- src/components/ui — shadcn/ui
- src/components/layout — Headers, footers, sidebars
- src/components/shared — Reusable components
- src/lib — Utilities, helpers
- src/hooks — Custom hooks
- src/types — TypeScript types
- src/styles — Design tokens

## Self-Improvement
- Review .learnings/ at session start
- Log corrections and errors to .learnings/
- Consolidate periodically

## Handoff Workflow
- Always read `HANDOFF.md` before starting meaningful work in this repository
- Use `HANDOFF.md` to understand:
  - project summary
  - current status
  - last session changes
  - files touched
  - open issues
  - next best step
  - guardrails and known decisions
- Before ending a meaningful work session, update `HANDOFF.md`
- Keep `HANDOFF.md` short, current, and practical
- Update these sections when relevant:
  - Current Status
  - Last Session Changes
  - Files Touched
  - Open Issues
  - Next Best Step
  - Known Decisions
- Do not turn `HANDOFF.md` into a long diary or changelog
- Do not duplicate the README
- Prefer concise bullet points over long paragraphs
- When in doubt:
  - preserve working logic
  - avoid unnecessary rewrites
  - follow the Next Best Step unless a blocker requires otherwise
