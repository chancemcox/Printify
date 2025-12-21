variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "name_prefix" {
  type        = string
  description = "Prefix for created AWS resources"
  default     = "printify-ai-cron"
}

variable "schedule_expression" {
  type        = string
  description = "EventBridge schedule expression, e.g. cron(0 9 * * ? *)"
  default     = "cron(0 9 * * ? *)"
}

variable "lambda_timeout_seconds" {
  type        = number
  description = "Lambda timeout in seconds"
  default     = 300
}

variable "lambda_memory_mb" {
  type        = number
  description = "Lambda memory in MB"
  default     = 512
}

variable "assets_prefix" {
  type        = string
  description = "S3 key prefix for generated images"
  default     = "printify-generated"
}

variable "s3_presign_ttl_seconds" {
  type        = number
  description = "How long the S3 presigned URL should be valid"
  default     = 3600
}

# Secrets Manager ARNs (create/store secrets outside Terraform to keep values out of state)
variable "openai_api_key_secret_arn" {
  type        = string
  description = "Secrets Manager secret ARN containing the OpenAI API key"
}

variable "printify_api_token_secret_arn" {
  type        = string
  description = "Secrets Manager secret ARN containing the Printify API token"
}

variable "printify_store_id" {
  type        = string
  description = "Printify shop/store id"
}

variable "printify_blueprint_id" {
  type        = number
  description = "Printify blueprint_id (product type)"
}

variable "printify_print_provider_id" {
  type        = number
  description = "Printify print_provider_id"
}

variable "printify_variant_id" {
  type        = number
  description = "Printify variant id to enable"
}

variable "printify_price_cents" {
  type        = number
  description = "Variant price in cents"
  default     = 1999
}

variable "printify_publish" {
  type        = bool
  description = "Whether to publish to connected sales channel"
  default     = false
}

variable "printify_visible" {
  type        = bool
  description = "Whether product should be visible"
  default     = false
}

variable "product_title" {
  type        = string
  description = "Product title used for Printify"
  default     = "AI Generated Product"
}

variable "product_description" {
  type        = string
  description = "Product description used for Printify"
  default     = "Auto-created by scheduled Lambda"
}

variable "openai_image_prompt" {
  type        = string
  description = "Prompt used to generate the image"
  default     = "A clean, high-contrast t-shirt graphic illustration. Vector style, centered composition, no background, transparent background."
}

variable "openai_image_model" {
  type        = string
  description = "OpenAI image model"
  default     = "gpt-image-1"
}

variable "openai_image_size" {
  type        = string
  description = "Image size"
  default     = "1024x1024"
}

# Placement tuning
variable "printify_print_position" {
  type        = string
  description = "Printify print area position (e.g. front/back)"
  default     = "front"
}

variable "printify_x" {
  type        = number
  description = "X placement (0-1)"
  default     = 0.5
}

variable "printify_y" {
  type        = number
  description = "Y placement (0-1)"
  default     = 0.5
}

variable "printify_scale" {
  type        = number
  description = "Scale"
  default     = 1
}

variable "printify_angle" {
  type        = number
  description = "Angle"
  default     = 0
}
