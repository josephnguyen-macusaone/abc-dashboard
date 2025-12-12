/**
 * License Assignment Domain Entity
 * Represents the assignment of a license to a user
 */
export class LicenseAssignment {
  constructor({
    id,
    licenseId,
    userId,
    status,
    assignedAt,
    revokedAt,
    assignedBy,
    revokedBy,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.licenseId = licenseId;
    this.userId = userId;
    this.status = status;
    this.assignedAt = assignedAt;
    this.revokedAt = revokedAt;
    this.assignedBy = assignedBy;
    this.revokedBy = revokedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.validate();
  }

  /**
   * Business rules validation
   */
  validate() {
    const errors = [];

    // License ID is required
    if (!this.licenseId) {
      errors.push('License ID is required');
    }

    // User ID is required
    if (!this.userId) {
      errors.push('User ID is required');
    }

    // Status validation
    const validStatuses = ['assigned', 'unassigned', 'revoked'];
    if (this.status && !validStatuses.includes(this.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    // If revoked, revokedAt must be set
    if (this.status === 'revoked' && !this.revokedAt) {
      errors.push('Revoked assignments must have a revokedAt date');
    }

    // RevokedAt must be after assignedAt
    if (
      this.assignedAt &&
      this.revokedAt &&
      new Date(this.revokedAt) <= new Date(this.assignedAt)
    ) {
      errors.push('Revoked date must be after assigned date');
    }

    if (errors.length > 0) {
      throw new Error(`License assignment validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Check if assignment is currently active
   */
  isActive() {
    return this.status === 'assigned';
  }

  /**
   * Check if assignment is revoked
   */
  isRevoked() {
    return this.status === 'revoked';
  }

  /**
   * Get assignment duration in days
   */
  getAssignmentDuration() {
    const start = new Date(this.assignedAt);
    const end = this.revokedAt ? new Date(this.revokedAt) : new Date();
    const diffMs = end - start;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Sanitize assignment for API response
   */
  toJSON() {
    return {
      id: this.id,
      licenseId: this.licenseId,
      userId: this.userId,
      status: this.status,
      assignedAt: this.assignedAt,
      revokedAt: this.revokedAt,
      assignedBy: this.assignedBy,
      revokedBy: this.revokedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Computed properties
      isActive: this.isActive(),
      isRevoked: this.isRevoked(),
      durationDays: this.getAssignmentDuration(),
    };
  }
}


