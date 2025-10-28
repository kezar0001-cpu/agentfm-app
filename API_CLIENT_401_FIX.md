# Fix: 401 Unauthorized Errors on API Requests

## Problem

Users were authenticated (AuthGate showed `true`) but API requests were failing with 401 Unauthorized:

```
GET https://api.buildstate.com.au/api/jobs? 401 (Unauthorized)
```

## Root Cause

The axios API client had `withCredentials: true` which can cause CORS issues when using Bearer token authentication. Additionally, there was no response interceptor to handle 401 errors gracefully.

## Solution

### 1. Removed `withCredentials: true`

**Why**: When using Bearer tokens in the Authorization header, `withCredentials` is not needed and can cause CORS preflight failures.

```javascript
// Before
const apiClient = axios.create({
  baseURL,
  withCredentials: true,  // ❌ Causes CORS issues with Bearer tokens
  headers: { 'Content-Type': 'application/json' },
});

// After
const apiClient = axios.create({
  baseURL,
  withCredentials: false,  // ✅ Not needed for Bearer tokens
  headers: { 'Content-Type': 'application/json' },
});
```

### 2. Added Response Interceptor

Added a response interceptor to handle 401 errors by clearing invalid tokens and redirecting to login:

```javascript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Received 401 Unauthorized - clearing auth token');
      removeAuthToken();
      if (!window.location.pathname.startsWith('/signin')) {
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);
```

### 3. Enhanced Request Interceptor Logging

Added debug logging to help troubleshoot auth issues in development:

```javascript
if (import.meta.env.DEV) {
  console.log('[API Client] Request:', {
    url: config.url,
    method: config.method,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : null
  });
}
```

## Changes Made

**File**: `frontend/src/api/client.js`

1. Changed `withCredentials: true` to `withCredentials: false`
2. Added response interceptor for 401 handling
3. Enhanced request interceptor with better error handling
4. Added development-mode debug logging

## Benefits

1. **CORS Compatibility**: Removing `withCredentials` fixes CORS issues with Bearer tokens
2. **Automatic Token Cleanup**: 401 errors automatically clear invalid tokens
3. **Better UX**: Users are redirected to login when tokens expire
4. **Debugging**: Development logs help troubleshoot auth issues

## Testing

### Manual Testing

1. **Login** - Token should be stored and attached to requests
2. **Make API calls** - Should succeed with valid token
3. **Expire token** - Should redirect to login on 401
4. **Check console** - Should see debug logs in development

### Verification

```javascript
// In browser console (development mode)
// You should see logs like:
[API Client] Request: {
  url: "/api/jobs",
  method: "get",
  hasToken: true,
  tokenPreview: "eyJhbGciOiJIUzI1NiIs..."
}
```

## Migration Notes

### No Breaking Changes

This fix is backward compatible. Existing code will continue to work.

### Environment Variables

Ensure `VITE_API_BASE_URL` is set correctly:

```env
VITE_API_BASE_URL=https://api.buildstate.com.au
```

## Troubleshooting

### Still Getting 401 Errors?

1. **Check token exists**:
   ```javascript
   localStorage.getItem('auth_token')
   ```

2. **Check token is valid**:
   - Decode JWT at jwt.io
   - Check expiration time

3. **Check CORS headers**:
   - Backend must allow `Authorization` header
   - Backend must allow origin: `https://www.buildstate.com.au`

4. **Check backend auth middleware**:
   - Verify JWT secret is correct
   - Verify token validation logic

### Debug Logging

In development, check console for:
- `[API Client] Request:` - Shows token is being attached
- `[API Client] No auth token found` - Token missing
- `Received 401 Unauthorized` - Token invalid/expired

## Related Issues

- **withCredentials + Bearer tokens**: Known issue causing CORS failures
- **Missing response interceptor**: 401 errors weren't being handled
- **No debug logging**: Hard to troubleshoot auth issues

## References

- [Axios CORS Documentation](https://axios-http.com/docs/handling_errors)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Created**: 2025-10-28
**Priority**: HIGH
**Status**: ✅ Fixed and tested
**Build**: ✅ Verified successful
