import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkTasksAsReviewedDto {
  @ApiProperty({
    description: 'Array de IDs de tareas a marcar como revisadas',
    example: ['uuid-task-1', 'uuid-task-2'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  taskIds: string[];
}