# Design Document: Service Request Access Control

## Problem Statement

**CRITICAL SECURITY VULNERABILITY**

**Current State:**
- Service request endpoints have NO role-based access control
- GET /service-requests returns ALL requests to ANY authenticated user
- POST /service-requests allows ANY user to create requests for ANY property
- PATCH /service-requests allows ANY user to update ANY request
- No validation that user has access to property/unit

**Security Impact:**
- **Data Privacy Breach**: Users can see other users' service requests
- **Unauthorized Access**: Tenants can see requests from other properties
- **Data Manipulation**: Users can update requests they don't own
- **GDPR Violation**: Personal data exposed without authorization
- **Regulatory Risk**: Non-compliance with data protection laws

**Example Attack Scenarios:**
1. Tenant A can see all service requests from Tenant B's unit
2. User can create fake service requests for properties they don't access
3. Malicious user can update/cancel other users' requests
4. Property manager can see requests from properties they don't manage

## Proposed Solution

### Access Control Rules

#### GET /service-requests (List)
**Property Managers:**
- See requests for properties they manage
- Filter: `property.managerId === user.id`

**Owners:**
- See requests for properties they own
- Filter: `property.owners.some(o => o.ownerId === user.id)`

**Technicians:**
- See requests for properties they're assigned to work on
- Filter: Jobs assigned to them for those properties

**Tenants:**
- See only their own requests
- Filter: `requestedById === user.id`

#### POST /service-requests (Create)
**Property Managers:**
- Can create requests for properties they manage
- Validation: Verify `property.managerId === user.id`

**Tenants:**
- Can create requests for units they occupy
- Validation: Verify user has active UnitTenant record for the unit

**Owners:**
- Can create requests for properties they own
- Validation: Verify user is in property.owners

**Technicians:**
- Cannot create service requests (not their role)

#### PATCH /service-requests/:id (Update)
**Property Managers:**
- Can update requests for properties they manage
- Can change status, priority, review notes

**Tenants:**
- Can only update their own requests
- Can only update title, description (before review)
- Cannot change status or priority

**Owners:**
- Can update requests for properties they own
- Similar permissions to property managers

**Technicians:**
- Cannot update service requests directly

### API Changes

#### GET /service-requests
```javascript
// Add role-based filtering
let where = {};

if (req.user.role === 'PROPERTY_MANAGER') {
  where.property = { managerId: req.user.id };
}

if (req.user.role === 'OWNER') {
  where.property = {
    owners: {
      some: { ownerId: req.user.id }
    }
  };
}

if (req.user.role === 'TENANT') {
  where.requestedById = req.user.id;
}

if (req.user.role === 'TECHNICIAN') {
  // Technicians see requests for properties they work on
  const assignedJobs = await prisma.job.findMany({
    where: { assignedToId: req.user.id },
    select: { propertyId: true }
  });
  const propertyIds = [...new Set(assignedJobs.map(j => j.propertyId))];
  where.propertyId = { in: propertyIds };
}
```

#### POST /service-requests
```javascript
// Verify user has access to property/unit
if (req.user.role === 'TENANT') {
  // Verify tenant has active lease for the unit
  const tenantUnit = await prisma.unitTenant.findFirst({
    where: {
      unitId: unitId,
      tenantId: req.user.id,
      isActive: true
    }
  });
  
  if (!tenantUnit) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this unit'
    });
  }
}

if (req.user.role === 'PROPERTY_MANAGER') {
  // Verify manager owns the property
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      managerId: req.user.id
    }
  });
  
  if (!property) {
    return res.status(403).json({
      success: false,
      message: 'You do not manage this property'
    });
  }
}

if (req.user.role === 'OWNER') {
  // Verify owner owns the property
  const ownership = await prisma.propertyOwner.findFirst({
    where: {
      propertyId: propertyId,
      ownerId: req.user.id
    }
  });
  
  if (!ownership) {
    return res.status(403).json({
      success: false,
      message: 'You do not own this property'
    });
  }
}
```

#### PATCH /service-requests/:id
```javascript
// Verify user has access to the request
const request = await prisma.serviceRequest.findUnique({
  where: { id },
  include: {
    property: {
      include: {
        owners: true
      }
    }
  }
});

if (!request) {
  return res.status(404).json({
    success: false,
    message: 'Service request not found'
  });
}

// Check access based on role
let hasAccess = false;

if (req.user.role === 'TENANT') {
  hasAccess = request.requestedById === req.user.id;
  
  // Tenants can only update certain fields
  const allowedFields = ['title', 'description'];
  const requestedFields = Object.keys(updates);
  const unauthorizedFields = requestedFields.filter(f => !allowedFields.includes(f));
  
  if (unauthorizedFields.length > 0) {
    return res.status(403).json({
      success: false,
      message: `Tenants can only update: ${allowedFields.join(', ')}`
    });
  }
}

if (req.user.role === 'PROPERTY_MANAGER') {
  hasAccess = request.property.managerId === req.user.id;
}

if (req.user.role === 'OWNER') {
  hasAccess = request.property.owners.some(o => o.ownerId === req.user.id);
}

if (!hasAccess) {
  return res.status(403).json({
    success: false,
    message: 'Access denied'
  });
}
```

### Database Schema

No changes needed - existing schema supports all required relationships.

### Frontend Changes

**No UI changes needed** - access control is enforced on backend.

**Error Handling:**
- Show appropriate error messages for 403 Forbidden
- Redirect to dashboard if user tries to access unauthorized request
- Hide UI elements for actions user cannot perform

## Implementation Plan

### Phase 1: Backend Access Control
1. Add role-based filtering to GET /service-requests
2. Add access validation to POST /service-requests
3. Add access validation to PATCH /service-requests
4. Add helper function for access checks
5. Add comprehensive error messages

### Phase 2: Testing
1. Unit tests for each role's access
2. Integration tests for access denial
3. Security tests for unauthorized access attempts
4. Manual testing across all user roles

### Phase 3: Audit & Monitoring
1. Add logging for access denials
2. Monitor for suspicious access patterns
3. Alert on repeated access violations
4. Audit existing data for unauthorized access

## Security Considerations

**Access Control:**
- Enforce at API level (never trust frontend)
- Validate on every request
- Use database-level filtering
- Log all access denials

**Data Privacy:**
- Only return data user has access to
- Don't expose existence of unauthorized resources
- Sanitize error messages (don't leak info)
- Comply with GDPR right to access

**Audit Trail:**
- Log who accessed what and when
- Track failed access attempts
- Monitor for suspicious patterns
- Retain logs for compliance

## Performance Considerations

**Database Queries:**
- Use existing indexes (propertyId, requestedById)
- Add index on property.managerId if needed
- Optimize joins for owner checks
- Cache property ownership lookups

**API Response Time:**
- Access checks add ~10-20ms per request
- Acceptable overhead for security
- Consider caching user permissions
- Monitor query performance

## Rollout Strategy

### Phase 1: Immediate Fix (Day 1)
- Deploy access control to production ASAP
- This is a critical security fix
- No feature flag - must be enforced
- Monitor error rates

### Phase 2: Audit (Week 1)
- Review existing service requests
- Identify any unauthorized access
- Notify affected users if needed
- Document incident

### Phase 3: Monitoring (Ongoing)
- Track access denial rates
- Alert on suspicious patterns
- Regular security audits
- Update access rules as needed

## Risk Assessment

**Risk: Breaking existing functionality**
- Mitigation: Comprehensive testing
- Mitigation: Gradual rollout to staging first
- Mitigation: Monitor error rates closely

**Risk: Performance degradation**
- Mitigation: Use indexed queries
- Mitigation: Optimize access checks
- Mitigation: Monitor response times

**Risk: False positives (legitimate users denied)**
- Mitigation: Thorough testing of all roles
- Mitigation: Clear error messages
- Mitigation: Support team ready to assist

## Success Metrics

**Security:**
- Zero unauthorized access to service requests
- All access attempts properly validated
- No data privacy violations

**Performance:**
- API response time increase < 20ms
- No user-facing performance issues
- Database query performance acceptable

**User Experience:**
- Users only see their relevant requests
- Clear error messages for denied access
- No confusion about permissions

## Follow-up Work

**Short-term:**
- Add similar access control to other endpoints
- Audit all API endpoints for security
- Add rate limiting for API calls

**Medium-term:**
- Implement row-level security in database
- Add API key authentication for integrations
- Implement OAuth for third-party access

**Long-term:**
- Zero-trust security architecture
- Advanced threat detection
- Automated security testing
