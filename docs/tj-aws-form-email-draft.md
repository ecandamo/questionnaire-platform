# Email Draft — To TJ (AWS Deployment Form)

**Status:** Draft — add TJ's email to the `To:` line before sending.

---

**Subject:** AWS Server Deployment Request Form — completed & submitted (a few items pending)

Hi TJ,

I've completed and submitted the AWS Server Deployment Request Form for the Questionnaire Platform. There's some stuff I need clarification on:

1. **SentinelOne vs. compute type.** My proposed compute is ECS Fargate (serverless), but SentinelOne is a host-based agent that can't be installed on Fargate. Can we either (a) use container-level protection / an EDR exception on Fargate, or (b) should we deploy on EC2 instead so the agent installs normally? This may change the compute answer on the form.

2. **SSO identity provider.** Is our SSO a cloud IdP (Okta/Entra/Google) or on-prem AD/ADFS/LDAP? It determines whether we need Transit Gateway connectivity into the corporate network.

3. **Environment details to assign:** the target **AWS Account ID**, **VPC ID**, and confirmation of the **region** (I've proposed `us-east-1` — let me know if there's a company standard or data-residency requirement).

4. **WAF:** should we create a new WAF ACL for this app, or attach to a shared/org-wide ACL if one exists?

Thanks!

Best,
Esteban
