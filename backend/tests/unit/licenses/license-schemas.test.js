/**
 * License Schemas Unit Tests
 * Verifies Joi validation for license-related requests, including updateExternalLicense.
 */
import { describe, it, expect } from '@jest/globals';
import { licenseSchemas } from '../../../src/infrastructure/api/v1/schemas/license.schemas.js';

describe('licenseSchemas.updateExternalLicense', () => {
  it('accepts valid ActivateDate in YYYY-MM-DD format', () => {
    const { error } = licenseSchemas.updateExternalLicense.validate({
      ActivateDate: '2025-01-15',
    });
    expect(error).toBeUndefined();
  });

  it('accepts valid ActivateDate in MM/DD/YYYY format', () => {
    const { error } = licenseSchemas.updateExternalLicense.validate({
      ActivateDate: '01/15/2025',
    });
    expect(error).toBeUndefined();
  });

  it('accepts valid coming_expired in YYYY-MM-DD format', () => {
    const { error } = licenseSchemas.updateExternalLicense.validate({
      coming_expired: '2025-12-31',
    });
    expect(error).toBeUndefined();
  });

  it('accepts valid Coming_expired in MM/DD/YYYY format', () => {
    const { error } = licenseSchemas.updateExternalLicense.validate({
      Coming_expired: '12/31/2025',
    });
    expect(error).toBeUndefined();
  });

  it('accepts empty string for ActivateDate', () => {
    const { error } = licenseSchemas.updateExternalLicense.validate({
      ActivateDate: '',
    });
    expect(error).toBeUndefined();
  });

  it('rejects invalid date format for ActivateDate', () => {
    const { error } = licenseSchemas.updateExternalLicense.validate({
      ActivateDate: 'invalid-date',
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('YYYY-MM-DD or MM/DD/YYYY');
  });

  it('rejects invalid date format for coming_expired', () => {
    const { error } = licenseSchemas.updateExternalLicense.validate({
      coming_expired: '31-12-2025',
    });
    expect(error).toBeDefined();
  });

  it('requires at least one field', () => {
    const { error } = licenseSchemas.updateExternalLicense.validate({});
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('At least one field');
  });

  it('accepts dba, zip, status, license_type, monthlyFee, smsBalance, Note', () => {
    const { error } = licenseSchemas.updateExternalLicense.validate({
      dba: 'Test DBA',
      zip: '12345',
      status: 1,
      license_type: 'product',
      monthlyFee: 29.99,
      smsBalance: 100,
      Note: 'Test note',
    });
    expect(error).toBeUndefined();
  });

  it('rejects status other than 0 or 1', () => {
    const { error } = licenseSchemas.updateExternalLicense.validate({
      status: 2,
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('0 (cancel) or 1 (active)');
  });

  it('normalizes coming_expired to Coming_expired', () => {
    const { value } = licenseSchemas.updateExternalLicense.validate({
      coming_expired: '2025-12-31',
    });
    expect(value.Coming_expired).toBe('2025-12-31');
    expect(value.coming_expired).toBeUndefined();
  });
});
