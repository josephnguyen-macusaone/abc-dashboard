import {
  sliceStaffDashboardMetricsForAudience,
  type LicenseDashboardMetric,
} from '@/application/use-cases/license/get-license-stats-usecase';

function metric(id: string): LicenseDashboardMetric {
  return { id, label: id, value: '1' };
}

const fullSet: LicenseDashboardMetric[] = [
  metric('total-active-licenses'),
  metric('new-licenses-month'),
  metric('licenses-income-month'),
  metric('sms-income-month'),
  metric('total-inhouse-licenses'),
  metric('total-agent-licenses'),
  metric('high-risk-licenses'),
  metric('estimate-next-month'),
];

describe('sliceStaffDashboardMetricsForAudience', () => {
  it('returns six tech-ordered metrics', () => {
    const out = sliceStaffDashboardMetricsForAudience(fullSet, 'tech');
    expect(out.map((m) => m.id)).toEqual([
      'total-active-licenses',
      'new-licenses-month',
      'high-risk-licenses',
      'total-inhouse-licenses',
      'total-agent-licenses',
      'sms-income-month',
    ]);
  });

  it('returns six accountant-ordered metrics', () => {
    const out = sliceStaffDashboardMetricsForAudience(fullSet, 'accountant');
    expect(out.map((m) => m.id)).toEqual([
      'licenses-income-month',
      'sms-income-month',
      'total-active-licenses',
      'high-risk-licenses',
      'estimate-next-month',
      'new-licenses-month',
    ]);
  });

  it('omits missing ids', () => {
    const partial = [metric('total-active-licenses'), metric('high-risk-licenses')];
    const out = sliceStaffDashboardMetricsForAudience(partial, 'tech');
    expect(out.map((m) => m.id)).toEqual(['total-active-licenses', 'high-risk-licenses']);
  });
});
