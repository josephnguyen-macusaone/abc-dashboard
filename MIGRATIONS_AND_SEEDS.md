# Migrations & Seeds Summary

## ✅ Created Files

### **Migrations**

1. **`20241212000001_create_licenses_table.js`**
   - Creates `licenses` table with all fields
   - Includes enum types for `license_status` and `license_term`
   - Adds full-text search index
   - Adds computed `utilization_percent` column
   - Adds constraint to ensure seats_used ≤ seats_total
   - **Features:**
     - License identification (key, product, plan)
     - Status tracking (draft, active, expiring, expired, revoked, cancel, pending)
     - Seat management (total, used, utilization %)
     - Date tracking (starts_at, expires_at, cancel_date, last_active)
     - Customer info (dba, zip)
     - Payment tracking (last_payment)
     - SMS/Communication credits
     - Agent management
     - Audit fields (created_by, updated_by)

2. **`20241212000002_create_license_assignments_table.js`**
   - Creates `license_assignments` table
   - Links users to licenses
   - Includes enum type for `assignment_status`
   - **Auto-updates seats_used** via trigger when assignments change
   - Unique constraint: one user per license
   - **Features:**
     - Assignment tracking (assigned_at, revoked_at)
     - Status tracking (assigned, unassigned, revoked)
     - Audit fields (assigned_by, revoked_by)
     - Automatic seat count updates via PostgreSQL trigger

3. **`20241212000003_create_license_audit_events_table.js`**
   - Creates `license_audit_events` table for audit trail
   - Tracks all license-related actions
   - Creates `license_audit_trail` view for easy querying
   - **Features:**
     - Event type tracking (e.g., 'license.created', 'assignment.revoked')
     - Actor tracking (who performed the action)
     - Entity tracking (what was affected)
     - Metadata storage (additional context as JSON)
     - IP address and user agent tracking
     - Full-text search index

### **Seeds**

1. **`002_create_sample_licenses.js`**
   - Creates 50 sample licenses with realistic data
   - Creates sample license assignments to staff users
   - Creates sample audit events
   - **Data includes:**
     - Mix of statuses (active, pending, expiring, expired, cancel)
     - Different products (ABC Salon Pro, ABC Business Suite, ABC Enterprise)
     - Different plans (Basic, Premium, Enterprise)
     - Different terms (monthly, yearly)
     - Varying seat counts (5-100 seats)
     - SMS credits tracking
     - Agent assignments

---

## 📊 Database Schema

### **Tables Created**

```
licenses
├── id (uuid, primary key)
├── key (string, unique)
├── product (string)
├── plan (string)
├── status (enum: draft, active, expiring, expired, revoked, cancel, pending)
├── term (enum: monthly, yearly)
├── seats_total (integer)
├── seats_used (integer)
├── utilization_percent (computed)
├── starts_at (timestamp)
├── expires_at (timestamp, nullable)
├── cancel_date (timestamp, nullable)
├── last_active (timestamp, nullable)
├── dba (string, nullable)
├── zip (string, nullable)
├── last_payment (decimal)
├── sms_purchased (integer)
├── sms_sent (integer)
├── sms_balance (integer)
├── agents (integer)
├── agents_name (jsonb)
├── agents_cost (decimal)
├── notes (text, nullable)
├── created_by (uuid, fk to users)
├── updated_by (uuid, fk to users)
├── created_at (timestamp)
└── updated_at (timestamp)

license_assignments
├── id (uuid, primary key)
├── license_id (uuid, fk to licenses) CASCADE DELETE
├── user_id (uuid, fk to users) CASCADE DELETE
├── status (enum: assigned, unassigned, revoked)
├── assigned_at (timestamp)
├── revoked_at (timestamp, nullable)
├── assigned_by (uuid, fk to users)
├── revoked_by (uuid, fk to users)
├── created_at (timestamp)
└── updated_at (timestamp)

license_audit_events
├── id (uuid, primary key)
├── type (string)
├── actor_id (uuid, fk to users)
├── entity_id (uuid)
├── entity_type (string: 'license' or 'assignment')
├── metadata (jsonb)
├── ip_address (string, nullable)
├── user_agent (string, nullable)
└── created_at (timestamp)
```

### **Views Created**

```
license_audit_trail
├── Joins audit events with users, licenses, and assignments
├── Provides human-readable audit trail
└── Includes actor info, license key, assigned user email
```

### **Triggers Created**

```
trg_update_license_seats
├── Automatically updates seats_used on licenses table
├── Fires after INSERT, UPDATE, DELETE on license_assignments
└── Ensures seat counts are always accurate
```

---

## 🚀 Running Migrations

### **Development**

```bash
# Run all pending migrations
npm run migrate:latest

# Run specific migration
npm run migrate:up

# Rollback last migration
npm run migrate:rollback

# Check migration status
npm run migrate:status
```

### **Seeds**

```bash
# Run all seeds
npm run seed:run

# Run specific seed
npm run seed:run 002_create_sample_licenses.js
```

---

## 🔍 Key Features

### **1. Automatic Seat Management**
- PostgreSQL trigger automatically updates `seats_used` when assignments change
- No manual count management needed
- Constraint ensures seats_used never exceeds seats_total

### **2. Full-Text Search**
- GIN indexes on licenses and audit events
- Search across key, dba, product, plan
- Fast searches even with thousands of records

### **3. Comprehensive Audit Trail**
- Every license action tracked
- View for easy audit trail queries
- Metadata stored as JSON for flexibility

### **4. Performance Optimized**
- Indexes on all frequently queried columns
- Composite indexes for common query patterns
- Computed columns for derived values

### **5. Data Integrity**
- Foreign key constraints with CASCADE deletes
- Unique constraints for business rules
- Check constraints for data validation
- Enum types for controlled values

---

## 📝 Migration Notes

### **No User Table Migrations Needed**

The existing `users` table already has:
- ✅ All required columns
- ✅ Basic indexes (role, is_active, created_at)
- ✅ Full-text search index
- ✅ Composite indexes for common queries

**Optional Enhancement (Phase 5):**
- Add `last_login_at` column if not present
- Add index on `last_login_at` for recent activity queries

### **Migration Order**

Migrations **must** run in order:
1. `create_licenses_table` - Creates base licenses table
2. `create_license_assignments_table` - Creates assignments (references licenses)
3. `create_license_audit_events_table` - Creates audit trail

### **Seed Order**

Seeds **must** run after:
1. User seeds (001_create_admin_users.js)
2. License migrations are complete

---

## ⚠️ Important Notes

### **1. Existing In-Memory Store**

The current implementation uses `LicenseStore` (in-memory):
- File: `backend/src/infrastructure/data/license-store.js`
- **Action Required**: Will be replaced by `LicenseRepository` (Phase 2.6)
- Keep the in-memory store temporarily for backward compatibility

### **2. Data Migration Strategy**

If there's existing production data:
1. Export data from in-memory store
2. Run migrations
3. Import data using seed format
4. Verify data integrity

### **3. Rollback Strategy**

Each migration has a `down()` function to rollback:
- Drops tables in reverse order
- Drops enum types
- Safe to rollback during development

### **4. Production Considerations**

Before running in production:
- ✅ Backup database
- ✅ Test migrations on staging
- ✅ Verify data integrity after migration
- ✅ Monitor performance after adding indexes

---

## 🎯 Next Steps

After running migrations and seeds:

1. **Create License Domain Entity** (Phase 2.5)
   - `backend/src/domain/entities/license-entity.js`
   
2. **Create Repository Interface** (Phase 2.5)
   - `backend/src/domain/repositories/interfaces/i-license-repository.js`

3. **Implement License Repository** (Phase 2.6)
   - `backend/src/infrastructure/repositories/license-repository.js`
   - Replace in-memory store with PostgreSQL queries

4. **Update License Controller** (Phase 2.6)
   - Switch from `LicenseStore` to `LicenseRepository`
   - Add new endpoints for assignments and audit trail

5. **Update DI Container** (Phase 2.6)
   - Wire up new repository in `container.js`

---

**Last Updated**: December 12, 2024


