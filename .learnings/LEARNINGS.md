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
