# Debugging Guide: Multiple Property Images Not Displaying

## Issue Summary
- ✅ Cover image persists correctly (Cloudinary working)
- ❌ Additional images disappear after property creation
- ❌ Only one image shows instead of all uploaded images

## Root Cause Investigation

This guide will help you identify exactly where the problem is occurring.

---

## Step 1: Check if Images Are Being Uploaded

### What to Look For
When you upload images in the property wizard, check your browser's Developer Tools:

1. **Open Developer Tools** (F12 or Right-click → Inspect)
2. **Go to Network tab**
3. **Filter by "uploads"**
4. **Upload images in the wizard**

### Expected Result
You should see a POST request to `/uploads/multiple` with:
- **Request**: FormData with your image files
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "urls": [
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/agentfm/properties/image-1-uuid.jpg",
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/agentfm/properties/image-2-uuid.jpg",
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/agentfm/properties/image-3-uuid.jpg"
    ]
  }
  ```

### ⚠️ Troubleshooting
- **If you see `/uploads/` paths instead of Cloudinary URLs**: Cloudinary environment variables are not set correctly
- **If upload fails (4xx/5xx error)**: Check backend logs for upload errors
- **If no network request**: Frontend is not calling the upload API

---

## Step 2: Check Property Creation Request

### What to Look For
After completing the wizard and clicking "Create Property":

1. **Keep Network tab open**
2. **Filter by "properties"**
3. **Click the POST request to `/properties`**
4. **Check the Request Payload**

### Expected Result
The request body should contain an `images` array:
```json
{
  "name": "Test Property",
  "address": "123 Main St",
  "city": "City",
  "country": "USA",
  "propertyType": "Residential",
  "images": [
    {
      "imageUrl": "https://res.cloudinary.com/.../image-1.jpg",
      "caption": null,
      "isPrimary": true
    },
    {
      "imageUrl": "https://res.cloudinary.com/.../image-2.jpg",
      "caption": null,
      "isPrimary": false
    },
    {
      "imageUrl": "https://res.cloudinary.com/.../image-3.jpg",
      "caption": null,
      "isPrimary": false
    }
  ],
  "imageUrl": "https://res.cloudinary.com/.../image-1.jpg"
}
```

### ⚠️ Troubleshooting
- **If `images` array is missing**: Frontend wizard is not building the images array correctly
- **If `images` array is empty**: Check `formState.images` in the wizard component
- **If only one image in array**: The wizard is only capturing the cover image

---

## Step 3: Check Backend Logs

### What to Look For
With the enhanced logging in place, check your Render logs during property creation:

1. Go to **Render Dashboard** → Your Service → **Logs**
2. Create a test property with 3+ images
3. Look for these log messages:

### Expected Logs
```
[PropertyCreate] Image debugging:
  - Raw images received: 3 images
  - First image sample: {"imageUrl":"https://res.cloudinary.com/...","caption":null,"isPrimary":true}
  - Normalized images: 3 images
  - Images to be saved: [
      { index: 0, url: 'https://res.cloudinary.com/...', isPrimary: true },
      { index: 1, url: 'https://res.cloudinary.com/...', isPrimary: false },
      { index: 2, url: 'https://res.cloudinary.com/...', isPrimary: false }
    ]
  - ✅ Saved 3 PropertyImage records to database
  - Property created with 3 images in response
```

### ⚠️ Troubleshooting

#### Log shows "Raw images received: none"
**Problem**: Frontend is not sending the images array
**Solution**: Check `PropertyOnboardingWizard.jsx` line 356-379

#### Log shows "Normalized images: 0 images"
**Problem**: Backend validation is rejecting all images
**Possible Causes**:
- URLs are too long (>2048 chars)
- URLs contain invalid characters
- URLs don't match the validation regex

#### Log shows "⚠️ PropertyImage table not available"
**Problem**: Migration hasn't been applied
**Solution**: Run `npx prisma migrate deploy` in backend directory

#### Log shows "Saved X PropertyImage records" but "Property created with 0 images"
**Problem**: Images are saved but not retrieved in the response
**Solution**: Check `buildPropertyImagesInclude()` function

---

## Step 4: Check Database Directly

### Run the Diagnostic Tool
```bash
cd backend
node diagnose-recent-property.js
```

### Expected Output
```
📍 Most Recent Property:
   ID: abc123
   Name: Test Property
   Created: 2025-11-10T12:00:00.000Z

🖼️  Image Data:
   property.imageUrl (cover): https://res.cloudinary.com/.../image-1.jpg
   propertyImages count: 3

✅ PropertyImage records found:

   Image 1:
     ID: img1
     URL: https://res.cloudinary.com/.../image-1.jpg
     URL Type: External (Cloudinary/CDN)
     Primary: true
     ✓ Using Cloudinary (persistent)

   Image 2:
     URL: https://res.cloudinary.com/.../image-2.jpg
     URL Type: External (Cloudinary/CDN)
     Primary: false
     ✓ Using Cloudinary (persistent)

   Image 3:
     URL: https://res.cloudinary.com/.../image-3.jpg
     URL Type: External (Cloudinary/CDN)
     Primary: false
     ✓ Using Cloudinary (persistent)
```

### ⚠️ Troubleshooting

#### "❌ NO PropertyImage RECORDS FOUND!"
**Problem**: Images are not being saved to the database at all
**Next Steps**: Check Steps 2 and 3 above

---

## Step 5: Check Property Detail API Response

### What to Look For
After creating a property, refresh the page and check the network request:

1. **Network tab** → Filter by "properties"
2. **Find GET request** to `/properties/{id}`
3. **Check the Response**

### Expected Result
```json
{
  "success": true,
  "property": {
    "id": "abc123",
    "name": "Test Property",
    "imageUrl": "https://res.cloudinary.com/.../image-1.jpg",
    "images": [
      {
        "id": "img1",
        "propertyId": "abc123",
        "imageUrl": "https://res.cloudinary.com/.../image-1.jpg",
        "caption": null,
        "isPrimary": true,
        "displayOrder": 0
      },
      {
        "id": "img2",
        "propertyId": "abc123",
        "imageUrl": "https://res.cloudinary.com/.../image-2.jpg",
        "caption": null,
        "isPrimary": false,
        "displayOrder": 1
      },
      {
        "id": "img3",
        "propertyId": "abc123",
        "imageUrl": "https://res.cloudinary.com/.../image-3.jpg",
        "caption": null,
        "isPrimary": false,
        "displayOrder": 2
      }
    ]
  }
}
```

### ⚠️ Troubleshooting

#### `images` array is empty
**Problem**: PropertyImage records are in database but not being returned
**Solution**: Check `toPublicProperty()` function in `properties.js`

#### `images` array only has one item
**Problem**: Only primary image is being returned
**Solution**: Check `normalizePropertyImages()` function

---

## Step 6: Check Frontend Display

### What to Look For
Check how the frontend is displaying images:

1. **Open browser console** (F12)
2. **Type**: `document.querySelector('[data-property-id]')`
3. **Or manually inspect** the property detail page

### In PropertyDetailPage.jsx
Look for line 247-252:
```javascript
const propertyImages = Array.isArray(property?.images) ? property.images : [];
const carouselImages = propertyImages.length
  ? propertyImages
  : property?.imageUrl
    ? [property.imageUrl]
    : [];
```

### Expected Behavior
- `property.images` should be an array with all your images
- `carouselImages` should contain all images
- If `propertyImages.length === 0`, it falls back to showing only `property.imageUrl` (cover image only)

### ⚠️ Troubleshooting

#### Frontend shows only cover image
**Problem**: `property.images` is empty or undefined
**Check**: Step 5 above - verify API is returning images

---

## Common Issues & Solutions

### Issue 1: "URL upload" only works for one image

**Root Cause**: The URL input field in the wizard is designed for the cover image only.

**Current Behavior**:
- Device upload: Multiple files, creates multiple PropertyImage records ✅
- URL input: Single URL, sets as cover image only ❌

**Solution**: This is by design. For multiple URL-based images, you need to either:
1. Use the device upload feature (recommended)
2. Add a feature to accept multiple URLs (requires development)

### Issue 2: Images upload but don't show after refresh

**Root Cause**: React Query cache is stale

**Solution**: Clear cache or force refetch:
```javascript
queryClient.invalidateQueries({ queryKey: ['properties', propertyId] });
```

### Issue 3: Images show during wizard but disappear after submission

**Root Cause**: Frontend state vs. server state mismatch

**Check**:
1. Browser console for errors during property creation
2. Backend logs for database save errors
3. Network response to ensure images are in the response

---

## Quick Test Procedure

1. **Upload 3 test images** via device upload
2. **Complete the wizard** and create property
3. **Immediately check**:
   - Browser Network tab: POST `/properties` request has `images` array with 3 items
   - Render logs show: "✅ Saved 3 PropertyImage records to database"
4. **Refresh the page**
5. **Check**:
   - Network tab: GET `/properties/{id}` response has `images` array with 3 items
   - Page displays all 3 images in carousel/gallery

If any step fails, go back to that specific section in this guide.

---

## Need Help?

Share the following information:
1. **Browser Network tab screenshot** of the POST `/properties` request payload
2. **Render logs** from property creation (with the enhanced logging)
3. **Diagnostic tool output** from `diagnose-recent-property.js`
4. **Browser console errors** (if any)

This will help pinpoint the exact issue!
