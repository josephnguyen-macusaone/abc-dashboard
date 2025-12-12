/**
 * Seed sample licenses for development and testing
 */
export async function seed(knex) {
  // Clear existing data (in reverse order due to foreign keys)
  await knex('license_audit_events').del();
  await knex('license_assignments').del();
  await knex('licenses').del();

  const now = new Date();
  const adminUser = await knex('users').where({ email: 'admin@example.com' }).first();
  const managerUser = await knex('users').where({ email: 'hr.manager@example.com' }).first();

  if (!adminUser) {
    console.warn('Warning: Admin user not found. Skipping license seeds.');
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

  // Generate 50 sample licenses
  const licenses = [];
  for (let i = 0; i < 50; i++) {
    const status = statuses[i % statuses.length];
    const plan = plans[i % plans.length];
    const term = terms[i % terms.length];
    const product = products[i % products.length];
    const company = companies[i % companies.length];

    const startsAt = daysAgo(Math.floor(i * 5 + 30));
    const expiresAt = term === 'yearly' ? daysFromNow(365 - i * 5) : daysFromNow(30 - i * 2);

    const seatsTotal = [5, 10, 25, 50, 100][i % 5];
    const seatsUsed = Math.min(seatsTotal, Math.floor(seatsTotal * (0.3 + Math.random() * 0.7)));

    const smsPurchased = 500 + i * 10;
    const smsSent = Math.floor(smsPurchased * (0.2 + Math.random() * 0.6));

    const agents = (i % 5) + 1;
    const agentsName = Array.from({ length: agents }, (_, idx) => `Agent ${idx + 1}`);

    licenses.push({
      id: knex.raw('gen_random_uuid()'),
      key: `LIC-${String(i + 1).padStart(6, '0')}-${product.replace(/\s+/g, '').substring(0, 4).toUpperCase()}`,
      product,
      plan,
      status: status === 'expiring' && expiresAt > daysFromNow(30) ? 'active' : status,
      term,
      seats_total: seatsTotal,
      seats_used: status === 'active' ? seatsUsed : 0,
      starts_at: startsAt,
      expires_at: status === 'expired' ? daysAgo(Math.floor(Math.random() * 30)) : expiresAt,
      cancel_date: status === 'cancel' ? daysAgo(Math.floor(Math.random() * 10)) : null,
      last_active: status === 'active' ? daysAgo(Math.floor(Math.random() * 7)) : null,
      dba: `${company} ${i > 15 ? `#${Math.floor(i / 5)}` : ''}`.trim(),
      zip: zipCodes[i % zipCodes.length],
      last_payment: 99.99 + i * 10,
      sms_purchased: smsPurchased,
      sms_sent: smsSent,
      sms_balance: smsPurchased - smsSent,
      agents,
      agents_name: JSON.stringify(agentsName),
      agents_cost: 50 * agents,
      notes: i % 3 === 0 ? 'Sample license record for testing' : '',
      created_by: adminUser.id,
      updated_by: adminUser.id,
      created_at: startsAt,
      updated_at: now,
    });
  }

  // Insert licenses
  const insertedLicenses = await knex('licenses').insert(licenses).returning('*');

  console.log(`✅ Created ${insertedLicenses.length} sample licenses`);

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
      console.log(`✅ Created ${assignments.length} sample license assignments`);
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
    console.log(`✅ Created ${auditEvents.length} sample audit events`);
  }

  console.log('✅ License seed data created successfully!');
}
