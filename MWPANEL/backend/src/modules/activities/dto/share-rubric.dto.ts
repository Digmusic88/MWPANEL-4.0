import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShareRubricDto {
  @ApiProperty({
    description: 'IDs de los profesores con los que compartir la rúbrica',
    type: [String],
    example: ['uuid-1', 'uuid-2']
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(4, { each: true })
  teacherIds: string[];
}

export class UnshareRubricDto {
  @ApiProperty({
    description: 'IDs de los profesores a los que retirar el acceso',
    type: [String],
    example: ['uuid-1', 'uuid-2']
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(4, { each: true })
  teacherIds: string[];
}