import { IsUUID, IsArray, IsOptional, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogPermissionDto {
  @ApiProperty({
    description: 'ID del profesor al que se le otorgan permisos',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  teacherId: string;

  @ApiProperty({
    description: 'IDs de los grupos de clase a los que puede publicar',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  classGroupIds: string[];
}

export class UpdateBlogPermissionsDto {
  @ApiProperty({
    description: 'IDs de los grupos de clase (reemplaza todos los permisos existentes)',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440001'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  classGroupIds: string[];
}

export class BlogPermissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  teacherId: string;

  @ApiProperty()
  classGroupId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  teacher?: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };

  @ApiPropertyOptional()
  classGroup?: {
    id: string;
    name: string;
  };
}

export class TeacherPermissionsResponseDto {
  @ApiProperty()
  teacherId: string;

  @ApiProperty()
  teacherName: string;

  @ApiProperty()
  teacherEmail: string;

  @ApiProperty({ type: [Object] })
  allowedGroups: {
    id: string;
    name: string;
  }[];
}
