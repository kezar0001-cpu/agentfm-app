import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';

export default function useApiMutation({ url, method = 'post', invalidateKeys = [], onSuccess }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables) => {
      const response = await api.request({
        url,
        method,
        ...variables,
      });
      return response.data;
    },
    onSuccess: async (data, variables, context) => {
      await Promise.all(
        invalidateKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
      );
      if (onSuccess) {
        onSuccess(data, variables, context);
      }
    },
  });
}
