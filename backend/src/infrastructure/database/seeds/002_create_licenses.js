import logger from '../../config/logger.js';

/**
 * Seed sample licenses for development and testing
 */
export async function seed(knex) {
  await knex('license_audit_events').del();
  await knex('license_assignments').del();
  await knex('licenses').del();

  const now = new Date();
  const adminUser = await knex('users').where({ email: 'admin@abcsalon.us' }).first();

  if (!adminUser) {
    logger.warn('Admin user not found. Skipping license seeds.');
    return;
  }

  // Helper function to generate dates
  const daysAgo = (days) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return date;
  };

  const daysFromNow = (days) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    return date;
  };

  // Sample company names
  const companies = [
    'Acme Corp',
    'Global Tech Inc',
    'Premier Solutions LLC',
    'Elite Services Ltd',
    'Advanced Systems Group',
    'Pro Business Solutions',
    'Mega Industries Inc',
    'Super Enterprises LLC',
    'Ultra Technologies Corp',
    'Prime Solutions Ltd',
    'Alpha Systems Inc',
    'Beta Corporation',
    'Gamma Group LLC',
    'Delta Enterprises',
    'Omega Solutions Corp',
    'Sigma Technologies Inc',
    'Nova Industries LLC',
    'Apex Business Group',
    'Vertex Solutions Corp',
    'Summit Enterprises Inc',
    'Pacific Tech LLC',
    'Atlantic Solutions Ltd',
    'Continental Systems Corp',
    'National Services Inc',
    'International Group LLC',
    'Worldwide Solutions Ltd',
    'Universal Technologies Corp',
    'Regional Services Inc',
    'Local Solutions LLC',
    'Business Pro Ltd',
    'Corporate Systems Inc',
    'Commercial Solutions LLC',
  ];

  const products = ['ABC Salon Pro', 'ABC Business Suite', 'ABC Enterprise'];
  const plans = ['Basic', 'Premium', 'Enterprise'];
  const terms = ['monthly', 'yearly'];
  const statuses = ['active', 'pending', 'expiring', 'expired', 'cancel'];
  const zipCodes = Array.from({ length: 30 }, (_, i) => `9${String(1000 + i).padStart(4, '0')}`);

  // Generate licenses across 12 months with growth patterns
  const licenses = [];
  const totalMonths = 12;
  const baseLicensesPerMonth = 15; // Base number of licenses per month

  for (let month = 0; month < totalMonths; month++) {
    // Create growth pattern: start low, peak in middle months, decline slightly
    const growthFactor = month < 3 ? 0.6 : month < 8 ? 1.2 : 0.9;
    const licensesThisMonth = Math.floor(baseLicensesPerMonth * growthFactor + Math.random() * 8);

    for (let i = 0; i < licensesThisMonth; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - month, 1);
      const daysIntoMonth = Math.floor(Math.random() * 28) + 1;
      const startsAt = new Date(monthStart.getFullYear(), monthStart.getMonth(), daysIntoMonth);

      // Weighted status distribution: mostly active, some expired, few cancelled
      const statusWeights = [
        'active',
        'active',
        'active',
        'active',
        'active',
        'active',
        'active',
        'expired',
        'expired',
        'cancel',
      ];
      const status = statusWeights[Math.floor(Math.random() * statusWeights.length)];

      const plan = plans[Math.floor(Math.random() * plans.length)];
      const term = terms[Math.floor(Math.random() * terms.length)];
      const product = products[Math.floor(Math.random() * products.length)];

      // Calculate expiration based on term and status
      let expiresAt;
      if (term === 'yearly') {
        expiresAt = new Date(startsAt.getTime() + 365 * 24 * 60 * 60 * 1000);
      } else {
        expiresAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      if (status === 'expired') {
        // For expired licenses, set expiry to be 1-30 days after start, but in the past
        const daysAfterStart = Math.floor(Math.random() * 30) + 1;
        expiresAt = new Date(startsAt.getTime() + daysAfterStart * 24 * 60 * 60 * 1000);
        // Make sure it's in the past
        if (expiresAt > now) {
          expiresAt = new Date(
            now.getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
          );
        }
      }

      const seatsTotal = [5, 10, 25, 50, 100][Math.floor(Math.random() * 5)];
      const seatsUsed =
        status === 'active'
          ? Math.min(seatsTotal, Math.floor(seatsTotal * (0.4 + Math.random() * 0.6)))
          : 0;

      // Agent distribution: 60% in-house (1-2 agents), 40% agent-heavy (3-7 agents)
      const isAgentHeavy = Math.random() > 0.6;
      const agents = isAgentHeavy
        ? 3 + Math.floor(Math.random() * 5)
        : 1 + Math.floor(Math.random() * 2);
      const agentsName = Array.from({ length: agents }, (_, idx) => `Agent ${idx + 1}`);

      const smsPurchased = 500 + Math.floor(Math.random() * 1500);
      const smsSent =
        status === 'active'
          ? Math.floor(smsPurchased * (0.1 + Math.random() * 0.7))
          : Math.floor(smsPurchased * Math.random() * 0.3);

      const companyIndex = Math.floor(Math.random() * companies.length);
      const company = companies[companyIndex];

      licenses.push({
        id: knex.raw('gen_random_uuid()'),
        key: `LIC-${String(month + 1).padStart(2, '0')}${String(i + 1).padStart(3, '0')}-${product.replace(/\s+/g, '').substring(0, 4).toUpperCase()}`,
        product,
        plan,
        status: status === 'expiring' && expiresAt > daysFromNow(30) ? 'active' : status,
        term,
        seats_total: seatsTotal,
        seats_used: seatsUsed,
        starts_at: startsAt,
        expires_at: expiresAt,
        cancel_date: status === 'cancel' ? daysAgo(Math.floor(Math.random() * 20) + 5) : null,
        last_active: status === 'active' ? daysAgo(Math.floor(Math.random() * 14)) : null, // Active within last 2 weeks
        dba: `${company} ${month > 6 ? `#${Math.floor(month / 3)}` : ''}`.trim(),
        zip: zipCodes[Math.floor(Math.random() * zipCodes.length)],
        last_payment: 99.99 + Math.random() * 400, // More varied pricing
        sms_purchased: smsPurchased,
        sms_sent: smsSent,
        sms_balance: smsPurchased - smsSent,
        agents,
        agents_name: JSON.stringify(agentsName),
        agents_cost: 50 * agents,
        notes: Math.random() > 0.7 ? `Test license for month ${month + 1}` : '',
        created_by: adminUser.id,
        updated_by: adminUser.id,
        created_at: startsAt,
        updated_at: now,
      });
    }
  }

  // Insert licenses
  const insertedLicenses = await knex('licenses').insert(licenses).returning('*');

  logger.info('Created sample licenses', {
    count: insertedLicenses.length,
    totalMonths,
  });

  const byMonth = insertedLicenses.reduce((acc, license) => {
    const month = license.starts_at.toISOString().slice(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  logger.info('Monthly distribution', { byMonth });

  // Create some sample assignments
  const staffUsers = await knex('users').where({ role: 'staff' }).limit(10);

  if (staffUsers.length > 0) {
    const assignments = [];

    // Assign first 10 active licenses to staff users
    const activeLicenses = insertedLicenses
      .filter((l) => l.status === 'active')
      .slice(0, Math.min(10, staffUsers.length * 2));

    for (let i = 0; i < activeLicenses.length; i++) {
      const license = activeLicenses[i];
      const user = staffUsers[i % staffUsers.length];

      assignments.push({
        id: knex.raw('gen_random_uuid()'),
        license_id: license.id,
        user_id: user.id,
        status: 'assigned',
        assigned_at: daysAgo(Math.floor(Math.random() * 30)),
        assigned_by: managerUser?.id || adminUser.id,
        created_at: now,
        updated_at: now,
      });
    }

    if (assignments.length > 0) {
      await knex('license_assignments').insert(assignments);
      logger.info('Created sample license assignments', { count: assignments.length });
    }
  }

  // Create some audit events
  const auditEvents = [];

  for (const license of insertedLicenses.slice(0, 20)) {
    // License created event
    auditEvents.push({
      id: knex.raw('gen_random_uuid()'),
      type: 'license.created',
      actor_id: adminUser.id,
      entity_id: license.id,
      entity_type: 'license',
      metadata: JSON.stringify({
        license_key: license.key,
        product: license.product,
        plan: license.plan,
      }),
      created_at: license.created_at,
    });

    // License activated event (if active)
    if (license.status === 'active') {
      auditEvents.push({
        id: knex.raw('gen_random_uuid()'),
        type: 'license.activated',
        actor_id: adminUser.id,
        entity_id: license.id,
        entity_type: 'license',
        metadata: JSON.stringify({
          license_key: license.key,
          previous_status: 'pending',
        }),
        created_at: new Date(license.created_at.getTime() + 3600000), // 1 hour later
      });
    }
  }

  if (auditEvents.length > 0) {
    await knex('license_audit_events').insert(auditEvents);
    logger.info('Created sample audit events', { count: auditEvents.length });
  }

  logger.info('License seed data created successfully');
}
