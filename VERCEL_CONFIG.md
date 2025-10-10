# Vercel Configuration Guide

## Overview

This project is configured for Vercel deployment with the frontend as the primary deployment target. The backend is deployed separately (e.g., on Render or another service).

## Configuration Files

### Root `vercel.json`

The main configuration file that tells Vercel how to build and deploy the frontend:

```json
{
  "version": 2,
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "devCommand": "cd frontend && npm run dev",
  "installCommand": "cd frontend && npm install",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### `.vercelignore`

Excludes unnecessary files from deployment:
- Backend directory (deployed separately)
- Development files (*.pid, *.log)
- Documentation (except README.md)
- Test files
- Build artifacts

## Configuration Explanation

### Build Settings

- **buildCommand**: Navigates to frontend directory, installs dependencies, and builds
- **outputDirectory**: Points to the Vite build output (`frontend/dist`)
- **installCommand**: Installs frontend dependencies only
- **framework**: Set to `null` to use custom build commands

### Routing

- **rewrites**: All routes redirect to `/index.html` for client-side routing (SPA)
- This enables React Router to handle all routes

### Performance

- **headers**: Sets cache headers for static assets
- Assets in `/assets/` are cached for 1 year (immutable)
- Improves performance for returning visitors

## Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

### Required Variables

```bash
# Backend API URL
VITE_API_BASE_URL=https://your-backend-url.com

# Optional: Analytics, monitoring, etc.
VITE_ANALYTICS_ID=your-analytics-id
```

### Variable Naming

- All frontend environment variables must start with `VITE_`
- This is a Vite requirement for security
- Variables without `VITE_` prefix won't be exposed to the frontend

## Deployment Process

### Automatic Deployment

1. Push to branch triggers Vercel build
2. Vercel clones repository
3. Runs `installCommand` to install dependencies
4. Runs `buildCommand` to build the frontend
5. Deploys contents of `outputDirectory`

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Project Structure

```
agentfm-app/
├── frontend/              # Frontend application (deployed to Vercel)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── i18n.js       # ✅ Now included
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
├── backend/               # Backend API (deployed separately)
│   ├── src/
│   └── package.json
├── vercel.json           # Vercel configuration
├── .vercelignore         # Files to exclude from deployment
└── package.json          # Root package.json (monorepo)
```

## Troubleshooting

### Build Fails with "Could not resolve ./i18n.js"

**Solution:** Ensure commit includes `frontend/src/i18n.js`
```bash
git ls-tree -r HEAD --name-only | grep i18n
# Should output: frontend/src/i18n.js
```

### Configuration Mismatch Warning

**Problem:** Vercel detects different settings between production and project

**Solution:** 
1. Update `vercel.json` with correct settings
2. Push changes to trigger new deployment
3. Or update settings in Vercel Dashboard to match `vercel.json`

### Build Uses Wrong Directory

**Problem:** Vercel tries to build from root instead of frontend

**Solution:** Ensure `vercel.json` has correct paths:
- `buildCommand`: Must include `cd frontend`
- `outputDirectory`: Must be `frontend/dist`
- `installCommand`: Must include `cd frontend`

### Backend Files Included in Deployment

**Problem:** Backend directory is being deployed with frontend

**Solution:** Ensure `.vercelignore` includes `backend/`

### Environment Variables Not Working

**Problem:** `process.env.VARIABLE_NAME` is undefined

**Solution:** 
1. Ensure variable starts with `VITE_` prefix
2. Set in Vercel Dashboard → Environment Variables
3. Redeploy after adding variables

## Best Practices

### 1. Separate Frontend and Backend

- Frontend: Deploy to Vercel (static hosting)
- Backend: Deploy to Render, Railway, or similar (Node.js hosting)
- Connect via API URL in environment variables

### 2. Use Environment Variables

```javascript
// ✅ Good - uses environment variable
const API_URL = import.meta.env.VITE_API_BASE_URL;

// ❌ Bad - hardcoded URL
const API_URL = 'https://api.example.com';
```

### 3. Optimize Build Output

- Enable code splitting
- Use lazy loading for routes
- Optimize images and assets
- Set proper cache headers

### 4. Monitor Deployments

- Check build logs for warnings
- Monitor bundle size
- Test preview deployments before production
- Use Vercel Analytics for performance insights

## Configuration Updates

### To Update Configuration

1. Edit `vercel.json` in repository
2. Commit and push changes
3. Vercel automatically uses new configuration
4. Or update via Vercel Dashboard (not recommended)

### Recommended: Use Git-based Configuration

- Keep `vercel.json` in repository
- Version control all configuration changes
- Easier to track and rollback changes
- Consistent across all deployments

## Support

### Common Issues

1. **Build fails**: Check build logs in Vercel Dashboard
2. **404 errors**: Ensure rewrites are configured correctly
3. **Slow builds**: Check if dependencies are cached
4. **Environment variables**: Verify they start with `VITE_`

### Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Router Documentation](https://reactrouter.com/)

## Checklist

Before deploying, ensure:

- [ ] `vercel.json` is configured correctly
- [ ] `.vercelignore` excludes backend and unnecessary files
- [ ] `frontend/src/i18n.js` exists
- [ ] Environment variables are set in Vercel Dashboard
- [ ] Build command includes `cd frontend`
- [ ] Output directory is `frontend/dist`
- [ ] Rewrites are configured for SPA routing
- [ ] All commits are pushed to repository
- [ ] Build verification script passes

## Version History

- **v2.0** - Updated configuration with proper build commands and rewrites
- **v1.0** - Initial Vercel configuration

---

*Last Updated: 2025-10-10*  
*Configuration Version: 2.0*
