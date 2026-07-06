import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import api from '../services/apiClient';
import { AxiosError } from 'axios';

// Generic type-safe query hook
export function useApiQuery<TData = unknown>(
  key: string | string[],
  url: string,
  options?: Omit<UseQueryOptions<TData, AxiosError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, AxiosError>({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: async () => {
      const { data } = await api.get<TData>(url);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

// Generic type-safe mutation hook
export function useApiMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, AxiosError, TVariables>
) {
  return useMutation<TData, AxiosError, TVariables>({
    mutationFn,
    ...options,
  });
}

// Specialized hooks for common operations
export const useApiGet = <TData = unknown>(
  key: string | string[],
  url: string,
  options?: Omit<UseQueryOptions<TData, AxiosError>, 'queryKey' | 'queryFn'>
) => useApiQuery<TData>(key, url, options);

export const useApiPost = <TData = unknown, TVariables = unknown>(
  url: string,
  options?: UseMutationOptions<TData, AxiosError, TVariables>
) => {
  return useApiMutation<TData, TVariables>(
    async (data) => {
      const response = await api.post<TData>(url, data);
      return response.data;
    },
    options
  );
};

export const useApiPut = <TData = unknown, TVariables = unknown>(
  url: string,
  options?: UseMutationOptions<TData, AxiosError, TVariables>
) => {
  return useApiMutation<TData, TVariables>(
    async (data) => {
      const response = await api.put<TData>(url, data);
      return response.data;
    },
    options
  );
};

export const useApiDelete = <TData = unknown>(
  url: string,
  options?: UseMutationOptions<TData, AxiosError, void>
) => {
  return useApiMutation<TData, void>(
    async () => {
      const response = await api.delete<TData>(url);
      return response.data;
    },
    options
  );
};

// Hook for paginated queries
export function usePaginatedApi<TData = unknown>(
  key: string,
  baseUrl: string,
  page: number = 1,
  pageSize: number = 10,
  filters?: Record<string, any>
) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: pageSize.toString(),
    ...filters,
  });

  return useApiQuery<TData>(
    [key, page, pageSize, filters],
    `${baseUrl}?${queryParams.toString()}`,
    {
      keepPreviousData: true,
    }
  );
}

// Hook with automatic refetch on window focus
export function useApiWithRefresh<TData = unknown>(
  key: string | string[],
  url: string,
  refetchInterval?: number
) {
  return useApiQuery<TData>(key, url, {
    refetchOnWindowFocus: true,
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}

// Hook with error handling
export function useApiWithErrorHandling<TData = unknown>(
  key: string | string[],
  url: string,
  onError?: (error: AxiosError) => void
) {
  return useApiQuery<TData>(key, url, {
    onError: (error) => {
      console.error(`API Error for ${url}:`, error);
      onError?.(error);
    },
  });
}