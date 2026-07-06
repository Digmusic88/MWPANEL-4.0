import { Injectable, NotFoundException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { TutoringGroup, TutoringStudent } from './entities';
import {
  CreateTutoringGroupDto,
  UpdateTutoringGroupDto,
  AssignStudentsDto,
  RemoveStudentsDto
} from './dto';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';
import { EducationalLevel } from '../students/entities/educational-level.entity';
import { ConversationsService } from '../communications/services/conversations.service';
import { CreateConversationDto } from '../communications/dto/conversation.dto';

@Injectable()
export class TutoringService {
  constructor(
    @InjectRepository(TutoringGroup)
    private tutoringGroupRepository: Repository<TutoringGroup>,
    @InjectRepository(TutoringStudent)
    private tutoringStudentRepository: Repository<TutoringStudent>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => ConversationsService))
    private conversationsService: ConversationsService,
  ) {}

  async create(createTutoringGroupDto: CreateTutoringGroupDto): Promise<TutoringGroup> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar que el tutor existe y está activo
      const tutor = await this.teacherRepository.findOne({
        where: { id: createTutoringGroupDto.tutorId, user: { isActive: true } },
        relations: ['user']
      });

      if (!tutor) {
        throw new NotFoundException('Tutor no encontrado o inactivo');
      }

      // Crear el grupo de tutoría
      const tutoringGroup = this.tutoringGroupRepository.create(createTutoringGroupDto);
      const savedGroup = await queryRunner.manager.save(tutoringGroup);

      await queryRunner.commitTransaction();

      return this.findOne(savedGroup.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<TutoringGroup[]> {
    // Usar query builder para filtrar tutoringStudents por isActive
    const groups = await this.tutoringGroupRepository
      .createQueryBuilder('tutoringGroup')
      .leftJoinAndSelect('tutoringGroup.tutor', 'tutor')
      .leftJoinAndSelect('tutor.user', 'tutorUser')
      .leftJoinAndSelect('tutorUser.profile', 'tutorProfile')
      .leftJoinAndSelect('tutoringGroup.academicYear', 'academicYear')
      .leftJoinAndSelect('tutoringGroup.educationalLevel', 'educationalLevel')
      .leftJoinAndSelect(
        'tutoringGroup.tutoringStudents',
        'tutoringStudents',
        'tutoringStudents.isActive = :isActive',
        { isActive: true }
      )
      .leftJoinAndSelect('tutoringStudents.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .where('tutoringGroup.isActive = :groupActive', { groupActive: true })
      .andWhere('tutorUser.isActive = :tutorActive', { tutorActive: true })
      .orderBy('tutoringGroup.createdAt', 'DESC')
      .getMany();

    return groups;
  }

  async findOne(id: string): Promise<TutoringGroup> {
    // Usar query builder para filtrar tutoringStudents por isActive
    const tutoringGroup = await this.tutoringGroupRepository
      .createQueryBuilder('tutoringGroup')
      .leftJoinAndSelect('tutoringGroup.tutor', 'tutor')
      .leftJoinAndSelect('tutor.user', 'tutorUser')
      .leftJoinAndSelect('tutorUser.profile', 'tutorProfile')
      .leftJoinAndSelect('tutoringGroup.academicYear', 'academicYear')
      .leftJoinAndSelect('tutoringGroup.educationalLevel', 'educationalLevel')
      .leftJoinAndSelect(
        'tutoringGroup.tutoringStudents',
        'tutoringStudents',
        'tutoringStudents.isActive = :isActive',
        { isActive: true }
      )
      .leftJoinAndSelect('tutoringStudents.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .where('tutoringGroup.id = :id', { id })
      .getOne();

    if (!tutoringGroup) {
      throw new NotFoundException(`Grupo de tutoría con ID ${id} no encontrado`);
    }

    return tutoringGroup;
  }

  async findByTutor(tutorId: string): Promise<TutoringGroup[]> {
    // Usar query builder para filtrar tutoringStudents por isActive
    const groups = await this.tutoringGroupRepository
      .createQueryBuilder('tutoringGroup')
      .leftJoinAndSelect('tutoringGroup.tutor', 'tutor')
      .leftJoinAndSelect('tutor.user', 'tutorUser')
      .leftJoinAndSelect('tutorUser.profile', 'tutorProfile')
      .leftJoinAndSelect('tutoringGroup.academicYear', 'academicYear')
      .leftJoinAndSelect('tutoringGroup.educationalLevel', 'educationalLevel')
      .leftJoinAndSelect(
        'tutoringGroup.tutoringStudents',
        'tutoringStudents',
        'tutoringStudents.isActive = :isActive',
        { isActive: true }
      )
      .leftJoinAndSelect('tutoringStudents.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .where('tutoringGroup.tutorId = :tutorId', { tutorId })
      .andWhere('tutoringGroup.isActive = :groupActive', { groupActive: true })
      .orderBy('tutoringGroup.createdAt', 'DESC')
      .getMany();

    return groups;
  }

  async update(id: string, updateTutoringGroupDto: UpdateTutoringGroupDto): Promise<TutoringGroup> {
    const tutoringGroup = await this.findOne(id);

    if (updateTutoringGroupDto.tutorId && updateTutoringGroupDto.tutorId !== tutoringGroup.tutorId) {
      const newTutor = await this.teacherRepository.findOne({
        where: { id: updateTutoringGroupDto.tutorId, user: { isActive: true } },
        relations: ['user']
      });

      if (!newTutor) {
        throw new NotFoundException('Nuevo tutor no encontrado o inactivo');
      }
    }

    await this.tutoringGroupRepository.update(id, updateTutoringGroupDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const tutoringGroup = await this.findOne(id);
    await this.tutoringGroupRepository.update(id, { isActive: false });
  }

  async assignStudents(groupId: string, assignStudentsDto: AssignStudentsDto): Promise<TutoringGroup> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tutoringGroup = await this.findOne(groupId);

      // Verificar que todos los estudiantes existen y están activos
      const students = await this.studentRepository.find({
        where: {
          id: In(assignStudentsDto.studentIds),
          user: { isActive: true }
        },
        relations: ['user']
      });

      if (students.length !== assignStudentsDto.studentIds.length) {
        throw new NotFoundException('Algunos estudiantes no fueron encontrados o están inactivos');
      }

      // Verificar que no estén ya asignados
      const existingAssignments = await this.tutoringStudentRepository.find({
        where: {
          tutoringGroupId: groupId,
          studentId: In(assignStudentsDto.studentIds),
          isActive: true
        }
      });

      if (existingAssignments.length > 0) {
        throw new ConflictException('Algunos estudiantes ya están asignados a este grupo de tutoría');
      }

      // Crear las asignaciones
      const assignments = assignStudentsDto.studentIds.map(studentId =>
        this.tutoringStudentRepository.create({
          tutoringGroupId: groupId,
          studentId,
          notes: assignStudentsDto.notes
        })
      );

      await queryRunner.manager.save(assignments);
      await queryRunner.commitTransaction();

      return this.findOne(groupId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async removeStudents(groupId: string, removeStudentsDto: RemoveStudentsDto): Promise<TutoringGroup> {
    const tutoringGroup = await this.findOne(groupId);

    await this.tutoringStudentRepository.update(
      {
        tutoringGroupId: groupId,
        studentId: In(removeStudentsDto.studentIds),
        isActive: true
      },
      { isActive: false }
    );

    return this.findOne(groupId);
  }

  async getAvailableStudents(groupId?: string): Promise<Student[]> {
    // Obtener estudiantes que no están asignados a ningún grupo de tutoría activo
    // o que no están asignados al grupo específico si se proporciona
    const query = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoin('tutoring_students', 'ts', 'ts.studentId = student.id AND ts.isActive = true')
      .where('user.isActive = true')
      .andWhere('ts.id IS NULL');

    if (groupId) {
      // Si se especifica un grupo, también incluir estudiantes ya asignados a ese grupo
      query.orWhere('ts.tutoringGroupId = :groupId', { groupId });
    }

    return query.orderBy('profile.firstName', 'ASC').getMany();
  }

  async getStudentsByTutoringGroup(groupId: string): Promise<Student[]> {
    const assignments = await this.tutoringStudentRepository.find({
      where: {
        tutoringGroupId: groupId,
        isActive: true
      },
      relations: [
        'student',
        'student.user',
        'student.user.profile'
      ]
    });

    return assignments.map(assignment => assignment.student);
  }

  async contactTutor(familyUserId: string, studentId: string, initialMessage: string): Promise<any> {
    // Buscar el estudiante y verificar que pertenezca a la familia
    const student = await this.studentRepository.findOne({
      where: { id: studentId },
      relations: ['user', 'user.profile']
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Buscar el grupo de tutoría al que pertenece el estudiante
    const tutoringAssignment = await this.tutoringStudentRepository.findOne({
      where: {
        studentId: studentId,
        isActive: true
      },
      relations: [
        'tutoringGroup',
        'tutoringGroup.tutor',
        'tutoringGroup.tutor.user',
        'tutoringGroup.tutor.user.profile'
      ]
    });

    if (!tutoringAssignment || !tutoringAssignment.tutoringGroup) {
      throw new NotFoundException('Este estudiante no tiene un tutor asignado');
    }

    const tutorUserId = tutoringAssignment.tutoringGroup.tutor.user.id;
    const tutorName = `${tutoringAssignment.tutoringGroup.tutor.user.profile.firstName} ${tutoringAssignment.tutoringGroup.tutor.user.profile.lastName}`;
    const studentName = `${student.user.profile.firstName} ${student.user.profile.lastName}`;

    // Crear la conversación usando el servicio de comunicaciones
    const createConversationDto: CreateConversationDto = {
      participantId: tutorUserId,
      title: `Tutoría - ${studentName}`,
      initialMessage: initialMessage,
      contentType: 'html'
    };

    return await this.conversationsService.createConversation(familyUserId, createConversationDto);
  }

  async getStudentTutor(studentId: string): Promise<any> {
    const tutoringAssignment = await this.tutoringStudentRepository.findOne({
      where: {
        studentId: studentId,
        isActive: true
      },
      relations: [
        'tutoringGroup',
        'tutoringGroup.tutor',
        'tutoringGroup.tutor.user',
        'tutoringGroup.tutor.user.profile'
      ]
    });

    if (!tutoringAssignment || !tutoringAssignment.tutoringGroup) {
      return null;
    }

    const tutor = tutoringAssignment.tutoringGroup.tutor;
    return {
      id: tutor.id,
      name: `${tutor.user.profile.firstName} ${tutor.user.profile.lastName}`,
      // RGPD: NO exponer el email del tutor (profesor) a las familias.
      groupName: tutoringAssignment.tutoringGroup.name
    };
  }
}