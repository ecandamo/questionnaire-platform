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
