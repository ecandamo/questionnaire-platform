# Security Control Status & Remediation Plan

**Prepared for:** IT Security review
**Date:** 2026-08-06
**Scope:** Questionnaire Platform (Next.js App Router + TypeScript, Postgres, Better Auth)
**Method:** Read-only source audit. No code was changed. Infrastructure-level settings could not be verified from source and are called out where relevant.

---

## Deployment Target: AWS

The app is being migrated off Vercel into the company's **AWS environment**. This audit and plan assume the following target architecture (recommended for this app and adopted below):

- **Compute:** Next.js containerized on **ECS Fargate**, behind an **Application Load Balancer (ALB)**, fronted by **CloudFront**.
- **Database:** **RDS/Aurora Postgres** (moved in-VPC from Neon).
- **File storage:** **S3** (private bucket) replacing Vercel Blob.
- **Edge/security:** **AWS WAF** on CloudFront/ALB; **ACM** certificates for TLS; **CloudWatch** + **CloudTrail** for logging.

Because the target is AWS, IT's original requests (**AWS WAF, S3, CloudWatch, CloudTrail**) are now the *correct* tools for the stack — the earlier Vercel platform mismatch no longer applies. The gaps below are therefore addressed with native AWS services.

### Two migration work items that underpin the whole plan

1. **Database driver swap.** The app currently uses `drizzle-orm/neon-serverless` (WebSocket `Pool`) specifically because RLS requires real transactions (`SET LOCAL`); `neon-http` is forbidden for that reason (see CLAUDE.md). Moving to RDS/Aurora means switching to the **`pg` (node-postgres) driver**, which supports real transactions and is already a devDependency. This is a discrete, well-supported change to `src/lib/db/index.ts` and must be validated against the RLS `withRls` transaction path.
2. **File storage swap.** Migrate uploads from Vercel Blob to a private S3 bucket (detailed in §2).

---

## Summary Scorecard

| # | Requirement | Status |
|---|---|---|
| 1 | Input validation & output encoding | 🟡 PARTIAL |
| 2 | File upload controls | 🔴 WEAK — app *does* accept uploads |
| 3 | AWS WAF + rate limiting / throttling | 🔴 MISSING |
| 4 | TLS enforced end-to-end | 🟡 MOSTLY OK — needs explicit assertions on AWS |
| 5 | Logging & monitoring | 🔴 PARTIAL / MISSING |

Legend: 🟢 Implemented · 🟡 Partial · 🔴 Missing/Weak

---

## 1. Input Validation & Output Encoding — 🟡 PARTIAL

### Current state

**Strong today:**
- **Output encoding / XSS.** All user content is rendered through JSX, which React auto-escapes. No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function` anywhere in `src`. No raw-HTML/markdown rendering surface exists.
- **SQL injection.** Drizzle ORM with parameterized queries throughout. No `sql.raw`, no string concatenation into SQL. RLS `set_config` calls are parameterized via Drizzle's `sql` tagged template. (Remains true after the `pg` driver swap.)

**Weak today:**
- **No schema-validation library** (no zod/yup/valibot). Validation is hand-rolled and inconsistent across ~26 API routes — mostly presence-only ("is this field set") checks.
- **Mass-assignment pattern** in ≥5 PATCH handlers that spread the raw request body into `.set({ ...body })`: `clients/[id]`, `questions/[id]`, `categories/[id]`, `questionnaires/[id]`, `templates/[id]`. A caller authorized to edit a row could overwrite columns never meant to be user-editable (`ownerId`, `status`, `isSystem`, etc.).
- **CSV formula-injection** in `responses/[id]/export/route.ts` — exported cells are quote-escaped but not neutralized against leading `= + - @` (Excel/Sheets risk).

### Planned implementation
1. **Adopt `zod`** as the single validation layer. Define one schema per route input.
2. **Central helper** `parseBody(req, schema)` in `src/lib/validation.ts` returning a typed object or a standardized `400` error shape. Standardize the validation error contract across all routes.
3. **Replace every `.set({ ...body })`** with an explicit per-field allowlist derived from the zod schema — this closes the mass-assignment gap by construction.
4. **Validate enums against source of truth** (questionnaire types, question types, roles, colors) at the schema layer, not the DB constraint.
5. **CSV export hardening**: prefix any cell beginning with `= + - @ tab CR` with a single quote in `responses/[id]/export/route.ts`.
6. Keep relying on React auto-escaping for output encoding; add `DOMPurify` **only if** rich-text/markdown rendering is introduced later.

> Note: application-layer input validation is independent of hosting — this work is unchanged by the AWS move, and AWS WAF (§3) sits *in front of* it as defense-in-depth, not a replacement.

---

## 2. File Upload Controls — 🔴 WEAK (the app accepts uploads)

### Current state

The `file_upload` question type lets respondents upload files via **Vercel Blob**. Gaps:

- 🔴 **`/api/blob` token endpoint has no authentication** — any anonymous caller can mint a signed upload token to the app's storage.
- 🔴 **No malware/AV scanning** of any kind.
- 🟡 Type checks are **extension / declared-MIME only** (attacker-controllable); no content/magic-byte verification.
- 🟡 Files uploaded with **`access: "public"`** — retrievability relies only on an unguessable URL, not real access control.
- 🟡 No rate limiting on the endpoint; no metadata/audit trail (who uploaded what, when, scan status).
- 🟢 Size limit of 50 MB **is** enforced.

This requirement now aligns directly with IT's original ask — "a dedicated S3 bucket with no public access" — because storage moves to S3 as part of the AWS migration.

### Planned implementation (AWS / S3)
1. **Migrate storage to a private S3 bucket** (`BlockPublicAccess` on, no public ACLs/policies). Bucket lives outside the web root by definition; enable SSE (SSE-S3 or SSE-KMS) and versioning.
2. **Presigned-URL upload flow.** Replace the Vercel Blob client-upload with a server endpoint that issues a **short-lived S3 presigned PUT URL** — but only after authenticating the caller (valid respondent/share token or session) and confirming they own an active, in-progress response. Presigned conditions pin content-type and max size (50 MB).
3. **Presigned-URL download flow.** Serve files via short-lived presigned GET URLs from an authorized route that checks the caller may view that response. No object is ever public.
4. **Server-side content verification.** After upload, validate magic bytes (e.g. `file-type`) against the declared MIME; keep the allowlist and size cap.
5. **AV scanning.** Scan on upload — either **S3 → Lambda (ClamAV layer)** triggered by `s3:ObjectCreated`, or Amazon GuardDuty Malware Protection for S3. Track `scanStatus` (`pending` → `clean`/`infected`); block download until `clean`; quarantine/delete on `infected`.
6. **Attachment metadata table.** New `attachment` table: `id`, `responseId`, `questionId`, `s3Key`, `originalName`, `contentType`, `size`, `uploadedBy`, `scanStatus`, `createdAt` — replacing the bare URL in `answer.value` and giving a proper audit trail.
7. **Rate-limit the presign endpoint** (see §3).
8. Remove the `@vercel/blob` dependency and the `/api/blob` route once migrated.

---

## 3. AWS WAF + Rate Limiting / Throttling — 🔴 MISSING

### Current state
- **Rate limiting: effectively none.** Better Auth's built-in limiter runs on defaults only (~100 req/10s), covers **only `/api/auth/*`**, and uses **in-memory** storage. All other ~25 API routes have zero throttling.
- `src/proxy.ts` only performs login redirects and **explicitly excludes `/api`** from its logic — no throttling there.
- **WAF: none.** No firewall configuration exists.

### Planned implementation (AWS)
1. **Attach AWS WAF** to the CloudFront distribution (and/or ALB). Enable:
   - **AWS Managed Rules** — Core rule set (OWASP), Known Bad Inputs, SQLi, and IP reputation lists.
   - **Rate-based rules** — per-IP request ceilings at the edge, with tighter limits scoped to `/api/auth/*`, the file-presign endpoint, and public share-token routes.
   - Optional **Bot Control** and geo/IP allow-deny lists per company policy.
   - WAF logging → CloudWatch Logs / S3 (feeds §5).
2. **Application-layer rate limiting** as defense-in-depth (WAF is IP-based and coarse; app limits are identity/route-aware). Back it with **ElastiCache for Redis** (in-VPC) via `@upstash/ratelimit`-compatible client or `rate-limiter-flexible`. Apply in a shared handler wrapper keyed by IP + route class:
   - Strict limits on auth, share-token, and file-presign endpoints.
   - Looser limits on authenticated CRUD endpoints.
3. **Configure Better Auth `rateLimit` explicitly** with a durable `secondaryStorage` (the same Redis) so auth limits survive across ECS tasks and are enabled intentionally, not by implicit `NODE_ENV` default.
4. **ALB/CloudFront throttling** as a final backstop (connection limits, request timeouts).

---

## 4. TLS Enforced End-to-End — 🟡 MOSTLY OK (needs explicit AWS assertions)

### Current state
- 🟢 **Browser-facing headers are strong.** Explicit HSTS `max-age=63072000; includeSubDomains; preload` in `next.config.ts`, plus a full security-header set (CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy).
- 🟡 **App→DB TLS** currently relies on the Neon driver's secure-WebSocket default — this changes with the RDS move.
- 🟡 **Cookies are Secure only implicitly** (via `NODE_ENV`), not an explicit `useSecureCookies: true`.
- 🟡 No `upgrade-insecure-requests` directive in the CSP.

### Planned implementation (AWS)
1. **TLS termination with ACM.** Issue ACM certificates for the domain; terminate TLS at **CloudFront and ALB**. Configure the ALB/CloudFront to **redirect all HTTP → HTTPS** (no plaintext listener) and set a modern TLS security policy (TLS 1.2+).
2. **Encrypt CloudFront → ALB → ECS hops** so TLS is genuine end-to-end inside the VPC, not just at the edge (HTTPS on the ALB→target and origin protocol policy set to HTTPS-only).
3. **App→DB TLS on RDS.** Connect with `sslmode=require` (or `verify-full` using the RDS CA bundle) in the `pg` driver config in `src/lib/db/index.ts`. This becomes an explicit, auditable setting rather than a driver default.
4. **Explicitly set `advanced.useSecureCookies: true`** in the Better Auth config as a safety net independent of `NODE_ENV`.
5. **Add `upgrade-insecure-requests`** to the CSP in `next.config.ts`.
6. Retain the existing HSTS header so browsers refuse plaintext after first contact.

---

## 5. Logging & Monitoring — 🔴 PARTIAL / MISSING

### Current state
- 🟡 **Application audit log exists** (`logAudit` → `audit_log` table) covering admin/data CRUD actions. But the **`ipAddress` field is always null** (never populated), and DB-insert failures are silently swallowed (only `console.error`).
- 🔴 **No authentication-event logging** — logins, logouts, failed logins, and brute-force attempts produce **zero** audit rows. This directly undercuts "visibility if something gets probed."
- 🔴 **No access/request logging**, no structured logging library (pino/winston), no error monitoring/APM (no Sentry/Datadog).

This requirement now aligns with IT's original ask — CloudWatch and CloudTrail are the correct tools on AWS.

### Planned implementation (AWS)
1. **Access logs.** Enable **ALB access logs** and **CloudFront access logs** (→ S3, queryable via Athena) — the request-level "who probed what" trail. **AWS WAF logs** (§3) capture blocked/suspicious traffic.
2. **Application logs → CloudWatch.** Ship container stdout/stderr from ECS via the **awslogs** driver to CloudWatch Logs. Add lightweight structured logging (pino) so logs are queryable in CloudWatch Logs Insights.
3. **CloudTrail.** Enable CloudTrail for the account/region to record control-plane and (optionally) S3 data-plane events — infrastructure-level audit trail for the environment.
4. **Log auth events (app layer).** Use Better Auth hooks to write login success/failure, logout, password reset, and admin ban/unban to `audit_log`. Failed logins are the key probe signal.
5. **Capture source IP** on every `logAudit` call (from the ALB's `x-forwarded-for` header) so the existing `ipAddress` column is populated.
6. **Stop swallowing audit failures** — surface to the error monitor instead of a silent `console.error`.
7. **Error monitoring / APM:** add **Sentry** (`@sentry/nextjs`) or **CloudWatch RUM + X-Ray** for server/client error capture, tracing, and alerting.
8. **Alerting.** CloudWatch Alarms on WAF blocked-request spikes, 5xx rates, and failed-login thresholds → SNS to the security channel.

---

## Recommended Implementation Order

Ranked by risk and dependency:

1. **Migration foundation** — `pg` driver swap for RDS/Aurora, and stand up the ECS/ALB/CloudFront/WAF/ACM baseline. Everything else assumes this environment.
2. **§2 — S3 private storage + presigned auth flow + AV scanning.** Highest app-level risk: anonymous write access to storage today.
3. **§3 — AWS WAF rules + app-layer rate limiting (ElastiCache Redis).** Broad protection against abuse and brute-force.
4. **§5 — Access logs + CloudTrail + auth-event logging + source IP + Sentry + alarms.** Detection/visibility.
5. **§1 — zod validation + kill mass-assignment + CSV hardening.** Correctness and injection hardening (hosting-independent).
6. **§4 — ACM end-to-end TLS + RDS sslmode + explicit cookie/CSP assertions.** Low effort, closes auditor gaps.

**Assumptions to confirm with IT/infra:** ECS Fargate + ALB + CloudFront compute model; RDS/Aurora Postgres (with `pg` driver swap); S3 for uploads; ElastiCache Redis for rate limiting.
