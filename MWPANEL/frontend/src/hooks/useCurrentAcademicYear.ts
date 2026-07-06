import { useState, useEffect } from 'react';
import apiClient from '@services/apiClient';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export const useCurrentAcademicYear = () => {
  const [currentAcademicYear, setCurrentAcademicYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentAcademicYear = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get the current academic year first
      const currentResponse = await apiClient.get('/academic-years/current');
      if (currentResponse.data) {
        setCurrentAcademicYear(currentResponse.data);
        return;
      }

      // If no current year, get all and find the active one
      const allResponse = await apiClient.get('/academic-years');
      const academicYears = allResponse.data || [];
      const activeYear = academicYears.find((year: AcademicYear) => year.isCurrent);
      
      setCurrentAcademicYear(activeYear || null);
    } catch (error: any) {
      console.error('Error fetching current academic year:', error);
      setError(error.response?.data?.message || 'Error al cargar año académico actual');
      setCurrentAcademicYear(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentAcademicYear();
  }, []);

  return {
    currentAcademicYear,
    loading,
    error,
    refetch: fetchCurrentAcademicYear,
  };
};