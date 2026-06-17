variable "aws_region" {
  description = "AWS region (must match bootstrap)."
  type        = string
  default     = "us-east-2"
}

variable "project" {
  description = "Project prefix (must match bootstrap)."
  type        = string
  default     = "baserepo"
}

variable "pr_number" {
  description = "Pull request number — makes every resource name PR-unique."
  type        = string
}

variable "image_uri" {
  description = "Full ECR image URI (with tag) for this PR's API build."
  type        = string
}
