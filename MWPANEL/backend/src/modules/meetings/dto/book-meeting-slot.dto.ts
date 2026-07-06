import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

export class BookMeetingSlotDto {
  @IsUUID('4', { message: 'El ID del slot debe ser un UUID válido' })
  slotId: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID del estudiante debe ser un UUID válido' })
  studentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notes?: string;
}