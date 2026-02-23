/**
 * License Audit Event Domain Entity
 * Represents an audit log entry for license-related actions
 */
export class LicenseAuditEvent {
  constructor({
    id,
    type,
    actorId,
    entityId,
    entityType,
    metadata,
    ipAddress,
    userAgent,
    createdAt,
  }) {
    this.id = id;
    this.type = type;
    this.actorId = actorId;
    this.entityId = entityId;
    this.entityType = entityType;
    this.metadata = metadata;
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.createdAt = createdAt;

    this.validate();
  }

  /**
   * Business rules validation
   */
  validate() {
    const errors = [];

    // Event type is required
    if (!this.type || this.type.trim() === '') {
      errors.push('Event type is required');
    }

    // Entity ID is required
    if (!this.entityId) {
      errors.push('Entity ID is required');
    }

    // Entity type validation
    const validEntityTypes = ['license', 'assignment'];
    if (this.entityType && !validEntityTypes.includes(this.entityType)) {
      errors.push(`Entity type must be one of: ${validEntityTypes.join(', ')}`);
    }

    // Metadata must be a valid object
    if (this.metadata && typeof this.metadata !== 'object') {
      errors.push('Metadata must be a valid object');
    }

    if (errors.length > 0) {
      throw new Error(`License audit event validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Get event category (e.g., 'license' from 'license.created')
   */
  getCategory() {
    return this.type.split('.')[0];
  }

  /**
   * Get event action (e.g., 'created' from 'license.created')
   */
  getAction() {
    return this.type.split('.')[1];
  }

  /**
   * Check if event is related to licenses
   */
  isLicenseEvent() {
    return this.entityType === 'license';
  }

  /**
   * Check if event is related to assignments
   */
  isAssignmentEvent() {
    return this.entityType === 'assignment';
  }

  /**
   * Get a human-readable description of the event
   */
  getDescription() {
    const action = this.getAction();
    const category = this.getCategory();

    const descriptions = {
      'license.created': 'License created',
      'license.updated': 'License updated',
      'license.deleted': 'License deleted',
      'license.activated': 'License activated',
      'license.deactivated': 'License deactivated',
      'license.revoked': 'License revoked',
      'license.renewed': 'License renewed',
      'assignment.created': 'License assigned to user',
      'assignment.revoked': 'License assignment revoked',
      'assignment.updated': 'License assignment updated',
    };

    return descriptions[this.type] || `${category} ${action}`;
  }

  /**
   * Sanitize audit event for API response
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      actorId: this.actorId,
      entityId: this.entityId,
      entityType: this.entityType,
      metadata: this.metadata,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      createdAt: this.createdAt,
      // Computed properties
      category: this.getCategory(),
      action: this.getAction(),
      description: this.getDescription(),
      isLicenseEvent: this.isLicenseEvent(),
      isAssignmentEvent: this.isAssignmentEvent(),
    };
  }
}
