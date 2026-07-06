import { IsUUID, IsBoolean, IsOptional, IsArray, IsString, IsInt, Min, Max, IsEnum, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFamilyAccessControlDto {
  @ApiProperty({ description: 'Student ID' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'Family ID' })
  @IsUUID()
  familyId: string;

  @ApiPropertyOptional({ description: 'Can view notes', default: true })
  @IsOptional()
  @IsBoolean()
  canViewNotes?: boolean = true;

  @ApiPropertyOptional({ description: 'Can download files', default: false })
  @IsOptional()
  @IsBoolean()
  canDownloadFiles?: boolean = false;

  @ApiPropertyOptional({ description: 'Can view metadata', default: true })
  @IsOptional()
  @IsBoolean()
  canViewMetadata?: boolean = true;

  @ApiPropertyOptional({ description: 'Allowed subjects', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedSubjects?: string[];

  @ApiPropertyOptional({ description: 'Blocked subjects', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedSubjects?: string[];

  @ApiPropertyOptional({ 
    description: 'Allowed note types', 
    type: [String],
    enum: ['text', 'image', 'audio', 'video', 'document']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedNoteTypes?: string[];

  @ApiPropertyOptional({ 
    description: 'Blocked note types', 
    type: [String],
    enum: ['text', 'image', 'audio', 'video', 'document']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedNoteTypes?: string[];

  @ApiPropertyOptional({ description: 'Access start time (HH:mm format)', example: '08:00' })
  @IsOptional()
  @IsString()
  accessStartTime?: string;

  @ApiPropertyOptional({ description: 'Access end time (HH:mm format)', example: '22:00' })
  @IsOptional()
  @IsString()
  accessEndTime?: string;

  @ApiPropertyOptional({ description: 'Restrict access on weekends', default: false })
  @IsOptional()
  @IsBoolean()
  weekendRestriction?: boolean = false;

  @ApiPropertyOptional({ 
    description: 'Allowed days of week (1=Monday, 7=Sunday)', 
    type: [Number],
    example: [1, 2, 3, 4, 5]
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  allowedDaysOfWeek?: number[];

  @ApiPropertyOptional({ description: 'Maximum daily views (0 = unlimited)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDailyViews?: number = 0;

  @ApiPropertyOptional({ description: 'Maximum daily downloads (0 = unlimited)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDailyDownloads?: number = 0;

  @ApiPropertyOptional({ description: 'Retention days (0 = unlimited)', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  retentionDays?: number = 30;

  @ApiPropertyOptional({ description: 'Require student approval', default: false })
  @IsOptional()
  @IsBoolean()
  requireStudentApproval?: boolean = false;

  @ApiPropertyOptional({ description: 'Log family access', default: true })
  @IsOptional()
  @IsBoolean()
  logFamilyAccess?: boolean = true;

  @ApiPropertyOptional({ description: 'Notify student on access', default: false })
  @IsOptional()
  @IsBoolean()
  notifyStudentOnAccess?: boolean = false;

  @ApiPropertyOptional({ description: 'Notify family on new note', default: false })
  @IsOptional()
  @IsBoolean()
  notifyFamilyOnNewNote?: boolean = false;

  @ApiPropertyOptional({ description: 'Minimum note size in bytes', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minNoteSizeBytes?: number = 0;

  @ApiPropertyOptional({ description: 'Maximum note size in bytes (0 = unlimited)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxNoteSizeBytes?: number = 0;

  @ApiPropertyOptional({ description: 'Banned keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bannedKeywords?: string[];

  @ApiPropertyOptional({ description: 'Required keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredKeywords?: string[];

  @ApiPropertyOptional({ description: 'Custom settings', type: 'object' })
  @IsOptional()
  customSettings?: any;
}

export class UpdateFamilyAccessControlDto {
  @ApiPropertyOptional({ description: 'Can view notes' })
  @IsOptional()
  @IsBoolean()
  canViewNotes?: boolean;

  @ApiPropertyOptional({ description: 'Can download files' })
  @IsOptional()
  @IsBoolean()
  canDownloadFiles?: boolean;

  @ApiPropertyOptional({ description: 'Can view metadata' })
  @IsOptional()
  @IsBoolean()
  canViewMetadata?: boolean;

  @ApiPropertyOptional({ description: 'Allowed subjects', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedSubjects?: string[];

  @ApiPropertyOptional({ description: 'Blocked subjects', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedSubjects?: string[];

  @ApiPropertyOptional({ description: 'Allowed note types', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedNoteTypes?: string[];

  @ApiPropertyOptional({ description: 'Blocked note types', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedNoteTypes?: string[];

  @ApiPropertyOptional({ description: 'Access start time (HH:mm format)' })
  @IsOptional()
  @IsString()
  accessStartTime?: string;

  @ApiPropertyOptional({ description: 'Access end time (HH:mm format)' })
  @IsOptional()
  @IsString()
  accessEndTime?: string;

  @ApiPropertyOptional({ description: 'Restrict access on weekends' })
  @IsOptional()
  @IsBoolean()
  weekendRestriction?: boolean;

  @ApiPropertyOptional({ description: 'Allowed days of week', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  allowedDaysOfWeek?: number[];

  @ApiPropertyOptional({ description: 'Maximum daily views' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDailyViews?: number;

  @ApiPropertyOptional({ description: 'Maximum daily downloads' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDailyDownloads?: number;

  @ApiPropertyOptional({ description: 'Retention days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  retentionDays?: number;

  @ApiPropertyOptional({ description: 'Require student approval' })
  @IsOptional()
  @IsBoolean()
  requireStudentApproval?: boolean;

  @ApiPropertyOptional({ description: 'Log family access' })
  @IsOptional()
  @IsBoolean()
  logFamilyAccess?: boolean;

  @ApiPropertyOptional({ description: 'Notify student on access' })
  @IsOptional()
  @IsBoolean()
  notifyStudentOnAccess?: boolean;

  @ApiPropertyOptional({ description: 'Notify family on new note' })
  @IsOptional()
  @IsBoolean()
  notifyFamilyOnNewNote?: boolean;

  @ApiPropertyOptional({ description: 'Minimum note size in bytes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minNoteSizeBytes?: number;

  @ApiPropertyOptional({ description: 'Maximum note size in bytes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxNoteSizeBytes?: number;

  @ApiPropertyOptional({ description: 'Banned keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bannedKeywords?: string[];

  @ApiPropertyOptional({ description: 'Required keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredKeywords?: string[];

  @ApiPropertyOptional({ description: 'Custom settings' })
  @IsOptional()
  customSettings?: any;
}

export class FamilyAccessControlQueryDto {
  @ApiPropertyOptional({ description: 'Student ID to filter by' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Family ID to filter by' })
  @IsOptional()
  @IsUUID()
  familyId?: string;

  @ApiPropertyOptional({ description: 'Filter by access permission' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  canViewNotes?: boolean;

  @ApiPropertyOptional({ description: 'Filter by download permission' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  canDownloadFiles?: boolean;
}