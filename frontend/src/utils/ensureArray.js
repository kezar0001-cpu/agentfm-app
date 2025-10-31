export const ensureArray = (payload, keys = ['data', 'items', 'results']) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    for (const key of keys) {
      const value = payload[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
};

export default ensureArray;
