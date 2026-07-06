import { IsUUID, IsDateString, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateMeetingSlotDto {
  @IsUUID('4', { message: 'El ID del período debe ser un UUID válido' })
  periodId: string;

  @IsDateString({}, { message: 'La fecha y hora de inicio debe ser una fecha válida' })
  startDatetime: string;

  @IsOptional()
  @IsNumber({}, { message: 'La duración debe ser un número' })
  @Min(15, { message: 'La duración mínima es de 15 minutos' })
  @Max(120, { message: 'La duración máxima es de 120 minutos' })
  durationMinutes?: number = 30;

  @IsOptional()
  @IsString()
  notes?: string;
}