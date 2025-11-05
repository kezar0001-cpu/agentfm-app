// frontend/src/hooks/usePropertyImages.js
import useApiQuery from './useApiQuery.js';
import useApiMutation from './useApiMutation.js';

/**
 * Hook to fetch property images
 * @param {string} propertyId - Property ID
 * @param {boolean} enabled - Whether to enable the query
 */
export function usePropertyImages(propertyId, enabled = true) {
  return useApiQuery({
    queryKey: ['propertyImages', propertyId],
    url: propertyId ? `/properties/${propertyId}/images` : null,
    enabled: enabled && !!propertyId,
  });
}

/**
 * Hook to add a property image
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useAddPropertyImage(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/images`,
    method: 'post',
    onSuccess,
  });
}

/**
 * Hook to update a property image
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useUpdatePropertyImage(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/images`,
    method: 'patch',
    onSuccess,
  });
}

/**
 * Hook to delete a property image
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useDeletePropertyImage(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/images`,
    method: 'delete',
    onSuccess,
  });
}

/**
 * Hook to reorder property images
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useReorderPropertyImages(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/images/reorder`,
    method: 'post',
    onSuccess,
  });
}
