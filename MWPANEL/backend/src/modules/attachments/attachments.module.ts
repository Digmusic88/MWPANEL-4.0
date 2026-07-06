import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentPermissionGuard } from './guards/attachment-permission.guard';

// Entities
import {
  TaskAttachment,
  AttachmentVersion,
  AttachmentAuditLog,
  AttachmentComment,
} from './entities';

// External services
import { GoogleDriveService } from '../educational-resources/services/google-drive.service';
import { Task } from '../tasks/entities/task.entity';
import { Activity } from '../activities/entities/activity.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskAttachment,
      AttachmentVersion,
      AttachmentAuditLog,
      AttachmentComment,
      Task,
      Activity,
      User,
    ]),
  ],
  controllers: [AttachmentsController],
  providers: [
    AttachmentsService,
    GoogleDriveService,
    AttachmentPermissionGuard,
  ],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}