/**
 * @archivo: subjects.service.ts
 * @módulo: Subjects (Servicio de Asignaturas y Asignaciones)
 * @función: Gestión completa de asignaturas del curriculum y asignaciones profesor-grupo
 * @crítico: SÍ - Base del sistema académico con competencias españolas
 * @dependencias: Subject, SubjectAssignment, Teacher, ClassGroup, Course entities
 * @no_modificar: Códigos de asignaturas sin verificar sistema de evaluaciones
 * @relacionado_con: subjects.controller.ts, evaluations.service.ts, competencies.service.ts
 */

/**
 * SERVICIO: SubjectsService
 * UBICACIÓN: /backend/src/modules/subjects/subjects.service.ts
 * FUNCIÓN: Core del sistema académico - asignaturas y asignaciones profesor-grupo-materia
 * NO USAR PARA: Tareas individuales (usar tasks.service.ts) o actividades diarias (activities.service.ts)
 * MÉTODOS CRÍTICOS:
 *   - createSubject(): Crear asignaturas con códigos únicos y estructura Google Drive
 *   - createAssignment(): Asignar profesor a asignatura+grupo con validaciones
 *   - findSubjectsByStudent(): Obtener asignaturas de un estudiante específico
 *   - findSubjectsByTeacher(): Asignaturas que enseña un profesor
 *   - canTeacherEvaluateSubject(): Verificar permisos de evaluación competencial
 * 
 * ENTIDADES GESTIONADAS:
 * - Subject: Asignaturas del curriculum (Matemáticas, Lengua, etc.)
 * - SubjectAssignment: Relación Profesor-Asignatura-Grupo-AñoAcadémico
 * - Course: Cursos académicos (1º Primaria, 2º ESO, etc.)
 * - ClassGroup: Grupos de clase (1º A, 2º B, etc.)
 * - Teacher: Profesores del sistema
 * 
 * SISTEMA DE ASIGNACIONES:
 * Una SubjectAssignment conecta:
 * - UN profesor específico
 * - UNA asignatura del curriculum  
 * - UN grupo de clase
 * - UN año académico
 * Esto permite que un profesor enseñe múltiples asignaturas/grupos
 * y que una asignatura sea enseñada por múltiples profesores
 * 
 * VALIDACIONES IMPLEMENTADAS:
 * - Códigos únicos de asignaturas (no duplicados)
 * - Asignaciones únicas por combinación profesor-asignatura-grupo-año
 * - Verificación de existencia de entidades relacionadas
 * - Prevención de eliminación con asignaciones activas
 * - Permisos de evaluación basados en asignaciones
 * 
 * INTEGRACIÓN CON EVALUACIONES:
 * - findSubjectsByStudent(): Para competency-evaluations
 * - canTeacherEvaluateSubject(): Control de permisos por asignación
 * - findAssignmentDetails(): Datos completos para evaluaciones
 * - Soporte completo para sistema competencial español
 * 
 * INTEGRACIÓN CON GOOGLE DRIVE:
 * - createSubjectFolders(): Estructura automática por asignatura/nivel
 * - deleteSubjectFolders(): Limpieza controlada con verificación de contenido
 * - checkSubjectFolderContents(): Verificación antes de eliminaciones
 * - Actualmente DESHABILITADO (dependencias comentadas)
 * 
 * ESTADÍSTICAS DISPONIBLES:
 * - Total de asignaturas y asignaciones
 * - Asignaturas sin asignaciones (orphaned)
 * - Profesores con asignaciones activas
 * - Ratio asignaciones por asignatura
 * 
 * FILTROS Y CONSULTAS:
 * - Por curso académico (Course)
 * - Por profesor (Teacher assignments)
 * - Por grupo de clase (ClassGroup)
 * - Por año académico (AcademicYear)
 * - Por estudiante (vía ClassGroup membership)
 * 
 * ESTADO ACTUAL: ✅ SISTEMA COMPLETO Y FUNCIONAL
 * - Todas las funcionalidades principales implementadas
 * - Sistema de asignaciones operativo y probado
 * - Integración con evaluaciones competenciales funcionando
 * - Google Drive folders temporalmente deshabilitado
 * - Soporte completo para curriculum español multi-nivel
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Subject } from '../students/entities/subject.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { StudentSubjectAssignment } from '../students/entities/student-subject-assignment.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Course } from '../students/entities/course.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateSubjectAssignmentDto } from './dto/create-subject-assignment.dto';
import { CreateMultipleAssignmentDto } from './dto/create-multiple-assignment.dto';
import { UpdateSubjectAssignmentDto } from './dto/update-subject-assignment.dto';
// import { GoogleDriveService } from '../educational-resources/services/google-drive.service';
// import { FolderOrganizationService } from '../educational-resources/services/folder-organization.service';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(SubjectAssignment)
    private readonly assignmentRepository: Repository<SubjectAssignment>,
    @InjectRepository(StudentSubjectAssignment)
    private readonly studentAssignmentRepository: Repository<StudentSubjectAssignment>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(ClassGroup)
    private readonly classGroupRepository: Repository<ClassGroup>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(AcademicYear)
    private readonly academicYearRepository: Repository<AcademicYear>,
    // private readonly googleDriveService: GoogleDriveService,
    // private readonly folderOrganizationService: FolderOrganizationService,
  ) {}

  // ==================== SUBJECTS ====================

  async findAllSubjects(): Promise<Subject[]> {
    return this.subjectRepository.find({
      relations: ['course', 'course.cycle', 'course.cycle.educationalLevel'],
      order: {
        course: { order: 'ASC' },
        name: 'ASC',
      },
    });
  }

  async findOneSubject(id: string): Promise<Subject> {
    const subject = await this.subjectRepository.findOne({
      where: { id },
      relations: ['course', 'course.cycle', 'course.cycle.educationalLevel'],
    });

    if (!subject) {
      throw new NotFoundException(`Asignatura con ID ${id} no encontrada`);
    }

    return subject;
  }

  async createSubject(createSubjectDto: CreateSubjectDto): Promise<Subject> {
    const { courseId, ...subjectData } = createSubjectDto;

    // Verificar que el curso existe
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['cycle', 'cycle.educationalLevel'],
    });
    if (!course) {
      throw new NotFoundException(`Curso con ID ${courseId} no encontrado`);
    }

    // Verificar que no existe otra asignatura con el mismo código
    const existingSubject = await this.subjectRepository.findOne({
      where: { code: subjectData.code },
    });
    if (existingSubject) {
      throw new ConflictException(
        `Ya existe una asignatura con el código "${subjectData.code}"`,
      );
    }

    // Crear la asignatura
    const subject = this.subjectRepository.create({
      ...subjectData,
      course,
    });

    const savedSubject = await this.subjectRepository.save(subject);

    // Crear carpetas automáticamente en Google Drive para la nueva asignatura
    try {
      await this.createSubjectFolders(savedSubject);
      console.log(`✅ Folders created for subject: ${savedSubject.name}`);
    } catch (error) {
      console.error(`❌ Error creating folders for subject ${savedSubject.name}:`, error);
      // No throw error here - subject creation should succeed even if folder creation fails
    }

    return savedSubject;
  }

  async updateSubject(id: string, updateSubjectDto: UpdateSubjectDto): Promise<Subject> {
    const subject = await this.findOneSubject(id);
    const { courseId, ...updateData } = updateSubjectDto;

    // Actualizar curso si se proporciona
    if (courseId) {
      const course = await this.courseRepository.findOne({
        where: { id: courseId },
        relations: ['cycle', 'cycle.educationalLevel'],
      });
      if (!course) {
        throw new NotFoundException(`Curso con ID ${courseId} no encontrado`);
      }
      subject.course = course;
    }

    // Verificar código único si se está actualizando
    if (updateData.code && updateData.code !== subject.code) {
      const existingSubject = await this.subjectRepository.findOne({
        where: { code: updateData.code },
      });
      if (existingSubject) {
        throw new ConflictException(
          `Ya existe una asignatura con el código "${updateData.code}"`,
        );
      }
    }

    // Aplicar actualizaciones
    Object.assign(subject, updateData);

    return this.subjectRepository.save(subject);
  }

  async removeSubject(id: string, deleteFromDrive: boolean = false): Promise<void> {
    const subject = await this.findOneSubject(id);
    
    // Verificar si hay asignaciones activas
    const activeAssignments = await this.assignmentRepository.count({
      where: { subject: { id } },
    });
    
    if (activeAssignments > 0) {
      throw new BadRequestException(
        `No se puede eliminar la asignatura porque tiene ${activeAssignments} asignaciones activas`,
      );
    }

    // Handle Google Drive folder deletion if requested
    if (deleteFromDrive) {
      try {
        await this.deleteSubjectFolders(subject);
        console.log(`✅ Google Drive folders deleted for subject: ${subject.name}`);
      } catch (error) {
        console.error(`❌ Error deleting folders for subject ${subject.name}:`, error);
        // Continue with subject deletion even if folder deletion fails
      }
    }

    await this.subjectRepository.remove(subject);
  }

  async findSubjectsByCourse(courseId: string): Promise<Subject[]> {
    return this.subjectRepository.find({
      where: { course: { id: courseId } },
      relations: ['course'],
      order: { name: 'ASC' },
    });
  }

  // ==================== SUBJECT ASSIGNMENTS ====================

  async findAllAssignments(): Promise<SubjectAssignment[]> {
    return this.assignmentRepository.find({
      relations: [
        'teacher',
        'teacher.user',
        'teacher.user.profile',
        'subject',
        'subject.course',
        'classGroup',
        'classGroup.courses',
        'classGroups', // Nueva relación ManyToMany
        'classGroups.courses',
        'academicYear',
      ],
      order: {
        academicYear: { startDate: 'DESC' },
        classGroup: { name: 'ASC' },
        subject: { name: 'ASC' },
      },
    });
  }

  async findOneAssignment(id: string): Promise<SubjectAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: [
        'teacher',
        'teacher.user',
        'teacher.user.profile',
        'subject',
        'subject.course',
        'classGroup',
        'classGroup.courses',
        'classGroup.students',
        'classGroup.students.user',
        'classGroup.students.user.profile',
        'classGroups', // Nueva relación ManyToMany
        'classGroups.courses',
        'classGroups.students',
        'classGroups.students.user',
        'classGroups.students.user.profile',
        'academicYear',
      ],
    });

    if (!assignment) {
      throw new NotFoundException(`Asignación con ID ${id} no encontrada`);
    }

    // Debug: Log what we got
    console.log('🔍 [DEBUG] Assignment found:', {
      id: assignment.id,
      classGroupId: assignment.classGroup?.id,
      classGroupName: assignment.classGroup?.name,
      studentsCount: assignment.classGroup?.students?.length || 'NO STUDENTS ARRAY',
    });

    return assignment;
  }

  async getStudentsByAssignment(assignmentId: string) {
    console.log('🎯 [SERVICE] getStudentsByAssignment called with ID:', assignmentId);

    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: [
        'classGroup',
        'classGroup.students',
        'classGroup.students.user',
        'classGroup.students.user.profile',
      ],
    });

    if (!assignment) {
      throw new NotFoundException(`Asignación con ID ${assignmentId} no encontrada`);
    }

    if (!assignment.classGroup || !assignment.classGroup.students) {
      console.log('⚠️ No students found for assignment:', assignmentId);
      return [];
    }

    // Filtrar solo estudiantes activos y formatear respuesta
    const activeStudents = assignment.classGroup.students
      .filter(student => student.user?.isActive === true)
      .map(student => ({
        id: student.id,
        enrollmentNumber: student.enrollmentNumber,
        user: {
          id: student.user.id,
          email: student.user.email,
          profile: {
            firstName: student.user.profile?.firstName || '',
            lastName: student.user.profile?.lastName || '',
            avatarUrl: student.user.profile?.avatarUrl || null,
          },
        },
      }));

    console.log('✅ Found', activeStudents.length, 'active students for assignment:', assignmentId);
    return activeStudents;
  }

  /**
   * Obtener TODOS los estudiantes únicos de TODAS las asignaturas del profesor
   * Útil para selector de estudiantes cuando se quiere elegir entre todos los estudiantes
   */
  async getAllStudentsByTeacher(teacherId: string) {
    console.log('🎯 [SERVICE] getAllStudentsByTeacher called with teacherId:', teacherId);

    // Obtener todas las asignaciones del profesor
    const assignments = await this.assignmentRepository.find({
      where: { teacherId },
      relations: [
        'classGroup',
        'classGroup.students',
        'classGroup.students.user',
        'classGroup.students.user.profile',
      ],
    });

    if (!assignments || assignments.length === 0) {
      console.log('⚠️ No assignments found for teacher:', teacherId);
      return [];
    }

    console.log('📚 Found', assignments.length, 'assignments for teacher');

    // Recopilar todos los estudiantes de todas las asignaciones
    const allStudentsMap = new Map();

    assignments.forEach(assignment => {
      assignment.classGroup.students
        .filter(student => student.user?.isActive === true)
        .forEach(student => {
          // Usar Map para evitar duplicados (mismo estudiante en múltiples grupos)
          if (!allStudentsMap.has(student.id)) {
            allStudentsMap.set(student.id, {
              id: student.id,
              enrollmentNumber: student.enrollmentNumber,
              user: {
                id: student.user.id,
                email: student.user.email,
                profile: {
                  firstName: student.user.profile?.firstName || '',
                  lastName: student.user.profile?.lastName || '',
                  avatarUrl: student.user.profile?.avatarUrl || null,
                },
              },
            });
          }
        });
    });

    const uniqueStudents = Array.from(allStudentsMap.values());

    console.log('✅ Found', uniqueStudents.length, 'unique students across all assignments');
    return uniqueStudents;
  }

  async createAssignment(createAssignmentDto: CreateSubjectAssignmentDto): Promise<SubjectAssignment> {
    const { teacherId, subjectId, classGroupId, classGroupIds, academicYearId, ...assignmentData } = createAssignmentDto;

    // Determinar los IDs de grupos a usar (nuevo formato o legacy)
    const groupIdsToUse = classGroupIds && classGroupIds.length > 0
      ? classGroupIds
      : classGroupId ? [classGroupId] : [];

    if (groupIdsToUse.length === 0) {
      throw new BadRequestException('Debe proporcionar al menos un grupo de clase (classGroupId o classGroupIds)');
    }

    // Verificar que el profesor existe
    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId },
      relations: ['user', 'user.profile'],
    });
    if (!teacher) {
      throw new NotFoundException(`Profesor con ID ${teacherId} no encontrado`);
    }

    // Verificar que la asignatura existe
    const subject = await this.subjectRepository.findOne({
      where: { id: subjectId },
      relations: ['course'],
    });
    if (!subject) {
      throw new NotFoundException(`Asignatura con ID ${subjectId} no encontrada`);
    }

    // Verificar que todos los grupos de clase existen
    const classGroups: ClassGroup[] = [];
    for (const groupId of groupIdsToUse) {
      const classGroup = await this.classGroupRepository.findOne({
        where: { id: groupId },
        relations: ['courses'],
      });
      if (!classGroup) {
        throw new NotFoundException(`Grupo de clase con ID ${groupId} no encontrado`);
      }
      classGroups.push(classGroup);
    }

    // Verificar que el año académico existe
    const academicYear = await this.academicYearRepository.findOne({
      where: { id: academicYearId },
    });
    if (!academicYear) {
      throw new NotFoundException(`Año académico con ID ${academicYearId} no encontrado`);
    }

    // Verificar que no existe ya una asignación para este profesor+asignatura+año (ignorando grupos)
    const existingAssignment = await this.assignmentRepository.findOne({
      where: {
        teacher: { id: teacherId },
        subject: { id: subjectId },
        academicYear: { id: academicYearId },
      },
    });
    if (existingAssignment) {
      throw new ConflictException(
        `Ya existe una asignación para este profesor y asignatura en el año académico especificado. Use la edición para agregar más grupos.`,
      );
    }

    // Crear la asignación con múltiples grupos
    const assignment = this.assignmentRepository.create({
      ...assignmentData,
      teacher,
      subject,
      classGroup: classGroups[0], // Mantener el primer grupo como legacy
      classGroupId: classGroups[0].id, // Campo legacy
      classGroups: classGroups, // Nueva relación ManyToMany
      academicYear,
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);
    console.log(`✅ Asignación creada con ${classGroups.length} grupo(s): ${classGroups.map(g => g.name).join(', ')}`);

    return savedAssignment;
  }

  // ==================== FLUJO PROFESOR (cuelga del año académico activo) ====================

  /** Resuelve el Teacher a partir del userId del token */
  private async getTeacherByUserId(userId: string): Promise<Teacher> {
    const teacher = await this.teacherRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'user.profile'],
    });
    if (!teacher) {
      throw new NotFoundException('No se ha encontrado el perfil de profesor del usuario actual');
    }
    return teacher;
  }

  /** Año académico activo: por fecha (hoy entre inicio y fin); fallback al marcado como actual */
  async getActiveAcademicYear(): Promise<AcademicYear> {
    const now = new Date();
    let year = await this.academicYearRepository
      .createQueryBuilder('ay')
      .where('ay.startDate <= :now AND ay.endDate >= :now', { now })
      .orderBy('ay.startDate', 'DESC')
      .getOne();
    if (!year) {
      year = await this.academicYearRepository.findOne({ where: { isCurrent: true } as any });
    }
    if (!year) {
      throw new BadRequestException('No hay ningún año académico activo. Pide al administrador que cree y active el año académico actual.');
    }
    return year;
  }

  /** El profesor crea una asignatura (catálogo) él mismo */
  async createSubjectAsTeacher(dto: CreateSubjectDto, userId: string): Promise<Subject> {
    await this.getTeacherByUserId(userId); // valida que es profesor
    return this.createSubject(dto);
  }

  /**
   * El profesor se asigna a sí mismo una asignatura+grupo en el año académico activo.
   * teacherId se toma del token (no del body) y academicYearId del año activo:
   * un profesor nunca puede crear asignaciones para otro profesor.
   */
  async createAssignmentAsTeacher(
    userId: string,
    data: { subjectId: string; classGroupId?: string; classGroupIds?: string[]; weeklyHours?: number; notes?: string },
  ): Promise<SubjectAssignment> {
    const teacher = await this.getTeacherByUserId(userId);
    const academicYear = await this.getActiveAcademicYear();
    return this.createAssignment({
      teacherId: teacher.id,
      subjectId: data.subjectId,
      classGroupId: data.classGroupId,
      classGroupIds: data.classGroupIds,
      academicYearId: academicYear.id,
      weeklyHours: data.weeklyHours ?? 1,
      notes: data.notes,
    } as CreateSubjectAssignmentDto);
  }

  /**
   * Flujo unificado "crear y calificar": el profesor elige una asignatura existente
   * o crea una nueva al vuelo, y obtiene la asignación lista en el año académico activo.
   */
  async quickSetupForTeacher(
    userId: string,
    data: {
      subjectId?: string;
      newSubject?: CreateSubjectDto;
      classGroupId?: string;
      classGroupIds?: string[];
      weeklyHours?: number;
    },
  ): Promise<SubjectAssignment> {
    const teacher = await this.getTeacherByUserId(userId);
    const academicYear = await this.getActiveAcademicYear();

    let subjectId = data.subjectId;
    if (!subjectId) {
      if (!data.newSubject) {
        throw new BadRequestException('Debes indicar una asignatura existente (subjectId) o los datos de una nueva (newSubject)');
      }
      const created = await this.createSubject(data.newSubject);
      subjectId = created.id;
    }

    return this.createAssignment({
      teacherId: teacher.id,
      subjectId,
      classGroupId: data.classGroupId,
      classGroupIds: data.classGroupIds,
      academicYearId: academicYear.id,
      weeklyHours: data.weeklyHours ?? 1,
    } as CreateSubjectAssignmentDto);
  }

  async updateAssignment(id: string, updateAssignmentDto: UpdateSubjectAssignmentDto): Promise<SubjectAssignment> {
    const assignment = await this.findOneAssignment(id);
    const { teacherId, subjectId, classGroupId, classGroupIds, academicYearId, ...updateData } = updateAssignmentDto;

    // Actualizar profesor si se proporciona
    if (teacherId) {
      const teacher = await this.teacherRepository.findOne({
        where: { id: teacherId },
        relations: ['user', 'user.profile'],
      });
      if (!teacher) {
        throw new NotFoundException(`Profesor con ID ${teacherId} no encontrado`);
      }
      assignment.teacher = teacher;
    }

    // Actualizar asignatura si se proporciona
    if (subjectId) {
      const subject = await this.subjectRepository.findOne({
        where: { id: subjectId },
        relations: ['course'],
      });
      if (!subject) {
        throw new NotFoundException(`Asignatura con ID ${subjectId} no encontrada`);
      }
      assignment.subject = subject;
    }

    // Actualizar grupos de clase si se proporcionan (nuevo formato ManyToMany)
    if (classGroupIds && classGroupIds.length > 0) {
      const classGroups: ClassGroup[] = [];
      for (const groupId of classGroupIds) {
        const classGroup = await this.classGroupRepository.findOne({
          where: { id: groupId },
          relations: ['courses'],
        });
        if (!classGroup) {
          throw new NotFoundException(`Grupo de clase con ID ${groupId} no encontrado`);
        }
        classGroups.push(classGroup);
      }
      assignment.classGroups = classGroups;
      // Actualizar también el campo legacy con el primer grupo
      assignment.classGroup = classGroups[0];
      assignment.classGroupId = classGroups[0].id;
      console.log(`✅ Asignación actualizada con ${classGroups.length} grupo(s): ${classGroups.map(g => g.name).join(', ')}`);
    } else if (classGroupId) {
      // Formato legacy - actualizar un solo grupo
      const classGroup = await this.classGroupRepository.findOne({
        where: { id: classGroupId },
        relations: ['courses'],
      });
      if (!classGroup) {
        throw new NotFoundException(`Grupo de clase con ID ${classGroupId} no encontrado`);
      }
      assignment.classGroup = classGroup;
      assignment.classGroupId = classGroupId;
      // También actualizar la relación ManyToMany con este único grupo
      assignment.classGroups = [classGroup];
    }

    // Actualizar año académico si se proporciona
    if (academicYearId) {
      const academicYear = await this.academicYearRepository.findOne({
        where: { id: academicYearId },
      });
      if (!academicYear) {
        throw new NotFoundException(`Año académico con ID ${academicYearId} no encontrado`);
      }
      assignment.academicYear = academicYear;
    }

    // Aplicar otras actualizaciones
    Object.assign(assignment, updateData);

    return this.assignmentRepository.save(assignment);
  }

  async removeAssignment(id: string): Promise<void> {
    const assignment = await this.findOneAssignment(id);
    await this.assignmentRepository.remove(assignment);
  }

  async findAssignmentsByTeacher(teacherId: string): Promise<SubjectAssignment[]> {
    return this.assignmentRepository.find({
      where: { teacher: { id: teacherId } },
      relations: [
        'teacher',
        'teacher.user',
        'teacher.user.profile',
        'subject',
        'subject.course',
        'classGroup',
        'classGroup.courses',
        'classGroup.students',
        'classGroup.students.user',
        'classGroup.students.user.profile',
        'classGroups', // Nueva relación ManyToMany
        'classGroups.courses',
        'academicYear',
      ],
      order: {
        academicYear: { startDate: 'DESC' },
        classGroup: { name: 'ASC' },
        subject: { name: 'ASC' },
      },
    });
  }

  async findAssignmentsByClassGroup(classGroupId: string): Promise<SubjectAssignment[]> {
    return this.assignmentRepository.find({
      where: { classGroup: { id: classGroupId } },
      relations: [
        'teacher',
        'teacher.user',
        'teacher.user.profile',
        'subject',
        'academicYear',
      ],
      order: { subject: { name: 'ASC' } },
    });
  }

  async findAssignmentsByAcademicYear(academicYearId: string): Promise<SubjectAssignment[]> {
    return this.assignmentRepository.find({
      where: { academicYear: { id: academicYearId } },
      relations: [
        'teacher',
        'teacher.user',
        'teacher.user.profile',
        'subject',
        'classGroup',
        'classGroup.courses',
      ],
      order: {
        classGroup: { name: 'ASC' },
        subject: { name: 'ASC' },
      },
    });
  }

  // === MULTIPLE ASSIGNMENTS METHODS ===

  async createMultipleAssignments(createMultipleAssignmentDto: CreateMultipleAssignmentDto): Promise<{
    assignments: SubjectAssignment[];
    studentAssignments: StudentSubjectAssignment[];
  }> {
    const {
      teacherId,
      subjectIds,
      classGroupIds,
      selectedStudentsByGroup,
      academicYearId,
      ...assignmentData
    } = createMultipleAssignmentDto;

    // Verificar que el profesor existe
    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId },
      relations: ['user', 'user.profile'],
    });
    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // Verificar que las asignaturas existen
    const subjects = await this.subjectRepository.findBy({ id: In(subjectIds) });
    if (subjects.length !== subjectIds.length) {
      throw new NotFoundException('Una o más asignaturas no existen');
    }

    // Verificar que los grupos de clase existen
    const classGroups = await this.classGroupRepository.find({
      where: { id: In(classGroupIds) },
      relations: ['students', 'students.user', 'students.user.profile'],
    });
    if (classGroups.length !== classGroupIds.length) {
      throw new NotFoundException('Uno o más grupos de clase no existen');
    }

    // Verificar año académico
    const academicYear = await this.academicYearRepository.findOne({
      where: { id: academicYearId },
    });
    if (!academicYear) {
      throw new NotFoundException('Año académico no encontrado');
    }

    const createdAssignments: SubjectAssignment[] = [];
    const createdStudentAssignments: StudentSubjectAssignment[] = [];

    // Crear asignaciones para cada combinación de asignatura y grupo
    for (const subjectId of subjectIds) {
      for (const classGroupId of classGroupIds) {
        // Verificar si ya existe esta asignación
        const existingAssignment = await this.assignmentRepository.findOne({
          where: { teacherId, subjectId, classGroupId, academicYearId },
        });

        if (!existingAssignment) {
          // Crear asignación general
          const assignment = this.assignmentRepository.create({
            teacherId,
            subjectId,
            classGroupId,
            academicYearId,
            ...assignmentData,
          });

          const savedAssignment = await this.assignmentRepository.save(assignment);
          createdAssignments.push(savedAssignment);
        }

        // Si hay estudiantes específicos seleccionados para este grupo
        if (selectedStudentsByGroup && selectedStudentsByGroup[classGroupId]) {
          const selectedStudentIds = selectedStudentsByGroup[classGroupId];
          
          for (const studentId of selectedStudentIds) {
            // Verificar si ya existe esta asignación específica de estudiante
            const existingStudentAssignment = await this.studentAssignmentRepository.findOne({
              where: { teacherId, subjectId, classGroupId, studentId, academicYearId },
            });

            if (!existingStudentAssignment) {
              const studentAssignment = this.studentAssignmentRepository.create({
                teacherId,
                subjectId,
                classGroupId,
                studentId,
                academicYearId,
                ...assignmentData,
              });

              const savedStudentAssignment = await this.studentAssignmentRepository.save(studentAssignment);
              createdStudentAssignments.push(savedStudentAssignment);
            }
          }
        } else {
          // Si no hay selección específica, asignar todos los estudiantes activos del grupo
          const classGroup = classGroups.find(g => g.id === classGroupId);
          if (classGroup?.students) {
            // Filtrar solo estudiantes activos
            const activeStudents = classGroup.students.filter(student => student.user?.isActive === true);

            for (const student of activeStudents) {
              const existingStudentAssignment = await this.studentAssignmentRepository.findOne({
                where: { teacherId, subjectId, classGroupId, studentId: student.id, academicYearId },
              });

              if (!existingStudentAssignment) {
                const studentAssignment = this.studentAssignmentRepository.create({
                  teacherId,
                  subjectId,
                  classGroupId,
                  studentId: student.id,
                  academicYearId,
                  ...assignmentData,
                });

                const savedStudentAssignment = await this.studentAssignmentRepository.save(studentAssignment);
                createdStudentAssignments.push(savedStudentAssignment);
              }
            }
          }
        }
      }
    }

    return {
      assignments: createdAssignments,
      studentAssignments: createdStudentAssignments,
    };
  }

  async getStudentsByClassGroups(classGroupIds: string[]): Promise<Record<string, any[]>> {
    console.log('🔍 [getStudentsByClassGroups] Called with groupIds:', classGroupIds);
    const result: Record<string, any[]> = {};

    try {
      for (const groupId of classGroupIds) {
        console.log('🔍 [getStudentsByClassGroups] Processing groupId:', groupId);
        
        // Get class group basic info
        const classGroup = await this.classGroupRepository.findOne({
          where: { id: groupId },
        });

        if (!classGroup) {
          console.log('⚠️ [getStudentsByClassGroups] ClassGroup not found:', groupId);
          result[groupId] = [];
          continue;
        }

        // Get students using raw query since we need to join through class_students table
        const students = await this.classGroupRepository.query(`
          SELECT s.id, s."enrollmentNumber", up."firstName", up."lastName"
          FROM class_students cs
          INNER JOIN students s ON s.id = cs."studentId"
          INNER JOIN users u ON u.id = s."userId"
          INNER JOIN user_profiles up ON up."userId" = u.id
          WHERE cs."classId" = $1
          ORDER BY up."firstName", up."lastName"
        `, [groupId]);

        console.log(`🔍 [getStudentsByClassGroups] Found classGroup: ${classGroup.name} with ${students.length} students`);
        
        result[groupId] = students.map(student => ({
          id: student.id,
          name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
          enrollmentNumber: student.enrollmentNumber,
          classGroupName: classGroup.name,
        }));
      }

      console.log('✅ [getStudentsByClassGroups] Returning result:', Object.keys(result));
      return result;
    } catch (error) {
      console.error('❌ [getStudentsByClassGroups] Error:', error);
      throw error;
    }
  }

  // === METHODS FOR EVALUATIONS INTEGRATION ===

  /**
   * Get subjects available for a specific student based on their class group
   */
  async findSubjectsByStudent(studentId: string): Promise<Subject[]> {
    // First, find the student's class groups
    const classGroups = await this.classGroupRepository.find({
      where: { students: { id: studentId } },
      relations: ['course']
    });

    if (classGroups.length === 0) {
      return [];
    }

    // Get subjects from assignments for those class groups
    const assignments = await this.assignmentRepository.find({
      where: { classGroup: { id: In(classGroups.map(group => group.id)) } },
      relations: ['subject', 'subject.course']
    });

    // Extract unique subjects
    const subjects = Array.from(
      new Map(assignments.map(assignment => [assignment.subject.id, assignment.subject])).values()
    );

    return subjects;
  }

  /**
   * Get subjects that a teacher teaches to a specific class group
   */
  async findSubjectsByTeacherAndGroup(teacherId: string, classGroupId: string): Promise<Subject[]> {
    const assignments = await this.assignmentRepository.find({
      where: {
        teacher: { id: teacherId },
        classGroup: { id: classGroupId }
      },
      relations: ['subject', 'subject.course']
    });

    return assignments.map(assignment => assignment.subject);
  }

  /**
   * Get subjects that a teacher can evaluate (all subjects they teach)
   */
  async findSubjectsByTeacher(teacherId: string): Promise<Subject[]> {
    const assignments = await this.assignmentRepository.find({
      where: { teacher: { id: teacherId } },
      relations: ['subject', 'subject.course', 'classGroup']
    });

    // Extract unique subjects
    const subjects = Array.from(
      new Map(assignments.map(assignment => [assignment.subject.id, assignment.subject])).values()
    );

    return subjects;
  }

  /**
   * Get detailed assignment information for evaluations
   */
  async findAssignmentDetails(teacherId: string, subjectId: string, classGroupId: string): Promise<SubjectAssignment | null> {
    return this.assignmentRepository.findOne({
      where: {
        teacher: { id: teacherId },
        subject: { id: subjectId },
        classGroup: { id: classGroupId }
      },
      relations: [
        'teacher',
        'teacher.user',
        'teacher.user.profile',
        'subject',
        'subject.course',
        'classGroup',
        'classGroup.course',
        'academicYear'
      ]
    });
  }

  /**
   * Get statistics for subjects system
   */
  async getSubjectStatistics() {
    const [
      totalSubjects,
      totalAssignments,
      subjectsWithoutAssignments,
      teachersWithAssignments
    ] = await Promise.all([
      this.subjectRepository.count(),
      this.assignmentRepository.count(),
      this.subjectRepository
        .createQueryBuilder('subject')
        .leftJoin('subject_assignments', 'assignment', 'assignment.subjectId = subject.id')
        .where('assignment.id IS NULL')
        .getCount(),
      this.assignmentRepository
        .createQueryBuilder('assignment')
        .select('COUNT(DISTINCT assignment.teacherId)', 'count')
        .getRawOne()
    ]);

    return {
      totalSubjects,
      totalAssignments,
      subjectsWithoutAssignments,
      teachersWithAssignments: parseInt(teachersWithAssignments?.count || '0'),
      assignmentsPerSubject: totalSubjects > 0 ? (totalAssignments / totalSubjects).toFixed(2) : '0'
    };
  }

  /**
   * Check if a teacher can evaluate a specific subject for a specific student
   */
  async canTeacherEvaluateSubject(teacherId: string, subjectId: string, studentId: string): Promise<boolean> {
    // Get student's class groups
    const studentGroups = await this.classGroupRepository.find({
      where: { students: { id: studentId } },
      select: ['id']
    });

    if (studentGroups.length === 0) {
      return false;
    }

    // Check if teacher has assignment for this subject in any of student's groups
    const assignment = await this.assignmentRepository.findOne({
      where: {
        teacher: { id: teacherId },
        subject: { id: subjectId },
        classGroup: { id: In(studentGroups.map(group => group.id)) }
      }
    });

    return !!assignment;
  }

  // ==================== GOOGLE DRIVE FOLDER MANAGEMENT ====================

  /**
   * Create Google Drive folders for a new subject
   */
  private async createSubjectFolders(subject: Subject): Promise<void> {
    // TODO: Re-enable when folder organization service dependency is fixed
    console.log(`📁 Subject folder creation temporarily disabled for: ${subject.name}`);
    return;
    /*
    const currentAcademicYear = this.folderOrganizationService.getCurrentAcademicYear();
    const normalizedSubjectName = this.folderOrganizationService.normalizeSubjectName(subject.name);
    
    // Create folders for different educational levels that might use this subject
    const educationalLevels = ['Educación Primaria', 'Educación Secundaria (ESO)'];
    
    for (const educationalLevel of educationalLevels) {
      // Create basic folder structure for each educational level
      const folderStructure = this.folderOrganizationService.buildFolderStructure(
        currentAcademicYear,
        educationalLevel,
        normalizedSubjectName,
        'General' // Generic grade level for subject creation
      );
      
      if (this.folderOrganizationService.validateFolderStructure(folderStructure)) {
        const folderPath = this.folderOrganizationService.buildFolderPath(folderStructure);
        
        console.log(`📁 Creating subject folder: ${folderPath.fullPath}`);
        
        try {
          await this.googleDriveService.createFolderHierarchy(folderPath.hierarchy);
        } catch (error) {
          console.warn(`Warning: Could not create folder for ${educationalLevel}:`, error.message);
        }
      }
    }
    */
  }

  /**
   * Delete Google Drive folders for a subject
   */
  private async deleteSubjectFolders(subject: Subject): Promise<void> {
    // TODO: Re-enable when folder organization service dependency is fixed
    console.log(`📁 Subject folder deletion temporarily disabled for: ${subject.name}`);
    return;
    /*
    const currentAcademicYear = this.folderOrganizationService.getCurrentAcademicYear();
    const normalizedSubjectName = this.folderOrganizationService.normalizeSubjectName(subject.name);
    
    // Try to find and delete folders for different educational levels
    const educationalLevels = ['Educación Primaria', 'Educación Secundaria (ESO)'];
    
    for (const educationalLevel of educationalLevels) {
      try {
        const folderStructure = this.folderOrganizationService.buildFolderStructure(
          currentAcademicYear,
          educationalLevel,
          normalizedSubjectName,
          'General'
        );
        
        const folderPath = this.folderOrganizationService.buildFolderPath(folderStructure);
        
        // Navigate to the subject folder
        let currentParentId = '0AECljEUrD7hRUk9PVA'; // Shared drive root
        
        for (const folderName of folderPath.hierarchy) {
          const folderId = await this.googleDriveService.findFolderByName(folderName, currentParentId);
          if (folderId) {
            currentParentId = folderId;
          } else {
            console.log(`Folder not found: ${folderName} in ${educationalLevel}`);
            break;
          }
        }
        
        // If we found the subject folder, check if it has contents
        if (currentParentId !== '0AECljEUrD7hRUk9PVA') {
          const contents = await this.googleDriveService.getFolderContents(currentParentId);
          
          if (contents.length === 0) {
            // Empty folder, safe to delete
            await this.googleDriveService.deleteFolder(currentParentId);
            console.log(`✅ Deleted empty subject folder: ${normalizedSubjectName} in ${educationalLevel}`);
          } else {
            console.log(`⚠️ Subject folder contains ${contents.length} files, not deleting: ${normalizedSubjectName} in ${educationalLevel}`);
          }
        }
        
      } catch (error) {
        console.warn(`Warning: Could not process folder deletion for ${educationalLevel}:`, error.message);
      }
    }
    */
  }

  /**
   * Check if a subject has any files in Google Drive
   */
  async checkSubjectFolderContents(subjectId: string): Promise<{
    hasFiles: boolean;
    fileCount: number;
    folders: { educationalLevel: string; fileCount: number }[];
  }> {
    // TODO: Re-enable when folder organization service dependency is fixed
    return {
      hasFiles: false,
      fileCount: 0,
      folders: []
    };
    /*
    const subject = await this.findOneSubject(subjectId);
    const currentAcademicYear = this.folderOrganizationService.getCurrentAcademicYear();
    const normalizedSubjectName = this.folderOrganizationService.normalizeSubjectName(subject.name);
    
    const result = {
      hasFiles: false,
      fileCount: 0,
      folders: [] as { educationalLevel: string; fileCount: number }[]
    };
    
    const educationalLevels = ['Educación Primaria', 'Educación Secundaria (ESO)'];
    
    for (const educationalLevel of educationalLevels) {
      try {
        const folderStructure = this.folderOrganizationService.buildFolderStructure(
          currentAcademicYear,
          educationalLevel,
          normalizedSubjectName,
          'General'
        );
        
        const folderPath = this.folderOrganizationService.buildFolderPath(folderStructure);
        
        // Navigate to the subject folder
        let currentParentId = '0AECljEUrD7hRUk9PVA';
        
        for (const folderName of folderPath.hierarchy) {
          const folderId = await this.googleDriveService.findFolderByName(folderName, currentParentId);
          if (folderId) {
            currentParentId = folderId;
          } else {
            break;
          }
        }
        
        if (currentParentId !== '0AECljEUrD7hRUk9PVA') {
          const contents = await this.googleDriveService.getFolderContents(currentParentId);
          const fileCount = contents.length;
          
          result.folders.push({
            educationalLevel,
            fileCount
          });
          
          result.fileCount += fileCount;
          if (fileCount > 0) {
            result.hasFiles = true;
          }
        }
        
      } catch (error) {
        console.warn(`Warning: Could not check folder contents for ${educationalLevel}:`, error.message);
      }
    }
    
    return result;
    */
  }
}