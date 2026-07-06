import { PartialType } from '@nestjs/swagger';
import { CreateStudentNoteDto } from './create-student-note.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStudentNoteDto extends PartialType(CreateStudentNoteDto) {
  @ApiProperty({
    description: 'Marcar/desmarcar como favorito',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}