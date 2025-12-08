/**
 * License Mock Data Generator using Faker
 * Shared data for both DataTable and DataGrid components
 */

import { faker } from '@faker-js/faker';
import type { LicenseRecord, LicenseStatus, LicenseTerm } from '@/shared/types';

// Set a fixed seed for consistent data across sessions
faker.seed(42);

// Status options
const STATUSES: LicenseStatus[] = ['active', 'cancel', 'pending', 'expired'];

// Plan options
const PLANS = ['Basic', 'Premium', 'Enterprise'];

// Term options
const TERMS: LicenseTerm[] = ['monthly', 'yearly'];

/**
 * Generate a single license record
 */
function generateLicenseRecord(id: number): LicenseRecord {
  const status = faker.helpers.arrayElement(STATUSES);
  const plan = faker.helpers.arrayElement(PLANS);
  const term = faker.helpers.arrayElement(TERMS);
  const agentCount = faker.number.int({ min: 1, max: 10 });
  const startDay = faker.date.between({ from: '2023-01-01', to: '2024-12-01' });
  const smsPurchased = faker.number.int({ min: 100, max: 5000 });
  const smsSent = faker.number.int({ min: 0, max: smsPurchased });

  return {
    id,
    dbA: faker.company.name(),
    zip: faker.location.zipCode('#####'),
    startDay: startDay.toISOString().split('T')[0],
    status,
    cancelDate: status === 'cancel' 
      ? faker.date.between({ from: startDay, to: new Date() }).toISOString().split('T')[0] 
      : undefined,
    plan,
    term,
    lastPayment: faker.number.float({ min: 29.99, max: 1499.99, fractionDigits: 2 }),
    lastActive: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
    smsPurchased,
    smsSent,
    smsBalance: smsPurchased - smsSent,
    agents: agentCount,
    agentsName: Array.from({ length: agentCount }, () => faker.person.fullName()),
    agentsCost: faker.number.float({ min: 40, max: 500, fractionDigits: 2 }),
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) ?? '',
  };
}

/**
 * Generate an array of license records
 */
export function generateLicenses(count: number): LicenseRecord[] {
  // Reset seed for consistent data
  faker.seed(42);
  return Array.from({ length: count }, (_, i) => generateLicenseRecord(i + 1));
}

/**
 * Generate a new empty license record for adding rows
 */
export function createEmptyLicense(existingIds: number[]): LicenseRecord {
  const nextId = Math.max(...existingIds, 0) + 1;
  return {
    id: nextId,
    dbA: '',
    zip: '',
    startDay: new Date().toISOString().split('T')[0],
    status: 'pending',
    plan: 'Basic',
    term: 'monthly',
    lastPayment: 0,
    lastActive: new Date().toISOString().split('T')[0],
    smsPurchased: 0,
    smsSent: 0,
    smsBalance: 0,
    agents: 0,
    agentsName: [],
    agentsCost: 0,
    notes: '',
  };
}

// Pre-generated mock data for immediate use (50 records)
export const fakerLicenses = generateLicenses(50);

// Smaller set for DataTable (pagination demo)
export const fakerLicensesSmall = generateLicenses(25);

