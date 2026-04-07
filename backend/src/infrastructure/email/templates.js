const baseStyles = `
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f8fafc;
  color: #0f172a;
`;

const cardStyles = `
  max-width: 640px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
`;

const buttonStyles = `
  display: inline-block;
  padding: 14px 28px;
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #ffffff;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 600;
`;

/** User-provided values in HTML mail must be escaped or a broken tag can yield an empty client body. */
function escapeEmailHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeEmailAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const emailTemplates = {
  welcomeWithPassword: (data) => ({
    subject: 'Welcome to ABC Dashboard – Your Account Details',
    html: `
      <div style="${baseStyles}; padding: 24px;">
        <div style="${cardStyles}">
          <h2 style="margin: 0 0 8px 0; font-size: 22px;">Welcome, ${data.displayName}!</h2>
          <p style="margin: 0 0 16px 0; color: #475569;">Your account has been created. Use the details below to sign in and change your password on first login.</p>
          ${
            data.role
              ? `<p style="margin: 0 0 12px 0; color: #334155;">Assigned role: <strong>${data.role}</strong></p>`
              : ''
          }

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin:16px 0;">
            <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${data.email}</p>
            <p style="margin:0 0 8px 0;"><strong>Username:</strong> ${data.username}</p>
            <p style="margin:0;"><strong>Temporary password:</strong>
              <span style="background:#e2e8f0; padding:4px 8px; border-radius:6px; font-family:monospace;">${data.password}</span>
            </p>
          </div>

          <div style="text-align:center; margin:24px 0;">
            <a href="${data.loginUrl}" style="${buttonStyles}">Login to ABC Dashboard</a>
          </div>

          <p style="margin:0 0 8px 0; color:#475569;">Steps:</p>
          <ol style="margin:0 0 16px 20px; color:#475569;">
            <li>Click the button above.</li>
            <li>Sign in with your email/username and the temporary password.</li>
            <li>Set a new password when prompted.</li>
          </ol>

          ${
            data.managerName
              ? `<div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px; margin-top:12px;">
                  <strong>Manager:</strong> ${data.managerName}
                </div>`
              : ''
          }
        </div>
      </div>
    `,
    text: `
Welcome, ${data.displayName}!

Your account has been created. Use the details below to sign in and change your password on first login.
${data.role ? `Role: ${data.role}` : ''}

Email: ${data.email}
Username: ${data.username}
Temporary password: ${data.password}

Login: ${data.loginUrl}

Steps:
1) Open the login link
2) Sign in with the email/username and temporary password
3) Change your password when prompted
${data.managerName ? `Manager: ${data.managerName}` : ''}
    `,
  }),

  emailVerification: (data) => ({
    subject: 'Verify your email – ABC Dashboard',
    html: `
      <div style="${baseStyles}; padding: 24px;">
        <div style="${cardStyles}">
          <h2 style="margin: 0 0 8px 0; font-size: 22px;">Verify your email address</h2>
          <p style="margin: 0 0 16px 0; color: #475569;">Hi ${data.displayName}, thanks for signing up! Click the button below to confirm your email address and activate your account.</p>

          <div style="text-align:center; margin:24px 0;">
            <a href="${data.verifyUrl}" style="${buttonStyles}">Verify Email Address</a>
          </div>

          <p style="margin:0 0 8px 0; color:#94a3b8; font-size:13px;">This link expires in 24 hours.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">If you didn't create an account, you can safely ignore this email.</p>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-top:16px; word-break:break-all;">
            <p style="margin:0; color:#64748b; font-size:12px;">Or copy this link into your browser:</p>
            <p style="margin:4px 0 0 0; color:#475569; font-size:12px; font-family:monospace;">${data.verifyUrl}</p>
          </div>
        </div>
      </div>
    `,
    text: `
Verify your email address

Hi ${data.displayName}, thanks for signing up for ABC Dashboard!

Click the link below to verify your email and activate your account:
${data.verifyUrl}

This link expires in 24 hours.
If you didn't create an account, you can safely ignore this email.
    `,
  }),

  passwordReset: (data) => ({
    subject: 'Reset your password – ABC Dashboard',
    html: `
      <div style="${baseStyles}; padding: 24px;">
        <div style="${cardStyles}">
          <h2 style="margin: 0 0 8px 0; font-size: 22px;">Reset your password</h2>
          <p style="margin: 0 0 16px 0; color: #475569;">Hi ${data.displayName}, click the button below to choose a new password for your ABC Dashboard account.</p>

          <div style="text-align:center; margin:24px 0;">
            <a href="${data.resetUrl}" style="${buttonStyles}">Reset password</a>
          </div>

          <p style="margin:0 0 8px 0; color:#94a3b8; font-size:13px;">This link expires in 10 minutes.</p>
          <p style="margin:0; color:#94a3b8; font-size:13px;">If you didn’t request a password reset, you can safely ignore this email.</p>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-top:16px; word-break:break-all;">
            <p style="margin:0; color:#64748b; font-size:12px;">Or copy this link into your browser:</p>
            <p style="margin:4px 0 0 0; color:#475569; font-size:12px; font-family:monospace;">${data.resetUrl}</p>
          </div>
        </div>
      </div>
    `,
    text: `
Reset your password

Hi ${data.displayName}, use the link below to set a new password for your ABC Dashboard account. This link expires in 10 minutes.

${data.resetUrl}

If you didn’t request a password reset, you can ignore this email.
    `,
  }),

  passwordResetWithGeneratedPassword: (data) => ({
    subject: 'Your temporary password – ABC Dashboard',
    html: `
      <div style="${baseStyles}; padding: 24px;">
        <div style="${cardStyles}">
          <h2 style="margin: 0 0 8px 0; font-size: 22px;">Temporary password issued</h2>
          <p style="margin: 0 0 16px 0; color: #475569;">Hi ${data.displayName}, use this temporary password to sign in, then change it right away.</p>
          <div style="background:#fff7ed; border:1px solid #fdba74; border-radius:10px; padding:16px; margin:16px 0;">
            <strong>Temporary password:</strong>
            <span style="background:#fde68a; padding:4px 8px; border-radius:6px; font-family:monospace;">${data.temporaryPassword}</span>
          </div>
          <div style="text-align:center; margin:24px 0;">
            <a href="${data.loginUrl}" style="${buttonStyles}">Login to ABC Dashboard</a>
          </div>
          <p style="margin:0; color:#94a3b8; font-size:13px;">You’ll be prompted to change this password after login.</p>
        </div>
      </div>
    `,
    text: `
Temporary password issued

Hi ${data.displayName}, use this temporary password to sign in, then change it right away.
Temporary password: ${data.temporaryPassword}

Login: ${data.loginUrl}

You’ll be prompted to change this password after login.
    `,
  }),

  passwordResetConfirmation: (data) => {
    const safeName = escapeEmailHtml(data.displayName);
    const loginUrlRaw = String(data.loginUrl ?? '');
    const safeLoginHref = escapeEmailAttr(loginUrlRaw);
    const safeLoginVisible = escapeEmailHtml(loginUrlRaw);

    return {
      subject: 'Password reset successful – ABC Dashboard',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Password reset successful</title>
</head>
<body style="margin:0;padding:0;">
      <div style="${baseStyles}; padding: 24px;">
        <div style="${cardStyles}">
          <h2 style="margin: 0 0 8px 0; font-size: 22px;">Password reset successful</h2>
          <p style="margin: 0 0 16px 0; color: #475569;">Hi ${safeName}, your password has been updated. If this was not you, contact support immediately.</p>

          <div style="text-align:center; margin:24px 0;">
            <a href="${safeLoginHref}" style="${buttonStyles}">Log in to ABC Dashboard</a>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-top:16px; word-break:break-all;">
            <p style="margin:0; color:#64748b; font-size:12px;">Or copy this link into your browser:</p>
            <p style="margin:4px 0 0 0; color:#475569; font-size:12px; font-family:monospace;">${safeLoginVisible}</p>
          </div>
        </div>
      </div>
</body>
</html>`,
      text: `
Password reset successful

Hi ${data.displayName}, your password has been updated. If this was not you, contact support immediately.

Log in: ${loginUrlRaw}
    `,
    };
  },
};

export function renderEmailTemplate(template, data) {
  const templateConfig = emailTemplates[template];
  if (!templateConfig) {
    throw new Error(`Email template '${template}' not found`);
  }
  return templateConfig(data);
}
