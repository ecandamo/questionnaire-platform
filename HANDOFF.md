# HANDOFF

## Project Summary
Internal sales questionnaire platform. Allows authenticated internal users (and admins) to create, manage, share, and review questionnaires for prospects/clients. External respondents access via a secure tokenized link — no login required.

## Current Status
- State: **working** — full application built and compiles cleanly
- New question type **`file_upload`**: respondents upload via **Vercel Blob client uploads** (`POST /api/blob` + `@vercel/blob/client` `upload()`); answer stores the public URL in `answer.value`. Requires **`BLOB_READ_WRITE_TOKEN`** (create Blob store in Vercel → link project). DB: run `npm run db:migrate` or `db:push` after pulling — migration `drizzle/0002_sharp_ben_parker.sql` adds enum value `file_upload`.
- Admin question bank: **Templates** column uses colored pills per template; CSV import dialog copy clarified (requirements, after-import, categories checkbox)
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
  - **Admin: CSV import** for question bank only — `POST /api/questions/import` (multipart); optional category auto-create; no template wiring (assign in **Admin → Templates**); sample at `/samples/question-bank-import-sample.csv`
  - **Admin: question bank table** shows a **Templates** column (preset template names per row; **Orphan** = not on any template)
  - Client management
  - **Collaborative questionnaire answering** — owner invites contributors with scoped magic links; contributor sees only their assigned questions; progress panel; mailto + copy link sharing; submission gate; sender-side Team tab in dashboard; **owner share load creates response row** (Team panel visible before first save); **answers prefilled on owner view** with “Last updated by …” (DB `answer.last_updated_by_collaborator_id`); owner saves echo collaborator text without clearing attribution unless value changes; contributors blocked from POSTing non-assigned question IDs
- Not finished:
  - JSON import/export for questions (if still desired) — not implemented; CSV covers bulk bank rows only

## Last Session Changes
- **2026-04-14 (self-improvement pass):** Logged **LRN-20260414-009** (promoted): cross-viewer file answers persist immediately; hooks/exhaustive-deps patterns (`useCallback` loaders, ref + stable persist for intervals). **AGENTS.md** + **CLAUDE.md** Self-Improvement sections now include **Cursor emphasized folders → run ESLint** and those fixes. Linked recurrence on **LRN-20260401-005**.

- **2026-04-14 (ESLint / Cursor “emphasized” `src/app`):** Cleared **react-hooks/exhaustive-deps** and **no-unused-vars** across `src/app` (useCallback for data loaders; respond autosave uses `answersRef` + `persistAnswersSnapshot`); aligned **collaborator-panel**; removed dead eslint-disable in `db/index.ts` and unused **seed** `techCat` binding. `npx eslint "src/**/*.{ts,tsx}"` is clean.

- **2026-04-14 (respond UX + CSV upload + export):** Submit / confirm dialog / “Your Information” use one line: **“Name and email must be completed before submitting responses.”** Blob upload allowlist adds **CSV** (`text/csv`, `application/csv`). Response **CSV export** sets **Respondent Name / Email per row** from `answer.last_updated_by_collaborator_id` when set (collaborator’s saved name + email), else primary `response` respondent.

- **2026-04-14 (file upload + collaborators):** Removing or replacing a file on `/respond/[token]` now **POSTs answers immediately** after upload/remove (not only on 30s autosave), so collaborators and refreshed owner views match the DB — fixes “deleted file still showing” when the link was opened before autosave.

- **2026-04-14 (respondent name/email + export CSV):** `/respond/[token]` requires non-empty name + valid email before **Submit** (owner) or **Mark Complete** (contributor); client + `POST …/answers`; confirm dialog shows gaps. Contributor complete persists `name`/`email` on `response_collaborator`. Response CSV export uses **Respondent Name** and **Respondent Email** columns (no single merged cell).

- **2026-04-14 (self-improvement pass):** **LRN-20260414-001** promoted → **`CLAUDE.md`**. **LRN-20260414-002** resolved (questionnaires row menu). **2026-04-14 (follow-up):** **LRN-20260414-003–005** promoted (Drizzle CLI + `.env.local`, publish vs question `PATCH`, UUID client ids for `questionnaire_question`); **LRN-20260414-006–007** pending (Blob client/public pattern, secret hygiene). **ERR-20260414-001** resolved (drizzle-kit missing `DATABASE_URL`). **`CLAUDE.md` / `AGENTS.md`** updated with Drizzle env + draft/publish + UUID rules. Review `.learnings/LEARNINGS.md` / `ERRORS.md` for full entries.

- **2026-04-14 (save draft / new question ids):** Custom and bank-added questions used `custom-<uuid>` / `temp-<uuid>` client ids; Postgres `uuid` columns reject those strings → PATCH save failed. New ids are plain `crypto.randomUUID()`. `PATCH /api/questionnaires/[id]` wraps question insert in try/catch and returns `{ error }`; builder toasts that message on save/publish pre-save failure.

- **2026-04-14 (file upload question type):** Added `file_upload` to `question_type` enum, types, CSV import whitelist, question bank filter cast. **`POST /api/blob`** — `handleUpload` from `@vercel/blob/client` with allowed MIME types (PDF, Word, Excel, common images) and 50 MB max; **`@vercel/blob`** dependency. Respond page: file picker + progress + remove; response viewer: link + label helper `src/lib/blob-url-label.ts`; builder hint on `file_upload` cards. Migration `drizzle/0002_sharp_ben_parker.sql`.

- **2026-04-14 (submit → confirmation UX):** Owner submit no longer sets `submitted` before `router.push` to `/respond/[token]/confirmation`, so the “Already Submitted” full-page state does not flash between submit and the thank-you page. “Already Submitted” still shows when the share link is opened after submission (API `responseStatus === "submitted"`).

- **2026-04-14 (reopen + client link):** `POST /api/questionnaires/[id]/reopen` now resets all `response` rows for that questionnaire to `in_progress` and clears `submittedAt` (submit left them `submitted`, so `/api/share/[token]` and the respond page still showed “already submitted”). Collaborators with `invite_status = completed` are set back to `active`. Respond page syncs `submitted` from `responseStatus` on load/refresh (not only when true).

- **2026-04-10 (favicon):** Added `src/app/icon.svg` — API wordmark (navy `#273B6E` + green crosshair) on a white circular background; Next serves it at `/icon.svg` for browser tabs.

- **2026-04-09 (question bank UI polish):** Templates column shows each preset template as a rounded pill with deterministic accent color by template id; **Orphan** uses a dashed muted pill. **Bulk import from CSV** dialog: title + description, structured “File requirements” / “After import” sections, clearer category-auto-create label, header case/underscore note.

- **2026-04-09 (CSV bank-only + templates column):** CSV import no longer reads or creates template links — only questions (+ optional categories). `GET /api/questions` includes `templates: { id, name }[]` per row for the question bank UI **Templates** column (**Orphan** when empty). Older CSVs with template columns are ignored (not validated).

- **2026-04-09 (CSV question bank import):** Admin **Import CSV** on question bank page. New route `POST /api/questions/import` (multipart: `file`, `createMissingCategories`); **papaparse** dependency; validation + normalization in `src/lib/question-csv-import.ts`; manual rollback on mid-import failure (no Drizzle transaction with neon-http). Sample CSV `public/samples/question-bank-import-sample.csv`. Audit `action: "import"` on success.

- **2026-04-09 (hard delete — questions & templates):** Added optional `DELETE ?permanent=true` to question bank and template APIs (mirrors existing questionnaire pattern). Default `DELETE` still soft-archives questions / deactivates templates. Admin UI: question bank and templates pages each gain a **Delete permanently** menu item with confirmation dialogs. No schema migration needed — existing FK cascade/set-null rules handle referential integrity.
  - `src/app/api/questions/[id]/route.ts` — branches on `permanent=true`; hard delete + `action: "delete"` audit log
  - `src/app/api/templates/[id]/route.ts` — same; also returns 404 when template row not found (previous deactivate path silently succeeded)
  - `src/app/(dashboard)/admin/question-bank/page.tsx` — **Delete permanently** item added
  - `src/app/(dashboard)/admin/templates/page.tsx` — **Delete permanently** item added; `TrashIcon` imported

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
- **Questionnaires list**: Table headers `text-[10px] uppercase tracking-[0.08em] bg-muted/30`; row actions menu always visible; stronger title weight
- **Questionnaire detail**: Page title `text-3xl`; refined metadata separators; question cards use left-border accent for required questions, inline type tags replace Badge components
- **Respondent form**: Sticky header uses `backdrop-blur-sm`; section headers use left border accent; progress bar taller; submit area has border-top
- **Confirmation page**: Larger success circle with ring + shadow; `text-3xl` heading; editorial numbered next-steps list

## Files Touched
- `src/app/respond/[token]/page.tsx` — immediate save after file upload/remove; snapshot-based persist; unified name/email copy; CSV in file accept + helper text
- `src/app/api/blob/route.ts` — CSV MIME + extension allowlist
- `src/app/api/responses/[id]/answers/route.ts` — owner submit validates name + email
- `src/app/api/responses/[id]/export/route.ts` — CSV: per-question respondent name/email (collaborator vs primary)
- `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx` — file_upload hint includes CSV

- `CLAUDE.md` — “Questionnaires & public responses” (reopen / `response.status` invariant)
- `.learnings/LEARNINGS.md` — LRN-20260414-001 promoted, LRN-20260414-002 resolved
- `HANDOFF.md` — this update

- `src/app/(dashboard)/questionnaires/questionnaires-client.tsx` — row actions menu always visible (no hover-only opacity)

- `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx` — valid UUIDs for new questions; save error toast from API; publish still pre-saves questions
- `src/app/api/questionnaires/[id]/route.ts` — try/catch on question insert, JSON error body

- `src/lib/db/schema.ts`, `src/types/index.ts`, `src/lib/question-csv-import.ts`, `src/app/api/questions/route.ts` — `file_upload` question type
- `src/app/api/blob/route.ts` — Vercel Blob client-upload token route
- `src/app/respond/[token]/page.tsx`, `src/lib/blob-url-label.ts` — upload UI + URL label
- `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx`, `responses/page.tsx` — builder hint + response link
- `drizzle/0002_sharp_ben_parker.sql`, `drizzle/meta/*` — enum migration
- `package.json` — `@vercel/blob`

- `src/app/api/questionnaires/[id]/reopen/route.ts` — reopen resets `response` + collaborator invite rows so share link works again
- `src/app/respond/[token]/page.tsx` — `submitted` mirrors `responseStatus` after refetch; no `setSubmitted(true)` before confirmation navigation (avoids “Already Submitted” flash)

- `src/app/icon.svg` — app favicon (API logo on white circle)

- `src/lib/question-csv-import.ts` — bank-only CSV columns + validation
- `src/app/api/questions/import/route.ts` — questions (+ optional categories) only; rollback `question` rows
- `src/app/api/questions/route.ts` — list rows include `templates[]` from `template_question` join
- `src/app/(dashboard)/admin/question-bank/page.tsx` — **Templates** column (pills + Orphan); CSV import dialog
- `public/samples/question-bank-import-sample.csv` — no template columns
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
- JSON import/export for questions remains optional if product wants parity with CSV-only workflow
- `command.tsx` is a lightweight custom implementation — could be replaced with cmdk if needed

## Next Best Step
1. Apply DB migration for `file_upload` (`npm run db:push` or `db:migrate`); provision Vercel Blob store and set **`BLOB_READ_WRITE_TOKEN`** locally + on Vercel; smoke-test upload on `/respond/[token]`.
2. Smoke-test: numbering skips section headers; assign a full section via Team UI; remove a collaborator and confirm their answers disappear from the owner view / DB.
3. **Smoke-test collaborative flow** on branch `feature/collaborative-questionnaire-responses` (if not on `main`):
   - Publish a questionnaire → open the respond link → add a collaborator → copy their link → open in a second browser → verify they see only assigned questions → mark complete → verify owner can then submit
4. Merge branch to `main` when smoke-test passes
5. Phase 2 (post-merge): Sender-side email invite (mailto: is already done); "reassign" questions after invite; show questionnaire-level collaborator count in the questionnaire list
6. Continue feature work: question import/export UI is the main unfinished item
7. Before deploy, set production env on hosting (`BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, DB URL, `NEXT_PUBLIC_APP_URL`, **`BLOB_READ_WRITE_TOKEN`** if using file uploads) and run a full smoke test

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
- Soft deletes / archiving used for questions and questionnaires to preserve history; **hard delete** available on all three via `DELETE ?permanent=true` (admin-only for questionnaires, admin-only implied for questions and templates since those routes already require admin)
- `command.tsx` built without cmdk dependency (keeps bundle lighter)
- Recharts used for dashboard charts (as specified)
- `@dnd-kit` for drag-and-drop question reordering in builder
