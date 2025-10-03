import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';

export default function useApiQuery({ queryKey, url, method = 'get', data, params, enabled = true, select, placeholderData }) {
  return useQuery({
    queryKey,
    enabled,
    placeholderData,
    select,
    queryFn: async () => {
      const response = await api.request({
        url,
        method,
        data,
        params,
      });
      return response.data;
    },
  });
}
