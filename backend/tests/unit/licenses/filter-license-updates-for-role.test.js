import { ROLES } from '../../../src/shared/constants/roles.js';
import { filterLicenseBodyForRole } from '../../../src/infrastructure/utils/filter-license-updates-for-role.js';

describe('filterLicenseBodyForRole', () => {
  it('returns full body for admin', () => {
    const body = { dba: 'X', agents: 'a@b.com', agentsName: 'A' };
    expect(filterLicenseBodyForRole(ROLES.ADMIN, body)).toEqual(body);
  });

  it('strips non-agent fields for manager', () => {
    const body = {
      dba: 'Should strip',
      agents: 'agent@example.com',
      agentsName: 'Agent One',
      expectedUpdatedAt: '2024-01-01T00:00:00.000Z',
    };
    expect(filterLicenseBodyForRole(ROLES.MANAGER, body)).toEqual({
      agents: 'agent@example.com',
      agentsName: 'Agent One',
      expectedUpdatedAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('returns body unchanged for undefined role', () => {
    const body = { dba: 'Y' };
    expect(filterLicenseBodyForRole(undefined, body)).toEqual(body);
  });
});
