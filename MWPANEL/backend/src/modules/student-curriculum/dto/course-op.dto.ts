import { IsUUID, IsString, IsNotEmpty, IsOptional } from 'class-validator';
export class AddCourseDto {
  @IsUUID() academicYearId: string;
  @IsUUID() courseId: string;
  @IsString() @IsNotEmpty({ message: 'El motivo es obligatorio' }) reason: string;
  @IsOptional() @IsUUID() subjectAssignmentId?: string;
}
export class RemoveCourseDto {
  @IsUUID() academicYearId: string;
  @IsString() @IsNotEmpty({ message: 'El motivo es obligatorio' }) reason: string;
}
