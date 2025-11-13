import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import resolveDevProxyTarget, { DEFAULT_DEV_PROXY_TARGET } from '../../config/resolveDevProxyTarget.js';

const ORIGINAL_ENV = process.env.VITE_API_BASE_URL;

describe('resolveDevProxyTarget', () => {
  beforeEach(() => {
    delete process.env.VITE_API_BASE_URL;
  });

  afterEach(() => {
    if (typeof ORIGINAL_ENV === 'undefined') {
      delete process.env.VITE_API_BASE_URL;
    } else {
      process.env.VITE_API_BASE_URL = ORIGINAL_ENV;
    }
  });

  it('defaults to the local backend when no env override is provided', () => {
    expect(resolveDevProxyTarget()).toBe(DEFAULT_DEV_PROXY_TARGET);
  });

  it('uses the configured API base URL when provided', () => {
    process.env.VITE_API_BASE_URL = 'https://example.test/api';
    expect(resolveDevProxyTarget()).toBe('https://example.test/api');
  });

  it('trims whitespace before evaluating the override', () => {
    process.env.VITE_API_BASE_URL = '  https://custom.test  ';
    expect(resolveDevProxyTarget()).toBe('https://custom.test');
  });

  it('falls back to default when the override is blank after trimming', () => {
    process.env.VITE_API_BASE_URL = '   ';
    expect(resolveDevProxyTarget()).toBe(DEFAULT_DEV_PROXY_TARGET);
  });
});
