import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateMeetingSpaceDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMeetingSpaceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MeetingSpaceResponseDto {
  id: string;
  name: string;
  type?: string;
  location?: string;
  capacity?: number;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class CheckSpaceAvailabilityDto {
  @IsUUID()
  spaceId: string;

  @IsString()
  startDatetime: string; // ISO format

  @IsInt()
  @Min(15)
  durationMinutes: number;
}

export class SpaceAvailabilityResponseDto {
  isAvailable: boolean;
  conflictingBooking?: {
    id: string;
    teacherName: string;
    familyName: string;
    startTime: string;
    endTime: string;
  };
}
