# Setup Guides

Step-by-step guides for configuring and setting up specific features and integrations of the ABC Dashboard Backend.

## 📚 Available Guides

| Guide                                                                   | Description                                                | Complexity | Time   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- | ---------- | ------ |
| **[Email Service Overview](./email-service-overview.md)**               | Complete email architecture and service comparison         | Medium     | 30 min |
| **[Email Setup Guide](./email-setup-guide.md)**                         | Step-by-step email service configuration                   | Low        | 15 min |
| **[Google Workspace Domain Setup](./google-workspace-domain-setup.md)** | Complete Google Workspace domain verification & SMTP setup | High       | 45 min |
| **[Password Reset Flow](./password-reset-flow.md)**                     | Password reset process and email templates                 | Low        | 10 min |
| **[User Management System](./user-management-system.md)**               | Role-based access control and user management              | Medium     | 20 min |
| **[Agents Name Field](./agents-name-field.md)**                         | agentsName/agents_name: string type, API and DB behavior   | Low        | 5 min  |

## 🚀 Quick Setup Paths

### Development Setup (MailHog)

1. [Email Setup Guide](./email-setup-guide.md) - Configure MailHog
2. [User Management System](./user-management-system.md) - Understand user roles
3. Test with [Email Service Overview](./email-service-overview.md)

### Production Setup (Google Workspace)

1. [Google Workspace Domain Setup](./google-workspace-domain-setup.md) - Domain verification
2. [Email Setup Guide](./email-setup-guide.md) - Configure SMTP
3. [Email Service Overview](./email-service-overview.md) - Service comparison

### Production Setup (Mailjet - optional)

1. [Email Setup Guide](./email-setup-guide.md) - Configure Mailjet SMTP
2. [Email Service Overview](./email-service-overview.md) - Service comparison
3. [User Management System](./user-management-system.md) - Set up user management

## 🛠️ Configuration Testing

After following any guide, test your configuration:

```bash
# Test email configuration
npm run test:email:config

# Test email sending
npm run test:email:send

# Test user management
npm run test:users
```

## 📧 Email Service Providers

### Development

- **MailHog**: Local email testing, no external dependencies
- **Setup Time**: 5 minutes
- **Use Case**: Development and testing

### Production - Recommended

- **Google Workspace**: SMTP via Gmail with domain verification (App Password)
- **Setup Time**: ~45 minutes
- **Use Case**: Primary production

### Production - Alternative

- **Mailjet**: SMTP with API-key auth and dashboard analytics
- **Setup Time**: ~30 minutes
- **Use Case**: Optional production/backup

## 👥 User Management

### Role Hierarchy

```txt
Admin (highest)
├── Can create managers and staff
├── Can assign staff to managers
└── Full system access

Manager
├── Can create staff accounts
├── Manages assigned staff
└── Limited administrative access

Staff (lowest)
├── No creation privileges
├── Personal account access only
└── Basic user permissions
```

### Common Workflows

- **New Employee Onboarding**: Admin creates account → Email sent → User activates
- **Manager Assignment**: Admin assigns staff to managers → Notification sent
- **Password Reset**: User requests reset → Email sent → User resets password

## 🔗 Related Documentation

- [Getting Started](../getting-started/README.md) - Quick start guide
- [Architecture](../architecture/README.md) - System design
- [API Reference](../api-reference/README.md) - API documentation
- [Operations](../operations/README.md) - Deployment and operations

## 🆘 Need Help?

### Common Issues

- **Email not sending**: Check [Email Setup Guide](./email-setup-guide.md)
- **Domain verification failed**: Follow [Google Workspace Domain Setup](./google-workspace-domain-setup.md)
- **User permissions wrong**: Review [User Management System](./user-management-system.md)

### Support Resources

- **Email Services**: Check provider documentation
- **API Issues**: See [API Reference](../api-reference/README.md)
- **Deployment Issues**: Check [Operations](../operations/README.md)
