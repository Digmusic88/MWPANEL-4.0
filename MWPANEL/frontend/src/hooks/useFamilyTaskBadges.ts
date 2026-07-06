import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import { useAuth } from './useAuth';
import { UserRole } from '@/types/user';

interface FamilyTaskBadges {
  overdueCount: number;
  returnedCount: number;
  totalCount: number;
}

const DEFAULT_BADGES: FamilyTaskBadges = {
  overdueCount: 0,
  returnedCount: 0,
  totalCount: 0,
};

export function useFamilyTaskBadges() {
  const [badges, setBadges] = useState<FamilyTaskBadges>(DEFAULT_BADGES);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchBadges = useCallback(async () => {
    if (!user || user.role !== UserRole.FAMILY) {
      setBadges(DEFAULT_BADGES);
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiClient.get('/tasks/family/badges');
      const data = response.data;
      setBadges({
        overdueCount: typeof data.overdueCount === 'number' ? data.overdueCount : 0,
        returnedCount: typeof data.returnedCount === 'number' ? data.returnedCount : 0,
        totalCount: typeof data.totalCount === 'number' ? data.totalCount : 0,
      });
    } catch (error) {
      console.error('Error fetching family task badges:', error);
      setBadges(DEFAULT_BADGES);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, [fetchBadges]);

  return { ...badges, isLoading, refresh: fetchBadges };
}
