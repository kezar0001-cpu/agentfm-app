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
  return [data];
}
