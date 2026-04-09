import {
  checkLicenseCreationPermission,
  checkLicenseAccessPermission,
  checkLicenseBulkOperationPermission,
  checkLicenseBulkPatchPermission,
} from '../../../src/infrastructure/middleware/license-management.middleware.js';
import { ROLES } from '../../../src/shared/constants/roles.js';
import { jest } from '@jest/globals';

function buildRes() {
  return {
    statusCode: null,
    body: null,
    header: jest.fn(),
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    req: { headers: {} },
  };
}

describe('license-management permissions', () => {
  it('allows accountant and tech to create, denies agent', () => {
    const middleware = checkLicenseCreationPermission();

    const nextAccountant = jest.fn();
    middleware({ user: { role: ROLES.ACCOUNTANT } }, buildRes(), nextAccountant);
    expect(nextAccountant).toHaveBeenCalled();

    const nextTech = jest.fn();
    middleware({ user: { role: ROLES.TECH } }, buildRes(), nextTech);
    expect(nextTech).toHaveBeenCalled();

    const resAgent = buildRes();
    middleware({ user: { role: ROLES.AGENT } }, resAgent, jest.fn());
    expect(resAgent.statusCode).toBe(403);
  });

  it('allows update for accountant/tech/manager, denies agent', () => {
    const middleware = checkLicenseAccessPermission('update');

    const nextAccountant = jest.fn();
    middleware({ user: { role: ROLES.ACCOUNTANT } }, buildRes(), nextAccountant);
    expect(nextAccountant).toHaveBeenCalled();

    const nextTech = jest.fn();
    middleware({ user: { role: ROLES.TECH } }, buildRes(), nextTech);
    expect(nextTech).toHaveBeenCalled();

    const nextManager = jest.fn();
    middleware({ user: { role: ROLES.MANAGER } }, buildRes(), nextManager);
    expect(nextManager).toHaveBeenCalled();

    const resAgent = buildRes();
    middleware({ user: { role: ROLES.AGENT } }, resAgent, jest.fn());
    expect(resAgent.statusCode).toBe(403);
  });

  it('allows sms history for agent/tech/accountant and sms payment for agent/accountant', () => {
    const smsHistory = checkLicenseAccessPermission('sms_history');
    const smsPayment = checkLicenseAccessPermission('sms_payment');

    for (const role of [ROLES.AGENT, ROLES.TECH, ROLES.ACCOUNTANT]) {
      const nextHistory = jest.fn();
      smsHistory({ user: { role } }, buildRes(), nextHistory);
      expect(nextHistory).toHaveBeenCalled();
    }

    for (const role of [ROLES.AGENT, ROLES.ACCOUNTANT]) {
      const nextPayment = jest.fn();
      smsPayment({ user: { role } }, buildRes(), nextPayment);
      expect(nextPayment).toHaveBeenCalled();
    }

    const resTechPayment = buildRes();
    smsPayment({ user: { role: ROLES.TECH } }, resTechPayment, jest.fn());
    expect(resTechPayment.statusCode).toBe(403);
  });

  it('allows bulk only for admin', () => {
    const middleware = checkLicenseBulkOperationPermission();

    const nextAdmin = jest.fn();
    middleware({ user: { role: ROLES.ADMIN } }, buildRes(), nextAdmin);
    expect(nextAdmin).toHaveBeenCalled();

    const resAccountant = buildRes();
    middleware({ user: { role: ROLES.ACCOUNTANT } }, resAccountant, jest.fn());
    expect(resAccountant.statusCode).toBe(403);

    const resTech = buildRes();
    middleware({ user: { role: ROLES.TECH } }, resTech, jest.fn());
    expect(resTech.statusCode).toBe(403);
  });

  it('allows bulk patch for admin and manager', () => {
    const middleware = checkLicenseBulkPatchPermission();

    const nextAdmin = jest.fn();
    middleware({ user: { role: ROLES.ADMIN } }, buildRes(), nextAdmin);
    expect(nextAdmin).toHaveBeenCalled();

    const nextManager = jest.fn();
    middleware({ user: { role: ROLES.MANAGER } }, buildRes(), nextManager);
    expect(nextManager).toHaveBeenCalled();

    const resAccountant = buildRes();
    middleware({ user: { role: ROLES.ACCOUNTANT } }, resAccountant, jest.fn());
    expect(resAccountant.statusCode).toBe(403);
  });
});
