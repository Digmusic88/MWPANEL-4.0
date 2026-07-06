import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SystemSetting, SettingType, SettingCategory } from './entities/system-setting.entity';
import { CreateSystemSettingDto, UpdateSystemSettingDto } from './dto/system-setting.dto';

@Injectable()
export class SettingsService {
  private cache = new Map<string, any>();

  constructor(
    @InjectRepository(SystemSetting)
    private settingsRepository: Repository<SystemSetting>,
  ) {
    this.initializeCache();
  }

  // ==================== CRUD SETTINGS ====================

  async create(createDto: CreateSystemSettingDto): Promise<SystemSetting> {
    // Verificar que no exista la clave
    const existing = await this.settingsRepository.findOne({
      where: { key: createDto.key },
    });

    if (existing) {
      throw new BadRequestException(`Setting with key '${createDto.key}' already exists`);
    }

    // Validar el valor según el tipo
    this.validateValue(createDto.value, createDto.type);

    const setting = this.settingsRepository.create(createDto);
    const saved = await this.settingsRepository.save(setting);

    // Actualizar cache
    this.cache.set(saved.key, saved.parsedValue);

    return saved;
  }

  async findAll(category?: SettingCategory): Promise<SystemSetting[]> {
    const query = this.settingsRepository.createQueryBuilder('setting')
      .orderBy('setting.category', 'ASC')
      .addOrderBy('setting.sortOrder', 'ASC')
      .addOrderBy('setting.name', 'ASC');

    if (category) {
      query.where('setting.category = :category', { category });
    }

    return query.getMany();
  }

  async findByKey(key: string): Promise<SystemSetting> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }
    return setting;
  }

  async update(key: string, updateDto: UpdateSystemSettingDto): Promise<SystemSetting> {
    const setting = await this.findByKey(key);

    if (!setting.isEditable) {
      throw new BadRequestException(`Setting '${key}' is not editable`);
    }

    // Validar el nuevo valor
    this.validateValue(updateDto.value, setting.type);

    // Actualizar
    Object.assign(setting, updateDto);
    const updated = await this.settingsRepository.save(setting);

    // Actualizar cache
    this.cache.set(updated.key, updated.parsedValue);

    return updated;
  }

  async delete(key: string): Promise<void> {
    const setting = await this.findByKey(key);
    await this.settingsRepository.remove(setting);
    this.cache.delete(key);
  }

  // ==================== GETTERS RÁPIDOS ====================

  async getValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    // Intentar desde cache primero
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // Si no está en cache, buscar en BD
    try {
      const setting = await this.findByKey(key);
      const value = setting.parsedValue;
      this.cache.set(key, value);
      return value as T;
    } catch {
      return defaultValue as T;
    }
  }

  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    return this.getValue<boolean>(key, defaultValue);
  }

  async getString(key: string, defaultValue: string = ''): Promise<string> {
    return this.getValue<string>(key, defaultValue);
  }

  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    return this.getValue<number>(key, defaultValue);
  }

  async getJSON<T = any>(key: string, defaultValue: T = {} as T): Promise<T> {
    return this.getValue<T>(key, defaultValue);
  }

  // ==================== SETTERS RÁPIDOS ====================

  async setValue(key: string, value: any): Promise<void> {
    try {
      const setting = await this.findByKey(key);
      const stringValue = this.valueToString(value, setting.type);
      await this.update(key, { value: stringValue });
    } catch {
      // Si no existe, no hacer nada o crear según necesidad
      throw new NotFoundException(`Setting '${key}' not found`);
    }
  }

  async setBoolean(key: string, value: boolean): Promise<void> {
    await this.setValue(key, value);
  }

  async setString(key: string, value: string): Promise<void> {
    await this.setValue(key, value);
  }

  async setNumber(key: string, value: number): Promise<void> {
    await this.setValue(key, value);
  }

  async setJSON(key: string, value: any): Promise<void> {
    await this.setValue(key, value);
  }

  /**
   * Crea o actualiza un setting por clave sin lanzar si no existe.
   * Útil para settings dinámicos (p.ej. cierre de curso) no presembrados.
   */
  async upsert(
    key: string,
    value: any,
    meta?: { name?: string; description?: string; category?: SettingCategory },
  ): Promise<void> {
    const existing = await this.settingsRepository.findOne({ where: { key } });
    if (existing) {
      existing.value = this.valueToString(value, existing.type);
      const saved = await this.settingsRepository.save(existing);
      this.cache.set(saved.key, saved.parsedValue);
      return;
    }
    const partial = SystemSetting.createSystemSetting(
      key,
      meta?.name || key,
      meta?.description || '',
      value,
      meta?.category || SettingCategory.GENERAL,
    );
    const created = this.settingsRepository.create(partial);
    const saved = await this.settingsRepository.save(created);
    this.cache.set(saved.key, saved.parsedValue);
  }

  // ==================== MÓDULOS ====================

  async isModuleEnabled(moduleName: string): Promise<boolean> {
    const key = `module_${moduleName}_enabled`;
    return this.getBoolean(key, false);
  }

  async enableModule(moduleName: string): Promise<void> {
    const key = `module_${moduleName}_enabled`;
    await this.setBoolean(key, true);
  }

  async disableModule(moduleName: string): Promise<void> {
    const key = `module_${moduleName}_enabled`;
    await this.setBoolean(key, false);
  }

  // ==================== MÓDULOS POR ROLES ====================

  async enableModuleForRole(moduleName: string, role: string): Promise<void> {
    const key = `module_${moduleName}_${role}_enabled`;
    await this.setBoolean(key, true);
  }

  async disableModuleForRole(moduleName: string, role: string): Promise<void> {
    const key = `module_${moduleName}_${role}_enabled`;
    await this.setBoolean(key, false);
  }

  async isModuleEnabledForRole(moduleName: string, role: string): Promise<boolean> {
    const key = `module_${moduleName}_${role}_enabled`;
    return this.getBoolean(key, false);
  }

  async getModuleRoleSettings(moduleName: string): Promise<Record<string, boolean>> {
    const roles = ['admin', 'teacher', 'student', 'family'];
    const settings: Record<string, boolean> = {};
    
    for (const role of roles) {
      const key = `module_${moduleName}_${role}_enabled`;
      settings[role] = await this.getBoolean(key, false);
    }
    
    return settings;
  }

  async configureModuleForRoles(moduleName: string, roleSettings: Record<string, boolean>): Promise<string[]> {
    const updated: string[] = [];
    
    for (const [role, enabled] of Object.entries(roleSettings)) {
      const key = `module_${moduleName}_${role}_enabled`;
      await this.setBoolean(key, enabled);
      updated.push(`${role}: ${enabled}`);
    }
    
    return updated;
  }

  async getAllModuleRoleSettings(): Promise<Record<string, {
    globalEnabled: boolean;
    roleSettings: Record<string, boolean>;
  }>> {
    const moduleNames = [
      'expedientes',
      'calendario',
      'recursos', 
      'analytics',
      'chat',
      'meetings',
      'educational_resources',
      'comunicaciones',
      'estudiantes',
      'profesores',
      'familias',
      'grupos',
      'asignaturas',
      'evaluaciones',
      'competencias',
      'actividades',
      'tareas',
      'asistencia',
      'notas',
      'dua'
    ];
    
    const result: Record<string, {
      globalEnabled: boolean;
      roleSettings: Record<string, boolean>;
    }> = {};
    
    for (const moduleName of moduleNames) {
      const globalEnabled = await this.isModuleEnabled(moduleName);
      const roleSettings = await this.getModuleRoleSettings(moduleName);
      
      result[moduleName] = {
        globalEnabled,
        roleSettings
      };
    }
    
    return result;
  }

  async initializeModuleRoleSettings(): Promise<number> {
    const moduleNames = [
      'expedientes',
      'calendario',
      'recursos', 
      'analytics',
      'chat',
      'meetings',
      'educational_resources',
      'comunicaciones',
      'estudiantes',
      'profesores',
      'familias',
      'grupos',
      'asignaturas',
      'evaluaciones',
      'competencias',
      'actividades',
      'tareas',
      'asistencia',
      'notas',
      'dua', // Nuevo módulo DUA
      'student_notes', // Módulo de apuntes de estudiantes
      'lessons' // Módulo de lecciones
    ];
    
    const roles = ['admin', 'teacher', 'student', 'family'];
    
    // Configuraciones por defecto por módulo
    const moduleRoleDefaults = {
      expedientes: { admin: true, teacher: true, student: false, family: false },
      calendario: { admin: true, teacher: true, student: true, family: true },
      recursos: { admin: true, teacher: true, student: true, family: false },
      analytics: { admin: true, teacher: true, student: false, family: false },
      chat: { admin: true, teacher: true, student: false, family: true },
      meetings: { admin: true, teacher: true, student: false, family: false },
      educational_resources: { admin: true, teacher: true, student: true, family: false },
      comunicaciones: { admin: true, teacher: true, student: true, family: true },
      estudiantes: { admin: true, teacher: true, student: true, family: true },
      profesores: { admin: true, teacher: true, student: false, family: false },
      familias: { admin: true, teacher: true, student: false, family: true },
      grupos: { admin: true, teacher: true, student: true, family: true },
      asignaturas: { admin: true, teacher: true, student: true, family: false },
      evaluaciones: { admin: true, teacher: true, student: true, family: true },
      competencias: { admin: true, teacher: true, student: true, family: true },
      actividades: { admin: true, teacher: true, student: true, family: true },
      tareas: { admin: true, teacher: true, student: true, family: true },
      asistencia: { admin: true, teacher: true, student: false, family: true },
      notas: { admin: true, teacher: true, student: true, family: true },
      dua: { admin: true, teacher: true, student: false, family: false },
      student_notes: { admin: true, teacher: true, student: true, family: false },
      lessons: { admin: true, teacher: true, student: true, family: false }
    };
    
    let initialized = 0;
    
    for (const moduleName of moduleNames) {
      const defaults = moduleRoleDefaults[moduleName] || {};
      
      for (const role of roles) {
        const key = `module_${moduleName}_${role}_enabled`;
        const defaultValue = defaults[role] || false;
        
        try {
          const exists = await this.settingsRepository.findOne({
            where: { key },
          });
          
          if (!exists) {
            const setting = SystemSetting.createModuleSetting(
              key,
              `Módulo ${moduleName} para ${role}`,
              `Habilita el módulo ${moduleName} para usuarios con rol ${role}`,
              defaultValue
            );
            
            await this.settingsRepository.save(setting);
            this.cache.set(key, defaultValue);
            initialized++;
          }
        } catch (error) {
          console.error(`Error initializing module role setting ${key}:`, error);
        }
      }
    }
    
    return initialized;
  }

  // ==================== SUBCATEGORÍAS POR MÓDULO ====================

  async getModuleSubcategorySettings(moduleName: string, role: string): Promise<Record<string, boolean>> {
    const subcategories = this.getModuleSubcategories(moduleName);
    const settings: Record<string, boolean> = {};
    
    for (const subcategory of subcategories) {
      if (subcategory.availableForRoles.includes(role)) {
        const key = `module_${moduleName}_${subcategory.key}_${role}_enabled`;
        settings[subcategory.key] = await this.getBoolean(key, subcategory.defaultEnabled);
      }
    }
    
    return settings;
  }

  async configureModuleSubcategories(
    moduleName: string,
    role: string,
    subcategorySettings: Record<string, boolean>
  ): Promise<string[]> {
    const subcategories = this.getModuleSubcategories(moduleName);
    const updated: string[] = [];
    
    for (const [subcategoryKey, enabled] of Object.entries(subcategorySettings)) {
      const subcategory = subcategories.find(s => s.key === subcategoryKey);
      if (subcategory && subcategory.availableForRoles.includes(role)) {
        const key = `module_${moduleName}_${subcategoryKey}_${role}_enabled`;
        await this.setBoolean(key, enabled);
        updated.push(`${subcategoryKey}: ${enabled}`);
      }
    }
    
    return updated;
  }

  async initializeModuleSubcategorySettings(): Promise<number> {
    const moduleNames = [
      'comunicaciones', 'estudiantes', 'profesores', 'familias', 'grupos',
      'asignaturas', 'evaluaciones', 'competencias', 'actividades', 'tareas',
      'asistencia', 'calendario', 'notas', 'expedientes', 'recursos', 'dua'
    ];
    
    const roles = ['admin', 'teacher', 'student', 'family'];
    let initialized = 0;
    
    for (const moduleName of moduleNames) {
      const subcategories = this.getModuleSubcategories(moduleName);
      
      for (const subcategory of subcategories) {
        for (const role of roles) {
          if (subcategory.availableForRoles.includes(role)) {
            const key = `module_${moduleName}_${subcategory.key}_${role}_enabled`;
            
            try {
              const exists = await this.settingsRepository.findOne({
                where: { key },
              });
              
              if (!exists) {
                const setting = SystemSetting.createModuleSetting(
                  key,
                  `${subcategory.name} en ${moduleName} para ${role}`,
                  `Habilita ${subcategory.description} para usuarios con rol ${role}`,
                  subcategory.defaultEnabled
                );
                
                await this.settingsRepository.save(setting);
                this.cache.set(key, subcategory.defaultEnabled);
                initialized++;
              }
            } catch (error) {
              console.error(`Error initializing subcategory setting ${key}:`, error);
            }
          }
        }
      }
    }
    
    return initialized;
  }

  // Helper para obtener subcategorías de un módulo
  private getModuleSubcategories(moduleName: string): Array<{
    key: string;
    name: string;
    description: string;
    icon: string;
    availableForRoles: string[];
    defaultEnabled: boolean;
  }> {
    const subcategoryMap = {
      comunicaciones: [
        { key: 'mensajes', name: 'Sistema de Mensajes', description: 'Chat interno entre usuarios', icon: 'MessageOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true },
        { key: 'notificaciones', name: 'Notificaciones', description: 'Sistema de notificaciones push', icon: 'BellOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true },
        { key: 'email', name: 'Sistema de Email', description: 'Envío de emails automáticos', icon: 'MailOutlined', availableForRoles: ['admin', 'teacher', 'family'], defaultEnabled: true },
        { key: 'automatizacion', name: 'Automatización', description: 'Reglas automáticas de comunicación', icon: 'RobotOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: false }
      ],
      estudiantes: [
        { key: 'perfiles', name: 'Perfiles de Estudiantes', description: 'Gestión de datos personales', icon: 'UserOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true },
        { key: 'matriculacion', name: 'Matriculación', description: 'Proceso de inscripción', icon: 'FormOutlined', availableForRoles: ['admin', 'teacher', 'family'], defaultEnabled: true },
        { key: 'historial', name: 'Historial Académico', description: 'Registro histórico de notas', icon: 'HistoryOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true },
        { key: 'seguimiento', name: 'Seguimiento Personalizado', description: 'Monitoreo individual del progreso', icon: 'LineChartOutlined', availableForRoles: ['admin', 'teacher', 'family'], defaultEnabled: true }
      ],
      profesores: [
        { key: 'perfiles', name: 'Perfiles de Profesores', description: 'Gestión de datos profesionales', icon: 'UserOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'horarios', name: 'Gestión de Horarios', description: 'Configuración de horarios', icon: 'ClockCircleOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'evaluaciones', name: 'Herramientas de Evaluación', description: 'Creación y gestión de evaluaciones', icon: 'EditOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'coordinacion', name: 'Coordinación Docente', description: 'Herramientas de coordinación', icon: 'TeamOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true }
      ],
      familias: [
        { key: 'perfiles', name: 'Perfiles de Familias', description: 'Gestión de datos familiares', icon: 'HomeOutlined', availableForRoles: ['admin', 'teacher', 'family'], defaultEnabled: true },
        { key: 'seguimiento', name: 'Seguimiento Académico', description: 'Monitoreo del progreso de los hijos', icon: 'EyeOutlined', availableForRoles: ['admin', 'teacher', 'family'], defaultEnabled: true },
        { key: 'comunicacion', name: 'Comunicación Escolar', description: 'Canal directo con profesores', icon: 'PhoneOutlined', availableForRoles: ['admin', 'teacher', 'family'], defaultEnabled: true },
        { key: 'autorizaciones', name: 'Autorizaciones y Permisos', description: 'Gestión de permisos', icon: 'SafetyCertificateOutlined', availableForRoles: ['admin', 'teacher', 'family'], defaultEnabled: true }
      ],
      grupos: [
        { key: 'gestion', name: 'Gestión de Grupos', description: 'Creación y organización de grupos', icon: 'TeamOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'asignaciones', name: 'Asignaciones', description: 'Asignación de estudiantes y profesores', icon: 'NodeIndexOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'horarios', name: 'Horarios de Clase', description: 'Configuración de horarios por grupo', icon: 'ScheduleOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true },
        { key: 'estadisticas', name: 'Estadísticas de Grupo', description: 'Analytics y métricas por grupo', icon: 'BarChartOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true }
      ],
      asignaturas: [
        { key: 'gestion', name: 'Gestión de Asignaturas', description: 'Creación y configuración de asignaturas', icon: 'BookOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'competencias', name: 'Competencias', description: 'Definición de competencias por asignatura', icon: 'TrophyOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'curriculum', name: 'Currículum', description: 'Gestión del currículum académico', icon: 'ReadOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'programacion', name: 'Programación Didáctica', description: 'Planificación de contenidos', icon: 'CalendarOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true }
      ],
      evaluaciones: [
        { key: 'creacion', name: 'Creación de Evaluaciones', description: 'Herramientas para crear evaluaciones', icon: 'EditOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'calificacion', name: 'Sistema de Calificación', description: 'Gestión de notas y calificaciones', icon: 'NumberOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'rubricas', name: 'Rúbricas', description: 'Creación y gestión de rúbricas', icon: 'TableOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'informes', name: 'Informes de Evaluación', description: 'Generación de informes', icon: 'FileTextOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true }
      ],
      competencias: [
        { key: 'definicion', name: 'Definición de Competencias', description: 'Creación y gestión de competencias', icon: 'BulbOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'evaluacion', name: 'Evaluación por Competencias', description: 'Sistema de evaluación basado en competencias', icon: 'CheckCircleOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'seguimiento', name: 'Seguimiento de Competencias', description: 'Monitoreo del desarrollo de competencias', icon: 'LineChartOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true },
        { key: 'certificacion', name: 'Certificación de Competencias', description: 'Emisión de certificados', icon: 'SafetyCertificateOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true }
      ],
      actividades: [
        { key: 'gestion', name: 'Gestión de Actividades', description: 'Creación y organización de actividades', icon: 'CalendarOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'participacion', name: 'Participación', description: 'Seguimiento de participación', icon: 'UserSwitchOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true },
        { key: 'evaluacion', name: 'Evaluación de Actividades', description: 'Sistema de evaluación para actividades', icon: 'StarOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'recursos', name: 'Recursos de Actividades', description: 'Gestión de materiales', icon: 'FolderOutlined', availableForRoles: ['admin', 'teacher', 'student'], defaultEnabled: true }
      ],
      tareas: [
        { key: 'asignacion', name: 'Asignación de Tareas', description: 'Creación y asignación de tareas', icon: 'PlusOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'seguimiento', name: 'Seguimiento de Tareas', description: 'Monitoreo del progreso', icon: 'EyeOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true },
        { key: 'entrega', name: 'Sistema de Entrega', description: 'Plataforma para entregar tareas', icon: 'UploadOutlined', availableForRoles: ['admin', 'teacher', 'student'], defaultEnabled: true },
        { key: 'correccion', name: 'Corrección Automática', description: 'Herramientas de corrección automática', icon: 'RobotOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: false }
      ],
      asistencia: [
        { key: 'registro', name: 'Registro de Asistencia', description: 'Toma de asistencia diaria', icon: 'CheckOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'reportes', name: 'Reportes de Asistencia', description: 'Informes y estadísticas', icon: 'FileTextOutlined', availableForRoles: ['admin', 'teacher', 'family'], defaultEnabled: true },
        { key: 'justificaciones', name: 'Justificaciones', description: 'Gestión de faltas justificadas', icon: 'ExclamationCircleOutlined', availableForRoles: ['admin', 'teacher', 'family'], defaultEnabled: true },
        { key: 'automatizacion', name: 'Automatización', description: 'Recordatorios automáticos', icon: 'BellOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true }
      ],
      calendario: [
        { key: 'eventos', name: 'Gestión de Eventos', description: 'Creación y organización de eventos', icon: 'CalendarOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'horarios', name: 'Horarios Académicos', description: 'Configuración de horarios', icon: 'ClockCircleOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true },
        { key: 'recordatorios', name: 'Recordatorios', description: 'Sistema de notificaciones', icon: 'BellOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true },
        { key: 'reservas', name: 'Reservas de Espacios', description: 'Gestión de reservas', icon: 'HomeOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true }
      ],
      notas: [
        { key: 'gestion', name: 'Gestión de Notas', description: 'Registro y gestión de calificaciones', icon: 'EditOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'boletines', name: 'Boletines de Notas', description: 'Generación de boletines', icon: 'FileTextOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true },
        { key: 'estadisticas', name: 'Estadísticas de Notas', description: 'Analytics y métricas', icon: 'BarChartOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'historico', name: 'Histórico de Notas', description: 'Registro histórico', icon: 'HistoryOutlined', availableForRoles: ['admin', 'teacher', 'student', 'family'], defaultEnabled: true }
      ],
      expedientes: [
        { key: 'gestion', name: 'Gestión de Expedientes', description: 'Creación y mantenimiento', icon: 'FolderOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'documentos', name: 'Documentos Oficiales', description: 'Gestión de documentos oficiales', icon: 'FileProtectOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'historico', name: 'Histórico Académico', description: 'Registro histórico completo', icon: 'HistoryOutlined', availableForRoles: ['admin', 'teacher', 'family'], defaultEnabled: true },
        { key: 'certificados', name: 'Certificados', description: 'Emisión de certificados', icon: 'SafetyCertificateOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true }
      ],
      recursos: [
        { key: 'biblioteca', name: 'Biblioteca Digital', description: 'Gestión de recursos digitales', icon: 'BookOutlined', availableForRoles: ['admin', 'teacher', 'student'], defaultEnabled: true },
        { key: 'multimedia', name: 'Contenido Multimedia', description: 'Gestión de videos y audios', icon: 'PlayCircleOutlined', availableForRoles: ['admin', 'teacher', 'student'], defaultEnabled: true },
        { key: 'compartir', name: 'Compartir Recursos', description: 'Plataforma para compartir', icon: 'ShareAltOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'evaluacion', name: 'Evaluación de Recursos', description: 'Sistema de valoración', icon: 'StarOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true }
      ],
      dua: [
        { key: 'perfiles', name: 'Perfiles de Accesibilidad', description: 'Gestión de perfiles DUA', icon: 'UserOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'adaptaciones', name: 'Adaptaciones Curriculares', description: 'Configuración de adaptaciones', icon: 'SettingOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'seguimiento', name: 'Seguimiento DUA', description: 'Monitoreo de efectividad', icon: 'LineChartOutlined', availableForRoles: ['admin', 'teacher'], defaultEnabled: true },
        { key: 'reportes', name: 'Reportes de Accesibilidad', description: 'Informes sobre implementación DUA', icon: 'FileTextOutlined', availableForRoles: ['admin', 'teacher', 'family'], defaultEnabled: true }
      ]
    };
    
    return subcategoryMap[moduleName] || [];
  }

  // ==================== INICIALIZACIÓN ====================

  async initializeDefaultSettings(): Promise<void> {
    const defaults = [
      // Configuraciones del Sistema
      SystemSetting.createSystemSetting(
        'system_systemName',
        'Nombre del Sistema',
        'Nombre oficial de la plataforma educativa',
        'MW Panel 2.0'
      ),
      SystemSetting.createSystemSetting(
        'system_systemEmail',
        'Email del Sistema',
        'Email de contacto oficial del sistema',
        'admin@mwpanel.com'
      ),
      SystemSetting.createSystemSetting(
        'system_allowRegistrations',
        'Permitir Registros',
        'Permite que nuevos usuarios se registren en el sistema',
        false
      ),
      SystemSetting.createSystemSetting(
        'system_defaultUserRole',
        'Rol por Defecto',
        'Rol asignado por defecto a nuevos usuarios',
        'student'
      ),
      SystemSetting.createSystemSetting(
        'system_maxStudentsPerClass',
        'Máximo Estudiantes por Clase',
        'Número máximo de estudiantes permitidos por clase',
        30
      ),
      SystemSetting.createSystemSetting(
        'system_maxFileUploadSize',
        'Tamaño Máximo de Archivo',
        'Tamaño máximo de archivo en MB para uploads',
        10
      ),
      SystemSetting.createSystemSetting(
        'system_sessionTimeout',
        'Tiempo de Sesión',
        'Duración de la sesión en minutos antes de expirar',
        480
      ),
      SystemSetting.createSystemSetting(
        'system_academicYearStart',
        'Inicio Año Académico',
        'Fecha de inicio del año académico (formato YYYY-MM-DD)',
        '2024-09-01'
      ),
      SystemSetting.createSystemSetting(
        'system_academicYearEnd',
        'Fin Año Académico',
        'Fecha de fin del año académico (formato YYYY-MM-DD)',
        '2025-06-30'
      ),
      SystemSetting.createSystemSetting(
        'system_enabledModules',
        'Módulos Habilitados',
        'Lista de módulos habilitados en el sistema',
        'students,teachers,families,activities,evaluations'
      ),
      SystemSetting.createSystemSetting(
        'system_maintenanceMode',
        'Modo Mantenimiento',
        'Indica si el sistema está en modo mantenimiento',
        false
      ),
      SystemSetting.createSystemSetting(
        'system_maintenanceDuration',
        'Duración Mantenimiento',
        'Duración estimada del mantenimiento en minutos',
        60
      ),
      
      // Configuraciones de Módulos
      SystemSetting.createModuleSetting(
        'module_expedientes_enabled',
        'Módulo de Expedientes',
        'Habilita el módulo de expedientes académicos y generación de boletines PDF',
        false
      ),
      SystemSetting.createModuleSetting(
        'module_calendario_enabled',
        'Módulo de Calendario',
        'Habilita el calendario académico integrado',
        false
      ),
      SystemSetting.createModuleSetting(
        'module_recursos_enabled',
        'Módulo de Recursos',
        'Habilita el portal de recursos educativos',
        false
      ),
      SystemSetting.createModuleSetting(
        'module_analytics_enabled',
        'Módulo de Analytics',
        'Habilita el dashboard de métricas y estadísticas avanzadas',
        false
      ),
      SystemSetting.createModuleSetting(
        'module_chat_enabled',
        'Módulo de Chat',
        'Habilita el chat en tiempo real',
        false
      ),

      // Configuraciones de Backup
      SystemSetting.createSystemSetting(
        'backup_enableAutoBackup',
        'Backup Automático',
        'Habilita el sistema de backup automático',
        true
      ),
      SystemSetting.createSystemSetting(
        'backup_backupFrequency',
        'Frecuencia de Backup',
        'Frecuencia de ejecución de backups automáticos',
        'daily'
      ),
      SystemSetting.createSystemSetting(
        'backup_backupTime',
        'Hora de Backup',
        'Hora del día para ejecutar backups automáticos (formato HH:mm)',
        '02:00'
      ),
      SystemSetting.createSystemSetting(
        'backup_retentionDays',
        'Días de Retención',
        'Número de días que se mantienen los backups antes de eliminarlos',
        30
      ),
      SystemSetting.createSystemSetting(
        'backup_includeUploads',
        'Incluir Archivos Subidos',
        'Incluir archivos subidos en los backups',
        true
      ),
      SystemSetting.createSystemSetting(
        'backup_enableCloudBackup',
        'Backup en la Nube',
        'Habilita backup automático en Google Drive',
        true
      ),
      SystemSetting.createSystemSetting(
        'backup_cloudProvider',
        'Proveedor de Nube',
        'Proveedor de servicios de nube para backups',
        'google_drive'
      ),
    ];

    for (const settingData of defaults) {
      try {
        const exists = await this.settingsRepository.findOne({
          where: { key: settingData.key },
        });
        
        if (!exists) {
          const setting = this.settingsRepository.create(settingData);
          await this.settingsRepository.save(setting);
        }
      } catch (error) {
        console.error(`Error creating default setting ${settingData.key}:`, error);
      }
    }

    // Refrescar cache
    await this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      const settings = await this.settingsRepository.find();
      this.cache.clear();
      settings.forEach(setting => {
        this.cache.set(setting.key, setting.parsedValue);
      });
    } catch (error) {
      console.error('Error initializing settings cache:', error);
    }
  }

  // ==================== HELPERS PRIVADOS ====================

  private validateValue(value: string, type: SettingType): void {
    switch (type) {
      case SettingType.BOOLEAN:
        if (value !== 'true' && value !== 'false') {
          throw new BadRequestException(`Boolean value must be 'true' or 'false', got: ${value}`);
        }
        break;
      case SettingType.NUMBER:
        if (isNaN(parseFloat(value))) {
          throw new BadRequestException(`Number value is invalid: ${value}`);
        }
        break;
      case SettingType.JSON:
        try {
          JSON.parse(value);
        } catch {
          throw new BadRequestException(`JSON value is invalid: ${value}`);
        }
        break;
    }
  }

  private valueToString(value: any, type: SettingType): string {
    switch (type) {
      case SettingType.BOOLEAN:
        return Boolean(value).toString();
      case SettingType.NUMBER:
        return Number(value).toString();
      case SettingType.JSON:
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }
}