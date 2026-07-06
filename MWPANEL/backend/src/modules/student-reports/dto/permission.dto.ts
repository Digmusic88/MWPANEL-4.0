/**
 * @archivo: permission.dto.ts
 * @módulo: Student Reports - DTOs de Permisos
 * @función: Validación para asignación de permisos por el Admin
 */

import { IsUUID, IsArray, IsOptional, IsString, IsBoolean, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * DTO para asignación masiva de permisos (Bulk Assign)
 * El Admin selecciona UN profesor y MÚLTIPLES estudiantes
 */
export class BulkAssignPermissionsDto {
  @ApiProperty({ description: 'ID del profesor que recibirá los permisos' })
  @IsUUID()
  teacherId: string;

  @ApiProperty({ description: 'Lista de IDs de estudiantes', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  studentIds: string[];

  @ApiProperty({ description: 'ID del año académico' })
  @IsUUID()
  academicYearId: string;

  @ApiPropertyOptional({ description: 'Nota del admin (ej: "Para evaluación trimestral")' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}

/**
 * DTO para asignar permisos por grupo de clase
 * Más ágil: selecciona un grupo y asigna todos sus estudiantes
 */
export class AssignPermissionsByGroupDto {
  @ApiProperty({ description: 'ID del profesor' })
  @IsUUID()
  teacherId: string;

  @ApiProperty({ description: 'ID del grupo de clase' })
  @IsUUID()
  classGroupId: string;

  @ApiProperty({ description: 'ID del año académico' })
  @IsUUID()
  academicYearId: string;

  @ApiPropertyOptional({ description: 'Nota del admin' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}

/**
 * DTO para asignar permisos por múltiples grupos de clase
 * Permite seleccionar varios grupos a la vez para asignar todos sus estudiantes
 */
export class AssignPermissionsByMultipleGroupsDto {
  @ApiProperty({ description: 'ID del profesor' })
  @IsUUID()
  teacherId: string;

  @ApiProperty({ description: 'IDs de los grupos de clase', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  classGroupIds: string[];

  @ApiProperty({ description: 'ID del año académico' })
  @IsUUID()
  academicYearId: string;

  @ApiPropertyOptional({ description: 'Nota del admin' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}

/**
 * DTO para revocar permisos masivamente
 */
export class BulkRevokePermissionsDto {
  @ApiProperty({ description: 'IDs de los permisos a revocar', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  permissionIds: string[];
}

/**
 * DTO para actualizar un permiso individual
 */
export class UpdatePermissionDto {
  @ApiPropertyOptional({ description: 'Estado activo/inactivo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Nota del admin' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}

/**
 * DTO para consultar permisos con filtros
 */
export class QueryPermissionsDto {
  @ApiPropertyOptional({ description: 'Filtrar por profesor' })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estudiante' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por año académico' })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por grupo de clase' })
  @IsOptional()
  @IsUUID()
  classGroupId?: string;

  @ApiPropertyOptional({ description: 'Solo permisos activos' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activeOnly?: boolean;
}
