import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
// Cache and Bull will be added later
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { Cache } from 'cache-manager';
// import { InjectQueue } from '@nestjs/bull';
// import { Queue } from 'bull';

import {
  TaskAttachment,
  AttachmentVersion,
  AttachmentAuditLog,
  AttachmentComment,
  AuditAction,
  AuditLogDetails,
} from './entities';

import {
  CreateAttachmentDto,
  UpdateAttachmentDto,
  AttachmentQueryDto,
  CreateCommentDto,
  UpdateCommentDto,
  CreateVersionDto,
  FolderStructureDto,
} from './dto';

import { GoogleDriveService } from '../educational-resources/services/google-drive.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(TaskAttachment)
    private attachmentsRepository: Repository<TaskAttachment>,
    @InjectRepository(AttachmentVersion)
    private versionsRepository: Repository<AttachmentVersion>,
    @InjectRepository(AttachmentAuditLog)
    private auditRepository: Repository<AttachmentAuditLog>,
    @InjectRepository(AttachmentComment)
    private commentsRepository: Repository<AttachmentComment>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    private googleDriveService: GoogleDriveService,
    // Cache and queue will be added later
    // @Inject(CACHE_MANAGER) private cacheManager: Cache,
    // @InjectQueue('attachments') private attachmentsQueue: Queue,
  ) {}

  /**
   * Upload a new file attachment
   */
  async uploadAttachment(
    file: Express.Multer.File,
    userId: string,
    createAttachmentDto: CreateAttachmentDto,
    metadata?: any,
  ): Promise<TaskAttachment> {
    // Validate file
    this.validateFile(file);

    // Normalize file name
    const normalizedFileName = this.normalizeFileName(file.originalname);

    // Determine folder structure
    const folderPath = await this.buildFolderPath(
      createAttachmentDto.taskId,
      userId,
      createAttachmentDto,
    );

    try {
      // Get task and subject information for proper folder structure
      const taskInfo = await this.getTaskInfo(createAttachmentDto.taskId);
      
      // Create proper folder structure for task attachments
      const folderId = await this.googleDriveService.ensureTaskAttachmentFolderStructure(
        taskInfo.academicYear || '2024-2025',
        taskInfo.subject || 'General',
        taskInfo.title || 'Tarea Sin Título',
        createAttachmentDto.isStudentSubmission || false,
        createAttachmentDto.isStudentSubmission ? taskInfo.studentName : undefined,
      );

      // Upload to Google Drive using task-specific method
      const attachmentType = createAttachmentDto.isStudentSubmission ? 'submission' : 
                            createAttachmentDto.isTeacherMaterial ? 'instruction' : 'resource';
      
      const driveFile = await this.googleDriveService.uploadTaskAttachment(
        file.buffer,
        normalizedFileName,
        file.mimetype,
        attachmentType as 'instruction' | 'resource' | 'submission',
        {
          academicYear: taskInfo.academicYear || '2024-2025',
          subject: taskInfo.subject || 'General',
          taskTitle: taskInfo.title || 'Tarea Sin Título',
          studentName: createAttachmentDto.isStudentSubmission ? taskInfo.studentName : undefined,
        }
      );

      // Check if this is a new version of existing file
      const existingAttachment = await this.findExistingAttachment(
        createAttachmentDto.taskId,
        userId,
        file.originalname,
      );

      if (existingAttachment) {
        // Create new version
        return this.createNewVersion(
          existingAttachment,
          driveFile,
          userId,
          createAttachmentDto.description,
        );
      }

      // Create new attachment
      const attachment = this.attachmentsRepository.create({
        ...createAttachmentDto,
        uploadedById: userId,
        driveFileId: driveFile.fileId,
        driveFolderId: driveFile.folderId,
        fileName: normalizedFileName,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        thumbnailUrl: null, // Will be generated later
        webViewLink: driveFile.webViewLink,
        downloadLink: driveFile.downloadLink,
        metadata: {
          version: 1,
          isStudentSubmission: createAttachmentDto.isStudentSubmission || false,
          isTeacherMaterial: createAttachmentDto.isTeacherMaterial || false,
          submittedAt: createAttachmentDto.isStudentSubmission ? new Date() : undefined,
          gradeLevel: createAttachmentDto.gradeLevel,
          subject: createAttachmentDto.subject,
          academicYear: createAttachmentDto.academicYear,
          tags: createAttachmentDto.tags || [],
          description: createAttachmentDto.description,
          ...metadata,
        },
      });

      const savedAttachment = await this.attachmentsRepository.save(attachment);

      // Log audit
      await this.logAudit(savedAttachment.id, userId, 'upload', {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      // Queue thumbnail generation if needed (will be implemented later)
      // if (this.shouldGenerateThumbnail(file.mimetype)) {
      //   await this.attachmentsQueue.add('generate-thumbnail', {
      //     attachmentId: savedAttachment.id,
      //     driveFileId: driveFile.fileId,
      //   });
      // }

      // Clear cache (will be implemented later)
      // await this.clearTaskCache(createAttachmentDto.taskId);

      return savedAttachment;
    } catch (error) {
      throw new BadRequestException(`Error uploading file: ${error.message}`);
    }
  }

  /**
   * Get attachments with filtering and pagination
   */
  async getAttachments(
    query: AttachmentQueryDto,
    userId: string,
  ): Promise<{
    attachments: TaskAttachment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.buildAttachmentsQuery(query, userId);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (query.page - 1) * query.limit;
    queryBuilder.skip(skip).take(query.limit);

    // Get attachments
    const attachments = await queryBuilder.getMany();

    const totalPages = Math.ceil(total / query.limit);

    return {
      attachments,
      total,
      page: query.page,
      totalPages,
    };
  }

  /**
   * Get single attachment by ID
   */
  async getAttachmentById(
    attachmentId: string,
    userId: string,
  ): Promise<TaskAttachment> {
    const attachment = await this.attachmentsRepository.findOne({
      where: { id: attachmentId },
      relations: ['uploadedBy', 'task', 'activity', 'versions', 'comments'],
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Log view
    await this.logAudit(attachmentId, userId, 'view');

    return attachment;
  }

  /**
   * Update attachment metadata
   */
  async updateAttachment(
    attachmentId: string,
    userId: string,
    updateAttachmentDto: UpdateAttachmentDto,
  ): Promise<TaskAttachment> {
    const attachment = await this.getAttachmentById(attachmentId, userId);

    // Check permissions
    await this.checkUpdatePermission(userId, attachment);

    // Update metadata
    const updatedMetadata = {
      ...attachment.metadata,
      ...updateAttachmentDto,
      tags: updateAttachmentDto.tags || attachment.metadata.tags,
    };

    attachment.metadata = updatedMetadata;

    const savedAttachment = await this.attachmentsRepository.save(attachment);

    // Log audit
    await this.logAudit(attachmentId, userId, 'upload', {
      previousValue: attachment.metadata,
      newValue: updatedMetadata,
    });

    // Clear cache
    await this.clearTaskCache(attachment.taskId);

    return savedAttachment;
  }

  /**
   * Delete attachment (soft delete)
   */
  async deleteAttachment(
    attachmentId: string,
    userId: string,
    permanent = false,
  ): Promise<void> {
    const attachment = await this.getAttachmentById(attachmentId, userId);

    // Check permissions
    await this.checkDeletePermission(userId, attachment);

    if (permanent) {
      // Delete from Google Drive
      await this.googleDriveService.deleteFile(attachment.driveFileId);

      // Delete all versions
      await this.versionsRepository.delete({ attachmentId });

      // Delete from database
      await this.attachmentsRepository.delete(attachmentId);

      // Log audit
      await this.logAudit(attachmentId, userId, 'delete', { permanent: true });
    } else {
      // Soft delete
      attachment.isActive = false;
      attachment.deletedAt = new Date();
      await this.attachmentsRepository.save(attachment);

      // Log audit
      await this.logAudit(attachmentId, userId, 'delete', { permanent: false });
    }

    // Clear cache
    await this.clearTaskCache(attachment.taskId);
  }

  /**
   * Restore deleted attachment
   */
  async restoreAttachment(
    attachmentId: string,
    userId: string,
  ): Promise<TaskAttachment> {
    const attachment = await this.attachmentsRepository.findOne({
      where: { id: attachmentId },
      relations: ['task'],
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.isActive) {
      throw new BadRequestException('Attachment is not deleted');
    }

    // Check permissions
    await this.checkRestorePermission(userId, attachment);

    // Restore
    attachment.isActive = true;
    attachment.deletedAt = null;
    const restoredAttachment = await this.attachmentsRepository.save(attachment);

    // Log audit
    await this.logAudit(attachmentId, userId, 'restore');

    // Clear cache
    await this.clearTaskCache(attachment.taskId);

    return restoredAttachment;
  }

  /**
   * Download attachment
   */
  async downloadAttachment(
    attachmentId: string,
    userId: string,
  ): Promise<NodeJS.ReadableStream> {
    const attachment = await this.getAttachmentById(attachmentId, userId);

    // Check permissions
    await this.checkDownloadPermission(userId, attachment);

    // Log audit
    await this.logAudit(attachmentId, userId, 'download');

    // Get file stream from Google Drive using task-specific method
    return this.googleDriveService.downloadTaskAttachment(attachment.driveFileId);
  }

  /**
   * Get folder structure for task
   */
  async getFolderStructure(
    taskId: string,
    userId: string,
    path?: string,
  ): Promise<FolderStructureDto> {
    // Check permissions
    await this.checkViewPermission(userId, taskId);

    // Try cache first (will be implemented later)
    // const cacheKey = `folder:${taskId}:${path || 'root'}`;
    // const cached = await this.cacheManager.get<FolderStructureDto>(cacheKey);
    // if (cached) return cached;

    // Build folder structure
    const structure = await this.buildFolderStructure(taskId, path);

    // Cache result (will be implemented later)
    // await this.cacheManager.set(cacheKey, structure, 300); // 5 minutes

    return structure;
  }

  /**
   * Add comment to attachment
   */
  async addComment(
    attachmentId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<AttachmentComment> {
    const attachment = await this.getAttachmentById(attachmentId, userId);

    // Check permissions
    await this.checkCommentPermission(userId, attachment);

    const comment = this.commentsRepository.create({
      attachmentId,
      userId,
      ...createCommentDto,
    });

    const savedComment = await this.commentsRepository.save(comment);

    // Log audit
    await this.logAudit(attachmentId, userId, 'comment', {
      commentId: savedComment.id,
      content: createCommentDto.content,
    });

    return savedComment;
  }

  /**
   * Get comments for attachment
   */
  async getComments(
    attachmentId: string,
    userId: string,
  ): Promise<AttachmentComment[]> {
    const attachment = await this.getAttachmentById(attachmentId, userId);

    const comments = await this.commentsRepository.find({
      where: { attachmentId },
      relations: ['user', 'replies', 'replies.user'],
      order: { createdAt: 'ASC' },
    });

    return comments;
  }

  // Private helper methods

  private validateFile(file: Express.Multer.File): void {
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/avi',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
    ];

    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5GB limit');
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }
  }

  private normalizeFileName(fileName: string): string {
    const replacements: Record<string, string> = {
      'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
      'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
      'ñ': 'n', 'Ñ': 'N',
      ' ': '_',
      '/': '_',
      '\\': '_',
      ':': '_',
      '*': '_',
      '?': '_',
      '"': '_',
      '<': '_',
      '>': '_',
      '|': '_'
    };

    let normalized = fileName;
    for (const [search, replace] of Object.entries(replacements)) {
      normalized = normalized.replace(new RegExp(search, 'g'), replace);
    }

    // Remove any remaining non-ASCII characters
    normalized = normalized.replace(/[^\x00-\x7F]/g, '');

    // Remove consecutive underscores
    normalized = normalized.replace(/_+/g, '_');

    // Remove leading/trailing underscores
    normalized = normalized.trim().replace(/^_+|_+$/g, '');

    return normalized;
  }

  private async buildFolderPath(
    taskId: string,
    userId: string,
    createAttachmentDto: CreateAttachmentDto,
  ): Promise<string> {
    // Implementation depends on your folder structure requirements
    // This would build the path based on academic year, subject, task, etc.
    return 'MW_Panel_Attachments'; // Placeholder
  }

  private async findExistingAttachment(
    taskId: string,
    userId: string,
    originalFileName: string,
  ): Promise<TaskAttachment | null> {
    return this.attachmentsRepository.findOne({
      where: {
        taskId,
        uploadedById: userId,
        originalFileName,
        isActive: true,
      },
    });
  }

  private async createNewVersion(
    attachment: TaskAttachment,
    driveFile: any,
    userId: string,
    changeDescription?: string,
  ): Promise<TaskAttachment> {
    const newVersionNumber = attachment.currentVersion + 1;

    // Create version record
    const version = this.versionsRepository.create({
      attachmentId: attachment.id,
      versionNumber: newVersionNumber,
      driveFileId: driveFile.fileId,
      fileName: 'new_version', // driveFile doesn't have name property
      fileSize: 0, // driveFile doesn't have size property  
      changeDescription,
      uploadedById: userId,
    });

    await this.versionsRepository.save(version);

    // Update attachment with new version info
    attachment.driveFileId = driveFile.fileId;
    attachment.fileName = 'updated_file'; // driveFile doesn't have name property
    attachment.fileSize = 0; // driveFile doesn't have size property
    attachment.webViewLink = driveFile.webViewLink;
    attachment.downloadLink = driveFile.downloadLink;
    attachment.thumbnailUrl = null; // driveFile doesn't have thumbnailLink property
    attachment.metadata = {
      ...attachment.metadata,
      version: newVersionNumber,
    };

    return this.attachmentsRepository.save(attachment);
  }

  private buildAttachmentsQuery(
    query: AttachmentQueryDto,
    userId: string,
  ): SelectQueryBuilder<TaskAttachment> {
    const queryBuilder = this.attachmentsRepository
      .createQueryBuilder('attachment')
      .leftJoinAndSelect('attachment.uploadedBy', 'uploadedBy')
      .leftJoinAndSelect('attachment.task', 'task')
      .leftJoinAndSelect('attachment.activity', 'activity');

    // Base filters
    if (query.taskId) {
      queryBuilder.andWhere('attachment.taskId = :taskId', { taskId: query.taskId });
    }

    if (query.activityId) {
      queryBuilder.andWhere('attachment.activityId = :activityId', { activityId: query.activityId });
    }

    if (query.uploadedById) {
      queryBuilder.andWhere('attachment.uploadedById = :uploadedById', { uploadedById: query.uploadedById });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(attachment.fileName ILIKE :search OR attachment.originalFileName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.mimeType) {
      queryBuilder.andWhere('attachment.mimeType = :mimeType', { mimeType: query.mimeType });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('attachment.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.isStudentSubmission !== undefined) {
      queryBuilder.andWhere(
        "attachment.metadata->>'isStudentSubmission' = :isStudentSubmission",
        { isStudentSubmission: query.isStudentSubmission.toString() },
      );
    }

    if (query.isTeacherMaterial !== undefined) {
      queryBuilder.andWhere(
        "attachment.metadata->>'isTeacherMaterial' = :isTeacherMaterial",
        { isTeacherMaterial: query.isTeacherMaterial.toString() },
      );
    }

    if (query.tags && query.tags.length > 0) {
      queryBuilder.andWhere(
        "attachment.metadata->'tags' ?| array[:...tags]",
        { tags: query.tags },
      );
    }

    if (!query.includeDeleted) {
      queryBuilder.andWhere('attachment.deletedAt IS NULL');
    }

    // Sorting
    queryBuilder.orderBy(`attachment.${query.sortBy}`, query.sortOrder);

    return queryBuilder;
  }

  private shouldGenerateThumbnail(mimeType: string): boolean {
    const thumbnailTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    return thumbnailTypes.includes(mimeType);
  }

  private async logAudit(
    attachmentId: string,
    userId: string,
    action: AuditAction,
    details?: AuditLogDetails,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      attachmentId,
      userId,
      action,
      details,
    });

    await this.auditRepository.save(auditLog);
  }

  private async clearTaskCache(taskId: string): Promise<void> {
    // Will be implemented later when cache is added
    // const keys = await this.cacheManager.store.keys(`*:${taskId}:*`);
    // await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  }

  private async buildFolderStructure(
    taskId: string,
    path?: string,
  ): Promise<FolderStructureDto> {
    // Implementation placeholder - would build actual folder structure
    return {
      currentFolder: {
        id: 'root',
        name: 'Archivos de la tarea',
        type: 'folder',
      },
      folders: [],
      breadcrumb: [
        {
          id: 'root',
          name: 'Archivos de la tarea',
        },
      ],
      permissions: {
        canUpload: true,
        canDelete: true,
        canMove: true,
        canCreateFolder: true,
      },
    };
  }

  // ===== PERMISSION SYSTEM IMPLEMENTATION =====
  // Based on specification: Students, Teachers, Families, Admins

  /**
   * Check if user can view attachments for a task
   */
  private async checkViewPermission(userId: string, taskId: string): Promise<void> {
    const user = await this.getUserWithRelations(userId);
    const task = await this.getTaskWithRelations(taskId);

    switch (user.role) {
      case UserRole.ADMIN:
        // Admins can view everything
        return;

      case UserRole.TEACHER:
        // Teachers can view attachments in their subjects
        if (task.teacherId === user.id) {
          return;
        }
        // Could also check if teacher teaches this subject
        break;

      case UserRole.STUDENT:
        // Students can view their own submissions + teacher materials
        // Need to check if student is enrolled in this task's class
        return; // For now, allow - would need class enrollment check

      case UserRole.FAMILY:
        // Families can view their children's submissions + public materials
        // Need to check family relationship
        return; // For now, allow - would need family relationship check

      default:
        throw new ForbiddenException('Invalid user role');
    }

    throw new ForbiddenException('No permission to view attachments for this task');
  }

  /**
   * Check if user can update attachment metadata
   */
  private async checkUpdatePermission(userId: string, attachment: TaskAttachment): Promise<void> {
    const user = await this.getUserWithRelations(userId);

    switch (user.role) {
      case UserRole.ADMIN:
        // Admins can update everything
        return;

      case UserRole.TEACHER:
        // Teachers can only update their own material
        if (attachment.metadata.isTeacherMaterial && attachment.uploadedById === userId) {
          return;
        }
        break;

      case UserRole.STUDENT:
        // Students can only update their own non-evaluated submissions
        if (attachment.metadata.isStudentSubmission && 
            attachment.uploadedById === userId &&
            !attachment.metadata.isEvaluated) {
          return;
        }
        break;

      case UserRole.FAMILY:
        // Families cannot update attachments
        break;

      default:
        throw new ForbiddenException('Invalid user role');
    }

    throw new ForbiddenException('No permission to update this attachment');
  }

  /**
   * Check if user can delete attachment
   */
  private async checkDeletePermission(userId: string, attachment: TaskAttachment): Promise<void> {
    const user = await this.getUserWithRelations(userId);

    switch (user.role) {
      case UserRole.ADMIN:
        // Admins can delete everything
        return;

      case UserRole.TEACHER:
        // Teachers can only delete their own material
        if (attachment.metadata.isTeacherMaterial && attachment.uploadedById === userId) {
          return;
        }
        break;

      case UserRole.STUDENT:
        // Students can only delete their own non-evaluated submissions
        if (attachment.metadata.isStudentSubmission && 
            attachment.uploadedById === userId &&
            !attachment.metadata.isEvaluated) {
          return;
        }
        break;

      case UserRole.FAMILY:
        // Families cannot delete attachments
        break;

      default:
        throw new ForbiddenException('Invalid user role');
    }

    throw new ForbiddenException('No permission to delete this attachment');
  }

  /**
   * Check if user can download attachment
   */
  private async checkDownloadPermission(userId: string, attachment: TaskAttachment): Promise<void> {
    const user = await this.getUserWithRelations(userId);

    switch (user.role) {
      case UserRole.ADMIN:
        // Admins can download everything
        return;

      case UserRole.TEACHER:
        // Teachers can download all attachments in their subjects
        const task = await this.getTaskWithRelations(attachment.taskId);
        if (task.teacherId === user.id) {
          return;
        }
        break;

      case UserRole.STUDENT:
        // Students can download their own submissions + teacher materials
        if (attachment.uploadedById === userId || attachment.metadata.isTeacherMaterial) {
          return;
        }
        break;

      case UserRole.FAMILY:
        // Families can download their children's submissions + public materials
        if (attachment.metadata.isTeacherMaterial) {
          return;
        }
        // Would need to check family relationship for student submissions
        break;

      default:
        throw new ForbiddenException('Invalid user role');
    }

    throw new ForbiddenException('No permission to download this attachment');
  }

  /**
   * Check if user can restore deleted attachment
   */
  private async checkRestorePermission(userId: string, attachment: TaskAttachment): Promise<void> {
    const user = await this.getUserWithRelations(userId);

    switch (user.role) {
      case UserRole.ADMIN:
        // Admins can restore everything
        return;

      case UserRole.TEACHER:
        // Teachers can restore their own material
        if (attachment.metadata.isTeacherMaterial && attachment.uploadedById === userId) {
          return;
        }
        break;

      case UserRole.STUDENT:
        // Students can restore their own submissions
        if (attachment.metadata.isStudentSubmission && attachment.uploadedById === userId) {
          return;
        }
        break;

      case UserRole.FAMILY:
        // Families cannot restore attachments
        break;

      default:
        throw new ForbiddenException('Invalid user role');
    }

    throw new ForbiddenException('No permission to restore this attachment');
  }

  /**
   * Check if user can comment on attachment
   */
  private async checkCommentPermission(userId: string, attachment: TaskAttachment): Promise<void> {
    const user = await this.getUserWithRelations(userId);

    switch (user.role) {
      case UserRole.ADMIN:
        // Admins can comment on everything
        return;

      case UserRole.TEACHER:
        // Teachers can comment on all attachments in their subjects
        const task = await this.getTaskWithRelations(attachment.taskId);
        if (task.teacherId === user.id) {
          return;
        }
        break;

      case UserRole.STUDENT:
        // Students can comment on their own submissions
        if (attachment.uploadedById === userId) {
          return;
        }
        break;

      case UserRole.FAMILY:
        // Families cannot comment on attachments
        break;

      default:
        throw new ForbiddenException('Invalid user role');
    }

    throw new ForbiddenException('No permission to comment on this attachment');
  }

  /**
   * Helper method to get user with necessary relations
   */
  private async getUserWithRelations(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['profile'] // Add relations as needed
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Helper method to get task with necessary relations
   */
  private async getTaskWithRelations(taskId: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: ['teacher', 'subjectAssignment'] // Add relations as needed
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  /**
   * Update comment
   */
  async updateComment(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<AttachmentComment> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: ['attachment', 'user'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only the comment author can update their comment
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    comment.content = updateCommentDto.content;
    comment.isEdited = true;

    const savedComment = await this.commentsRepository.save(comment);

    // Log audit
    await this.logAudit(comment.attachmentId, userId, 'comment', {
      commentId: comment.id,
      action: 'update',
      content: updateCommentDto.content,
    });

    return savedComment;
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: ['attachment'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only the comment author can delete their comment
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentsRepository.delete(commentId);

    // Log audit
    await this.logAudit(comment.attachmentId, userId, 'comment', {
      commentId: comment.id,
      action: 'delete',
    });
  }

  /**
   * Get attachment statistics for task
   */
  async getTaskStats(
    taskId: string,
    userId: string,
  ): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    recentActivity: any[];
  }> {
    // Check view permission
    await this.checkViewPermission(userId, taskId);

    // Get attachments for task
    const attachments = await this.attachmentsRepository.find({
      where: { taskId, isActive: true },
    });

    // Calculate statistics
    const totalFiles = attachments.length;
    const totalSize = attachments.reduce((sum, att) => sum + Number(att.fileSize), 0);

    // Group by file type
    const filesByType = attachments.reduce((acc, att) => {
      const type = att.mimeType.split('/')[0]; // 'image', 'application', etc.
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get recent activity (audit logs)
    const recentActivity = await this.auditRepository.find({
      where: { 
        attachmentId: { $in: attachments.map(a => a.id) } as any
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalFiles,
      totalSize,
      filesByType,
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        action: activity.action,
        user: activity.user?.profile ? `${activity.user.profile.firstName} ${activity.user.profile.lastName}` : activity.user?.email || 'Usuario desconocido',
        createdAt: activity.createdAt,
        details: activity.details,
      })),
    };
  }

  /**
   * Search attachments across tasks
   */
  async searchAttachments(
    query: string,
    userId: string,
    type?: string,
  ): Promise<{
    attachments: TaskAttachment[];
    total: number;
  }> {
    const queryBuilder = this.attachmentsRepository
      .createQueryBuilder('attachment')
      .leftJoinAndSelect('attachment.uploadedBy', 'uploadedBy')
      .leftJoinAndSelect('attachment.task', 'task')
      .where('attachment.isActive = :isActive', { isActive: true })
      .andWhere('attachment.deletedAt IS NULL');

    // Add search conditions
    if (query) {
      queryBuilder.andWhere(
        '(attachment.fileName ILIKE :search OR attachment.originalFileName ILIKE :search OR attachment.metadata->>\'description\' ILIKE :search)',
        { search: `%${query}%` },
      );
    }

    if (type) {
      queryBuilder.andWhere('attachment.mimeType LIKE :type', { type: `${type}/%` });
    }

    // Permission filtering - users can only see their uploads or public files
    queryBuilder.andWhere(
      '(attachment.uploadedById = :userId OR attachment.metadata->>\'isTeacherMaterial\' = \'true\')',
      { userId },
    );

    const attachments = await queryBuilder
      .orderBy('attachment.createdAt', 'DESC')
      .take(50) // Limit results
      .getMany();

    const total = await queryBuilder.getCount();

    return {
      attachments,
      total,
    };
  }

  /**
   * Get task information for folder structure and metadata
   */
  private async getTaskInfo(taskId: string): Promise<{
    title: string;
    subject: string;
    academicYear: string;
    studentName?: string;
  }> {
    // This would be implemented to fetch actual task data from the tasks module
    // For now, returning placeholder data
    
    // In a real implementation, you would:
    // 1. Inject the TasksRepository or TasksService
    // 2. Fetch the task with related subject, academic year, etc.
    // 3. Return the actual data
    
    return {
      title: 'Tarea Ejemplo',
      subject: 'Matemáticas',
      academicYear: '2024-2025',
      studentName: undefined, // Will be set based on isStudentSubmission
    };
  }
}