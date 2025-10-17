/**
 * Ensures the input is always returned as an array
 * @param {*} data - The data to normalize
 * @returns {Array} - Always returns an array
 */
export function normaliseArray(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (data === null || data === undefined) {
    return [];
  }

  if (typeof data === 'object') {
    const preferredKeys = [
      'data',
      'items',
      'results',
      'rows',
      'properties',
      'units',
      'plans',
      'subscriptions',
      'recommendations',
    ];

    for (const key of preferredKeys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }

    const firstArrayValue = Object.values(data).find((value) => Array.isArray(value));
    if (firstArrayValue) {
      return firstArrayValue;
    }
  }

  return [data];
}
