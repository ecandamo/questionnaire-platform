# Email Draft — Reply to IT Security

**Status:** Draft — fill in `[IT contact]` and `[Your name]` before sending.

---

**Subject:** RE: Security controls for the Questionnaire Platform — implementation plan

Hi [IT contact],

Thanks for the requirements. I've reviewed the application against all five controls and have a plan to implement each, summarized below.

**Important context:** the platform will be migrated from Vercel into our company's **AWS environment**. I received an email from TJ to request the AWS environment, and I'm working on completing the survey. The plan assumes a proposed AWS setup, and **I'd like you to confirm these before we proceed**, since several controls depend on them:

- **Compute:** Next.js on ECS Fargate → ALB → CloudFront
- **Database:** RDS/Aurora Postgres (migrated from Neon)
- **File storage:** private S3 bucket
- **Rate limiting store:** ElastiCache for Redis

How we'll address each request:

1. **Input validation & output encoding.** Output is already safe (React auto-escapes; the DB layer is fully parameterized, so no SQL injection surface). We'll add schema validation (zod) across all API endpoints to harden inputs.

2. **File upload controls.** The app does accept uploads. We'll move storage to a **private S3 bucket** (no public access, encrypted), require authentication before upload, enforce type/extension allow-listing and size limits with content verification, and add **malware/AV scanning** before any file is retrievable.

3. **WAF + rate limiting.** We'll attach **AWS WAF** (managed rule sets + rate-based rules) at CloudFront/ALB, plus an application-layer rate limiter for route-aware throttling as defense-in-depth.

4. **TLS end-to-end.** TLS terminates at CloudFront and the ALB via **ACM certificates**, with HTTP→HTTPS redirects (no plaintext) and encryption through to the app and RDS (`sslmode=require`). Strong HSTS headers are already in place.

5. **Logging & monitoring.** We'll enable **ALB/CloudFront access logs**, ship app logs to **CloudWatch**, turn on **CloudTrail**, and add audit logging of authentication events (including failed logins and source IP), with alarms on suspicious activity.

We'll start with the AWS migration foundation, then prioritize file upload hardening, followed by WAF/rate limiting, logging, input validation, and TLS.

Happy to set up a short call to confirm the architecture, priorities, and timeline.

Best,
[Your name]
