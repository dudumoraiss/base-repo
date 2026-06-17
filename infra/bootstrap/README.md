# infra/bootstrap

One-time setup, applied manually by an operator with admin AWS credentials. It
provisions the durable, shared pieces the per-PR pipeline relies on:

- **ECR repository** `baserepo-api` for the API image
- **GitHub OIDC provider** + **deploy role** (`baserepo-gha-deploy`) — the workflow
  assumes this via OIDC, so there are no long-lived AWS keys in GitHub
- **Lambda execution role** (`baserepo-lambda-exec`) shared by every ephemeral API

State is stored in an S3 bucket **you create by hand** (the backend can't create
its own backing store). For this account that bucket is
`baserepo-tfstate-837573837601`.

## Prerequisites (once)

```bash
# 1. Create the state bucket (versioned) if it doesn't exist yet:
aws s3api create-bucket --bucket baserepo-tfstate-837573837601 \
  --region us-east-2 --create-bucket-configuration LocationConstraint=us-east-2
aws s3api put-bucket-versioning --bucket baserepo-tfstate-837573837601 \
  --versioning-configuration Status=Enabled
```

## Apply

```bash
cd infra/bootstrap
cp terraform.tfvars.example terraform.tfvars   # set github_repo
terraform init -backend-config=backend.hcl
terraform apply
```

Then wire the outputs into GitHub:

```bash
terraform output -raw gha_deploy_role_arn   # -> repo secret AWS_DEPLOY_ROLE_ARN
terraform output -raw ecr_repository_url    # used by the workflow
```

| Output | Where it goes |
| --- | --- |
| `gha_deploy_role_arn` | GitHub repo **secret** `AWS_DEPLOY_ROLE_ARN` |
| `ecr_repository_url` | informational (workflow derives it from account/region) |

You only re-run this when the shared infra changes (e.g. tightening the deploy
policy). Day-to-day PR environments are handled by `infra/ephemeral` via CI.
