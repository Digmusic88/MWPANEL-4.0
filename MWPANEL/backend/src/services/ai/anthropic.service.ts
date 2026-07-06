import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface AIContentRequest {
  ageGroup: 'starter' | 'explorer' | 'master';
  contentType: 'exercise' | 'challenge' | 'feedback' | 'story' | 'words' | 'code_challenge';
  theme?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  userLevel: number;
  userStats?: {
    wpmAverage: number;
    accuracyAverage: number;
    weakAreas?: string[];
    strengths?: string[];
  };
  context?: string;
  requirements?: {
    wordCount?: number;
    includeWords?: string[];
    avoidWords?: string[];
    targetWPM?: number;
    focusAreas?: string[];
    language?: string;
    codeChallenge?: boolean;
  };
}

export interface AIContentResponse {
  content: string;
  metadata?: {
    estimatedDifficulty: number;
    estimatedWPM: number;
    keyWords: string[];
    theme: string;
    tips?: string[];
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly anthropic: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey || apiKey === 'your-anthropic-api-key-here') {
      this.logger.warn('Anthropic API key not configured. AI features will be disabled.');
      return;
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });

    this.model = this.configService.get<string>('AI_MODEL', 'claude-opus-4-7');
    this.maxTokens = this.configService.get<number>('AI_MAX_TOKENS', 4000);

    this.logger.log(`Anthropic service initialized with model: ${this.model}`);
  }

  /**
   * Generate educational content using Claude AI
   */
  async generateContent(request: AIContentRequest): Promise<AIContentResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic API not configured');
    }

    try {
      const systemPrompt = this.buildSystemPrompt(request);
      const userPrompt = this.buildUserPrompt(request);

      this.logger.debug(`Generating ${request.contentType} for ${request.ageGroup} level ${request.userLevel}`);

      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      const content = message.content[0]?.type === 'text' ? message.content[0].text : '';
      
      return {
        content,
        metadata: this.extractMetadata(content, request),
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens
        }
      };

    } catch (error) {
      this.logger.error('Failed to generate AI content:', error);
      throw new Error(`AI content generation failed: ${error.message}`);
    }
  }

  /**
   * Generate typing exercise text
   */
  async generateTypingExercise(request: Omit<AIContentRequest, 'contentType'>): Promise<string> {
    const response = await this.generateContent({
      ...request,
      contentType: 'exercise'
    });
    return response.content;
  }

  /**
   * Generate challenge content
   */
  async generateChallengeContent(request: Omit<AIContentRequest, 'contentType'>): Promise<AIContentResponse> {
    return this.generateContent({
      ...request,
      contentType: 'challenge'
    });
  }

  /**
   * Generate personalized feedback
   */
  async generateFeedback(request: Omit<AIContentRequest, 'contentType'>): Promise<string> {
    const response = await this.generateContent({
      ...request,
      contentType: 'feedback'
    });
    return response.content;
  }

  /**
   * Generate themed word lists
   */
  async generateThemedWords(
    theme: string, 
    ageGroup: 'starter' | 'explorer' | 'master',
    count: number = 20
  ): Promise<string[]> {
    const response = await this.generateContent({
      ageGroup,
      contentType: 'words',
      theme,
      difficulty: 'medium',
      userLevel: 1,
      requirements: { wordCount: count }
    });

    // Parse words from response
    const words = response.content
      .split(/[,\n\r]+/)
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length > 0 && /^[a-záéíóúñü]+$/i.test(word));

    return words.slice(0, count);
  }

  /**
   * Generate story-based typing content
   */
  async generateStoryContent(request: Omit<AIContentRequest, 'contentType'>): Promise<AIContentResponse> {
    return this.generateContent({
      ...request,
      contentType: 'story'
    });
  }

  /**
   * Generate programming code challenge
   */
  async generateCodeChallenge(request: Omit<AIContentRequest, 'contentType'>): Promise<any> {
    const response = await this.generateContent({
      ...request,
      contentType: 'code_challenge'
    });

    // Parse structured response for code challenges
    const lines = response.content.split('\n');
    let title = 'Desafío de Programación';
    let description = 'Desafío generado por IA';
    let code = response.content;
    let explanation = 'Explicación generada por IA';
    let hints: string[] = [];
    let topics: string[] = [];

    // Extract structured data if present
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('TÍTULO:') || line.startsWith('TITLE:')) {
        title = line.split(':')[1]?.trim() || title;
      } else if (line.startsWith('DESCRIPCIÓN:') || line.startsWith('DESCRIPTION:')) {
        description = line.split(':')[1]?.trim() || description;
      } else if (line.startsWith('CÓDIGO:') || line.startsWith('CODE:')) {
        // Extract code block
        const codeStart = i + 1;
        let codeEnd = codeStart;
        while (codeEnd < lines.length && !lines[codeEnd].startsWith('EXPLICACIÓN:') && !lines[codeEnd].startsWith('EXPLANATION:')) {
          codeEnd++;
        }
        code = lines.slice(codeStart, codeEnd).join('\n').trim();
      } else if (line.startsWith('EXPLICACIÓN:') || line.startsWith('EXPLANATION:')) {
        explanation = line.split(':')[1]?.trim() || explanation;
      } else if (line.startsWith('PISTAS:') || line.startsWith('HINTS:')) {
        // Extract hints
        let j = i + 1;
        while (j < lines.length && lines[j].trim().startsWith('-')) {
          hints.push(lines[j].trim().substring(1).trim());
          j++;
        }
      } else if (line.startsWith('TEMAS:') || line.startsWith('TOPICS:')) {
        const topicsStr = line.split(':')[1]?.trim();
        if (topicsStr) {
          topics = topicsStr.split(',').map(t => t.trim());
        }
      }
    }

    return {
      title,
      description,
      code: code || response.content,
      explanation,
      hints: hints.length > 0 ? hints : ['Analiza el código línea por línea', 'Identifica los patrones de programación'],
      topics: topics.length > 0 ? topics : [request.requirements?.language || 'programación'],
      content: code || response.content
    };
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return !!this.anthropic;
  }

  // Private helper methods

  private buildSystemPrompt(request: AIContentRequest): string {
    const ageDescriptions = {
      starter: '6-8 años: vocabulario simple, oraciones cortas, conceptos básicos',
      explorer: '9-11 años: vocabulario intermedio, oraciones complejas, temas educativos',
      master: '12-15 años: vocabulario avanzado, textos complejos, contenido académico'
    };

    const difficultyDescriptions = {
      easy: 'palabras comunes, oraciones simples',
      medium: 'vocabulario moderado, estructura balanceada',
      hard: 'vocabulario desafiante, oraciones complejas',
      expert: 'vocabulario avanzado, estructura sofisticada'
    };

    return `Eres un experto en educación y generación de contenido para el aprendizaje de mecanografía en español.

PERFIL DEL USUARIO:
- Grupo de edad: ${request.ageGroup} (${ageDescriptions[request.ageGroup]})
- Nivel: ${request.userLevel}
- Dificultad: ${request.difficulty} (${difficultyDescriptions[request.difficulty]})
${request.userStats ? `- Estadísticas: ${request.userStats.wpmAverage} PPM promedio, ${request.userStats.accuracyAverage}% precisión` : ''}

PRINCIPIOS FUNDAMENTALES:
1. Contenido apropiado para la edad y nivel educativo
2. Vocabulario en español correcto y enriquecedor
3. Progresión gradual de dificultad
4. Motivación y engagement
5. Aprendizaje significativo

FORMATO DE RESPUESTA:
- Solo el contenido solicitado, sin explicaciones adicionales
- Texto limpio, sin formateo especial
- Longitud apropiada para sesión de mecanografía (50-200 palabras típicamente)`;
  }

  private buildUserPrompt(request: AIContentRequest): string {
    switch (request.contentType) {
      case 'exercise':
        return this.buildExercisePrompt(request);
      case 'challenge':
        return this.buildChallengePrompt(request);
      case 'feedback':
        return this.buildFeedbackPrompt(request);
      case 'story':
        return this.buildStoryPrompt(request);
      case 'words':
        return this.buildWordsPrompt(request);
      case 'code_challenge':
        return this.buildCodeChallengePrompt(request);
      default:
        throw new Error(`Unknown content type: ${request.contentType}`);
    }
  }

  private buildExercisePrompt(request: AIContentRequest): string {
    let prompt = `Genera un ejercicio de mecanografía en español para practicar escritura.`;
    
    if (request.theme) {
      prompt += ` Tema: ${request.theme}.`;
    }

    if (request.requirements?.wordCount) {
      prompt += ` Aproximadamente ${request.requirements.wordCount} palabras.`;
    }

    if (request.requirements?.includeWords) {
      prompt += ` Incluye estas palabras: ${request.requirements.includeWords.join(', ')}.`;
    }

    if (request.userStats?.weakAreas) {
      prompt += ` Enfócate en mejorar: ${request.userStats.weakAreas.join(', ')}.`;
    }

    prompt += ` El texto debe ser educativo, interesante y apropiado para el grupo de edad.`;

    return prompt;
  }

  private buildChallengePrompt(request: AIContentRequest): string {
    let prompt = `Crea contenido para un desafío de mecanografía especial.`;
    
    if (request.theme) {
      prompt += ` Tema específico: ${request.theme}.`;
    }

    prompt += ` Incluye:
1. Texto principal para escribir (100-150 palabras)
2. 3 consejos específicos para mejorar
3. Palabras clave del ejercicio (5-8 palabras)

Formato:
TEXTO:
[contenido principal]

CONSEJOS:
- [consejo 1]
- [consejo 2] 
- [consejo 3]

PALABRAS_CLAVE:
[palabra1, palabra2, palabra3, etc.]`;

    return prompt;
  }

  private buildFeedbackPrompt(request: AIContentRequest): string {
    let prompt = `Genera feedback motivacional y constructivo basado en el rendimiento del usuario.`;
    
    if (request.userStats) {
      prompt += `
      
Estadísticas del usuario:
- Velocidad promedio: ${request.userStats.wpmAverage} PPM
- Precisión promedio: ${request.userStats.accuracyAverage}%`;

      if (request.userStats.weakAreas) {
        prompt += `
- Áreas a mejorar: ${request.userStats.weakAreas.join(', ')}`;
      }

      if (request.userStats.strengths) {
        prompt += `
- Fortalezas: ${request.userStats.strengths.join(', ')}`;
      }
    }

    if (request.context) {
      prompt += `
      
Contexto de la sesión: ${request.context}`;
    }

    prompt += `

Proporciona:
1. Felicitación específica por logros
2. Identificación de áreas de mejora
3. Consejos prácticos y accionables
4. Motivación personalizada

El tono debe ser alentador, específico y educativo. Máximo 150 palabras.`;

    return prompt;
  }

  private buildStoryPrompt(request: AIContentRequest): string {
    let prompt = `Crea una historia corta y atractiva para practicar mecanografía.`;
    
    if (request.theme) {
      prompt += ` Tema: ${request.theme}.`;
    }

    const storyTypes = {
      starter: 'aventura simple con animales o personajes amigables',
      explorer: 'aventura educativa con elementos de ciencia o naturaleza',
      master: 'historia con elementos de misterio, ciencia ficción o históricos'
    };

    prompt += ` Estilo: ${storyTypes[request.ageGroup]}.`;
    
    if (request.requirements?.wordCount) {
      prompt += ` Longitud: aproximadamente ${request.requirements.wordCount} palabras.`;
    } else {
      prompt += ` Longitud: 120-180 palabras.`;
    }

    prompt += ` La historia debe ser completa, con inicio, desarrollo y final. Incluye diálogos y descripción para hacer la práctica más variada.`;

    return prompt;
  }

  private buildWordsPrompt(request: AIContentRequest): string {
    let prompt = `Genera una lista de ${request.requirements?.wordCount || 20} palabras en español`;
    
    if (request.theme) {
      prompt += ` relacionadas con el tema: ${request.theme}`;
    }

    prompt += ` apropiadas para el grupo de edad ${request.ageGroup}.`;

    if (request.difficulty === 'easy') {
      prompt += ` Usa palabras simples y comunes.`;
    } else if (request.difficulty === 'hard' || request.difficulty === 'expert') {
      prompt += ` Incluye vocabulario más desafiante y específico.`;
    }

    prompt += ` Formato: una palabra por línea, sin números ni signos de puntuación adicionales.`;

    return prompt;
  }

  private buildCodeChallengePrompt(request: AIContentRequest): string {
    const language = request.requirements?.language || 'python';
    const ageGroup = request.ageGroup;
    
    let prompt = `Genera un desafío de programación en ${language} para el juego Code Breaker. `;
    
    const languageDescriptions = {
      python: 'Python: sintaxis clara, conceptos fundamentales de programación',
      javascript: 'JavaScript: manipulación del DOM, funciones, eventos',
      cpp: 'C++: tipos de datos, estructuras de control, algoritmos básicos',
      sql: 'SQL: consultas, joins, agregaciones',
      html: 'HTML: estructura semántica, formularios, elementos multimedia',
      css: 'CSS: selectores, propiedades, layout responsivo'
    };

    const difficultyGuidelines = {
      easy: 'conceptos básicos, sintaxis simple, ejemplos directos',
      medium: 'combinación de conceptos, lógica moderada, casos prácticos',
      hard: 'algoritmos complejos, optimización, patrones avanzados',
      expert: 'desafíos arquitecturales, performance, patrones de diseño'
    };

    const ageGroupGuidelines = {
      starter: 'conceptos muy básicos, mucha explicación, ejemplos visuales',
      explorer: 'introducción a conceptos intermedios, ejemplos prácticos',
      master: 'conceptos avanzados, desafíos de lógica, preparación académica'
    };

    prompt += `
    
CARACTERÍSTICAS:
- Lenguaje: ${language} (${languageDescriptions[language]})
- Dificultad: ${request.difficulty} (${difficultyGuidelines[request.difficulty]})
- Edad: ${ageGroup} (${ageGroupGuidelines[ageGroup]})

ESTRUCTURA REQUERIDA:
TÍTULO:
[Nombre descriptivo del desafío]

DESCRIPCIÓN:
[Explicación breve de qué hace el código y por qué es importante]

CÓDIGO:
[Código completo y funcional de 15-30 líneas, bien comentado]

EXPLICACIÓN:
[Explicación pedagógica de cómo funciona el código]

PISTAS:
- [Pista sobre la estructura del código]
- [Pista sobre conceptos clave]
- [Pista sobre mejores prácticas]

TEMAS:
[Lista de conceptos de programación que se practican]

REQUISITOS:
1. Código funcional y educativo
2. Comentarios explicativos en español
3. Apropiado para la edad y nivel
4. Enfoque en mecanografía de símbolos de programación
5. Conceptos fundamentales del lenguaje
6. Ejemplos prácticos y útiles`;

    if (request.context) {
      prompt += `\n\nCONTEXTO ADICIONAL: ${request.context}`;
    }

    return prompt;
  }

  private extractMetadata(content: string, request: AIContentRequest): any {
    // Extract metadata from AI response
    const metadata: any = {
      theme: request.theme || 'general',
      estimatedDifficulty: this.calculateDifficultyScore(content, request),
      estimatedWPM: this.estimateTargetWPM(content, request),
      keyWords: this.extractKeyWords(content)
    };

    // Extract tips if present in challenge content
    if (request.contentType === 'challenge' && content.includes('CONSEJOS:')) {
      const tipsSection = content.split('CONSEJOS:')[1]?.split('PALABRAS_CLAVE:')[0];
      if (tipsSection) {
        metadata.tips = tipsSection
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().substring(1).trim());
      }
    }

    return metadata;
  }

  private calculateDifficultyScore(content: string, request: AIContentRequest): number {
    // Simple difficulty calculation based on word length and complexity
    const words: string[] = content.toLowerCase().match(/[a-záéíóúñü]+/g) || [];
    const avgWordLength = words.length > 0 ? words.reduce((sum, word) => sum + word.length, 0) / words.length : 0;
    
    const baseScore = {
      easy: 1,
      medium: 2,
      hard: 3,
      expert: 4
    }[request.difficulty];

    return Math.min(5, baseScore + (avgWordLength > 6 ? 0.5 : 0));
  }

  private estimateTargetWPM(content: string, request: AIContentRequest): number {
    const baseWPM = {
      starter: 15,
      explorer: 25,
      master: 35
    }[request.ageGroup];

    const difficultyMultiplier = {
      easy: 0.8,
      medium: 1.0,
      hard: 1.2,
      expert: 1.4
    }[request.difficulty];

    return Math.round(baseWPM * difficultyMultiplier);
  }

  private extractKeyWords(content: string): string[] {
    // Extract meaningful words (filter out common words)
    const commonWords = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'pero', 'si', 'no', 'en', 'con', 'por', 'para',
      'de', 'del', 'al', 'que', 'se', 'le', 'me', 'te', 'nos', 'es', 'son', 'está', 'están', 'fue',
      'será', 'como', 'más', 'muy', 'también', 'solo', 'ya', 'aquí', 'allí', 'cuando', 'donde'
    ]);

    const words = content.toLowerCase().match(/[a-záéíóúñü]+/g) || [];
    const uniqueWords = [...new Set(words)]
      .filter(word => word.length > 3 && !commonWords.has(word))
      .sort((a, b) => b.length - a.length)
      .slice(0, 8);

    return uniqueWords;
  }
}