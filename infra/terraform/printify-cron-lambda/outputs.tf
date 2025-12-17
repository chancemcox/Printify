output "lambda_function_name" {
  value       = aws_lambda_function.cron.function_name
  description = "Deployed Lambda function name"
}

output "assets_bucket" {
  value       = aws_s3_bucket.assets.bucket
  description = "S3 bucket storing generated images"
}

output "schedule_rule_name" {
  value       = aws_cloudwatch_event_rule.schedule.name
  description = "EventBridge schedule rule"
}
