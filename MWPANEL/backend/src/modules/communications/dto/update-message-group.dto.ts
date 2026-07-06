import { PartialType } from '@nestjs/swagger';
import { CreateMessageGroupDto } from './create-message-group.dto';

export class UpdateMessageGroupDto extends PartialType(CreateMessageGroupDto) {}