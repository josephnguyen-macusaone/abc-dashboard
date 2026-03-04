/**
 * Mask PII for safe logging. Never log raw email, token, or password.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '[redacted]';
  const at = email.indexOf('@');
  if (at <= 0) return '[redacted]';
  const local = email.slice(0, Math.min(2, at));
  const domain = email.slice(at + 1);
  return `${local}***@${domain}`;
}
