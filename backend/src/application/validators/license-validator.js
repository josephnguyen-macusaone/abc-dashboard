import { ValidationException } from '../../domain/exceptions/domain.exception.js';

const STATUS_VALUES = ['active', 'cancel', 'pending', 'expired'];
const PLAN_VALUES = ['Basic', 'Premium', 'Enterprise'];
const TERM_VALUES = ['monthly', 'yearly'];

function ensureString(value, field, maxLength) {
  if (value === undefined) return;
  if (typeof value !== 'string') {
    throw new ValidationException(`${field} must be a string`);
  }
  if (maxLength && value.length > maxLength) {
    throw new ValidationException(`${field} must not exceed ${maxLength} characters`);
  }
}

function ensureNumber(value, field) {
  if (value === undefined) return;
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationException(`${field} must be a number`);
  }
  if (value < 0) {
    throw new ValidationException(`${field} must be greater than or equal to 0`);
  }
}

export class LicenseValidator {
  static validateListQuery(query) {
    const sanitized = {
      page: Math.max(1, parseInt(query.page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10)),
      sortBy: query.sortBy,
      sortOrder: ['asc', 'desc'].includes(query.sortOrder) ? query.sortOrder : 'desc',
    };

    if (query.status) {
      if (!STATUS_VALUES.includes(query.status)) {
        throw new ValidationException('Invalid status value');
      }
      sanitized.status = query.status;
    }

    // Search parameter searches DBA field
    if (query.search) {
      sanitized.search = query.search.toString();
    } else if (query.dba) {
      // Legacy dba filter (for backward compatibility)
      sanitized.dba = query.dba.toString();
    }

    const sortableFields = [
      'id',
      'dba',
      'zip',
      'startDay',
      'status',
      'plan',
      'term',
      'lastPayment',
      'lastActive',
      'smsPurchased',
      'smsSent',
      'smsBalance',
      'agents',
      'agentsCost',
      'createdAt',
      'updatedAt',
    ];

    sanitized.sortBy = sortableFields.includes(query.sortBy) ? query.sortBy : 'createdAt';

    return sanitized;
  }

  static validateCreateInput(input) {
    ensureString(input.dba, 'dba', 255);
    if (!input.dba) {
      throw new ValidationException('dba is required');
    }

    ensureString(input.zip, 'zip', 10);
    ensureString(input.startDay, 'startDay');

    if (!input.startDay) {
      throw new ValidationException('startDay is required');
    }

    if (input.status && !STATUS_VALUES.includes(input.status)) {
      throw new ValidationException(`status must be one of: ${STATUS_VALUES.join(', ')}`);
    }

    if (input.plan && !PLAN_VALUES.includes(input.plan)) {
      throw new ValidationException(`plan must be one of: ${PLAN_VALUES.join(', ')}`);
    }

    if (input.term && !TERM_VALUES.includes(input.term)) {
      throw new ValidationException(`term must be one of: ${TERM_VALUES.join(', ')}`);
    }

    if (input.status === 'cancel' && !input.cancelDate) {
      throw new ValidationException('cancelDate is required when status is cancel');
    }

    ensureNumber(input.lastPayment, 'lastPayment');
    ensureNumber(input.smsPurchased, 'smsPurchased');
    ensureNumber(input.smsSent, 'smsSent');
    ensureNumber(input.agents, 'agents');
    ensureNumber(input.agentsCost, 'agentsCost');

    if (input.agentsName && !Array.isArray(input.agentsName)) {
      throw new ValidationException('agentsName must be an array');
    }
  }

  static validateUpdateInput(input) {
    // Reuse create validation for fields present
    ensureString(input.dba, 'dba', 255);
    ensureString(input.zip, 'zip', 10);
    ensureString(input.startDay, 'startDay');

    if (input.status && !STATUS_VALUES.includes(input.status)) {
      throw new ValidationException(`status must be one of: ${STATUS_VALUES.join(', ')}`);
    }

    if (input.plan && !PLAN_VALUES.includes(input.plan)) {
      throw new ValidationException(`plan must be one of: ${PLAN_VALUES.join(', ')}`);
    }

    if (input.term && !TERM_VALUES.includes(input.term)) {
      throw new ValidationException(`term must be one of: ${TERM_VALUES.join(', ')}`);
    }

    if (input.status === 'cancel' && input.cancelDate === undefined) {
      throw new ValidationException('cancelDate is required when status is cancel');
    }

    ensureNumber(input.lastPayment, 'lastPayment');
    ensureNumber(input.smsPurchased, 'smsPurchased');
    ensureNumber(input.smsSent, 'smsSent');
    ensureNumber(input.agents, 'agents');
    ensureNumber(input.agentsCost, 'agentsCost');

    if (input.agentsName && !Array.isArray(input.agentsName)) {
      throw new ValidationException('agentsName must be an array');
    }
  }

  static validateBulkUpdateInput(body) {
    if (!body.updates || !Array.isArray(body.updates)) {
      throw new ValidationException('updates must be an array');
    }
  }

  static validateBulkCreateInput(body) {
    if (!body.licenses || !Array.isArray(body.licenses)) {
      throw new ValidationException('licenses must be an array');
    }
    body.licenses.forEach((license) => this.validateCreateInput(license));
  }

  static validateIdsArray(body) {
    if (!Array.isArray(body.ids)) {
      throw new ValidationException('ids must be an array');
    }
  }
}
