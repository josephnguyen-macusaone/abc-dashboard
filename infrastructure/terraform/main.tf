terraform {
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

# Variables
variable "server_ip" {
  description = "IP address of the server"
  type        = string
  default     = "155.138.245.11"
}

variable "ssh_user" {
  description = "SSH username"
  type        = string
  default     = "root"
}

variable "ssh_private_key_path" {
  description = "Path to SSH private key"
  type        = string
  default     = "~/.ssh/id_rsa"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "abc-dashboard"
}

variable "environment" {
  description = "Environment (development/staging/production)"
  type        = string
  default     = "production"
}

# Provider configuration for remote execution
provider "null" {}

# Resource to manage deployment on remote server
resource "null_resource" "deploy_application" {
  triggers = {
    always_run = timestamp()
  }

  # Connection details
  connection {
    type        = "ssh"
    host        = var.server_ip
    user        = var.ssh_user
    private_key = file(var.ssh_private_key_path)
    timeout     = "30s"
  }

  # Provisioners for deployment
  provisioner "remote-exec" {
    inline = [
      # Create application directory
      "mkdir -p /var/www/${var.project_name}",
      "cd /var/www/${var.project_name}",

      # Install Node.js if not already installed
      "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -",
      "apt-get install -y nodejs",

      # Install PM2 globally if not installed
      "npm install -g pm2",

      # Install Docker if not installed
      "curl -fsSL https://get.docker.com -o get-docker.sh",
      "sh get-docker.sh",
      "usermod -aG docker $USER",

      # Create Docker Compose directory
      "mkdir -p docker",
    ]
  }

  # Copy Docker Compose file
  provisioner "file" {
    source      = "../../docker-compose.prod.yml"
    destination = "/var/www/${var.project_name}/docker-compose.yml"
  }

  # Copy environment files
  provisioner "file" {
    source      = "../../backend/env/${var.environment}.env"
    destination = "/var/www/${var.project_name}/.env"
  }

  # Copy deployment scripts
  provisioner "file" {
    source      = "../scripts/"
    destination = "/var/www/${var.project_name}/scripts"
  }

  # Execute deployment
  provisioner "remote-exec" {
    inline = [
      "cd /var/www/${var.project_name}",
      "chmod +x scripts/deploy.sh",
      "./scripts/deploy.sh ${var.environment}"
    ]
  }
}

# Output
output "deployment_status" {
  value = "Deployment completed successfully"
}

output "server_ip" {
  value = var.server_ip
}

output "application_url" {
  value = "http://${var.server_ip}"
}
