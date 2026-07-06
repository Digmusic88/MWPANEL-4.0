import { useState, useEffect } from 'react';
import apiClient from '@services/apiClient';

export interface CompetencyData {
  competency: string;
  code: string;
  score: number;
  fullMark: number;
  observations: string;
}

export interface EvaluationHistory {
  id: string;
  subject: string;
  period: string;
  date: string;
  averageScore: number;
  status: string;
}

export interface CompetencyStats {
  totalCompetencies: number;
  evaluatedCompetencies: number;
  averageScore: number;
  bestCompetency: {
    code: string;
    name: string;
    score: number;
  };
  completedEvaluations: number;
}

interface UseStudentCompetenciesReturn {
  competencyData: CompetencyData[];
  evaluationHistory: EvaluationHistory[];
  stats: CompetencyStats;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useStudentCompetencies = (): UseStudentCompetenciesReturn => {
  const [competencyData, setCompetencyData] = useState<CompetencyData[]>([]);
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationHistory[]>([]);
  const [stats, setStats] = useState<CompetencyStats>({
    totalCompetencies: 0,
    evaluatedCompetencies: 0,
    averageScore: 0,
    bestCompetency: { code: '', name: '', score: 0 },
    completedEvaluations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompetencyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user to determine student ID
      const userResponse = await apiClient.get('/auth/me');
      const currentUser = userResponse.data;

      if (currentUser.role !== 'student') {
        setError('Acceso denegado: Solo estudiantes pueden acceder a estas competencias');
        return;
      }

      // Obtener el perfil del propio estudiante (RGPD: /students es solo admin)
      const studentResponse = await apiClient.get('/students/me');
      const currentStudent = studentResponse.data;

      if (!currentStudent) {
        setError('No se encontró el perfil de estudiante para este usuario');
        return;
      }

      const studentId = currentStudent.id;
      const educationalLevelId = currentStudent.educationalLevel?.id;

      // Fetch active evaluation period
      let activePeriod;
      try {
        const periodResponse = await apiClient.get('/evaluations/periods/active');
        activePeriod = periodResponse.data;
      } catch (periodError) {
        console.warn('No active evaluation period found, using fallback');
        activePeriod = { id: 'current', name: '1º Trimestre 2024-25' };
      }

      // Fetch student's evaluations
      const evaluationsResponse = await apiClient.get(`/evaluations/student/${studentId}`);
      const evaluations = evaluationsResponse.data || [];

      // Fetch competency framework for student's educational level
      let competencies = [];
      if (educationalLevelId) {
        try {
          const competenciesResponse = await apiClient.get(`/competencies/framework/${educationalLevelId}`);
          competencies = competenciesResponse.data || [];
        } catch (compError) {
          // Fallback to general competencies
          const generalCompResponse = await apiClient.get('/competencies');
          competencies = generalCompResponse.data || [];
        }
      }

      // Ensure data is in array format
      const safeCompetencies = Array.isArray(competencies) ? competencies : [];
      const safeEvaluations = Array.isArray(evaluations) ? evaluations : [];

      // Process competency data
      const processedCompetencies: CompetencyData[] = safeCompetencies.slice(0, 8).map((comp: any) => {
        // Find evaluation for this competency
        const competencyEvaluation = safeEvaluations.find((evaluation: any) => 
          evaluation.competencyEvaluations?.some((ce: any) => ce.competency.id === comp.id)
        );

        let score = 0;
        let observations = 'Evaluación pendiente';

        if (competencyEvaluation) {
          const compEval = competencyEvaluation.competencyEvaluations.find((ce: any) => 
            ce.competency.id === comp.id
          );
          if (compEval) {
            score = compEval.score || 0;
            observations = compEval.observations || 'Sin observaciones específicas';
          }
        }

        return {
          competency: comp.name || comp.description || 'Competencia sin nombre',
          code: comp.code || 'COMP',
          score: score,
          fullMark: 10,
          observations: observations,
        };
      });

      // Process evaluation history
      const processedHistory: EvaluationHistory[] = safeEvaluations.slice(0, 10).map((evaluation: any) => ({
        id: evaluation.id,
        subject: evaluation.subject?.name || 'Asignatura general',
        period: activePeriod.name || '1º Trimestre',
        date: evaluation.createdAt || new Date().toISOString(),
        averageScore: evaluation.overallScore || 0,
        status: evaluation.status || 'completed',
      }));

      // Calculate stats
      const evaluatedCompetencies = processedCompetencies.filter(comp => comp.score > 0);
      const averageScore = evaluatedCompetencies.length > 0
        ? evaluatedCompetencies.reduce((sum, comp) => sum + comp.score, 0) / evaluatedCompetencies.length
        : 0;

      const bestCompetency = evaluatedCompetencies.length > 0
        ? evaluatedCompetencies.reduce((best, current) => 
            current.score > best.score ? current : best
          )
        : { code: 'N/A', name: 'Sin evaluaciones', score: 0 };

      const calculatedStats: CompetencyStats = {
        totalCompetencies: competencies.length,
        evaluatedCompetencies: evaluatedCompetencies.length,
        averageScore: averageScore,
        bestCompetency: {
          code: bestCompetency.code,
          name: bestCompetency.competency,
          score: bestCompetency.score,
        },
        completedEvaluations: evaluations.length,
      };

      setCompetencyData(processedCompetencies);
      setEvaluationHistory(processedHistory);
      setStats(calculatedStats);

    } catch (error: any) {
      console.error('Error fetching competency data:', error);
      setError(error.response?.data?.message || 'Error al cargar los datos de competencias');
      
      // Set empty fallback data
      setCompetencyData([]);
      setEvaluationHistory([]);
      setStats({
        totalCompetencies: 0,
        evaluatedCompetencies: 0,
        averageScore: 0,
        bestCompetency: { code: 'N/A', name: 'Sin datos', score: 0 },
        completedEvaluations: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetencyData();
  }, []);

  const refetch = () => {
    fetchCompetencyData();
  };

  return {
    competencyData,
    evaluationHistory,
    stats,
    loading,
    error,
    refetch,
  };
};

export default useStudentCompetencies;