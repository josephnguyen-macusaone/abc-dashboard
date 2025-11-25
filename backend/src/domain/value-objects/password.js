/**
 * Password Value Object
 * Represents a validated password with business rules
 */
export class Password {
  constructor(value, isHashed = false) {
    if (!value || typeof value !== 'string') {
      throw new Error('Password is required and must be a string');
    }

    if (isHashed) {
      // If already hashed, just store it
      this.hashedValue = value;
      this.isHashed = true;
    } else {
      // Validate plain password
      this.validatePlainPassword(value);
      this.plainValue = value;
      this.isHashed = false;
    }
  }

  /**
   * Validate plain password against business rules
   */
  validatePlainPassword(password) {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      throw new Error('Password must not exceed 128 characters');
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new Error('Password is too common. Please choose a stronger password');
    }
  }

  /**
   * Get password strength score (0-4)
   * 0 = Very Weak, 1 = Weak, 2 = Fair, 3 = Good, 4 = Strong
   */
  getStrengthScore() {
    if (this.isHashed) {
      throw new Error('Cannot calculate strength of hashed password');
    }

    let score = 0;
    const password = this.plainValue;

    // Length check
    if (password.length >= 12) score += 1;
    else if (password.length >= 8) score += 0.5;

    // Character variety
    if (/[A-Z]/.test(password)) score += 0.5;
    if (/[a-z]/.test(password)) score += 0.5;
    if (/\d/.test(password)) score += 0.5;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 0.5;

    // Bonus for longer passwords
    if (password.length >= 16) score += 0.5;

    return Math.min(4, Math.floor(score));
  }

  /**
   * Get strength description
   */
  getStrengthDescription() {
    const score = this.getStrengthScore();
    const descriptions = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return descriptions[score];
  }

  /**
   * Check if password meets minimum requirements
   */
  meetsMinimumRequirements() {
    return this.getStrengthScore() >= 2; // At least Fair
  }

  /**
   * Get the plain value (only if not hashed)
   */
  getPlainValue() {
    if (this.isHashed) {
      throw new Error('Cannot get plain value of hashed password');
    }
    return this.plainValue;
  }

  /**
   * Get the hashed value
   */
  getHashedValue() {
    if (!this.isHashed) {
      throw new Error('Password is not hashed yet');
    }
    return this.hashedValue;
  }

  /**
   * Set hashed value
   */
  setHashedValue(hashedValue) {
    this.hashedValue = hashedValue;
    this.isHashed = true;
    this.plainValue = undefined;
  }

  /**
   * Convert to string (for debugging only, never log passwords)
   */
  toString() {
    return '[PASSWORD]';
  }
}
