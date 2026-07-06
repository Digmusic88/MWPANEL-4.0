import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/apiClient';
import { useAuth } from './useAuth';

interface UnreadCountResponse {
  unreadCount: number;
}

interface MarkReadResponse {
  markedAsViewed: number;
}

/**
 * Hook to get and manage unread blog posts count for the current user.
 * Used for displaying notification badges in the navigation menu.
 */
export function useUnreadBlogPosts() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Query for unread posts count
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<UnreadCountResponse>({
    queryKey: ['blog-unread-count'],
    queryFn: async () => {
      const response = await api.get('/blog-posts/unread/count');
      return response.data;
    },
    enabled: isAuthenticated && !!user,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 1,
    refetchOnWindowFocus: true,
  });

  // Mutation to mark all posts as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/blog-posts/mark-all-read');
      return response.data as MarkReadResponse;
    },
    onSuccess: () => {
      // Invalidate and refetch the unread count
      queryClient.invalidateQueries({ queryKey: ['blog-unread-count'] });
    },
  });

  // Mutation to mark a specific post as read
  const markAsReadMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await api.post(`/blog-posts/${postId}/mark-read`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch the unread count
      queryClient.invalidateQueries({ queryKey: ['blog-unread-count'] });
    },
  });

  return {
    unreadCount: data?.unreadCount || 0,
    isLoading,
    error,
    refetch,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    markAsRead: markAsReadMutation.mutateAsync,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isMarkingAsRead: markAsReadMutation.isPending,
  };
}
