import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TaskAttachment } from '../entities/task-attachment.entity';
import { AttachmentComment } from '../entities/attachment-comment.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AttachmentPermissionGuard implements CanActivate {
  constructor(
    @InjectRepository(TaskAttachment)
    private attachmentsRepository: Repository<TaskAttachment>,
    @InjectRepository(AttachmentComment)
    private commentsRepository: Repository<AttachmentComment>,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Activity)
    private activitiesRepository: Repository<Activity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    const method = request.method;
    const params = request.params;
    const body = request.body;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin can do everything
    if (user.role === 'admin') {
      return true;
    }

    // Check permissions based on endpoint and method
    const endpoint = this.getEndpointType(request.route?.path || request.url);

    switch (endpoint) {
      case 'upload':
        return this.canUpload(user, body);
      case 'view':
        return this.canView(user, params.id || params.taskId);
      case 'update':
        return this.canUpdate(user, params.id);
      case 'delete':
        return this.canDelete(user, params.id);
      case 'download':
        return this.canDownload(user, params.id);
      case 'comment':
        return this.canComment(user, params.id);
      case 'folders':
        return this.canViewFolders(user, params.taskId);
      default:
        return this.canView(user, params.id || params.taskId);
    }
  }

  private getEndpointType(path: string): string {
    if (path.includes('/upload')) return 'upload';
    if (path.includes('/download')) return 'download';
    if (path.includes('/comments')) return 'comment';
    if (path.includes('/folders')) return 'folders';
    if (path.includes('/restore')) return 'update';
    
    const method = path.toLowerCase();
    if (method.includes('post')) return 'upload';
    if (method.includes('patch')) return 'update';
    if (method.includes('delete')) return 'delete';
    
    return 'view';
  }

  private async canUpload(user: User, body: any): Promise<boolean> {
    const { taskId, activityId } = body;

    if (!taskId) {
      throw new ForbiddenException('Task ID is required');
    }

    // Check if user has access to the task
    const hasTaskAccess = await this.hasTaskAccess(user, taskId);
    if (!hasTaskAccess) {
      throw new ForbiddenException('No access to this task');
    }

    // Students can upload submissions
    if (user.role === 'student') {
      return this.isStudentInTask(user.id, taskId);
    }

    // Teachers can upload if they teach the class
    if (user.role === 'teacher') {
      return this.isTeacherOfTask(user.id, taskId);
    }

    // Families cannot upload
    if (user.role === 'family') {
      return false;
    }

    return false;
  }

  private async canView(user: User, resourceId: string): Promise<boolean> {
    if (!resourceId) {
      throw new ForbiddenException('Resource ID is required');
    }

    // If it's a task ID (folders endpoint), check task access
    if (resourceId.length === 36) { // UUID length
      const task = await this.tasksRepository.findOne({
        where: { id: resourceId },
      });
      
      if (task) {
        return this.hasTaskAccess(user, resourceId);
      }
    }

    // Otherwise, it's an attachment ID
    const attachment = await this.attachmentsRepository.findOne({
      where: { id: resourceId },
      relations: ['task', 'uploadedBy'],
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return this.hasAttachmentAccess(user, attachment);
  }

  private async canUpdate(user: User, attachmentId: string): Promise<boolean> {
    const attachment = await this.attachmentsRepository.findOne({
      where: { id: attachmentId },
      relations: ['task', 'uploadedBy'],
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Users can only update their own attachments
    if (attachment.uploadedById === user.id) {
      return true;
    }

    // Teachers can update attachments in their tasks
    if (user.role === 'teacher') {
      return this.isTeacherOfTask(user.id, attachment.taskId);
    }

    return false;
  }

  private async canDelete(user: User, attachmentId: string): Promise<boolean> {
    const attachment = await this.attachmentsRepository.findOne({
      where: { id: attachmentId },
      relations: ['task', 'uploadedBy'],
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Users can only delete their own attachments
    if (attachment.uploadedById === user.id) {
      return true;
    }

    // Teachers can delete attachments in their tasks
    if (user.role === 'teacher') {
      return this.isTeacherOfTask(user.id, attachment.taskId);
    }

    return false;
  }

  private async canDownload(user: User, attachmentId: string): Promise<boolean> {
    const attachment = await this.attachmentsRepository.findOne({
      where: { id: attachmentId },
      relations: ['task', 'uploadedBy'],
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return this.hasAttachmentAccess(user, attachment);
  }

  private async canComment(user: User, attachmentId: string): Promise<boolean> {
    const attachment = await this.attachmentsRepository.findOne({
      where: { id: attachmentId },
      relations: ['task'],
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Students and teachers can comment, families cannot
    if (user.role === 'family') {
      return false;
    }

    return this.hasTaskAccess(user, attachment.taskId);
  }

  private async canViewFolders(user: User, taskId: string): Promise<boolean> {
    return this.hasTaskAccess(user, taskId);
  }

  private async hasTaskAccess(user: User, taskId: string): Promise<boolean> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: [
        'subjectAssignment',
        'subjectAssignment.classGroup',
        'subjectAssignment.classGroup.students',
        'subjectAssignment.teacher',
        'activity',
        'activity.subjectAssignment',
        'activity.subjectAssignment.classGroup',
        'activity.subjectAssignment.classGroup.students',
      ],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    switch (user.role) {
      case 'teacher':
        return this.isTeacherOfTask(user.id, taskId);
      case 'student':
        return this.isStudentInTask(user.id, taskId);
      case 'family':
        return this.isFamilyOfStudentInTask(user.id, taskId);
      default:
        return false;
    }
  }

  private async hasAttachmentAccess(
    user: User,
    attachment: TaskAttachment,
  ): Promise<boolean> {
    // Check task access first
    const hasTaskAccess = await this.hasTaskAccess(user, attachment.taskId);
    if (!hasTaskAccess) {
      return false;
    }

    // Additional checks based on attachment type
    if (attachment.metadata?.isStudentSubmission) {
      // Student submissions can be viewed by:
      // - The student who uploaded it
      // - Teachers of the class
      // - Family members of the student
      if (user.role === 'student' && attachment.uploadedById === user.id) {
        return true;
      }
      
      if (user.role === 'teacher') {
        return this.isTeacherOfTask(user.id, attachment.taskId);
      }
      
      if (user.role === 'family') {
        return this.isFamilyOfStudent(user.id, attachment.uploadedById);
      }
    }

    if (attachment.metadata?.isTeacherMaterial) {
      // Teacher materials can be viewed by all users with task access
      return true;
    }

    // Default: allow access if user has task access
    return true;
  }

  private async isTeacherOfTask(teacherId: string, taskId: string): Promise<boolean> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: ['subjectAssignment', 'subjectAssignment.teacher'],
    });

    return task?.subjectAssignment?.teacher?.id === teacherId;
  }

  private async isStudentInTask(studentId: string, taskId: string): Promise<boolean> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: [
        'subjectAssignment',
        'subjectAssignment.classGroup',
        'subjectAssignment.classGroup.students',
      ],
    });

    const students = task?.subjectAssignment?.classGroup?.students || [];
    return students.some((student) => student.id === studentId);
  }

  private async isFamilyOfStudentInTask(
    familyId: string,
    taskId: string,
  ): Promise<boolean> {
    // Implementation would check if any of the family's children are in the task
    // This requires the family-student relationship structure
    return false; // Placeholder
  }

  private async isFamilyOfStudent(
    familyId: string,
    studentId: string,
  ): Promise<boolean> {
    // Implementation would check if the family is related to the student
    // This requires the family-student relationship structure
    return false; // Placeholder
  }
}