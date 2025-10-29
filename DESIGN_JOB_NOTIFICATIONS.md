# Design Document: Job Assignment & Completion Notifications

## Problem Statement

**Current State:**
- Notification service exists (`notificationService.js`) with functions for job events
- Service is never called when jobs are created, assigned, or completed
- Technicians don't receive notifications when assigned to jobs
- Property managers don't receive notifications when jobs are completed
- Users must manually check the system for updates

**Impact:**
- **Blocks Core Workflow**: Technicians miss job assignments, causing delays
- **Poor User Experience**: No proactive alerts for important events
- **Reduced Efficiency**: Users waste time checking for updates
- **Missed SLAs**: Delayed responses due to lack of awareness
- **Low System Value**: Existing notification infrastructure is unused

**Affected User Roles:**
- **Technicians**: Don't know when jobs are assigned to them
- **Property Managers**: Don't know when jobs are completed
- **Owners**: Don't receive updates on job progress

## Proposed Solution

### Trigger Points

**1. Job Assignment (Create or Update)**
- When a job is created with `assignedToId`
- When `assignedToId` is changed from null to a user
- When `assignedToId` is changed from one user to another

**Notification Recipients:**
- New assignee (technician)
- Previous assignee (if reassigned)
- Property manager (for awareness)

**2. Job Completion**
- When job status changes to `COMPLETED`

**Notification Recipients:**
- Property manager who owns the property
- Property owners (if they exist)

**3. Job Status Changes**
- When status changes to `IN_PROGRESS`
- When status changes to `CANCELLED`

**Notification Recipients:**
- Property manager
- Assigned technician (if status changed by manager)

### API Changes

**No new endpoints needed** - integrate into existing endpoints:

#### POST /api/jobs (Create Job)
```javascript
// After job creation
if (job.assignedToId) {
  await notifyJobAssigned(job, assignedUser, property);
}
```

#### PATCH /api/jobs/:id (Update Job)
```javascript
// After job update
if (updates.assignedToId && updates.assignedToId !== existingJob.assignedToId) {
  // Notify new assignee
  if (updates.assignedToId) {
    await notifyJobAssigned(updatedJob, newAssignee, property);
  }
  
  // Notify previous assignee of reassignment
  if (existingJob.assignedToId) {
    await notifyJobReassigned(existingJob, previousAssignee);
  }
}

if (updates.status === 'COMPLETED' && existingJob.status !== 'COMPLETED') {
  await notifyJobCompleted(updatedJob, property, propertyManager);
}

if (updates.status === 'IN_PROGRESS' && existingJob.status !== 'IN_PROGRESS') {
  await notifyJobStarted(updatedJob, propertyManager);
}
```

### Notification Service Functions

**Existing Functions (Already Implemented):**
- ✅ `notifyJobAssigned(job, technician, property)`
- ✅ `notifyJobCompleted(job, property, manager)`

**New Functions Needed:**
- `notifyJobReassigned(job, previousTechnician, newTechnician)`
- `notifyJobStarted(job, manager)`
- `notifyJobCancelled(job, technician, manager)`

### Data Flow

```
User creates/updates job
  ↓
Backend validates and saves job
  ↓
Check for notification triggers
  ↓
Call appropriate notification function
  ↓
Notification service creates in-app notification
  ↓
Notification service sends email (if enabled)
  ↓
Return success to user
  ↓
Frontend shows success message
```

### Frontend Changes

**Notification Bell Icon (Already Exists):**
- Shows unread count badge
- Dropdown with recent notifications
- Click to mark as read
- Link to entity (job detail page)

**Real-time Updates (Future Enhancement):**
- WebSocket connection for instant notifications
- Browser push notifications
- Sound/visual alerts

### Email Templates

**Job Assigned Email:**
```
Subject: New Job Assigned: [Job Title]

Hi [Technician Name],

You have been assigned to a new job:

Job: [Job Title]
Property: [Property Name]
Address: [Property Address]
Priority: [Priority]
Scheduled: [Scheduled Date]

Description:
[Job Description]

View Job: [Link to Job Detail]

Thanks,
BuildState Team
```

**Job Completed Email:**
```
Subject: Job Completed: [Job Title]

Hi [Manager Name],

A job has been completed:

Job: [Job Title]
Property: [Property Name]
Completed By: [Technician Name]
Completed At: [Completion Date]
Actual Cost: $[Actual Cost]

Notes:
[Technician Notes]

View Job: [Link to Job Detail]

Thanks,
BuildState Team
```

## Implementation Plan

### Phase 1: Backend Integration
1. Import notification service in jobs.js
2. Add notification calls after job creation
3. Add notification calls after job updates
4. Add error handling (don't fail job operations if notifications fail)
5. Add logging for notification events

### Phase 2: New Notification Functions
1. Implement `notifyJobReassigned`
2. Implement `notifyJobStarted`
3. Implement `notifyJobCancelled`
4. Add email templates for new notification types

### Phase 3: Testing
1. Unit tests for notification triggers
2. Integration tests for notification flow
3. Manual testing across all user roles
4. Email delivery testing

### Phase 4: Monitoring
1. Add metrics for notification delivery
2. Track notification open rates
3. Monitor email bounce rates
4. Alert on notification failures

## Performance Considerations

**Async Notifications:**
- Notifications should not block job operations
- Use try-catch to prevent notification failures from failing job updates
- Log errors but continue execution

**Email Rate Limiting:**
- Respect email service rate limits
- Queue emails if necessary
- Batch notifications for multiple events

**Database Load:**
- Notifications use indexed queries (userId, isRead, createdAt)
- Minimal impact on job operations
- Consider archiving old notifications

## Security Considerations

**Access Control:**
- Only notify users who have access to the job
- Don't expose sensitive information in notifications
- Validate user permissions before sending

**Email Security:**
- Use secure email service (SendGrid, AWS SES)
- Include unsubscribe links
- Respect user notification preferences

**Data Privacy:**
- Don't include sensitive data in email subject lines
- Use secure links with authentication
- Comply with GDPR/privacy regulations

## Rollout Strategy

### Phase 1: Soft Launch (Week 1)
- Enable for internal team only
- Monitor notification delivery
- Gather feedback on content and timing

### Phase 2: Beta Release (Week 2)
- Enable for 25% of users
- Monitor metrics and user feedback
- Adjust notification content if needed

### Phase 3: Full Release (Week 3)
- Enable for all users
- Announce feature in changelog
- Provide user guide for notification settings

### Feature Flag
```javascript
{
  "jobNotifications": {
    "enabled": true,
    "emailEnabled": true,
    "notifyOnAssignment": true,
    "notifyOnCompletion": true,
    "notifyOnStatusChange": true
  }
}
```

## Success Metrics

**Adoption:**
- % of users who receive notifications
- % of notifications that are read
- Average time to read notification

**Engagement:**
- Click-through rate on notification links
- Time from notification to action
- User satisfaction scores

**Performance:**
- Notification delivery time < 5 seconds
- Email delivery rate > 95%
- Zero failed job operations due to notifications

## Risks & Mitigations

**Risk 1: Notification spam**
- Mitigation: Allow users to configure notification preferences
- Mitigation: Batch multiple notifications
- Mitigation: Implement quiet hours

**Risk 2: Email deliverability issues**
- Mitigation: Use reputable email service
- Mitigation: Monitor bounce rates
- Mitigation: Implement retry logic

**Risk 3: Performance impact**
- Mitigation: Make notifications async
- Mitigation: Use try-catch to prevent failures
- Mitigation: Monitor database performance

**Risk 4: Notification fatigue**
- Mitigation: Only send important notifications
- Mitigation: Allow granular control
- Mitigation: Provide digest option

## Follow-up Work

**Short-term:**
- User notification preferences page
- Notification history page
- Bulk notification actions

**Medium-term:**
- WebSocket for real-time updates
- Browser push notifications
- Mobile app notifications

**Long-term:**
- AI-powered notification prioritization
- Smart notification batching
- Integration with external tools (Slack, Teams)
