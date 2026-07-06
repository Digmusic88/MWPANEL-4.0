import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, Brackets, ArrayContains, DataSource } from 'typeorm';
import { Rubric, RubricStatus } from '../entities/rubric.entity';
import { RubricCriterion } from '../entities/rubric-criterion.entity';
import { RubricLevel } from '../entities/rubric-level.entity';
import { RubricCell } from '../entities/rubric-cell.entity';
import { RubricAssessment } from '../entities/rubric-assessment.entity';
import { RubricAssessmentCriterion } from '../entities/rubric-assessment-criterion.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { User } from '../../users/entities/user.entity';
import { CreateRubricDto } from '../dto/create-rubric.dto';
import { UpdateRubricDto } from '../dto/update-rubric.dto';
import { ImportRubricDto, ImportFormat } from '../dto/import-rubric.dto';
import { ImportRubricWithCompetenciesDto } from '../dto/import-rubric-with-competencies.dto';
import { CreateRubricAssessmentDto, UpdateRubricAssessmentDto } from '../dto/rubric-assessment.dto';
import { RubricUtilsService } from './rubric-utils.service';
import { GradeNotificationsService, RubricNotificationData } from '../../communications/services/grade-notifications.service';

@Injectable()
export class RubricsService {
  constructor(
    @InjectRepository(Rubric)
    private rubricsRepository: Repository<Rubric>,
    @InjectRepository(RubricCriterion)
    private criteriaRepository: Repository<RubricCriterion>,
    @InjectRepository(RubricLevel)
    private levelsRepository: Repository<RubricLevel>,
    @InjectRepository(RubricCell)
    private cellsRepository: Repository<RubricCell>,
    @InjectRepository(RubricAssessment)
    private assessmentsRepository: Repository<RubricAssessment>,
    @InjectRepository(RubricAssessmentCriterion)
    private assessmentCriteriaRepository: Repository<RubricAssessmentCriterion>,
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(SubjectAssignment)
    private subjectAssignmentsRepository: Repository<SubjectAssignment>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private rubricUtilsService: RubricUtilsService,
    private gradeNotificationsService: GradeNotificationsService,
    private dataSource: DataSource,
  ) {}

  // ==================== CRUD RÚBRICAS ====================

  async create(createRubricDto: CreateRubricDto, userId: string): Promise<Rubric> {
    // Obtener usuario para verificar rol
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    let teacherId: string;
    if (user.role === 'admin') {
      // Para admin, usar el primer profesor disponible
      const firstTeacher = await this.teachersRepository.findOne({});
      if (!firstTeacher) {
        throw new BadRequestException('No hay profesores disponibles en el sistema');
      }
      teacherId = firstTeacher.id;
    } else {
      // Para teacher, obtener su perfil de profesor
      const teacher = await this.getTeacherByUserId(userId);
      teacherId = teacher.id;
    }

    // Validar que los pesos sumen 1
    console.log('🔍 [CREATE RUBRIC] Validando pesos de criterios...');
    console.log('🔍 [CREATE RUBRIC] Criterios recibidos:', createRubricDto.criteria.map(c => ({ name: c.name, weight: c.weight })));
    const totalWeight = createRubricDto.criteria.reduce((sum, c) => sum + c.weight, 0);
    console.log('🔍 [CREATE RUBRIC] Suma total de pesos:', totalWeight);

    if (!this.rubricUtilsService.validateCriteriaWeights(createRubricDto.criteria)) {
      console.log('⚠️ [CREATE RUBRIC] Pesos no válidos, normalizando...');
      // Normalizar automáticamente si no suman 1
      createRubricDto.criteria = this.rubricUtilsService.normalizeCriteriaWeights(createRubricDto.criteria);
      const normalizedTotal = createRubricDto.criteria.reduce((sum, c) => sum + c.weight, 0);
      console.log('✅ [CREATE RUBRIC] Pesos normalizados:', createRubricDto.criteria.map(c => ({ name: c.name, weight: c.weight })));
      console.log('✅ [CREATE RUBRIC] Nueva suma total:', normalizedTotal);
    } else {
      console.log('✅ [CREATE RUBRIC] Pesos válidos, no se requiere normalización');
    }

    // Validar acceso a la asignación de asignatura si se especifica
    if (createRubricDto.subjectAssignmentId && user.role !== 'admin') {
      await this.verifyTeacherSubjectAssignmentAccess(teacherId, createRubricDto.subjectAssignmentId);
    }

    // Crear la rúbrica - excluir arrays de relaciones para evitar cascade duplicado
    const { criteria: _, levels: __, cells: ___, ...rubricData } = createRubricDto;
    const rubric = this.rubricsRepository.create({
      ...rubricData,
      teacherId: teacherId,
      criteriaCount: createRubricDto.criteria.length,
      levelsCount: createRubricDto.levels.length,
      status: RubricStatus.DRAFT,
    });

    const savedRubric = await this.rubricsRepository.save(rubric);

    // Crear criterios
    const savedCriteria = await Promise.all(
      createRubricDto.criteria.map(async (criterionDto, index) => {
        const criterion = this.criteriaRepository.create({
          ...criterionDto,
          rubricId: savedRubric.id,
        });
        return await this.criteriaRepository.save(criterion);
      })
    );

    // Crear niveles
    const savedLevels = await Promise.all(
      createRubricDto.levels.map(async (levelDto, index) => {
        const level = this.levelsRepository.create({
          ...levelDto,
          rubricId: savedRubric.id,
        });
        return await this.levelsRepository.save(level);
      })
    );

    // Crear celdas - mapear desde datos parseados usando índices
    const cellsToCreate = [];
    for (let criterionIndex = 0; criterionIndex < savedCriteria.length; criterionIndex++) {
      for (let levelIndex = 0; levelIndex < savedLevels.length; levelIndex++) {
        const cellIndex = criterionIndex * savedLevels.length + levelIndex;
        
        // Obtener contenido de la celda desde los datos parseados
        let cellContent = `Criterio ${criterionIndex + 1} - Nivel ${levelIndex + 1}`;
        if (createRubricDto.cells && createRubricDto.cells[cellIndex]) {
          cellContent = createRubricDto.cells[cellIndex].content;
        }
        
        cellsToCreate.push(this.cellsRepository.create({
          content: cellContent,
          rubricId: savedRubric.id,
          criterionId: savedCriteria[criterionIndex].id,
          levelId: savedLevels[levelIndex].id,
        }));
      }
    }

    if (cellsToCreate.length > 0) {
      await this.cellsRepository.save(cellsToCreate);
    }

    // Establecer puntuación máxima estándar (siempre 100 puntos)
    await this.rubricsRepository.update(savedRubric.id, {
      maxScore: 100
    });

    return this.findOne(savedRubric.id);
  }

  async findAll(userId: string, includeTemplates: boolean = false): Promise<Rubric[]> {
    console.log('[DEBUG] findAll - userId:', userId);

    // Check if user is admin
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    console.log('[DEBUG] findAll - user role:', user.role);

    let rubrics: Rubric[];

    if (user.role === 'admin') {
      // Admin can see all rubrics
      rubrics = await this.rubricsRepository.find({
        where: {
          isActive: true,
          ...(includeTemplates ? {} : { isTemplate: false })
        },
        relations: [
          'criteria',
          'levels',
          'cells',
          'teacher',
          'teacher.user',
          'teacher.user.profile'
        ],
        order: { createdAt: 'DESC' }
      });
      console.log('[DEBUG] findAll - admin found rubrics:', rubrics.length);
    } else {
      // Regular teacher flow
      const teacher = await this.getTeacherByUserId(userId);
      console.log('[DEBUG] findAll - teacher found:', teacher.id);

      // Usar consulta directa más simple y confiable
      rubrics = await this.rubricsRepository.find({
        where: {
          teacherId: teacher.id,
          isActive: true,
          ...(includeTemplates ? {} : { isTemplate: false })
        },
        relations: [
          'criteria',
          'levels',
          'cells'
        ],
        order: { createdAt: 'DESC' }
      });

      console.log('[DEBUG] findAll - teacher found rubrics:', rubrics.length);
    }

    // CRITICAL FIX: Filtrar solo elementos activos en todas las rúbricas y ordenar
    rubrics.forEach(rubric => {
      rubric.criteria = rubric.criteria.filter(c => c.isActive).sort((a, b) => a.order - b.order);
      rubric.levels = rubric.levels.filter(l => l.isActive).sort((a, b) => a.order - b.order);
      rubric.cells = rubric.cells.filter(c => c.isActive);
    });

    return rubrics;
  }

  /**
   * Recalcula la puntuación máxima de una rúbrica existente
   */
  async recalculateMaxScore(id: string): Promise<Rubric> {
    const rubric = await this.rubricsRepository.findOne({
      where: { id },
      relations: ['criteria', 'levels']
    });

    if (!rubric) {
      throw new NotFoundException('Rúbrica no encontrada');
    }

    // Las rúbricas siempre tienen un máximo de 100 puntos
    await this.rubricsRepository.update(id, {
      maxScore: 100
    });

    return this.findOne(id);
  }

  /**
   * Recalcula la puntuación máxima de todas las rúbricas existentes
   */
  async recalculateAllMaxScores(): Promise<{ updated: number; results: Array<{id: string; name: string; oldMaxScore: number; newMaxScore: number}> }> {
    const rubrics = await this.rubricsRepository.find({
      where: { isActive: true },
      relations: ['criteria', 'levels']
    });

    const results = [];
    
    for (const rubric of rubrics) {
      const oldMaxScore = rubric.maxScore || 0;
      // Las rúbricas siempre tienen un máximo de 100 puntos
      const standardMaxScore = 100;

      await this.rubricsRepository.update(rubric.id, {
        maxScore: standardMaxScore
      });

      results.push({
        id: rubric.id,
        name: rubric.name,
        oldMaxScore,
        newMaxScore: standardMaxScore
      });
    }

    return {
      updated: results.length,
      results
    };
  }

  async findOne(id: string): Promise<Rubric> {
    const rubric = await this.rubricsRepository.findOne({
      where: { id, isActive: true },
      relations: [
        'criteria',
        'criteria.competency',
        'levels',
        'cells',
        'subjectAssignment',
        'subjectAssignment.subject',
        'subjectAssignment.classGroup'
      ],
    });

    if (!rubric) {
      throw new NotFoundException('Rúbrica no encontrada');
    }

    // CRITICAL FIX: Filtrar solo criterios, niveles y celdas activos
    // Esto previene duplicados cuando se actualizan pesos
    rubric.criteria = rubric.criteria.filter(c => c.isActive).sort((a, b) => a.order - b.order);
    rubric.levels = rubric.levels.filter(l => l.isActive).sort((a, b) => a.order - b.order);
    rubric.cells = rubric.cells.filter(c => c.isActive);

    return rubric;
  }

  async update(id: string, updateRubricDto: UpdateRubricDto, userId: string): Promise<Rubric> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const rubric = await this.findOne(id);

    // Si es admin, puede editar cualquier rúbrica
    if (user.role !== 'admin') {
      // Si no es admin, verificar que es el propietario
      const teacher = await this.getTeacherByUserId(userId);
      if (rubric.teacherId !== teacher.id) {
        throw new ForbiddenException('No tienes permisos para editar esta rúbrica');
      }
    }

    // Usar QueryRunner para transacción completa
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Excluir arrays de relaciones para actualización básica primero
      const { criteria, levels, cells, ...updateData } = updateRubricDto;

      // Preparar los datos de actualización
      const finalUpdateData: any = { ...updateData };

      // Si se proporcionan criterios, preparar para actualización completa
      if (criteria && criteria.length > 0) {
        // DEBUGGING: Log de criterios recibidos
        console.log('🔍 [UPDATE RUBRIC] Criterios recibidos:', JSON.stringify(criteria, null, 2));
        const totalWeightReceived = criteria.reduce((sum, c) => sum + c.weight, 0);
        console.log('🔍 [UPDATE RUBRIC] Suma total de pesos recibidos:', totalWeightReceived);

        // Validar y normalizar pesos de criterios
        const isValid = this.rubricUtilsService.validateCriteriaWeights(criteria);
        console.log('🔍 [UPDATE RUBRIC] ¿Pesos válidos (suman 1.0)?:', isValid);

        const normalizedCriteria = isValid
          ? criteria
          : this.rubricUtilsService.normalizeCriteriaWeights(criteria);

        if (!isValid) {
          console.log('⚠️ [UPDATE RUBRIC] Pesos normalizados:', JSON.stringify(normalizedCriteria, null, 2));
          const totalWeightNormalized = normalizedCriteria.reduce((sum, c) => sum + c.weight, 0);
          console.log('⚠️ [UPDATE RUBRIC] Suma total de pesos normalizados:', totalWeightNormalized);
        }

        // CRITICAL FIX: Obtener criterios existentes ACTIVOS
        const existingCriteria = await queryRunner.manager.find(RubricCriterion, {
          where: { rubricId: id, isActive: true },
          order: { order: 'ASC' },
        });

        console.log('✅ [UPDATE RUBRIC] Criterios existentes:', existingCriteria.length);

        // Estrategia: UPDATE en lugar de DELETE+INSERT para evitar duplicados
        for (let i = 0; i < normalizedCriteria.length; i++) {
          const criterionData = normalizedCriteria[i];

          if (i < existingCriteria.length) {
            // ACTUALIZAR criterio existente (por orden)
            const existingCriterion = existingCriteria[i];
            console.log(`✅ [UPDATE RUBRIC] Actualizando criterio ${i}: ${existingCriterion.id}`);

            await queryRunner.manager.update(RubricCriterion, existingCriterion.id, {
              name: criterionData.name,
              description: criterionData.description,
              order: criterionData.order ?? i,
              weight: criterionData.weight,
              isActive: true,
            });
          } else {
            // CREAR nuevo criterio si hay más en la actualización
            console.log(`✅ [UPDATE RUBRIC] Creando nuevo criterio ${i}`);

            const newCriterion = queryRunner.manager.create(RubricCriterion, {
              rubricId: id,
              name: criterionData.name,
              description: criterionData.description,
              order: criterionData.order ?? i,
              weight: criterionData.weight,
              isActive: true,
            });
            await queryRunner.manager.save(RubricCriterion, newCriterion);
          }
        }

        // ELIMINAR criterios sobrantes si se redujo el número
        if (normalizedCriteria.length < existingCriteria.length) {
          for (let i = normalizedCriteria.length; i < existingCriteria.length; i++) {
            console.log(`⚠️ [UPDATE RUBRIC] Eliminando criterio sobrante ${i}`);
            await queryRunner.manager.update(
              RubricCriterion,
              existingCriteria[i].id,
              { isActive: false }
            );
          }
        }

        finalUpdateData.criteriaCount = normalizedCriteria.length;
      }

      // Si se proporcionan niveles, preparar para actualización completa
      if (levels && levels.length > 0) {
        // CRITICAL FIX: Obtener niveles existentes ACTIVOS
        const existingLevels = await queryRunner.manager.find(RubricLevel, {
          where: { rubricId: id, isActive: true },
          order: { order: 'ASC' },
        });

        console.log('✅ [UPDATE RUBRIC] Niveles existentes:', existingLevels.length);

        // Estrategia: UPDATE en lugar de DELETE+INSERT para evitar duplicados
        for (let i = 0; i < levels.length; i++) {
          const levelData = levels[i];

          if (i < existingLevels.length) {
            // ACTUALIZAR nivel existente (por orden)
            const existingLevel = existingLevels[i];
            console.log(`✅ [UPDATE RUBRIC] Actualizando nivel ${i}: ${existingLevel.id}`);

            await queryRunner.manager.update(RubricLevel, existingLevel.id, {
              name: levelData.name,
              description: levelData.description,
              order: levelData.order ?? i,
              scoreValue: levelData.scoreValue,
              color: levelData.color,
              isActive: true,
            });
          } else {
            // CREAR nuevo nivel si hay más en la actualización
            console.log(`✅ [UPDATE RUBRIC] Creando nuevo nivel ${i}`);

            const newLevel = queryRunner.manager.create(RubricLevel, {
              rubricId: id,
              name: levelData.name,
              description: levelData.description,
              order: levelData.order ?? i,
              scoreValue: levelData.scoreValue,
              color: levelData.color,
              isActive: true,
            });
            await queryRunner.manager.save(RubricLevel, newLevel);
          }
        }

        // ELIMINAR niveles sobrantes si se redujo el número
        if (levels.length < existingLevels.length) {
          for (let i = levels.length; i < existingLevels.length; i++) {
            console.log(`⚠️ [UPDATE RUBRIC] Eliminando nivel sobrante ${i}`);
            await queryRunner.manager.update(
              RubricLevel,
              existingLevels[i].id,
              { isActive: false }
            );
          }
        }

        finalUpdateData.levelsCount = levels.length;
      }

      // Actualizar datos básicos de la rúbrica
      await queryRunner.manager.update(Rubric, id, finalUpdateData);

      // Si se proporcionan criterios Y niveles, regenerar celdas
      if (criteria && criteria.length > 0 && levels && levels.length > 0) {
        // Eliminar celdas anteriores
        await queryRunner.manager.delete(RubricCell, { rubricId: id });

        // Obtener los criterios y niveles recién creados
        const savedCriteria = await queryRunner.manager.find(RubricCriterion, {
          where: { rubricId: id, isActive: true },
          order: { order: 'ASC' },
        });

        const savedLevels = await queryRunner.manager.find(RubricLevel, {
          where: { rubricId: id, isActive: true },
          order: { order: 'ASC' },
        });

        // Crear celdas vacías para cada combinación criterio-nivel
        const newCells = [];
        for (const criterion of savedCriteria) {
          for (const level of savedLevels) {
            // Buscar contenido existente si se proporcionó
            const existingCell = cells?.find(
              c => c.criterionId === criterion.id && c.levelId === level.id
            );

            newCells.push(
              queryRunner.manager.create(RubricCell, {
                rubricId: id,
                criterionId: criterion.id,
                levelId: level.id,
                content: existingCell?.content || '',
              })
            );
          }
        }

        await queryRunner.manager.save(RubricCell, newCells);
      }

      // Commit de la transacción
      await queryRunner.commitTransaction();

      // Retornar la rúbrica actualizada
      return this.findOne(id);
    } catch (error) {
      // Rollback en caso de error
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Error al actualizar rúbrica: ${error.message}`
      );
    } finally {
      // Liberar el query runner
      await queryRunner.release();
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const rubric = await this.findOne(id);

    // Si es admin, puede eliminar cualquier rúbrica
    if (user.role !== 'admin') {
      // Si no es admin, verificar que es el propietario
      const teacher = await this.getTeacherByUserId(userId);
      if (rubric.teacherId !== teacher.id) {
        throw new ForbiddenException('No tienes permisos para eliminar esta rúbrica');
      }
    }

    await this.rubricsRepository.update(id, { isActive: false });
  }

  async publish(id: string, userId: string): Promise<Rubric> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const rubric = await this.findOne(id);
    
    // Si es admin, puede publicar cualquier rúbrica
    if (user.role === 'admin') {
      await this.rubricsRepository.update(id, { status: RubricStatus.ACTIVE });
      return this.findOne(id);
    }
    
    // Si es teacher, solo puede publicar sus propias rúbricas
    const teacher = await this.getTeacherByUserId(userId);
    if (rubric.teacherId !== teacher.id) {
      throw new ForbiddenException('No tienes permisos para publicar esta rúbrica');
    }

    await this.rubricsRepository.update(id, { status: RubricStatus.ACTIVE });
    return this.findOne(id);
  }

  // ==================== IMPORTACIÓN DESDE CHATGPT ====================

  async previewImportFromChatGPT(format: string, data: string): Promise<any> {
    let parsedData;
    try {
      if (format === ImportFormat.MARKDOWN) {
        parsedData = this.rubricUtilsService.parseMarkdownTable(data);
      } else if (format === ImportFormat.CSV) {
        parsedData = this.rubricUtilsService.parseCSVTable(data);
      } else {
        throw new BadRequestException('Formato de importación no soportado');
      }
    } catch (error) {
      throw new BadRequestException(`Error al parsear los datos: ${error.message}`);
    }

    // Retornar datos parseados para vista previa
    return {
      criteria: parsedData.criteria,
      levels: parsedData.levels,
      cells: parsedData.cells,
      criteriaCount: parsedData.criteria.length,
      levelsCount: parsedData.levels.length,
      maxScore: 100,
      isTemplate: false,
      isActive: true,
      isVisibleToFamilies: false,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async importFromChatGPT(importDto: ImportRubricDto, userId: string): Promise<Rubric> {
    const teacher = await this.getTeacherByUserId(userId);

    let parsedData;
    try {
      if (importDto.format === ImportFormat.MARKDOWN) {
        parsedData = this.rubricUtilsService.parseMarkdownTable(importDto.data);
      } else if (importDto.format === ImportFormat.CSV) {
        parsedData = this.rubricUtilsService.parseCSVTable(importDto.data);
      } else {
        throw new BadRequestException('Formato de importación no soportado');
      }
    } catch (error) {
      throw new BadRequestException(`Error al parsear los datos: ${error.message}`);
    }

    // Crear DTO para la rúbrica - sin celdas, se generarán automáticamente
    const createRubricDto: CreateRubricDto = {
      name: importDto.name,
      description: importDto.description,
      isTemplate: importDto.isTemplate || false,
      isVisibleToFamilies: importDto.isVisibleToFamilies || false,
      subjectAssignmentId: importDto.subjectAssignmentId,
      maxScore: 100,
      importSource: importDto.format,
      originalImportData: importDto.data,
      criteria: parsedData.criteria,
      levels: parsedData.levels,
      cells: [], // Vacío - se generarán automáticamente
    };

    // Crear la rúbrica base
    const createdRubric = await this.create(createRubricDto, userId);
    
    // Actualizar el contenido de las celdas con los datos parseados
    return this.updateCellsContent(createdRubric.id, parsedData.cells);
  }

  /**
   * Actualizar el contenido de las celdas de una rúbrica con datos parseados
   */
  private async updateCellsContent(rubricId: string, parsedCells: any[]): Promise<Rubric> {
    const rubric = await this.findOne(rubricId);
    
    // Ordenar criterios y niveles para mapeo correcto
    const sortedCriteria = rubric.criteria.sort((a, b) => a.order - b.order);
    const sortedLevels = rubric.levels.sort((a, b) => a.order - b.order);
    
    // Actualizar el contenido de las celdas
    for (let criterionIndex = 0; criterionIndex < sortedCriteria.length; criterionIndex++) {
      for (let levelIndex = 0; levelIndex < sortedLevels.length; levelIndex++) {
        const cellIndex = criterionIndex * sortedLevels.length + levelIndex;
        
        if (parsedCells[cellIndex]) {
          const criterion = sortedCriteria[criterionIndex];
          const level = sortedLevels[levelIndex];
          
          // Buscar la celda correspondiente
          const cell = rubric.cells.find(c => 
            c.criterionId === criterion.id && c.levelId === level.id
          );
          
          if (cell) {
            // Actualizar el contenido de la celda
            await this.cellsRepository.update(cell.id, {
              content: parsedCells[cellIndex].content
            });
          }
        }
      }
    }
    
    // Devolver la rúbrica actualizada
    return this.findOne(rubricId);
  }

  // ==================== EVALUACIONES CON RÚBRICAS ====================

  async createAssessment(createDto: CreateRubricAssessmentDto): Promise<RubricAssessment> {
    const rubric = await this.findOne(createDto.rubricId);

    // Validar que todos los criterios estén evaluados
    const rubricCriteriaIds = rubric.criteria.map(c => c.id);
    const assessedCriteriaIds = createDto.criterionAssessments.map(ca => ca.criterionId);

    if (rubricCriteriaIds.length !== assessedCriteriaIds.length ||
        !rubricCriteriaIds.every(id => assessedCriteriaIds.includes(id))) {
      throw new BadRequestException('Debe evaluar todos los criterios de la rúbrica');
    }

    // Crear evaluación principal
    const assessment = this.assessmentsRepository.create({
      activityAssessmentId: createDto.activityAssessmentId,
      rubricId: createDto.rubricId,
      studentId: createDto.studentId,
      comments: createDto.comments,
      totalScore: 0, // Se calculará después
      maxPossibleScore: 0,
      percentage: 0,
      isComplete: true,
    });

    const savedAssessment = await this.assessmentsRepository.save(assessment);

    // Crear evaluaciones por criterio
    const criterionAssessments = [];
    
    // Calculate the maximum possible level value for correct percentage calculation
    const maxPossibleLevelValue = Math.max(...rubric.levels.map(level => level.scoreValue));
    
    for (const criterionDto of createDto.criterionAssessments) {
      const criterion = rubric.criteria.find(c => c.id === criterionDto.criterionId);
      const level = rubric.levels.find(l => l.id === criterionDto.levelId);
      const cell = rubric.cells.find(c => c.id === criterionDto.cellId);

      if (!criterion || !level || !cell) {
        throw new BadRequestException('Criterio, nivel o celda no válidos');
      }

      // FIXED: Calculate weighted score correctly using percentage-based calculation
      // Instead of: level.scoreValue * criterion.weight
      // Use: (level.scoreValue / maxPossibleLevelValue) * criterion.weight
      const percentageScore = level.scoreValue / maxPossibleLevelValue;
      const correctWeightedScore = percentageScore * criterion.weight;

      const criterionAssessment = this.assessmentCriteriaRepository.create({
        rubricAssessmentId: savedAssessment.id,
        criterionId: criterion.id,
        levelId: level.id,
        cellId: cell.id,
        score: level.scoreValue,
        weightedScore: correctWeightedScore,
        comments: criterionDto.comments,
      });

      criterionAssessments.push(criterionAssessment);
    }

    await this.assessmentCriteriaRepository.save(criterionAssessments);

    // Calcular puntuación total
    const scoreCalculation = this.rubricUtilsService.calculateRubricScore(
      criterionAssessments.map(ca => ({
        criterion: rubric.criteria.find(c => c.id === ca.criterionId),
        selectedLevel: rubric.levels.find(l => l.id === ca.levelId),
      })),
      rubric.maxScore,
      rubric.levels // Pass all available levels for correct percentage calculation
    );

    // Actualizar puntuaciones
    await this.assessmentsRepository.update(savedAssessment.id, {
      totalScore: scoreCalculation.totalScore,
      maxPossibleScore: scoreCalculation.maxPossibleScore,
      percentage: scoreCalculation.percentage,
    });

    // Obtener la evaluación completa con todas las relaciones
    const fullAssessment = await this.getAssessment(savedAssessment.id);

    // Enviar notificación a las familias
    try {
      await this.sendRubricNotificationToFamilies(fullAssessment, rubric, criterionAssessments);
    } catch (notificationError) {
      // Log error pero no fallar la evaluación
      console.error('Error enviando notificación de rúbrica:', notificationError);
    }

    return fullAssessment;
  }

  async getAssessment(id: string): Promise<RubricAssessment> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id, isActive: true },
      relations: [
        'rubric',
        'rubric.criteria',
        'rubric.levels',
        'rubric.cells',
        'student',
        'student.user',
        'student.user.profile',
        'criterionAssessments',
        'criterionAssessments.criterion',
        'criterionAssessments.selectedLevel',
        'criterionAssessments.selectedCell',
      ],
    });

    if (!assessment) {
      throw new NotFoundException('Evaluación con rúbrica no encontrada');
    }

    return assessment;
  }

  // ==================== MÉTODOS HELPER ====================

  private async getTeacherByUserId(userId: string): Promise<Teacher> {
    console.log('[DEBUG] getTeacherByUserId - userId:', userId);
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user']
    });

    console.log('[DEBUG] getTeacherByUserId - teacher found:', teacher ? teacher.id : 'null');

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado para este usuario');
    }

    return teacher;
  }

  private async verifyTeacherSubjectAssignmentAccess(teacherId: string, subjectAssignmentId: string): Promise<void> {
    const assignment = await this.subjectAssignmentsRepository.findOne({
      where: { id: subjectAssignmentId, teacher: { id: teacherId } },
    });

    if (!assignment) {
      throw new ForbiddenException('No tienes acceso a esta asignación de asignatura');
    }
  }

  // ==================== MÉTODOS PARA COMPARTIR RÚBRICAS ====================

  async shareRubric(rubricId: string, teacherIds: string[], userId: string): Promise<Rubric> {
    const teacher = await this.getTeacherByUserId(userId);
    
    // Verificar que la rúbrica existe y pertenece al profesor actual
    const rubric = await this.rubricsRepository.findOne({
      where: { id: rubricId, teacherId: teacher.id },
      relations: ['teacher']
    });

    if (!rubric) {
      throw new NotFoundException('Rúbrica no encontrada o no tienes permisos para compartirla');
    }

    // Verificar que los profesores existen
    const targetTeachers = await this.teachersRepository.findBy({ 
      id: In(teacherIds) 
    });

    if (targetTeachers.length !== teacherIds.length) {
      throw new BadRequestException('Algunos profesores especificados no existen');
    }

    // Añadir profesores a la lista de compartidos (evitar duplicados)
    const currentSharedWith = rubric.sharedWith || [];
    const newSharedWith = [...new Set([...currentSharedWith, ...teacherIds])];

    rubric.sharedWith = newSharedWith;
    return await this.rubricsRepository.save(rubric);
  }

  async unshareRubric(rubricId: string, teacherIds: string[], userId: string): Promise<Rubric> {
    const teacher = await this.getTeacherByUserId(userId);
    
    // Verificar que la rúbrica existe y pertenece al profesor actual
    const rubric = await this.rubricsRepository.findOne({
      where: { id: rubricId, teacherId: teacher.id },
    });

    if (!rubric) {
      throw new NotFoundException('Rúbrica no encontrada o no tienes permisos para modificarla');
    }

    // Remover profesores de la lista de compartidos
    const currentSharedWith = rubric.sharedWith || [];
    rubric.sharedWith = currentSharedWith.filter(id => !teacherIds.includes(id));

    return await this.rubricsRepository.save(rubric);
  }

  async getColleagues(userId: string): Promise<any[]> {
    const teacher = await this.getTeacherByUserId(userId);
    
    // Obtener todos los profesores excepto el actual
    const colleagues = await this.teachersRepository.find({
      where: { id: Not(teacher.id) },
      relations: ['user', 'user.profile'],
      select: {
        id: true,
        user: {
          id: true,
          email: true,
          profile: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return colleagues.map(colleague => ({
      id: colleague.id,
      name: `${colleague.user.profile.firstName} ${colleague.user.profile.lastName}`,
      email: colleague.user.email
    }));
  }

  async getSharedWithMe(userId: string): Promise<Rubric[]> {
    try {
      console.log('[DEBUG] getSharedWithMe - userId:', userId);
      
      // Check if user is admin
      const user = await this.usersRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      
      if (user.role === 'admin') {
        // Admin can see all rubrics that have been shared (non-empty sharedWith array)
        const sharedRubrics = await this.rubricsRepository.find({
          where: { 
            isActive: true,
          },
          relations: [
            'criteria',
            'levels', 
            'cells',
            'teacher',
            'teacher.user',
            'teacher.user.profile'
          ],
          order: { updatedAt: 'DESC' }
        });
        
        // Filter only rubrics that have been shared (sharedWith is not empty)
        const filteredRubrics = sharedRubrics.filter(rubric => 
          rubric.sharedWith && rubric.sharedWith.length > 0
        );
        
        console.log('[DEBUG] getSharedWithMe - admin found shared rubrics:', filteredRubrics.length);
        return filteredRubrics;
      } else {
        // Regular teacher flow
        const teacher = await this.getTeacherByUserId(userId);
        console.log('[DEBUG] getSharedWithMe - teacher found:', teacher.id);
      
      // Buscar rúbricas donde el teacherId del profesor actual esté en el array sharedWith
      // Simplificamos las relaciones temporalmente para debug
      const sharedRubrics = await this.rubricsRepository.find({
        where: { 
          isActive: true,
          sharedWith: ArrayContains([teacher.id])
        },
        relations: [
          'criteria',
          'levels', 
          'cells',
          'teacher'
        ],
        order: { updatedAt: 'DESC' }
      });

      console.log('[DEBUG] getSharedWithMe - found shared rubrics:', sharedRubrics.length);

        // Agregar información del profesor que compartió cada rúbrica (simplificado)
        return sharedRubrics.map(rubric => ({
          ...rubric,
          sharedByTeacher: {
            id: rubric.teacher.id,
            user: {
              profile: {
                firstName: 'Profesor',
                lastName: 'Compartido'
              }
            }
          },
          // Agregar fecha de cuando fue compartida (simulada)
          sharedAt: rubric.updatedAt
        }));
      }
    } catch (error) {
      console.error('[ERROR] getSharedWithMe:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS PARA COMPETENCIAS ====================

  /**
   * Obtiene sugerencias de competencias para criterios usando análisis de texto
   */
  async getCompetencySuggestions(criteria: string[], userId: string): Promise<any> {
    try {
      // Obtener el profesor y su nivel educativo
      const teacher = await this.getTeacherByUserId(userId);
      
      // Obtener todas las competencias disponibles para el nivel educativo del profesor
      // (Esto requeriría obtener el nivel educativo de las asignaturas del profesor)
      const competencies = await this.getAvailableCompetencies(teacher.id);

      // Analizar cada criterio y sugerir competencias
      const suggestions = await Promise.all(
        criteria.map(async (criterion, index) => {
          const suggested = await this.analyzeTextForCompetencies(criterion, competencies);
          return {
            criterionIndex: index,
            criterionText: criterion,
            suggestions: suggested
          };
        })
      );

      return {
        criteria,
        suggestions,
        totalCompetencies: competencies.length
      };
    } catch (error) {
      console.error('[ERROR] getCompetencySuggestions:', error);
      throw new BadRequestException('Error al generar sugerencias de competencias');
    }
  }

  /**
   * Vista previa de rúbrica con competencias
   */
  async previewImportWithCompetencies(dto: any, userId: string): Promise<any> {
    try {
      console.log('[DEBUG] previewImportWithCompetencies called with dto:', JSON.stringify(dto, null, 2));
      console.log('[DEBUG] previewImportWithCompetencies dto.includeCompetencies:', dto.includeCompetencies);
      console.log('[DEBUG] previewImportWithCompetencies typeof dto.includeCompetencies:', typeof dto.includeCompetencies);
      
      // Esta función siempre usa parsing con competencias (endpoint específico)
      let basePreview;
      // Force competencies parsing since this is the competencies-specific endpoint
      const shouldUseCompetencies = dto.includeCompetencies !== false; // Default to true for this endpoint
      console.log('[DEBUG] previewImportWithCompetencies shouldUseCompetencies:', shouldUseCompetencies);
      console.log('[DEBUG] previewImportWithCompetencies - about to branch on shouldUseCompetencies');
      
      if (shouldUseCompetencies) {
        console.log('[DEBUG] previewImportWithCompetencies - TAKING COMPETENCIES BRANCH');
        let parsedData;
        try {
          if (dto.format === ImportFormat.MARKDOWN) {
            parsedData = this.rubricUtilsService.parseMarkdownTableWithCompetencies(dto.data);
          } else if (dto.format === ImportFormat.CSV) {
            parsedData = this.rubricUtilsService.parseCSVTableWithCompetencies(dto.data);
          } else {
            throw new BadRequestException('Formato de importación no soportado');
          }
        } catch (error) {
          throw new BadRequestException(`Error al parsear los datos con competencias: ${error.message}`);
        }

        // Crear vista previa similar a previewImportFromChatGPT pero con datos de competencias
        basePreview = {
          criteria: parsedData.criteria,
          levels: parsedData.levels,
          cells: parsedData.cells,
          criteriaCount: parsedData.criteria.length,
          levelsCount: parsedData.levels.length,
          maxScore: 100,
          isTemplate: false,
          isActive: true,
          isVisibleToFamilies: false,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        console.log('[DEBUG] previewImportWithCompetencies - TAKING REGULAR BRANCH (NO COMPETENCIES)');
        // Si no incluye competencias, usar la función normal
        basePreview = await this.previewImportFromChatGPT(dto.format, dto.data);
        return { ...basePreview };
      }

      // Si incluye competencias, procesarlas
      let competencyMappings = dto.competencyMappings || [];
      
      // Si no hay mapeos manuales y se solicita mapeo automático
      if (competencyMappings.length === 0 && dto.useAutomaticMapping !== false) {
        const criteriaTexts = basePreview.criteria?.map(c => c.name) || [];
        const suggestions = await this.getCompetencySuggestions(criteriaTexts, userId);
        
        // Tomar la mejor sugerencia para cada criterio
        competencyMappings = suggestions.suggestions.map((suggestion, index) => ({
          criterionIndex: index,
          competencyId: suggestion.suggestions[0]?.competencyId,
          confidence: suggestion.suggestions[0]?.confidence || 0
        })).filter(mapping => mapping.competencyId);
      }

      return {
        ...basePreview,
        // usesCompetencies: true,
        competencyMappings,
        mappingMethod: dto.useAutomaticMapping ? 'automatic' : 'manual'
      };
    } catch (error) {
      console.error('[ERROR] previewImportWithCompetencies:', error);
      throw new BadRequestException('Error al generar vista previa con competencias');
    }
  }

  /**
   * Importar rúbrica con competencias asociadas
   */
  async importWithCompetencies(dto: any, userId: string): Promise<Rubric> {
    // USAR TRANSACCIÓN PARA GARANTIZAR ATOMICIDAD
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      let rubric;
      
      if (dto.includeCompetencies) {
        console.log('[DEBUG] Starting competency-enabled rubric import');
        
        // Usar las funciones especializadas para competencias
        const teacher = await this.getTeacherByUserId(userId);

        let parsedData;
        try {
          if (dto.format === ImportFormat.MARKDOWN) {
            parsedData = this.rubricUtilsService.parseMarkdownTableWithCompetencies(dto.data);
          } else if (dto.format === ImportFormat.CSV) {
            parsedData = this.rubricUtilsService.parseCSVTableWithCompetencies(dto.data);
          } else {
            throw new BadRequestException('Formato de importación no soportado');
          }
        } catch (error) {
          console.error('[ERROR] Parsing error:', error.message);
          throw new BadRequestException(`Error al parsear los datos con competencias: ${error.message}`);
        }

        console.log('[DEBUG] Parsed data successfully, creating rubric DTO');

        // Crear DTO para la rúbrica con competencias
        const createRubricDto: CreateRubricDto = {
          name: dto.name,
          description: dto.description,
          isTemplate: dto.isTemplate || false,
          isVisibleToFamilies: dto.isVisibleToFamilies || false,
          subjectAssignmentId: dto.subjectAssignmentId,
          maxScore: 100,
          importSource: dto.format,
          originalImportData: dto.data,
          criteria: parsedData.criteria,
          levels: parsedData.levels,
          cells: [], // Vacío - se generarán automáticamente
        };

        console.log('[DEBUG] Creating rubric with transaction...');

        // Crear la rúbrica base usando el método normal DENTRO DE LA TRANSACCIÓN
        rubric = await this.create(createRubricDto, userId);
        
        console.log('[DEBUG] Rubric created successfully, ID:', rubric.id);
        
        // Actualizar el contenido de las celdas con los datos parseados
        rubric = await this.updateCellsContent(rubric.id, parsedData.cells);
        
        console.log('[DEBUG] Cells content updated');
        
      } else {
        console.log('[DEBUG] Starting regular rubric import (no competencies)');
        
        // Si no incluye competencias, usar la función normal
        const baseImportDto = {
          name: dto.name,
          description: dto.description,
          format: dto.format,
          data: dto.data,
          isTemplate: dto.isTemplate,
          isVisibleToFamilies: dto.isVisibleToFamilies,
          subjectAssignmentId: dto.subjectAssignmentId
        };

        rubric = await this.importFromChatGPT(baseImportDto, userId);
      }

      // Si incluye competencias, actualizar los criterios con las competencias
      if (dto.includeCompetencies && dto.competencyMappings) {
        console.log('[DEBUG] Processing competency mappings...');
        
        // SMART FIX: Auto-generar criterionIndex si no existe
        const fixedMappings = dto.competencyMappings.map((mapping, index) => ({
          ...mapping,
          criterionIndex: mapping.criterionIndex !== undefined ? mapping.criterionIndex : index
        }));
        
        console.log('[DEBUG] Fixed competency mappings:', JSON.stringify(fixedMappings, null, 2));
        
        // RE-HABILITADO: Convert competency codes to valid UUID references
        console.log('[DEBUG] Converting competency codes to UUIDs...');
        const mappingsWithValidUUIDs = await this.convertCompetencyMappingsToUUIDs(fixedMappings);
        console.log('[DEBUG] Converted mappings with valid UUIDs:', JSON.stringify(mappingsWithValidUUIDs, null, 2));
        
        console.log('[DEBUG] Assigning competencies to criteria...');
        await this.assignCompetenciesToCriteria(rubric.id, mappingsWithValidUUIDs);
        
        console.log('[DEBUG] Competencies assigned successfully');
        
        // Marcar la rúbrica como que usa competencias (TODO: agregar columna usesCompetencies)
        // await this.rubricsRepository.update(rubric.id, { usesCompetencies: true });
      }

      console.log('[DEBUG] Import successful, committing transaction');
      
      // COMMIT DE LA TRANSACCIÓN SOLO SI TODO FUE EXITOSO
      await queryRunner.commitTransaction();

      // Retornar la rúbrica actualizada con las relaciones de competencias
      return this.findOne(rubric.id);
    } catch (error) {
      console.error('[ERROR] importWithCompetencies failed:', error.message);
      console.error('[ERROR] Stack trace:', error.stack);
      
      // ROLLBACK DE LA TRANSACCIÓN EN CASO DE ERROR
      console.log('[DEBUG] Rolling back transaction due to error');
      await queryRunner.rollbackTransaction();
      
      // Re-lanzar el error con información detallada
      throw new BadRequestException(`Error al importar rúbrica con competencias: ${error.message}`);
    } finally {
      // Liberar el query runner
      await queryRunner.release();
    }
  }

  // ==================== MÉTODOS AUXILIARES PARA COMPETENCIAS ====================

  /**
   * Obtiene competencias disponibles para un profesor
   */
  private async getAvailableCompetencies(teacherId: string): Promise<any[]> {
    // Esto es un placeholder - necesitaría implementarse según la lógica de negocio
    // Por ahora devolvemos competencias básicas como ejemplo
    return [
      { id: 'ccl-1', code: 'CCL', name: 'Competencia en comunicación lingüística', description: 'Comunicación oral y escrita' },
      { id: 'stem-1', code: 'STEM', name: 'Competencia matemática y en ciencia y tecnología', description: 'Razonamiento matemático y científico' },
      { id: 'cd-1', code: 'CD', name: 'Competencia digital', description: 'Uso responsable de tecnologías digitales' }
    ];
  }

  /**
   * Analiza texto para sugerir competencias usando análisis semántico básico
   */
  private async analyzeTextForCompetencies(text: string, availableCompetencies: any[]): Promise<any[]> {
    // Implementación básica usando palabras clave
    const textLower = text.toLowerCase();
    const suggestions = [];

    for (const competency of availableCompetencies) {
      let confidence = 0;
      
      // Análisis básico por palabras clave
      if (competency.code === 'CCL' && (textLower.includes('comunicación') || textLower.includes('escritura') || textLower.includes('redacción') || textLower.includes('expresión'))) {
        confidence = 0.8;
      } else if (competency.code === 'STEM' && (textLower.includes('matemática') || textLower.includes('cálculo') || textLower.includes('problema') || textLower.includes('lógica'))) {
        confidence = 0.7;
      } else if (competency.code === 'CD' && (textLower.includes('digital') || textLower.includes('tecnología') || textLower.includes('informática'))) {
        confidence = 0.9;
      }

      if (confidence > 0.5) {
        suggestions.push({
          competencyId: competency.id,
          competencyName: competency.name,
          competencyCode: competency.code,
          confidence,
          matchReason: `Análisis semántico de: "${text}"`
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Convierte códigos de competencias a UUIDs válidos de la base de datos
   */
  private async convertCompetencyMappingsToUUIDs(competencyMappings: any[]): Promise<any[]> {
    try {
      // Obtener todas las competencias de la base de datos
      const allCompetencies = await this.dataSource.query(`
        SELECT id, code, name FROM competencies ORDER BY code
      `);
      
      console.log('[DEBUG] Available competencies in DB:', allCompetencies.map(c => `${c.code} -> ${c.id}`));
      
      // Crear un mapa de código a UUID
      const competencyCodeToUUID = {};
      allCompetencies.forEach(comp => {
        competencyCodeToUUID[comp.code] = comp.id;
      });
      
      // Convertir los mappings
      const convertedMappings = [];
      for (const mapping of competencyMappings) {
        const { competencyId, ...rest } = mapping;
        
        // Extraer el código de competencia del competencyId
        // Puede venir como "cd-1", "CD", "ccl-1", "CCL", etc.
        let competencyCode = competencyId;
        
        // Si contiene un guión, tomar solo la parte antes del guión
        if (competencyCode.includes('-')) {
          competencyCode = competencyCode.split('-')[0];
        }
        
        // Convertir a mayúsculas para hacer match
        competencyCode = competencyCode.toUpperCase();
        
        console.log(`[DEBUG] Converting competencyId "${competencyId}" -> code "${competencyCode}"`);
        
        // Buscar el UUID correspondiente
        const uuid = competencyCodeToUUID[competencyCode];
        
        if (uuid) {
          convertedMappings.push({
            ...rest,
            competencyId: uuid
          });
          console.log(`[DEBUG] Successfully mapped ${competencyCode} -> ${uuid}`);
        } else {
          console.warn(`[WARNING] No UUID found for competency code: ${competencyCode}`);
          // Skip this mapping if no UUID found
        }
      }
      
      return convertedMappings;
    } catch (error) {
      console.error('[ERROR] convertCompetencyMappingsToUUIDs:', error);
      throw error;
    }
  }

  /**
   * Asigna competencias a criterios de una rúbrica
   */
  private async assignCompetenciesToCriteria(rubricId: string, competencyMappings: any[]): Promise<void> {
    try {
      // Obtener los criterios de la rúbrica
      const criteria = await this.criteriaRepository.find({
        where: { rubricId },
        order: { order: 'ASC' }
      });

      // Asignar competencias según los mapeos
      for (const mapping of competencyMappings) {
        const criterion = criteria[mapping.criterionIndex];
        if (criterion) {
          await this.criteriaRepository.update(criterion.id, {
            competencyId: mapping.competencyId
          });
        }
      }
    } catch (error) {
      console.error('[ERROR] assignCompetenciesToCriteria:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación de evaluación de rúbrica a las familias
   */
  private async sendRubricNotificationToFamilies(
    assessment: RubricAssessment,
    rubric: Rubric,
    criterionAssessments: any[]
  ): Promise<void> {
    try {
      // Obtener datos del estudiante y profesor
      const student = assessment.student;
      if (!student || !student.user) {
        console.warn('No se encontró información del estudiante para la notificación');
        return;
      }

      // Buscar el profesor (necesitamos más contexto sobre la actividad/tarea)
      // Por ahora usaremos un placeholder, pero esto debería venir del contexto de la actividad
      const teacherName = 'Profesor'; // TODO: Obtener del contexto de la actividad

      // Determinar si es passing (por ejemplo, >60%)
      const passingThreshold = 60;
      const isPassing = assessment.percentage >= passingThreshold;

      // Preparar resultados por criterio
      const criteriaResults = criterionAssessments.map(ca => {
        const criterion = rubric.criteria.find(c => c.id === ca.criterionId);
        const level = rubric.levels.find(l => l.id === ca.levelId);
        
        return {
          criterionName: criterion?.name || 'Criterio desconocido',
          levelName: level?.name || 'Nivel desconocido',
          score: ca.score || 0,
          weight: criterion?.weight || 0,
        };
      });

      // Preparar datos de notificación
      const notificationData: RubricNotificationData = {
        assessmentId: assessment.id,
        studentId: student.id,
        studentFullName: `${student.user.profile?.firstName || ''} ${student.user.profile?.lastName || ''}`.trim(),
        subjectName: 'Actividad', // TODO: Obtener del contexto de la actividad
        activityName: 'Evaluación con Rúbrica', // TODO: Obtener del contexto de la actividad
        rubricName: rubric.name,
        totalScore: assessment.totalScore,
        maxPossibleScore: assessment.maxPossibleScore,
        percentage: assessment.percentage,
        teacherName: teacherName,
        comments: assessment.comments,
        isPassing: isPassing,
        criteriaResults: criteriaResults,
        assessmentDate: new Date().toISOString(),
      };

      // Enviar notificación
      await this.gradeNotificationsService.notifyRubricAssessment(notificationData);
      
      console.log(`✅ Notificación de rúbrica enviada para estudiante: ${notificationData.studentFullName}`);

    } catch (error) {
      console.error('❌ Error enviando notificación de rúbrica a familias:', error);
      throw error;
    }
  }
}