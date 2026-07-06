import { IsUUID, IsDateString, IsNumber, IsOptional, IsString, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SlotTimeDto {
  @IsDateString({}, { message: 'La fecha y hora de inicio debe ser una fecha válida' })
  startDatetime: string;

  @IsOptional()
  @IsNumber({}, { message: 'La duración debe ser un número' })
  @Min(15, { message: 'La duración mínima es de 15 minutos' })
  @Max(120, { message: 'La duración máxima es de 120 minutos' })
  durationMinutes?: number = 30;
}

export class CreateBulkSlotsDto {
  @IsUUID('4', { message: 'El ID del período debe ser un UUID válido' })
  periodId: string;

  @IsArray({ message: 'Los slots deben ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => SlotTimeDto)
  slots: SlotTimeDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}