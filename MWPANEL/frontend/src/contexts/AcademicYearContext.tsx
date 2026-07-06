import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '@services/apiClient';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface AcademicYearContextType {
  currentAcademicYear: AcademicYear | null;
  allAcademicYears: AcademicYear[];
  loading: boolean;
  error: string | null;
  refetchCurrent: () => Promise<void>;
  refetchAll: () => Promise<void>;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

interface AcademicYearProviderProps {
  children: ReactNode;
}

export const AcademicYearProvider: React.FC<AcademicYearProviderProps> = ({ children }) => {
  const [currentAcademicYear, setCurrentAcademicYear] = useState<AcademicYear | null>(null);
  const [allAcademicYears, setAllAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllAcademicYears = async () => {
    try {
      const response = await apiClient.get('/academic-years');
      const academicYears = response.data || [];
      setAllAcademicYears(academicYears);
      
      // Find the current active year
      const activeYear = academicYears.find((year: AcademicYear) => year.isCurrent);
      setCurrentAcademicYear(activeYear || null);
      
      return academicYears;
    } catch (error: any) {
      console.error('Error fetching academic years:', error);
      setError(error.response?.data?.message || 'Error al cargar años académicos');
      setAllAcademicYears([]);
      setCurrentAcademicYear(null);
      return [];
    }
  };

  const fetchCurrentAcademicYear = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all academic years to have complete data
      await fetchAllAcademicYears();
    } catch (error: any) {
      console.error('Error fetching current academic year:', error);
      setError(error.response?.data?.message || 'Error al cargar año académico actual');
    } finally {
      setLoading(false);
    }
  };

  const refetchCurrent = async () => {
    await fetchCurrentAcademicYear();
  };

  const refetchAll = async () => {
    await fetchAllAcademicYears();
  };

  useEffect(() => {
    fetchCurrentAcademicYear();
  }, []);

  const value: AcademicYearContextType = {
    currentAcademicYear,
    allAcademicYears,
    loading,
    error,
    refetchCurrent,
    refetchAll,
  };

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = (): AcademicYearContextType => {
  const context = useContext(AcademicYearContext);
  if (context === undefined) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
};