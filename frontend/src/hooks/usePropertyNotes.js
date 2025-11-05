// frontend/src/hooks/usePropertyNotes.js
import useApiQuery from './useApiQuery.js';
import useApiMutation from './useApiMutation.js';

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
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useAddPropertyNote(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/notes`,
    method: 'post',
    onSuccess,
  });
}

/**
 * Hook to update a property note
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useUpdatePropertyNote(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/notes`,
    method: 'patch',
    onSuccess,
  });
}

/**
 * Hook to delete a property note
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useDeletePropertyNote(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/notes`,
    method: 'delete',
    onSuccess,
  });
}
