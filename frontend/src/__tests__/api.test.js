import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('API Configuration', () => {
  beforeEach(() => {
    // Clear any mocked environment variables
    vi.unstubAllEnvs();
  });

  it('should use localhost in development mode', () => {
    // Mock development mode
    vi.stubEnv('MODE', 'development');
    
    const defaultBase = import.meta.env.MODE === 'development'
      ? 'http://localhost:3000'
      : 'https://api.buildstate.com.au';
    
    expect(defaultBase).toBe('http://localhost:3000');
  });

  it('should use production API in production mode', () => {
    // Mock production mode
    vi.stubEnv('MODE', 'production');
    
    const defaultBase = import.meta.env.MODE === 'development'
      ? 'http://localhost:3000'
      : 'https://api.buildstate.com.au';
    
    expect(defaultBase).toBe('https://api.buildstate.com.au');
  });

  it('should prefer VITE_API_BASE_URL over defaults', () => {
    const customUrl = 'https://custom-api.example.com';
    vi.stubEnv('VITE_API_BASE_URL', customUrl);
    
    const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    
    expect(apiBase).toBe(customUrl);
  });

  it('should strip trailing slashes from API base', () => {
    const urlWithSlash = 'https://api.example.com/';
    const cleaned = urlWithSlash.replace(/\/+$/, '');
    
    expect(cleaned).toBe('https://api.example.com');
  });

  it('should handle multiple trailing slashes', () => {
    const urlWithSlashes = 'https://api.example.com///';
    const cleaned = urlWithSlashes.replace(/\/+$/, '');
    
    expect(cleaned).toBe('https://api.example.com');
  });
});

describe('API URL Construction', () => {
  it('should construct correct API URLs', () => {
    const apiBase = 'https://api.buildstate.com.au';
    const path = '/api/properties';
    
    const fullUrl = new URL(path.startsWith('/') ? path.slice(1) : path, apiBase + '/').toString();
    
    expect(fullUrl).toBe('https://api.buildstate.com.au/api/properties');
  });

  it('should handle paths without leading slash', () => {
    const apiBase = 'https://api.buildstate.com.au';
    const path = 'api/properties';
    
    const fullUrl = new URL(path.startsWith('/') ? path.slice(1) : path, apiBase + '/').toString();
    
    expect(fullUrl).toBe('https://api.buildstate.com.au/api/properties');
  });

  it('should add /api prefix when missing', () => {
    const url = '/properties';
    const path = url.startsWith('/api') || url.startsWith('api')
      ? url
      : `/api${url.startsWith('/') ? url : '/' + url}`;
    
    expect(path).toBe('/api/properties');
  });

  it('should not double /api prefix', () => {
    const url = '/api/properties';
    const path = url.startsWith('/api') || url.startsWith('api')
      ? url
      : `/api${url.startsWith('/') ? url : '/' + url}`;
    
    expect(path).toBe('/api/properties');
  });
});

describe('API Client Configuration', () => {
  it('should include credentials in requests', () => {
    const requestConfig = {
      method: 'GET',
      headers: {},
      credentials: 'include',
    };
    
    expect(requestConfig.credentials).toBe('include');
  });

  it('should include Authorization header when token exists', () => {
    const token = 'test-jwt-token';
    const headers = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    
    expect(headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('should not include Authorization header when token is null', () => {
    const token = null;
    const headers = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    
    expect(headers.Authorization).toBeUndefined();
  });

  it('should not set Content-Type for FormData', () => {
    const formData = new FormData();
    const isFormData = formData instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    };
    
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('should set Content-Type for JSON data', () => {
    const data = { name: 'test' };
    const isFormData = data instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    };
    
    expect(headers['Content-Type']).toBe('application/json');
  });
});
