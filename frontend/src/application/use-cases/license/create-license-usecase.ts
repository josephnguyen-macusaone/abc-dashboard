import { License } from '@/domain/entities/license-entity';
import { ILicenseRepository } from '@/domain/repositories/i-license-repository';
import { LicenseDomainService } from '@/domain/services/license-domain-service';
import { CreateLicenseDTO } from '@/application/dto/license-dto';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';

/**
 * Application Use Case: Create License
 * Handles creating new licenses following Clean Architecture principles
 */
export interface CreateLicenseUseCase {
  execute(dto: CreateLicenseDTO): Promise<License>;
}

export class CreateLicenseUseCaseImpl implements CreateLicenseUseCase {
  private readonly useCaseLogger = logger.createChild({
    component: 'CreateLicenseUseCase',
  });

  constructor(
    private readonly licenseRepository: ILicenseRepository,
    private readonly licenseDomainService: LicenseDomainService
  ) {}

  async execute(dto: CreateLicenseDTO): Promise<License> {
    const correlationId = generateCorrelationId();

    try {
      this.useCaseLogger.debug('Creating license', {
        correlationId,
        dba: dto.dba,
        plan: dto.plan,
        operation: 'create_license_start'
      });

      // Validate business rules
      const validation = LicenseDomainService.validateLicenseCreation(dto);
      if (!validation.isValid) {
        this.useCaseLogger.warn('License creation validation failed', {
          correlationId,
          errors: validation.errors,
          operation: 'create_license_validation_failed'
        });
        throw new Error(`License validation failed: ${validation.errors.join(', ')}`);
      }

      // Create license entity
      const { license } = License.create({
        dba: dto.dba,
        zip: dto.zip,
        startsAt: dto.startsAt,
        plan: dto.plan,
        term: dto.term,
        seatsTotal: dto.seatsTotal,
        lastPayment: dto.lastPayment,
        smsPurchased: dto.smsPurchased,
        agents: dto.agents,
        agentsName: dto.agentsName,
        agentsCost: dto.agentsCost,
        notes: dto.notes
      });

      this.useCaseLogger.debug('License entity created, saving to repository', {
        correlationId,
        licenseId: license.id.toString(),
        status: license.status,
        operation: 'create_license_entity_created'
      });

      // Save to repository (this will call the API through the infrastructure layer)
      await this.licenseRepository.save(license);

      this.useCaseLogger.debug('License created successfully', {
        correlationId,
        licenseId: license.id.toString(),
        operation: 'create_license_success'
      });

      return license;
    } catch (error) {
      this.useCaseLogger.error('Failed to create license', {
        correlationId,
        operation: 'create_license_error',
        error: error instanceof Error ? error.message : String(error),
        dto: { dba: dto.dba, plan: dto.plan } // Log safe fields only
      });
      throw new Error(`Failed to create license: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

