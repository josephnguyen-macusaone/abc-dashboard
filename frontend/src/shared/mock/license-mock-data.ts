/**
 * Mock data for license management table
 * Contains sample license records for development and testing
 */

// Status Enum
export type LicenseStatus = 'active' | 'cancel' | 'pending' | 'expired';

// Term Enum
export type LicenseTerm = 'monthly' | 'yearly';

// License Record Interface
export interface LicenseRecord {
  id: number;
  dbA: string; // Database/Account identifier
  zip: string;
  startDay: string; // ISO date string
  status: LicenseStatus;
  cancelDate?: string; // Required when status is 'cancel'
  plan: string;
  term: LicenseTerm;
  lastPayment: number;
  lastActive: string;
  smsPurchased: number;
  smsSent: number;
  smsBalance: number;
  agents: number;
  agentsName: string[];
  agentsCost: number;
  notes: string;
}

// Column Definition for table configuration
export interface ColumnDefinition {
  key: string;
  label: string;
  visible: boolean;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

// Sample Mock Data (10 Records)
export const mockLicenses: LicenseRecord[] = [
  {
    id: 1,
    dbA: "ABC Corp",
    zip: "90210",
    startDay: "2024-01-15",
    status: "active",
    plan: "Premium",
    term: "yearly",
    lastPayment: 299.99,
    lastActive: "2024-12-01",
    smsPurchased: 1000,
    smsSent: 450,
    smsBalance: 550,
    agents: 3,
    agentsName: ["John Doe", "Jane Smith", "Bob Wilson"],
    agentsCost: 150.00,
    notes: "VIP customer"
  },
  {
    id: 2,
    dbA: "Tech Solutions Inc",
    zip: "10001",
    startDay: "2024-02-20",
    status: "active",
    plan: "Basic",
    term: "monthly",
    lastPayment: 49.99,
    lastActive: "2024-11-28",
    smsPurchased: 500,
    smsSent: 234,
    smsBalance: 266,
    agents: 1,
    agentsName: ["Sarah Johnson"],
    agentsCost: 50.00,
    notes: "Growing business"
  },
  {
    id: 3,
    dbA: "Global Enterprises",
    zip: "60601",
    startDay: "2024-03-10",
    status: "pending",
    plan: "Enterprise",
    term: "yearly",
    lastPayment: 999.99,
    lastActive: "2024-11-15",
    smsPurchased: 5000,
    smsSent: 1200,
    smsBalance: 3800,
    agents: 10,
    agentsName: ["Mike Chen", "Lisa Wong", "David Kim", "Anna Garcia", "Tom Brown", "Emma Davis", "Chris Lee", "Rachel Miller", "James Wilson", "Amy Taylor"],
    agentsCost: 500.00,
    notes: "Large enterprise client"
  },
  {
    id: 4,
    dbA: "StartupXYZ",
    zip: "94102",
    startDay: "2024-04-05",
    status: "active",
    plan: "Premium",
    term: "monthly",
    lastPayment: 149.99,
    lastActive: "2024-12-02",
    smsPurchased: 750,
    smsSent: 89,
    smsBalance: 661,
    agents: 2,
    agentsName: ["Alex Rodriguez", "Maria Santos"],
    agentsCost: 100.00,
    notes: "Fast-growing startup"
  },
  {
    id: 5,
    dbA: "Legacy Systems Ltd",
    zip: "02101",
    startDay: "2023-11-30",
    status: "cancel",
    cancelDate: "2024-11-01",
    plan: "Basic",
    term: "yearly",
    lastPayment: 199.99,
    lastActive: "2024-10-15",
    smsPurchased: 200,
    smsSent: 45,
    smsBalance: 155,
    agents: 1,
    agentsName: ["Robert Davis"],
    agentsCost: 75.00,
    notes: "Switched to competitor"
  },
  {
    id: 6,
    dbA: "InnovateCorp",
    zip: "30301",
    startDay: "2024-05-12",
    status: "active",
    plan: "Enterprise",
    term: "yearly",
    lastPayment: 799.99,
    lastActive: "2024-11-30",
    smsPurchased: 2500,
    smsSent: 890,
    smsBalance: 1610,
    agents: 5,
    agentsName: ["Jennifer Liu", "Kevin Zhang", "Sophia Patel", "Michael Johnson", "Olivia Chen"],
    agentsCost: 250.00,
    notes: "Tech innovation company"
  },
  {
    id: 7,
    dbA: "Consulting Partners",
    zip: "77001",
    startDay: "2024-06-01",
    status: "active",
    plan: "Premium",
    term: "monthly",
    lastPayment: 129.99,
    lastActive: "2024-11-25",
    smsPurchased: 600,
    smsSent: 156,
    smsBalance: 444,
    agents: 2,
    agentsName: ["William Garcia", "Isabella Martinez"],
    agentsCost: 85.00,
    notes: "Consulting firm"
  },
  {
    id: 8,
    dbA: "RetailChain Inc",
    zip: "85001",
    startDay: "2024-07-15",
    status: "pending",
    plan: "Basic",
    term: "monthly",
    lastPayment: 39.99,
    lastActive: "2024-10-20",
    smsPurchased: 300,
    smsSent: 67,
    smsBalance: 233,
    agents: 1,
    agentsName: ["Daniel Lee"],
    agentsCost: 40.00,
    notes: "Retail chain expansion"
  },
  {
    id: 9,
    dbA: "HealthFirst Medical",
    zip: "19101",
    startDay: "2024-08-22",
    status: "active",
    plan: "Enterprise",
    term: "yearly",
    lastPayment: 1499.99,
    lastActive: "2024-12-03",
    smsPurchased: 3000,
    smsSent: 1200,
    smsBalance: 1800,
    agents: 8,
    agentsName: ["Dr. Emily White", "Dr. James Brown", "Nurse Sarah Davis", "Admin Michael Wilson", "Dr. Lisa Garcia", "Nurse Tom Johnson", "Admin Anna Lee", "Dr. Robert Kim"],
    agentsCost: 400.00,
    notes: "Healthcare provider"
  },
  {
    id: 10,
    dbA: "EduLearn Academy",
    zip: "80201",
    startDay: "2024-09-10",
    status: "active",
    plan: "Premium",
    term: "yearly",
    lastPayment: 249.99,
    lastActive: "2024-11-22",
    smsPurchased: 800,
    smsSent: 234,
    smsBalance: 566,
    agents: 3,
    agentsName: ["Prof. Maria Rodriguez", "Dr. David Chen", "Admin Sophia Kim"],
    agentsCost: 120.00,
    notes: "Educational institution"
  }
];

// Column definitions for the table
export const licenseColumns: ColumnDefinition[] = [
  { key: 'id', label: 'No.', visible: true, sortable: true, width: '60px', align: 'center' },
  { key: 'dbA', label: 'DB A', visible: true, sortable: true, width: '120px' },
  { key: 'zip', label: 'Zip', visible: true, sortable: true, width: '80px', align: 'center' },
  { key: 'startDay', label: 'Start Day', visible: true, sortable: true, width: '100px', align: 'center' },
  { key: 'status', label: 'Status', visible: true, sortable: true, width: '90px', align: 'center' },
  { key: 'plan', label: 'Plan', visible: true, sortable: true, width: '100px' },
  { key: 'term', label: 'Term', visible: true, sortable: true, width: '80px', align: 'center' },
  { key: 'lastPayment', label: 'Last Payment $', visible: true, sortable: true, width: '120px', align: 'right' },
  { key: 'lastActive', label: 'Last Active', visible: true, sortable: true, width: '100px', align: 'center' },
  { key: 'smsPurchased', label: 'SMS Purchased', visible: true, sortable: true, width: '120px', align: 'right' },
  { key: 'smsSent', label: 'SMS Sent', visible: true, sortable: true, width: '90px', align: 'right' },
  { key: 'smsBalance', label: 'SMS Balance', visible: true, sortable: true, width: '110px', align: 'right' },
  { key: 'agents', label: 'Agents', visible: true, sortable: true, width: '80px', align: 'center' },
  { key: 'agentsName', label: 'Agents Name', visible: true, sortable: false, width: '200px' },
  { key: 'agentsCost', label: 'Agents Cost', visible: true, sortable: true, width: '110px', align: 'right' },
  { key: 'notes', label: 'Notes', visible: true, sortable: false, width: '150px' }
];

// Default visible columns (first 8 columns)
export const defaultVisibleColumns = licenseColumns.slice(0, 8).map(col => col.key);
