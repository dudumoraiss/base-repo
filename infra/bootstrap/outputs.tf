output "aws_region" {
  value = var.aws_region
}

output "account_id" {
  value = data.aws_caller_identity.current.account_id
}

output "ecr_repository_url" {
  description = "Push the API image here."
  value       = aws_ecr_repository.api.repository_url
}

output "gha_deploy_role_arn" {
  description = "Set as the GitHub secret AWS_DEPLOY_ROLE_ARN (role the workflow assumes)."
  value       = aws_iam_role.gha_deploy.arn
}

output "lambda_exec_role_name" {
  description = "Looked up by the ephemeral stack."
  value       = aws_iam_role.lambda_exec.name
}
