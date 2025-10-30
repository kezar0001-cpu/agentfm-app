# Owner Access Flow Diagram

This document visualizes the inconsistency in how owners can access properties.

---

## Current Behavior (WITH BUG)

```
┌─────────────────────────────────────────────────────────────────┐
│                    OWNER User Logs In                           │
│                    (owns Property A)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              GET /api/properties (List Properties)              │
│                                                                 │
│  Code: if (req.user.role === 'OWNER') {                        │
│          where = { owners: { some: { ownerId: req.user.id }}}  │
│        }                                                        │
│                                                                 │
│  Result: ✅ 200 OK - Returns [Property A]                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Owner sees Property A                         │
│                   Clicks to view details                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         GET /api/properties/:id (View Property Details)         │
│                                                                 │
│  Code: const access = ensurePropertyAccess(property, user);    │
│        if (property.managerId === user.id) return allowed;     │
│                                                                 │
│  Check: property.managerId === 'manager123'                    │
│         user.id === 'owner456'                                 │
│         'manager123' === 'owner456' ? NO ❌                    │
│                                                                 │
│  Result: ❌ 403 Forbidden - "Forbidden"                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    💥 ERROR DISPLAYED                           │
│                                                                 │
│  "You do not have permission to view this property"            │
│                                                                 │
│  Owner is confused: "But I just saw it in the list!"           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Expected Behavior (WITHOUT BUG)

```
┌─────────────────────────────────────────────────────────────────┐
│                    OWNER User Logs In                           │
│                    (owns Property A)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              GET /api/properties (List Properties)              │
│                                                                 │
│  Code: if (req.user.role === 'OWNER') {                        │
│          where = { owners: { some: { ownerId: req.user.id }}}  │
│        }                                                        │
│                                                                 │
│  Result: ✅ 200 OK - Returns [Property A]                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Owner sees Property A                         │
│                   Clicks to view details                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         GET /api/properties/:id (View Property Details)         │
│                                                                 │
│  Code: const access = ensurePropertyAccess(property, user);    │
│        if (property.managerId === user.id) return allowed;     │
│        if (user.role === 'OWNER' &&                            │
│            property.owners.some(o => o.ownerId === user.id))   │
│          return allowed;                                       │
│                                                                 │
│  Check 1: property.managerId === user.id ? NO                  │
│  Check 2: user.role === 'OWNER' ? YES ✅                       │
│           property.owners includes user.id ? YES ✅            │
│                                                                 │
│  Result: ✅ 200 OK - Returns Property A details                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ✅ PROPERTY DETAILS DISPLAYED                  │
│                                                                 │
│  Property Name: Property A                                     │
│  Address: 123 Main St                                          │
│  Manager: John Manager                                         │
│  Owners: Jane Owner (you), Bob Owner                           │
│  Units: 10 units                                               │
│                                                                 │
│  Owner is happy: "I can see my property details!"              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Side-by-Side Comparison

### Current (Buggy) vs Expected (Fixed)

```
┌──────────────────────────────────┬──────────────────────────────────┐
│         CURRENT (BUGGY)          │         EXPECTED (FIXED)         │
├──────────────────────────────────┼──────────────────────────────────┤
│                                  │                                  │
│  GET /api/properties             │  GET /api/properties             │
│  ✅ 200 OK                       │  ✅ 200 OK                       │
│  Returns: [Property A]           │  Returns: [Property A]           │
│                                  │                                  │
├──────────────────────────────────┼──────────────────────────────────┤
│                                  │                                  │
│  GET /api/properties/:id         │  GET /api/properties/:id         │
│  ❌ 403 Forbidden                │  ✅ 200 OK                       │
│  Error: "Forbidden"              │  Returns: Property A details     │
│                                  │                                  │
├──────────────────────────────────┼──────────────────────────────────┤
│                                  │                                  │
│  GET /api/properties/:id/activity│  GET /api/properties/:id/activity│
│  ❌ 403 Forbidden                │  ✅ 200 OK                       │
│  Error: "Forbidden"              │  Returns: Activity list          │
│                                  │                                  │
├──────────────────────────────────┼──────────────────────────────────┤
│                                  │                                  │
│  PATCH /api/properties/:id       │  PATCH /api/properties/:id       │
│  ❌ 403 Forbidden                │  ❌ 403 Forbidden                │
│  (Blocked by requireRole)        │  (Blocked by requireRole)        │
│  ✅ CORRECT - Read-only          │  ✅ CORRECT - Read-only          │
│                                  │                                  │
├──────────────────────────────────┼──────────────────────────────────┤
│                                  │                                  │
│  DELETE /api/properties/:id      │  DELETE /api/properties/:id      │
│  ❌ 403 Forbidden                │  ❌ 403 Forbidden                │
│  (Blocked by requireRole)        │  (Blocked by requireRole)        │
│  ✅ CORRECT - Read-only          │  ✅ CORRECT - Read-only          │
│                                  │                                  │
└──────────────────────────────────┴──────────────────────────────────┘
```

---

## Access Control Logic Comparison

### Current Implementation (Buggy)

```javascript
const ensurePropertyAccess = (property, user) => {
  if (!property) 
    return { allowed: false, reason: 'Property not found', status: 404 };
  
  // ❌ ONLY checks managerId
  if (property.managerId === user.id) 
    return { allowed: true };
  
  // ❌ Denies all owners, even if they own the property
  return { allowed: false, reason: 'Forbidden', status: 403 };
};
```

**Decision Tree**:
```
Is property null?
├─ YES → ❌ 404 Not Found
└─ NO → Is user.id === property.managerId?
        ├─ YES → ✅ Allow access
        └─ NO → ❌ 403 Forbidden (WRONG for owners!)
```

### Fixed Implementation

```javascript
const ensurePropertyAccess = (property, user) => {
  if (!property) 
    return { allowed: false, reason: 'Property not found', status: 404 };
  
  // ✅ Check if user is the property manager
  if (user.role === 'PROPERTY_MANAGER' && property.managerId === user.id) 
    return { allowed: true };
  
  // ✅ Check if user is an owner of the property
  if (user.role === 'OWNER' && property.owners?.some(o => o.ownerId === user.id)) 
    return { allowed: true };
  
  return { allowed: false, reason: 'Forbidden', status: 403 };
};
```

**Decision Tree**:
```
Is property null?
├─ YES → ❌ 404 Not Found
└─ NO → Is user a PROPERTY_MANAGER and manages this property?
        ├─ YES → ✅ Allow access
        └─ NO → Is user an OWNER and owns this property?
                ├─ YES → ✅ Allow access (FIXED!)
                └─ NO → ❌ 403 Forbidden
```

---

## Database Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Table                              │
├─────────────────────────────────────────────────────────────────┤
│ id: 'manager123'                                                │
│ role: 'PROPERTY_MANAGER'                                        │
│ name: 'John Manager'                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ managerId (1:many)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Property Table                            │
├─────────────────────────────────────────────────────────────────┤
│ id: 'prop1'                                                     │
│ name: 'Property A'                                              │
│ managerId: 'manager123' ◄─── Managed by John Manager           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ propertyId (many:many via join)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PropertyOwner Table (Join)                    │
├─────────────────────────────────────────────────────────────────┤
│ id: 'po1'                                                       │
│ propertyId: 'prop1'                                             │
│ ownerId: 'owner456' ◄─── Jane Owner owns this property         │
│ ownershipPercentage: 60.0                                       │
├─────────────────────────────────────────────────────────────────┤
│ id: 'po2'                                                       │
│ propertyId: 'prop1'                                             │
│ ownerId: 'owner789' ◄─── Bob Owner owns this property          │
│ ownershipPercentage: 40.0                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ ownerId (many:1)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         User Table                              │
├─────────────────────────────────────────────────────────────────┤
│ id: 'owner456'                                                  │
│ role: 'OWNER'                                                   │
│ name: 'Jane Owner'                                              │
├─────────────────────────────────────────────────────────────────┤
│ id: 'owner789'                                                  │
│ role: 'OWNER'                                                   │
│ name: 'Bob Owner'                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points**:
- A property has ONE manager (direct foreign key)
- A property can have MULTIPLE owners (many-to-many via PropertyOwner)
- Manager and owners are DIFFERENT relationships
- The bug: `ensurePropertyAccess` only checks manager, ignores owners

---

## Impact on User Experience

### Scenario: Jane Owner's Journey

```
Step 1: Login
┌────────────────────────────────┐
│ Jane logs in as OWNER          │
│ Navigates to Properties page   │
└────────────────────────────────┘
         │
         ▼
Step 2: List Properties ✅
┌────────────────────────────────┐
│ GET /api/properties            │
│ Response: [Property A]         │
│                                │
│ UI shows:                      │
│ ┌──────────────────────────┐  │
│ │ Property A               │  │
│ │ 123 Main St              │  │
│ │ [View Details] button    │  │
│ └──────────────────────────┘  │
└────────────────────────────────┘
         │
         ▼
Step 3: Click "View Details" ❌
┌────────────────────────────────┐
│ GET /api/properties/prop1      │
│ Response: 403 Forbidden        │
│                                │
│ UI shows:                      │
│ ┌──────────────────────────┐  │
│ │ ⚠️ Error                 │  │
│ │ You do not have          │  │
│ │ permission to view       │  │
│ │ this property            │  │
│ └──────────────────────────┘  │
│                                │
│ Jane is confused:              │
│ "But I just saw it in the      │
│  list! Why can't I view it?"   │
└────────────────────────────────┘
```

**User Impact**:
- 😕 Confusing experience
- 🐛 Appears to be a broken application
- 📉 Reduces trust in the platform
- ❌ Blocks legitimate use case

---

## Consistency Across Routes

### How Other Routes Handle Owner Access

```
┌─────────────────────────────────────────────────────────────────┐
│                    Reports Route ✅                             │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/reports                                               │
│                                                                 │
│ hasAccess = (role === 'PROPERTY_MANAGER' && managerId) ||      │
│             (role === 'OWNER' && owners.includes(userId))       │
│                                                                 │
│ Result: ✅ Owners can create reports for their properties      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Units Route ✅                               │
├─────────────────────────────────────────────────────────────────┤
│ POST /:unitId/tenants                                           │
│                                                                 │
│ hasAccess = (role === 'PROPERTY_MANAGER' && managerId) ||      │
│             (role === 'OWNER' && owners.includes(userId))       │
│                                                                 │
│ Result: ✅ Owners can assign tenants to units                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Inspections Route ✅                           │
├─────────────────────────────────────────────────────────────────┤
│ GET /api/inspections                                            │
│                                                                 │
│ where = { propertyId: { in: user.ownedPropertyIds }}           │
│                                                                 │
│ Result: ✅ Owners can view inspections for their properties    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Jobs Route ✅                                │
├─────────────────────────────────────────────────────────────────┤
│ GET /api/jobs                                                   │
│                                                                 │
│ where.property = { owners: { some: { ownerId: userId }}}       │
│                                                                 │
│ Result: ✅ Owners can view jobs for their properties           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Properties Route ❌                            │
├─────────────────────────────────────────────────────────────────┤
│ GET /api/properties/:id                                         │
│                                                                 │
│ access = (managerId === userId) ? allow : deny                 │
│                                                                 │
│ Result: ❌ Owners CANNOT view their property details           │
│         ❌ INCONSISTENT with all other routes                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

**The Bug**:
- `ensurePropertyAccess` only checks `managerId`, not owner relationships
- Creates inconsistency: owners can list but not view properties
- Breaks user experience with confusing 403 errors

**The Evidence**:
- ✅ GET / route correctly handles owners
- ✅ All other routes (reports, units, inspections, jobs) correctly handle owners
- ❌ Only GET /:id and GET /:id/activity fail for owners

**The Fix**:
- Add owner check to `ensurePropertyAccess`
- Include `owners` in property queries
- Match the pattern used by all other routes

**See Also**:
- `RESEARCH_OWNER_ACCESS_BUG.md` - Detailed analysis
- `OWNER_ACCESS_COMPARISON.md` - Code comparisons
