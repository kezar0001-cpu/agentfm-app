export const ensureArray = (payload, keys = ['data', 'items', 'results']) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    for (const key of keys) {
      // Support nested paths like 'data.items'
      if (key.includes('.')) {
        const parts = key.split('.');
        let value = payload;
        for (const part of parts) {
          value = value?.[part];
          if (value === undefined || value === null) break;
        }
        if (Array.isArray(value)) {
          return value;
        }
      } else {
        const value = payload[key];
        if (Array.isArray(value)) {
          return value;
        }
      }
    }
  }

  return [];
};

export default ensureArray;
