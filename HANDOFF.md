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
- Added permanent delete for admins: `DELETE /api/questionnaires/:id?permanent=true`
  - Admin-only guard enforced server-side; cascades to questions, share links, responses, answers
  - Logged as `"delete"` in audit log (archive stays `"archive"`)
- Added "Delete permanently" option in questionnaire list dropdown (admin-only, with confirmation)
- Sidebar brand block: centered logo + title; subtitle uses full `text-sidebar-foreground` for contrast

## Files Touched
Key paths (delete feature 2026-03-27):
- `src/app/api/questionnaires/[id]/route.ts` — DELETE handler updated to support `?permanent=true`
- `src/app/(dashboard)/questionnaires/questionnaires-client.tsx` — Admin-only "Delete permanently" menu item
- `src/components/layout/sidebar.tsx` — Brand area centering + subtitle contrast

## Open Issues
- Import/export for questions (JSON) is scaffolded but UI not yet wired
- `command.tsx` is a lightweight custom implementation — could be replaced with cmdk if needed

## Next Best Step
1. Smoke-test delete: login as admin, archive a questionnaire, then "Delete permanently" — confirm it disappears and audit log shows `delete` action
2. Continue feature work: question import/export UI is the main unfinished item
3. Before deploy, set production env vars on hosting and run a full login/admin smoke test

## Guardrails
- Preserve working logic unless a change is necessary
- Do not rewrite stable code just to reorganize it
- Prefer improving existing components over replacing them
- Keep the UI simple, clean, and lightweight
- Follow existing project patterns unless there is a good reason not to

## Known Decisions
- Branding: API Navy `#273B6E` = primary, API Green `#78BC43` = accent/active — all via CSS custom properties in `globals.css`
- Sidebar uses dark navy background (independent of light/dark page theme via `--sidebar` vars) with green active items
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
