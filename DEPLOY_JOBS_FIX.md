# Deploy: Fix Jobs Page 401 Error

## What This Fixes

**Problem**: Jobs page immediately logs users out with 401 error

**Symptoms**:
- Click on Jobs page
- Get 401 Unauthorized error
- Immediately logged out and redirected to signin

## The Fix

1. **Backend**: Use standard auth middleware instead of custom one
2. **Backend**: Handle users without `orgId` gracefully
3. **Frontend**: Rate-limit 401 logout (only after 3+ errors)

## Deploy Instructions

```bash
git checkout main
git merge fix/jobs-endpoint-401-error
git push origin main
```

## Verification After Deploy

1. **Login to the app**
2. **Click on Jobs page**
3. **Should see**:
   - Jobs page loads ✅
   - No 401 errors ✅
   - Not logged out ✅
   - Jobs list displays (even if empty) ✅

## What Changed

### Backend: Standard Auth

**Before**:
```javascript
// Custom auth in jobs.js
const requireAuth = async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: { org: true }  // ❌ Not all users have org
  });
};
```

**After**:
```javascript
// Use standard auth
import { requireAuth } from '../middleware/auth.js';

// Handle missing orgId
const orgId = req.user.orgId || req.user.id;
```

### Frontend: Rate-Limited Logout

**Before**:
```javascript
if (error.response?.status === 401) {
  removeAuthToken();  // ❌ Immediate logout
  window.location.href = '/signin';
}
```

**After**:
```javascript
// Only logout after 3+ 401s within 5 seconds
if (window._401ErrorCount >= 3) {
  removeAuthToken();
  window.location.href = '/signin';
}
```

## Debug Mode

In development, you'll see:

```
[API Client] Request: {
  url: "/api/jobs",
  method: "get",
  hasToken: true
}

// If 401 occurs:
[API Client] 401 Unauthorized: {
  url: "/api/jobs",
  response: { message: "..." }
}
```

## Troubleshooting

### Still Getting 401?

1. **Check backend logs**:
   ```bash
   # Look for JWT verification errors
   tail -f backend/logs/error.log
   ```

2. **Check user token**:
   ```javascript
   // In browser console
   localStorage.getItem('auth_token')
   ```

3. **Check user has valid session**:
   - Token not expired
   - User exists in database

### Jobs Not Loading?

1. **Check if jobs exist**:
   - Verify memoryStore has data
   - Check if user/org has jobs

2. **Check API response**:
   ```javascript
   // Should return array
   fetch('/api/jobs', {
     headers: { Authorization: `Bearer ${token}` }
   }).then(r => r.json()).then(console.log)
   ```

## Rollback Plan

If issues occur:

```bash
git revert 2a00b7a
git push origin main
```

## Documentation

- **[JOBS_ENDPOINT_FIX.md](JOBS_ENDPOINT_FIX.md)** - Complete technical documentation
- **[API_CLIENT_401_FIX.md](API_CLIENT_401_FIX.md)** - API client fixes

---

**Branch**: `fix/jobs-endpoint-401-error`
**Status**: ✅ Ready to deploy
**Priority**: CRITICAL (Jobs page broken)
**Tests**: ✅ Build verified
**Breaking Changes**: None
