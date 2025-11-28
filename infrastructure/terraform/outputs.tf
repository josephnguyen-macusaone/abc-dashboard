output "deployment_status" {
  description = "Status of the deployment"
  value       = "Deployment completed successfully to ${var.server_ip}"
}

output "application_url" {
  description = "URL to access the deployed application"
  value       = "http://${var.server_ip}"
}

output "api_url" {
  description = "URL to access the API"
  value       = "http://${var.server_ip}/api/v1"
}

output "api_docs_url" {
  description = "URL to access API documentation"
  value       = "http://${var.server_ip}/api-docs"
}

output "health_check_url" {
  description = "URL for health check endpoint"
  value       = "http://${var.server_ip}/api/v1/health"
}

output "server_ip" {
  description = "Server IP address"
  value       = var.server_ip
}

output "environment" {
  description = "Deployment environment"
  value       = var.environment
}
