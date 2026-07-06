/**
 * Safe Navigation Utility
 * 
 * Provides safe navigation functions to prevent runtime errors
 * when navigating without proper null/undefined checks
 */

import { UserRole } from '@/types/user';

export interface SafeNavigateOptions {
  replace?: boolean;
  state?: any;
  fallbackPath?: string;
}

/**
 * Safely navigate to a path with null checks
 */
export const safeNavigate = (
  navigate: Function | undefined,
  path: string | undefined,
  options: SafeNavigateOptions = {}
): boolean => {
  if (!navigate || !path) {
    console.warn('Safe navigation prevented: navigate or path is null/undefined', { navigate, path });
    return false;
  }

  try {
    navigate(path, {
      replace: options.replace ?? false,
      state: options.state
    });
    return true;
  } catch (error) {
    console.error('Navigation failed:', error);
    
    // Fallback to window.location if navigate fails
    if (options.fallbackPath && typeof window !== 'undefined') {
      window.location.href = options.fallbackPath;
    }
    
    return false;
  }
};

/**
 * Safely get dashboard path for a user role
 */
export const getSafeDashboardPath = (role: UserRole | undefined): string => {
  if (!role) {
    return '/login';
  }

  switch (role) {
    case UserRole.ADMIN:
      return '/admin';
    case UserRole.TEACHER:
      return '/teacher';
    case UserRole.STUDENT:
      return '/student';
    case UserRole.FAMILY:
      return '/family';
    default:
      return '/login';
  }
};

/**
 * Safely navigate to user-specific path
 */
export const safeNavigateToUserPath = (
  navigate: Function | undefined,
  user: any,
  basePath: string,
  options: SafeNavigateOptions = {}
): boolean => {
  if (!user?.role) {
    console.warn('Safe navigation prevented: user or role is null/undefined');
    return false;
  }

  const path = `/${user.role}/${basePath}`;
  return safeNavigate(navigate, path, options);
};

/**
 * Check if navigation is possible
 */
export const canNavigate = (navigate: Function | undefined, path?: string): boolean => {
  return !!(navigate && path);
};

/**
 * Safely handle window.location navigation
 */
export const safeWindowNavigate = (
  path: string | undefined,
  options: { fallback?: string } = {}
): boolean => {
  if (!path) {
    console.warn('Window navigation prevented: path is null/undefined');
    return false;
  }

  if (typeof window === 'undefined' || !window.location) {
    console.warn('Window navigation prevented: window or location not available');
    return false;
  }

  try {
    window.location.href = path;
    return true;
  } catch (error) {
    console.error('Window navigation failed:', error);
    
    if (options.fallback && typeof window !== 'undefined') {
      window.location.href = options.fallback;
    }
    
    return false;
  }
};

/**
 * Create a safe navigation function with pre-validation
 */
export const createSafeNavigation = (
  navigate: Function | undefined,
  user: any
) => {
  return {
    navigate: (path: string, options?: SafeNavigateOptions) => 
      safeNavigate(navigate, path, options),
    
    toDashboard: (options?: SafeNavigateOptions) => 
      safeNavigate(navigate, getSafeDashboardPath(user?.role), options),
    
    toProfile: (options?: SafeNavigateOptions) => 
      safeNavigateToUserPath(navigate, user, 'profile', options),
    
    toSettings: (options?: SafeNavigateOptions) => 
      safeNavigateToUserPath(navigate, user, 'settings', options),
    
    canNavigate: (path?: string) => canNavigate(navigate, path)
  };
};