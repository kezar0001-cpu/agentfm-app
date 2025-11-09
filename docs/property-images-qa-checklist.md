# Property Image Experience - QA Checklist

## Overview
This checklist ensures the property image revamp meets all requirements and functions correctly across all user flows.

---

## Backend API Testing

### Property Creation (POST /api/properties)

- [ ] **TC-API-01:** Create property with no images
  - **Steps:** POST /api/properties with only required fields (no images)
  - **Expected:** Property created successfully, imageUrl is null, images array is empty

- [ ] **TC-API-02:** Create property with single image URL
  - **Steps:** POST with `imageUrl: "/uploads/photo.jpg"`
  - **Expected:** Property created, imageUrl set, images array contains 1 image with isPrimary=true

- [ ] **TC-API-03:** Create property with images array (new format)
  - **Steps:** POST with `images: [{ imageUrl: "...", caption: "...", isPrimary: true }]`
  - **Expected:** All images created, primary marked correctly, property.imageUrl synced to primary

- [ ] **TC-API-04:** Create property with multiple images, no primary specified
  - **Steps:** POST with images array, no isPrimary flags
  - **Expected:** First image auto-set as primary, property.imageUrl synced

- [ ] **TC-API-05:** Create property with invalid image URL
  - **Steps:** POST with imageUrl that's not a valid URL or path
  - **Expected:** 400 validation error with clear message

- [ ] **TC-API-06:** Create property with oversized image file upload
  - **Steps:** Upload multipart form with image >10MB
  - **Expected:** 400 error, file rejected, clear size limit message

### Property Update (PATCH /api/properties/:id)

- [ ] **TC-API-07:** Update property name without touching images
  - **Steps:** PATCH with only `name: "New Name"` (no images key)
  - **Expected:** Name updated, existing images preserved

- [ ] **TC-API-08:** Update property with new images array
  - **Steps:** PATCH with full images array
  - **Expected:** Old images replaced, new images created, primary synced

- [ ] **TC-API-09:** Update property to remove all images
  - **Steps:** PATCH with `images: []`
  - **Expected:** All images deleted, property.imageUrl set to null

- [ ] **TC-API-10:** Update property to change primary image
  - **Steps:** PATCH with images array, different image has isPrimary=true
  - **Expected:** Primary flag moved, property.imageUrl updated

### Property Image Routes

- [ ] **TC-API-11:** GET /api/properties/:id/images
  - **Steps:** Fetch images for property with multiple images
  - **Expected:** Returns sorted array (displayOrder ASC, createdAt ASC), primary flagged

- [ ] **TC-API-12:** POST /api/properties/:id/images (file upload)
  - **Steps:** Upload image file via multipart/form-data
  - **Expected:** Image stored in /uploads, PropertyImage record created, correct MIME type

- [ ] **TC-API-13:** POST /api/properties/:id/images (URL)
  - **Steps:** POST with `imageUrl: "https://example.com/photo.jpg"`
  - **Expected:** PropertyImage record created with external URL

- [ ] **TC-API-14:** PATCH /api/properties/:id/images/:imageId (update caption)
  - **Steps:** Update caption text only
  - **Expected:** Caption updated, other fields unchanged

- [ ] **TC-API-15:** PATCH /api/properties/:id/images/:imageId (set as primary)
  - **Steps:** Set isPrimary=true on non-primary image
  - **Expected:** Old primary unset, new primary set, property.imageUrl synced

- [ ] **TC-API-16:** DELETE /api/properties/:id/images/:imageId (non-primary)
  - **Steps:** Delete non-primary image
  - **Expected:** Image deleted, primary unchanged

- [ ] **TC-API-17:** DELETE /api/properties/:id/images/:imageId (primary image)
  - **Steps:** Delete primary image when others exist
  - **Expected:** Image deleted, next image (by displayOrder) promoted to primary, property.imageUrl synced

- [ ] **TC-API-18:** DELETE last image
  - **Steps:** Delete only remaining image
  - **Expected:** Image deleted, property.imageUrl set to null

- [ ] **TC-API-19:** POST /api/properties/:id/images/reorder
  - **Steps:** Reorder with valid orderedImageIds array
  - **Expected:** displayOrder updated for all images, order persists

- [ ] **TC-API-20:** POST /api/properties/:id/images/reorder with invalid IDs
  - **Steps:** Provide orderedImageIds that don't match existing images
  - **Expected:** 400 validation error

### Transaction & Consistency

- [ ] **TC-API-21:** Multiple simultaneous updates don't corrupt data
  - **Steps:** Send 2 PATCH requests concurrently
  - **Expected:** Both succeed or one fails gracefully, no partial state

- [ ] **TC-API-22:** Exactly one primary per property enforced
  - **Steps:** Query properties with multiple images
  - **Expected:** Every property has exactly 1 isPrimary=true image (or 0 if no images)

### Cache Invalidation

- [ ] **TC-API-23:** Create property invalidates cache
  - **Steps:** Create property, immediately fetch list
  - **Expected:** New property appears in list

- [ ] **TC-API-24:** Update images invalidates cache
  - **Steps:** Update property images, fetch property detail
  - **Expected:** Latest images returned (not cached stale data)

---

## Frontend Testing

### Property Onboarding Wizard

- [ ] **TC-FE-01:** Upload multiple images in wizard
  - **Steps:** Open wizard í Basic Info step í Upload 5 photos
  - **Expected:** All 5 photos appear as thumbnails with alt text fields

- [ ] **TC-FE-02:** Set cover image in wizard
  - **Steps:** Upload images í Click "Make cover" on 3rd image
  - **Expected:** Image 3 marked as primary with star icon

- [ ] **TC-FE-03:** Reorder images in wizard
  - **Steps:** Drag image 4 to position 1
  - **Expected:** Order updates visually, persists on submit

- [ ] **TC-FE-04:** Add alt text/caption in wizard
  - **Steps:** Type caption in alt text field for each image
  - **Expected:** Caption saved with image

- [ ] **TC-FE-05:** Remove image in wizard
  - **Steps:** Click delete on 2nd image
  - **Expected:** Image removed, other images remain

- [ ] **TC-FE-06:** Complete wizard with images
  - **Steps:** Fill all required fields í Upload 3 images í Finish
  - **Expected:** Property created, all 3 images persist, primary correct

- [ ] **TC-FE-07:** Complete wizard without images
  - **Steps:** Fill required fields í Skip image upload í Finish
  - **Expected:** Property created successfully with no images

- [ ] **TC-FE-08:** Upload invalid file type
  - **Steps:** Try to upload .pdf or .txt file
  - **Expected:** Rejected with clear error message

- [ ] **TC-FE-09:** Upload oversized file
  - **Steps:** Upload >10MB image
  - **Expected:** Rejected with size limit error

### Property Edit Form

- [ ] **TC-FE-10:** Edit property keeps existing images
  - **Steps:** Open edit form for property with images í Change name í Save
  - **Expected:** Property name updated, images unchanged

- [ ] **TC-FE-11:** Add new images via edit form
  - **Steps:** Edit property í Upload 2 new images í Save
  - **Expected:** New images added to existing images

- [ ] **TC-FE-12:** Delete image via edit form
  - **Steps:** Edit property í Remove 1 image í Save
  - **Expected:** Image deleted, others remain

- [ ] **TC-FE-13:** Change cover image via edit form
  - **Steps:** Edit property í Make different image primary í Save
  - **Expected:** Primary image updated correctly

### Property List Page (Cards)

- [ ] **TC-FE-14:** Card shows primary image
  - **Steps:** View properties list with images
  - **Expected:** Each card displays primary image (or placeholder if none)

- [ ] **TC-FE-15:** Card carousel arrows work (grid view)
  - **Steps:** Hover card with multiple images í Click left/right arrows
  - **Expected:** Cycles through images, counter updates (e.g., "2 / 5")

- [ ] **TC-FE-16:** Card carousel arrows work (list view)
  - **Steps:** Switch to list view í Test carousel on property with multiple images
  - **Expected:** Arrows cycle through images

- [ ] **TC-FE-17:** Card carousel auto-plays
  - **Steps:** Wait 4 seconds on card with multiple images (no interaction)
  - **Expected:** Image auto-advances to next

- [ ] **TC-FE-18:** Card carousel pauses on hover
  - **Steps:** Hover over auto-playing carousel
  - **Expected:** Auto-play pauses, resumes on mouse leave

- [ ] **TC-FE-19:** Single-image property shows no arrows
  - **Steps:** View property card with only 1 image
  - **Expected:** No carousel arrows or dots displayed

### Property Detail Page

- [ ] **TC-FE-20:** Detail page shows image carousel
  - **Steps:** Navigate to property detail with multiple images
  - **Expected:** Large carousel at top with arrows, dots, counter

- [ ] **TC-FE-21:** Gallery grid appears below carousel
  - **Steps:** View property with 3+ images
  - **Expected:** Grid of thumbnails below carousel (up to 6 shown)

- [ ] **TC-FE-22:** Gallery grid "+N more" tile
  - **Steps:** View property with 10 images
  - **Expected:** Grid shows 6 thumbnails + "+4" tile, clicking navigates to Images tab

- [ ] **TC-FE-23:** Gallery grid primary badge
  - **Steps:** Check gallery grid thumbnails
  - **Expected:** First thumbnail has "Primary" badge

- [ ] **TC-FE-24:** Click thumbnail (future: open lightbox)
  - **Steps:** Click any thumbnail in grid
  - **Expected:** Currently opens fullscreen carousel (acceptable)

- [ ] **TC-FE-25:** Fullscreen button opens lightbox
  - **Steps:** Click fullscreen icon on carousel
  - **Expected:** Opens full-screen lightbox with current image

- [ ] **TC-FE-26:** Lightbox arrows navigate
  - **Steps:** In lightbox í Click left/right arrows
  - **Expected:** Navigates through all images

- [ ] **TC-FE-27:** Lightbox keyboard: arrow keys
  - **Steps:** In lightbox í Press ê and í keys
  - **Expected:** Navigates to prev/next image

- [ ] **TC-FE-28:** Lightbox keyboard: ESC closes
  - **Steps:** In lightbox í Press ESC key
  - **Expected:** Lightbox closes, returns to detail page

- [ ] **TC-FE-29:** Lightbox shows caption
  - **Steps:** View lightbox for image with caption
  - **Expected:** Caption appears as overlay at bottom

- [ ] **TC-FE-30:** Lightbox shows counter
  - **Steps:** Open lightbox
  - **Expected:** Counter shows "3 / 10" or similar

### Images Tab (PropertyImageManager)

- [ ] **TC-FE-31:** Images tab displays all images
  - **Steps:** Navigate to Images tab on property detail
  - **Expected:** Grid shows all uploaded images

- [ ] **TC-FE-32:** Upload new image via Images tab
  - **Steps:** Click "Upload photos" í Select file
  - **Expected:** Upload progress í Image appears in grid

- [ ] **TC-FE-33:** Add image via URL
  - **Steps:** Click "Add via URL" í Paste URL í Submit
  - **Expected:** Image added to grid

- [ ] **TC-FE-34:** Drag-reorder images
  - **Steps:** Drag image 3 to position 1
  - **Expected:** Visual reorder, saves on drop, persists on refresh

- [ ] **TC-FE-35:** Set primary image
  - **Steps:** Click star icon on non-primary image
  - **Expected:** Star moves to new primary, detail page updates

- [ ] **TC-FE-36:** Edit image caption
  - **Steps:** Click edit í Change alt text í Save
  - **Expected:** Caption updated, visible in lightbox

- [ ] **TC-FE-37:** Delete image
  - **Steps:** Click delete í Confirm
  - **Expected:** Image removed from grid, detail page updates

- [ ] **TC-FE-38:** Bulk upload multiple images
  - **Steps:** Select 5 files at once í Upload
  - **Expected:** All 5 upload with progress indicators

### Cross-Component Consistency

- [ ] **TC-FE-39:** Wizard í Detail page consistency
  - **Steps:** Create property with 3 images in wizard í View detail page
  - **Expected:** All 3 images appear, primary correct

- [ ] **TC-FE-40:** Edit form í List card consistency
  - **Steps:** Edit property í Change primary image í Save í View list
  - **Expected:** List card shows new primary image

- [ ] **TC-FE-41:** Images tab í Detail page sync
  - **Steps:** Upload image via Images tab í View carousel
  - **Expected:** New image appears in carousel

- [ ] **TC-FE-42:** Non-image edit doesn't drop images
  - **Steps:** Edit property address (no image changes) í Save
  - **Expected:** Images unchanged

### Accessibility

- [ ] **TC-A11Y-01:** Alt text prompts
  - **Steps:** Upload image in wizard
  - **Expected:** Alt text field visible and accessible

- [ ] **TC-A11Y-02:** Keyboard navigation in carousel
  - **Steps:** Tab to carousel í Use arrow keys
  - **Expected:** Can navigate without mouse

- [ ] **TC-A11Y-03:** Screen reader announces images
  - **Steps:** Use screen reader on property card
  - **Expected:** Reads alt text for images

- [ ] **TC-A11Y-04:** Focus trap in lightbox
  - **Steps:** Open lightbox í Tab through elements
  - **Expected:** Focus stays within lightbox, doesn't escape to page behind

- [ ] **TC-A11Y-05:** Color contrast sufficient
  - **Steps:** Check arrow buttons, badges, counters with contrast tool
  - **Expected:** All meet WCAG 2.1 AA (4.5:1 for text, 3:1 for UI components)

### Performance

- [ ] **TC-PERF-01:** Lazy load images below fold
  - **Steps:** View properties list with 50 items í Check network tab
  - **Expected:** Only visible images load initially

- [ ] **TC-PERF-02:** Gallery grid loads quickly
  - **Steps:** Navigate to detail page with 10 images í Measure time
  - **Expected:** Grid renders in <1 second

- [ ] **TC-PERF-03:** No layout shift on image load
  - **Steps:** Navigate to property detail í Watch for shifts
  - **Expected:** Placeholder boxes prevent layout shift

### Mobile Experience

- [ ] **TC-MOB-01:** Carousel swipe on mobile
  - **Steps:** On mobile device í Swipe carousel
  - **Expected:** Swipe left/right navigates images

- [ ] **TC-MOB-02:** Gallery grid responsive
  - **Steps:** View gallery grid on mobile (375px width)
  - **Expected:** Grid adapts to smaller screen (2-3 columns)

- [ ] **TC-MOB-03:** Touch targets large enough
  - **Steps:** Measure arrow buttons, dots on mobile
  - **Expected:** All interactive elements e44x44px

- [ ] **TC-MOB-04:** Lightbox fullscreen on mobile
  - **Steps:** Open lightbox on mobile
  - **Expected:** Uses full screen, pinch-zoom works

---

## Backwards Compatibility

- [ ] **TC-BC-01:** Legacy property with single imageUrl
  - **Steps:** Fetch property created before revamp (only has imageUrl field)
  - **Expected:** imageUrl normalized to images array on read

- [ ] **TC-BC-02:** Legacy API payload still accepted
  - **Steps:** POST /api/properties with old format `imageUrl: "..."`
  - **Expected:** Accepted, creates PropertyImage record

- [ ] **TC-BC-03:** No breaking changes for existing clients
  - **Steps:** Old frontend code fetches property
  - **Expected:** Response includes both imageUrl and images array

---

## Edge Cases

- [ ] **TC-EDGE-01:** Property with 0 images
  - **Steps:** View property with no images
  - **Expected:** Placeholder shows, no errors

- [ ] **TC-EDGE-02:** Property with 1 image
  - **Steps:** View card and detail for single-image property
  - **Expected:** No carousel controls, just static image

- [ ] **TC-EDGE-03:** Property with 50+ images
  - **Steps:** Upload 50 images í View detail page
  - **Expected:** Performance acceptable, gallery grid shows "+44" tile

- [ ] **TC-EDGE-04:** Extremely long image caption
  - **Steps:** Add 500-character caption
  - **Expected:** Truncated in grid, full text in lightbox

- [ ] **TC-EDGE-05:** Image URL that returns 404
  - **Steps:** Set imageUrl to broken link
  - **Expected:** Fallback placeholder shows, no JS errors

- [ ] **TC-EDGE-06:** Very tall or wide image
  - **Steps:** Upload 10000x500 image
  - **Expected:** Scales to fit, maintains aspect ratio

- [ ] **TC-EDGE-07:** Special characters in caption
  - **Steps:** Add caption with quotes, <>, & symbols
  - **Expected:** Properly escaped, no XSS vulnerability

- [ ] **TC-EDGE-08:** Concurrent reorder operations
  - **Steps:** Two users reorder images simultaneously
  - **Expected:** One succeeds, other gets fresh data to retry

---

## Regression Tests

- [ ] **TC-REG-01:** Property creation flow still works
  - **Steps:** Create property without using wizard (direct API or old form)
  - **Expected:** Property created successfully

- [ ] **TC-REG-02:** Unit creation not affected
  - **Steps:** Create property í Add unit
  - **Expected:** Unit created, no image-related errors

- [ ] **TC-REG-03:** Property search not affected
  - **Steps:** Search properties by name/address
  - **Expected:** Search works, images displayed correctly in results

- [ ] **TC-REG-04:** Property filters work
  - **Steps:** Filter by status, type
  - **Expected:** Filters work, images load for filtered properties

---

## Deployment Verification (Post-Deploy)

- [ ] **TC-DEPLOY-01:** Database migration successful
  - **Steps:** Check PropertyImage table exists with correct schema
  - **Expected:** Table created, indexes in place

- [ ] **TC-DEPLOY-02:** Existing properties migrated
  - **Steps:** Query old properties, check images array
  - **Expected:** Legacy imageUrl converted to PropertyImage records

- [ ] **TC-DEPLOY-03:** File uploads directory writable
  - **Steps:** Upload image via API
  - **Expected:** File saved to /uploads directory

- [ ] **TC-DEPLOY-04:** Static file serving works
  - **Steps:** Access uploaded image URL directly
  - **Expected:** Image serves correctly

- [ ] **TC-DEPLOY-05:** Cache invalidation working in production
  - **Steps:** Update property images í Fetch from different session
  - **Expected:** Latest images returned (not cached)

---

## Sign-Off

### Test Summary

| Category | Total Tests | Passed | Failed | Blocked |
|----------|-------------|--------|--------|---------|
| Backend API | 24 | | | |
| Frontend | 42 | | | |
| Accessibility | 5 | | | |
| Performance | 3 | | | |
| Mobile | 4 | | | |
| Backwards Compat | 3 | | | |
| Edge Cases | 8 | | | |
| Regression | 4 | | | |
| Deployment | 5 | | | |
| **TOTAL** | **98** | **0** | **0** | **0** |

### Test Environment

- **Browser(s) Tested:** Chrome 120, Firefox 121, Safari 17
- **Mobile Devices:** iPhone 13 (iOS 17), Samsung Galaxy S21 (Android 13)
- **Screen Readers:** NVDA, VoiceOver
- **Database:** PostgreSQL 14 (Neon)
- **Deployment:** Render

### Approvals

- [ ] **QA Lead:** ___________________________ Date: ___________
- [ ] **Product Owner:** ___________________________  Date: ___________
- [ ] **Tech Lead:** ___________________________ Date: ___________

---

## Notes

- Any failed tests should be documented with steps to reproduce and severity
- Blocked tests should note the blocker and expected resolution date
- Performance benchmarks should be recorded for future comparison
