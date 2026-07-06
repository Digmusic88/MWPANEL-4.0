/**
 * @archivo: huggingface-ai.service.ts
 * @módulo: Services (IA Real)
 * @función: Integración con HuggingFace para análisis semántico de actividades educativas usando MCP
 * @crítico: SÍ - Sistema de IA real para sugerencias de competencias
 * @actualizado: Julio 2025 - Migrado a HuggingFace MCP Server
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HuggingFaceMCPService } from './ai/huggingface-mcp.service';

export interface AIAnalysisRequest {
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

@Injectable()
export class HuggingFaceAIService {
  private readonly logger = new Logger(HuggingFaceAIService.name);
  private readonly apiToken: string;
  private readonly baseUrl = 'https://api-inference.huggingface.co/models';
  
  // Modelos españoles especializados
  private readonly models = {
    textClassification: 'PlanTL-GOB-ES/roberta-large-bne',
    semanticSimilarity: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
    textGeneration: 'BSC-TeMU/PlanTL-GOB-ES-gpt2-base'
  };

  // Base de conocimiento de competencias españolas
  private readonly competencyDatabase = {
    INFANTIL: {
      competencies: [
        { code: 'CCL', name: 'Competencia en comunicación lingüística', keywords: ['comunicación', 'lenguaje', 'expresión', 'comprensión'] },
        { code: 'STEM', name: 'Competencia matemática y en ciencia', keywords: ['matemáticas', 'números', 'ciencia', 'experimentar'] },
        { code: 'CD', name: 'Competencia digital', keywords: ['digital', 'tecnología', 'ordenador'] },
        { code: 'CPSAA', name: 'Competencia personal, social y de aprender', keywords: ['autonomía', 'social', 'emociones', 'aprender'] },
        { code: 'CC', name: 'Competencia ciudadana', keywords: ['convivencia', 'respeto', 'normas'] },
        { code: 'CE', name: 'Competencia emprendedora', keywords: ['iniciativa', 'creatividad', 'proyectos'] },
        { code: 'CCEC', name: 'Competencia en conciencia cultural', keywords: ['arte', 'cultura', 'creatividad', 'expresión'] }
      ]
    },
    PRIMARIA: {
      competencies: [
        { code: 'CCL', name: 'Competencia en comunicación lingüística', keywords: ['lectura', 'escritura', 'comunicación', 'vocabulario', 'gramática'] },
        { code: 'STEM', name: 'Competencia matemática y en ciencia y tecnología', keywords: ['matemáticas', 'ciencias', 'método científico', 'resolución problemas'] },
        { code: 'CD', name: 'Competencia digital', keywords: ['tecnologías', 'programación', 'internet', 'seguridad digital'] },
        { code: 'CPSAA', name: 'Competencia personal, social y de aprender a aprender', keywords: ['autonomía', 'metacognición', 'colaboración', 'bienestar'] },
        { code: 'CC', name: 'Competencia ciudadana', keywords: ['democracia', 'derechos humanos', 'sostenibilidad', 'diversidad'] },
        { code: 'CE', name: 'Competencia emprendedora', keywords: ['iniciativa', 'liderazgo', 'innovación', 'sostenibilidad económica'] },
        { code: 'CCEC', name: 'Competencia en conciencia y expresión culturales', keywords: ['patrimonio', 'arte', 'música', 'expresión artística'] }
      ]
    },
    SECUNDARIA: {
      competencies: [
        { code: 'CCL', name: 'Competencia en comunicación lingüística', keywords: ['análisis textual', 'argumentación', 'retórica', 'multimodalidad'] },
        { code: 'STEM', name: 'Competencia matemática y en ciencia y tecnología', keywords: ['pensamiento científico', 'modelización', 'investigación', 'innovación'] },
        { code: 'CD', name: 'Competencia digital', keywords: ['ciudadanía digital', 'inteligencia artificial', 'big data', 'ciberseguridad'] },
        { code: 'CPSAA', name: 'Competencia personal, social y de aprender a aprender', keywords: ['identidad', 'resiliencia', 'autorregulación', 'colaboración'] },
        { code: 'CC', name: 'Competencia ciudadana', keywords: ['pensamiento crítico', 'participación democrática', 'justicia social'] },
        { code: 'CE', name: 'Competencia emprendedora', keywords: ['emprendimiento social', 'economía sostenible', 'transformación social'] },
        { code: 'CCEC', name: 'Competencia en conciencia y expresión culturales', keywords: ['identidad cultural', 'diálogo intercultural', 'creación artística'] }
      ]
    }
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly huggingFaceMCPService: HuggingFaceMCPService
  ) {
    this.apiToken = this.configService.get<string>('HUGGINGFACE_API_TOKEN');
    if (!this.apiToken) {
      this.logger.warn('🚨 HuggingFace API token not configured. Using MCP service as primary method.');
    }
  }

  /**
   * Analiza una actividad educativa y sugiere competencias usando IA real
   * Prioriza MCP service sobre llamadas directas a la API
   */
  async analyzeActivity(request: AIAnalysisRequest): Promise<CompetencySuggestion[]> {
    try {
      this.logger.log(`🤖 [HuggingFaceAIService] STARTING analysis: "${request.title}" for stage: ${request.stage}`);
      
      // PRIORIDAD 1: Usar servicio MCP (más robusto y eficiente)
      try {
        this.logger.log('🔄 [HuggingFaceAIService] Attempting analysis with HuggingFace MCP Service...');
        const mcpSuggestions = await this.huggingFaceMCPService.analyzeActivity(request);
        if (mcpSuggestions && mcpSuggestions.length > 0) {
          this.logger.log(`✅ [HuggingFaceAIService] MCP Service generated ${mcpSuggestions.length} AI-powered suggestions`);
          return mcpSuggestions;
        } else {
          this.logger.warn('⚠️ [HuggingFaceAIService] MCP Service returned empty results');
        }
      } catch (mcpError) {
        this.logger.error(`❌ [HuggingFaceAIService] MCP Service failed: ${mcpError.message}`);
        this.logger.warn('🔄 [HuggingFaceAIService] Trying direct API...');
      }

      // PRIORIDAD 2: Usar API directa si MCP falla
      if (this.apiToken) {
        this.logger.log('🔄 [HuggingFaceAIService] Attempting analysis with direct HuggingFace API...');
        const activityText = `${request.title}. ${request.description}`;
        const semanticAnalysis = await this.performSemanticAnalysis(activityText, request.stage);
        const suggestions = await this.generateAISuggestions(semanticAnalysis, request);
        
        if (suggestions && suggestions.length > 0) {
          this.logger.log(`✅ [HuggingFaceAIService] Direct API generated ${suggestions.length} suggestions`);
          return suggestions;
        }
      } else {
        this.logger.warn('⚠️ [HuggingFaceAIService] No API token available for direct API fallback');
      }

      // PRIORIDAD 3: Fallback a reglas mejoradas
      this.logger.warn('🔄 [HuggingFaceAIService] Both AI methods failed, using enhanced rule-based suggestions');
      return this.generateRuleBasedSuggestions(request);

    } catch (error) {
      this.logger.error(`❌ [HuggingFaceAIService] All AI analysis methods failed: ${error.message}`);
      this.logger.error(`❌ [HuggingFaceAIService] Error stack: ${error.stack}`);
      this.logger.warn('🔄 [HuggingFaceAIService] Final fallback to rule-based suggestions');
      return this.generateRuleBasedSuggestions(request);
    }
  }

  /**
   * Realiza análisis semántico usando HuggingFace
   */
  private async performSemanticAnalysis(text: string, stage: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/${this.models.textClassification}`;
      this.logger.log(`🌐 Making HTTP request to HuggingFace: ${url}`);
      this.logger.log(`📝 Input text: "${text.substring(0, 100)}..."`);
      
      // Usar modelo español especializado
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          inputs: text,
          parameters: {
            candidate_labels: this.getCompetencyLabels(stage),
            multi_label: true
          }
        }),
      });

      this.logger.log(`📡 HuggingFace response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ HuggingFace API error: ${response.status} ${response.statusText}`);
        this.logger.error(`❌ Error details: ${errorText}`);
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      this.logger.log(`✅ HuggingFace API SUCCESS! Response:`, JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Semantic analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera sugerencias usando análisis de IA
   */
  private async generateAISuggestions(semanticAnalysis: any, request: AIAnalysisRequest): Promise<CompetencySuggestion[]> {
    const suggestions: CompetencySuggestion[] = [];
    const stageCompetencies = this.competencyDatabase[request.stage];
    
    // Si el análisis semántico devuelve scores por etiquetas
    if (semanticAnalysis.labels && semanticAnalysis.scores) {
      for (let i = 0; i < semanticAnalysis.labels.length; i++) {
        const label = semanticAnalysis.labels[i];
        const score = semanticAnalysis.scores[i];
        
        // Buscar competencia correspondiente
        const competency = stageCompetencies.competencies.find(c => 
          label.toLowerCase().includes(c.code.toLowerCase()) || 
          label.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
        );

        if (competency && score > (request.minScore || 0.3)) {
          suggestions.push({
            id: `ai-${suggestions.length + 1}`,
            type: this.determineCompetencyType(competency.code, request.stage),
            text: await this.generateContextualText(competency, request, score),
            code: this.generateCompetencyCode(competency.code, request.stage),
            score: score,
            percentage: Math.round(score * 100),
            confidence: this.calculateConfidence(score),
            competencyCode: competency.code,
            competencyName: competency.name,
            subjectArea: this.determineSubjectArea(competency.code, request.stage)
          });
        }
      }
    }

    // Si no hay suficientes sugerencias de IA, complementar con análisis semántico
    if (suggestions.length < (request.maxSuggestions || 4)) {
      const additionalSuggestions = this.generateSemanticSuggestions(request);
      suggestions.push(...additionalSuggestions.slice(0, (request.maxSuggestions || 4) - suggestions.length));
    }

    // Ordenar por score y limitar
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, request.maxSuggestions || 4);
  }

  /**
   * Genera texto contextual usando IA para cada competencia
   */
  private async generateContextualText(competency: any, request: AIAnalysisRequest, score: number): Promise<string> {
    try {
      const prompt = `Para la actividad "${request.title}" en ${request.stage}, generar criterio de evaluación específico para ${competency.name}:`;
      
      const response = await fetch(`${this.baseUrl}/${this.models.textGeneration}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 150,
            temperature: 0.7,
            do_sample: true,
            top_p: 0.9
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result[0]?.generated_text) {
          // Limpiar y extraer solo la parte relevante
          const generatedText = result[0].generated_text.replace(prompt, '').trim();
          return generatedText || this.getFallbackText(competency, request);
        }
      }
    } catch (error) {
      this.logger.debug(`Text generation fallback for ${competency.code}: ${error.message}`);
    }

    return this.getFallbackText(competency, request);
  }

  /**
   * Fallback a sugerencias basadas en reglas cuando IA falla
   */
  private generateRuleBasedSuggestions(request: AIAnalysisRequest): CompetencySuggestion[] {
    this.logger.log(`🔧 Generating rule-based suggestions for: ${request.title}`);
    
    const stageCompetencies = this.competencyDatabase[request.stage];
    const suggestions: CompetencySuggestion[] = [];
    
    // Análisis semántico simple basado en palabras clave
    const activityText = `${request.title} ${request.description}`.toLowerCase();
    
    stageCompetencies.competencies.forEach((competency, index) => {
      const matchedKeywords = competency.keywords.filter(keyword => 
        activityText.includes(keyword.toLowerCase())
      );
      
      if (matchedKeywords.length > 0 || index < 3) { // Siempre incluir las 3 primeras
        const score = matchedKeywords.length > 0 
          ? 0.7 + (matchedKeywords.length * 0.1) 
          : 0.6 - (index * 0.1);
          
        suggestions.push({
          id: `rule-${index + 1}`,
          type: this.determineCompetencyType(competency.code, request.stage),
          text: this.getFallbackText(competency, request),
          code: this.generateCompetencyCode(competency.code, request.stage),
          score: Math.min(score, 0.95),
          percentage: Math.round(Math.min(score, 0.95) * 100),
          confidence: this.calculateConfidence(score),
          competencyCode: competency.code,
          competencyName: competency.name,
          subjectArea: this.determineSubjectArea(competency.code, request.stage)
        });
      }
    });

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, request.maxSuggestions || 4);
  }

  /**
   * Genera sugerencias adicionales basadas en análisis semántico
   */
  private generateSemanticSuggestions(request: AIAnalysisRequest): CompetencySuggestion[] {
    // Análisis más sofisticado basado en patrones pedagógicos
    const patterns = this.analyzeEducationalPatterns(request);
    return patterns.map((pattern, index) => ({
      id: `semantic-${index + 1}`,
      type: pattern.type,
      text: pattern.text,
      code: pattern.code,
      score: pattern.score,
      percentage: Math.round(pattern.score * 100),
      confidence: this.calculateConfidence(pattern.score),
      competencyCode: pattern.competencyCode,
      competencyName: pattern.competencyName,
      subjectArea: pattern.subjectArea
    }));
  }

  /**
   * Analiza patrones educativos en la actividad
   */
  private analyzeEducationalPatterns(request: AIAnalysisRequest): any[] {
    const patterns = [];
    const text = `${request.title} ${request.description}`.toLowerCase();
    
    // Detectar metodologías pedagógicas
    if (text.includes('grupo') || text.includes('colabora') || text.includes('equipo')) {
      patterns.push({
        type: 'criteria',
        text: `Evaluar la capacidad de trabajo colaborativo y comunicación en "${request.title}"`,
        code: 'CRIT.COL.1',
        score: 0.85,
        competencyCode: 'CPSAA',
        competencyName: 'Competencia personal, social y de aprender a aprender',
        subjectArea: 'Transversal'
      });
    }

    if (text.includes('investiga') || text.includes('busca') || text.includes('analiza')) {
      patterns.push({
        type: 'operative',
        text: `Desarrollar habilidades de investigación y análisis crítico`,
        code: 'DO.INV.1',
        score: 0.80,
        competencyCode: 'CCL',
        competencyName: 'Competencia en comunicación lingüística',
        subjectArea: 'Metodología'
      });
    }

    if (text.includes('crea') || text.includes('diseña') || text.includes('elabora')) {
      patterns.push({
        type: 'specific',
        text: `Fomentar la creatividad y el pensamiento divergente a través de "${request.title}"`,
        code: 'CE.CREA.1',
        score: 0.78,
        competencyCode: 'CE',
        competencyName: 'Competencia emprendedora',
        subjectArea: 'Creatividad'
      });
    }

    return patterns;
  }

  // Métodos auxiliares
  private getCompetencyLabels(stage: string): string[] {
    return this.competencyDatabase[stage]?.competencies.map(c => c.name) || [];
  }

  private determineCompetencyType(code: string, stage: string): 'specific' | 'knowledge' | 'criteria' | 'operative' {
    const types = ['specific', 'criteria', 'knowledge', 'operative'];
    return types[Math.abs(code.charCodeAt(0) + stage.charCodeAt(0)) % 4] as any;
  }

  private generateCompetencyCode(competencyCode: string, stage: string): string {
    const prefixes = { specific: 'CE', criteria: 'CRIT', knowledge: 'SB', operative: 'DO' };
    const type = this.determineCompetencyType(competencyCode, stage);
    return `${prefixes[type]}.${competencyCode}.${Math.floor(Math.random() * 9) + 1}`;
  }

  private calculateConfidence(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.75) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  private determineSubjectArea(competencyCode: string, stage: string): string {
    const subjectMap = {
      CCL: 'Lengua Castellana y Literatura',
      STEM: stage === 'PRIMARIA' ? 'Matemáticas y Ciencias Naturales' : 'Ciencias',
      CD: 'Tecnología y Digitalización',
      CPSAA: 'Educación en Valores',
      CC: 'Ciencias Sociales',
      CE: 'Educación para la Ciudadanía',
      CCEC: 'Educación Artística'
    };
    return subjectMap[competencyCode] || 'Transversal';
  }

  private getFallbackText(competency: any, request: AIAnalysisRequest): string {
    const templates = {
      specific: `Desarrollar ${competency.name.toLowerCase()} a través de la actividad "${request.title}"`,
      criteria: `Evaluar el logro de objetivos relacionados con ${competency.name.toLowerCase()} en "${request.title}"`,
      knowledge: `Aplicar conocimientos de ${competency.name.toLowerCase()} en el contexto de "${request.title}"`,
      operative: `Demostrar ${competency.name.toLowerCase()} mediante la realización de "${request.title}"`
    };
    
    const type = this.determineCompetencyType(competency.code, request.stage);
    return templates[type] || `Competencia relacionada con "${request.title}"`;
  }
}