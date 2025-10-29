# CORS Configuration Fix

## Problem

Production frontend at `https://www.buildstate.com.au` cannot communicate with API at `https://api.buildstate.com.au` due to CORS errors:

```
Access to fetch at 'https://api.buildstate.com.au/api/auth/me' from origin 'https://www.buildstate.com.au' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause

The CORS configuration had the correct origins in the allowlist, but was missing critical options for handling preflight (OPTIONS) requests properly:

1. **No explicit preflight handling** - Missing `preflightContinue` and `optionsSuccessStatus` options
2. **No preflight caching** - Missing `maxAge` option causing excessive preflight requests
3. **No debugging** - No logging of blocked origins for troubleshooting

## Solution Applied

Updated `backend/server.js` CORS configuration with:

```javascript
const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowlist
    if (allowlist.has(origin)) return callback(null, true);
    
    // Check if origin matches dynamic patterns
    if (dynamicOriginMatchers.some((regex) => regex.test(origin))) {
      return callback(null, true);
    }
    
    // Log blocked origins for debugging
    console.warn(`CORS blocked for origin: ${origin}`);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie'],
  // Explicitly enable preflight caching
  maxAge: 86400, // 24 hours
  // Ensure preflight requests succeed
  preflightContinue: false,
  optionsSuccessStatus: 204
};
```

### Key Changes

1. **`maxAge: 86400`** - Cache preflight responses for 24 hours to reduce OPTIONS requests
2. **`preflightContinue: false`** - Let CORS middleware handle OPTIONS requests completely
3. **`optionsSuccessStatus: 204`** - Return 204 No Content for successful OPTIONS requests (standard)
4. **Added logging** - Log blocked origins to help debug CORS issues
5. **Added comments** - Clarify what each part of the configuration does

## Allowed Origins

The following origins are allowed:

### Static Origins (Hardcoded)
- `https://www.buildstate.com.au` ✅
- `https://buildstate.com.au`
- `https://api.buildstate.com.au`
- `https://agentfm.vercel.app`
- `http://localhost:5173` (development)
- `http://localhost:3000` (development)

### Dynamic Origins (Pattern Matching)
- `https://*.vercel.app` (all Vercel preview deployments)

### Environment Variable Origins
- Any origins specified in `CORS_ORIGINS` environment variable (comma-separated)
- Any origin specified in `FRONTEND_URL` environment variable

## Deployment Requirements

### Environment Variables

Ensure these environment variables are set in production:

```bash
# Required
FRONTEND_URL=https://www.buildstate.com.au

# Optional (for additional origins)
CORS_ORIGINS=https://buildstate.com.au,https://admin.buildstate.com.au
```

### Verification Steps

After deployment, verify CORS is working:

1. **Check preflight request**:
   ```bash
   curl -X OPTIONS https://api.buildstate.com.au/api/auth/me \
     -H "Origin: https://www.buildstate.com.au" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization" \
     -v
   ```

   Expected response headers:
   ```
   HTTP/1.1 204 No Content
   Access-Control-Allow-Origin: https://www.buildstate.com.au
   Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
   Access-Control-Allow-Headers: Content-Type,Authorization,X-Requested-With
   Access-Control-Allow-Credentials: true
   Access-Control-Max-Age: 86400
   ```

2. **Check actual request**:
   ```bash
   curl https://api.buildstate.com.au/api/health \
     -H "Origin: https://www.buildstate.com.au" \
     -v
   ```

   Expected response headers:
   ```
   HTTP/1.1 200 OK
   Access-Control-Allow-Origin: https://www.buildstate.com.au
   Access-Control-Allow-Credentials: true
   ```

3. **Test in browser**:
   - Open https://www.buildstate.com.au
   - Open browser DevTools Console
   - Should see no CORS errors
   - API calls should succeed

## Troubleshooting

### Still seeing CORS errors after deployment?

1. **Check server logs** for "CORS blocked for origin" warnings
2. **Verify environment variables** are set correctly in production
3. **Check reverse proxy/CDN** - Some proxies strip CORS headers
4. **Verify API URL** - Ensure frontend is calling the correct API domain
5. **Clear browser cache** - Old preflight responses might be cached

### Common Issues

**Issue**: CORS works locally but not in production
- **Cause**: Environment variables not set in production
- **Fix**: Set `FRONTEND_URL` in production environment

**Issue**: Some requests work, others don't
- **Cause**: Missing headers in `allowedHeaders`
- **Fix**: Add required headers to `allowedHeaders` array

**Issue**: Credentials not being sent
- **Cause**: Frontend not configured to send credentials
- **Fix**: Ensure frontend API client has `credentials: 'include'`

## Testing

Run the test suite to ensure no regressions:

```bash
cd backend
npm test
```

All tests should pass (150/150).

## Related Files

- `backend/server.js` - CORS configuration
- `frontend/src/lib/apiClient.js` - Frontend API client (should have `credentials: 'include'`)

## References

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS middleware](https://expressjs.com/en/resources/middleware/cors.html)
- [CORS npm package](https://www.npmjs.com/package/cors)
