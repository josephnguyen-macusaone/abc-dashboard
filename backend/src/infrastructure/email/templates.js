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

export const emailTemplates = {
  welcomeWithPassword: (data) => ({
    subject: 'Welcome to ABC Dashboard – Your Account Details',
    html: `
      <div style="${baseStyles}; padding: 24px;">
        <div style="${cardStyles}">
          <h2 style="margin: 0 0 8px 0; font-size: 22px;">Welcome, ${data.displayName}!</h2>
          <p style="margin: 0 0 16px 0; color: #475569;">Your account has been created. Use the details below to sign in and change your password on first login.</p>

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

  passwordReset: (data) => ({
    subject: 'Reset your password – ABC Dashboard',
    html: `
      <div style="${baseStyles}; padding: 24px;">
        <div style="${cardStyles}">
          <h2 style="margin: 0 0 8px 0; font-size: 22px;">Reset your password</h2>
          <p style="margin: 0 0 16px 0; color: #475569;">Hi ${data.displayName}, use the button below to set a new password. This link expires in 10 minutes.</p>
          <div style="text-align:center; margin:24px 0;">
            <a href="${data.resetUrl}" style="${buttonStyles}">Reset Password</a>
          </div>
          <p style="margin:0; color:#94a3b8; font-size:13px;">If you didn’t request this, you can ignore this email.</p>
        </div>
      </div>
    `,
    text: `
Reset your password

Hi ${data.displayName}, use the link below to set a new password. This link expires in 10 minutes.
${data.resetUrl}

If you didn’t request this, you can ignore this email.
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

  passwordResetConfirmation: (data) => ({
    subject: 'Password reset successful – ABC Dashboard',
    html: `
      <div style="${baseStyles}; padding: 24px;">
        <div style="${cardStyles}">
          <h2 style="margin: 0 0 8px 0; font-size: 22px;">Password reset successful</h2>
          <p style="margin: 0 0 16px 0; color: #475569;">Hi ${data.displayName}, your password has been updated. If this wasn’t you, contact support immediately.</p>
          <div style="text-align:center; margin:24px 0;">
            <a href="${data.loginUrl}" style="${buttonStyles}">Login</a>
          </div>
        </div>
      </div>
    `,
    text: `
Password reset successful

Hi ${data.displayName}, your password has been updated. If this wasn’t you, contact support immediately.

Login: ${data.loginUrl}
    `,
  }),
};

export function renderEmailTemplate(template, data) {
  const templateConfig = emailTemplates[template];
  if (!templateConfig) {
    throw new Error(`Email template '${template}' not found`);
  }
  return templateConfig(data);
}
