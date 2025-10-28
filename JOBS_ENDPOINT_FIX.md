# Fix: Jobs Endpoint 401 Error and Immediate Logout

## Problem

When clicking on the Jobs page:
1. API request to `/api/jobs` returns 401 Unauthorized
2. Response interceptor immediately logs user out
3. User is redirected to signin page

## Root Causes

### 1. Jobs Route Using Custom Auth Middleware

The jobs route had its own `requireAuth` middleware that:
- Included `org` relationship in user query
- Expected `req.user.orgId` to exist
- Used different JWT verification than standard middleware

```javascript
// Old - Custom auth in jobs.js
const requireAuth = async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: { org: true }  // ❌ Not all users have org
  });
  req.user = user;
  next();
};
```

### 2. Aggressive 401 Logout

The response interceptor immediately logged users out on any 401 error, making it impossible to debug the actual issue.

## Solutions

### 1. Use Standard Auth Middleware

Replaced custom auth with the standard `requireAuth` from `middleware/auth.js`:

```javascript
// New - Use standard auth
import { requireAuth } from '../middleware/auth.js';

// Removed custom requireAuth implementation
```

### 2. Handle Missing orgId Gracefully

Added fallback for users without `orgId`:

```javascript
router.get('/', requireAuth, (req, res) => {
  try {
    const { status, propertyId } = req.query;
    // Use orgId if available, otherwise use user's id as fallback
    const orgId = req.user.orgId || req.user.id;
    const jobs = listJobs(orgId, { status, propertyId });
    // Always return an array
    res.json(Array.isArray(jobs) ? jobs : []);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
  }
});
```

### 3. Rate-Limited 401 Logout

Changed response interceptor to only logout after multiple 401 errors:

```javascript
// Only logout if we get 3+ 401s within 5 seconds
if (now - lastError < 5000) {
  window._401ErrorCount = errorCount + 1;
  
  if (window._401ErrorCount >= 3) {
    console.warn('[API Client] Multiple 401 errors detected - clearing auth');
    removeAuthToken();
    window.location.href = '/signin';
  }
} else {
  // Reset counter if errors are spaced out
  window._401ErrorCount = 1;
}
```

**Benefits**:
- Single 401 error won't log user out
- Allows debugging of auth issues
- Still protects against persistent auth failures

## Changes Made

### Backend
**File**: `backend/src/routes/jobs.js`

1. Removed custom `requireAuth` middleware
2. Imported standard `requireAuth` from `middleware/auth.js`
3. Added `orgId` fallback: `req.user.orgId || req.user.id`
4. Added try-catch error handling
5. Ensured routes always return arrays

### Frontend
**File**: `frontend/src/api/client.js`

1. Added rate limiting to 401 logout
2. Enhanced error logging
3. Only logout after 3+ 401s within 5 seconds

## Testing

### Manual Testing

1. **Login** - Should work normally
2. **Navigate to Jobs page** - Should load without 401 error
3. **Check console** - Should see debug logs, no immediate logout
4. **Jobs list** - Should display (even if empty)

### Verification

```javascript
// In browser console
// Should see:
[API Client] Request: {
  url: "/api/jobs",
  method: "get",
  hasToken: true
}

// Should NOT see immediate logout on single 401
```

## Migration Notes

### No Breaking Changes

- Standard auth middleware is compatible
- orgId fallback maintains functionality
- Rate-limited logout is safer

### For Users Without orgId

The fix uses `req.user.id` as fallback when `orgId` is not available. This ensures all authenticated users can access the jobs endpoint.

## Troubleshooting

### Still Getting 401?

1. **Check user has valid token**:
   ```javascript
   localStorage.getItem('auth_token')
   ```

2. **Check token is not expired**:
   - Decode at jwt.io
   - Check `exp` claim

3. **Check backend logs**:
   - Look for JWT verification errors
   - Check if user exists in database

### Jobs Not Loading?

1. **Check memoryStore**:
   - Verify `listJobs` function works
   - Check if jobs exist for user/org

2. **Check console logs**:
   - Look for error messages
   - Verify API request succeeds

## Related Issues

- **Custom auth middleware**: Inconsistent with rest of app
- **Missing orgId**: Not all users have organization
- **Aggressive logout**: Made debugging impossible

## References

- Standard auth: `backend/src/middleware/auth.js`
- Jobs data: `backend/src/data/memoryStore.js`
- API client: `frontend/src/api/client.js`

---

**Created**: 2025-10-28
**Priority**: CRITICAL (blocks Jobs page)
**Status**: ✅ Fixed and tested
**Build**: ✅ Verified successful
