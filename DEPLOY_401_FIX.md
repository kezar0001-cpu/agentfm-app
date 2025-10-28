# Deploy: Fix 401 Unauthorized Errors

## What This Fixes

**Problem**: Authenticated users getting 401 Unauthorized on API requests

**Symptoms**:
- AuthGate shows user is authenticated
- API requests fail with 401
- Console shows: `GET https://api.buildstate.com.au/api/jobs? 401 (Unauthorized)`

## The Fix

Removed `withCredentials: true` from axios client (causes CORS issues with Bearer tokens) and added proper 401 error handling.

## Deploy Instructions

```bash
git checkout main
git merge fix/api-client-401-unauthorized
git push origin main
```

## Verification After Deploy

1. **Login to the app**
2. **Navigate to any page** (Jobs, Inspections, etc.)
3. **Check browser console**:
   - Should see: `[API Client] Request: { hasToken: true }`
   - Should NOT see: 401 errors
4. **API calls should succeed**

## What Changed

### Before
```javascript
const apiClient = axios.create({
  withCredentials: true,  // ❌ Causes CORS issues
});
```

### After
```javascript
const apiClient = axios.create({
  withCredentials: false,  // ✅ Fixed
});

// Added response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeAuthToken();
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);
```

## Debug Mode

In development, you'll see logs like:

```
[API Client] Request: {
  url: "/api/jobs",
  method: "get",
  hasToken: true,
  tokenPreview: "eyJhbGciOiJIUzI1NiIs..."
}
```

## Troubleshooting

### Still Getting 401?

1. **Clear browser storage**:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Login again** - Get a fresh token

3. **Check backend CORS**:
   - Must allow `Authorization` header
   - Must allow origin: `https://www.buildstate.com.au`

4. **Check JWT secret** - Backend must use correct secret

### Token Expired?

The fix automatically:
- Clears expired tokens
- Redirects to login
- Shows clear error message

## Rollback Plan

If issues occur:

```bash
git revert d28a9fc
git push origin main
```

## Documentation

- **[API_CLIENT_401_FIX.md](API_CLIENT_401_FIX.md)** - Complete technical documentation

---

**Branch**: `fix/api-client-401-unauthorized`
**Status**: ✅ Ready to deploy
**Priority**: HIGH (blocks authenticated users)
**Tests**: ✅ Build verified
**Breaking Changes**: None
