import { ApiProperty } from '@nestjs/swagger';
import { LessonResourceResponseDto } from './lesson-response.dto';

export class PaginationDto {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrev: boolean;
}

export class PaginatedLessonResourcesResponseDto {
  @ApiProperty({ 
    type: [LessonResourceResponseDto],
    description: 'Array of lesson resources' 
  })
  data: LessonResourceResponseDto[];

  @ApiProperty({ 
    type: PaginationDto,
    description: 'Pagination information' 
  })
  pagination: PaginationDto;

  @ApiProperty({ 
    description: 'Applied filters',
    required: false 
  })
  filters?: Record<string, any>;
}