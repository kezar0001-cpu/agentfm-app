import { API_BASE } from '../lib/auth.js';

const PLACEHOLDER_BASE = 'https://placehold.co';

// Bug Fix #12: Sanitize image URLs to prevent XSS attacks
// Only allow safe URL schemes: http(s), data:image/*, and relative paths
const isSafeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;

  const lowerUrl = url.toLowerCase().trim();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'vbscript:', 'file:', 'about:', 'blob:'];
  if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
    return false;
  }

  // Only allow data URLs for images
  if (lowerUrl.startsWith('data:')) {
    return lowerUrl.startsWith('data:image/');
  }

  // Allow http(s), relative paths, and placeholder URLs
  return true;
};

const sanitizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (!isSafeImageUrl(url)) {
    console.warn('Unsafe image URL blocked:', url);
    return null;
  }
  return url;
};

const normalizePlaceholderValue = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed) && trimmed.includes('via.placeholder.com')) {
    const match = trimmed.match(/via\.placeholder\.com\/(\d+x\d+)(?:\?text=(.*))?/i);
    if (!match) return null;
    return {
      size: match[1],
      text: match[2] ? decodeURIComponent(match[2]) : undefined,
    };
  }

  const inlineMatch = trimmed.match(/^(\d+x\d+)(?:\?text=(.*))?$/i);
  if (inlineMatch) {
    return {
      size: inlineMatch[1],
      text: inlineMatch[2] ? decodeURIComponent(inlineMatch[2]) : undefined,
    };
  }

  return null;
};

export const buildPropertyPlaceholder = (name = 'Property', size = '600x320') => {
  const label = name && name.trim().length > 0 ? name.trim() : 'Property';
  return `${PLACEHOLDER_BASE}/${size}?text=${encodeURIComponent(label)}`;
};

export const resolvePropertyImageUrl = (value, name, size = '600x320') => {
  const placeholder = buildPropertyPlaceholder(name, size);
  if (!value) return placeholder;
  if (typeof value !== 'string') return placeholder;

  const trimmedValue = value.trim();
  if (!trimmedValue) return placeholder;

  // Bug Fix #12: Sanitize URL before processing
  const sanitizedValue = sanitizeImageUrl(trimmedValue);
  if (!sanitizedValue) return placeholder;

  const placeholderParts = normalizePlaceholderValue(sanitizedValue);
  if (placeholderParts) {
    const targetSize = placeholderParts.size || size;
    const text = placeholderParts.text || name || 'Property';
    return buildPropertyPlaceholder(text, targetSize);
  }

  if (/^https?:\/\//i.test(sanitizedValue) || sanitizedValue.startsWith('data:image/')) {
    return sanitizedValue;
  }

  const normalised = sanitizedValue.startsWith('/') ? sanitizedValue : `/${sanitizedValue}`;
  return `${API_BASE}${normalised}`;
};

