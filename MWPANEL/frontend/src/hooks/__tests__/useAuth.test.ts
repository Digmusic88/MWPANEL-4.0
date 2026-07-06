import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../useAuth';
import { authStore } from '@/store/authStore';
import { apiClient } from '@/services/apiClient';

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  authStore: {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
    setTokens: vi.fn(),
    clearAuth: vi.fn(),
  },
}));

// Mock the API client
vi.mock('@/services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'student',
  isActive: true,
};

const mockTokens = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset auth store state
    (authStore as any).user = null;
    (authStore as any).token = null;
    (authStore as any).refreshToken = null;
    (authStore as any).isAuthenticated = false;
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        user: mockUser,
        ...mockTokens,
      };

      (apiClient.post as any).mockResolvedValue({ data: mockResponse });
      (authStore.login as any).mockImplementation((user: any, tokens: any) => {
        (authStore as any).user = user;
        (authStore as any).token = tokens.access_token;
        (authStore as any).refreshToken = tokens.refresh_token;
        (authStore as any).isAuthenticated = true;
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(authStore.login).toHaveBeenCalledWith(mockUser, mockTokens);
    });

    it('should handle login failure', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Credenciales inválidas' },
        },
      };

      (apiClient.post as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow();

      expect(authStore.login).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.login('invalid-email', 'password123')
      ).rejects.toThrow('Email inválido');

      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('should validate password length', async () => {
      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.login('test@example.com', '123')
      ).rejects.toThrow('La contraseña debe tener al menos 6 caracteres');

      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Set up authenticated state
      (authStore as any).user = mockUser;
      (authStore as any).token = mockTokens.access_token;
      (authStore as any).isAuthenticated = true;

      (apiClient.post as any).mockResolvedValue({});
      (authStore.logout as any).mockImplementation(() => {
        (authStore as any).user = null;
        (authStore as any).token = null;
        (authStore as any).refreshToken = null;
        (authStore as any).isAuthenticated = false;
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(authStore.logout).toHaveBeenCalled();
    });

    it('should handle logout when not authenticated', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(authStore.logout).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };

      (authStore as any).refreshToken = 'current-refresh-token';
      (apiClient.post as any).mockResolvedValue({ data: newTokens });
      (authStore.setTokens as any).mockImplementation((tokens: any) => {
        (authStore as any).token = tokens.access_token;
        (authStore as any).refreshToken = tokens.refresh_token;
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshTokens();
      });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refresh_token: 'current-refresh-token',
      });

      expect(authStore.setTokens).toHaveBeenCalledWith(newTokens);
    });

    it('should handle refresh token failure', async () => {
      (authStore as any).refreshToken = 'expired-refresh-token';
      (apiClient.post as any).mockRejectedValue(new Error('Token expired'));
      (authStore.clearAuth as any).mockImplementation(() => {
        (authStore as any).user = null;
        (authStore as any).token = null;
        (authStore as any).refreshToken = null;
        (authStore as any).isAuthenticated = false;
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.refreshTokens();
        } catch (error) {
          // Expected to fail
        }
      });

      expect(authStore.clearAuth).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      (authStore as any).isAuthenticated = true;
      (apiClient.put as any).mockResolvedValue({
        data: { message: 'Contraseña actualizada' },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.changePassword('oldPassword', 'newPassword123');
      });

      expect(apiClient.put).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      });
    });

    it('should require authentication for password change', async () => {
      (authStore as any).isAuthenticated = false;

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.changePassword('oldPassword', 'newPassword123')
      ).rejects.toThrow('No autenticado');

      expect(apiClient.put).not.toHaveBeenCalled();
    });

    it('should validate new password strength', async () => {
      (authStore as any).isAuthenticated = true;

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.changePassword('oldPassword', 'weak')
      ).rejects.toThrow('La nueva contraseña debe tener al menos 8 caracteres');

      expect(apiClient.put).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user info when authenticated', async () => {
      (authStore as any).isAuthenticated = true;
      (authStore as any).token = mockTokens.access_token;
      (apiClient.get as any).mockResolvedValue({ data: mockUser });

      const { result } = renderHook(() => useAuth());

      let userData;
      await act(async () => {
        userData = await result.current.getCurrentUser();
      });

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(userData).toEqual(mockUser);
    });

    it('should throw error when not authenticated', async () => {
      (authStore as any).isAuthenticated = false;

      const { result } = renderHook(() => useAuth());

      await expect(result.current.getCurrentUser()).rejects.toThrow(
        'No autenticado'
      );

      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    const profileUpdate = {
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should update user profile successfully', async () => {
      (authStore as any).isAuthenticated = true;
      (authStore as any).user = mockUser;
      
      const updatedUser = { ...mockUser, ...profileUpdate };
      (apiClient.put as any).mockResolvedValue({ data: updatedUser });
      (authStore.setUser as any).mockImplementation((user: any) => {
        (authStore as any).user = user;
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.updateProfile(profileUpdate);
      });

      expect(apiClient.put).toHaveBeenCalledWith('/users/profile', profileUpdate);
      expect(authStore.setUser).toHaveBeenCalledWith(updatedUser);
    });

    it('should require authentication for profile update', async () => {
      (authStore as any).isAuthenticated = false;

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.updateProfile(profileUpdate)
      ).rejects.toThrow('No autenticado');

      expect(apiClient.put).not.toHaveBeenCalled();
    });
  });

  describe('impersonate', () => {
    it('should impersonate user successfully as admin', async () => {
      const adminUser = { ...mockUser, role: 'admin' };
      const targetUser = { ...mockUser, id: '2', email: 'target@example.com' };

      (authStore as any).isAuthenticated = true;
      (authStore as any).user = adminUser;
      (apiClient.post as any).mockResolvedValue({
        data: { user: targetUser, ...mockTokens },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.impersonate('2');
      });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/impersonate', {
        userId: '2',
      });
    });

    it('should not allow impersonation for non-admin users', async () => {
      const studentUser = { ...mockUser, role: 'student' };
      (authStore as any).isAuthenticated = true;
      (authStore as any).user = studentUser;

      const { result } = renderHook(() => useAuth());

      await expect(result.current.impersonate('2')).rejects.toThrow(
        'No tienes permisos para impersonar usuarios'
      );

      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('auth state', () => {
    it('should return current authentication state', () => {
      (authStore as any).user = mockUser;
      (authStore as any).isAuthenticated = true;

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should return unauthenticated state', () => {
      (authStore as any).user = null;
      (authStore as any).isAuthenticated = false;

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('loading states', () => {
    it('should handle loading state during login', async () => {
      (apiClient.post as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login('test@example.com', 'password123');
      });

      // Note: In a real implementation, you might have a loading state
      // This test structure shows how you would test it
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});