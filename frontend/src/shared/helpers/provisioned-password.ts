/**
 * Password rules for admin-provisioned accounts (aligned with backend AuthValidator.validatePassword).
 */
export function getProvisionedPasswordError(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

/**
 * Cryptographically strong password satisfying the provisioned-account policy.
 */
export function generateStrongProvisionedPassword(length = 18): string {
  const lowers = 'abcdefghjkmnpqrstuvwxyz';
  const uppers = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const extra = '!@#$%&*';
  const alphabet = lowers + uppers + digits + extra;

  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);

  const pick = (set: string, v: number) => set[v % set.length];

  const chars: string[] = [
    pick(lowers, buf[0]!),
    pick(uppers, buf[1]!),
    pick(digits, buf[2]!),
  ];

  for (let i = 3; i < length; i++) {
    chars.push(pick(alphabet, buf[i]!));
  }

  const swapBuf = new Uint32Array(chars.length);
  crypto.getRandomValues(swapBuf);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = swapBuf[i]! % (i + 1);
    const t = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = t;
  }

  return chars.join('');
}
