variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-2"
}

variable "project" {
  description = "Project prefix for resource names."
  type        = string
  default     = "baserepo"
}

variable "github_org" {
  description = "GitHub org/user that owns the repo (OIDC trust subject)."
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name (OIDC trust subject)."
  type        = string
}

variable "state_bucket" {
  description = "Name of the pre-created S3 bucket that holds Terraform state (used as the backend by bootstrap and ephemeral). The deploy role is granted access to its ephemeral/* keys."
  type        = string
}
