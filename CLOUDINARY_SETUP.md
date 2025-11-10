# Cloudinary Setup Guide for Persistent Image Storage

## Problem
Your images are currently stored in the container's local filesystem, which is **ephemeral** on cloud platforms like Render. This means:
- Images are deleted when your container restarts or redeploys
- Images uploaded during the property wizard disappear after logout/login

## Solution
Use **Cloudinary** for persistent, cloud-based image storage.

---

## Step 1: Create a Free Cloudinary Account

1. Go to [https://cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)
2. Sign up for a free account
3. The free tier includes:
   - 25 GB storage
   - 25 GB monthly bandwidth
   - 25 monthly credits
   - More than enough for most applications!

## Step 2: Get Your Cloudinary Credentials

After signing up:

1. Go to your [Cloudinary Dashboard](https://cloudinary.com/console)
2. You'll see your **Account Details** section with:
   - **Cloud Name** (e.g., `dxxxxxxxxxxxx`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (click the eye icon to reveal it)

## Step 3: Add Environment Variables to Render

Since you're using Render for hosting:

1. Go to your **Render Dashboard**
2. Navigate to your backend service
3. Click on **Environment** in the left sidebar
4. Add these three environment variables:

   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name-here
   CLOUDINARY_API_KEY=your-api-key-here
   CLOUDINARY_API_SECRET=your-api-secret-here
   ```

   Replace the values with your actual Cloudinary credentials from Step 2.

4. Click **Save Changes**
5. Render will automatically redeploy your service

## Step 4: Verify the Setup

After your service redeploys:

1. Check the deployment logs in Render
2. Look for this message:
   ```
   ✅ Cloudinary configured for persistent image storage
   ```

3. If you see this warning instead, check your environment variables:
   ```
   ⚠️  Cloudinary not configured - using local filesystem
   ```

## Step 5: Test Image Upload

1. Log into your application
2. Create a new property with multiple images
3. Complete the wizard
4. **Refresh the page** - all images should still be there
5. **Log out and log back in** - all images should persist
6. Check your Cloudinary Media Library to see the uploaded images

## How It Works

### Before (Local Storage)
```
User uploads image → Saved to /uploads/filename.jpg (container filesystem)
                   → Container restarts
                   → File is deleted ❌
```

### After (Cloudinary)
```
User uploads image → Uploaded to Cloudinary
                   → Returns permanent URL (https://res.cloudinary.com/...)
                   → Saved to database
                   → Images persist forever ✅
```

## Benefits of Cloudinary

1. **Persistent Storage**: Images never disappear
2. **Automatic Optimization**: Images are automatically compressed and optimized
3. **CDN Delivery**: Fast image loading worldwide
4. **Transformations**: Automatic format conversion (WebP for modern browsers)
5. **Backup**: Your images are backed up by Cloudinary
6. **No Server Storage**: Doesn't use your container's disk space

## Folder Structure in Cloudinary

Your images will be organized in:
```
agentfm/
  └── properties/
      ├── property-image-uuid-1.jpg
      ├── property-image-uuid-2.jpg
      └── ...
```

## Troubleshooting

### Images still disappearing?
- Verify all three environment variables are set correctly
- Check that there are no extra spaces in the values
- Restart your Render service manually after adding the variables

### Upload errors?
- Check your Cloudinary usage quota
- Verify your API credentials are correct
- Check the backend logs for specific error messages

### Want to test locally?
Add the same environment variables to your local `.env` file:
```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Cost

The **free tier is generous** and should handle:
- ~2,500 property images (assuming 10MB average)
- Thousands of page views per month

If you exceed the free tier, Cloudinary has affordable paid plans starting at $89/month.

## Alternative: Render Persistent Disk

If you prefer not to use Cloudinary, you can use Render's persistent disk feature:
1. Go to your Render service settings
2. Add a persistent disk
3. Mount it to `/app/uploads`
4. This costs extra on Render but keeps images on your server

However, **Cloudinary is recommended** because:
- Better performance (CDN)
- Automatic image optimization
- No server disk management
- More reliable backups

---

## Questions?

If you encounter any issues, check:
1. Render environment variables are set correctly
2. Service has redeployed after adding variables
3. Backend logs show Cloudinary is configured
4. Cloudinary dashboard shows your account is active
