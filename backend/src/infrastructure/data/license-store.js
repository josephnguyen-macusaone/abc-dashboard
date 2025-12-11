/**
 * In-memory license store used for initial integration.
 * Replace with PostgreSQL-backed repository later.
 */

const STATUS_VALUES = ['active', 'cancel', 'pending', 'expired'];
const PLAN_VALUES = ['Basic', 'Premium', 'Enterprise'];
const TERM_VALUES = ['monthly', 'yearly'];

function buildLicense(input, now = new Date()) {
  const createdAt = input.createdAt || now.toISOString();
  const updatedAt = input.updatedAt || createdAt;

  const smsPurchased = Number(input.smsPurchased ?? 0);
  const smsSent = Number(input.smsSent ?? 0);

  return {
    id: input.id,
    dba: input.dba?.toString() ?? '',
    zip: input.zip?.toString() ?? '',
    startDay: input.startDay ?? now.toISOString().slice(0, 10),
    status: STATUS_VALUES.includes(input.status) ? input.status : 'pending',
    cancelDate: input.cancelDate ?? null,
    plan: PLAN_VALUES.includes(input.plan) ? input.plan : 'Basic',
    term: TERM_VALUES.includes(input.term) ? input.term : 'monthly',
    lastPayment: Number(input.lastPayment ?? 0),
    lastActive: input.lastActive ?? null,
    smsPurchased,
    smsSent,
    smsBalance: smsPurchased - smsSent,
    agents: Number(input.agents ?? 0),
    agentsName: Array.isArray(input.agentsName) ? input.agentsName : [],
    agentsCost: Number(input.agentsCost ?? 0),
    notes: input.notes ?? '',
    createdAt,
    updatedAt,
  };
}

function generateSeedLicenses(count = 50) {
  const licenses = [];
  const now = new Date();

  for (let i = 1; i <= count; i += 1) {
    const status = STATUS_VALUES[i % STATUS_VALUES.length];
    const plan = PLAN_VALUES[i % PLAN_VALUES.length];
    const term = TERM_VALUES[i % TERM_VALUES.length];
    const start = new Date(now);
    start.setDate(start.getDate() - i * 3);

    const smsPurchased = 500 + i * 5;
    const smsSent = Math.max(0, smsPurchased - i * 7);

    licenses.push(
      buildLicense({
        id: i,
        dba: `Demo Company ${i}`,
        zip: `9${String(1000 + i).padStart(4, '0')}`,
        startDay: start.toISOString().slice(0, 10),
        status,
        cancelDate: status === 'cancel' ? start.toISOString().slice(0, 10) : null,
        plan,
        term,
        lastPayment: 99.99 + i,
        lastActive: now.toISOString().slice(0, 10),
        smsPurchased,
        smsSent,
        agents: (i % 5) + 1,
        agentsName: Array.from({ length: (i % 5) + 1 }, (_, idx) => `Agent ${idx + 1}`),
        agentsCost: 50 * ((i % 5) + 1),
        notes: i % 3 === 0 ? 'Demo license record' : '',
        createdAt: start.toISOString(),
        updatedAt: now.toISOString(),
      })
    );
  }

  return licenses;
}

export class LicenseStore {
  constructor(seed = generateSeedLicenses()) {
    this.licenses = [...seed];
    this.nextId = this.licenses.length > 0 ? Math.max(...this.licenses.map((l) => l.id)) + 1 : 1;
  }

  list({ page = 1, limit = 10, status, dba, sortBy = 'createdAt', sortOrder = 'desc' }) {
    let results = [...this.licenses];

    if (status) {
      results = results.filter((item) => item.status === status);
    }

    if (dba) {
      const term = dba.toLowerCase();
      results = results.filter((item) => item.dba.toLowerCase().includes(term));
    }

    const sortableFields = [
      'id',
      'dba',
      'zip',
      'startDay',
      'status',
      'plan',
      'term',
      'lastPayment',
      'lastActive',
      'smsPurchased',
      'smsSent',
      'smsBalance',
      'agents',
      'agentsCost',
      'createdAt',
      'updatedAt',
    ];

    const safeSortBy = sortableFields.includes(sortBy) ? sortBy : 'createdAt';
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    results.sort((a, b) => {
      const aVal = a[safeSortBy];
      const bVal = b[safeSortBy];

      if (aVal === bVal) return 0;
      return aVal > bVal ? multiplier : -multiplier;
    });

    const total = results.length;
    const startIndex = (page - 1) * limit;
    const paged = results.slice(startIndex, startIndex + limit);

    return {
      items: paged,
      total,
      page,
      limit,
    };
  }

  getById(id) {
    const numericId = Number(id);
    return this.licenses.find((item) => item.id === numericId) || null;
  }

  create(input) {
    const now = new Date();
    const record = buildLicense(
      {
        ...input,
        id: this.nextId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      now
    );

    this.licenses.push(record);
    this.nextId += 1;
    return record;
  }

  update(id, updates) {
    const numericId = Number(id);
    const index = this.licenses.findIndex((item) => item.id === numericId);

    if (index === -1) {
      return null;
    }

    const existing = this.licenses[index];
    const now = new Date();
    const merged = buildLicense(
      {
        ...existing,
        ...updates,
        id: numericId,
        updatedAt: now.toISOString(),
        createdAt: existing.createdAt,
      },
      now
    );

    this.licenses[index] = merged;
    return merged;
  }

  bulkUpdate(updates = []) {
    const updated = [];

    updates.forEach((update) => {
      const result = this.update(update.id, update);
      if (result) {
        updated.push(result);
      }
    });

    return updated;
  }

  bulkCreate(payload = []) {
    const created = payload.map((item) => this.create(item));
    return created;
  }

  createRow(payload) {
    return this.create(payload);
  }

  bulkDelete(ids = []) {
    const numericIds = ids.map((id) => Number(id));
    const before = this.licenses.length;

    this.licenses = this.licenses.filter((license) => !numericIds.includes(license.id));

    const deleted = before - this.licenses.length;
    const notFound = numericIds.filter((id) => !this.licenses.some((item) => item.id === id));

    return { deleted, notFound };
  }

  delete(id) {
    const numericId = Number(id);
    const before = this.licenses.length;
    this.licenses = this.licenses.filter((item) => item.id !== numericId);
    return before !== this.licenses.length;
  }
}

export const licenseStore = new LicenseStore();
