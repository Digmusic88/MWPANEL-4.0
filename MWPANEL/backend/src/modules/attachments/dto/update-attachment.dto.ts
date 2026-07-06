import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAttachmentDto } from './create-attachment.dto';

export class UpdateAttachmentDto extends PartialType(
  OmitType(CreateAttachmentDto, ['taskId'] as const)
) {}