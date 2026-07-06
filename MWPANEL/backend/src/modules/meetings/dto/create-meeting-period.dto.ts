import { IsString, IsDateString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMeetingPeriodDto {
  @IsString()
  @MinLength(5, { message: 'El nombre debe tener al menos 5 caracteres' })
  @MaxLength(255, { message: 'El nombre no puede exceder 255 caracteres' })
  name: string;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  startDate: string;

  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  endDate: string;

  @IsDateString({}, { message: 'La fecha límite de reserva debe ser una fecha válida' })
  bookingDeadline: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'La descripción no puede exceder 1000 caracteres' })
  description?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isActive?: boolean = true;
}