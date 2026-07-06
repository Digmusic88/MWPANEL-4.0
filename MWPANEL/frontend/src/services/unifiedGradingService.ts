/**
 * @archivo: unifiedGradingService.ts
 * @módulo: Frontend Services
 * @función: Servicio para integración con API del Sistema Unificado de Calificaciones 0-100
 * @crítico: SÍ - Servicio principal para el nuevo sistema unificado
 * @creado: 2025-08-23 - Integración completa con backend unificado
 */

import apiClient from './apiClient';
import { lomloeConversion } from '@/utils/lomloe';

// =====================================================
// INTERFACES PARA EL SISTEMA UNIFICADO
// =====================================================

export interface GradingScale {
  id: string;
  name: string;
  scale_type: 'numeric' | 'letter' | 'emoji' | 'descriptive' | 'custom';
  conversion_rules: {
    formula: string;
    min_input: number;
    max_input: number;
    examples: Record<string, number>;
  };
  is_default: boolean;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnifiedGrade {
  id: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  originalValue: number;
  targetScale: string;
  convertedValue: number | string;
  convertedText: string;
  conversionNote?: string;
  source: string; // task_submissions, centralized_grades, etc
  type: string; // Tarea, Examen, Calificación Final, etc
  description: string;
  createdAt: string;
  // Show all scale representations
  allScales: {
    standard: number;
    cambridge: string;
    rubric: number;
    numeric_10: number;
  };
  error?: string;


  // Objetos relacionados opcionales para compatibilidad completa
  student?: {
    id: string;
    fullName: string;
    enrollmentNumber: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  original_scale?: {
    id: string;
    name: string;
    description: string;
  };
  academic_year?: {
    id: string;
    name: string;
    year: string;
  };
}

export interface ConvertGradeRequest {
  original_value: number;
  original_scale: string;
  target_scale?: string;
  include_alternatives?: boolean;
}

export interface ConvertGradeResponse {
  original_value: number;
  original_scale: string;
  hundred_scale_value: number;
  letter_grade?: string;
  emoji_grade?: string;
  descriptive_grade?: string;
  conversion_applied: boolean;
  quality_indicators: {
    excellent: boolean;
    good: boolean;
    passing: boolean;
    needs_improvement: boolean;
  };
}

export interface StudentUnifiedGrades {
  student_id: string;
  total_grades: number;
  grades: UnifiedGradeWithDetails[];
}

export interface UnifiedGradeWithDetails extends UnifiedGrade {
  subject_name?: string;
  scale_name?: string;
  scale_description?: string;
  quality_level: string;
  performance_indicator: string;
}

export interface WeightedAverageResponse {
  average: number;
  scale: string;
  quality_level: string;
}

export interface StudentAnalytics {
  student_id: string;
  academic_year_id?: string;
  summary: {
    overall_average: number;
    total_grades: number;
    performance_distribution: {
      excellent: number;
      good: number;
      passing: number;
      needs_improvement: number;
    };
    quality_level: string;
  };
  by_subject: Array<{
    subject_name: string;
    subject_average: number;
    total_grades: number;
    highest_grade: number;
    lowest_grade: number;
  }>;
}

export interface BatchConvertRequest {
  requests: ConvertGradeRequest[];
}

export interface BatchConvertResponse {
  total: number;
  successful: number;
  failed: number;
  conversions: ConvertGradeResponse[];
}

export interface MigrationResponse {
  migrated: number;
  errors: number;
  status: string;
}

// =====================================================
// SERVICIO PRINCIPAL
// =====================================================

class UnifiedGradingService {
  private readonly baseUrl = '/unified-grading-production';

  /**
   * Convertir una calificación a la escala 0-100 unificada
   */
  async convertGrade(request: ConvertGradeRequest): Promise<ConvertGradeResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/convert`, request);
      return response.data;
    } catch (error: any) {
      console.error('Error convirtiendo calificación:', error);
      throw new Error(error?.response?.data?.message || 'Error en conversión de calificación');
    }
  }

  /**
   * Guardar una calificación unificada
   */
  async saveUnifiedGrade(gradeData: Partial<UnifiedGrade>): Promise<UnifiedGrade> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/save-grade`, gradeData);
      return response.data;
    } catch (error: any) {
      console.error('Error guardando calificación unificada:', error);
      throw new Error(error?.response?.data?.message || 'Error guardando calificación');
    }
  }

  /**
   * Obtener todas las calificaciones existentes convertidas al sistema unificado
   */
  async getAllGrades(options?: {
    studentId?: string;
    subjectId?: string;
    scale?: 'standard' | 'cambridge' | 'rubric' | 'numeric_10';
    period?: string;
  }): Promise<{
    filters: any;
    totalCount: number;
    originalGradesFound: number;
    grades: UnifiedGrade[];
    availableScales: string[];
    message: string;
    dataSource: string;
    lastUpdated: string;
  }> {
    try {
      const params = new URLSearchParams();
      if (options?.studentId) params.append('studentId', options.studentId);
      if (options?.subjectId) params.append('subjectId', options.subjectId);
      if (options?.scale) params.append('scale', options.scale);
      if (options?.period) params.append('period', options.period);

      const response = await apiClient.get(`${this.baseUrl}/grades?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo todas las calificaciones:', error);
      throw new Error(error?.response?.data?.message || 'Error obteniendo calificaciones');
    }
  }

  /**
   * Obtener promedio ponderado en base 100
   */
  async getWeightedAverage(
    student_id: string,
    subject_id: string,
    academic_year_id?: string,
    evaluation_period?: string
  ): Promise<WeightedAverageResponse> {
    try {
      const params = new URLSearchParams();
      if (academic_year_id) params.append('academic_year_id', academic_year_id);
      if (evaluation_period) params.append('evaluation_period', evaluation_period);

      const response = await apiClient.get(
        `${this.baseUrl}/average/${student_id}/${subject_id}?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo promedio ponderado:', error);
      throw new Error(error?.response?.data?.message || 'Error calculando promedio');
    }
  }

  /**
   * Obtener escalas de calificación disponibles
   */
  async getAvailableScales(): Promise<GradingScale[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/scales`);
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo escalas disponibles:', error);
      throw new Error(error?.response?.data?.message || 'Error obteniendo escalas');
    }
  }

  /**
   * 🆕 GESTIÓN DE ESCALAS PERSONALIZADAS
   * Nuevos métodos para el sistema de administración frontend
   */

  /**
   * Crear una escala de calificación personalizada
   */
  async createCustomScale(scaleData: {
    name: string;
    type: 'numeric' | 'letter' | 'rubric' | 'custom';
    description: string;
    minValue: number;
    maxValue: number;
    steps: Array<{
      min: number;
      max: number;
      label: string;
      description?: string;
    }>;
  }): Promise<{
    success: boolean;
    scale: any;
    message: string;
  }> {
    try {
      // Validación frontend antes de enviar
      this.validateCustomScaleData(scaleData);
      
      const response = await apiClient.post(`${this.baseUrl}/scales/create`, scaleData);
      return response.data;
    } catch (error: any) {
      console.error('Error creando escala personalizada:', error);
      throw new Error(error?.response?.data?.message || 'Error creando escala personalizada');
    }
  }

  /**
   * Obtener una escala específica por ID
   */
  async getScaleById(scaleId: string): Promise<any> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/scales/${scaleId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo escala por ID:', error);
      throw new Error(error?.response?.data?.message || 'Error obteniendo escala');
    }
  }

  /**
   * Obtener analytics del sistema de calificaciones
   */
  async getSystemAnalytics(period?: string, scope?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      if (scope) params.append('scope', scope);

      const response = await apiClient.get(`${this.baseUrl}/analytics?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo analytics:', error);
      throw new Error(error?.response?.data?.message || 'Error obteniendo analytics');
    }
  }

  /**
   * Generar reporte resumen
   */
  async getSummaryReport(format?: string, scope?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (format) params.append('format', format);
      if (scope) params.append('scope', scope);

      const response = await apiClient.get(`${this.baseUrl}/reports/summary?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error generando reporte:', error);
      throw new Error(error?.response?.data?.message || 'Error generando reporte');
    }
  }

  /**
   * Verificar salud del sistema
   */
  async checkSystemHealth(): Promise<{
    status: string;
    message: string;
    endpoints: string[];
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error: any) {
      console.error('Error verificando salud del sistema:', error);
      throw new Error(error?.response?.data?.message || 'Error verificando sistema');
    }
  }

  /**
   * Obtener todas las calificaciones unificadas de un estudiante
   */
  async getStudentGrades(
    student_id: string,
    filters?: {
      subject_id?: string;
      academic_year_id?: string;
      evaluation_period?: string;
    }
  ): Promise<StudentUnifiedGrades> {
    try {
      const params = new URLSearchParams();
      if (filters?.subject_id) params.append('subject_id', filters.subject_id);
      if (filters?.academic_year_id) params.append('academic_year_id', filters.academic_year_id);
      if (filters?.evaluation_period) params.append('evaluation_period', filters.evaluation_period);

      const response = await apiClient.get(
        `${this.baseUrl}/student-grades/${student_id}?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo calificaciones del estudiante:', error);
      throw new Error(error?.response?.data?.message || 'Error obteniendo calificaciones');
    }
  }

  /**
   * Obtener análisis de rendimiento académico
   */
  async getStudentAnalytics(
    student_id: string,
    academic_year_id?: string
  ): Promise<StudentAnalytics> {
    try {
      const params = new URLSearchParams();
      if (academic_year_id) params.append('academic_year_id', academic_year_id);

      const response = await apiClient.get(
        `${this.baseUrl}/analytics/${student_id}?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo análisis del estudiante:', error);
      throw new Error(error?.response?.data?.message || 'Error obteniendo análisis');
    }
  }

  /**
   * Conversión masiva de calificaciones
   */
  async batchConvertGrades(requests: ConvertGradeRequest[]): Promise<BatchConvertResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/batch-convert`, requests);
      return response.data;
    } catch (error: any) {
      console.error('Error en conversión masiva:', error);
      throw new Error(error?.response?.data?.message || 'Error en conversión masiva');
    }
  }

  /**
   * Migrar calificaciones existentes al sistema unificado (solo admin)
   */
  async migrateExistingGrades(limit: number = 100): Promise<MigrationResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/migrate?limit=${limit}`);
      return response.data;
    } catch (error: any) {
      console.error('Error en migración:', error);
      throw new Error(error?.response?.data?.message || 'Error en migración');
    }
  }

  // =====================================================
  // MÉTODOS DE UTILIDAD PARA FRONTEND
  // =====================================================

  /**
   * Obtener color basado en calificación (0-100)
   */
  getGradeColor(value: number): string {
    if (value >= 90) return '#52c41a'; // Verde (Excelente)
    if (value >= 70) return '#1890ff'; // Azul (Bueno)
    if (value >= 50) return '#faad14'; // Amarillo (Suficiente)
    return '#ff4d4f'; // Rojo (Necesita Mejorar)
  }

  /**
   * Obtener etiqueta de calidad basada en calificación
   */
  getQualityLabel(value: number, etapa?: string): string {
    return lomloeConversion(value, etapa);
  }

  /**
   * Obtener status de progreso para Ant Design
   */
  getProgressStatus(value: number): 'success' | 'normal' | 'exception' | 'active' {
    if (value >= 90) return 'success';
    if (value >= 50) return 'normal';
    return 'exception';
  }

  /**
   * Convertir calificación legacy a sistema unificado
   * Método de compatibilidad para migrar gradualmente el frontend
   */
  async convertLegacyGrade(
    originalValue: number,
    originalScale: string = 'numeric_100'
  ): Promise<ConvertGradeResponse> {
    return await this.convertGrade({
      original_value: originalValue,
      original_scale: originalScale,
      include_alternatives: true
    });
  }

  /**
   * Formatear calificación para mostrar en UI
   */
  formatGradeForDisplay(grade: UnifiedGrade): {
    main: string;
    secondary: string;
    color: string;
    icon: string;
  } {
    const color = this.getGradeColor(grade.hundred_scale_value);
    const quality = this.getQualityLabel(grade.hundred_scale_value);

    let icon = '📊';
    if (grade.hundred_scale_value >= 90) icon = '🌟';
    else if (grade.hundred_scale_value >= 70) icon = '👍';
    else if (grade.hundred_scale_value >= 50) icon = '📈';
    else icon = '⚠️';

    return {
      main: `${grade.hundred_scale_value.toFixed(1)}`,
      secondary: `${quality} ${grade.emoji_grade || ''}`,
      color,
      icon
    };
  }

  /**
   * Obtener configuración de escala recomendada según el contexto
   */
  getRecommendedScale(context: {
    educationalLevel?: string;
    institution?: string;
    country?: string;
  }): string {
    // España tradicionalmente usa 0-10
    if (context.country === 'ES' || context.institution?.includes('España')) {
      return 'numeric_0_10';
    }
    
    // Internacional o otros países usan 0-100
    return 'numeric_100';
  }

  /**
   * Validar si una calificación necesita atención especial
   */
  needsAttention(grade: UnifiedGrade): {
    needs: boolean;
    reason: string;
    urgency: 'high' | 'medium' | 'low';
  } {
    const value = grade.hundred_scale_value;
    
    if (value < 50) {
      return {
        needs: true,
        reason: 'Calificación por debajo del nivel de aprobado',
        urgency: 'high'
      };
    }
    
    if (value < 60) {
      return {
        needs: true,
        reason: 'Calificación en rango de riesgo',
        urgency: 'medium'
      };
    }

    if (value < 70 && grade.evaluation_period === 'final') {
      return {
        needs: true,
        reason: 'Calificación final podría mejorarse',
        urgency: 'low'
      };
    }

    return {
      needs: false,
      reason: 'Calificación en rango aceptable',
      urgency: 'low'
    };
  }

  /**
   * 🔍 VALIDACIÓN DE ESCALAS PERSONALIZADAS
   * Validaciones robustas frontend antes de enviar al backend
   */
  private validateCustomScaleData(scaleData: {
    name: string;
    type: 'numeric' | 'letter' | 'rubric' | 'custom';
    description: string;
    minValue: number;
    maxValue: number;
    steps: Array<{
      min: number;
      max: number;
      label: string;
      description?: string;
    }>;
  }): void {
    // Validar nombre
    if (!scaleData.name || scaleData.name.trim().length === 0) {
      throw new Error('El nombre de la escala es obligatorio');
    }

    if (scaleData.name.length > 100) {
      throw new Error('El nombre de la escala no puede exceder 100 caracteres');
    }

    // Validar descripción
    if (!scaleData.description || scaleData.description.trim().length === 0) {
      throw new Error('La descripción de la escala es obligatoria');
    }

    // Validar rango de valores
    if (scaleData.minValue >= scaleData.maxValue) {
      throw new Error('El valor mínimo debe ser menor que el valor máximo');
    }

    if (scaleData.minValue < 0) {
      throw new Error('El valor mínimo no puede ser negativo');
    }

    if (scaleData.maxValue > 1000) {
      throw new Error('El valor máximo no puede exceder 1000');
    }

    // Validar steps
    if (!scaleData.steps || scaleData.steps.length === 0) {
      throw new Error('Debe definir al menos un nivel en la escala');
    }

    if (scaleData.steps.length > 20) {
      throw new Error('No puede definir más de 20 niveles en una escala');
    }

    // Validar que los steps cubran todo el rango sin gaps ni overlaps
    const sortedSteps = [...scaleData.steps].sort((a, b) => a.min - b.min);
    
    // Verificar que no haya solapamientos
    for (let i = 0; i < sortedSteps.length - 1; i++) {
      if (sortedSteps[i].max >= sortedSteps[i + 1].min) {
        throw new Error(`Los rangos se solapan: "${sortedSteps[i].label}" (${sortedSteps[i].min}-${sortedSteps[i].max}) y "${sortedSteps[i + 1].label}" (${sortedSteps[i + 1].min}-${sortedSteps[i + 1].max})`);
      }
    }

    // Verificar que cubra todo el rango definido
    if (sortedSteps[0].min > scaleData.minValue) {
      throw new Error(`Los niveles deben comenzar desde el valor mínimo (${scaleData.minValue}). El primer nivel comienza en ${sortedSteps[0].min}`);
    }

    if (sortedSteps[sortedSteps.length - 1].max < scaleData.maxValue) {
      throw new Error(`Los niveles deben llegar hasta el valor máximo (${scaleData.maxValue}). El último nivel termina en ${sortedSteps[sortedSteps.length - 1].max}`);
    }

    // Verificar que no hay gaps entre steps
    for (let i = 0; i < sortedSteps.length - 1; i++) {
      if (sortedSteps[i].max + 1 !== sortedSteps[i + 1].min) {
        throw new Error(`Existe un gap entre "${sortedSteps[i].label}" (${sortedSteps[i].max}) y "${sortedSteps[i + 1].label}" (${sortedSteps[i + 1].min})`);
      }
    }

    // Validar labels únicos y no vacíos
    const labels = scaleData.steps.map(step => step.label.trim());
    const uniqueLabels = new Set(labels);
    
    if (labels.some(label => label.length === 0)) {
      throw new Error('Todos los niveles deben tener un nombre');
    }

    if (labels.length !== uniqueLabels.size) {
      throw new Error('Los nombres de los niveles deben ser únicos');
    }

    if (labels.some(label => label.length > 50)) {
      throw new Error('Los nombres de los niveles no pueden exceder 50 caracteres');
    }

    // Validar rangos individuales
    scaleData.steps.forEach((step, index) => {
      if (step.min >= step.max) {
        throw new Error(`En el nivel "${step.label}": el valor mínimo (${step.min}) debe ser menor que el máximo (${step.max})`);
      }

      if (step.description && step.description.length > 200) {
        throw new Error(`La descripción del nivel "${step.label}" no puede exceder 200 caracteres`);
      }
    });
  }
}

// Export singleton instance
export const unifiedGradingService = new UnifiedGradingService();
export default unifiedGradingService;