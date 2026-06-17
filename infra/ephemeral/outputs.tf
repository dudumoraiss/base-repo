output "api_url" {
  description = "Public HTTPS base URL of the API (Lambda Function URL)."
  value       = aws_lambda_function_url.api.function_url
}

output "web_bucket" {
  description = "S3 bucket the frontend is synced to."
  value       = aws_s3_bucket.web.bucket
}

output "web_url" {
  description = "Public URL of the frontend (S3 website endpoint)."
  value       = "http://${aws_s3_bucket_website_configuration.web.website_endpoint}"
}
