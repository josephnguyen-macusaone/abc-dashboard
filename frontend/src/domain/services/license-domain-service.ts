import {
  License,
  LicenseId,
  Money,
  DateRange,
  CreateLicenseProps,
  LicenseDomainEvent
} from '@/domain/entities/license-entity';

// Define domain types locally (active, cancel only)
type LicenseStatus = 'active' | 'cancel';

const LicenseTermValues = ['monthly', 'yearly'] as const;
type LicenseTerm = typeof LicenseTermValues[number];

/**
 * Domain Service: License Business Rules
 * Contains business logic that spans multiple entities or complex license operations
 *
 * Business Rules:
 * - License validation and creation rules
 * - Status transition rules
 * - Pricing and payment calculations
 * - Expiration and renewal logic
 * - Bulk operation validations
 */
export class LicenseDomainService {
  // Business Constants
  private static readonly EXPIRING_SOON_DAYS = 30;
  private static readonly MIN_SEATS = 1;
  private static readonly MAX_SEATS = 10000;
  private static readonly MIN_PAYMENT = 0;
  private static readonly MAX_PAYMENT = 100000;

  /**
   * Validate license creation data
   * Business rule: All required fields must be present and valid
   */
  static validateLicenseCreation(props: CreateLicenseProps): ValidationResult {
    const errors: string[] = [];

    // Required field validations
    if (!props.dba || props.dba.trim().length === 0) {
      errors.push('DBA is required');
    }

    if (!props.zip || props.zip.trim().length === 0) {
      errors.push('ZIP code is required');
    }

    if (!props.plan || props.plan.trim().length === 0) {
      errors.push('Plan is required');
    }

    if (!props.term || !LicenseTermValues.includes(props.term as (typeof LicenseTermValues)[number])) {
      errors.push('Valid license term is required');
    }

    // Date validations
    if (!props.startsAt) {
      errors.push('Start date is required');
    } else {
      const startDate = new Date(props.startsAt);
      const now = new Date();
      if (startDate < new Date(now.getTime() - 24 * 60 * 60 * 1000)) { // Allow yesterday for timezone issues
        errors.push('Start date cannot be in the past');
      }
    }

    // Seats validations
    if (props.seatsTotal !== undefined) {
      if (props.seatsTotal < this.MIN_SEATS) {
        errors.push(`Seats total must be at least ${this.MIN_SEATS}`);
      }
      if (props.seatsTotal > this.MAX_SEATS) {
        errors.push(`Seats total cannot exceed ${this.MAX_SEATS}`);
      }
    }

    // Payment validations
    if (props.lastPayment !== undefined) {
      if (props.lastPayment < this.MIN_PAYMENT) {
        errors.push('Payment amount cannot be negative');
      }
      if (props.lastPayment > this.MAX_PAYMENT) {
        errors.push(`Payment amount cannot exceed $${this.MAX_PAYMENT}`);
      }
    }

    // Agents validations
    if (props.agents !== undefined && props.agents < 0) {
      errors.push('Agents count cannot be negative');
    }

    if (props.agentsCost !== undefined && props.agentsCost < 0) {
      errors.push('Agents cost cannot be negative');
    }

    // SMS validations
    if (props.smsPurchased !== undefined && props.smsPurchased < 0) {
      errors.push('SMS purchased cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate license status transition
   * Business rule: Status transitions must follow allowed flows
   */
  static validateStatusTransition(currentStatus: LicenseStatus, newStatus: LicenseStatus): ValidationResult {
    const allowedTransitions: Record<LicenseStatus, LicenseStatus[]> = {
      active: ['cancel'],
      cancel: [], // Terminal state
    };

    const allowed = allowedTransitions[currentStatus] || [];
    const isValid = allowed.includes(newStatus);

    return {
      isValid,
      errors: isValid ? [] : [`Cannot transition from ${currentStatus} to ${newStatus}`]
    };
  }

  /**
   * Calculate license renewal cost
   * Business rule: Renewal pricing based on term and seats
   */
  static calculateRenewalCost(license: License): Money {
    const baseRate = this.getBaseRateForPlan(license.plan);
    const termMultiplier = license.term === 'yearly' ? 12 : 1;
    const seatsMultiplier = Math.max(license.seatsTotal, 1);

    const totalCost = baseRate * termMultiplier * seatsMultiplier;

    // Apply discounts for bulk seats
    let discountRate = 0;
    if (seatsMultiplier >= 100) discountRate = 0.15;
    else if (seatsMultiplier >= 50) discountRate = 0.10;
    else if (seatsMultiplier >= 25) discountRate = 0.05;

    const discountedCost = totalCost * (1 - discountRate);

    return new Money(Math.round(discountedCost * 100) / 100); // Round to cents
  }

  /**
   * Calculate license expiration date
   * Business rule: Based on term length from start date
   */
  static calculateExpirationDate(startDate: Date, term: LicenseTerm): Date {
    const expirationDate = new Date(startDate);

    switch (term) {
      case 'monthly':
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        break;
      case 'yearly':
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        break;
    }

    return expirationDate;
  }

  /**
   * Check if license needs renewal
   * Business rule: Licenses expiring within threshold need attention
   */
  static needsRenewal(license: License, thresholdDays: number = this.EXPIRING_SOON_DAYS): boolean {
    const expirationDate = license.calculateExpirationDate();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= thresholdDays && daysUntilExpiration > 0;
  }

  /**
   * Validate bulk license operations
   * Business rule: Bulk operations must maintain data integrity
   */
  static validateBulkOperation(licenses: License[], operation: 'activate' | 'cancel' | 'delete'): ValidationResult {
    const errors: string[] = [];

    switch (operation) {
      case 'activate':
        licenses.forEach((license, index) => {
          if (!license.canBeActivated()) {
            errors.push(`License ${license.id.toString()} cannot be activated (current status: ${license.status})`);
          }
        });
        break;

      case 'cancel':
        licenses.forEach((license, index) => {
          if (license.status === 'cancel') {
            errors.push(`License ${license.id.toString()} is already in terminal state: ${license.status}`);
          }
        });
        break;

      case 'delete':
        // All licenses can be deleted, but check for active usage
        licenses.forEach((license, index) => {
          if (license.seatsUsed > 0) {
            errors.push(`License ${license.id.toString()} has ${license.seatsUsed} active users and cannot be deleted`);
          }
        });
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate license utilization rate
   * Business rule: Percentage of seats currently used
   */
  static calculateUtilizationRate(license: License): number {
    if (license.seatsTotal === 0) return 0;
    return (license.seatsUsed / license.seatsTotal) * 100;
  }

  /**
   * Validate SMS operations
   * Business rule: SMS operations must maintain balance integrity
   */
  static validateSmsOperation(license: License, operation: 'send' | 'purchase', count: number): ValidationResult {
    const errors: string[] = [];

    if (count <= 0) {
      errors.push('SMS count must be positive');
      return { isValid: false, errors };
    }

    switch (operation) {
      case 'send':
        if (license.smsBalance < count) {
          errors.push(`Insufficient SMS balance. Available: ${license.smsBalance}, Requested: ${count}`);
        }
        break;
      case 'purchase':
        // No specific validation for purchases, but could add limits here
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate license health score
   * Business rule: Composite score based on expiration, utilization, and activity
   */
  static calculateHealthScore(license: License): {
    score: number; // 0-100
    factors: {
      expirationRisk: number;
      utilizationEfficiency: number;
      activityLevel: number;
    };
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    // Expiration risk (0-100, lower is better)
    const daysUntilExpiration = license.calculateExpirationDate().getTime() - Date.now();
    const expirationRisk = Math.max(0, Math.min(100,
      (30 * 24 * 60 * 60 * 1000 - daysUntilExpiration) / (30 * 24 * 60 * 60 * 1000) * 100
    ));

    // Utilization efficiency (0-100, higher is better)
    const utilizationRate = this.calculateUtilizationRate(license);
    let utilizationEfficiency: number;
    if (utilizationRate < 50) {
      utilizationEfficiency = utilizationRate * 2; // Boost low utilization
      recommendations.push('Low seat utilization - consider reducing license size');
    } else if (utilizationRate > 90) {
      utilizationEfficiency = 100 - (utilizationRate - 90) * 10; // Penalize over-utilization
      recommendations.push('High seat utilization - consider increasing license size');
    } else {
      utilizationEfficiency = 100; // Optimal range
    }

    // Activity level (0-100, based on recent activity)
    const daysSinceActive = (Date.now() - license.lastActive.getTime()) / (24 * 60 * 60 * 1000);
    const activityLevel = Math.max(0, 100 - daysSinceActive * 2); // Decay over time

    if (daysSinceActive > 30) {
      recommendations.push('License has been inactive for over 30 days');
    }

    // Overall score (weighted average)
    const score = (
      (100 - expirationRisk) * 0.5 + // 50% weight on expiration
      utilizationEfficiency * 0.3 + // 30% weight on utilization
      activityLevel * 0.2 // 20% weight on activity
    );

    return {
      score: Math.round(score),
      factors: {
        expirationRisk,
        utilizationEfficiency,
        activityLevel
      },
      recommendations
    };
  }

  /**
   * Generate license key
   * Business rule: Unique identifier for license activation
   */
  static generateLicenseKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) result += '-';
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validate license key format
   * Business rule: License keys must follow specific format
   */
  static validateLicenseKey(key: string): boolean {
    const keyPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return keyPattern.test(key);
  }

  /**
   * Calculate prorated cost for license changes
   * Business rule: Cost adjustments based on remaining term
   */
  static calculateProratedCost(
    license: License,
    newSeatsTotal: number,
    effectiveDate: Date = new Date()
  ): Money {
    const remainingDays = Math.max(0,
      Math.ceil((license.calculateExpirationDate().getTime() - effectiveDate.getTime()) / (24 * 60 * 60 * 1000))
    );

    if (remainingDays === 0) return new Money(0);

    const totalDaysInTerm = license.term === 'yearly' ? 365 : 30;
    const prorationFactor = remainingDays / totalDaysInTerm;

    const currentCost = this.calculateRenewalCost(license);
    const newLicenseCost = this.calculateRenewalCost({
      ...license,
      seatsTotal: newSeatsTotal
    } as License);

    const costDifference = newLicenseCost.getAmount() - currentCost.getAmount();
    const proratedAmount = costDifference * prorationFactor;

    return new Money(Math.max(0, Math.round(proratedAmount * 100) / 100));
  }

  // Private helper methods

  private static getBaseRateForPlan(plan: string): number {
    // This would typically come from a configuration or pricing service
    const planRates: Record<string, number> = {
      'basic': 10,
      'professional': 25,
      'enterprise': 50,
      'premium': 100
    };

    return planRates[plan.toLowerCase()] || 25; // Default to professional rate
  }
}

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * License business metrics
 */
export interface LicenseBusinessMetrics {
  totalLicenses: number;
  activeLicenses: number;
  expiringLicenses: number;
  expiredLicenses: number;
  totalRevenue: Money;
  averageUtilization: number;
  averageHealthScore: number;
  renewalRate: number; // Percentage of licenses renewed before expiration
}
