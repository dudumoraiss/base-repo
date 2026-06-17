terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Per-PR state: same bucket as bootstrap, key set at init time by CI, e.g.
  #   terraform init \
  #     -backend-config="bucket=baserepo-tfstate-837573837601" \
  #     -backend-config="key=ephemeral/pr-123/terraform.tfstate" \
  #     -backend-config="region=us-east-2"
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
}
