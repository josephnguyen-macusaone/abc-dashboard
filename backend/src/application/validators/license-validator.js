import { ValidationException } from '../../domain/exceptions/domain.exception.js';
import logger from '../../shared/utils/logger.js';

const STATUS_VALUES = ['active', 'cancel'];
const PLAN_VALUES = ['Basic', 'Premium', 'Print Check', 'Staff Performance', 'Unlimited SMS'];
const TERM_VALUES = ['monthly', 'yearly'];

function ensureString(value, field, maxLength) {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'string') {
    throw new ValidationException(`${field} must be a string`);
  }
  if (maxLength && value.length > maxLength) {
    throw new ValidationException(`${field} must not exceed ${maxLength} characters`);
  }
}

function ensureNumber(value, field) {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationException(`${field} must be a number`);
  }
  if (value < 0) {
    throw new ValidationException(`${field} must be greater than or equal to 0`);
  }
}

const LIST_STATUS_VALUES = ['active', 'cancel'];
const SORTABLE_FIELDS = [
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
  'dueDate',
  'dba',
  'zip',
  'lastPayment',
  'lastActive',
  'smsPurchased',
  'smsSent',
  'smsBalance',
  'agents',
  'agentsCost',
  'notes',
  'createdAt',
  'updatedAt',
];
const SEARCH_FIELD_OPTIONS = ['key', 'dba', 'product', 'plan', 'agentsName', 'zip'];

export class LicenseValidator {
  static validateListQuery(query) {
    const sanitized = {
      page: Math.max(1, parseInt(query.page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10)),
      sortBy: query.sortBy,
      sortOrder: ['asc', 'desc'].includes(query.sortOrder) ? query.sortOrder : 'desc',
    };
    LicenseValidator._applyListSearch(sanitized, query);
    LicenseValidator._applyListFieldFilters(sanitized, query);
    LicenseValidator._applyListStatusPlanTerm(sanitized, query);
    LicenseValidator._applyListDateFilters(sanitized, query);
    LicenseValidator._applyListAdvancedFilters(sanitized, query);
    sanitized.sortBy = SORTABLE_FIELDS.includes(query.sortBy) ? query.sortBy : 'createdAt';
    return sanitized;
  }

  static _applyListSearch(sanitized, query) {
    if (!query.search) {
      return;
    }
    sanitized.filters = sanitized.filters || {};
    sanitized.filters.search = query.search.toString();
    if (query.searchField && SEARCH_FIELD_OPTIONS.includes(query.searchField)) {
      sanitized.filters.searchField = query.searchField;
    }
  }

  static _applyListFieldFilters(sanitized, query) {
    if (query.key) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.key = query.key.toString();
    }
    if (query.product) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.product = query.product.toString();
    }
  }

  static _applyListStatusPlanTerm(sanitized, query) {
    LicenseValidator._applyListStatus(sanitized, query);
    LicenseValidator._applyListPlan(sanitized, query);
    LicenseValidator._applyListTerm(sanitized, query);
  }

  static _applyListStatus(sanitized, query) {
    if (!query.status) {
      return;
    }
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

  static _applyListPlan(sanitized, query) {
    if (!query.plan) {
      return;
    }
    const rawValues = Array.isArray(query.plan)
      ? query.plan
      : query.plan
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
    const planValues = rawValues.map((p) => {
      try {
        return decodeURIComponent(p.replace(/\+/g, ' '));
      } catch {
        return p;
      }
    });
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

  static _applyListTerm(sanitized, query) {
    if (!query.term) {
      return;
    }
    const termValues = Array.isArray(query.term)
      ? query.term
      : query.term
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
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

  static _applyListDateFilters(sanitized, query) {
    const setDateFilter = (key, raw) => {
      if (!raw) {
        return;
      }
      const date = new Date(raw);
      if (isNaN(date.getTime())) {
        return;
      }
      sanitized.filters = sanitized.filters || {};
      sanitized.filters[key] = date.toISOString();
    };
    setDateFilter('startsAtFrom', query.startDate ?? query.startsAtFrom);
    setDateFilter('startsAtTo', query.endDate ?? query.startsAtTo);
    setDateFilter('expiresAtFrom', query.expiresAtFrom);
    setDateFilter('expiresAtTo', query.expiresAtTo);
    setDateFilter('updatedAtFrom', query.updatedAtFrom);
    setDateFilter('updatedAtTo', query.updatedAtTo);
  }

  static _applyListAdvancedFilters(sanitized, query) {
    LicenseValidator._applyListZip(sanitized, query);
    LicenseValidator._applyListSeatsRange(sanitized, query);
    LicenseValidator._applyListUtilizationRange(sanitized, query);
    LicenseValidator._applyListHasAvailableSeats(sanitized, query);
  }

  static _applyListZip(sanitized, query) {
    if (query.zip) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.zip = query.zip.toString();
    }
  }

  static _applyListSeatsRange(sanitized, query) {
    const minSeats = parseInt(query.seatsMin, 10);
    if (query.seatsMin !== undefined && !isNaN(minSeats) && minSeats >= 0) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.seatsMin = minSeats;
    }
    const maxSeats = parseInt(query.seatsMax, 10);
    if (query.seatsMax !== undefined && !isNaN(maxSeats) && maxSeats >= 0) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.seatsMax = maxSeats;
    }
  }

  static _applyListUtilizationRange(sanitized, query) {
    const utilMin = parseFloat(query.utilizationMin);
    if (query.utilizationMin !== undefined && !isNaN(utilMin) && utilMin >= 0 && utilMin <= 100) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.utilizationMin = utilMin;
    }
    const utilMax = parseFloat(query.utilizationMax);
    if (query.utilizationMax !== undefined && !isNaN(utilMax) && utilMax >= 0 && utilMax <= 100) {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.utilizationMax = utilMax;
    }
  }

  static _applyListHasAvailableSeats(sanitized, query) {
    if (query.hasAvailableSeats !== undefined && typeof query.hasAvailableSeats === 'boolean') {
      sanitized.filters = sanitized.filters || {};
      sanitized.filters.hasAvailableSeats = query.hasAvailableSeats;
    }
  }

  static validateCreateInput(input) {
    LicenseValidator._validateCreateRequired(input);
    LicenseValidator._validateCreateOptional(input);
  }

  static _validateCreateRequired(input) {
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
    const startDate = input.startDay || input.startsAt;
    if (!startDate) {
      throw new ValidationException('startDay is required');
    }
    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      throw new ValidationException('startDay must be a valid date');
    }
    if (input.seatsTotal === undefined || input.seatsTotal === null) {
      input.seatsTotal = 1;
    }
  }

  static _validateCreateOptional(input) {
    LicenseValidator._validateCreateOptionalStrings(input);
    LicenseValidator._validateCreateOptionalEnums(input);
    LicenseValidator._validateCreateOptionalDates(input);
    LicenseValidator._validateCreateOptionalNumbers(input);
  }

  static _validateCreateOptionalStrings(input) {
    ensureString(input.dba, 'dba', 255);
    ensureString(input.zip, 'zip', 10);
    ensureString(input.agentsName, 'agentsName', 500);
    ensureString(input.notes, 'notes');
  }

  static _validateCreateOptionalEnums(input) {
    if (input.status && !STATUS_VALUES.includes(input.status)) {
      throw new ValidationException(`status must be one of: ${STATUS_VALUES.join(', ')}`);
    }
    if (input.term && !TERM_VALUES.includes(input.term)) {
      throw new ValidationException(`term must be one of: ${TERM_VALUES.join(', ')}`);
    }
  }

  static _validateCreateOptionalDates(input) {
    const startDate = input.startDay || input.startsAt;
    const startDateObj = startDate ? new Date(startDate) : null;
    if (input.expiresAt && startDateObj) {
      const expiresAt = new Date(input.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        logger.warn('License has invalid expiresAt date', {
          key: input.key || 'unknown',
          expiresAt: input.expiresAt,
        });
      } else if (expiresAt <= startDateObj) {
        logger.warn('License has expiresAt before startsAt', {
          key: input.key || 'unknown',
          expiresAt: input.expiresAt,
          startsAt: input.startsAt || input.startDay,
        });
      }
    }
    if (input.cancelDate) {
      const cancelDate = new Date(input.cancelDate);
      if (isNaN(cancelDate.getTime())) {
        throw new ValidationException('cancelDate must be a valid date');
      }
    }
  }

  static _validateCreateOptionalNumbers(input) {
    ensureNumber(input.lastPayment, 'lastPayment');
    ensureNumber(input.smsPurchased, 'smsPurchased');
    ensureNumber(input.smsSent, 'smsSent');
    ensureNumber(input.agents, 'agents');
    ensureNumber(input.agentsCost, 'agentsCost');
  }

  static validateUpdateInput(input) {
    LicenseValidator._validateUpdateStrings(input);
    LicenseValidator._validateUpdateEnums(input);
    LicenseValidator._validateUpdateDates(input);
    LicenseValidator._validateUpdateNumbers(input);
  }

  static _validateUpdateStrings(input) {
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
    ensureString(input.dba, 'dba', 255);
    ensureString(input.zip, 'zip', 10);
    ensureString(input.notes, 'notes');
    ensureString(input.agentsName, 'agentsName', 500);
  }

  static _validateUpdateEnums(input) {
    if (input.status !== undefined && !STATUS_VALUES.includes(input.status)) {
      throw new ValidationException(`status must be one of: ${STATUS_VALUES.join(', ')}`);
    }
    if (input.term !== undefined && !TERM_VALUES.includes(input.term)) {
      throw new ValidationException(`term must be one of: ${TERM_VALUES.join(', ')}`);
    }
  }

  static _validateUpdateDates(input) {
    if (input.startsAt !== undefined) {
      const d = new Date(input.startsAt);
      if (isNaN(d.getTime())) {
        throw new ValidationException('startsAt must be a valid date');
      }
    }
    if (input.expiresAt !== undefined) {
      const d = new Date(input.expiresAt);
      if (isNaN(d.getTime())) {
        throw new ValidationException('expiresAt must be a valid date');
      }
    }
    if (input.cancelDate !== undefined) {
      const d = new Date(input.cancelDate);
      if (isNaN(d.getTime())) {
        throw new ValidationException('cancelDate must be a valid date');
      }
    }
  }

  static _validateUpdateNumbers(input) {
    ensureNumber(input.seatsTotal, 'seatsTotal');
    if (input.seatsTotal !== undefined && input.seatsTotal < 1) {
      throw new ValidationException('seatsTotal must be greater than 0');
    }
    ensureNumber(input.seatsUsed, 'seatsUsed');
    if (input.seatsUsed !== undefined && input.seatsUsed < 0) {
      throw new ValidationException('seatsUsed cannot be negative');
    }
    ensureNumber(input.lastPayment, 'lastPayment');
    ensureNumber(input.smsPurchased, 'smsPurchased');
    ensureNumber(input.smsSent, 'smsSent');
    ensureNumber(input.agents, 'agents');
    ensureNumber(input.agentsCost, 'agentsCost');
  }

  static validateBulkUpdateInput(body) {
    // Support both formats:
    // 1. { updates: [{ id, updates: {...} }] } - structured format
    // 2. [{ id, ...fields }] - direct array format (current frontend usage)

    let licensesToUpdate;
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
