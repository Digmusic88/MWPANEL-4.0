import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MessageGroup, GroupType } from '../entities/message-group.entity';
import { MessageGroupMember } from '../entities/message-group-member.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { CreateMessageGroupDto } from '../dto/create-message-group.dto';
import { UpdateMessageGroupDto } from '../dto/update-message-group.dto';

@Injectable()
export class MessageGroupsService {
  private readonly logger = new Logger(MessageGroupsService.name);

  constructor(
    @InjectRepository(MessageGroup)
    private readonly messageGroupRepository: Repository<MessageGroup>,
    @InjectRepository(MessageGroupMember)
    private readonly messageGroupMemberRepository: Repository<MessageGroupMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ClassGroup)
    private readonly classGroupRepository: Repository<ClassGroup>,
    @InjectRepository(SubjectAssignment)
    private readonly subjectAssignmentRepository: Repository<SubjectAssignment>,
  ) {}

  // ==================== CRUD BÁSICO ====================

  async create(userId: string, createGroupDto: CreateMessageGroupDto): Promise<MessageGroup> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar permisos
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.TEACHER) {
      throw new ForbiddenException('No tienes permisos para crear grupos');
    }

    // Crear el grupo
    const group = this.messageGroupRepository.create({
      ...createGroupDto,
      createdBy: user,
      createdById: userId,
      type: createGroupDto.type || GroupType.CUSTOM,
    });

    const savedGroup = await this.messageGroupRepository.save(group);

    // Añadir miembros si se proporcionaron
    if (createGroupDto.memberIds && createGroupDto.memberIds.length > 0) {
      await this.addMembers(savedGroup.id, createGroupDto.memberIds, userId);
    }

    return this.findOne(savedGroup.id, userId);
  }

  async findAll(userId: string): Promise<MessageGroup[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    let query = this.messageGroupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.profile', 'createdByProfile')
      .leftJoinAndSelect('group.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .leftJoinAndSelect('memberUser.profile', 'memberProfile')
      .where('group.isActive = :isActive', { isActive: true });

    // Los admins pueden ver todos los grupos
    if (user.role === UserRole.ADMIN) {
      // No filtrar por usuario
    }
    // Los profesores solo pueden ver sus grupos y los grupos donde son miembros
    else if (user.role === UserRole.TEACHER) {
      query = query.andWhere(
        '(group.createdById = :userId OR members.userId = :userId)',
        { userId }
      );
    }
    // Familias y estudiantes solo ven grupos donde son miembros
    else {
      query = query.andWhere('members.userId = :userId', { userId });
    }

    const groups = await query
      .orderBy('group.createdAt', 'DESC')
      .getMany();

    // Calcular memberCount para cada grupo
    for (const group of groups) {
      group.memberCount = group.members?.length || 0;
    }

    return groups;
  }

  async findOne(id: string, userId: string): Promise<MessageGroup> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const group = await this.messageGroupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.profile', 'createdByProfile')
      .leftJoinAndSelect('group.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .leftJoinAndSelect('memberUser.profile', 'memberProfile')
      .where('group.id = :id', { id })
      .andWhere('group.isActive = :isActive', { isActive: true })
      .getOne();

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Verificar permisos de acceso
    const canAccess =
      user.role === UserRole.ADMIN ||
      group.createdById === userId ||
      group.members?.some(member => member.userId === userId);

    if (!canAccess) {
      throw new ForbiddenException('No tienes permisos para acceder a este grupo');
    }

    group.memberCount = group.members?.length || 0;
    return group;
  }

  async update(id: string, updateGroupDto: UpdateMessageGroupDto, userId: string): Promise<MessageGroup> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const group = await this.findOne(id, userId);

    // Solo el creador del grupo o un admin pueden actualizarlo
    if (group.createdById !== userId && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para actualizar este grupo');
    }

    // Actualizar campos básicos
    Object.assign(group, updateGroupDto);
    const updatedGroup = await this.messageGroupRepository.save(group);

    // Actualizar miembros si se proporcionaron
    if (updateGroupDto.memberIds) {
      await this.syncMembers(id, updateGroupDto.memberIds, userId);
    }

    return this.findOne(updatedGroup.id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const group = await this.findOne(id, userId);

    // Solo el creador del grupo o un admin pueden eliminarlo
    if (group.createdById !== userId && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para eliminar este grupo');
    }

    // Soft delete
    group.isActive = false;
    await this.messageGroupRepository.save(group);
  }

  // ==================== GESTIÓN DE MIEMBROS ====================

  async addMembers(groupId: string, userIds: string[], userId: string): Promise<void> {
    const group = await this.findOne(groupId, userId);

    // Verificar que los usuarios existen
    const users = await this.userRepository.find({
      where: { id: In(userIds) }
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException('Algunos usuarios no fueron encontrados');
    }

    // Verificar miembros existentes
    const existingMembers = await this.messageGroupMemberRepository.find({
      where: { groupId, userId: In(userIds) }
    });

    const existingUserIds = existingMembers.map(member => member.userId);
    const newUserIds = userIds.filter(id => !existingUserIds.includes(id));

    // Crear nuevos miembros
    if (newUserIds.length > 0) {
      const newMembers = newUserIds.map(userId =>
        this.messageGroupMemberRepository.create({
          groupId,
          userId,
          group,
          user: users.find(u => u.id === userId)
        })
      );

      await this.messageGroupMemberRepository.save(newMembers);
    }
  }

  async removeMembers(groupId: string, userIds: string[], userId: string): Promise<void> {
    const group = await this.findOne(groupId, userId);

    await this.messageGroupMemberRepository.delete({
      groupId,
      userId: In(userIds)
    });
  }

  async syncMembers(groupId: string, userIds: string[], userId: string): Promise<void> {
    const group = await this.findOne(groupId, userId);

    // Eliminar todos los miembros actuales
    await this.messageGroupMemberRepository.delete({ groupId });

    // Añadir los nuevos miembros
    if (userIds.length > 0) {
      await this.addMembers(groupId, userIds, userId);
    }
  }

  // ==================== GRUPOS AUTOMÁTICOS ====================

  async createTeacherClassGroup(teacherId: string, classGroupId: string): Promise<MessageGroup> {
    const teacher = await this.userRepository.findOne({
      where: { id: teacherId, role: UserRole.TEACHER }
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    const classGroup = await this.classGroupRepository.findOne({
      where: { id: classGroupId },
      relations: ['students', 'students.user', 'course']
    });

    if (!classGroup) {
      throw new NotFoundException('Clase no encontrada');
    }

    // Crear el grupo
    // Filtrar solo estudiantes activos
    const activeStudents = (classGroup.students || []).filter(student => student.user?.isActive === true);

    const group = await this.create(teacherId, {
      name: `Clase: ${classGroup.name}`,
      description: `Grupo automático para la clase ${classGroup.name} - ${classGroup.courses?.[0]?.name || ''}`,
      type: GroupType.TEACHER_CLASS,
      config: JSON.stringify({ classGroupId }),
      memberIds: activeStudents.map(student => student.user.id)
    });

    return group;
  }

  async createTeacherSubjectGroup(teacherId: string, subjectAssignmentId: string): Promise<MessageGroup> {
    const teacher = await this.userRepository.findOne({
      where: { id: teacherId, role: UserRole.TEACHER }
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    const assignment = await this.subjectAssignmentRepository.findOne({
      where: { id: subjectAssignmentId },
      relations: ['subject', 'classGroup', 'classGroup.students', 'classGroup.students.user']
    });

    if (!assignment) {
      throw new NotFoundException('Asignación de materia no encontrada');
    }

    // Crear el grupo
    // Filtrar solo estudiantes activos
    const activeStudents = (assignment.classGroup.students || []).filter(student => student.user?.isActive === true);

    const group = await this.create(teacherId, {
      name: `${assignment.subject.name} - ${assignment.classGroup.name}`,
      description: `Grupo automático para la materia ${assignment.subject.name} en ${assignment.classGroup.name}`,
      type: GroupType.TEACHER_SUBJECT,
      config: JSON.stringify({ subjectAssignmentId }),
      memberIds: activeStudents.map(student => student.user.id)
    });

    return group;
  }

  // ==================== GRUPOS PARA MENSAJES ====================

  async getGroupMembers(groupId: string, userId: string): Promise<User[]> {
    const group = await this.findOne(groupId, userId);
    return group.members?.map(member => member.user) || [];
  }

  async getAvailableGroupsForUser(userId: string): Promise<MessageGroup[]> {
    return this.findAll(userId);
  }
}