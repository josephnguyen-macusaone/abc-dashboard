/**
 * License Domain Entity
 * Represents the core business concept of a Software License
 */
export class License {
  constructor({
    id,
    key,
    product,
    plan,
    status,
    term,
    seatsTotal,
    seatsUsed,
    startsAt,
    expiresAt,
    cancelDate,
    lastActive,
    dba,
    zip,
    lastPayment,
    smsPurchased,
    smsSent,
    smsBalance,
    agents,
    agentsName,
    agentsCost,
    notes,
    createdBy,
    updatedBy,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.key = key;
    this.product = product;
    this.plan = plan;
    this.status = status;
    this.term = term;
    this.seatsTotal = seatsTotal;
    this.seatsUsed = seatsUsed;
    this.startsAt = startsAt;
    this.expiresAt = expiresAt;
    this.cancelDate = cancelDate;
    this.lastActive = lastActive;
    this.dba = dba;
    this.zip = zip;
    this.lastPayment = lastPayment;
    this.smsPurchased = smsPurchased;
    this.smsSent = smsSent;
    this.smsBalance = smsBalance;
    this.agents = agents;
    this.agentsName = agentsName;
    this.agentsCost = agentsCost;
    this.notes = notes;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.validate();
  }

  /**
   * Business rules validation
   */
  validate() {
    const errors = [];

    // License key is required
    if (!this.key || this.key.trim() === '') {
      errors.push('License key is required');
    }

    // Product is required
    if (!this.product || this.product.trim() === '') {
      errors.push('Product is required');
    }

    // Plan is required
    if (!this.plan || this.plan.trim() === '') {
      errors.push('Plan is required');
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

    // Expiry date must be after start date
    if (this.startsAt && this.expiresAt && new Date(this.expiresAt) <= new Date(this.startsAt)) {
      errors.push('Expiry date must be after start date');
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

  /**
   * Sanitize license for API response (remove sensitive data)
   */
  toJSON() {
    return {
      id: this.id,
      key: this.key,
      product: this.product,
      plan: this.plan,
      status: this.status,
      term: this.term,
      seatsTotal: this.seatsTotal,
      seatsUsed: this.seatsUsed,
      utilizationPercent: this.getUtilizationPercent(),
      availableSeats: this.getAvailableSeats(),
      startsAt: this.startsAt,
      expiresAt: this.expiresAt,
      cancelDate: this.cancelDate,
      lastActive: this.lastActive,
      dba: this.dba,
      zip: this.zip,
      lastPayment: this.lastPayment,
      smsPurchased: this.smsPurchased,
      smsSent: this.smsSent,
      smsBalance: this.getSmsBalance(),
      agents: this.agents,
      agentsName: this.agentsName,
      agentsCost: this.agentsCost,
      notes: this.notes,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Computed properties
      isActive: this.isActive(),
      isExpired: this.isExpired(),
      isExpiringSoon: this.isExpiringSoon(),
      canAssign: this.canAssign(),
      statusDisplay: this.getStatusDisplay(),
    };
  }
}


