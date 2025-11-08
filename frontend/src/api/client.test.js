import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import apiClient from './client.js';

const originalAdapter = apiClient.defaults.adapter;

describe('apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('does not send JSON content type when posting FormData', async () => {
    const adapterSpy = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      request: {},
    }));

    apiClient.defaults.adapter = adapterSpy;

    const formData = new FormData();
    formData.append('file', 'hello');

    await apiClient.post('/uploads/multiple', formData);

    expect(adapterSpy).toHaveBeenCalledTimes(1);
    const requestConfig = adapterSpy.mock.calls[0][0];
    const headers = requestConfig.headers || {};

    const rawHeaders = typeof headers.toJSON === 'function' ? headers.toJSON() : headers;
    const contentType = rawHeaders['Content-Type'] || rawHeaders['content-type'];

    expect(contentType).not.toBe('application/json');
  });
});
