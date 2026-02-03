import logger from '../../infrastructure/config/logger.js';

/**
 * License Domain Entity
 * Represents the core business concept of a Software License
 */
export class License {
  constructor({
    // Identity
    id,
    key,

    // Product & Service
    product,
    plan,
    status,
    term,

    // Capacity & Usage
    seatsTotal,
    seatsUsed,
    agents,
    agentsName,

    // Financial
    lastPayment,
    smsPurchased,
    smsSent,
    smsBalance,
    agentsCost,

    // Location
    dba,
    zip,

    // Dates & Timeline
    startsAt,
    expiresAt,
    cancelDate,
    lastActive,

    // Content
    notes,

    // Lifecycle Management
    renewalRemindersSent,
    lastRenewalReminder,
    renewalDueDate,
    autoSuspendEnabled,
    gracePeriodDays,
    gracePeriodEnd,
    suspensionReason,
    suspendedAt,
    reactivatedAt,
    renewalHistory,

    // Audit
    createdBy,
    updatedBy,
    createdAt,
    updatedAt,

    // External sync fields (unified - no external_ prefix)
    appid,
    countid,
    mid,
    license_type,
    package_data,
    sendbat_workspace,
    coming_expired,
    external_sync_status,
    last_external_sync,
    external_sync_error,
  }) {
    // Identity
    this.id = id;
    this.key = key;

    // Product & Service
    this.product = product;
    this.plan = plan;
    this.status = status;
    this.term = term;

    // Capacity & Usage
    this.seatsTotal = seatsTotal;
    this.seatsUsed = seatsUsed;
    this.agents = agents;
    this.agentsName = agentsName;

    // Financial
    this.lastPayment = lastPayment;
    this.smsPurchased = smsPurchased;
    this.smsSent = smsSent;
    this.smsBalance = smsBalance;
    this.agentsCost = agentsCost;

    // Location
    this.dba = dba;
    this.zip = zip;

    // Dates & Timeline
    this.startsAt = startsAt;
    this.expiresAt = expiresAt;
    this.cancelDate = cancelDate;
    this.lastActive = lastActive;

    // Content
    this.notes = notes;

    // Lifecycle Management
    this.renewalRemindersSent = renewalRemindersSent || [];
    this.lastRenewalReminder = lastRenewalReminder;
    this.renewalDueDate = renewalDueDate;
    this.autoSuspendEnabled = autoSuspendEnabled !== undefined ? autoSuspendEnabled : false;
    this.gracePeriodDays = gracePeriodDays !== undefined ? gracePeriodDays : 30;
    this.gracePeriodEnd = gracePeriodEnd;
    this.suspensionReason = suspensionReason;
    this.suspendedAt = suspendedAt;
    this.reactivatedAt = reactivatedAt;
    this.renewalHistory = renewalHistory || [];

    // Audit
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    // External sync fields (unified) - sanitize external data
    this.appid = this._sanitizeExternalValue(appid);
    this.countid = this._sanitizeExternalValue(countid);
    this.mid = this._sanitizeExternalValue(mid);
    this.license_type = this._sanitizeExternalValue(license_type);
    this.package_data = this._sanitizeExternalValue(package_data);
    this.sendbat_workspace = this._sanitizeExternalValue(sendbat_workspace);
    this.coming_expired = this._sanitizeExternalValue(coming_expired);
    this.external_sync_status = this._sanitizeExternalValue(external_sync_status);
    this.last_external_sync = this._sanitizeExternalValue(last_external_sync);
    this.external_sync_error = this._sanitizeExternalValue(external_sync_error);

    this.validate();
  }

  /**
   * Sanitize external API values to handle null/empty/malformed data
   * @private
   */
  _sanitizeExternalValue(value) {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return null;
    }

    // Handle empty strings
    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }

    // Handle malformed JSON strings (common external API issue)
    if (typeof value === 'string' && value.includes('Expecting value')) {
      return null;
    }

    // Handle arrays that might be empty
    if (Array.isArray(value) && value.length === 0) {
      return null;
    }

    // Handle objects that might be empty
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
      return null;
    }

    return value;
  }

  /**
   * Business rules validation
   */
  validate() {
    const errors = [];

    // License key is required (but allow generation for external sync)
    if (!this.key || this.key.trim() === '') {
      // For external sync, we can auto-generate keys, but for internal creation it's required
      if (!this.external_sync_status) {
        errors.push('License key is required');
      }
    }

    // Product is required (but be more lenient for external data)
    if (!this.product || (typeof this.product === 'string' && this.product.trim() === '')) {
      if (!this.external_sync_status) {
        errors.push('Product is required');
      }
    }

    // Plan is required (but be more lenient for external data)
    if (!this.plan || (typeof this.plan === 'string' && this.plan.trim() === '')) {
      if (!this.external_sync_status) {
        errors.push('Plan is required');
      }
    }

    // DBA is required (but be more lenient for external data)
    if (!this.dba || (typeof this.dba === 'string' && this.dba.trim() === '')) {
      if (!this.external_sync_status) {
        errors.push('DBA is required');
      } else {
        // For external sync, provide a fallback
        this.dba = this.dba || 'Unknown Business';
      }
    }

    // Status validation
    const validStatuses = [
      'draft',
      'active',
      'expiring',
      'expired',
      'revoked',
      'cancel',
      'pending',
    ];
    if (this.status && !validStatuses.includes(this.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    // Term validation
    const validTerms = ['monthly', 'yearly'];
    if (this.term && !validTerms.includes(this.term)) {
      errors.push(`Term must be one of: ${validTerms.join(', ')}`);
    }

    // Seats validation
    if (this.seatsTotal !== undefined && this.seatsTotal < 1) {
      errors.push('Total seats must be at least 1');
    }

    if (this.seatsUsed !== undefined && this.seatsUsed < 0) {
      errors.push('Used seats cannot be negative');
    }

    if (
      this.seatsTotal !== undefined &&
      this.seatsUsed !== undefined &&
      this.seatsUsed > this.seatsTotal
    ) {
      errors.push('Used seats cannot exceed total seats');
    }

    // Start date is required
    if (!this.startsAt) {
      errors.push('Start date is required');
    }

    // Expiry date validation - auto-swap if expiry < start (data quality fix)
    if (this.startsAt && this.expiresAt) {
      const startDate = new Date(this.startsAt);
      const expiryDate = new Date(this.expiresAt);
      if (!isNaN(startDate.getTime()) && !isNaN(expiryDate.getTime()) && expiryDate <= startDate) {
        // Auto-swap dates - assume data entry error where dates were reversed
        const originalStart = this.startsAt;
        const originalExpiry = this.expiresAt;
        this.startsAt = originalExpiry;
        this.expiresAt = originalStart;
        logger.debug('License auto-swapped dates (expiry was before start)', {
          licenseKey: this.key || this.id,
          originalStart,
          originalExpiry,
          fixedStart: this.startsAt,
          fixedExpiry: this.expiresAt,
        });
      }
    }

    if (errors.length > 0) {
      throw new Error(`License validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Check if license is currently active
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * Check if license is expired
   */
  isExpired() {
    if (!this.expiresAt) {
      return false; // No expiry date means perpetual license
    }
    return new Date() > new Date(this.expiresAt);
  }

  /**
   * Check if license is expiring soon (within 30 days)
   */
  isExpiringSoon(daysThreshold = 30) {
    if (!this.expiresAt) {
      return false;
    }
    const now = new Date();
    const expiry = new Date(this.expiresAt);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold;
  }

  /**
   * Calculate seat utilization percentage
   */
  getUtilizationPercent() {
    if (!this.seatsTotal || this.seatsTotal === 0) {
      return 0;
    }
    return Math.round((this.seatsUsed / this.seatsTotal) * 100);
  }

  /**
   * Check if seats are available
   */
  hasAvailableSeats() {
    return this.seatsUsed < this.seatsTotal;
  }

  /**
   * Get number of available seats
   */
  getAvailableSeats() {
    return Math.max(0, this.seatsTotal - this.seatsUsed);
  }

  /**
   * Calculate SMS balance
   */
  getSmsBalance() {
    return Math.max(0, this.smsPurchased - this.smsSent);
  }

  /**
   * Check if license can be assigned to a user
   */
  canAssign() {
    return this.isActive() && this.hasAvailableSeats() && !this.isExpired();
  }

  /**
   * Get status display
   */
  getStatusDisplay() {
    if (this.status === 'expired' || this.isExpired()) {
      return 'Expired';
    }
    if (this.isExpiringSoon()) {
      return 'Expiring Soon';
    }
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }

  // ========================================================================
  // LIFECYCLE MANAGEMENT METHODS
  // ========================================================================

  /**
   * Check if license is expired
   */
  isExpired() {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  /**
   * Check if license is expiring soon (within 30 days)
   */
  isExpiringSoon(daysThreshold = 30) {
    if (!this.expiresAt || this.isExpired()) return false;
    const now = new Date();
    const expiryDate = new Date(this.expiresAt);
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= daysThreshold && daysUntilExpiry > 0;
  }

  /**
   * Check if license is in grace period
   */
  isInGracePeriod() {
    if (!this.isExpired() || !this.gracePeriodEnd) return false;
    return new Date() <= new Date(this.gracePeriodEnd);
  }

  /**
   * Check if license should be suspended
   */
  shouldBeSuspended() {
    if (!this.autoSuspendEnabled) return false;
    if (!this.isExpired()) return false;
    if (this.isInGracePeriod()) return false;
    return this.status !== 'revoked' && this.status !== 'cancel';
  }

  /**
   * Check if renewal reminder should be sent
   */
  shouldSendRenewalReminder(reminderType) {
    if (this.isExpired()) return false;
    if (!this.expiresAt) return false;

    const now = new Date();
    const expiryDate = new Date(this.expiresAt);
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    let shouldSend = false;
    switch (reminderType) {
      case '30days':
        shouldSend = daysUntilExpiry <= 30 && daysUntilExpiry > 7;
        break;
      case '7days':
        shouldSend = daysUntilExpiry <= 7 && daysUntilExpiry > 1;
        break;
      case '1day':
        shouldSend = daysUntilExpiry === 1;
        break;
      default:
        return false;
    }

    // Check if reminder was already sent
    return shouldSend && !this.renewalRemindersSent.includes(reminderType);
  }

  /**
   * Mark renewal reminder as sent
   */
  markRenewalReminderSent(reminderType) {
    if (!this.renewalRemindersSent.includes(reminderType)) {
      this.renewalRemindersSent.push(reminderType);
      this.lastRenewalReminder = new Date();
    }
  }

  /**
   * Calculate grace period end date
   */
  calculateGracePeriodEnd() {
    if (!this.expiresAt) return null;
    const expiryDate = new Date(this.expiresAt);
    const graceEnd = new Date(expiryDate);
    graceEnd.setDate(expiryDate.getDate() + this.gracePeriodDays);
    return graceEnd;
  }

  /**
   * Calculate renewal due date (typically 30 days before expiry)
   */
  calculateRenewalDueDate() {
    if (!this.expiresAt) return null;
    const expiryDate = new Date(this.expiresAt);
    const renewalDue = new Date(expiryDate);
    renewalDue.setDate(expiryDate.getDate() - 30); // 30 days before expiry
    return renewalDue;
  }

  /**
   * Get days until expiration
   */
  getDaysUntilExpiration() {
    if (!this.expiresAt) return null;
    const now = new Date();
    const expiryDate = new Date(this.expiresAt);
    return Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get days until grace period ends
   */
  getDaysUntilGracePeriodEnd() {
    if (!this.gracePeriodEnd) return null;
    const now = new Date();
    const graceEnd = new Date(this.gracePeriodEnd);
    return Math.ceil((graceEnd - now) / (1000 * 60 * 60 * 24));
  }

  /**
   * Add renewal history entry
   */
  addRenewalHistory(action, details = {}) {
    const historyEntry = {
      action,
      timestamp: new Date(),
      ...details,
    };
    this.renewalHistory.push(historyEntry);
  }

  // ========================================================================
  // STATUS TRANSITION LOGIC
  // ========================================================================

  /**
   * Valid status transitions with business rules
   */
  static VALID_TRANSITIONS = {
    draft: ['active', 'cancel'],
    active: ['expiring', 'expired', 'revoked', 'cancel'],
    expiring: ['active', 'expired', 'revoked', 'cancel'],
    expired: ['active', 'revoked'], // Can reactivate expired licenses
    revoked: [], // Terminal state - cannot transition out
    cancel: ['active'], // Can reactivate cancelled licenses
    pending: ['active', 'draft', 'cancel'],
  };

  /**
   * Check if a status transition is valid
   */
  static isValidTransition(fromStatus, toStatus) {
    return License.VALID_TRANSITIONS[fromStatus]?.includes(toStatus) || false;
  }

  /**
   * Validate status transition with business rules
   */
  validateStatusTransition(newStatus, context = {}) {
    if (this.status === newStatus) {
      return { valid: true, warnings: [] }; // No change needed
    }

    // Check basic transition validity
    if (!License.isValidTransition(this.status, newStatus)) {
      return {
        valid: false,
        errors: [`Invalid status transition from '${this.status}' to '${newStatus}'`],
        warnings: [],
      };
    }

    const errors = [];
    const warnings = [];

    // Business rule validations
    switch (newStatus) {
      case 'active':
        errors.push(...this.validateTransitionToActive(context));
        break;
      case 'expired':
        errors.push(...this.validateTransitionToExpired(context));
        break;
      case 'revoked':
        warnings.push(...this.validateTransitionToRevoked(context));
        break;
      case 'cancel':
        warnings.push(...this.validateTransitionToCancelled(context));
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate transition to active status
   */
  validateTransitionToActive(context) {
    const errors = [];

    // Cannot activate without expiration date
    if (!this.expiresAt) {
      errors.push('Cannot activate license without expiration date');
    }

    // Cannot activate expired licenses without renewal
    if (this.isExpired() && !context.force && !context.renewal) {
      errors.push('Expired licenses require renewal to reactivate');
    }

    // Cannot activate revoked licenses
    if (this.status === 'revoked') {
      errors.push('Revoked licenses cannot be reactivated');
    }

    return errors;
  }

  /**
   * Validate transition to expired status
   */
  validateTransitionToExpired(context) {
    const errors = [];

    // Must have expiration date to expire
    if (!this.expiresAt) {
      errors.push('Cannot expire license without expiration date');
    }

    // Cannot expire revoked licenses (already terminal)
    if (this.status === 'revoked') {
      errors.push('Revoked licenses cannot be expired');
    }

    return errors;
  }

  /**
   * Validate transition to revoked status (warnings only)
   */
  validateTransitionToRevoked(context) {
    const warnings = [];

    // Warning for revoking active licenses
    if (this.status === 'active') {
      warnings.push('Revoking active license will immediately disable access');
    }

    // Warning for revoking without reason
    if (!context.reason) {
      warnings.push('Consider providing a reason for license revocation');
    }

    return warnings;
  }

  /**
   * Validate transition to cancelled status (warnings only)
   */
  validateTransitionToCancelled(context) {
    const warnings = [];

    // Warning for cancelling active licenses
    if (this.status === 'active') {
      warnings.push('Cancelling active license will disable future access');
    }

    return warnings;
  }

  /**
   * Perform status transition with validation
   */
  transitionStatus(newStatus, context = {}) {
    const validation = this.validateStatusTransition(newStatus, context);

    if (!validation.valid) {
      throw new Error(`Status transition failed: ${validation.errors.join(', ')}`);
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      // In a real system, this might log warnings or send notifications
      console.warn(`Status transition warnings for license ${this.key}:`, validation.warnings);
    }

    const oldStatus = this.status;
    this.status = newStatus;

    // Add transition to history
    this.addRenewalHistory('status_changed', {
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedBy: context.userId,
      reason: context.reason,
      force: context.force,
    });

    return {
      success: true,
      oldStatus,
      newStatus,
      warnings: validation.warnings,
    };
  }

  /**
   * Get available status transitions for current state
   */
  getAvailableTransitions() {
    return License.VALID_TRANSITIONS[this.status] || [];
  }

  /**
   * Check if license is in a terminal state
   */
  isTerminalState() {
    return ['revoked'].includes(this.status);
  }

  /**
   * Check if license can be modified
   */
  canBeModified() {
    return !this.isTerminalState();
  }

  /**
   * Sanitize license for API response (remove sensitive data)
   */
  toJSON() {
    return {
      // Identity
      id: this.id,
      key: this.key,

      // Product & Service
      product: this.product,
      plan: this.plan,
      status: this.status,
      term: this.term,

      // Capacity & Usage
      seatsTotal: this.seatsTotal,
      seatsUsed: this.seatsUsed,
      agents: this.agents,
      agentsName: this.agentsName,

      // Financial
      lastPayment: this.lastPayment,
      smsPurchased: this.smsPurchased,
      smsSent: this.smsSent,
      smsBalance: this.getSmsBalance(),
      agentsCost: this.agentsCost,

      // Location
      dba: this.dba,
      zip: this.zip,

      // Dates & Timeline
      startsAt: this.startsAt,
      expiresAt: this.expiresAt,
      cancelDate: this.cancelDate,
      lastActive: this.lastActive,

      // Content
      notes: this.notes,

      // Lifecycle Management
      renewalRemindersSent: this.renewalRemindersSent,
      lastRenewalReminder: this.lastRenewalReminder,
      renewalDueDate: this.renewalDueDate,
      autoSuspendEnabled: this.autoSuspendEnabled,
      gracePeriodDays: this.gracePeriodDays,
      gracePeriodEnd: this.gracePeriodEnd,
      suspensionReason: this.suspensionReason,
      suspendedAt: this.suspendedAt,
      reactivatedAt: this.reactivatedAt,
      renewalHistory: this.renewalHistory,

      // Audit
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,

      // Computed properties
      utilizationPercent: this.getUtilizationPercent(),
      availableSeats: this.getAvailableSeats(),
      isActive: this.isActive(),
      isExpired: this.isExpired(),
      isExpiringSoon: this.isExpiringSoon(),
      canAssign: this.canAssign(),
      statusDisplay: this.getStatusDisplay(),

      // External sync fields (unified)
      appid: this.appid,
      countid: this.countid,
      mid: this.mid,
      license_type: this.license_type,
      package_data: this.package_data,
      sendbat_workspace: this.sendbat_workspace,
      coming_expired: this.coming_expired,
      external_sync_status: this.external_sync_status,
      last_external_sync: this.last_external_sync,
      external_sync_error: this.external_sync_error,
    };
  }
}
