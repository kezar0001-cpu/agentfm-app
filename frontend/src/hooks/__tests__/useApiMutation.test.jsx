import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useApiMutation from '../useApiMutation.js';
import { apiClient } from '../../api/client.js';

vi.mock('../../api/client.js', () => ({
  apiClient: {
    request: vi.fn(),
  },
}));

const createTestClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
};

describe('useApiMutation', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.request.mockResolvedValue({ data: { ok: true } });
  });

  it('invalidates provided query keys after a successful mutation', async () => {
    const { queryClient, wrapper } = createTestClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () =>
        useApiMutation({
          url: '/test',
          invalidateKeys: [
            ['properties'],
            () => ['properties', 'detail'],
          ],
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({ data: { name: 'Example' } });
    });

    expect(apiClient.request).toHaveBeenCalledWith({
      url: '/test',
      method: 'post',
      data: { name: 'Example' },
      headers: undefined,
      params: undefined,
      withCredentials: undefined,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['properties'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['properties', 'detail'] });
  });

  it('supports invalidate keys provided as objects', async () => {
    const { queryClient, wrapper } = createTestClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () =>
        useApiMutation({
          url: '/another',
          invalidateKeys: [
            null,
            { queryKey: ['custom'] },
          ],
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['custom'] });
  });
});

