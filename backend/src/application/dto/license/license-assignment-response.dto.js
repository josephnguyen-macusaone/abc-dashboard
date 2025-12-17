/**
 * License Assignment Response DTO
 * Represents a license assignment in API responses
 */
import { BaseDto } from '../common/base.dto.js';

export class LicenseAssignmentResponseDto extends BaseDto {
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
    isActive,
    isRevoked,
    durationDays,
  }) {
    super();
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
    this.isActive = isActive;
    this.isRevoked = isRevoked;
    this.durationDays = durationDays;
  }

  /**
   * Create from LicenseAssignment entity
   * @param {LicenseAssignment} entity - LicenseAssignment domain entity
   * @returns {LicenseAssignmentResponseDto}
   */
  static fromEntity(entity) {
    const json = entity.toJSON();
    return new LicenseAssignmentResponseDto(json);
  }
}

export default LicenseAssignmentResponseDto;
