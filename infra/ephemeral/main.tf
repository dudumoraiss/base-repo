data "aws_caller_identity" "current" {}

# Shared execution role created by infra/bootstrap.
data "aws_iam_role" "lambda_exec" {
  name = "${var.project}-lambda-exec"
}

locals {
  suffix     = "pr-${var.pr_number}"
  api_name   = "${var.project}-api-${local.suffix}"
  web_bucket = "${var.project}-web-${local.suffix}-${data.aws_caller_identity.current.account_id}"
  tags = {
    Project = var.project
    PR      = var.pr_number
    Managed = "terraform/ephemeral"
  }
}

# ---------------------------------------------------------------------------
# API: container image on Lambda, exposed via a public HTTPS Function URL.
# ---------------------------------------------------------------------------
resource "aws_lambda_function" "api" {
  function_name = local.api_name
  role          = data.aws_iam_role.lambda_exec.arn
  package_type  = "Image"
  image_uri     = var.image_uri
  timeout       = 15
  memory_size   = 256
  architectures = ["x86_64"] # CI builds linux/amd64

  environment {
    variables = {
      OBSERVABILITY_PROVIDER = "console"
      ENV_NAME               = local.suffix
    }
  }

  tags = local.tags
}

# No CORS block here on purpose: the Express app (`cors()`) owns CORS. Setting it
# in BOTH places returns duplicate `Access-Control-Allow-Origin` headers, which
# the browser rejects. Keeping it in the app also matches local/docker-compose.
resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"
}

# A public Function URL needs TWO grants, and the AWS console adds both:
#   1. invoke the URL endpoint              -> lambda:InvokeFunctionUrl
#   2. invoke the function THROUGH the URL  -> lambda:InvokeFunction
# Terraform's aws_lambda_permission only creates #1 (via function_url_auth_type),
# so #2 must be added explicitly or every request gets 403 AccessDenied.
resource "aws_lambda_permission" "public_url" {
  statement_id           = "FunctionURLAllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.api.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "public_invoke" {
  statement_id  = "FunctionURLInvokeFunction"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "*"

  depends_on = [aws_lambda_permission.public_url]
}

# ---------------------------------------------------------------------------
# Frontend: Angular static files on a public S3 website bucket.
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "web" {
  bucket        = local.web_bucket
  force_destroy = true # so `terraform destroy` removes the bucket + its objects
  tags          = local.tags
}

resource "aws_s3_bucket_website_configuration" "web" {
  bucket = aws_s3_bucket.web.id

  index_document {
    suffix = "index.html"
  }

  # SPA fallback: unknown routes return index.html.
  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_ownership_controls" "web" {
  bucket = aws_s3_bucket.web.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket                  = aws_s3_bucket.web.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "web" {
  bucket     = aws_s3_bucket.web.id
  depends_on = [aws_s3_bucket_public_access_block.web]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.web.arn}/*"
    }]
  })
}
