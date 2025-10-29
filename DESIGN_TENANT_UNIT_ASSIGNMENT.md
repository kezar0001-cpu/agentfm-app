# Design Document: Tenant Unit Assignment

## Problem Statement

**Missing Core Feature**: Property managers cannot assign existing tenants to units..

**Current State:**
- Tenants can only be assigned to units during invite registration
- No way to move tenants between units
- No way to assign existing tenant users to units
- Property managers must use invites even for existing tenants
- Cannot manage tenant-unit relationships after initial setup

**Impact:**
- **Blocks Core Workflow**: Property managers cannot manage tenant assignments
- **Poor User Experience**: Must create new invites for existing tenants
- **Data Inconsistency**: Tenants may exist without unit assignments
- **Operational Inefficiency**: Cannot handle tenant moves or reassignments
- **Reduced System Value**: Basic property management feature is missing

**User Journey Blocked:**
1. Property manager has existing tenant in system
2. New unit becomes available
3. Manager wants to assign tenant to unit
4. **BLOCKED**: No way to create UnitTenant relationship
5. Manager must create new invite (workaround)
6. Tenant confused by duplicate invite

## Proposed Solution

### API Endpoints

#### POST /api/units/:unitId/tenants
Assign a tenant to a unit.

**Request:**
```json
{
  "tenantId": "user123",
  "leaseStart": "2025-02-01",
  "leaseEnd": "2026-02-01",
  "rentAmount": 2500.00,
  "depositAmount": 5000.00,
  "notes": "Standard 12-month lease"
}
```

**Response:**
```json
{
  "success": true,
  "unitTenant": {
    "id": "ut123",
    "unitId": "unit123",
    "tenantId": "user123",
    "leaseStart": "2025-02-01T00:00:00Z",
    "leaseEnd": "2026-02-01T00:00:00Z",
    "rentAmount": 2500.00,
    "depositAmount": 5000.00,
    "isActive": true,
    "notes": "Standard 12-month lease",
    "tenant": {
      "id": "user123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }
}
```

#### GET /api/units/:unitId/tenants
Get all tenants for a unit (current and historical).

**Response:**
```json
{
  "success": true,
  "tenants": [
    {
      "id": "ut123",
      "tenantId": "user123",
      "leaseStart": "2025-02-01T00:00:00Z",
      "leaseEnd": "2026-02-01T00:00:00Z",
      "rentAmount": 2500.00,
      "isActive": true,
      "tenant": {
        "id": "user123",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

#### PATCH /api/units/:unitId/tenants/:tenantId
Update tenant assignment (e.g., extend lease, change rent, mark inactive).

**Request:**
```json
{
  "leaseEnd": "2027-02-01",
  "rentAmount": 2600.00,
  "isActive": true
}
```

#### DELETE /api/units/:unitId/tenants/:tenantId
Remove tenant from unit (mark as inactive).

### Access Control

**Property Managers:**
- Can assign tenants to units in properties they manage
- Can update tenant assignments
- Can remove tenants from units

**Owners:**
- Can assign tenants to units in properties they own
- Can update tenant assignments
- Can remove tenants from units

**Tenants:**
- Cannot assign or modify tenant assignments
- Can view their own unit assignments

**Technicians:**
- Cannot manage tenant assignments

### Validation Rules

**Assignment Creation:**
1. Unit must exist and belong to a property user manages/owns
2. Tenant user must exist and have role TENANT
3. Tenant cannot be assigned to multiple active units simultaneously
4. Lease start date must be provided
5. Lease end date must be after start date
6. Rent amount must be positive

**Assignment Update:**
1. User must have access to the property
2. Cannot change tenantId or unitId (create new assignment instead)
3. Lease dates must be valid
4. Rent amount must be positive

**Assignment Deletion:**
1. User must have access to the property
2. Marks assignment as inactive (soft delete)
3. Preserves historical data

### Database Schema

No changes needed - UnitTenant model already exists:

```prisma
model UnitTenant {
  id            String   @id @default(cuid())
  unitId        String
  tenantId      String
  leaseStart    DateTime
  leaseEnd      DateTime
  rentAmount    Float
  depositAmount Float?
  isActive      Boolean  @default(true)
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  unit          Unit     @relation(fields: [unitId], references: [id])
  tenant        User     @relation(fields: [tenantId], references: [id])
  
  @@index([unitId])
  @@index([tenantId])
  @@index([isActive])
}
```

### Frontend Changes

#### Unit Detail Page
Add "Tenants" section with:
- List of current and past tenants
- "Assign Tenant" button
- Tenant assignment dialog

#### Tenant Assignment Dialog
- Dropdown to select existing tenant user
- Lease start/end date pickers
- Rent amount input
- Deposit amount input (optional)
- Notes field (optional)
- Validation and error handling

#### Tenant List in Unit
- Show tenant name, email
- Show lease dates and rent
- Show active/inactive status
- Edit button (opens dialog)
- Remove button (marks inactive)

## Implementation Plan

### Phase 1: Backend API
1. Create POST /api/units/:unitId/tenants endpoint
2. Create GET /api/units/:unitId/tenants endpoint
3. Create PATCH /api/units/:unitId/tenants/:tenantId endpoint
4. Create DELETE /api/units/:unitId/tenants/:tenantId endpoint
5. Add access control validation
6. Add business logic validation

### Phase 2: Frontend UI
1. Add tenant section to unit detail page
2. Create tenant assignment dialog component
3. Add tenant list component
4. Implement edit/remove functionality
5. Add loading and error states

### Phase 3: Testing
1. Backend unit tests for all endpoints
2. Backend integration tests for access control
3. Frontend component tests
4. E2E tests for complete workflow
5. Manual testing across all user roles

### Phase 4: Documentation
1. API documentation
2. User guide for tenant assignment
3. Changelog entry
4. Migration guide (if needed)

## Performance Considerations

**Database:**
- Use existing indexes on unitId, tenantId, isActive
- Efficient queries with proper includes
- Pagination for large tenant lists

**API:**
- Response time < 200ms for CRUD operations
- Batch operations if needed
- Caching for frequently accessed data

**Frontend:**
- React Query for caching and optimistic updates
- Lazy loading for tenant lists
- Debounced search for tenant selection

## Security Considerations

**Access Control:**
- Verify user has access to property
- Prevent unauthorized tenant assignments
- Validate all input data
- Log all tenant assignment changes

**Data Privacy:**
- Only show tenant data to authorized users
- Comply with GDPR for tenant information
- Secure lease and financial data
- Audit trail for all changes

**Business Logic:**
- Prevent double-booking (tenant in multiple active units)
- Validate lease dates
- Ensure rent amounts are reasonable
- Prevent data inconsistencies

## User Experience

**Property Manager Workflow:**
1. Navigate to unit detail page
2. Click "Assign Tenant" button
3. Select tenant from dropdown (or create new)
4. Enter lease details
5. Click "Assign"
6. See tenant added to unit

**Tenant View:**
- See their current unit assignment
- View lease details
- Cannot modify assignment

**Owner View:**
- See all tenant assignments for their properties
- Can assign/modify tenants
- View financial details

## Success Metrics

**Adoption:**
- % of units with tenant assignments
- Number of tenant assignments per day
- User satisfaction with feature

**Performance:**
- API response time < 200ms
- Zero errors in production
- High success rate for assignments

**Business Impact:**
- Reduced time to assign tenants
- Improved data accuracy
- Better property management efficiency

## Follow-up Work

**Short-term:**
- Bulk tenant assignment
- Tenant move workflow (reassign to different unit)
- Lease renewal workflow
- Rent payment tracking

**Medium-term:**
- Automated lease expiration notifications
- Tenant portal for viewing lease details
- Document upload for lease agreements
- Integration with payment systems

**Long-term:**
- AI-powered tenant matching
- Predictive analytics for lease renewals
- Automated rent adjustments
- Integration with accounting systems
