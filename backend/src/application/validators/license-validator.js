import { ValidationException } from '../../domain/exceptions/domain.exception.js';
import logger from '../../infrastructure/config/logger.js';

const STATUS_VALUES = ['active', 'cancel'];
const PLAN_VALUES = ['Basic', 'Premium'];
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

    // ========================================================================
    // Multi-field Search (Phase 2.1)
    // ========================================================================
    if (query.search) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.search = query.search.toString();

      // Search field selector (optional); agentsName searches the agents_name jsonb column
      if (
        query.searchField &&
        ['key', 'dba', 'product', 'plan', 'agentsName'].includes(query.searchField)
      ) {
        sanitized.filters.searchField = query.searchField;
      }
    }

    // ========================================================================
    // Individual Field Filters
    // ========================================================================
    if (query.key) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.key = query.key.toString();
    }
    if (query.product) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.product = query.product.toString();
    }
    // ========================================================================
    // Status, Plan, and Term Filters (support arrays)
    // ========================================================================
    if (query.status) {
      // List endpoint allows only active and expired
      const LIST_STATUS_VALUES = ['active', 'cancel'];
      const statusValues = Array.isArray(query.status)
        ? query.status
        : query.status
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

      for (const status of statusValues) {
        if (!LIST_STATUS_VALUES.includes(status)) {
          throw new ValidationException(
            `Invalid status value "${status}". Must be one of: ${LIST_STATUS_VALUES.join(', ')}`
          );
        }
      }

      sanitized.filters = sanitized.filters || {};
      sanitized.filters.status = statusValues.length === 1 ? statusValues[0] : statusValues;
    }

    if (query.plan) {
      // Handle comma-separated plan values (e.g., "Basic,Premium")
      const planValues = Array.isArray(query.plan)
        ? query.plan
        : query.plan
            .split(',')
            .map((p) => p.trim())
            .filter((p) => p.length > 0);

      // Validate each plan value
      for (const plan of planValues) {
        if (!PLAN_VALUES.includes(plan)) {
          throw new ValidationException(
            `Invalid plan value "${plan}". Must be one of: ${PLAN_VALUES.join(', ')}`
          );
        }
      }

      sanitized.filters = sanitized.filters || {};
      sanitized.filters.plan = planValues.length === 1 ? planValues[0] : planValues;
    }

    if (query.term) {
      // Handle comma-separated term values (e.g., "monthly,yearly")
      const termValues = Array.isArray(query.term)
        ? query.term
        : query.term
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);

      // Validate each term value
      for (const term of termValues) {
        if (!TERM_VALUES.includes(term)) {
          throw new ValidationException(
            `Invalid term value "${term}". Must be one of: ${TERM_VALUES.join(', ')}`
          );
        }
      }

      sanitized.filters = sanitized.filters || {};
      sanitized.filters.term = termValues.length === 1 ? termValues[0] : termValues;
    }

    // ========================================================================
    // Date Range Filters (start date = license starts_at)
    // startDate/endDate and startsAtFrom/startsAtTo both supported
    // ========================================================================
    const startFromRaw = query.startDate ?? query.startsAtFrom;
    const startToRaw = query.endDate ?? query.startsAtTo;
    if (startFromRaw) {
      const date = new Date(startFromRaw);
      if (!isNaN(date.getTime())) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.startsAtFrom = date.toISOString();
      }
    }
    if (startToRaw) {
      const date = new Date(startToRaw);
      if (!isNaN(date.getTime())) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.startsAtTo = date.toISOString();
      }
    }
    if (query.expiresAtFrom) {
      const date = new Date(query.expiresAtFrom);
      if (!isNaN(date.getTime())) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.expiresAtFrom = date.toISOString();
      }
    }
    if (query.expiresAtTo) {
      const date = new Date(query.expiresAtTo);
      if (!isNaN(date.getTime())) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.expiresAtTo = date.toISOString();
      }
    }
    if (query.updatedAtFrom) {
      const date = new Date(query.updatedAtFrom);
      if (!isNaN(date.getTime())) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.updatedAtFrom = date.toISOString();
      }
    }
    if (query.updatedAtTo) {
      const date = new Date(query.updatedAtTo);
      if (!isNaN(date.getTime())) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.updatedAtTo = date.toISOString();
      }
    }

    // ========================================================================
    // Advanced Filters (Phase 2.3)
    // ========================================================================
    if (query.zip) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.zip = query.zip.toString();
    }

    if (query.seatsMin !== undefined) {
      const min = parseInt(query.seatsMin, 10);
      if (!isNaN(min) && min >= 0) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.seatsMin = min;
      }
    }
    if (query.seatsMax !== undefined) {
      const max = parseInt(query.seatsMax, 10);
      if (!isNaN(max) && max >= 0) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.seatsMax = max;
      }
    }

    if (query.utilizationMin !== undefined) {
      const min = parseFloat(query.utilizationMin);
      if (!isNaN(min) && min >= 0 && min <= 100) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.utilizationMin = min;
      }
    }
    if (query.utilizationMax !== undefined) {
      const max = parseFloat(query.utilizationMax);
      if (!isNaN(max) && max >= 0 && max <= 100) {
        sanitized.filters = sanitized.filters || {};
        sanitized.filters.utilizationMax = max;
      }
    }

    if (query.hasAvailableSeats !== undefined && typeof query.hasAvailableSeats === 'boolean') {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.hasAvailableSeats = query.hasAvailableSeats;
    }

    // ========================================================================
    // Sorting
    // ========================================================================
    const sortableFields = [
      'id',
      'key',
      'product',
      'plan',
      'status',
      'term',
      'seatsTotal',
      'seatsUsed',
      'utilizationPercent',
      'startsAt',
      'expiresAt',
      'dba',
      'zip',
      'lastPayment',
      'smsPurchased',
      'smsSent',
      'smsBalance',
      'agents',
      'agentsCost',
      'notes',
      'createdAt',
      'updatedAt',
    ];

    sanitized.sortBy = sortableFields.includes(query.sortBy) ? query.sortBy : 'createdAt';

    return sanitized;
  }

  static validateCreateInput(input) {
    // Required fields for license creation
    ensureString(input.key, 'key', 255);
    if (!input.key || input.key.trim() === '') {
      throw new ValidationException('key is required');
    }

    ensureString(input.product, 'product', 100);
    if (!input.product || input.product.trim() === '') {
      throw new ValidationException('product is required');
    }

    ensureString(input.plan, 'plan', 100);
    if (!input.plan || input.plan.trim() === '') {
      throw new ValidationException('plan is required');
    }

    // StartDay is required and must be a valid date (API field name)
    const startDate = input.startDay || input.startsAt; // Support both field names for compatibility
    if (!startDate) {
      throw new ValidationException('startDay is required');
    }
    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      throw new ValidationException('startDay must be a valid date');
    }

    // SeatsTotal is optional with default value of 1
    if (input.seatsTotal === undefined || input.seatsTotal === null) {
      input.seatsTotal = 1; // Default to 1 seat
    }

    // Optional validations
    ensureString(input.dba, 'dba', 255);
    ensureString(input.zip, 'zip', 10);

    if (input.status && !STATUS_VALUES.includes(input.status)) {
      throw new ValidationException(`status must be one of: ${STATUS_VALUES.join(', ')}`);
    }

    if (input.term && !TERM_VALUES.includes(input.term)) {
      throw new ValidationException(`term must be one of: ${TERM_VALUES.join(', ')}`);
    }

    // Expiry date validation - allow invalid dates for existing data compatibility
    if (input.expiresAt) {
      const expiresAt = new Date(input.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        logger.warn('License has invalid expiresAt date', {
          key: input.key || 'unknown',
          expiresAt: input.expiresAt,
        });
      } else if (expiresAt <= startsAt) {
        logger.warn('License has expiresAt before startsAt', {
          key: input.key || 'unknown',
          expiresAt: input.expiresAt,
          startsAt: input.startsAt,
        });
      }
    }

    if (input.cancelDate) {
      const cancelDate = new Date(input.cancelDate);
      if (isNaN(cancelDate.getTime())) {
        throw new ValidationException('cancelDate must be a valid date');
      }
    }

    ensureNumber(input.lastPayment, 'lastPayment');
    ensureNumber(input.smsPurchased, 'smsPurchased');
    ensureNumber(input.smsSent, 'smsSent');
    ensureNumber(input.agents, 'agents');
    ensureNumber(input.agentsCost, 'agentsCost');

    ensureString(input.agentsName, 'agentsName', 500);

    ensureString(input.notes, 'notes');
  }

  static validateUpdateInput(input) {
    // Optional field validations (only validate if provided)

    if (input.key !== undefined) {
      ensureString(input.key, 'key', 255);
      if (input.key && input.key.trim() === '') {
        throw new ValidationException('key cannot be empty');
      }
    }

    if (input.product !== undefined) {
      ensureString(input.product, 'product', 100);
      if (input.product && input.product.trim() === '') {
        throw new ValidationException('product cannot be empty');
      }
    }

    if (input.plan !== undefined) {
      ensureString(input.plan, 'plan', 100);
      if (input.plan && input.plan.trim() === '') {
        throw new ValidationException('plan cannot be empty');
      }
    }

    if (input.status !== undefined && !STATUS_VALUES.includes(input.status)) {
      throw new ValidationException(`status must be one of: ${STATUS_VALUES.join(', ')}`);
    }

    if (input.term !== undefined && !TERM_VALUES.includes(input.term)) {
      throw new ValidationException(`term must be one of: ${TERM_VALUES.join(', ')}`);
    }

    // Date validations
    if (input.startsAt !== undefined) {
      const startsAt = new Date(input.startsAt);
      if (isNaN(startsAt.getTime())) {
        throw new ValidationException('startsAt must be a valid date');
      }
    }

    if (input.expiresAt !== undefined) {
      const expiresAt = new Date(input.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        throw new ValidationException('expiresAt must be a valid date');
      }
    }

    if (input.cancelDate !== undefined) {
      const cancelDate = new Date(input.cancelDate);
      if (isNaN(cancelDate.getTime())) {
        throw new ValidationException('cancelDate must be a valid date');
      }
    }

    // Numeric validations
    ensureNumber(input.seatsTotal, 'seatsTotal');
    if (input.seatsTotal !== undefined && input.seatsTotal < 1) {
      throw new ValidationException('seatsTotal must be greater than 0');
    }

    ensureNumber(input.seatsUsed, 'seatsUsed');
    if (input.seatsUsed !== undefined && input.seatsUsed < 0) {
      throw new ValidationException('seatsUsed cannot be negative');
    }

    ensureString(input.dba, 'dba', 255);
    ensureString(input.zip, 'zip', 10);
    ensureNumber(input.lastPayment, 'lastPayment');
    ensureNumber(input.smsPurchased, 'smsPurchased');
    ensureNumber(input.smsSent, 'smsSent');
    ensureNumber(input.agents, 'agents');
    ensureNumber(input.agentsCost, 'agentsCost');
    ensureString(input.notes, 'notes');
    ensureString(input.agentsName, 'agentsName', 500);
  }

  static validateBulkUpdateInput(body) {
    // Support both formats:
    // 1. { updates: [{ id, updates: {...} }] } - structured format
    // 2. [{ id, ...fields }] - direct array format (current frontend usage)

    let licensesToUpdate = [];

    if (body.updates && Array.isArray(body.updates)) {
      // Structured format: { updates: [{ id, updates: {...} }] }
      licensesToUpdate = body.updates;
    } else if (Array.isArray(body) && body.length > 0) {
      // Direct array format: [{ id, ...fields }]
      licensesToUpdate = body.map((license) => ({
        id: license.id,
        updates: { ...license },
      }));
      // Remove id from updates since it's used as the key
      licensesToUpdate.forEach((item) => delete item.updates.id);
    } else {
      throw new ValidationException(
        'Invalid bulk update format. Expected either {updates: [...]} or direct array of licenses'
      );
    }

    if (licensesToUpdate.length === 0) {
      throw new ValidationException('No licenses provided for update');
    }

    // Validate each update item has required id and some updates
    licensesToUpdate.forEach((item, index) => {
      if (!item.id) {
        throw new ValidationException(`License at index ${index} is missing required 'id' field`);
      }
      if (!item.updates || Object.keys(item.updates).length === 0) {
        throw new ValidationException(`License at index ${index} has no fields to update`);
      }
    });
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
