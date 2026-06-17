# IAM Role & Credentials Plan

> **Owner:** ops / security
> **Review:** required before first production deploy
> **Last updated:** 2026-06-17

---

## Principle

The CC Verse server runs with an **IAM role** — no static access keys are embedded in the production environment. Dev and CI still use static keys (empty strings in prod).

---

## Server IAM Role

### Trust policy

The EC2 instance (or ECS task definition) assumes a role named `ccverse-server`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Permissions policy (`ccverse-server-policy`)

The inline policy grants only the actions required by the application:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ReadWrite",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:HeadObject",
        "s3:ListBucket",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::ccverse-kyc",
        "arn:aws:s3:::ccverse-kyc/*",
        "arn:aws:s3:::ccverse-projects",
        "arn:aws:s3:::ccverse-projects/*",
        "arn:aws:s3:::ccverse-certificates",
        "arn:aws:s3:::ccverse-certificates/*",
        "arn:aws:s3:::ccverse-audit-exports",
        "arn:aws:s3:::ccverse-audit-exports/*"
      ]
    },
    {
      "Sid": "S3BucketConfig",
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:ListBucketMultipartUploads"],
      "Resource": [
        "arn:aws:s3:::ccverse-kyc",
        "arn:aws:s3:::ccverse-projects",
        "arn:aws:s3:::ccverse-certificates",
        "arn:aws:s3:::ccverse-audit-exports"
      ]
    },
    {
      "Sid": "SESP Send",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail", "ses:SendTemplatedEmail"],
      "Resource": "arn:aws:ses:*:*:identity/ccverse.<tld>"
    },
    {
      "Sid": "SES Describe",
      "Effect": "Allow",
      "Action": ["ses:DescribeAccount", "ses:GetEmailIdentity"],
      "Resource": "*"
    }
  ]
}
```

### What is NOT granted

| Denied action                       | Reason                                   |
| ----------------------------------- | ---------------------------------------- |
| `s3:*` (all)                        | Restrict to the four buckets only        |
| `ses:*` (all)                       | Send-only for the verified sender domain |
| `ec2:*`, `iam:*`, `logs:*`, `ssm:*` | No console or metadata access needed     |
| Any AWS management plane action     | Principle of least privilege             |

---

## S3 Bucket Policies

Each bucket denies any upload that is **not** encrypted at rest:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceSSES3",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::ccverse-kyc/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

---

## Development Credentials

Static access keys are **dev-only** (`S3_ACCESS_KEY_ID`, `SES_ACCESS_KEY_ID`). In `lib/env.ts` they are optional with a default of `''` and the S3/SES clients detect the empty-string case and fall back to the IAM role automatically (AWS SDK default credential provider chain).

| Environment         | S3/SES credentials source                 |
| ------------------- | ----------------------------------------- |
| Local dev           | `~/.aws/credentials` or env vars          |
| CI / GitHub Actions | OIDC role assumption (no long-lived keys) |
| Production          | EC2 / ECS task IAM role                   |

---

## Secrets management

| Secret                | Storage                                               |
| --------------------- | ----------------------------------------------------- |
| `SESSION_SECRET`      | AWS Secrets Manager or Parameter Store (SecureString) |
| `DATABASE_URL`        | AWS Secrets Manager or Parameter Store (SecureString) |
| `SEED_ADMIN_PASSWORD` | Not used in production; admin created via ops runbook |

No secrets are stored in environment variables or GitHub Actions secrets UI as plain-text strings that appear in logs.

---

## Action list for ops

- [ ] Create IAM role `ccverse-server` with trust policy above
- [ ] Attach inline policy `ccverse-server-policy` with S3 + SES permissions
- [ ] Apply S3 bucket policies to all four buckets (enforce SSE-S3)
- [ ] Request SES production access (unrestricted recipients) via AWS console
- [ ] Verify SES sender domain (`ccverse.<tld>`) with DKIM/SPF/DMARC
- [ ] Store `SESSION_SECRET` in Secrets Manager
- [ ] Store `DATABASE_URL` in Secrets Manager
- [ ] Remove any static `S3_ACCESS_KEY_ID` / `SES_ACCESS_KEY_ID` from production env
- [ ] Confirm no `admin` AWS access for the server role
