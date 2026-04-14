# Foundation - Claude Code Rules

## Stack

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui (Radix, Nova preset)
- Neon Postgres (when needed)
- Vercel (deployment)

## Rules

- TypeScript only, never JavaScript
- Tailwind for all styling, no CSS modules or inline styles
- Use shadcn/ui as a base but always customize styling to match Design Philosophy — never use default shadcn appearance as-is
- Server components by default, client only when needed
- Clean, lightweight code — no unnecessary dependencies
- Live design system lives in src/app/globals.css — edit there for any style changes
- src/styles/design-tokens.ts is a reference document only, not the live source

## Next.js 16 — Known Breaking Changes

- Middleware is now `src/proxy.ts` with `export function proxy()` — NEVER use `middleware.ts`
- Route handler `params` are async: always `const { id } = await params`

## Radix UI

- Uses unified `radix-ui` package — import as `import { Dialog as DialogPrimitive } from "radix-ui"`
- Do NOT import from `@radix-ui/react-*` scoped packages

## Database Initialization

- Never initialize Neon / Drizzle at module top-level — builds crash when DATABASE_URL is absent
- Use lazy factory pattern (see src/lib/db/index.ts)
- **Drizzle CLI** (`drizzle-kit push`, `generate`, `migrate`) does not load `.env.local` by default. `drizzle.config.ts` in this repo pre-reads `DATABASE_URL` from `.env.local` / `.env` so `npm run db:push` works without exporting vars manually.

## Questionnaires & public responses

- Owner submit sets `response.status` to `submitted` (and may set `share_link` to `closed`). **`POST …/questionnaires/[id]/reopen`** must reset matching **`response`** rows to `in_progress` and clear `submittedAt`, not only `questionnaire.status` / share link — `/api/share/[token]` returns `responseStatus`, and `POST …/responses/[id]/answers` rejects when the response is still `submitted`.
- **Custom** questionnaires start with **no** `questionnaire_question` rows until **`PATCH /api/questionnaires/[id]`** saves the list. **Publish** must run that save first (or the user must click Save); otherwise the respond page loads **zero questions**.
- New builder rows must use **`crypto.randomUUID()`** for `questionnaire_question.id` — Postgres `uuid` rejects prefixed strings like `custom-<uuid>` / `temp-<uuid>`.

## File Structure

- src/components/ui — shadcn/ui
- src/components/layout — Headers, footers, sidebars
- src/components/shared — Reusable components
- src/lib — Utilities, helpers
- src/hooks — Custom hooks
- src/types — TypeScript types
- src/styles — Reference tokens and shared style utilities only (live theme is in src/app/globals.css)

## Design Philosophy

- Target aesthetic: Linear.app level of polish
- Typography: strong hierarchy, dramatic size contrast between headings and body
- Color: mostly neutral, accent used sparingly and intentionally
- Density: data-rich but never cluttered
- Whitespace: used deliberately, not as filler
- Every component should feel intentional and premium, never default
- Avoid generic AI-generated aesthetics at all costs
- Reference apps: Linear.app, Stripe Dashboard, Vercel Dashboard

## Self-Improvement

- Review .learnings/ at session start
- Log corrections and errors to .learnings/
- Consolidate periodically
- If the IDE marks a folder (e.g. `src/app`) as having problems, run **`npx eslint "src/**/*.{ts,tsx}"`** — warnings often come from **`react-hooks/exhaustive-deps`**; fix with **`useCallback`** for data loaders and stable effect dependencies (or **refs** for interval-driven saves so closures stay fresh).

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
