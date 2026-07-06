import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'El motivo de cancelación no puede exceder 500 caracteres' })
  reason?: string;
}