# Design: Service Request Detail View

## Problem Statement

### Critical Workflow Blocker

Service requests are the **primary entry point** for maintenance work in the property management workflow, but users cannot view full request details:

**Current State:**
- ✅ Backend: GET / (list), POST /, PATCH /:id, POST /:id/convert-to-job
- ❌ Backend: **Missing GET /:id** endpoint
- ❌ Frontend: No detail modal/page - cards show truncated info only
- ⚠️ **UX Issue**: Cards have hover effects suggesting clickability but nothing happens

**Impact:**
- **Truncated descriptions**: Users see "...more" but cannot click to view full text
- **No photo viewing**: Photos array exists in data model but no way to view them
- **No review history**: Cannot see reviewNotes or reviewedAt timestamp
- **Uninformed decisions**: Managers must approve/reject from truncated 100-char preview
- **Data loss**: Information uploaded by tenants is never viewable

### User Journey Blocked

**Scenario:** Property Manager reviews tenant service request

1. ✅ Tenant submits service request with photos and detailed description
2. ✅ Manager sees request in list with truncated description (100 chars)
3. ✅ Manager wants to review full details before approving
4. ❌ **BLOCKED**: No way to view full request details
5. ❌ **BLOCKED**: Cannot see attached photos to assess severity
6. ❌ **BLOCKED**: Cannot view review history or notes
7. Manager makes uninformed decision or manually contacts tenant

**Comparison with Similar Features:**
- Jobs: ✅ Have GET /:id endpoint + JobDetailModal component
- Inspections: ✅ Have GET /:id endpoint + InspectionDetailPage
- Units: ✅ Have GET /:id endpoint + UnitDetailPage (just implemented)
- Service Requests: ❌ Only list endpoint, no detail view

---

## Proposed Solution

### Overview

Implement **Service Request Detail Modal** with full request information:

1. **Backend**: Add GET /:id endpoint to fetch individual request details
2. **Frontend**: Create ServiceRequestDetailModal component
3. **Integration**: Add onClick handlers to cards in ServiceRequestsPage

### User Experience

#### Service Request Detail Modal

```
┌─────────────────────────────────────────────────────────┐
│ Service Request Details                          [✕]    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Leaky Faucet in Kitchen                                │
│  [UNDER_REVIEW] [PLUMBING] [HIGH]                       │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Description                                      │   │
│  │                                                   │   │
│  │ The kitchen faucet has been leaking for 3 days. │   │
│  │ Water is dripping constantly even when fully    │   │
│  │ closed. The leak is getting worse and starting  │   │
│  │ to damage the cabinet below. Please fix ASAP.   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Photos (2)                                       │   │
│  │  [📷 faucet-leak.jpg]  [📷 cabinet-damage.jpg]  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Details                                          │   │
│  │  Property: Sunset Apartments                     │   │
│  │  Unit: 101                                       │   │
│  │  Requested by: John Doe (john.doe@email.com)    │   │
│  │  Submitted: Oct 28, 2024 at 2:30 PM             │   │
│  │  Priority: HIGH                                  │   │
│  │  Category: PLUMBING                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Review History                                   │   │
│  │  Reviewed by: Jane Smith                         │   │
│  │  Reviewed at: Oct 28, 2024 at 3:15 PM           │   │
│  │  Notes: Approved - urgent repair needed          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Converted Jobs                                   │   │
│  │  • Fix Kitchen Faucet Leak (IN_PROGRESS)        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│         [Approve] [Reject] [Convert to Job] [Close]     │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Design

### 1. Backend API

#### New Endpoint: GET /api/service-requests/:id

**Location**: `backend/src/routes/serviceRequests.js`

**Implementation**:
```javascript
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
    }
    
    // Access control: Check user has access to property
    const hasAccess =
      req.user.role === 'PROPERTY_MANAGER' && request.property.managerId === req.user.id ||
      req.user.role === 'OWNER' && request.property.owners.some(o => o.ownerId === req.user.id) ||
      req.user.role === 'TENANT' && request.requestedById === req.user.id;
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }
    
    res.json({ success: true, request });
  } catch (error) {
    console.error('Error fetching service request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service request',
    });
  }
});
```

**Response Format**:
```json
{
  "success": true,
  "request": {
    "id": "sr_123",
    "title": "Leaky Faucet in Kitchen",
    "description": "The kitchen faucet has been leaking for 3 days...",
    "category": "PLUMBING",
    "priority": "HIGH",
    "status": "UNDER_REVIEW",
    "photos": [
      "https://storage.example.com/faucet-leak.jpg",
      "https://storage.example.com/cabinet-damage.jpg"
    ],
    "reviewNotes": "Approved - urgent repair needed",
    "reviewedAt": "2024-10-28T15:15:00Z",
    "createdAt": "2024-10-28T14:30:00Z",
    "updatedAt": "2024-10-28T15:15:00Z",
    "property": {
      "id": "prop_456",
      "name": "Sunset Apartments",
      "address": "123 Main St",
      "city": "San Francisco",
      "state": "CA"
    },
    "unit": {
      "id": "unit_789",
      "unitNumber": "101"
    },
    "requestedBy": {
      "id": "user_321",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@email.com"
    },
    "jobs": [
      {
        "id": "job_999",
        "title": "Fix Kitchen Faucet Leak",
        "status": "IN_PROGRESS",
        "priority": "HIGH",
        "createdAt": "2024-10-28T15:20:00Z"
      }
    ]
  }
}
```

### 2. Frontend Implementation

#### New Component: ServiceRequestDetailModal

**Location**: `frontend/src/components/ServiceRequestDetailModal.jsx`

**Features:**
- Display full request details
- Photo gallery with lightbox
- Property and unit information
- Requester details
- Review history
- Converted jobs list
- Action buttons (Approve, Reject, Convert to Job)

**Component Structure**:
```javascript
export default function ServiceRequestDetailModal({ requestId, open, onClose }) {
  const queryClient = useQueryClient();
  
  // Fetch request details
  const { data, isLoading, error } = useQuery({
    queryKey: ['service-request', requestId],
    queryFn: async () => {
      const response = await apiClient.get(`/service-requests/${requestId}`);
      return response.data?.request || response.data;
    },
    enabled: open && !!requestId,
  });
  
  // Mutations for actions
  const approveMutation = useMutation({
    mutationFn: (notes) => apiClient.patch(`/service-requests/${requestId}`, {
      status: 'APPROVED',
      reviewNotes: notes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['service-requests']);
      queryClient.invalidateQueries(['service-request', requestId]);
      toast.success('Request approved');
      onClose();
    },
  });
  
  const rejectMutation = useMutation({
    mutationFn: (notes) => apiClient.patch(`/service-requests/${requestId}`, {
      status: 'REJECTED',
      reviewNotes: notes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['service-requests']);
      queryClient.invalidateQueries(['service-request', requestId]);
      toast.success('Request rejected');
      onClose();
    },
  });
  
  const convertMutation = useMutation({
    mutationFn: () => apiClient.post(`/service-requests/${requestId}/convert-to-job`),
    onSuccess: () => {
      queryClient.invalidateQueries(['service-requests']);
      queryClient.invalidateQueries(['service-request', requestId]);
      toast.success('Converted to job');
      onClose();
    },
  });
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Service Request Details</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <DataState isLoading={isLoading} error={error} isEmpty={!data}>
          {data && (
            <Stack spacing={3}>
              {/* Title and Status */}
              <Box>
                <Typography variant="h5" gutterBottom>
                  {data.title}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={data.status} color={getStatusColor(data.status)} />
                  <Chip label={data.category} color={getCategoryColor(data.category)} />
                  {data.priority && <Chip label={data.priority} />}
                </Stack>
              </Box>
              
              {/* Description */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1">{data.description}</Typography>
              </Paper>
              
              {/* Photos */}
              {data.photos && data.photos.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Photos ({data.photos.length})
                  </Typography>
                  <ImageList cols={3} gap={8}>
                    {data.photos.map((photo, index) => (
                      <ImageListItem key={index}>
                        <img src={photo} alt={`Photo ${index + 1}`} loading="lazy" />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Paper>
              )}
              
              {/* Details */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Details
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Property
                    </Typography>
                    <Typography variant="body2">
                      {data.property?.name}
                    </Typography>
                  </Box>
                  {data.unit && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Unit
                      </Typography>
                      <Typography variant="body2">
                        {data.unit.unitNumber}
                      </Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Requested by
                    </Typography>
                    <Typography variant="body2">
                      {data.requestedBy?.firstName} {data.requestedBy?.lastName}
                      <br />
                      {data.requestedBy?.email}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Submitted
                    </Typography>
                    <Typography variant="body2">
                      {formatDateTime(data.createdAt)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
              
              {/* Review History */}
              {data.reviewNotes && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Review History
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reviewed at: {formatDateTime(data.reviewedAt)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {data.reviewNotes}
                  </Typography>
                </Paper>
              )}
              
              {/* Converted Jobs */}
              {data.jobs && data.jobs.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Converted Jobs
                  </Typography>
                  <List dense>
                    {data.jobs.map((job) => (
                      <ListItem key={job.id}>
                        <ListItemText
                          primary={job.title}
                          secondary={`${job.status} • ${formatDateTime(job.createdAt)}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Stack>
          )}
        </DataState>
      </DialogContent>
      
      <DialogActions>
        {data && data.status === 'SUBMITTED' && (
          <>
            <Button onClick={() => handleReject()} color="error">
              Reject
            </Button>
            <Button onClick={() => handleApprove()} color="success">
              Approve
            </Button>
          </>
        )}
        {data && data.status === 'APPROVED' && (
          <Button onClick={() => convertMutation.mutate()} variant="contained">
            Convert to Job
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
```

#### Update ServiceRequestsPage

**Location**: `frontend/src/pages/ServiceRequestsPage.jsx`

**Changes**:
```javascript
// Add state for selected request
const [selectedRequest, setSelectedRequest] = useState(null);

// Add onClick handler to cards
<Card
  sx={{
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s, box-shadow 0.2s',
    borderRadius: 3,
    cursor: 'pointer', // Already exists
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: 4,
    },
  }}
  onClick={() => setSelectedRequest(request.id)} // NEW
>
  {/* existing card content */}
</Card>

// Add modal at end of component
<ServiceRequestDetailModal
  requestId={selectedRequest}
  open={!!selectedRequest}
  onClose={() => setSelectedRequest(null)}
/>
```

---

## Data Model

### Existing Schema (No Changes Needed)

```prisma
model ServiceRequest {
  id            String                 @id @default(cuid())
  title         String
  description   String
  category      ServiceRequestCategory
  priority      JobPriority            @default(MEDIUM)
  status        ServiceRequestStatus   @default(SUBMITTED)
  propertyId    String
  unitId        String?
  requestedById String
  photos        String[]               @default([])
  reviewNotes   String?
  reviewedAt    DateTime?
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt
  
  jobs          Job[]
  property      Property               @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  requestedBy   User                   @relation(fields: [requestedById], references: [id], onDelete: Cascade)
  unit          Unit?                  @relation(fields: [unitId], references: [id])
  
  @@index([propertyId])
  @@index([unitId])
  @@index([requestedById])
  @@index([status])
  @@index([category])
}
```

**All fields already exist** - no migration needed!

---

## Testing Strategy

### Backend Tests

**File**: `backend/test/serviceRequestDetail.test.js`

**Test Cases:**
1. ✅ GET /:id returns request with all relations
2. ✅ GET /:id returns 404 for non-existent request
3. ✅ GET /:id enforces access control (property manager)
4. ✅ GET /:id enforces access control (owner)
5. ✅ GET /:id enforces access control (tenant - own requests only)
6. ✅ GET /:id denies access to unauthorized users
7. ✅ GET /:id includes property details
8. ✅ GET /:id includes unit details
9. ✅ GET /:id includes requester details
10. ✅ GET /:id includes converted jobs

### Frontend Tests

**File**: `frontend/src/__tests__/ServiceRequestDetailModal.test.jsx`

**Test Cases:**
1. ✅ Renders modal with request details
2. ✅ Displays full description (not truncated)
3. ✅ Shows photo gallery
4. ✅ Displays property and unit information
5. ✅ Shows requester details
6. ✅ Displays review history when available
7. ✅ Shows converted jobs list
8. ✅ Approve button works correctly
9. ✅ Reject button works correctly
10. ✅ Convert to job button works correctly
11. ✅ Loading state displays correctly
12. ✅ Error state displays correctly
13. ✅ Close button works
14. ✅ Modal closes after action

**File**: `frontend/src/__tests__/ServiceRequestsPage.test.jsx`

**Test Cases:**
1. ✅ Card onClick opens detail modal
2. ✅ Modal closes when clicking close button
3. ✅ Modal closes when clicking outside
4. ✅ Selected request ID is passed to modal

---

## Performance Considerations

### Backend Optimization

1. **Selective Includes**: Only fetch necessary relations
2. **Indexing**: Existing indexes on propertyId, unitId, requestedById, status
3. **Response Size**: ~2-5KB per request (reasonable)

### Frontend Optimization

1. **Lazy Loading**: Modal only fetches data when opened
2. **Query Caching**: React Query caches for 5 minutes
3. **Image Optimization**: Use lazy loading for photos
4. **Bundle Size**: ~5KB additional (modal component)

---

## Accessibility

### WCAG AA Compliance

- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Screen reader support (ARIA labels)
- ✅ Focus management (trap focus in modal)
- ✅ Color contrast (Material-UI defaults)
- ✅ Semantic HTML (proper heading hierarchy)

### Keyboard Shortcuts

- **Enter**: Open detail modal (when card focused)
- **Escape**: Close modal
- **Tab**: Navigate through modal elements

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API errors during fetch | Low | Low | Comprehensive error handling, retry logic |
| Large photo arrays slow loading | Low | Medium | Lazy load images, pagination if needed |
| Access control bypass | Very Low | High | Thorough testing of all user roles |

### User Experience Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Users confused by modal | Very Low | Low | Clear title, close button, familiar pattern |
| Photos don't load | Low | Low | Fallback image, error message |
| Modal too large on mobile | Low | Medium | Responsive design, scrollable content |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Feature not discovered | Low | Medium | Existing hover effect suggests clickability |
| Performance issues | Very Low | Low | Optimized queries, caching |

---

## Implementation Estimate

### Time Breakdown

1. **Backend Endpoint** (1 hour)
   - Add GET /:id route
   - Implement access control
   - Write tests

2. **Frontend Modal** (2 hours)
   - Create ServiceRequestDetailModal component
   - Implement photo gallery
   - Add action buttons
   - Write tests

3. **Integration** (30 minutes)
   - Add onClick handlers to cards
   - Test full workflow

4. **Testing & QA** (30 minutes)
   - Run full test suite
   - Manual testing
   - Accessibility check

**Total**: 4 hours

---

## Success Metrics

### Quantitative

- **Adoption Rate**: 80%+ of managers click to view details within 1 week
- **Error Rate**: <1% of detail view requests fail
- **Performance**: Modal opens in <500ms
- **Photo Views**: 50%+ of requests with photos have photos viewed

### Qualitative

- **User Satisfaction**: Positive feedback from property managers
- **Workflow Efficiency**: Reduced time to review requests
- **Decision Quality**: Better-informed approve/reject decisions
- **Support Tickets**: Reduced questions about request details

---

## Future Enhancements

### Phase 2 Features

1. **Photo Annotations**
   - Draw on photos to highlight issues
   - Add text notes to specific areas

2. **Request History**
   - View all requests for a unit
   - Track recurring issues

3. **Bulk Actions**
   - Approve/reject multiple requests
   - Batch convert to jobs

4. **Priority Suggestions**
   - AI-based priority recommendations
   - Based on description and photos

5. **Tenant Communication**
   - In-app messaging about request
   - Status update notifications

---

## Conclusion

The **Service Request Detail View** is a critical missing feature because:

1. ✅ **Blocks core workflow**: Tenant request → Manager review → Job creation
2. ✅ **Causes data loss**: Photos and full descriptions never viewable
3. ✅ **Inconsistent UX**: Jobs, inspections, units all have detail views
4. ✅ **Easy to implement**: 4 hours, proven pattern from other features
5. ✅ **High user frustration**: Cards look clickable but aren't

**Recommendation**: Implement immediately as highest-priority feature.
