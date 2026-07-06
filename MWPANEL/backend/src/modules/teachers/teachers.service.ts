import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from './entities/teacher.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { EmployeeNumberService } from './services/employee-number.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private profilesRepository: Repository<UserProfile>,
    @InjectRepository(SubjectAssignment)
    private subjectAssignmentsRepository: Repository<SubjectAssignment>,
    private employeeNumberService: EmployeeNumberService,
  ) {}

  async findAll(includeInactive: boolean = false): Promise<Teacher[]> {
    const whereCondition: any = {};

    // Si no se solicita incluir inactivos, solo mostrar activos
    if (!includeInactive) {
      whereCondition.user = { isActive: true };
    }

    return this.teachersRepository.find({
      relations: ['user', 'user.profile', 'subjects', 'tutoredClasses'],
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Teacher> {
    const teacher = await this.teachersRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile', 'subjects', 'tutoredClasses'],
    });

    if (!teacher) {
      throw new NotFoundException(`Profesor con ID ${id} no encontrado`);
    }

    return teacher;
  }

  async create(createTeacherDto: CreateTeacherDto): Promise<Teacher> {
    console.log(`🔍 [TeachersService] CREATE method called with employeeNumber: ${createTeacherDto.employeeNumber || 'undefined'}`);
    
    const {
      employeeNumber,
      specialties,
      email,
      password,
      isActive = true,
      firstName,
      lastName,
      dateOfBirth,
      documentNumber,
      phone,
      address,
      education,
      hireDate,
      department,
      position,
    } = createTeacherDto;

    // Check if email already exists
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Generate employee number if not provided, otherwise validate the provided one
    let finalEmployeeNumber: string;
    
    if (employeeNumber && employeeNumber.trim() !== '') {
      // Validate provided employee number format
      if (!this.employeeNumberService.validateEmployeeFormat(employeeNumber)) {
        throw new ConflictException('El formato del número de empleado no es válido. Use el formato EMP-YYYY-NNNN');
      }
      
      // Check if provided employee number already exists
      const existingTeacher = await this.teachersRepository.findOne({ where: { employeeNumber } });
      if (existingTeacher) {
        throw new ConflictException('El número de empleado ya está registrado');
      }
      
      finalEmployeeNumber = employeeNumber;
    } else {
      // Generate automatic employee number
      finalEmployeeNumber = await this.employeeNumberService.generateUniqueEmployeeNumber();
      console.log(`🔍 [TeachersService] Generated employee number: ${finalEmployeeNumber}`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.usersRepository.create({
      email,
      passwordHash: hashedPassword,
      role: UserRole.TEACHER,
      isActive,
    });
    const savedUser = await this.usersRepository.save(user);

    // Create profile
    const profile = this.profilesRepository.create({
      firstName,
      lastName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      documentNumber,
      phone,
      address,
      education,
      hireDate: hireDate ? new Date(hireDate) : undefined,
      department,
      position,
    });
    const savedProfile = await this.profilesRepository.save(profile);

    // Link profile to user
    savedUser.profile = savedProfile;
    await this.usersRepository.save(savedUser);

    // Create teacher
    const teacher = this.teachersRepository.create({
      employeeNumber: finalEmployeeNumber,
      specialties: specialties || [],
      user: savedUser,
    });

    return this.teachersRepository.save(teacher);
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto): Promise<Teacher> {
    const teacher = await this.findOne(id);
    
    const {
      employeeNumber,
      specialties,
      email,
      isActive,
      firstName,
      lastName,
      dateOfBirth,
      documentNumber,
      phone,
      address,
      education,
      hireDate,
      department,
      position,
      newPassword,
    } = updateTeacherDto;

    // Update teacher entity
    if (employeeNumber && employeeNumber !== teacher.employeeNumber) {
      const existingTeacher = await this.teachersRepository.findOne({ where: { employeeNumber } });
      if (existingTeacher && existingTeacher.id !== id) {
        throw new ConflictException('El número de empleado ya está registrado');
      }
      teacher.employeeNumber = employeeNumber;
    }

    if (specialties !== undefined) {
      teacher.specialties = specialties;
    }

    // Update user entity
    if (email && email !== teacher.user.email) {
      const existingUser = await this.usersRepository.findOne({ where: { email } });
      if (existingUser && existingUser.id !== teacher.user.id) {
        throw new ConflictException('El email ya está registrado');
      }
      teacher.user.email = email;
    }

    if (isActive !== undefined) {
      teacher.user.isActive = isActive;
    }

    // Handle password change if newPassword is provided - use entity virtual field
    if (newPassword && newPassword.trim() !== '') {
      teacher.user.password = newPassword; // This will trigger @BeforeUpdate hook
      console.log(`Setting new password for teacher user: ${teacher.user.email}`);
    }

    // Update profile entity
    const profile = teacher.user.profile;
    if (firstName) profile.firstName = firstName;
    if (lastName) profile.lastName = lastName;
    if (dateOfBirth) profile.dateOfBirth = new Date(dateOfBirth);
    if (documentNumber) profile.documentNumber = documentNumber;
    if (phone) profile.phone = phone;
    if (address) profile.address = address;
    if (education) profile.education = education;
    if (hireDate) profile.hireDate = new Date(hireDate);
    if (department) profile.department = department;
    if (position) profile.position = position;

    // Save updates
    await this.profilesRepository.save(profile);
    await this.usersRepository.save(teacher.user);
    await this.teachersRepository.save(teacher);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const teacher = await this.findOne(id);
    
    // Soft delete by deactivating the user
    teacher.user.isActive = false;
    await this.usersRepository.save(teacher.user);
  }

  async getTeacherDashboard(userId: string): Promise<any> {
    // Find the teacher by user ID
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
      relations: [
        'user', 
        'user.profile', 
        'subjects', 
        'tutoredClasses',
        'tutoredClasses.students',
        'tutoredClasses.students.user',
        'tutoredClasses.students.user.profile'
      ],
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // Build dashboard data
    const dashboardData = {
      teacher: {
        id: teacher.id,
        employeeNumber: teacher.employeeNumber,
        specialties: teacher.specialties,
        user: {
          id: teacher.user.id,
          email: teacher.user.email,
          role: teacher.user.role,
          isActive: teacher.user.isActive,
          profile: teacher.user.profile
        }
      },
      summary: {
        totalClasses: teacher.tutoredClasses?.length || 0,
        totalStudents: teacher.tutoredClasses?.reduce((total, classGroup) => 
          total + (classGroup.students?.length || 0), 0
        ) || 0,
        totalSubjects: teacher.subjects?.length || 0,
      },
      classes: teacher.tutoredClasses?.map(classGroup => ({
        id: classGroup.id,
        name: classGroup.name,
        section: classGroup.section,
        studentsCount: classGroup.students?.length || 0,
        students: classGroup.students?.map(student => ({
          id: student.id,
          enrollmentNumber: student.enrollmentNumber,
          name: `${student.user.profile.firstName} ${student.user.profile.lastName}`
        })) || []
      })) || [],
      subjects: teacher.subjects || [],
      recentActivity: {
        // TODO: Add recent evaluations, attendance records, etc.
        lastLogin: teacher.user.lastLoginAt,
        updatedAt: teacher.updatedAt
      }
    };

    return dashboardData;
  }

  async findByUserId(userId: string): Promise<Teacher> {
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
      relations: [
        'user', 
        'user.profile', 
        'subjects',
        'tutoredClasses',
        'tutoredClasses.students',
        'tutoredClasses.students.user',
        'tutoredClasses.students.user.profile',
        'subjectAssignments',
        'subjectAssignments.subject',
        'subjectAssignments.classGroup'
      ],
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    return teacher;
  }

  async getTeacherStatistics(userId: string): Promise<any> {
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'user.profile', 'subjectAssignments', 'subjectAssignments.subject', 'tutoredClasses', 'tutoredClasses.students'],
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // Calculate real statistics from database
    const totalClasses = teacher.tutoredClasses?.length || 0;
    const totalStudents = teacher.tutoredClasses?.reduce((sum, classGroup) => 
      sum + (classGroup.students?.length || 0), 0) || 0;
    const totalSubjects = teacher.subjectAssignments?.length || 0;

    // Calculate weekly hours from subject assignments
    const weeklyHours = teacher.subjectAssignments?.reduce((sum, assignment) => {
      return sum + (assignment.weeklyHours || 0);
    }, 0) || 0;

    return {
      totalClasses,
      totalStudents,
      totalSubjects,
      weeklyHours,
      specialties: teacher.specialties || [],
      employeeNumber: teacher.employeeNumber,
      department: teacher.user?.profile?.department || 'Sin departamento',
      position: teacher.user?.profile?.position || 'Profesor',
      isActive: teacher.user?.isActive || false,
      lastActivity: teacher.user?.lastLoginAt || teacher.updatedAt
    };
  }

  async getTeacherSchedules(userId: string): Promise<any[]> {
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'user.profile', 'subjectAssignments', 'subjectAssignments.subject', 'subjectAssignments.classGroup'],
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // Generate schedule based on subject assignments
    // This is a simplified version - in a real system you'd have a schedule entity
    const schedules = teacher.subjectAssignments?.map((assignment, index) => {
      const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
      const timeSlots = ['08:00-09:00', '09:00-10:00', '10:30-11:30', '11:30-12:30', '12:30-13:30'];
      
      return {
        id: `schedule-${assignment.id}`,
        subject: assignment.subject?.name || 'Sin asignatura',
        classGroup: assignment.classGroup?.name || 'Sin grupo',
        dayOfWeek: days[index % days.length],
        timeSlot: timeSlots[index % timeSlots.length],
        classroom: `Aula ${100 + index}`,
        duration: assignment.weeklyHours * 60 / 5 || 60, // distribute weekly hours across 5 days
        isActive: true
      };
    }) || [];

    return schedules;
  }
}