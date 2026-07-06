import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { EducationalLevel } from './entities/educational-level.entity';
import { Subject } from './entities/subject.entity';
import { Task } from '../tasks/entities/task.entity';
import { Activity } from '../activities/entities/activity.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(EducationalLevel)
    private educationalLevelsRepository: Repository<EducationalLevel>,
  ) {}

  // Helper para generar año académico en formato correcto (ej: "2025-2026")
  private generateAcademicYear(): string {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Si estamos en enero-agosto, el año académico empezó el año anterior
    // Si estamos en septiembre-diciembre, el año académico empezó este año
    if (currentMonth >= 9) {
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  }

  async findAll(includeInactive: boolean = false): Promise<Student[]> {
    const whereCondition = includeInactive ? {} : { user: { isActive: true } };

    return this.studentsRepository.find({
      relations: ['user', 'user.profile', 'educationalLevel', 'course', 'classGroups'],
      where: whereCondition,
    });
  }

  async findOne(id: string): Promise<Student> {
    const student = await this.studentsRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile', 'educationalLevel', 'course', 'classGroups'],
    });
    
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    
    return student;
  }

  async findByUserId(userId: string): Promise<Student> {
    const student = await this.studentsRepository.findOne({
      where: { user: { id: userId } },
      relations: [
        'user', 
        'user.profile', 
        'classGroups', 
        'educationalLevel', 
        'course'
      ],
    });
    
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    
    return student;
  }

  async searchByName(searchTerm: string): Promise<Student[]> {
    console.log('🔍 [StudentsService] searchByName llamado con término:', searchTerm);
    
    try {
      // Usar query raw SQL directa para evitar problemas con TypeORM
      console.log('🔍 [StudentsService] Ejecutando query raw SQL...');
      
      const rawResults = await this.studentsRepository.query(`
        SELECT 
          s.id,
          s."enrollmentNumber",
          s."birthDate",
          s."createdAt",
          s."updatedAt",
          u.id as user_id,
          u.email as user_email,
          u."isActive" as user_isActive,
          up.id as profile_id,
          up."firstName" as profile_firstName,
          up."lastName" as profile_lastName,
          up."avatarUrl" as profile_avatarUrl,
          el.id as educational_level_id,
          el.name as educational_level_name,
          c.id as course_id,
          c.name as course_name
        FROM students s
        INNER JOIN users u ON s."userId" = u.id
        INNER JOIN user_profiles up ON u.id = up."userId"
        LEFT JOIN educational_levels el ON s."educationalLevelId" = el.id
        LEFT JOIN courses c ON s."courseId" = c.id
        WHERE (
          LOWER(up."firstName") LIKE LOWER($1) OR 
          LOWER(up."lastName") LIKE LOWER($1) OR 
          LOWER(CONCAT(up."firstName", ' ', up."lastName")) LIKE LOWER($1) OR 
          s."enrollmentNumber" LIKE $1
        ) AND u."isActive" = true
        ORDER BY up."lastName" ASC, up."firstName" ASC
        LIMIT 20
      `, [`%${searchTerm}%`]);
      
      console.log('🔍 [StudentsService] Raw query retornó:', rawResults.length, 'resultados');
      
      if (rawResults.length > 0) {
        console.log('🔍 [StudentsService] Primer resultado:', {
          firstName: rawResults[0].profile_firstName,
          lastName: rawResults[0].profile_lastName,
          enrollmentNumber: rawResults[0].enrollmentNumber
        });
      }
      
      // Convertir resultados raw a objetos Student
      const students = rawResults.map(row => {
        const student = new Student();
        student.id = row.id;
        student.enrollmentNumber = row.enrollmentNumber;
        student.birthDate = row.birthDate;
        student.createdAt = row.createdAt;
        student.updatedAt = row.updatedAt;
        
        // Crear objeto user relacionado
        student.user = {
          id: row.user_id,
          email: row.user_email,
          isActive: row.user_isActive,
          profile: {
            id: row.profile_id,
            firstName: row.profile_firstName,
            lastName: row.profile_lastName,
            avatarUrl: row.profile_avatarUrl,
          }
        } as any;
        
        // Crear objetos relacionados si existen
        if (row.educational_level_id) {
          student.educationalLevel = {
            id: row.educational_level_id,
            name: row.educational_level_name
          } as any;
        }
        
        if (row.course_id) {
          student.course = {
            id: row.course_id,
            name: row.course_name
          } as any;
        }
        
        return student;
      });
      
      console.log('🔍 [StudentsService] Retornando', students.length, 'estudiantes convertidos');
      return students;
      
    } catch (error) {
      console.error('🔍 [StudentsService] Error en searchByName:', error);
      console.error('🔍 [StudentsService] Stack trace:', error.stack);
      throw error;
    }
  }

  /**
   * Obtener estudiantes asignados a un profesor específico
   */
  async findStudentsByTeacher(teacherId: string): Promise<Student[]> {
    // Obtener estudiantes a través de las asignaciones de materias (subject_assignments)
    const students = await this.studentsRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('student.educationalLevel', 'educationalLevel')
      .leftJoinAndSelect('student.course', 'course')
      .leftJoinAndSelect('student.classGroups', 'classGroups')
      .leftJoin('subject_assignments', 'sa', 'sa.classGroupId = classGroups.id')
      .leftJoin('teachers', 'teacher', 'teacher.id = sa.teacherId')
      .where('teacher.userId = :teacherId', { teacherId })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .distinctOn(['student.id'])
      .orderBy('student.id')
      .addOrderBy('profile.lastName', 'ASC')
      .addOrderBy('profile.firstName', 'ASC')
      .getMany();

    return students;
  }

  /**
   * Conjunto de alumnos accesibles para un profesor (RGPD):
   * unión de los grupos donde es TUTOR y los grupos donde imparte una ASIGNATURA.
   * @param userId User.id del profesor autenticado (req.user.id === req.user.userId)
   */
  async findAccessibleStudentsByUserId(userId: string): Promise<Student[]> {
    return this.studentsRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('student.educationalLevel', 'educationalLevel')
      .leftJoinAndSelect('student.course', 'course')
      .leftJoinAndSelect('student.classGroups', 'classGroups')
      .leftJoin('subject_assignments', 'sa', 'sa.classGroupId = classGroups.id')
      .leftJoin('teachers', 'subjectTeacher', 'subjectTeacher.id = sa.teacherId')
      .leftJoin('teachers', 'tutorTeacher', 'tutorTeacher.id = classGroups.tutorId')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere(
        '(subjectTeacher.userId = :userId OR tutorTeacher.userId = :userId)',
        { userId },
      )
      .distinctOn(['student.id'])
      .orderBy('student.id')
      .addOrderBy('profile.lastName', 'ASC')
      .addOrderBy('profile.firstName', 'ASC')
      .getMany();
  }

  /**
   * Indica si un profesor puede acceder a la ficha de un alumno concreto.
   * Reutiliza el criterio de findAccessibleStudentsByUserId (tutoría ∪ asignatura).
   */
  async canTeacherAccessStudent(userId: string, studentId: string): Promise<boolean> {
    const count = await this.studentsRepository
      .createQueryBuilder('student')
      .leftJoin('student.classGroups', 'classGroups')
      .leftJoin('subject_assignments', 'sa', 'sa.classGroupId = classGroups.id')
      .leftJoin('teachers', 'subjectTeacher', 'subjectTeacher.id = sa.teacherId')
      .leftJoin('teachers', 'tutorTeacher', 'tutorTeacher.id = classGroups.tutorId')
      .where('student.id = :studentId', { studentId })
      .andWhere(
        '(subjectTeacher.userId = :userId OR tutorTeacher.userId = :userId)',
        { userId },
      )
      .getCount();

    return count > 0;
  }

  async create(createStudentDto: any): Promise<Student> {
    const { email, password, firstName, lastName, phone, dni, enrollmentNumber, birthDate, educationalLevelId } = createStudentDto;

    // Check if email already exists
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('El email ya está en uso');
    }

    // Check if enrollment number already exists
    const existingStudent = await this.studentsRepository.findOne({ where: { enrollmentNumber } });
    if (existingStudent) {
      throw new ConflictException('El número de matrícula ya está en uso');
    }

    // Validate educational level if provided
    let educationalLevel = null;
    if (educationalLevelId) {
      educationalLevel = await this.educationalLevelsRepository.findOne({ where: { id: educationalLevelId } });
      if (!educationalLevel) {
        throw new NotFoundException('Nivel educativo no encontrado');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.usersRepository.create({
      email,
      passwordHash: hashedPassword,
      role: UserRole.STUDENT,
      isActive: true,
    });
    const savedUser = await this.usersRepository.save(user);

    // Create user profile
    const profile = this.userProfileRepository.create({
      firstName,
      lastName,
      phone,
      dni,
      user: savedUser,
    });
    await this.userProfileRepository.save(profile);

    // Create student
    const student = this.studentsRepository.create({
      user: savedUser,
      enrollmentNumber,
      birthDate: birthDate ? new Date(birthDate) : new Date(),
      educationalLevel,
    });

    return this.studentsRepository.save(student);
  }

  async update(id: string, updateStudentDto: any): Promise<Student> {
    console.log('🚨🚨🚨 [STUDENTS SERVICE] UPDATE METHOD CALLED!');
    console.log('🚨 [STUDENTS SERVICE] Student ID:', id);
    console.log('🚨 [STUDENTS SERVICE] Update data:', JSON.stringify(updateStudentDto, null, 2));
    
    const student = await this.findOne(id);
    console.log('🚨 [STUDENTS SERVICE] Found student:', student ? 'YES' : 'NO');
    
    const { email, firstName, lastName, phone, dni, enrollmentNumber, newPassword, educationalLevelId, birthDate } = updateStudentDto;
    
    console.log('🚨 [STUDENTS SERVICE] Extracted birthDate:', birthDate);
    console.log('🚨 [STUDENTS SERVICE] birthDate type:', typeof birthDate);

    // Update user email if provided
    if (email && email !== student.user.email) {
      const existingUser = await this.usersRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException('El email ya está en uso');
      }
      student.user.email = email;
      await this.usersRepository.save(student.user);
    }

    // Handle password change if newPassword is provided
    if (newPassword) {
      student.user.password = newPassword;
      await this.usersRepository.save(student.user);
    }

    // Update profile
    if (firstName) student.user.profile.firstName = firstName;
    if (lastName) student.user.profile.lastName = lastName;
    if (phone !== undefined) student.user.profile.phone = phone;
    if (dni !== undefined) student.user.profile.dni = dni;
    await this.userProfileRepository.save(student.user.profile);

    // Update student data
    if (enrollmentNumber && enrollmentNumber !== student.enrollmentNumber) {
      const existingStudent = await this.studentsRepository.findOne({ where: { enrollmentNumber } });
      if (existingStudent && existingStudent.id !== id) {
        throw new ConflictException('El número de matrícula ya está en uso');
      }
      student.enrollmentNumber = enrollmentNumber;
    }

    // Update educational level if provided
    if (educationalLevelId !== undefined) {
      if (educationalLevelId === null) {
        student.educationalLevel = null;
      } else {
        const educationalLevel = await this.educationalLevelsRepository.findOne({ where: { id: educationalLevelId } });
        if (!educationalLevel) {
          throw new NotFoundException('Nivel educativo no encontrado');
        }
        student.educationalLevel = educationalLevel;
      }
    }

    // Update birth date if provided - Update both student.birthDate AND user.profile.dateOfBirth
    if (birthDate !== undefined) {
      console.log('🚨 [STUDENTS SERVICE] UPDATING BIRTHDATE!');
      console.log('🚨 [STUDENTS SERVICE] Old student.birthDate:', student.birthDate);
      console.log('🚨 [STUDENTS SERVICE] Old user.profile.dateOfBirth:', student.user?.profile?.dateOfBirth);
      console.log('🚨 [STUDENTS SERVICE] New birthDate value:', birthDate);
      
      const newBirthDate = birthDate ? new Date(birthDate) : null;
      
      // Update student.birthDate
      student.birthDate = newBirthDate;
      
      // Also update user.profile.dateOfBirth to keep them in sync
      if (student.user?.profile) {
        student.user.profile.dateOfBirth = newBirthDate;
        console.log('🚨 [STUDENTS SERVICE] Updated user.profile.dateOfBirth to:', student.user.profile.dateOfBirth);
      }
      
      console.log('🚨 [STUDENTS SERVICE] Final student.birthDate:', student.birthDate);
    } else {
      console.log('🚨 [STUDENTS SERVICE] birthDate is undefined, not updating');
    }

    console.log('🔧 [DEBUG] Final student data before save:', {
      id: student.id,
      birthDate: student.birthDate,
      firstName: student.user?.profile?.firstName,
      lastName: student.user?.profile?.lastName
    });

    const savedStudent = await this.studentsRepository.save(student);
    console.log('🔧 [DEBUG] Student saved successfully with birthDate:', savedStudent.birthDate);
    
    return savedStudent;
  }

  async changePassword(userId: string, changePasswordDto: any): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;
    
    // Find student by userId
    const student = await this.findByUserId(userId);
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, student.user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new ConflictException('La contraseña actual es incorrecta');
    }
    
    // Update password using entity virtual field
    student.user.password = newPassword;
    await this.usersRepository.save(student.user);
    
    return { message: 'Contraseña actualizada exitosamente' };
  }

  async findByEducationalStages(stages: string[]): Promise<Student[]> {
    const queryBuilder = this.studentsRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('student.educationalLevel', 'educationalLevel')
      .leftJoinAndSelect('student.course', 'course')
      .leftJoinAndSelect('student.classGroups', 'classGroups')
      .where('educationalLevel.name IN (:...stages)', { stages });

    return queryBuilder.getMany();
  }

  async updatePhoto(id: string, photoUrl: string): Promise<Student> {
    const student = await this.findOne(id);
    
    // Update the user profile's avatarUrl instead of student.photoUrl
    if (student.user?.profile) {
      student.user.profile.avatarUrl = photoUrl;
      await this.userProfileRepository.save(student.user.profile);
      console.log(`✅ Updated avatarUrl for student ${id}: ${photoUrl}`);
    } else {
      console.warn(`⚠️ No user profile found for student ${id}`);
    }
    
    return student;
  }

  async removePhoto(id: string): Promise<Student> {
    const student = await this.findOne(id);
    
    // Remove the photo by setting avatarUrl to null
    if (student.user?.profile) {
      student.user.profile.avatarUrl = null;
      await this.userProfileRepository.save(student.user.profile);
      console.log(`✅ Removed avatarUrl for student ${id}`);
    } else {
      console.warn(`⚠️ No user profile found for student ${id}`);
    }
    
    return student;
  }

  async remove(id: string): Promise<void> {
    const student = await this.findOne(id);

    // Si el estudiante ya está inactivo, intentar hard delete (eliminación permanente)
    if (!student.user.isActive) {
      try {
        // Hard delete: eliminar el estudiante y su usuario de la base de datos
        await this.studentsRepository.remove(student);
        await this.usersRepository.remove(student.user);
        return;
      } catch (error) {
        // Si falla por foreign key constraint, significa que tiene datos académicos asociados
        if (error.code === '23503') { // PostgreSQL foreign key violation
          throw new ConflictException(
            'No se puede eliminar permanentemente este estudiante porque tiene datos académicos asociados ' +
            '(evaluaciones, tareas entregadas, etc.). El estudiante permanecerá desactivado.'
          );
        }
        throw error;
      }
    }

    // Si el estudiante está activo, hacer soft delete (desactivar)
    student.user.isActive = false;
    await this.usersRepository.save(student.user);
  }

  /**
   * Desactiva un estudiante y todas sus familias asociadas
   * Esto incluye desactivar al estudiante y a todos los contactos (padre/madre) de sus familias
   */
  async deactivateStudentAndFamilies(id: string): Promise<{
    student: Student;
    deactivatedFamilies: number;
    deactivatedFamilyContacts: number;
  }> {
    const student = await this.findOne(id);

    if (!student.user.isActive) {
      throw new ConflictException('El estudiante ya está desactivado');
    }

    // Buscar todas las familias asociadas a este estudiante
    const familyStudents = await this.studentsRepository.query(`
      SELECT DISTINCT fs."familyId"
      FROM family_students fs
      WHERE fs."studentId" = $1
    `, [id]);

    let deactivatedFamilies = 0;
    let deactivatedFamilyContacts = 0;

    // Desactivar todas las familias asociadas
    for (const fs of familyStudents) {
      const familyId = fs.familyId;

      // Obtener la familia con sus contactos
      const family = await this.studentsRepository.query(`
        SELECT
          f.id,
          f."primaryContactId",
          f."secondaryContactId"
        FROM families f
        WHERE f.id = $1
      `, [familyId]);

      if (family && family.length > 0) {
        const { primaryContactId, secondaryContactId } = family[0];

        // Desactivar contacto primario
        if (primaryContactId) {
          await this.usersRepository.update(
            { id: primaryContactId },
            { isActive: false }
          );
          deactivatedFamilyContacts++;
        }

        // Desactivar contacto secundario si existe
        if (secondaryContactId) {
          await this.usersRepository.update(
            { id: secondaryContactId },
            { isActive: false }
          );
          deactivatedFamilyContacts++;
        }

        deactivatedFamilies++;
      }
    }

    // Desactivar el estudiante
    student.user.isActive = false;
    await this.usersRepository.save(student.user);

    return {
      student,
      deactivatedFamilies,
      deactivatedFamilyContacts
    };
  }

  /**
   * Reactivar un estudiante y todas sus familias asociadas
   */
  async reactivateStudentAndFamilies(id: string): Promise<{
    student: Student;
    reactivatedFamilies: number;
    reactivatedFamilyContacts: number;
  }> {
    const student = await this.findOne(id);

    if (student.user.isActive) {
      throw new ConflictException('El estudiante ya está activo');
    }

    // Buscar todas las familias asociadas a este estudiante
    const familyStudents = await this.studentsRepository.query(`
      SELECT DISTINCT fs."familyId"
      FROM family_students fs
      WHERE fs."studentId" = $1
    `, [id]);

    let reactivatedFamilies = 0;
    let reactivatedFamilyContacts = 0;

    // Reactivar todas las familias asociadas
    for (const fs of familyStudents) {
      const familyId = fs.familyId;

      // Obtener la familia con sus contactos
      const family = await this.studentsRepository.query(`
        SELECT
          f.id,
          f."primaryContactId",
          f."secondaryContactId"
        FROM families f
        WHERE f.id = $1
      `, [familyId]);

      if (family && family.length > 0) {
        const { primaryContactId, secondaryContactId } = family[0];

        // Reactivar contacto primario
        if (primaryContactId) {
          await this.usersRepository.update(
            { id: primaryContactId },
            { isActive: true }
          );
          reactivatedFamilyContacts++;
        }

        // Reactivar contacto secundario si existe
        if (secondaryContactId) {
          await this.usersRepository.update(
            { id: secondaryContactId },
            { isActive: true }
          );
          reactivatedFamilyContacts++;
        }

        reactivatedFamilies++;
      }
    }

    // Reactivar el estudiante
    student.user.isActive = true;
    await this.usersRepository.save(student.user);

    return {
      student,
      reactivatedFamilies: reactivatedFamilies,
      reactivatedFamilyContacts: reactivatedFamilyContacts
    };
  }

  async getStudentStatistics(userId: string): Promise<any> {
    // First, get the student record to find the studentId
    const student = await this.findByUserId(userId);
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    console.log('📊 Getting statistics for student:', student.id);

    // Get academic information and statistics
    const academicInfo = await this.getStudentAcademicInfo(student.id);
    const statistics = await this.calculateStudentStatistics(student.id);

    return {
      // Academic Information
      academicInfo: {
        educationalLevel: student.educationalLevel?.name || 'No asignado',
        course: student.course?.name || 'No asignado',
        classGroups: student.classGroups?.map(cg => ({
          name: cg.name,
          section: cg.section
        })) || [],
        enrollmentNumber: student.enrollmentNumber,
        academicYear: this.generateAcademicYear(),
      },
      // Statistics
      statistics
    };
  }

  private async getStudentAcademicInfo(studentId: string) {
    try {
      // Get subjects through subject assignments
      const subjectsQuery = await this.studentsRepository.query(`
        SELECT DISTINCT s.id, s.name, s.code
        FROM students st
        INNER JOIN class_group_students cgs ON st.id = cgs."studentId"
        INNER JOIN subject_assignments sa ON cgs."classGroupId" = sa."classGroupId"
        INNER JOIN subjects s ON sa."subjectId" = s.id
        WHERE st.id = $1
      `, [studentId]);

      return {
        totalSubjects: subjectsQuery.length,
        subjects: subjectsQuery.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code
        }))
      };
    } catch (error) {
      console.error('Error getting student academic info:', error);
      return {
        totalSubjects: 0,
        subjects: []
      };
    }
  }

  private async calculateStudentStatistics(studentId: string) {
    try {
      // Get evaluations count
      const evaluationsCount = await this.studentsRepository.query(`
        SELECT COUNT(*) as total_evaluations
        FROM evaluations e 
        WHERE e."studentId" = $1
      `, [studentId]);

      // Get recent attendance (last 30 days)
      const attendanceStats = await this.studentsRepository.query(`
        SELECT 
          COUNT(*) as total_days,
          SUM(CASE WHEN ar.status IN ('present', 'late') THEN 1 ELSE 0 END) as present_days
        FROM attendance_records ar
        WHERE ar."studentId" = $1 
        AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
      `, [studentId]);

      // Get task submissions stats
      const taskStats = await this.studentsRepository.query(`
        SELECT 
          COUNT(*) as total_tasks,
          SUM(CASE WHEN ts."submissionDate" IS NOT NULL THEN 1 ELSE 0 END) as completed_tasks
        FROM tasks t
        LEFT JOIN task_submissions ts ON t.id = ts."taskId" AND ts."studentId" = $1
        INNER JOIN subject_assignments sa ON t."subjectAssignmentId" = sa.id
        INNER JOIN class_groups cg ON sa."classGroupId" = cg.id
        INNER JOIN class_group_students cgs ON cg.id = cgs."classGroupId" AND cgs."studentId" = $1
        WHERE t."createdAt" >= CURRENT_DATE - INTERVAL '90 days'
      `, [studentId]);

      const totalEvaluations = parseInt(evaluationsCount[0]?.total_evaluations || '0');
      const attendanceData = attendanceStats[0];
      const totalDays = parseInt(attendanceData?.total_days || '0');
      const presentDays = parseInt(attendanceData?.present_days || '0');
      const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
      
      const taskData = taskStats[0];
      const totalTasks = parseInt(taskData?.total_tasks || '0');
      const completedTasks = parseInt(taskData?.completed_tasks || '0');
      const pendingTasks = totalTasks - completedTasks;

      return {
        totalEvaluations,
        attendanceRate,
        attendanceDays: `${presentDays}/${totalDays}`,
        completedTasks,
        pendingTasks,
        totalTasks,
        taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      };
    } catch (error) {
      console.error('Error calculating student statistics:', error);
      return {
        totalEvaluations: 0,
        attendanceRate: 0,
        attendanceDays: '0/0',
        completedTasks: 0,
        pendingTasks: 0,
        totalTasks: 0,
        taskCompletionRate: 0
      };
    }
  }
}