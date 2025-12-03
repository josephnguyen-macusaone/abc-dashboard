# Email Service Architecture & Configuration Guide

## Overview

The ABC Dashboard implements a comprehensive email service architecture supporting multiple providers with automatic failover, comprehensive error handling, and advanced monitoring capabilities.

```mermaid
graph TB
    A[Application Layer] --> B[Email Service Interface]
    B --> C{Service Type}

    C -->|Development| D[MailHog Service]
    C -->|Production| E[SendGrid API]
    C -->|Production| F[Google Workspace SMTP]

    D --> G[Local Email Testing]
    E --> H[Transactional Email API]
    F --> I[SMTP with App Passwords]

    J[Error Handling] --> B
    K[Monitoring] --> B
    L[Circuit Breaker] --> B
    M[Retry Logic] --> B

    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style D fill:#e8f5e8
    style E fill:#fff3e0
    style F fill:#fce4ec
    style J fill:#ffebee
    style K fill:#e8f5e8
    style L fill:#fff3e0
    style M fill:#f3e5f5
```

## Email Service Architecture

### Core Components

```mermaid
classDiagram
    class EmailService {
        +sendEmailVerification(to, data)
        +sendWelcomeWithPassword(to, data)
        +sendPasswordResetEmail(to, data)
        +sendPasswordResetConfirmationEmail(to, data)
        +verifyConnection()
        +getHealthStatus()
        -_validateSendGridConfig()
        -_validateGoogleWorkspaceConfig()
        -_mapEmailError(error)
    }

    class EmailConfig {
        +createTransporter()
        +verifyConnection()
        +sendEmail(options)
        +sendTemplatedEmail(template, email, data)
    }

    class SendGridClient {
        +send(msg)
        +setApiKey(key)
    }

    EmailService --> EmailConfig
    EmailConfig --> SendGridClient : for sendgrid service

    style EmailService fill:#e1f5fe
    style EmailConfig fill:#f3e5f5
    style SendGridClient fill:#fff3e0
```

### Service Flow Architecture

```mermaid
flowchart TD
    A[Email Request] --> B{Service Type}

    B -->|mailhog| C[MailHog Transporter]
    B -->|sendgrid| D[SendGrid API Client]
    B -->|google-workspace| E[SMTP Transporter]

    C --> F[Local Delivery]
    D --> G[SendGrid API]
    E --> H[Gmail SMTP]

    F --> I[MailHog Web UI]
    G --> J[SendGrid Dashboard]
    H --> K[Gmail Sent Items]

    L[Error Handler] --> B
    M[Circuit Breaker] --> B
    N[Retry Logic] --> B
    O[Health Monitor] --> B

    style A fill:#e1f5fe
    style B fill:#fff3e0
    style L fill:#ffebee
    style M fill:#ffebee
    style N fill:#ffebee
    style O fill:#e8f5e8
```

## Email Service Comparison

| Feature              | MailHog       | Google Workspace |
| -------------------- | ------------- | ---------------- |
| **Environment**      | Development   | Production       |
| **Delivery Method**  | Local Storage | SMTP             |
| **Daily Limit**      | Unlimited     | 500 → 10K        |
| **Setup Complexity** | Low           | Medium           |
| **Cost**             | Free          | Free → $18/user  |
| **Analytics**        | Basic         | Basic            |
| **Deliverability**   | N/A           | Good             |
| **API Access**       | No            | No               |
| **Production Ready** | ❌            | ✅               |

```mermaid
pie title Email Service Usage Distribution
    "MailHog (Development)" : 90
    "Google Workspace (Production)" : 10
```

## Service Configuration

### Environment Variables

```mermaid
mindmap
  root((Email Config))
    Development
      EMAIL_SERVICE = mailhog
      EMAIL_HOST = localhost
      EMAIL_PORT = 1025
      EMAIL_SECURE = false
    SendGrid
      EMAIL_SERVICE = sendgrid
      SENDGRID_API_KEY = SG.xxxxx
      EMAIL_FROM = noreply@domain.com
    Google Workspace
      EMAIL_SERVICE = google-workspace
      EMAIL_HOST = smtp.gmail.com
      EMAIL_PORT = 587
      EMAIL_USER = user@domain.com
      EMAIL_PASS = app-password
      EMAIL_SECURE = false
```

### Service Selection Logic

```mermaid
flowchart TD
    A[Application Start] --> B{EMAIL_SERVICE}
    B -->|mailhog| C[Load MailHog Config]
    B -->|sendgrid| D[Load SendGrid Config]
    B -->|google-workspace| E[Load Google Workspace Config]
    B -->|gmail| F[Load Legacy Gmail Config]

    C --> G[Create Nodemailer Transporter]
    D --> H[Initialize SendGrid Client]
    E --> I[Create Nodemailer Transporter]
    F --> J[Create Nodemailer Transporter]

    G --> K[Validate Connection]
    H --> L[Validate API Key]
    I --> M[Validate Credentials]
    J --> N[Validate Credentials]

    K --> O[Service Ready]
    L --> O
    M --> O
    N --> O

    style A fill:#e1f5fe
    style O fill:#e8f5e8
```

## Setup Instructions

### 1. MailHog (Development)

```mermaid
flowchart TD
    A[Install MailHog] --> B[Start Service]
    B --> C[Configure Environment]
    C --> D[Test Connection]
    D --> E[View Emails]

    A --> A1[macOS: brew install mailhog]
    A --> A2[Other: Download from GitHub]

    B --> B1[Command: mailhog]
    B --> B2[SMTP: localhost:1025]
    B --> B3[Web UI: localhost:8025]

    C --> C1[EMAIL_SERVICE=mailhog]
    C --> C2[EMAIL_HOST=localhost]
    C --> C3[EMAIL_PORT=1025]

    D --> D1[npm run test:email-config]
    D --> D2[Create test user]

    E --> E1[Open localhost:8025]
    E --> E2[View captured emails]

    style A fill:#e8f5e8
    style E fill:#e8f5e8
```

### 2. Google Workspace (Production)

```mermaid
flowchart TD
    A[Enable 2FA] --> B[Generate App Password]
    B --> C[Configure Environment]
    C --> D[Test Connection]
    D --> E[Send Test Email]

    A --> A1[admin.google.com]
    A --> A2[Security → 2-Step Verification]

    B --> B1[myaccount.google.com/apppasswords]
    B --> B2[Select Mail → Other]
    B --> B3[Enter 'ABC Dashboard']
    B --> B4[Copy 16-char password]

    C --> C1[EMAIL_SERVICE=google-workspace]
    C --> C2[EMAIL_USER=user@domain.com]
    C --> C3[EMAIL_PASS=16-char-password]
    C --> C4[EMAIL_FROM=noreply@domain.com]

    D --> D1[npm run test:email-config]
    D --> D2[Validate SMTP connection]

    E --> E1[Create user via API]
    E --> E2[Check Gmail sent folder]

    style A fill:#fce4ec
    style E fill:#e8f5e8
```

## Error Handling & Recovery

### Error Classification

```mermaid
flowchart TD
    A[Email Error] --> B{Error Type}

    B -->|Network| C[Connection Timeout]
    B -->|Auth| D[Authentication Failed]
    B -->|Rate| E[Rate Limit Exceeded]
    B -->|Recipient| F[Invalid Address]
    B -->|Quota| G[Daily Limit Reached]
    B -->|Service| H[Service Unavailable]

    C --> I[Retry with Backoff]
    D --> J[Check Credentials]
    E --> K[Wait and Retry]
    F --> L[Validate Email]
    G --> M[Upgrade Plan]
    H --> N[Circuit Breaker]

    I --> O[Log Warning]
    J --> P[Alert Admin]
    K --> Q[Queue for Later]
    L --> R[Skip Recipient]
    M --> S[Switch Provider]
    N --> T[Fallback Service]

    style A fill:#ffebee
    style O fill:#fff3e0
    style P fill:#ffebee
    style Q fill:#fff3e0
    style R fill:#e8f5e8
    style S fill:#fff3e0
    style T fill:#e8f5e8
```

### Circuit Breaker Pattern

```mermaid
stateDiagram-v2
    [*] --> Closed
    Closed --> Open : 3 consecutive failures
    Open --> HalfOpen : 30 second timeout
    HalfOpen --> Closed : Success
    HalfOpen --> Open : Failure

    Closed : Allow all requests
    Open : Reject all requests
    HalfOpen : Test with limited requests
```

## Monitoring & Analytics

### Health Check Endpoints

```mermaid
graph LR
    A[Health Check] --> B[/api/v1/health]
    B --> C{Email Service Status}

    C -->|Healthy| D[✅ Service OK]
    C -->|Degraded| E[⚠️ Circuit Breaker Active]
    C -->|Unhealthy| F[❌ Service Down]

    D --> G[Return 200]
    E --> H[Return 200 with Warning]
    F --> I[Return 503]

    J[Metrics] --> K[Response Time]
    J --> L[Success Rate]
    J --> M[Error Rate]
    J --> N[Queue Depth]

    style A fill:#e1f5fe
    style D fill:#e8f5e8
    style E fill:#fff3e0
    style F fill:#ffebee
```

### Email Metrics Dashboard

```mermaid
graph TB
    A[Email Metrics] --> B[Delivery Rate]
    A --> C[Bounce Rate]
    A --> D[Open Rate]
    A --> E[Click Rate]
    A --> F[Spam Complaints]

    B --> B1[SendGrid: Real-time]
    B --> B2[Google: Basic]
    B --> B3[MailHog: N/A]

    C --> C1[Hard Bounces]
    C --> C2[Soft Bounces]

    D --> D1[SendGrid: Tracked]
    D --> D2[Google: Manual]

    G[Alerts] --> H[High Bounce Rate]
    G --> I[Service Degradation]
    G --> J[Quota Approaching]

    style A fill:#e1f5fe
    style G fill:#ffebee
```

## Performance & Scalability

### Service Performance Comparison

```mermaid
bar
    title Email Service Performance (messages/second)
    x-axis ["MailHog", "Google Workspace", "SendGrid"]
    y-axis Performance 0 --> 100
    bar [100, 50, 80]
```

### Scaling Strategies

```mermaid
flowchart TD
    A[Email Volume Growth] --> B{Volume Level}

    B -->|Low < 500/day| C[Google Workspace Free]
    B -->|Medium < 10K/day| D[SendGrid Paid]
    B -->|High > 10K/day| E[SendGrid Enterprise]

    C --> F[App Password Auth]
    D --> G[API Key Auth]
    E --> H[Dedicated IP + Domain]

    F --> I[SMTP Connection Pool]
    G --> J[API Rate Limiting]
    H --> K[Custom Integration]

    L[Monitoring] --> M[Queue Depth]
    L --> N[Processing Time]
    L --> O[Error Rates]

    style A fill:#e1f5fe
    style C fill:#fce4ec
    style D fill:#fff3e0
    style E fill:#fff3e0
    style L fill:#e8f5e8
```

## Configuration Examples

### Complete Environment Files

#### Development (.env)

```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/abc_dashboard
JWT_SECRET=dev-secret-key
CLIENT_URL=http://localhost:3000

# Email - MailHog
EMAIL_SERVICE=mailhog
EMAIL_FROM=noreply@localhost
EMAIL_FROM_NAME=ABC Dashboard (Dev)
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_SECURE=false
```

#### Production - SendGrid (.env)

```bash
NODE_ENV=production
MONGODB_URI=mongodb://prod-server/abc_dashboard
JWT_SECRET=prod-secret-key
CLIENT_URL=https://yourdomain.com

# Email - SendGrid
EMAIL_SERVICE=sendgrid
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=ABC Dashboard
SENDGRID_API_KEY=SG.your-production-api-key
```

#### Production - Google Workspace (.env)

```bash
NODE_ENV=production
MONGODB_URI=mongodb://prod-server/abc_dashboard
JWT_SECRET=prod-secret-key
CLIENT_URL=https://yourdomain.com

# Email - Google Workspace
EMAIL_SERVICE=google-workspace
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=ABC Dashboard
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=admin@yourdomain.com
EMAIL_PASS=abcd-efgh-ijkl-mnop
```

## Testing & Validation

### Configuration Testing

```mermaid
flowchart TD
    A[Run Test] --> B[npm run test:email-config]
    B --> C{Service Type}

    C -->|mailhog| D[Validate Local Config]
    C -->|sendgrid| E[Validate API Key]
    C -->|google-workspace| F[Validate SMTP]

    D --> G[Check Port 1025]
    E --> H[Check SG. prefix]
    F --> I[Check App Password]

    G --> J[✅ Config Valid]
    H --> J
    I --> J

    J --> K[Display Setup Instructions]
    K --> L[Test Email Send]

    style A fill:#e1f5fe
    style J fill:#e8f5e8
    style L fill:#e8f5e8
```

### Integration Testing

```bash
# Test email configuration
npm run test:email-config

# Test user registration (triggers welcome email)
curl -X POST http://localhost:5000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","displayName":"Test User","role":"staff"}'

# Test password reset (triggers reset email)
curl -X POST http://localhost:5000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Troubleshooting Guide

### Common Issues by Service

```mermaid
flowchart TD
    A[Email Not Sending] --> B{Which Service?}

    B -->|MailHog| C[Check localhost:1025]
    B -->|SendGrid| D[Check API Key]
    B -->|Google Workspace| E[Check App Password]

    C --> C1[Is MailHog running?]
    C --> C2[Check port 1025 open?]

    D --> D1[API key starts with SG.?]
    D --> D2[Sender email verified?]
    D --> D3[Daily limit exceeded?]

    E --> E1[2FA enabled?]
    E --> E2[App Password correct?]
    E --> E3[Less secure app access?]

    F[Network Issues] --> G[Firewall blocking?]
    F --> H[DNS resolution?]
    F --> I[VPN interfering?]

    J[Rate Limiting] --> K[Check service limits]
    J --> L[Implement backoff]
    J --> M[Upgrade plan]

    style A fill:#ffebee
    style F fill:#fff3e0
    style J fill:#fff3e0
```

### Error Code Reference

| Service  | Error Code   | Meaning             | Solution                      |
| -------- | ------------ | ------------------- | ----------------------------- |
| SendGrid | 401          | Invalid API Key     | Regenerate API key            |
| SendGrid | 403          | Sender Not Verified | Verify sender email           |
| SendGrid | 429          | Rate Limited        | Implement exponential backoff |
| Google   | 535          | Auth Failed         | Check App Password            |
| Google   | 550          | Quota Exceeded      | Wait or upgrade               |
| General  | ECONNREFUSED | Connection Failed   | Check network/firewall        |

## Migration Between Services

### Service Migration Flow

```mermaid
flowchart TD
    A[Current Service] --> B{Target Service}

    B -->|MailHog → SendGrid| C[Update .env]
    B -->|MailHog → Google| D[Update .env]
    B -->|SendGrid → Google| E[Update .env]
    B -->|Google → SendGrid| F[Update .env]

    C --> G[Set SENDGRID_API_KEY]
    D --> H[Set EMAIL_USER/PASS]
    E --> I[Remove API key, add SMTP]
    F --> J[Remove SMTP, add API key]

    G --> K[Test Configuration]
    H --> K
    I --> K
    J --> K

    K --> L[Deploy Changes]
    L --> M[Monitor Email Delivery]
    M --> N[Rollback if Issues]

    style A fill:#e1f5fe
    style N fill:#ffebee
```

### Zero-Downtime Migration

1. **Update Configuration**: Add new service credentials alongside existing ones
2. **Dual Sending**: Send emails to both services temporarily
3. **Gradual Cutover**: Switch traffic gradually using feature flags
4. **Monitor**: Watch for delivery issues and bounce rates
5. **Complete Migration**: Remove old service configuration

## Security Considerations

### Authentication Methods

```mermaid
graph LR
    A[Authentication] --> B[MailHog]
    A --> C[SendGrid]
    A --> D[Google Workspace]

    B --> E[No Auth Required]
    C --> F[API Key]
    D --> G[App Password]

    E --> H[Development Only]
    F --> I[Bearer Token]
    G --> J[16-char Password]

    K[Security Level] --> L[Low]
    K --> M[High]
    K --> N[Medium]

    style A fill:#e1f5fe
    style H fill:#ffebee
    style I fill:#e8f5e8
    style J fill:#fff3e0
```

### Best Practices

- 🔐 **Store credentials securely** (environment variables, secret managers)
- 🔄 **Rotate API keys regularly** (SendGrid, App Passwords)
- 📊 **Monitor for anomalies** (unusual sending patterns)
- 🚨 **Set up alerts** (high bounce rates, auth failures)
- 📝 **Log email activities** (GDPR compliance)
- 🔒 **Use HTTPS** for webhook endpoints

## Future Enhancements

### Planned Features

```mermaid
roadmap
    title Email Service Roadmap
    section Q1 2025
      Add email templates editor :active, ep1, 2025-01-01, 2025-03-31
      Implement webhook notifications :active, ep2, 2025-01-15, 2025-03-15
    section Q2 2025
      Add email analytics dashboard :planned, ep3, 2025-04-01, 2025-06-30
      Implement A/B testing for templates :planned, ep4, 2025-04-15, 2025-06-15
    section Q3 2025
      Add multi-provider failover :planned, ep5, 2025-07-01, 2025-09-30
      Implement email queuing system :planned, ep6, 2025-07-15, 2025-09-15
    section Q4 2025
      Add advanced spam filtering :planned, ep7, 2025-10-01, 2025-12-31
      Implement email archiving :planned, ep8, 2025-10-15, 2025-12-15
```

---

## Quick Reference

### Commands

```bash
# Test configuration
npm run test:email-config

# Start development server
npm run dev

# Run all tests
npm test

# Check health
curl http://localhost:5000/api/v1/health
```

### ENV

- `EMAIL_SERVICE`: `mailhog` | `sendgrid` | `google-workspace`
- `SENDGRID_API_KEY`: SendGrid API key (SG.xxxxx)
- `EMAIL_HOST`: SMTP host
- `EMAIL_PORT`: SMTP port
- `EMAIL_USER`: SMTP username
- `EMAIL_PASS`: SMTP password/App Password
- `EMAIL_FROM`: Sender email address

### Support Contacts

- **MailHog**: Community forums
- **SendGrid**: support.sendgrid.com
- **Google Workspace**: support.google.com/workspace

---
