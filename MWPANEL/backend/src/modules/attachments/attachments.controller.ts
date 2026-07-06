import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

import { AttachmentsService } from './attachments.service';
import { AttachmentPermissionGuard } from './guards/attachment-permission.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

import {
  CreateAttachmentDto,
  UpdateAttachmentDto,
  AttachmentQueryDto,
  CreateCommentDto,
  UpdateCommentDto,
  CreateVersionDto,
  FolderStructureDto,
} from './dto';

import {
  TaskAttachment,
  AttachmentComment,
} from './entities';

@ApiTags('Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a new file attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: TaskAttachment,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or data' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(AttachmentPermissionGuard)
  async uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body() createAttachmentDto: CreateAttachmentDto,
    @CurrentUser() user: User,
  ): Promise<TaskAttachment> {
    console.log('🔍 ATTACHMENTS CONTROLLER CALLED!!!');
    console.log('🔍 ATTACHMENTS DEBUG - createAttachmentDto:', createAttachmentDto);
    console.log('🔍 ATTACHMENTS DEBUG - File:', file?.originalname);
    
    return this.attachmentsService.uploadAttachment(
      file,
      user.id,
      createAttachmentDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get attachments with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Attachments retrieved successfully',
  })
  @UseGuards(AttachmentPermissionGuard)
  async getAttachments(
    @Query() query: AttachmentQueryDto,
    @CurrentUser() user: User,
  ): Promise<{
    attachments: TaskAttachment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.attachmentsService.getAttachments(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attachment by ID' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({
    status: 200,
    description: 'Attachment retrieved successfully',
    type: TaskAttachment,
  })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @UseGuards(AttachmentPermissionGuard)
  async getAttachmentById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<TaskAttachment> {
    return this.attachmentsService.getAttachmentById(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update attachment metadata' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({
    status: 200,
    description: 'Attachment updated successfully',
    type: TaskAttachment,
  })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @UseGuards(AttachmentPermissionGuard)
  async updateAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAttachmentDto: UpdateAttachmentDto,
    @CurrentUser() user: User,
  ): Promise<TaskAttachment> {
    return this.attachmentsService.updateAttachment(id, user.id, updateAttachmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete attachment (soft delete by default)' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiQuery({
    name: 'permanent',
    required: false,
    description: 'Permanent deletion (also removes from Google Drive)',
    type: 'boolean',
  })
  @ApiResponse({ status: 200, description: 'Attachment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @UseGuards(AttachmentPermissionGuard)
  async deleteAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('permanent') permanent: boolean = false,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.attachmentsService.deleteAttachment(id, user.id, permanent);
    return {
      message: permanent
        ? 'Attachment permanently deleted'
        : 'Attachment moved to trash',
    };
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore deleted attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({
    status: 200,
    description: 'Attachment restored successfully',
    type: TaskAttachment,
  })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @ApiResponse({ status: 400, description: 'Attachment is not deleted' })
  @UseGuards(AttachmentPermissionGuard)
  async restoreAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<TaskAttachment> {
    return this.attachmentsService.restoreAttachment(id, user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download attachment file' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({ status: 200, description: 'File download stream' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @UseGuards(AttachmentPermissionGuard)
  async downloadAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const attachment = await this.attachmentsService.getAttachmentById(id, user.id);
    const fileStream = await this.attachmentsService.downloadAttachment(id, user.id);

    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${attachment.originalFileName}"`,
      'Content-Length': attachment.fileSize.toString(),
    });

    fileStream.pipe(res);
  }

  @Get('folders/:taskId')
  @ApiOperation({ summary: 'Get folder structure for task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiQuery({
    name: 'path',
    required: false,
    description: 'Folder path (optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Folder structure retrieved successfully',
    type: FolderStructureDto,
  })
  @UseGuards(AttachmentPermissionGuard)
  async getFolderStructure(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: User,
    @Query('path') path?: string,
  ): Promise<FolderStructureDto> {
    return this.attachmentsService.getFolderStructure(taskId, user.id, path);
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Upload new version of existing attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'New version uploaded successfully',
    type: TaskAttachment,
  })
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(AttachmentPermissionGuard)
  async uploadNewVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() createVersionDto: CreateVersionDto,
    @CurrentUser() user: User,
  ): Promise<TaskAttachment> {
    // Implementation would handle version creation
    // For now, redirect to main upload logic
    const attachment = await this.attachmentsService.getAttachmentById(id, user.id);
    
    const createAttachmentDto: CreateAttachmentDto = {
      taskId: attachment.taskId,
      activityId: attachment.activityId,
      description: createVersionDto.changeDescription,
      isStudentSubmission: attachment.metadata.isStudentSubmission,
      isTeacherMaterial: attachment.metadata.isTeacherMaterial,
      tags: attachment.metadata.tags,
      gradeLevel: attachment.metadata.gradeLevel,
      subject: attachment.metadata.subject,
      academicYear: attachment.metadata.academicYear,
    };

    return this.attachmentsService.uploadAttachment(
      file,
      user.id,
      createAttachmentDto,
      { isNewVersion: true, originalAttachmentId: id },
    );
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
    type: [AttachmentComment],
  })
  @UseGuards(AttachmentPermissionGuard)
  async getComments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<AttachmentComment[]> {
    return this.attachmentsService.getComments(id, user.id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiResponse({
    status: 201,
    description: 'Comment added successfully',
    type: AttachmentComment,
  })
  @UseGuards(AttachmentPermissionGuard)
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: User,
  ): Promise<AttachmentComment> {
    return this.attachmentsService.addComment(id, user.id, createCommentDto);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Update comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: AttachmentComment,
  })
  @UseGuards(AttachmentPermissionGuard)
  async updateComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user: User,
  ): Promise<AttachmentComment> {
    return this.attachmentsService.updateComment(commentId, user.id, updateCommentDto);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @UseGuards(AttachmentPermissionGuard)
  async deleteComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.attachmentsService.deleteComment(commentId, user.id);
    return { message: 'Comment deleted successfully' };
  }

  @Get('tasks/:taskId/stats')
  @ApiOperation({ summary: 'Get attachment statistics for task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @UseGuards(AttachmentPermissionGuard)
  async getTaskStats(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: User,
  ): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    recentActivity: any[];
  }> {
    return this.attachmentsService.getTaskStats(taskId, user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search attachments across tasks' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'type', description: 'File type filter', required: false })
  @ApiResponse({
    status: 200,
    description: 'Search results',
  })
  @UseGuards(AttachmentPermissionGuard)
  async searchAttachments(
    @Query('q') query: string,
    @CurrentUser() user: User,
    @Query('type') type?: string,
  ): Promise<{
    attachments: TaskAttachment[];
    total: number;
  }> {
    return this.attachmentsService.searchAttachments(query, user.id, type);
  }
}