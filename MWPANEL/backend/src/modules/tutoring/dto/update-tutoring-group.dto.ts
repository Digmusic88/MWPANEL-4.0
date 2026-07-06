import { PartialType } from '@nestjs/swagger';
import { CreateTutoringGroupDto } from './create-tutoring-group.dto';

export class UpdateTutoringGroupDto extends PartialType(CreateTutoringGroupDto) {}