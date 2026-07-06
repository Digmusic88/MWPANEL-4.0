import { IsUUID, IsString, IsNotEmpty, IsOptional } from 'class-validator';
export class ChangeBlockDto {
  @IsUUID() academicYearId: string;
  @IsUUID() newCourseId: string;
  @IsString() @IsNotEmpty({ message: 'El motivo es obligatorio' }) reason: string;
  @IsOptional() @IsUUID() subjectAssignmentId?: string;
}
