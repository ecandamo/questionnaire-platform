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
**Status**: pending
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

---

## [LRN-20260327-001] best_practice

**Logged**: 2026-03-27T00:00:00Z
**Priority**: low
**Status**: pending
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

---

## [LRN-20260327-002] best_practice

**Logged**: 2026-03-27T00:05:00Z
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
When updating branding colors, the dark sidebar pattern (dark navy bg + brand-accent active items) aligns well with enterprise SaaS conventions and makes brand colors immediately visible.

### Details
The sidebar CSS variables (`--sidebar`, `--sidebar-primary`, etc.) are independent of the main theme variables, making it safe to give the sidebar a dark navy background even in the light theme. The active item uses the brand green (`#78BC43`), giving users immediate visual feedback in a branded color rather than a generic blue.

### Metadata
- Source: conversation
- Related Files: src/app/globals.css, src/components/layout/sidebar.tsx
- Tags: theming, branding, sidebar, oklch

---

## [LRN-20260326-005] best_practice

**Logged**: 2026-03-26T23:25:00Z
**Priority**: low
**Status**: pending
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

---

## [LRN-20260328-001] best_practice

**Logged**: 2026-03-28T12:00:00Z
**Priority**: medium
**Status**: pending
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

---

## [LRN-20260401-001] best_practice

**Logged**: 2026-04-01
**Priority**: medium
**Status**: pending
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

---

## [LRN-20260401-002] best_practice

**Logged**: 2026-04-01
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
When removing a **response collaborator**, delete their **answers** (by assignment + `last_updated_by_collaborator_id`) **before** deleting `question_assignment` rows—otherwise assignment IDs are gone and cleanup cannot find which question rows to clear.

### Details
Centralize in a helper (e.g. `deleteAnswersForRemovedCollaborator(responseId, collaboratorId)`) and call it first in both DELETE handlers (respond flow + dashboard collaborators).

### Metadata
- Source: session / feature
- Related Files: `src/lib/collaborator-cleanup.ts`, collaborator DELETE routes
- Tags: collaboration, drizzle, cascade

---

## [LRN-20260401-003] best_practice

**Logged**: 2026-04-01
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
After **team changes** on the respondent page (invite/remove collaborator), **refetch the share payload** (`GET /api/share/[token]`) and merge answers + attribution into parent state so progress and deleted collaborator answers match the DB—no full page reload required.

### Details
Expose `onTeamChanged` from the team panel; parent implements refresh the same way it already refreshes attribution after save. Note: replacing answers from the server can overwrite **unsaved** local edits for questions with no row yet; autosave mitigates most cases.

### Metadata
- Source: session / feature
- Related Files: `src/app/respond/[token]/page.tsx`, `src/components/shared/collaborator-panel.tsx`
- Tags: collaboration, data-sync

---

## [LRN-20260401-004] best_practice

**Logged**: 2026-04-01
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
**Section headers** must be excluded from **visible question numbering** and from **“answered / total”** denominators everywhere (respond UI, builder, responses viewer). Use one shared helper over the ordered question list (e.g. `answerableDisplayNumbers` skipping `type === "section_header"`).

### Metadata
- Source: session / feature
- Related Files: `src/lib/question-sections.ts`
- Tags: questionnaire, ux

---

## [LRN-20260409-001] best_practice

**Logged**: 2026-04-09
**Priority**: medium
**Status**: pending
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

---

## [LRN-20260409-002] best_practice

**Logged**: 2026-04-09
**Priority**: medium
**Status**: pending
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

---

## [LRN-20260401-005] best_practice

**Logged**: 2026-04-01
**Priority**: medium
**Status**: pending
**Area**: tooling

### Summary
Cursor/VS Code **folder emphasis** (“contains emphasized items”) usually means files under that folder have **ESLint or TS diagnostics**. `eslint-config-next` + React Compiler-related rules flag: **`react-hooks/purity`** (`Date.now` / `Math.random` / impure calls in render), **`react-hooks/preserve-manual-memoization`** (`useMemo` deps must match inferred dependencies), **hooks calling functions declared below** (`useEffect` before `handleSave`), and **`react/no-unescaped-entities`** in JSX text.

### Suggested Action
Run `npx eslint src` after UI refactors. Move impure date/random work to `useEffect`, module-level helpers called only from event handlers, or `crypto.randomUUID()` in handlers; move effects **below** the functions they invoke (or use `useCallback` + stable deps carefully).

### Metadata
- Source: session / diagnostics
- Tags: eslint, react-compiler, cursor

---

## [LRN-20260414-001] best_practice

**Logged**: 2026-04-14
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Reopening a submitted questionnaire must reset the **`response`** row (e.g. `status` back to `in_progress`, clear `submittedAt`), not only `questionnaire.status` and `share_link`. The public `/api/share/[token]` payload includes `responseStatus`; the respond UI and `POST …/answers` both treat `submitted` on the response as final.

### Metadata
- Source: bugfix
- Related Files: `src/app/api/questionnaires/[id]/reopen/route.ts`, `src/app/api/share/[token]/route.ts`
- Tags: questionnaire, reopen, response

---
