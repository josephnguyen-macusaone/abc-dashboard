# Email Setup Guide

This guide explains how to configure email functionality for the ABC Dashboard application, supporting both development (MailHog) and production (Gmail) environments.

## Overview

The ABC Dashboard uses email for:

- User account creation notifications
- Password reset functionality
- Security notifications
- Welcome emails with temporary passwords

## Development Setup (MailHog)

MailHog is a local email testing tool that captures all outgoing emails without actually sending them to real recipients.

### Installation

#### macOS (using Homebrew)

```bash
brew install mailhog
```

#### Linux

```bash
# Download latest release from https://github.com/mailhog/MailHog/releases
wget https://github.com/mailhog/MailHog/releases/download/v1.0.1/MailHog_linux_amd64
chmod +x MailHog_linux_amd64
sudo mv MailHog_linux_amd64 /usr/local/bin/mailhog
```

#### Windows

Download the latest release from: <https://github.com/mailhog/MailHog/releases>
Extract and add to your PATH.

### Starting MailHog

```bash
# Start MailHog server
mailhog

# Or run in background
mailhog &
```

MailHog will start on:

- **SMTP Server**: `localhost:1025` (receives emails)
- **Web Interface**: `http://localhost:8025` (view captured emails)

### Environment Configuration

Create or update your `.env` file with MailHog settings:

```bash
# Development Email Configuration
EMAIL_FROM=noreply@localhost
EMAIL_FROM_NAME=ABC Dashboard (Dev)
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_SECURE=false
# Leave EMAIL_USER and EMAIL_PASS empty for MailHog
EMAIL_SERVICE=mailhog
```

### Testing Email Functionality

1. Start your backend server
2. Run the database seed: `npm run seed`
3. Visit `http://localhost:8025` in your browser
4. Trigger an email (e.g., create a new user via API)
5. Check MailHog interface to see captured emails

## Production Setup Options

You have two production email options:

1. **Mailjet** (Recommended for high-volume, better analytics)
2. **Google Workspace SMTP** (Free option, good for low-volume)

### Mailjet Setup (Recommended)

Mailjet is a dedicated transactional email service with excellent deliverability, analytics, and scalability.

#### Mailjet Account Setup

1. **Sign up for Mailjet**: Visit <https://mailjet.com> and create a free account
2. **Verify your account**: Complete email verification process
3. **Create SMTP credentials**:
   - Go to Settings → API Keys
   - Create a key pair (API Key and Secret Key)
   - Use the API Key as `EMAIL_USER` and Secret Key as `EMAIL_PASS`

#### Single Sender Verification

1. Go to Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Fill in your details and verify the email address

#### Env Config

```bash
# Production Email Configuration - Mailjet
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=ABC Dashboard
EMAIL_SERVICE=mailjet
EMAIL_USER=your-mailjet-api-key
EMAIL_PASS=your-mailjet-secret-key
```

### Mailjet Features

| Feature        | Free Plan | Paid Plans   |
| -------------- | --------- | ------------ |
| Monthly Emails | 100/day   | 100-100,000+ |
| API Access     | ✅        | ✅           |
| Analytics      | ✅        | ✅           |
| Templates      | Basic     | Advanced     |
| Support        | Community | Email/Phone  |

### Google Workspace SMTP Setup

For production, use Google Workspace SMTP servers to send emails with professional domain authentication.

### Google Workspace Setup Requirements

1. **Google Workspace Account** (Free or Paid)
2. **Enable 2-Factor Authentication (2FA)** on your Google Workspace account
3. **Generate an App Password** for the application (Free tier)
4. **Custom Domain** (for professional email addresses)

### Step-by-Step Google Workspace Configuration

#### 1. Enable 2-Factor Authentication

1. Go to your Google Admin Console: <https://admin.google.com/>
2. Navigate to "Security" → "Authentication" → "2-Step Verification"
3. Enable 2-Step Verification for your account

#### 2. Generate App Password (Free Tier)

1. Go to: <https://myaccount.google.com/apppasswords>
2. Sign in with your Google Workspace account
3. Select "Mail" and "Other (custom name)"
4. Enter "ABC Dashboard" as the custom name
5. Click "Generate"
6. **Copy the 16-character password** (you won't see it again)

#### 3. Verify Domain (Optional but Recommended)

For custom domains, verify ownership:

1. Go to Google Search Console: <https://search.google.com/search-console>
2. Add your domain property
3. Verify ownership using DNS records

#### 4. Environment Configuration

Update your production `.env` file:

```bash
# Production Email Configuration - Google Workspace
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=ABC Dashboard
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=abcd-efgh-ijkl-mnop  # Your 16-character App Password
EMAIL_SERVICE=google-workspace
```

### Google Workspace SMTP Settings Explained

| Setting        | Value                   | Description                            |
| -------------- | ----------------------- | -------------------------------------- |
| `EMAIL_HOST`   | `smtp.gmail.com`        | Google Workspace SMTP server           |
| `EMAIL_PORT`   | `587`                   | TLS port (STARTTLS)                    |
| `EMAIL_SECURE` | `false`                 | Use TLS encryption (not SSL)           |
| `EMAIL_USER`   | `your-email@domain.com` | Your Google Workspace email            |
| `EMAIL_PASS`   | `abcd-efgh-ijkl-mnop`   | App Password (not regular password)    |
| `EMAIL_FROM`   | `noreply@domain.com`    | From address (must be verified domain) |

### Google Workspace vs Gmail Free Comparison

| Feature               | Gmail Free     | Google Workspace Free | Google Workspace Paid |
| --------------------- | -------------- | --------------------- | --------------------- |
| Daily Sending Limit   | 500 emails/day | 500 emails/day        | 2,000-10,000/day      |
| Custom Domain         | ❌             | ✅                    | ✅                    |
| Professional Branding | ❌             | ✅                    | ✅                    |
| DKIM/SPF Support      | Basic          | Advanced              | Advanced              |
| API Access            | Limited        | Limited               | Full                  |
| Cost                  | Free           | Free                  | $6-18/user/month      |

### Complete .env Configuration Examples

#### Development (with MailHog)

```bash
# Development Email Configuration
NODE_ENV=development
EMAIL_FROM=noreply@localhost
EMAIL_FROM_NAME=ABC Dashboard (Dev)
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_SECURE=false
# Leave EMAIL_USER and EMAIL_PASS empty for MailHog
EMAIL_SERVICE=mailhog
```

#### Production (Google Workspace Free)

```bash
# Production Email Configuration - Google Workspace
NODE_ENV=production
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=ABC Dashboard
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=abcd-efgh-ijkl-mnop  # Your 16-character App Password
EMAIL_SERVICE=google-workspace
```

#### Production (Mailjet - Recommended)

```bash
# Production Email Configuration - Mailjet
NODE_ENV=production
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=ABC Dashboard
EMAIL_SERVICE=mailjet
EMAIL_USER=your-mailjet-api-key
EMAIL_PASS=your-mailjet-secret-key
```

## Environment Detection

The application automatically detects the environment and configures email accordingly:

```javascript
// Development (NODE_ENV !== 'production')
EMAIL_HOST: 'localhost';
EMAIL_PORT: 1025;
EMAIL_SERVICE: 'mailhog';

// Production (NODE_ENV === 'production')
if (EMAIL_SERVICE === 'mailjet') {
  // Uses Mailjet API with enhanced error handling and analytics
  // No SMTP host/port needed - uses API calls
} else if (EMAIL_SERVICE === 'google-workspace') {
  EMAIL_HOST: 'smtp.gmail.com';
  EMAIL_PORT: 587;
  // Uses App Password authentication with enhanced error handling
} else {
  // Fallback to legacy Gmail configuration
  EMAIL_HOST: 'smtp.gmail.com';
  EMAIL_PORT: 587;
  EMAIL_SERVICE: 'gmail';
}
```

## Testing Email Configuration

### 1. Health Check Endpoint

Check email service health:

```bash
curl http://localhost:5000/api/v1/health
```

Look for email configuration status in the response.

### 2. Manual Email Test

Create a test user to trigger email sending:

```bash
curl -X POST http://localhost:5000/api/v1/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "displayName": "Test User",
    "role": "staff"
  }'
```

### 3. Password Reset Test

Test password reset functionality:

```bash
curl -X POST http://localhost:5000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Troubleshooting

### Common MailHog Issues

#### MailHog won't start

```bash
# Kill any existing MailHog processes
pkill -f mailhog

# Try starting on a different port
mailhog -smtp-bind-addr=127.0.0.1:2525 -ui-bind-addr=127.0.0.1:8080
```

#### Emails not appearing

- Check that MailHog is running: `ps aux | grep mailhog`
- Verify email configuration in your `.env` file
- Check application logs for email sending errors

### Common Google Workspace Issues

#### Authentication Failed

```txt
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solutions**:

1. Verify you're using an App Password, not your regular password
2. Ensure 2FA is enabled on your Google Workspace account
3. Regenerate the App Password if it was compromised

#### App Password Issues

```txt
Error: Application-specific password required
```

**Solution**: Google Workspace requires App Passwords for SMTP authentication. Generate one at: <https://myaccount.google.com/apppasswords>

#### Domain Verification Required

```txt
Error: Domain not verified for sending
```

**Solution**: For custom domains, verify domain ownership in Google Workspace Admin Console under "Domains".

#### Daily Sending Limits Exceeded

```txt
Error: Daily sending quota exceeded
```

**Limits by Google Workspace tier**:

- **Free**: 500 emails/day
- **Business Starter**: 2,000 emails/day
- **Business Standard**: 5,000 emails/day
- **Business Plus**: 5,000 emails/day
- **Enterprise**: 10,000 emails/day

#### TLS/SSL Connection Issues

```txt
Error: TLS connection failed
```

**Solutions**:

1. Ensure `EMAIL_SECURE=false` (uses STARTTLS)
2. Check that port 587 is not blocked by firewall
3. Try disabling VPN if connection issues persist

### Common Mailjet Issues

#### API Key Authentication Failed

```txt
Error: Unauthorized - Invalid API key
```

**Solutions**:

1. Verify your API key starts with `SG.`
2. Regenerate the API key if compromised
3. Check that the API key has the correct permissions
4. Ensure no extra spaces or characters in the key

#### Sender Email Not Verified

```txt
Error: The from address does not match a verified Sender Identity
```

**Solutions**:

1. Verify the sender email in Mailjet dashboard
2. Check Settings → Sender Authentication
3. Add the email to verified senders
4. For domain verification, add DNS records

#### Daily/Monthly Limits Exceeded

```txt
Error: You've exceeded your daily/monthly email limit
```

**Solutions**:

1. Check your Mailjet plan limits
2. Upgrade your Mailjet plan if needed
3. Monitor usage in Mailjet dashboard
4. Implement rate limiting in your application

#### Invalid Recipients

```txt
Error: Does not contain a valid address
```

**Solutions**:

1. Validate email addresses before sending
2. Check for typos in recipient addresses
3. Remove invalid email formats
4. Use Mailjet's email validation API

#### IP Not Whitelisted (if applicable)

```txt
Error: IP address not allowed
```

**Solutions**:

1. Check if IP restrictions are enabled
2. Add your server's IP to the whitelist
3. Or disable IP restrictions in Mailjet settings

### Connection Issues

#### Timeout Errors

```txt
Error: Connection timeout
```

**Solutions**:

- Check internet connection
- Verify Gmail SMTP settings
- Try different ports (465 for SSL, 587 for TLS)

#### Firewall Blocking

- Ensure ports 587 (Gmail) or 1025 (MailHog) are not blocked
- Try disabling firewall temporarily for testing

## Email Templates

The system includes several email templates:

1. **Welcome Email**: Sent when new accounts are created
2. **Password Reset Email**: Contains temporary passwords
3. **Security Notifications**: Password change confirmations

Templates are located in `src/shared/services/email-service.js` and support Handlebars templating.

## Security Best Practices

### Development

- Always use MailHog for local development
- Never send real emails during development
- Test email templates thoroughly before production

### Production

- Use App Passwords, never regular passwords
- Monitor email sending limits
- Implement rate limiting for email endpoints
- Log email sending activities for audit trails
- Use dedicated email services for high-volume applications

### Environment Variables

- Store email credentials securely
- Use different credentials for each environment
- Rotate App Passwords regularly
- Never commit email credentials to version control

## Monitoring Email Delivery

### Application Logs

Check application logs for email sending status:

```bash
tail -f logs/app.log | grep -i email
```

### Gmail Account Activity

Monitor sent emails in your Gmail account:

1. Go to Gmail → Sent Mail
2. Check for ABC Dashboard emails
3. Monitor for delivery failures

### MailHog Interface

In development, use the MailHog web interface:

- View all captured emails
- Check email content and formatting
- Verify recipient addresses
- Test email templates

## Support

If you encounter issues with email configuration:

1. Check the application logs for detailed error messages
2. Verify your environment variables are set correctly
3. Test with MailHog first before trying Gmail
4. Ensure Gmail 2FA and App Passwords are properly configured
5. Check Gmail's sending limits and account status

For additional support, check the ABC Dashboard documentation or create an issue in the project repository.
