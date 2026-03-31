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
    const { expectedUpdatedAt: clientExpectedUpdatedAt, ...fieldUpdates } = updates;

    try {
      this.useCaseLogger.debug('Updating license', {
        correlationId,
        licenseId: id,
        updates: Object.keys(fieldUpdates),
        operation: 'update_license_start'
      });

      // Find existing license
      const existingLicense = await this.licenseRepository.findById(licenseId);
      if (!existingLicense) {
        throw new Error(`License with ID ${id} not found`);
      }

      const concurrencyToken =
        clientExpectedUpdatedAt ?? existingLicense.updatedAt?.toISOString();

      this.useCaseLogger.debug('Existing license found, validating updates', {
        correlationId,
        licenseId: id,
        currentStatus: existingLicense.status,
        operation: 'update_license_validation'
      });

      // Validate status transition if status is being updated
      if (fieldUpdates.status && fieldUpdates.status !== existingLicense.status) {
        const transitionValidation = LicenseDomainService.validateStatusTransition(
          existingLicense.status,
          fieldUpdates.status
        );
        if (!transitionValidation.isValid) {
          this.useCaseLogger.warn('Invalid status transition', {
            correlationId,
            licenseId: id,
            from: existingLicense.status,
            to: fieldUpdates.status,
            errors: transitionValidation.errors,
            operation: 'update_license_invalid_transition'
          });
          throw new Error(`Invalid status transition: ${transitionValidation.errors.join(', ')}`);
        }
      }

      const lastPaymentAmount = fieldUpdates.lastPayment ?? existingLicense.lastPayment.getAmount();
      const agentsCostAmount = fieldUpdates.agentsCost ?? existingLicense.agentsCost.getAmount();

      const startsAt =
        fieldUpdates.startsAt !== undefined
          ? new Date(fieldUpdates.startsAt)
          : existingLicense.startsAt;
      const cancelDate =
        fieldUpdates.cancelDate !== undefined
          ? fieldUpdates.cancelDate
            ? new Date(fieldUpdates.cancelDate)
            : undefined
          : existingLicense.cancelDate;

      const updatedLicense = new License(
        existingLicense.id,
        fieldUpdates.dba ?? existingLicense.dba,
        fieldUpdates.zip ?? existingLicense.zip,
        startsAt,
        fieldUpdates.status ?? existingLicense.status,
        fieldUpdates.plan ?? existingLicense.plan,
        fieldUpdates.term ?? existingLicense.term,
        fieldUpdates.seatsTotal ?? existingLicense.seatsTotal,
        existingLicense.seatsUsed,
        new Money(lastPaymentAmount),
        new Date(),
        fieldUpdates.smsPurchased ?? existingLicense.smsPurchased,
        fieldUpdates.smsSent ?? existingLicense.smsSent,
        fieldUpdates.agents ?? existingLicense.agents,
        fieldUpdates.agentsName ?? existingLicense.agentsName,
        new Money(agentsCostAmount),
        fieldUpdates.notes ?? existingLicense.notes,
        existingLicense.key,
        existingLicense.product,
        cancelDate,
        existingLicense.createdAt,
        new Date()
      );

      await this.licenseRepository.save(
        updatedLicense,
        concurrencyToken ? { expectedUpdatedAt: concurrencyToken } : undefined
      );

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
        updates: Object.keys(fieldUpdates),
        operation: 'update_license_error',
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to update license: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

