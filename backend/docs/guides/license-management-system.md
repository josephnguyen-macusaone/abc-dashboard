# License Management System - Internal & External Integration

## Overview

The ABC Dashboard implements a comprehensive **dual-license management system** that seamlessly integrates internal license management with external license synchronization. This system provides complete license lifecycle management while maintaining data integrity and business continuity.

## Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[License Dashboard UI]
        API[License API Client]
    end

    subgraph "Application Layer"
        UC[License Use Cases]
        SVC[License Services]
        EXT[External Sync Use Cases]
    end

    subgraph "Infrastructure Layer"
        CTRL[License Controllers]
        REPO[License Repositories]
        EXT_REPO[External License Repositories]
        EXT_API[External API Service]
    end

    subgraph "Domain Layer"
        ENT[License Entity]
        EXT_ENT[External License Entity]
        VAL[Validators]
    end

    subgraph "Database Layer"
        DB[(Internal Licenses Table)]
        EXT_DB[(External Licenses Table)]
    end

    UI --> API
    API --> CTRL
    CTRL --> UC
    CTRL --> SVC
    UC --> REPO
    EXT --> EXT_REPO
    EXT --> EXT_API
    EXT_REPO --> EXT_DB
    REPO --> DB
    UC --> ENT
    EXT --> EXT_ENT
    CTRL --> VAL
```

## Internal License Management

### Core Domain Model

```mermaid
classDiagram
    class License {
        +UUID id
        +String key (unique)
        +String product
        +String plan
        +LicenseStatus status
        +LicenseTerm term
        +Integer seatsTotal
        +Integer seatsUsed
        +Date startsAt
        +Date expiresAt
        +Date cancelDate
        +Date lastActive
        +String dba
        +String zip
        +Decimal lastPayment
        +Integer smsPurchased
        +Integer smsSent
        +Integer smsBalance
        +Integer agents
        +String agentsName
        +Decimal agentsCost
        +String notes
        +UUID createdBy
        +UUID updatedBy
        +DateTime createdAt
        +DateTime updatedAt

        +isActive(): Boolean
        +isExpired(): Boolean
        +isExpiringSoon(days): Boolean
        +getUtilizationPercent(): Decimal
        +hasAvailableSeats(): Boolean
        +getAvailableSeats(): Integer
        +getSmsBalance(): Integer
        +canAssign(): Boolean
        +getStatusDisplay(): String
        +toJSON(): Object
        +validate(): void
    }

    class LicenseStatus {
        <<enumeration>>
        draft
        active
        expiring
        expired
        revoked
        cancel
        pending
    }

    class LicenseTerm {
        <<enumeration>>
        monthly
        yearly
    }

    License --> LicenseStatus
    License --> LicenseTerm
```

### Business Rules & Validation

The `License` entity enforces comprehensive business rules:

```javascript
validate() {
    // Required fields validation
    if (!this.key?.trim()) errors.push('License key is required');
    if (!this.product?.trim()) errors.push('Product is required');
    if (!this.plan?.trim()) errors.push('Plan is required');

    // Status and term validation
    const validStatuses = ['draft', 'active', 'expiring', 'expired', 'revoked', 'cancel', 'pending'];
    const validTerms = ['monthly', 'yearly'];

    // Seat management constraints
    if (this.seatsTotal < 1) errors.push('Total seats must be at least 1');
    if (this.seatsUsed < 0) errors.push('Used seats cannot be negative');
    if (this.seatsUsed > this.seatsTotal) errors.push('Used seats cannot exceed total seats');

    // Date validation
    if (!this.startsAt) errors.push('Start date is required');
    if (this.expiresAt && this.expiresAt <= this.startsAt) {
        errors.push('Expiry date must be after start date');
    }
}
```

### Database Schema

```mermaid
erDiagram
    LICENSES ||--o{ LICENSE_ASSIGNMENTS : has
    LICENSES ||--o{ LICENSE_AUDIT_EVENTS : audited
    USERS ||--o{ LICENSE_ASSIGNMENTS : assigned
    USERS ||--o{ LICENSE_AUDIT_EVENTS : actor

    LICENSES {
        uuid id PK
        varchar key UK
        varchar product
        varchar plan
        license_status status
        license_term term
        integer seats_total
        integer seats_used
        timestamp starts_at
        timestamp expires_at
        timestamp cancel_date
        timestamp last_active
        varchar dba
        varchar zip
        decimal last_payment
        integer sms_purchased
        integer sms_sent
        integer sms_balance
        integer agents
        jsonb agents_name
        decimal agents_cost
        text notes
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at

        varchar appid
        integer countid
        varchar mid
        varchar license_type
        jsonb package
        varchar sendbat_workspace
        timestamp coming_expired
        external_sync_status external_sync_status
        timestamp last_external_sync
        text external_sync_error
    }

    LICENSE_ASSIGNMENTS {
        uuid id PK
        uuid license_id FK
        uuid user_id FK
        assignment_status status
        timestamp assigned_at
        timestamp revoked_at
    }

    LICENSE_AUDIT_EVENTS {
        uuid id PK
        varchar type
        uuid actor_id FK
        uuid entity_id
        varchar entity_type
        jsonb metadata
        varchar ip_address
        varchar user_agent
        timestamp created_at
    }
```

## External License Integration

### External API Data Structure

```mermaid
classDiagram
    class ExternalLicenseData {
        +Integer countid
        +String id (hash)
        +String appid
        +String license_type ("demo" | "product")
        +String dba
        +String zip
        +String mid (merchant ID)
        +Integer status (1=active, 0=inactive)
        +String ActivateDate
        +String Coming_expired
        +Decimal monthlyFee
        +Decimal smsBalance
        +String Email_license
        +String pass
        +Object Package
        +String Note
        +String Sendbat_workspace
        +String lastActive
    }

    class ExternalApiResponse {
        +Boolean success
        +Array~ExternalLicenseData~ data
        +Object meta
    }

    ExternalApiResponse --> ExternalLicenseData
```

**Key Data Patterns Observed:**
- **Active licenses**: Have both `id` and `appid` (e.g., countid 4785, 4784, 4783)
- **Demo/Pending licenses**: May have null `id` and `appid` but valid `countid` (e.g., countid 4787)
- **Merchant IDs**: Vary from actual IDs ("496611785882") to placeholders ("DEMO", "NA", "n/a")
- **License types**: Either "demo" or "product" classification

### External License Repository

The external license repository handles data synchronization between external API and internal database:

```javascript
class ExternalLicenseRepository {
    async bulkUpsert(externalLicenses) {
        // Efficient bulk operations for large datasets
    }

    async syncToInternalLicenses(internalLicenseRepo) {
        // Intelligent data merging with matching strategies
    }

    async syncFromInternalLicenses(externalApiService, internalLicenseRepo) {
        // Bidirectional sync capability
    }
}
```

## Synchronization Flow

### Complete Sync Process

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant CTRL as License Controller
    participant UC as Sync Use Case
    participant EXT_REPO as External Repository
    participant EXT_API as External API Service
    participant INT_REPO as Internal Repository
    participant DB as Database

    UI->>CTRL: POST /external-licenses/sync
    CTRL->>UC: execute({ bidirectional: true })

    UC->>EXT_API: getAllLicenses()
    EXT_API-->>UC: external license data

    UC->>EXT_REPO: bulkUpsert(externalData)
    EXT_REPO->>DB: Store raw external data

    UC->>EXT_REPO: syncToInternalLicenses()
    EXT_REPO->>INT_REPO: findByAppId() / findByEmail() / findByCountId()

    alt License exists
        INT_REPO-->>EXT_REPO: existing license
        EXT_REPO->>INT_REPO: update() with selective fields
    else License doesn't exist
        EXT_REPO->>INT_REPO: create() with smart defaults
    end

    UC->>EXT_REPO: syncFromInternalLicenses()
    EXT_REPO->>INT_REPO: findLicenses({ hasExternalData: true })

    loop For each internal license with external data
        INT_REPO-->>EXT_REPO: internal license data
        EXT_REPO->>EXT_API: updateLicense() or updateByEmail()
    end

    UC-->>CTRL: sync results
    CTRL-->>UI: success response
```

### Intelligent Matching Strategy

```mermaid
flowchart TD
    A[Process External License] --> B{External appid exists?}
    B -->|Yes| C[Try match by appid]
    B -->|No| D{External email exists?}

    C --> E[Find internal license by external_appid]
    E --> F{Found?}
    F -->|Yes| G[Update existing license]
    F -->|No| H[Continue to email matching]

    D -->|Yes| I[Try match by email]
    D -->|No| J{External countid exists?}

    I --> K[Find internal license by external_email]
    K --> L{Found?}
    L -->|Yes| M[Update existing license]
    L -->|No| N[Continue to countid matching]

    J -->|Yes| O[Try match by countid]
    J -->|No| P[Create new internal license]

    O --> Q[Find internal license by external_countid]
    Q --> R{Found?}
    R -->|Yes| S[Update existing license]
    R -->|No| P

    G --> T[Selective field update]
    M --> T
    S --> T
    P --> U[Generate license key]
    U --> V[Create with smart defaults]
```

### Data Mapping Strategy

```mermaid
graph LR
    subgraph "External API Fields"
        EXT_APPID[appid]
        EXT_COUNTID[countid]
        EXT_EMAIL[Email_license]
        EXT_DBA[dba]
        EXT_ZIP[zip]
        EXT_STATUS[status]
        EXT_ACTIVATE[ActivateDate]
        EXT_FEE[monthlyFee]
        EXT_SMS[smsBalance]
        EXT_NOTE[Note]
        EXT_PACKAGE[Package]
        EXT_WORKSPACE[Sendbat_workspace]
        EXT_EXPIRED[Coming_expired]
    end

    subgraph "Internal License Fields"
        INT_KEY[key]
        INT_PRODUCT[product]
        INT_PLAN[plan]
        INT_STATUS[status]
        INT_STARTS[startsAt]
        INT_PAYMENT[lastPayment]
        INT_SMS_BALANCE[smsBalance]
        INT_NOTES[notes]
        INT_DBA[dba]
        INT_ZIP[zip]
        INT_AGENTS[agents]

    INT_APPID[appid]
    INT_COUNTID[countid]
    INT_MID[mid]
    INT_LICENSE_TYPE[license_type]
    INT_PACKAGE_DATA[package_data]
    INT_WORKSPACE[sendbat_workspace]
    INT_EXPIRED[coming_expired]
    end

    EXT_APPID --> INT_APPID
    EXT_COUNTID --> INT_COUNTID
    EXT_MID --> INT_MID
    EXT_LICENSE_TYPE --> INT_LICENSE_TYPE
    EXT_PACKAGE --> INT_PACKAGE_DATA
    EXT_WORKSPACE --> INT_WORKSPACE
    EXT_EXPIRED --> INT_EXPIRED
    EXT_DBA --> INT_DBA
    EXT_ZIP --> INT_ZIP
    EXT_ACTIVATE --> INT_STARTS
    EXT_FEE --> INT_PAYMENT
    EXT_SMS --> INT_SMS_BALANCE
    EXT_NOTE --> INT_NOTES
    EXT_PACKAGE --> INT_EXT_PACKAGE
    EXT_WORKSPACE --> INT_EXT_WORKSPACE
    EXT_EXPIRED --> INT_EXT_EXPIRED
```

## API Endpoints

### Internal License Management

```mermaid
graph TD
    subgraph "CRUD Operations"
        A1[GET /licenses<br/>List with filtering]
        A2[GET /licenses/:id<br/>Get by ID]
        A3[POST /licenses<br/>Create license]
        A4[PUT /licenses/:id<br/>Update license]
        A5[DELETE /licenses/:id<br/>Delete license]
    end

    subgraph "Bulk Operations"
        B1[POST /licenses/bulk<br/>Bulk create]
        B2[PATCH /licenses/bulk<br/>Bulk update]
        B3[DELETE /licenses/bulk<br/>Bulk delete]
        B4[POST /licenses/row<br/>Add grid row]
    end

    subgraph "Analytics"
        C1[GET /licenses/dashboard/metrics<br/>Dashboard metrics]
    end

    subgraph "Assignments (Future)"
        D1[POST /licenses/:id/assignments<br/>Assign license]
        D2[PATCH /licenses/:id/assignments/:aid<br/>Revoke assignment]
    end
```

### External License Synchronization

```mermaid
graph TD
    subgraph "Sync Operations"
        E1[POST /external-licenses/sync<br/>Full sync]
        E2[GET /external-licenses<br/>List external licenses]
        E3[GET /external-licenses/:id<br/>Get external license]
    end

    subgraph "Sync Options"
        F1[?force=true<br/>Force full sync]
        F2[?batchSize=100<br/>Batch size]
        F3[?dryRun=true<br/>Validation only]
        F4[?syncToInternalOnly=true<br/>Skip API fetch]
        F5[?bidirectional=true<br/>Two-way sync]
    end
```

## Business Processes

### License Creation Flow

```mermaid
stateDiagram-v2
    [*] --> InputValidation
    InputValidation --> BusinessRules: Valid input
    InputValidation --> Error: Invalid input

    BusinessRules --> DuplicateCheck: Rules pass
    BusinessRules --> Error: Rules fail

    DuplicateCheck --> AuditEvent: Key available
    DuplicateCheck --> Error: Key exists

    AuditEvent --> DatabaseInsert: Event logged
    AuditEvent --> Error: Logging failed

    DatabaseInsert --> Success: Insert successful
    DatabaseInsert --> Error: Insert failed

    Success --> [*]
    Error --> [*]
```

### Sync Process Flow

```mermaid
stateDiagram-v2
    [*] --> FetchExternal
    FetchExternal --> ProcessBatches: Success
    FetchExternal --> Error: Failed

    ProcessBatches --> MatchLicenses: Batch processed
    ProcessBatches --> ProcessBatches: More batches

    MatchLicenses --> UpdateExisting: Match found
    MatchLicenses --> CreateNew: No match

    UpdateExisting --> SelectiveUpdate: Update safe fields
    CreateNew --> GenerateKey: Smart defaults

    SelectiveUpdate --> SyncTracking: Update metadata
    GenerateKey --> SyncTracking

    SyncTracking --> BidirectionalCheck: Internal updated

    BidirectionalCheck --> PushToExternal: Bidirectional enabled
    BidirectionalCheck --> Complete: Unidirectional only

    PushToExternal --> UpdateExternal: Push successful
    PushToExternal --> LogError: Push failed

    UpdateExternal --> Complete
    LogError --> Complete

    Complete --> [*]
    Error --> [*]
```

## Data Integrity & Safety

### Selective Field Updates

The system implements **selective field updates** to preserve internal business data:

```javascript
_createExternalUpdateData(externalLicense) {
    const updateData = {};

    // Always safe to update from external
    if (externalLicense.dba !== undefined && externalLicense.dba !== null) {
        updateData.dba = externalLicense.dba;
    }
    if (externalLicense.zip !== undefined && externalLicense.zip !== null) {
        updateData.zip = externalLicense.zip;
    }

    // Business-critical fields (only update if external provides)
    if (externalLicense.ActivateDate) {
        updateData.startsAt = parseDate(externalLicense.ActivateDate);
    }
    if (externalLicense.monthlyFee !== undefined) {
        updateData.lastPayment = externalLicense.monthlyFee;
    }

    // Preserve internal fields (product, plan, custom notes, etc.)
    // These are NEVER overwritten by external data

    return updateData;
}
```

### Conflict Resolution Strategy

```mermaid
flowchart TD
    A[External Data Received] --> B{Field Provided by External?}

    B -->|Yes| C{Field is Business-Critical?}
    B -->|No| D[Keep Internal Value]

    C -->|Yes| E[Update with External Value]
    C -->|No| F{Internal Field Empty?}

    F -->|Yes| G[Use External Value]
    F -->|No| H[Keep Internal Value<br/>Log Conflict]
```

## Monitoring & Metrics

### Sync Health Monitoring

```mermaid
graph TD
    subgraph "Sync Metrics"
        M1[Total Synced]
        M2[Updated Count]
        M3[Created Count]
        M4[Failed Count]
        M5[Sync Duration]
        M6[Last Sync Time]
    end

    subgraph "License Metrics"
        M7[Active Licenses]
        M8[Expiring Soon]
        M9[Expired Licenses]
        M10[Utilization %]
        M11[Revenue This Month]
        M12[SMS Usage]
    end

    subgraph "External Sync Status"
        M13["Sync Status<br/>pending|synced|failed"]
        M14[Last External Sync]
        M15[Sync Errors]
        M16[Matching Rate]
    end
```

### Dashboard Metrics Calculation

```javascript
getDashboardMetrics() {
    // Current period (selected date range or current month)
    const currentPeriodLicenses = filterByDateRange(allLicenses, startDate, endDate);

    // Previous period for trend calculation
    const previousPeriodLicenses = filterByDateRange(allLicenses, compareStart, compareEnd);

    return {
        totalActiveLicenses: calculateActiveCount(currentPeriodLicenses),
        newLicensesThisMonth: currentPeriodLicenses.length,
        licenseIncomeThisMonth: sumPayments(currentPeriodLicenses),
        smsIncomeThisMonth: calculateSmsRevenue(currentPeriodLicenses),

        // Trend calculations
        totalActiveLicensesTrend: calculateTrend(
            calculateActiveCount(currentPeriodLicenses),
            calculateActiveCount(previousPeriodLicenses)
        ),

        // Business health indicators
        inHouseLicenses: countInHouse(currentPeriodLicenses),
        agentHeavyLicenses: countAgentHeavy(currentPeriodLicenses),
        highRiskLicenses: countHighRisk(currentPeriodLicenses),

        // Predictive metrics
        estimatedNextMonthIncome: predictNextMonth(currentPeriodLicenses)
    };
}
```

## Error Handling & Recovery

### Circuit Breaker Pattern

```javascript
class ExternalLicenseApiService {
    async makeRequest(endpoint, options = {}) {
        if (this.isHealthy === false) {
            throw new Error('External API circuit breaker is open');
        }

        try {
            const response = await fetchWithTimeout(endpoint, {
                ...options,
                timeout: this.defaultTimeout
            });

            this.isHealthy = true;
            return response;
        } catch (error) {
            this.isHealthy = false;
            this.lastHealthCheck = new Date();
            throw error;
        }
    }
}
```

### Retry & Timeout Strategy

```javascript
// Exponential backoff with jitter
const retryWithBackoff = async (operation, maxRetries = 3) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries - 1) throw error;

            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
            const jitter = Math.random() * 1000;
            await sleep(delay + jitter);
        }
    }
};
```

## Security Considerations

### Authorization Matrix

```mermaid
graph TD
    subgraph "Admin Role"
        A1[Full CRUD licenses]
        A2[Bulk operations]
        A3[External sync management]
        A4[View all metrics]
        A5[Audit trail access]
    end

    subgraph "Manager Role"
        M1[Read licenses]
        M2[Assign/revoke within scope]
        M3[Update license notes]
        M4[View team metrics]
    end

    subgraph "Staff Role"
        S1[View own assignments]
        S2[Basic license info]
    end
```

### Data Protection

- **PII Handling**: External email addresses stored securely
- **Audit Logging**: All operations tracked with actor identification
- **Access Control**: Field-level permissions for sensitive data
- **Encryption**: Sensitive data encrypted at rest and in transit

## Performance Optimizations

### Database Indexing Strategy

```sql
-- Primary performance indexes
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_product ON licenses(product);
CREATE INDEX idx_licenses_starts_at ON licenses(starts_at);
CREATE INDEX idx_licenses_expires_at ON licenses(expires_at);

-- External sync indexes
CREATE INDEX idx_licenses_appid ON licenses(appid);
CREATE INDEX idx_licenses_countid ON licenses(countid);
CREATE INDEX idx_licenses_mid ON licenses(mid);
CREATE INDEX idx_licenses_license_type ON licenses(license_type);
CREATE INDEX idx_licenses_last_external_sync ON licenses(last_external_sync);

-- Full-text search for DBA field
CREATE INDEX idx_licenses_search ON licenses USING GIN (to_tsvector('english', dba));
```

### Query Optimization

```javascript
// Efficient pagination with pre-computed stats
async findLicenses(options = {}) {
    const { page = 1, limit = 10, filters = {} } = options;

    // Parallel execution for performance
    const [licenses, stats] = await Promise.all([
        this.buildQuery(filters)
            .orderBy(sortColumn, sortOrder)
            .offset((page - 1) * limit)
            .limit(limit),
        this.getLicenseStatsWithFilters(filters)
    ]);

    return {
        licenses: licenses.map(this._toLicenseEntity.bind(this)),
        total: stats.total,
        page,
        totalPages: Math.ceil(stats.total / limit),
        stats
    };
}
```

## Synchronization Approaches

### Legacy Approach (External-Driven)

```mermaid
flowchart TD
    A[Start Sync] --> B[Fetch External Licenses]
    B --> C[For Each External License]
    C --> D[Find Matching Internal License]
    D --> E{Match Found?}
    E -->|Yes| F[Update Internal License]
    E -->|No| G[Create New Internal License]
    F --> H{Next External License?}
    G --> H
    H -->|Yes| C
    H -->|No| I[Complete]
```

**Characteristics:**
- ✅ Simple and straightforward
- ✅ Fast for small datasets
- ❌ May miss internal licenses that don't have external matches
- ❌ Doesn't identify missing data gaps in existing licenses

### New Comprehensive Approach (Reconciliation-Based)

```mermaid
flowchart TD
    A[Start Sync] --> B[Fetch All External Licenses]
    B --> C[Fetch All Internal Licenses]
    C --> D[Create Lookup Maps]
    D --> E[Analyze Each Internal License]
    E --> F{External Data Missing?}
    F -->|Yes| G[Identify Missing Fields]
    F -->|No| H[No Action Needed]
    G --> I[Create Sync Operation]
    I --> J{Next Internal License?}
    H --> J
    J -->|Yes| E
    J -->|No| K[Check for New External Licenses]
    K --> L{External License Without Internal Match?}
    L -->|Yes| M[Create New Internal License]
    L -->|No| N[Execute Sync Operations]
    M --> O{More External Licenses?}
    O -->|Yes| L
    O -->|No| N
    N --> P[Complete]
```

**Characteristics:**
- ✅ Identifies all data gaps comprehensively
- ✅ Handles both missing data and new licenses
- ✅ Provides detailed field-level analysis
- ✅ More thorough reconciliation
- ❌ Slightly slower for very large datasets
- ❌ More complex logic

### Choosing the Right Approach

| Use Case | Recommended Approach | Reason |
|----------|---------------------|---------|
| **Routine Sync** | Comprehensive (default) | Ensures no data gaps are missed |
| **Bulk Import** | Legacy | Faster for large new datasets |
| **Quick Updates** | Legacy | Simpler for targeted updates |
| **Data Audit** | Comprehensive | Provides complete gap analysis |
| **Migration** | Comprehensive | Ensures complete data reconciliation |

## API Usage Examples

### Comprehensive Sync (Recommended)
```bash
curl -X POST "http://localhost:5001/api/v1/external-licenses/sync?comprehensive=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Legacy Sync
```bash
curl -X POST "http://localhost:5001/api/v1/external-licenses/sync?comprehensive=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bidirectional Sync with Comprehensive Analysis
```bash
curl -X POST "http://localhost:5001/api/v1/external-licenses/sync?comprehensive=true&bidirectional=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Future Enhancements

### Advanced Features Roadmap

1. **License Assignment System**
   - User-to-license assignment tracking
   - Seat utilization management
   - Assignment workflows

2. **Automated Notifications**
   - License expiration alerts
   - Over-utilization warnings
   - Sync failure notifications

3. **Advanced Analytics**
   - Predictive license usage
   - Revenue forecasting
   - Churn analysis

4. **Multi-Tenant Support**
   - Organization-based license pools
   - Cross-organization license sharing
   - Tenant isolation

5. **Sync Intelligence**
   - Machine learning for conflict resolution
   - Automated sync scheduling
   - Conflict resolution workflows

This comprehensive license management system provides a robust foundation for managing software licenses across internal and external systems, ensuring data integrity, business continuity, and operational excellence through intelligent synchronization approaches.