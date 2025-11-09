// frontend/src/hooks/usePropertyImages.js
import useApiQuery from './useApiQuery.js';
import useApiMutation from './useApiMutation.js';
import { queryKeys } from '../utils/queryKeys.js';

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
 * Bug Fix: Added invalidateKeys to automatically refresh data after mutation
 * This prevents stale cache data and eliminates need for manual refetch()
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useAddPropertyImage(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/images`,
    method: 'post',
    invalidateKeys: [
      ['propertyImages', propertyId],
      queryKeys.properties.detail(propertyId),
      queryKeys.properties.all(),
    ],
    onSuccess,
  });
}

/**
 * Hook to update a property image
 * Bug Fix: Added invalidateKeys to automatically refresh data after mutation
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useUpdatePropertyImage(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/images`,
    method: 'patch',
    invalidateKeys: [
      ['propertyImages', propertyId],
      queryKeys.properties.detail(propertyId),
      queryKeys.properties.all(),
    ],
    onSuccess,
  });
}

/**
 * Hook to delete a property image
 * Bug Fix: Added invalidateKeys to automatically refresh data after mutation
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useDeletePropertyImage(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/images`,
    method: 'delete',
    invalidateKeys: [
      ['propertyImages', propertyId],
      queryKeys.properties.detail(propertyId),
      queryKeys.properties.all(),
    ],
    onSuccess,
  });
}

/**
 * Hook to reorder property images
 * Bug Fix: Added invalidateKeys to automatically refresh data after mutation
 * @param {string} propertyId - Property ID
 * @param {function} onSuccess - Success callback
 */
export function useReorderPropertyImages(propertyId, onSuccess) {
  return useApiMutation({
    url: `/properties/${propertyId}/images/reorder`,
    method: 'post',
    invalidateKeys: [
      ['propertyImages', propertyId],
      queryKeys.properties.detail(propertyId),
    ],
    onSuccess,
  });
}
