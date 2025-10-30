# Property Detail Page - Comprehensive Bug Fix Plan

## Executive Summary

Comprehensive analysis identified **31 bugs** across PropertyDetailPage workflow. This document outlines a phased approach to fix all issues systematically.

---

## Bug Categorization by Severity

### CRITICAL (5 bugs) - Causes crashes or data loss
1. **Race condition on property ID changes** - Stale data, wrong dialogs
2. **Memory leak in useApiQuery** - setState on unmounted components
3. **Unsafe array access for tenant data** - App crashes
4. **Delete dialog allows deletion of occupied units** - Data integrity violation
5. **Infinite loop potential in useApiQuery** - Browser freeze

### HIGH (10 bugs) - Major functionality/UX issues
6. **Activity query enabled condition bug** - Data never loads
7. **String replace only replaces first underscore** - Incorrect display
8. **Missing error handling in delete mutation** - Silent failures
9. **Falsy checks for numeric values** - 0 values don't display
10. **Cache invalidation not implemented** - Stale data everywhere
11. **No cache invalidation strategy** - Manual refetch required
12. **Mutation doesn't invalidate property query** - Stale counts
13. **PropertyForm doesn't refetch units** - Inconsistent state
14. **UnitForm state management issue** - Flash of wrong data
15. **Status color mapping incomplete** - Unknown statuses show gray

### MEDIUM (10 bugs) - Moderate impact on UX
16. **Activity list key generation issue** - React warnings
17. **Date formatting without timezone** - Time confusion
18. **Date formatting without error handling** - "Invalid Date" shown
19. **Menu state not cleared** - Memory leak
20. **Refetch doesn't prevent concurrent requests** - Duplicate requests
21. **Missing error boundary** - Crashes propagate
22. **Missing loading state** - Blank screen
23. **Event propagation issue** - Keyboard accessibility
24. **Owners tab not implemented** - Incomplete feature
25. **Menu accessibility issues** - Screen reader problems

### LOW (6 bugs) - Minor polish issues
26. **Loading state doesn't show what's loading** - Generic spinner
27. **No memoization** - Unnecessary re-renders
28. **Unnecessary re-renders** - Performance impact
29. **No ARIA labels** - Accessibility
30. **No keyboard navigation for cards** - Accessibility
31. **No focus management in dialogs** - Accessibility

---

## Phased Fix Plan

### Phase 1: Critical Fixes (Prevent Crashes)
**Goal**: Eliminate all crash-causing bugs  
**Estimated Time**: 2-3 hours  
**Files**: PropertyDetailPage.jsx, useApiQuery.js

#### Fixes:
1. ✅ Add cleanup to useApiQuery (AbortController)
2. ✅ Fix race condition on property ID changes (useEffect reset)
3. ✅ Fix unsafe tenant data access (optional chaining)
4. ✅ Prevent deletion of occupied units (disable button)
5. ✅ Fix infinite loop in useApiQuery (use ref)

#### Tests:
- Test rapid navigation between properties
- Test deleting unit with active tenants
- Test unmounting during data fetch
- Test with missing tenant data

---

### Phase 2: Data Consistency Fixes
**Goal**: Ensure data stays in sync  
**Estimated Time**: 2-3 hours  
**Files**: PropertyDetailPage.jsx, useApiMutation.js

#### Fixes:
6. ✅ Implement proper cache invalidation
7. ✅ Fix activity query enabled condition
8. ✅ Add error handling to delete mutation
9. ✅ Fix PropertyForm to refetch units
10. ✅ Fix mutation to invalidate property query
11. ✅ Fix UnitForm state management

#### Tests:
- Test editing property updates all data
- Test deleting unit updates counts
- Test activity tab loads on bookmark
- Test error states in dialogs

---

### Phase 3: Display and UX Fixes
**Goal**: Fix visual bugs and improve UX  
**Estimated Time**: 2-3 hours  
**Files**: PropertyDetailPage.jsx

#### Fixes:
12. ✅ Fix string replace for underscores (use regex)
13. ✅ Fix falsy checks for numeric values (use != null)
14. ✅ Fix status color mapping (add missing statuses)
15. ✅ Fix activity list key generation (unique keys)
16. ✅ Fix date formatting (timezone + error handling)
17. ✅ Clear menu state properly
18. ✅ Prevent concurrent refetch requests

#### Tests:
- Test with 0 bedrooms, 0 rent, 0 area
- Test with statuses containing multiple underscores
- Test with invalid dates
- Test rapid tab switching

---

### Phase 4: Polish and Accessibility
**Goal**: Improve accessibility and performance  
**Estimated Time**: 2-3 hours  
**Files**: PropertyDetailPage.jsx, DataState.jsx

#### Fixes:
19. ✅ Add error boundary
20. ✅ Add proper loading states
21. ✅ Fix event propagation for keyboard users
22. ✅ Add ARIA labels
23. ✅ Add keyboard navigation
24. ✅ Add focus management
25. ✅ Add memoization for expensive functions
26. ✅ Improve loading state messages

#### Tests:
- Test keyboard navigation
- Test screen reader compatibility
- Test loading states
- Test error boundary

---

## Implementation Strategy

### Phase 1 Implementation

```javascript
// 1. Fix useApiQuery cleanup
useEffect(() => {
  const abortController = new AbortController();
  
  // ... fetch logic with signal: abortController.signal
  
  return () => {
    abortController.abort();
  };
}, [url, queryKey]);

// 2. Fix race condition
useEffect(() => {
  // Reset all state when property ID changes
  setCurrentTab(0);
  setEditDialogOpen(false);
  setUnitDialogOpen(false);
  setSelectedUnit(null);
  setUnitMenuAnchor(null);
  setDeleteUnitDialogOpen(false);
}, [id]);

// 3. Fix unsafe tenant access
{unit.tenants?.[0]?.tenant && (
  <Typography>
    {unit.tenants[0].tenant.firstName} {unit.tenants[0].tenant.lastName}
  </Typography>
)}

// 4. Prevent deletion of occupied units
<Button
  disabled={
    deleteUnitMutation.isPending || 
    (selectedUnit?.tenants && selectedUnit.tenants.length > 0)
  }
>
  Delete
</Button>

// 5. Fix infinite loop
const isFetchingRef = useRef(false);
const refetch = useCallback(() => {
  if (isFetchingRef.current) return;
  isFetchingRef.current = true;
  // ... fetch logic
  isFetchingRef.current = false;
}, [url]);
```

### Phase 2 Implementation

```javascript
// 6. Implement cache invalidation
const deleteUnitMutation = useApiMutation({
  method: 'delete',
  onSuccess: () => {
    queryClient.invalidateQueries(['units', id]);
    queryClient.invalidateQueries(['property', id]);
  },
});

// 7. Fix activity query
const activityQuery = useApiQuery({
  queryKey: ['property-activity', id],
  url: `/api/properties/${id}/activity?limit=20`,
  // Remove enabled condition or implement proper refetch
});

// 8. Add error handling
const confirmDeleteUnit = async () => {
  if (!selectedUnit) return;
  
  try {
    await deleteUnitMutation.mutateAsync({
      url: `/api/units/${selectedUnit.id}`,
    });
    // Only close and clear on success
    setDeleteUnitDialogOpen(false);
    setSelectedUnit(null);
  } catch (error) {
    // Keep dialog open, show error
    console.error('Failed to delete unit:', error);
  }
};
```

### Phase 3 Implementation

```javascript
// 12. Fix string replace
label={propertyStatus.replace(/_/g, ' ')}

// 13. Fix falsy checks
{unit.bedrooms != null && unit.bathrooms != null && (
  <Typography>{unit.bedrooms} bed • {unit.bathrooms} bath</Typography>
)}

{unit.rentAmount != null && (
  <Typography>${unit.rentAmount.toLocaleString()}/mo</Typography>
)}

// 14. Fix status colors
const STATUS_COLORS = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  UNDER_MAINTENANCE: 'warning',
  UNDER_MAJOR_MAINTENANCE: 'error',
  // ... add all missing statuses
};

// 15. Fix activity keys
key={`${activity.type}-${activity.id}-${activity.date}`}

// 16. Fix date formatting
const formatDate = (date) => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleString();
  } catch {
    return 'Invalid date';
  }
};
```

### Phase 4 Implementation

```javascript
// 19. Add error boundary
<ErrorBoundary fallback={<ErrorFallback />}>
  <PropertyDetailPage />
</ErrorBoundary>

// 20. Add loading states
<DataState
  isLoading={propertyQuery.isLoading}
  loadingMessage="Loading property details..."
  // ...
/>

// 21. Fix keyboard navigation
<Card
  tabIndex={0}
  role="button"
  onKeyPress={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      navigate(`/units/${unit.id}`);
    }
  }}
/>

// 25. Add memoization
const getStatusColor = useCallback((status) => {
  return STATUS_COLORS[status] || 'default';
}, []);
```

---

## Testing Strategy

### Unit Tests
- Test each fix in isolation
- Mock API responses
- Test error conditions
- Test edge cases (null, undefined, 0, empty arrays)

### Integration Tests
- Test full user flows
- Test navigation between properties
- Test CRUD operations
- Test error recovery

### E2E Tests
- Test in real browser
- Test keyboard navigation
- Test screen reader
- Test slow network conditions

---

## Success Criteria

### Phase 1
- ✅ No crashes when navigating between properties
- ✅ No memory leaks (React DevTools Profiler)
- ✅ Cannot delete occupied units
- ✅ No console errors

### Phase 2
- ✅ Data stays in sync after all operations
- ✅ Activity loads on all navigation paths
- ✅ Errors are handled gracefully
- ✅ No stale data displayed

### Phase 3
- ✅ All statuses display correctly
- ✅ 0 values display properly
- ✅ Dates format correctly
- ✅ No React warnings in console

### Phase 4
- ✅ Keyboard navigation works
- ✅ Screen reader announces correctly
- ✅ Loading states are informative
- ✅ Performance is smooth (60fps)

---

## Rollout Plan

1. **Phase 1**: Deploy immediately (critical fixes)
2. **Phase 2**: Deploy after 1 day of testing
3. **Phase 3**: Deploy after 2 days of testing
4. **Phase 4**: Deploy after 3 days of testing

Each phase should be deployed independently to minimize risk.

---

## Monitoring

After each phase deployment:
- Monitor error rates in Sentry
- Check performance metrics
- Review user feedback
- Monitor console errors in production

---

## Future Improvements

After all phases complete:
1. Migrate to React Query
2. Add TypeScript
3. Split component into smaller pieces
4. Add comprehensive test coverage
5. Add Storybook stories
6. Add performance monitoring

---

## Conclusion

This phased approach ensures:
- Critical bugs fixed first
- Each phase is independently testable
- Risk is minimized
- Progress is measurable
- Team can work in parallel

Total estimated time: **8-12 hours** across 4 phases.
