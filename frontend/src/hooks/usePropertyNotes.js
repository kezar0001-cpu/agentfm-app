// frontend/src/hooks/usePropertyNotes.js
import useApiQuery from './useApiQuery.js';
import useApiMutation from './useApiMutation.js';
import { queryKeys } from '../utils/queryKeys.js';

/**
 * Hook to fetch property notes
 * @param {string} propertyId - Property ID
 * @param {boolean} enabled - Whether to enable the query
 */
export function usePropertyNotes(propertyId, enabled = true) {
  return useApiQuery({
    queryKey: ['propertyNotes', propertyId],
    url: propertyId ? `/properties/${propertyId}/notes` : null,
    enabled: enabled && !!propertyId,
  });
}

/**
 * Hook to add a property note
 * Bug Fix: Added invalidateKeys to automatically refresh data after mutation
 * This prevents stale cache data and eliminates need for manual refetch()
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useAddPropertyNote(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/notes`,
    method: 'post',
    invalidateKeys: [
      ['propertyNotes', propertyId],
      queryKeys.properties.detail(propertyId),
      queryKeys.properties.activity(propertyId),
    ],
    onSuccess,
  });
}

/**
 * Hook to update a property note
 * Bug Fix: Added invalidateKeys to automatically refresh data after mutation
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useUpdatePropertyNote(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/notes`,
    method: 'patch',
    invalidateKeys: [
      ['propertyNotes', propertyId],
      queryKeys.properties.detail(propertyId),
      queryKeys.properties.activity(propertyId),
    ],
    onSuccess,
  });
}

/**
 * Hook to delete a property note
 * Bug Fix: Added invalidateKeys to automatically refresh data after mutation
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useDeletePropertyNote(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/notes`,
    method: 'delete',
    invalidateKeys: [
      ['propertyNotes', propertyId],
      queryKeys.properties.detail(propertyId),
      queryKeys.properties.activity(propertyId),
    ],
    onSuccess,
  });
}
