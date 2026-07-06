/**
 * @archivo: useAutoEvaluation.ts
 * @módulo: Hooks (Evaluación Semántica)
 * @función: Hook personalizado para gestión de evaluación automática por IA
 * @crítico: SÍ - Estado centralizado para funcionalidades de evaluación semántica
 */

import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { 
  semanticService,
  type SuggestCompetenciesRequest,
  type CompetencySuggestion,
  type EvaluationSelection,
  type SaveEvaluationRequest,
  type AutoActivityEvaluation,
  type UsageStats
} from '../services/semanticService';

interface UseAutoEvaluationState {
  // Estados de carga
  isAnalyzing: boolean;
  isSaving: boolean;
  isLoadingHistory: boolean;
  isLoadingStats: boolean;
  
  // Datos principales
  suggestions: CompetencySuggestion[];
  evaluationHistory: AutoActivityEvaluation[];
  usageStats: UsageStats;
  
  // Estados de UI
  hasResults: boolean;
  selectedSuggestions: Map<string, EvaluationSelection>;
  
  // Errores
  error: string | null;
}

interface UseAutoEvaluationActions {
  // Análisis de actividades
  analyzActivity: (request: SuggestCompetenciesRequest) => Promise<boolean>;
  clearSuggestions: () => void;
  
  // Gestión de selecciones
  selectSuggestion: (suggestion: CompetencySuggestion, accepted: boolean, weight?: number) => void;
  unselectSuggestion: (suggestionId: string) => void;
  clearSelections: () => void;
  
  // Persistencia
  saveEvaluation: (activityData: Omit<SaveEvaluationRequest, 'selections'>) => Promise<boolean>;
  
  // Datos históricos
  loadEvaluationHistory: (page?: number, limit?: number) => Promise<void>;
  loadUsageStats: () => Promise<void>;
  
  // Utilidades
  validateActivity: (title: string, description: string) => { isValid: boolean; errors: string[] };
  getSelectionStats: () => {
    total: number;
    accepted: number;
    rejected: number;
    avgScore: number;
    avgWeight: number;
  };
  
  // Estado del servicio
  checkServiceHealth: () => Promise<boolean>;
}

type UseAutoEvaluationReturn = UseAutoEvaluationState & UseAutoEvaluationActions;

const initialState: UseAutoEvaluationState = {
  isAnalyzing: false,
  isSaving: false,
  isLoadingHistory: false,
  isLoadingStats: false,
  suggestions: [],
  evaluationHistory: [],
  usageStats: {
    totalEvaluations: 0,
    acceptanceRate: 0,
    avgSimilarity: 0,
    uniqueActivities: 0
  },
  hasResults: false,
  selectedSuggestions: new Map(),
  error: null
};

export const useAutoEvaluation = (): UseAutoEvaluationReturn => {
  const [state, setState] = useState<UseAutoEvaluationState>(initialState);

  // Limpiar error automáticamente después de 5 segundos
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  // Función para manejar errores
  const handleError = useCallback((error: any, context: string) => {
    console.error(`[useAutoEvaluation] Error in ${context}:`, error);
    const errorMessage = error?.message || `Error en ${context}`;
    setState(prev => ({ ...prev, error: errorMessage }));
    message.error(errorMessage);
  }, []);

  // Analizar actividad
  const analyzActivity = useCallback(async (request: SuggestCompetenciesRequest): Promise<boolean> => {
    setState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      error: null,
      hasResults: false 
    }));

    try {
      // Validar entrada
      const validation = semanticService.validateActivity(request.title, request.description);
      if (!validation.isValid) {
        validation.errors.forEach(error => message.warning(error));
        setState(prev => ({ ...prev, isAnalyzing: false }));
        return false;
      }

      const suggestions = await semanticService.suggestCompetencies(request);
      
      setState(prev => ({
        ...prev,
        suggestions,
        hasResults: suggestions.length > 0,
        selectedSuggestions: new Map(), // Limpiar selecciones anteriores
        isAnalyzing: false
      }));

      if (suggestions.length === 0) {
        message.info('No se encontraron sugerencias para esta actividad. Intenta con una descripción más detallada.');
      } else {
        message.success(`Se encontraron ${suggestions.length} sugerencias de competencias`);
      }

      return true;
    } catch (error) {
      handleError(error, 'análisis de actividad');
      setState(prev => ({ ...prev, isAnalyzing: false }));
      return false;
    }
  }, [handleError]);

  // Limpiar sugerencias
  const clearSuggestions = useCallback(() => {
    setState(prev => ({
      ...prev,
      suggestions: [],
      selectedSuggestions: new Map(),
      hasResults: false
    }));
  }, []);

  // Seleccionar sugerencia
  const selectSuggestion = useCallback((
    suggestion: CompetencySuggestion, 
    accepted: boolean, 
    weight: number = 1.0
  ) => {
    setState(prev => {
      const newSelections = new Map(prev.selectedSuggestions);
      
      const selection: EvaluationSelection = {
        descriptorId: suggestion.id,
        descriptorType: suggestion.type,
        similarityScore: suggestion.score,
        weight,
        accepted
      };
      
      newSelections.set(suggestion.id, selection);
      
      return {
        ...prev,
        selectedSuggestions: newSelections
      };
    });
  }, []);

  // Deseleccionar sugerencia
  const unselectSuggestion = useCallback((suggestionId: string) => {
    setState(prev => {
      const newSelections = new Map(prev.selectedSuggestions);
      newSelections.delete(suggestionId);
      
      return {
        ...prev,
        selectedSuggestions: newSelections
      };
    });
  }, []);

  // Limpiar selecciones
  const clearSelections = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedSuggestions: new Map()
    }));
  }, []);

  // Guardar evaluación
  const saveEvaluation = useCallback(async (
    activityData: Omit<SaveEvaluationRequest, 'selections'>
  ): Promise<boolean> => {
    if (state.selectedSuggestions.size === 0) {
      message.warning('Debe seleccionar al menos una sugerencia antes de guardar');
      return false;
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const selections = Array.from(state.selectedSuggestions.values());
      const acceptedSelections = selections.filter(s => s.accepted);
      
      if (acceptedSelections.length === 0) {
        message.warning('Debe aceptar al menos una sugerencia para guardar la evaluación');
        setState(prev => ({ ...prev, isSaving: false }));
        return false;
      }

      const request: SaveEvaluationRequest = {
        ...activityData,
        selections
      };

      await semanticService.saveEvaluation(request);
      
      setState(prev => ({
        ...prev,
        isSaving: false,
        // Limpiar estado después de guardar
        suggestions: [],
        selectedSuggestions: new Map(),
        hasResults: false
      }));

      message.success(`Evaluación guardada exitosamente. ${acceptedSelections.length} sugerencias aceptadas.`);
      
      // Recargar datos
      await loadEvaluationHistory();
      await loadUsageStats();
      
      return true;
    } catch (error) {
      handleError(error, 'guardado de evaluación');
      setState(prev => ({ ...prev, isSaving: false }));
      return false;
    }
  }, [state.selectedSuggestions, handleError]);

  // Cargar historial de evaluaciones
  const loadEvaluationHistory = useCallback(async (page: number = 1, limit: number = 10) => {
    setState(prev => ({ ...prev, isLoadingHistory: true, error: null }));

    try {
      const response = await semanticService.getEvaluationHistory(page, limit);
      setState(prev => ({
        ...prev,
        evaluationHistory: response.data,
        isLoadingHistory: false
      }));
    } catch (error) {
      handleError(error, 'carga de historial');
      setState(prev => ({ ...prev, isLoadingHistory: false }));
    }
  }, [handleError]);

  // Cargar estadísticas de uso
  const loadUsageStats = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingStats: true, error: null }));

    try {
      const stats = await semanticService.getUsageStats();
      setState(prev => ({
        ...prev,
        usageStats: stats,
        isLoadingStats: false
      }));
    } catch (error) {
      handleError(error, 'carga de estadísticas');
      setState(prev => ({ ...prev, isLoadingStats: false }));
    }
  }, [handleError]);

  // Validar actividad
  const validateActivity = useCallback((title: string, description: string) => {
    return semanticService.validateActivity(title, description);
  }, []);

  // Obtener estadísticas de selección
  const getSelectionStats = useCallback(() => {
    const selections = Array.from(state.selectedSuggestions.values());
    const accepted = selections.filter(s => s.accepted);
    const rejected = selections.filter(s => !s.accepted);
    
    return {
      total: selections.length,
      accepted: accepted.length,
      rejected: rejected.length,
      avgScore: selections.length > 0 
        ? selections.reduce((sum, s) => sum + s.similarityScore, 0) / selections.length 
        : 0,
      avgWeight: accepted.length > 0 
        ? accepted.reduce((sum, s) => sum + s.weight, 0) / accepted.length 
        : 0
    };
  }, [state.selectedSuggestions]);

  // Verificar estado del servicio
  const checkServiceHealth = useCallback(async (): Promise<boolean> => {
    try {
      const health = await semanticService.checkHealth();
      if (!health.modelReady) {
        message.warning('El modelo de IA no está completamente cargado. Algunas funciones pueden estar limitadas.');
        return false;
      }
      return true;
    } catch (error) {
      handleError(error, 'verificación de estado del servicio');
      return false;
    }
  }, [handleError]);

  // Cargar datos iniciales al montar el hook
  useEffect(() => {
    loadEvaluationHistory();
    loadUsageStats();
    checkServiceHealth();
  }, [loadEvaluationHistory, loadUsageStats, checkServiceHealth]);

  return {
    // Estado
    ...state,
    
    // Acciones
    analyzActivity,
    clearSuggestions,
    selectSuggestion,
    unselectSuggestion,
    clearSelections,
    saveEvaluation,
    loadEvaluationHistory,
    loadUsageStats,
    validateActivity,
    getSelectionStats,
    checkServiceHealth
  };
};

export default useAutoEvaluation;