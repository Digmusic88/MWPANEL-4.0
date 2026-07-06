/**
 * @archivo: centralized-grades.service.ts
 * @módulo: Grades (Centralización de Valoraciones)
 * @función: Servicio principal para agregar todas las valoraciones del sistema
 * @crítico: SÍ - Centro neurálgico de evaluación docente
 * @actualizado: Julio 2025 - Sistema centralizado de valoraciones
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource, In, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CentralizedGrade, GradeStatus, GradePeriod, GradeBreakdown, GradeMetrics, AIInsights } from '../entities/centralized-grade.entity';
import { GradeConfiguration, GradeComponent, GradingScale } from '../entities/grade-configuration.entity';
import { TaskSubmission } from '../../tasks/entities/task-submission.entity';
import { ActivityAssessment } from '../../activities/entities/activity-assessment.entity';
import { CompetencyEvaluation } from '../../evaluations/entities/competency-evaluation.entity';
import { RubricAssessment } from '../../activities/entities/rubric-assessment.entity';
import { Student } from '../../students/entities/student.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { ExamGrade } from '../../tasks/entities/exam-grade.entity';
import { HuggingFaceMCPService } from '../../../services/ai/huggingface-mcp.service';
import { GradeReportsService } from './grade-reports.service';
import { AIInsightsService } from './ai-insights.service';
import { CriterionAssessment } from '../../criterion-assessment/entities/criterion-assessment.entity';
import { EvaluationPeriod } from '../../evaluations/entities/evaluation-period.entity';
import { mapGradePeriodToPeriodTypes } from './grade-period-bridge';
import { LomloeGradeModeService } from '../../criterion-assessment/services/lomloe-grade-mode.service';
import { applyLomloeMode } from './lomloe-mode.util';

export interface GradeCalculationRequest {
  studentId: string;
  subjectAssignmentId: string;
  period?: GradePeriod;
  forceRecalculation?: boolean;
  includeAI?: boolean;
}

export interface GradeAggregationResult {
  centralizedGrade: CentralizedGrade;
  sourcesProcessed: number;
  calculationTime: number;
  warnings: string[];
  dataQuality: number;
}

@Injectable()
export class CentralizedGradesService {
  private readonly logger = new Logger(CentralizedGradesService.name);

  constructor(
    @InjectRepository(CentralizedGrade)
    private centralizedGradeRepository: Repository<CentralizedGrade>,
    
    @InjectRepository(GradeConfiguration)
    private gradeConfigurationRepository: Repository<GradeConfiguration>,
    
    @InjectRepository(TaskSubmission)
    private taskSubmissionRepository: Repository<TaskSubmission>,
    
    @InjectRepository(ActivityAssessment)
    private activityAssessmentRepository: Repository<ActivityAssessment>,
    
    @InjectRepository(CompetencyEvaluation)
    private competencyEvaluationRepository: Repository<CompetencyEvaluation>,
    
    @InjectRepository(RubricAssessment)
    private rubricAssessmentRepository: Repository<RubricAssessment>,

    @InjectRepository(CriterionAssessment)
    private readonly criterionAssessmentRepository: Repository<CriterionAssessment>,

    @InjectRepository(EvaluationPeriod)
    private readonly evaluationPeriodRepository: Repository<EvaluationPeriod>,

    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    
    @InjectRepository(SubjectAssignment)
    private subjectAssignmentRepository: Repository<SubjectAssignment>,
    
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,

    @InjectRepository(ExamGrade)
    private examGradeRepository: Repository<ExamGrade>,

    private huggingFaceAIService: HuggingFaceMCPService,
    private gradeReportsService: GradeReportsService,
    private aiInsightsService: AIInsightsService,
    private dataSource: DataSource,
    private readonly lomloeGradeMode: LomloeGradeModeService,
  ) {}

  /**
   * Elimina calificaciones simuladas/incorrectas para una asignación
   */
  async deleteSimulatedGrades(subjectAssignmentId: string): Promise<void> {
    this.logger.log(`🗑️ Eliminando calificaciones simuladas para asignación: ${subjectAssignmentId}`);
    
    // Buscar calificaciones con datos simulados (sourceIds que empiecen con 'task')
    const simulatedGrades = await this.centralizedGradeRepository
      .createQueryBuilder('grade')
      .where('grade.subjectAssignmentId = :subjectAssignmentId', { subjectAssignmentId })
      .andWhere("grade.breakdown::text LIKE '%\"task1\"%' OR grade.breakdown::text LIKE '%\"task2\"%'")
      .getMany();
    
    if (simulatedGrades.length > 0) {
      await this.centralizedGradeRepository.remove(simulatedGrades);
      this.logger.log(`🗑️ Eliminadas ${simulatedGrades.length} calificaciones simuladas`);
    }
  }

  /**
   * Obtiene todos los estudiantes para una asignación de materia
   */
  async getStudentsForSubjectAssignment(subjectAssignmentId: string): Promise<Student[]> {
    this.logger.log(`👥 Obteniendo estudiantes para asignación: ${subjectAssignmentId}`);
    
    // Obtener la asignación para obtener el grupo de clase
    const subjectAssignment = await this.subjectAssignmentRepository.findOne({
      where: { id: subjectAssignmentId },
      relations: ['classGroup'],
    });
    
    if (!subjectAssignment) {
      throw new NotFoundException(`Asignación de materia no encontrada: ${subjectAssignmentId}`);
    }
    
    // Obtener estudiantes del grupo de clase
    const students = await this.studentRepository
      .createQueryBuilder('student')
      .innerJoin('student.classGroups', 'classGroup')
      .where('classGroup.id = :classGroupId', { classGroupId: subjectAssignment.classGroup.id })
      .getMany();
    
    this.logger.log(`👥 Encontrados ${students.length} estudiantes en el grupo`);
    return students;
  }

  /**
   * Calcula y actualiza la calificación centralizada para un estudiante
   */
  async calculateCentralizedGrade(request: GradeCalculationRequest): Promise<GradeAggregationResult> {
    const startTime = Date.now();
    this.logger.log(`🎯 Iniciando cálculo centralizado para estudiante ${request.studentId}`);

    try {
      // 1. Obtener configuración de calificación
      const configuration = await this.getGradeConfiguration(request.subjectAssignmentId);
      
      // 2. Recolectar todas las fuentes de datos
      const sourceData = await this.collectAllGradeSources(
        request.studentId,
        request.subjectAssignmentId,
        request.period,
      );

      // 3. Procesar y normalizar datos por componente
      const breakdown = await this.processGradeComponents(sourceData, configuration);

      // SP-B: modo LOMLOE por (asignatura, trimestre). parallel es el default (no-regresión).
      // request.period puede ser undefined (endpoints de breakdown / bulk); normalizar para no
      // caer en el where:{gradePeriod:undefined} que TypeORM descarta silenciosamente.
      const effectivePeriod = request.period || GradePeriod.CONTINUOUS;
      const lomloeMode = await this.lomloeGradeMode.getMode(request.subjectAssignmentId, effectivePeriod);
      const modeResult = applyLomloeMode(lomloeMode as any, breakdown, sourceData.criteria || []);
      const effectiveBreakdown = modeResult.breakdown;

      // 4. Calcular métricas y estadísticas
      const metrics = this.calculateGradeMetrics(effectiveBreakdown, sourceData);

      // 5. Generar insights de IA si está habilitado
      let aiInsights: AIInsights | undefined;
      if (request.includeAI && configuration.enableAIAssessments) {
        aiInsights = await this.generateAIInsights(sourceData, effectiveBreakdown, configuration);
      }

      // 6. Calcular calificación final
      const finalGrade = modeResult.finalGradeOverride !== null
        ? modeResult.finalGradeOverride
        : this.calculateFinalGrade(effectiveBreakdown, configuration);

      // 7. Crear o actualizar calificación centralizada
      const centralizedGrade = await this.saveOrUpdateCentralizedGrade({
        request,
        configuration,
        breakdown: effectiveBreakdown,
        metrics,
        aiInsights,
        finalGrade,
        sourceData,
      });

      const calculationTime = Date.now() - startTime;
      
      this.logger.log(`✅ Calificación centralizada calculada en ${calculationTime}ms`);

      return {
        centralizedGrade,
        sourcesProcessed: sourceData.totalSources,
        calculationTime,
        warnings: this.validateCalculationResult(centralizedGrade),
        dataQuality: metrics.dataQuality,
      };

    } catch (error) {
      this.logger.error(`❌ Error calculando calificación centralizada: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene todas las calificaciones centralizadas para un estudiante
   */
  async getStudentCentralizedGrades(
    studentId: string,
    period?: GradePeriod,
    includeBreakdown?: boolean,
    academicYearId?: string,
    restrictToVisibleForFamily?: boolean,
  ): Promise<CentralizedGrade[]> {
    const queryBuilder = this.centralizedGradeRepository
      .createQueryBuilder('grade')
      .leftJoinAndSelect('grade.subject', 'subject')
      .leftJoinAndSelect('grade.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('grade.gradeConfiguration', 'config')
      .where('grade.studentId = :studentId', { studentId })
      .orderBy('grade.updatedAt', 'DESC');

    if (period) {
      queryBuilder.andWhere('grade.period = :period', { period });
    }

    if (academicYearId) {
      queryBuilder.andWhere('grade.academicYearId = :academicYearId', { academicYearId });
    }

    if (restrictToVisibleForFamily) {
      queryBuilder.andWhere('grade.visibleToFamily = true');
    }

    const grades = await queryBuilder.getMany();

    // Si no se requiere breakdown, eliminar datos sensibles
    if (!includeBreakdown) {
      grades.forEach(grade => {
        delete grade.auditTrail;
        delete grade.internalNotes;
        delete grade.dataSourceIds;
      });
    }

    return grades;
  }

  /**
   * Obtiene calificaciones centralizadas para una clase
   */
  async getClassCentralizedGrades(
    subjectAssignmentId: string,
    period?: GradePeriod,
  ): Promise<CentralizedGrade[]> {
    try {
      this.logger.log(`🔍 Getting class grades for assignment: ${subjectAssignmentId}`);

      // Use find with explicit relations to avoid query builder issues
      const whereCondition: any = { 
        subjectAssignmentId 
      };
      
      if (period) {
        whereCondition.period = period;
      }

      // Use query builder to ensure relations are loaded correctly
      const queryBuilder = this.centralizedGradeRepository
        .createQueryBuilder('grade')
        .leftJoinAndSelect('grade.student', 'student')
        .leftJoinAndSelect('student.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('grade.subject', 'subject')
        .where('grade.subjectAssignmentId = :subjectAssignmentId', { subjectAssignmentId });

      if (period) {
        queryBuilder.andWhere('grade.period = :period', { period });
      }

      const grades = await queryBuilder.getMany();

      this.logger.log(`📊 Query builder found ${grades.length} grades with relations loaded`);

      // If relations didn't load properly, enrich grades with student data
      if (grades.length > 0 && !grades[0].student?.user?.profile) {
        this.logger.log(`🔧 Relations not loaded properly, enriching grades with student data`);
        
        const studentIds = grades.map(g => g.studentId);
        const students = await this.dataSource.query(`
          SELECT 
            s.id,
            s."enrollmentNumber",
            u.email,
            p."firstName",
            p."lastName"
          FROM students s
          LEFT JOIN users u ON s."userId" = u.id
          LEFT JOIN user_profiles p ON u.id = p."userId"
          WHERE s.id = ANY($1::uuid[])
        `, [studentIds]);

        // Create a map for quick lookup
        const studentMap = new Map(students.map(s => [s.id, s]));

        // Enrich grades with student data
        grades.forEach(grade => {
          const studentData = studentMap.get(grade.studentId);
          if (studentData) {
            // Use type assertion to add runtime properties for sorting/display
            (grade as any).studentName = `${(studentData as any).firstName || ''} ${(studentData as any).lastName || ''}`.trim();
            (grade as any).studentEnrollment = (studentData as any).enrollmentNumber;
          }
        });
      }

      // Sort by student name if available, otherwise by ID
      grades.sort((a, b) => {
        const nameA = (a as any).studentName || a.student?.user?.profile?.firstName || a.studentId;
        const nameB = (b as any).studentName || b.student?.user?.profile?.firstName || b.studentId;
        return nameA.localeCompare(nameB);
      });

      this.logger.log(`📊 Found ${grades.length} grades for class ${subjectAssignmentId}`);
      return grades;

    } catch (error) {
      this.logger.error(`❌ Error getting class grades for ${subjectAssignmentId}:`);
      this.logger.error(`❌ Error message: ${error.message}`);
      this.logger.error(`❌ Error stack: ${error.stack}`);
      this.logger.error(`❌ Error name: ${error.name}`);
      if (error.query) {
        this.logger.error(`❌ Failed query: ${error.query}`);
      }
      if (error.parameters) {
        this.logger.error(`❌ Query parameters: ${JSON.stringify(error.parameters)}`);
      }
      throw error;
    }
  }

  /**
   * Actualiza configuración de ponderaciones
   */
  async updateGradeConfiguration(
    configurationId: string,
    updates: any,
    userId: string,
  ): Promise<GradeConfiguration> {
    const configuration = await this.gradeConfigurationRepository.findOne({
      where: { id: configurationId },
    });

    if (!configuration) {
      throw new NotFoundException('Configuración de calificación no encontrada');
    }

    // Convertir tipos de DTO a tipos de entidad si es necesario
    const processedUpdates = { ...updates };
    if (updates.defaultScale && typeof updates.defaultScale === 'string') {
      processedUpdates.defaultScale = updates.defaultScale as any; // Conversion implícita al enum
    }

    // Validar la nueva configuración
    const updatedConfig = { ...configuration, ...processedUpdates };
    this.validateConfiguration(updatedConfig);

    // Actualizar configuración
    await this.gradeConfigurationRepository.update(configurationId, updates);

    // Marcar todas las calificaciones relacionadas para recálculo
    await this.markRelatedGradesForRecalculation(configurationId, userId);

    return this.gradeConfigurationRepository.findOne({ where: { id: configurationId } });
  }

  /**
   * Genera informe de calificaciones para exportación
   */
  async generateGradeReport(
    studentId: string,
    period?: GradePeriod,
    includeBreakdown = false,
    includeAI = false,
  ): Promise<any> {
    const grades = await this.getStudentCentralizedGrades(studentId, period, includeBreakdown);
    
    const student = await this.studentRepository.findOne({
      where: { id: studentId },
      relations: ['user.profile', 'educationalLevel', 'course', 'classGroups'],
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const report = {
      student: {
        id: student.id,
        fullName: `${student.user.profile.firstName} ${student.user.profile.lastName}`,
        enrollmentNumber: student.enrollmentNumber,
        level: student.educationalLevel?.name,
        course: student.course?.name,
        classGroups: student.classGroups?.map(cg => cg.name),
        avatarUrl: student.user.profile?.avatarUrl,
      },
      period: period || 'Todos los períodos',
      generatedAt: new Date(),
      summary: {
        totalSubjects: grades.length,
        averageGrade: (() => {
          const validGrades = grades.filter(g => g.finalGrade !== null && g.finalGrade !== undefined && !isNaN(g.finalGrade));
          return validGrades.length > 0 
            ? validGrades.reduce((sum, g) => sum + g.finalGrade, 0) / validGrades.length 
            : null;
        })(),
        passingSubjects: grades.filter(g => g.isPassing()).length,
        excellentGrades: grades.filter(g => g.getAchievementLevel() === 'Excelente').length,
      },
      grades: grades.map(grade => ({
        subject: grade.subject.name,
        finalGrade: grade.finalGrade,
        achievementLevel: grade.getAchievementLevel(),
        isPassing: grade.isPassing(),
        trend: grade.getTrend(),
        teacherComments: grade.teacherComments,
        lastUpdate: grade.updatedAt,
        ...(includeBreakdown && { breakdown: grade.breakdown }),
        ...(includeAI && grade.aiInsights && { aiInsights: grade.aiInsights }),
      })),
    };

    return report;
  }

  /**
   * Proceso automático de recálculo nocturno
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performNightlyRecalculation(): Promise<void> {
    this.logger.log('🌙 Iniciando recálculo nocturno de calificaciones centralizadas');

    try {
      // Buscar calificaciones que necesitan recálculo
      const gradesToRecalculate = await this.centralizedGradeRepository.find({
        where: { needsRecalculation: true },
        relations: ['gradeConfiguration'],
        take: 100, // Procesar en lotes
      });

      this.logger.log(`📊 Encontradas ${gradesToRecalculate.length} calificaciones para recalcular`);

      for (const grade of gradesToRecalculate) {
        try {
          await this.calculateCentralizedGrade({
            studentId: grade.studentId,
            subjectAssignmentId: grade.subjectAssignmentId,
            period: grade.period,
            forceRecalculation: true,
            includeAI: grade.gradeConfiguration?.enableAIAssessments || false,
          });

          // Marcar como recalculada
          await this.centralizedGradeRepository.update(grade.id, {
            needsRecalculation: false,
            lastCalculated: new Date(),
          });

        } catch (error) {
          this.logger.error(`❌ Error recalculando ${grade.id}: ${error.message}`);
        }
      }

      this.logger.log('✅ Recálculo nocturno completado');

    } catch (error) {
      this.logger.error(`❌ Error en recálculo nocturno: ${error.message}`);
    }
  }

  /**
   * MÉTODOS PRIVADOS AUXILIARES
   */

  private async getGradeConfiguration(subjectAssignmentId: string): Promise<GradeConfiguration> {
    const assignment = await this.subjectAssignmentRepository.findOne({
      where: { id: subjectAssignmentId },
      relations: ['teacher', 'subject', 'classGroup.students.user', 'classGroup.students.course', 'classGroup.students.educationalLevel'],
    });

    if (!assignment) {
      throw new NotFoundException('Asignación de materia no encontrada');
    }

    // Usar query raw para evitar problemas de mapping
    const configurations = await this.gradeConfigurationRepository.query(`
      SELECT * FROM grade_configurations 
      WHERE teacher_id = $1 AND subject_id = $2 
      LIMIT 1
    `, [assignment.teacherId, assignment.subject.id]);
    
    let configuration = null;
    if (configurations.length > 0) {
      const rawConfig = configurations[0];
      // Crear un objeto que simule la entidad GradeConfiguration
      configuration = {
        id: rawConfig.id,
        teacherId: rawConfig.teacher_id,
        subjectId: rawConfig.subject_id,
        weightConfiguration: rawConfig.weight_configuration,
        defaultScale: rawConfig.default_scale,
        roundingPolicy: rawConfig.rounding_policy,
        passingGrade: parseFloat(rawConfig.passing_grade),
        minimumGrade: parseFloat(rawConfig.minimum_grade),
        maximumGrade: parseFloat(rawConfig.maximum_grade),
        // Agregar métodos necesarios
        getEnabledComponents: function() {
          return Object.entries(this.weightConfiguration)
            .filter(([, config]: [string, any]) => config.enabled)
            .map(([component]) => component);
        }
      };
    }

    // Si no existe configuración, crear una por defecto
    if (!configuration) {
      configuration = await this.createDefaultConfiguration(assignment);
    }

    return configuration;
  }

  private async collectAllGradeSources(
    studentId: string,
    subjectAssignmentId: string,
    period?: GradePeriod,
  ): Promise<any> {
    this.logger.log(`📊 Recolectando fuentes de datos para estudiante ${studentId}`);

    // I-2: si el periodo es un trimestre, acotar tareas/exámenes/actividades a su rango de
    // fechas para que la nota del trimestre sea REALMENTE de ese trimestre. Para
    // continuous/annual/undefined range=null → sin filtro → comportamiento histórico (no-regresión).
    const range = await this.resolvePeriodDateRange(subjectAssignmentId, period);

    const [
      taskSubmissions,
      activityAssessments,
      competencyEvaluations,
      rubricAssessments,
      criterionAssessments,
      examGrades,
    ] = await Promise.all([
      this.getTaskSubmissions(studentId, subjectAssignmentId, period, range),
      this.getActivityAssessments(studentId, subjectAssignmentId, period, range),
      this.getCompetencyEvaluations(studentId, subjectAssignmentId, period),
      this.getRubricAssessments(studentId, subjectAssignmentId, period),
      this.getCriterionAssessments(studentId, subjectAssignmentId, period),
      this.getExamGrades(studentId, subjectAssignmentId, range),
    ]);

    return {
      tasks: taskSubmissions || [],
      activities: activityAssessments || [],
      evaluations: competencyEvaluations || [],
      rubrics: rubricAssessments || [],
      criteria: criterionAssessments || [],
      exams: examGrades || [],
      totalSources: (taskSubmissions || []).length + (activityAssessments || []).length +
                   (competencyEvaluations || []).length + (rubricAssessments || []).length +
                   (criterionAssessments || []).length + (examGrades || []).length,
    };
  }

  private async processGradeComponents(
    sourceData: any,
    configuration: GradeConfiguration,
  ): Promise<GradeBreakdown[]> {
    const breakdown: GradeBreakdown[] = [];

    // Procesar cada componente habilitado
    for (const component of configuration.getEnabledComponents()) {
      const componentData = await this.processComponent(component, sourceData, configuration);
      if (componentData) {
        breakdown.push(componentData);
      }
    }

    return breakdown;
  }

  private async processComponent(
    component: GradeComponent,
    sourceData: any,
    configuration: GradeConfiguration,
  ): Promise<GradeBreakdown | null> {
    const componentConfig = configuration.weightConfiguration[component];
    if (!componentConfig || !componentConfig.enabled) {
      return null;
    }

    let rawScore = 0;
    let itemCount = 0;
    let sourceIds: string[] = [];
    let lastUpdate = new Date(0);

    switch (component) {
      case GradeComponent.TASKS:
        const taskResult = this.processTasks(sourceData.tasks, componentConfig);
        rawScore = taskResult.score;
        itemCount = taskResult.count;
        sourceIds = taskResult.ids;
        lastUpdate = taskResult.lastUpdate;
        break;

      case GradeComponent.EXAMS:
        const examResult = this.processExams(sourceData.exams, componentConfig);
        rawScore = examResult.score;
        itemCount = examResult.count;
        sourceIds = examResult.ids;
        lastUpdate = examResult.lastUpdate;
        break;

      case GradeComponent.ACTIVITIES:
        const activityResult = this.processActivities(sourceData.activities, componentConfig);
        rawScore = activityResult.score;
        itemCount = activityResult.count;
        sourceIds = activityResult.ids;
        lastUpdate = activityResult.lastUpdate;
        break;

      case GradeComponent.EVALUATIONS:
        const evaluationResult = this.processEvaluations(sourceData.evaluations, componentConfig);
        rawScore = evaluationResult.score;
        itemCount = evaluationResult.count;
        sourceIds = evaluationResult.ids;
        lastUpdate = evaluationResult.lastUpdate;
        break;

      case GradeComponent.RUBRICS:
        const rubricResult = this.processRubrics(sourceData.rubrics, componentConfig);
        rawScore = rubricResult.score;
        itemCount = rubricResult.count;
        sourceIds = rubricResult.ids;
        lastUpdate = rubricResult.lastUpdate;
        break;

      case GradeComponent.CRITERIA:
        const criteriaResult = this.processCriteria(sourceData.criteria, componentConfig);
        if (!criteriaResult) return null;
        rawScore = criteriaResult.score;
        itemCount = criteriaResult.count;
        sourceIds = criteriaResult.ids;
        lastUpdate = criteriaResult.lastUpdate;
        break;

      default:
        this.logger.warn(`⚠️ Componente no implementado: ${component}`);
        return null;
    }

    // Los métodos processX ya devuelven porcentaje 0-100; solo acotar el rango.
    // No se aplica conversión por escala aquí para evitar dobles conversiones.
    const normalizedScore = Math.max(0, Math.min(100, rawScore));

    // Calcular puntuación ponderada
    const weightedScore = (normalizedScore * componentConfig.weight) / 100;

    return {
      component,
      rawScore,
      normalizedScore,
      weight: componentConfig.weight,
      weightedScore,
      itemCount,
      lastUpdate,
      sourceIds,
      confidence: this.calculateConfidence(itemCount, componentConfig.minimumItems),
    };
  }

  /**
   * Media dentro de una categoría ponderada por COLUMNA (una columna = una tarea /
   * actividad / Test Yourself: un "grupo de notas"). Cada item lleva su columnId, su
   * nota normalizada 0-100 y el peso de su columna (null = sin peso).
   *
   * RETROCOMPATIBILIDAD (Constraint global): si NINGUNA columna tiene peso configurado
   * (todos null), devuelve la MEDIA SIMPLE de todos los ítems — idéntico al
   * comportamiento anterior, sin regresión. Solo cuando el profesor fija algún peso se
   * pasa a: media dentro de cada columna → media ponderada entre columnas por su peso.
   * Peso null en un item cuando ya hay pesos ⇒ cuenta como 1 (equitativo).
   * Peso 0 ⇒ la columna NO cuenta (se excluye de la media); el frontend debe avisarlo.
   * NB: las columnas `numeric` de Postgres llegan como STRING vía TypeORM; el
   * `Number(...)` y las guardas `!== null/undefined` son intencionados (una cadena
   * "0.00" cuenta como "peso presente").
   *
   * FASE 2 — override por NOTA INDIVIDUAL: cada item puede llevar `individualWeight`
   * (peso de la nota de ESE alumno en esa columna). El peso efectivo de la columna es
   * `individualWeight ?? columnWeight ?? 1` (el override individual SUSTITUYE al de la
   * columna para ese alumno). Si no hay NINGÚN peso (ni de columna ni individual) →
   * media simple (no-regresión). Solo peso de columna → comportamiento Fase 1 intacto.
   */
  private weightedByColumn(
    items: Array<{ columnId: string; score: number; columnWeight?: number | null; individualWeight?: number | null }>,
  ): number {
    if (!items.length) return 0;

    const has = (v: number | null | undefined) => v !== null && v !== undefined;
    const anyWeight = items.some((it) => has(it.columnWeight) || has(it.individualWeight));
    if (!anyWeight) {
      // Sin pesos: media simple de todos los ítems (comportamiento previo exacto).
      return items.reduce((sum, it) => sum + it.score, 0) / items.length;
    }

    // Por columna acumulamos la media de notas y, por separado, el último peso de
    // columna y el último peso individual vistos (normalmente hay 1 nota por columna).
    const byColumn = new Map<string, { sum: number; n: number; colW: number | null; indW: number | null }>();
    for (const it of items) {
      const prev = byColumn.get(it.columnId) || { sum: 0, n: 0, colW: null, indW: null };
      prev.sum += it.score;
      prev.n += 1;
      if (has(it.columnWeight)) prev.colW = Number(it.columnWeight);
      if (has(it.individualWeight)) prev.indW = Number(it.individualWeight);
      byColumn.set(it.columnId, prev);
    }

    let weightedSum = 0;
    let totalWeight = 0;
    for (const g of byColumn.values()) {
      // peso efectivo: individual > columna > 1 (equitativo)
      const weight = g.indW !== null ? g.indW : (g.colW !== null ? g.colW : 1);
      const columnAverage = g.sum / g.n;
      weightedSum += columnAverage * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private processTasks(tasks: TaskSubmission[], config: any): any {
    const gradedTasks = tasks.filter(t => t.isGraded && t.finalGrade !== null);

    if (gradedTasks.length === 0) {
      return { score: 0, count: 0, ids: [], lastUpdate: new Date(0) };
    }

    // Cada tarea se convierte proporcionalmente a porcentaje (0-100); la columna es su Task.
    const items = gradedTasks.map(task => {
      const grade = Number(task.finalGrade);
      let score = 0;
      if (!isNaN(grade)) {
        // Tareas con rúbrica ya están en base 100; sin rúbrica se normaliza por maxPoints
        if (task.task.rubricId) {
          score = Math.max(0, Math.min(100, grade));
        } else {
          const maxPoints = Number(task.task.maxPoints) || 100;
          score = Math.max(0, Math.min(100, (grade / maxPoints) * 100));
        }
      }
      return { columnId: task.task.id, score, columnWeight: task.task.weight, individualWeight: task.weight };
    });

    const lastUpdate = new Date(Math.max(...gradedTasks.map(t => t.gradedAt?.getTime() || 0)));

    return {
      score: this.weightedByColumn(items),
      count: gradedTasks.length,
      ids: gradedTasks.map(t => t.id),
      lastUpdate,
    };
  }

  private processExams(
    exams: ExamGrade[],
    config: any,
  ): { score: number; count: number; ids: string[]; lastUpdate: Date } {
    const gradedExams = (exams || []).filter((e) => {
      const g = Number(e.numericGrade);
      return e.numericGrade !== null && e.numericGrade !== undefined && !isNaN(g);
    });

    if (gradedExams.length === 0) {
      return { score: 0, count: 0, ids: [], lastUpdate: new Date(0) };
    }

    // Cada examen (Test Yourself) se normaliza a porcentaje 0-100 por maxPoints de su Task;
    // la columna es su Task (el peso de columna vive en task.weight).
    const items = gradedExams.map(exam => {
      const grade = Number(exam.numericGrade);
      const maxPoints = Number(exam.task?.maxPoints) || 100;
      return {
        columnId: exam.task?.id || exam.id,
        score: Math.max(0, Math.min(100, (grade / maxPoints) * 100)),
        columnWeight: exam.task?.weight,
        individualWeight: exam.weight,
      };
    });

    const lastUpdate = new Date(
      Math.max(...gradedExams.map((e) => e.gradedAt?.getTime() || 0)),
    );

    return {
      score: this.weightedByColumn(items),
      count: gradedExams.length,
      ids: gradedExams.map((e) => e.id),
      lastUpdate,
    };
  }

  private processActivities(activities: ActivityAssessment[], config: any): any {
    const scoredActivities = activities.filter(a => 
      a.activity.valuationType === 'score' && !isNaN(parseFloat(a.value))
    );

    if (scoredActivities.length === 0) {
      return { score: 0, count: 0, ids: [], lastUpdate: new Date(0) };
    }

    // Cada actividad se convierte proporcionalmente a porcentaje (0-100); la columna es su Activity.
    const items = scoredActivities.map(activity => {
      const score = parseFloat(activity.value);
      const maxScore = Number(activity.activity.maxScore) || 10;
      return {
        columnId: activity.activity.id,
        score: Math.max(0, Math.min(100, (score / maxScore) * 100)),
        columnWeight: activity.activity.weight,
        individualWeight: activity.weight,
      };
    });

    const lastUpdate = new Date(Math.max(...scoredActivities.map(a => a.assessedAt?.getTime() || 0)));

    return {
      score: this.weightedByColumn(items),
      count: scoredActivities.length,
      ids: scoredActivities.map(a => a.id),
      lastUpdate,
    };
  }

  private processEvaluations(evaluations: CompetencyEvaluation[], config: any): any {
    if (evaluations.length === 0) {
      return { score: 0, count: 0, ids: [], lastUpdate: new Date(0) };
    }

    const totalScore = evaluations.reduce((sum, evaluation) => sum + (Number(evaluation.score) || 0), 0);
    const avgScore = totalScore / evaluations.length;

    // Convertir escala competencial 1-5 a porcentaje proporcional (5 = 100%)
    const normalizedScore = Math.max(0, Math.min(100, (avgScore / 5) * 100));

    const lastUpdate = new Date(Math.max(...evaluations.map(e => e.updatedAt?.getTime() || 0)));

    return {
      score: normalizedScore,
      count: evaluations.length,
      ids: evaluations.map(e => e.id),
      lastUpdate,
    };
  }

  private processRubrics(rubrics: RubricAssessment[], config: any): any {
    if (rubrics.length === 0) {
      return { score: 0, count: 0, ids: [], lastUpdate: new Date(0) };
    }

    // Usar el porcentaje (0-100) de cada rúbrica, no el totalScore en puntos brutos
    const totalScore = rubrics.reduce((sum, rubric) => {
      const pct = Number(rubric.percentage);
      if (!isNaN(pct) && pct > 0) return sum + Math.max(0, Math.min(100, pct));
      // Fallback: calcular proporción si percentage no está disponible
      const raw = Number(rubric.totalScore) || 0;
      const max = Number(rubric.maxPossibleScore) || 100;
      return sum + Math.max(0, Math.min(100, (raw / max) * 100));
    }, 0);
    const avgScore = totalScore / rubrics.length;

    const lastUpdate = new Date(Math.max(...rubrics.map(r => r.updatedAt?.getTime() || 0)));

    return {
      score: avgScore,
      count: rubrics.length,
      ids: rubrics.map(r => r.id),
      lastUpdate,
    };
  }

  private normalizeScore(rawScore: number, scale: GradingScale, config: GradeConfiguration): number {
    switch (scale) {
      case GradingScale.NUMERIC_0_10:
        // Convertir escala 0-10 a 0-100 (la escala que usa el usuario)
        return Math.max(0, Math.min(100, rawScore * 10));
      
      case GradingScale.NUMERIC_0_100:
        // Ya está en la escala correcta 0-100
        return Math.max(0, Math.min(100, rawScore));
      
      case GradingScale.COMPETENCY_1_5:
        // Convertir 1-5 a 0-100
        return Math.max(0, Math.min(100, ((rawScore - 1) / 4) * 100));
      
      case GradingScale.EMOJI:
        // Emoji: 1=😞, 2=😐, 3=😊 -> convertir a 0-100
        return Math.max(0, Math.min(100, ((rawScore - 1) / 2) * 100));
      
      default:
        return rawScore;
    }
  }

  private calculateGradeMetrics(breakdown: GradeBreakdown[], sourceData: any): GradeMetrics {
    const totalItems = breakdown.reduce((sum, item) => sum + item.itemCount, 0);
    const completedItems = totalItems;
    const pendingItems = 0; // Por implementar
    
    const scores = breakdown.map(item => item.normalizedScore);
    const averageScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
    
    const variance = scores.length > 0 
      ? scores.reduce((sum, s) => sum + Math.pow(s - averageScore, 2), 0) / scores.length 
      : 0;
    const standardDeviation = Math.sqrt(variance);

    const lastUpdateDate = new Date(Math.max(...breakdown.map(item => item.lastUpdate.getTime())));
    
    // Calcular calidad de datos basada en completitud y confianza
    const dataQuality = breakdown.length > 0 
      ? breakdown.reduce((sum, item) => sum + item.confidence, 0) / breakdown.length 
      : 0;

    return {
      totalItems,
      completedItems,
      pendingItems,
      averageScore,
      standardDeviation,
      trend: 'stable', // Por implementar análisis de tendencia
      lastUpdateDate,
      dataQuality,
    };
  }

  private async generateAIInsights(
    sourceData: any,
    breakdown: GradeBreakdown[],
    configuration: GradeConfiguration,
  ): Promise<AIInsights> {
    try {
      // Obtener datos del estudiante si están disponibles
      const studentData = sourceData.studentInfo || { id: 'unknown' };
      
      // Usar el servicio especializado de IA
      return await this.aiInsightsService.generateStudentInsights(
        studentData,
        breakdown,
        configuration,
        sourceData.historicalData,
      );
    } catch (error) {
      this.logger.error(`❌ Error generando insights de IA: ${error.message}`);
      return null;
    }
  }

  private calculateFinalGrade(breakdown: GradeBreakdown[], configuration: GradeConfiguration): number {
    // Solo cuentan los componentes CON datos (itemCount > 0): un componente
    // configurado pero sin notas todavía NO debe arrastrar la media a 0. Se
    // re-normaliza sobre los pesos de los componentes presentes (p.ej. un alumno
    // con solo exámenes obtiene su media de exámenes, no la diluida por
    // tareas/actividades vacías). Política: categoría sin entradas no puntúa.
    const present = breakdown.filter(item => (item.itemCount || 0) > 0);
    const weightedSum = present.reduce((sum, item) => sum + item.weightedScore, 0);
    const totalWeight = present.reduce((sum, item) => sum + item.weight, 0);

    // Normalizar sobre los pesos de los componentes presentes
    let finalScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
    
    // Validate that finalScore is a valid number
    if (isNaN(finalScore) || !isFinite(finalScore)) {
      this.logger.warn(`⚠️ Invalid final score calculated: ${finalScore}, defaulting to 0`);
      finalScore = 0;
    }
    
    // Ensure score is within valid range
    finalScore = Math.max(0, Math.min(finalScore, configuration.maximumGrade || 100));
    
    // Aplicar política de redondeo
    return this.applyRoundingPolicy(finalScore, configuration.roundingPolicy);
  }

  private applyRoundingPolicy(score: number, policy: any): number {
    switch (policy) {
      case 'round_half_up':
        return Math.round(score * 10) / 10;
      case 'round_up':
        return Math.ceil(score * 10) / 10;
      case 'round_down':
        return Math.floor(score * 10) / 10;
      case 'no_rounding':
        return Math.round(score * 100) / 100;
      default:
        return Math.round(score * 10) / 10;
    }
  }

  private calculateConfidence(itemCount: number, minimumItems: number): number {
    if (itemCount === 0) return 0;
    if (itemCount >= minimumItems) return 1;
    return itemCount / minimumItems;
  }

  // ==========================================
  // MÉTODOS DE AGREGACIÓN DE DATOS
  // ==========================================

  // I-2: rango de fechas [start,end] del periodo cuando es un trimestre; null para
  // continuous/annual/undefined (→ sin filtro de fecha, comportamiento histórico).
  private async resolvePeriodDateRange(
    subjectAssignmentId: string,
    period?: GradePeriod,
  ): Promise<{ start: string; end: string } | null> {
    if (!period || period === GradePeriod.CONTINUOUS || period === GradePeriod.ANNUAL) return null;
    const types = mapGradePeriodToPeriodTypes(period);
    const assignment = await this.subjectAssignmentRepository.findOne({
      where: { id: subjectAssignmentId },
      relations: ['academicYear'],
    });
    const academicYearId = (assignment as any)?.academicYear?.id;
    const qb = this.evaluationPeriodRepository
      .createQueryBuilder('ep')
      .leftJoin('ep.academicYear', 'ay')
      .where('ep.type IN (:...types)', { types });
    if (academicYearId) qb.andWhere('ay.id = :ayId', { ayId: academicYearId });
    const ep = await qb.getOne();
    const start = (ep as any)?.startDate;
    const end = (ep as any)?.endDate;
    if (!start || !end) return null;
    return { start, end };
  }

  private async getTaskSubmissions(studentId: string, subjectAssignmentId: string, period?: GradePeriod, range?: { start: string; end: string } | null): Promise<TaskSubmission[]> {
    const taskWhere: any = { subjectAssignmentId };
    if (range) taskWhere.assignedDate = Between(range.start, range.end);
    return this.taskSubmissionRepository.find({
      where: {
        studentId,
        task: taskWhere,
      },
      relations: ['task'],
      order: { submittedAt: 'DESC' },
    });
  }

  private async getExamGrades(
    studentId: string,
    subjectAssignmentId: string,
    range?: { start: string; end: string } | null,
  ): Promise<ExamGrade[]> {
    const taskWhere: any = { subjectAssignmentId };
    if (range) taskWhere.assignedDate = Between(range.start, range.end);
    return this.examGradeRepository.find({
      where: {
        studentId,
        task: taskWhere,
      },
      relations: ['task'],
      order: { gradedAt: 'DESC' },
    });
  }

  private async getActivityAssessments(studentId: string, subjectAssignmentId: string, period?: GradePeriod, range?: { start: string; end: string } | null): Promise<ActivityAssessment[]> {
    const activityWhere: any = { subjectAssignmentId };
    if (range) activityWhere.assignedDate = Between(range.start, range.end);
    return this.activityAssessmentRepository.find({
      where: {
        studentId,
        activity: activityWhere,
      },
      relations: ['activity'],
      order: { assessedAt: 'DESC' },
    });
  }

  private async getCompetencyEvaluations(studentId: string, subjectAssignmentId: string, period?: GradePeriod): Promise<CompetencyEvaluation[]> {
    return this.competencyEvaluationRepository.find({
      where: {
        evaluation: {
          student: { id: studentId },
          // TODO: Ajustar según la relación real con subject assignment
        },
      },
      relations: ['evaluation', 'competency'],
      order: { updatedAt: 'DESC' },
    });
  }

  private async getRubricAssessments(studentId: string, subjectAssignmentId: string, period?: GradePeriod): Promise<RubricAssessment[]> {
    return this.rubricAssessmentRepository.find({
      where: {
        studentId,
        rubric: { subjectAssignmentId },
      },
      relations: ['rubric'],
      order: { updatedAt: 'DESC' },
    });
  }

  private async getCriterionAssessments(studentId: string, subjectAssignmentId: string, period?: GradePeriod): Promise<CriterionAssessment[]> {
    const assignment = await this.subjectAssignmentRepository.findOne({ where: { id: subjectAssignmentId }, relations: ['academicYear'] });
    const academicYearId = (assignment as any)?.academicYear?.id;
    const types = mapGradePeriodToPeriodTypes(period);
    const qb = this.evaluationPeriodRepository.createQueryBuilder('ep')
      .leftJoin('ep.academicYear', 'ay')
      .where('ep.type IN (:...types)', { types });
    if (academicYearId) qb.andWhere('ay.id = :ayId', { ayId: academicYearId });
    const periods = await qb.getMany();
    const periodIds = periods.map((p) => p.id);
    if (periodIds.length === 0) return [];
    return this.criterionAssessmentRepository.find({
      where: { studentId, subjectAssignmentId, evaluationPeriodId: In(periodIds) },
    });
  }

  private processCriteria(items: CriterionAssessment[], componentConfig: any): { score: number; count: number; ids: string[]; lastUpdate: Date } | null {
    if (!items || items.length === 0) return null;
    const scores = items.map((i) => Number(i.normalizedScore)).filter((n) => !isNaN(n));
    if (scores.length === 0) return null;
    const score = scores.reduce((a, b) => a + b, 0) / scores.length;
    const lastUpdate = new Date(Math.max(...items.map((i) => i.updatedAt?.getTime() || 0)));
    return { score, count: items.length, ids: items.map((i) => i.id), lastUpdate };
  }

  private async createDefaultConfiguration(assignment: any): Promise<GradeConfiguration> {
    // Crear configuración por defecto basada en el nivel educativo
    // Filtrar estudiantes activos para obtener información de curso/nivel
    const allStudents = assignment.classGroup?.students || [];
    const activeStudents = allStudents.filter(student => student.user?.isActive === true);
    // Fallback: si no hay alumnos "activos" (p.ej. user no cargado o todos inactivos),
    // usar cualquier alumno del grupo para resolver curso/nivel — el nivel educativo
    // es NOT NULL en grade_configurations, así que debe quedar siempre resuelto.
    const ref = activeStudents[0] || allStudents[0];
    if (!ref?.educationalLevel) {
      throw new BadRequestException(
        'No se puede crear la configuración de notas: el grupo no tiene alumnos con nivel educativo asignado',
      );
    }

    const defaultConfig = GradeConfiguration.createDefaultConfiguration(
      assignment.teacher,
      assignment.subject,
      ref.course,
      ref.educationalLevel,
    );

    return this.gradeConfigurationRepository.save(defaultConfig);
  }

  private async saveOrUpdateCentralizedGrade(data: any): Promise<CentralizedGrade> {
    const existingGrade = await this.centralizedGradeRepository.findOne({
      where: {
        studentId: data.request.studentId,
        subjectAssignmentId: data.request.subjectAssignmentId,
        period: data.request.period || GradePeriod.CONTINUOUS,
      },
    });

    if (existingGrade) {
      // Actualizar calificación existente
      // Validate finalGrade before saving
      const validFinalGrade = (isNaN(data.finalGrade) || !isFinite(data.finalGrade)) ? 0 : data.finalGrade;
      
      await this.centralizedGradeRepository.update(existingGrade.id, {
        finalGrade: validFinalGrade,
        breakdown: data.breakdown,
        metrics: data.metrics,
        aiInsights: data.aiInsights,
        lastCalculated: new Date(),
        needsRecalculation: false,
        dataSourceIds: data.sourceData.totalSources > 0 ? ['updated'] : [],
      });

      return this.centralizedGradeRepository.findOne({ where: { id: existingGrade.id } });
    } else {
      // Crear nueva calificación centralizada
      // Validate finalGrade before saving
      const validFinalGrade = (isNaN(data.finalGrade) || !isFinite(data.finalGrade)) ? 0 : data.finalGrade;
      
      this.logger.log(`🔍 SERVICE - Creating new grade with studentId: ${data.request.studentId}`);

      const newGrade = this.centralizedGradeRepository.create({
        studentId: data.request.studentId,
        subjectAssignmentId: data.request.subjectAssignmentId,
        teacherId: data.configuration.teacherId,
        subjectId: data.configuration.subjectId,
        gradeConfigurationId: data.configuration.id,
        period: data.request.period || GradePeriod.CONTINUOUS,
        status: GradeStatus.DRAFT,
        finalGrade: validFinalGrade,
        breakdown: data.breakdown,
        metrics: data.metrics,
        aiInsights: data.aiInsights,
        auditTrail: [{
          action: 'created',
          userId: 'system',
          timestamp: new Date(),
        }],
        lastCalculated: new Date(),
        needsRecalculation: false,
        dataSourceIds: data.sourceData.totalSources > 0 ? ['created'] : [],
        dataIntegrity: data.metrics.dataQuality,
      });

      return this.centralizedGradeRepository.save(newGrade);
    }
  }

  private validateCalculationResult(grade: CentralizedGrade): string[] {
    return grade.validateDataIntegrity();
  }

  private async markRelatedGradesForRecalculation(configurationId: string, userId: string): Promise<void> {
    await this.centralizedGradeRepository.update(
      { gradeConfigurationId: configurationId },
      { needsRecalculation: true }
    );
  }

  private prepareTextForAIAnalysis(breakdown: GradeBreakdown[], sourceData: any): string {
    return `Análisis de rendimiento académico: ${JSON.stringify(breakdown)}`;
  }

  // ==========================================
  // MÉTODOS FALTANTES IMPLEMENTADOS
  // ==========================================

  /**
   * Crea una nueva configuración de ponderaciones
   */
  async createGradeConfiguration(createDto: any, userId: string): Promise<GradeConfiguration> {
    const configuration = this.gradeConfigurationRepository.create({
      ...createDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as unknown as GradeConfiguration;

    // Validar la configuración antes de guardar
    this.validateConfiguration(configuration);

    return this.gradeConfigurationRepository.save(configuration);
  }

  /**
   * Obtiene configuraciones según filtros
   */
  async getGradeConfigurations(filters: {
    teacherId?: string;
    subjectId?: string;
    educationalLevelId?: string;
  }): Promise<GradeConfiguration[]> {
    const queryBuilder = this.gradeConfigurationRepository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('config.subject', 'subject')
      .leftJoinAndSelect('config.course', 'course')
      .leftJoinAndSelect('config.educationalLevel', 'educationalLevel')
      .where('config.isActive = :isActive', { isActive: true });

    if (filters.teacherId) {
      queryBuilder.andWhere('config.teacherId = :teacherId', { teacherId: filters.teacherId });
    }

    if (filters.subjectId) {
      queryBuilder.andWhere('config.subjectId = :subjectId', { subjectId: filters.subjectId });
    }

    if (filters.educationalLevelId) {
      queryBuilder.andWhere('config.educationalLevelId = :educationalLevelId', 
        { educationalLevelId: filters.educationalLevelId });
    }

    return queryBuilder
      .orderBy('config.updatedAt', 'DESC')
      .getMany();
  }

  /**
   * Elimina una configuración (solo si no tiene calificaciones asociadas)
   */
  async deleteGradeConfiguration(configurationId: string, userId: string): Promise<void> {
    const configuration = await this.gradeConfigurationRepository.findOne({
      where: { id: configurationId },
    });

    if (!configuration) {
      throw new NotFoundException('Configuración no encontrada');
    }

    // Verificar que no hay calificaciones asociadas
    const associatedGrades = await this.centralizedGradeRepository.count({
      where: { gradeConfigurationId: configurationId },
    });

    if (associatedGrades > 0) {
      throw new BadRequestException(
        `No se puede eliminar la configuración. Hay ${associatedGrades} calificaciones asociadas`
      );
    }

    await this.gradeConfigurationRepository.remove(configuration);
  }

  /**
   * Cálculo en lote de calificaciones
   */
  async bulkCalculateGrades(bulkDto: any, userId: string): Promise<any[]> {
    const { subjectAssignmentId, studentIds, period, includeAI } = bulkDto;
    
    // Si no se especifican estudiantes, obtener todos de la asignación
    let targetStudentIds = studentIds;
    if (!targetStudentIds || targetStudentIds.length === 0) {
      const assignment = await this.subjectAssignmentRepository.findOne({
        where: { id: subjectAssignmentId },
        relations: ['classGroup.students', 'classGroup.students.user'],
      });

      if (!assignment) {
        throw new NotFoundException('Asignación de materia no encontrada');
      }

      // Filtrar solo estudiantes activos
      const activeStudents = assignment.classGroup.students.filter(s => s.user?.isActive === true);
      targetStudentIds = activeStudents.map(s => s.id);
    }

    const results = [];

    for (const studentId of targetStudentIds) {
      try {
        const result = await this.calculateCentralizedGrade({
          studentId,
          subjectAssignmentId,
          period,
          includeAI: includeAI || false,
          forceRecalculation: true,
        });

        results.push({
          studentId,
          success: true,
          data: result.centralizedGrade.getFamilySummary(),
          metadata: {
            sourcesProcessed: result.sourcesProcessed,
            calculationTime: result.calculationTime,
          },
        });
      } catch (error) {
        this.logger.error(`Error calculando calificación para estudiante ${studentId}: ${error.message}`);
        results.push({
          studentId,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Publica calificaciones (hace visibles para familias)
   */
  async publishGrades(gradeIds: string[], userId: string, options: {
    notifyFamilies?: boolean;
    comments?: string;
  }): Promise<any> {
    const results = {
      successful: [],
      failed: [],
      notifications: [],
    };

    for (const gradeId of gradeIds) {
      try {
        const grade = await this.centralizedGradeRepository.findOne({
          where: { id: gradeId },
          relations: ['student.user.profile', 'subject'],
        });

        if (!grade) {
          results.failed.push({ gradeId, error: 'Calificación no encontrada' });
          continue;
        }

        // Publicar la calificación
        grade.publish(userId);
        
        if (options.comments) {
          grade.teacherComments = options.comments;
        }

        await this.centralizedGradeRepository.save(grade);
        results.successful.push(gradeId);

        // Si se solicita notificar a familias
        if (options.notifyFamilies) {
          // Aquí se integraría con el sistema de notificaciones
          results.notifications.push({
            studentId: grade.studentId,
            subject: grade.subject.name,
            grade: grade.finalGrade,
            message: 'Nueva calificación publicada',
          });
        }

      } catch (error) {
        this.logger.error(`Error publicando calificación ${gradeId}: ${error.message}`);
        results.failed.push({ gradeId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Cambia la visibilidad de notas finales para familias (publicar/ocultar).
   * Usado por el interruptor "Visible para familias" de cada nota final.
   */
  async setGradesVisibility(gradeIds: string[], userId: string, visible: boolean): Promise<{ updated: string[]; failed: any[] }> {
    const result = { updated: [] as string[], failed: [] as any[] };
    for (const gradeId of gradeIds) {
      try {
        const grade = await this.centralizedGradeRepository.findOne({ where: { id: gradeId } });
        if (!grade) {
          result.failed.push({ gradeId, error: 'Calificación no encontrada' });
          continue;
        }
        grade.visibleToFamily = visible;
        grade.visibleToStudent = visible;
        if (visible) {
          grade.status = GradeStatus.FINAL;
          grade.lastPublished = new Date();
        }
        grade.auditTrail = grade.auditTrail || [];
        grade.auditTrail.push({
          action: visible ? 'published' : 'updated',
          userId,
          timestamp: new Date(),
          reason: visible ? 'Nota publicada a familias' : 'Nota ocultada a familias',
        });
        await this.centralizedGradeRepository.save(grade);
        result.updated.push(gradeId);
      } catch (error) {
        result.failed.push({ gradeId, error: error.message });
      }
    }
    return result;
  }

  /**
   * Actualiza el estado de una calificación
   */
  async updateGradeStatus(
    gradeId: string,
    status: GradeStatus,
    userId: string,
    comments?: string,
  ): Promise<CentralizedGrade> {
    const grade = await this.centralizedGradeRepository.findOne({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new NotFoundException('Calificación no encontrada');
    }

    const previousStatus = grade.status;
    grade.status = status;
    grade.auditTrail.push({
      action: 'updated',
      userId,
      timestamp: new Date(),
      changes: { status: { from: previousStatus, to: status } },
      reason: comments,
    });

    return this.centralizedGradeRepository.save(grade);
  }

  /**
   * Actualiza comentarios de una calificación
   */
  async updateGradeComments(
    gradeId: string,
    updates: { teacherComments?: string; internalNotes?: string },
    userId: string,
  ): Promise<CentralizedGrade> {
    const grade = await this.centralizedGradeRepository.findOne({
      where: { id: gradeId },
    });

    if (!grade) {
      throw new NotFoundException('Calificación no encontrada');
    }

    if (updates.teacherComments !== undefined) {
      grade.teacherComments = updates.teacherComments;
    }

    if (updates.internalNotes !== undefined) {
      grade.internalNotes = updates.internalNotes;
    }

    grade.auditTrail.push({
      action: 'updated',
      userId,
      timestamp: new Date(),
      changes: updates,
    });

    return this.centralizedGradeRepository.save(grade);
  }

  /**
   * Obtiene resumen de calificaciones para un profesor
   */
  async getTeacherGradesSummary(teacherId: string, period?: GradePeriod): Promise<any> {
    try {
      this.logger.log(`🚀 *** ENTERING getTeacherGradesSummary METHOD *** teacherId: ${teacherId}, period: ${period || 'all'}`);
      this.logger.log(`🎯 Getting teacher grades summary for teacher: ${teacherId}, period: ${period || 'all'}`);
      
      // First check if there are any centralized grades for this teacher
      const totalGrades = await this.centralizedGradeRepository.count({
        where: { teacherId },
      });

      this.logger.log(`📊 Found ${totalGrades} total grades for teacher ${teacherId}`);

      if (false && totalGrades === 0) { // DISABLED: Let main query handle assignments with/without grades
        // No grades found - return empty summary with teacher's subject assignments
        const teacher = await this.teacherRepository.findOne({
          where: { id: teacherId },
          relations: ['user.profile'],
        });

        if (!teacher) {
          throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
        }

        // Get teacher's subject assignments with actual student counts
        const assignments = await this.subjectAssignmentRepository.find({
          where: { teacherId },
          relations: ['subject', 'classGroup'],
        });

        this.logger.log(`👨‍🏫 Teacher ${teacherId} has ${assignments.length} subject assignments but no centralized grades yet`);
        this.logger.log(`🔍 Assignment details: ${JSON.stringify(assignments.map(a => ({ id: a.id, subject: a.subject.name, class: a.classGroup.name, classId: a.classGroup.id })))}`);

        // Calculate actual student counts for each assignment using raw query
        const subjectSummaries = [];
        
        for (const assignment of assignments) {
          try {
            this.logger.log(`🔄 Processing assignment: ${assignment.subject.name} in class ${assignment.classGroup.name} (ID: ${assignment.classGroup.id})`);
            
            // Direct raw query to count students
            const studentCountQuery = `
              SELECT COUNT(*) as count 
              FROM class_students 
              WHERE "classId" = $1
            `;
            
            this.logger.log(`🔍 Executing query: ${studentCountQuery} with parameter: ${assignment.classGroup.id}`);
            const result = await this.studentRepository.query(studentCountQuery, [assignment.classGroup.id]);
            this.logger.log(`🔍 Raw query result: ${JSON.stringify(result)}`);
            
            const studentCount = parseInt(result[0]?.count || '0');
            
            this.logger.log(`📊 Class ${assignment.classGroup.name} (${assignment.subject.name}): ${studentCount} students`);

            subjectSummaries.push({
              subject: assignment.subject,
              studentCount: studentCount,
              averageGrade: 0,
              passingRate: 0,
              grades: [],
              assignment: {
                id: assignment.id,
                classGroup: assignment.classGroup,
              },
            });
          } catch (error) {
            this.logger.error(`❌ Error counting students for ${assignment.classGroup.name}: ${error.message}`);
            subjectSummaries.push({
              subject: assignment.subject,
              studentCount: 0,
              averageGrade: 0,
              passingRate: 0,
              grades: [],
              assignment: {
                id: assignment.id,
                classGroup: assignment.classGroup,
              },
            });
          }
        }

        const totalStudents = subjectSummaries.reduce((sum, summary) => sum + summary.studentCount, 0);

        return {
          teacher: { 
            id: teacherId,
            name: `${teacher.user.profile.firstName} ${teacher.user.profile.lastName}`,
          },
          period: period || 'all',
          totalSubjects: assignments.length,
          totalStudents: totalStudents,
          overallAverage: 0,
          subjectSummaries: subjectSummaries,
          isEmpty: true,
          message: 'No se han calculado calificaciones centralizadas aún. Las calificaciones se generarán automáticamente cuando haya evaluaciones disponibles.',
        };
      }

      // Modified query to include ALL teacher assignments, not just those with grades
      let gradesQuery = `
        SELECT 
          cg.id,
          cg.final_grade,
          cg.period,
          cg.student_id,
          s.id as subject_id,
          s.name as subject_name,
          s.code as subject_code,
          up."firstName" as student_first_name,
          up."lastName" as student_last_name,
          st."enrollmentNumber" as student_enrollment_number,
          sa.id as subject_assignment_id,
          cg2.name as class_group_name,
          sa."teacherId" as assignment_teacher_id
        FROM subject_assignments sa
        JOIN subjects s ON sa."subjectId" = s.id
        JOIN class_groups cg2 ON sa."classGroupId" = cg2.id
        LEFT JOIN centralized_grades cg ON cg.subject_assignment_id = sa.id
        LEFT JOIN students st ON cg.student_id = st.id
        LEFT JOIN users u ON st."userId" = u.id
        LEFT JOIN user_profiles up ON u.id = up."userId"
        WHERE sa."teacherId" = $1
      `;

      const queryParams = [teacherId];
      // I-1: SIEMPRE filtrar por periodo (por defecto 'continuous', la nota global de curso).
      // Sin este filtro, al existir filas por trimestre además de la continua, cada alumno se
      // contaría N veces (studentCount y medias infladas) en este resumen sin scope de periodo.
      gradesQuery += ` AND cg.period = $2`;
      queryParams.push(period || GradePeriod.CONTINUOUS);

      const rawGrades = await this.centralizedGradeRepository.query(gradesQuery, queryParams);
      this.logger.log(`📋 Loaded ${rawGrades.length} grades with raw SQL query`);

      // SIMPLIFIED APPROACH: Create subject summaries directly from raw data
      const subjectSummaries = {};
      
      // Process all raw rows and group by assignment
      for (const raw of rawGrades) {
        const assignmentId = raw.subject_assignment_id;

        // Initialize assignment if not exists
        if (!subjectSummaries[assignmentId]) {
          subjectSummaries[assignmentId] = {
            subject: {
              id: raw.subject_id || 'unknown',
              name: raw.subject_name || 'Asignatura sin nombre',
              code: raw.subject_code || 'SIN-COD'
            },
            studentCount: 0,
            averageGrade: null,
            passingRate: 0,
            grades: [],
            assignment: {
              id: assignmentId,
              classGroup: {
                id: assignmentId,
                name: raw.class_group_name || 'Grupo sin nombre'
              }
            }
          };
        }
        
        // If has grade, add it
        if (raw.id !== null && raw.student_id !== null) {
          const gradeObj = {
            id: raw.id,
            subjectId: raw.subject_id,
            studentId: raw.student_id,
            finalGrade: (() => {
              const parsed = parseFloat(raw.final_grade || 0);
              return isNaN(parsed) ? 0 : parsed;
            })(),
            subject: {
              id: raw.subject_id,
              name: raw.subject_name || 'Asignatura desconocida',
              code: raw.subject_code
            },
            student: {
              id: raw.student_id,
              fullName: raw.student_first_name && raw.student_last_name 
                ? `${raw.student_first_name} ${raw.student_last_name}`.trim()
                : 'Estudiante desconocido',
              enrollmentNumber: raw.student_enrollment_number
            },
            subjectAssignment: {
              id: assignmentId,
              classGroup: {
                id: assignmentId,
                name: raw.class_group_name
              }
            },
            // Escala porcentual 0-100: aprobado a partir de 50%
            isPassing: () => (parseFloat(raw.final_grade || 0)) >= 50,
            needsAttention: () => (parseFloat(raw.final_grade || 0)) < 50
          };
          
          subjectSummaries[assignmentId].grades.push(gradeObj);
        }
      }

      // Calculate statistics for each assignment
      this.logger.log(`🔍 FINAL PROCESSING - Total assignments: ${Object.keys(subjectSummaries).length}`);

      // Calcular estadísticas para cada materia
      Object.values(subjectSummaries).forEach((summary: any) => {
        summary.studentCount = summary.grades.length;
        // Filtrar grades con finalGrade válido para el cálculo del promedio
        const validGrades = summary.grades.filter(g => g.finalGrade !== null && g.finalGrade !== undefined && !isNaN(g.finalGrade));
        summary.averageGrade = validGrades.length > 0
          ? validGrades.reduce((sum, g) => sum + g.finalGrade, 0) / validGrades.length
          : null;
        summary.passingRate = summary.studentCount > 0
          ? (summary.grades.filter(g => g.isPassing()).length / summary.studentCount) * 100
          : 0;
      });

      // Calculate overall average from all assignments
      const allGrades = Object.values(subjectSummaries).flatMap((summary: any) => summary.grades);
      const validOverallGrades = allGrades.filter(g => g.finalGrade !== null && g.finalGrade !== undefined && !isNaN(g.finalGrade));
      const overallAverage = validOverallGrades.length > 0 
        ? validOverallGrades.reduce((sum, g) => sum + g.finalGrade, 0) / validOverallGrades.length 
        : null;

      
      this.logger.log(`🎯 FINAL RESULT: ${Object.keys(subjectSummaries).length} assignments total`);

      return {
        teacher: { id: teacherId },
        period: period || 'all',
        totalSubjects: Object.keys(subjectSummaries).length,
        totalStudents: allGrades.length,
        overallAverage: overallAverage,
        subjectSummaries: Object.values(subjectSummaries),
        isEmpty: false,
      };

    } catch (error) {
      this.logger.error(`❌ Error getting teacher grades summary for ${teacherId}: ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Obtiene el breakdown detallado de calificaciones para un estudiante específico
   */
  async getStudentGradeBreakdown(
    studentId: string,
    subjectAssignmentId: string,
    period?: GradePeriod,
  ): Promise<any> {
    try {
      this.logger.log(`🔍 Getting breakdown for student ${studentId} in assignment ${subjectAssignmentId}`);

      // Buscar la calificación centralizada existente
      const queryBuilder = this.centralizedGradeRepository
        .createQueryBuilder('grade')
        .leftJoinAndSelect('grade.student', 'student')
        .leftJoinAndSelect('student.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('grade.subject', 'subject')
        .leftJoinAndSelect('grade.teacher', 'teacher')
        .leftJoinAndSelect('teacher.user', 'teacherUser')
        .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
        .where('grade.studentId = :studentId', { studentId })
        .andWhere('grade.subjectAssignmentId = :subjectAssignmentId', { subjectAssignmentId });

      if (period) {
        queryBuilder.andWhere('grade.period = :period', { period });
      }

      const grade = await queryBuilder.getOne();

      if (!grade) {
        // Si no existe, intentar calcular la calificación
        this.logger.log(`📊 No existing grade found, calculating for student ${studentId}`);
        
        const result = await this.calculateCentralizedGrade({
          studentId,
          subjectAssignmentId,
          period,
          forceRecalculation: false,
          includeAI: false,
        });

        if (!result.centralizedGrade) {
          throw new NotFoundException('No se pudo calcular la calificación para este estudiante');
        }

        return {
          student: {
            id: studentId,
            fullName: `${result.centralizedGrade.student?.user?.profile?.firstName || ''} ${result.centralizedGrade.student?.user?.profile?.lastName || ''}`.trim(),
            enrollmentNumber: result.centralizedGrade.student?.enrollmentNumber,
          },
          subject: result.centralizedGrade.subject,
          finalGrade: result.centralizedGrade.finalGrade,
          breakdown: result.centralizedGrade.breakdown,
          metrics: result.centralizedGrade.metrics,
          aiInsights: result.centralizedGrade.aiInsights,
          lastCalculated: result.centralizedGrade.lastCalculated,
          calculationTime: result.calculationTime,
          sourcesProcessed: result.sourcesProcessed,
        };
      }

      // Recopilar fuentes de datos originales para mostrar el detalle
      const sourceData = await this.collectAllGradeSources(
        studentId,
        subjectAssignmentId,
        period,
      );

      this.logger.log(`📊 Source data collected: tasks=${sourceData.tasks?.length || 0}, activities=${sourceData.activities?.length || 0}, evaluations=${sourceData.evaluations?.length || 0}, rubrics=${sourceData.rubrics?.length || 0}`);

      return {
        student: {
          id: grade.student.id,
          fullName: `${grade.student.user.profile.firstName} ${grade.student.user.profile.lastName}`,
          enrollmentNumber: grade.student.enrollmentNumber,
        },
        subject: grade.subject,
        teacher: {
          id: grade.teacher.id,
          fullName: `${grade.teacher.user.profile.firstName} ${grade.teacher.user.profile.lastName}`,
        },
        finalGrade: grade.finalGrade,
        breakdown: grade.breakdown,
        metrics: grade.metrics,
        aiInsights: grade.aiInsights,
        lastCalculated: grade.lastCalculated,
        status: grade.status,
        // Datos originales detallados (fuentes: TaskSubmission, ActivityAssessment,
        // CompetencyEvaluation y RubricAssessment) — todo en porcentaje 0-100
        sourceDetails: {
          tasks: (sourceData.tasks || []).map((submission: TaskSubmission) => {
            const grade = Number(submission.finalGrade);
            const maxPoints = Number(submission.task?.maxPoints) || 100;
            const isRubric = !!submission.task?.rubricId;
            const percentage = submission.isGraded && !isNaN(grade)
              ? Math.max(0, Math.min(100, isRubric ? grade : (grade / maxPoints) * 100))
              : null;
            return {
              id: submission.id,
              title: submission.task?.title || 'Tarea',
              type: submission.task?.taskType,
              dueDate: submission.task?.dueDate,
              score: !isNaN(grade) ? grade : null,
              maxScore: isRubric ? 100 : maxPoints,
              percentage,
              status: submission.isGraded ? 'GRADED' : (submission.submittedAt ? 'SUBMITTED' : 'NOT_SUBMITTED'),
              submittedAt: submission.submittedAt,
            };
          }),
          activities: (sourceData.activities || []).map((assessment: ActivityAssessment) => {
            const score = parseFloat(assessment.value);
            const maxScore = Number(assessment.activity?.maxScore) || 10;
            const isNumeric = assessment.activity?.valuationType === 'score' && !isNaN(score);
            return {
              id: assessment.id,
              title: assessment.activity?.name || 'Actividad',
              type: assessment.activity?.valuationType,
              score: isNumeric ? score : assessment.value,
              maxScore,
              percentage: isNumeric ? Math.max(0, Math.min(100, (score / maxScore) * 100)) : null,
              assessedAt: assessment.assessedAt,
            };
          }),
          competencies: (sourceData.evaluations || []).map((comp: CompetencyEvaluation) => ({
            id: comp.id,
            competencyName: comp.competency?.name || 'Sin nombre',
            score: Number(comp.score) || 0,
            maxScore: 5,
            percentage: Math.max(0, Math.min(100, ((Number(comp.score) || 0) / 5) * 100)),
            evaluatedAt: comp.updatedAt,
          })),
          rubrics: (sourceData.rubrics || []).map((assessment: RubricAssessment) => {
            const pct = Number(assessment.percentage);
            const raw = Number(assessment.totalScore) || 0;
            const max = Number(assessment.maxPossibleScore) || 100;
            return {
              id: assessment.id,
              title: assessment.rubric?.name || 'Sin título',
              totalScore: raw,
              maxScore: max,
              percentage: !isNaN(pct) && pct > 0
                ? Math.max(0, Math.min(100, pct))
                : Math.max(0, Math.min(100, (raw / max) * 100)),
              assessedAt: assessment.createdAt,
            };
          }),
        },
      };

    } catch (error) {
      this.logger.error(`❌ Error getting grade breakdown for student ${studentId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera dashboard de métricas para análisis
   */
  async getGradesDashboard(teacherId?: string, period?: GradePeriod): Promise<any> {
    const queryBuilder = this.centralizedGradeRepository
      .createQueryBuilder('grade')
      .leftJoinAndSelect('grade.subject', 'subject')
      .leftJoinAndSelect('grade.student', 'student')
      .leftJoinAndSelect('grade.teacher', 'teacher');

    if (teacherId) {
      queryBuilder.where('grade.teacherId = :teacherId', { teacherId });
    }

    // I-1: por defecto 'continuous' para no contar filas de varios periodos por alumno.
    queryBuilder.andWhere('grade.period = :period', { period: period || GradePeriod.CONTINUOUS });

    const grades = await queryBuilder.getMany();

    const dashboard = {
      summary: {
        totalGrades: grades.length,
        averageGrade: (() => {
          const validGrades = grades.filter(g => g.finalGrade !== null && g.finalGrade !== undefined && !isNaN(g.finalGrade));
          return validGrades.length > 0 
            ? validGrades.reduce((sum, g) => sum + g.finalGrade, 0) / validGrades.length 
            : null;
        })(),
        passingRate: grades.length > 0 
          ? (grades.filter(g => g.isPassing()).length / grades.length) * 100 
          : 0,
        needsAttention: grades.filter(g => g.needsAttention()).length,
      },
      distribution: {
        excellent: grades.filter(g => g.getAchievementLevel() === 'Excelente').length,
        notable: grades.filter(g => g.getAchievementLevel() === 'Notable').length,
        approved: grades.filter(g => g.getAchievementLevel() === 'Aprobado').length,
        insufficient: grades.filter(g => g.getAchievementLevel() === 'Insuficiente').length,
      },
      trends: {
        improving: grades.filter(g => g.getTrend() === 'improving').length,
        stable: grades.filter(g => g.getTrend() === 'stable').length,
        declining: grades.filter(g => g.getTrend() === 'declining').length,
      },
      dataQuality: {
        averageIntegrity: grades.length > 0 
          ? grades.reduce((sum, g) => sum + g.dataIntegrity, 0) / grades.length 
          : 1,
        pendingRecalculation: grades.filter(g => g.needsRecalculation).length,
        lastUpdated: grades.length > 0 
          ? new Date(Math.max(...grades.map(g => g.lastCalculated.getTime()))) 
          : new Date(),
      },
    };

    return dashboard;
  }

  /**
   * Genera reporte PDF usando el servicio especializado
   */
  async generatePDFReport(report: any): Promise<Buffer> {
    return this.gradeReportsService.generatePDFReport(report);
  }

  /**
   * Genera reporte Excel usando el servicio especializado
   */
  async generateExcelReport(report: any): Promise<Buffer> {
    return this.gradeReportsService.generateExcelReport(report);
  }

  /**
   * Verifica acceso de familia a estudiante
   */
  async verifyFamilyAccess(familyUserId: string, studentId: string): Promise<boolean> {
    // Verificar relación real familia-estudiante en la base de datos
    const rows = await this.dataSource.query(
      `SELECT fs.id
       FROM family_students fs
       INNER JOIN families f ON fs."familyId" = f.id
       WHERE fs."studentId" = $1
         AND (f."primaryContactId" = $2 OR f."secondaryContactId" = $2)
       LIMIT 1`,
      [studentId, familyUserId],
    );
    return rows.length > 0;
  }

  /**
   * Verifica acceso de profesor a estudiante
   */
  async verifyTeacherAccess(teacherId: string, studentId: string): Promise<boolean> {
    // Verificar si el profesor tiene asignaciones con el estudiante
    const assignment = await this.subjectAssignmentRepository
      .createQueryBuilder('assignment')
      .leftJoin('assignment.classGroup', 'classGroup')
      .leftJoin('classGroup.students', 'student')
      .where('assignment.teacherId = :teacherId', { teacherId })
      .andWhere('student.id = :studentId', { studentId })
      .getOne();

    return !!assignment;
  }

  /** RGPD: ¿el profesor (Teacher.id) es titular de esta asignación de materia? */
  async verifyTeacherOwnsAssignment(teacherId: string, subjectAssignmentId: string): Promise<boolean> {
    const assignment = await this.subjectAssignmentRepository
      .createQueryBuilder('assignment')
      .where('assignment.id = :subjectAssignmentId', { subjectAssignmentId })
      .andWhere('assignment.teacherId = :teacherId', { teacherId })
      .getOne();

    return !!assignment;
  }

  /**
   * Valida una configuración de calificaciones
   */
  private validateConfiguration(configuration: GradeConfiguration): void {
    if (!configuration.weightConfiguration) {
      throw new BadRequestException('La configuración de ponderaciones es requerida');
    }

    // Validar que los pesos sumen 100%
    const weights = Object.values(configuration.weightConfiguration);
    const totalWeight = weights.reduce((sum: number, config: any) => 
      sum + (config.enabled ? config.weight || 0 : 0), 0
    );

    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new BadRequestException(`Los pesos deben sumar 100%, actualmente suman ${totalWeight}%`);
    }

    // Validar rangos de calificación
    if (configuration.minimumGrade >= configuration.maximumGrade) {
      throw new BadRequestException('La calificación mínima debe ser menor que la máxima');
    }

    if (configuration.passingGrade < configuration.minimumGrade || 
        configuration.passingGrade > configuration.maximumGrade) {
      throw new BadRequestException('La calificación de aprobación debe estar entre el mínimo y máximo');
    }
  }
}