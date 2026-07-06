import { PartialType } from '@nestjs/swagger';
import { CreateClassGroupDto } from './create-class-group.dto';

export class UpdateClassGroupDto extends PartialType(CreateClassGroupDto) {}