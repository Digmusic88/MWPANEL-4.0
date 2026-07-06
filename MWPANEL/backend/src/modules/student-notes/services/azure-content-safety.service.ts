import { Injectable, Logger } from '@nestjs/common';
import ContentSafetyClient, { AnalyzeTextParameters, AnalyzeImageParameters, isUnexpected } from '@azure-rest/ai-content-safety';
import { AzureKeyCredential } from '@azure/core-auth';
import { ConfigService } from '@nestjs/config';

export interface ContentModerationResult {
  isContentFlagged: boolean;
  confidence: number;
  reason: string;
  categories: string[];
  reviewRecommended: boolean;
  azureResponse?: any;
}

export interface TextModerationOptions {
  language?: string;
  categories?: string[];
}

@Injectable()
export class AzureContentSafetyService {
  private readonly logger = new Logger(AzureContentSafetyService.name);
  private client: ReturnType<typeof ContentSafetyClient> | null = null;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      const subscriptionKey = this.configService.get<string>('AZURE_CONTENT_SAFETY_KEY');
      const endpoint = this.configService.get<string>('AZURE_CONTENT_SAFETY_ENDPOINT');

      if (!subscriptionKey || !endpoint) {
        this.logger.warn('Azure Content Safety credentials not configured. Auto-moderation will be disabled.');
        return;
      }

      const credential = new AzureKeyCredential(subscriptionKey);
      this.client = ContentSafetyClient(endpoint, credential);
      this.isConfigured = true;
      this.logger.log('Azure Content Safety service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Azure Content Safety client:', error);
      this.isConfigured = false;
    }
  }

  async moderateText(
    text: string,
    options: TextModerationOptions = {}
  ): Promise<ContentModerationResult> {
    if (!this.isConfigured || !this.client) {
      this.logger.warn('Azure Content Safety not configured, skipping moderation');
      return {
        isContentFlagged: false,
        confidence: 0,
        reason: 'Service not configured',
        categories: [],
        reviewRecommended: false,
      };
    }

    try {
      this.logger.debug(`Moderating text with Azure Content Safety: ${text.substring(0, 100)}...`);

      const analyzeTextOption = {
        text: text,
        categories: options.categories || ['Hate', 'Sexual', 'Violence', 'SelfHarm'],
        outputType: 'FourSeverityLevels'
      };
      const analyzeTextParameters: AnalyzeTextParameters = { body: analyzeTextOption };

      const result = await this.client.path('/text:analyze').post(analyzeTextParameters);

      if (isUnexpected(result)) {
        throw new Error(`Content Safety API error: ${result.status} ${result.body?.error?.message || 'Unknown error'}`);
      }

      return this.processContentSafetyResponse(result.body);
    } catch (error) {
      this.logger.error('Error during Azure Content Safety moderation:', error);
      
      // Fallback to basic keyword filtering if Azure fails
      return this.fallbackModeration(text);
    }
  }

  private processContentSafetyResponse(response: any): ContentModerationResult {
    const categoriesAnalysis = response.categoriesAnalysis || [];
    const blocklistsMatchResults = response.blocklistsMatchResults || [];

    // Determine if content should be flagged
    let isContentFlagged = false;
    let confidence = 0;
    const categories: string[] = [];
    const reasons: string[] = [];

    // Check severity levels for each category (threshold: severity >= 4 for flagging)
    for (const analysis of categoriesAnalysis) {
      const severity = analysis.severity;
      const category = analysis.category;

      if (severity >= 4) { // Flag content with medium-high severity (4+)
        isContentFlagged = true;
        confidence = Math.max(confidence, severity / 6); // Convert 0-6 scale to 0-1

        switch (category) {
          case 'Hate':
            categories.push('hate_speech');
            reasons.push('Contenido de odio detectado');
            break;
          case 'Sexual':
            categories.push('sexual_content');
            reasons.push('Contenido sexual detectado');
            break;
          case 'Violence':
            categories.push('violent_content');
            reasons.push('Contenido violento detectado');
            break;
          case 'SelfHarm':
            categories.push('self_harm');
            reasons.push('Contenido de autolesión detectado');
            break;
        }
      }
    }

    // Check blocklist matches
    if (blocklistsMatchResults && blocklistsMatchResults.length > 0) {
      isContentFlagged = true;
      confidence = Math.max(confidence, 0.9);
      categories.push('prohibited_terms');
      reasons.push(`Términos prohibidos detectados en listas de bloqueo`);
    }

    const reviewRecommended = isContentFlagged || confidence > 0.5;

    return {
      isContentFlagged,
      confidence,
      reason: reasons.join('; '),
      categories,
      reviewRecommended,
      azureResponse: response,
    };
  }

  private fallbackModeration(text: string): ContentModerationResult {
    // Basic keyword-based fallback moderation
    const prohibitedWords = [
      'spam', 'scam', 'hack', 'illegal', 'drugs', 'violence', 'hate',
      'discriminación', 'acoso', 'bullying', 'drogas', 'violencia'
    ];

    const textLower = text.toLowerCase();
    const foundWords = prohibitedWords.filter(word => textLower.includes(word));

    if (foundWords.length > 0) {
      return {
        isContentFlagged: true,
        confidence: 0.8,
        reason: `Palabras prohibidas detectadas: ${foundWords.join(', ')}`,
        categories: ['prohibited_terms'],
        reviewRecommended: true,
      };
    }

    return {
      isContentFlagged: false,
      confidence: 0,
      reason: 'Contenido aprobado por filtrado básico',
      categories: [],
      reviewRecommended: false,
    };
  }

  async moderateImage(imageUrl: string): Promise<ContentModerationResult> {
    if (!this.isConfigured || !this.client) {
      this.logger.warn('Azure Content Safety not configured, skipping image moderation');
      return {
        isContentFlagged: false,
        confidence: 0,
        reason: 'Service not configured',
        categories: [],
        reviewRecommended: false,
      };
    }

    try {
      this.logger.debug(`Moderating image with Azure Content Safety: ${imageUrl}`);

      const analyzeImageOption = {
        image: { blobUrl: imageUrl },
        categories: ['Hate', 'Sexual', 'Violence', 'SelfHarm']
      };
      const analyzeImageParameters: AnalyzeImageParameters = { body: analyzeImageOption };

      const result = await this.client.path('/image:analyze').post(analyzeImageParameters);

      if (isUnexpected(result)) {
        throw new Error(`Content Safety API error: ${result.status} ${result.body?.error?.message || 'Unknown error'}`);
      }

      return this.processImageContentSafetyResponse(result.body);
    } catch (error) {
      this.logger.error('Error during Azure Image Content Safety moderation:', error);
      
      return {
        isContentFlagged: false,
        confidence: 0,
        reason: 'Error en moderación de imagen',
        categories: ['error'],
        reviewRecommended: true,
      };
    }
  }

  private processImageContentSafetyResponse(response: any): ContentModerationResult {
    const categoriesAnalysis = response.categoriesAnalysis || [];

    let isContentFlagged = false;
    let confidence = 0;
    const categories: string[] = [];
    const reasons: string[] = [];

    // Check severity levels for each category (threshold: severity >= 4 for flagging)
    for (const analysis of categoriesAnalysis) {
      const severity = analysis.severity;
      const category = analysis.category;

      if (severity >= 4) { // Flag content with medium-high severity (4+)
        isContentFlagged = true;
        confidence = Math.max(confidence, severity / 6); // Convert 0-6 scale to 0-1

        switch (category) {
          case 'Hate':
            categories.push('hate_content_image');
            reasons.push('Imagen con contenido de odio detectado');
            break;
          case 'Sexual':
            categories.push('sexual_content_image');
            reasons.push('Imagen con contenido sexual detectado');
            break;
          case 'Violence':
            categories.push('violent_content_image');
            reasons.push('Imagen con contenido violento detectado');
            break;
          case 'SelfHarm':
            categories.push('self_harm_image');
            reasons.push('Imagen con contenido de autolesión detectado');
            break;
        }
      }
    }

    const reviewRecommended = isContentFlagged || confidence > 0.5;

    return {
      isContentFlagged,
      confidence,
      reason: reasons.join('; '),
      categories,
      reviewRecommended,
      azureResponse: response,
    };
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      return false;
    }

    try {
      // Test with a simple, safe text
      await this.moderateText('Hola mundo, esto es una prueba de conexión.');
      return true;
    } catch (error) {
      this.logger.error('Azure Content Safety connection test failed:', error);
      return false;
    }
  }
}