terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "assets" {
  bucket        = "${var.name_prefix}-assets-${random_id.suffix.hex}"
  force_destroy = true
}

# Block public access; Lambda will presign GETs for Printify to fetch.
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/.build/lambda.zip"
}

resource "aws_iam_role" "lambda" {
  name = "${var.name_prefix}-role-${random_id.suffix.hex}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = "${var.name_prefix}-policy-${random_id.suffix.hex}"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Sid    = "S3WriteReadForPresign"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = [
          "${aws_s3_bucket.assets.arn}/*"
        ]
      },
      {
        Sid    = "ReadSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          var.openai_api_key_secret_arn,
          var.printify_api_token_secret_arn
        ]
      }
    ]
  })
}

resource "aws_lambda_function" "cron" {
  function_name = "${var.name_prefix}-${random_id.suffix.hex}"
  role          = aws_iam_role.lambda.arn

  runtime          = "nodejs20.x"
  handler          = "index.handler"
  timeout          = var.lambda_timeout_seconds
  memory_size      = var.lambda_memory_mb
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      # Secrets are read at runtime from Secrets Manager
      OPENAI_API_KEY_SECRET_ARN      = var.openai_api_key_secret_arn
      PRINTIFY_API_TOKEN_SECRET_ARN  = var.printify_api_token_secret_arn

      PRINTIFY_STORE_ID              = var.printify_store_id
      PRINTIFY_BLUEPRINT_ID          = tostring(var.printify_blueprint_id)
      PRINTIFY_PRINT_PROVIDER_ID     = tostring(var.printify_print_provider_id)
      PRINTIFY_VARIANT_ID            = tostring(var.printify_variant_id)
      PRINTIFY_PRICE_CENTS           = tostring(var.printify_price_cents)
      PRINTIFY_PUBLISH               = var.printify_publish ? "true" : "false"
      PRINTIFY_VISIBLE               = var.printify_visible ? "true" : "false"

      PRODUCT_TITLE                  = var.product_title
      PRODUCT_DESCRIPTION            = var.product_description
      OPENAI_IMAGE_PROMPT            = var.openai_image_prompt
      OPENAI_IMAGE_MODEL             = var.openai_image_model
      OPENAI_IMAGE_SIZE              = var.openai_image_size

      ASSETS_BUCKET                  = aws_s3_bucket.assets.bucket
      ASSETS_PREFIX                  = var.assets_prefix
      S3_PRESIGN_TTL_SECONDS         = tostring(var.s3_presign_ttl_seconds)

      PRINTIFY_PRINT_POSITION        = var.printify_print_position
      PRINTIFY_X                     = tostring(var.printify_x)
      PRINTIFY_Y                     = tostring(var.printify_y)
      PRINTIFY_SCALE                 = tostring(var.printify_scale)
      PRINTIFY_ANGLE                 = tostring(var.printify_angle)
    }
  }
}

resource "aws_cloudwatch_event_rule" "schedule" {
  name                = "${var.name_prefix}-schedule-${random_id.suffix.hex}"
  schedule_expression = var.schedule_expression
}

resource "aws_cloudwatch_event_target" "invoke" {
  rule      = aws_cloudwatch_event_rule.schedule.name
  target_id = "lambda"
  arn       = aws_lambda_function.cron.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cron.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule.arn
}
