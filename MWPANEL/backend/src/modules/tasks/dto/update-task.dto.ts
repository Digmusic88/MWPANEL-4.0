import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { TaskStatus } from '../entities/task.entity';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({
    description: 'Estado de la tarea',
    enum: TaskStatus,
    example: TaskStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Fecha de publicación',
    example: '2025-06-24T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: Date;

  @ApiPropertyOptional({
    description: 'Fecha de cierre',
    example: '2025-07-01T23:59:00Z',
  })
  @IsOptional()
  @IsDateString()
  closedAt?: Date;
}