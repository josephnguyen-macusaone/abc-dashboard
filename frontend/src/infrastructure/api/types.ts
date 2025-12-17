// HTTP Client Types (Infrastructure concerns only)
export interface RequestConfig {
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: any) => boolean;
}

// Dashboard Metrics Types
export interface MetricWithTrend {
  value: number;
  trend: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
}

export interface SimpleMetric {
  value: number;
}

export interface SmsMetric extends MetricWithTrend {
  smsSent: number;
}

export interface MetricsMetadata {
  currentPeriod: {
    start: string;
    end: string;
  };
  previousPeriod: {
    start: string;
    end: string;
  };
  totalLicensesAnalyzed: number;
  appliedFilters: boolean;
}

export interface DashboardMetrics {
  totalActiveLicenses: MetricWithTrend;
  newLicensesThisMonth: MetricWithTrend;
  licenseIncomeThisMonth: MetricWithTrend;
  smsIncomeThisMonth: SmsMetric;
  inHouseLicenses: SimpleMetric;
  agentHeavyLicenses: SimpleMetric;
  highRiskLicenses: MetricWithTrend;
  estimatedNextMonthIncome: MetricWithTrend;
  metadata: MetricsMetadata;
}

export interface DashboardMetricsResponse {
  success: boolean;
  message: string;
  data: DashboardMetrics;
  correlationId?: string;
}