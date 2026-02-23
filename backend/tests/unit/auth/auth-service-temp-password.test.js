import { AuthService } from '../../../src/shared/services/auth-service.js';

describe('AuthService generateTemporaryPassword', () => {
  const service = new AuthService();

  it('returns a 16+ char password with mixed character classes', () => {
    const password = service.generateTemporaryPassword();

    expect(password.length).toBeGreaterThanOrEqual(16);
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[A-Z]/.test(password)).toBe(true);
    expect(/[0-9]/.test(password)).toBe(true);
    expect(/[!@#$%^&*]/.test(password)).toBe(true);
  });
});
