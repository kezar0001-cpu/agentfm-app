# Buildstate FM RBAC Redesign - Comprehensive Analysis & Design

**Date:** 2025-11-05
**Purpose:** Redesign role-based access control system to support multi-role approval workflows and enhanced data isolation

---

## Executive Summary

This document provides a comprehensive analysis of the current RBAC implementation in Buildstate FM and proposes a redesigned system that:

1. **Introduces Owner-initiated service request workflows** with budget estimation and Property Manager approval
2. **Preserves historical data** by maintaining service request records post-conversion
3. **Implements granular permissions** for each role's specific needs
4. **Adds audit logging** for compliance and transparency
5. **Enhances subscription enforcement** with role-aware feature gating
6. **Improves data isolation** across all multi-role workflows

---

## 1. Current State Analysis

### 1.1 Database Schema (Prisma)

**Location:** `/home/user/agentfm-app/backend/prisma/schema.prisma`

#### Key Models & Relationships:

```prisma
User (4 roles: PROPERTY_MANAGER, OWNER, TECHNICIAN, TENANT)
  ↓
Property (managerId → PROPERTY_MANAGER)
  ├─ PropertyOwner (junction: User ↔ Property)
  ├─ Unit
  │   └─ UnitTenant (junction: User ↔ Unit)
  ├─ ServiceRequest (requestedById → User)
  │   └─ Job (serviceRequestId → ServiceRequest)
  ├─ Job (assignedToId → TECHNICIAN)
  └─ Inspection (assignedToId → TECHNICIAN)
```

#### Current ServiceRequest Model:
```prisma
model ServiceRequest {
  id            String                 @id @default(cuid())
  title         String
  description   String
  category      ServiceRequestCategory
  priority      JobPriority            @default(MEDIUM)
  status        ServiceRequestStatus   @default(SUBMITTED)
  propertyId    String
  unitId        String?
  requestedById String
  photos        String[]               @default([])
  reviewNotes   String?
  reviewedAt    DateTime?
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt
  jobs          Job[]
  property      Property               @relation(...)
  requestedBy   User                   @relation(...)
  unit          Unit?                  @relation(...)
}
```

**Missing Fields:**
- ❌ No `estimatedBudget` or `approvedBudget` fields
- ❌ No `approvedById` or `approvedAt` tracking
- ❌ No `rejectedById` or `rejectionReason`
- ❌ No approval workflow states (e.g., `PENDING_OWNER_APPROVAL`, `PENDING_MANAGER_APPROVAL`)

#### Current Job Model:
```prisma
model Job {
  id                String           @id @default(cuid())
  title             String
  description       String
  priority          JobPriority      @default(MEDIUM)
  status            JobStatus        @default(OPEN)
  propertyId        String?
  unitId            String?
  assignedToId      String?
  serviceRequestId  String?
  maintenancePlanId String?
  inspectionId      String?
  scheduledDate     DateTime?
  completedDate     DateTime?
  estimatedCost     Float?
  actualCost        Float?
  evidence          Json?
  notes             String?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
}
```

**Missing Fields:**
- ❌ No `createdById` field (who created the job)
- ❌ No audit trail fields

---

### 1.2 Authentication Middleware

**Location:** `/home/user/agentfm-app/backend/src/middleware/auth.js`

#### Current Functions:

1. **`requireAuth`** - Verifies JWT, attaches user to `req.user`
2. **`requireRole(...roles)`** - Checks if user has one of allowed roles
3. **`requirePropertyAccess`** - Checks property-level access (manager, owner, or technician via jobs)
4. **`requireActiveSubscription`** - Blocks if trial expired or subscription inactive
5. **`requirePropertyManagerSubscription`** - Checks manager's subscription for all team members

#### Strengths:
- ✅ Clear separation of authentication vs. authorization
- ✅ Subscription enforcement at middleware level
- ✅ Property-level access control

#### Gaps:
- ❌ No granular permission system (e.g., `canApproveServiceRequests`, `canConvertToJob`)
- ❌ No action-level auditing
- ❌ No resource-level permissions (e.g., "can this OWNER approve THIS service request?")

---

### 1.3 Service Request Flow (Current)

**Location:** `/home/user/agentfm-app/backend/src/routes/serviceRequests.js`

#### Current Workflow:

```
┌──────────────────────────────────────────────────────────────┐
│ CURRENT SERVICE REQUEST LIFECYCLE                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  [TENANT submits] → SUBMITTED                                │
│                                                               │
│  [PROPERTY_MANAGER reviews] → UNDER_REVIEW                   │
│                           ↓                                   │
│                      APPROVED or REJECTED                     │
│                           ↓                                   │
│  [PROPERTY_MANAGER converts] → CONVERTED_TO_JOB              │
│                           ↓                                   │
│                      Job created                              │
│                      ServiceRequest updated                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Who Can Do What:

| Role | Create | View | Update Status | Convert to Job |
|------|--------|------|---------------|----------------|
| **PROPERTY_MANAGER** | ✅ (any property) | ✅ (managed props) | ✅ Full | ✅ |
| **OWNER** | ✅ (owned props) | ✅ (owned props) | ⚠️ Limited | ❌ |
| **TENANT** | ✅ (own unit) | ✅ (own requests) | ❌ | ❌ |
| **TECHNICIAN** | ❌ | ✅ (properties with jobs) | ❌ | ❌ |

**Code Reference:** `/home/user/agentfm-app/backend/src/routes/serviceRequests.js:213-341`

#### Issues with Current Flow:

1. **No Owner-initiated approval workflow:**
   - Owners can create service requests but there's no budget estimation or manager approval step
   - Status directly goes to SUBMITTED, same as tenant requests
   - No differentiation between owner requests vs. tenant requests

2. **Data loss on conversion:**
   - When converted to job, service request status changes to `CONVERTED_TO_JOB`
   - BUT: If you want to view historical context, the link is there (`serviceRequestId`)
   - Actually, **this is NOT data loss** - the service request is preserved!
   - However, there's no field for approved budget or approval timestamp

3. **Limited owner capabilities:**
   - Owners can only update status, priority, and reviewNotes
   - Cannot specify budget or require manager cost analysis
   - No approval handoff mechanism

---

### 1.4 Job Management Flow (Current)

**Location:** `/home/user/agentfm-app/backend/src/routes/jobs.js`

#### Current Workflow:

```
┌──────────────────────────────────────────────────────────────┐
│ CURRENT JOB LIFECYCLE                                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  [PROPERTY_MANAGER creates] → OPEN                           │
│                           ↓                                   │
│  [Assignment] → ASSIGNED (auto when assignedToId set)        │
│                           ↓                                   │
│  [TECHNICIAN starts] → IN_PROGRESS                           │
│                           ↓                                   │
│  [TECHNICIAN completes] → COMPLETED                          │
│                           ↓                                   │
│                      Notification sent to manager             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### Who Can Do What:

| Role | Create | View | Update | Change Status | Delete |
|------|--------|------|--------|---------------|--------|
| **PROPERTY_MANAGER** | ✅ | ✅ (managed props) | ✅ Full | ✅ | ✅ |
| **OWNER** | ❌ | ✅ (owned props) | ❌ | ❌ | ❌ |
| **TENANT** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **TECHNICIAN** | ❌ | ✅ (assigned only) | ⚠️ Limited | ✅ | ❌ |

**Technician Limitations (lines 674-693):**
- Can only update: `status`, `notes`, `actualCost`, `evidence`
- Cannot change: `title`, `description`, `priority`, `scheduledDate`, `estimatedCost`, `assignedToId`

#### Strengths:
- ✅ Clear role separation
- ✅ Technicians can't create jobs (enforced)
- ✅ Notification system for assignments and completions

#### Gaps:
- ❌ No audit trail for who created the job
- ❌ No validation that estimated cost was set before technician starts
- ❌ No approval step for high-cost jobs

---

### 1.5 Property Management (Current)

**Location:** `/home/user/agentfm-app/backend/src/routes/properties.js`

#### Access Control:

```
CREATE: PROPERTY_MANAGER only (requires active subscription)
READ:
  - PROPERTY_MANAGER: Own properties
  - OWNER: Owned properties (via PropertyOwner junction)
  - TECHNICIAN: Properties with assigned jobs
  - TENANT: Properties with assigned units
UPDATE: PROPERTY_MANAGER only (owner of property)
DELETE: PROPERTY_MANAGER only (owner of property)
```

#### Owner View (Frontend):

**File:** `/home/user/agentfm-app/frontend/src/pages/OwnerDashboard.jsx`

- **View-only tabs:** Properties, Jobs, Inspections
- **No create buttons** - intentionally read-only
- **No service request tab** - Owners currently don't have a dedicated service request interface

#### Gaps:
- ❌ Owners cannot submit service requests through their dashboard
- ❌ No property-level summary cards for owners (they see job counts but not property health metrics)
- ❌ No financial tracking (rent, expenses, ROI) for owners

---

### 1.6 Inspection System

**Current Flow:**
```
PROPERTY_MANAGER creates → SCHEDULED
  ↓
Assigned to TECHNICIAN
  ↓
TECHNICIAN completes → IN_PROGRESS → COMPLETED
  ↓
Report auto-generated
  ↓
Recommendations created
  ↓
PROPERTY_MANAGER approves → Jobs created
```

#### Access Control:
- **Create:** PROPERTY_MANAGER only
- **View:** PM (managed), OWNER (owned), TECHNICIAN (assigned), TENANT (own unit)
- **Update:** PM (full), TECHNICIAN (assigned only)

#### Strengths:
- ✅ Has `InspectionAuditLog` model for full change tracking
- ✅ Photo attachments with annotations
- ✅ Reminder system

#### Gaps:
- ❌ Owners can't request inspections (they're read-only)
- ❌ No cost approval workflow for high-cost recommendations

---

### 1.7 Team Invitation System

**Current Implementation:**

```javascript
// Who can invite:
PROPERTY_MANAGER → OWNER, TECHNICIAN, TENANT

// Invite expiry:
7 days (hardcoded)

// Invite workflow:
POST /api/invites
  → Email sent with token
  → Invitee signs up with token
  → Auto-profile creation
  → Invite marked ACCEPTED
```

#### Gaps:
- ❌ No role-based expiry (all invites expire in 7 days)
- ❌ No automatic cleanup of pending invites on user list
- ❌ Pending invites shown in team list but status not clear
- ❌ No resend functionality

---

### 1.8 Subscription Enforcement

#### Current Logic:

1. **Trial:** 14 days free on signup (PROPERTY_MANAGER only)
2. **Active:** Paid subscription via Stripe
3. **Gated Features:**
   - Job creation: `requireActiveSubscription`
   - Property creation: `requireActiveSubscription`
   - Analytics: `requireActiveSubscription`

#### Subscription Checks:

```javascript
// For PROPERTY_MANAGER:
Check own subscription

// For OWNER, TENANT, TECHNICIAN:
Check property manager's subscription
```

#### Frontend (Dashboard):

**File:** `/home/user/agentfm-app/frontend/src/pages/DashboardPage.jsx:86-134`

- Shows trial days remaining
- "Subscribe Now" button
- Warning when trial expires

#### Gaps:
- ❌ No feature-level gating in frontend (buttons still visible, fail on API call)
- ❌ No grace period for expired trials
- ❌ No partial access mode (e.g., view-only after expiry)

---

## 2. Identified Gaps & Pain Points

### 2.1 Service Request Workflow Gaps

#### Gap 1: Owner-Initiated Requests Lack Budget Workflow

**Problem:**
Owners can create service requests, but there's no mechanism for:
- Submitting an estimated budget
- Requesting Property Manager to add cost analysis
- Approving/rejecting PM's proposed cost
- Converting to job only after approval

**Impact:**
- Owners can't exercise financial oversight
- No approval chain for owner-requested work
- Property Manager might create jobs without owner buy-in

**Current Code:**
```javascript
// serviceRequests.js:241-244
if (req.user.role === 'OWNER') {
  hasAccess = property.owners.some(o => o.ownerId === req.user.id);
}
// → Creates request with status SUBMITTED (same as tenant)
```

---

#### Gap 2: No Historical Budget Tracking

**Problem:**
ServiceRequest model has no fields for:
- `ownerEstimatedBudget` - What owner thinks it should cost
- `managerEstimatedCost` - What PM thinks it will cost
- `approvedBudget` - Final approved amount
- `approvedBy` / `approvedAt` - Who approved and when

**Impact:**
- Can't audit financial decisions
- No variance analysis (estimated vs. actual)
- No cost trend tracking

---

#### Gap 3: Service Request Status Ambiguity

**Current Statuses:**
```
SUBMITTED, UNDER_REVIEW, APPROVED, CONVERTED_TO_JOB, REJECTED, COMPLETED
```

**Problem:**
- `APPROVED` - Approved by whom? Owner or Manager?
- No state for "Pending Owner Approval" vs. "Pending Manager Approval"
- Cannot distinguish owner requests from tenant requests

**Proposed Additional Statuses:**
```
PENDING_MANAGER_REVIEW    // Owner submitted, waiting for PM to add cost
PENDING_OWNER_APPROVAL    // PM added cost, waiting for Owner approval
APPROVED_BY_OWNER         // Owner approved, ready to convert
```

---

### 2.2 Job Management Gaps

#### Gap 4: No Job Creation Tracking

**Problem:**
- Job model has no `createdById` field
- Can't track who created the job (PM vs. auto-created from inspection)

**Impact:**
- Audit trail incomplete
- Can't filter jobs by creator

---

#### Gap 5: Technicians Have Limited Feedback

**Problem:**
Technicians can update `notes` but:
- No structured fields for work performed
- No time tracking fields (started_at, completed_at)
- No way to mark job as "blocked" with reason

**Impact:**
- Poor communication between technician and PM
- No accountability for delays

---

### 2.3 Property Management Gaps

#### Gap 6: Owners Missing Key Features

**Problem:**
Owner dashboard is view-only:
- Can't submit service requests directly (must go through PM)
- Can't view financial summaries (income, expenses, ROI)
- Can't see tenant payment status

**Impact:**
- Owners feel like second-class users
- Must contact PM for simple requests

**Current Code:** `OwnerDashboard.jsx` - Only shows properties, jobs, inspections (all read-only)

---

### 2.4 RBAC Implementation Gaps

#### Gap 7: No Granular Permissions System

**Problem:**
Current system uses role checks (`requireRole('PROPERTY_MANAGER')`):
- All-or-nothing access
- Can't grant specific permissions (e.g., "Owner A can approve requests but Owner B cannot")

**Impact:**
- Inflexible for multi-owner properties
- Can't delegate specific tasks

---

#### Gap 8: No Audit Logging for Sensitive Operations

**Problem:**
- No audit log for service request approvals
- No audit log for job deletions
- No audit log for property changes
- Inspections have `InspectionAuditLog` but nothing else does

**Impact:**
- Can't investigate disputes
- Compliance issues (GDPR, financial audits)

---

### 2.5 Subscription & Feature Gating Gaps

#### Gap 9: Frontend Shows Unavailable Features

**Problem:**
- Buttons visible even when subscription expired
- User clicks, gets error from API
- Poor UX

**Example:**
```javascript
// DashboardPage.jsx:216
<GradientButton onClick={() => navigate('/properties', { state: { openCreateDialog: true } })}>
  Add Property
</GradientButton>
// → Shown even if trial expired, fails on API call
```

**Impact:**
- Frustrating user experience
- Confusion about what's available

---

#### Gap 10: No Role-Aware Redirects

**Problem:**
- When trial expires, all users blocked equally
- OWNER/TECHNICIAN/TENANT should redirect to "Contact PM" page
- PROPERTY_MANAGER should redirect to subscription page

**Impact:**
- Non-PM users think THEY need to subscribe
- Confusion about who pays

---

## 3. Proposed Design: New Service Request Workflow

### 3.1 Owner-Initiated Service Request Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│ NEW OWNER-INITIATED SERVICE REQUEST WORKFLOW                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 1: OWNER submits request                                         │
│  ├─ Title, description, category, priority                            │
│  ├─ Optional: ownerEstimatedBudget                                    │
│  └─ Status: PENDING_MANAGER_REVIEW                                    │
│                                                                         │
│  Step 2: PROPERTY_MANAGER reviews                                      │
│  ├─ Adds managerEstimatedCost                                         │
│  ├─ Adds cost breakdown notes                                         │
│  └─ Status: PENDING_OWNER_APPROVAL                                    │
│         ↓                                                              │
│     Notification sent to OWNER                                         │
│                                                                         │
│  Step 3: OWNER approves/rejects                                        │
│  ├─ If APPROVED:                                                      │
│  │   ├─ approvedBudget = managerEstimatedCost                        │
│  │   ├─ approvedById = owner.id                                      │
│  │   ├─ approvedAt = now()                                           │
│  │   └─ Status: APPROVED_BY_OWNER                                    │
│  │                                                                     │
│  │ If REJECTED:                                                       │
│  │   ├─ rejectedById = owner.id                                      │
│  │   ├─ rejectionReason = "Cost too high" / custom                   │
│  │   └─ Status: REJECTED_BY_OWNER                                    │
│  │       → Can be resubmitted with new cost                           │
│  │                                                                     │
│  Step 4: PROPERTY_MANAGER converts to job                              │
│  ├─ Creates job with approved budget as estimatedCost                │
│  ├─ Assigns to TECHNICIAN                                             │
│  └─ ServiceRequest status: CONVERTED_TO_JOB                           │
│      ServiceRequest preserved with full history                        │
│                                                                         │
│  Step 5: TECHNICIAN executes                                           │
│  ├─ Updates job status: ASSIGNED → IN_PROGRESS → COMPLETED           │
│  ├─ Records actualCost                                                │
│  └─ PM and OWNER notified on completion                               │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Tenant-Initiated Service Request Flow (Existing, Enhanced)

```
┌────────────────────────────────────────────────────────────────────────┐
│ TENANT-INITIATED SERVICE REQUEST (UNCHANGED WORKFLOW)                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 1: TENANT submits request                                        │
│  └─ Status: SUBMITTED                                                  │
│                                                                         │
│  Step 2: PROPERTY_MANAGER reviews                                      │
│  └─ Status: UNDER_REVIEW → APPROVED or REJECTED                       │
│                                                                         │
│  Step 3: PROPERTY_MANAGER converts to job                              │
│  └─ Status: CONVERTED_TO_JOB                                          │
│                                                                         │
│  Step 4: TECHNICIAN executes                                           │
│  └─ Status: COMPLETED                                                  │
│                                                                         │
│  Note: Tenants don't set budgets; PM manages costs directly           │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 Updated ServiceRequest Schema

```prisma
model ServiceRequest {
  id                     String                 @id @default(cuid())
  title                  String
  description            String
  category               ServiceRequestCategory
  priority               JobPriority            @default(MEDIUM)
  status                 ServiceRequestStatus   @default(SUBMITTED)

  // Relationships
  propertyId             String
  unitId                 String?
  requestedById          String

  // EXISTING FIELDS
  photos                 String[]               @default([])
  reviewNotes            String?
  reviewedAt             DateTime?
  createdAt              DateTime               @default(now())
  updatedAt              DateTime               @updatedAt

  // NEW FIELDS - Budget & Approval Workflow
  ownerEstimatedBudget   Float?                 // Owner's budget estimate (optional)
  managerEstimatedCost   Float?                 // PM's cost estimate
  approvedBudget         Float?                 // Final approved amount
  costBreakdownNotes     String?                // PM's cost justification

  approvedById           String?                // User who approved (OWNER or PM)
  approvedAt             DateTime?              // When approved
  rejectedById           String?                // User who rejected
  rejectedAt             DateTime?              // When rejected
  rejectionReason        String?                // Why rejected

  // Audit trail (who last updated this request)
  lastReviewedById       String?
  lastReviewedAt         DateTime?

  // Relations
  jobs                   Job[]
  property               Property               @relation(...)
  requestedBy            User                   @relation("RequestedBy", ...)
  approvedBy             User?                  @relation("ApprovedRequests", ...)
  rejectedBy             User?                  @relation("RejectedRequests", ...)
  lastReviewedBy         User?                  @relation("ReviewedRequests", ...)
  unit                   Unit?                  @relation(...)

  @@index([propertyId])
  @@index([unitId])
  @@index([requestedById])
  @@index([status])
  @@index([approvedById])
  @@index([rejectedById])
}

enum ServiceRequestStatus {
  // Tenant-initiated statuses (existing)
  SUBMITTED                // Tenant submitted, waiting for PM review
  UNDER_REVIEW            // PM reviewing
  APPROVED                // PM approved (for tenant requests)
  REJECTED                // PM rejected (for tenant requests)
  CONVERTED_TO_JOB        // Converted to job
  COMPLETED               // Fully resolved

  // NEW: Owner-initiated statuses
  PENDING_MANAGER_REVIEW   // Owner submitted, waiting for PM to add cost
  PENDING_OWNER_APPROVAL   // PM added cost, waiting for Owner approval
  APPROVED_BY_OWNER        // Owner approved, ready to convert to job
  REJECTED_BY_OWNER        // Owner rejected PM's cost estimate
}
```

---

### 3.4 Updated Job Schema

```prisma
model Job {
  id                String           @id @default(cuid())
  title             String
  description       String
  priority          JobPriority      @default(MEDIUM)
  status            JobStatus        @default(OPEN)

  // Relationships
  propertyId        String?
  unitId            String?
  assignedToId      String?
  serviceRequestId  String?
  maintenancePlanId String?
  inspectionId      String?

  // Scheduling
  scheduledDate     DateTime?
  completedDate     DateTime?
  startedAt         DateTime?         // NEW: When technician started work

  // Costs
  estimatedCost     Float?
  actualCost        Float?

  // Work tracking
  evidence          Json?
  notes             String?
  technicianNotes   String?           // NEW: Technician-specific notes

  // Audit
  createdById       String            // NEW: Who created this job
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  // Relations (add createdBy)
  createdBy         User             @relation("CreatedJobs", ...)
  assignedTo        User?            @relation("AssignedTechnician", ...)
  property          Property?        @relation(...)
  unit              Unit?            @relation(...)
  serviceRequest    ServiceRequest?  @relation(...)
  // ... rest unchanged
}
```

---

### 3.5 New Audit Log Model

```prisma
model AuditLog {
  id            String   @id @default(cuid())
  entityType    String   // "ServiceRequest", "Job", "Property", etc.
  entityId      String   // ID of the entity
  action        String   // "CREATED", "UPDATED", "DELETED", "APPROVED", "REJECTED"
  userId        String   // Who performed the action
  changes       Json?    // What changed (before/after)
  metadata      Json?    // Additional context
  ipAddress     String?  // Source IP
  userAgent     String?  // Browser/client info
  createdAt     DateTime @default(now())

  user          User     @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

---

## 4. Implementation Plan

### Phase 1: Database Schema Updates

**Files to Modify:**
1. `/home/user/agentfm-app/backend/prisma/schema.prisma`

**Changes:**
- ✅ Add new fields to `ServiceRequest` model
- ✅ Update `ServiceRequestStatus` enum
- ✅ Add `createdById` to `Job` model
- ✅ Add `startedAt` and `technicianNotes` to `Job`
- ✅ Create `AuditLog` model
- ✅ Add new user relations for `approvedRequests`, `rejectedRequests`, `createdJobs`

**Migration:**
```bash
cd backend
npx prisma migrate dev --name add_service_request_approval_workflow
```

---

### Phase 2: Backend Middleware Enhancements

**Files to Modify:**
1. `/home/user/agentfm-app/backend/src/middleware/auth.js`

**New Middleware Functions:**

```javascript
// Check if user can approve service requests for a property
export const canApproveServiceRequests = async (req, res, next) => {
  // OWNER: Can approve requests for owned properties
  // PROPERTY_MANAGER: Can approve for managed properties
};

// Check if user can convert service request to job
export const canConvertToJob = async (req, res, next) => {
  // Only PROPERTY_MANAGER with active subscription
};

// Generic permission checker
export const requirePermission = (permission) => async (req, res, next) => {
  // Check if user has specific permission
  // Supports: 'approve_service_requests', 'create_jobs', 'manage_properties'
};
```

---

### Phase 3: Service Request Route Updates

**Files to Modify:**
1. `/home/user/agentfm-app/backend/src/routes/serviceRequests.js`

**New Endpoints:**

```javascript
// 1. Owner submits request with optional budget
POST /api/service-requests
Body: {
  propertyId, unitId?, title, description, category, priority?,
  ownerEstimatedBudget?  // NEW FIELD
}
Response: { status: 'PENDING_MANAGER_REVIEW' | 'SUBMITTED' }

// 2. Property Manager adds cost estimate
POST /api/service-requests/:id/estimate
Body: {
  managerEstimatedCost: float,
  costBreakdownNotes: string
}
Response: { status: 'PENDING_OWNER_APPROVAL' }

// 3. Owner approves/rejects
POST /api/service-requests/:id/approve
Body: { approved: true, approvedBudget?: float }
Response: { status: 'APPROVED_BY_OWNER' }

POST /api/service-requests/:id/reject
Body: { rejectionReason: string }
Response: { status: 'REJECTED_BY_OWNER' }

// 4. Property Manager converts (EXISTING, enhanced)
POST /api/service-requests/:id/convert-to-job
// Now checks if request is in APPROVED_BY_OWNER or APPROVED status
```

---

### Phase 4: Job Route Updates

**Files to Modify:**
1. `/home/user/agentfm-app/backend/src/routes/jobs.js`

**Changes:**
- Add `createdById: req.user.id` to job creation
- Add audit logging to job create/update/delete
- Add validation: Can't start job without `estimatedCost` if from owner request

---

### Phase 5: Notification System Enhancements

**Files to Modify:**
1. `/home/user/agentfm-app/backend/src/utils/notificationService.js`

**New Notification Functions:**

```javascript
export async function notifyOwnerCostEstimateReady(serviceRequest, owner, manager, property) {
  await createNotification({
    userId: owner.id,
    type: 'SERVICE_REQUEST_UPDATE',
    title: 'Cost Estimate Ready',
    message: `${manager.firstName} has added a cost estimate of $${serviceRequest.managerEstimatedCost} for "${serviceRequest.title}"`,
    entityType: 'ServiceRequest',
    entityId: serviceRequest.id,
  });

  // Also send email
  await sendEmail({
    to: owner.email,
    subject: `Action Required: Approve Service Request - ${property.name}`,
    template: 'owner-approval-request',
    data: { serviceRequest, property, manager }
  });
}

export async function notifyManagerOwnerApproved(serviceRequest, manager, owner) {
  // ...
}

export async function notifyManagerOwnerRejected(serviceRequest, manager, owner, reason) {
  // ...
}
```

---

### Phase 6: Frontend - Owner Dashboard

**Files to Modify:**
1. `/home/user/agentfm-app/frontend/src/pages/OwnerDashboard.jsx`

**New Features:**

```javascript
// Add new tab: "Service Requests"
<Tab label="Service Requests" />

// Add "Submit Request" button
<Button onClick={() => setCreateDialogOpen(true)}>
  Submit Service Request
</Button>

// Add CreateServiceRequestDialog component
<CreateServiceRequestDialog
  properties={properties}
  onSubmit={handleSubmit}
  showBudgetField={true}  // NEW: Owner can add budget estimate
/>

// Add approval/rejection UI
{requests.filter(r => r.status === 'PENDING_OWNER_APPROVAL').map(request => (
  <Card>
    <Typography>{request.title}</Typography>
    <Typography>Manager Estimate: ${request.managerEstimatedCost}</Typography>
    <Typography>{request.costBreakdownNotes}</Typography>
    <Stack direction="row" spacing={2}>
      <Button onClick={() => handleApprove(request.id)}>
        Approve
      </Button>
      <Button onClick={() => handleReject(request.id)}>
        Reject
      </Button>
    </Stack>
  </Card>
))}
```

---

### Phase 7: Frontend - Property Manager Dashboard

**Files to Modify:**
1. `/home/user/agentfm-app/frontend/src/pages/DashboardPage.jsx`
2. `/home/user/agentfm-app/frontend/src/pages/ServiceRequestsPage.jsx` (create if doesn't exist)

**New Features:**

```javascript
// Add filter for pending owner approvals
const pendingOwnerApproval = serviceRequests.filter(
  sr => sr.status === 'PENDING_MANAGER_REVIEW'
);

// Add badge to service requests menu item
<MenuItem>
  Service Requests
  {pendingOwnerApproval.length > 0 && (
    <Chip label={pendingOwnerApproval.length} color="error" size="small" />
  )}
</MenuItem>

// Add cost estimate form
<Dialog open={estimateDialogOpen}>
  <TextField
    label="Estimated Cost"
    type="number"
    value={managerEstimatedCost}
    onChange={(e) => setManagerEstimatedCost(e.target.value)}
  />
  <TextField
    label="Cost Breakdown"
    multiline
    rows={4}
    value={costBreakdownNotes}
    onChange={(e) => setCostBreakdownNotes(e.target.value)}
  />
  <Button onClick={handleSubmitEstimate}>Submit Estimate</Button>
</Dialog>

// Update convert-to-job button to show only for approved requests
{request.status === 'APPROVED_BY_OWNER' || request.status === 'APPROVED' ? (
  <Button onClick={() => handleConvertToJob(request.id)}>
    Convert to Job
  </Button>
) : (
  <Chip label={request.status} />
)}
```

---

### Phase 8: Frontend - Feature Gating

**Files to Modify:**
1. All dashboard components
2. Create `/home/user/agentfm-app/frontend/src/hooks/useFeatureAccess.js`

**New Hook:**

```javascript
export function useFeatureAccess() {
  const { user } = useCurrentUser();

  const canCreateJobs = useMemo(() => {
    if (user.role !== 'PROPERTY_MANAGER') return false;
    return isSubscriptionActive(user);
  }, [user]);

  const canApproveRequests = useMemo(() => {
    return user.role === 'PROPERTY_MANAGER' || user.role === 'OWNER';
  }, [user]);

  return { canCreateJobs, canApproveRequests, ... };
}

// Usage:
const { canCreateJobs } = useFeatureAccess();

{canCreateJobs && (
  <Button onClick={handleCreateJob}>Create Job</Button>
)}

{!canCreateJobs && (
  <Tooltip title="Subscription required">
    <span>
      <Button disabled>Create Job</Button>
    </span>
  </Tooltip>
)}
```

---

### Phase 9: Audit Logging

**Files to Create:**
1. `/home/user/agentfm-app/backend/src/utils/auditLog.js`

```javascript
import { prisma } from '../config/prismaClient.js';

export async function logAudit({
  entityType,
  entityId,
  action,
  userId,
  changes = null,
  metadata = null,
  req = null
}) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId,
        changes,
        metadata,
        ipAddress: req?.ip || null,
        userAgent: req?.get('user-agent') || null,
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should never break business logic
  }
}

// Usage in routes:
await logAudit({
  entityType: 'ServiceRequest',
  entityId: request.id,
  action: 'APPROVED',
  userId: req.user.id,
  changes: {
    before: { status: 'PENDING_OWNER_APPROVAL' },
    after: { status: 'APPROVED_BY_OWNER', approvedBudget: 500 }
  },
  req
});
```

---

### Phase 10: Testing

**Files to Create:**
1. `/home/user/agentfm-app/backend/test/serviceRequestApprovalFlow.test.js`
2. `/home/user/agentfm-app/backend/test/jobCreationAudit.test.js`
3. `/home/user/agentfm-app/backend/test/ownerApprovalPermissions.test.js`

**Test Coverage:**

```javascript
describe('Service Request Approval Workflow', () => {
  test('Owner submits request with budget', async () => {
    // Create owner user
    // Submit service request with ownerEstimatedBudget
    // Verify status is PENDING_MANAGER_REVIEW
  });

  test('Property Manager adds cost estimate', async () => {
    // PM adds managerEstimatedCost
    // Verify status changes to PENDING_OWNER_APPROVAL
    // Verify owner receives notification
  });

  test('Owner approves estimate', async () => {
    // Owner approves
    // Verify status changes to APPROVED_BY_OWNER
    // Verify approvedBudget is set
    // Verify audit log created
  });

  test('Owner rejects estimate', async () => {
    // Owner rejects with reason
    // Verify status changes to REJECTED_BY_OWNER
    // Verify PM receives notification
  });

  test('PM converts approved request to job', async () => {
    // PM converts
    // Verify job created with estimatedCost = approvedBudget
    // Verify service request status = CONVERTED_TO_JOB
    // Verify service request preserved (not deleted)
  });
});
```

---

## 5. Additional Enhancements

### 5.1 Property Management Enhancements

**Owner Financial Dashboard:**

```javascript
// New endpoint: GET /api/properties/:id/financials
{
  propertyId,
  monthlyRent: 5000,
  expenses: [
    { category: 'Maintenance', amount: 1200 },
    { category: 'Jobs', amount: 800 }
  ],
  netIncome: 3000,
  roi: 0.06
}
```

### 5.2 Inspection Workflow Enhancements

**Owner-Requested Inspections:**

- Owners can request inspections (PM must approve)
- PM assigns to technician
- Report shared with owner

### 5.3 Team Invitation Enhancements

**Role-Based Expiry:**

```javascript
const INVITE_EXPIRY = {
  OWNER: 7 days,
  TECHNICIAN: 3 days,
  TENANT: 14 days
};
```

**Auto-Cleanup:**

```javascript
// Cron job: Remove invites from pending list if expired or accepted
```

---

## 6. Summary of Changes

### Database Changes:
- ✅ 7 new fields in `ServiceRequest`
- ✅ 4 new enum values in `ServiceRequestStatus`
- ✅ 3 new fields in `Job`
- ✅ New `AuditLog` model
- ✅ New user relations

### Backend Changes:
- ✅ 3 new endpoints: `/estimate`, `/approve`, `/reject`
- ✅ Enhanced `/convert-to-job` logic
- ✅ 4 new middleware functions
- ✅ Audit logging utility
- ✅ 3 new notification functions

### Frontend Changes:
- ✅ Owner dashboard: Service requests tab with approval UI
- ✅ Property Manager dashboard: Cost estimate form
- ✅ Feature gating hook
- ✅ Role-aware subscription alerts

### Testing:
- ✅ 15+ new test cases covering approval workflows
- ✅ Integration tests for multi-role handoffs
- ✅ Audit log verification tests

---

## 7. Migration & Deployment Strategy

### Step 1: Database Migration (Zero Downtime)

```sql
-- Run migration
BEGIN;

-- Add new columns with default values
ALTER TABLE "ServiceRequest" ADD COLUMN "ownerEstimatedBudget" DOUBLE PRECISION;
ALTER TABLE "ServiceRequest" ADD COLUMN "managerEstimatedCost" DOUBLE PRECISION;
ALTER TABLE "ServiceRequest" ADD COLUMN "approvedBudget" DOUBLE PRECISION;
ALTER TABLE "ServiceRequest" ADD COLUMN "costBreakdownNotes" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "approvedAt" TIMESTAMP;
ALTER TABLE "ServiceRequest" ADD COLUMN "rejectedById" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "rejectedAt" TIMESTAMP;
ALTER TABLE "ServiceRequest" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "lastReviewedById" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "lastReviewedAt" TIMESTAMP;

-- Update enum
ALTER TYPE "ServiceRequestStatus" ADD VALUE 'PENDING_MANAGER_REVIEW';
ALTER TYPE "ServiceRequestStatus" ADD VALUE 'PENDING_OWNER_APPROVAL';
ALTER TYPE "ServiceRequestStatus" ADD VALUE 'APPROVED_BY_OWNER';
ALTER TYPE "ServiceRequestStatus" ADD VALUE 'REJECTED_BY_OWNER';

-- Add job tracking fields
ALTER TABLE "Job" ADD COLUMN "createdById" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "Job" ADD COLUMN "startedAt" TIMESTAMP;
ALTER TABLE "Job" ADD COLUMN "technicianNotes" TEXT;

-- Create AuditLog table
CREATE TABLE "AuditLog" ( ... );

COMMIT;
```

### Step 2: Backward Compatibility

- Old service request endpoints still work
- New statuses only used for owner-initiated requests
- Tenant requests use old flow unchanged

### Step 3: Gradual Rollout

1. Deploy backend with new endpoints (no breaking changes)
2. Test in staging with mock data
3. Deploy frontend with feature flags
4. Enable for owners gradually (A/B test)

---

## 8. Success Metrics

### Functional Metrics:
- ✅ Owners can submit service requests with budget
- ✅ Property Managers can add cost estimates
- ✅ Owners can approve/reject estimates
- ✅ Service requests preserved post-conversion
- ✅ Audit logs created for all approvals

### User Experience Metrics:
- ⬆️ Owner satisfaction score (survey)
- ⬇️ Time to approve service requests
- ⬆️ Transparency (cost vs. budget variance visible)

### Technical Metrics:
- ✅ All tests passing
- ✅ No increase in API response times
- ✅ Audit logs queryable for compliance

---

**End of Analysis Document**
