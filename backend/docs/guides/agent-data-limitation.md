# Agent Data Limitation

## Overview

Agent-related fields (`agents`, `agentsName`, `agentsCost`) in the license system are **internal-only** data and cannot be synced from the external license management API.

## External API Response Structure

The external license management API (`https://mapi.abcsalon.us:2342/api/v1/licenses`) does **NOT** provide agent data in its response:

```json
{
  "countid": 4854,
  "id": null,
  "appid": null,
  "license_type": "product",
  "dba": "24/7 NAILS SPA",
  "zip": "48221",
  "mid": "496610623886",
  "status": "1",
  "ActivateDate": null,
  "Coming_expired": null,
  "monthlyFee": 40,
  "smsBalance": 0,
  "Email_license": "NAILS247SPA48221@outlook.com",
  "pass": "NAILS247SPA@48221",
  "Package": {
    "print_check": false,
    "special_order": false,
    "sms_package_6000": false
  },
  "Note": "From Sheet",
  "Sendbat_workspace": null,
  "lastActive": null
}
```

**Missing Fields:**

- `agents` (number)
- `agentsName` (array of strings)
- `agentsCost` (number)

## Internal System Fields

Our internal license system includes agent data for tracking purposes:

```json
{
  "id": "894328a1-d9a0-483d-8fe3-9788deec2e9f",
  "agents": 3,
  "agentsName": ["Agent 1", "Agent 2", "Agent 3"],
  "agentsCost": 150
  // ... other fields
}
```

## Implications

### 1. **Manual Entry Only**

Agent data must be entered manually through the dashboard. It cannot be automatically populated during license sync operations.

### 2. **No Sync Updates**

When syncing licenses from the external API:

- Existing agent data in the internal database is **preserved**
- No agent data is imported or updated from the external source

### 3. **Data Consistency**

To maintain consistent agent tracking:

- Add agent names during license creation
- Update agent assignments through the License Management interface
- Use the main search box (DBA or agent name) to find licenses by business or agent name

## API Endpoints

### Get All Agent Names

To assist with data entry and filtering, an endpoint is available to retrieve all unique agent names:

```
GET /api/v1/licenses/agents
```

**Response:**

```json
{
  "success": true,
  "message": "Agent names retrieved successfully",
  "data": {
    "agents": ["Agent 1", "Agent 2", "Agent 3", "..."]
  }
}
```

## Future Considerations

If the external API adds agent data fields in the future, the sync process can be updated to:

1. Map external agent fields to internal fields
2. Automatically populate agent data during sync
3. Maintain backward compatibility with manually-entered data

## Related Documentation

- [License Management System](./license-management-system.md)
- [Database Synchronization Guide](./database-synchronization-guide.md)
- [External License API Integration](./google-workspace-domain-setup.md)
