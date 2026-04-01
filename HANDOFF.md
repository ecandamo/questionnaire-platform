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
  - **Collaborative questionnaire answering** — owner invites contributors with scoped magic links; contributor sees only their assigned questions; progress panel; mailto + copy link sharing; submission gate; sender-side Team tab in dashboard; **owner share load creates response row** (Team panel visible before first save); **answers prefilled on owner view** with “Last updated by …” (DB `answer.last_updated_by_collaborator_id`); owner saves echo collaborator text without clearing attribution unless value changes; contributors blocked from POSTing non-assigned question IDs
- Not finished:
  - Import/export for questions (JSON) UI still scaffolded, not wired

## Last Session Changes
- **2026-04-01 (self-improvement):** Logged session learnings to `.learnings/LEARNINGS.md` (LRN-20260401-001–005: share URL hydration, collaborator delete order, team refresh sync, section numbering, ESLint/React diagnostics vs Cursor folder emphasis) and `.learnings/ERRORS.md` (ERR-20260401-001: resolved ESLint errors).

- **2026-04-01 (Share Link tab):** `GET /api/questionnaires/[id]` returns `shareUrl` for the latest **active** share link (built like publish). `load()` sets parent `shareUrl` so banner + tab survive refresh. `ShareLinkPanel` uses the prop only (removed stale `useState` + no-op fetch).

- **2026-04-01 (respond team refresh):** `CollaboratorPanel` optional `onTeamChanged` runs after successful invite/delete; respond page implements `refreshShareSnapshot` (`GET /api/share/[token]`) to update `questions`, `allQuestions`, `answers`, and `attributionByQuestionId` so progress and cleared collaborator answers match the DB without a full page reload.

- **2026-04-01 (collaboration + numbering):** Section headers no longer consume visible question numbers — shared helper `answerableDisplayNumbers` in `src/lib/question-sections.ts` (with `getQuestionIdsInSectionAfterHeader` for section bulk select). **Respond** page, **questionnaire builder** cards, and **responses** viewer use that numbering; responses summary counts **answerable** questions only (excludes `section_header`). **Removing a collaborator** calls `deleteAnswersForRemovedCollaborator` (in `src/lib/collaborator-cleanup.ts`) before deleting assignments — clears answers for assigned questions and any row last-updated by that collaborator (`DELETE` on both collaborator APIs). **Assign whole sections:** `QuestionAssignmentPicker` (`src/components/shared/question-assignment-picker.tsx`) used in `collaborator-panel.tsx` and dashboard `SenderAssignmentsPanel` — section rows toggle all questions until the next section header; indeterminate checkbox when partially selected. Collaborator **POST** bodies dedupe `questionIds` with `new Set` on both APIs.

- **2026-04-01 (collaborative UX polish):** `GET /api/share/[token]` for owner **creates `response` on first load** if missing (and bumps questionnaire `shared` → `in_progress` when applicable) so Team panel shows immediately. Share GET returns **`answers[]`** with `questionId`, `value`, `answeredByLabel`. New column **`answer.last_updated_by_collaborator_id`** (FK → `response_collaborator`). `POST …/answers`: contributors may only write assigned questions; attribution set on collaborator writes; owner updates preserve collaborator attribution when value unchanged. Respond page: merge API answers into form; owner sees attribution line under each answered question; refetch share after save to sync labels; optimistic “Primary respondent” when owner edits.

- **2026-04-01 (collaborative answering):** Full collaborative questionnaire response feature on branch `feature/collaborative-questionnaire-responses`.
  - New DB tables: `response_collaborator`, `question_assignment` (with enums `collaborator_role`, `invite_status`). Schema pushed to Neon.
  - `GET /api/share/[token]` extended: resolves both owner share_link tokens and contributor tokens; filters questions to assigned-only for contributors; marks collaborator active on first visit.
  - `POST /api/responses/[id]/answers` extended: handles contributor tokens (mark-complete instead of submit); enforces submission gate (all collaborators' required questions answered before owner can submit).
  - New `POST/GET/DELETE /api/responses/[id]/collaborators` — respondent-side (owner): invite, list progress, remove.
  - New `POST/GET/DELETE /api/questionnaires/[id]/collaborators` — sender-side (authenticated): invite from dashboard; lazily creates response if needed.
  - `src/components/shared/collaborator-panel.tsx` — owner's team panel embedded in respond page: invite dialog, question picker, per-collaborator progress bar, Copy link + Open in email (mailto:) buttons.
  - `src/app/respond/[token]/page.tsx` updated: owner sees CollaboratorPanel + all questions; contributor sees only assigned questions + "Mark Complete" flow; "Section Complete" screen.
  - `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx`: new "Team" tab (visible when shared/in_progress) with `SenderAssignmentsPanel` — same invite/assign/copy/email UI for internal users.
  - Fixed pre-existing `material-design-3-button.tsx` TS error (`RefObject<HTMLDivElement | null>`).

- **2026-04-01 (branding):** Branding added to respondent-facing pages. Extracted logo SVG into `src/components/shared/api-logo.tsx` (navy/white variant prop). Added navy logo to respond page sticky header (with divider separator). Added API Navy top bar with white logo to confirmation page. Login and sidebar updated to use `<ApiLogo>` instead of inline SVG.

- **2026-03-29:** Sidebar brand **Sales Questionnaires** (`text-sm`; **Sales** semibold, **Questionnaires** normal). Admin affordances: question bank **Archive** uses `ArchiveIcon` (replaces trash on a soft-archive action); templates **Deactivate** gets `ArchiveIcon`; users row menu — role toggle uses `Shield` / `ShieldOff`, deactivate/reactivate uses `UserX` / `UserCheck`. (Dashboard welcome line unchanged: **Welcome back, {first name}!**; subtitle still admin vs non-admin.)
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
- `src/lib/question-sections.ts` — display numbering + section question IDs for bulk assign
- `src/lib/collaborator-cleanup.ts` — delete collaborator-tied answers before removing assignments
- `src/components/shared/question-assignment-picker.tsx` — section + per-question assign UI
- `src/app/api/responses/[id]/collaborators/route.ts` — DELETE cleanup; POST dedupe `questionIds`
- `src/app/api/questionnaires/[id]/collaborators/route.ts` — same
- `src/components/shared/collaborator-panel.tsx` — uses `QuestionAssignmentPicker`
- `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx` — builder numbering; Team tab picker
- `src/app/respond/[token]/page.tsx` — respondent numbering; submit dialog required filter
- `src/app/(dashboard)/questionnaires/[id]/responses/page.tsx` — viewer numbering + answerable counts
- `src/lib/db/schema.ts` — added `response_collaborator`, `question_assignment` tables + enums
- `drizzle/0000_shallow_whizzer.sql` — generated migration (applied via db:push)
- `src/app/api/share/[token]/route.ts` — extended for collaborator token resolution
- `src/app/api/responses/[id]/answers/route.ts` — collaborator token support + submission gate
- `src/app/api/responses/[id]/collaborators/route.ts` — new (owner manage team via respond flow)
- `src/app/api/questionnaires/[id]/collaborators/route.ts` — new (sender manage team from dashboard)
- `src/components/shared/collaborator-panel.tsx` — new (team panel for respond page)
- `src/app/respond/[token]/page.tsx` — owner/contributor role-aware view
- `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx` — Team tab + SenderAssignmentsPanel
- `src/components/ui/material-design-3-button.tsx` — TS fix (`RefObject<HTMLDivElement | null>`)
- `src/components/shared/api-logo.tsx` — new shared logo component (navy/white variants)
- `src/app/respond/[token]/page.tsx` — logo + divider added to sticky header
- `src/app/respond/[token]/confirmation/page.tsx` — navy top bar with white logo
- `src/app/(auth)/login/page.tsx` — uses ApiLogo instead of inline SVG
- `src/components/layout/sidebar.tsx` — brand line Sales Questionnaires + typography; uses ApiLogo
- `src/app/(dashboard)/admin/question-bank/page.tsx` — Archive menu item uses archive icon
- `src/app/(dashboard)/admin/templates/page.tsx` — Deactivate menu item icon
- `src/app/(dashboard)/admin/users/page.tsx` — role / ban menu item icons
- `src/app/(dashboard)/dashboard-client.tsx` — unified welcome `h1` with exclamation
- `src/components/ui/material-design-3-button.tsx` — MD3 interaction + CVA variants
- `src/components/ui/button.tsx` — shim re-exports `Button` / `buttonVariants` with legacy variant names
- `src/components/layout/header.tsx` — minimal top bar (no pathname title)
- `src/app/(dashboard)/clients/page.tsx`
- `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx`
- `src/app/(dashboard)/questionnaires/[id]/responses/page.tsx`
- `src/app/(dashboard)/questionnaires/new/new-client.tsx`
- `src/app/(dashboard)/admin/audit-log/page.tsx`
- `src/app/respond/[token]/page.tsx`
- `src/app/(auth)/login/page.tsx`
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
1. Smoke-test: numbering skips section headers; assign a full section via Team UI; remove a collaborator and confirm their answers disappear from the owner view / DB.
2. **Smoke-test collaborative flow** on branch `feature/collaborative-questionnaire-responses` (if not on `main`):
   - Publish a questionnaire → open the respond link → add a collaborator → copy their link → open in a second browser → verify they see only assigned questions → mark complete → verify owner can then submit
3. Merge branch to `main` when smoke-test passes
3. Phase 2 (post-merge): Sender-side email invite (mailto: is already done); "reassign" questions after invite; show questionnaire-level collaborator count in the questionnaire list
4. Continue feature work: question import/export UI is the main unfinished item
5. Before deploy, set production env on hosting (`BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, DB URL, `NEXT_PUBLIC_APP_URL`) and run a full smoke test

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

- Better Auth with admin plugin for auth (email/password, no OAuth in v1); set **`BETTER_AUTH_URL`** per environment (e.g. `http://localhost:3000` locally, production domain on Vercel) so base URL / redirects are valid — `src/lib/auth.ts` does not hardcode `baseURL`
- Drizzle ORM + Neon Postgres serverless driver
- Next.js 16: `proxy.ts` replaces `middleware.ts`, export must be `export function proxy()`
- DB connection is lazy (Proxy pattern) to avoid module-level crash at build time without env vars
- Published questionnaires create a snapshot of questions — structure frozen at publish time
- Share tokens are 32-byte crypto random base64url strings
- Soft deletes / archiving used for questions and questionnaires to preserve history
- `command.tsx` built without cmdk dependency (keeps bundle lighter)
- Recharts used for dashboard charts (as specified)
- `@dnd-kit` for drag-and-drop question reordering in builder
