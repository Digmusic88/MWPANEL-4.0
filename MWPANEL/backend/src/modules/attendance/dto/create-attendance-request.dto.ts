import { IsNotEmpty, IsUUID, IsEnum, IsString, MinLength, IsDateString, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceRequestType } from '../entities/attendance-request.entity';

export class CreateAttendanceRequestDto {
  @ApiProperty({ description: 'ID del estudiante' })
  @IsNotEmpty()
  @IsUUID()
  studentId: string;

  @ApiProperty({ enum: AttendanceRequestType, description: 'Tipo de solicitud' })
  @IsNotEmpty()
  @IsEnum(AttendanceRequestType)
  type: AttendanceRequestType;

  @ApiProperty({ description: 'Fecha para la solicitud (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Motivo de la solicitud (mínimo 10 caracteres)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  reason: string;

  @ApiPropertyOptional({ description: 'Hora esperada de llegada (HH:MM) para retrasos' })
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Formato de hora inválido. Use HH:MM' })
  expectedArrivalTime?: string;

  @ApiPropertyOptional({ description: 'Hora de salida (HH:MM) para salidas anticipadas' })
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Formato de hora inválido. Use HH:MM' })
  expectedDepartureTime?: string;
}