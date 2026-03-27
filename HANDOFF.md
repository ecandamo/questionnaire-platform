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
- Full application built from scratch (all 8 phases)
- Next.js 16 compatibility: renamed `middleware.ts` → `proxy.ts` with `export function proxy()`
- Lazy DB connection (Proxy pattern) to avoid build-time crash without `DATABASE_URL`
- All TypeScript errors resolved, production build passes
- Switched local DB to user-owned Neon project and completed `db:push` + `db:seed`
- Bootstrap admin flow verified manually (sign-up endpoint + DB role promotion)
- `src/components/ui/command.tsx` lint/a11y cleanup (removed stale cmdk selectors, added required `aria-selected`)

## Files Touched
All new files. Key paths:
- `src/lib/db/schema.ts` — Drizzle schema (12 tables)
- `src/lib/db/index.ts` — Lazy Neon connection
- `src/lib/db/seed.ts` — Seeds 3 templates + questions
- `src/lib/auth.ts` — Better Auth server config
- `src/lib/auth-client.ts` — Better Auth React client
- `src/lib/audit.ts` — Audit logging
- `src/lib/tokens.ts` — Share token generation
- `src/lib/session.ts` — Session helpers for API routes
- `src/proxy.ts` — Route protection (Next.js 16 proxy)
- `src/app/(auth)/login/page.tsx` — Login page
- `src/app/(dashboard)/layout.tsx` — Dashboard shell
- `src/app/(dashboard)/page.tsx` — Dashboard (server)
- `src/app/(dashboard)/dashboard-client.tsx` — Dashboard charts (client)
- `src/app/(dashboard)/questionnaires/` — List + builder + responses
- `src/app/(dashboard)/clients/page.tsx` — Client management
- `src/app/(dashboard)/admin/` — All admin pages
- `src/app/api/` — All API routes
- `src/app/respond/[token]/` — External respondent flow
- `src/components/layout/` — Sidebar + header
- `src/components/shared/status-badge.tsx` — Status badges
- `src/components/ui/dialog.tsx`, `sheet.tsx`, `command.tsx` — Manual shadcn components
- `src/types/index.ts` — Shared types
- `drizzle.config.ts` — Drizzle Kit config

## Open Issues
- Import/export for questions (JSON) is scaffolded but UI not yet wired
- `command.tsx` is a lightweight custom implementation — could be replaced with cmdk if needed

## Next Best Step
1. Continue feature work (question import/export UI is the main unfinished item)
2. Keep local dev stable with `npx next dev --webpack` if Turbopack is unstable on this machine
3. Before deploy, set production env vars on hosting and run a full login/admin smoke test

## Guardrails
- Preserve working logic unless a change is necessary
- Do not rewrite stable code just to reorganize it
- Prefer improving existing components over replacing them
- Keep the UI simple, clean, and lightweight
- Follow existing project patterns unless there is a good reason not to

## Known Decisions
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
