# Property Image Upload Experience Research

## Competitive takeaways

Drawing on industry-standard workflows from leading property marketplaces (e.g. Property Finder, Zillow, Realtor.com) and modern property management suites (Buildium, AppFolio), an effective photo management experience typically offers:

- **Bulk uploads with progress feedback** so agents can add entire galleries from desktop or mobile in one action.
- **Automatic cover-photo selection** with an explicit way to promote a hero image that represents the listing on cards and summaries.
- **Drag-and-drop reordering** to curate the visual story prospective tenants or buyers see first.
- **Inline caption / alt-text editing** to describe amenities, meet accessibility requirements, and improve SEO reach.
- **Simple replacements & deletion** without losing ordering metadata.
- **Server-side validation** (file type, max size, limits per property) combined with resumable uploads when possible.
- **Immediate preview URLs** so users can confirm the exact image that will be published.

These flows keep marketing teams fast while preserving consistency between the initial onboarding wizard and day-to-day maintenance in detail views.

## Recommended workflow for AgentFM

1. **Onboard / add property wizard**
   - Accept multiple uploads, allow per-image alt text, and let managers choose the hero image before submission.
   - Persist uploaded assets to the property images table while ensuring the hero image synchronises with the `coverImage`/`imageUrl` field used on cards.
2. **Edit property form**
   - Mirror the wizard behaviour so photo, alt text, and ordering edits remain in sync with the property record.
   - Preserve existing captions when the user only reorders or removes photos.
3. **Property detail – Images tab**
   - Provide management tools (upload, delete, reorder, set primary) backed by dedicated REST endpoints.
   - Refresh the summary header after updates so the latest cover image appears immediately.

## Implementation notes (current repo)

- Front-end components now support alt-text aware payloads and consistent cover selection:
  - `PropertyPhotoUploader` powers both the onboarding wizard and edit form with the `allowAltText` flag enabled.
  - `PropertyOnboardingWizard.jsx` and `PropertyForm.jsx` normalise image payloads into `{ imageUrl, caption, isPrimary }` structures before sending them to `/api/properties`.
- The back-end `/api/properties` endpoints accept both legacy string arrays and the richer object payloads:
  - Input validation (`propertyImageInputSchema`) recognises string or object entries, extracts URLs, alt text, and requested primaries, and falls back to the first image when none is marked primary.
  - Create/update handlers persist captions, maintain primary flags, and keep the property cover image synchronised via `normaliseSubmittedPropertyImages`.
  - Property image routes accept `altText` aliases, update captions, and invalidate caches so downstream listings pick up the new hero image.

Together these changes align AgentFM with the upload workflows seen in established property platforms while preserving backwards compatibility for any legacy clients still sending string-only image arrays.
