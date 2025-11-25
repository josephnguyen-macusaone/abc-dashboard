/**
 * Email Value Object
 * Represents a validated email address
 */
export class Email {
  constructor(value) {
    if (!value || typeof value !== 'string') {
      throw new Error('Email is required and must be a string');
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('Email cannot be empty');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error('Invalid email format');
    }

    this.value = trimmed.toLowerCase();
  }

  /**
   * Get domain part of email
   */
  getDomain() {
    return this.value.split('@')[1];
  }

  /**
   * Get local part of email (before @)
   */
  getLocalPart() {
    return this.value.split('@')[0];
  }

  /**
   * Check if email is from a common domain
   */
  isCommonDomain() {
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    return commonDomains.includes(this.getDomain());
  }

  /**
   * Convert to string
   */
  toString() {
    return this.value;
  }

  /**
   * Check equality with another Email
   */
  equals(other) {
    return other instanceof Email && this.value === other.value;
  }
}
