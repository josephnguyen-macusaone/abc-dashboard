/**
 * Assign License Use Case
 * Handles assigning a license to a user with business rules and audit logging
 */
import { LicenseAssignmentResponseDto } from '../../dto/license/index.js';
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';

export class AssignLicenseUseCase {
  constructor(licenseRepository, userRepository) {
    this.licenseRepository = licenseRepository;
    this.userRepository = userRepository;
  }

  /**
   * Execute assign license use case
   * @param {Object} assignmentData - Assignment data
   * @param {string} assignmentData.licenseId - License ID
   * @param {string} assignmentData.userId - User ID
   * @param {Object} context - Request context (userId, ipAddress, userAgent)
   * @returns {Promise<LicenseAssignmentResponseDto>} Created assignment
   */
  async execute(assignmentData, context = {}) {
    const { userId: actorId, ipAddress, userAgent } = context;
    const { licenseId, userId } = assignmentData;

    try {
      // Verify license exists
      const license = await this.licenseRepository.findById(licenseId);
      if (!license) {
        throw new ValidationException('License not found');
      }

      // Verify user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ValidationException('User not found');
      }

      // Check business rules
      if (!license.canAssign()) {
        if (license.isExpired()) {
          throw new ValidationException('Cannot assign expired license');
        }
        if (!license.hasAvailableSeats()) {
          throw new ValidationException('No available seats on this license');
        }
        if (!license.isActive()) {
          throw new ValidationException('License is not active');
        }
      }

      // Check if user already has this license
      const hasAssignment = await this.licenseRepository.hasUserAssignment(licenseId, userId);
      if (hasAssignment) {
        throw new ValidationException('User already has this license assigned');
      }

      // Create assignment
      const assignment = await this.licenseRepository.assignLicense({
        licenseId,
        userId,
        assignedBy: actorId,
      });

      // Create audit event
      await this.licenseRepository.createAuditEvent({
        type: 'assignment.created',
        actorId,
        entityId: assignment.id,
        entityType: 'assignment',
        metadata: {
          license_key: license.key,
          user_email: user.email,
          license_id: licenseId,
          user_id: userId,
        },
        ipAddress,
        userAgent,
      });

      return LicenseAssignmentResponseDto.fromEntity(assignment);
    } catch (error) {
      throw new Error(`Failed to assign license: ${error.message}`);
    }
  }
}
