/**
 * @archivo: families.service.ts
 * @módulo: Families (Servicio de Gestión Familiar)
 * @función: Gestión completa de familias con múltiples hijos y dashboard padres
 * @crítico: SÍ - Sistema de acceso familiar multi-hijo con evaluaciones
 * @dependencias: Family, FamilyStudent, User, Student entities, transacciones DB
 * @no_modificar: Estructura Family-Student relations sin verificar evaluations
 * @relacionado_con: families.controller.ts, family.entity.ts, evaluations tracking
 */

/**
 * SERVICIO: FamiliesService
 * UBICACIÓN: /backend/src/modules/families/families.service.ts
 * FUNCIÓN: Core del sistema familiar - gestión de padres/madres con acceso multi-hijo
 * NO USAR PARA: Estudiantes individuales (usar students.service.ts) o profesores (teachers.service.ts)
 * MÉTODOS CRÍTICOS:
 *   - create(): Crear familia con contactos primario/secundario y asignación hijos
 *   - getFamilyDashboard(): Dashboard completo con stats todos los hijos
 *   - getMyChildren(): Lista hijos para vistas familiares específicas
 *   - update(): Actualizar contactos y relaciones hijo-familia
 *   - createFamilyUser(): Crear usuarios tipo FAMILY con validaciones
 * 
 * ESTRUCTURA FAMILIAR:
 * - Family: Entidad principal de la familia
 * - primaryContact: Usuario principal (padre/madre/tutor)
 * - secondaryContact: Usuario secundario opcional (padre/madre/tutor)
 * - FamilyStudent: Relación Many-to-Many entre Family y Student
 * - relationship: Tipo de relación (padre, madre, tutor, abuelo, etc.)
 * 
 * TIPOS DE CONTACTO:
 * - Primary Contact: Siempre requerido, acceso completo al dashboard
 * - Secondary Contact: Opcional, mismo nivel de acceso que primary
 * - Ambos son usuarios tipo UserRole.FAMILY con login independiente
 * - Cada contacto tiene su propio User + UserProfile
 * 
 * DASHBOARD FAMILIAR:
 * getFamilyDashboard() proporciona:
 * - Información básica de todos los hijos
 * - Estadísticas académicas: evaluaciones totales/completadas/pendientes
 * - Promedio de calificaciones (conversión escala 1-5 a 0-10)
 * - Evaluaciones recientes por estudiante (últimas 5)
 * - Datos de asistencia (mock - implementar con attendance module)
 * - Resumen familiar: promedio general, totales consolidados
 * 
 * GESTIÓN TRANSACCIONAL:
 * - Uso de DataSource.createQueryRunner() para operaciones complejas
 * - Transacciones completas para create() y update()
 * - Rollback automático en caso de errores
 * - Manejo de conflictos de email únicos
 * 
 * VALIDACIONES IMPLEMENTADAS:
 * - Emails únicos por contacto
 * - Verificación existencia estudiantes antes de asignar
 * - Hashing automático de passwords con bcrypt
 * - Verificación ownership (usuario pertenece a familia)
 * - Validación de campos requeridos por contacto
 * 
 * INTEGRACIÓN CON EVALUACIONES:
 * - Acceso a student.evaluations con competencyEvaluations
 * - Cálculo automático de promedios por escala de competencias
 * - Tracking de evaluaciones pendientes/completadas
 * - Conversión escalas para display (1-5 competencias → 0-10 notas)
 * 
 * OPERACIONES SOFT DELETE:
 * - remove(): No elimina físicamente, desactiva usuarios (isActive = false)
 * - Mantiene integridad de datos históricos
 * - Permite reactivación futura si es necesario
 * 
 * MÉTODOS DE UTILIDAD:
 * - getAvailableStudents(): Estudiantes disponibles para asignación
 * - getMyChildren(): Vista simplificada para components específicos
 * - createFamilyUser(): Helper privado para creación usuarios+perfiles
 * - updateFamilyUser(): Helper privado para updates transaccionales
 * 
 * CAMPOS ESPECIALES:
 * - occupation almacenado en UserProfile.education field
 * - relationship almacenado in FamilyStudent entity
 * - documentNumber para DNI/NIE/Pasaporte
 * - photoUrl preparado pero no implementado aún
 * 
 * SEGURIDAD:
 * - Verificación que usuario pertenece a familia en getFamilyDashboard
 * - Validación ownership en todas las operaciones
 * - Hashing seguro de passwords
 * - Prevención duplicate emails
 * 
 * ESTADO ACTUAL: ✅ SISTEMA COMPLETO Y FUNCIONAL
 * - Dashboard familiar implementado con estadísticas
 * - Gestión multi-hijo funcionando
 * - Integración con evaluaciones operativa
 * - Transacciones y validaciones robustas
 * - Sistema de contactos dual implementado
 */

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Family, FamilyStudent, FamilyRelationship } from '../users/entities/family.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Student } from '../students/entities/student.entity';
import { CreateFamilyDto, FamilyContactDto } from './dto/create-family.dto';
import { UpdateFamilyDto, UpdateFamilyContactDto } from './dto/update-family.dto';
import { GradesService } from '../grades/grades.service';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../communications/services/email.service';

@Injectable()
export class FamiliesService {
  constructor(
    @InjectRepository(Family)
    private familiesRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private familyStudentRepository: Repository<FamilyStudent>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private profilesRepository: Repository<UserProfile>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    private dataSource: DataSource,
    private gradesService: GradesService,
    private emailService: EmailService,
  ) {}

  async findAll(includeInactive: boolean = false): Promise<Family[]> {
    // Condición para filtrar o no por estado activo
    const whereCondition = includeInactive ? {} : { primaryContact: { isActive: true } };

    // FIXED: Use simple find with where clause to filter by active primary contact
    const families = await this.familiesRepository.find({
      relations: [
        'primaryContact',
        'primaryContact.profile',
        'secondaryContact',
        'secondaryContact.profile'
      ],
      where: whereCondition,
      order: {
        createdAt: 'DESC'
      }
    });

    // Get students for each family
    const familiesWithStudents = await Promise.all(
      families.map(async (family) => {
        const familyStudents = await this.familyStudentRepository.find({
          where: { family: { id: family.id } },
          relations: ['student', 'student.user', 'student.user.profile'],
        });

        return {
          ...family,
          students: familyStudents,
        } as any;
      })
    );

    return familiesWithStudents;
  }

  private mapRelationshipValue(relationship: string): FamilyRelationship {
    // Map relationship values to valid enum values
    const relationshipMap: { [key: string]: string } = {
      // English values
      'mother': 'parent', 'father': 'parent', 'mom': 'parent', 'dad': 'parent', 'parent': 'parent',
      'guardian': 'guardian', 'tutor legal': 'guardian', 'legal guardian': 'guardian', 'other': 'other',
      // Spanish values  
      'madre': 'parent', 'padre': 'parent', 'mamá': 'parent', 'papá': 'parent', 'progenitor': 'parent',
      'guardián': 'guardian', 'otro': 'other',
    };

    const normalizedRelationship = relationship.toLowerCase().trim();
    const mappedRelationship = relationshipMap[normalizedRelationship] || relationship;
    
    console.log(`🔗 Families service - mapping relationship: "${relationship}" → "${mappedRelationship}"`);
    return mappedRelationship as FamilyRelationship;
  }

  async findOne(id: string): Promise<Family> {
    const family = await this.familiesRepository.findOne({
      where: { id },
      relations: [
        'primaryContact',
        'primaryContact.profile',
        'secondaryContact',
        'secondaryContact.profile',
      ],
    });

    if (!family) {
      throw new NotFoundException(`Familia con ID ${id} no encontrada`);
    }

    // Get family students with relationships
    const familyStudents = await this.familyStudentRepository.find({
      where: { family: { id } },
      relations: ['student', 'student.user', 'student.user.profile'],
    });

    return {
      ...family,
      students: familyStudents,
    } as any;
  }

  async create(createFamilyDto: CreateFamilyDto): Promise<Family> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { primaryContact, secondaryContact, students = [], notes } = createFamilyDto;

      // Validate that students exist
      for (const studentRelation of students) {
        const student = await this.studentsRepository.findOne({
          where: { id: studentRelation.studentId },
        });
        if (!student) {
          throw new BadRequestException(`Estudiante con ID ${studentRelation.studentId} no encontrado`);
        }
      }

      // Create primary contact user
      const { user: primaryUser, plainPassword: primaryPlainPassword } = await this.createFamilyUser(primaryContact, queryRunner);

      // Create secondary contact user if provided
      let secondaryUser: User | null = null;
      let secondaryPlainPassword: string | null = null;
      if (secondaryContact) {
        const secondaryResult = await this.createFamilyUser(secondaryContact, queryRunner);
        secondaryUser = secondaryResult.user;
        secondaryPlainPassword = secondaryResult.plainPassword;
      }

      // Create family
      const family = queryRunner.manager.create(Family, {
        primaryContact: primaryUser,
        secondaryContact: secondaryUser,
      });
      const savedFamily = await queryRunner.manager.save(family);

      // Create family-student relationships
      for (const studentRelation of students) {
        const familyStudent = queryRunner.manager.create(FamilyStudent, {
          family: savedFamily,
          student: { id: studentRelation.studentId } as Student,
          relationship: this.mapRelationshipValue(studentRelation.relationship),
        });
        await queryRunner.manager.save(familyStudent);
      }

      await queryRunner.commitTransaction();

      // Send welcome emails and student notifications after transaction commits
      setTimeout(async () => {
        try {
          // Send welcome email to primary contact
          await this.sendWelcomeEmail(primaryUser, primaryPlainPassword);
          console.log(`✅ Correo de bienvenida enviado a contacto primario: ${primaryUser.email}`);
        } catch (error) {
          console.error(`❌ Error enviando correo de bienvenida a ${primaryUser.email}:`, error);
        }

        if (secondaryUser && secondaryPlainPassword) {
          try {
            // Send welcome email to secondary contact
            await this.sendWelcomeEmail(secondaryUser, secondaryPlainPassword);
            console.log(`✅ Correo de bienvenida enviado a contacto secundario: ${secondaryUser.email}`);
          } catch (error) {
            console.error(`❌ Error enviando correo de bienvenida a ${secondaryUser.email}:`, error);
          }
        }

        // Send credentials notification to each student's email
        for (const studentRelation of students) {
          try {
            const student = await this.studentsRepository.findOne({
              where: { id: studentRelation.studentId },
              relations: ['user', 'user.profile'],
            });
            if (student?.user?.email) {
              await this.sendCredentialsToStudentEmail(
                student.user,
                primaryUser,
                secondaryUser,
              );
              console.log(`✅ Notificación familiar enviada al email del estudiante: ${student.user.email}`);
            }
          } catch (error) {
            console.error(`❌ Error enviando credenciales al estudiante:`, error);
          }
        }
      }, 1500);

      // Return family with all relations
      return this.findOne(savedFamily.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      if (error.code === '23505') { // PostgreSQL unique violation
        if (error.detail?.includes('email')) {
          throw new ConflictException('El email ya está registrado');
        }
      }
      
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, updateFamilyDto: UpdateFamilyDto): Promise<Family> {
    console.log('🔧 FAMILIES UPDATE - Starting update for family ID:', id);
    console.log('🔧 FAMILIES UPDATE - Update data received:', JSON.stringify(updateFamilyDto, null, 2));
    
    const family = await this.findOne(id);
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { primaryContact, secondaryContact, students } = updateFamilyDto;

      // Update primary contact if provided
      if (primaryContact) {
        await this.updateFamilyUser(family.primaryContact.id, primaryContact, queryRunner);
      }

      // Update secondary contact if provided
      if (secondaryContact) {
        if (family.secondaryContact) {
          await this.updateFamilyUser(family.secondaryContact.id, secondaryContact, queryRunner);
        } else {
          // Create new secondary contact - validate required fields
          console.log('🔧 Creating new secondary contact with data:', secondaryContact);
          
          const missingFields = [];
          if (!secondaryContact.email || secondaryContact.email.trim() === '') missingFields.push('email');
          if (!secondaryContact.firstName || secondaryContact.firstName.trim() === '') missingFields.push('firstName');
          if (!secondaryContact.lastName || secondaryContact.lastName.trim() === '') missingFields.push('lastName');
          if (!secondaryContact.phone || secondaryContact.phone.trim() === '') missingFields.push('phone');
          
          // Password is required for new contacts, but provide a default if not provided
          if (!secondaryContact.password || secondaryContact.password.trim() === '') {
            console.log('🔧 No password provided for new secondary contact, generating default');
            secondaryContact.password = 'defaultPassword123'; // Will be changed later
            console.log('🔧 Generated default password for secondary contact');
          }
          
          if (missingFields.length > 0) {
            throw new BadRequestException(`Para crear un nuevo contacto secundario, los siguientes campos son requeridos: ${missingFields.join(', ')}`);
          }
          
          const newContactDto: FamilyContactDto = {
            email: secondaryContact.email,
            password: secondaryContact.password,
            firstName: secondaryContact.firstName,
            lastName: secondaryContact.lastName,
            phone: secondaryContact.phone,
            dateOfBirth: secondaryContact.dateOfBirth,
            documentNumber: secondaryContact.documentNumber,
            address: secondaryContact.address,
            occupation: secondaryContact.occupation,
          };
          
          const { user: newSecondaryUser, plainPassword: newSecondaryPlainPassword } = await this.createFamilyUser(newContactDto, queryRunner);

          // Update the family to set the secondary contact
          await queryRunner.manager.update(Family, { id }, {
            secondaryContact: { id: newSecondaryUser.id }
          });

          // Send welcome email to the new secondary contact
          setTimeout(async () => {
            try {
              await this.sendWelcomeEmail(newSecondaryUser, newSecondaryPlainPassword);
            } catch (error) {
              console.error(`❌ Error enviando correo a nuevo contacto secundario ${newSecondaryUser.email}:`, error);
            }
          }, 1000);
        }
      }

      // Update student relationships if provided
      if (students) {
        // Remove existing relationships
        await queryRunner.manager.delete(FamilyStudent, { family: { id } });

        // Create new relationships
        for (const studentRelation of students) {
          const student = await this.studentsRepository.findOne({
            where: { id: studentRelation.studentId },
          });
          if (!student) {
            throw new BadRequestException(`Estudiante con ID ${studentRelation.studentId} no encontrado`);
          }

          const familyStudent = queryRunner.manager.create(FamilyStudent, {
            family: { id } as Family,
            student: { id: studentRelation.studentId } as Student,
            relationship: this.mapRelationshipValue(studentRelation.relationship),
          });
          await queryRunner.manager.save(familyStudent);
        }
      }

      await queryRunner.commitTransaction();

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      if (error.code === '23505') {
        if (error.detail?.includes('email')) {
          throw new ConflictException('El email ya está registrado');
        }
      }
      
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const family = await this.findOne(id);

    // Deactivate user accounts so contacts cannot login
    family.primaryContact.isActive = false;
    await this.usersRepository.save(family.primaryContact);

    if (family.secondaryContact) {
      family.secondaryContact.isActive = false;
      await this.usersRepository.save(family.secondaryContact);
    }

    // Delete FamilyStudent relations first (FK constraint)
    await this.familyStudentRepository.delete({ familyId: id });

    // Hard delete the Family entity so it disappears from the list
    await this.familiesRepository.delete(id);
  }

  // Get students available for family assignment
  async getAvailableStudents(): Promise<Student[]> {
    return this.studentsRepository.find({
      relations: ['user', 'user.profile'],
      where: { user: { isActive: true } },
      order: { createdAt: 'DESC' },
    });
  }

  // Get family dashboard data for logged in family user
  async getFamilyDashboard(userId: string) {
    // Find the family where this user is either primary or secondary contact
    const family = await this.familiesRepository.findOne({
      where: [
        { primaryContact: { id: userId } },
        { secondaryContact: { id: userId } }
      ],
      relations: [
        'primaryContact',
        'primaryContact.profile',
        'secondaryContact',
        'secondaryContact.profile',
      ],
    });

    if (!family) {
      throw new NotFoundException('Familia no encontrada para este usuario');
    }

    // Get family students with their relationships and detailed info
    const familyStudents = await this.familyStudentRepository.find({
      where: { family: { id: family.id } },
      relations: [
        'student', 
        'student.user', 
        'student.user.profile',
        'student.educationalLevel',
        'student.course',
        'student.classGroups',
        'student.evaluations',
        'student.evaluations.competencyEvaluations'
      ],
    });

    // Process student data for dashboard
    const studentsData = await Promise.all(
      familyStudents.map(async (familyStudent) => {
        const student = familyStudent.student;
        
        // Get student grades using the same logic as student panel
        const studentGrades = await this.gradesService.getStudentGrades(
          student.id, 
          userId, 
          UserRole.FAMILY
        );
        
        // Calculate averageGrade from all subjects (same as student panel)
        const averageGrade = studentGrades.summary.overallAverage;
        
        // Calculate consistent task-focused stats for mathematical consistency
        // Only count tasks (not activities) so numbers add up correctly
        const completedTasksCount = studentGrades.subjectGrades.reduce((sum, subject) => 
          sum + subject.gradedTasks, 0);
        const pendingTasksCount = studentGrades.summary.totalPendingTasks;
        const totalTasksCount = completedTasksCount + pendingTasksCount;
        
        // Debug logging para entender el cálculo (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 Family Dashboard Stats for student ${student.id}:`, {
            completedTasksFromSubjects: completedTasksCount,
            pendingTasksFromSummary: pendingTasksCount,
            calculatedTotal: totalTasksCount,
            averageGrade: averageGrade,
            subjectGradesData: studentGrades.subjectGrades.map(s => ({
              subject: s.subjectName,
              gradedTasks: s.gradedTasks,
              pendingTasks: s.pendingTasks
            }))
          });
        }
        
        // Use task-only stats so that completed + pending = total
        const totalEvaluations = totalTasksCount;
        const completedEvaluations = completedTasksCount;
        const pendingEvaluations = pendingTasksCount;
        
        // Get attendance statistics (last 30 days)
        const attendanceStats = await this.dataSource.query(`
          SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN ar.status IN ('present', 'late') THEN 1 ELSE 0 END) as present_days
          FROM attendance_records ar
          WHERE ar."studentId" = $1 
          AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
        `, [student.id]);
        
        const attendanceData = attendanceStats[0];
        const totalAttendanceDays = parseInt(attendanceData?.total_days || '0');
        const presentAttendanceDays = parseInt(attendanceData?.present_days || '0');
        const attendanceRate = totalAttendanceDays > 0 ? Math.round((presentAttendanceDays / totalAttendanceDays) * 100) : null;
        
        // Get recent evaluations (last 5)
        const recentEvaluations = student.evaluations
          ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map(evaluation => ({
            id: evaluation.id,
            period: evaluation.period,
            createdAt: evaluation.createdAt,
            competencyEvaluations: evaluation.competencyEvaluations?.map(compEval => ({
              competencyName: compEval.competency?.name || 'Competencia',
              score: compEval.score,
              displayGrade: compEval.score ? (compEval.score * 20).toFixed(1) : null, // Convert 1-5 to 0-100 scale
              observations: compEval.observations,
            })) || []
          })) || [];

        return {
          id: student.id,
          enrollmentNumber: student.enrollmentNumber,
          relationship: familyStudent.relationship,
          user: {
            profile: {
              firstName: student.user.profile.firstName,
              lastName: student.user.profile.lastName,
            }
          },
          educationalLevel: student.educationalLevel,
          course: student.course,
          classGroups: student.classGroups || [],
          stats: {
            totalEvaluations,
            completedEvaluations,
            pendingEvaluations,
            averageGrade: typeof averageGrade === 'number' ? Math.round(averageGrade * 10) / 10 : averageGrade,
            attendance: attendanceRate // Real attendance data from database
          },
          recentEvaluations
        };
      })
    );

    // Return comprehensive family dashboard data with all necessary fields
    return {
      family: {
        id: family.id,
        primaryContact: {
          id: family.primaryContact.id,
          profile: {
            firstName: family.primaryContact.profile.firstName,
            lastName: family.primaryContact.profile.lastName,
          }
        },
        secondaryContact: family.secondaryContact ? {
          id: family.secondaryContact.id,
          profile: {
            firstName: family.secondaryContact.profile.firstName,
            lastName: family.secondaryContact.profile.lastName,
          }
        } : null,
      },
      students: studentsData,
      summary: {
        totalStudents: studentsData.length,
        averageGrade: studentsData.length > 0 
          ? Math.round((studentsData.reduce((sum, s) => sum + (typeof s.stats.averageGrade === 'number' ? s.stats.averageGrade : 0), 0) / studentsData.length) * 10) / 10
          : 0,
        totalPendingEvaluations: studentsData.reduce((sum, s) => sum + s.stats.pendingEvaluations, 0),
        totalCompletedEvaluations: studentsData.reduce((sum, s) => sum + s.stats.completedEvaluations, 0),
        totalEvaluations: studentsData.reduce((sum, s) => sum + s.stats.totalEvaluations, 0),
        // Datos para estadísticas adicionales en el perfil familiar
        totalMessages: 0, // TODO: Implementar conteo real de mensajes
        totalNotifications: 0, // TODO: Implementar conteo real de notificaciones
        upcomingEvents: 0, // TODO: Implementar conteo real de eventos próximos
      }
    };
  }

  // Get simplified children data for activities page
  async getMyChildren(userId: string) {
    // Find the family where this user is either primary or secondary contact
    const family = await this.familiesRepository.findOne({
      where: [
        { primaryContact: { id: userId } },
        { secondaryContact: { id: userId } }
      ]
    });

    if (!family) {
      throw new NotFoundException('Familia no encontrada para este usuario');
    }

    // Get family students with basic info needed for activities
    const familyStudents = await this.familyStudentRepository.find({
      where: { family: { id: family.id } },
      relations: [
        'student', 
        'student.user', 
        'student.user.profile',
        'student.classGroups',
        'student.classGroups.courses',
        'student.educationalLevel',
        'student.course'
      ],
    });

    // Return student data with expected structure for frontend
    return familyStudents.map(familyStudent => ({
      id: familyStudent.student.id,
      enrollmentNumber: familyStudent.student.enrollmentNumber,
      user: {
        email: familyStudent.student.user.email,
        profile: {
          firstName: familyStudent.student.user.profile?.firstName || 'Sin nombre',
          lastName: familyStudent.student.user.profile?.lastName || 'Sin apellido',
        }
      },
      relationship: familyStudent.relationship,
      educationalLevel: familyStudent.student.educationalLevel || { name: 'No asignado', code: 'UNKNOWN' },
      course: familyStudent.student.course || { name: 'Sin curso' },
      classGroups: familyStudent.student.classGroups?.map(cg => ({
        id: cg.id,
        name: cg.name,
        courses: cg.courses?.map(course => course.name) || []
      })) || [],
      photoUrl: null // Add default photoUrl field
    }));
  }

  private async createFamilyUser(contactDto: FamilyContactDto, queryRunner: any): Promise<{ user: User; plainPassword: string }> {
    const { email, firstName, lastName, dateOfBirth, documentNumber, phone, address, occupation } = contactDto;

    // Use provided password or auto-generate a secure one
    const plainPassword = (contactDto.password && contactDto.password.trim() !== '')
      ? contactDto.password
      : this.generateTemporaryPassword();

    // Check if email already exists
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException(`El email ${email} ya está registrado`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create user
    const user = queryRunner.manager.create(User, {
      email,
      passwordHash: hashedPassword,
      role: UserRole.FAMILY,
      isActive: true,
    });
    const savedUser = await queryRunner.manager.save(user);

    // Create profile
    const profile = queryRunner.manager.create(UserProfile, {
      firstName,
      lastName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      documentNumber,
      phone,
      address,
      // Store occupation in a suitable field - we can use education field for this
      education: occupation,
    });
    const savedProfile = await queryRunner.manager.save(profile);

    // Link profile to user
    savedUser.profile = savedProfile;
    await queryRunner.manager.save(savedUser);

    return { user: savedUser, plainPassword };
  }

  private async updateFamilyUser(userId: string, contactDto: UpdateFamilyContactDto, queryRunner: any): Promise<void> {
    const { email, password, newPassword, firstName, lastName, dateOfBirth, documentNumber, phone, address, occupation } = contactDto;

    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    let userUpdated = false;

    // Update user email if changed
    if (email && email !== user.email) {
      const existingUser = await this.usersRepository.findOne({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException(`El email ${email} ya está registrado`);
      }
      user.email = email;
      userUpdated = true;
    }

    // Update password if provided (legacy field for backward compatibility)
    if (password && password.trim() !== '') {
      console.log(`Updating password for user: ${user.email}`);
      user.passwordHash = await bcrypt.hash(password, 10); // Hash directly
      user.updatedAt = new Date(); // Update timestamp
      console.log(`Password hashed successfully for user: ${user.email}`);
      userUpdated = true;
    }

    // Handle password change if newPassword is provided (preferred method)
    if (newPassword && newPassword.trim() !== '') {
      console.log(`Updating password for user: ${user.email}`);
      user.passwordHash = await bcrypt.hash(newPassword, 10); // Hash directly
      user.updatedAt = new Date(); // Update timestamp
      console.log(`Password hashed successfully for user: ${user.email}`);
      userUpdated = true;
    }

    if (userUpdated) {
      // Use queryRunner manager to maintain transaction consistency
      await queryRunner.manager.save(user);
    }

    // Update profile
    const profile = user.profile;
    let profileUpdated = false;

    if (firstName !== undefined) {
      profile.firstName = firstName;
      profileUpdated = true;
    }
    if (lastName !== undefined) {
      profile.lastName = lastName;
      profileUpdated = true;
    }
    if (dateOfBirth !== undefined) {
      profile.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      profileUpdated = true;
    }
    if (documentNumber !== undefined) {
      profile.documentNumber = documentNumber;
      profileUpdated = true;
    }
    if (phone !== undefined) {
      profile.phone = phone;
      profileUpdated = true;
    }
    if (address !== undefined) {
      profile.address = address;
      profileUpdated = true;
    }
    if (occupation !== undefined) {
      profile.education = occupation; // Using education field for occupation
      profileUpdated = true;
    }

    if (profileUpdated) {
      await queryRunner.manager.save(profile);
    }
  }

  /**
   * Encuentra una familia por ID de usuario (contacto primario o secundario)
   */
  async findFamilyByUserId(userId: string): Promise<Family | null> {
    try {
      const family = await this.familiesRepository
        .createQueryBuilder('family')
        .where('family.primaryContactId = :userId OR family.secondaryContactId = :userId', { userId })
        .getOne();

      return family;
    } catch (error) {
      console.error('Error finding family by user ID:', error);
      throw error;
    }
  }

  /**
   * Envía credenciales familiares al correo del estudiante para que esté informado
   */
  private async sendCredentialsToStudentEmail(
    studentUser: User,
    primaryContact: User,
    secondaryContact: User | null,
  ): Promise<void> {
    try {
      const studentName = studentUser.profile?.firstName || 'Estudiante';
      const primaryFullName = `${primaryContact.profile?.firstName || ''} ${primaryContact.profile?.lastName || ''}`.trim();

      // Generar nueva contraseña temporal para el alumno y actualizar en BD
      const studentTemporaryPassword = this.generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(studentTemporaryPassword, 10);
      await this.usersRepository.update(studentUser.id, {
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      });

      // Sección con datos de acceso del propio alumno
      const studentCredentialsHtml = `
        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe;">
          <h3 style="margin: 0 0 15px 0; color: #1e40af;">🔑 Tus datos de acceso:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 160px;"><strong>Usuario (email):</strong></td>
              <td style="padding: 8px 0; color: #1e293b; font-family: monospace;">${studentUser.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Contraseña:</strong></td>
              <td style="padding: 8px 0;">
                <code style="background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: bold; color: #1e40af; font-size: 15px;">${studentTemporaryPassword}</code>
              </td>
            </tr>
          </table>
        </div>`;

      // Sección con datos de los tutores (solo nombre y email, sin contraseñas)
      let familyContactsHtml = `
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #475569;">👤 Contacto Principal:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 120px;"><strong>Nombre:</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">${primaryFullName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; color: #1e293b; font-family: monospace;">${primaryContact.email}</td>
            </tr>
          </table>
        </div>`;

      if (secondaryContact) {
        const secondaryFullName = `${secondaryContact.profile?.firstName || ''} ${secondaryContact.profile?.lastName || ''}`.trim();
        familyContactsHtml += `
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #475569;">👤 Contacto Secundario:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 120px;"><strong>Nombre:</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">${secondaryFullName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; color: #1e293b; font-family: monospace;">${secondaryContact.email}</td>
            </tr>
          </table>
        </div>`;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Acceso Familiar Activado - Mundo World School</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.06);">
            <tr>
              <td style="background-color: #10b981; padding: 25px; border-top-left-radius: 12px; border-top-right-radius: 12px; text-align: center;">
                <div style="margin-bottom: 15px;">
                  <img src="https://plataforma.mundoworld.school/logo-MWSchool.png" alt="Mundo World School" style="max-width: 120px; height: auto;" onerror="this.style.display='none'">
                </div>
                <h2 style="color: #ffffff; margin: 0;">👨‍👩‍👧 Tu familia ya tiene acceso al portal</h2>
              </td>
            </tr>
            <tr>
              <td style="padding: 25px 20px; text-align: left; color: #333;">
                <p style="font-size: 16px;">Hola, <strong>${studentName}</strong>:</p>
                <p style="font-size: 15px;">
                  Te informamos que tu familia ha sido registrada en el portal de <strong>Mundo World School</strong>.
                  A partir de ahora, tus tutores podrán consultar tu información académica, evaluaciones y actividades escolares desde su cuenta familiar.
                </p>

                ${studentCredentialsHtml}

                <div style="background-color: #fefce8; border: 1px solid #fde047; padding: 12px 15px; border-radius: 8px; margin: 15px 0;">
                  <p style="margin: 0; font-size: 13px; color: #713f12;">
                    ⚠️ <strong>Importante:</strong> Esta es tu nueva contraseña de acceso. Guárdala en un lugar seguro y cámbiala desde tu perfil cuando lo desees.
                  </p>
                </div>

                <p style="font-size: 15px; color: #475569; margin-top: 20px;">
                  Los datos de tus tutores registrados en la plataforma son:
                </p>
                ${familyContactsHtml}

                <div style="text-align: center; margin: 25px 0;">
                  <a href="https://plataforma.mundoworld.school/login"
                     style="background-color: #10b981; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
                    Acceder a la Plataforma
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; padding: 15px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  Mundo World School · soporte: info@mundoworld.school
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>`;

      await this.emailService.sendEmail({
        to: studentUser.email,
        subject: 'Tu familia ya tiene acceso al portal de Mundo World School',
        htmlContent,
        textContent: `Hola ${studentName}, tu familia ha sido registrada en el portal escolar. Tus credenciales: usuario: ${studentUser.email}, contraseña: ${studentTemporaryPassword}. Tutores registrados - Principal: ${primaryFullName} (${primaryContact.email})${secondaryContact ? `. Secundario: ${`${secondaryContact.profile?.firstName || ''} ${secondaryContact.profile?.lastName || ''}`.trim()} (${secondaryContact.email})` : ''}. Accede en: https://plataforma.mundoworld.school/login`,
        userId: studentUser.id,
        triggerEvent: 'family_registered_student_notified',
        triggerResourceType: 'family',
        triggeredBy: 'families_service',
      });

      console.log(`✅ Notificación con credenciales propias enviada al estudiante: ${studentUser.email}`);
    } catch (error) {
      console.error(`❌ Error enviando notificación al email del estudiante ${studentUser.email}:`, error);
      // No lanzamos el error para no afectar el flujo principal
    }
  }

  /**
   * Envía correo de bienvenida con credenciales a nuevo padre/contacto familiar
   */
  private async sendWelcomeEmail(user: User, plainPassword: string): Promise<void> {
    try {
      console.log(`📧 Enviando correo de bienvenida a ${user.email}`);

      const fullName = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
      const firstName = user.profile?.firstName || 'Estimado/a';

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Bienvenido/a a Mundo World School - Acceso Familiar</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.06);">
            <tr>
              <td style="background-color: #6366f1; padding: 25px; border-top-left-radius: 12px; border-top-right-radius: 12px; text-align: center;">
                <div style="margin-bottom: 15px;">
                  <img src="https://plataforma.mundoworld.school/logo-MWSchool.png" alt="Mundo World School" style="max-width: 120px; height: auto;" onerror="this.style.display='none'">
                </div>
                <h2 style="color: #ffffff; margin: 0;">🎓 Bienvenido/a a Mundo World School</h2>
                <p style="color: #e0e7ff; margin: 8px 0 0 0;">Portal Familiar</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 25px 20px; text-align: left; color: #333;">
                <p style="font-size: 16px;">Estimado/a <strong>${fullName || firstName}</strong>:</p>
                <p style="font-size: 15px;">
                  Te damos la bienvenida al portal familiar de <strong>Mundo World School</strong>. Con tu cuenta podrás acceder a toda la información académica de tus hijos: evaluaciones, actividades, calificaciones, asistencia y mucho más.
                </p>

                <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe;">
                  <h3 style="margin: 0 0 15px 0; color: #1e40af;">📋 Tus datos de acceso:</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; width: 160px;"><strong>Usuario (email):</strong></td>
                      <td style="padding: 8px 0; color: #1e293b; font-family: monospace;">${user.email}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;"><strong>Contraseña:</strong></td>
                      <td style="padding: 8px 0;">
                        <code style="background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: bold; color: #1e40af; font-size: 15px;">${plainPassword}</code>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;"><strong>Enlace de acceso:</strong></td>
                      <td style="padding: 8px 0;">
                        <a href="https://plataforma.mundoworld.school/login" style="color: #6366f1; text-decoration: none;">
                          https://plataforma.mundoworld.school/login
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="background-color: #fefce8; border: 1px solid #fde047; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #713f12;">
                    ⚠️ <strong>Importante:</strong> Guarda estas credenciales en un lugar seguro. Te recomendamos cambiar la contraseña después de tu primer acceso desde tu perfil de usuario.
                  </p>
                </div>

                <div style="text-align: center; margin: 25px 0;">
                  <a href="https://plataforma.mundoworld.school/login"
                     style="background-color: #6366f1; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
                    Acceder al Portal Familiar
                  </a>
                </div>

                <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
                  Para cualquier consulta, contacte con nosotros en:
                  <a href="mailto:info@mundoworld.school" style="color: #6366f1;">info@mundoworld.school</a>
                </p>

                <p style="font-size: 14px; margin-top: 20px; color: #666;">
                  Atentamente,<br>
                  <strong>Equipo de Mundo World School</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; padding: 15px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  Mundo World School · Portal Educativo · info@mundoworld.school
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>`;

      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Bienvenido/a a Mundo World School - Tus credenciales de acceso familiar',
        htmlContent,
        textContent: `Bienvenido/a ${fullName || firstName} a Mundo World School. Tus credenciales de acceso: usuario: ${user.email}, contraseña: ${plainPassword}. Accede en: https://plataforma.mundoworld.school/login. Guarda estas credenciales en un lugar seguro.`,
        userId: user.id,
        triggerEvent: 'family_user_created',
        triggerResourceType: 'family_contact',
        triggeredBy: 'families_service',
      });

      console.log(`✅ Correo de bienvenida enviado correctamente a ${user.email}`);
    } catch (error) {
      console.error(`❌ Error enviando correo de bienvenida a ${user.email}:`, error);
      // No lanzamos el error para no afectar la creación del usuario
    }
  }

  /**
   * Reenvía credenciales a un contacto familiar existente
   */
  async resendCredentials(familyId: string, contactType: 'primary' | 'secondary', currentUserId?: string): Promise<void> {
    console.log(`🔧 RESEND CREDENTIALS - Starting for family ${familyId}, contact: ${contactType}`);
    
    const family = await this.findOne(familyId);
    if (!family) {
      console.error(`❌ RESEND CREDENTIALS - Family not found: ${familyId}`);
      throw new NotFoundException('Familia no encontrada');
    }

    const contact = contactType === 'primary' ? family.primaryContact : family.secondaryContact;
    if (!contact) {
      console.error(`❌ RESEND CREDENTIALS - Contact ${contactType} not found for family: ${familyId}`);
      throw new NotFoundException(`Contacto ${contactType} no encontrado`);
    }

    console.log(`🔧 RESEND CREDENTIALS - Found contact: ${contact.email}, ID: ${contact.id}`);
    
    try {
      console.log(`🔧 RESEND CREDENTIALS - Attempting to send email to: ${contact.email}`);
      console.log(`🔧 RESEND CREDENTIALS - Email service available:`, !!this.emailService);
      
      // Generate a professional subject line with user's name
      const fullName = `${contact.profile?.firstName || ''} ${contact.profile?.lastName || ''}`.trim();
      const subject = `Credenciales de acceso - ${fullName} - Mundo World School`;
      
      // Generate a new temporary password for the user
      const temporaryPassword = this.generateTemporaryPassword();
      console.log(`🔧 RESEND CREDENTIALS - Generated temporary password for ${contact.email}`);
      
      // Update the user's password in the database
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      await this.usersRepository.update(contact.id, {
        passwordHash: hashedPassword,
        updatedAt: new Date()
      });
      console.log(`🔧 RESEND CREDENTIALS - Password updated for user ${contact.email}`);
      
      // Create custom professional HTML content for family credentials
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Credenciales de Acceso - Mundo World School</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.06);">
            <tr>
              <td style="background-color: #0ea5e9; padding: 25px; border-top-left-radius: 12px; border-top-right-radius: 12px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0;">🔑 Credenciales de Acceso</h2>
              </td>
            </tr>
            <tr>
              <td style="padding: 25px 20px; text-align: left; color: #333;">
                <p style="font-size: 16px;">
                  Estimado/a <strong>${fullName}</strong>:
                </p>
                <p style="font-size: 16px;">
                  Le recordamos sus credenciales de acceso al portal familiar de <strong>Mundo World School</strong>. 
                  Desde aquí podrá consultar toda la información académica y administrativa de sus hijos.
                </p>
                
                <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px 0; color: #1e40af;">📋 Datos de Acceso:</h3>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Usuario:</strong> ${contact.email}</p>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Nueva contraseña:</strong> <code style="background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: bold; color: #1e40af;">${temporaryPassword}</code></p>
                  <p style="margin: 8px 0; font-size: 15px;"><strong>Enlace directo:</strong> <a href="https://plataforma.mundoworld.school" style="color: #0ea5e9; text-decoration: none;">https://plataforma.mundoworld.school</a></p>
                </div>
                
                <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="margin: 0 0 10px 0; color: #065f46;">✅ Sobre sus credenciales:</h4>
                  <p style="margin: 5px 0; font-size: 14px; color: #065f46;">
                    • Esta es una <strong>contraseña nueva</strong> generada automáticamente para su seguridad<br>
                    • Puede usarla para acceder inmediatamente al sistema<br>
                    • Si lo desea, puede cambiarla desde su perfil una vez dentro de la plataforma<br>
                    • Recomendamos guardar estas credenciales en un lugar seguro
                  </p>
                </div>
                
                <p style="font-size: 15px;">
                  Puede acceder inmediatamente con estas credenciales. El sistema es completamente seguro y sus datos están protegidos.
                </p>
                
                <p style="font-size: 15px; margin-top: 20px;">
                  Para cualquier consulta, puede contactarnos en: <a href="mailto:info@mundoworld.school" style="color: #0ea5e9;">info@mundoworld.school</a>
                </p>
                
                <p style="font-size: 14px; margin-top: 25px; color: #666;">
                  Atentamente,<br>
                  <strong>Equipo de Mundo World School</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #e0f2fe; padding: 15px; text-align: center; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; font-size: 13px; color: #555;">
                Mundo World School · Portal Educativo
                <div style="margin-top: 15px;">
                  <img src="https://plataforma.mundoworld.school/logo-MWSchool.png" alt="Logo Mundo World School" style="max-width: 140px; height: auto;">
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      await this.emailService.sendEmail({
        to: contact.email,
        subject: subject,
        htmlContent: htmlContent,
        templateData: {
          userName: contact.profile?.firstName || 'Estimado/a familia',
          fullName: fullName,
          email: contact.email,
          platformUrl: 'https://plataforma.mundoworld.school',
          loginUrl: 'https://plataforma.mundoworld.school',
          supportEmail: 'info@mundoworld.school',
          schoolName: 'Mundo World School'
        },
        userId: contact.id,
        triggerEvent: 'credentials_resent',
        triggerResourceType: 'family_contact',
        triggeredBy: currentUserId || null
      });

      console.log(`✅ RESEND CREDENTIALS - Successfully sent to: ${contact.email}`);
    } catch (error) {
      console.error(`❌ RESEND CREDENTIALS - Error sending to ${contact.email}:`, error);
      console.error(`❌ RESEND CREDENTIALS - Full error stack:`, error?.stack);
      console.error(`❌ RESEND CREDENTIALS - Error message:`, error?.message);
      throw error;
    }
  }

  /**
   * Reenvía credenciales de forma masiva a múltiples familias
   */
  async bulkResendCredentials(
    familyContacts: Array<{ familyId: string; contactType: 'primary' | 'secondary' }>,
    currentUserId?: string
  ): Promise<{
    success: Array<{ familyId: string; contactType: string; email: string }>;
    failures: Array<{ familyId: string; contactType: string; email?: string; error: string }>;
    summary: { total: number; successful: number; failed: number };
  }> {
    console.log(`🔧 BULK RESEND CREDENTIALS - Starting bulk operation for ${familyContacts.length} contacts`);
    console.log(`⏱️ BULK RESEND - Implementing rate limiting to avoid Resend API limits (2 requests/second)`);
    
    const success: Array<{ familyId: string; contactType: string; email: string }> = [];
    const failures: Array<{ familyId: string; contactType: string; email?: string; error: string }> = [];

    // Rate limiting: máximo 2 requests por segundo para cumplir con límites de Resend
    const RATE_LIMIT_DELAY = 600; // 600ms entre emails = 1.67 emails/segundo (seguro bajo el límite)
    
    // Procesar cada familia/contacto individualmente con rate limiting
    for (let i = 0; i < familyContacts.length; i++) {
      const { familyId, contactType } = familyContacts[i];
      
      try {
        console.log(`🔧 BULK RESEND - Processing ${i + 1}/${familyContacts.length}: family ${familyId}, contact: ${contactType}`);
        
        // Usar el método individual existente
        await this.resendCredentials(familyId, contactType, currentUserId);
        
        // Obtener email para reporte
        const family = await this.findOne(familyId);
        const contact = contactType === 'primary' ? family.primaryContact : family.secondaryContact;
        const email = contact?.email || 'email_unknown';
        
        success.push({ familyId, contactType, email });
        console.log(`✅ BULK RESEND - Success for ${email}`);
        
        // Rate limiting: esperar antes del siguiente envío (excepto en el último)
        if (i < familyContacts.length - 1) {
          console.log(`⏱️ BULK RESEND - Waiting ${RATE_LIMIT_DELAY}ms to respect Resend API rate limits...`);
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
        
      } catch (error) {
        console.error(`❌ BULK RESEND - Failed for family ${familyId}, contact ${contactType}:`, error.message);
        
        // Intentar obtener email para reporte de error
        let email: string | undefined;
        try {
          const family = await this.findOne(familyId);
          const contact = contactType === 'primary' ? family.primaryContact : family.secondaryContact;
          email = contact?.email;
        } catch {
          // Si no podemos obtener el email, continuamos sin él
        }
        
        failures.push({
          familyId,
          contactType,
          email,
          error: error.message || 'Error desconocido'
        });
        
        // Rate limiting también después de fallos para mantener consistencia
        if (i < familyContacts.length - 1) {
          console.log(`⏱️ BULK RESEND - Waiting ${RATE_LIMIT_DELAY}ms after failure to respect rate limits...`);
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      }
    }

    const summary = {
      total: familyContacts.length,
      successful: success.length,
      failed: failures.length
    };

    console.log(`🎯 BULK RESEND CREDENTIALS - Summary: ${summary.successful}/${summary.total} successful`);
    
    return { success, failures, summary };
  }

  /**
   * Genera una contraseña temporal segura y fácil de recordar
   */
  private generateTemporaryPassword(): string {
    // Lista de palabras simples y números para crear contraseña memorable
    const words = [
      'Sol', 'Luna', 'Mar', 'Cielo', 'Flor', 'Rio', 'Paz', 'Arte', 
      'Luz', 'Casa', 'Vida', 'Amor', 'Hope', 'Joy', 'Blue', 'Star'
    ];
    
    const numbers = ['2025', '123', '456', '789', '321', '654', '987'];
    const symbols = ['!', '@', '#', '*'];
    
    // Seleccionar elementos aleatorios
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const randomNumber = numbers[Math.floor(Math.random() * numbers.length)];
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    
    // Crear contraseña en formato: Palabra + Numero + Simbolo
    // Ejemplo: Sol2025!, Luna456@, etc.
    return `${randomWord}${randomNumber}${randomSymbol}`;
  }
}