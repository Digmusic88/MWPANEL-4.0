import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evaluation, EvaluationStatus } from './entities/evaluation.entity';
import { CompetencyEvaluation } from './entities/competency-evaluation.entity';
import { EvaluationPeriod, PeriodType } from './entities/evaluation-period.entity';
import { RadarEvaluation } from './entities/radar-evaluation.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Subject } from '../students/entities/subject.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';
import { Competency } from '../competencies/entities/competency.entity';
import { CreateEvaluationDto, CompetencyEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { AcademicRecordsSyncService } from '../academic-records/services/academic-records-sync.service';

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(CompetencyEvaluation)
    private competencyEvaluationsRepository: Repository<CompetencyEvaluation>,
    @InjectRepository(EvaluationPeriod)
    private evaluationPeriodsRepository: Repository<EvaluationPeriod>,
    @InjectRepository(RadarEvaluation)
    private radarEvaluationsRepository: Repository<RadarEvaluation>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(Subject)
    private subjectsRepository: Repository<Subject>,
    @InjectRepository(AcademicYear)
    private academicYearsRepository: Repository<AcademicYear>,
    @InjectRepository(Competency)
    private competenciesRepository: Repository<Competency>,
    private readonly academicRecordsSyncService: AcademicRecordsSyncService,
  ) {}

  async findAll(): Promise<Evaluation[]> {
    return this.evaluationsRepository.find({
      relations: [
        'student', 
        'student.user', 
        'student.user.profile',
        'teacher', 
        'teacher.user', 
        'teacher.user.profile',
        'subject', 
        'period',
        'competencyEvaluations',
        'competencyEvaluations.competency'
      ],
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string): Promise<Evaluation> {
    const evaluation = await this.evaluationsRepository.findOne({
      where: { id },
      relations: [
        'student', 
        'student.user', 
        'student.user.profile',
        'teacher', 
        'teacher.user', 
        'teacher.user.profile',
        'subject', 
        'period',
        'competencyEvaluations',
        'competencyEvaluations.competency'
      ],
    });

    if (!evaluation) {
      throw new NotFoundException(`Evaluación con ID ${id} no encontrada`);
    }

    return evaluation;
  }

  async findByStudent(studentId: string): Promise<Evaluation[]> {
    return this.evaluationsRepository.find({
      where: { student: { id: studentId } },
      relations: [
        'student', 
        'student.user', 
        'student.user.profile',
        'teacher', 
        'teacher.user', 
        'teacher.user.profile',
        'subject', 
        'period',
        'competencyEvaluations',
        'competencyEvaluations.competency'
      ],
      order: { createdAt: 'DESC' }
    });
  }

  async findByTeacher(teacherId: string): Promise<Evaluation[]> {
    return this.evaluationsRepository.find({
      where: { teacher: { id: teacherId } },
      relations: [
        'student', 
        'student.user', 
        'student.user.profile',
        'teacher', 
        'teacher.user', 
        'teacher.user.profile',
        'subject', 
        'period',
        'competencyEvaluations',
        'competencyEvaluations.competency'
      ],
      order: { createdAt: 'DESC' }
    });
  }

  async create(createEvaluationDto: CreateEvaluationDto): Promise<Evaluation> {
    // Verificar que todas las entidades existen
    const student = await this.studentsRepository.findOne({
      where: { id: createEvaluationDto.studentId }
    });
    if (!student) {
      throw new NotFoundException(`Estudiante con ID ${createEvaluationDto.studentId} no encontrado`);
    }

    const teacher = await this.teachersRepository.findOne({
      where: { id: createEvaluationDto.teacherId }
    });
    if (!teacher) {
      throw new NotFoundException(`Profesor con ID ${createEvaluationDto.teacherId} no encontrado`);
    }

    const subject = await this.subjectsRepository.findOne({
      where: { id: createEvaluationDto.subjectId }
    });
    if (!subject) {
      throw new NotFoundException(`Asignatura con ID ${createEvaluationDto.subjectId} no encontrada`);
    }

    const period = await this.evaluationPeriodsRepository.findOne({
      where: { id: createEvaluationDto.periodId }
    });
    if (!period) {
      throw new NotFoundException(`Período con ID ${createEvaluationDto.periodId} no encontrado`);
    }

    // Crear la evaluación
    const evaluation = this.evaluationsRepository.create({
      student,
      teacher,
      subject,
      period,
      generalObservations: createEvaluationDto.generalObservations,
      status: EvaluationStatus.DRAFT
    });

    const savedEvaluation = await this.evaluationsRepository.save(evaluation);

    // Crear evaluaciones por competencia
    for (const compEval of createEvaluationDto.competencyEvaluations) {
      const competency = await this.competenciesRepository.findOne({
        where: { id: compEval.competencyId }
      });
      if (!competency) {
        throw new NotFoundException(`Competencia con ID ${compEval.competencyId} no encontrada`);
      }

      const competencyEvaluation = this.competencyEvaluationsRepository.create({
        evaluation: savedEvaluation,
        competency,
        score: compEval.score,
        observations: compEval.observations,
        isActive: compEval.isActive ?? true,
      });

      await this.competencyEvaluationsRepository.save(competencyEvaluation);
    }

    // Calcular puntuación general (solo competencias activas)
    const activeCompetencies = createEvaluationDto.competencyEvaluations.filter(comp => comp.isActive !== false);
    const avgScore = activeCompetencies.length > 0 
      ? activeCompetencies.reduce((sum, comp) => sum + comp.score, 0) / activeCompetencies.length
      : 0;
    savedEvaluation.overallScore = Math.round(avgScore * 100) / 100;
    await this.evaluationsRepository.save(savedEvaluation);

    return this.findOne(savedEvaluation.id);
  }

  async update(id: string, updateEvaluationDto: UpdateEvaluationDto): Promise<Evaluation> {
    const evaluation = await this.findOne(id);

    // Actualizar campos básicos
    if (updateEvaluationDto.generalObservations !== undefined) {
      evaluation.generalObservations = updateEvaluationDto.generalObservations;
    }
    if (updateEvaluationDto.status !== undefined) {
      evaluation.status = updateEvaluationDto.status;
    }

    // Si hay nuevas evaluaciones por competencia, eliminar las existentes y crear nuevas
    if (updateEvaluationDto.competencyEvaluations) {
      // Eliminar evaluaciones existentes
      await this.competencyEvaluationsRepository.delete({ evaluation: { id } });

      // Crear nuevas evaluaciones
      for (const compEval of updateEvaluationDto.competencyEvaluations) {
        const competency = await this.competenciesRepository.findOne({
          where: { id: compEval.competencyId }
        });
        if (!competency) {
          throw new NotFoundException(`Competencia con ID ${compEval.competencyId} no encontrada`);
        }

        const competencyEvaluation = this.competencyEvaluationsRepository.create({
          evaluation,
          competency,
          score: compEval.score,
          observations: compEval.observations,
          isActive: compEval.isActive ?? true // Por defecto activa si no se especifica
        });

        await this.competencyEvaluationsRepository.save(competencyEvaluation);
      }

      // Recalcular puntuación general (solo competencias activas)
      const activeCompetencies = updateEvaluationDto.competencyEvaluations.filter(comp => comp.isActive !== false);
      const avgScore = activeCompetencies.length > 0 
        ? activeCompetencies.reduce((sum, comp) => sum + comp.score, 0) / activeCompetencies.length
        : 0;
      evaluation.overallScore = Math.round(avgScore * 100) / 100;
    }

    await this.evaluationsRepository.save(evaluation);
    return this.findOne(id);
  }

  async remove(id: string, user?: any): Promise<void> {
    const evaluation = await this.findOne(id);

    // Si es un profesor, verificar que solo puede borrar sus propias evaluaciones
    if (user && user.role === 'teacher' && user.teacherId !== evaluation.teacher.id) {
      throw new BadRequestException('No tienes permisos para eliminar esta evaluación');
    }

    // Usar transacción para eliminar en orden correcto
    await this.evaluationsRepository.manager.transaction(async manager => {
      await manager.query('DELETE FROM competency_evaluations WHERE "evaluationId" = $1', [id]);
      await manager.query('DELETE FROM evaluations WHERE id = $1', [id]);
    });
  }

  async generateRadarChart(studentId: string, periodId: string): Promise<RadarEvaluation> {
    // Obtener evaluaciones del estudiante en el período
    const evaluations = await this.evaluationsRepository.find({
      where: { 
        student: { id: studentId },
        period: { id: periodId }
      },
      relations: ['competencyEvaluations', 'competencyEvaluations.competency', 'period']
    });

    if (evaluations.length === 0) {
      throw new NotFoundException(`No se encontraron evaluaciones para el estudiante en el período especificado`);
    }

    const student = await this.studentsRepository.findOne({
      where: { id: studentId }
    });
    const period = await this.evaluationPeriodsRepository.findOne({
      where: { id: periodId }
    });

    // Calcular promedios por competencia
    const competencyScores = new Map<string, { scores: number[], competency: Competency }>();

    evaluations.forEach(evaluation => {
      evaluation.competencyEvaluations.forEach(compEval => {
        // Solo incluir competencias activas en el radar
        if (compEval.isActive !== false) {
          const compId = compEval.competency.id;
          if (!competencyScores.has(compId)) {
            competencyScores.set(compId, { scores: [], competency: compEval.competency });
          }
          competencyScores.get(compId)!.scores.push(compEval.score);
        }
      });
    });

    const radarData = Array.from(competencyScores.entries()).map(([compId, data]) => {
      const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      return {
        code: data.competency.code,
        name: data.competency.name,
        score: Math.round(avgScore * 100) / 100,
        maxScore: 5,
      };
    });

    const overallScore = radarData.reduce((sum, comp) => sum + comp.score, 0) / radarData.length;

    // Eliminar radar existente si existe
    await this.radarEvaluationsRepository.delete({
      student: { id: studentId },
      period: { id: periodId }
    });

    // Crear nuevo radar
    const radarEvaluation = this.radarEvaluationsRepository.create({
      student,
      period,
      data: {
        competencies: radarData,
        overallScore: Math.round(overallScore * 100) / 100,
        date: new Date()
      }
    });

    return this.radarEvaluationsRepository.save(radarEvaluation);
  }

  async getRadarChart(studentId: string, periodId: string): Promise<RadarEvaluation> {
    const radar = await this.radarEvaluationsRepository.findOne({
      where: {
        student: { id: studentId },
        period: { id: periodId }
      },
      relations: ['student', 'student.user', 'student.user.profile', 'period']
    });

    if (!radar) {
      // Generar si no existe
      return this.generateRadarChart(studentId, periodId);
    }

    return radar;
  }

  async getAllPeriods(): Promise<EvaluationPeriod[]> {
    return this.evaluationPeriodsRepository.find({
      relations: ['academicYear'],
      order: { startDate: 'ASC' }
    });
  }

  async getActivePeriod(): Promise<EvaluationPeriod> {
    const period = await this.evaluationPeriodsRepository.findOne({
      where: { isActive: true },
      relations: ['academicYear']
    });

    if (!period) {
      throw new NotFoundException('No hay período de evaluación activo');
    }

    return period;
  }

  async createEvaluationPeriods(): Promise<EvaluationPeriod[]> {
    // Obtener año académico actual
    const academicYear = await this.academicYearsRepository.findOne({
      where: { isCurrent: true }
    });

    if (!academicYear) {
      throw new NotFoundException('No hay año académico activo');
    }

    // Verificar si ya existen períodos para este año
    const existingPeriods = await this.evaluationPeriodsRepository.find({
      where: { academicYear: { id: academicYear.id } }
    });

    if (existingPeriods.length > 0) {
      return existingPeriods;
    }

    // Crear períodos para el año académico derivando fechas del año académico activo
    const startYear = new Date(academicYear.startDate).getFullYear(); // ej. 2025 para curso 2025-2026
    const endYear = new Date(academicYear.endDate).getFullYear();     // ej. 2026 para curso 2025-2026

    const periods = [
      {
        name: '1º Trimestre',
        type: PeriodType.TRIMESTER_1,
        startDate: new Date(academicYear.startDate),
        endDate: new Date(`${startYear}-12-20`),
        isActive: true
      },
      {
        name: '2º Trimestre',
        type: PeriodType.TRIMESTER_2,
        startDate: new Date(`${endYear}-01-08`),
        endDate: new Date(`${endYear}-03-28`),
        isActive: false
      },
      {
        name: '3º Trimestre',
        type: PeriodType.TRIMESTER_3,
        startDate: new Date(`${endYear}-04-07`),
        endDate: new Date(`${endYear}-06-20`),
        isActive: false
      },
      {
        name: 'Evaluación Final',
        type: PeriodType.FINAL,
        startDate: new Date(academicYear.startDate),
        endDate: new Date(academicYear.endDate),
        isActive: false
      }
    ];

    const createdPeriods = [];
    for (const periodData of periods) {
      const period = this.evaluationPeriodsRepository.create({
        ...periodData,
        academicYear
      });
      const savedPeriod = await this.evaluationPeriodsRepository.save(period);
      createdPeriods.push(savedPeriod);
    }

    return createdPeriods;
  }

  async createTestData(): Promise<any> {
    try {
      // 1. Crear períodos de evaluación
      const periods = await this.createEvaluationPeriods();
      
      // 2. Crear competencias básicas de primaria
      // Primero, buscar todos los niveles educativos disponibles
      const allEducationalLevels = await this.academicYearsRepository.manager.find('EducationalLevel');
      console.log('Niveles educativos disponibles:', allEducationalLevels.map(level => ({ id: level.id, name: level.name, code: level.code })));

      // Buscar nivel de primaria con diferentes variantes de nombre
      const educationalLevel = allEducationalLevels.find(level => 
        level.name.toLowerCase().includes('primaria') || 
        (level.code && level.code.toLowerCase() === 'primaria') ||
        level.name.toLowerCase() === 'educación primaria'
      ) || allEducationalLevels[0]; // Usar el primero como fallback

      if (!educationalLevel) {
        throw new NotFoundException(`No se encontró ningún nivel educativo. Disponibles: ${allEducationalLevels.map(l => l.name).join(', ')}`);
      }

      console.log('Usando nivel educativo:', { id: educationalLevel.id, name: educationalLevel.name });

      const competenciesData = [
        {
          code: 'CCL',
          name: 'Competencia en comunicación lingüística',
          description: 'Habilidad para expresar e interpretar conceptos, pensamientos, sentimientos, hechos y opiniones de forma oral y escrita',
          educationalLevel
        },
        {
          code: 'CP',
          name: 'Competencia plurilingüe',
          description: 'Habilidad de utilizar distintas lenguas de forma apropiada y eficaz para el aprendizaje y la comunicación',
          educationalLevel
        },
        {
          code: 'STEM',
          name: 'Competencia matemática y competencia en ciencia, tecnología e ingeniería',
          description: 'Comprensión del mundo utilizando los métodos científicos, el pensamiento y representación matemáticos, la tecnología y los métodos de la ingeniería',
          educationalLevel
        },
        {
          code: 'CD',
          name: 'Competencia digital',
          description: 'Uso seguro, saludable, sostenible, crítico y responsable de las tecnologías digitales para el aprendizaje, el trabajo y la participación en la sociedad',
          educationalLevel
        },
        {
          code: 'CPSAA',
          name: 'Competencia personal, social y de aprender a aprender',
          description: 'Habilidad de reflexionar sobre uno mismo, colaborar con otros de forma constructiva, mantener la resiliencia y gestionar el aprendizaje a lo largo de la vida',
          educationalLevel
        },
        {
          code: 'CC',
          name: 'Competencia ciudadana',
          description: 'Habilidad de actuar como ciudadanos responsables y participar plenamente en la vida social y cívica',
          educationalLevel
        },
        {
          code: 'CE',
          name: 'Competencia emprendedora',
          description: 'Habilidad de actuar sobre oportunidades e ideas, transformándolas en valores para otros',
          educationalLevel
        },
        {
          code: 'CCEC',
          name: 'Competencia en conciencia y expresión culturales',
          description: 'Comprensión y respeto de diferentes formas de expresión cultural, así como el desarrollo de las capacidades estéticas y creativas',
          educationalLevel
        }
      ];

      const createdCompetencies = [];
      for (const compData of competenciesData) {
        // Verificar si la competencia ya existe por código y nivel educativo
        const existingCompetency = await this.competenciesRepository.findOne({
          where: { 
            code: compData.code,
            educationalLevel: { id: educationalLevel.id }
          }
        });

        if (!existingCompetency) {
          const competency = this.competenciesRepository.create(compData);
          const saved = await this.competenciesRepository.save(competency);
          createdCompetencies.push(saved);
          console.log(`✓ Competencia creada: ${compData.code} - ${compData.name}`);
        } else {
          createdCompetencies.push(existingCompetency);
          console.log(`→ Competencia ya existe: ${compData.code} - ${compData.name}`);
        }
      }

      // 3. Crear evaluaciones de prueba
      const students = await this.studentsRepository.find({
        relations: ['user', 'user.profile'],
        take: 3 // Solo para los primeros 3 estudiantes
      });

      const teachers = await this.teachersRepository.find({
        relations: ['user', 'user.profile'],
        take: 2 // Solo para los primeros 2 profesores
      });

      const subjects = await this.subjectsRepository.find({
        take: 3 // Solo para las primeras 3 asignaturas
      });

      const activePeriod = periods.find(p => p.isActive) || periods[0];

      const createdEvaluations = [];
      let evaluationCount = 0;

      for (const student of students) {
        for (const subject of subjects) {
          for (const teacher of teachers) {
            if (evaluationCount >= 6) break; // Máximo 6 evaluaciones

            // Crear competency evaluations aleatorias
            const competencyEvaluations = createdCompetencies.slice(0, 4).map(comp => ({
              competencyId: comp.id,
              score: Math.floor(Math.random() * 3) + 3, // Puntajes entre 3-5
              observations: `Observaciones de ${comp.name} para ${student.user.profile.firstName}`
            }));

            const evaluationDto: CreateEvaluationDto = {
              studentId: student.id,
              teacherId: teacher.id,
              subjectId: subject.id,
              periodId: activePeriod.id,
              generalObservations: `Evaluación de prueba para ${student.user.profile.firstName} ${student.user.profile.lastName} en ${subject.name}`,
              competencyEvaluations
            };

            try {
              const evaluation = await this.create(evaluationDto);
              createdEvaluations.push(evaluation);
              evaluationCount++;
            } catch (error) {
              // Ignorar errores de duplicados
              console.log(`Error creando evaluación: ${error.message}`);
            }
          }
        }
      }

      return {
        message: 'Datos de prueba creados exitosamente',
        data: {
          periodsCreated: periods.length,
          competenciesCreated: createdCompetencies.length,
          evaluationsCreated: createdEvaluations.length,
          studentsWithEvaluations: students.length,
          teachersUsed: teachers.length,
          subjectsUsed: subjects.length
        }
      };

    } catch (error) {
      throw new BadRequestException(`Error creando datos de prueba: ${error.message}`);
    }
  }

  async getEvaluationStats() {
    try {
      const [
        totalEvaluations,
        draftEvaluations,
        submittedEvaluations,
        reviewedEvaluations,
        finalizedEvaluations
      ] = await Promise.all([
        this.evaluationsRepository.count(),
        this.evaluationsRepository.count({ where: { status: EvaluationStatus.DRAFT } }),
        this.evaluationsRepository.count({ where: { status: EvaluationStatus.SUBMITTED } }),
        this.evaluationsRepository.count({ where: { status: EvaluationStatus.REVIEWED } }),
        this.evaluationsRepository.count({ where: { status: EvaluationStatus.FINALIZED } })
      ]);

      // Calcular promedio de puntuaciones (de evaluaciones finalizadas)
      const evaluationsWithScores = await this.evaluationsRepository.find({
        where: { status: EvaluationStatus.FINALIZED },
        select: ['overallScore']
      });

      const averageScore = evaluationsWithScores.length > 0
        ? evaluationsWithScores.reduce((sum, evaluation) => sum + (evaluation.overallScore || 0), 0) / evaluationsWithScores.length
        : 0;

      const completionRate = totalEvaluations > 0 
        ? (finalizedEvaluations / totalEvaluations) * 100 
        : 0;

      // Mapear a formato esperado por el frontend
      return {
        total: totalEvaluations,
        completed: finalizedEvaluations,
        pending: submittedEvaluations + reviewedEvaluations,
        overdue: draftEvaluations, // Las evaluaciones en borrador se consideran pendientes/atrasadas
        averageScore: Math.round(averageScore * 10) / 10,
        completionRate: Math.round(completionRate * 10) / 10
      };
    } catch (error) {
      throw new BadRequestException(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  // ==================== CRUD PERÍODOS DE EVALUACIÓN ====================

  async createPeriod(createPeriodDto: any): Promise<EvaluationPeriod> {
    try {
      // Obtener año académico
      const academicYear = await this.academicYearsRepository.findOne({
        where: { id: createPeriodDto.academicYearId }
      });

      if (!academicYear) {
        throw new NotFoundException('Año académico no encontrado');
      }

      const period = this.evaluationPeriodsRepository.create({
        name: createPeriodDto.name,
        type: createPeriodDto.type,
        startDate: new Date(createPeriodDto.startDate),
        endDate: new Date(createPeriodDto.endDate),
        isActive: createPeriodDto.isActive || false,
        academicYear
      });

      return await this.evaluationPeriodsRepository.save(period);
    } catch (error) {
      throw new BadRequestException(`Error creando período: ${error.message}`);
    }
  }

  async getPeriod(id: string): Promise<EvaluationPeriod> {
    const period = await this.evaluationPeriodsRepository.findOne({
      where: { id },
      relations: ['academicYear']
    });

    if (!period) {
      throw new NotFoundException('Período no encontrado');
    }

    return period;
  }

  async updatePeriod(id: string, updatePeriodDto: any): Promise<EvaluationPeriod> {
    const period = await this.getPeriod(id);
    const wasActive = period.isActive;

    if (updatePeriodDto.name) period.name = updatePeriodDto.name;
    if (updatePeriodDto.type) period.type = updatePeriodDto.type;
    if (updatePeriodDto.startDate) period.startDate = new Date(updatePeriodDto.startDate);
    if (updatePeriodDto.endDate) period.endDate = new Date(updatePeriodDto.endDate);
    if (updatePeriodDto.isActive !== undefined) period.isActive = updatePeriodDto.isActive;

    if (updatePeriodDto.academicYearId) {
      const academicYear = await this.academicYearsRepository.findOne({
        where: { id: updatePeriodDto.academicYearId }
      });
      if (!academicYear) {
        throw new NotFoundException('Año académico no encontrado');
      }
      period.academicYear = academicYear;
    }

    const saved = await this.evaluationPeriodsRepository.save(period);

    // Auto-sync expediente when a period transitions from active to closed (fire-and-forget).
    // The .catch() swallows any error so the period update NEVER fails due to this hook.
    if (wasActive && updatePeriodDto.isActive === false) {
      this.triggerExpedienteSync(saved).catch((e) =>
        this.logger?.warn?.(`Sync expediente al cerrar periodo falló (ignorado): ${e?.message}`)
      );
    }

    return saved;
  }

  /** Defensive wrapper — never rethrows. Tolerates the expedientes module being disabled. */
  private async triggerExpedienteSync(period: EvaluationPeriod): Promise<void> {
    try {
      await this.academicRecordsSyncService.syncByPeriodClose(period);
    } catch (e: any) {
      // Swallowed: NotFound if 'expedientes' off, DB errors, etc.
    }
  }

  async deletePeriod(id: string): Promise<void> {
    const period = await this.getPeriod(id);
    
    // Verificar si hay evaluaciones asociadas
    const evaluationsCount = await this.evaluationsRepository.count({
      where: { period: { id } }
    });

    if (evaluationsCount > 0) {
      throw new BadRequestException('No se puede eliminar el período porque tiene evaluaciones asociadas');
    }

    await this.evaluationPeriodsRepository.remove(period);
  }
}