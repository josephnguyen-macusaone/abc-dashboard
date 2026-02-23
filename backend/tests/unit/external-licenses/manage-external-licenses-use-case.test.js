/**
 * Manage External Licenses Use Case - Unit Tests
 * Verifies CRUD operations for external licenses.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ManageExternalLicensesUseCase } from '../../../src/application/use-cases/external-licenses/manage-external-licenses-use-case.js';

const mockLicense = {
  id: 'ext-1',
  appid: 'app-123',
  countid: 1001,
  dba: 'Test DBA',
  zip: '12345',
  status: 1,
  license_type: 'product',
  monthlyFee: 29.99,
  ActivateDate: '2025-01-15',
  Coming_expired: '2025-12-31',
  Email_license: 'test@example.com',
};

describe('ManageExternalLicensesUseCase', () => {
  let useCase;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      findLicenses: jest.fn(),
      findById: jest.fn(),
      findByAppId: jest.fn(),
      findByEmail: jest.fn(),
      findByCountId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new ManageExternalLicensesUseCase(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLicenses', () => {
    it('delegates to repository findLicenses with options', async () => {
      const options = { page: 1, limit: 10, status: 1 };
      mockRepository.findLicenses.mockResolvedValue({
        licenses: [mockLicense],
        total: 1,
      });

      const result = await useCase.getLicenses(options);

      expect(mockRepository.findLicenses).toHaveBeenCalledWith(options);
      expect(result.licenses).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getLicenseById', () => {
    it('returns license when found', async () => {
      mockRepository.findById.mockResolvedValue(mockLicense);

      const result = await useCase.getLicenseById('ext-1');

      expect(mockRepository.findById).toHaveBeenCalledWith('ext-1');
      expect(result).toEqual(mockLicense);
    });

    it('returns null when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await useCase.getLicenseById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getLicenseByAppId', () => {
    it('returns license when found', async () => {
      mockRepository.findByAppId.mockResolvedValue(mockLicense);

      const result = await useCase.getLicenseByAppId('app-123');

      expect(mockRepository.findByAppId).toHaveBeenCalledWith('app-123');
      expect(result.appid).toBe('app-123');
    });
  });

  describe('getLicenseByEmail', () => {
    it('returns license when found', async () => {
      mockRepository.findByEmail.mockResolvedValue(mockLicense);

      const result = await useCase.getLicenseByEmail('test@example.com');

      expect(mockRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result.Email_license).toBe('test@example.com');
    });
  });

  describe('getLicenseByCountId', () => {
    it('returns license when found', async () => {
      mockRepository.findByCountId.mockResolvedValue(mockLicense);

      const result = await useCase.getLicenseByCountId(1001);

      expect(mockRepository.findByCountId).toHaveBeenCalledWith(1001);
      expect(result.countid).toBe(1001);
    });
  });

  describe('createLicense', () => {
    it('saves license via repository and returns created license', async () => {
      const licenseData = {
        appid: 'new-app',
        dba: 'New DBA',
        status: 1,
      };
      mockRepository.save.mockResolvedValue({ ...licenseData, id: 'ext-new' });

      const result = await useCase.createLicense(licenseData);

      expect(mockRepository.save).toHaveBeenCalledWith(licenseData);
      expect(result.id).toBe('ext-new');
      expect(result.appid).toBe('new-app');
    });
  });

  describe('updateLicense', () => {
    it('updates license and returns updated record', async () => {
      const updates = { dba: 'Updated DBA', ActivateDate: '2025-02-01' };
      const updatedLicense = { ...mockLicense, ...updates };
      mockRepository.update.mockResolvedValue(updatedLicense);

      const result = await useCase.updateLicense('ext-1', updates);

      expect(mockRepository.update).toHaveBeenCalledWith('ext-1', updates);
      expect(result.dba).toBe('Updated DBA');
      expect(result.ActivateDate).toBe('2025-02-01');
    });

    it('returns null when license not found', async () => {
      mockRepository.update.mockResolvedValue(null);

      const result = await useCase.updateLicense('nonexistent', { dba: 'x' });

      expect(result).toBeNull();
    });

    it('accepts Coming_expired and ActivateDate in updates', async () => {
      const updates = {
        ActivateDate: '2025-01-01',
        Coming_expired: '2025-12-31',
      };
      mockRepository.update.mockResolvedValue({ ...mockLicense, ...updates });

      const result = await useCase.updateLicense('ext-1', updates);

      expect(mockRepository.update).toHaveBeenCalledWith('ext-1', updates);
      expect(result.ActivateDate).toBe('2025-01-01');
      expect(result.Coming_expired).toBe('2025-12-31');
    });
  });

  describe('deleteLicense', () => {
    it('deletes license and returns true', async () => {
      mockRepository.findById.mockResolvedValue(mockLicense);
      mockRepository.delete.mockResolvedValue(true);

      const result = await useCase.deleteLicense('ext-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('ext-1');
      expect(result).toBe(true);
    });

    it('returns false when delete fails', async () => {
      mockRepository.findById.mockResolvedValue(mockLicense);
      mockRepository.delete.mockResolvedValue(false);

      const result = await useCase.deleteLicense('ext-1');

      expect(result).toBe(false);
    });
  });
});
