/**
 * Revoke License Assignment Use Case
 * Handles revoking a license assignment with business rules and audit logging
 */
import { LicenseAssignmentResponseDto } from '../../dto/license/index.js';
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';

export class RevokeLicenseAssignmentUseCase {
  constructor(licenseRepository) {
    this.licenseRepository = licenseRepository;
  }

  /**
   * Execute revoke license assignment use case
   * @param {string} assignmentId - Assignment ID to revoke
   * @param {Object} context - Request context (userId, ipAddress, userAgent)
   * @returns {Promise<LicenseAssignmentResponseDto>} Revoked assignment
   */
  async execute(assignmentId, context = {}) {
    const { userId: actorId, ipAddress, userAgent } = context;

    try {
      // Verify assignment exists
      const assignment = await this.licenseRepository.findAssignmentById(assignmentId);
      if (!assignment) {
        throw new ValidationException('Assignment not found');
      }

      // Check if already revoked
      if (assignment.isRevoked()) {
        throw new ValidationException('Assignment is already revoked');
      }

      // Revoke assignment
      const revokedAssignment = await this.licenseRepository.revokeAssignment(
        assignmentId,
        actorId
      );

      // Get license details for audit
      const license = await this.licenseRepository.findById(assignment.licenseId);

      // Create audit event
      await this.licenseRepository.createAuditEvent({
        type: 'assignment.revoked',
        actorId,
        entityId: assignmentId,
        entityType: 'assignment',
        metadata: {
          license_key: license?.key,
          license_id: assignment.licenseId,
          user_id: assignment.userId,
          assigned_at: assignment.assignedAt,
        },
        ipAddress,
        userAgent,
      });

      return LicenseAssignmentResponseDto.fromEntity(revokedAssignment);
    } catch (error) {
      throw new Error(`Failed to revoke license assignment: ${error.message}`);
    }
  }
}
