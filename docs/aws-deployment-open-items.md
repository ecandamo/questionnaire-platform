# AWS Deployment — Open Items to Confirm with IT / TJ

Items that came up while completing the AWS Server Deployment Request Form and need IT/TJ confirmation before or alongside provisioning. Raise together with the architecture confirmation.

## 🔴 Blocking / decision-changing

- **SentinelOne EDR vs. ECS Fargate.** SentinelOne is a host-based EDR agent and **cannot be installed on ECS Fargate** (serverless — no host OS). Policy requires it installed and reporting before handoff. Need IT to choose one:
  1. **Keep Fargate** + approve a container/runtime-level protection alternative (SentinelOne container offering, or ECR image scanning + GuardDuty) as an EDR-policy exception, **or**
  2. **Switch compute to ECS-on-EC2**, where SentinelOne is baked into the AMI and reports before handoff (satisfies policy, but we manage the host layer).
  - This may change the **Compute** answer on the form. Currently listed as Fargate with a note.

- **SSO identity provider type.** Determines VPC connectivity:
  - Cloud IdP (Okta / Entra ID / Google) → HTTPS over internet, **no peering/TGW needed**.
  - On-prem AD / ADFS / LDAP → requires **Transit Gateway** into the corporate network.
  - (Also a future app work item: wiring corporate SSO into the app, which currently uses Better Auth.)

## 🟡 Values IT must supply

- **AWS Account ID** — target account (pending environment provisioning).
- **VPC ID** — to be assigned; app should sit in **private subnets**, ALB/CloudFront for public ingress.
- **AWS Region** — proposed `us-east-1`; confirm company standard / any data-residency requirement.

## 🟢 Confirm preference / standard

- **WAF ACL** — new dedicated ACL proposed; use the **shared org WAF ACL** instead if IT maintains one.
- **Server/SG naming convention** — proposed `prod-qnaire-*`; match IT's standard if one exists.
- **OS base image** — proposed Amazon Linux 2023; match a mandated hardened/golden image if required.
- **Log retention** — proposed 90 days (CloudWatch) / 365 days (S3 audit logs); match mandated retention policy.
- **SNS alert subscriber** — interim: esteban.candamo@apiglobalsolutions.com; move to a team ops/security distribution list once established.

## Architecture assumptions pending IT confirmation (from the email to IT)

- Compute: ECS Fargate → ALB → CloudFront *(see SentinelOne item — may become ECS-on-EC2)*
- Database: RDS/Aurora Postgres (migrated from Neon; requires `pg` driver swap)
- File storage: private S3 bucket
- Rate limiting store: ElastiCache for Redis
