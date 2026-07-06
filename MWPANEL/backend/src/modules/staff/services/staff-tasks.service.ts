/**
 * @archivo: staff-tasks.service.ts
 * @modulo: Staff (Claustro)
 * @funcion: Servicio principal para gestion de tareas del claustro
 */

import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThanOrEqual } from 'typeorm';
import {
  StaffTask,
  StaffTaskStatus,
  StaffTaskPriority,
} from '../entities/staff-task.entity';
import { StaffTaskAssignment } from '../entities/staff-task-assignment.entity';
import { StaffTaskComment } from '../entities/staff-task-comment.entity';
import { StaffTaskAttachment } from '../entities/staff-task-attachment.entity';
import { StaffTaskHistory, StaffTaskHistoryAction } from '../entities/staff-task-history.entity';
import { StaffTag } from '../entities/staff-tag.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { CreateStaffTaskDto } from '../dto/create-staff-task.dto';
import { UpdateStaffTaskDto, UpdateStaffTaskStatusDto } from '../dto/update-staff-task.dto';
import { StaffTaskFiltersDto } from '../dto/staff-filters.dto';
import { CreateStaffTaskCommentDto } from '../dto/staff-comment.dto';
import { NotificationService } from '../../communications/services/notification.service';
import { CommunicationsService } from '../../communications/communications.service';
import { EmailPriority } from '../../communications/entities/email-notification.entity';
import { NotificationType } from '../../communications/entities/notification.entity';

@Injectable()
export class StaffTasksService {
  private readonly logger = new Logger(StaffTasksService.name);

  constructor(
    @InjectRepository(StaffTask)
    private readonly taskRepository: Repository<StaffTask>,
    @InjectRepository(StaffTaskAssignment)
    private readonly assignmentRepository: Repository<StaffTaskAssignment>,
    @InjectRepository(StaffTaskComment)
    private readonly commentRepository: Repository<StaffTaskComment>,
    @InjectRepository(StaffTaskAttachment)
    private readonly attachmentRepository: Repository<StaffTaskAttachment>,
    @InjectRepository(StaffTaskHistory)
    private readonly historyRepository: Repository<StaffTaskHistory>,
    @InjectRepository(StaffTag)
    private readonly tagRepository: Repository<StaffTag>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  async create(dto: CreateStaffTaskDto, userId: string): Promise<StaffTask> {
    // Verify assigned users exist and are admin/teacher
    let assignedUsers: User[] = [];
    if (dto.assignedToIds?.length) {
      assignedUsers = await this.userRepository.find({
        where: {
          id: In(dto.assignedToIds),
          role: In([UserRole.ADMIN, UserRole.TEACHER]),
          isActive: true,
        },
      });
      if (assignedUsers.length !== dto.assignedToIds.length) {
        throw new BadRequestException('One or more assigned users are invalid or not staff members');
      }
    }

    // Get tags if provided
    let tags: StaffTag[] = [];
    if (dto.tagIds?.length) {
      tags = await this.tagRepository.find({
        where: { id: In(dto.tagIds) },
      });
    }

    // Create task
    const task = this.taskRepository.create({
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      meetingId: dto.meetingId,
      createdById: userId,
      tags,
    });

    const savedTask = await this.taskRepository.save(task);

    // Create assignments — auto-accept for the creator if they are also assigned
    if (assignedUsers.length) {
      const now = new Date();
      const assignments = assignedUsers.map(user => {
        const isSelf = user.id === userId;
        return this.assignmentRepository.create({
          taskId: savedTask.id,
          assignedToId: user.id,
          accepted: isSelf,
          acceptedAt: isSelf ? now : null,
        });
      });
      await this.assignmentRepository.save(assignments);
    }

    // Create history entry
    await this.addHistoryEntry(
      savedTask.id,
      StaffTaskHistoryAction.CREATED,
      null,
      { title: dto.title, assignedTo: dto.assignedToIds },
      userId,
    );

    // Send notifications to assigned users
    if (assignedUsers.length > 0) {
      const creator = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile'],
      });
      const creatorName = creator?.profile?.firstName
        ? `${creator.profile.firstName} ${creator.profile.lastName || ''}`.trim()
        : creator?.email.split('@')[0] || 'Un miembro del claustro';

      const otherAssignees = assignedUsers.filter(u => u.id !== userId);

      try {
        if (otherAssignees.length > 0) {
        await this.notificationService.processEvent({
          type: 'staff_task_assigned',
          triggeredById: userId,
          recipientIds: otherAssignees.map(u => u.id),
          data: {
            taskId: savedTask.id,
            taskTitle: dto.title,
            creatorName,
            dueDate: dto.dueDate,
            resourceId: savedTask.id,
            resourceType: 'staff_task',
            actionUrl: `/admin/staff/tasks`,
          },
          priority: EmailPriority.NORMAL,
        });
        this.logger.log(`📧 Sent staff_task_assigned email notification to ${otherAssignees.length} users`);
        }
      } catch (error) {
        this.logger.error('Failed to send task assignment email notification:', error);
      }

      // Create bell notifications for OTHER assigned users (skip creator — they assigned themselves)
      for (const assignedUser of otherAssignees) {
        try {
          await this.communicationsService.createNotification({
            title: 'Nueva tarea asignada',
            content: `${creatorName} te ha asignado la tarea: "${dto.title}"`,
            type: NotificationType.ANNOUNCEMENT,
            userId: assignedUser.id,
            triggeredById: userId,
            relatedResourceId: savedTask.id,
            relatedResourceType: 'staff_task',
            actionUrl: `/admin/staff/tasks`,
          });
        } catch (error) {
          this.logger.error(`Failed to create bell notification for user ${assignedUser.id}:`, error);
        }
      }
      if (otherAssignees.length > 0) {
        this.logger.log(`🔔 Created ${otherAssignees.length} bell notifications for task assignment`);
      }
    }

    return this.findOne(savedTask.id);
  }

  async findAll(filters: StaffTaskFiltersDto, userId: string, userRole: UserRole) {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.profile', 'creatorProfile')
      .leftJoinAndSelect('task.assignments', 'assignments')
      .leftJoinAndSelect('assignments.assignedTo', 'assignedTo')
      .leftJoinAndSelect('assignedTo.profile', 'assignedProfile')
      .leftJoinAndSelect('task.tags', 'tags')
      .leftJoinAndSelect('task.meeting', 'meeting');

    // CRITICAL: Non-admin users only see tasks assigned to them OR created by them
    if (userRole !== UserRole.ADMIN) {
      query.andWhere(
        '(task.createdById = :userId OR assignments.assignedToId = :userId)',
        { userId }
      );
    }

    // AUTO-ARCHIVE: Excluir tareas completadas hace mas de 7 dias (van al archivo)
    // Solo aplicar si no se esta filtrando por un status especifico
    if (!filters.status) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      query.andWhere(
        '(task.status != :completed OR task.completedAt IS NULL OR task.completedAt > :oneWeekAgo)',
        { completed: StaffTaskStatus.COMPLETED, oneWeekAgo }
      );
    }

    // Apply filters
    if (filters.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      query.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters.createdById) {
      query.andWhere('task.createdById = :createdById', { createdById: filters.createdById });
    }

    if (filters.assignedToId) {
      query.andWhere('assignments.assignedToId = :assignedToId', { assignedToId: filters.assignedToId });
    }

    if (filters.meetingId) {
      query.andWhere('task.meetingId = :meetingId', { meetingId: filters.meetingId });
    }

    if (filters.tagId) {
      query.andWhere('tags.id = :tagId', { tagId: filters.tagId });
    }

    if (filters.dueDateFrom) {
      query.andWhere('task.dueDate >= :dueDateFrom', { dueDateFrom: filters.dueDateFrom });
    }

    if (filters.dueDateTo) {
      query.andWhere('task.dueDate <= :dueDateTo', { dueDateTo: filters.dueDateTo });
    }

    if (filters.search) {
      query.andWhere('(task.title ILIKE :search OR task.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters.overdue) {
      query.andWhere('task.dueDate < :today AND task.status != :completed', {
        today: new Date().toISOString().split('T')[0],
        completed: StaffTaskStatus.COMPLETED,
      });
    }

    // Sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';
    query.orderBy(`task.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    query.skip((page - 1) * limit).take(limit);

    const [tasks, total] = await query.getManyAndCount();

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMyTasks(filters: StaffTaskFiltersDto, userId: string) {
    return this.findAll({ ...filters, assignedToId: userId }, userId, UserRole.TEACHER);
  }

  async findMyCreatedTasks(filters: StaffTaskFiltersDto, userId: string) {
    return this.findAll({ ...filters, createdById: userId }, userId, UserRole.TEACHER);
  }

  async findOne(id: string, userId?: string, userRole?: UserRole): Promise<StaffTask> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: [
        'createdBy',
        'createdBy.profile',
        'assignments',
        'assignments.assignedTo',
        'assignments.assignedTo.profile',
        'tags',
        'meeting',
        'comments',
        'comments.author',
        'comments.author.profile',
        'attachments',
        'attachments.uploadedBy',
        'attachments.uploadedBy.profile',
        'history',
        'history.changedBy',
        'history.changedBy.profile',
      ],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // If userId is provided, verify access permissions (non-admin users can only see their own tasks)
    if (userId && userRole && userRole !== UserRole.ADMIN) {
      const isCreator = task.createdById === userId;
      const isAssigned = task.assignments.some(a => a.assignedToId === userId);

      if (!isCreator && !isAssigned) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }
    }

    // Sort history by createdAt desc
    if (task.history) {
      task.history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return task;
  }

  async update(id: string, dto: UpdateStaffTaskDto, userId: string): Promise<StaffTask> {
    const task = await this.findOne(id);

    // Track changes for history
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    if (dto.title && dto.title !== task.title) {
      changes.push({ field: 'title', oldValue: task.title, newValue: dto.title });
      task.title = dto.title;
    }

    if (dto.description !== undefined && dto.description !== task.description) {
      changes.push({ field: 'description', oldValue: task.description, newValue: dto.description });
      task.description = dto.description;
    }

    if (dto.status && dto.status !== task.status) {
      changes.push({ field: 'status', oldValue: task.status, newValue: dto.status });
      task.status = dto.status;
      if (dto.status === StaffTaskStatus.COMPLETED) {
        task.completedAt = new Date();
      } else {
        task.completedAt = null;
      }
    }

    if (dto.priority !== undefined && dto.priority !== task.priority) {
      changes.push({ field: 'priority', oldValue: task.priority, newValue: dto.priority });
      task.priority = dto.priority;
    }

    if (dto.dueDate !== undefined) {
      const newDate = dto.dueDate ? new Date(dto.dueDate) : null;
      const oldDate = task.dueDate ? new Date(task.dueDate) : null;
      const newDateStr = newDate?.toISOString() || null;
      const oldDateStr = oldDate?.toISOString() || null;
      if (newDateStr !== oldDateStr) {
        changes.push({ field: 'dueDate', oldValue: task.dueDate, newValue: newDate });
        task.dueDate = newDate;
      }
    }

    if (dto.meetingId !== undefined && dto.meetingId !== task.meetingId) {
      changes.push({ field: 'meetingId', oldValue: task.meetingId, newValue: dto.meetingId });
      task.meetingId = dto.meetingId;
    }

    // Update tags
    if (dto.tagIds) {
      const newTags = await this.tagRepository.find({
        where: { id: In(dto.tagIds) },
      });
      const oldTagIds = task.tags.map(t => t.id);
      if (JSON.stringify(oldTagIds.sort()) !== JSON.stringify(dto.tagIds.sort())) {
        changes.push({ field: 'tags', oldValue: oldTagIds, newValue: dto.tagIds });
        task.tags = newTags;
      }
    }

    await this.taskRepository.save(task);

    // Update assignments if provided
    if (dto.assignedToIds) {
      const currentAssignments = task.assignments;
      const currentIds = currentAssignments.map(a => a.assignedToId);
      const newIds = dto.assignedToIds;

      const toRemove = currentIds.filter(id => !newIds.includes(id));
      const toAdd = newIds.filter(id => !currentIds.includes(id));

      if (toRemove.length) {
        await this.assignmentRepository.delete({
          taskId: id,
          assignedToId: In(toRemove),
        });
        for (const removedId of toRemove) {
          await this.addHistoryEntry(id, StaffTaskHistoryAction.UNASSIGNED, { userId: removedId }, null, userId);
        }
      }

      if (toAdd.length) {
        const usersToAdd = await this.userRepository.find({
          where: {
            id: In(toAdd),
            role: In([UserRole.ADMIN, UserRole.TEACHER]),
            isActive: true,
          },
        });
        const newAssignments = usersToAdd.map(user =>
          this.assignmentRepository.create({
            taskId: id,
            assignedToId: user.id,
          }),
        );
        await this.assignmentRepository.save(newAssignments);
        for (const addedId of toAdd) {
          await this.addHistoryEntry(id, StaffTaskHistoryAction.ASSIGNED, null, { userId: addedId }, userId);
        }

        // Create bell notifications for newly assigned users
        const assigner = await this.userRepository.findOne({
          where: { id: userId },
          relations: ['profile'],
        });
        const assignerName = assigner?.profile?.firstName
          ? `${assigner.profile.firstName} ${assigner.profile.lastName || ''}`.trim()
          : assigner?.email.split('@')[0] || 'Un miembro del claustro';

        for (const newUser of usersToAdd) {
          try {
            await this.communicationsService.createNotification({
              title: 'Nueva tarea asignada',
              content: `${assignerName} te ha asignado la tarea: "${task.title}"`,
              type: NotificationType.ANNOUNCEMENT,
              userId: newUser.id,
              triggeredById: userId,
              relatedResourceId: id,
              relatedResourceType: 'staff_task',
              actionUrl: `/admin/staff/tasks`,
            });
          } catch (error) {
            this.logger.error(`Failed to create bell notification for user ${newUser.id}:`, error);
          }
        }
        this.logger.log(`🔔 Created ${usersToAdd.length} bell notifications for task re-assignment`);
      }
    }

    // Add history entries for each change
    for (const change of changes) {
      let action: StaffTaskHistoryAction;
      switch (change.field) {
        case 'status':
          action = StaffTaskHistoryAction.STATUS_CHANGED;
          break;
        case 'priority':
          action = StaffTaskHistoryAction.PRIORITY_CHANGED;
          break;
        case 'dueDate':
          action = StaffTaskHistoryAction.DUE_DATE_CHANGED;
          break;
        case 'title':
          action = StaffTaskHistoryAction.TITLE_CHANGED;
          break;
        case 'description':
          action = StaffTaskHistoryAction.DESCRIPTION_CHANGED;
          break;
        case 'tags':
          action = StaffTaskHistoryAction.TAGS_CHANGED;
          break;
        case 'meetingId':
          action = change.newValue ? StaffTaskHistoryAction.MEETING_LINKED : StaffTaskHistoryAction.MEETING_UNLINKED;
          break;
        default:
          continue;
      }
      await this.addHistoryEntry(id, action, { [change.field]: change.oldValue }, { [change.field]: change.newValue }, userId);
    }

    return this.findOne(id);
  }

  async updateStatus(id: string, dto: UpdateStaffTaskStatusDto, userId: string): Promise<StaffTask> {
    const task = await this.findOne(id);

    // Check if user is assigned to this task or is creator
    const isAssigned = task.assignments.some(a => a.assignedToId === userId);
    const isCreator = task.createdById === userId;

    if (!isAssigned && !isCreator) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user?.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You can only change status of tasks assigned to you or created by you');
      }
    }

    const oldStatus = task.status;
    task.status = dto.status;

    // Sistema de archivo: registrar quien completo la tarea
    if (dto.status === StaffTaskStatus.COMPLETED && oldStatus !== StaffTaskStatus.COMPLETED) {
      task.completedAt = new Date();
      task.completedById = userId; // Registrar quien completo
    } else if (dto.status !== StaffTaskStatus.COMPLETED && oldStatus === StaffTaskStatus.COMPLETED) {
      // Si se reactiva desde status change, limpiar datos de completado
      task.completedAt = null;
      task.completedById = null;
    }

    await this.taskRepository.save(task);

    await this.addHistoryEntry(
      id,
      StaffTaskHistoryAction.STATUS_CHANGED,
      { status: oldStatus },
      { status: dto.status },
      userId,
    );

    // Send status change notification
    try {
      const changer = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile'],
      });
      const changerName = changer?.profile?.firstName
        ? `${changer.profile.firstName} ${changer.profile.lastName || ''}`.trim()
        : changer?.email.split('@')[0] || 'Un miembro del claustro';

      // Get all involved users (creator + assigned) except the one who made the change
      const involvedIds = [
        task.createdById,
        ...task.assignments.map(a => a.assignedToId),
      ].filter(uid => uid !== userId);

      const uniqueIds = [...new Set(involvedIds)];

      if (uniqueIds.length > 0) {
        const eventType = dto.status === StaffTaskStatus.COMPLETED
          ? 'staff_task_completed'
          : 'staff_task_status_changed';

        await this.notificationService.processEvent({
          type: eventType,
          triggeredById: userId,
          recipientIds: uniqueIds,
          data: {
            taskId: id,
            taskTitle: task.title,
            changerName,
            completorName: changerName,
            oldStatus,
            newStatus: dto.status,
            resourceId: id,
            resourceType: 'staff_task',
            actionUrl: `/admin/staff/tasks`,
          },
          priority: EmailPriority.NORMAL,
        });
        this.logger.log(`📧 Sent ${eventType} notification to ${uniqueIds.length} users`);
      }
    } catch (error) {
      this.logger.error('Failed to send status change notification:', error);
    }

    return this.findOne(id);
  }

  async acceptTask(id: string, userId: string): Promise<StaffTask> {
    const task = await this.findOne(id);
    const assignment = task.assignments.find(a => a.assignedToId === userId);

    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    if (assignment.accepted) {
      throw new BadRequestException('You have already accepted this task');
    }

    assignment.accepted = true;
    assignment.acceptedAt = new Date();
    await this.assignmentRepository.save(assignment);

    await this.addHistoryEntry(id, StaffTaskHistoryAction.ACCEPTED, null, { userId }, userId);

    // Send acceptance notification to creator
    try {
      const acceptor = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile'],
      });
      const acceptorName = acceptor?.profile?.firstName
        ? `${acceptor.profile.firstName} ${acceptor.profile.lastName || ''}`.trim()
        : acceptor?.email.split('@')[0] || 'Un miembro del claustro';

      if (task.createdById !== userId) {
        await this.notificationService.processEvent({
          type: 'staff_task_accepted',
          triggeredById: userId,
          recipientIds: [task.createdById],
          data: {
            taskId: id,
            taskTitle: task.title,
            acceptorName,
            resourceId: id,
            resourceType: 'staff_task',
            actionUrl: `/admin/staff/tasks`,
          },
          priority: EmailPriority.NORMAL,
        });
        this.logger.log(`📧 Sent staff_task_accepted notification to task creator`);
      }
    } catch (error) {
      this.logger.error('Failed to send task acceptance notification:', error);
    }

    return this.findOne(id);
  }

  async delete(id: string, userId: string): Promise<void> {
    const task = await this.findOne(id);

    // Only creator or admin can delete
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (task.createdById !== userId && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the task creator or admin can delete this task');
    }

    await this.taskRepository.remove(task);
  }

  async addComment(taskId: string, dto: CreateStaffTaskCommentDto, userId: string): Promise<StaffTaskComment> {
    const task = await this.findOne(taskId);

    // Check if user is involved (creator or assigned)
    const isInvolved =
      task.createdById === userId ||
      task.assignments.some(a => a.assignedToId === userId);

    if (!isInvolved) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user?.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You must be involved in this task to comment');
      }
    }

    const comment = this.commentRepository.create({
      content: dto.content,
      taskId,
      authorId: userId,
    });

    const savedComment = await this.commentRepository.save(comment);

    await this.addHistoryEntry(taskId, StaffTaskHistoryAction.COMMENT_ADDED, null, { commentId: savedComment.id }, userId);

    // Send comment notification to all involved except the commenter
    try {
      const commenter = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile'],
      });
      const commenterName = commenter?.profile?.firstName
        ? `${commenter.profile.firstName} ${commenter.profile.lastName || ''}`.trim()
        : commenter?.email.split('@')[0] || 'Un miembro del claustro';

      const involvedIds = [
        task.createdById,
        ...task.assignments.map(a => a.assignedToId),
      ].filter(uid => uid !== userId);

      const uniqueIds = [...new Set(involvedIds)];

      if (uniqueIds.length > 0) {
        await this.notificationService.processEvent({
          type: 'staff_task_comment_added',
          triggeredById: userId,
          recipientIds: uniqueIds,
          data: {
            taskId,
            taskTitle: task.title,
            commenterName,
            commentPreview: dto.content.substring(0, 100) + (dto.content.length > 100 ? '...' : ''),
            resourceId: taskId,
            resourceType: 'staff_task',
            actionUrl: `/admin/staff/tasks`,
          },
          priority: EmailPriority.LOW,
        });
        this.logger.log(`📧 Sent staff_task_comment_added notification to ${uniqueIds.length} users`);
      }
    } catch (error) {
      this.logger.error('Failed to send comment notification:', error);
    }

    return this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['author', 'author.profile'],
    });
  }

  async getStats(userId?: string) {
    const baseQuery = this.taskRepository.createQueryBuilder('task');

    if (userId) {
      baseQuery.leftJoin('task.assignments', 'assignments');
      baseQuery.where('task.createdById = :userId OR assignments.assignedToId = :userId', { userId });
    }

    const [total, pending, inProgress, completed, overdue] = await Promise.all([
      baseQuery.clone().getCount(),
      baseQuery.clone().andWhere('task.status = :status', { status: StaffTaskStatus.PENDING }).getCount(),
      baseQuery.clone().andWhere('task.status = :status', { status: StaffTaskStatus.IN_PROGRESS }).getCount(),
      baseQuery.clone().andWhere('task.status = :status', { status: StaffTaskStatus.COMPLETED }).getCount(),
      baseQuery.clone()
        .andWhere('task.dueDate < :today', { today: new Date().toISOString().split('T')[0] })
        .andWhere('task.status != :completed', { completed: StaffTaskStatus.COMPLETED })
        .getCount(),
    ]);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
      completionRate,
    };
  }

  async getStatsByUser() {
    const users = await this.userRepository.find({
      where: { role: In([UserRole.ADMIN, UserRole.TEACHER]), isActive: true },
      relations: ['profile'],
    });

    const stats = [];

    for (const user of users) {
      const assignments = await this.assignmentRepository.find({
        where: { assignedToId: user.id },
        relations: ['task'],
      });

      const total = assignments.length;
      const completed = assignments.filter(a => a.task.status === StaffTaskStatus.COMPLETED).length;
      const pending = assignments.filter(a => a.task.status === StaffTaskStatus.PENDING).length;
      const inProgress = assignments.filter(a => a.task.status === StaffTaskStatus.IN_PROGRESS).length;
      const accepted = assignments.filter(a => a.accepted).length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      stats.push({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
        },
        total,
        completed,
        pending,
        inProgress,
        accepted,
        completionRate,
      });
    }

    return stats.sort((a, b) => b.completionRate - a.completionRate);
  }

  /**
   * Obtiene contadores de tareas para el usuario actual
   * Usado para badges en el menú lateral y notificaciones
   */
  async getMyTaskCounts(userId: string) {
    // Obtener todas las asignaciones del usuario con sus tareas
    const assignments = await this.assignmentRepository.find({
      where: { assignedToId: userId },
      relations: ['task'],
    });

    // Filtrar tareas activas (no completadas)
    const activeTasks = assignments.filter(
      a => a.task && a.task.status !== StaffTaskStatus.COMPLETED
    );

    // Pendientes de aceptar: asignadas pero no aceptadas
    const pendingAcceptance = activeTasks.filter(a => !a.accepted).length;

    // En progreso: aceptadas y con estado pending o in_progress
    const inProgress = activeTasks.filter(
      a => a.accepted && (
        a.task.status === StaffTaskStatus.PENDING ||
        a.task.status === StaffTaskStatus.IN_PROGRESS
      )
    ).length;

    // Total de tareas pendientes (no completadas)
    const total = activeTasks.length;

    // Tareas vencidas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = activeTasks.filter(
      a => a.task.dueDate && new Date(a.task.dueDate) < today
    ).length;

    return {
      pendingAcceptance,
      inProgress,
      total,
      overdue,
    };
  }

  // ============================================
  // SISTEMA DE ARCHIVO DE TAREAS COMPLETADAS
  // ============================================

  /**
   * Obtiene tareas archivadas (completadas) con filtros avanzados
   */
  async findArchived(
    filters: {
      month?: number;
      year?: number;
      tagId?: string;
      completedById?: string;
      createdById?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    userId: string,
    userRole: UserRole,
  ) {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.profile', 'creatorProfile')
      .leftJoinAndSelect('task.completedBy', 'completedBy')
      .leftJoinAndSelect('completedBy.profile', 'completedByProfile')
      .leftJoinAndSelect('task.tags', 'tags')
      .leftJoinAndSelect('task.assignments', 'assignments')
      .leftJoinAndSelect('assignments.assignedTo', 'assignedTo')
      .leftJoinAndSelect('assignedTo.profile', 'assignedProfile')
      .where('task.status = :status', { status: StaffTaskStatus.COMPLETED });

    // Filtro por mes
    if (filters.month) {
      query.andWhere('EXTRACT(MONTH FROM task.completedAt) = :month', { month: filters.month });
    }

    // Filtro por año
    if (filters.year) {
      query.andWhere('EXTRACT(YEAR FROM task.completedAt) = :year', { year: filters.year });
    }

    // Filtro por categoría/tag
    if (filters.tagId) {
      query.andWhere('tags.id = :tagId', { tagId: filters.tagId });
    }

    // Filtro por quien completó
    if (filters.completedById) {
      query.andWhere('task.completedById = :completedById', { completedById: filters.completedById });
    }

    // Filtro por creador
    if (filters.createdById) {
      query.andWhere('task.createdById = :createdById', { createdById: filters.createdById });
    }

    // Búsqueda por texto
    if (filters.search) {
      query.andWhere('(task.title ILIKE :search OR task.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    // Para profesores, solo ver tareas donde están involucrados
    if (userRole !== UserRole.ADMIN) {
      query.andWhere(
        '(task.createdById = :userId OR assignments.assignedToId = :userId)',
        { userId },
      );
    }

    // Ordenar por fecha de completado (más reciente primero)
    query.orderBy('task.completedAt', 'DESC');

    // Paginación
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    query.skip((page - 1) * limit).take(limit);

    const [tasks, total] = await query.getManyAndCount();

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Reactiva una tarea archivada (la mueve de completed a pending)
   */
  async reactivateTask(id: string, userId: string): Promise<StaffTask> {
    const task = await this.findOne(id);

    if (task.status !== StaffTaskStatus.COMPLETED) {
      throw new BadRequestException('Solo se pueden reactivar tareas completadas');
    }

    // Verificar permisos: solo admin, creador o asignado puede reactivar
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const isCreator = task.createdById === userId;
    const isAssigned = task.assignments.some(a => a.assignedToId === userId);

    if (user?.role !== UserRole.ADMIN && !isCreator && !isAssigned) {
      throw new ForbiddenException('No tienes permiso para reactivar esta tarea');
    }

    const oldStatus = task.status;
    const oldCompletedAt = task.completedAt;
    const oldCompletedById = task.completedById;

    // Reactivar la tarea
    task.status = StaffTaskStatus.PENDING;
    task.completedAt = null;
    task.completedById = null;

    await this.taskRepository.save(task);

    // Registrar en historial
    await this.addHistoryEntry(
      id,
      StaffTaskHistoryAction.STATUS_CHANGED,
      { status: oldStatus, completedAt: oldCompletedAt, completedById: oldCompletedById, reactivated: false },
      { status: StaffTaskStatus.PENDING, reactivated: true },
      userId,
    );

    this.logger.log(`📦 Task ${id} reactivated by user ${userId}`);

    // Notificar a los involucrados
    try {
      const reactivator = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile'],
      });
      const reactivatorName = reactivator?.profile?.firstName
        ? `${reactivator.profile.firstName} ${reactivator.profile.lastName || ''}`.trim()
        : reactivator?.email.split('@')[0] || 'Un miembro del claustro';

      const involvedIds = [
        task.createdById,
        ...task.assignments.map(a => a.assignedToId),
      ].filter(uid => uid !== userId);

      const uniqueIds = [...new Set(involvedIds)];

      if (uniqueIds.length > 0) {
        await this.notificationService.processEvent({
          type: 'staff_task_status_changed',
          triggeredById: userId,
          recipientIds: uniqueIds,
          data: {
            taskId: id,
            taskTitle: task.title,
            changerName: reactivatorName,
            oldStatus: StaffTaskStatus.COMPLETED,
            newStatus: StaffTaskStatus.PENDING,
            reactivated: true,
            resourceId: id,
            resourceType: 'staff_task',
            actionUrl: `/admin/staff/tasks`,
          },
          priority: EmailPriority.NORMAL,
        });
        this.logger.log(`📧 Sent reactivation notification to ${uniqueIds.length} users`);
      }
    } catch (error) {
      this.logger.error('Failed to send reactivation notification:', error);
    }

    return this.findOne(id);
  }

  /**
   * Estadísticas del archivo de tareas completadas
   */
  async getArchiveStats(userId: string, userRole: UserRole) {
    // Query base para tareas completadas
    let baseCondition = 'task.status = :status';
    const params: any = { status: StaffTaskStatus.COMPLETED };

    // Para profesores, solo sus tareas
    if (userRole !== UserRole.ADMIN) {
      baseCondition += ' AND (task.createdById = :userId OR EXISTS (SELECT 1 FROM staff_task_assignments a WHERE a.task_id = task.id AND a.assigned_to_id = :userId))';
      params.userId = userId;
    }

    // Total de tareas archivadas
    const total = await this.taskRepository
      .createQueryBuilder('task')
      .where(baseCondition, params)
      .getCount();

    // Tareas por mes (últimos 12 meses)
    const byMonth = await this.taskRepository.query(`
      SELECT
        EXTRACT(YEAR FROM "completedAt") as year,
        EXTRACT(MONTH FROM "completedAt") as month,
        COUNT(*) as count
      FROM staff_tasks
      WHERE status = 'completed'
        AND "completedAt" IS NOT NULL
        ${userRole !== UserRole.ADMIN ? `AND (created_by_id = $1 OR EXISTS (SELECT 1 FROM staff_task_assignments a WHERE a.task_id = staff_tasks.id AND a.assigned_to_id = $1))` : ''}
      GROUP BY EXTRACT(YEAR FROM "completedAt"), EXTRACT(MONTH FROM "completedAt")
      ORDER BY year DESC, month DESC
      LIMIT 12
    `, userRole !== UserRole.ADMIN ? [userId] : []);

    // Tareas por usuario que completó (solo para admin)
    let byCompleter = [];
    if (userRole === UserRole.ADMIN) {
      byCompleter = await this.taskRepository.query(`
        SELECT
          u.id,
          COALESCE(CONCAT(up.first_name, ' ', up.last_name), u.email) as name,
          COUNT(*) as count
        FROM staff_tasks st
        JOIN users u ON st.completed_by_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE st.status = 'completed' AND st.completed_by_id IS NOT NULL
        GROUP BY u.id, up.first_name, up.last_name, u.email
        ORDER BY count DESC
        LIMIT 10
      `);
    }

    // Tareas archivadas este mes
    const now = new Date();
    const thisMonth = await this.taskRepository
      .createQueryBuilder('task')
      .where(baseCondition, params)
      .andWhere('EXTRACT(MONTH FROM task.completedAt) = :month', { month: now.getMonth() + 1 })
      .andWhere('EXTRACT(YEAR FROM task.completedAt) = :year', { year: now.getFullYear() })
      .getCount();

    // Tiempo promedio para completar (en días)
    const avgCompletionTime = await this.taskRepository.query(`
      SELECT
        AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt")) / 86400) as avg_days
      FROM staff_tasks
      WHERE status = 'completed'
        AND "completedAt" IS NOT NULL
        ${userRole !== UserRole.ADMIN ? `AND (created_by_id = $1 OR EXISTS (SELECT 1 FROM staff_task_assignments a WHERE a.task_id = staff_tasks.id AND a.assigned_to_id = $1))` : ''}
    `, userRole !== UserRole.ADMIN ? [userId] : []);

    return {
      total,
      thisMonth,
      avgCompletionDays: avgCompletionTime[0]?.avg_days ? Math.round(avgCompletionTime[0].avg_days * 10) / 10 : null,
      byMonth: byMonth.map(row => ({
        year: parseInt(row.year),
        month: parseInt(row.month),
        count: parseInt(row.count),
      })),
      byCompleter: byCompleter.map(row => ({
        id: row.id,
        name: row.name?.trim() || 'Desconocido',
        count: parseInt(row.count),
      })),
    };
  }

  private async addHistoryEntry(
    taskId: string,
    action: StaffTaskHistoryAction,
    oldValue: any,
    newValue: any,
    changedById: string,
  ): Promise<void> {
    const history = this.historyRepository.create({
      taskId,
      action,
      oldValue,
      newValue,
      changedById,
    });
    await this.historyRepository.save(history);
  }
}
