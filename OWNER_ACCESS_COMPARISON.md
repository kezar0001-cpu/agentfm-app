# Owner Access Pattern Comparison

This document compares how different routes in the codebase handle owner access to demonstrate that the `ensurePropertyAccess` function in `properties.js` is inconsistent with the rest of the application.

---

## ✅ Correct Implementations

### 1. Reports Route (`backend/src/routes/reports.js`)

**POST /api/reports - Create Report**

```javascript
// Line 24-37
const property = await prisma.property.findUnique({
  where: { id: payload.propertyId },
  include: {
    owners: { select: { ownerId: true } },  // ✅ Includes owners
  },
});

if (!property) {
  return res.status(404).json({ success: false, message: 'Property not found' });
}

const hasAccess =
  req.user.role === 'PROPERTY_MANAGER' && property.managerId === req.user.id ||
  req.user.role === 'OWNER' && property.owners.some(o => o.ownerId === req.user.id);  // ✅ Checks owners

if (!hasAccess) {
  return res.status(403).json({ success: false, message: 'Access denied' });
}
```

**Pattern**: 
- ✅ Includes `owners` in query
- ✅ Checks both `PROPERTY_MANAGER` and `OWNER` roles
- ✅ Uses `property.owners.some(o => o.ownerId === req.user.id)` to check ownership

---

### 2. Units Route (`backend/src/routes/units.js`)

**POST /:unitId/tenants - Assign Tenant to Unit**

```javascript
// Line 421-439
const unit = await prisma.unit.findUnique({
  where: { id: unitId },
  include: {
    property: {
      include: {
        owners: {
          select: { ownerId: true }  // ✅ Includes owners
        }
      }
    }
  }
});

if (!unit) {
  return res.status(404).json({ success: false, message: 'Unit not found' });
}

// Check access
const hasAccess = req.user.role === 'PROPERTY_MANAGER' && unit.property.managerId === req.user.id ||
                  req.user.role === 'OWNER' && unit.property.owners.some(o => o.ownerId === req.user.id);  // ✅ Checks owners

if (!hasAccess) {
  return res.status(403).json({ success: false, message: 'Access denied' });
}
```

**Pattern**:
- ✅ Includes `property.owners` in nested query
- ✅ Checks both `PROPERTY_MANAGER` and `OWNER` roles
- ✅ Uses `unit.property.owners.some(o => o.ownerId === req.user.id)` to check ownership

---

### 3. Inspections Route (`backend/src/routes/inspections.js`)

**buildAccessWhere Function**

```javascript
// Line 152-180
function buildAccessWhere(user) {
  if (!user) return undefined;
  if (isAdmin(user)) return undefined;

  if (user.role === ROLE_MANAGER) {
    if (!user.managedPropertyIds.length) {
      return { propertyId: { in: ['__none__'] } };
    }
    return { propertyId: { in: user.managedPropertyIds } };
  }

  if (user.role === ROLE_OWNER) {  // ✅ Handles OWNER role
    if (!user.ownedPropertyIds.length) {
      return { propertyId: { in: ['__none__'] } };
    }
    return { propertyId: { in: user.ownedPropertyIds } };  // ✅ Filters by owned properties
  }

  // ... rest of function
}
```

**canAccessInspection Function**

```javascript
// Line 300-315
function canAccessInspection(user, inspection) {
  if (!user || !inspection) return false;
  if (isAdmin(user)) return true;

  if (user.role === ROLE_MANAGER) {
    return inspection.propertyId ? user.managedPropertyIds.includes(inspection.propertyId) : true;
  }
  if (user.role === ROLE_OWNER) {  // ✅ Handles OWNER role
    return inspection.propertyId ? user.ownedPropertyIds.includes(inspection.propertyId) : false;  // ✅ Checks ownership
  }
  // ... rest of function
}
```

**Pattern**:
- ✅ Uses augmented user object with `ownedPropertyIds` array
- ✅ Filters inspections by owned properties
- ✅ Checks ownership in access control function

---

### 4. Jobs Route (`backend/src/routes/jobs.js`)

**GET / - List Jobs**

```javascript
// Line 60-70 (approximate)
if (req.user.role === 'OWNER') {
  // Owners see jobs for properties they own
  where.property = {
    owners: {
      some: {
        ownerId: req.user.id,  // ✅ Filters by owner
      },
    },
  };
}
```

**Pattern**:
- ✅ Uses Prisma nested filter to find jobs for owned properties
- ✅ Checks `owners.some({ ownerId: req.user.id })`

---

### 5. Service Requests Route (`backend/src/routes/serviceRequests.js`)

**GET / - List Service Requests**

```javascript
// Line 40-50 (approximate)
if (req.user.role === 'OWNER') {
  where.property = {
    owners: {
      some: { ownerId: req.user.id }  // ✅ Filters by owner
    }
  };
}
```

**GET /:id - Get Service Request**

```javascript
// Line 120-130 (approximate)
const hasAccess = 
  req.user.role === 'PROPERTY_MANAGER' && request.property.managerId === req.user.id ||
  req.user.role === 'OWNER' && request.property.owners.some(o => o.ownerId === req.user.id) ||  // ✅ Checks owners
  req.user.role === 'TENANT' && request.requestedById === req.user.id;
```

**Pattern**:
- ✅ Uses nested filter for listing
- ✅ Checks `property.owners.some(o => o.ownerId === req.user.id)` for individual access

---

## ❌ Incorrect Implementation

### Properties Route (`backend/src/routes/properties.js`)

**ensurePropertyAccess Function**

```javascript
// Line 150-155
const ensurePropertyAccess = (property, user) => {
  if (!property) return { allowed: false, reason: 'Property not found', status: 404 };
  // Only property managers who own the property can access it
  if (property.managerId === user.id) return { allowed: true };  // ❌ Only checks managerId
  return { allowed: false, reason: 'Forbidden', status: 403 };
};
```

**Problems**:
- ❌ Does NOT check if user is an OWNER
- ❌ Does NOT check `property.owners` relationship
- ❌ Inconsistent with all other routes in the codebase

**Impact**:
- Owners can list properties via `GET /` (which has correct implementation)
- Owners CANNOT view property details via `GET /:id`
- Owners CANNOT view property activity via `GET /:id/activity`

---

## 📊 Pattern Summary

### Common Pattern Across Correct Implementations

All correct implementations follow this pattern:

```javascript
// 1. Include owners in query
const resource = await prisma.resource.findUnique({
  where: { id },
  include: {
    property: {
      include: {
        owners: { select: { ownerId: true } }
      }
    }
  }
});

// 2. Check access for both roles
const hasAccess = 
  req.user.role === 'PROPERTY_MANAGER' && resource.property.managerId === req.user.id ||
  req.user.role === 'OWNER' && resource.property.owners.some(o => o.ownerId === req.user.id);

// 3. Deny access if neither condition is met
if (!hasAccess) {
  return res.status(403).json({ success: false, message: 'Access denied' });
}
```

### What ensurePropertyAccess Should Look Like

```javascript
const ensurePropertyAccess = (property, user) => {
  if (!property) return { allowed: false, reason: 'Property not found', status: 404 };
  
  // Property managers who manage the property can access it
  if (user.role === 'PROPERTY_MANAGER' && property.managerId === user.id) {
    return { allowed: true };
  }
  
  // Owners who own the property can access it
  if (user.role === 'OWNER' && property.owners?.some(o => o.ownerId === user.id)) {
    return { allowed: true };
  }
  
  return { allowed: false, reason: 'Forbidden', status: 403 };
};
```

---

## 🎯 Conclusion

**Evidence of Bug**:
- ✅ 5 different routes correctly handle owner access
- ✅ All use the same pattern: check both `managerId` and `owners` relationship
- ❌ Only `properties.js` fails to check owner relationship
- ❌ This creates inconsistent behavior across the application

**Consistency Check**:

| Route | Checks managerId | Checks owners | Consistent? |
|-------|-----------------|---------------|-------------|
| Reports | ✅ Yes | ✅ Yes | ✅ Correct |
| Units | ✅ Yes | ✅ Yes | ✅ Correct |
| Inspections | ✅ Yes | ✅ Yes | ✅ Correct |
| Jobs | ✅ Yes | ✅ Yes | ✅ Correct |
| Service Requests | ✅ Yes | ✅ Yes | ✅ Correct |
| **Properties** | ✅ Yes | ❌ **NO** | ❌ **BUG** |

**Recommendation**: Update `ensurePropertyAccess` to match the pattern used by all other routes in the codebase.

---

**See Also**:
- `RESEARCH_OWNER_ACCESS_BUG.md` - Full bug analysis and testing plan
- `backend/src/routes/properties.js` - File with the bug
- `backend/src/routes/reports.js` - Example of correct implementation
- `backend/src/routes/units.js` - Example of correct implementation
- `backend/src/routes/inspections.js` - Example of correct implementation
