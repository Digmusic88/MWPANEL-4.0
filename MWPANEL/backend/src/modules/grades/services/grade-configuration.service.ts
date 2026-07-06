/**
 * @archivo: grade-configuration.service.ts
 * @módulo: Grades - Services
 * @función: Servicio para gestionar configuraciones de ponderaciones
 * @crítico: SÍ - Lógica de negocio para configuración de evaluaciones
 * @actualizado: Julio 2025 - Implementación completa
 */

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeConfiguration, GradingScale, RoundingPolicy } from '../entities/grade-configuration.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Subject } from '../../students/entities/subject.entity';
import { Course } from '../../students/entities/course.entity';
import { EducationalLevel } from '../../students/entities/educational-level.entity';
import { CreateGradeConfigurationDto, UpdateGradeConfigurationDto } from '../dto/grade-configuration.dto';

@Injectable()
export class GradeConfigurationService {
  constructor(
    @InjectRepository(GradeConfiguration)
    private gradeConfigRepository: Repository<GradeConfiguration>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(EducationalLevel)
    private educationalLevelRepository: Repository<EducationalLevel>,
  ) {}

  /**
   * Crear nueva configuración de ponderaciones
   */
  async create(createDto: CreateGradeConfigurationDto): Promise<GradeConfiguration> {
    const { teacherId, subjectId, courseId, educationalLevelId, ...configData } = createDto;

    // Verificar que las entidades relacionadas existen
    const teacher = await this.teacherRepository.findOne({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    const subject = await this.subjectRepository.findOne({ where: { id: subjectId } });
    if (!subject) {
      throw new NotFoundException(`Subject with ID ${subjectId} not found`);
    }

    const educationalLevel = await this.educationalLevelRepository.findOne({ 
      where: { id: educationalLevelId } 
    });
    if (!educationalLevel) {
      throw new NotFoundException(`Educational Level with ID ${educationalLevelId} not found`);
    }

    let course: Course | undefined;
    if (courseId) {
      course = await this.courseRepository.findOne({ where: { id: courseId } });
      if (!course) {
        throw new NotFoundException(`Course with ID ${courseId} not found`);
      }
    }

    // Verificar que no existe una configuración duplicada
    const existingConfig = await this.gradeConfigRepository.findOne({
      where: {
        teacherId,
        subjectId,
        courseId: courseId || undefined,
        educationalLevelId,
      },
    });

    if (existingConfig) {
      throw new ConflictException('Configuration already exists for this teacher, subject, and course combination');
    }

    // Validar configuración de pesos
    this.validateWeightConfiguration(configData.weightConfiguration);

    // Crear la configuración
    const gradeConfig = this.gradeConfigRepository.create({
      ...configData,
      teacher,
      subject,
      course,
      educationalLevel,
      teacherId,
      subjectId,
      courseId,
      educationalLevelId,
    });

    return this.gradeConfigRepository.save(gradeConfig);
  }

  /**
   * Obtener todas las configuraciones con filtros opcionales
   */
  async findAll(params?: {
    teacherId?: string;
    subjectId?: string;
    courseId?: string;
    educationalLevelId?: string;
  }): Promise<GradeConfiguration[]> {
    const query = this.gradeConfigRepository.createQueryBuilder('config')
      .leftJoinAndSelect('config.teacher', 'teacher')
      .leftJoinAndSelect('config.subject', 'subject')
      .leftJoinAndSelect('config.course', 'course')
      .leftJoinAndSelect('config.educationalLevel', 'educationalLevel');

    if (params?.teacherId) {
      query.andWhere('config.teacherId = :teacherId', { teacherId: params.teacherId });
    }

    if (params?.subjectId) {
      query.andWhere('config.subjectId = :subjectId', { subjectId: params.subjectId });
    }

    if (params?.courseId) {
      query.andWhere('config.courseId = :courseId', { courseId: params.courseId });
    }

    if (params?.educationalLevelId) {
      query.andWhere('config.educationalLevelId = :educationalLevelId', { 
        educationalLevelId: params.educationalLevelId 
      });
    }

    query.andWhere('config.isActive = :isActive', { isActive: true });

    return query.getMany();
  }

  /**
   * Obtener configuración por ID
   */
  async findOne(id: string): Promise<GradeConfiguration> {
    const config = await this.gradeConfigRepository.findOne({
      where: { id, isActive: true },
      relations: ['teacher', 'subject', 'course', 'educationalLevel'],
    });

    if (!config) {
      throw new NotFoundException(`Grade configuration with ID ${id} not found`);
    }

    return config;
  }

  /**
   * Actualizar configuración existente
   */
  async update(id: string, updateDto: UpdateGradeConfigurationDto): Promise<GradeConfiguration> {
    // DEBUG: Log incoming data
    console.log('🔧 [GradeConfigService] UPDATE Request:', {
      id,
      updateDto: JSON.stringify(updateDto, null, 2)
    });
    
    // 🚨 DEBUG: Check weightConfiguration before any processing
    if (updateDto.weightConfiguration) {
      console.log('🚨 [GradeConfigService] RAW Weight Config received:', JSON.stringify(updateDto.weightConfiguration, null, 2));
      Object.entries(updateDto.weightConfiguration).forEach(([key, config]) => {
        console.log(`🚨 RAW ${key}:`, config, 'hasScale:', !!config.scale, 'scale value:', config.scale);
      });
    }

    const config = await this.findOne(id);

    // Validar configuración de pesos si se proporciona
    if (updateDto.weightConfiguration) {
      console.log('🔧 [GradeConfigService] Validating weight configuration:', 
        JSON.stringify(updateDto.weightConfiguration, null, 2));
      this.validateWeightConfiguration(updateDto.weightConfiguration);
    }

    // Aplicar actualizaciones manteniendo valores por defecto seguros
    Object.assign(config, updateDto);

    // Ensure safe defaults for grade validation
    if (config.passingGrade === null || config.passingGrade === undefined) {
      config.passingGrade = 50.0;
    }
    if (config.minimumGrade === null || config.minimumGrade === undefined) {
      config.minimumGrade = 0.0;  
    }
    if (config.maximumGrade === null || config.maximumGrade === undefined) {
      config.maximumGrade = 100.0;
    }

    // Validar que los valores de calificación sean lógicos
    if (config.passingGrade < config.minimumGrade || config.passingGrade > config.maximumGrade) {
      console.log('⚠️ [GradeConfigService] Invalid grade ranges detected, using safe defaults');
      config.minimumGrade = 0.0;
      config.maximumGrade = 100.0;
      config.passingGrade = 50.0;
    }

    console.log('🔧 [GradeConfigService] Final config before save:', {
      passingGrade: config.passingGrade,
      minimumGrade: config.minimumGrade,
      maximumGrade: config.maximumGrade
    });

    try {
      const saved = await this.gradeConfigRepository.save(config);
      console.log('✅ [GradeConfigService] Configuration updated successfully');
      return saved;
    } catch (error) {
      console.error('❌ [GradeConfigService] Save error:', error);
      throw error;
    }
  }

  /**
   * Eliminar configuración (soft delete)
   */
  async remove(id: string): Promise<void> {
    const config = await this.findOne(id);
    config.isActive = false;
    await this.gradeConfigRepository.save(config);
  }

  /**
   * Obtener configuración por profesor y materia
   */
  async findByTeacherAndSubject(
    teacherId: string,
    subjectId: string,
    courseId?: string
  ): Promise<GradeConfiguration | null> {
    const config = await this.gradeConfigRepository.findOne({
      where: {
        teacherId,
        subjectId,
        courseId: courseId || undefined,
        isActive: true,
      },
      relations: ['teacher', 'subject', 'course', 'educationalLevel'],
    });

    return config || null;
  }

  /**
   * Crear configuración por defecto para un profesor
   */
  async createDefaultConfiguration(
    teacherId: string,
    subjectId: string,
    educationalLevelId: string,
    courseId?: string
  ): Promise<GradeConfiguration> {
    const teacher = await this.teacherRepository.findOne({ where: { id: teacherId } });
    const subject = await this.subjectRepository.findOne({ where: { id: subjectId } });
    const educationalLevel = await this.educationalLevelRepository.findOne({ 
      where: { id: educationalLevelId } 
    });

    if (!teacher || !subject || !educationalLevel) {
      throw new NotFoundException('Teacher, Subject or Educational Level not found');
    }

    const defaultWeights = {
      tasks: {
        weight: 40,
        enabled: true,
        minimumItems: 3,
        scale: 'numeric_0_100',
      },
      activities: {
        weight: 30,
        enabled: true,
        minimumItems: 5,
        scale: 'numeric_0_100',
      },
      evaluations: {
        weight: 20,
        enabled: true,
        minimumItems: 1,
        scale: 'competency_1_5',
      },
      rubrics: {
        weight: 10,
        enabled: true,
        minimumItems: 1,
        scale: 'rubric_based',
      },
    };

    return this.create({
      teacherId,
      subjectId,
      courseId,
      educationalLevelId,
      weightConfiguration: defaultWeights,
      defaultScale: GradingScale.NUMERIC_0_100,
      roundingPolicy: RoundingPolicy.ROUND_HALF_UP,
      passingGrade: 50.0,
    });
  }

  /**
   * Validar configuración de ponderaciones
   */
  private validateWeightConfiguration(weightConfig: any): void {
    console.log('🔍 [GradeConfigService] Starting weight validation');
    console.log('🔍 [GradeConfigService] WeightConfig type:', typeof weightConfig);
    console.log('🔍 [GradeConfigService] WeightConfig value:', weightConfig);

    if (!weightConfig || typeof weightConfig !== 'object') {
      console.error('❌ [GradeConfigService] Invalid weight config object');
      throw new BadRequestException('Weight configuration must be a valid object');
    }

    const enabledComponents = Object.entries(weightConfig)
      .filter(([, config]: [string, any]) => config.enabled);

    console.log('🔍 [GradeConfigService] Enabled components:', enabledComponents.length);
    console.log('🔍 [GradeConfigService] Enabled components list:', enabledComponents);

    if (enabledComponents.length === 0) {
      console.error('❌ [GradeConfigService] No enabled components');
      throw new BadRequestException('At least one grade component must be enabled');
    }

    const totalWeight = enabledComponents.reduce((sum, [componentKey, config]: [string, any]) => {
      console.log(`🔍 [GradeConfigService] Checking component ${componentKey}:`, config);
      if (!config.weight || config.weight < 0 || config.weight > 100) {
        console.error(`❌ [GradeConfigService] Invalid weight for ${componentKey}:`, config.weight);
        throw new BadRequestException(`All component weights must be between 0 and 100. Component ${componentKey} has weight: ${config.weight}`);
      }
      return sum + config.weight;
    }, 0);

    console.log('🔍 [GradeConfigService] Total weight calculated:', totalWeight);

    if (Math.abs(totalWeight - 100) > 0.1) {
      console.error('❌ [GradeConfigService] Total weight not 100:', totalWeight);
      throw new BadRequestException(`Total weight must equal 100%. Current total: ${totalWeight}%`);
    }

    // Validar estructura de cada componente
    enabledComponents.forEach(([componentKey, config]: [string, any]) => {
      console.log(`🔍 [GradeConfigService] Validating structure for ${componentKey}`);
      if (!config.minimumItems || config.minimumItems < 1) {
        console.error(`❌ [GradeConfigService] Invalid minimumItems for ${componentKey}:`, config.minimumItems);
        throw new BadRequestException(`Minimum items for ${componentKey} must be at least 1`);
      }
      if (!config.scale) {
        console.error(`❌ [GradeConfigService] Missing scale for ${componentKey}`);
        throw new BadRequestException(`Scale is required for ${componentKey}`);
      }
    });

    console.log('✅ [GradeConfigService] Weight configuration validation passed');
  }
}