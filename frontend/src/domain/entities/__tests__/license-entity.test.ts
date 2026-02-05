/**
 * Domain entity tests: License, LicenseId, Money, DateRange
 */

import {
  LicenseId,
  Money,
  DateRange,
  License,
  type CreateLicenseProps,
  type PersistenceLicenseProps,
} from '../license-entity';

describe('LicenseId', () => {
  it('creates with non-empty value', () => {
    const id = new LicenseId('lic-1');
    expect(id.toString()).toBe('lic-1');
  });

  it('throws when value is empty', () => {
    expect(() => new LicenseId('')).toThrow('License ID cannot be empty');
    expect(() => new LicenseId('   ')).toThrow('License ID cannot be empty');
  });

  it('equals returns true for same value', () => {
    const a = new LicenseId('lic-1');
    const b = new LicenseId('lic-1');
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false for different value', () => {
    const a = new LicenseId('lic-1');
    const b = new LicenseId('lic-2');
    expect(a.equals(b)).toBe(false);
  });
});

describe('Money', () => {
  it('creates with non-negative amount', () => {
    const m = new Money(100);
    expect(m.getAmount()).toBe(100);
  });

  it('throws when amount is negative', () => {
    expect(() => new Money(-1)).toThrow('Money amount cannot be negative');
  });

  it('add returns new Money with sum', () => {
    const a = new Money(10);
    const b = new Money(20);
    const c = a.add(b);
    expect(c.getAmount()).toBe(30);
  });

  it('subtract returns new Money with difference', () => {
    const a = new Money(20);
    const b = new Money(5);
    const c = a.subtract(b);
    expect(c.getAmount()).toBe(15);
  });

  it('subtract throws when result would be negative', () => {
    const a = new Money(5);
    const b = new Money(10);
    expect(() => a.subtract(b)).toThrow('Cannot subtract more than available amount');
  });
});

describe('DateRange', () => {
  const start = new Date('2025-01-01');
  const end = new Date('2025-12-31');

  it('creates when start is before end', () => {
    const range = new DateRange(start, end);
    expect(range.start).toEqual(start);
    expect(range.end).toEqual(end);
  });

  it('throws when start is after or equal to end', () => {
    expect(() => new DateRange(end, start)).toThrow('Start date must be before end date');
    expect(() => new DateRange(start, start)).toThrow('Start date must be before end date');
  });

  it('contains returns true for date within range', () => {
    const range = new DateRange(start, end);
    expect(range.contains(new Date('2025-06-15'))).toBe(true);
  });

  it('contains returns false for date outside range', () => {
    const range = new DateRange(start, end);
    expect(range.contains(new Date('2024-06-15'))).toBe(false);
    expect(range.contains(new Date('2026-01-01'))).toBe(false);
  });

  it('daysUntilExpiration returns positive days when not expired', () => {
    const range = new DateRange(new Date('2025-01-01'), new Date('2025-01-11'));
    const now = new Date('2025-01-05');
    expect(range.daysUntilExpiration(now)).toBe(6);
  });
});

describe('License', () => {
  const validPersistenceProps: PersistenceLicenseProps = {
    id: 'lic-1',
    dba: 'Test DBA',
    zip: '12345',
    startsAt: '2025-01-01T00:00:00.000Z',
    status: 'active',
    plan: 'Pro',
    term: 'monthly',
    lastActive: '2025-01-15T00:00:00.000Z',
    seatsTotal: 10,
    seatsUsed: 2,
    lastPayment: 100,
    smsPurchased: 500,
    smsSent: 50,
    agents: 1,
    agentsName: [],
    agentsCost: 10,
    notes: '',
  };

  it('fromPersistence creates license with valid props', () => {
    const license = License.fromPersistence(validPersistenceProps);
    expect(license.id.toString()).toBe('lic-1');
    expect(license.dba).toBe('Test DBA');
    expect(license.plan).toBe('Pro');
    expect(license.status).toBe('active');
    expect(license.seatsTotal).toBe(10);
    expect(license.seatsUsed).toBe(2);
    expect(license.smsBalance).toBe(450);
  });

  it('create factory returns license and event', () => {
    const props: CreateLicenseProps = {
      id: 'new-lic-1',
      dba: 'New DBA',
      zip: '67890',
      startsAt: '2025-02-01',
      plan: 'Basic',
      term: 'monthly',
    };
    const { license, event } = License.create(props);
    expect(license.dba).toBe('New DBA');
    expect(license.plan).toBe('Basic');
    expect(license.status).toBe('active');
    expect(event.type).toBe('LicenseCreated');
    expect(event.dba).toBe('New DBA');
  });

  it('hasAvailableSeats returns true when seatsUsed < seatsTotal', () => {
    const license = License.fromPersistence(validPersistenceProps);
    expect(license.hasAvailableSeats()).toBe(true);
  });

  it('useSeat increments seatsUsed', () => {
    const license = License.fromPersistence({ ...validPersistenceProps, seatsUsed: 9, seatsTotal: 10 });
    license.useSeat();
    expect(license.seatsUsed).toBe(10);
  });

  it('useSeat throws when no seats available', () => {
    const license = License.fromPersistence({ ...validPersistenceProps, seatsUsed: 10, seatsTotal: 10 });
    expect(() => license.useSeat()).toThrow('No available seats remaining');
  });

  it('cancel sets status to cancel and returns event', () => {
    const license = License.fromPersistence(validPersistenceProps);
    const event = license.cancel('Customer request');
    expect(license.status).toBe('cancel');
    expect(event.type).toBe('LicenseCancelled');
    expect(event.reason).toBe('Customer request');
  });

  it('cancel throws when already cancelled', () => {
    const license = License.fromPersistence({
      ...validPersistenceProps,
      status: 'cancel',
      cancelDate: '2025-01-10T00:00:00.000Z',
    });
    expect(() => license.cancel()).toThrow('Cannot cancel license in status: cancel');
  });
});
