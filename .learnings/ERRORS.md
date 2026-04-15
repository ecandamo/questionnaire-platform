# Errors Log
<!-- Command failures, exceptions, unexpected behavior -->

## [ERR-20260326-001] next-js-16-middleware-rename

**Logged**: 2026-03-26T23:00:00Z
**Priority**: critical
**Status**: resolved
**Area**: config

### Summary
Next.js 16 no longer recognizes `src/middleware.ts` — the file and its exported function must both be renamed.

### Error
```
Proxy is missing expected function export name
This function is what Next.js runs for every request handled by this proxy (previously called middleware).
```

### Context
- Created `src/middleware.ts` with `export async function middleware(request)` as learned from training data
- Next.js 16 (Turbopack) rejected both the filename and the export name
- Correct: file must be `src/proxy.ts`, export must be `export function proxy(request)`

### Suggested Fix
Always create `src/proxy.ts` with `export function proxy()` in Next.js 16+ projects. Never use `middleware.ts` or `export function middleware`.

### Resolution
- **Resolved**: 2026-03-26T23:00:00Z
- **Notes**: Renamed file to `src/proxy.ts`, changed export to `export function proxy()`. Build passed.

### Metadata
- Reproducible: yes
- Related Files: src/proxy.ts
- See Also: LRN-20260326-001

---

## [ERR-20260326-002] neon-db-module-level-init-crash

**Logged**: 2026-03-26T23:10:00Z
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
Calling `neon(process.env.DATABASE_URL!)` at the top level of a module causes the Next.js build to crash when `DATABASE_URL` is not set (e.g., in CI or fresh checkouts).

### Error
```
Error: No database connection string was provided to `neon()`. Perhaps an environment variable has not been set?
    at neon (.next/server/chunks/...)
    at module evaluation
```

### Context
- `src/lib/db/index.ts` had `const sql = neon(process.env.DATABASE_URL!)` at module level
- Next.js evaluates all server module exports at build time when collecting page data
- Any route that imports `db` — directly or transitively — triggers the error during `npm run build`

### Suggested Fix
Wrap DB creation in a lazy factory function. Use a `Proxy` to intercept property access and defer initialization until first use at runtime.

### Resolution
- **Resolved**: 2026-03-26T23:10:00Z
- **Notes**: Rewrote `src/lib/db/index.ts` with a `getDb()` factory + `Proxy` pattern. Build passes without `DATABASE_URL`.

### Metadata
- Reproducible: yes
- Related Files: src/lib/db/index.ts
- See Also: LRN-20260326-002

---

## [ERR-20260326-003] shadcn-cli-sandbox-network-error

**Logged**: 2026-03-26T23:15:00Z
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
`npx shadcn@latest add` fails with a 401 auth error when run inside the network sandbox.

### Error
```
You are not authorized to access the item at https://ui.shadcn.com/r/styles/radix-nova/input.json.
```

### Context
- The shadcn CLI fetches component source from `ui.shadcn.com` at install time
- The sandbox allowlist does not include this domain without `full_network` permission
- Must pass `required_permissions: ["full_network"]` to the Shell tool

### Suggested Fix
Always use `required_permissions: ["full_network"]` when running `npx shadcn@latest add` in the sandbox.

### Resolution
- **Resolved**: 2026-03-26T23:15:00Z
- **Notes**: Added `required_permissions: ["full_network"]` and components were fetched correctly.

### Metadata
- Reproducible: yes
- Related Files: src/components/ui/

---

## [ERR-20260327-001] sidebar-removed-import-still-used-in-jsx

**Logged**: 2026-03-27T00:00:00Z
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
Removed `ShieldIcon` from the lucide-react import in sidebar.tsx before removing its usage in JSX, causing a TS2304 error.

### Error
```
Cannot find name 'ShieldIcon'.
```

### Context
- When replacing the sidebar brand area icon with inline SVG, the import was removed in one edit but JSX still referenced `<ShieldIcon />`
- IDE diagnostics caught it immediately on the next edit

### Suggested Fix
When replacing icon usage in a component, remove JSX usage and import in the same edit, or check all references before removing the import.

### Resolution
- **Resolved**: 2026-03-27T00:00:00Z
- **Notes**: Removed the JSX usage of ShieldIcon in the same step as removing the import.

### Metadata
- Reproducible: yes
- Related Files: src/components/layout/sidebar.tsx

---

## [ERR-20260327-002] duplicate-schema-import-when-cascade-handles-children

**Logged**: 2026-03-27
**Priority**: low
**Status**: resolved
**Area**: backend

### Summary
Added redundant schema imports for child tables (`questionnaireQuestion`, `shareLink`, `response`, `answer`) into a route file that already imported them, causing `TS2300 Duplicate identifier` errors.

### Error
```
Duplicate identifier 'questionnaireQuestion'.
```

### Context
- Wanted to manually delete child rows before deleting the parent questionnaire
- Added extra imports, but `questionnaireQuestion` was already imported earlier in the same file
- Root cause of the manual deletion approach was also unnecessary: the DB schema already defines `onDelete: "cascade"` on all child FKs, so a single `db.delete(questionnaire)` cascades everything automatically

### Suggested Fix
Before adding imports to a route file, check existing imports. More importantly, check the schema for `onDelete: "cascade"` before writing manual child-deletion logic — if cascade is defined, the DB handles it in one statement.

### Resolution
- **Resolved**: 2026-03-27
- **Notes**: Reverted the duplicate imports. Used `db.delete(questionnaire).where(eq(questionnaire.id, id))` — cascade does the rest.

### Metadata
- Reproducible: yes
- Related Files: src/app/api/questionnaires/[id]/route.ts, src/lib/db/schema.ts

---

## [ERR-20260326-004] better-auth-admin-setRole-type-error

**Logged**: 2026-03-26T23:20:00Z
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
`authClient.admin.setRole({ userId, role })` fails TypeScript compilation when `role` is typed as `string` instead of the literal union `"user" | "admin"`.

### Error
```
Type 'string' is not assignable to type '"user" | "admin" | ("user" | "admin")[]'.
```

### Context
- The Better Auth admin client's `setRole` method expects a strictly typed role literal, not `string`
- Must derive the new role value using `as const` or a ternary that returns a literal type

### Suggested Fix
```ts
const newRole = currentRole === "admin" ? ("user" as const) : ("admin" as const)
await authClient.admin.setRole({ userId, role: newRole })
```

### Resolution
- **Resolved**: 2026-03-26T23:20:00Z
- **Notes**: Changed to typed ternary with `as const`. Type error resolved.

### Metadata
- Reproducible: yes
- Related Files: src/app/(dashboard)/admin/users/page.tsx

---

## [ERR-20260401-001] eslint-react-compiler-rules-src-emphasis

**Logged**: 2026-04-01
**Priority**: medium
**Status**: resolved
**Area**: tooling + frontend

### Summary
`npx eslint src` reported **errors** (not just warnings) that caused Cursor to treat **`src`** as containing emphasized/problem files.

### Error / rules involved
- `react-hooks/purity` — `Date.now()` / `Math.random()` in component paths treated as render-time impurity (`detail-client.tsx` temp IDs, expiry preview in JSX).
- `react-hooks/preserve-manual-memoization` — `useMemo` in `responses/page.tsx` used `answerMap` inside callback but deps listed `answers` only.
- `react-hooks/immutability` — autosave `useEffect` referenced `handleSave` **before** its function declaration (`respond/[token]/page.tsx`).
- `react/no-unescaped-entities` — apostrophes/quotes in JSX strings (`detail-client`, `respond`).

### Context
Next.js / eslint-config-next stack enables strict React rules;explorer “emphasized” folders track error-severity diagnostics.

### Resolution
- **Resolved**: 2026-04-01
- **Notes**: Temp IDs → module helper with `crypto.randomUUID()` from event handlers; expiry label → `setState` in `useEffect` + `addDays`; `answeredAnswerableCount` → derive via `answers.find` with `[answerableVisible, answers]`; autosave effect moved **after** `handleSave`; JSX entities escaped. `eslint src` → 0 errors.

### Metadata
- Reproducible: yes
- Related Files: `detail-client.tsx`, `responses/page.tsx`, `respond/[token]/page.tsx`
- See Also: LRN-20260401-005

---

## [ERR-20260414-001] drizzle-kit-missing-database-url

**Logged**: 2026-04-14
**Priority**: medium
**Status**: resolved
**Area**: tooling

### Summary
`npm run db:push` failed with Drizzle Kit reporting that PostgreSQL connection `url` (or host/database) is required.

### Error
```
Error  Either connection "url" or "host", "database" are required for PostgreSQL database connection
```

### Context
`drizzle.config.ts` used `process.env.DATABASE_URL` only. **`drizzle-kit` does not load `.env.local`**, unlike `next dev`, so `DATABASE_URL` was undefined when running from the repo root with vars only in `.env.local`.

### Suggested Fix
Read `DATABASE_URL` from `.env.local` / `.env` inside `drizzle.config.ts`, or run `node --env-file=.env.local node_modules/drizzle-kit/bin.cjs push`, or export `DATABASE_URL` in the shell before `db:push`.

### Resolution
- **Resolved**: 2026-04-14
- **Notes**: `drizzle.config.ts` gained `ensureDatabaseUrlFromEnvFiles()` + clear throw if still missing.

### Metadata
- Reproducible: yes
- Related Files: `drizzle.config.ts`
- See Also: LRN-20260414-003

---

## [ERR-20260414-002] template-create-invalid-question-id

**Logged**: 2026-04-14T18:00:00Z
**Priority**: medium
**Status**: resolved
**Area**: backend

### Summary
Creating a template from Admin with one or more questions failed at `INSERT` into `template_question` because **`question_id`** was not a valid UUID (handler passed whole objects where the column expected UUID strings).

### Error
PostgreSQL / Drizzle rejected the row (invalid uuid) — surfaced to the user as generic **“Failed to save template”**.

### Context
- `POST /api/templates` mapped `questions` as `string[]`
- Client sends `questions: [{ questionId, isRequired }, …]` (same as PATCH)

### Suggested Fix
Align POST handler with PATCH: `questionId: q.questionId`, `isRequired: q.isRequired ?? false`. Optionally return JSON `{ error }` and show it in the UI toast.

### Resolution
- **Resolved**: 2026-04-14
- **Notes**: Fixed in `src/app/api/templates/route.ts`; templates page surfaces API `error` on failure.

### Metadata
- Reproducible: yes
- Related Files: `src/app/api/templates/route.ts`
- See Also: LRN-20260414-010

---

## [ERR-20260414-003] better-auth-create-user-missing-origin

**Logged**: 2026-04-14T18:00:00Z
**Priority**: high
**Status**: resolved
**Area**: backend / auth

### Summary
`POST /api/admin/users` proxied to Better Auth **`create-user`** without an **`Origin`** header; Better Auth responded with **Missing or null Origin**.

### Context
Server-side `fetch` has no browser origin; Better Auth validates `Origin` for admin API calls in this setup.

### Resolution
- **Resolved**: 2026-04-14
- **Notes**: Route sets `Origin` + `Referer` from `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`; returns 500 if both unset.

### Metadata
- Reproducible: yes
- Related Files: `src/app/api/admin/users/route.ts`
- See Also: LRN-20260414-011, LRN-20260414-013

---
