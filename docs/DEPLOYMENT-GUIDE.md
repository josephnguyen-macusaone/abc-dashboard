# Production Deployment Guide

## Prerequisites

1. SSH access to production server
2. GitHub repository access
3. GitHub CLI installed: `brew install gh` (macOS)

---

## One-Time Setup

### 1. SSH Key for CI/CD

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy_key

# Copy to server
ssh-copy-id -i ~/.ssh/github_deploy_key.pub root@<SERVER_IP>

# Test connection
ssh -i ~/.ssh/github_deploy_key root@<SERVER_IP> 'echo "Connection successful"'
```

### 2. GitHub Secrets (18 Required)

Authenticate with GitHub:
```bash
cd /path/to/abc-dashboard
gh auth login
```

Set secrets using secure values:

```bash
# Server Configuration (3 secrets)
gh secret set SERVER_HOST -b "<your_server_ip>"
gh secret set SERVER_USER -b "root"
gh secret set SERVER_SSH_KEY < ~/.ssh/github_deploy_key

# Database Configuration (3 secrets)
gh secret set POSTGRES_DB -b "<database_name>"
gh secret set POSTGRES_USER -b "<database_user>"
gh secret set POSTGRES_PASSWORD -b "<strong_password>"

# Authentication & Security (2 secrets)
# Generate with: openssl rand -base64 48
gh secret set JWT_SECRET -b "<random_48_char_string>"
# Generate with: openssl rand -hex 64
gh secret set ENCRYPTION_KEY -b "<random_128_char_hex>"

# External License API (2 secrets)
gh secret set EXTERNAL_LICENSE_API_URL -b "<api_url>"
gh secret set EXTERNAL_LICENSE_API_KEY -b "<api_key>"

# Email Configuration - Mailjet (6 secrets)
gh secret set EMAIL_SERVICE -b "mailjet"
gh secret set EMAIL_HOST -b "in-v3.mailjet.com"
gh secret set EMAIL_PORT -b "587"
gh secret set EMAIL_FROM -b "<your_email@domain.com>"
gh secret set EMAIL_FROM_NAME -b "<Your App Name>"
gh secret set EMAIL_USER -b "<mailjet_api_key>"
gh secret set EMAIL_PASS -b "<mailjet_secret_key>"

# Application Configuration (2 secrets)
gh secret set CLIENT_URL -b "<frontend_url>"
# Generate with: openssl rand -base64 48
gh secret set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY -b "<random_48_char_string>"

# Verify all secrets are set
gh secret list
# Should show 18 secrets
```

---

## Generate Secure Secrets

Use these commands to generate cryptographically secure values:

```bash
# JWT Secret (48 characters base64)
openssl rand -base64 48

# Encryption Key (128 characters hex)
openssl rand -hex 64

# Next.js Server Actions Key (48 characters base64)
openssl rand -base64 48
```

---

## Deploy

Push to `main` branch (only `main` triggers production deploy; `develop` is for integration without deploying):

```bash
git push origin main

# Monitor deployment
gh run watch
```

### Deployment Steps (Automatic)

1. **Build** - Docker images for backend and frontend (~5-10 min)
2. **Save** - Compress images to .tar.gz
3. **Transfer** - SCP to production server
4. **Deploy** - Load images and restart containers
5. **Verify** - Health checks on backend and frontend

---

## Verify Deployment

```bash
# Check container status
ssh root@<SERVER_IP> 'cd /root/abc-dashboard && docker compose ps'

# Test API health
curl https://your-domain.com/api/v1/health

# Check logs
ssh root@<SERVER_IP> 'cd /root/abc-dashboard && docker compose logs -f --tail=100'
```

---

## Manual Deployment (Fallback)

If CI/CD fails:

```bash
# Build locally
./scripts/build-and-save.sh

# Transfer to server
scp dist/*.tar.gz root@<SERVER_IP>:/root/abc-dashboard/dist/

# Deploy on server
ssh root@<SERVER_IP> 'cd /root/abc-dashboard && ./scripts/load-and-run.sh'
```

---

## Rotate Secrets

If secrets are compromised:

```bash
# Generate new secrets
NEW_JWT=$(openssl rand -base64 48)
NEW_ENC=$(openssl rand -hex 64)
NEW_NEXT=$(openssl rand -base64 48)

# Update GitHub secrets
gh secret set JWT_SECRET -b "$NEW_JWT"
gh secret set ENCRYPTION_KEY -b "$NEW_ENC"
gh secret set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY -b "$NEW_NEXT"

# Redeploy
git commit --allow-empty -m "chore: trigger redeploy after secret rotation"
git push origin main
```

**Note:** Rotating JWT_SECRET will log out all users.

---

## Troubleshooting

### Build Fails

```bash
# Check workflow logs
gh run view --log

# Test local build
docker compose build
```

### Deployment Fails

```bash
# Check server disk space
ssh root@<SERVER_IP> 'df -h'

# Check Docker logs
ssh root@<SERVER_IP> 'cd /root/abc-dashboard && docker compose logs'

# Restart containers manually
ssh root@<SERVER_IP> 'cd /root/abc-dashboard && docker compose restart'
```

### API Not Working

```bash
# Check backend logs
ssh root@<SERVER_IP> 'cd /root/abc-dashboard && docker compose logs backend --tail=100'

# Check OpenLiteSpeed proxy (if applicable)
ssh root@<SERVER_IP> 'systemctl status lsws'
```

---

## Security Best Practices

1. **Never commit secrets** to git
2. **Use GitHub Secrets** for all sensitive values
3. **Rotate secrets** if exposed
4. **Use strong passwords** (20+ characters)
5. **Enable 2FA** on GitHub and server access
6. **Review access logs** regularly
7. **Keep dependencies updated**

---

## Additional Resources

- GitHub Actions: https://docs.github.com/en/actions
- Docker Compose: https://docs.docker.com/compose/
- OpenLiteSpeed: https://openlitespeed.org/kb/
- Next.js Deployment: https://nextjs.org/docs/deployment

---

## Need Help?

Check logs, review documentation, or contact your DevOps team.

**Remember:** Never share or commit production secrets!
