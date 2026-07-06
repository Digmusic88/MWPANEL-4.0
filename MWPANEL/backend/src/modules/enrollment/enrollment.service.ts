import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Student } from '../students/entities/student.entity';
import { EducationalLevel } from '../students/entities/educational-level.entity';
import { Course } from '../students/entities/course.entity';
import { Family, FamilyStudent, FamilyRelationship } from '../users/entities/family.entity';
import { EnrollmentNumberService } from '../students/services/enrollment-number.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private profilesRepository: Repository<UserProfile>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(Family)
    private familiesRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private familyStudentRepository: Repository<FamilyStudent>,
    private dataSource: DataSource,
    private enrollmentNumberService: EnrollmentNumberService,
  ) {}

  async processEnrollment(createEnrollmentDto: CreateEnrollmentDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create student user and profile
      const studentUser = await this.createStudentUser(createEnrollmentDto.student, queryRunner);
      
      // 2. Create student record
      const student = await this.createStudentRecord(createEnrollmentDto.student, studentUser, queryRunner);
      
      // 3. Handle family creation or assignment
      let family: Family;
      if (createEnrollmentDto.family.existingFamilyId) {
        // Assign to existing family (explicit ID provided)
        family = await queryRunner.manager.findOne(Family, {
          where: { id: createEnrollmentDto.family.existingFamilyId },
          relations: ['primaryContact', 'secondaryContact']
        });
        
        if (!family) {
          throw new BadRequestException('Familia no encontrada');
        }
      } else {
        // Auto-detect existing family by parent email
        family = await this.findExistingFamilyByParentEmail(
          createEnrollmentDto.family.primaryContact.email,
          queryRunner,
          createEnrollmentDto.family.secondaryContact?.email
        );
        
        if (family) {
          console.log(`🔗 Familia existente encontrada para ${createEnrollmentDto.family.primaryContact.email}, añadiendo nuevo hijo`);
        } else {
          console.log(`👨‍👩‍👧‍👦 Creando nueva familia para ${createEnrollmentDto.family.primaryContact.email}`);
          // Create new family
          family = await this.createNewFamily(createEnrollmentDto.family, queryRunner);
        }
      }
      
      // 4. Link student to family
      await this.linkStudentToFamily(student, family, createEnrollmentDto.family.relationship, queryRunner);
      
      await queryRunner.commitTransaction();
      
      return {
        message: 'Inscripción procesada exitosamente',
        student: {
          id: student.id,
          enrollmentNumber: student.enrollmentNumber,
          user: {
            id: studentUser.id,
            email: studentUser.email
          }
        },
        family: {
          id: family.id,
          primaryContact: family.primaryContact.email,
          secondaryContact: family.secondaryContact?.email
        }
      };
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async createStudentUser(studentData: any, queryRunner: any): Promise<User> {
    // Validate that email is provided
    if (!studentData.email || studentData.email.trim() === '') {
      throw new BadRequestException('El email del estudiante es requerido y no puede estar vacío');
    }

    // Check if email already exists
    const existingUser = await queryRunner.manager.findOne(User, {
      where: { email: studentData.email }
    });
    
    if (existingUser) {
      throw new ConflictException(`El email ${studentData.email} ya está registrado`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(studentData.password, 10);

    // Create user
    const user = queryRunner.manager.create(User, {
      email: studentData.email,
      passwordHash: hashedPassword,
      role: UserRole.STUDENT,
      isActive: true,
    });
    
    const savedUser = await queryRunner.manager.save(user);

    // Create profile
    const profile = queryRunner.manager.create(UserProfile, {
      user: savedUser,
      firstName: studentData.firstName,
      lastName: studentData.lastName,
      dateOfBirth: studentData.birthDate ? new Date(studentData.birthDate) : null,
      documentNumber: studentData.documentNumber,
      phone: studentData.phone,
    });
    
    await queryRunner.manager.save(profile);
    
    return savedUser;
  }

  private async createStudentRecord(studentData: any, user: User, queryRunner: any): Promise<Student> {
    // Generate enrollment number automatically or use provided one
    let enrollmentNumber: string;
    
    if (studentData.enrollmentNumber && studentData.enrollmentNumber.trim() !== '') {
      // Validate format if provided manually
      if (!this.enrollmentNumberService.validateEnrollmentFormat(studentData.enrollmentNumber)) {
        throw new BadRequestException(`Formato de número de matrícula inválido: ${studentData.enrollmentNumber}`);
      }
      
      // Check if manual enrollment number already exists
      const existingStudent = await queryRunner.manager.findOne(Student, {
        where: { enrollmentNumber: studentData.enrollmentNumber }
      });
      
      if (existingStudent) {
        throw new ConflictException(`El número de matrícula ${studentData.enrollmentNumber} ya está registrado`);
      }
      
      enrollmentNumber = studentData.enrollmentNumber;
    } else {
      // Generate automatically
      enrollmentNumber = await this.enrollmentNumberService.generateUniqueEnrollmentNumber();
    }

    // Find educational level entity if provided
    let educationalLevel = null;
    if (studentData.educationalLevelId) {
      educationalLevel = await queryRunner.manager.findOne(EducationalLevel, {
        where: { id: studentData.educationalLevelId }
      });
    }

    // Find course entity if provided
    let course = null;
    if (studentData.courseId) {
      course = await queryRunner.manager.findOne(Course, {
        where: { id: studentData.courseId }
      });
    }

    const student = queryRunner.manager.create(Student, {
      user,
      enrollmentNumber,
      birthDate: studentData.birthDate ? new Date(studentData.birthDate) : null,
      educationalLevel,
      course,
    });
    
    return await queryRunner.manager.save(student);
  }

  private async createNewFamily(familyData: any, queryRunner: any): Promise<Family> {
    console.log('🔧 Creating new family with data:', {
      hasPrimary: !!familyData.primaryContact,
      hasSecondary: !!familyData.secondaryContact,
      secondaryEmail: familyData.secondaryContact?.email
    });
    
    // Create primary contact
    const primaryUser = await this.createFamilyContact(familyData.primaryContact, queryRunner);
    
    // Create secondary contact only if provided and has email
    let secondaryUser = null;
    if (familyData.secondaryContact && familyData.secondaryContact.email && familyData.secondaryContact.email.trim() !== '') {
      console.log('🔧 Creating secondary contact with email:', familyData.secondaryContact.email);
      secondaryUser = await this.createFamilyContact(familyData.secondaryContact, queryRunner);
    } else if (familyData.secondaryContact && (!familyData.secondaryContact.email || familyData.secondaryContact.email.trim() === '')) {
      console.log('🔧 Skipping secondary contact creation - no email provided');
    }
    
    // Create family
    const family = queryRunner.manager.create(Family, {
      primaryContact: primaryUser,
      secondaryContact: secondaryUser,
    });
    
    return await queryRunner.manager.save(family);
  }

  private async createFamilyContact(contactData: any, queryRunner: any): Promise<User> {
    console.log('🔧 Creating family contact with data:', {
      email: contactData.email,
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      hasPassword: !!contactData.password
    });
    
    // Validate that email is provided (this method should only be called for contacts with email)
    if (!contactData.email || contactData.email.trim() === '') {
      console.error('🔧 ERROR: Missing email for family contact:', contactData);
      throw new BadRequestException('El email del contacto familiar es requerido y no puede estar vacío');
    }

    // Validate that password is provided when creating a new account
    if (!contactData.password || contactData.password.trim() === '') {
      console.error('🔧 ERROR: Missing password for family contact:', contactData.email);
      throw new BadRequestException('La contraseña del contacto familiar es requerida para crear la cuenta');
    }

    // Check if email already exists
    const existingUser = await queryRunner.manager.findOne(User, {
      where: { email: contactData.email },
      relations: ['profile']
    });
    
    if (existingUser) {
      // User already exists - this is expected when adding siblings to existing families
      console.log(`🔗 Usuario familiar ya existe: ${contactData.email}, reutilizando para nuevo hermano`);
      return existingUser;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(contactData.password, 10);

    // Create user
    const user = queryRunner.manager.create(User, {
      email: contactData.email,
      passwordHash: hashedPassword,
      role: UserRole.FAMILY,
      isActive: true,
    });
    
    const savedUser = await queryRunner.manager.save(user);

    // Create profile
    const profile = queryRunner.manager.create(UserProfile, {
      user: savedUser,
      firstName: contactData.firstName,
      lastName: contactData.lastName || '', // Make lastName optional as per DTO changes
      dateOfBirth: contactData.dateOfBirth ? new Date(contactData.dateOfBirth) : null,
      documentNumber: contactData.documentNumber,
      phone: contactData.phone,
      address: contactData.address,
      occupation: contactData.occupation,
    });
    
    await queryRunner.manager.save(profile);
    
    return savedUser;
  }

  /**
   * Find existing family by parent email addresses
   * Checks both primary and secondary contact emails to detect existing families
   */
  private async findExistingFamilyByParentEmail(
    primaryEmail: string, 
    queryRunner: any,
    secondaryEmail?: string
  ): Promise<Family | null> {
    console.log(`🔍 Buscando familia existente con emails: primary=${primaryEmail}, secondary=${secondaryEmail}`);
    
    // Build email search criteria
    const emailsToSearch: string[] = [primaryEmail];
    if (secondaryEmail) {
      emailsToSearch.push(secondaryEmail);
    }
    
    // Search for families where any parent has matching email
    const family = await queryRunner.manager
      .createQueryBuilder(Family, 'family')
      .leftJoinAndSelect('family.primaryContact', 'primaryContact')
      .leftJoinAndSelect('family.secondaryContact', 'secondaryContact')
      .where('primaryContact.email IN (:...emails)', { emails: emailsToSearch })
      .orWhere('secondaryContact.email IN (:...emails)', { emails: emailsToSearch })
      .getOne();
    
    if (family) {
      console.log(`✅ Familia encontrada: ID=${family.id}, primary=${family.primaryContact.email}, secondary=${family.secondaryContact?.email}`);
      return family;
    } else {
      console.log(`❌ No se encontró familia existente para emails: ${emailsToSearch.join(', ')}`);
      return null;
    }
  }

  private async linkStudentToFamily(student: Student, family: Family, relationship: string, queryRunner: any): Promise<void> {
    // Map relationship values to valid enum values
    const relationshipMap: { [key: string]: string } = {
      // English values
      'mother': 'parent', 'father': 'parent', 'mom': 'parent', 'dad': 'parent', 'parent': 'parent',
      'guardian': 'guardian', 'tutor': 'guardian', 'legal guardian': 'guardian', 'other': 'other',
      // Spanish values  
      'madre': 'parent', 'padre': 'parent', 'mamá': 'parent', 'papá': 'parent', 'progenitor': 'parent',
      'tutor legal': 'guardian', 'guardián': 'guardian', 'otro': 'other',
    };

    // Defensive check for undefined relationship
    if (!relationship) {
      throw new BadRequestException('Relationship is required but was not provided');
    }
    
    const normalizedRelationship = relationship.toLowerCase().trim();
    const mappedRelationship = relationshipMap[normalizedRelationship] || relationship;
    
    console.log(`🔗 Linking student to family with relationship: "${relationship}" → "${mappedRelationship}"`);

    const familyStudent = queryRunner.manager.create(FamilyStudent, {
      family,
      student,
      relationship: mappedRelationship as FamilyRelationship,
    });
    
    await queryRunner.manager.save(familyStudent);
  }
}