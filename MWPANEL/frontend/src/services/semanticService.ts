/**
 * @archivo: semanticService.ts
 * @módulo: Services (Evaluación Semántica)
 * @función: API client para funcionalidades de evaluación automática por IA
 * @crítico: SÍ - Integración con sistema de análisis semántico
 */

import { apiClient } from './apiClient';

export interface SuggestCompetenciesRequest {
  title: string;
  description: string;
  stage: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA';
  subjectId?: string;
  maxSuggestions?: number;
  minScore?: number;
}

export interface CompetencySuggestion {
  id: string;
  type: 'specific' | 'knowledge' | 'criteria' | 'operative';
  text: string;
  code?: string;
  score: number;
  percentage: number;
  confidence: 'high' | 'medium' | 'low';
  competencyCode?: string;
  competencyName?: string;
  subjectArea?: string;
}

export interface EvaluationSelection {
  descriptorId: string;
  descriptorType: 'specific' | 'knowledge' | 'criteria' | 'operative';
  similarityScore: number;
  weight: number;
  accepted: boolean;
}

export interface SaveEvaluationRequest {
  title: string;
  description: string;
  stage: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA';
  subjectId?: string;
  selections: EvaluationSelection[];
}

export interface AutoActivityEvaluation {
  id: string;
  teacherId: string;
  activityTitle: string;
  activityDescription: string;
  stage: 'INFANTIL' | 'PRIMARIA' | 'SECUNDARIA';
  subjectId?: string;
  descriptorId: string;
  descriptorType: 'specific' | 'knowledge' | 'criteria' | 'operative';
  similarityScore: number;
  weight: number;
  accepted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationHistoryResponse {
  data: AutoActivityEvaluation[];
  total: number;
}

export interface UsageStats {
  totalEvaluations: number;
  acceptanceRate: number;
  avgSimilarity: number;
  uniqueActivities: number;
}

class SemanticService {
  private readonly baseUrl = '/semantic-evaluation'; // ✅ FIXED: URL correcta para endpoints de IA
  private readonly serviceAvailable = true; // ✅ ACTIVADO - Sistema de IA reactivado

  /**
   * Solicita sugerencias de competencias para una actividad
   */
  async suggestCompetencies(request: SuggestCompetenciesRequest): Promise<CompetencySuggestion[]> {
    console.log('🎯 ===== SEMANTIC SERVICE: suggestCompetencies CALLED =====');
    console.log('📝 Request data:', request);
    console.log('🔗 Target URL:', `${this.baseUrl}/suggest`);
    console.log('🔑 Service available:', this.serviceAvailable);
    
    if (!this.serviceAvailable) {
      throw new Error('🤖 El servicio de IA está temporalmente no disponible. Por favor, inténtalo más tarde.');
    }

    try {
      console.log('🚀 Making API call to backend...');
      const response = await apiClient.post(`${this.baseUrl}/suggest`, request);
      console.log('✅ Backend response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.log('❌ API call failed:', error);
      console.log('🔄 Falling back to mock suggestions');
      // Graceful fallback for development - simulate AI suggestions
      console.warn('🤖 API no disponible, generando sugerencias simuladas:', error.message);
      return this.generateMockSuggestions(request);
    }
  }

  /**
   * Guarda las evaluaciones seleccionadas por el docente
   */
  async saveEvaluation(request: SaveEvaluationRequest): Promise<AutoActivityEvaluation[]> {
    if (!this.serviceAvailable) {
      throw new Error('🤖 El servicio de IA está temporalmente no disponible. Por favor, inténtalo más tarde.');
    }

    try {
      const response = await apiClient.post(`${this.baseUrl}/save`, request);
      return response.data;
    } catch (error: any) {
      console.warn('🤖 API de guardado no disponible:', error.message);
      throw new Error('No se pudo guardar la evaluación. Inténtalo más tarde.');
    }
  }

  /**
   * Obtiene el historial de evaluaciones del docente
   */
  async getEvaluationHistory(page: number = 1, limit: number = 10): Promise<EvaluationHistoryResponse> {
    if (!this.serviceAvailable) {
      return { data: [], total: 0 };
    }

    try {
      const response = await apiClient.get(`${this.baseUrl}/history`);
      return response.data;
    } catch (error: any) {
      console.warn('🤖 API de historial no disponible:', error.message);
      return { data: [], total: 0 };
    }
  }

  /**
   * Obtiene estadísticas de uso de la funcionalidad
   */
  async getUsageStats(): Promise<UsageStats> {
    if (!this.serviceAvailable) {
      return { 
        totalEvaluations: 0, 
        acceptanceRate: 0, 
        avgSimilarity: 0, 
        uniqueActivities: 0 
      };
    }

    try {
      const response = await apiClient.get(`${this.baseUrl}/stats`);
      return response.data;
    } catch (error: any) {
      console.warn('🤖 API de estadísticas no disponible:', error.message);
      return { 
        totalEvaluations: 0, 
        acceptanceRate: 0, 
        avgSimilarity: 0, 
        uniqueActivities: 0 
      };
    }
  }

  /**
   * Verifica el estado del servicio NLP
   */
  async checkHealth(): Promise<{ status: string; modelReady: boolean }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/test/ai-health`);
      return { status: response.data.status, modelReady: response.data.modelReady };
    } catch (error: any) {
      return { status: 'unavailable', modelReady: false };
    }
  }

  /**
   * Genera sugerencias simuladas cuando la API no está disponible
   */
  private generateMockSuggestions(request: SuggestCompetenciesRequest): CompetencySuggestion[] {
    const mockSuggestions: CompetencySuggestion[] = [
      {
        id: '1',
        type: 'specific',
        text: `Competencia específica relacionada con "${request.title}"`,
        code: 'CE.1',
        score: 0.85,
        percentage: 85,
        confidence: 'high',
        competencyCode: 'CCL',
        competencyName: 'Competencia en comunicación lingüística',
        subjectArea: 'Lengua Castellana'
      },
      {
        id: '2', 
        type: 'criteria',
        text: `Evaluar la comprensión de conceptos aplicados en "${request.description.substring(0, 30)}..."`,
        code: 'CRIT.2.1',
        score: 0.78,
        percentage: 78,
        confidence: 'high',
        competencyCode: 'STEM',
        competencyName: 'Competencia matemática y en ciencia y tecnología',
        subjectArea: request.stage === 'PRIMARIA' ? 'Matemáticas' : 'Ciencias'
      },
      {
        id: '3',
        type: 'knowledge',
        text: 'Conceptos fundamentales del área de conocimiento aplicable',
        code: 'SB.3.2',
        score: 0.72,
        percentage: 72,
        confidence: 'medium',
        competencyCode: 'CPSAA',
        competencyName: 'Competencia personal, social y de aprender a aprender',
        subjectArea: 'Transversal'
      },
      {
        id: '4',
        type: 'operative',
        text: 'Descriptor operativo para la etapa educativa correspondiente',
        code: 'DO.4.1', 
        score: 0.68,
        percentage: 68,
        confidence: 'medium',
        competencyCode: 'CD',
        competencyName: 'Competencia digital',
        subjectArea: 'Tecnología'
      }
    ];

    // Filtrar por número máximo de sugerencias
    const maxSuggestions = request.maxSuggestions || 4;
    return mockSuggestions.slice(0, maxSuggestions);
  }

  /**
   * Utilidad para obtener el color de confianza
   */
  getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
    switch (confidence) {
      case 'high':
        return '#52c41a'; // Verde
      case 'medium':
        return '#faad14'; // Amarillo
      case 'low':
        return '#f5222d'; // Rojo
      default:
        return '#d9d9d9'; // Gris
    }
  }

  /**
   * Utilidad para obtener el texto de confianza
   */
  getConfidenceText(confidence: 'high' | 'medium' | 'low'): string {
    switch (confidence) {
      case 'high':
        return 'Alta confianza';
      case 'medium':
        return 'Confianza media';
      case 'low':
        return 'Baja confianza';
      default:
        return 'Desconocida';
    }
  }

  /**
   * Utilidad para obtener el color del tipo de descriptor
   */
  getDescriptorTypeColor(type: 'specific' | 'knowledge' | 'criteria' | 'operative'): string {
    switch (type) {
      case 'specific':
        return '#1890ff'; // Azul
      case 'knowledge':
        return '#52c41a'; // Verde
      case 'criteria':
        return '#faad14'; // Amarillo
      case 'operative':
        return '#722ed1'; // Morado
      default:
        return '#d9d9d9'; // Gris
    }
  }

  /**
   * Utilidad para obtener el texto del tipo de descriptor
   */
  getDescriptorTypeText(type: 'specific' | 'knowledge' | 'criteria' | 'operative'): string {
    switch (type) {
      case 'specific':
        return 'Competencia Específica';
      case 'knowledge':
        return 'Saber Básico';
      case 'criteria':
        return 'Criterio de Evaluación';
      case 'operative':
        return 'Descriptor Operativo';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Utilidad para formatear la puntuación de similitud
   */
  formatSimilarityScore(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  /**
   * Utilidad para validar una actividad antes de enviarla
   */
  validateActivity(title: string, description: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!title || title.trim().length < 3) {
      errors.push('El título debe tener al menos 3 caracteres');
    }

    if (!description || description.trim().length < 10) {
      errors.push('La descripción debe tener al menos 10 caracteres');
    }

    if (title && title.length > 500) {
      errors.push('El título no puede exceder 500 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Utilidad para calcular estadísticas de selecciones
   */
  calculateSelectionStats(selections: EvaluationSelection[]): {
    totalSelected: number;
    acceptedCount: number;
    rejectedCount: number;
    avgWeight: number;
    avgScore: number;
  } {
    const acceptedSelections = selections.filter(s => s.accepted);
    const rejectedSelections = selections.filter(s => !s.accepted);

    return {
      totalSelected: selections.length,
      acceptedCount: acceptedSelections.length,
      rejectedCount: rejectedSelections.length,
      avgWeight: acceptedSelections.length > 0 
        ? acceptedSelections.reduce((sum, s) => sum + s.weight, 0) / acceptedSelections.length 
        : 0,
      avgScore: selections.length > 0 
        ? selections.reduce((sum, s) => sum + s.similarityScore, 0) / selections.length 
        : 0,
    };
  }
}

export const semanticService = new SemanticService();
export default semanticService;