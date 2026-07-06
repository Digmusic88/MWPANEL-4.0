import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { TaskSubmission } from '../tasks/entities/task-submission.entity';
import { ActivityAssessment } from '../activities/entities/activity-assessment.entity';
import { CompetencyEvaluation } from '../evaluations/entities/competency-evaluation.entity';
import { ExamGrade } from '../tasks/entities/exam-grade.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { FamilyStudent } from '../users/entities/family.entity';
import { StudentGradesResponseDto, ClassGradesResponseDto, SubjectGradeDto, GradeDetailDto } from './dto/student-grades.dto';
import { UserRole } from '../users/entities/user.entity';
import * as dayjs from 'dayjs';

export interface AvailableYearDto {
  id: string;
  name: string;
  isCurrent: boolean;
  isArchived: boolean;
}

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(TaskSubmission)
    private taskSubmissionRepository: Repository<TaskSubmission>,
    @InjectRepository(ActivityAssessment)
    private activityAssessmentRepository: Repository<ActivityAssessment>,
    @InjectRepository(ExamGrade)
    private examGradeRepository: Repository<ExamGrade>,
    @InjectRepository(Evaluation)
    private evaluationRepository: Repository<Evaluation>,
    @InjectRepository(SubjectAssignment)
    private subjectAssignmentRepository: Repository<SubjectAssignment>,
    @InjectRepository(ClassGroup)
    private classGroupRepository: Repository<ClassGroup>,
    @InjectRepository(FamilyStudent)
    private familyStudentRepository: Repository<FamilyStudent>,
  ) {}

  /**
   * Get all grades for a specific student
   */
  async getStudentGrades(
    studentId: string,
    userId: string,
    userRole: UserRole,
    academicYearId?: string,
  ): Promise<StudentGradesResponseDto> {
    // Verify access permissions
    await this.verifyStudentAccess(studentId, userId, userRole);

    // Default: un año a la vez. Si no se pasa academicYearId, usar el año actual.
    // Si tampoco hay año actual configurado, effectiveYearId queda undefined y
    // no se aplica filtro (comportamiento legacy, no rompe).
    let effectiveYearId = academicYearId;
    if (!effectiveYearId) {
      const currentYear = await this.subjectAssignmentRepository.manager.findOne(
        AcademicYear,
        { where: { isCurrent: true } },
      );
      effectiveYearId = currentYear?.id;
    }

    // Get student with relations
    const student = await this.studentRepository.findOne({
      where: { id: studentId },
      relations: [
        'user.profile',
        'classGroups',
        'educationalLevel',
        'course',
      ],
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }


    // Get task submissions with proper relations FIRST (needed to find subjects)
    // ONLY include submissions where task is PUBLISHED or CLOSED (visible to students/families)
    // DRAFT and ARCHIVED tasks are NOT visible
    const taskSubmissionsQuery = this.taskSubmissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.task', 'task')
      .leftJoinAndSelect('task.subjectAssignment', 'subjectAssignment')
      .leftJoinAndSelect('subjectAssignment.subject', 'subject')
      .where('submission.studentId = :studentId', { studentId })
      .andWhere('task.status IN (:...statuses)', { statuses: ['published', 'closed'] })
      // EXCLUIR Test Yourself de task_submissions: Los Test Yourself usan exam_grades, no task_submissions
      // Las tareas antiguas creadas como "exam" con submissions son tareas mal categorizadas
      .andWhere('task.isTestYourself = :notTestYourself', { notTestYourself: false });

    if (effectiveYearId) {
      taskSubmissionsQuery.andWhere('task.academicYearId = :academicYearId', {
        academicYearId: effectiveYearId,
      });
    }

    const taskSubmissions = await taskSubmissionsQuery
      .orderBy('submission.submittedAt', 'DESC')
      .getMany();

    // Get activity assessments with proper relations
    // Alumno y familia ven las notas a la vez: solo se muestran las publicadas
    // (visibleToFamilies = true). El profesor/admin las ve siempre.
    const activityWhere: any = { studentId };
    if (userRole === UserRole.FAMILY || userRole === UserRole.STUDENT) {
      activityWhere.activity = { visibleToFamilies: true };
    }
    if (effectiveYearId) {
      activityWhere.activity = {
        ...(activityWhere.activity || {}),
        academicYearId: effectiveYearId,
      };
    }
    const activityAssessments = await this.activityAssessmentRepository.find({
      where: activityWhere,
      relations: ['activity', 'activity.subjectAssignment', 'activity.subjectAssignment.subject'],
      order: { assessedAt: 'DESC' },
    });

    // Get competency evaluations
    const evaluationWhere: any = { student: { id: studentId } };
    if (effectiveYearId) {
      evaluationWhere.academicYearId = effectiveYearId;
    }
    const evaluations = await this.evaluationRepository.find({
      where: evaluationWhere,
      relations: ['competencyEvaluations.competency', 'subject'],
      order: { createdAt: 'DESC' },
    });

    // Get exam grades (Test Yourself)
    // Include grades where task is PUBLISHED, CLOSED, or ARCHIVED (archived tasks still have valid grades)
    // For families, also check visibleToFamilies flag
    const examGradesQuery = this.examGradeRepository
      .createQueryBuilder('examGrade')
      .leftJoinAndSelect('examGrade.task', 'task')
      .leftJoinAndSelect('task.subjectAssignment', 'subjectAssignment')
      .leftJoinAndSelect('subjectAssignment.subject', 'subject')
      .where('examGrade.studentId = :studentId', { studentId })
      .andWhere('task.status IN (:...statuses)', { statuses: ['published', 'closed', 'archived'] });

    // Para familias, solo mostrar Test Yourself si visibleToFamilies = true
    // Las calificaciones de Test Yourself SÍ deben aparecer en "Mis Calificaciones"
    // Lo que NO aparece son las TAREAS en los listados de tareas pendientes
    if (userRole === UserRole.FAMILY) {
      examGradesQuery.andWhere('(task.isTestYourself = false OR task.visibleToFamilies = true)');
    }

    if (effectiveYearId) {
      examGradesQuery.andWhere('examGrade.academicYearId = :academicYearId', {
        academicYearId: effectiveYearId,
      });
    }

    const examGrades = await examGradesQuery
      .orderBy('examGrade.gradedAt', 'DESC')
      .getMany();

    // Get all subject assignments - combining class-based and task-based
    // This makes the system more robust for students without class assignments
    const subjectAssignments = await this.getStudentSubjectAssignmentsRobust(
      student,
      taskSubmissions,
      activityAssessments,
      examGrades,
    );

    // Calculate grades by subject
    const subjectGrades = this.calculateSubjectGrades(
      subjectAssignments,
      taskSubmissions,
      activityAssessments,
      evaluations,
      examGrades,
    );

    // Get recent grade details
    const recentGrades = this.getRecentGradeDetails(
      taskSubmissions,
      activityAssessments,
      evaluations,
      examGrades,
    );

    // Calculate summary
    const summary = this.calculateStudentSummary(
      subjectGrades,
      taskSubmissions,
      activityAssessments,
      examGrades,
    );

    return {
      student: {
        id: student.id,
        enrollmentNumber: student.enrollmentNumber,
        firstName: student.user.profile.firstName,
        lastName: student.user.profile.lastName,
        classGroup: student.classGroups[0] ? {
          id: student.classGroups[0].id,
          name: student.classGroups[0].name,
        } : null,
        educationalLevel: student.educationalLevel ? {
          id: student.educationalLevel.id,
          name: student.educationalLevel.name,
        } : null,
      },
      summary,
      subjectGrades,
      recentGrades,
      academicPeriod: {
        current: this.getCurrentPeriod(),
        year: dayjs().format('YYYY'),
      },
    };
  }

  /**
   * Devuelve los años académicos que tienen datos (notas centralizadas o
   * asistencia) para un alumno. Reusa verifyStudentAccess para el scoping.
   * Orden: startDate desc. Vacío -> [].
   */
  async getStudentAvailableYears(
    studentId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<AvailableYearDto[]> {
    // Mismo scoping que las notas (403 si no tiene acceso)
    await this.verifyStudentAccess(studentId, userId, userRole);

    const sql = `
      SELECT ay.id, ay.name, ay."isCurrent", ay."isArchived"
      FROM academic_years ay
      WHERE ay.id IN (
        SELECT DISTINCT cg."academicYearId"
        FROM centralized_grades cg
        WHERE cg."student_id" = $1 AND cg."academicYearId" IS NOT NULL
        UNION
        SELECT DISTINCT ar."academicYearId"
        FROM attendance_records ar
        WHERE ar."studentId" = $1 AND ar."academicYearId" IS NOT NULL
      )
      ORDER BY ay."startDate" DESC
    `;

    const rows = await this.subjectAssignmentRepository.manager.query(sql, [studentId]);

    return (rows || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      isCurrent: row.isCurrent === true || row.isCurrent === 't',
      isArchived: row.isArchived === true || row.isArchived === 't',
    }));
  }

  /**
   * Get grades for all students in a class (teacher view)
   */
  async getClassGrades(
    classGroupId: string,
    subjectId: string,
    teacherId: string,
  ): Promise<ClassGradesResponseDto> {
    
    // Verify teacher assignment
    const subjectAssignment = await this.subjectAssignmentRepository.findOne({
      where: {
        classGroupId: classGroupId,
        subjectId: subjectId,
        teacherId: teacherId,
      },
      relations: ['subject', 'classGroup'],
    });

    if (!subjectAssignment) {
      throw new ForbiddenException('No tienes asignada esta clase/asignatura');
    }
    
    // Get all students in the class
    const classGroup = await this.classGroupRepository.findOne({
      where: { id: classGroupId },
      relations: ['students.user.profile', 'students.educationalLevel', 'students.course'],
    });

    if (!classGroup) {
      throw new NotFoundException('Grupo de clase no encontrado');
    }

    // Filtrar solo estudiantes activos
    const activeStudents = classGroup.students.filter(student => student.user?.isActive === true);

    // Calculate grades for each student
    const studentsWithGrades = await Promise.all(
      activeStudents.map(async (student) => {
        const taskSubmissions = await this.taskSubmissionRepository
          .createQueryBuilder('submission')
          .leftJoinAndSelect('submission.task', 'task')
          .where('submission.studentId = :studentId', { studentId: student.id })
          .andWhere('task.subjectAssignmentId = :subjectAssignmentId', { subjectAssignmentId: subjectAssignment.id })
          // EXCLUIR Test Yourself: usan exam_grades, no task_submissions
          .andWhere('task.isTestYourself = :notTestYourself', { notTestYourself: false })
          .getMany();

        const activityAssessments = await this.activityAssessmentRepository.find({
          where: {
            studentId: student.id,
            activity: { subjectAssignmentId: subjectAssignment.id },
          },
          relations: ['activity'],
        });

        // Get exam grades (Test Yourself) for this subject
        // Include archived status since archived tasks still have valid grades
        const examGrades = await this.examGradeRepository
          .createQueryBuilder('examGrade')
          .leftJoinAndSelect('examGrade.task', 'task')
          .where('examGrade.studentId = :studentId', { studentId: student.id })
          .andWhere('task.subjectAssignmentId = :subjectAssignmentId', {
            subjectAssignmentId: subjectAssignment.id
          })
          .andWhere('task.status IN (:...statuses)', { statuses: ['published', 'closed', 'archived'] })
          .getMany();

        const grades = this.calculateStudentSubjectGrade(
          taskSubmissions,
          activityAssessments,
          examGrades,
        );

        return {
          id: student.id,
          enrollmentNumber: student.enrollmentNumber,
          firstName: student.user.profile.firstName,
          lastName: student.user.profile.lastName,
          grades,
        };
      }),
    );

    // Calculate class statistics
    const statistics = this.calculateClassStatistics(studentsWithGrades);

    return {
      classGroup: {
        id: classGroup.id,
        name: classGroup.name,
        level: activeStudents[0]?.educationalLevel?.name || '',
        course: activeStudents[0]?.course?.name || '',
      },
      subject: {
        id: subjectAssignment.subject.id,
        name: subjectAssignment.subject.name,
        code: subjectAssignment.subject.code,
      },
      students: studentsWithGrades,
      statistics,
    };
  }

  /**
   * Private helper methods
   */
  private async verifyStudentAccess(
    studentId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    switch (userRole) {
      case UserRole.STUDENT:
        const student = await this.studentRepository.findOne({
          where: { id: studentId, user: { id: userId } },
        });
        if (!student) {
          throw new ForbiddenException('No tienes acceso a estas calificaciones');
        }
        break;

      case UserRole.FAMILY:
        const familyStudent = await this.familyStudentRepository
          .createQueryBuilder('familyStudent')
          .innerJoin('familyStudent.family', 'family')
          .innerJoin('family.primaryContact', 'primaryContact')
          .leftJoin('family.secondaryContact', 'secondaryContact')
          .where('familyStudent.studentId = :studentId', { studentId })
          .andWhere('(primaryContact.id = :userId OR secondaryContact.id = :userId)', { userId })
          .getOne();

        if (!familyStudent) {
          throw new ForbiddenException('No tienes acceso a estas calificaciones');
        }
        break;

      case UserRole.TEACHER:
        // Teachers can see grades for students in their classes
        const teacherRecord = await this.teacherRepository.findOne({ 
          where: { user: { id: userId } },
          relations: ['user']
        });
        
        if (!teacherRecord) {
          throw new ForbiddenException('Profesor no encontrado');
        }

        // Check access using raw SQL to avoid TypeORM relation issues
        const hasAccessQuery = `
          SELECT COUNT(*) as count
          FROM subject_assignments sa
          JOIN class_groups cg ON sa."classGroupId" = cg.id
          JOIN class_students cs ON cs."classId" = cg.id
          WHERE cs."studentId" = $1 AND sa."teacherId" = $2
        `;
        
        const result = await this.subjectAssignmentRepository.query(hasAccessQuery, [studentId, teacherRecord.id]);
        const hasAccess = parseInt(result[0]?.count || '0', 10);

        if (hasAccess === 0) {
          throw new ForbiddenException('No tienes acceso a estas calificaciones');
        }
        break;

      case UserRole.ADMIN:
        // Admins have full access
        break;

      default:
        throw new ForbiddenException('Rol no autorizado');
    }
  }

  /**
   * Devuelve las asignaciones de asignatura de un alumno (por sus classGroups),
   * opcionalmente filtradas por año académico, con la relación `subject` cargada.
   * Público: consumido por otros módulos (SP-D, informe automático detallado).
   */
  async getStudentSubjectAssignmentsForYear(
    studentId: string,
    academicYearId?: string,
  ): Promise<SubjectAssignment[]> {
    const student = await this.studentRepository.findOne({
      where: { id: studentId },
      relations: ['classGroups'],
    });
    const classGroupIds = (student?.classGroups || []).map(cg => cg.id);
    if (classGroupIds.length === 0) {
      return [];
    }
    const where: any[] = classGroupIds.map(id => academicYearId
      ? ({ classGroup: { id }, academicYearId })
      : ({ classGroup: { id } }));
    return this.subjectAssignmentRepository.find({ where, relations: ['subject'] });
  }

  private async getStudentSubjectAssignments(student: Student): Promise<SubjectAssignment[]> {
    const classGroupIds = student.classGroups.map(cg => cg.id);

    if (classGroupIds.length === 0) {
      return [];
    }

    const assignments = await this.subjectAssignmentRepository.find({
      where: classGroupIds.map(id => ({ classGroup: { id } })),
      relations: ['subject', 'teacher.user.profile'],
    });

    return assignments;
  }

  /**
   * Get student subject assignments in a robust way
   * Combines class-based assignments with assignments from existing tasks
   * This handles cases where students have tasks but aren't assigned to classes
   */
  private async getStudentSubjectAssignmentsRobust(
    student: Student,
    taskSubmissions: TaskSubmission[],
    activityAssessments: ActivityAssessment[],
    examGrades: ExamGrade[],
  ): Promise<SubjectAssignment[]> {
    const assignmentIds = new Set<string>();
    const assignments: SubjectAssignment[] = [];

    // Method 1: Get from class groups (standard way)
    const classGroupIds = student.classGroups?.map(cg => cg.id) || [];
    if (classGroupIds.length > 0) {
      const classAssignments = await this.subjectAssignmentRepository.find({
        where: classGroupIds.map(id => ({ classGroup: { id } })),
        relations: ['subject', 'teacher.user.profile'],
      });

      classAssignments.forEach(assignment => {
        if (!assignmentIds.has(assignment.id)) {
          assignmentIds.add(assignment.id);
          assignments.push(assignment);
        }
      });
    }

    // Method 2: Get from task submissions (robust fallback)
    const taskAssignmentIds = taskSubmissions
      .map(ts => ts.task?.subjectAssignmentId)
      .filter(id => id && !assignmentIds.has(id));

    if (taskAssignmentIds.length > 0) {
      const taskAssignments = await this.subjectAssignmentRepository.find({
        where: taskAssignmentIds.map(id => ({ id })),
        relations: ['subject', 'teacher.user.profile'],
      });

      taskAssignments.forEach(assignment => {
        if (!assignmentIds.has(assignment.id)) {
          assignmentIds.add(assignment.id);
          assignments.push(assignment);
        }
      });
    }

    // Method 3: Get from activity assessments
    const activityAssignmentIds = activityAssessments
      .map(aa => aa.activity?.subjectAssignmentId)
      .filter(id => id && !assignmentIds.has(id));

    if (activityAssignmentIds.length > 0) {
      const activityAssignments = await this.subjectAssignmentRepository.find({
        where: activityAssignmentIds.map(id => ({ id })),
        relations: ['subject', 'teacher.user.profile'],
      });

      activityAssignments.forEach(assignment => {
        if (!assignmentIds.has(assignment.id)) {
          assignmentIds.add(assignment.id);
          assignments.push(assignment);
        }
      });
    }

    // Method 4: Get from exam grades
    const examAssignmentIds = examGrades
      .map(eg => eg.task?.subjectAssignmentId)
      .filter(id => id && !assignmentIds.has(id));

    if (examAssignmentIds.length > 0) {
      const examAssignments = await this.subjectAssignmentRepository.find({
        where: examAssignmentIds.map(id => ({ id })),
        relations: ['subject', 'teacher.user.profile'],
      });

      examAssignments.forEach(assignment => {
        if (!assignmentIds.has(assignment.id)) {
          assignmentIds.add(assignment.id);
          assignments.push(assignment);
        }
      });
    }

    return assignments;
  }

  private calculateSubjectGrades(
    subjectAssignments: SubjectAssignment[],
    taskSubmissions: TaskSubmission[],
    activityAssessments: ActivityAssessment[],
    evaluations: Evaluation[],
    examGrades: ExamGrade[],
  ): SubjectGradeDto[] {
    // IMPORTANTE: Agrupar subject assignments por NOMBRE de asignatura para evitar duplicados visuales
    // Un estudiante puede tener múltiples assignments para la misma asignatura con diferentes códigos
    // (ej: GH-2ESO, GH-3ESO, GH-4ESO para "Geografía e Historia")
    // pero solo queremos mostrar una tarjeta por nombre de asignatura
    const uniqueSubjectsMap = new Map<string, SubjectAssignment>();
    for (const assignment of subjectAssignments) {
      const subjectName = assignment.subject.name;
      // Si ya existe, mantener el que tenga el código más bajo (primer nivel) o el primero encontrado
      if (!uniqueSubjectsMap.has(subjectName)) {
        uniqueSubjectsMap.set(subjectName, assignment);
      }
    }

    const uniqueAssignments = Array.from(uniqueSubjectsMap.values());

    return uniqueAssignments.map(assignment => {
      // Filter data for this subject - check by NOMBRE de asignatura para agrupar diferentes niveles
      // (ej: GH-2ESO, GH-3ESO, GH-4ESO todos agrupados bajo "Geografía e Historia")
      const subjectName = assignment.subject.name;

      const subjectTasks = taskSubmissions.filter(ts => {
        const taskSubjectName = ts.task?.subjectAssignment?.subject?.name;
        return taskSubjectName === subjectName;
      });

      const subjectActivities = activityAssessments.filter(aa => {
        const activitySubjectName = aa.activity?.subjectAssignment?.subject?.name;
        return activitySubjectName === subjectName;
      });

      // Filter evaluations for this specific subject by name
      const subjectEvaluations = evaluations.filter(
        evaluation => evaluation.subject?.name === subjectName
      );

      // Filter exam grades (Test Yourself) for this subject by name
      const subjectExamGrades = examGrades.filter(
        eg => eg.task.subjectAssignment?.subject?.name === subjectName
      );

      // Calculate averages - only using evaluations for this subject
      const taskAverage = this.calculateTaskAverage(subjectTasks);
      const activityAverage = this.calculateActivityAverage(subjectActivities);
      const competencyAverage = this.calculateCompetencyAverage(subjectEvaluations);
      const examAverage = this.calculateExamAverage(subjectExamGrades);

      // Calculate overall average with weights
      // Use only non-null and non-NaN values for calculation
      const validAverages = [];
      if (taskAverage !== null && taskAverage !== undefined && !isNaN(taskAverage)) {
        validAverages.push(taskAverage);
      }
      if (activityAverage !== null && activityAverage !== undefined && !isNaN(activityAverage)) {
        validAverages.push(activityAverage);
      }
      if (competencyAverage !== null && competencyAverage !== undefined && !isNaN(competencyAverage)) {
        validAverages.push(competencyAverage);
      }
      if (examAverage !== null && examAverage !== undefined && !isNaN(examAverage)) {
        validAverages.push(examAverage);
      }
      
      const overallAverage = validAverages.length > 0
        ? validAverages.reduce((sum, avg) => sum + avg, 0) / validAverages.length
        : null; // null cuando no hay datos válidos
      

      // Count tasks - only include active tasks and EXCLUDE Test Yourself
      // Test Yourself should NOT appear as tasks (they're exams/evaluations)
      const gradedTasks = subjectTasks.filter(t =>
        t.isGraded &&
        t.task?.isActive !== false &&
        t.task?.isTestYourself !== true
      ).length;

      const pendingTasks = Math.max(0, subjectTasks.filter(t =>
        !t.isGraded &&
        t.task?.isActive !== false &&
        t.task?.isTestYourself !== true
      ).length);

      // Count exam grades (Test Yourself)
      const examGradedCount = subjectExamGrades.filter(eg =>
        eg.numericGrade !== null && eg.numericGrade !== undefined
      ).length;

      // Pending exams - exams without grades (if task has submissions but no grade)
      // For now, we only count graded exams since exam_grades table only contains graded exams
      const examPendingCount = 0; // Test Yourself tasks are auto-graded, so no pending

      // Find last update - include examGrades (Test Yourself) dates
      // Convert all dates to Date objects and filter valid ones
      const rawDates = [
        ...subjectTasks.filter(t => t.isGraded).map(t => t.gradedAt),
        ...subjectActivities.map(a => a.assessedAt),
        ...subjectExamGrades.map(eg => eg.gradedAt), // Include Test Yourself grading dates
      ];

      const lastDates = rawDates
        .map(d => {
          if (!d) return null;
          // Handle both Date objects and string dates
          const dateObj = d instanceof Date ? d : new Date(d);
          return !isNaN(dateObj.getTime()) ? dateObj : null;
        })
        .filter((d): d is Date => d !== null);

      const lastUpdated = lastDates.length > 0
        ? new Date(Math.max(...lastDates.map(d => d.getTime())))
        : null; // Return null when there's no data, not current date

      // FIX CRITICAL: Frontend expects number type for averageGrade, not string
      // Convert "sin datos" to null to match TypeScript interface
      const safeAverageGrade = (overallAverage !== null && overallAverage !== undefined && !isNaN(overallAverage)) ? overallAverage : null;
      const safeTaskAverage = (taskAverage !== null && taskAverage !== undefined && !isNaN(taskAverage)) ? taskAverage : null;
      const safeActivityAverage = (activityAverage !== null && activityAverage !== undefined && !isNaN(activityAverage)) ? activityAverage : null;
      const safeCompetencyAverage = (competencyAverage !== null && competencyAverage !== undefined && !isNaN(competencyAverage)) ? competencyAverage : null;

      // Extraer información del profesor de la asignación
      const teacherFirstName = assignment.teacher?.user?.profile?.firstName || null;
      const teacherLastName = assignment.teacher?.user?.profile?.lastName || null;

      // Calcular total de evaluaciones (exámenes + actividades + tareas calificadas)
      const totalEvaluations = examGradedCount + subjectActivities.length + gradedTasks;

      return {
        subjectId: assignment.subject.id,
        subjectName: assignment.subject.name,
        subjectCode: assignment.subject.code,
        teacherFirstName,
        teacherLastName,
        totalEvaluations,
        averageGrade: safeAverageGrade, // Number or null, never string
        taskAverage: safeTaskAverage,
        activityAverage: safeActivityAverage,
        competencyAverage: safeCompetencyAverage,
        examAverage: examAverage, // Exam (Test Yourself) average
        gradedTasks,
        pendingTasks,
        examGradedCount, // Number of graded Test Yourself exams
        examPendingCount, // Number of pending Test Yourself exams (always 0 - auto-graded)
        activityAssessments: subjectActivities.length,
        lastUpdated,
      };
    });
  }

  private calculateExamAverage(examGrades: ExamGrade[]): number | null {
    if (!examGrades || examGrades.length === 0) {
      return null;
    }

    // Convert string grades to numbers and filter valid grades
    const validGrades = examGrades
      .map(grade => {
        // Convert string to number if needed (database stores as string)
        const numericValue = typeof grade.numericGrade === 'string'
          ? parseFloat(grade.numericGrade)
          : grade.numericGrade;

        return { ...grade, numericValue };
      })
      .filter(grade => {
        const isValid = typeof grade.numericValue === 'number' && !isNaN(grade.numericValue);
        return isValid;
      });

    if (validGrades.length === 0) {
      return null;
    }

    // Calculate average as percentage (proportional to each task's maxPoints)
    const sum = validGrades.reduce((acc, grade) => {
      const maxPoints = Number(grade.task?.maxPoints) || 100;
      return acc + (grade.numericValue / maxPoints) * 100;
    }, 0);
    const average = sum / validGrades.length;

    return Math.round(average * 10) / 10; // Round to 1 decimal place
  }

  private calculateTaskAverage(tasks: TaskSubmission[]): number | null {
    const gradedTasks = tasks.filter(t => t.isGraded && t.finalGrade !== null);
    
    if (gradedTasks.length === 0) {
      return null;
    }

    // NUEVA LÓGICA PROPORCIONAL: Todas las tareas se convierten a base 100
    const validTasks = [];
    
    for (const task of gradedTasks) {
      // Para tareas CON rúbrica: finalGrade ya está en base 100, siempre incluir
      if (task.task.rubricId) {
        validTasks.push(task);
      }
      // Para tareas SIN rúbrica: necesitan maxPoints válido para conversión proporcional
      else {
        const maxPoints = task.task.maxPoints;
        if (maxPoints !== null && maxPoints !== undefined && !isNaN(maxPoints) && maxPoints > 0) {
          validTasks.push(task);
        }
      }
    }

    if (validTasks.length === 0) {
      return null;
    }

    const totalGrade = validTasks.reduce((sum, task) => {
      // CRITICAL FIX: Ensure sum is always a number to prevent string concatenation
      const numericSum = Number(sum);
      
      // LÓGICA PROPORCIONAL: Convertir SIEMPRE a base 100
      if (task.task.rubricId) {
        // Para tareas con rúbrica: finalGrade ya está en escala 0-100
        const numericGrade = parseFloat(task.finalGrade);
        if (isNaN(numericGrade)) {
          console.error('[GRADES ERROR] finalGrade is NaN for task:', task.task?.title, 'value:', task.finalGrade);
          return numericSum; // Skip NaN values
        }
        const result = numericSum + numericGrade;
        return result;
      } else {
        // Para tareas sin rúbrica: convertir proporcionalmente a base 100
        const numericGrade = Number(task.finalGrade);
        const numericMaxPoints = Number(task.task.maxPoints);
        if (isNaN(numericGrade) || isNaN(numericMaxPoints) || numericMaxPoints <= 0) {
          console.error('[GRADES ERROR] Invalid values for non-rubric task:', {
            title: task.task?.title,
            finalGrade: task.finalGrade,
            maxPoints: task.task.maxPoints,
            numericGrade,
            numericMaxPoints
          });
          return numericSum; // Skip invalid values
        }
        const percentage = (numericGrade / numericMaxPoints) * 100;
        const result = numericSum + percentage;
        return result;
      }
    }, 0);

    const average = totalGrade / validTasks.length;
    
    // Redondear a un decimal
    return Math.round(average * 10) / 10;
  }

  private calculateActivityAverage(assessments: ActivityAssessment[]): number | null {
    const numericAssessments = assessments.filter(a => {
      return a.activity.valuationType === 'score' && !isNaN(parseFloat(a.value));
    });

    if (numericAssessments.length === 0) {
      return null;
    }

    const totalScore = numericAssessments.reduce((sum, assessment) => {
      const score = parseFloat(assessment.value);
      const maxScore = assessment.activity.maxScore || 10;
      const percentage = (score / maxScore) * 100;
      return sum + percentage;
    }, 0);

    const average = totalScore / numericAssessments.length;
    
    // Redondear a un decimal
    return Math.round(average * 10) / 10;
  }

  private calculateCompetencyAverage(evaluations: Evaluation[]): number | null {
    if (evaluations.length === 0) {
      return null;
    }

    // Filtrar evaluaciones con overallScore válido (no null, undefined o NaN)
    const validEvaluations = evaluations.filter(evaluation => {
      const score = evaluation.overallScore;
      return score !== null && 
             score !== undefined && 
             !isNaN(score) && 
             typeof score === 'number';
    });

    if (validEvaluations.length === 0) {
      return null;
    }

    const totalScore = validEvaluations.reduce((sum, evaluation) => {
      return sum + evaluation.overallScore;
    }, 0);

    const average = totalScore / validEvaluations.length;

    // Las competencias usan escala 1-5; normalizar a 0-100 para consistencia con tareas/actividades
    const normalized = average * 20;
    return Math.round(normalized * 10) / 10;
  }

  private getRecentGradeDetails(
    taskSubmissions: TaskSubmission[],
    activityAssessments: ActivityAssessment[],
    evaluations: Evaluation[],
    examGrades: ExamGrade[],
  ): GradeDetailDto[] {
    const details: GradeDetailDto[] = [];

    // Add all tasks (graded and ungraded) - as requested by user
    taskSubmissions
      .slice(0, 8) // Get more tasks to show both graded and ungraded
      .forEach(ts => {
        // CRITICAL FIX: Convert grade to number (TypeORM returns decimal as string)
        let gradeNumber: number | null = null;
        if (ts.isGraded && ts.finalGrade !== null) {
          gradeNumber = typeof ts.finalGrade === 'string' ? parseFloat(ts.finalGrade) : ts.finalGrade;
          if (isNaN(gradeNumber)) gradeNumber = null;
        }

        details.push({
          id: ts.id,
          type: 'task',
          title: ts.task.title,
          grade: gradeNumber,
          maxGrade: ts.task.maxPoints || 10,
          weight: 1,
          gradedAt: ts.gradedAt || ts.submittedAt || ts.task.createdAt,
          feedback: ts.teacherFeedback,
          subject: ts.task.subjectAssignment?.subject ? {
            id: ts.task.subjectAssignment.subject.id,
            name: ts.task.subjectAssignment.subject.name,
            code: ts.task.subjectAssignment.subject.code,
          } : null,
        });
      });

    // Add all activity assessments (assessed and unassessed) - as requested by user
    activityAssessments
      .slice(0, 8) // Get more activities to show both assessed and unassessed
      .forEach(aa => {
        let gradeValue = null;
        if (aa.value) {
          if (aa.activity.valuationType === 'score' && !isNaN(parseFloat(aa.value))) {
            gradeValue = parseFloat(aa.value);
          }
        }
        
        details.push({
          id: aa.id,
          type: 'activity',
          title: aa.activity.name,
          grade: gradeValue,
          maxGrade: aa.activity.maxScore || 10,
          gradedAt: aa.assessedAt || aa.activity.createdAt,
          feedback: aa.comment,
          subject: aa.activity.subjectAssignment?.subject ? {
            id: aa.activity.subjectAssignment.subject.id,
            name: aa.activity.subjectAssignment.subject.name,
            code: aa.activity.subjectAssignment.subject.code,
          } : null,
        });
      });

    // Add exam grades (Test Yourself)
    examGrades
      .filter(eg => eg.numericGrade !== null && eg.numericGrade !== undefined)
      .slice(0, 5)
      .forEach(eg => {
        // CRITICAL FIX: Convert grade to number (TypeORM returns decimal as string)
        let examGradeNumber: number | null = null;
        if (eg.numericGrade !== null && eg.numericGrade !== undefined) {
          examGradeNumber = typeof eg.numericGrade === 'string' ? parseFloat(eg.numericGrade) : eg.numericGrade;
          if (isNaN(examGradeNumber)) examGradeNumber = null;
        }

        details.push({
          id: eg.id,
          type: 'exam',
          title: eg.task.title,
          grade: examGradeNumber, // Converted to number, normalized to 0-100 scale
          maxGrade: 100, // All exam grades are normalized to 100
          gradedAt: eg.gradedAt,
          feedback: eg.comments,
          subject: eg.task.subjectAssignment?.subject ? {
            id: eg.task.subjectAssignment.subject.id,
            name: eg.task.subjectAssignment.subject.name,
            code: eg.task.subjectAssignment.subject.code,
          } : null,
        });
      });

    // Sort by date and return most recent
    // CRITICAL FIX: Handle dates that might come as strings from TypeORM
    return details
      .filter(d => d.gradedAt)
      .map(d => ({
        ...d,
        gradedAt: d.gradedAt instanceof Date ? d.gradedAt : new Date(d.gradedAt),
      }))
      .filter(d => !isNaN(d.gradedAt.getTime()))
      .sort((a, b) => b.gradedAt.getTime() - a.gradedAt.getTime())
      .slice(0, 10);
  }

  private calculateStudentSummary(
    subjectGrades: SubjectGradeDto[],
    taskSubmissions: TaskSubmission[],
    activityAssessments: ActivityAssessment[],
    examGrades: ExamGrade[],
  ) {
    const gradesWithAverage = subjectGrades.filter(sg => typeof sg.averageGrade === 'number' && sg.averageGrade !== null && sg.averageGrade >= 0);
    const overallAverage = gradesWithAverage.length > 0
      ? gradesWithAverage.reduce((sum, sg) => sum + (sg.averageGrade as number), 0) / gradesWithAverage.length
      : null; // FIX: Use null instead of "sin datos" string

    const totalGradedItems = 
      taskSubmissions.filter(ts => ts.isGraded).length +
      activityAssessments.length +
      examGrades.length; // Include exam grades in total

    const totalPendingTasks = Math.max(0, taskSubmissions.filter(ts => !ts.isGraded && ts.task?.isActive !== false).length);

    const lastActivities = [
      ...taskSubmissions.filter(ts => ts.submittedAt).map(ts => ts.submittedAt),
      ...activityAssessments.map(aa => aa.assessedAt),
      ...examGrades.map(eg => eg.gradedAt), // Include exam graded dates
    ].filter(d => d && d instanceof Date && !isNaN(d.getTime()));

    const lastActivityDate = lastActivities.length > 0
      ? new Date(Math.max(...lastActivities.map(d => d.getTime())))
      : null;

    return {
      overallAverage,
      totalSubjects: subjectGrades.length,
      totalGradedItems,
      totalPendingTasks,
      lastActivityDate,
    };
  }

  private calculateStudentSubjectGrade(
    taskSubmissions: TaskSubmission[],
    activityAssessments: ActivityAssessment[],
    examGrades: ExamGrade[] = [],
  ) {
    const taskAvg = this.calculateTaskAverage(taskSubmissions);
    const activityAvg = this.calculateActivityAverage(activityAssessments);
    const examAvg = this.calculateExamAverage(examGrades);

    const averages = [taskAvg, activityAvg, examAvg].filter(a => a !== null);
    const overallAverage = averages.length > 0
      ? averages.reduce((sum, avg) => sum + avg, 0) / averages.length
      : 0;

    const lastDates = [
      ...taskSubmissions.filter(ts => ts.submittedAt).map(ts => ts.submittedAt),
      ...activityAssessments.map(aa => aa.assessedAt),
      ...examGrades.filter(eg => eg.gradedAt).map(eg => eg.gradedAt),
    ].filter(d => d && d instanceof Date && !isNaN(d.getTime()));

    const lastActivity = lastDates.length > 0
      ? new Date(Math.max(...lastDates.map(d => d.getTime())))
      : null;

    return {
      taskAverage: taskAvg !== null ? taskAvg : 0,
      activityAverage: activityAvg !== null ? activityAvg : 0,
      testYourselfAverage: examAvg,
      overallAverage,
      gradedTasks: taskSubmissions.filter(ts => ts.isGraded && ts.task?.isTestYourself !== true).length,
      pendingTasks: Math.max(0, taskSubmissions.filter(ts => !ts.isGraded && ts.task?.isActive !== false && ts.task?.isTestYourself !== true).length),
      lastActivity,
    };
  }

  private calculateClassStatistics(studentsWithGrades: any[]) {
    const grades = studentsWithGrades.map(s => s.grades.overallAverage).filter(g => typeof g === 'number' && g > 0);
    
    if (grades.length === 0) {
      return {
        classAverage: 0,
        highestGrade: 0,
        lowestGrade: 0,
        passingRate: 0,
      };
    }

    const classAverage = grades.reduce((sum, g) => sum + g, 0) / grades.length;
    const highestGrade = Math.max(...grades);
    const lowestGrade = Math.min(...grades);
    const passingRate = Math.round(((grades.filter(g => g >= 50).length / grades.length) * 100) * 10) / 10;

    return {
      classAverage,
      highestGrade,
      lowestGrade,
      passingRate,
    };
  }

  private getCurrentPeriod(): string | null {
    const month = dayjs().month(); // 0-indexed: 0=Jan, 8=Sep, 11=Dec
    if (month >= 8) return 'Primer Trimestre';  // Sep-Dec
    if (month <= 2) return 'Segundo Trimestre'; // Jan-Mar
    if (month <= 5) return 'Tercer Trimestre';  // Apr-Jun
    return null; // Jul-Aug: no hay período activo
  }

  /**
   * Get student by user ID
   */
  async getStudentByUserId(userId: string): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    return student;
  }

  /**
   * Get teacher by user ID
   */
  async getTeacherByUserId(userId: string): Promise<Teacher> {
    const teacher = await this.teacherRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    return teacher;
  }

  /**
   * Get grades for all children of a family
   */
  async getFamilyChildrenGrades(userId: string): Promise<StudentGradesResponseDto[]> {
    // Get all students related to this family
    const familyStudents = await this.familyStudentRepository.find({
      where: [
        { family: { primaryContact: { id: userId } } },
        { family: { secondaryContact: { id: userId } } },
      ],
      relations: ['student'],
    });

    const grades = await Promise.all(
      familyStudents.map(fs => 
        this.getStudentGrades(fs.studentId, userId, UserRole.FAMILY)
      )
    );

    return grades;
  }

  /**
   * Execute raw query for debugging
   */
  async executeRawQuery(query: string, parameters: any[]) {
    return this.subjectAssignmentRepository.query(query, parameters);
  }

  /**
   * Get teacher classes summary by teacherId directly
   */
  async getTeacherClassesSummaryByTeacherId(teacherId: string) {
    // Use raw SQL query to ensure it works
    const rawQuery = `
      SELECT 
        sa.id as assignment_id,
        sa."classGroupId",
        sa."subjectId",
        s.name as subject_name,
        s.code as subject_code,
        cg.name as class_name,
        COALESCE(cs.student_count, 0) as student_count
      FROM subject_assignments sa
      LEFT JOIN subjects s ON sa."subjectId" = s.id
      LEFT JOIN class_groups cg ON sa."classGroupId" = cg.id
      LEFT JOIN (
        SELECT "classId", COUNT(*) as student_count
        FROM class_students
        GROUP BY "classId"
      ) cs ON cs."classId" = cg.id
      WHERE sa."teacherId" = $1
    `;
    
    const result = await this.subjectAssignmentRepository.query(rawQuery, [teacherId]);
    
    return result.map((row: any) => ({
      classGroup: {
        id: row.classGroupId,
        name: row.class_name,
      },
      subject: {
        id: row.subjectId,
        name: row.subject_name,
        code: row.subject_code,
      },
      studentCount: parseInt(row.student_count) || 0,
      classAverage: 8.5, // Default average for now
    }));
  }

  /**
   * Get teacher classes summary
   */
  async getTeacherClassesSummary(userId: string) {
    // First, get the teacher ID from user ID
    const teacher = await this.teacherRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    
    if (!teacher) {
      return [];
    }
    
    return this.getTeacherClassesSummaryByTeacherId(teacher.id);
  }

  /**
   * Get current academic year
   */
  private async getCurrentAcademicYear() {
    const currentYear = await this.subjectAssignmentRepository.manager.findOne(AcademicYear, {
      where: { isCurrent: true }
    });
    return currentYear;
  }

  /**
   * Get school-wide grades overview
   */
  async getSchoolGradesOverview(filters: {
    levelId?: string;
    courseId?: string;
    classGroupId?: string;
  }) {
    let query = this.classGroupRepository
      .createQueryBuilder('classGroup')
      .leftJoinAndSelect('classGroup.students', 'students')
      .leftJoinAndSelect('students.educationalLevel', 'level')
      .leftJoinAndSelect('students.course', 'course');

    if (filters.levelId) {
      query = query.where('level.id = :levelId', { levelId: filters.levelId });
    }
    if (filters.courseId) {
      query = query.andWhere('course.id = :courseId', { courseId: filters.courseId });
    }
    if (filters.classGroupId) {
      query = query.andWhere('classGroup.id = :classGroupId', { classGroupId: filters.classGroupId });
    }

    const classGroups = await query.getMany();

    const overview = await Promise.all(
      classGroups.map(async (classGroup) => {
        const students = classGroup.students || [];
        
        // Get average grades for all students in this class
        const studentGrades = await Promise.all(
          students.map(async (student) => {
            const summary = await this.getStudentGrades(
              student.id,
              student.id, // Using student ID as a placeholder for admin access
              UserRole.ADMIN,
            );
            return summary.summary.overallAverage;
          })
        );

        const validGrades = studentGrades.filter(g => typeof g === 'number' && g > 0) as number[];
        const classAverage = validGrades.length > 0
          ? validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length
          : 0;

        return {
          classGroup: {
            id: classGroup.id,
            name: classGroup.name,
            level: classGroup.students[0]?.educationalLevel?.name,
            course: classGroup.students[0]?.course?.name,
          },
          studentCount: students.length,
          classAverage,
          passingRate: validGrades.length > 0
            ? (validGrades.filter(g => g >= 50).length / validGrades.length) * 100
            : 0,
        };
      })
    );

    return {
      overview,
      totals: {
        totalClasses: overview.length,
        totalStudents: overview.reduce((sum, o) => sum + o.studentCount, 0),
        schoolAverage: overview.length > 0
          ? overview.reduce((sum, o) => sum + o.classAverage, 0) / overview.length
          : 0,
      },
    };
  }

  /**
   * Get centralized grades for all students in teacher's classes
   * Reuses the same logic as student panel for consistency
   */
  async getTeacherCentralizedGrades(teacherId: string) {
    // Get current academic year
    const currentYear = await this.getCurrentAcademicYear();
    
    // Get all subject assignments for this teacher (simplified query)
    let query = this.subjectAssignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.subject', 'subject')
      .leftJoinAndSelect('assignment.classGroup', 'classGroup')
      .leftJoinAndSelect('classGroup.students', 'students')
      .where('assignment."teacherId" = :teacherId', { teacherId });
    
    if (currentYear) {
      query = query.andWhere('assignment."academicYearId" = :academicYearId', { 
        academicYearId: currentYear.id 
      });
    }
    
    const assignments = await query.getMany();
    
    // Load user profiles for students separately to avoid join issues
    for (const assignment of assignments) {
      if (assignment.classGroup?.students) {
        for (const student of assignment.classGroup.students) {
          const fullStudent = await this.studentRepository.findOne({
            where: { id: student.id },
            relations: ['user.profile', 'educationalLevel'],
          });
          if (fullStudent) {
            student.user = fullStudent.user;
            student.educationalLevel = fullStudent.educationalLevel;
          }
        }
      }
    }
    // Process each assignment to get student grades
    const centralizedGrades = await Promise.all(
      assignments.map(async (assignment) => {
        const students = assignment.classGroup?.students || [];
        // Get grades for each student using the same logic as student panel
        const studentsWithGrades = await Promise.all(
          students.map(async (student) => {
            try {
              // FIXED: Get teacher's user ID for proper access verification
              const teacherRecord = await this.teacherRepository.findOne({
                where: { id: teacherId },
                relations: ['user']
              });
              
              if (!teacherRecord) {
                throw new Error(`Profesor no encontrado: ${teacherId}`);
              }
              
              // Reuse the exact same method that the student panel uses
              const studentGrades = await this.getStudentGrades(
                student.id,
                teacherRecord.user.id, // ✅ Pass teacher's userId for proper access verification
                UserRole.TEACHER
              );
              
              // Find grades for this specific subject
              const subjectGrade = studentGrades.subjectGrades.find(
                sg => sg.subjectId === assignment.subject.id
              );
              
              return {
                studentId: student.id,
                studentName: `${studentGrades.student.firstName} ${studentGrades.student.lastName}`,
                enrollmentNumber: studentGrades.student.enrollmentNumber,
                // Use the same calculated data from student panel
                averageGrade: subjectGrade?.averageGrade || null,
                taskAverage: subjectGrade?.taskAverage || null,
                activityAverage: subjectGrade?.activityAverage || null,
                competencyAverage: subjectGrade?.competencyAverage || null,
                gradedTasks: subjectGrade?.gradedTasks || 0,
                pendingTasks: subjectGrade?.pendingTasks || 0,
                activityAssessments: subjectGrade?.activityAssessments || 0,
                lastUpdated: subjectGrade?.lastUpdated || null,
                // Include student's overall summary for context
                overallSummary: studentGrades.summary,
              };
            } catch (error) {
              console.error(`❌ Error getting grades for student ${student.id}:`, error);
              return {
                studentId: student.id,
                studentName: student.user?.profile ? `${student.user.profile.firstName} ${student.user.profile.lastName}` : 'Nombre no disponible',
                enrollmentNumber: student.enrollmentNumber || 'N/A',
                averageGrade: null,
                taskAverage: null,
                activityAverage: null,
                competencyAverage: null,
                gradedTasks: 0,
                pendingTasks: 0,
                activityAssessments: 0,
                lastUpdated: null,
                overallSummary: null,
                error: 'Error al cargar calificaciones',
              };
            }
          })
        );
        
        // Calculate class statistics from the processed data
        const validGrades = studentsWithGrades
          .map(s => s.averageGrade)
          .filter(grade => typeof grade === 'number' && grade !== null) as number[];
        
        const classAverage = validGrades.length > 0
          ? Math.round((validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length) * 10) / 10
          : null;
        
        const highestGrade = validGrades.length > 0 ? Math.max(...validGrades) : null;
        const lowestGrade = validGrades.length > 0 ? Math.min(...validGrades) : null;
        const passingRate = validGrades.length > 0
          ? Math.round(((validGrades.filter(g => g >= 50).length / validGrades.length) * 100) * 10) / 10
          : null;
        
        return {
          assignment: {
            id: assignment.id,
            subject: {
              id: assignment.subject.id,
              name: assignment.subject.name,
              code: assignment.subject.code,
            },
            classGroup: {
              id: assignment.classGroup.id,
              name: assignment.classGroup.name,
            },
          },
          students: studentsWithGrades,
          statistics: {
            totalStudents: students.length,
            studentsWithGrades: validGrades.length,
            classAverage,
            highestGrade,
            lowestGrade,
            passingRate,
            needingAttention: studentsWithGrades.filter(s => 
              typeof s.averageGrade === 'number' && s.averageGrade < 50
            ).length,
          },
        };
      })
    );
    
    // Calculate overall teacher statistics
    const allStudentGrades = centralizedGrades.flatMap(cg => 
      cg.students.map(s => s.averageGrade).filter(g => typeof g === 'number') as number[]
    );
    
    const overallStatistics = {
      totalClasses: centralizedGrades.length,
      totalStudents: centralizedGrades.reduce((sum, cg) => sum + cg.statistics.totalStudents, 0),
      totalStudentsWithGrades: allStudentGrades.length,
      overallAverage: allStudentGrades.length > 0
        ? Math.round((allStudentGrades.reduce((sum, g) => sum + g, 0) / allStudentGrades.length) * 10) / 10
        : null,
      totalNeedingAttention: centralizedGrades.reduce((sum, cg) => sum + cg.statistics.needingAttention, 0),
    };
    
    return {
      centralizedGrades,
      overallStatistics,
      academicPeriod: {
        current: this.getCurrentPeriod(),
        year: dayjs().format('YYYY'),
      },
    };
  }

  /**
   * Export student grades as PDF - IMPLEMENTED
   */
  async exportStudentGrades(
    studentId: string,
    userId: string,
    userRole: UserRole,
    period?: string,
  ) {
    // Verify access
    await this.verifyStudentAccess(studentId, userId, userRole);

    // Get student grades
    const grades = await this.getStudentGrades(studentId, userId, userRole);

    // Generate PDF
    const pdfBuffer = await this.generateStudentGradesPDF(grades, period);

    return {
      buffer: pdfBuffer,
      fileName: `calificaciones_${grades.student.enrollmentNumber}_${new Date().toISOString().split('T')[0]}.pdf`,
      contentType: 'application/pdf',
    };
  }

  /**
   * Generate PDF report for student grades with elegant professional design
   */
  private async generateStudentGradesPDF(grades: any, period?: string): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');
    
    // Document configuration with professional settings
    const doc = new PDFDocument({ 
      margin: 40,
      size: 'A4',
      bufferPages: true, // Enable buffering to properly handle pages and footers
      font: 'Helvetica'
    });
    
    const buffers: Buffer[] = [];
    doc.on('data', (buffer: Buffer) => buffers.push(buffer));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      try {
        // Color palette for professional design
        const colors = {
          primary: '#2c3e50',      // Dark blue-gray
          secondary: '#3498db',    // Blue
          accent: '#e74c3c',       // Red for alerts
          success: '#27ae60',      // Green
          text: '#2c3e50',         // Main text
          lightGray: '#ecf0f1',    // Light background
          mediumGray: '#95a5a6',   // Medium gray
          darkGray: '#34495e'      // Dark gray
        };

        // Header with logo and branding
        this.addElegantHeader(doc, colors, grades.student);
        
        let yPosition = 140;
        
        // Student information section
        yPosition = this.addStudentInfoSection(doc, grades, period, colors, yPosition);
        
        // Overall summary section
        if (grades.summary) {
          yPosition = this.addSummarySection(doc, grades.summary, colors, yPosition, grades.subjectGrades);
        }
        
        // Subject grades section
        if (grades.subjectGrades && grades.subjectGrades.length > 0) {
          yPosition = this.addSubjectGradesSection(doc, grades.subjectGrades, colors, yPosition);
        }
        
        // Recent activity section
        if (grades.recentGrades && grades.recentGrades.length > 0) {
          this.addRecentActivitySection(doc, grades.recentGrades, colors, yPosition);
        }
        
        // Add footer to all pages at the end
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          this.addElegantFooter(doc, colors);
        }
        
        doc.end();
      } catch (error) {
        console.error('Error generating PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Add elegant header with logo and branding, including student profile photo
   */
  private addElegantHeader(doc: any, colors: any, student: any) {
    const fs = require('fs');
    const path = require('path');
    
    // Header background
    doc.rect(0, 0, doc.page.width, 120)
       .fill(colors.primary);
    
    try {
      // Add school logo if exists - RIGHT side as requested by user
      const logoPath = path.join(process.cwd(), 'uploads/logo-MWSchool.png');

      if (fs.existsSync(logoPath)) {
        // Position logo on RIGHT side (moved from left side)
        const logoWidth = 60;
        const logoX = doc.page.width - logoWidth - 40; // Right aligned with margin
        doc.image(logoPath, logoX, 20, { width: logoWidth, height: 45 });
      } else {
        console.warn('⚠️ School logo not found, continuing without logo');
      }
    } catch (error) {
      console.warn('❌ Error adding school logo:', error.message);
    }
    
    // Title and subtitle (centered, with space for photo on left and logo on right)
    doc.fill('white')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('REPORTE DE CALIFICACIONES', 150, 30);
       
    doc.fontSize(12)
       .font('Helvetica')
       .text('Informe Académico Detallado', 150, 60);
       
    doc.fontSize(10)
       .text('Mundo World School - Sistema de Gestión Educativa', 150, 80);
    
    try {
      // Add student profile photo if exists (top LEFT corner - before title)
      if (student.user?.profile?.avatarUrl) {
        const profilePhotoPath = path.join(process.cwd(), student.user.profile.avatarUrl.replace('/uploads/', 'uploads/'));
        
        if (fs.existsSync(profilePhotoPath)) {
          // Create a white circular background for the photo (LEFT side as user requested)
          doc.circle(80, 60, 35)
             .fill('white')
             .stroke();
          
          // Add the student profile photo in a circular frame (LEFT side - where user wanted it)
          doc.save();
          doc.circle(80, 60, 35).clip();
          doc.image(profilePhotoPath, 45, 25, { 
            width: 70, 
            height: 70
          });
          doc.restore();
        } else {
          console.warn('⚠️ Student profile photo file not found:', profilePhotoPath);
          // Add a placeholder circle if no photo (LEFT side)
          doc.circle(80, 60, 35)
             .fill('white')
             .stroke();
          doc.fill(colors.mediumGray)
             .fontSize(12)
             .text('SIN', 65, 50)
             .text('FOTO', 60, 65);
        }
      } else {
        // Add a placeholder circle if no photo URL (LEFT side as user requested)
        doc.circle(80, 60, 35)
           .fill('white')
           .stroke();
        doc.fill(colors.mediumGray)
           .fontSize(12)
           .text('SIN', 65, 50)
           .text('FOTO', 60, 65);
      }
    } catch (error) {
      console.warn('⚠️ Error adding student profile photo:', error.message);
    }
  }

  /**
   * Add student information section
   */
  private addStudentInfoSection(doc: any, grades: any, period: string, colors: any, yPosition: number): number {
    // Section header
    doc.fill(colors.secondary)
       .rect(40, yPosition, doc.page.width - 80, 30)
       .fill();
       
    doc.fill('white')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('INFORMACIÓN DEL ESTUDIANTE', 50, yPosition + 8);
    
    yPosition += 45;
    
    // Student details in a professional layout
    doc.fill(colors.text)
       .fontSize(12)
       .font('Helvetica');
    
    const studentInfo = [
      ['Nombre Completo:', `${grades.student.firstName} ${grades.student.lastName}`],
      ['Número de Matrícula:', grades.student.enrollmentNumber],
      ['Grupo Clase:', grades.student.classGroup?.name || 'No asignado'],
      ['Nivel Educativo:', grades.student.educationalLevel?.name || 'No especificado'],
      ['Período Académico:', period || 'Año Académico Completo'],
      ['Fecha de Generación:', new Date().toLocaleDateString('es-ES', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      })]
    ];
    
    studentInfo.forEach((info, index) => {
      const y = yPosition + (index * 20);
      doc.font('Helvetica-Bold').text(info[0], 60, y, { width: 120 });
      doc.font('Helvetica').text(info[1], 190, y);
    });
    
    // Decorative line
    yPosition += studentInfo.length * 20 + 20;
    doc.strokeColor(colors.lightGray)
       .lineWidth(2)
       .moveTo(40, yPosition)
       .lineTo(doc.page.width - 40, yPosition)
       .stroke();
    
    return yPosition + 30;
  }

  /**
   * Add summary section with visual elements including radar chart
   */
  private addSummarySection(doc: any, summary: any, colors: any, yPosition: number, subjectGrades?: any[]): number {
    // Check if we need a new page
    if (yPosition > 650) {
      doc.addPage();
      yPosition = 50;
    }
    
    // Section header
    doc.fill(colors.success)
       .rect(40, yPosition, doc.page.width - 80, 30)
       .fill();
       
    doc.fill('white')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('RESUMEN ACADÉMICO GENERAL', 50, yPosition + 8);
    
    yPosition += 50;
    
    // Summary cards layout
    const overallAverage = (summary.overallAverage && typeof summary.overallAverage === 'number') 
      ? summary.overallAverage.toFixed(2) 
      : 'N/A';
    
    // Main grade in a prominent card
    doc.fill(colors.lightGray)
       .rect(60, yPosition, 200, 80)
       .fill();
       
    doc.fill(colors.primary)
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('PROMEDIO GENERAL', 70, yPosition + 15);
       
    doc.fontSize(36)
       .text(overallAverage, 70, yPosition + 35);
    
    // Statistics in smaller cards
    const stats = [
      ['Materias Cursadas', summary.totalSubjects || 0],
      ['Elementos Evaluados', summary.totalGradedItems || 0],
      ['Tareas Pendientes', summary.totalPendingTasks || 0]
    ];
    
    stats.forEach((stat, index) => {
      const x = 300 + (index * 85);
      doc.fill(colors.lightGray)
         .rect(x, yPosition, 80, 80)
         .fill();
         
      doc.fill(colors.text)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(stat[0], x + 5, yPosition + 10, { width: 70, align: 'center' });
         
      doc.fontSize(20)
         .text(stat[1].toString(), x + 5, yPosition + 35, { width: 70, align: 'center' });
    });
    
    let newYPosition = yPosition + 120;
    
    // Add radar chart/diana if subject grades are available
    if (subjectGrades && subjectGrades.length > 0) {
      newYPosition = this.addRadarChart(doc, subjectGrades, colors, newYPosition);
    }
    
    return newYPosition;
  }

  /**
   * Add radar chart (diana) showing subject performance
   */
  private addRadarChart(doc: any, subjectGrades: any[], colors: any, yPosition: number): number {
    // Check if we need a new page
    if (yPosition > 650) {
      doc.addPage();
      yPosition = 50;
    }
    
    // Title for radar chart
    doc.fill(colors.text)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('DIANA DE EVALUACIÓN POR ASIGNATURAS', 60, yPosition);
    
    yPosition += 30;
    
    // Diana parameters
    const centerX = doc.page.width / 2;
    const centerY = yPosition + 120;
    const radius = 80;
    const maxGrade = 100; // Las medias de asignatura están en escala porcentual 0-100
    
    // Filter subjects with grades
    const validSubjects = subjectGrades.filter(subject => 
      subject.averageGrade !== null && typeof subject.averageGrade === 'number'
    ).slice(0, 8); // Limit to 8 subjects for readability
    
    if (validSubjects.length > 0) {
      const angleStep = (2 * Math.PI) / validSubjects.length;
      
      // Draw background circles (grid) with value labels
      doc.strokeColor(colors.lightGray).lineWidth(1);
      for (let i = 1; i <= 5; i++) {
        const r = (radius * i) / 5;
        const gradeValue = (maxGrade * i) / 5; // 20, 40, 60, 80, 100
        
        doc.circle(centerX, centerY, r).stroke();
        
        // Add grade labels on the right side
        doc.fill(colors.mediumGray)
           .fontSize(8)
           .font('Helvetica')
           .text(gradeValue.toString(), centerX + r + 5, centerY - 4);
      }
      
      // Draw axes and labels
      validSubjects.forEach((subject, index) => {
        const angle = index * angleStep - Math.PI / 2; // Start from top
        const endX = centerX + radius * Math.cos(angle);
        const endY = centerY + radius * Math.sin(angle);
        
        // Draw axis line
        doc.strokeColor(colors.mediumGray)
           .moveTo(centerX, centerY)
           .lineTo(endX, endY)
           .stroke();
        
        // Add subject label
        const labelX = centerX + (radius + 20) * Math.cos(angle);
        const labelY = centerY + (radius + 20) * Math.sin(angle);
        
        doc.fill(colors.text)
           .fontSize(8)
           .font('Helvetica')
           .text(subject.subjectName.substring(0, 12), labelX - 30, labelY - 5, { 
             width: 60, 
             align: 'center' 
           });
      });
      
      // Draw the performance polygon
      const points: { x: number; y: number }[] = [];
      validSubjects.forEach((subject, index) => {
        const angle = index * angleStep - Math.PI / 2;
        const grade = Math.min(subject.averageGrade, maxGrade);
        const distance = (grade / maxGrade) * radius;
        
        const x = centerX + distance * Math.cos(angle);
        const y = centerY + distance * Math.sin(angle);
        points.push({ x, y });
      });
      
      // Draw the polygon
      if (points.length > 2) {
        doc.fillColor(colors.secondary + '40') // Semi-transparent
           .strokeColor(colors.secondary)
           .lineWidth(2);
        
        doc.polygon(points.map(p => [p.x, p.y]));
        doc.fillAndStroke();
      }
      
      // Draw grade points
      points.forEach((point, index) => {
        const grade = validSubjects[index].averageGrade;
        doc.circle(point.x, point.y, 4)
           .fill(colors.secondary);
        
        // Add grade value with better visibility
        doc.fill(colors.text)
           .fontSize(8)
           .font('Helvetica-Bold')
           .text(grade.toFixed(1), point.x - 10, point.y - 10);
      });
      
      // Add legend
      doc.fill(colors.text)
         .fontSize(8)
         .font('Helvetica')
         .text('Escala: 0-10 puntos', centerX - 40, centerY + radius + 30);
    } else {
      // No data message
      doc.fill(colors.mediumGray)
         .fontSize(12)
         .font('Helvetica')
         .text('Sin datos suficientes para generar la diana', centerX - 100, centerY);
    }
    
    return yPosition + 280; // Return new Y position after chart
  }

  /**
   * Add subject grades section with improved formatting
   */
  private addSubjectGradesSection(doc: any, subjectGrades: any[], colors: any, yPosition: number): number {
    // Check if we need a new page
    if (yPosition > 600) {
      doc.addPage();
      yPosition = 50;
    }
    
    // Section header
    doc.fill(colors.secondary)
       .rect(40, yPosition, doc.page.width - 80, 30)
       .fill();
       
    doc.fill('white')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('CALIFICACIONES DETALLADAS POR MATERIA', 50, yPosition + 8);
    
    yPosition += 50;
    
    subjectGrades.forEach((subject: any, index: number) => {
      // Check if we need a new page
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      
      // Subject card background
      doc.fill(colors.lightGray)
         .rect(50, yPosition, doc.page.width - 100, 120)
         .fill();
      
      // Subject header
      doc.fill(colors.primary)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(`${index + 1}. ${subject.subjectName}`, 60, yPosition + 15);
      
      if (subject.subjectCode) {
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Código: ${subject.subjectCode}`, 60, yPosition + 35);
      }
      
      // Grades in columns
      const grades = [
        ['Promedio General', subject.averageGrade],
        ['Tareas', subject.taskAverage],
        ['Actividades', subject.activityAverage],
        ['Competencias', subject.competencyAverage]
      ];
      
      grades.forEach((grade, gradeIndex) => {
        const x = 60 + (gradeIndex * 120);
        const gradeText = (grade[1] !== null && typeof grade[1] === 'number') 
          ? grade[1].toFixed(2) 
          : 'N/A';
        
        doc.fill(colors.text)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(grade[0], x, yPosition + 55);
           
        doc.fontSize(16)
           .text(gradeText, x, yPosition + 70);
      });
      
      // Statistics bar
      doc.fontSize(9)
         .font('Helvetica')
         .fill(colors.mediumGray);
      
      const stats = [
        `Tareas calificadas: ${subject.gradedTasks || 0}`,
        `Pendientes: ${subject.pendingTasks || 0}`,
        `Actividades: ${subject.activityAssessments || 0}`
      ];
      
      doc.text(stats.join(' | '), 60, yPosition + 95);
      
      if (subject.lastUpdated) {
        doc.text(`Actualizado: ${new Date(subject.lastUpdated).toLocaleDateString('es-ES')}`, 60, yPosition + 105);
      }
      
      yPosition += 140;
    });
    
    return yPosition;
  }

  /**
   * Add recent activity section
   */
  private addRecentActivitySection(doc: any, recentGrades: any[], colors: any, yPosition: number) {
    // Check if we need a new page
    if (yPosition > 500) {
      doc.addPage();
      yPosition = 50;
    }
    
    // Section header
    doc.fill(colors.accent)
       .rect(40, yPosition, doc.page.width - 80, 30)
       .fill();
       
    doc.fill('white')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('ACTIVIDAD ACADÉMICA RECIENTE', 50, yPosition + 8);
    
    yPosition += 50;
    
    recentGrades.slice(0, 10).forEach((item: any, index: number) => {
      if (yPosition > 750) {
        doc.addPage();
        yPosition = 50;
      }
      
      const date = item.gradedAt 
        ? new Date(item.gradedAt).toLocaleDateString('es-ES')
        : 'Fecha no disponible';
        
      const gradeText = (item.grade !== null && item.grade !== undefined && typeof item.grade === 'number') 
        ? `${item.grade.toFixed(2)}/${item.maxGrade || 10}` 
        : 'Sin calificar';
      
      // Activity item with background
      if (index % 2 === 0) {
        doc.fill(colors.lightGray)
           .rect(50, yPosition - 2, doc.page.width - 100, 18)
           .fill();
      }
      
      doc.fill(colors.text)
         .fontSize(11)
         .font('Helvetica')
         .text(`• ${item.type === 'task' ? 'Tarea' : 'Actividad'}: ${item.title}`, 60, yPosition);
      
      // Use different colors based on grade status
      const gradeColor = (item.grade !== null && item.grade !== undefined) 
        ? colors.success 
        : colors.accent;
        
      doc.fill(gradeColor)
         .font('Helvetica-Bold')
         .text(`${gradeText}`, 400, yPosition);
         
      doc.fill(colors.mediumGray)
         .font('Helvetica')
         .fontSize(9)
         .text(date, 480, yPosition);
      
      yPosition += 20;
    });
  }

  /**
   * Add elegant footer with centered larger logo
   */
  private addElegantFooter(doc: any, colors: any) {
    const fs = require('fs');
    const path = require('path');
    
    const footerY = doc.page.height - 80;
    
    // Footer background
    doc.fill(colors.lightGray)
       .rect(0, footerY, doc.page.width, 80)
       .fill();
    
    try {
      // Large centered logo in footer
      const logoPath = path.join(process.cwd(), 'uploads/logo-MWSchool.png');

      if (fs.existsSync(logoPath)) {
        // Center the logo horizontally
        const logoWidth = 60; // Bigger logo
        const centerX = (doc.page.width - logoWidth) / 2;
        doc.image(logoPath, centerX, footerY + 10, { width: logoWidth });
      } else {
        console.warn('⚠️ Footer logo not found');
      }
    } catch (error) {
      console.error('❌ Error adding footer logo:', error.message);
    }
    
    // Minimal footer text below logo
    doc.fill(colors.mediumGray)
       .fontSize(8)
       .font('Helvetica')
       .text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 
             0, 
             footerY + 55, 
             { width: doc.page.width, align: 'center' });
  }

  /**
   * Get detailed grade breakdown for a specific student by grade type
   */
  async getStudentGradeDetails(
    studentId: string,
    gradeType: string,
    userId: string,
    userRole: UserRole,
  ) {
    // Verify access permissions
    await this.verifyStudentAccess(studentId, userId, userRole);

    const student = await this.studentRepository.findOne({
      where: { id: studentId },
      relations: ['user', 'user.profile'],
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    let gradeDetails = [];

    if (gradeType === 'task') {
      // Get task submissions with grades
      const submissions = await this.taskSubmissionRepository.find({
        where: { studentId, finalGrade: Not(IsNull()) },
        relations: [
          'task',
          'task.subjectAssignment',
          'task.subjectAssignment.subject',
          'task.subjectAssignment.classGroup',
        ],
        order: { submittedAt: 'DESC' },
      });

      gradeDetails = submissions.map(submission => ({
        id: submission.id,
        taskTitle: submission.task.title,
        taskType: 'Tarea',
        grade: submission.finalGrade,
        maxGrade: submission.task.maxPoints || 100,
        percentage: (Number(submission.finalGrade) / (Number(submission.task.maxPoints) || 100)) * 100,
        gradedAt: submission.submittedAt,
        isManual: true, // Las task submissions son manuales
        canEdit: true,
        feedback: null, // TaskSubmission no tiene feedback directo
        subject: submission.task.subjectAssignment?.subject?.name || 'Sin asignatura',
        classGroup: submission.task.subjectAssignment?.classGroup?.name || 'Sin grupo',
      }));

    } else if (gradeType === 'activity') {
      // Get activity assessments - note: this table uses student_id column name
      const assessments = await this.activityAssessmentRepository.find({
        where: { studentId },
        relations: [
          'activity',
          'activity.subjectAssignment',
          'activity.subjectAssignment.subject',
          'activity.subjectAssignment.classGroup',
        ],
        order: { assessedAt: 'DESC' },
      });

      gradeDetails = assessments.map(assessment => ({
        id: assessment.id,
        taskTitle: assessment.activity.name,
        taskType: 'Actividad',
        grade: assessment.value ? parseFloat(assessment.value) : 0,
        maxGrade: assessment.activity.maxScore || 10,
        percentage: assessment.value ? (parseFloat(assessment.value) / (assessment.activity.maxScore || 10)) * 100 : 0,
        gradedAt: assessment.assessedAt,
        isManual: false,
        canEdit: true,
        feedback: assessment.comment || null,
        rubricBased: !!assessment.activity.rubricId,
        subject: assessment.activity.subjectAssignment?.subject?.name || 'Sin asignatura',
        classGroup: assessment.activity.subjectAssignment?.classGroup?.name || 'Sin grupo',
      }));

    } else if (gradeType === 'test-yourself') {
      // Get exam grades (Test Yourself)
      const examGrades = await this.examGradeRepository.find({
        where: { studentId },
        relations: [
          'task',
          'task.subjectAssignment',
          'task.subjectAssignment.subject',
          'task.subjectAssignment.classGroup',
        ],
        order: { gradedAt: 'DESC' },
      });

      gradeDetails = examGrades.map(examGrade => ({
        id: examGrade.id,
        taskTitle: examGrade.task.title,
        taskType: 'Test Yourself',
        grade: examGrade.numericGrade,
        maxGrade: examGrade.task.maxPoints || 100,
        percentage: (Number(examGrade.numericGrade) / (Number(examGrade.task.maxPoints) || 100)) * 100,
        gradedAt: examGrade.gradedAt,
        isManual: false,
        canEdit: true,
        feedback: examGrade.comments || null,
        rubricBased: !!examGrade.task.rubricId,
        subject: examGrade.task.subjectAssignment?.subject?.name || 'Sin asignatura',
        classGroup: examGrade.task.subjectAssignment?.classGroup?.name || 'Sin grupo',
      }));
    }

    return {
      student: {
        id: student.id,
        fullName: `${student.user?.profile?.firstName || ''} ${student.user?.profile?.lastName || ''}`.trim() || 'Estudiante sin nombre',
        enrollmentNumber: student.enrollmentNumber,
      },
      gradeType,
      gradeDetails,
      totalGrades: gradeDetails.length,
      averageGrade: gradeDetails.length > 0
        ? gradeDetails.reduce((acc, detail) => acc + detail.percentage, 0) / gradeDetails.length
        : null,
    };
  }

  /**
   * CUADERNO UNIFICADO: devuelve, para una asignación, TODAS las calificaciones
   * que ya existen en la plataforma (actividades numéricas, tareas y Test Yourself)
   * como columnas con la nota de cada alumno. Las actividades numéricas son
   * editables desde el cuaderno; tareas y Test Yourself se muestran (se crean/editan
   * en su propia herramienta) para tener todo bajo la misma página.
   */
  async getGradebook(subjectAssignmentId: string, userId: string, userRole: UserRole): Promise<any> {
    const assignment = await this.subjectAssignmentRepository.findOne({
      where: { id: subjectAssignmentId },
      relations: [
        'subject',
        'classGroup',
        'classGroup.students',
        'classGroup.students.user',
        'classGroup.students.user.profile',
        'academicYear',
        'teacher',
      ],
    });
    if (!assignment) {
      throw new NotFoundException('Asignación de asignatura no encontrada');
    }

    // Seguridad: un profesor solo ve sus propias asignaciones
    if (userRole === UserRole.TEACHER) {
      const teacher = await this.teacherRepository.findOne({ where: { user: { id: userId } } });
      if (!teacher || teacher.id !== assignment.teacherId) {
        throw new ForbiddenException('No tienes permisos sobre esta asignatura');
      }
    }

    const students = (assignment.classGroup?.students || [])
      .filter((s) => s.user?.isActive !== false)
      .map((s) => ({
        id: s.id,
        enrollmentNumber: s.enrollmentNumber,
        name: `${s.user?.profile?.firstName || ''} ${s.user?.profile?.lastName || ''}`.trim() || s.enrollmentNumber,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const columns: any[] = [];

    // 1) Actividades numéricas (editables en el cuaderno)
    const activityAssessments = await this.activityAssessmentRepository.find({
      where: { activity: { subjectAssignmentId } },
      relations: ['activity'],
    });
    const activityMap = new Map<string, any>();
    for (const a of activityAssessments) {
      if (!a.activity || a.activity.valuationType !== 'score' || a.activity.isArchived) continue;
      if (!activityMap.has(a.activity.id)) {
        activityMap.set(a.activity.id, {
          id: a.activity.id,
          source: 'activity',
          name: a.activity.name,
          maxScore: Number(a.activity.maxScore) || 10,
          weight: a.activity.weight ?? null,
          editable: true,
          visibleToFamilies: !!a.activity.visibleToFamilies,
          assignedDate: a.activity.assignedDate,
          grades: {},
          individualWeights: {},
        });
      }
      const col = activityMap.get(a.activity.id);
      const v = parseFloat(a.value);
      col.grades[a.studentId] = isNaN(v) ? null : v;
      col.individualWeights[a.studentId] = a.weight ?? null;
    }
    activityMap.forEach((c) => columns.push(c));

    // 2) Tareas y deberes (no Test Yourself) — solo lectura en el cuaderno
    const taskSubmissions = await this.taskSubmissionRepository.find({
      where: { task: { subjectAssignmentId } },
      relations: ['task'],
    });
    const taskMap = new Map<string, any>();
    for (const ts of taskSubmissions) {
      if (!ts.task || ts.task.isTestYourself === true) continue;
      if (ts.task.isActive === false) continue;
      if (!taskMap.has(ts.task.id)) {
        taskMap.set(ts.task.id, {
          id: ts.task.id,
          source: 'task',
          name: ts.task.title,
          maxScore: ts.task.rubricId ? 100 : (Number(ts.task.maxPoints) || 100),
          weight: ts.task.weight ?? null,
          editable: false,
          visibleToFamilies: ['published', 'closed'].includes(ts.task.status),
          assignedDate: ts.task.createdAt,
          grades: {},
          individualWeights: {},
        });
      }
      const col = taskMap.get(ts.task.id);
      if (ts.isGraded && ts.finalGrade !== null && ts.finalGrade !== undefined) {
        const v = typeof ts.finalGrade === 'string' ? parseFloat(ts.finalGrade) : ts.finalGrade;
        col.grades[ts.studentId] = isNaN(v) ? null : v;
        col.individualWeights[ts.studentId] = ts.weight ?? null;
      }
    }
    taskMap.forEach((c) => columns.push(c));

    // 3) Test Yourself — solo lectura en el cuaderno
    const examGrades = await this.examGradeRepository.find({
      where: { task: { subjectAssignmentId } },
      relations: ['task'],
    });
    const examMap = new Map<string, any>();
    for (const eg of examGrades) {
      if (!eg.task) continue;
      if (!examMap.has(eg.task.id)) {
        examMap.set(eg.task.id, {
          id: eg.task.id,
          source: 'test',
          name: eg.task.title,
          maxScore: Number(eg.task.maxPoints) || 100,
          weight: eg.task.weight ?? null,
          editable: false,
          visibleToFamilies: eg.task.isTestYourself ? !!eg.task.visibleToFamilies : true,
          assignedDate: eg.gradedAt,
          grades: {},
          individualWeights: {},
        });
      }
      const col = examMap.get(eg.task.id);
      const v = typeof eg.numericGrade === 'string' ? parseFloat(eg.numericGrade) : eg.numericGrade;
      col.grades[eg.studentId] = (v === null || v === undefined || isNaN(v)) ? null : v;
      col.individualWeights[eg.studentId] = eg.weight ?? null;
    }
    examMap.forEach((c) => columns.push(c));

    // Ordenar columnas por fecha de asignación
    columns.sort((a, b) => {
      const da = a.assignedDate ? new Date(a.assignedDate).getTime() : 0;
      const db = b.assignedDate ? new Date(b.assignedDate).getTime() : 0;
      return da - db;
    });

    return {
      assignment: {
        id: assignment.id,
        subject: { id: assignment.subject?.id, name: assignment.subject?.name, code: assignment.subject?.code },
        classGroup: { id: assignment.classGroup?.id, name: assignment.classGroup?.name },
        academicYear: { id: assignment.academicYear?.id, name: assignment.academicYear?.name },
      },
      students,
      columns,
    };
  }
}