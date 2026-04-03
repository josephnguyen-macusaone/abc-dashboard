import {
  getMonthToDateLicenseDateRange,
  getDefaultLicenseDateRange,
} from '@/presentation/hooks/use-initial-license-filters';

describe('license date range helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 15, 12, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('getMonthToDateLicenseDateRange: first of month through today (local)', () => {
    const r = getMonthToDateLicenseDateRange();
    expect(r.startsAtFrom).toBe('2026-04-01');
    expect(r.startsAtTo).toBe('2026-04-15');
  });

  it('getDefaultLicenseDateRange: full calendar month', () => {
    const r = getDefaultLicenseDateRange();
    expect(r.startsAtFrom).toBe('2026-04-01');
    expect(r.startsAtTo).toBe('2026-04-30');
  });
});
