# HANDOFF

## Project Summary
Internal sales questionnaire platform. Allows authenticated internal users (and admins) to create, manage, share, and review questionnaires for prospects/clients. External respondents access via a secure tokenized link — no login required.

## Current Status
- State: **working** — full application built and compiles cleanly; **RLS** (`0006`) **applied and verified** (**`drizzle.__drizzle_migrations`** = **7** rows, **`npm run db:verify-rls`** passing). Local dev and **Vercel use the same `DATABASE_URL`** — no separate prod migrate pass needed; deploy matches DB.
- **Caveat:** shared DB means local dev touches production data — consider a separate Neon branch/DB for development later if needed.
- **Admin → Create user:** `POST /api/admin/users` server-fetches Better Auth `create-user` without browser **`Origin` / `Referer`**; Better Auth could return **"Missing or null Origin"**. Route now sends both from `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` (500 if both unset). Rule also in **`AGENTS.md`**.
- New question type **`file_upload`**: respondents upload via **Vercel Blob client uploads** (`POST /api/blob` + `@vercel/blob/client` `upload()`); answer stores the public URL in `answer.value`. Requires **`BLOB_READ_WRITE_TOKEN`** (create Blob store in Vercel → link project). DB: run `npm run db:migrate` or `db:push` after pulling — migration `drizzle/0002_sharp_ben_parker.sql` adds enum value `file_upload`.
- Admin question bank: **Templates** column uses colored pills per template; CSV import dialog copy clarified (requirements, after-import, categories checkbox)
- Working now:
  - Authentication (Better Auth, email/password, admin plugin)
  - Dashboard with Recharts charts (status counts, type breakdown, recent activity)
  - Questionnaire list with search/filters
  - Questionnaire builder with drag-and-drop reordering, hide/show, required toggle
  - Preset template types (Data Request, Hobson ROI, Workshop, **Pre-Workshop**) load questions from templates
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

- **2026-05-01 (security headers):** Added HTTP security headers via `next.config.ts` `headers()` — applied to all routes.
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Strict-Transport-Security` (2-year HSTS).
  - `Content-Security-Policy`: tight policy; `'unsafe-eval'` conditionally added **only in development** (`NODE_ENV === "development"`) because Turbopack uses eval for HMR/source maps — omitting it in dev breaks sign-in and dynamic imports (Recharts). Production CSP has no `unsafe-eval`.
  - No other files changed.

- **2026-05-02 (RLS migration operations + scripts):** End-to-end apply on shared Neon: **`db:baseline -- --apply`** (when the DB was built with **`db:push`** first), **`db:migrate`**, **`db:verify-rls`** OK. Tooling: **`scripts/baseline-migrations.ts`** + **`npm run db:baseline`**; **`scripts/migrate-with-log.ts`** + **`db:migrate:verbose`**; **`drizzle/meta/_journal.json`** — **`0006_rls_policies.when`** set **>** **`0005`** (Drizzle otherwise skips **`0006`**). **`scripts/verify-rls.ts`** — no top-level **`await`** (tsx/CJS). **`scripts/backup-db.ts`** — unique branch name per run (UTC timestamp), optional **`BACKUP_BRANCH_NAME`**, clearer **409** message. **`CLAUDE.md`** / **`package.json`** scripts updated.
- **2026-05-01 (RLS implementation):** Full Row Level Security rollout across all application tables.
  - **DB driver switched:** `drizzle-orm/neon-http` → `drizzle-orm/neon-serverless` (Pool + WebSocket) in `src/lib/db/index.ts` — required because neon-http throws "No transactions support" and RLS needs `SET LOCAL` inside a real transaction.
  - **`src/lib/db/rls-context.ts` (new):** `withRls(ctx, fn)` + `setLocalRls(tx, ctx)` + `RlsContext` type. Every API route wraps its DB work in `withRls`. Three modes: `auth` (authenticated users), `share_owner` (external respondent via share link token), `share_contributor` (collaborator token).
  - **`drizzle/0006_rls_policies.sql` (new):** ENABLE + FORCE + policies on all 14 app tables. Better Auth tables (`user`, `session`, `account`, `verification`) excluded. Registered in `drizzle/meta/_journal.json`.
  - **All 20 API routes refactored** to use `withRls` + `tx` instead of global `db`. Lib helpers (`logAudit`, `deleteAnswersForRemovedCollaborator`) accept optional `tx`.
  - **`scripts/backup-db.ts` (new):** `npm run db:backup` — Neon branch + optional pg_dump. Set `NEON_API_KEY` + `NEON_PROJECT_ID` in `.env.local`.
  - **`scripts/verify-rls.ts` (new):** `npm run db:verify-rls` — asserts all tables have `relrowsecurity + relforcerowsecurity` and have policies. Exits non-zero on failure (CI-ready).
  - **`CLAUDE.md` updated** with RLS + driver rules.
  - `tsc --noEmit` and ESLint clean.
- **2026-04-15 (post-`/audit` fixes — batch):** Addressed remaining Clients + dashboard audit items in one pass.
  - **`clients/page.tsx`:** Search `id` + `sr-only` label; loading `role="status"`; table **Actions** column `sr-only` header; row menu `aria-label` + decorative icons `aria-hidden`; dialog: all fields `htmlFor`/`id`, required company name + `aria-required`, `autoComplete`, contact grid `grid-cols-1 sm:grid-cols-2`; save `aria-busy`.
  - **`dashboard-client.tsx` + new `dashboard-chart-blocks.tsx`:** Recharts pie/bar moved to client-only dynamic import (`ssr: false`) with skeleton loading; **By Type** block gets `aria-labelledby` on wrapper + **sr-only `<table>`** (caption + scoped headers) for screen readers.
  - **`detail-client.tsx`, `collaborator-panel.tsx`, `respond/[token]/page.tsx`:** `text-[color:var(--accent)]` → `text-accent`; copy-success `CheckIcon` gets `aria-hidden` where button already has `aria-label`.
  - `npm run build`, `tsc --noEmit`, ESLint clean.

- **2026-04-15 (adapt + optimize + polish + typeset — batch):**
  - **`/adapt` — `collaborator-panel.tsx`:** Icon action buttons (copy / email / remove) `h-7 w-7` → `h-9 w-9` (36px tap targets on respond flow, matches dashboard Team panel).
  - **`/optimize` — admin data loaders:** `AbortController` + optional `signal` on initial list loads: `question-bank/page.tsx` (`loadData` — parallel questions + categories), `templates/page.tsx` (`load`), `users/page.tsx` (`load`), `audit-log/page.tsx` (`load(o, signal)` — initial mount only; “Load more” calls `load(offset)` without abort). All handle `AbortError` and guard `setState` / `setLoading` when aborted.
  - **`/polish` — Recharts legend:** `dashboard-client.tsx` — removed Recharts `<Legend />` (inaccessible SVG-only). Replaced with semantic `<ul role="list" aria-label="Questionnaire status breakdown">` under the pie: each `<li>` has a color swatch (`aria-hidden`) + visible label. `ClockIcon` in collaborator row was already `text-warning` from prior harden (no `text-amber-500` left).
  - **`/typeset` — fonts:** `src/app/layout.tsx` — `Plus_Jakarta_Sans` + `Inter` → **`IBM_Plex_Sans`** (`--font-heading`, 500–700) + **`Source_Sans_3`** (`--font-sans`, 400–600). `src/styles/design-tokens.ts` reference updated; `.impeccable.md` typography section updated to match live stack.
  - ESLint + `tsc --noEmit` clean.

- **2026-04-15 (accessibility harden — /harden):** WCAG label associations, collaborator panel naming, and reduced motion:
  - **Admin dialogs — `htmlFor` / `id`:** Question bank (`question-bank/page.tsx`): filters (sr-only labels + ids on search + three filter `SelectTrigger`s); Add/Edit Question dialog (question text, type, category, options, help text + `aria-describedby` on help textarea); Add/Edit Category dialog (name, description, sort order). Users (`users/page.tsx`): Create User (name, email, password, role trigger). Templates (`templates/page.tsx`): name, type, description, sr-only label + id on question bank search input.
  - **`globals.css`:** `@media (prefers-reduced-motion: reduce)` sets `:where(.animate-spin) { animation: none !important; }` so all Tailwind spinners respect OS setting.
  - **MD3 button (`material-design-3-button.tsx`):** `getPrefersReducedMotion()` helper; `startPressAnimation` skips Web Animations API ripple grow when reduced motion is on (still allows `pressed` state for focus/hover affordances).
  - **Collaborator panel (`collaborator-panel.tsx`):** Replaced `title` with `aria-label` on copy / email / remove buttons (includes collaborator display name or email); `text-amber-500` → `text-warning` on active clock icon; decorative status icons marked `aria-hidden`.
  - ESLint clean on touched files.

- **2026-04-15 (polish — /polish):** Three P3 items from the `/audit` report:
  - **Respond header glassmorphism (`respond/[token]/page.tsx`):** `backdrop-blur-sm` (4px) → `backdrop-blur-md` (12px) — 4px is imperceptible; 12px creates a real frosted-glass effect. Background changed from `bg-card/90` (near-opaque) → `bg-background/80` (20% transparent) for proper glass depth. Border softened from `border-border` → `border-border/60` to complement the translucent surface.
  - **Badge dot decorations (`status-badge.tsx`):** Added `aria-hidden="true"` to all three colored dot `<span>` elements across `QuestionnairStatusBadge`, `LinkStatusBadge`, and `QuestionStatusBadge`. The text label already carries the semantic meaning; screen readers no longer encounter a meaningless presentational element.
  - **Recharts PieChart (`dashboard-client.tsx`):** Two fixes: (1) `key={entry.name}` → `key={\`cell-${i}\`}` (Recharts-recommended index pattern, avoids potential reconciliation edge cases). (2) `fill={CHART_COLORS[i % ...]}` → `fill={entry.fill}` — the `statusData` array already maps each status to a semantic CSS variable (`STATUS_COLORS`: warning for in_progress, success for submitted, etc.) but that `fill` property was ignored; pie slices now render with semantic status colors instead of generic chart palette. Removed the now-unused `CHART_COLORS` constant entirely.
  - ESLint clean (3 pre-existing `text-[color:var(--accent)]` shorthand warnings, unrelated).

- **2026-04-15 (performance — /optimize):** Systematic animation and fetch cleanup across 8 files:
  - **MD3 button ripple (`material-design-3-button.tsx`):** Removed `top`, `left`, `height`, `width` from Web Animations API keyframes — those are layout properties the browser must resolve through the layout engine even when constant. Now sets `style.width`/`style.height` as direct mutations before calling `.animate()`, and animates `transform` only (GPU-composited). Added `top-0 left-0` to the ripple element's Tailwind classes so it has an explicit CSS position. Base CVA `transition-all` → `transition-[box-shadow,border-radius,opacity]` — the three properties that actually change (shadow on elevated, border-radius on round press-morph, opacity on disabled).
  - **Progress bars (3 locations):** All `style={{ width: progress% }}` + `transition-all` patterns replaced with `style={{ transform: scaleX(n) }}` + `transition-transform` + `origin-left w-full`. Covers `progress.tsx` indicator (already used translateX, just needed the class fixed), the collaborator progress strip in `detail-client.tsx`, and the same strip in `collaborator-panel.tsx`.
  - **`transition-all` replacements:** `tabs.tsx` trigger → `transition-[color,background-color,box-shadow,border-color,opacity]`; `switch.tsx` → `transition-colors`; `badge.tsx` → `transition-colors`.
  - **AbortController (4 fetch effects):** `respond/[token]/page.tsx` initial load; `detail-client.tsx` `load` callback (abort-guarded before state updates + router.push); `detail-client.tsx` `loadBankQuestions` (guards setState on `signal.aborted`); `detail-client.tsx` `SenderAssignmentsPanel.fetchCollaborators`. Each useEffect now returns `controller.abort` as cleanup, preventing stale-response state updates on fast navigations.
  - ESLint clean after all changes (9 pre-existing `text-[color:var(--accent)]` shorthand warnings, unrelated).

- **2026-04-15 (touch targets — /adapt):** Improved tap target sizes across both the external respond page and the internal builder/collaborator panel:
  - **Respond save button**: `className="h-8"` → `"h-10"` — overrides the MD3 `size="sm"` h-8 to 40px, the practical web minimum for mobile tap targets.
  - **Builder drag handle**: Added `flex items-center justify-center p-2 rounded-md -ml-0.5` — tap area expands from ~16px to ~32px while the visual icon stays compact. `mt-1` offset replaced by padding.
  - **Builder hide/show + delete buttons**: `p-1.5` → `p-2.5` — tap area grows from ~26px to ~34px; added `type="button"` to both.
  - **Collaborator panel action buttons** (copy link, open in email, remove): `h-7 w-7` → `h-9 w-9` — tap area grows from 28px to 36px.
  - **Switch `scale-75`**: Left unchanged — `transform: scale()` is a visual transform only; the layout/hit area remains the full Switch size. This was a false-positive in the audit.
  - **name/email grid**: Already fixed in `/harden` (`grid-cols-1 sm:grid-cols-2`). No further action needed.
  - ESLint clean after all changes (6 pre-existing Tailwind shorthand suggestions, unrelated).

- **2026-04-15 (dashboard layout — /layout):** Dissolved the standalone KPI card section entirely. Stats are now a compact inline row (`divide-x divide-border text-xs`) living directly under the dashboard h1, rendered only when `total > 0`. Numbers are `font-bold tabular-nums` with semantic colors (warning/success/muted-foreground). Header flex changed to `items-start` + `shrink-0` on the button. Overall page spacing `space-y-6` → `space-y-8`. Chart and recent-list section label typography updated: `text-[10px] uppercase tracking-[0.08em]` → `text-xs font-semibold` (more readable, less template-feel).

- **2026-04-15 (anti-pattern polish — /polish):** Eliminated all 5 `border-left` accent stripe instances and other anti-patterns identified in `/audit`:
  - **`api-logo.tsx`**: Removed hard-coded hex fills (`#273B6E`, `#ffffff`, `#78bc43`). Logo letterforms now use `currentColor` (controlled by `text-primary` / `text-white` Tailwind class via `cn`). Crosshair lines use `var(--color-accent)` — theme-aware and dark-mode safe. Added `import { cn }`.
  - **`login/page.tsx`**: Replaced duplicate inline SVG (with hard-coded hex fills) with `<ApiLogo variant="navy" className="w-24" />` — single source of truth.
  - **`confirmation/page.tsx`**: `bg-white` → `bg-card` on success icon circle — no longer breaks dark mode.
  - **`sidebar.tsx`**: Removed absolute `<span>` left stripe on active nav items. Active state communicated by `bg-sidebar-primary/15` + `text-sidebar-primary` + `font-semibold` alone. Removed `relative` from link (no longer needed).
  - **`dashboard-client.tsx`**: Replaced 4 `border-l-2` KPI cards with a single stat-strip card (`grid-cols-2 sm:grid-cols-4 divide-x`). Number size reduced `text-4xl` → `text-2xl`. Status communicated via number color: Total=`text-foreground`, In Progress=`text-warning`, Submitted=`text-success`, Draft=`text-muted-foreground`. Removed `accent` field from kpis array.
  - **`respond/[token]/page.tsx`**: Section headers replaced `border-l-2 border-primary pl-4` with a heading + horizontal rule (`<div className="h-px bg-border mt-3" />`). Required question cards removed `border-l-2 border-l-primary/20` — `*` in question text is the required indicator.
  - **`detail-client.tsx`**: Builder sortable cards removed `border-l-2 border-l-primary/30`. "Required" badge inside card is the indicator. Simplified className to `border-border` always.
  - ESLint clean after all changes.

- **2026-04-15 (accessibility harden — /harden):** Fixed every P1/P2 a11y issue from `/audit`:
  - **Respond page `QuestionField`**: Added `id="qlabel-{id}"` to question text, `aria-labelledby` to all input types (short_text, long_text, number/currency/percentage, date, single_select), `role="group" aria-labelledby` on yes_no and multi_select groups, `aria-pressed` on yes/no buttons, `type="button"` on yes/no buttons. `FileUploadQuestionInput` now accepts and forwards `labelId`. Required asterisk marked `aria-hidden` with SR-only "(required)" text. Question description given `id` and wired to `aria-describedby`.
  - **Respond page loading**: `role="status" aria-label="Loading questionnaire"` on spinner container.
  - **Respond page mobile**: `grid-cols-1 sm:grid-cols-2` on name/email card — no longer pinches on narrow phones.
  - **Login page**: Brand panel heading changed from `<h1>` to `<p aria-hidden>` (decorative); form "Sign in" heading promoted to `<h1>` (correct single h1 on every viewport). Submit button gets `aria-busy={loading}`.
  - **Header**: Avatar/user trigger gets `aria-label="Open user menu for {name}"` — named on mobile where text is hidden.
  - **Questionnaires list**: Search input gets `aria-label="Search questionnaires"`. Row actions button gets `aria-label="Actions for {title}"`.
  - **Detail-client — builder**: Back button `aria-label="Go back"`. Drag handle `aria-label="Drag to reorder: {text}"`. Hide/show button uses `aria-label` (not `title`). Delete button `aria-label="Remove question: {text}"`. Required switch gets `aria-label`. "Req" label span marked `aria-hidden`.
  - **Detail-client — settings**: Link Expiry input/label wired with `id`/`htmlFor`.
  - **AddCustomQuestionDialog**: All label/input pairs wired: Question Text, Type (SelectTrigger accepts id), Options, Description/Help Text.
  - **SenderAssignmentsPanel**: Collaborator action buttons (copy, email, remove) use `aria-label` with collaborator name/email. Invite dialog email/name inputs wired with `id`/`htmlFor`.
  - **Theming**: `text-amber-500` → `text-warning` on active collaborator clock icon.
  - ESLint clean after all changes.


- **2026-04-14 (learnings backlog):** Closed every **`Status: pending`** in `.learnings/LEARNINGS.md` → **`resolved`** (verified in code) or **`promoted`** (rule already in `CLAUDE.md` / `AGENTS.md`). **`.learnings/*.md`** now has **zero** pending rows — new issues log as `pending` again until the next triage.

- **2026-04-14 (self-improvement workflow):** Triaged `.learnings/`; **LRN-20260414-013** (dedupe logs, align promoted docs ↔ code, mirror auth note in **`AGENTS.md`**); admin route adds **`Referer`** on Better Auth `fetch`; **ERR-20260414-003** / **LRN-20260414-011** notes updated. Earlier same day: **LRN-20260414-012** + **CLAUDE.md** template vs bank required; **LRN-20260414-010/011**, **ERR-20260414-002/003**; ESLint clean.

- **2026-04-14 (admin create user / Origin):** `src/app/api/admin/users/route.ts` — internal `fetch` to Better Auth admin `create-user` includes `Origin` from configured app base URL; avoids **Missing or null Origin** toast when creating users from Admin → Users.

- **2026-04-14 (template required flag):** Admin **Templates** dialog copied bank questions with `isRequired: false` always; `addQuestion` now uses the bank row’s `isRequired` so `template_question.is_required` matches the question bank when linking questions.

- **2026-04-14 (questionnaire type `pre_workshop`):** New preset **Pre-Workshop** — `QuestionnaireType` + DB enum (`drizzle/0003_pre_workshop_questionnaire_type.sql`); seed creates empty **Pre-Workshop** template if missing (admin links bank questions). Run **`npm run db:migrate`** or **`db:push`** after pull.

- **2026-04-14 (admin question bank UX):** Add/Edit **question** dialog matches template treatment (tall `90dvh` cap, ~`52rem` wide, scroll body, larger textareas for question / help text / options); **Help text** is a multi-line `Textarea`; category `Select` uses explicit `none` value when empty. Questions **table**: separate **Description** column; question + description use `wrap-break-word` (no truncation); wider page container; table in `overflow-x-auto` + `min-w-4xl`; template pills wrap with `wrap-break-word`. Save question failure toast shows API `error` when present.

- **2026-04-14 (admin template dialog UX):** New/Edit template dialog is much wider/taller (`max-w` up to ~88rem, ~92dvh height); bank + selected lists use flex fill + tall scroll panes; question text and **question descriptions** wrap fully (no `truncate`); search matches description; category shown on bank rows.

- **2026-04-14 (template create fix):** `POST /api/templates` expected `questions` as UUID strings; Admin UI sends `{ questionId, isRequired }[]`, so inserts used invalid `question_id` and save failed (e.g. large templates). POST now maps rows like PATCH; templates page toast shows API `error` when present.

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
- `HANDOFF.md` — post-audit batch (Clients a11y, dashboard charts lazy + sr-only table, `text-accent`)
- `src/app/(dashboard)/clients/page.tsx`, `src/app/(dashboard)/dashboard-client.tsx`, `src/app/(dashboard)/dashboard-chart-blocks.tsx` (new)
- `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx`, `src/components/shared/collaborator-panel.tsx`, `src/app/respond/[token]/page.tsx`

- `.learnings/LEARNINGS.md`, `HANDOFF.md` — learnings triage: all LRNs `resolved` or `promoted` (zero `pending`)
- `CLAUDE.md`, `AGENTS.md`, `.learnings/LEARNINGS.md`, `.learnings/ERRORS.md`, `HANDOFF.md` — self-improvement (**LRN-20260414-010/011/012/013**, ERR-20260414-002/003); **AGENTS.md** Better Auth server-`fetch` note; **LRN-013** process log
- `src/app/api/admin/users/route.ts` — `Origin` + `Referer` on Better Auth admin create-user server `fetch`; guard when base URL env missing

- `src/types/index.ts`, `src/lib/db/schema.ts`, `drizzle/0003_pre_workshop_questionnaire_type.sql`, `drizzle/meta/*` — `pre_workshop` enum + snapshot
- `src/lib/db/seed.ts` — seed Pre-Workshop template row when absent
- `src/app/api/templates/route.ts` — POST: correct `template_question` rows from `{ questionId, isRequired }[]`; guard missing template row
- `src/app/(dashboard)/admin/question-bank/page.tsx` — question dialog + questions table layout and full text visibility
- `src/app/(dashboard)/admin/templates/page.tsx` — larger dialog, wrapped question/description text, save toast on API error; bank → template copies `isRequired` from `GET /api/questions` (was hardcoded `false`)
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
1. **RLS / migrate:** Done for current Neon + Vercel setup. **Rollback** if ever needed: Neon backup branch from **`db:backup`**, or policy/SQL revert using **`drizzle/0006_rls_policies.sql`** as reference.
2. **Optional isolate dev DB:** If shared **`DATABASE_URL`** is too risky, create a Neon dev branch and point **local** `.env.local` at it only.
3. **Blob / file_upload:** If using uploads: ensure **`BLOB_READ_WRITE_TOKEN`** on Vercel + local; smoke **`/respond/[token]`** upload path.
4. **Product backlog:** Question JSON import/export UI; collaborator UX polish (see earlier HANDOFF bullets); periodic smoke on collaborative flow (Team, assign, submit).
5. **New clone / empty migration journal:** **`CLAUDE.md`** — **`db:baseline`** when **`0000`** fails with **`already exists`**; **`db:migrate:verbose`** when **`drizzle-kit migrate`** gives exit **1** without a clear error.

## Guardrails
- Preserve working logic unless a change is necessary
- Do not rewrite stable code just to reorganize it
- Prefer improving existing components over replacing them
- Keep the UI simple, clean, and lightweight
- Follow existing project patterns unless there is a good reason not to

## Known Decisions
- **RLS:** All app tables have RLS enabled + forced. Driver is `drizzle-orm/neon-serverless` (Pool). Every API route uses `withRls()` from `src/lib/db/rls-context.ts`. Better Auth tables are excluded. Migration: `drizzle/0006_rls_policies.sql`. Do NOT switch back to `neon-http` — it does not support transactions.
- **Single `DATABASE_URL` (local + Vercel):** One **`npm run db:migrate`** / baseline applies to both; no separate “production migrate” when URLs match.
- **Typography:** `next/font/google` — **IBM Plex Sans** (`--font-heading`, weights 500–700) + **Source Sans 3** (`--font-sans`, 400–600). Replaces Plus Jakarta Sans + Inter for a more distinctive B2B tooling feel.
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
