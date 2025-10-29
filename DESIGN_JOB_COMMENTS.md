# Design Document: Job Comments & Activity System

## Problem Statement

**Current State:**
- Job detail modal displays hardcoded placeholder comments and activity
- No backend API endpoints for job comments
- No database model to store job-related communications
- Property managers and technicians cannot communicate about job progress

**Impact:**
- **Blocks Core User Journey**: Technicians cannot report progress or issues
- **No Accountability**: No audit trail of who did what and when
- **Poor Collaboration**: Teams resort to external communication tools
- **Data Loss**: Important job context is lost outside the system
- **User Frustration**: Users see placeholder data that doesn't work

**Affected User Roles:**
- Property Managers: Cannot track job progress or communicate with technicians
- Technicians: Cannot report issues, ask questions, or document work
- Owners: Cannot see job activity or communication history

## Proposed Solution

### Database Schema

Add `JobComment` model to track all job-related communications:

```prisma
model JobComment {
  id        String   @id @default(cuid())
  jobId     String
  userId    String
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
  
  @@index([jobId])
  @@index([userId])
  @@index([createdAt])
}
```

**Rationale:**
- Simple, focused model for comments only
- Cascade delete ensures cleanup when jobs are deleted
- Indexes on jobId for fast retrieval, createdAt for sorting
- Text field for longer comments
- Links to User for author information

### API Endpoints

**1. GET /api/jobs/:id/comments**
- Returns all comments for a job, ordered by createdAt DESC
- Includes user information (firstName, lastName, role)
- Requires authentication
- Role-based access: Users can only see comments for jobs they have access to

**2. POST /api/jobs/:id/comments**
- Creates a new comment on a job
- Requires authentication
- Validates: content (required, min 1 char)
- Returns created comment with user info

**Request:**
```json
{
  "content": "Completed initial assessment. Need to order parts."
}
```

**Response:**
```json
{
  "success": true,
  "comment": {
    "id": "clx...",
    "jobId": "clx...",
    "content": "Completed initial assessment. Need to order parts.",
    "createdAt": "2025-01-29T10:30:00Z",
    "user": {
      "id": "clx...",
      "firstName": "John",
      "lastName": "Doe",
      "role": "TECHNICIAN"
    }
  }
}
```

### Frontend Changes

**1. JobDetailModal Component**
- Replace hardcoded activity array with real data from API
- Add comment input field at bottom
- Display comments in reverse chronological order
- Show user name, role badge, and timestamp
- Real-time updates after posting comment

**2. State Management**
- Use React Query for fetching and caching comments
- Optimistic updates when posting new comments
- Automatic refetch on modal open
- Error handling with user-friendly messages

**3. UI/UX Improvements**
- Comment input with character counter
- Loading states while fetching/posting
- Empty state when no comments exist
- User avatars with role-based colors
- Relative timestamps (e.g., "2 hours ago")

### Data Flow

```
User opens job detail modal
  ↓
Frontend fetches GET /api/jobs/:id/comments
  ↓
Backend validates user access to job
  ↓
Backend queries JobComment with user includes
  ↓
Frontend displays comments in modal
  ↓
User types and submits comment
  ↓
Frontend posts to POST /api/jobs/:id/comments
  ↓
Backend creates comment, links to user
  ↓
Frontend updates UI optimistically
  ↓
Backend returns created comment
  ↓
Frontend confirms or rolls back
```

## Implementation Plan

### Phase 1: Database Migration
1. Create migration file for JobComment model
2. Add relation to Job model
3. Add relation to User model
4. Run migration and verify schema

### Phase 2: Backend API
1. Create comment validation schema with Zod
2. Implement GET /api/jobs/:id/comments endpoint
3. Implement POST /api/jobs/:id/comments endpoint
4. Add access control checks
5. Write unit tests for both endpoints

### Phase 3: Frontend Integration
1. Create useJobComments hook with React Query
2. Update JobDetailModal to fetch real comments
3. Add comment input component
4. Implement post comment mutation
5. Add loading and error states
6. Style comments with user info and timestamps

### Phase 4: Testing
1. Backend unit tests for comment CRUD
2. Backend integration tests for access control
3. Frontend component tests for JobDetailModal
4. E2E test for complete comment flow
5. Manual testing across all user roles

## Performance Considerations

**Database:**
- Index on jobId for fast comment retrieval
- Index on createdAt for efficient sorting
- Limit comments per request (default 50, max 100)

**API:**
- Pagination support for jobs with many comments
- Select only needed user fields to reduce payload
- Consider caching for frequently accessed jobs

**Frontend:**
- React Query caching reduces redundant requests
- Optimistic updates improve perceived performance
- Lazy load older comments if needed

## Security Considerations

**Access Control:**
- Users can only comment on jobs they have access to
- Property managers: Jobs for their properties
- Technicians: Jobs assigned to them
- Owners: Jobs for properties they own

**Input Validation:**
- Sanitize comment content to prevent XSS
- Rate limiting on comment creation (max 10/minute)
- Content length limits (max 2000 characters)

**Data Privacy:**
- Comments are tied to jobs, inherit job access rules
- Soft delete option for future (mark as deleted, don't show)
- Audit trail preserved even if user is deleted

## Accessibility

- Semantic HTML for comment list
- ARIA labels for comment input
- Keyboard navigation support
- Screen reader announcements for new comments
- High contrast mode support
- Focus management when posting comments

## Rollout Strategy

**Phase 1: Internal Testing (Week 1)**
- Deploy to staging environment
- Test with internal team
- Gather feedback on UX

**Phase 2: Beta Release (Week 2)**
- Enable for 10% of users via feature flag
- Monitor error rates and performance
- Collect user feedback

**Phase 3: Full Release (Week 3)**
- Gradually increase to 50%, then 100%
- Monitor metrics: comments per job, user engagement
- Document in user guide and changelog

## Success Metrics

**Adoption:**
- % of jobs with at least one comment
- Average comments per job
- Daily active users posting comments

**Performance:**
- API response time < 200ms (p95)
- Frontend render time < 100ms
- Zero errors in production

**User Satisfaction:**
- Reduced support tickets about job communication
- Positive feedback in user surveys
- Increased job completion rates

## Follow-up Work

**Short-term:**
- Add @mentions to notify specific users
- Add file attachments to comments
- Add edit/delete comment functionality

**Medium-term:**
- Real-time updates via WebSocket
- Comment notifications via email/SMS
- Rich text formatting support

**Long-term:**
- Comment templates for common updates
- AI-powered comment suggestions
- Integration with external tools (Slack, Teams)

## Risks & Mitigations

**Risk 1: High comment volume impacts performance**
- Mitigation: Implement pagination, caching, and indexes

**Risk 2: Users post sensitive information in comments**
- Mitigation: Add warning message, content moderation tools

**Risk 3: Spam or abuse of comment system**
- Mitigation: Rate limiting, content filters, admin moderation

**Risk 4: Comments not syncing across devices**
- Mitigation: React Query cache invalidation, optimistic updates

## Documentation Updates

- API documentation with endpoint specs
- User guide with screenshots
- Developer guide for extending comments
- Changelog entry for release notes
- Migration guide for existing users
