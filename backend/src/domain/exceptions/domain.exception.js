import { ErrorResponse } from '../../shared/utils/error-responses.js';

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

  toResponse() {
    return {
      success: false,
      message: this.message,
      error: {
        code: this.statusCode,
        message: this.message,
        category: this.category,
        ...(this.additionalData && Object.keys(this.additionalData).length > 0 && {
          details: this.additionalData
        })
      }
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

/**
 * Authorization Exceptions
 */
export class InsufficientPermissionsException extends DomainException {
  constructor(requiredRole) {
    super('INSUFFICIENT_PERMISSIONS', { requiredRole });
  }
}

/**
 * Validation Exceptions
 */
export class ValidationException extends DomainException {
  constructor(message = 'Validation failed') {
    super('VALIDATION_FAILED');
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
