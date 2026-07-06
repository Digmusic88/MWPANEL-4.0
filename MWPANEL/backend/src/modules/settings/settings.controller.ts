import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CreateSystemSettingDto, UpdateSystemSettingDto, SystemSettingResponseDto } from './dto/system-setting.dto';
import { SystemSetting, SettingCategory } from './entities/system-setting.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClosureService } from './closure/closure.service';
import { CLOSURE_SECTIONS } from './closure/closure-sections';
import { EnableClosureDto, UpdateClosureDto } from './dto/closure.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly closureService: ClosureService,
  ) {}

  // Endpoint público para estado de mantenimiento (sin guards)
  @Public()
  @Get('maintenance/status')
  @ApiOperation({ summary: 'Estado del modo mantenimiento (público)' })
  @ApiResponse({ status: 200, description: 'Estado del modo mantenimiento' })
  async getMaintenanceStatus(): Promise<{ enabled: boolean }> {
    const enabled = await this.settingsService.getBoolean('system_maintenanceMode', false);
    return { enabled };
  }

  // Los siguientes endpoints requieren autenticación
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Crear nueva configuración' })
  @ApiResponse({ status: 201, description: 'Configuración creada', type: SystemSettingResponseDto })
  async create(@Body() createDto: CreateSystemSettingDto): Promise<SystemSetting> {
    return this.settingsService.create(createDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Obtener todas las configuraciones' })
  @ApiResponse({ status: 200, description: 'Lista de configuraciones', type: [SystemSettingResponseDto] })
  async findAll(
    @Query('category') category?: SettingCategory
  ): Promise<SystemSetting[]> {
    return this.settingsService.findAll(category);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('modules')
  @ApiOperation({ summary: 'Obtener configuraciones de módulos' })
  @ApiResponse({ status: 200, description: 'Configuraciones de módulos', type: [SystemSettingResponseDto] })
  async getModuleSettings(): Promise<SystemSetting[]> {
    console.log('🔥🔥🔥 [SETTINGS] getModuleSettings called');
    const result = await this.settingsService.findAll(SettingCategory.MODULES);
    console.log('🔥🔥🔥 [SETTINGS] Total modules found:', result.length);
    console.log('🔥🔥🔥 [SETTINGS] First 3 modules:', result.slice(0, 3).map(r => ({ key: r.key, value: r.value })));
    console.log('🔥🔥🔥 [SETTINGS] Student notes modules:', result.filter(r => r.key.includes('student_notes')).map(r => ({ key: r.key, value: r.value })));
    return result;
  }

  // ==================== ENDPOINTS PARA CONFIGURACIÓN DE IA ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('ai-assistant')
  @ApiOperation({ summary: 'Obtener todas las configuraciones de IA' })
  @ApiResponse({ status: 200, description: 'Configuraciones de IA', type: [SystemSettingResponseDto] })
  async getAIAssistantSettings(): Promise<SystemSetting[]> {
    return this.settingsService.findAll(SettingCategory.AI_ASSISTANT);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('ai-assistant/status')
  @ApiOperation({ summary: 'Obtener estado del sistema de IA' })
  @ApiResponse({ status: 200, description: 'Estado del sistema de IA' })
  async getAIAssistantStatus(): Promise<{
    enabled: boolean;
    provider: string;
    hasAnthropicKey: boolean;
    hasOpenAIKey: boolean;
    hasGeminiKey: boolean;
    hasOpenRouterKey: boolean;
    dailyLimitTeacher: number;
    dailyLimitAdmin: number;
    modelAnthropic: string;
    modelOpenAI: string;
    modelGemini: string;
    modelOpenRouter: string;
  }> {
    const settings = await this.settingsService.findAll(SettingCategory.AI_ASSISTANT);
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.parsedValue;
      return acc;
    }, {} as Record<string, any>);

    return {
      enabled: settingsMap['ai_assistant_enabled'] || false,
      provider: settingsMap['ai_provider'] || 'anthropic',
      hasAnthropicKey: !!(settingsMap['anthropic_api_key'] || '').trim(),
      hasOpenAIKey: !!(settingsMap['openai_api_key'] || '').trim(),
      hasGeminiKey: !!(settingsMap['gemini_api_key'] || '').trim(),
      hasOpenRouterKey: !!(settingsMap['openrouter_api_key'] || '').trim(),
      dailyLimitTeacher: settingsMap['ai_daily_limit_teacher'] || 20,
      dailyLimitAdmin: settingsMap['ai_daily_limit_admin'] || 50,
      modelAnthropic: settingsMap['ai_model_anthropic'] || 'claude-opus-4-7',
      modelOpenAI: settingsMap['ai_model_openai'] || 'gpt-3.5-turbo',
      modelGemini: settingsMap['ai_model_gemini'] || 'gemini-1.5-flash',
      modelOpenRouter: settingsMap['ai_model_openrouter'] || 'openai/gpt-3.5-turbo',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Put('ai-assistant/enable')
  @ApiOperation({ summary: 'Habilitar/deshabilitar asistente de IA' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  async toggleAIAssistant(@Body() body: { enabled: boolean }): Promise<{ message: string; enabled: boolean }> {
    await this.settingsService.update('ai_assistant_enabled', { value: body.enabled.toString() });
    return {
      message: `Asistente de IA ${body.enabled ? 'habilitado' : 'deshabilitado'}`,
      enabled: body.enabled
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Put('ai-assistant/provider')
  @ApiOperation({ summary: 'Cambiar proveedor de IA' })
  @ApiResponse({ status: 200, description: 'Proveedor actualizado' })
  async updateAIProvider(@Body() body: { provider: 'anthropic' | 'openai' | 'gemini' | 'openrouter' }): Promise<{ message: string; provider: string }> {
    await this.settingsService.update('ai_provider', { value: body.provider });
    return {
      message: `Proveedor actualizado a ${body.provider}`,
      provider: body.provider
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Put('ai-assistant/api-keys')
  @ApiOperation({ summary: 'Actualizar claves API de IA' })
  @ApiResponse({ status: 200, description: 'Claves API actualizadas' })
  async updateAIApiKeys(@Body() body: { 
    anthropicKey?: string; 
    openaiKey?: string; 
    geminiKey?: string;
    openrouterKey?: string;
  }): Promise<{ message: string; updated: string[] }> {
    const updated: string[] = [];
    
    if (body.anthropicKey !== undefined) {
      await this.settingsService.update('anthropic_api_key', { value: body.anthropicKey });
      updated.push('Anthropic');
    }
    
    if (body.openaiKey !== undefined) {
      await this.settingsService.update('openai_api_key', { value: body.openaiKey });
      updated.push('OpenAI');
    }
    
    if (body.geminiKey !== undefined) {
      await this.settingsService.update('gemini_api_key', { value: body.geminiKey });
      updated.push('Gemini');
    }
    
    if (body.openrouterKey !== undefined) {
      await this.settingsService.update('openrouter_api_key', { value: body.openrouterKey });
      updated.push('OpenRouter');
    }
    
    return {
      message: `Claves API actualizadas: ${updated.join(', ')}`,
      updated
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Put('ai-assistant/limits')
  @ApiOperation({ summary: 'Actualizar límites diarios de IA' })
  @ApiResponse({ status: 200, description: 'Límites actualizados' })
  async updateAILimits(@Body() body: { 
    teacherLimit?: number; 
    adminLimit?: number; 
  }): Promise<{ message: string; limits: { teacher: number; admin: number } }> {
    let teacherLimit = 20;
    let adminLimit = 50;
    
    if (body.teacherLimit !== undefined) {
      await this.settingsService.update('ai_daily_limit_teacher', { value: body.teacherLimit.toString() });
      teacherLimit = body.teacherLimit;
    }
    
    if (body.adminLimit !== undefined) {
      await this.settingsService.update('ai_daily_limit_admin', { value: body.adminLimit.toString() });
      adminLimit = body.adminLimit;
    }
    
    return {
      message: 'Límites diarios actualizados',
      limits: { teacher: teacherLimit, admin: adminLimit }
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Put('ai-assistant/models')
  @ApiOperation({ summary: 'Actualizar modelos de IA' })
  @ApiResponse({ status: 200, description: 'Modelos actualizados' })
  async updateAIModels(@Body() body: { 
    anthropicModel?: string; 
    openaiModel?: string; 
    geminiModel?: string;
  }): Promise<{ message: string; models: { anthropic: string; openai: string; gemini: string } }> {
    let anthropicModel = 'claude-opus-4-7';
    let openaiModel = 'gpt-3.5-turbo';
    let geminiModel = 'gemini-1.5-flash';
    
    if (body.anthropicModel !== undefined) {
      await this.settingsService.update('ai_model_anthropic', { value: body.anthropicModel });
      anthropicModel = body.anthropicModel;
    }
    
    if (body.openaiModel !== undefined) {
      await this.settingsService.update('ai_model_openai', { value: body.openaiModel });
      openaiModel = body.openaiModel;
    }
    
    if (body.geminiModel !== undefined) {
      await this.settingsService.update('ai_model_gemini', { value: body.geminiModel });
      geminiModel = body.geminiModel;
    }
    
    return {
      message: 'Modelos actualizados',
      models: { anthropic: anthropicModel, openai: openaiModel, gemini: geminiModel }
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('ai-assistant/test-connection')
  @ApiOperation({ summary: 'Probar conexión con el proveedor de IA' })
  @ApiResponse({ status: 200, description: 'Resultado de la prueba de conexión' })
  async testAIConnection(@Body() body?: { provider?: 'anthropic' | 'openai' | 'gemini' }): Promise<{
    success: boolean;
    provider: string;
    message: string;
    error?: string;
  }> {
    try {
      const settings = await this.settingsService.findAll(SettingCategory.AI_ASSISTANT);
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.parsedValue;
        return acc;
      }, {} as Record<string, any>);

      const provider = body?.provider || settingsMap['ai_provider'] || 'anthropic';
      let apiKey: string;
      
      switch (provider) {
        case 'anthropic':
          apiKey = settingsMap['anthropic_api_key'];
          break;
        case 'openai':
          apiKey = settingsMap['openai_api_key'];
          break;
        case 'gemini':
          apiKey = settingsMap['gemini_api_key'];
          break;
        case 'openrouter':
          apiKey = settingsMap['openrouter_api_key'];
          break;
        default:
          apiKey = settingsMap['anthropic_api_key'];
      }

      if (!apiKey || !apiKey.trim()) {
        return {
          success: false,
          provider,
          message: `No se encontró clave API para ${provider}`,
          error: 'API_KEY_MISSING'
        };
      }

      // Test simple connection (podríamos implementar un test real aquí)
      return {
        success: true,
        provider,
        message: `Configuración válida para ${provider}`,
      };
    } catch (error) {
      return {
        success: false,
        provider: body?.provider || 'unknown',
        message: 'Error al probar la conexión',
        error: error.message
      };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('ai-assistant/reset-to-defaults')
  @ApiOperation({ summary: 'Restablecer configuración de IA a valores por defecto' })
  @ApiResponse({ status: 200, description: 'Configuración restablecida' })
  async resetAIToDefaults(): Promise<{ message: string; reset: string[] }> {
    const defaults = [
      { key: 'ai_assistant_enabled', value: 'false' },
      { key: 'ai_provider', value: 'anthropic' },
      { key: 'anthropic_api_key', value: '' },
      { key: 'openai_api_key', value: '' },
      { key: 'gemini_api_key', value: '' },
      { key: 'openrouter_api_key', value: '' },
      { key: 'ai_daily_limit_teacher', value: '20' },
      { key: 'ai_daily_limit_admin', value: '50' },
      { key: 'ai_model_anthropic', value: 'claude-opus-4-7' },
      { key: 'ai_model_openai', value: 'gpt-3.5-turbo' },
      { key: 'ai_model_gemini', value: 'gemini-1.5-flash' },
      { key: 'ai_model_openrouter', value: 'openai/gpt-3.5-turbo' },
    ];

    const reset: string[] = [];
    for (const setting of defaults) {
      await this.settingsService.update(setting.key, { value: setting.value });
      reset.push(setting.key);
    }

    return {
      message: 'Configuración de IA restablecida a valores por defecto',
      reset
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get(':key')
  @ApiOperation({ summary: 'Obtener configuración por clave' })
  @ApiResponse({ status: 200, description: 'Configuración encontrada', type: SystemSettingResponseDto })
  async findByKey(@Param('key') key: string): Promise<SystemSetting> {
    return this.settingsService.findByKey(key);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Put(':key')
  @ApiOperation({ summary: 'Actualizar configuración' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada', type: SystemSettingResponseDto })
  async update(
    @Param('key') key: string,
    @Body() updateDto: UpdateSystemSettingDto
  ): Promise<SystemSetting> {
    return this.settingsService.update(key, updateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Delete(':key')
  @ApiOperation({ summary: 'Eliminar configuración' })
  @ApiResponse({ status: 200, description: 'Configuración eliminada' })
  async delete(@Param('key') key: string): Promise<{ message: string }> {
    await this.settingsService.delete(key);
    return { message: 'Configuración eliminada exitosamente' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('modules/:moduleName/enable')
  @ApiOperation({ summary: 'Habilitar módulo' })
  @ApiResponse({ status: 200, description: 'Módulo habilitado' })
  async enableModule(@Param('moduleName') moduleName: string): Promise<{ message: string }> {
    await this.settingsService.enableModule(moduleName);
    return { message: `Módulo ${moduleName} habilitado exitosamente` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('modules/:moduleName/disable')
  @ApiOperation({ summary: 'Deshabilitar módulo' })
  @ApiResponse({ status: 200, description: 'Módulo deshabilitado' })
  async disableModule(@Param('moduleName') moduleName: string): Promise<{ message: string }> {
    await this.settingsService.disableModule(moduleName);
    return { message: `Módulo ${moduleName} deshabilitado exitosamente` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('modules/:moduleName/status')
  @ApiOperation({ summary: 'Verificar estado de módulo' })
  @ApiResponse({ status: 200, description: 'Estado del módulo' })
  async getModuleStatus(@Param('moduleName') moduleName: string): Promise<{ enabled: boolean }> {
    const enabled = await this.settingsService.isModuleEnabled(moduleName);
    return { enabled };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('initialize')
  @ApiOperation({ summary: 'Inicializar configuraciones por defecto' })
  @ApiResponse({ status: 200, description: 'Configuraciones inicializadas' })
  async initializeSettings(): Promise<{ message: string }> {
    await this.settingsService.initializeDefaultSettings();
    return { message: 'Configuraciones por defecto inicializadas exitosamente' };
  }

  // ==================== NUEVOS ENDPOINTS PARA ROLES ESPECÍFICOS ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('modules/:moduleName/roles/:role/enable')
  @ApiOperation({ summary: 'Habilitar módulo para rol específico' })
  @ApiResponse({ status: 200, description: 'Módulo habilitado para el rol' })
  async enableModuleForRole(
    @Param('moduleName') moduleName: string,
    @Param('role') role: string
  ): Promise<{ message: string }> {
    await this.settingsService.enableModuleForRole(moduleName, role);
    return { message: `Módulo ${moduleName} habilitado para rol ${role}` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('modules/:moduleName/roles/:role/disable')
  @ApiOperation({ summary: 'Deshabilitar módulo para rol específico' })
  @ApiResponse({ status: 200, description: 'Módulo deshabilitado para el rol' })
  async disableModuleForRole(
    @Param('moduleName') moduleName: string,
    @Param('role') role: string
  ): Promise<{ message: string }> {
    await this.settingsService.disableModuleForRole(moduleName, role);
    return { message: `Módulo ${moduleName} deshabilitado para rol ${role}` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('modules/:moduleName/roles')
  @ApiOperation({ summary: 'Obtener configuración de módulo por roles' })
  @ApiResponse({ status: 200, description: 'Configuración de módulo por roles' })
  async getModuleRoleSettings(@Param('moduleName') moduleName: string): Promise<{
    module: string;
    globalEnabled: boolean;
    roleSettings: Record<string, boolean>;
  }> {
    const globalEnabled = await this.settingsService.isModuleEnabled(moduleName);
    const roleSettings = await this.settingsService.getModuleRoleSettings(moduleName);
    return {
      module: moduleName,
      globalEnabled,
      roleSettings
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('modules/:moduleName/roles/configure')
  @ApiOperation({ summary: 'Configurar módulo para múltiples roles' })
  @ApiResponse({ status: 200, description: 'Configuración aplicada' })
  async configureModuleForRoles(
    @Param('moduleName') moduleName: string,
    @Body() config: { roles: Record<string, boolean> }
  ): Promise<{ message: string; updated: string[] }> {
    console.log('🐛 [SettingsController] configureModuleForRoles called:', {
      moduleName,
      config,
      timestamp: new Date().toISOString()
    });
    
    const updated = await this.settingsService.configureModuleForRoles(moduleName, config.roles);
    return { 
      message: `Configuración aplicada para módulo ${moduleName}`,
      updated 
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('modules/roles/all')
  @ApiOperation({ summary: 'Obtener configuración completa de módulos por roles' })
  @ApiResponse({ status: 200, description: 'Configuración completa' })
  async getAllModuleRoleSettings(): Promise<{
    modules: Record<string, {
      globalEnabled: boolean;
      roleSettings: Record<string, boolean>;
    }>;
  }> {
    const modules = await this.settingsService.getAllModuleRoleSettings();
    return { modules };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('modules/roles/initialize')
  @ApiOperation({ summary: 'Inicializar configuraciones por roles para todos los módulos' })
  @ApiResponse({ status: 200, description: 'Configuraciones por roles inicializadas' })
  async initializeModuleRoleSettings(): Promise<{ message: string; initialized: number }> {
    const initialized = await this.settingsService.initializeModuleRoleSettings();
    return { 
      message: 'Configuraciones por roles inicializadas',
      initialized 
    };
  }

  // Endpoint público para inicializar configuraciones (solo para setup inicial)
  @Public()
  @Post('modules/roles/initialize-public')
  @ApiOperation({ summary: 'Inicializar configuraciones por roles (endpoint público para setup)' })
  @ApiResponse({ status: 200, description: 'Configuraciones por roles inicializadas' })
  async initializeModuleRoleSettingsPublic(): Promise<{ message: string; initialized: number }> {
    const initialized = await this.settingsService.initializeModuleRoleSettings();
    return { 
      message: 'Configuraciones por roles inicializadas públicamente',
      initialized 
    };
  }

  // Endpoint público temporal para testing de configuración por roles
  @Public()
  @Post('modules/:moduleName/roles/configure-public')
  @ApiOperation({ summary: 'Configurar módulo para múltiples roles (endpoint público para testing)' })
  @ApiResponse({ status: 200, description: 'Configuración aplicada' })
  async configureModuleForRolesPublic(
    @Param('moduleName') moduleName: string,
    @Body() config: { roles: Record<string, boolean> }
  ): Promise<{ message: string; updated: string[] }> {
    const updated = await this.settingsService.configureModuleForRoles(moduleName, config.roles);
    return { 
      message: `Configuración aplicada para módulo ${moduleName} (modo público)`,
      updated 
    };
  }

  // Endpoint público temporal para obtener configuración por roles
  @Public()
  @Get('modules/:moduleName/roles-public')
  @ApiOperation({ summary: 'Obtener configuración de módulo por roles (endpoint público para testing)' })
  @ApiResponse({ status: 200, description: 'Configuración de módulo por roles' })
  async getModuleRoleSettingsPublic(@Param('moduleName') moduleName: string): Promise<{
    module: string;
    globalEnabled: boolean;
    roleSettings: Record<string, boolean>;
  }> {
    const globalEnabled = await this.settingsService.isModuleEnabled(moduleName);
    const roleSettings = await this.settingsService.getModuleRoleSettings(moduleName);
    
    return {
      module: moduleName,
      globalEnabled,
      roleSettings
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('maintenance/enable')
  @ApiOperation({ summary: 'Activar modo mantenimiento con duración estimada' })
  @ApiResponse({ status: 200, description: 'Modo mantenimiento activado' })
  async enableMaintenanceMode(
    @Body() body?: { duration?: number }
  ): Promise<{ message: string; duration: number }> {
    const duration = body?.duration || 60; // Default 60 minutes
    
    // Set maintenance mode and duration
    await this.settingsService.setBoolean('system_maintenanceMode', true);
    await this.settingsService.setNumber('system_maintenanceDuration', duration);
    
    return { 
      message: `Modo mantenimiento activado por ${duration} minutos aproximadamente`,
      duration
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('maintenance/disable')
  @ApiOperation({ summary: 'Desactivar modo mantenimiento' })
  @ApiResponse({ status: 200, description: 'Modo mantenimiento desactivado' })
  async disableMaintenanceMode(): Promise<{ message: string }> {
    await this.settingsService.setBoolean('system_maintenanceMode', false);
    return { message: 'Modo mantenimiento desactivado' };
  }

  // Backup configuration endpoints
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Put('backup_enableAutoBackup')
  @ApiOperation({ summary: 'Configurar activación de backup automático' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada', type: SystemSettingResponseDto })
  async updateEnableAutoBackup(@Body() updateDto: UpdateSystemSettingDto): Promise<SystemSetting> {
    return this.settingsService.update('backup_enableAutoBackup', updateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Put('backup_backupTime')
  @ApiOperation({ summary: 'Configurar hora de backup automático' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada', type: SystemSettingResponseDto })
  async updateBackupTime(@Body() updateDto: UpdateSystemSettingDto): Promise<SystemSetting> {
    return this.settingsService.update('backup_backupTime', updateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Put('backup_backupFrequency')
  @ApiOperation({ summary: 'Configurar frecuencia de backup automático' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada', type: SystemSettingResponseDto })
  async updateBackupFrequency(@Body() updateDto: UpdateSystemSettingDto): Promise<SystemSetting> {
    return this.settingsService.update('backup_backupFrequency', updateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Put('backup_retentionDays')
  @ApiOperation({ summary: 'Configurar días de retención de backups' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada', type: SystemSettingResponseDto })
  async updateRetentionDays(@Body() updateDto: UpdateSystemSettingDto): Promise<SystemSetting> {
    return this.settingsService.update('backup_retentionDays', updateDto);
  }

  // Endpoint de debug completamente público
  @Public()
  @Get('debug-test')
  @ApiOperation({ summary: 'Endpoint de debug GET simple' })
  @ApiResponse({ status: 200, description: 'Respuesta de debug' })
  async debugTest(): Promise<{ message: string; timestamp: string }> {
    console.log('🐛 [SettingsController] debugTest called');
    return {
      message: 'Debug GET endpoint funcionando correctamente',
      timestamp: new Date().toISOString()
    };
  }

  // Endpoint de debug POST público
  @Public()
  @Post('debug-post')
  @ApiOperation({ summary: 'Endpoint de debug POST' })
  @ApiResponse({ status: 200, description: 'Respuesta de debug POST' })
  async debugPostTest(@Body() body: any): Promise<{ message: string; received: any; timestamp: string }> {
    console.log('🐛 [SettingsController] debugPostTest called:', body);
    return {
      message: 'Debug POST endpoint funcionando correctamente',
      received: body,
      timestamp: new Date().toISOString()
    };
  }

  // Endpoint de debug para roles específico
  @Public()
  @Post('modules/test-calendario/roles/configure')
  @ApiOperation({ summary: 'Endpoint de debug para roles específico' })
  @ApiResponse({ status: 200, description: 'Respuesta de debug roles' })
  async debugRolesTest(@Body() body: any): Promise<{ message: string; received: any; timestamp: string }> {
    console.log('🐛 [SettingsController] debugRolesTest called:', body);
    return {
      message: 'Debug roles endpoint funcionando correctamente',
      received: body,
      timestamp: new Date().toISOString()
    };
  }

  // ==================== CIERRE DE CURSO ====================

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('closure/status')
  @ApiOperation({ summary: 'Estado del cierre de curso para el usuario actual' })
  async getClosureStatus(@CurrentUser() user: any) {
    return this.closureService.getStatusForRole(user?.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('closure/config')
  @ApiOperation({ summary: 'Configuración completa del cierre (admin)' })
  async getClosureConfig() {
    return this.closureService.getConfig();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('closure/sections')
  @ApiOperation({ summary: 'Catálogo de secciones configurables (admin)' })
  async getClosureSections() {
    return { sections: CLOSURE_SECTIONS.map((s) => ({ key: s.key, label: s.label })) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('closure/enable')
  @ApiOperation({ summary: 'Activar el cierre de curso (admin)' })
  async enableClosure(@Body() dto: EnableClosureDto, @CurrentUser() user: any) {
    await this.closureService.enable(dto, user?.email || user?.sub || 'admin');
    return { message: 'Cierre de curso activado' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('closure/disable')
  @ApiOperation({ summary: 'Desactivar el cierre de curso (admin)' })
  async disableClosure(@CurrentUser() user: any) {
    await this.closureService.disable(user?.email || user?.sub || 'admin');
    return { message: 'Cierre de curso desactivado' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Put('closure/config')
  @ApiOperation({ summary: 'Actualizar configuración del cierre en caliente (admin)' })
  async updateClosure(@Body() dto: UpdateClosureDto, @CurrentUser() user: any) {
    await this.closureService.updateConfig(dto, user?.email || user?.sub || 'admin');
    return { message: 'Configuración de cierre actualizada' };
  }

  // ==================== ENDPOINTS PARA SUBCATEGORÍAS ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('modules/:moduleName/subcategories/:role')
  @ApiOperation({ summary: 'Obtener configuración de subcategorías por módulo y rol' })
  @ApiResponse({ status: 200, description: 'Configuración de subcategorías' })
  async getModuleSubcategorySettings(
    @Param('moduleName') moduleName: string,
    @Param('role') role: string
  ): Promise<{
    module: string;
    role: string;
    subcategories: Record<string, boolean>;
  }> {
    const subcategories = await this.settingsService.getModuleSubcategorySettings(moduleName, role);
    return {
      module: moduleName,
      role,
      subcategories
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('modules/:moduleName/subcategories/:role/configure')
  @ApiOperation({ summary: 'Configurar subcategorías para un módulo y rol específico' })
  @ApiResponse({ status: 200, description: 'Configuración de subcategorías aplicada' })
  async configureModuleSubcategories(
    @Param('moduleName') moduleName: string,
    @Param('role') role: string,
    @Body() config: { subcategories: Record<string, boolean> }
  ): Promise<{ message: string; updated: string[] }> {
    const updated = await this.settingsService.configureModuleSubcategories(
      moduleName,
      role,
      config.subcategories
    );
    return {
      message: `Configuración de subcategorías aplicada para módulo ${moduleName} y rol ${role}`,
      updated
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('modules/subcategories/initialize')
  @ApiOperation({ summary: 'Inicializar configuraciones de subcategorías para todos los módulos' })
  @ApiResponse({ status: 200, description: 'Configuraciones de subcategorías inicializadas' })
  async initializeModuleSubcategorySettings(): Promise<{ message: string; initialized: number }> {
    const initialized = await this.settingsService.initializeModuleSubcategorySettings();
    return {
      message: 'Configuraciones de subcategorías inicializadas',
      initialized
    };
  }

}