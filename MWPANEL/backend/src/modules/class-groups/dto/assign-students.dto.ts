import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignStudentsDto {
  @ApiProperty({ description: 'Lista de IDs de estudiantes a asignar' })
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds: string[];
}