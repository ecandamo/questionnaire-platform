# Foundation — Antigravity Rules

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

## Self-Improvement
- At the start of each session, review .learnings/ files for relevant context
- After solving non-obvious issues or when I correct you, log the learning to .learnings/LEARNINGS.md
- Log errors and failed commands to .learnings/ERRORS.md
- Log feature requests or missing capabilities to .learnings/FEATURE_REQUESTS.md
- Before major tasks, review recent learnings to avoid repeating past mistakes
- Periodically consolidate learnings — merge duplicates, remove outdated entries, promote broadly applicable ones to AGENTS.md

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

## Antigravity-Specific Behavior
- Always generate a Plan Artifact before writing code on any multi-file task
- Use Manager View for tasks touching more than 2 files simultaneously
- After completing a task, suggest the next logical step
- When adding a component, check src/components/ui first
- If a change affects types, update src/types/ in the same task
- Use the browser tool to verify UI changes visually before marking complete
