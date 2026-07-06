import { IsString, IsEmail, IsOptional, IsEnum, IsIn, IsDateString, IsBoolean } from 'class-validator';

// Lista de valores válidos para relationship
const VALID_RELATIONSHIPS = [
  'father', 'mother', 'mom', 'dad', 'parent', 
  'guardian', 'tutor legal', 'legal guardian', 'other',
  'madre', 'padre', 'mamá', 'papá', 'progenitor', 'guardián', 'otro'
] as const;

export class BulkEnrollmentRowDto {
  // Student Data
  @IsString()
  studentFirstName: string;

  @IsString()
  studentLastName: string;

  @IsEmail()
  studentEmail: string;

  @IsString()
  studentPassword: string;

  @IsOptional()
  @IsDateString()
  studentBirthDate?: string;

  @IsOptional()
  @IsString()
  studentDocumentNumber?: string;

  @IsOptional()
  @IsString()
  studentPhone?: string;

  @IsOptional()
  @IsString()
  enrollmentNumber?: string;

  @IsString()
  educationalLevelId: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  // Primary Contact Data
  @IsString()
  primaryFirstName: string;

  @IsOptional()
  @IsString()
  primaryLastName?: string;

  @IsEmail()
  primaryEmail: string;

  @IsString()
  primaryPassword: string;

  @IsString()
  primaryPhone: string;

  @IsOptional()
  @IsString()
  primaryDocumentNumber?: string;

  @IsOptional()
  @IsDateString()
  primaryDateOfBirth?: string;

  @IsOptional()
  @IsString()
  primaryAddress?: string;

  @IsOptional()
  @IsString()
  primaryOccupation?: string;

  relationshipToPrimary: string;

  // Secondary Contact Data (Optional)
  @IsOptional()
  @IsBoolean()
  hasSecondaryContact?: boolean;

  @IsOptional()
  @IsString()
  secondaryFirstName?: string;

  @IsOptional()
  @IsString()
  secondaryLastName?: string;

  @IsOptional()
  @IsEmail()
  secondaryEmail?: string;

  @IsOptional()
  @IsString()
  secondaryPassword?: string;

  @IsOptional()
  @IsString()
  secondaryPhone?: string;

  @IsOptional()
  @IsString()
  secondaryDocumentNumber?: string;

  @IsOptional()
  @IsDateString()
  secondaryDateOfBirth?: string;

  @IsOptional()
  @IsString()
  secondaryAddress?: string;

  @IsOptional()
  @IsString()
  secondaryOccupation?: string;

  @IsOptional()
  relationshipToSecondary?: string;
}

export interface BulkImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: BulkImportError[];
  warnings: BulkImportWarning[];
  importedStudents: Array<{
    rowNumber: number;
    studentName: string;
    enrollmentNumber: string;
    familyId: string;
  }>;
}

export interface BulkImportError {
  rowNumber: number;
  field?: string;
  message: string;
  originalData: any;
}

export interface BulkImportWarning {
  rowNumber: number;
  field?: string;
  message: string;
  originalData: any;
}

// DTO Simplificado para subida masiva con datos reducidos
export class SimplifiedBulkEnrollmentRowDto {
  // Datos mínimos del estudiante
  @IsString()
  studentFirstName: string;

  @IsString()
  studentLastName: string;

  @IsEmail()
  studentEmail: string;

  @IsOptional()
  @IsString()
  studentPassword?: string; // Opcional - se genera automáticamente si está vacío

  @IsOptional()
  @IsString()
  studentBirthDate?: string; // Opcional - fecha de nacimiento en formato DD/MM/YYYY

  // Datos mínimos del progenitor 1 (obligatorio)
  @IsString()
  primaryFirstName: string;

  @IsString()
  primaryLastName: string;

  @IsEmail()
  primaryEmail: string;

  @IsOptional()
  @IsString()
  primaryPassword?: string; // Opcional - se genera automáticamente si está vacío

  // Datos opcionales del progenitor 2
  @IsOptional()
  @IsString()
  secondaryFirstName?: string;

  @IsOptional()
  @IsString()
  secondaryLastName?: string;

  @IsOptional()
  @IsEmail()
  secondaryEmail?: string;

  @IsOptional()
  @IsString()
  secondaryPassword?: string; // Opcional - se genera automáticamente si está vacío
}

export interface SimplifiedBulkImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: BulkImportError[];
  warnings: BulkImportWarning[];
  importedUsers: Array<{
    rowNumber: number;
    studentName: string;
    studentEmail: string;
    studentPassword: string; // Contraseña generada o proporcionada
    primaryName: string;
    primaryEmail: string;
    primaryPassword: string; // Contraseña generada o proporcionada
    secondaryName?: string;
    secondaryEmail?: string;
    secondaryPassword?: string; // Contraseña generada o proporcionada (si aplica)
    notes: string[]; // Notas como "Contraseña generada automáticamente"
  }>;
}