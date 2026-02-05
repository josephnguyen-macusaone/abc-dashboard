import { License, LicenseId, Money } from '@/domain/entities/license-entity';
import { ILicenseRepository } from '@/domain/repositories/i-license-repository';
import { LicenseDomainService } from '@/domain/services/license-domain-service';
import { UpdateLicenseDTO } from '@/application/dto/license-dto';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';

/**
 * Application Use Case: Update License
 * Handles updating existing licenses following Clean Architecture principles
 */
export interface UpdateLicenseUseCase {
  execute(id: string, updates: UpdateLicenseDTO): Promise<License>;
}

export class UpdateLicenseUseCaseImpl implements UpdateLicenseUseCase {
  private readonly useCaseLogger = logger.createChild({
    component: 'UpdateLicenseUseCase',
  });

  constructor(
    private readonly licenseRepository: ILicenseRepository,
    private readonly licenseDomainService: LicenseDomainService
  ) {}

  async execute(id: string, updates: UpdateLicenseDTO): Promise<License> {
    const correlationId = generateCorrelationId();
    const licenseId = new LicenseId(id);

    try {
      this.useCaseLogger.debug('Updating license', {
        correlationId,
        licenseId: id,
        updates: Object.keys(updates),
        operation: 'update_license_start'
      });

      // Find existing license
      const existingLicense = await this.licenseRepository.findById(licenseId);
      if (!existingLicense) {
        throw new Error(`License with ID ${id} not found`);
      }

      this.useCaseLogger.debug('Existing license found, validating updates', {
        correlationId,
        licenseId: id,
        currentStatus: existingLicense.status,
        operation: 'update_license_validation'
      });

      // Validate status transition if status is being updated
      if (updates.status && updates.status !== existingLicense.status) {
        const transitionValidation = LicenseDomainService.validateStatusTransition(
          existingLicense.status,
          updates.status
        );
        if (!transitionValidation.isValid) {
          this.useCaseLogger.warn('Invalid status transition', {
            correlationId,
            licenseId: id,
            from: existingLicense.status,
            to: updates.status,
            errors: transitionValidation.errors,
            operation: 'update_license_invalid_transition'
          });
          throw new Error(`Invalid status transition: ${transitionValidation.errors.join(', ')}`);
        }
      }

      // Apply updates to domain entity
      // Note: In a real implementation, the domain entity would have update methods
      // For now, we'll create a new entity with updated values
      const updatedLicenseData = {
        ...existingLicense,
        ...updates,
        updatedAt: new Date()
      };

      const lastPaymentAmount = updates.lastPayment ?? existingLicense.lastPayment.getAmount();
      const agentsCostAmount = updates.agentsCost ?? existingLicense.agentsCost.getAmount();

      const updatedLicense = new License(
        existingLicense.id,
        updates.dba ?? existingLicense.dba,
        updates.zip ?? existingLicense.zip,
        existingLicense.startsAt,
        updates.status ?? existingLicense.status,
        updates.plan ?? existingLicense.plan,
        updates.term ?? existingLicense.term,
        updates.seatsTotal ?? existingLicense.seatsTotal,
        existingLicense.seatsUsed,
        new Money(lastPaymentAmount),
        new Date(),
        updates.smsPurchased ?? existingLicense.smsPurchased,
        existingLicense.smsSent,
        updates.agents ?? existingLicense.agents,
        updates.agentsName ?? existingLicense.agentsName,
        new Money(agentsCostAmount),
        updates.notes ?? existingLicense.notes,
        existingLicense.key,
        existingLicense.product,
        existingLicense.cancelDate,
        existingLicense.createdAt,
        new Date()
      );

      // Save updated license
      await this.licenseRepository.save(updatedLicense);

      this.useCaseLogger.debug('License updated successfully', {
        correlationId,
        licenseId: id,
        newStatus: updatedLicense.status,
        operation: 'update_license_success'
      });

      return updatedLicense;
    } catch (error) {
      this.useCaseLogger.error('Failed to update license', {
        correlationId,
        licenseId: id,
        updates: Object.keys(updates),
        operation: 'update_license_error',
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to update license: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

