/**
 * External License Domain Entity
 * Represents the core business concept of an External License (from external API)
 * This entity matches the structure returned by the external license API
 */
export class ExternalLicense {
  constructor({
    countid,
    id,
    appid,
    license_type,
    dba,
    zip,
    mid,
    status,
    ActivateDate,
    Coming_expired,
    monthlyFee,
    smsBalance,
    Email_license,
    pass,
    Package,
    Note,
    Sendbat_workspace,
    lastActive,
    // Internal tracking fields
    lastSyncedAt,
    syncStatus,
    syncError,
    createdAt,
    updatedAt,
  }) {
    this.countid = countid;
    this.id = id;
    this.appid = appid;
    this.license_type = license_type || 'product';
    this.dba = dba || Email_license || '';
    this.zip = zip;
    this.mid = mid;
    this.status = status;
    this.ActivateDate = ActivateDate;
    this.Coming_expired = Coming_expired;
    this.monthlyFee = monthlyFee || 0;
    this.smsBalance = smsBalance || 0;
    this.Email_license = Email_license;
    this.pass = pass;
    this.Package = Package;
    this.Note = Note;
    this.Sendbat_workspace = Sendbat_workspace;
    this.lastActive = lastActive;

    // Internal tracking fields
    this.lastSyncedAt = lastSyncedAt;
    this.syncStatus = syncStatus || 'pending'; // pending, synced, failed
    this.syncError = syncError;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();

    this.validate();
  }

  /**
   * Business rules validation
   */
  validate() {
    const errors = [];

    // Required fields from external API - make optional for sync
    // if (!this.Email_license || !this.Email_license.includes('@')) {
    //   errors.push('Valid Email_license is required');
    // }

    // if (!this.pass || this.pass.trim().length === 0) {
    //   errors.push('Password (pass) is required');
    // }

    // App ID is optional for external licenses - some may not have it
    // if (!this.appid || this.appid.trim().length === 0) {
    //   errors.push('App ID is required');
    // }

    // Status validation (can be integer or string based on API)
    if (this.status === undefined || this.status === null) {
      // Status is optional in some cases
    }

    // License type validation
    const validTypes = ['product', 'service', 'trial', 'enterprise', 'demo'];
    if (this.license_type && !validTypes.includes(this.license_type)) {
      errors.push(`License type must be one of: ${validTypes.join(', ')}`);
    }

    // Monthly fee validation
    if (this.monthlyFee !== undefined && this.monthlyFee < 0) {
      errors.push('Monthly fee cannot be negative');
    }

    // SMS balance validation - allow negative values (can represent debt/overages)
    // No validation needed for SMS balance as external API may return negative values

    // Date validation
    if (this.ActivateDate && isNaN(Date.parse(this.ActivateDate))) {
      errors.push('Invalid ActivateDate format');
    }

    if (this.Coming_expired && isNaN(Date.parse(this.Coming_expired))) {
      errors.push('Invalid Coming_expired format');
    }

    if (this.lastActive && isNaN(Date.parse(this.lastActive))) {
      errors.push('Invalid lastActive format');
    }

    if (errors.length > 0) {
      throw new Error(`External License validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Business methods
   */

  /**
   * Check if license is currently active
   */
  isActive() {
    if (typeof this.status === 'number') {
      return this.status === 1; // Assuming 1 = active, 0 = inactive
    }
    return this.status === 'active' || this.status === 'Active';
  }

  /**
   * Check if license is expired
   */
  isExpired() {
    if (!this.Coming_expired) {
      return false; // No expiry date means perpetual license
    }
    return new Date() > new Date(this.Coming_expired);
  }

  /**
   * Check if license is expiring soon (within 30 days)
   */
  isExpiringSoon(daysThreshold = 30) {
    if (!this.Coming_expired) {
      return false;
    }
    const now = new Date();
    const expiry = new Date(this.Coming_expired);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold;
  }

  /**
   * Get status display
   */
  getStatusDisplay() {
    if (this.isExpired()) {
      return 'Expired';
    }
    if (this.isExpiringSoon()) {
      return 'Expiring Soon';
    }

    if (typeof this.status === 'number') {
      switch (this.status) {
        case 0: return 'Inactive';
        case 1: return 'Active';
        case 2: return 'Suspended';
        case 3: return 'Pending';
        default: return `Status ${this.status}`;
      }
    }

    return this.status ? this.status.charAt(0).toUpperCase() + this.status.slice(1) : 'Unknown';
  }

  /**
   * Check if license needs sync
   */
  needsSync() {
    return this.syncStatus === 'pending' || this.syncStatus === 'failed';
  }

  /**
   * Mark as synced
   */
  markSynced() {
    this.syncStatus = 'synced';
    this.lastSyncedAt = new Date();
    this.syncError = null;
    this.updatedAt = new Date();
  }

  /**
   * Mark sync as failed
   */
  markSyncFailed(error) {
    this.syncStatus = 'failed';
    this.syncError = error;
    this.updatedAt = new Date();
  }

  /**
   * Get license summary for API responses
   */
  getSummary() {
    return {
      appid: this.appid,
      countid: this.countid,
      Email_license: this.Email_license,
      license_type: this.license_type,
      dba: this.dba || this.Email_license || '',
      status: this.status,
      monthlyFee: this.monthlyFee,
      smsBalance: this.smsBalance,
      isActive: this.isActive(),
      isExpired: this.isExpired(),
      isExpiringSoon: this.isExpiringSoon(),
      statusDisplay: this.getStatusDisplay(),
      lastSyncedAt: this.lastSyncedAt,
      syncStatus: this.syncStatus,
    };
  }

  /**
   * Get full license data for detailed views
   */
  getFullData() {
    return {
      ...this.getSummary(),
      id: this.id,
      zip: this.zip,
      mid: this.mid,
      ActivateDate: this.ActivateDate,
      Coming_expired: this.Coming_expired,
      Package: this.Package,
      Note: this.Note,
      Sendbat_workspace: this.Sendbat_workspace,
      lastActive: this.lastActive,
      syncError: this.syncError,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Convert to format expected by external API
   */
  toExternalApiFormat() {
    return {
      emailLicense: this.Email_license,
      pass: this.pass,
      monthlyFee: this.monthlyFee,
      Mid: this.mid,
      dba: this.dba,
      zip: this.zip,
      status: this.status,
      license_type: this.license_type,
      Package: this.Package,
      Note: this.Note,
      coming_expired: this.Coming_expired,
      sendbat_workspace: this.Sendbat_workspace,
    };
  }

  /**
   * Create entity from external API response
   */
  static fromExternalApiResponse(apiResponse) {
    return new ExternalLicense({
      countid: apiResponse.countid,
      id: apiResponse.id,
      appid: apiResponse.appid,
      license_type: apiResponse.license_type,
      dba: apiResponse.dba,
      zip: apiResponse.zip,
      mid: apiResponse.mid || apiResponse.Mid,
      status: apiResponse.status,
      ActivateDate: apiResponse.ActivateDate,
      Coming_expired: apiResponse.Coming_expired,
      monthlyFee: apiResponse.monthlyFee,
      smsBalance: apiResponse.smsBalance || 0,
      Email_license: apiResponse.Email_license,
      pass: apiResponse.pass,
      Package: apiResponse.Package,
      Note: apiResponse.Note,
      Sendbat_workspace: apiResponse.Sendbat_workspace,
      lastActive: apiResponse.lastActive,
    });
  }

  /**
   * Sanitize license for API response (remove sensitive data)
   */
  toJSON() {
    return this.getFullData();
  }
}