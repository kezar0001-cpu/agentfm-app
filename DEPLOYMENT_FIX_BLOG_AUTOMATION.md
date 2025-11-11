# Fix: Blog Automation 404 Error

## Problem

The blog automation tab in your frontend is showing a 404 error because the **backend API endpoints** haven't been deployed to production yet.

### What Happened

1. ✅ **Frontend deployed**: The admin UI with BlogAutomationTab is live at buildstate.com.au
2. ❌ **Backend NOT deployed**: The automation API endpoints don't exist on api.buildstate.com.au

### The Error

```
GET https://api.buildstate.com.au/api/blog/admin/automation/status
404 Not Found
```

This endpoint exists in the code but hasn't been deployed to your Render backend.

## Solution: Deploy Backend to Render

You need to deploy the backend code from the `claude/daily-blog-post-bot-011CV1QuMvtHMMvGWURoNXFs` branch to your Render service.

### Option 1: Deploy via Render Dashboard (Recommended)

1. **Go to Render Dashboard**
   - Navigate to https://dashboard.render.com
   - Select your backend service (agentfm-backend or similar)

2. **Trigger Manual Deploy**
   - Click on "Manual Deploy" dropdown
   - Select branch: `claude/daily-blog-post-bot-011CV1QuMvtHMMvGWURoNXFs`
   - Click "Deploy"

3. **Wait for Deployment**
   - Monitor the deploy logs
   - Should complete in 2-5 minutes
   - Look for "Build successful" and "Deploy live"

4. **Verify Environment Variables**
   Make sure these are set in Render:
   ```
   BLOG_AUTOMATION_ENABLED=true
   ANTHROPIC_API_KEY=your-key-here
   UNSPLASH_ACCESS_KEY=your-key-here
   ```

### Option 2: Merge to Production Branch (If You Have One)

If you have a production/main branch that auto-deploys to Render:

```bash
# Switch to your production branch
git checkout production  # or main, or master

# Merge the blog automation backend
git merge claude/daily-blog-post-bot-011CV1QuMvtHMMvGWURoNXFs

# Push to trigger auto-deploy
git push origin production
```

### Option 3: Configure Auto-Deploy for the Branch

In Render Dashboard:
1. Go to your backend service settings
2. Under "Branch", change from `main` to `claude/daily-blog-post-bot-011CV1QuMvtHMMvGWURoNXFs`
3. Save changes
4. Render will automatically deploy

## What Gets Deployed

When you deploy the backend, these new endpoints will become available:

```
GET  /api/blog/admin/automation/status     - Get automation stats
POST /api/blog/admin/automation/generate   - Trigger manual generation
PUT  /api/blog/admin/automation/settings   - Enable/disable automation
```

Plus these backend services:
- Blog AI Service (Claude integration)
- Blog Image Service (Unsplash integration)
- Blog Automation Service (orchestration)
- Blog Automation Cron Job (daily scheduling)

## Verify the Fix

After deployment:

1. **Check Render Logs**
   Look for these messages:
   ```
   Blog automation service initialized
   Scheduling blog automation cron job with expression "0 9 * * *"
   ```

2. **Test the Endpoint**
   ```bash
   curl -X GET https://api.buildstate.com.au/api/blog/admin/automation/status \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

   Should return 200 with stats, not 404.

3. **Test in UI**
   - Go to https://www.buildstate.com.au/admin/blog
   - Click "Automation" tab
   - Should see statistics, not an error

## Common Issues

### Issue: Deploy Fails with "Module not found"

**Cause**: Missing dependencies in package.json

**Fix**: The `claude/daily-blog-post-bot-011CV1QuMvtHMMvGWURoNXFs` branch already includes the dependencies:
- `@anthropic-ai/sdk`
- `axios`

Make sure Render runs `npm install` during build.

### Issue: Endpoints Still 404 After Deploy

**Cause**: Wrong branch deployed or cache issue

**Fix**:
1. Check Render logs to confirm the right commit was deployed
2. Look for commit hash: `bcedbee` (blog automation commit)
3. Restart the service in Render
4. Clear browser cache and try again

### Issue: "Automation disabled" message

**Cause**: Environment variable not set

**Fix**: Set `BLOG_AUTOMATION_ENABLED=true` in Render environment variables

### Issue: 500 Error Instead of 404

**Cause**: Missing API keys

**Fix**: Add required environment variables:
```
ANTHROPIC_API_KEY=your-anthropic-key
UNSPLASH_ACCESS_KEY=your-unsplash-key (optional)
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
```

## Files Changed in Backend Deployment

When you deploy, these files will be added/updated:

### New Files
- `src/services/blogAIService.js` - Claude AI integration
- `src/services/blogImageService.js` - Image fetching/upload
- `src/services/blogAutomationService.js` - Main automation logic
- `src/cron/blogAutomation.js` - Daily cron job
- `prisma/migrations/20251111000000_add_blog_automation/` - Database migration
- `BLOG_AUTOMATION_GUIDE.md` - Documentation

### Modified Files
- `src/routes/blog.js` - Added 3 automation endpoints
- `src/index.js` - Added cron job initialization
- `prisma/schema.prisma` - Added `isAutomated` and `automationMetadata` fields
- `package.json` - Added `@anthropic-ai/sdk` and `axios`
- `.env.example` - Added blog automation config

## Database Migration

The deployment will require running a Prisma migration:

### Automatic (Recommended)
If Render is configured to run migrations automatically, it will execute:
```bash
npx prisma migrate deploy
```

### Manual (If Needed)
If the migration doesn't run automatically:

1. SSH into your Render service or use Render Shell
2. Run:
   ```bash
   cd /app
   npx prisma migrate deploy
   ```

This adds `isAutomated` and `automationMetadata` columns to the BlogPost table.

## Timeline

Once you trigger the deployment:

1. **Build time**: 1-3 minutes
2. **Deploy time**: 30-60 seconds
3. **Total**: 2-5 minutes

The automation tab should work immediately after.

## Need Help?

If deployment fails:
1. Check Render build/deploy logs
2. Look for error messages
3. Verify all environment variables are set
4. Ensure database migration completed successfully

## Summary

**Quick Fix Steps:**

1. Log into Render Dashboard
2. Go to your backend service
3. Click "Manual Deploy"
4. Select branch: `claude/daily-blog-post-bot-011CV1QuMvtHMMvGWURoNXFs`
5. Click "Deploy"
6. Wait 2-5 minutes
7. Refresh your admin panel
8. The Automation tab should work!

---

**Note**: This is a one-time deployment. After the backend is deployed, the automation endpoints will be permanently available (unless you redeploy a different branch without these changes).
