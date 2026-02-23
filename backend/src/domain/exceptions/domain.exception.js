import { ErrorResponse } from '../../shared/http/error-responses.js';

/**
 * Base Domain Exception
 * All domain exceptions should extend this class
 */
export class DomainException extends Error {
  constructor(errorKey, templateData = {}, additionalData = {}) {
    const errorResponse = new ErrorResponse(errorKey, templateData, additionalData);

    super(errorResponse.message);
    this.name = this.constructor.name;
    this.errorKey = errorKey;
    this.statusCode = errorResponse.statusCode;
    this.category = errorResponse.category;
    this.additionalData = errorResponse.additionalData;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /** Returns canonical error shape: { success: false, error: { code, message, category, statusCode, details } } */
  toResponse() {
    return {
      success: false,
      error: {
        code: this.errorKey,
        message: this.message,
        category: this.category,
        statusCode: this.statusCode,
        details:
          this.additionalData && Object.keys(this.additionalData).length > 0
            ? this.additionalData
            : {},
      },
    };
  }
}

/**
 * Authentication Exceptions
 */
export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('INVALID_CREDENTIALS');
  }
}

export class AccountDeactivatedException extends DomainException {
  constructor() {
    super('ACCOUNT_DEACTIVATED');
  }
}

export class AccountLockedException extends DomainException {
  constructor(retryAfter) {
    super('ACCOUNT_LOCKED', {}, { retryAfter });
  }
}

export class TokenExpiredException extends DomainException {
  constructor() {
    super('TOKEN_EXPIRED');
  }
}

export class InvalidTokenException extends DomainException {
  constructor() {
    super('INVALID_TOKEN');
  }
}

export class InvalidRefreshTokenException extends DomainException {
  constructor() {
    super('INVALID_TOKEN');
  }
}

/**
 * Authorization Exceptions
 */
export class InsufficientPermissionsException extends DomainException {
  constructor(message = 'You do not have permission to perform this action') {
    super('INSUFFICIENT_PERMISSIONS', {}, { customMessage: message });
  }
}

/**
 * Validation Exceptions
 */
export class ValidationException extends DomainException {
  constructor(message = 'Validation failed') {
    super('VALIDATION_FAILED', {}, { customMessage: message });
    // Override message for custom validation errors
    this.message = message;
  }
}

export class RequiredFieldMissingException extends DomainException {
  constructor(fieldName) {
    super('REQUIRED_FIELD_MISSING', { fieldName });
  }
}

export class InvalidFieldValueException extends DomainException {
  constructor(fieldName) {
    super('INVALID_FIELD_VALUE', { fieldName });
  }
}

export class EmailAlreadyExistsException extends DomainException {
  constructor() {
    super('EMAIL_ALREADY_EXISTS');
  }
}

export class InvalidEmailFormatException extends DomainException {
  constructor() {
    super('INVALID_EMAIL_FORMAT');
  }
}

export class PasswordTooWeakException extends DomainException {
  constructor() {
    super('PASSWORD_TOO_WEAK');
  }
}

/**
 * Resource Exceptions
 */
export class ResourceNotFoundException extends DomainException {
  constructor(resource = 'Resource') {
    super('RESOURCE_NOT_FOUND');
    this.message = `${resource} not found`;
  }
}

export class ResourceAlreadyExistsException extends DomainException {
  constructor(resource = 'Resource') {
    super('RESOURCE_ALREADY_EXISTS');
    this.message = `${resource} already exists`;
  }
}

/**
 * Business Logic Exceptions
 */
export class BusinessRuleViolationException extends DomainException {
  constructor(message) {
    super('BUSINESS_RULE_VIOLATION');
    this.message = message;
  }
}

/**
 * Infrastructure Exceptions
 */
export class NetworkTimeoutException extends DomainException {
  constructor(operation = 'Operation') {
    super('NETWORK_TIMEOUT', { operation });
    this.message = `${operation} timed out. Please try again.`;
  }
}

export class ExternalServiceUnavailableException extends DomainException {
  constructor(service = 'External service') {
    super('EXTERNAL_SERVICE_UNAVAILABLE', { service });
    this.message = `${service} is temporarily unavailable. Please try again later.`;
  }
}

export class ConcurrentModificationException extends DomainException {
  constructor(resource = 'Resource') {
    super('CONCURRENT_MODIFICATION', { resource });
    this.message = `${resource} was modified by another process. Please refresh and try again.`;
  }
}

/**
 * Security Exceptions
 */
export class SecurityViolationException extends DomainException {
  constructor(violation = 'Security violation') {
    super('SECURITY_VIOLATION');
    this.message = violation;
  }
}

export class RateLimitExceededException extends DomainException {
  constructor(retryAfter = 60) {
    super('RATE_LIMIT_EXCEEDED', {}, { retryAfter });
    this.message = 'Too many requests. Please try again later.';
  }
}

/**
 * Data Integrity Exceptions
 */
export class DataIntegrityViolationException extends DomainException {
  constructor(details = 'Data integrity violation') {
    super('DATA_INTEGRITY_VIOLATION');
    this.message = details;
  }
}
