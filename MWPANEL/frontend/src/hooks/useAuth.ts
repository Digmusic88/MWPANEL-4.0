import { useAuthStore } from '@store/authStore';

// Real useAuth hook using Zustand auth store with accessToken
export const useAuth = () => {
  const { user, isAuthenticated, isLoading, accessToken } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    accessToken
  };
};