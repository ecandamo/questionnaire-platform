# HANDOFF

## Project Summary
Internal sales questionnaire platform. Allows authenticated internal users (and admins) to create, manage, share, and review questionnaires for prospects/clients. External respondents access via a secure tokenized link — no login required.

## Current Status
- State: **working** — full application built and compiles cleanly
- Working now:
  - Authentication (Better Auth, email/password, admin plugin)
  - Dashboard with Recharts charts (status counts, type breakdown, recent activity)
  - Questionnaire list with search/filters
  - Questionnaire builder with drag-and-drop reordering, hide/show, required toggle
  - Preset template types (Data Request, Hobson ROI, Workshop) load questions from templates
  - Custom type uses question bank picker
  - Publish → generates cryptographically secure share link
  - External respondent form (autosave, progress bar, all question types, submit)
  - Post-submission confirmation page
  - Response viewer + CSV export
  - Reopen submitted questionnaires
  - Admin: question bank with categories, templates, users (create/ban/role), audit log
  - Client management
- Not finished:
  - Import/export for questions (JSON) UI still scaffolded, not wired

## Last Session Changes
- **MD3-style button (2026-03-28):** Added `src/components/ui/material-design-3-button.tsx` (ripple + press morph via Web Animations API, client component). `src/components/ui/button.tsx` is a compatibility shim mapping legacy variants (`default`→`filled`, `outline`→`outlined`, `secondary`→`tonal`, `ghost`/`link`→`text`) so no page imports changed. Extra CVA sizes `xs`, `icon-xs`, `icon-sm`, `icon-lg` preserved for existing layouts. Ignore third-party prompt CSS themes — brand stays in `globals.css`.

Earlier (2026-03-28): **Header** — removed duplicate route title; **page titles** normalized; **sidebar** border/brand tweaks; **API Navy** sidebar tokens.

Full design redesign (2026-03-28) — styling only, zero logic changes:
- **Login**: Split-panel layout (navy brand panel left, clean form right)
- **Sidebar**: Left accent bar on active nav items, smaller logo left-aligned, refined section label (`text-[10px] uppercase tracking-widest`)
- **Header**: Top bar holds Admin pill + user menu only (no duplicate page title; wayfinding via sidebar + main `h1`)
- **Status badges**: All badges now include a colored dot indicator before the label
- **Dashboard**: KPI cards with left-border color accent + `text-4xl` numbers; chart/section headers use `text-[10px] uppercase tracking-[0.08em]`; recent list rows cleaner
- **Questionnaires list**: Table headers `text-[10px] uppercase tracking-[0.08em] bg-muted/30`; action menu fades in on row hover; stronger title weight
- **Questionnaire detail**: Page title `text-3xl`; refined metadata separators; question cards use left-border accent for required questions, inline type tags replace Badge components
- **Respondent form**: Sticky header uses `backdrop-blur-sm`; section headers use left border accent; progress bar taller; submit area has border-top
- **Confirmation page**: Larger success circle with ring + shadow; `text-3xl` heading; editorial numbered next-steps list

## Files Touched
- `src/components/ui/material-design-3-button.tsx` — MD3 interaction + CVA variants
- `src/components/ui/button.tsx` — shim re-exports `Button` / `buttonVariants` with legacy variant names
- `src/components/layout/header.tsx` — minimal top bar (no pathname title)
- `src/app/(dashboard)/clients/page.tsx`
- `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx`
- `src/app/(dashboard)/questionnaires/[id]/responses/page.tsx`
- `src/app/(dashboard)/questionnaires/new/new-client.tsx`
- `src/app/(dashboard)/admin/templates/page.tsx`
- `src/app/(dashboard)/admin/audit-log/page.tsx`
- `src/app/(dashboard)/admin/question-bank/page.tsx`
- `src/app/(dashboard)/admin/users/page.tsx`
- `src/app/respond/[token]/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/components/layout/sidebar.tsx` — no border under brand block
- `src/app/globals.css` — sidebar CSS variables (API Navy alignment)

Key paths (design 2026-03-28):
- `src/app/(auth)/login/page.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/header.tsx`
- `src/components/shared/status-badge.tsx`
- `src/app/(dashboard)/dashboard-client.tsx`
- `src/app/(dashboard)/questionnaires/questionnaires-client.tsx`
- `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx`
- `src/app/respond/[token]/page.tsx`
- `src/app/respond/[token]/confirmation/page.tsx`

## Open Issues
- Import/export for questions (JSON) is scaffolded but UI not yet wired
- `command.tsx` is a lightweight custom implementation — could be replaced with cmdk if needed

## Next Best Step
1. Smoke-test buttons (ripple, keyboard, dropdown triggers, `asChild` links) on login, dashboard, questionnaires, admin tables, respondent flow
2. If default buttons feel too tall vs the old UI, change MD3 `default` size from `h-10 px-6` to `h-8 px-4` in `material-design-3-button.tsx`
3. Apply the same table header + row pattern to admin pages (question bank, users, audit log, templates) if not already uniform
4. Continue feature work: question import/export UI is the main unfinished item
5. Before deploy, set production env vars on hosting and run a full login/admin smoke test

## Guardrails
- Preserve working logic unless a change is necessary
- Do not rewrite stable code just to reorganize it
- Prefer improving existing components over replacing them
- Keep the UI simple, clean, and lightweight
- Follow existing project patterns unless there is a good reason not to

## Known Decisions
- **Buttons:** shadcn-style `Button` from `@/components/ui/button` is backed by `material-design-3-button.tsx`; drop-in external snippets that import `@radix-ui/react-slot` must use `radix-ui` + `Slot.Root` instead. Ripple is client-only; no extra global CSS required.
- Branding: API Navy `#273B6E` = primary, API Green `#78BC43` = accent/active — all via CSS custom properties in `globals.css`
- Sidebar uses API Navy background (`--sidebar` matches primary in light theme) with green active items
- Brand logo is inlined as SVG (not `next/image`) so white and navy color variants can coexist without extra files or CSS filters

- Better Auth with admin plugin for auth (email/password, no OAuth in v1)
- Drizzle ORM + Neon Postgres serverless driver
- Next.js 16: `proxy.ts` replaces `middleware.ts`, export must be `export function proxy()`
- DB connection is lazy (Proxy pattern) to avoid module-level crash at build time without env vars
- Published questionnaires create a snapshot of questions — structure frozen at publish time
- Share tokens are 32-byte crypto random base64url strings
- Soft deletes / archiving used for questions and questionnaires to preserve history
- `command.tsx` built without cmdk dependency (keeps bundle lighter)
- Recharts used for dashboard charts (as specified)
- `@dnd-kit` for drag-and-drop question reordering in builder
