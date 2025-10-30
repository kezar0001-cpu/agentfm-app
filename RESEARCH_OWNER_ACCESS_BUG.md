# Research Report: Owner Access Bug in ensurePropertyAccess

**Date**: 2024  
**Researcher**: AI Assistant  
**Status**: ✅ CONFIRMED BUG  
**Severity**: 🔴 HIGH - Breaks core functionality for OWNER role

---

## 🐛 Bug Summary

The `ensurePropertyAccess` function in `backend/src/routes/properties.js` only checks if `user.id === property.managerId`, but does NOT check if the user is an OWNER who owns the property through the `PropertyOwner` relationship table. This creates a critical inconsistency where:

- ✅ Owners CAN list properties they own via `GET /api/properties`
- ❌ Owners CANNOT view property details via `GET /api/properties/:id`
- ❌ Owners CANNOT view property activity via `GET /api/properties/:id/activity`
- ❌ Owners CANNOT update properties via `PATCH /api/properties/:id` (expected - read-only)
- ❌ Owners CANNOT delete properties via `DELETE /api/properties/:id` (expected - read-only)

---

## 🔍 Evidence

### 1. Current Implementation (BUGGY)

**File**: `backend/src/routes/properties.js` (Line 150-155)

```javascript
const ensurePropertyAccess = (property, user) => {
  if (!property) return { allowed: false, reason: 'Property not found', status: 404 };
  // Only property managers who own the property can access it
  if (property.managerId === user.id) return { allowed: true };
  return { allowed: false, reason: 'Forbidden', status: 403 };
};
```

**Problem**: This function only checks `property.managerId === user.id`, which means:
- Property managers who manage the property: ✅ Access granted
- Owners who own the property: ❌ Access DENIED (BUG!)

### 2. GET / Route (CORRECT Implementation)

**File**: `backend/src/routes/properties.js` (Line 158-180)

```javascript
router.get('/', async (req, res) => {
  try {
    let where = {};
    
    // Property managers see properties they manage
    if (req.user.role === 'PROPERTY_MANAGER') {
      where = { managerId: req.user.id };
    }
    
    // Owners see properties they own
    if (req.user.role === 'OWNER') {
      where = {
        owners: {
          some: {
            ownerId: req.user.id,
          },
        },
      };
    }
    
    // ... rest of implementation
```

**This is CORRECT**: Owners can list properties they own through the `PropertyOwner` relationship.

### 3. Routes Affected by the Bug

The `ensurePropertyAccess` function is used by 4 routes:

1. **GET /:id** (Line 301) - View property details
2. **PATCH /:id** (Line 321) - Update property (PROPERTY_MANAGER only)
3. **DELETE /:id** (Line 368) - Delete property (PROPERTY_MANAGER only)
4. **GET /:id/activity** (Line 389) - View property activity

**Impact**: Owners cannot view details or activity for properties they own, even though they can list them.

### 4. Database Schema Confirms Relationship

**File**: `backend/prisma/schema.prisma`

```prisma
model Property {
  id              String            @id @default(cuid())
  name            String
  // ... other fields
  managerId       String
  manager         User              @relation("PropertyManager", fields: [managerId], references: [id])
  owners          PropertyOwner[]   // <-- Many-to-many relationship
  // ... rest of model
}

model PropertyOwner {
  id                  String    @id @default(cuid())
  propertyId          String
  ownerId             String
  ownershipPercentage Float     @default(100.0)
  startDate           DateTime  @default(now())
  endDate             DateTime?
  owner               User      @relation(fields: [ownerId], references: [id])
  property            Property  @relation(fields: [propertyId], references: [id])
  
  @@unique([propertyId, ownerId])
}
```

**Key Points**:
- A property has ONE manager (`managerId`)
- A property can have MULTIPLE owners (via `PropertyOwner` join table)
- Owners and managers are DIFFERENT roles with DIFFERENT relationships to properties

### 5. Other Routes Handle This CORRECTLY

#### Example 1: Reports Route

**File**: `backend/src/routes/reports.js` (Line 34-37)

```javascript
const hasAccess =
  req.user.role === 'PROPERTY_MANAGER' && property.managerId === req.user.id ||
  req.user.role === 'OWNER' && property.owners.some(o => o.ownerId === req.user.id);
```

✅ **CORRECT**: Checks both manager AND owner relationships.

#### Example 2: Units Route (Tenant Assignment)

**File**: `backend/src/routes/units.js` (Line 438-439)

```javascript
const hasAccess = req.user.role === 'PROPERTY_MANAGER' && unit.property.managerId === req.user.id ||
                  req.user.role === 'OWNER' && unit.property.owners.some(o => o.ownerId === req.user.id);
```

✅ **CORRECT**: Checks both manager AND owner relationships.

#### Example 3: Inspections Route

**File**: `backend/src/routes/inspections.js` (Line 305-307)

```javascript
if (user.role === ROLE_OWNER) {
  return inspection.propertyId ? user.ownedPropertyIds.includes(inspection.propertyId) : false;
}
```

✅ **CORRECT**: Uses augmented user object with `ownedPropertyIds` array.

### 6. Test Case Demonstrating the Bug

```javascript
// Test case: Owner accessing their property
const property = { 
  id: 'prop1', 
  managerId: 'manager123',
  owners: [{ ownerId: 'owner456' }]  // owner456 owns this property
};

const owner = { id: 'owner456', role: 'OWNER' };

const result = ensurePropertyAccess(property, owner);
console.log(result);
// Expected: { allowed: true }
// Actual: { allowed: false, reason: 'Forbidden', status: 403 } ❌ BUG!
```

---

## 📊 Impact Analysis

### User Experience Impact

**Scenario**: An owner logs in and navigates to their properties.

1. **Dashboard/List View** (`GET /api/properties`)
   - ✅ Owner sees their properties listed
   - ✅ Can see property names, addresses, status
   
2. **Click on a property** (`GET /api/properties/:id`)
   - ❌ **403 Forbidden error**
   - ❌ Cannot view property details
   - ❌ Cannot see units, manager info, or owner list
   
3. **Try to view activity** (`GET /api/properties/:id/activity`)
   - ❌ **403 Forbidden error**
   - ❌ Cannot see jobs, inspections, service requests

**Result**: Owners can see their properties exist but cannot access any details. This is a broken user experience.

### Security Impact

**Good News**: This is NOT a security vulnerability. The bug is too restrictive, not too permissive:
- ✅ Owners are correctly blocked from updating/deleting properties (read-only access)
- ✅ Owners cannot access properties they don't own
- ❌ Owners are incorrectly blocked from viewing properties they DO own

### Consistency Impact

This bug creates inconsistency across the codebase:

| Route/Feature | Handles Owner Access Correctly? |
|---------------|--------------------------------|
| `GET /api/properties` | ✅ Yes |
| `GET /api/properties/:id` | ❌ No (BUG) |
| `GET /api/properties/:id/activity` | ❌ No (BUG) |
| `GET /api/reports` | ✅ Yes |
| `POST /api/reports` | ✅ Yes |
| `GET /api/jobs` | ✅ Yes |
| `GET /api/inspections` | ✅ Yes |
| `POST /api/properties/:id/units/:unitId/tenants` | ✅ Yes |
| `GET /api/properties/:id/units/:unitId/tenants` | ✅ Yes |

**Conclusion**: The properties routes are the ONLY routes with this bug. All other routes correctly handle owner access.

---

## ✅ Proposed Solution

### Option 1: Fix ensurePropertyAccess (Recommended)

Update the function to check for owner relationships:

```javascript
const ensurePropertyAccess = (property, user) => {
  if (!property) return { allowed: false, reason: 'Property not found', status: 404 };
  
  // Property managers who manage the property can access it
  if (user.role === 'PROPERTY_MANAGER' && property.managerId === user.id) {
    return { allowed: true };
  }
  
  // Owners who own the property can access it (read-only)
  if (user.role === 'OWNER' && property.owners?.some(o => o.ownerId === user.id)) {
    return { allowed: true };
  }
  
  return { allowed: false, reason: 'Forbidden', status: 403 };
};
```

**Requirements**:
- The `property` object must include the `owners` relationship
- Update all calls to `ensurePropertyAccess` to include `owners` in the query

### Option 2: Separate Read/Write Access Checks

Create two functions for different access levels:

```javascript
const ensurePropertyReadAccess = (property, user) => {
  if (!property) return { allowed: false, reason: 'Property not found', status: 404 };
  
  // Managers can read properties they manage
  if (user.role === 'PROPERTY_MANAGER' && property.managerId === user.id) {
    return { allowed: true };
  }
  
  // Owners can read properties they own
  if (user.role === 'OWNER' && property.owners?.some(o => o.ownerId === user.id)) {
    return { allowed: true };
  }
  
  return { allowed: false, reason: 'Forbidden', status: 403 };
};

const ensurePropertyWriteAccess = (property, user) => {
  if (!property) return { allowed: false, reason: 'Property not found', status: 404 };
  
  // Only managers can write to properties they manage
  if (user.role === 'PROPERTY_MANAGER' && property.managerId === user.id) {
    return { allowed: true };
  }
  
  return { allowed: false, reason: 'Forbidden', status: 403 };
};
```

**Usage**:
- `GET /:id` and `GET /:id/activity` use `ensurePropertyReadAccess`
- `PATCH /:id` and `DELETE /:id` use `ensurePropertyWriteAccess`

---

## 🔧 Implementation Steps

### Step 1: Update ensurePropertyAccess Function

**File**: `backend/src/routes/properties.js` (Line 150)

```javascript
const ensurePropertyAccess = (property, user) => {
  if (!property) return { allowed: false, reason: 'Property not found', status: 404 };
  
  // Property managers who manage the property can access it
  if (user.role === 'PROPERTY_MANAGER' && property.managerId === user.id) {
    return { allowed: true };
  }
  
  // Owners who own the property can access it (read-only)
  if (user.role === 'OWNER' && property.owners?.some(o => o.ownerId === user.id)) {
    return { allowed: true };
  }
  
  return { allowed: false, reason: 'Forbidden', status: 403 };
};
```

### Step 2: Update GET /:id Route

**File**: `backend/src/routes/properties.js` (Line 270-310)

The query already includes `owners`, so no changes needed:

```javascript
const property = await prisma.property.findUnique({
  where: { id: req.params.id },
  include: {
    units: { orderBy: { unitNumber: 'asc' } },
    manager: { /* ... */ },
    owners: {  // ✅ Already included
      include: {
        owner: { /* ... */ },
      },
    },
  },
});
```

### Step 3: Update PATCH /:id Route

**File**: `backend/src/routes/properties.js` (Line 318-365)

Add `owners` to the query:

```javascript
// BEFORE
const property = await prisma.property.findUnique({ where: { id: req.params.id } });

// AFTER
const property = await prisma.property.findUnique({ 
  where: { id: req.params.id },
  include: {
    owners: { select: { ownerId: true } }
  }
});
```

**Note**: Even though owners shouldn't be able to update properties (due to `requireRole('PROPERTY_MANAGER')`), we need to include `owners` for the access check to work correctly. The middleware will still block owners from reaching this route.

### Step 4: Update DELETE /:id Route

**File**: `backend/src/routes/properties.js` (Line 367-385)

Add `owners` to the query:

```javascript
// BEFORE
const property = await prisma.property.findUnique({ where: { id: req.params.id } });

// AFTER
const property = await prisma.property.findUnique({ 
  where: { id: req.params.id },
  include: {
    owners: { select: { ownerId: true } }
  }
});
```

**Note**: Same as PATCH - owners won't reach this route due to `requireRole('PROPERTY_MANAGER')`, but we need `owners` for consistency.

### Step 5: Update GET /:id/activity Route

**File**: `backend/src/routes/properties.js` (Line 387-470)

Add `owners` to the query:

```javascript
// BEFORE
const property = await prisma.property.findUnique({ where: { id: req.params.id } });

// AFTER
const property = await prisma.property.findUnique({ 
  where: { id: req.params.id },
  include: {
    owners: { select: { ownerId: true } }
  }
});
```

---

## 🧪 Testing Plan

### Unit Tests

Create `backend/src/routes/__tests__/properties.access.test.js`:

```javascript
import { describe, it, expect } from 'vitest';

describe('ensurePropertyAccess', () => {
  it('should allow property manager to access their property', () => {
    const property = { id: 'prop1', managerId: 'user1', owners: [] };
    const user = { id: 'user1', role: 'PROPERTY_MANAGER' };
    const result = ensurePropertyAccess(property, user);
    expect(result.allowed).toBe(true);
  });

  it('should allow owner to access property they own', () => {
    const property = { 
      id: 'prop1', 
      managerId: 'manager1', 
      owners: [{ ownerId: 'owner1' }] 
    };
    const user = { id: 'owner1', role: 'OWNER' };
    const result = ensurePropertyAccess(property, user);
    expect(result.allowed).toBe(true);
  });

  it('should deny owner access to property they do not own', () => {
    const property = { 
      id: 'prop1', 
      managerId: 'manager1', 
      owners: [{ ownerId: 'owner1' }] 
    };
    const user = { id: 'owner2', role: 'OWNER' };
    const result = ensurePropertyAccess(property, user);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });

  it('should deny technician access to properties', () => {
    const property = { id: 'prop1', managerId: 'manager1', owners: [] };
    const user = { id: 'tech1', role: 'TECHNICIAN' };
    const result = ensurePropertyAccess(property, user);
    expect(result.allowed).toBe(false);
  });
});
```

### Integration Tests

Test the full flow:

```bash
# 1. Create property manager and property
POST /api/auth/register (role: PROPERTY_MANAGER)
POST /api/properties (create property)

# 2. Create owner user
POST /api/auth/register (role: OWNER)

# 3. Manually add owner to PropertyOwner table
# (In production, there would be an API endpoint for this)

# 4. Test owner can list properties
GET /api/properties (as owner)
# Expected: 200 OK with property list

# 5. Test owner can view property details
GET /api/properties/:id (as owner)
# Expected: 200 OK with property details (CURRENTLY FAILS - BUG)

# 6. Test owner can view property activity
GET /api/properties/:id/activity (as owner)
# Expected: 200 OK with activity list (CURRENTLY FAILS - BUG)

# 7. Test owner cannot update property
PATCH /api/properties/:id (as owner)
# Expected: 403 Forbidden (correct - read-only)

# 8. Test owner cannot delete property
DELETE /api/properties/:id (as owner)
# Expected: 403 Forbidden (correct - read-only)
```

---

## 📝 Additional Considerations

### 1. Read-Only vs Write Access

The current implementation uses `requireRole('PROPERTY_MANAGER')` middleware on PATCH and DELETE routes, which correctly blocks owners from modifying properties. However, the `ensurePropertyAccess` check is still called, which is redundant.

**Recommendation**: Keep the current approach for clarity and defense-in-depth:
- Middleware blocks by role (first line of defense)
- `ensurePropertyAccess` checks ownership (second line of defense)

### 2. Performance Considerations

Including `owners` in every query adds a small overhead. For the activity route, we only need `ownerId`, not the full owner details:

```javascript
include: {
  owners: { select: { ownerId: true } }  // Minimal data
}
```

### 3. Future Enhancements

Consider adding an endpoint to manage property ownership:

```javascript
// POST /api/properties/:id/owners - Add owner to property
// DELETE /api/properties/:id/owners/:ownerId - Remove owner from property
```

This would allow property managers to assign/remove owners through the API.

---

## 🎯 Conclusion

**Is this a bug?** ✅ **YES, CONFIRMED**

**Evidence**:
1. ✅ The `ensurePropertyAccess` function only checks `managerId`, not owner relationships
2. ✅ The `GET /` route correctly allows owners to list properties they own
3. ✅ Other routes (reports, jobs, inspections, units) correctly check owner relationships
4. ✅ The database schema supports property ownership through `PropertyOwner` table
5. ✅ The bug creates a broken user experience where owners can list but not view properties

**Severity**: 🔴 HIGH
- Breaks core functionality for OWNER role
- Creates inconsistent behavior across the application
- Affects multiple routes (GET /:id, GET /:id/activity)

**Recommendation**: Implement Option 1 (Fix ensurePropertyAccess) as it's the simplest solution that maintains consistency with other routes in the codebase.

---

## 📚 References

- `backend/src/routes/properties.js` - Properties routes
- `backend/src/routes/reports.js` - Example of correct owner access check
- `backend/src/routes/units.js` - Example of correct owner access check
- `backend/src/routes/inspections.js` - Example of correct owner access check
- `backend/prisma/schema.prisma` - Database schema
- `PHASE_2_COMPLETE.md` - Documentation claiming RBAC is complete
- `BUGFIX_ADMIN_ROLE.md` - Previous bug fix documentation

---

**Report Generated**: 2024  
**Status**: Ready for Review and Implementation
