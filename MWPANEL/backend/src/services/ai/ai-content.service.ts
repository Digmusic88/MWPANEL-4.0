import { Injectable, Logger } from '@nestjs/common';
import { AnthropicService, AIContentRequest, AIContentResponse } from './anthropic.service';
import { AICacheService } from './ai-cache.service';

export interface AdaptiveExerciseRequest {
  userId: string;
  ageGroup: 'starter' | 'explorer' | 'master';
  currentLevel: number;
  userStats: {
    wpmAverage: number;
    accuracyAverage: number;
    totalTimePlayed: number;
    weakAreas?: string[];
    strengths?: string[];
    recentErrors?: string[];
  };
  sessionContext?: {
    sessionCount: number;
    todayPlayTime: number;
    lastSessionPerformance?: {
      wpm: number;
      accuracy: number;
      errorsCount: number;
    };
  };
  preferences?: {
    favoriteThemes?: string[];
    difficulty?: 'auto' | 'easy' | 'medium' | 'hard' | 'expert';
    contentLength?: 'short' | 'medium' | 'long';
  };
}

export interface GeneratedExercise {
  content: string;
  metadata: {
    theme: string;
    difficulty: string;
    estimatedWPM: number;
    estimatedDuration: number;
    keyWords: string[];
    focusAreas: string[];
    tips?: string[];
  };
  adaptiveFeatures: {
    personalizedForUser: boolean;
    difficultyAdjusted: boolean;
    contentType: 'story' | 'exercise' | 'themed' | 'challenge';
    targetSkills: string[];
  };
}

export interface IntelligentFeedback {
  message: string;
  insights: {
    strengthsIdentified: string[];
    areasForImprovement: string[];
    progressIndicators: string[];
  };
  recommendations: {
    nextSteps: string[];
    practiceAreas: string[];
    difficultyAdjustment?: 'increase' | 'decrease' | 'maintain';
  };
  motivationalElements: {
    achievements: string[];
    encouragement: string;
    goals: string[];
  };
}

@Injectable()
export class AIContentService {
  private readonly logger = new Logger(AIContentService.name);

  constructor(
    private readonly anthropicService: AnthropicService,
    private readonly cacheService: AICacheService,
  ) {}

  /**
   * Generate adaptive typing exercise based on user profile and performance
   */
  async generateAdaptiveExercise(request: AdaptiveExerciseRequest): Promise<GeneratedExercise> {
    this.logger.debug(`Generating adaptive exercise for user ${request.userId}`);

    // Generate cache key based on user characteristics (not specific user ID for privacy)
    const cacheKey = this.cacheService.generateKey({
      ageGroup: request.ageGroup,
      level: Math.floor(request.currentLevel / 5) * 5, // Round to nearest 5 for caching
      wpmRange: Math.floor(request.userStats.wpmAverage / 10) * 10,
      accuracyRange: Math.floor(request.userStats.accuracyAverage / 10) * 10,
      contentType: this.determineContentType(request),
      difficulty: this.calculateDifficulty(request),
      weakAreas: request.userStats.weakAreas?.sort().join(',') || 'none'
    });

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const aiRequest = this.buildAIRequest(request);
        const response = await this.anthropicService.generateContent(aiRequest);
        
        return this.formatExerciseResponse(response, request);
      },
      1800 // 30 minutes cache for adaptive content
    );
  }

  /**
   * Generate intelligent feedback based on session performance
   */
  async generateIntelligentFeedback(
    request: AdaptiveExerciseRequest,
    sessionResults: {
      wpm: number;
      accuracy: number;
      errorsCount: number;
      duration: number;
      completedText: string;
      errorPatterns?: string[];
    }
  ): Promise<IntelligentFeedback> {
    this.logger.debug(`Generating intelligent feedback for user ${request.userId}`);

    const performanceContext = this.analyzePerformance(request, sessionResults);
    
    const aiRequest: AIContentRequest = {
      ageGroup: request.ageGroup,
      contentType: 'feedback',
      difficulty: this.calculateDifficulty(request),
      userLevel: request.currentLevel,
      userStats: {
        wpmAverage: request.userStats.wpmAverage,
        accuracyAverage: request.userStats.accuracyAverage,
        weakAreas: request.userStats.weakAreas,
        strengths: request.userStats.strengths
      },
      context: `Sesión actual: ${sessionResults.wpm} PPM, ${sessionResults.accuracy}% precisión, ${sessionResults.errorsCount} errores en ${Math.round(sessionResults.duration / 60)} minutos. ${performanceContext}`
    };

    const response = await this.anthropicService.generateFeedback(aiRequest);
    
    return this.formatFeedbackResponse(response, request, sessionResults);
  }

  /**
   * Generate themed word lists with AI
   */
  async generateThemedWordList(
    theme: string,
    ageGroup: 'starter' | 'explorer' | 'master',
    difficulty: 'easy' | 'medium' | 'hard' | 'expert',
    count: number = 20
  ): Promise<string[]> {
    const cacheKey = this.cacheService.generateKey({
      type: 'wordlist',
      theme,
      ageGroup,
      difficulty,
      count
    });

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.anthropicService.generateThemedWords(theme, ageGroup, count);
      },
      7200 // 2 hours cache for word lists
    );
  }

  /**
   * Generate story-based typing content
   */
  async generateStoryContent(
    theme: string,
    ageGroup: 'starter' | 'explorer' | 'master',
    difficulty: 'easy' | 'medium' | 'hard' | 'expert',
    wordCount: number = 150
  ): Promise<AIContentResponse> {
    const cacheKey = this.cacheService.generateKey({
      type: 'story',
      theme,
      ageGroup,
      difficulty,
      wordCount
    });

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const aiRequest: AIContentRequest = {
          ageGroup,
          contentType: 'story',
          theme,
          difficulty,
          userLevel: 1, // Generic level for cached stories
          requirements: { wordCount }
        };
        
        return this.anthropicService.generateStoryContent(aiRequest);
      },
      3600 // 1 hour cache for stories
    );
  }

  /**
   * Generate programming code challenge for Code Breaker game
   */
  async generateCodeChallenge(
    language: 'python' | 'javascript' | 'cpp' | 'sql' | 'html' | 'css',
    difficulty: 'easy' | 'medium' | 'hard' | 'expert',
    ageGroup: 'starter' | 'explorer' | 'master',
    requirements?: any
  ): Promise<any> {
    const cacheKey = this.cacheService.generateKey({
      type: 'code_challenge',
      language,
      difficulty,
      ageGroup,
      requirements: requirements || {}
    });

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const aiRequest: AIContentRequest = {
          ageGroup,
          contentType: 'code_challenge',
          theme: `programación_${language}`,
          difficulty,
          userLevel: 1, // Generic for caching
          requirements: {
            language,
            codeChallenge: true,
            ...requirements
          },
          context: `Generar desafío de programación en ${language} para el grupo de edad ${ageGroup}`
        };
        
        const response = await this.anthropicService.generateCodeChallenge(aiRequest);
        
        return {
          id: `ai_${Date.now()}_${language}`,
          title: response.title || `Desafío de ${language}`,
          description: response.description || `Desafío de programación en ${language}`,
          language,
          difficulty,
          code: response.content || response.code || '// Código generado por IA',
          explanation: response.explanation || 'Explicación generada por IA',
          hints: response.hints || ['Pista generada por IA'],
          targetWPM: this.calculateTargetWPMForCode(difficulty, ageGroup),
          timeLimit: this.calculateTimeLimitForCode(difficulty),
          points: this.calculatePointsForCode(difficulty),
          topics: response.topics || [language],
          aiGenerated: true
        };
      },
      3600 // 1 hour cache for code challenges
    );
  }

  /**
   * Generate challenge content with specific objectives
   */
  async generateChallengeContent(
    challengeType: 'speed' | 'accuracy' | 'endurance' | 'combo' | 'themed',
    ageGroup: 'starter' | 'explorer' | 'master',
    difficulty: 'easy' | 'medium' | 'hard' | 'expert',
    theme?: string,
    requirements?: any
  ): Promise<AIContentResponse> {
    const cacheKey = this.cacheService.generateKey({
      type: 'challenge',
      challengeType,
      ageGroup,
      difficulty,
      theme: theme || 'general',
      requirements: requirements || {}
    });

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const aiRequest: AIContentRequest = {
          ageGroup,
          contentType: 'challenge',
          theme,
          difficulty,
          userLevel: 1, // Generic for caching
          requirements,
          context: `Desafío de tipo ${challengeType}`
        };
        
        return this.anthropicService.generateChallengeContent(aiRequest);
      },
      1800 // 30 minutes cache for challenges
    );
  }

  /**
   * Batch generate content for prefetching
   */
  async batchGenerateContent(requests: Array<{
    type: 'exercise' | 'story' | 'words' | 'challenge';
    params: any;
  }>): Promise<void> {
    this.logger.log(`Starting batch generation of ${requests.length} content items`);
    
    const batchPromises = requests.map(async (request, index) => {
      try {
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 100));
        
        switch (request.type) {
          case 'words':
            return this.generateThemedWordList(
              request.params.theme,
              request.params.ageGroup,
              request.params.difficulty,
              request.params.count
            );
          case 'story':
            return this.generateStoryContent(
              request.params.theme,
              request.params.ageGroup,
              request.params.difficulty,
              request.params.wordCount
            );
          case 'challenge':
            return this.generateChallengeContent(
              request.params.challengeType,
              request.params.ageGroup,
              request.params.difficulty,
              request.params.theme,
              request.params.requirements
            );
          default:
            this.logger.warn(`Unknown batch content type: ${request.type}`);
        }
      } catch (error) {
        this.logger.error(`Batch generation failed for ${request.type}:`, error);
      }
    });

    await Promise.allSettled(batchPromises);
    this.logger.log('Batch content generation completed');
  }

  /**
   * Get AI service statistics
   */
  getStats() {
    return {
      cache: this.cacheService.getStats(),
      ai: {
        available: this.anthropicService.isAvailable(),
        model: 'claude-3-5-haiku',
        features: ['adaptive_exercises', 'intelligent_feedback', 'content_generation']
      }
    };
  }

  // Private helper methods

  private determineContentType(request: AdaptiveExerciseRequest): 'story' | 'exercise' | 'themed' {
    // Logic to determine best content type based on user profile
    if (request.sessionContext?.sessionCount === 1) {
      return 'story'; // Engaging start
    }
    
    if (request.userStats.weakAreas?.length) {
      return 'exercise'; // Focused practice
    }
    
    if (request.preferences?.favoriteThemes?.length) {
      return 'themed'; // User interests
    }
    
    return 'exercise'; // Default
  }

  private calculateDifficulty(request: AdaptiveExerciseRequest): 'easy' | 'medium' | 'hard' | 'expert' {
    if (request.preferences?.difficulty && request.preferences.difficulty !== 'auto') {
      return request.preferences.difficulty;
    }

    // Auto-calculate based on performance
    const wpm = request.userStats.wpmAverage;
    const accuracy = request.userStats.accuracyAverage;
    const level = request.currentLevel;

    if (wpm < 15 || accuracy < 80 || level < 5) return 'easy';
    if (wpm < 25 || accuracy < 85 || level < 15) return 'medium';
    if (wpm < 40 || accuracy < 90 || level < 25) return 'hard';
    return 'expert';
  }

  private buildAIRequest(request: AdaptiveExerciseRequest): AIContentRequest {
    const difficulty = this.calculateDifficulty(request);
    const contentType = this.determineContentType(request);
    
    // Select theme based on preferences or weak areas
    let theme: string | undefined;
    if (request.userStats.weakAreas?.length) {
      theme = 'practica_debilidades';
    } else if (request.preferences?.favoriteThemes?.length) {
      theme = request.preferences.favoriteThemes[0];
    }

    return {
      ageGroup: request.ageGroup,
      contentType: contentType === 'story' ? 'story' : 'exercise',
      theme,
      difficulty,
      userLevel: request.currentLevel,
      userStats: request.userStats,
      requirements: {
        wordCount: this.getTargetWordCount(request),
        focusAreas: request.userStats.weakAreas || [],
        targetWPM: Math.round(request.userStats.wpmAverage * 1.1) // 10% challenge
      }
    };
  }

  private getTargetWordCount(request: AdaptiveExerciseRequest): number {
    const baseLength = {
      starter: 80,
      explorer: 120,
      master: 160
    }[request.ageGroup];

    const lengthMultiplier = {
      short: 0.7,
      medium: 1.0,
      long: 1.4
    }[request.preferences?.contentLength || 'medium'];

    return Math.round(baseLength * lengthMultiplier);
  }

  private formatExerciseResponse(response: AIContentResponse, request: AdaptiveExerciseRequest): GeneratedExercise {
    const difficulty = this.calculateDifficulty(request);
    const contentType = this.determineContentType(request);
    
    return {
      content: response.content,
      metadata: {
        theme: response.metadata?.theme || 'general',
        difficulty,
        estimatedWPM: response.metadata?.estimatedWPM || 25,
        estimatedDuration: Math.round(response.content.split(' ').length / (response.metadata?.estimatedWPM || 25) * 60),
        keyWords: response.metadata?.keyWords || [],
        focusAreas: request.userStats.weakAreas || [],
        tips: response.metadata?.tips
      },
      adaptiveFeatures: {
        personalizedForUser: true,
        difficultyAdjusted: request.preferences?.difficulty === 'auto',
        contentType,
        targetSkills: this.getTargetSkills(request)
      }
    };
  }

  private getTargetSkills(request: AdaptiveExerciseRequest): string[] {
    const skills = [];
    
    if (request.userStats.wpmAverage < 30) skills.push('velocidad');
    if (request.userStats.accuracyAverage < 90) skills.push('precision');
    if (request.userStats.weakAreas?.includes('mayusculas')) skills.push('mayusculas');
    if (request.userStats.weakAreas?.includes('numeros')) skills.push('numeros');
    if (request.userStats.weakAreas?.includes('signos')) skills.push('puntuacion');
    
    return skills;
  }

  private analyzePerformance(request: AdaptiveExerciseRequest, results: any): string {
    const contexts = [];
    
    // Performance vs average
    if (results.wpm > request.userStats.wpmAverage * 1.1) {
      contexts.push('velocidad mejorada significativamente');
    } else if (results.wpm < request.userStats.wpmAverage * 0.9) {
      contexts.push('velocidad por debajo del promedio');
    }
    
    if (results.accuracy > request.userStats.accuracyAverage + 2) {
      contexts.push('precisión excelente');
    } else if (results.accuracy < request.userStats.accuracyAverage - 5) {
      contexts.push('precisión necesita mejora');
    }
    
    // Session context
    if (request.sessionContext?.sessionCount === 1) {
      contexts.push('primera sesión del día');
    } else if (request.sessionContext?.todayPlayTime > 1200) { // 20+ minutes
      contexts.push('sesión extendida de práctica');
    }
    
    return contexts.join(', ');
  }

  private formatFeedbackResponse(
    response: string, 
    request: AdaptiveExerciseRequest, 
    results: any
  ): IntelligentFeedback {
    // Parse AI response and structure it
    const lines = response.split('\n').filter(line => line.trim());
    
    return {
      message: response,
      insights: {
        strengthsIdentified: this.extractStrengths(request, results),
        areasForImprovement: request.userStats.weakAreas || [],
        progressIndicators: this.getProgressIndicators(request, results)
      },
      recommendations: {
        nextSteps: this.generateNextSteps(request, results),
        practiceAreas: request.userStats.weakAreas || [],
        difficultyAdjustment: this.suggestDifficultyAdjustment(request, results)
      },
      motivationalElements: {
        achievements: this.identifyAchievements(request, results),
        encouragement: this.generateEncouragement(request, results),
        goals: this.suggestGoals(request, results)
      }
    };
  }

  private extractStrengths(request: AdaptiveExerciseRequest, results: any): string[] {
    const strengths = [];
    
    if (results.accuracy > 95) strengths.push('Precisión excelente');
    if (results.wpm > request.userStats.wpmAverage * 1.2) strengths.push('Velocidad destacada');
    if (results.errorsCount < 3) strengths.push('Pocos errores');
    if (results.duration > 300) strengths.push('Concentración sostenida'); // 5+ minutes
    
    return strengths;
  }

  private getProgressIndicators(request: AdaptiveExerciseRequest, results: any): string[] {
    const indicators = [];
    
    const wpmProgress = ((results.wpm - request.userStats.wpmAverage) / request.userStats.wpmAverage) * 100;
    if (wpmProgress > 5) indicators.push(`Velocidad mejoró ${Math.round(wpmProgress)}%`);
    
    const accuracyDiff = results.accuracy - request.userStats.accuracyAverage;
    if (accuracyDiff > 2) indicators.push(`Precisión aumentó ${Math.round(accuracyDiff)}%`);
    
    return indicators;
  }

  private generateNextSteps(request: AdaptiveExerciseRequest, results: any): string[] {
    const steps = [];
    
    if (results.accuracy < 85) {
      steps.push('Practica más despacio para mejorar precisión');
    }
    
    if (results.wpm < 20) {
      steps.push('Enfócate en ejercicios de velocidad');
    }
    
    if (request.userStats.weakAreas?.length) {
      steps.push(`Practica áreas específicas: ${request.userStats.weakAreas.join(', ')}`);
    }
    
    return steps;
  }

  private suggestDifficultyAdjustment(request: AdaptiveExerciseRequest, results: any): 'increase' | 'decrease' | 'maintain' {
    if (results.accuracy > 95 && results.wpm > request.userStats.wpmAverage * 1.1) {
      return 'increase';
    }
    
    if (results.accuracy < 80 || results.wpm < request.userStats.wpmAverage * 0.8) {
      return 'decrease';
    }
    
    return 'maintain';
  }

  private identifyAchievements(request: AdaptiveExerciseRequest, results: any): string[] {
    const achievements = [];
    
    if (results.wpm >= 50) achievements.push('Velocista Experto');
    if (results.accuracy >= 98) achievements.push('Precisión Perfecta');
    if (results.errorsCount === 0) achievements.push('Sesión Sin Errores');
    
    return achievements;
  }

  private generateEncouragement(request: AdaptiveExerciseRequest, results: any): string {
    if (results.accuracy > 95 && results.wpm > request.userStats.wpmAverage) {
      return '¡Excelente sesión! Tu progreso es notable.';
    }
    
    if (results.accuracy > request.userStats.accuracyAverage) {
      return '¡Bien hecho! Tu precisión está mejorando.';
    }
    
    return '¡Sigue practicando! Cada sesión te acerca más a tus objetivos.';
  }

  private suggestGoals(request: AdaptiveExerciseRequest, results: any): string[] {
    const goals = [];
    
    const nextWPMGoal = Math.ceil((request.userStats.wpmAverage + 5) / 5) * 5;
    goals.push(`Alcanzar ${nextWPMGoal} PPM`);
    
    if (request.userStats.accuracyAverage < 95) {
      goals.push('Mantener 95% de precisión');
    }
    
    goals.push('Completar desafío diario');
    
    return goals;
  }

  private calculateTargetWPMForCode(difficulty: string, ageGroup: string): number {
    const baseWPM = {
      starter: { easy: 15, medium: 20, hard: 25, expert: 30 },
      explorer: { easy: 20, medium: 25, hard: 30, expert: 35 },
      master: { easy: 25, medium: 30, hard: 35, expert: 40 }
    };

    return baseWPM[ageGroup]?.[difficulty] || 25;
  }

  private calculateTimeLimitForCode(difficulty: string): number {
    const baseTimes = { 
      easy: 180,    // 3 minutes
      medium: 240,  // 4 minutes
      hard: 300,    // 5 minutes
      expert: 400   // 6.5 minutes
    };
    return baseTimes[difficulty] || 240;
  }

  private calculatePointsForCode(difficulty: string): number {
    const basePoints = { 
      easy: 100, 
      medium: 150, 
      hard: 200, 
      expert: 300 
    };
    return basePoints[difficulty] || 150;
  }
}