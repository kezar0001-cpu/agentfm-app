# Security Fix Migration Guide

## Critical Security Vulnerability Fixed

**Issue**: All routes had insecure JWT secret fallback (`'your-secret-key'`)  
**Severity**: 🔴 CRITICAL  
**Impact**: Complete authentication bypass possible

## Changes Made

### 1. Created Secure JWT Utility (`backend/src/utils/jwt.js`)

New utility functions that:
- ✅ Require JWT_SECRET to be set (no insecure fallbacks)
- ✅ Validate secret strength (minimum 32 characters)
- ✅ Detect and reject well-known weak secrets
- ✅ Provide clear error messages

Functions:
- `getJwtSecret()` - Gets and validates JWT_SECRET
- `signToken(payload, options)` - Signs tokens securely
- `verifyToken(token, options)` - Verifies tokens securely
- `decodeToken(token)` - Decodes without verification (debugging only)

### 2. Created Shared Auth Middleware (`backend/src/middleware/auth.js`)

New middleware that:
- ✅ Uses secure JWT utility
- ✅ Provides detailed error messages
- ✅ Checks user active status
- ✅ Handles token expiration gracefully
- ✅ Includes optional auth variant

Functions:
- `requireAuth` - Requires valid authentication
- `optionalAuth` - Optional authentication

### 3. Updated Routes

**Completed**:
- ✅ `backend/src/routes/auth.js` - Uses signToken/verifyToken
- ✅ `backend/src/routes/units.js` - Uses requireAuth middleware
- ✅ `backend/src/routes/jobs.js` - Uses requireAuth middleware
- ✅ `backend/src/routes/properties.js` - Uses requireAuth middleware

**Remaining** (need manual update):
- ⏳ `backend/src/routes/billing.js`
- ⏳ `backend/src/routes/dashboard.js`
- ⏳ `backend/src/routes/inspections.js`
- ⏳ `backend/src/routes/plans.js`
- ⏳ `backend/src/routes/recommendations.js`
- ⏳ `backend/src/routes/reports.js`
- ⏳ `backend/src/routes/serviceRequests.js`
- ⏳ `backend/src/routes/subscriptions.js`
- ⏳ `backend/src/routes/tenants.js`
- ⏳ `backend/src/routes/maintenance.js`

## Migration Steps for Remaining Routes

For each route file, follow these steps:

### Step 1: Update Imports

**Before**:
```javascript
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';
```

**After**:
```javascript
import { prisma } from '../config/prismaClient.js';
import { requireAuth } from '../middleware/auth.js';
// Remove: import jwt from 'jsonwebtoken';
```

### Step 2: Remove Local Auth Middleware

**Before**:
```javascript
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { org: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

router.use(requireAuth);
```

**After**:
```javascript
router.use(requireAuth);
```

### Step 3: Replace jwt.verify Calls

**Before**:
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
```

**After**:
```javascript
import { verifyToken } from '../utils/jwt.js';
// ...
const decoded = verifyToken(token);
```

### Step 4: Replace jwt.sign Calls

**Before**:
```javascript
const token = jwt.sign(
  { id: user.id, email: user.email },
  process.env.JWT_SECRET || 'your-secret-key',
  { expiresIn: '7d' }
);
```

**After**:
```javascript
import { signToken } from '../utils/jwt.js';
// ...
const token = signToken({ id: user.id, email: user.email });
```

## Environment Variable Requirements

### CRITICAL: JWT_SECRET Must Be Set

The application will **NOT START** if `JWT_SECRET` is not set.

**Generate a secure secret**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Set in environment**:
```bash
# Development (.env file)
JWT_SECRET=your-generated-secret-here

# Production (hosting platform)
# Set JWT_SECRET in environment variables dashboard
```

### Minimum Requirements

- ✅ Must be set (no default)
- ✅ Minimum 32 characters
- ✅ Cannot be a well-known weak value
- ✅ Recommended: 64+ characters

### Weak Secrets (Will Be Rejected)

These values will cause the application to fail:
- `your-secret-key`
- `secret`
- `jwt-secret`
- `change-me`
- `replace-this`
- `test-secret`
- `12345678`
- `password`
- `admin`

## Testing

### Unit Tests

Run existing tests:
```bash
cd backend
npm test
```

### Manual Testing

1. **Test without JWT_SECRET**:
   ```bash
   unset JWT_SECRET
   npm start
   # Should fail with clear error message
   ```

2. **Test with weak secret**:
   ```bash
   export JWT_SECRET="your-secret-key"
   npm start
   # Should fail with security error
   ```

3. **Test with valid secret**:
   ```bash
   export JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
   npm start
   # Should start successfully
   ```

4. **Test authentication**:
   ```bash
   # Login
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   
   # Use token
   curl http://localhost:3000/api/properties \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

## Deployment Checklist

### Before Deployment

- [ ] Generate strong JWT_SECRET
- [ ] Set JWT_SECRET in production environment
- [ ] Update all remaining routes
- [ ] Run all tests
- [ ] Test authentication flow
- [ ] Review error handling

### During Deployment

- [ ] Deploy backend first
- [ ] Verify JWT_SECRET is set
- [ ] Monitor logs for JWT errors
- [ ] Test login immediately
- [ ] Verify existing sessions still work

### After Deployment

- [ ] Monitor authentication errors
- [ ] Check for JWT_SECRET warnings
- [ ] Verify no insecure fallbacks remain
- [ ] Update documentation
- [ ] Notify team of changes

## Rollback Plan

If issues occur:

1. **Quick Rollback**:
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Emergency Fix**:
   - Temporarily set JWT_SECRET to match old tokens
   - Deploy fix
   - Rotate secret after stabilization

3. **User Impact**:
   - Users will need to login again
   - Existing tokens will be invalidated
   - Sessions will be reset

## Security Benefits

### Before Fix
- ❌ Insecure fallback secret
- ❌ Anyone could forge tokens
- ❌ Complete authentication bypass
- ❌ No validation of secret strength
- ❌ Silent security failures

### After Fix
- ✅ No insecure fallbacks
- ✅ Strong secret required
- ✅ Weak secrets rejected
- ✅ Clear error messages
- ✅ Centralized auth logic
- ✅ Better error handling
- ✅ Audit trail

## Additional Recommendations

### 1. Rotate JWT_SECRET Regularly

```bash
# Generate new secret
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Update environment
# Deploy with new secret
# All users will need to login again
```

### 2. Add JWT_SECRET to CI/CD

```yaml
# .github/workflows/test.yml
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET_TEST }}
```

### 3. Monitor for Security Issues

```javascript
// Add monitoring
if (process.env.JWT_SECRET.length < 64) {
  console.warn('JWT_SECRET is shorter than recommended 64 characters');
}
```

### 4. Document Secret Management

- Store secrets in secure vault (AWS Secrets Manager, etc.)
- Never commit secrets to git
- Use different secrets for dev/staging/prod
- Rotate secrets quarterly

## Support

### Common Errors

**Error**: "JWT_SECRET environment variable is not set"
- **Fix**: Set JWT_SECRET in environment variables

**Error**: "JWT_SECRET is set to a well-known weak value"
- **Fix**: Generate a new strong secret

**Error**: "Token has expired"
- **Fix**: User needs to login again (expected behavior)

**Error**: "Invalid token"
- **Fix**: User needs to login again (expected behavior)

### Getting Help

1. Check this migration guide
2. Review error logs
3. Test with curl commands
4. Check environment variables
5. Contact development team

## Related Files

- `backend/src/utils/jwt.js` - JWT utility functions
- `backend/src/middleware/auth.js` - Auth middleware
- `backend/src/routes/auth.js` - Authentication routes
- `backend/.env.example` - Environment variable template
- `DEPLOYMENT.md` - Deployment guide

---

**Status**: ⏳ Partial Implementation  
**Priority**: 🔴 CRITICAL  
**Next Steps**: Update remaining routes, deploy with JWT_SECRET set
