import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Course } from '../students/entities/course.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { UpdateClassGroupDto } from './dto/update-class-group.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';

@Injectable()
export class ClassGroupsService {
  constructor(
    @InjectRepository(ClassGroup)
    private readonly classGroupRepository: Repository<ClassGroup>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(AcademicYear)
    private readonly academicYearRepository: Repository<AcademicYear>,
  ) {}

  async findAll(): Promise<ClassGroup[]> {
    // Cargar todos los grupos y luego filtrar students activos en post-procesamiento
    const classGroups = await this.classGroupRepository.find({
      relations: [
        'academicYear',
        'courses',
        'courses.cycle',
        'courses.cycle.educationalLevel',
        'tutor',
        'tutor.user',
        'tutor.user.profile',
        'students',
        'students.user',
        'students.user.profile',
      ],
      order: {
        academicYear: { startDate: 'DESC' },
        section: 'ASC',
      },
    });

    // Filtrar estudiantes activos en cada grupo
    return classGroups.map(group => ({
      ...group,
      students: group.students.filter(student => student.user?.isActive === true)
    }));
  }

  // Método privado que devuelve la entidad completa sin filtrar (para operaciones de escritura)
  private async _findOneRaw(id: string): Promise<ClassGroup> {
    // Usar QueryBuilder para evitar cache de TypeORM después de actualizaciones SQL directas
    const classGroup = await this.classGroupRepository
      .createQueryBuilder('classGroup')
      .leftJoinAndSelect('classGroup.academicYear', 'academicYear')
      .leftJoinAndSelect('classGroup.courses', 'courses')
      .leftJoinAndSelect('courses.cycle', 'cycle')
      .leftJoinAndSelect('cycle.educationalLevel', 'educationalLevel')
      .leftJoinAndSelect('classGroup.tutor', 'tutor')
      .leftJoinAndSelect('tutor.user', 'tutorUser')
      .leftJoinAndSelect('tutorUser.profile', 'tutorProfile')
      .leftJoinAndSelect('classGroup.students', 'students')
      .leftJoinAndSelect('students.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .where('classGroup.id = :id', { id })
      .cache(false)  // Desactivar cache explícitamente
      .getOne();

    if (!classGroup) {
      throw new NotFoundException(`Grupo de clase con ID ${id} no encontrado`);
    }

    return classGroup;
  }

  // Método público para obtener grupo de clase (devuelve TODOS los estudiantes incluso inactivos)
  // El admin necesita ver todos los estudiantes para poder gestionarlos correctamente
  async findOne(id: string): Promise<ClassGroup> {
    console.log(`🔍 [findOne] GET request for class group: ${id}`);

    const classGroup = await this._findOneRaw(id);
    console.log(`📊 [findOne] Returning ${classGroup.students.length} students (including inactive)`);

    return classGroup;
  }

  async findByAcademicYear(academicYearId: string): Promise<ClassGroup[]> {
    const classGroups = await this.classGroupRepository.find({
      where: { academicYear: { id: academicYearId } },
      relations: [
        'academicYear',
        'courses',
        'courses.cycle',
        'courses.cycle.educationalLevel',
        'tutor',
        'tutor.user',
        'tutor.user.profile',
        'students',
        'students.user',
        'students.user.profile',
      ],
      order: {
        section: 'ASC',
      },
    });

    // Filtrar estudiantes activos en cada grupo
    return classGroups.map(group => ({
      ...group,
      students: group.students.filter(student => student.user?.isActive === true)
    }));
  }

  async findByCourse(courseId: string): Promise<ClassGroup[]> {
    const classGroups = await this.classGroupRepository.find({
      where: { courses: { id: courseId } },
      relations: [
        'academicYear',
        'courses',
        'tutor',
        'tutor.user',
        'tutor.user.profile',
        'students',
        'students.user',
        'students.user.profile',
      ],
      order: {
        academicYear: { startDate: 'DESC' },
        section: 'ASC',
      },
    });

    // Filtrar estudiantes activos en cada grupo
    return classGroups.map(group => ({
      ...group,
      students: group.students.filter(student => student.user?.isActive === true)
    }));
  }

  async findByTutor(tutorId: string): Promise<ClassGroup[]> {
    const classGroups = await this.classGroupRepository.find({
      where: { tutor: { id: tutorId } },
      relations: [
        'academicYear',
        'courses',
        'courses.cycle',
        'courses.cycle.educationalLevel',
        'students',
        'students.user',
        'students.user.profile',
      ],
      order: {
        academicYear: { startDate: 'DESC' },
      },
    });

    // Filtrar estudiantes activos en cada grupo
    return classGroups.map(group => ({
      ...group,
      students: group.students.filter(student => student.user?.isActive === true)
    }));
  }

  async findByTeacherUserId(userId: string): Promise<ClassGroup[]> {
    const classGroups = await this.classGroupRepository
      .createQueryBuilder('classGroup')
      .leftJoinAndSelect('classGroup.academicYear', 'academicYear')
      .leftJoinAndSelect('classGroup.courses', 'courses')
      .leftJoinAndSelect('courses.cycle', 'cycle')
      .leftJoinAndSelect('cycle.educationalLevel', 'educationalLevel')
      .leftJoinAndSelect('classGroup.tutor', 'tutor')
      .leftJoinAndSelect('tutor.user', 'tutorUser')
      .leftJoinAndSelect('tutorUser.profile', 'tutorProfile')
      .leftJoinAndSelect('classGroup.students', 'students')
      .leftJoinAndSelect('students.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .where('tutorUser.id = :userId', { userId })
      .orderBy('academicYear.startDate', 'DESC')
      .addOrderBy('classGroup.section', 'ASC')
      .getMany();

    // Filtrar estudiantes activos en cada grupo
    return classGroups.map(group => ({
      ...group,
      students: group.students.filter(student => student.user?.isActive === true)
    }));
  }

  async create(createClassGroupDto: CreateClassGroupDto): Promise<ClassGroup> {
    const { academicYearId, courseIds, tutorId, studentIds, ...classGroupData } = createClassGroupDto;

    // Verificar que el año académico existe
    const academicYear = await this.academicYearRepository.findOne({
      where: { id: academicYearId },
    });
    if (!academicYear) {
      throw new NotFoundException(`Año académico con ID ${academicYearId} no encontrado`);
    }

    // Verificar que los cursos existen
    const courses = await this.courseRepository.find({
      where: { id: In(courseIds) },
      relations: ['cycle', 'cycle.educationalLevel'],
    });
    if (courses.length !== courseIds.length) {
      throw new NotFoundException(`Uno o más cursos no fueron encontrados`);
    }

    // Verificar si ya existe un grupo con el mismo nombre en el mismo año académico
    const existingClassGroup = await this.classGroupRepository.findOne({
      where: {
        name: classGroupData.name,
        academicYear: { id: academicYearId },
      },
    });
    if (existingClassGroup) {
      throw new ConflictException(
        `Ya existe un grupo de clase con el nombre "${classGroupData.name}" en el año académico ${academicYear.name}`,
      );
    }

    // Verificar que el tutor existe (si se proporciona)
    let tutor: Teacher | undefined;
    if (tutorId) {
      tutor = await this.teacherRepository.findOne({
        where: { id: tutorId },
        relations: ['user', 'user.profile'],
      });
      if (!tutor) {
        throw new NotFoundException(`Profesor con ID ${tutorId} no encontrado`);
      }
    }

    // Verificar que los estudiantes existen (si se proporcionan)
    let students: Student[] = [];
    if (studentIds && studentIds.length > 0) {
      students = await this.studentRepository.find({
        where: { id: In(studentIds) },
        relations: ['user', 'user.profile'],
      });
      if (students.length !== studentIds.length) {
        const foundIds = students.map(s => s.id);
        const missingIds = studentIds.filter(id => !foundIds.includes(id));
        throw new NotFoundException(
          `Estudiantes con IDs ${missingIds.join(', ')} no encontrados`,
        );
      }
    }

    // Crear el grupo de clase
    const classGroup = this.classGroupRepository.create({
      ...classGroupData,
      academicYear,
      courses,
      tutor,
      students,
    });

    return this.classGroupRepository.save(classGroup);
  }

  async update(id: string, updateClassGroupDto: UpdateClassGroupDto): Promise<ClassGroup> {
    console.log(`🔧 [ClassGroupsService] UPDATE called for class group ${id}`);
    console.log(`📦 [ClassGroupsService] Received DTO:`, JSON.stringify(updateClassGroupDto, null, 2));

    // Usar _findOneRaw para obtener la entidad TypeORM completa
    const classGroup = await this._findOneRaw(id);
    const { academicYearId, courseIds, tutorId, studentIds, ...updateData} = updateClassGroupDto;

    console.log(`📊 [ClassGroupsService] Extracted studentIds:`, studentIds);

    // Actualizar año académico si se proporciona
    if (academicYearId) {
      const academicYear = await this.academicYearRepository.findOne({
        where: { id: academicYearId },
      });
      if (!academicYear) {
        throw new NotFoundException(`Año académico con ID ${academicYearId} no encontrado`);
      }
      classGroup.academicYear = academicYear;
    }

    // Actualizar cursos si se proporcionan
    if (courseIds) {
      const courses = await this.courseRepository.find({
        where: { id: In(courseIds) },
        relations: ['cycle', 'cycle.educationalLevel'],
      });
      if (courses.length !== courseIds.length) {
        throw new NotFoundException(`Uno o más cursos no fueron encontrados`);
      }
      classGroup.courses = courses;
    }

    // Actualizar tutor si se proporciona
    if (tutorId) {
      const tutor = await this.teacherRepository.findOne({
        where: { id: tutorId },
        relations: ['user', 'user.profile'],
      });
      if (!tutor) {
        throw new NotFoundException(`Profesor con ID ${tutorId} no encontrado`);
      }
      classGroup.tutor = tutor;
    }

    // Actualizar estudiantes si se proporcionan
    if (studentIds !== undefined) {
      console.log(`🔍 [ClassGroupsService] Updating students for class group ${id}`);
      console.log(`📋 [ClassGroupsService] Received studentIds:`, studentIds);

      if (studentIds.length > 0) {
        // Filtrar IDs vacíos, null o undefined
        const validStudentIds = studentIds.filter(id => id && typeof id === 'string' && id.trim() !== '');
        console.log(`✅ [ClassGroupsService] Valid studentIds after filtering:`, validStudentIds);

        if (validStudentIds.length === 0) {
          console.log(`⚠️ [ClassGroupsService] No valid student IDs, clearing students`);
          classGroup.students = [];
        } else {
          // Validate that students exist before starting transaction
          const studentCount = await this.studentRepository.count({
            where: { id: In(validStudentIds) },
          });

          if (studentCount !== validStudentIds.length) {
            const existingStudents = await this.studentRepository.find({
              where: { id: In(validStudentIds) },
              select: ['id'],
            });
            const foundIds = existingStudents.map(s => s.id);
            const missingIds = validStudentIds.filter(id => !foundIds.includes(id));
            console.error(`❌ [ClassGroupsService] Missing student IDs:`, missingIds);
            throw new NotFoundException(
              `Estudiantes con IDs ${missingIds.join(', ')} no encontrados en la base de datos`,
            );
          }

          console.log(`📊 [ClassGroupsService] Found ${studentCount} students in database`);

          // CRITICAL FIX: Use direct SQL to update many-to-many relationship
          await this.classGroupRepository.manager.transaction(async transactionalEntityManager => {
            console.log(`🔄 [ClassGroupsService] Starting transaction to update students`);

            // Delete existing relationships for this class group
            await transactionalEntityManager.query(
              `DELETE FROM class_students WHERE "classId" = $1`,
              [id]
            );
            console.log(`🗑️ [ClassGroupsService] Deleted existing student relationships`);

            // Insert new relationships
            if (validStudentIds.length > 0) {
              const values = validStudentIds.map((studentId, index) =>
                `($${index * 2 + 1}, $${index * 2 + 2})`
              ).join(', ');

              const params = validStudentIds.flatMap(studentId => [id, studentId]);

              await transactionalEntityManager.query(
                `INSERT INTO class_students ("classId", "studentId") VALUES ${values}`,
                params
              );
              console.log(`✅ [ClassGroupsService] Inserted ${validStudentIds.length} student relationships`);
            }

            console.log(`✅ [ClassGroupsService] Transaction completed successfully`);
          });

          // CRITICAL: Transaction already saved everything correctly
          // Return immediately without additional saves to avoid overwriting
          console.log(`🎯 [ClassGroupsService] Students updated successfully via transaction, returning result`);
          return this.findOne(id); // Return filtered result for frontend
        }
      } else {
        console.log(`📭 [ClassGroupsService] Empty studentIds array, clearing students`);
        classGroup.students = [];
      }
    }

    // Aplicar otros cambios solo si NO se actualizaron estudiantes
    Object.assign(classGroup, updateData);

    // Log final antes de guardar
    console.log(`💾 [ClassGroupsService] About to save class group ${id}`);
    console.log(`📋 [ClassGroupsService] Final students count:`, classGroup.students?.length || 0);
    console.log(`📋 [ClassGroupsService] Final students IDs:`, classGroup.students?.map(s => s.id) || []);

    try {
      const result = await this.classGroupRepository.save(classGroup);
      console.log(`✅ [ClassGroupsService] Class group saved successfully`);
      return result;
    } catch (error) {
      console.error(`❌ [ClassGroupsService] Error saving class group:`, error.message);
      console.error(`❌ [ClassGroupsService] Error details:`, error);
      throw error;
    }
  }

  async assignStudents(id: string, assignStudentsDto: AssignStudentsDto): Promise<ClassGroup> {
    const classGroup = await this._findOneRaw(id);
    const { studentIds } = assignStudentsDto;

    const students = await this.studentRepository.find({
      where: { id: In(studentIds) },
      relations: ['user', 'user.profile'],
    });

    if (students.length !== studentIds.length) {
      const foundIds = students.map(s => s.id);
      const missingIds = studentIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(
        `Estudiantes con IDs ${missingIds.join(', ')} no encontrados`,
      );
    }

    // Añadir estudiantes que no estén ya asignados
    const currentStudentIds = classGroup.students.map(s => s.id);
    const newStudents = students.filter(s => !currentStudentIds.includes(s.id));
    
    classGroup.students = [...classGroup.students, ...newStudents];

    return this.classGroupRepository.save(classGroup);
  }

  async removeStudent(id: string, studentId: string): Promise<ClassGroup> {
    const classGroup = await this._findOneRaw(id);
    
    classGroup.students = classGroup.students.filter(s => s.id !== studentId);

    return this.classGroupRepository.save(classGroup);
  }

  async assignTutor(id: string, tutorId: string): Promise<ClassGroup> {
    const classGroup = await this._findOneRaw(id);
    
    const tutor = await this.teacherRepository.findOne({
      where: { id: tutorId },
      relations: ['user', 'user.profile'],
    });

    if (!tutor) {
      throw new NotFoundException(`Profesor con ID ${tutorId} no encontrado`);
    }

    classGroup.tutor = tutor;

    return this.classGroupRepository.save(classGroup);
  }

  async removeTutor(id: string): Promise<ClassGroup> {
    const classGroup = await this._findOneRaw(id);
    
    classGroup.tutor = null;

    return this.classGroupRepository.save(classGroup);
  }

  async remove(id: string): Promise<void> {
    const classGroup = await this._findOneRaw(id);
    
    try {
      // Clear many-to-many relationships before deletion
      classGroup.students = [];
      classGroup.courses = [];
      classGroup.tutor = null;
      
      // Save to clear relationships in join tables
      await this.classGroupRepository.save(classGroup);
      
      // Now safely remove the class group
      await this.classGroupRepository.remove(classGroup);
    } catch (error) {
      // If there are still foreign key constraints, provide a helpful error message
      if (error.code === '23503') {
        throw new BadRequestException(
          'No se puede eliminar el grupo de clase porque tiene actividades, mensajes, notificaciones o asignaciones asociadas. Elimine primero estos elementos relacionados.'
        );
      }
      throw error;
    }
  }

  async getAvailableStudents(courseId?: string): Promise<Student[]> {
    const queryBuilder = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('student.course', 'course')
      .leftJoinAndSelect('student.classGroups', 'classGroups');

    if (courseId) {
      queryBuilder.andWhere('course.id = :courseId', { courseId });
    }

    return queryBuilder.getMany();
  }

  async getAvailableTeachers(): Promise<Teacher[]> {
    return this.teacherRepository.find({
      relations: ['user', 'user.profile'],
      where: { user: { isActive: true } },
    });
  }

  async getAvailableCourses(): Promise<Course[]> {
    const query = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.cycle', 'cycle')
      .leftJoinAndSelect('cycle.educationalLevel', 'educationalLevel')
      .orderBy(`CASE educationalLevel.code 
                 WHEN 'INFANTIL' THEN 1 
                 WHEN 'PRIMARIA' THEN 2 
                 WHEN 'SECUNDARIA' THEN 3 
                 ELSE 4 END`, 'ASC')
      .addOrderBy('cycle.order', 'ASC')
      .addOrderBy('course.order', 'ASC');
    
    const result = await query.getMany();
    return result;
  }

  async findTeacherClasses(teacherId: string): Promise<ClassGroup[]> {
    // Get classes where teacher is tutor
    const tutoredClasses = await this.classGroupRepository.find({
      where: { tutor: { id: teacherId } },
      relations: [
        'academicYear',
        'courses',
        'courses.cycle',
        'courses.cycle.educationalLevel',
        'tutor',
        'tutor.user',
        'tutor.user.profile',
      ],
    });

    // Get classes where teacher has subject assignments
    const assignmentClasses = await this.classGroupRepository
      .createQueryBuilder('classGroup')
      .leftJoinAndSelect('classGroup.academicYear', 'academicYear')
      .leftJoinAndSelect('classGroup.courses', 'courses')
      .leftJoinAndSelect('courses.cycle', 'cycle')
      .leftJoinAndSelect('cycle.educationalLevel', 'educationalLevel')
      .leftJoinAndSelect('classGroup.tutor', 'tutor')
      .leftJoinAndSelect('tutor.user', 'tutorUser')
      .leftJoinAndSelect('tutorUser.profile', 'tutorProfile')
      .innerJoin('subject_assignments', 'sa', 'sa.classGroupId = classGroup.id')
      .where('sa.teacherId = :teacherId', { teacherId })
      .getMany();

    // Combine and deduplicate classes
    const allClassesMap = new Map<string, ClassGroup>();
    
    [...tutoredClasses, ...assignmentClasses].forEach(classGroup => {
      allClassesMap.set(classGroup.id, classGroup);
    });

    return Array.from(allClassesMap.values()).sort((a, b) => {
      // Ordenar por nivel educativo primero
      const aLevel = a.courses[0]?.cycle?.educationalLevel?.code || '';
      const bLevel = b.courses[0]?.cycle?.educationalLevel?.code || '';
      
      // Orden específico de niveles educativos
      const levelOrder = { 'INFANTIL': 1, 'PRIMARIA': 2, 'SECUNDARIA': 3 };
      const aOrder = levelOrder[aLevel] || 999;
      const bOrder = levelOrder[bLevel] || 999;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Si son del mismo nivel, ordenar por nombre del grupo
      return a.name.localeCompare(b.name);
    });
  }

  async findTeacherClassesByUserId(userId: string): Promise<ClassGroup[]> {
    // Primero encontrar el teacher por userId
    const teacher = await this.teacherRepository.findOne({
      where: { user: { id: userId } },
      select: ['id'],
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado para este usuario');
    }

    return this.findTeacherClasses(teacher.id);
  }
}