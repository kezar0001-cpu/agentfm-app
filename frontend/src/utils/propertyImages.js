import { API_BASE } from '../lib/auth.js';

const PLACEHOLDER_BASE = 'https://placehold.co';

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

  const placeholderParts = normalizePlaceholderValue(trimmedValue);
  if (placeholderParts) {
    const targetSize = placeholderParts.size || size;
    const text = placeholderParts.text || name || 'Property';
    return buildPropertyPlaceholder(text, targetSize);
  }

  if (/^https?:\/\//i.test(trimmedValue) || trimmedValue.startsWith('data:')) {
    return trimmedValue;
  }

  const normalised = trimmedValue.startsWith('/') ? trimmedValue : `/${trimmedValue}`;
  return `${API_BASE}${normalised}`;
};

