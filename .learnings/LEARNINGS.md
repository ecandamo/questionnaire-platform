# Learnings Log
<!-- Corrections, knowledge gaps, best practices -->

## [LRN-20260326-001] knowledge_gap

**Logged**: 2026-03-26T23:00:00Z
**Priority**: critical
**Status**: promoted
**Area**: config

### Summary
Next.js 16 renamed middleware to "proxy" — both the filename and the exported function name changed.

### Details
In Next.js 16 (Turbopack), the `middleware.ts` convention was deprecated and replaced with `proxy.ts`. The exported function must also be renamed from `middleware` to `proxy`. The `config` export with `matcher` still works the same way. The build will hard-fail if the file or export name is wrong.

### Suggested Action
- In any Next.js 16 project: create `src/proxy.ts`, export `function proxy(request: NextRequest)`
- Never create `src/middleware.ts` in Next.js 16+ projects

### Metadata
- Source: error
- Related Files: src/proxy.ts
- Tags: nextjs, breaking-change, routing, middleware
- See Also: ERR-20260326-001

### Resolution
- **Promoted**: CLAUDE.md, AGENTS.md

---

## [LRN-20260326-002] best_practice

**Logged**: 2026-03-26T23:10:00Z
**Priority**: high
**Status**: promoted
**Area**: backend

### Summary
Neon (and any external service) connections must be initialized lazily — never at module top-level — to avoid Next.js build failures.

### Details
Next.js evaluates module-level code at build time when collecting page data. Any module that calls `neon(process.env.DATABASE_URL!)` at the top level will throw during build if `DATABASE_URL` is absent (fresh clone, CI without env, etc.).

**Pattern that works:**
```ts
let _db: DB | undefined

export function getDb(): DB {
  if (!_db) _db = createDb()
  return _db
}

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    return (getDb() as any)[prop]
  },
})
```

This defers the neon() call until the first actual database query at runtime.

### Suggested Action
Apply this lazy initialization pattern to all external service clients (DB, Redis, email, etc.) in Next.js projects.

### Metadata
- Source: error
- Related Files: src/lib/db/index.ts
- Tags: neon, drizzle, nextjs, build, lazy-init
- See Also: ERR-20260326-002

### Resolution
- **Promoted**: CLAUDE.md, AGENTS.md

---

## [LRN-20260326-003] knowledge_gap

**Logged**: 2026-03-26T23:15:00Z
**Priority**: high
**Status**: promoted
**Area**: config

### Summary
This project uses the unified `radix-ui` package, not individual `@radix-ui/react-*` packages. All shadcn component imports must use `from "radix-ui"`.

### Details
The shadcn/ui components installed via the CLI import from the unified `radix-ui` package (introduced in radix-ui v1+), not from the scoped `@radix-ui/react-dialog`, `@radix-ui/react-select`, etc. packages.

Correct:
```ts
import { Dialog as DialogPrimitive } from "radix-ui"
```

Wrong (will cause module-not-found or type errors):
```ts
import * as DialogPrimitive from "@radix-ui/react-dialog"
```

Verify by checking any existing component: `head -5 src/components/ui/dropdown-menu.tsx`

### Suggested Action
Before writing manual shadcn component code, check existing components to confirm the import style used. Always match the project's installed pattern.

### Metadata
- Source: conversation
- Related Files: src/components/ui/dialog.tsx, src/components/ui/sheet.tsx
- Tags: radix-ui, shadcn, imports

### Resolution
- **Promoted**: CLAUDE.md

---

## [LRN-20260326-004] best_practice

**Logged**: 2026-03-26T23:20:00Z
**Priority**: medium
**Status**: resolved
**Area**: backend

### Summary
Drizzle ORM `eq()` with a pgEnum column requires passing the exact enum value type — casting to a generic string silently breaks TypeScript inference.

### Details
When using `eq(table.enumColumn, value)`, Drizzle's overloaded types require `value` to match the enum's literal union (e.g., `"short_text" | "long_text" | ...`). Passing `value as string` or `value as Parameters<typeof eq>[1]` fails type-checking.

**Correct approach:**
```ts
eq(question.type, type as "short_text" | "long_text" | "number" | ...)
```

Or better, narrow the type before calling:
```ts
const validType = type as QuestionType
eq(question.type, validType)
```

### Suggested Action
Define a reusable `QuestionType` union and cast API input values to it before passing to Drizzle queries.

### Metadata
- Source: error
- Related Files: src/app/api/questions/route.ts
- Tags: drizzle, typescript, enums

### Resolution
- **Resolved**: 2026-04-14 — `GET /api/questions` filters with `eq(question.type, type as QuestionType)`; keep using shared `QuestionType` for enum query params.

---

## [LRN-20260327-001] best_practice

**Logged**: 2026-03-27T00:00:00Z
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
Use inline SVGs (not `next/image`) when embedding brand SVGs that need color variants (e.g., white-on-dark vs. color-on-light).

### Details
`next/image` treats SVGs as opaque images — you cannot change fill/stroke colors via props or CSS classes without a custom SVG loader. Inline JSX SVGs allow per-instance color overrides (change `fill` attributes directly) and keep the bundle free of an extra network request.

For this project: `logo-white.svg` and `logo.svg` were saved to `public/` as references, but the sidebar and login page use inline SVG elements so the white and navy variants can coexist without two separate files or CSS filter hacks.

### Suggested Action
For small brand logos that need color variants in different UI contexts, prefer inline SVG over `next/image`.

### Metadata
- Source: conversation
- Related Files: src/components/layout/sidebar.tsx, src/app/(auth)/login/page.tsx
- Tags: svg, nextjs, branding

### Resolution
- **Resolved**: 2026-04-14 — Brand surfaces use shared `ApiLogo` / inline SVG pattern; entry kept as historical design rationale.

---

## [LRN-20260327-002] best_practice

**Logged**: 2026-03-27T00:05:00Z
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
When updating branding colors, the dark sidebar pattern (dark navy bg + brand-accent active items) aligns well with enterprise SaaS conventions and makes brand colors immediately visible.

### Details
The sidebar CSS variables (`--sidebar`, `--sidebar-primary`, etc.) are independent of the main theme variables, making it safe to give the sidebar a dark navy background even in the light theme. The active item uses the brand green (`#78BC43`), giving users immediate visual feedback in a branded color rather than a generic blue.

### Metadata
- Source: conversation
- Related Files: src/app/globals.css, src/components/layout/sidebar.tsx
- Tags: theming, branding, sidebar, oklch

### Resolution
- **Resolved**: 2026-04-14 — Sidebar tokens and layout match this direction; entry kept as design rationale.

---

## [LRN-20260326-005] best_practice

**Logged**: 2026-03-26T23:25:00Z
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
Recharts `<Tooltip>` `formatter` prop requires its return type to match `ValueType` which may be `undefined`. Avoid typing the callback parameter as `number` directly.

### Details
The Recharts `Formatter<ValueType, NameType>` type uses generic `ValueType` which extends `number | string | Array<...>` but can also be undefined in some payloads. Typing the callback as `(value: number, name: string) => [number, string]` produces a TS error because `undefined` is not assignable to `number`.

**Fix:** Remove the `formatter` prop if formatting is not needed, or use a type-safe cast:
```tsx
formatter={(value) => [Number(value), String(name)]}
```

### Suggested Action
When adding Recharts tooltips, omit `formatter` unless necessary. If needed, cast `value` with `Number(value)` rather than typing it as `number`.

### Metadata
- Source: error
- Related Files: src/app/(dashboard)/dashboard-client.tsx
- Tags: recharts, typescript, charts

### Resolution
- **Resolved**: 2026-04-14 — Dashboard `Tooltip` usage omits `formatter`; guidance remains for future charts.

---

## [LRN-20260328-001] best_practice

**Logged**: 2026-03-28T12:00:00Z
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Integrating third-party “shadcn” button snippets that use Material-style ripples in this repo requires three adaptations: unified Radix `Slot`, Tailwind 4 duration/delay classes, and optional legacy variant mapping.

### Details
1. **Radix:** This project uses the unified `radix-ui` package, not `@radix-ui/react-slot`. Use `import { Slot } from "radix-ui"` and `<Slot.Root>` for `asChild`, matching other UI components.
2. **Tailwind 4:** Classes like `duration-600` and `delay-250` are not on the default scale; use `duration-[600ms]` and `delay-[250ms]` (or documented scale tokens) or the animation may silently omit timing.
3. **Client boundary:** Ripple logic uses hooks + Web Animations API — add `"use client"` on the MD3 file.
4. **API compatibility:** MD3 CVA often names variants `filled` / `outlined` / `tonal` / `text` while existing apps use `default` / `outline` / `secondary` / `ghost` / `link`. A thin `button.tsx` shim that maps names avoids touching every consumer. Add missing sizes (`icon-sm`, etc.) to MD3 CVA if the old design used them.
5. **Theme:** Ignore bundled `index.css`/HSL theme blocks from external prompts when `globals.css` already defines tokens — the component should use semantic classes (`bg-primary`, etc.) only.

### Suggested Action
When pasting external button components: grep for `@radix-ui/react-slot`, verify CVA sizes/variants against `grep '<Button'` in `src/`, and keep a single export path (`@/components/ui/button`) so Server Components can import the client button without changing pages.

### Metadata
- Source: implementation
- Related Files: src/components/ui/material-design-3-button.tsx, src/components/ui/button.tsx
- Tags: shadcn, radix-ui, tailwind4, nextjs, button, ripple

### Resolution
- **Resolved**: 2026-04-14 — MD3 button + shim live in repo; use this entry when pasting new third-party button snippets.

---

## [LRN-20260401-001] best_practice

**Logged**: 2026-04-01
**Priority**: medium
**Status**: resolved
**Area**: frontend + api

### Summary
Published **share URLs** must be loadable from the server on every questionnaire fetch—not only from the publish POST response—so the Share tab and banner stay correct after refresh. Child UI that mirrors a parent prop should not freeze the first `null` in `useState(initialProp)` without syncing when the prop updates.

### Details
1. **API:** Extend `GET /api/questionnaires/[id]` to return `shareUrl` when an **active** `share_link` exists (same URL shape as publish). Parent `load()` then calls `setShareUrl(d.shareUrl ?? null)`.
2. **Components:** Prefer using the prop directly (e.g. `ShareLinkPanel` takes `shareUrl` only) or `useEffect(() => setLocal(shareUrl), [shareUrl])`. Otherwise the Share tab can show “no link” right after publish while the parent state is correct.

### Suggested Action
Whenever a mutation returns a URL/token the user must see again later, persist it in the DB and **re-hydrate** on the standard GET used by the detail page.

### Metadata
- Source: session / bugfix
- Related Files: `src/app/api/questionnaires/[id]/route.ts`, `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx`
- Tags: share-link, hydration, react-state

### Resolution
- **Resolved**: 2026-04-14 — `GET /api/questionnaires/[id]` returns `shareUrl`; detail client hydrates `shareUrl` on `load()`; `ShareLinkPanel` is prop-driven.

---

## [LRN-20260401-002] best_practice

**Logged**: 2026-04-01
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
When removing a **response collaborator**, delete their **answers** (by assignment + `last_updated_by_collaborator_id`) **before** deleting `question_assignment` rows—otherwise assignment IDs are gone and cleanup cannot find which question rows to clear.

### Details
Centralize in a helper (e.g. `deleteAnswersForRemovedCollaborator(responseId, collaboratorId)`) and call it first in both DELETE handlers (respond flow + dashboard collaborators).

### Metadata
- Source: session / feature
- Related Files: `src/lib/collaborator-cleanup.ts`, collaborator DELETE routes
- Tags: collaboration, drizzle, cascade

### Resolution
- **Resolved**: 2026-04-14 — `deleteAnswersForRemovedCollaborator` runs before assignment delete on collaborator DELETE routes.

---

## [LRN-20260401-003] best_practice

**Logged**: 2026-04-01
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
After **team changes** on the respondent page (invite/remove collaborator), **refetch the share payload** (`GET /api/share/[token]`) and merge answers + attribution into parent state so progress and deleted collaborator answers match the DB—no full page reload required.

### Details
Expose `onTeamChanged` from the team panel; parent implements refresh the same way it already refreshes attribution after save. Note: replacing answers from the server can overwrite **unsaved** local edits for questions with no row yet; autosave mitigates most cases.

### Metadata
- Source: session / feature
- Related Files: `src/app/respond/[token]/page.tsx`, `src/components/shared/collaborator-panel.tsx`
- Tags: collaboration, data-sync

### Resolution
- **Resolved**: 2026-04-14 — `CollaboratorPanel` exposes `onTeamChanged`; respond page passes `refreshShareSnapshot`.

---

## [LRN-20260401-004] best_practice

**Logged**: 2026-04-01
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
**Section headers** must be excluded from **visible question numbering** and from **“answered / total”** denominators everywhere (respond UI, builder, responses viewer). Use one shared helper over the ordered question list (e.g. `answerableDisplayNumbers` skipping `type === "section_header"`).

### Metadata
- Source: session / feature
- Related Files: `src/lib/question-sections.ts`
- Tags: questionnaire, ux

### Resolution
- **Resolved**: 2026-04-14 — `answerableDisplayNumbers` (and related helpers) used from respond, builder, and responses viewer.

---

## [LRN-20260409-001] best_practice

**Logged**: 2026-04-09
**Priority**: medium
**Status**: resolved
**Area**: backend

### Summary
Use a **`DELETE ?permanent=true`** query-flag pattern to offer both soft (default) and hard (permanent) delete on the same route, consistent across all admin-managed entities in this project.

### Details
Three entity types now follow this convention:
- `questionnaire` — `DELETE /api/questionnaires/[id]?permanent=true` (admin-only): hard deletes row + all cascaded children via DB FK cascade.
- `question` — `DELETE /api/questions/[id]?permanent=true` (admin-only): hard deletes row; `template_question` cascade-removes; `questionnaire_question.sourceQuestionId` → null (existing snapshots unaffected).
- `template` — `DELETE /api/templates/[id]?permanent=true` (admin-only): hard deletes row; `template_question` cascade-removes; `questionnaire.templateId` → null (existing questionnaires unaffected).

Default `DELETE` (no flag):
- questions → `status: "archived"` (soft archive)
- templates → `isActive: false` (deactivate)
- questionnaires → `status: "archived"` (soft archive)

Pattern: read `req.nextUrl.searchParams.get("permanent") === "true"`, require row exists (404 if not), branch, then `logAudit` with `action: "delete"` vs `action: "archive"/"deactivate"`.

### Metadata
- Source: implementation
- Related Files: `src/app/api/questions/[id]/route.ts`, `src/app/api/templates/[id]/route.ts`, `src/app/api/questionnaires/[id]/route.ts`
- Tags: api, delete, soft-delete, admin, drizzle

### Resolution
- **Resolved**: 2026-04-14 — `permanent=true` branches verified on questions, templates, questionnaires DELETE routes.

---

## [LRN-20260409-002] best_practice

**Logged**: 2026-04-09
**Priority**: medium
**Status**: resolved
**Area**: backend + admin

### Summary
**Question bank CSV import** uses `POST /api/questions/import` with `multipart/form-data` (`file`, optional `createMissingCategories=true`). Parse with **papaparse**; validate row shape in `src/lib/question-csv-import.ts` before any DB writes. **Neon HTTP** driver has no Drizzle transaction in this repo — use **validate-all-then-insert** plus **manual rollback** (delete inserted `question` ids on failure). Import is **bank-only** (no `template_question` writes).

### Details
- **Options column:** pipe-separated (`|`), aligned with UI “one per line” mentally but CSV-friendly.
- **Templates:** assign imported questions in **Admin → Templates** after import. `GET /api/questions` enriches each row with `templates: { id, name }[]` for the bank table (**Orphan** in UI when empty).
- **Sort order:** CSV `sort_order` maps to `question.sortOrder`; default row index when omitted.
- **Sample file:** `public/samples/question-bank-import-sample.csv`

### Metadata
- Source: implementation
- Related Files: `src/app/api/questions/import/route.ts`, `src/lib/question-csv-import.ts`, `src/app/(dashboard)/admin/question-bank/page.tsx`
- Tags: csv, import, admin, papaparse, drizzle

### Resolution
- **Resolved**: 2026-04-14 — Import route + `question-csv-import` + admin UI remain the reference implementation.

---

## [LRN-20260401-005] best_practice

**Logged**: 2026-04-01
**Priority**: medium
**Status**: promoted
**Area**: tooling

### Summary
Cursor/VS Code **folder emphasis** (“contains emphasized items”) usually means files under that folder have **ESLint or TS diagnostics**. `eslint-config-next` + React Compiler-related rules flag: **`react-hooks/purity`** (`Date.now` / `Math.random` / impure calls in render), **`react-hooks/preserve-manual-memoization`** (`useMemo` deps must match inferred dependencies), **hooks calling functions declared below** (`useEffect` before `handleSave`), and **`react/no-unescaped-entities`** in JSX text.

### Suggested Action
Run `npx eslint src` after UI refactors. Move impure date/random work to `useEffect`, module-level helpers called only from event handlers, or `crypto.randomUUID()` in handlers; move effects **below** the functions they invoke (or use `useCallback` + stable deps carefully).

### Metadata
- Source: session / diagnostics
- Tags: eslint, react-compiler, cursor
- See Also: LRN-20260414-009 (2026-04-14 recurrence: exhaustive-deps + `useCallback` / ref-based autosave)

### Resolution
- **Promoted**: `AGENTS.md` (Self-Improvement), `CLAUDE.md` (Self-Improvement) — Cursor emphasized folders + `exhaustive-deps` / autosave patterns
- **Notes**: 2026-04-14 triage — duplicate of thread in LRN-20260414-009; keep both entries linked via See Also.

---

## [LRN-20260414-001] best_practice

**Logged**: 2026-04-14
**Priority**: high
**Status**: promoted
**Area**: backend

### Summary
Reopening a submitted questionnaire must reset the **`response`** row (e.g. `status` back to `in_progress`, clear `submittedAt`), not only `questionnaire.status` and `share_link`. The public `/api/share/[token]` payload includes `responseStatus`; the respond UI and `POST …/answers` both treat `submitted` on the response as final.

### Metadata
- Source: bugfix
- Related Files: `src/app/api/questionnaires/[id]/reopen/route.ts`, `src/app/api/share/[token]/route.ts`
- Tags: questionnaire, reopen, response

### Resolution
- **Promoted**: `CLAUDE.md` — “Questionnaires & public responses”
- **Notes**: Reopen route updated in code to reset `response` (+ collaborator `completed` → `active`); respond page syncs `submitted` from `responseStatus`.

---

## [LRN-20260414-002] best_practice

**Logged**: 2026-04-14
**Priority**: low
**Status**: resolved
**Area**: frontend / UX

### Summary
**Row-level overflow menus** (three dots) should stay **visible by default** when they are the primary way to reach actions (duplicate, archive, delete). Hiding the trigger with `opacity-0` until `group-hover` matches a “clean table” aesthetic but **hurts discoverability**; users may not realize actions exist.

### Details
The questionnaires table used `group` on `<tr>` and `opacity-0 group-hover:opacity-100` on the `DropdownMenuTrigger` button. Fix: remove those classes so the ghost icon button is always opaque; optional follow-up is muted idle color (`text-muted-foreground hover:text-foreground`) if contrast feels loud.

When design notes in `HANDOFF.md` describe old behavior (“fades in on row hover”), update that line in the same change so future agents do not reintroduce the pattern by mistake.

### Metadata
- Source: user feedback + implementation
- Related Files: `src/app/(dashboard)/questionnaires/questionnaires-client.tsx`, `HANDOFF.md`
- Tags: accessibility, discoverability, tailwind, data-table

### Resolution
- **Resolved**: 2026-04-14 (self-improvement review)
- **Notes**: `questionnaires-client.tsx` no longer uses hover-only opacity on the row actions trigger; `HANDOFF.md` lists row actions as always visible.

---

## [LRN-20260414-003] best_practice

**Logged**: 2026-04-14
**Priority**: high
**Status**: promoted
**Area**: config / tooling

### Summary
**`drizzle-kit push` (and `generate` / `migrate`) does not load `.env.local`.** Only the Next.js dev server loads that file by default, so `process.env.DATABASE_URL` is empty in `drizzle.config.ts` unless you export it in the shell or read env files explicitly.

### Details
Symptom: `Error Either connection "url" or "host", "database" are required for PostgreSQL database connection` when running `npm run db:push` despite `.env.local` containing `DATABASE_URL`.

**Fix in this repo:** `drizzle.config.ts` calls `ensureDatabaseUrlFromEnvFiles()` to parse `DATABASE_URL` from `.env.local` then `.env` before `defineConfig`.

### Suggested Action
- In any Next + Drizzle project: either use `dotenv/config`, `node --env-file=.env.local`, or a small file reader in `drizzle.config.ts` so CLI commands match local app env.

### Metadata
- Source: session / user report
- Related Files: `drizzle.config.ts`
- Tags: drizzle, neon, env, drizzle-kit

### Resolution
- **Promoted**: `CLAUDE.md` (Database Initialization), `AGENTS.md` (Database section)

---

## [LRN-20260414-004] best_practice

**Logged**: 2026-04-14
**Priority**: high
**Status**: promoted
**Area**: backend / product

### Summary
**Custom questionnaires have zero `questionnaire_question` rows until `PATCH` saves the builder list.** **`POST …/publish`** only updates questionnaire status and creates `share_link`; it does not send questions. Publishing without persisting first yields an **empty respond page** (API returns `questions: []`).

### Details
Preset flows that `INSERT` template questions at questionnaire creation time mask the issue. **Custom** type creates the questionnaire row only; questions exist in React state until Save.

**Fix:** `handlePublish` calls the same persist payload as Save before `POST /publish`.

### Suggested Action
- Any “publish” or “activate” action that snapshots content must either require an explicit save or auto-persist the draft in the same request.

### Metadata
- Source: bugfix / user report
- Related Files: `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx`, `src/app/api/questionnaires/[id]/publish/route.ts`
- Tags: questionnaire, publish, draft

### Resolution
- **Promoted**: `CLAUDE.md` (Questionnaires & public responses), `AGENTS.md`

---

## [LRN-20260414-005] knowledge_gap

**Logged**: 2026-04-14
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
**Postgres `uuid` columns reject non-UUID strings.** Client-generated ids like `custom-<uuid>` or `temp-<uuid>` (string prefix + UUID) are **invalid** for `questionnaire_question.id`, so `INSERT` on draft save fails and the UI shows a generic “Failed to save”.

### Details
Use `crypto.randomUUID()` (or server-generated ids) for new rows intended for `uuid` PK columns.

### Suggested Action
- Grep for temp-id patterns before save paths that bulk-insert client ids.

### Metadata
- Source: bugfix
- Related Files: `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx`
- Tags: postgres, uuid, drizzle

### Resolution
- **Resolved**: 2026-04-14 — `newClientQuestionId()` returns `randomUUID()` only; `PATCH` insert errors surfaced as JSON `error` + toast.

---

## [LRN-20260414-006] best_practice

**Logged**: 2026-04-14
**Priority**: medium
**Status**: resolved
**Area**: backend / infra

### Summary
**Vercel Blob file uploads for this app:** use **client uploads** (`upload()` from `@vercel/blob/client` + `handleUpload` on `POST /api/blob`) so files are not limited by the **4.5 MB** Vercel Function request body cap. Store **`access: "public"`** if answers keep a plain URL in `answer.value` and the response viewer links directly — **private** blobs need signed reads or a proxy, which the current UI does not implement.

### Metadata
- Source: implementation / planning
- Related Files: `src/app/api/blob/route.ts`, `src/app/respond/[token]/page.tsx`
- Tags: vercel-blob, uploads, storage

### Resolution
- **Resolved**: 2026-04-14 — Client upload + `POST /api/blob` + public URLs in answers match this guidance; re-open if switching to private blobs.

---

## [LRN-20260414-007] best_practice

**Logged**: 2026-04-14
**Priority**: medium
**Status**: resolved
**Area**: security / ops

### Summary
**Never paste full `DATABASE_URL` (or any secret-bearing connection string) into chat, tickets, or screenshots.** Treat it as compromised: **rotate the Neon password**, update Vercel + local env, redeploy.

### Metadata
- Source: session reminder
- Tags: secrets, neon, ops

### Resolution
- **Resolved**: 2026-04-14 — Standing operational policy (not a defect); kept for onboarding. Rotate credentials if secrets ever leak.

---

## [LRN-20260414-008] best_practice

**Logged**: 2026-04-14
**Priority**: medium
**Status**: resolved
**Area**: frontend / Next.js App Router

### Summary
After a successful **client-side submit**, do not set **local React state** that switches the *same* route to a different “terminal” UI **before** `router.push` to the real destination page. The next paint can show the wrong screen for a frame (or until navigation completes).

### Details
On `src/app/respond/[token]/page.tsx`, owner submit did `setSubmitted(true)` then `router.push(\`/respond/${token}/confirmation\`)`. The `submitted` branch renders a full-page **“Already Submitted”** message (intended when `GET /api/share/...` returns `responseStatus === "submitted"` on load). That branch ran **between** submit success and arrival on `/respond/[token]/confirmation`, so users saw a quick **Already Submitted** flash, then **Thank you!**.

**Fix:** on successful owner submit, only `router.push(...)` to confirmation; leave `submitted` to be set from the API on later visits. Contributors who use `setMarkedComplete(true)` without navigation still need that in-page terminal state.

### Suggested Action
When success UX lives on **another route**, prefer **navigation alone** (or an explicit lightweight “Redirecting…” state) over reusing a state flag that means something else in-context (e.g. “already submitted on revisit”).

### Metadata
- Source: investigation + fix
- Related Files: `src/app/respond/[token]/page.tsx`, `src/app/respond/[token]/confirmation/page.tsx`
- Tags: react, nextjs, client-navigation, ux, state
- See Also: HANDOFF.md (2026-04-14 submit → confirmation UX)

### Resolution
- **Resolved**: 2026-04-14 — removed `setSubmitted(true)` before `router.push` to confirmation.

---

## [LRN-20260414-009] best_practice

**Logged**: 2026-04-14T12:00:00Z
**Priority**: medium
**Status**: promoted
**Area**: frontend / tooling

### Summary
**(1) Cross-session answer fields** (e.g. file upload/remove on tokenized respond pages): persist to the API **right after** the change, not only on a long **autosave** interval—otherwise other viewers (collaborators, second browser) still see the old DB value. **(2) Hooks lint:** `react-hooks/exhaustive-deps` on `useEffect(() => { load() }, [id])` is fixed by **`load` in `useCallback`** with correct deps and **`useEffect(..., [load])`**. **Interval saves** should read latest form state via a **ref** and call a **stable** `persistSnapshot` helper so the effect does not omit or stale-close over `handleSave` / `answers`.

### Suggested Action
- After changing shared answers from the client, trigger the same `POST …/answers` path used for manual save with an explicit snapshot when needed.
- When ESLint reports missing `load`/`fetchX` in effect deps, prefer `useCallback` + `[callback]` over disabling the rule.

### Metadata
- Source: self-improvement workflow / session fixes
- Related Files: `src/app/respond/[token]/page.tsx`, `src/app/(dashboard)/questionnaires/[id]/detail-client.tsx`, `src/components/shared/collaborator-panel.tsx`
- Tags: eslint, react-hooks, autosave, collaboration, vercel-blob
- See Also: LRN-20260401-005
- Pattern-Key: hooks.exhaustive_deps.data_loaders

### Resolution
- **Promoted**: `AGENTS.md` (Self-Improvement), `CLAUDE.md` (Self-Improvement)
- **Notes**: `npx eslint "src/**/*.{ts,tsx}"` now clean; respond page file upload/remove calls persist immediately; loaders wrapped in `useCallback` across dashboard + collaborator panel.

---

## [LRN-20260414-010] best_practice

**Logged**: 2026-04-14T18:00:00Z
**Priority**: medium
**Status**: promoted
**Area**: backend

### Summary
**`POST` and `PATCH` on the same resource should accept the same nested payload shapes.** `POST /api/templates` treated `body.questions` as `string[]` (UUIDs) while the Admin UI and `PATCH` both send **`{ questionId, isRequired }[]`**, causing DB insert failures and a generic **“Failed to save template”** toast.

### Suggested Action
When adding a create handler after an update handler (or vice versa), diff the client `fetch` body and both route handlers; add a shared zod schema or typed mapper if the shape is non-trivial.

### Metadata
- Source: bugfix + user report
- Related Files: `src/app/api/templates/route.ts`, `src/app/(dashboard)/admin/templates/page.tsx`
- Tags: api, templates, drizzle, json
- See Also: LRN-20260414-012 (bank `isRequired` must populate `isRequired` in template dialog rows)

### Resolution
- **Promoted**: `CLAUDE.md` — “Admin presets & Better Auth”
- **Notes**: POST now maps `questionId` / `isRequired` like PATCH; save failure toast reads JSON `error` when present.

---

## [LRN-20260414-011] best_practice

**Logged**: 2026-04-14T18:00:00Z
**Priority**: medium
**Status**: promoted
**Area**: backend / auth

### Summary
**Better Auth endpoints invoked via server `fetch` may require an `Origin` header** matching the app base URL. Admin **Create user** called `create-user` without `Origin` and received **“Missing or null Origin”**.

### Suggested Action
For any internal `fetch` to Better Auth from Next route handlers, set **`Origin`** (and usually **`Referer`**) from **`BETTER_AUTH_URL`** / **`NEXT_PUBLIC_APP_URL`**; fail fast if neither is configured.

### Metadata
- Source: bugfix
- Related Files: `src/app/api/admin/users/route.ts`
- Tags: better-auth, headers, admin

### Resolution
- **Promoted**: `CLAUDE.md` — “Admin presets & Better Auth”; `AGENTS.md` — “Better Auth from route handlers”
- **Notes**: Route derives base URL and sets `Origin` + `Referer` on the internal request; 500 if base URL env missing.

---

## [LRN-20260414-012] knowledge_gap

**Logged**: 2026-04-14T20:30:00Z
**Priority**: medium
**Status**: resolved
**Area**: frontend / admin

### Summary
Bank questions marked **required** did not appear required on questionnaires created from a **preset template** because Admin → Templates built each selected row with **`isRequired: false`**, ignoring `question.is_required`. `template_question.is_required` is the source of truth for snapshots, not the bank column alone.

### Details
- `GET /api/questions` already returns `isRequired`; the local `Question` type in `templates/page.tsx` omitted it.
- `addQuestion()` always pushed `isRequired: false`, so POST/PATCH saved wrong flags. Seed code correctly used `q.isRequired` when linking seeded questions — only the admin UI was wrong.
- Questionnaires created from a template read `template_question.isRequired` in `POST /api/questionnaires` when inserting `questionnaire_question`.

### Suggested Action
When UI materializes join-table rows from a catalog, copy overlapping columns from the catalog payload (or document intentional overrides). Diff `fetch` bodies vs handler expectations after any create/patch pair (see LRN-20260414-010).

### Metadata
- Source: user question + code review
- Related Files: `src/app/(dashboard)/admin/templates/page.tsx`, `src/app/api/questionnaires/route.ts`
- Tags: templates, question-bank, isRequired, admin
- See Also: LRN-20260414-010

### Resolution
- **Resolved**: 2026-04-14 — `Question` includes `isRequired`; `addQuestion` sets `isRequired: q.isRequired`.
- **Promoted**: `CLAUDE.md` — “Template vs bank required” under Admin presets

---

## [LRN-20260414-013] best_practice

**Logged**: 2026-04-14T22:00:00Z
**Priority**: low
**Status**: resolved
**Area**: docs / process

### Summary
Self-improvement pass after a fix: **dedupe logs**, **align code with promoted text**, and **mirror critical auth notes in `AGENTS.md`** so Cursor-only agents see them without opening `CLAUDE.md`.

### Details
- `ERR-20260414-003` and `LRN-20260414-011` already captured the Better Auth **Missing or null Origin** issue; avoid duplicate new entries for the same incident.
- If `CLAUDE.md` says to send **`Referer`** as well as **`Origin`**, implement both so promoted docs stay truthful.
- Quick backlog scan: search `.learnings/LEARNINGS.md` for **`Status: pending`** — periodically promote, resolve, or link duplicates.

### Suggested Action
After logging a learning, if the rule is promoted to one agent file, consider the other (`AGENTS.md` ↔ `CLAUDE.md`) when the behavior is stack-wide.

### Metadata
- Source: user request (self-improvement workflow)
- Related Files: `.learnings/LEARNINGS.md`, `.learnings/ERRORS.md`, `AGENTS.md`, `src/app/api/admin/users/route.ts`
- Tags: self-improvement, better-auth, documentation
- See Also: LRN-20260414-011, ERR-20260414-003

### Resolution
- **Resolved**: 2026-04-14 — `AGENTS.md` mirrors Better Auth `Origin`/`Referer` guidance; `create-user` route sends both; dedupe noted for ERR/LRN pairs.

---

## [LRN-20260423-001] best_practice

**Logged**: 2026-04-23T00:00:00Z
**Priority**: high
**Status**: promoted
**Area**: frontend

### Summary
`DragOverlay` from `@dnd-kit/core` renders inline (no portal) and uses `position: fixed`, which breaks inside CSS-transformed ancestors such as Radix UI `DialogContent`.

### Details
Radix UI `DialogContent` uses `position: fixed; transform: translate(-50%, -50%)` to center itself in the viewport. Any `position: fixed` descendant rendered inside this element is positioned relative to the Dialog's containing block rather than the viewport. Because dnd-kit's `DragOverlay` renders inline inside the `DndContext` DOM subtree (not via a portal to `document.body`), it inherits this broken fixed-positioning context.

This caused the drag preview ghost to appear consistently offset downward by the Dialog's top position (~4dvh on most screens), regardless of modifier math applied to the transform — because the coordinate systems for `getBoundingClientRect()` (viewport-relative) and the overlay's CSS `fixed` position (dialog-relative) were mismatched.

Multiple failed attempts were made before diagnosing the root cause:
1. Default DragOverlay (no modifier) → ghost "too far down"
2. `snapCenterToCursor` modifier (from `@dnd-kit/modifiers`) → ghost jumps on drag start because it uses the original row's rect size, not the overlay's
3. Custom modifier: top-left of overlay at cursor → still offset (same coordinate mismatch)
4. Custom modifier: center overlay on cursor using `overlayNodeRect` → Y still wrong because `overlayNodeRect` is null/zero for first frames after portal mount
5. Custom modifier: center overlay using `overlayElRef.current.offsetHeight` → horizontal works, vertical still wrong — root cause finally identified

**Root cause**: `position: fixed` inside a CSS `transform`ed ancestor creates a new stacking/containing block. dnd-kit DragOverlay does not escape this.

### Correct Solution
Replace `DragOverlay` with a `createPortal(…, document.body)` rendered directly into `document.body`, completely outside the Dialog's DOM subtree. Use `position: fixed; top: 0; left: 0` on the portal div and update its position via direct DOM style mutations (`el.style.left`, `el.style.top`) in a `pointermove` listener. This escapes the Dialog's coordinate space entirely.

Key implementation details:
- Render via `createPortal(<div ref={portalOverlayRef} style={{ position: "fixed", top: 0, left: 0 }}>, document.body)` controlled by a drag state flag
- In `pointermove` handler: `el.style.left = clientX - el.offsetWidth/2; el.style.top = clientY - el.offsetHeight/2` — centers the card on cursor using live DOM measurements
- On drag start: use `requestAnimationFrame(() => { /* set initial position */ })` so the portal element is mounted before measuring
- No dnd-kit modifier needed at all

```tsx
// ✅ Correct: portal to document.body, direct DOM position updates
{dragOverlay && typeof document !== "undefined" && createPortal(
  <div
    ref={portalOverlayRef}
    style={{ position: "fixed", top: 0, left: 0, zIndex: 9999, pointerEvents: "none" }}
    className="…card styles…"
  >
    {/* overlay content */}
  </div>,
  document.body
)}

// In pointermove handler:
const el = portalOverlayRef.current
if (el) {
  el.style.left = `${e.clientX - el.offsetWidth / 2}px`
  el.style.top = `${e.clientY - el.offsetHeight / 2}px`
}
```

```tsx
// ❌ Wrong: DragOverlay inside Dialog — coordinate mismatch, no modifier can fix it
<DragOverlay modifiers={[anyModifier]}>…</DragOverlay>
```

### Suggested Action
- Whenever `DragOverlay` is used inside a Radix UI `Dialog`, `Sheet`, `Popover`, or any component that applies CSS `transform` to a fixed ancestor: always use `createPortal` to `document.body` instead.
- This pattern should be the default for any drag-and-drop UI inside modals.

### Metadata
- Source: user_feedback — iterative debugging session 2026-04-23
- Related Files: `src/app/(dashboard)/admin/templates/page.tsx`
- Tags: dnd-kit, drag-and-drop, DragOverlay, portal, radix-ui, dialog, position-fixed, css-transform, coordinate-system
- Pattern-Key: frontend.dnd-overlay-in-modal
- Recurrence-Count: 1
- First-Seen: 2026-04-23
- Last-Seen: 2026-04-23

---
