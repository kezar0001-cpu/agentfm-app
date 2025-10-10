# Vercel Dashboard Settings Guide

## Required Configuration

To resolve the "Configuration Settings differ" warning and ensure successful deployment, configure these settings in the Vercel Dashboard.

---

## Step-by-Step Instructions

### 1. Access Project Settings

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `agentfm-app`
3. Click **Settings** tab
4. Navigate to **General** section

---

### 2. Configure Root Directory

**Setting:** Root Directory  
**Value:** `frontend`

**Steps:**
1. Scroll to "Root Directory" section
2. Enter: `frontend`
3. ✅ Check: "Include files outside the root directory in the Build Step"
4. Click **Save**

**Why:** This tells Vercel that the frontend code is in the `frontend/` subdirectory, not the repository root.

---

### 3. Framework Preset (Auto-detected)

**Setting:** Framework Preset  
**Expected Value:** `Vite` (auto-detected)

**Verification:**
- Vercel should automatically detect Vite
- Build Command: `npm run build` or `vite build`
- Output Directory: `dist`
- Install Command: `npm install`
- Dev Command: `vite`

**If not auto-detected:**
1. Go to **Build & Development Settings**
2. Framework Preset: Select **Vite**
3. Click **Save**

---

### 4. Build & Development Settings

These should be automatically configured when Root Directory is set to `frontend`:

| Setting | Value |
|---------|-------|
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Development Command** | `vite` |

**Note:** These are relative to the Root Directory (`frontend/`), so:
- Build runs in: `/frontend/`
- Output is: `/frontend/dist/`

---

### 5. Environment Variables

Set these in **Settings** → **Environment Variables**:

#### Required Variables

```bash
# Backend API URL
VITE_API_BASE_URL=https://your-backend-url.com
```

#### Optional Variables

```bash
# Analytics
VITE_ANALYTICS_ID=your-analytics-id

# Feature Flags
VITE_ENABLE_FEATURE_X=true
```

**Important:** All frontend environment variables must start with `VITE_` prefix.

---

## Configuration Files

### Root `vercel.json`

```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "devCommand": "cd frontend && npm run dev",
  "installCommand": "cd frontend && npm install"
}
```

**Purpose:** Tells Vercel how to build when Root Directory is not set in dashboard.

### Frontend `vercel.json`

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Purpose:** Enables client-side routing for React Router (SPA).

---

## Verification Checklist

After configuring settings, verify:

- [ ] Root Directory is set to `frontend`
- [ ] Framework Preset shows `Vite`
- [ ] Build Command is `npm run build`
- [ ] Output Directory is `dist`
- [ ] Install Command is `npm install`
- [ ] Environment variables are set (if needed)
- [ ] "Include files outside root directory" is checked

---

## Expected Build Process

With correct configuration, Vercel will:

1. ✅ Clone repository
2. ✅ Change to `frontend/` directory
3. ✅ Run `npm install` to install dependencies
4. ✅ Run `npm run build` to build with Vite
5. ✅ Output to `frontend/dist/`
6. ✅ Deploy contents of `dist/` directory
7. ✅ Apply rewrites for SPA routing

---

## Troubleshooting

### "Configuration Settings differ" Warning

**Cause:** Production deployment uses different settings than Project Settings

**Solution:**
1. Update Project Settings to match desired configuration
2. Trigger new deployment
3. Or update `vercel.json` to match production settings

### "frontend: No such file or directory"

**Cause:** Root Directory not set correctly

**Solution:**
1. Set Root Directory to `frontend` in dashboard
2. Or ensure `vercel.json` has `cd frontend` in commands

### Build Fails with Module Errors

**Cause:** Missing dependencies or incorrect build context

**Solution:**
1. Verify `package.json` exists in `frontend/` directory
2. Check that `i18n.js` and all imports exist
3. Run `./verify-build.sh` locally to check files

### Environment Variables Not Working

**Cause:** Variables don't have `VITE_` prefix

**Solution:**
1. Rename variables to start with `VITE_`
2. Redeploy after updating variables
3. Access with `import.meta.env.VITE_VARIABLE_NAME`

---

## Alternative: Use Dashboard Settings Only

If you prefer to configure everything in the dashboard:

1. **Delete** root `vercel.json` (optional)
2. **Set** Root Directory to `frontend`
3. **Let** Vercel auto-detect Vite
4. **Keep** `frontend/vercel.json` for rewrites

This approach:
- ✅ Simpler configuration
- ✅ Uses Vercel's auto-detection
- ✅ Easier to update settings
- ❌ Less portable (settings not in git)

---

## Recommended Approach

**Use Both:**
1. Set Root Directory in dashboard: `frontend`
2. Keep `vercel.json` for documentation
3. Keep `frontend/vercel.json` for rewrites

This approach:
- ✅ Clear configuration in dashboard
- ✅ Documented in repository
- ✅ Works if dashboard settings reset
- ✅ Portable across projects

---

## Summary

### Minimum Required Settings

1. **Root Directory:** `frontend`
2. **Framework:** Vite (auto-detected)
3. **Environment Variables:** Set `VITE_*` variables as needed

### Files to Keep

- ✅ `vercel.json` (root) - Build configuration
- ✅ `frontend/vercel.json` - SPA rewrites
- ✅ `.vercelignore` - Exclude backend

### Expected Result

- ✅ Build succeeds
- ✅ No configuration warnings
- ✅ SPA routing works
- ✅ Environment variables accessible

---

*Last Updated: 2025-10-10*  
*Configuration Version: 3.0*
