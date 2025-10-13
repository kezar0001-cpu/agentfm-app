import { API_BASE } from '../lib/auth.js';

export const buildPropertyPlaceholder = (name = 'Property', size = '600x320') => {
  return `https://via.placeholder.com/${size}?text=${encodeURIComponent(name || 'Property')}`;
};

export const resolvePropertyImageUrl = (value, name, size = '600x320') => {
  const placeholder = buildPropertyPlaceholder(name, size);
  if (!value) return placeholder;
  if (typeof value !== 'string') return placeholder;

  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }

  if (/^\d+x\d+\?text=/i.test(value)) {
    return `https://via.placeholder.com/${value}`;
  }

  const normalised = value.startsWith('/') ? value : `/${value}`;
  return `${API_BASE}${normalised}`;
};

