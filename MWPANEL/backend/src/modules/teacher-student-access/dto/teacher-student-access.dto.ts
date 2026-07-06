import { IsString, IsOptional, IsBoolean, IsIn, IsUUID, IsDateString, IsArray, ArrayMinSize } from 'class-validator';
import { AccessType, AccessReason } from '../entities/teacher-student-access.entity';

const ACCESS_TYPES: AccessType[] = ['read', 'write', 'full'];
const ACCESS_REASONS: AccessReason[] = [
  'tutor', 'support', 'coordinator', 'counselor',
  'substitute', 'special_needs', 'admin_override', 'other',
];

export class CreateAccessDto {
  @IsUUID()
  teacherId: string;

  @IsUUID()
  studentId: string;

  @IsUUID()
  academicYearId: string;

  @IsIn(ACCESS_TYPES)
  accessType: AccessType;

  @IsIn(ACCESS_REASONS)
  reason: AccessReason;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateAccessDto {
  @IsOptional()
  @IsIn(ACCESS_TYPES)
  accessType?: AccessType;

  @IsOptional()
  @IsIn(ACCESS_REASONS)
  reason?: AccessReason;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  expiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryAccessDto {
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsOptional()
  @IsIn(ACCESS_TYPES)
  accessType?: AccessType;

  @IsOptional()
  @IsIn(ACCESS_REASONS)
  reason?: AccessReason;

  @IsOptional()
  isActive?: boolean | string;
}

export class BulkAssignDto {
  @IsUUID()
  teacherId: string;

  @IsUUID()
  academicYearId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  studentIds: string[];

  @IsOptional()
  @IsIn(ACCESS_TYPES)
  accessType?: AccessType;

  @IsOptional()
  @IsIn(ACCESS_REASONS)
  reason?: AccessReason;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkAssignAllDto {
  @IsUUID()
  teacherId: string;

  @IsUUID()
  academicYearId: string;

  @IsOptional()
  @IsIn(ACCESS_TYPES)
  accessType?: AccessType;

  @IsOptional()
  @IsIn(ACCESS_REASONS)
  reason?: AccessReason;

  @IsOptional()
  @IsString()
  notes?: string;
}
