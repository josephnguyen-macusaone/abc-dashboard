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

Download the latest release from: https://github.com/mailhog/MailHog/releases
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

## Production Setup (Gmail SMTP)

For production, use Gmail's SMTP servers to send real emails.

### Gmail Setup Requirements

1. **Enable 2-Factor Authentication (2FA)** on your Gmail account
2. **Generate an App Password** for the application

### Step-by-Step Gmail Configuration

#### 1. Enable 2-Factor Authentication

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to "Security" → "Signing in to Google"
3. Enable "2-Step Verification"

#### 2. Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in if prompted
3. Select "Mail" and "Other (custom name)"
4. Enter "ABC Dashboard" as the custom name
5. Click "Generate"
6. **Copy the 16-character password** (you won't see it again)

#### 3. Environment Configuration

Update your production `.env` file:

```bash
# Production Email Configuration
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=ABC Dashboard
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=abcd-efgh-ijkl-mnop  # Your 16-character App Password
EMAIL_SERVICE=gmail
```

### Gmail SMTP Settings Explained

| Setting        | Value                  | Description                               |
| -------------- | ---------------------- | ----------------------------------------- |
| `EMAIL_HOST`   | `smtp.gmail.com`       | Gmail's SMTP server                       |
| `EMAIL_PORT`   | `587`                  | TLS port (secure connection)              |
| `EMAIL_SECURE` | `false`                | Use TLS encryption (not SSL)              |
| `EMAIL_USER`   | `your-email@gmail.com` | Your Gmail address                        |
| `EMAIL_PASS`   | `abcd-efgh-ijkl-mnop`  | Gmail App Password (not regular password) |

## Environment Detection

The application automatically detects the environment and configures email accordingly:

```javascript
// Development (NODE_ENV !== 'production')
EMAIL_HOST: 'localhost';
EMAIL_PORT: 1025;
EMAIL_SERVICE: 'mailhog';

// Production (NODE_ENV === 'production')
EMAIL_HOST: 'smtp.gmail.com';
EMAIL_PORT: 587;
EMAIL_SERVICE: 'gmail';
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

### Common Gmail Issues

#### Authentication Failed

```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solution**: Make sure you're using an App Password, not your regular Gmail password.

#### Less Secure Apps Blocked

```
Error: 535-5.7.8 Username and Password not accepted. Learn more at 535 5.7.8
```

**Solution**: Gmail blocks "less secure apps". You must use 2FA + App Passwords.

#### Daily Sending Limits

Gmail has sending limits:

- **Free accounts**: 500 emails/day
- **Google Workspace**: 2,000-10,000 emails/day

Consider using dedicated email services for high-volume applications.

### Connection Issues

#### Timeout Errors

```
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
