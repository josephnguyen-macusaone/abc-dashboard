variable "server_ip" {
  description = "IP address of the deployment server"
  type        = string
  default     = "155.138.245.11"
}

variable "ssh_user" {
  description = "SSH username for server access"
  type        = string
  default     = "root"
}

variable "ssh_private_key_path" {
  description = "Path to SSH private key file"
  type        = string
  default     = "~/.ssh/id_rsa"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "abc-dashboard"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

variable "docker_registry" {
  description = "Docker registry URL"
  type        = string
  default     = ""
}

variable "docker_username" {
  description = "Docker registry username"
  type        = string
  default     = ""
}

variable "docker_password" {
  description = "Docker registry password"
  type        = string
  default     = ""
  sensitive   = true
}
