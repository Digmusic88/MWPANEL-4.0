import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

export class AttachStudentNoteDto {
  @IsUUID()
  studentNoteId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string; // Descripción opcional del estudiante sobre por qué adjunta este apunte
}

export class AttachStudentNotesToSubmissionDto {
  @IsUUID()
  submissionId: string;

  studentNotes: AttachStudentNoteDto[];
}