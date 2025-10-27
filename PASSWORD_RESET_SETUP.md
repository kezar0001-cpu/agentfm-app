# Password Reset Feature - Setup & Deployment Guide

## Overview

This document describes the complete Forgot Password / Password Reset feature implementation for the Buildstate application. The feature allows users to securely reset their passwords using single-use, time-limited tokens sent via email.

## Architecture

### Frontend
- **Location**: `frontend/src/pages/`
- **Deployed on**: Vercel at https://buildtstate.com.au
- **Pages**:
  - `ForgotPassword.tsx` - Request password reset page
  - `ResetPassword.tsx` - Reset password with token page

### Backend
- **Location**: `backend/src/routes/auth.js`
- **Deployed on**: Render at https://api.buildstate.com.au
- **Endpoints**:
  - `POST /auth/forgot-password` - Request password reset
  - `GET /auth/reset-password/validate` - Validate reset token (optional)
  - `POST /auth/reset-password` - Complete password reset

### Database
- **Provider**: Neon PostgreSQL
- **New Table**: `PasswordReset` (via Prisma schema)
- **Connection**: Uses both pooled (`DATABASE_URL`) and direct (`DIRECT_URL`) connections

### Email Service
- **Provider**: Resend
- **SDK**: `resend` npm package
- **Template**: HTML email with branded styling

---

## Security Features

### Token Management
1. **Selector/Verifier Pattern**: Uses a two-token approach for enhanced security
   - **Selector**: Public identifier (64 hex characters, stored unhashed)
   - **Verifier**: Secret token (64 hex characters, hashed with bcrypt before storage)

2. **Token Expiration**: 20 minutes from creation

3. **Single-Use Tokens**: Tokens are marked as used after successful password reset

4. **Token Invalidation**: All existing tokens are deleted when:
   - New reset request is made
   - Password is successfully reset

5. **Email Enumeration Prevention**: Generic responses regardless of account existence

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Additional Security
- Bcrypt password hashing (10 rounds)
- HTTPS-only reset links in production
- CORS configured for frontend domain
- Transaction-based updates for atomicity

---

## Environment Variables

### Backend (`backend/.env`)

Required new environment variables:

```bash
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="Buildstate <no-reply@buildtstate.com.au>"

# Application URLs (for generating reset links)
APP_URL=https://buildtstate.com.au
API_URL=https://api.buildstate.com.au
```

Existing environment variables (ensure they're set):

```bash
# Database
DATABASE_URL=postgresql://user:password@host/database?pgbouncer=true
DIRECT_URL=postgresql://user:password@host/database

# Server
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-secret-key-here
SESSION_SECRET=your-session-secret-here

# Frontend URL (for CORS)
FRONTEND_URL=https://buildtstate.com.au

# CORS Origins (comma-separated)
CORS_ORIGINS=https://buildtstate.com.au,https://www.buildstate.com.au
```

### Frontend (`frontend/.env`)

Existing environment variables (no changes needed):

```bash
VITE_API_BASE_URL=https://api.buildstate.com.au
```

---

## Database Schema Changes

### New Prisma Model: `PasswordReset`

Location: `backend/prisma/schema.prisma`

```prisma
model PasswordReset {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Selector and verifier pattern for secure token validation
  selector    String   @unique     // Public identifier (unhashed)
  verifier    String                // Hashed token (using bcrypt)

  expiresAt   DateTime              // 20 minutes from creation
  usedAt      DateTime?             // Timestamp when token was used

  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([selector])
  @@index([expiresAt])
}
```

### User Model Update

Added relation to `PasswordReset` model:

```prisma
model User {
  // ... existing fields ...

  // Security
  passwordResets    PasswordReset[]

  // ... rest of model ...
}
```

---

## Deployment Instructions

### 1. Backend Deployment (Render)

#### Step 1: Set Environment Variables

In Render dashboard (https://api.buildstate.com.au):
1. Go to your backend service settings
2. Navigate to "Environment" section
3. Add the following new environment variables:

```bash
RESEND_API_KEY=<your_resend_api_key>
EMAIL_FROM=Buildstate <no-reply@buildtstate.com.au>
APP_URL=https://buildtstate.com.au
API_URL=https://api.buildstate.com.au
```

#### Step 2: Install Dependencies

The `resend` package has already been added to `package.json`. On deployment, Render will automatically run:

```bash
npm install
```

#### Step 3: Run Database Migration

Run the Prisma migration to create the `PasswordReset` table:

```bash
npx prisma migrate deploy
```

This command will:
- Create the `PasswordReset` table
- Add the `passwordResets` relation to the `User` table
- Create necessary indexes

#### Step 4: Deploy

Push your changes to the branch connected to Render. Render will automatically:
1. Install dependencies
2. Run migrations (if configured in build command)
3. Start the server

**Recommended Build Command**:
```bash
npm install && npx prisma generate && npx prisma migrate deploy
```

### 2. Frontend Deployment (Vercel)

#### Step 1: Verify Environment Variables

In Vercel dashboard (https://buildtstate.com.au):
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Ensure `VITE_API_BASE_URL` is set to: `https://api.buildstate.com.au`

#### Step 2: Deploy

Push your changes to the branch connected to Vercel. Vercel will automatically:
1. Build the frontend
2. Deploy to production

No additional configuration needed for frontend.

### 3. Email Service Setup (Resend)

#### Step 1: Create Resend Account
1. Sign up at https://resend.com
2. Verify your account

#### Step 2: Verify Domain
1. Go to "Domains" in Resend dashboard
2. Add domain: `buildtstate.com.au`
3. Add the provided DNS records to your domain provider:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)
4. Wait for verification (usually takes a few minutes to hours)

#### Step 3: Get API Key
1. Go to "API Keys" in Resend dashboard
2. Create a new API key with "Send emails" permission
3. Copy the API key (starts with `re_`)
4. Add to Render environment variables as `RESEND_API_KEY`

#### Step 4: Configure Sender Email
The sender email is configured as:
```
Buildstate <no-reply@buildtstate.com.au>
```

Ensure `no-reply@buildtstate.com.au` is either:
- Using your verified domain, OR
- Use the default Resend sandbox email for testing: `onboarding@resend.dev`

---

## Testing the Feature

### Local Testing

#### Backend Setup:
```bash
cd backend

# Install dependencies
npm install

# Set up environment variables in .env file
RESEND_API_KEY=re_your_test_key
EMAIL_FROM="Buildstate <no-reply@buildtstate.com.au>"
APP_URL=http://localhost:5173
API_URL=http://localhost:3000

# Run migrations
npx prisma migrate dev

# Start server
npm run dev
```

#### Frontend Setup:
```bash
cd frontend

# Set up environment variables in .env file
VITE_API_BASE_URL=http://localhost:3000

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
```

### Test Flow

1. **Request Password Reset**:
   - Navigate to http://localhost:5173/forgot-password
   - Enter a valid email address
   - Submit the form
   - Check the email inbox for reset link

2. **Validate Token** (optional):
   - Copy the reset link from email
   - The link format: `http://localhost:5173/reset-password?selector=...&token=...`
   - Backend will validate token automatically when page loads

3. **Reset Password**:
   - Click the reset link or navigate to reset password page
   - Enter new password (meeting requirements)
   - Confirm password
   - Submit form
   - Should see success message and redirect to sign-in

4. **Login with New Password**:
   - Go to sign-in page
   - Enter email and new password
   - Verify successful login

### Production Testing

1. Navigate to https://buildtstate.com.au/forgot-password
2. Follow the same test flow as local testing
3. Verify emails are delivered to actual email addresses

---

## API Endpoints Documentation

### 1. POST /auth/forgot-password

**Purpose**: Initiate password reset process

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response** (always returns success to prevent email enumeration):
```json
{
  "success": true,
  "message": "If an account exists with this email, you will receive password reset instructions."
}
```

**Behavior**:
- If user exists: Generates token, saves to database, sends email
- If user doesn't exist: Returns generic success message, no email sent
- Invalidates any existing password reset tokens for the user

**Error Responses**:
- 400: Validation error (invalid email format)
- 500: Server error

---

### 2. GET /auth/reset-password/validate

**Purpose**: Validate a password reset token (optional endpoint for UI feedback)

**Request**:
```
GET /auth/reset-password/validate?selector=abc123...&token=xyz789...
```

**Success Response**:
```json
{
  "success": true,
  "message": "Token is valid",
  "email": "user@example.com"
}
```

**Error Responses**:
```json
{
  "success": false,
  "message": "Invalid or expired reset link"
}
```

```json
{
  "success": false,
  "message": "This reset link has already been used"
}
```

```json
{
  "success": false,
  "message": "This reset link has expired"
}
```

---

### 3. POST /auth/reset-password

**Purpose**: Complete the password reset with valid token

**Request**:
```json
{
  "selector": "abc123...",
  "token": "xyz789...",
  "password": "NewSecurePassword123"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

**Error Responses**:
- 400: Invalid/expired/used token, validation errors
- 500: Server error

---

## Email Template

The password reset email includes:
- Buildstate branding
- Clear call-to-action button
- Plain text link (for email clients that don't support HTML)
- Security warnings (20-minute expiration, single-use)
- Support contact information

**Preview**: The email template is defined in `backend/src/utils/email.js`

---

## Files Modified/Created

### Backend Files

**Created**:
- `backend/src/utils/email.js` - Email sending utility with Resend
- `backend/prisma/migrations/XXXXXX_add_password_reset_table/` - Migration files

**Modified**:
- `backend/src/routes/auth.js` - Added 3 password reset endpoints
- `backend/prisma/schema.prisma` - Added `PasswordReset` model and relation
- `backend/package.json` - Added `resend` dependency

### Frontend Files

**Created**:
- `frontend/src/pages/ForgotPassword.tsx` - Forgot password page
- `frontend/src/pages/ResetPassword.tsx` - Reset password page

**Modified**:
- `frontend/src/App.jsx` - Added routes for password reset pages

---

## Troubleshooting

### Common Issues

#### 1. Emails Not Sending

**Check**:
- `RESEND_API_KEY` is correctly set in backend environment
- Domain is verified in Resend dashboard
- `EMAIL_FROM` address uses verified domain
- Check backend logs for email sending errors

**Solution**:
- For testing, use Resend sandbox: `onboarding@resend.dev`
- Verify domain DNS records are correctly configured
- Check Resend dashboard for delivery status

#### 2. Reset Link Invalid

**Check**:
- Token hasn't expired (20 minutes)
- Token hasn't been used already
- URL parameters (`selector` and `token`) are complete
- Backend database connection is working

**Solution**:
- Request a new password reset link
- Check backend logs for validation errors
- Verify `PasswordReset` table exists in database

#### 3. CORS Errors

**Check**:
- Frontend URL is included in backend CORS configuration
- `CORS_ORIGINS` environment variable includes frontend domain

**Solution**:
- Add `https://buildtstate.com.au` to `CORS_ORIGINS`
- Restart backend server after changing environment variables

#### 4. Database Migration Fails

**Check**:
- `DIRECT_URL` is correctly set (not pooled connection)
- Database user has permission to create tables
- No conflicting migrations

**Solution**:
```bash
# Reset migrations (careful in production!)
npx prisma migrate reset

# Or manually run migration
npx prisma migrate deploy
```

#### 5. Token Generation Errors

**Check**:
- `crypto` module is available (Node.js built-in)
- `bcrypt` is properly installed
- Database can store the selector and verifier

**Solution**:
```bash
# Reinstall bcrypt
npm uninstall bcrypt
npm install bcrypt
```

---

## Security Considerations

### Best Practices Implemented

1. **Token Security**:
   - Uses cryptographically secure random bytes
   - Tokens are hashed before storage
   - Separate selector/verifier pattern prevents timing attacks

2. **Email Enumeration Prevention**:
   - Always returns success response
   - Same response time regardless of account existence

3. **Rate Limiting** (Recommended):
   - Consider adding rate limiting middleware to prevent abuse
   - Suggested: 3 requests per 15 minutes per IP

4. **Token Cleanup**:
   - Expired tokens remain in database for audit purposes
   - Consider adding a cron job to delete old tokens:
     ```sql
     DELETE FROM "PasswordReset" WHERE "expiresAt" < NOW() - INTERVAL '24 hours';
     ```

5. **HTTPS Only**:
   - All production URLs use HTTPS
   - Secure cookies enabled in production

6. **Password Validation**:
   - Strong password requirements enforced
   - Client-side and server-side validation

---

## Maintenance

### Regular Tasks

1. **Monitor Email Delivery**:
   - Check Resend dashboard for delivery rates
   - Monitor for bounce/spam complaints

2. **Review Security Logs**:
   - Check for suspicious password reset patterns
   - Monitor failed reset attempts

3. **Database Cleanup**:
   - Periodically clean up old password reset records
   - Suggested SQL:
     ```sql
     DELETE FROM "PasswordReset"
     WHERE "createdAt" < NOW() - INTERVAL '30 days';
     ```

4. **Test Functionality**:
   - Quarterly test of complete reset flow
   - Verify email delivery
   - Check link expiration

---

## Support & Contacts

### Technical Support
- **Email**: support@buildtstate.com.au
- **Documentation**: This file and inline code comments

### Service Providers
- **Frontend Hosting**: Vercel (https://vercel.com)
- **Backend Hosting**: Render (https://render.com)
- **Database**: Neon (https://neon.tech)
- **Email Service**: Resend (https://resend.com)

---

## Changelog

### Version 1.0.0 (Initial Implementation)
- ✅ Forgot password functionality
- ✅ Reset password functionality
- ✅ Email sending with Resend
- ✅ Secure token management
- ✅ Frontend pages with validation
- ✅ Comprehensive error handling
- ✅ Email enumeration prevention
- ✅ Token expiration (20 minutes)
- ✅ Single-use tokens
- ✅ Mobile-responsive UI

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Resend Documentation](https://resend.com/docs)
- [React Router Documentation](https://reactrouter.com)
- [Material-UI Documentation](https://mui.com)
- [OWASP Password Reset Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

---

**Last Updated**: 2025-10-27
**Maintained By**: Development Team
