import { IsString, IsEnum, IsArray, IsBoolean, IsOptional, IsInt, Min, Max } from 'class-validator';
import { AnnouncementType } from '../entities/system-announcement.entity';
import { UserRole } from '../../users/entities/user.entity';

export class CreateAnnouncementDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  message: string;

  @IsEnum(AnnouncementType)
  @IsOptional()
  type?: AnnouncementType;

  @IsArray()
  @IsEnum(UserRole, { each: true })
  targetRoles: UserRole[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  priority?: number;
}
