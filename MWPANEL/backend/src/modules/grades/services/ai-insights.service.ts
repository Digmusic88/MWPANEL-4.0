/**
 * @archivo: ai-insights.service.ts
 * @módulo: Grades (Centralización de Valoraciones)
 * @función: Generación de insights de IA para análisis educativo
 * @crítico: SÍ - Análisis inteligente del rendimiento académico
 * @actualizado: Julio 2025 - Sistema de IA integrado
 */

import { Injectable, Logger } from '@nestjs/common';
import { AIInsights, GradeBreakdown } from '../entities/centralized-grade.entity';
import { GradeConfiguration, GradeComponent } from '../entities/grade-configuration.entity';
import { HuggingFaceMCPService } from '../../../services/ai/huggingface-mcp.service';

export interface PerformanceAnalysis {
  strengths: string[];
  weaknesses: string[];
  patterns: string[];
  recommendations: string[];
  competencyGaps: string[];
  learningStyle: string;
  motivationFactors: string[];
}

export interface PredictiveAnalysis {
  trajectory: 'accelerating' | 'steady' | 'concerning';
  predictedGrade: number;
  confidence: number;
  riskFactors: string[];
  interventionNeeded: boolean;
  suggestedActions: string[];
}

@Injectable()
export class AIInsightsService {
  private readonly logger = new Logger(AIInsightsService.name);

  constructor(
    private readonly huggingFaceService: HuggingFaceMCPService,
  ) {}

  /**
   * Genera insights de IA completos para un estudiante
   */
  async generateStudentInsights(
    studentData: any,
    breakdown: GradeBreakdown[],
    configuration: GradeConfiguration,
    historicalData?: any[],
  ): Promise<AIInsights> {
    try {
      this.logger.log(`🧠 Generando insights de IA para estudiante ${studentData.id}`);

      // Análisis de rendimiento actual
      const performanceAnalysis = await this.analyzeCurrentPerformance(breakdown, configuration);
      
      // Análisis predictivo
      const predictiveAnalysis = await this.generatePredictiveAnalysis(
        breakdown,
        historicalData || [],
        configuration,
      );

      // Análisis de competencias
      const competencyAlignment = await this.analyzeCompetencyAlignment(
        breakdown,
        configuration,
      );

      // Recomendaciones personalizadas
      const recommendations = await this.generatePersonalizedRecommendations(
        performanceAnalysis,
        predictiveAnalysis,
        studentData,
      );

      return {
        overallAssessment: this.generateOverallAssessment(performanceAnalysis, predictiveAnalysis),
        strengthAreas: performanceAnalysis.strengths,
        improvementAreas: performanceAnalysis.weaknesses,
        competencyAlignment,
        learningProgress: {
          trajectory: predictiveAnalysis.trajectory,
          predictedOutcome: predictiveAnalysis.predictedGrade,
          confidence: predictiveAnalysis.confidence,
        },
        recommendations,
        generatedAt: new Date(),
        modelVersion: '2.0.0',
      };

    } catch (error) {
      this.logger.error(`❌ Error generando insights de IA: ${error.message}`);
      return this.generateFallbackInsights(breakdown);
    }
  }

  /**
   * Analiza el rendimiento actual del estudiante
   */
  private async analyzeCurrentPerformance(
    breakdown: GradeBreakdown[],
    configuration: GradeConfiguration,
  ): Promise<PerformanceAnalysis> {
    const analysis: PerformanceAnalysis = {
      strengths: [],
      weaknesses: [],
      patterns: [],
      recommendations: [],
      competencyGaps: [],
      learningStyle: 'visual', // Por determinar con análisis más profundo
      motivationFactors: [],
    };

    // Analizar cada componente
    for (const component of breakdown) {
      const normalizedScore = component.normalizedScore;
      const componentName = this.getComponentDisplayName(component.component);

      if (normalizedScore >= 8.5) {
        analysis.strengths.push(`Excelente rendimiento en ${componentName}`);
      } else if (normalizedScore >= 7.0) {
        analysis.strengths.push(`Buen nivel en ${componentName}`);
      } else if (normalizedScore >= 5.0) {
        analysis.patterns.push(`Rendimiento promedio en ${componentName}`);
      } else {
        analysis.weaknesses.push(`Necesita reforzar ${componentName}`);
        analysis.competencyGaps.push(componentName);
      }

      // Analizar confianza de datos
      if (component.confidence < 0.7) {
        analysis.patterns.push(`Datos limitados en ${componentName} (${component.itemCount} elementos)`);
      }
    }

    // Analizar consistencia
    const scores = breakdown.map(b => b.normalizedScore);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    if (standardDeviation < 1.0) {
      analysis.patterns.push('Rendimiento consistente entre diferentes tipos de evaluación');
      analysis.motivationFactors.push('Estabilidad en el desempeño');
    } else if (standardDeviation > 2.0) {
      analysis.patterns.push('Rendimiento variable según el tipo de evaluación');
      analysis.recommendations.push('Identificar métodos de evaluación más efectivos');
    }

    // Recomendaciones basadas en fortalezas y debilidades
    if (analysis.strengths.length > analysis.weaknesses.length) {
      analysis.recommendations.push('Aprovechar fortalezas para reforzar áreas de mejora');
      analysis.motivationFactors.push('Confianza en habilidades desarrolladas');
    }

    if (analysis.weaknesses.length > 0) {
      analysis.recommendations.push('Enfoque específico en las áreas identificadas como débiles');
      analysis.recommendations.push('Considerar métodos de enseñanza alternativos');
    }

    return analysis;
  }

  /**
   * Genera análisis predictivo basado en datos históricos
   */
  private async generatePredictiveAnalysis(
    currentBreakdown: GradeBreakdown[],
    historicalData: any[],
    configuration: GradeConfiguration,
  ): Promise<PredictiveAnalysis> {
    const currentAverage = currentBreakdown.reduce((sum, b) => sum + b.normalizedScore, 0) / currentBreakdown.length;
    
    let trajectory: 'accelerating' | 'steady' | 'concerning' = 'steady';
    let predictedGrade = currentAverage;
    let confidence = 0.75;
    const riskFactors: string[] = [];
    const suggestedActions: string[] = [];

    // Análisis de tendencia si hay datos históricos
    if (historicalData.length >= 2) {
      const recentGrades = historicalData.slice(-3).map(d => d.finalGrade);
      const trend = this.calculateTrend(recentGrades);
      
      if (trend > 0.5) {
        trajectory = 'accelerating';
        predictedGrade = Math.min(10, currentAverage + trend);
        confidence = 0.85;
      } else if (trend < -0.5) {
        trajectory = 'concerning';
        predictedGrade = Math.max(0, currentAverage + trend);
        confidence = 0.80;
        riskFactors.push('Tendencia decreciente en calificaciones');
      }
    }

    // Factores de riesgo
    if (currentAverage < configuration.passingGrade) {
      riskFactors.push('Calificación por debajo del umbral de aprobación');
      suggestedActions.push('Intervención inmediata requerida');
    }

    const lowConfidenceComponents = currentBreakdown.filter(b => b.confidence < 0.6);
    if (lowConfidenceComponents.length > 0) {
      riskFactors.push('Datos insuficientes en algunos componentes');
      suggestedActions.push('Aumentar frecuencia de evaluaciones');
    }

    // Sugerencias basadas en análisis
    if (trajectory === 'accelerating') {
      suggestedActions.push('Mantener estrategias actuales');
      suggestedActions.push('Considerar desafíos adicionales');
    } else if (trajectory === 'concerning') {
      suggestedActions.push('Revisar metodología de enseñanza');
      suggestedActions.push('Aumentar apoyo individualizado');
    }

    return {
      trajectory,
      predictedGrade,
      confidence,
      riskFactors,
      interventionNeeded: riskFactors.length > 0 || currentAverage < configuration.passingGrade,
      suggestedActions,
    };
  }

  /**
   * Analiza alineación con competencias educativas
   */
  private async analyzeCompetencyAlignment(
    breakdown: GradeBreakdown[],
    configuration: GradeConfiguration,
  ): Promise<any> {
    const competencyAlignment: any = {};

    // Mapear componentes a competencias (simplificado)
    const competencyMap = {
      [GradeComponent.TASKS]: 'Competencia en resolución de problemas',
      [GradeComponent.ACTIVITIES]: 'Competencia en trabajo colaborativo',
      [GradeComponent.EVALUATIONS]: 'Competencia en conocimientos teóricos',
      [GradeComponent.RUBRICS]: 'Competencia en aplicación práctica',
      [GradeComponent.PARTICIPATION]: 'Competencia comunicativa',
    };

    breakdown.forEach(component => {
      const competency = competencyMap[component.component as GradeComponent];
      if (competency) {
        competencyAlignment[competency] = {
          level: this.getCompetencyLevel(component.normalizedScore),
          score: component.normalizedScore,
          confidence: component.confidence,
          evidence: `${component.itemCount} evaluaciones`,
        };
      }
    });

    return competencyAlignment;
  }

  /**
   * Genera recomendaciones personalizadas
   */
  private async generatePersonalizedRecommendations(
    performance: PerformanceAnalysis,
    prediction: PredictiveAnalysis,
    studentData: any,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Recomendaciones basadas en fortalezas
    if (performance.strengths.length > 0) {
      recommendations.push('Utilizar fortalezas identificadas como base para el aprendizaje');
    }

    // Recomendaciones basadas en debilidades
    if (performance.weaknesses.length > 0) {
      recommendations.push('Enfoque específico en áreas que requieren mejora');
      
      if (performance.weaknesses.length > 2) {
        recommendations.push('Priorizar 1-2 áreas de mejora para evitar dispersión');
      }
    }

    // Recomendaciones predictivas
    if (prediction.interventionNeeded) {
      recommendations.push('Implementar plan de apoyo individualizado');
      recommendations.push('Seguimiento semanal del progreso');
    }

    // Recomendaciones metodológicas
    if (performance.patterns.includes('variable')) {
      recommendations.push('Explorar diferentes métodos de evaluación');
      recommendations.push('Adaptar estrategias según tipo de contenido');
    }

    // Recomendaciones motivacionales
    if (performance.motivationFactors.length > 0) {
      recommendations.push('Reforzar factores motivacionales identificados');
    }

    return recommendations;
  }

  /**
   * Genera evaluación general del rendimiento
   */
  private generateOverallAssessment(
    performance: PerformanceAnalysis,
    prediction: PredictiveAnalysis,
  ): string {
    const strengthsCount = performance.strengths.length;
    const weaknessesCount = performance.weaknesses.length;
    const trajectory = prediction.trajectory;

    if (strengthsCount > weaknessesCount && trajectory === 'accelerating') {
      return 'Estudiante con rendimiento sólido y tendencia positiva. Mantener estrategias actuales.';
    } else if (strengthsCount > weaknessesCount && trajectory === 'steady') {
      return 'Rendimiento consistente con fortalezas claras. Considerar desafíos adicionales.';
    } else if (weaknessesCount > strengthsCount && trajectory === 'concerning') {
      return 'Requiere atención inmediata. Implementar plan de apoyo personalizado.';
    } else if (prediction.interventionNeeded) {
      return 'Estudiante en situación de riesgo académico. Intervención educativa recomendada.';
    } else {
      return 'Rendimiento dentro de parámetros normales. Continuar con seguimiento regular.';
    }
  }

  /**
   * Genera insights básicos cuando falla el sistema de IA
   */
  private generateFallbackInsights(breakdown: GradeBreakdown[]): AIInsights {
    const average = breakdown.reduce((sum, b) => sum + b.normalizedScore, 0) / breakdown.length;
    
    return {
      overallAssessment: 'Análisis básico completado. Sistema de IA temporalmente no disponible.',
      strengthAreas: breakdown
        .filter(b => b.normalizedScore >= 7)
        .map(b => `Buen rendimiento en ${this.getComponentDisplayName(b.component)}`),
      improvementAreas: breakdown
        .filter(b => b.normalizedScore < 5)
        .map(b => `Mejorar en ${this.getComponentDisplayName(b.component)}`),
      competencyAlignment: {},
      learningProgress: {
        trajectory: 'steady',
        predictedOutcome: average,
        confidence: 0.5,
      },
      recommendations: [
        'Revisar áreas con calificaciones inferiores a 5.0',
        'Mantener enfoque en fortalezas identificadas',
      ],
      generatedAt: new Date(),
      modelVersion: '1.0.0-fallback',
    };
  }

  // Métodos auxiliares
  private calculateTrend(grades: number[]): number {
    if (grades.length < 2) return 0;
    
    const firstHalf = grades.slice(0, Math.floor(grades.length / 2));
    const secondHalf = grades.slice(Math.floor(grades.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, g) => sum + g, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, g) => sum + g, 0) / secondHalf.length;
    
    return secondAvg - firstAvg;
  }

  private getComponentDisplayName(component: string): string {
    const displayNames = {
      tasks: 'Tareas',
      activities: 'Actividades',
      evaluations: 'Evaluaciones',
      rubrics: 'Rúbricas',
      ai_assessments: 'Evaluaciones IA',
      exams: 'Exámenes',
      projects: 'Proyectos',
      participation: 'Participación',
      homework: 'Deberes',
      presentations: 'Presentaciones',
    };
    return displayNames[component] || component;
  }

  private getCompetencyLevel(score: number): string {
    if (score >= 9) return 'Excelente';
    if (score >= 7) return 'Notable';
    if (score >= 5) return 'Satisfactorio';
    if (score >= 3) return 'En desarrollo';
    return 'Necesita apoyo';
  }
}