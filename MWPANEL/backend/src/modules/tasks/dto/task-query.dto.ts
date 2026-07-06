import { IsOptional, IsEnum, IsString, IsDateString, IsBoolean, IsNumberString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType, TaskStatus, TaskPriority } from '../entities/task.entity';
import { SubmissionStatus } from '../entities/task-submission.entity';

export class TaskQueryDto {
  @ApiPropertyOptional({
    description: 'ID del grupo de clase',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsString()
  classGroupId?: string;

  @ApiPropertyOptional({ required: false, description: 'Filtrar por año académico' })
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @ApiPropertyOptional({
    description: 'ID de la asignación de asignatura',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsString()
  subjectAssignmentId?: string;

  @ApiPropertyOptional({
    description: 'Tipo de tarea',
    enum: TaskType,
  })
  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @ApiPropertyOptional({
    description: 'Estado de la tarea',
    enum: TaskStatus,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Prioridad de la tarea',
    enum: TaskPriority,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Fecha de inicio para filtrar',
    example: '2025-06-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin para filtrar',
    example: '2025-06-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Solo tareas vencidas',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  onlyOverdue?: boolean;

  @ApiPropertyOptional({
    description: 'Solo tareas con entregas pendientes',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasPendingSubmissions?: boolean;

  @ApiPropertyOptional({
    description: 'Número de página',
    example: '1',
  })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({
    description: 'Número de elementos por página',
    example: '10',
  })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Búsqueda por título o descripción',
    example: 'ensayo',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class StudentTaskQueryDto {
  @ApiPropertyOptional({
    description: 'Estado de la entrega',
    enum: SubmissionStatus,
  })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  submissionStatus?: SubmissionStatus;

  @ApiPropertyOptional({
    description: 'Solo tareas pendientes de entrega',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  onlyPending?: boolean;

  @ApiPropertyOptional({
    description: 'Solo tareas calificadas',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  onlyGraded?: boolean;

  @ApiPropertyOptional({
    description: 'ID de la asignatura',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio para filtrar',
    example: '2025-06-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin para filtrar',
    example: '2025-06-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Número de página',
    example: '1',
  })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({
    description: 'Número de elementos por página',
    example: '10',
  })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({ required: false, description: 'Filtrar por año académico' })
  @IsOptional()
  @IsString()
  academicYearId?: string;
}

export class FamilyTaskQueryDto extends StudentTaskQueryDto {
  @ApiPropertyOptional({
    description: 'ID del estudiante (hijo)',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsString()
  studentId?: string;
}