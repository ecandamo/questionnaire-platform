<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Confirmed Next.js 16 Breaking Changes (verified in this project)

### Middleware → Proxy rename (CRITICAL)
- File: `src/proxy.ts` (NOT `src/middleware.ts`)
- Export: `export function proxy(request: NextRequest)` (NOT `middleware`)
- The `config` export with `matcher` is unchanged
- Build hard-fails if either the filename or export name is wrong

### Async params in route handlers
- Route handler params are now `Promise<{ id: string }>` — always `await params` before accessing
- Correct: `const { id } = await params`
- Wrong: `const { id } = params`
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-rules -->
# Foundation Project Rules

## Stack
- Next.js (App Router)
- TypeScript (strict — never use JavaScript)
- Tailwind CSS (all styling — no inline styles or CSS modules)
- shadcn/ui (Radix + Nova preset)
- Neon Postgres (when needed)
- Vercel (deployment)

## Code Rules
- Always use TypeScript, never JavaScript
- Use Tailwind CSS for all styling
- Use shadcn/ui components before building custom ones
- Keep components small and composable
- Use server components by default, client components only when needed
- Write clean, lightweight code — no unnecessary dependencies
- All API routes go in src/app/api/

## Radix UI Import Pattern
This project uses the unified `radix-ui` package (not individual `@radix-ui/react-*` packages).
Always import like: `import { Dialog as DialogPrimitive } from "radix-ui"`
Verify by checking any existing component before writing new shadcn components.

## Database / External Services — Always Lazy Initialize
Never call `neon()`, `createClient()`, or any external service constructor at module top-level.
Next.js evaluates module-level code at build time — a missing env var will crash the build.
Always wrap in a lazy factory + Proxy pattern (see `src/lib/db/index.ts` for the pattern).

## Folder Structure
- src/components/ui — shadcn/ui components
- src/components/layout — Layout components (header, footer, sidebar)
- src/components/shared — Reusable components across pages
- src/lib — Utilities, helpers, API clients
- src/hooks — Custom React hooks
- src/types — TypeScript type definitions
- src/styles — Design tokens, global styles

## Design System
- Use design tokens from src/styles/design-tokens.ts
- Extend Tailwind config from these tokens
- Maintain consistent spacing, colors, and typography across all components
<!-- END:project-rules -->

<!-- BEGIN:self-improvement-rules -->
# Self-Improvement
- At the start of each session, review .learnings/ files for relevant context
- After solving non-obvious issues or when I correct you, log the learning to .learnings/LEARNINGS.md
- Log errors and failed commands to .learnings/ERRORS.md
- Log feature requests or missing capabilities to .learnings/FEATURE_REQUESTS.md
- Before major tasks, review recent learnings to avoid repeating past mistakes
- Periodically consolidate learnings — merge duplicates, remove outdated entries, promote broadly applicable ones to AGENTS.md
<!-- END:self-improvement-rules -->

<!-- BEGIN:handoff-workflow -->
# Handoff Workflow
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
<!-- END:handoff-workflow -->
