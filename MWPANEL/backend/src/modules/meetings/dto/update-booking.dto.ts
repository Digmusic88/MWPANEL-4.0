import { IsUUID, IsString, IsOptional, IsEnum } from 'class-validator';
import { MeetingBookingStatus } from '../entities/meeting-booking.entity';

export class UpdateBookingDto {
  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(MeetingBookingStatus)
  status?: MeetingBookingStatus;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}
