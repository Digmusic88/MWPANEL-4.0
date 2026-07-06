import { IsUUID, IsBoolean, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommunicationConfigDto {
  @ApiProperty({ description: 'ID del profesor' })
  @IsUUID()
  teacherId: string;

  @ApiProperty({ description: 'ID del grupo de clase', required: false })
  @IsOptional()
  @IsUUID()
  classGroupId?: string;

  @ApiProperty({ description: 'ID del estudiante individual', required: false })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiProperty({ description: 'ID de la familia individual', required: false })
  @IsOptional()
  @IsUUID()
  familyId?: string;

  @ApiProperty({ description: 'Si está habilitada la comunicación', default: true })
  @IsBoolean()
  isEnabled: boolean;

  @ApiProperty({
    description: 'Tipo de configuración',
    enum: ['class_group', 'student', 'family']
  })
  @IsEnum(['class_group', 'student', 'family'])
  configType: 'class_group' | 'student' | 'family';

  @ApiProperty({ description: 'Notas del administrador', required: false })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class UpdateCommunicationConfigDto {
  @ApiProperty({ description: 'Si está habilitada la comunicación', required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ description: 'Notas del administrador', required: false })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class CommunicationConfigResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  teacherId: string;

  @ApiProperty()
  teacher: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };

  @ApiProperty({ required: false })
  classGroupId?: string;

  @ApiProperty({ required: false })
  classGroup?: {
    id: string;
    name: string;
    course: {
      name: string;
    };
  };

  @ApiProperty({ required: false })
  studentId?: string;

  @ApiProperty({ required: false })
  student?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };

  @ApiProperty({ required: false })
  familyId?: string;

  @ApiProperty({ required: false })
  family?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };

  @ApiProperty()
  isEnabled: boolean;

  @ApiProperty()
  configType: 'class_group' | 'student' | 'family';

  @ApiProperty({ required: false })
  adminNotes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class BulkCommunicationConfigDto {
  @ApiProperty({ description: 'ID del profesor' })
  @IsUUID()
  teacherId: string;

  @ApiProperty({ description: 'IDs de grupos de clase', type: [String] })
  @IsUUID(4, { each: true })
  classGroupIds: string[];

  @ApiProperty({ description: 'Si está habilitada la comunicación' })
  @IsBoolean()
  isEnabled: boolean;

  @ApiProperty({ description: 'Notas del administrador', required: false })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}