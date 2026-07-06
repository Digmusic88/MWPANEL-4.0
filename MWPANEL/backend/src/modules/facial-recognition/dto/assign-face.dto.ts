import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignFaceDto {
  @ApiProperty({ description: 'ID del estudiante al que se asigna la cara' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'ID del usuario que realiza la asignación' })
  @IsUUID()
  assignedById: string;
}