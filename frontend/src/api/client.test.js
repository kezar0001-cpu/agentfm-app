import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { Blob } from 'node:buffer';

vi.mock('../lib/auth.js', () => ({
  getAuthToken: vi.fn(() => null),
  removeAuthToken: vi.fn(),
  saveAuthToken: vi.fn(),
}));

let originalWindow;

beforeAll(() => {
  originalWindow = globalThis.window;
  if (!originalWindow) {
    globalThis.window = {
      location: {
        origin: 'http://localhost',
        href: 'http://localhost/',
        pathname: '/',
      },
    };
  } else if (!originalWindow.location) {
    originalWindow.location = {
      origin: 'http://localhost',
      href: 'http://localhost/',
      pathname: '/',
    };
  }
});

afterAll(() => {
  if (!originalWindow) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

describe('apiClient request configuration', () => {
  let apiClient;
  let originalAdapter;

  beforeEach(async () => {
    apiClient = (await import('./client.js')).default;
    originalAdapter = apiClient.defaults.adapter;
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    vi.resetModules();
  });

  it('uses multipart content type when posting FormData', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['content'], { type: 'text/plain' }), 'test.txt');

    let capturedConfig;
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    await apiClient.post('/uploads/multiple', formData);

    const headers = capturedConfig?.headers;
    let contentType;
    if (headers) {
      if (typeof headers.get === 'function') {
        contentType = headers.get('Content-Type') || headers.get('content-type');
      } else {
        contentType = headers['Content-Type'] || headers['content-type'];
      }
    }

    expect(contentType).toBeTruthy();
    expect(contentType).not.toMatch(/application\/json/i);
  });
});
