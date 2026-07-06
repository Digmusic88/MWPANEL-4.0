import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { SystemSetting } from '../../settings/entities/system-setting.entity';
import { User } from '../../users/entities/user.entity';
import { Student } from '../../students/entities/student.entity';

export interface AIOptions {
  tone?: 'formal' | 'empático' | 'informativo' | 'neutro';
  messageContext?: string[];
  senderRole?: string;
  recipientRole?: string;
  relatedStudent?: string;
  userRole?: string;
  userId?: string;
  senderId?: string;
  recipientId?: string;
  messageContent?: string;
}

export interface AIComposeOptions {
  userRole?: string;
  userId?: string;
  recipientId?: string;
  recipientName?: string;
  relatedStudent?: string;
  messageType?: 'announcement' | 'direct' | 'concern' | 'question' | 'request';
  tone?: 'formal' | 'empático' | 'informativo' | 'neutro';
}

export interface AIResponse {
  content: string;
  suggestions?: string[];
  confidence?: number;
}

export interface UserPermissions {
  canUseAI: boolean;
  dailyUsage: number;
  dailyLimit: number;
  remainingRequests: number;
}

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  todayUsage: number;
  averageResponseTime: number;
  lastUsed?: Date;
}

@Injectable()
export class AIAssistantService {
  private readonly logger = new Logger(AIAssistantService.name);
  private readonly userUsageCache = new Map<string, { count: number; lastReset: Date }>();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async generateResponse(messageContent: string, options: AIOptions = {}): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Increment usage counter
      await this.incrementUserUsage(options.userId);

      // Build context for AI
      const context = await this.buildContext(messageContent, options);
      
      // Generate response using configured AI provider
      const response = await this.callAIProvider(context, options);
      
      const responseTime = Date.now() - startTime;
      this.logger.log(`AI response generated in ${responseTime}ms for user ${options.userId}`);

      return {
        content: response.content,
        suggestions: response.suggestions || [],
        confidence: response.confidence || 0.8,
      };
    } catch (error) {
      this.logger.error('Error generating AI response:', error);
      throw new BadRequestException('No se pudo generar una respuesta automática');
    }
  }

  async composeMessage(intention: string, options: AIComposeOptions = {}): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Increment usage counter
      await this.incrementUserUsage(options.userId);

      // Build context for message composition
      const context = await this.buildComposeContext(intention, options);
      
      // Generate message using configured AI provider
      const response = await this.callAIProvider(context, {
        ...options,
        messageContent: intention
      });
      
      const responseTime = Date.now() - startTime;
      this.logger.log(`AI message composed in ${responseTime}ms for user ${options.userId}`);

      return {
        content: response.content,
        suggestions: response.suggestions || [],
        confidence: response.confidence || 0.85,
      };
    } catch (error) {
      this.logger.error('Error composing AI message:', error);
      throw new BadRequestException('No se pudo componer el mensaje automático');
    }
  }

  async isServiceEnabled(): Promise<boolean> {
    try {
      const enabledSetting = await this.systemSettingRepository.findOne({
        where: { key: 'ai_assistant_enabled' }
      });
      
      if (!enabledSetting || !enabledSetting.parsedValue) {
        return false;
      }

      // Verificar que hay al menos una API key configurada
      const provider = await this.getAIProvider();
      const apiKey = await this.getAPIKey(provider);
      
      return enabledSetting.parsedValue && !!apiKey;
    } catch (error) {
      this.logger.error('Error checking if AI service is enabled:', error);
      return false;
    }
  }

  private async getAIProvider(): Promise<string> {
    const providerSetting = await this.systemSettingRepository.findOne({
      where: { key: 'ai_provider' }
    });
    return providerSetting?.value || 'anthropic';
  }

  private async getAPIKey(provider: string): Promise<string> {
    const keyMap = {
      'anthropic': 'anthropic_api_key',
      'openai': 'openai_api_key',
      'gemini': 'gemini_api_key',
      'openrouter': 'openrouter_api_key'
    };
    
    const keySetting = await this.systemSettingRepository.findOne({
      where: { key: keyMap[provider] }
    });
    
    // Fallback a variables de entorno si no hay configuración
    if (!keySetting?.value) {
      const envKeyMap = {
        'anthropic': 'ANTHROPIC_API_KEY',
        'openai': 'OPENAI_API_KEY',
        'gemini': 'GEMINI_API_KEY',
        'openrouter': 'OPENROUTER_API_KEY'
      };
      return this.configService.get<string>(envKeyMap[provider], '');
    }
    
    return keySetting.value;
  }

  private async getAIModel(provider: string): Promise<string> {
    const modelMap = {
      'anthropic': 'ai_model_anthropic',
      'openai': 'ai_model_openai',
      'gemini': 'ai_model_gemini',
      'openrouter': 'ai_model_openrouter'
    };
    
    const modelSetting = await this.systemSettingRepository.findOne({
      where: { key: modelMap[provider] }
    });
    
    const defaultModels = {
      'anthropic': 'claude-opus-4-7',
      'openai': 'gpt-3.5-turbo',
      'gemini': 'gemini-1.5-flash',
      'openrouter': 'openai/gpt-3.5-turbo'
    };
    
    return modelSetting?.value || defaultModels[provider];
  }

  async canUserUseAI(userId: string, userRole: string): Promise<boolean> {
    // Solo profesores y administradores pueden usar IA
    if (!['teacher', 'admin'].includes(userRole)) {
      return false;
    }

    // Verificar límites diarios
    const permissions = await this.getUserPermissions(userId, userRole);
    return permissions.canUseAI && permissions.remainingRequests > 0;
  }

  async getUserPermissions(userId: string, userRole: string): Promise<UserPermissions> {
    const dailyLimit = await this.getDailyLimit(userRole);
    const usage = this.getUserDailyUsage(userId);
    
    return {
      canUseAI: ['teacher', 'admin'].includes(userRole),
      dailyUsage: usage,
      dailyLimit,
      remainingRequests: Math.max(0, dailyLimit - usage),
    };
  }

  async getServiceStatus() {
    const enabled = await this.isServiceEnabled();
    const provider = await this.getAIProvider();
    const model = await this.getAIModel(provider);
    
    let modelsAvailable: string[];
    switch (provider) {
      case 'anthropic':
        modelsAvailable = ['claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-opus-4-7'];
        break;
      case 'openai':
        modelsAvailable = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'];
        break;
      case 'gemini':
        modelsAvailable = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
        break;
      case 'openrouter':
        modelsAvailable = ['openai/gpt-3.5-turbo', 'openai/gpt-4-turbo-preview', 'anthropic/claude-3-haiku', 'meta-llama/llama-2-70b-chat'];
        break;
      default:
        modelsAvailable = ['claude-opus-4-7'];
    }
    
    return {
      enabled,
      provider,
      currentModel: model,
      modelsAvailable,
    };
  }

  async getUserUsageStats(userId: string): Promise<UsageStats> {
    const cacheEntry = this.userUsageCache.get(userId);
    
    return {
      totalRequests: cacheEntry?.count || 0,
      successfulRequests: cacheEntry?.count || 0, // Simplificado por ahora
      todayUsage: this.getUserDailyUsage(userId),
      averageResponseTime: 2500, // Mock - en producción sería calculado
      lastUsed: cacheEntry?.lastReset,
    };
  }

  private async buildContext(messageContent: string, options: AIOptions): Promise<string> {
    // Obtener información contextual real de los usuarios
    const contextInfo = await this.getContextualInfo(options);
    
    // Detectar automáticamente el tono del mensaje original
    const detectedTone = this.detectMessageTone(messageContent);
    const finalTone = options.tone || detectedTone;

    // Analyze the message content to provide better context
    const isUrgent = messageContent.toLowerCase().includes('urgent') || messageContent.toLowerCase().includes('emergencia') || messageContent.toLowerCase().includes('urgente');
    const isConcern = messageContent.toLowerCase().includes('preocup') || messageContent.toLowerCase().includes('problema') || messageContent.toLowerCase().includes('dificultad');
    const isQuestion = messageContent.includes('?') || messageContent.toLowerCase().includes('¿') || messageContent.toLowerCase().includes('consulta');
    const isRequest = messageContent.toLowerCase().includes('podría') || messageContent.toLowerCase().includes('solicito') || messageContent.toLowerCase().includes('necesito');
    const isMathRelated = messageContent.toLowerCase().includes('matemáticas') || messageContent.toLowerCase().includes('mates') || messageContent.toLowerCase().includes('números');
    const isGradeRelated = messageContent.toLowerCase().includes('notas') || messageContent.toLowerCase().includes('calificaciones') || messageContent.toLowerCase().includes('evaluación');
    const isBehaviorRelated = messageContent.toLowerCase().includes('comportamiento') || messageContent.toLowerCase().includes('conducta') || messageContent.toLowerCase().includes('disciplina');

    let context = `Eres ${contextInfo.recipientName} en un centro educativo español. 
Debes responder de manera ${finalTone} al siguiente mensaje, manteniendo el mismo nivel de formalidad que el mensaje recibido.

INFORMACIÓN DEL CONTEXTO:
- Remitente: ${contextInfo.senderName} (${contextInfo.senderRole})
- Destinatario: ${contextInfo.recipientName} (${contextInfo.recipientRole})
${contextInfo.relatedStudentName ? `- Estudiante: ${contextInfo.relatedStudentName}` : ''}
- Tono del mensaje original: ${detectedTone}
- Tono de respuesta requerido: ${finalTone}
${isUrgent ? '- PRIORIDAD: Mensaje urgente que requiere atención inmediata' : ''}
${isConcern ? '- TIPO: Mensaje de preocupación que requiere empatía y seguimiento' : ''}
${isQuestion ? '- TIPO: Consulta que requiere información específica' : ''}
${isRequest ? '- TIPO: Solicitud que requiere acción concreta' : ''}
${isMathRelated ? '- MATERIA: Consulta relacionada con matemáticas' : ''}
${isGradeRelated ? '- TEMA: Consulta sobre calificaciones y evaluaciones' : ''}
${isBehaviorRelated ? '- TEMA: Asunto relacionado con comportamiento del estudiante' : ''}

MENSAJE A RESPONDER:
"${messageContent}"

${options.messageContext && options.messageContext.length > 0 ? `\nHISTORIAL DE CONVERSACIÓN:\n${options.messageContext.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}` : ''}

INSTRUCCIONES PARA LA RESPUESTA:
- Usa un tono ${finalTone} que coincida con el nivel de formalidad del mensaje recibido
- ${contextInfo.relatedStudentName ? `Menciona a ${contextInfo.relatedStudentName} por su nombre cuando sea relevante` : ''}
- ${isConcern ? 'Muestra empatía y ofrece apoyo concreto' : ''}
- ${isQuestion ? 'Responde directamente las preguntas planteadas' : ''}
- ${isRequest ? 'Indica claramente los próximos pasos a seguir' : ''}
- ${isUrgent ? 'Prioriza la urgencia y ofrece contacto inmediato' : ''}
- ${isMathRelated ? 'Ofrece estrategias específicas para matemáticas y apoyo pedagógico' : ''}
- ${isGradeRelated ? 'Proporciona información clara sobre el sistema de evaluación' : ''}
- ${isBehaviorRelated ? 'Aborda el tema con tact y sugiere colaboración familia-escuela' : ''}
- Dirige la respuesta directamente a ${contextInfo.senderName}
- Firma la respuesta como ${contextInfo.recipientName}
- No menciones que eres una IA
- Mantén el mismo nivel de formalidad/informalidad que el mensaje original
- Si el remitente usa "tú", responde con "tú"; si usa "usted", responde con "usted"

GENERA ÚNICAMENTE LA RESPUESTA (incluyendo el saludo dirigido a ${contextInfo.senderName} y la firma de ${contextInfo.recipientName}):`;

    return context;
  }

  private async buildComposeContext(intention: string, options: AIComposeOptions): Promise<string> {
    // Obtener información contextual real de los usuarios
    const contextInfo = await this.getComposeContextualInfo(options);
    
    // Analizar el tipo de mensaje y tono
    const messageType = options.messageType || this.detectMessageType(intention);
    const tone = options.tone || this.detectIntentionTone(intention);

    // Análisis del contenido de la intención
    const isUrgent = intention.toLowerCase().includes('urgent') || intention.toLowerCase().includes('emergencia') || intention.toLowerCase().includes('urgente');
    const isConcern = intention.toLowerCase().includes('preocup') || intention.toLowerCase().includes('problema') || intention.toLowerCase().includes('dificultad');
    const isQuestion = intention.toLowerCase().includes('pregunt') || intention.toLowerCase().includes('consulta') || intention.toLowerCase().includes('información');
    const isRequest = intention.toLowerCase().includes('solicito') || intention.toLowerCase().includes('pedir') || intention.toLowerCase().includes('necesito');
    const isMeeting = intention.toLowerCase().includes('reunión') || intention.toLowerCase().includes('cita') || intention.toLowerCase().includes('encuentro');
    const isGradeRelated = intention.toLowerCase().includes('notas') || intention.toLowerCase().includes('calificaciones') || intention.toLowerCase().includes('evaluación');

    let context = `Eres ${contextInfo.senderName}, ${contextInfo.senderRole} en un centro educativo español. 
Debes componer un mensaje ${tone} dirigido a ${contextInfo.recipientName}.

INFORMACIÓN DEL CONTEXTO:
- Remitente: ${contextInfo.senderName} (${contextInfo.senderRole})
- Destinatario: ${contextInfo.recipientName} (${contextInfo.recipientRole})
${contextInfo.relatedStudentName ? `- Estudiante relacionado: ${contextInfo.relatedStudentName}` : ''}
- Tipo de mensaje: ${messageType}
- Tono requerido: ${tone}
${isUrgent ? '- PRIORIDAD: Mensaje urgente que requiere atención inmediata' : ''}
${isConcern ? '- TIPO: Mensaje de preocupación que requiere tacto y empatía' : ''}
${isQuestion ? '- TIPO: Consulta que requiere información específica' : ''}
${isRequest ? '- TIPO: Solicitud que requiere acción concreta' : ''}
${isMeeting ? '- ACCIÓN: Propuesta de reunión o encuentro' : ''}
${isGradeRelated ? '- TEMA: Consulta sobre calificaciones y evaluaciones' : ''}

INTENCIÓN DEL USUARIO:
"${intention}"

INSTRUCCIONES PARA EL MENSAJE:
- Usa un tono ${tone} apropiado para la comunicación escolar española
- Dirige el mensaje directamente a ${contextInfo.recipientName}
- ${contextInfo.relatedStudentName ? `Menciona a ${contextInfo.relatedStudentName} cuando sea relevante` : ''}
- ${isConcern ? 'Muestra empatía y ofrece apoyo concreto' : ''}
- ${isQuestion ? 'Formula preguntas claras y directas' : ''}
- ${isRequest ? 'Presenta la solicitud de manera educada pero clara' : ''}
- ${isUrgent ? 'Transmite la urgencia de manera profesional' : ''}
- ${isMeeting ? 'Propón opciones de fecha/hora para la reunión' : ''}
- ${isGradeRelated ? 'Mantén enfoque profesional sobre evaluación académica' : ''}
- Firma el mensaje como ${contextInfo.senderName}
- Incluye saludo apropiado y despedida cortés
- Mantén el protocolo educativo español
- No menciones que eres una IA
- Usa "usted" para formalidad o "tú" para cercanía según el tono

GENERA ÚNICAMENTE EL MENSAJE COMPLETO (incluyendo saludo a ${contextInfo.recipientName} y firma de ${contextInfo.senderName}):`;

    return context;
  }

  private async getComposeContextualInfo(options: AIComposeOptions): Promise<{
    senderName: string;
    senderRole: string;
    recipientName: string;
    recipientRole: string;  
    relatedStudentName?: string;
  }> {
    let senderName = 'Usuario';
    let recipientName = options.recipientName || 'Destinatario';
    let senderRole = 'Usuario';
    let recipientRole = 'Usuario';
    let relatedStudentName = options.relatedStudent;

    this.logger.log(`🔍 Getting compose contextual info - senderId: ${options.userId}, recipientId: ${options.recipientId}`);

    try {
      // Obtener información del remitente (quien compone el mensaje)
      if (options.userId) {
        this.logger.log(`📤 Looking up sender with ID: ${options.userId}`);
        const sender = await this.userRepository.findOne({
          where: { id: options.userId },
          relations: { profile: true }
        });
        this.logger.log(`📤 Sender found: ${sender ? 'YES' : 'NO'}, Profile: ${sender?.profile ? 'YES' : 'NO'}`);
        if (sender && sender.profile) {
          senderName = `${sender.profile.firstName} ${sender.profile.lastName}`;
          senderRole = this.translateRole(sender.role);
          this.logger.log(`📤 Sender info: ${senderName} (${senderRole})`);
        }
      }

      // Obtener información del destinatario
      if (options.recipientId) {
        this.logger.log(`📥 Looking up recipient with ID: ${options.recipientId}`);
        const recipient = await this.userRepository.findOne({
          where: { id: options.recipientId },
          relations: { profile: true }
        });
        this.logger.log(`📥 Recipient found: ${recipient ? 'YES' : 'NO'}, Profile: ${recipient?.profile ? 'YES' : 'NO'}`);
        if (recipient && recipient.profile) {
          recipientName = `${recipient.profile.firstName} ${recipient.profile.lastName}`;
          recipientRole = this.translateRole(recipient.role);
          this.logger.log(`📥 Recipient info: ${recipientName} (${recipientRole})`);
        }
      }

      // Si hay un estudiante relacionado, obtener su nombre
      if (options.relatedStudent && !relatedStudentName) {
        this.logger.log(`👨‍🎓 Looking up student: ${options.relatedStudent}`);
        const student = await this.studentRepository.findOne({
          where: [
            { id: options.relatedStudent },
            { user: { profile: { firstName: options.relatedStudent } } }
          ],
          relations: { user: { profile: true } }
        });
        this.logger.log(`👨‍🎓 Student found: ${student ? 'YES' : 'NO'}`);
        if (student && student.user && student.user.profile) {
          relatedStudentName = `${student.user.profile.firstName} ${student.user.profile.lastName}`;
          this.logger.log(`👨‍🎓 Student info: ${relatedStudentName}`);
        }
      }
    } catch (error) {
      this.logger.error('❌ Error getting compose contextual info:', error.message);
    }

    const result = {
      senderName,
      senderRole,
      recipientName,
      recipientRole,
      relatedStudentName
    };

    this.logger.log(`🎯 Final compose contextual info: ${JSON.stringify(result)}`);
    return result;
  }

  private detectMessageType(intention: string): 'announcement' | 'direct' | 'concern' | 'question' | 'request' {
    const content = intention.toLowerCase();
    
    if (content.includes('anunci') || content.includes('comunic') || content.includes('informar')) return 'announcement';
    if (content.includes('preocup') || content.includes('problema') || content.includes('dificultad')) return 'concern';
    if (content.includes('pregunt') || content.includes('consulta') || content.includes('información')) return 'question';  
    if (content.includes('solicito') || content.includes('pedir') || content.includes('necesito')) return 'request';
    
    return 'direct';
  }

  private detectIntentionTone(intention: string): 'formal' | 'empático' | 'informativo' | 'neutro' {
    const content = intention.toLowerCase();
    
    // Indicadores de necesidad empática
    const empathicIndicators = ['preocup', 'problema', 'dificultad', 'ayuda', 'apoyo', 'urgente'];
    const formalIndicators = ['solicito', 'comunico', 'informo', 'requiero'];
    const informativeIndicators = ['información', 'datos', 'detalles', 'explicar', 'aclarar'];

    let empathicScore = 0;
    let formalScore = 0;
    let informativeScore = 0;

    empathicIndicators.forEach(indicator => {
      if (content.includes(indicator)) empathicScore++;
    });

    formalIndicators.forEach(indicator => {
      if (content.includes(indicator)) formalScore++;
    });

    informativeIndicators.forEach(indicator => {
      if (content.includes(indicator)) informativeScore++;
    });

    if (empathicScore > 0) return 'empático';
    if (formalScore > informativeScore) return 'formal';  
    if (informativeScore > 0) return 'informativo';
    
    return 'neutro';
  }

  private detectMessageTone(messageContent: string): 'formal' | 'empático' | 'informativo' | 'neutro' {
    const content = messageContent.toLowerCase();
    
    // Indicadores de formalidad
    const formalIndicators = ['estimado', 'estimada', 'distinguido', 'distinguida', 'le saluda', 'atentamente', 'cordialmente', 'usted', 'agradeceríamos', 'solicitamos'];
    const informalIndicators = ['hola', 'qué tal', 'saludos', 'tú', 'te', 'nos vemos', 'hasta pronto', 'gracias!', 'un saludo'];
    const concernIndicators = ['preocupa', 'problema', 'dificultad', 'ayuda', 'apoyo', 'no entiendo', 'confundido', 'angustia'];
    const informativeIndicators = ['información', 'datos', 'detalles', 'cuando', 'donde', 'como', 'qué', 'por qué', 'explicar'];

    let formalScore = 0;
    let informalScore = 0;
    let concernScore = 0;
    let informativeScore = 0;

    // Contar indicadores
    formalIndicators.forEach(indicator => {
      if (content.includes(indicator)) formalScore++;
    });

    informalIndicators.forEach(indicator => {
      if (content.includes(indicator)) informalScore++;
    });

    concernIndicators.forEach(indicator => {
      if (content.includes(indicator)) concernScore++;
    });

    informativeIndicators.forEach(indicator => {
      if (content.includes(indicator)) informativeScore++;
    });

    // Determinar el tono predominante
    if (concernScore > 1) return 'empático';
    if (formalScore > informalScore) return 'formal';
    if (informativeScore > 1) return 'informativo';
    if (informalScore > 0) return 'neutro';
    
    return 'empático'; // Default empático para contexto educativo
  }

  private async getContextualInfo(options: AIOptions): Promise<{
    senderName: string;
    senderRole: string;
    recipientName: string;
    recipientRole: string;  
    relatedStudentName?: string;
  }> {
    let senderName = 'Usuario';
    let recipientName = 'Profesor/a';
    let senderRole = options.senderRole || 'familia';
    let recipientRole = options.recipientRole || 'teacher';
    let relatedStudentName = options.relatedStudent;

    this.logger.log(`🔍 Getting contextual info - senderId: ${options.senderId}, userId: ${options.userId}, relatedStudent: ${options.relatedStudent}`);

    try {
      // Obtener información del remitente
      if (options.senderId) {
        this.logger.log(`📤 Looking up sender with ID: ${options.senderId}`);
        const sender = await this.userRepository.findOne({
          where: { id: options.senderId },
          relations: { profile: true }
        });
        this.logger.log(`📤 Sender found: ${sender ? 'YES' : 'NO'}, Profile: ${sender?.profile ? 'YES' : 'NO'}`);
        if (sender && sender.profile) {
          senderName = `${sender.profile.firstName} ${sender.profile.lastName}`;
          senderRole = this.translateRole(sender.role);
          this.logger.log(`📤 Sender info: ${senderName} (${senderRole})`);
        }
      }

      // Obtener información del destinatario (quien va a responder)
      if (options.userId) {
        this.logger.log(`📥 Looking up recipient with ID: ${options.userId}`);
        const recipient = await this.userRepository.findOne({
          where: { id: options.userId },
          relations: { profile: true }
        });
        this.logger.log(`📥 Recipient found: ${recipient ? 'YES' : 'NO'}, Profile: ${recipient?.profile ? 'YES' : 'NO'}`);
        if (recipient && recipient.profile) {
          recipientName = `${recipient.profile.firstName} ${recipient.profile.lastName}`;
          recipientRole = this.translateRole(recipient.role);
          this.logger.log(`📥 Recipient info: ${recipientName} (${recipientRole})`);
        }
      }

      // Si hay un estudiante relacionado, obtener su nombre
      if (options.relatedStudent && !relatedStudentName) {
        this.logger.log(`👨‍🎓 Looking up student: ${options.relatedStudent}`);
        // Intentar encontrar el estudiante por nombre o ID
        const student = await this.studentRepository.findOne({
          where: [
            { id: options.relatedStudent },
            { user: { profile: { firstName: options.relatedStudent } } }
          ],
          relations: { user: { profile: true } }
        });
        this.logger.log(`👨‍🎓 Student found: ${student ? 'YES' : 'NO'}`);
        if (student && student.user && student.user.profile) {
          relatedStudentName = `${student.user.profile.firstName} ${student.user.profile.lastName}`;
          this.logger.log(`👨‍🎓 Student info: ${relatedStudentName}`);
        }
      }
    } catch (error) {
      this.logger.error('❌ Error getting contextual info:', error.message);
    }

    const result = {
      senderName,
      senderRole,
      recipientName,
      recipientRole,
      relatedStudentName
    };

    this.logger.log(`🎯 Final contextual info: ${JSON.stringify(result)}`);
    return result;
  }

  private translateRole(role: string): string {
    const roleTranslations = {
      'admin': 'Administración',
      'teacher': 'Profesor/a',
      'student': 'Estudiante',
      'family': 'Familia'
    };
    return roleTranslations[role] || role;
  }

  private async callAIProvider(context: string, options: AIOptions): Promise<any> {
    const provider = await this.getAIProvider();
    
    switch (provider) {
      case 'anthropic':
        return this.callAnthropicAPI(context, options);
      case 'openai':
        return this.callOpenAIAPI(context, options);
      case 'gemini':
        return this.callGeminiAPI(context, options);
      case 'openrouter':
        return this.callOpenRouterAPI(context, options);
      default:
        return this.getFallbackResponse(options);
    }
  }

  private async callAnthropicAPI(context: string, options: AIOptions): Promise<any> {
    const apiKey = await this.getAPIKey('anthropic');
    
    if (!apiKey) {
      this.logger.warn('🔑 Anthropic API key not configured, using fallback');
      return this.getFallbackResponse(options);
    }

    try {
      const model = await this.getAIModel('anthropic');
      this.logger.log(`🤖 Calling Anthropic API with model: ${model}`);
      this.logger.log(`🔑 API key length: ${apiKey.length} characters, starts with: ${apiKey.substring(0, 15)}...`);
      
      const requestPayload = {
        model,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: context,
          },
        ],
      };
      
      this.logger.log(`📝 Request payload: ${JSON.stringify({...requestPayload, messages: [{role: 'user', content: `${context.substring(0, 50)}...`}]})}`);
      
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 10000, // 10 segundos timeout
        }
      );

      this.logger.log(`✅ Anthropic API response received, status: ${response.status}`);
      this.logger.log(`📊 Response structure: ${JSON.stringify(Object.keys(response.data))}`);
      
      if (response.data?.content?.[0]?.text) {
        const content = response.data.content[0].text;
        this.logger.log(`🎯 Generated content length: ${content.length} characters`);
        return {
          content,
          confidence: 0.85,
        };
      } else {
        this.logger.warn('⚠️ Unexpected Anthropic response structure:', JSON.stringify(response.data));
        return this.getFallbackResponse(options);
      }
    } catch (error) {
      this.logger.error('❌ Anthropic API error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      return this.getFallbackResponse(options);
    }
  }

  private async callOpenAIAPI(context: string, options: AIOptions): Promise<any> {
    const apiKey = await this.getAPIKey('openai');
    
    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured, using fallback');
      return this.getFallbackResponse(options);
    }

    try {
      const model = await this.getAIModel('openai');
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages: [
            {
              role: 'user',
              content: context,
            },
          ],
          max_tokens: 400,
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          timeout: 10000,
        }
      );

      return {
        content: response.data.choices[0].message.content,
        confidence: 0.8,
      };
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      return this.getFallbackResponse(options);
    }
  }

  private async callGeminiAPI(context: string, options: AIOptions): Promise<any> {
    const apiKey = await this.getAPIKey('gemini');
    
    if (!apiKey) {
      this.logger.warn('Gemini API key not configured, using fallback');
      return this.getFallbackResponse(options);
    }

    try {
      const model = await this.getAIModel('gemini');
      this.logger.log(`🤖 Calling Gemini API with model: ${model}`);
      this.logger.log(`📝 Context length: ${context.length} characters`);
      
      const requestPayload = {
        contents: [
          {
            parts: [
              {
                text: context,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 400,
        },
      };
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.substring(0, 10)}...`;
      this.logger.log(`🌐 Making request to: ${url.replace(/key=.*/, 'key=***')}`);
      
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      this.logger.log(`✅ Gemini API response received, status: ${response.status}`);
      this.logger.log(`📊 Response data structure: ${JSON.stringify(Object.keys(response.data))}`);
      
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const content = response.data.candidates[0].content.parts[0].text;
        this.logger.log(`🎯 Generated content length: ${content.length} characters`);
        return {
          content,
          confidence: 0.85,
        };
      } else {
        this.logger.warn('⚠️ Unexpected Gemini response structure:', JSON.stringify(response.data));
        return this.getFallbackResponse(options);
      }
    } catch (error) {
      this.logger.error('❌ Gemini API error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      return this.getFallbackResponse(options);
    }
  }

  private async callOpenRouterAPI(context: string, options: AIOptions): Promise<any> {
    const apiKey = await this.getAPIKey('openrouter');
    
    if (!apiKey) {
      this.logger.warn('🔑 OpenRouter API key not configured, using fallback');
      return this.getFallbackResponse(options);
    }

    try {
      const model = await this.getAIModel('openrouter');
      this.logger.log(`🤖 Calling OpenRouter API with model: ${model}`);
      this.logger.log(`🔑 API key length: ${apiKey.length} characters, starts with: ${apiKey.substring(0, 15)}...`);
      
      const requestPayload = {
        model,
        messages: [
          {
            role: 'user',
            content: context,
          },
        ],
        max_tokens: 400,
        temperature: 0.7,
      };
      
      this.logger.log(`📝 Request payload: ${JSON.stringify({...requestPayload, messages: [{role: 'user', content: `${context.substring(0, 50)}...`}]})}`);
      
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://plataforma.mundoworld.school',
            'X-Title': 'MW Panel - AI Assistant',
          },
          timeout: 10000, // 10 segundos timeout
        }
      );

      this.logger.log(`✅ OpenRouter API response received, status: ${response.status}`);
      this.logger.log(`📊 Response structure: ${JSON.stringify(Object.keys(response.data))}`);
      
      if (response.data?.choices?.[0]?.message?.content) {
        const content = response.data.choices[0].message.content;
        this.logger.log(`🎯 Generated content length: ${content.length} characters`);
        return {
          content,
          confidence: 0.85,
        };
      } else {
        this.logger.warn('⚠️ Unexpected OpenRouter response structure:', JSON.stringify(response.data));
        return this.getFallbackResponse(options);
      }
    } catch (error) {
      this.logger.error('❌ OpenRouter API error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      return this.getFallbackResponse(options);
    }
  }

  private getFallbackResponse(options: AIOptions): any {
    const { tone = 'empático', relatedStudent, messageContext, senderRole, recipientRole } = options;
    
    // Generate more contextual responses based on the actual message
    this.logger.warn('🔄 Using enhanced fallback response with context analysis');
    
    const responseMap = {
      empático: this.generateEmpatheticResponse(relatedStudent, messageContext, senderRole),
      formal: this.generateFormalResponse(relatedStudent, messageContext, senderRole),
      informativo: this.generateInformativeResponse(relatedStudent, messageContext, senderRole),
      neutro: this.generateNeutralResponse(relatedStudent, messageContext, senderRole),
    };

    return {
      content: responseMap[tone],
      confidence: 0.75, // Higher confidence since it's contextual
      suggestions: [
        'Revisar la información del estudiante mencionado',
        'Programar una reunión si es necesario',
        'Proporcionar recursos adicionales de apoyo',
      ],
    };
  }

  private generateEmpatheticResponse(student: string, context: string[], senderRole: string): string {
    if (student && context && context.length > 0) {
      const lastMessage = context[context.length - 1];
      
      if (lastMessage.toLowerCase().includes('problema') || lastMessage.toLowerCase().includes('dificultad')) {
        return `Estimado/a familia,

Comprendo su preocupación respecto a ${student}. Es natural que como familia se sientan inquietos cuando perciben dificultades en el aprendizaje de su hijo/a.

Me gustaría programar una reunión para conversar en detalle sobre la situación de ${student} y explorar juntos las mejores estrategias de apoyo. Es importante trabajar en equipo para brindarle el acompañamiento que necesita.

¿Podrían indicarme qué días y horarios les resultan más convenientes para una cita?

Con todo mi apoyo,
Profesor/a`;
      }
      
      if (lastMessage.toLowerCase().includes('matemáticas') || lastMessage.toLowerCase().includes('mates')) {
        return `Estimada familia,

Gracias por compartir sus observaciones sobre ${student} en matemáticas. Es muy valioso que mantengan esta comunicación conmigo.

He estado observando el progreso de ${student} y me gustaría proponerles algunas estrategias específicas para reforzar los conceptos matemáticos en casa. También considero importante evaluar si necesitamos adaptar alguna metodología en clase.

¿Les parece bien que nos reunamos esta semana para crear un plan de apoyo personalizado?

Saludos cordiales,
Profesor/a`;
      }
    }

    return `Estimada familia,

Agradezco que se pongan en contacto conmigo. ${student ? `La situación de ${student} ` : 'Su consulta '}es importante y merece toda mi atención.

Me gustaría conocer más detalles para poder ofrecerles el mejor apoyo posible. Propongo que programemos una reunión donde podamos conversar con tranquilidad y establecer un plan de acción conjunto.

Quedo a su disposición para coordinar la cita.

Con cariño,
Profesor/a`;
  }

  private generateFormalResponse(student: string, context: string[], senderRole: string): string {
    return `Estimados señores,

Acuso recibo de su comunicación${student ? ` referente a ${student}` : ''}.

Procederé a analizar la situación planteada y les proporcionaré una respuesta detallada en el plazo de 48 horas. En caso de requerir información adicional, me pondré en contacto con ustedes.

${student ? `Mientras tanto, continuaré prestando especial atención al progreso de ${student} en clase.` : ''}

Atentamente,
Profesor/a`;
  }

  private generateInformativeResponse(student: string, context: string[], senderRole: string): string {
    return `Estimada familia,

He recibido su consulta${student ? ` sobre ${student}` : ''} y procederé de la siguiente manera:

1. Revisaré el expediente académico y las evaluaciones recientes
2. Consultaré con otros profesores si es necesario
3. Elaboraré un informe con recomendaciones específicas
4. Programaré una cita para explicarles los resultados

Este proceso me llevará aproximadamente 2-3 días. Les confirmaré la fecha de reunión por este mismo medio.

Cordialmente,
Profesor/a`;
  }

  private generateNeutralResponse(student: string, context: string[], senderRole: string): string {
    return `Comunicación recibida.

${student ? `Tema: ${student}` : 'Consulta registrada'}
Estado: En revisión
Tiempo estimado de respuesta: 24-48 horas

Se procederá según protocolo establecido.

Saludos.`;
  }

  private async getDailyLimit(userRole: string): Promise<number> {
    try {
      const limitKey = userRole === 'admin' ? 'ai_daily_limit_admin' : 'ai_daily_limit_teacher';
      const limitSetting = await this.systemSettingRepository.findOne({
        where: { key: limitKey }
      });
      
      if (limitSetting?.value) {
        const limit = parseInt(limitSetting.value, 10);
        return isNaN(limit) ? 0 : limit;
      }
      
      // Fallback a valores por defecto
      switch (userRole) {
        case 'admin':
          return 50;
        case 'teacher':
          return 20;
        default:
          return 0;
      }
    } catch (error) {
      this.logger.error('Error getting daily limit:', error);
      // Fallback a valores por defecto
      return userRole === 'admin' ? 50 : userRole === 'teacher' ? 20 : 0;
    }
  }

  private getUserDailyUsage(userId: string): number {
    const cacheEntry = this.userUsageCache.get(userId);
    
    if (!cacheEntry) {
      return 0;
    }

    // Reset counter if it's a new day
    const today = new Date();
    const lastReset = cacheEntry.lastReset;
    
    if (!lastReset || today.toDateString() !== lastReset.toDateString()) {
      this.userUsageCache.set(userId, { count: 0, lastReset: today });
      return 0;
    }

    return cacheEntry.count;
  }

  private async incrementUserUsage(userId: string): Promise<void> {
    if (!userId) return;

    const currentUsage = this.getUserDailyUsage(userId);
    const today = new Date();
    
    this.userUsageCache.set(userId, {
      count: currentUsage + 1,
      lastReset: today,
    });
  }
}