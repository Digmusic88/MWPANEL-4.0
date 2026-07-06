import { PartialType } from '@nestjs/swagger';
import { CreateGroupPhotoDto } from './create-group-photo.dto';

export class UpdateGroupPhotoDto extends PartialType(CreateGroupPhotoDto) {}