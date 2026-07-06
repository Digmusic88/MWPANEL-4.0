import { IsOptional, IsUUID, IsDateString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { MeetingBookingStatus } from '../entities/meeting-booking.entity';

export class MeetingFiltersDto {
  @IsOptional()
  @IsUUID('4', { message: 'El ID del período debe ser un UUID válido' })
  periodId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID del profesor debe ser un UUID válido' })
  teacherId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID de la familia debe ser un UUID válido' })
  familyId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID del estudiante debe ser un UUID válido' })
  studentId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  availableOnly?: boolean;

  @IsOptional()
  @IsEnum(MeetingBookingStatus, { message: 'Estado de reserva no válido' })
  bookingStatus?: MeetingBookingStatus;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    console.log('🔧 [DTO Transform] Raw value received:', value, 'type:', typeof value);
    if (value === undefined || value === null) {
      console.log('🔧 [DTO Transform] Returning undefined (null/undefined)');
      return undefined;
    }
    if (value === 'true' || value === true) {
      console.log('🔧 [DTO Transform] Returning true');
      return true;
    }
    if (value === 'false' || value === false) {
      console.log('🔧 [DTO Transform] Returning false');
      return false;
    }
    console.log('🔧 [DTO Transform] No match, returning undefined');
    return undefined;
  })
  showPast?: boolean;
}