import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDecimal, IsInt, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AcademicPeriod, RecordStatus, EntryType, GradeType } from '../entities/academic-record.types';

// =============== ACADEMIC RECORD DTOs ===============

export class CreateAcademicRecordDto {
  @ApiProperty({
    description: 'ID del estudiante',
    example: 'student-uuid',
  })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    description: 'Año académico',
    example: '2025-2026',
  })
  @IsString()
  academicYear: string;

  @ApiPropertyOptional({
    description: 'Estado del expediente',
    enum: RecordStatus,
    example: RecordStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;

  @ApiPropertyOptional({
    description: 'Créditos totales',
    example: 120,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalCredits?: number;

  @ApiPropertyOptional({
    description: 'Fecha de inicio del año académico',
    example: '2024-09-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del año académico',
    example: '2025-06-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Observaciones generales',
    example: 'Estudiante destacado en matemáticas',
  })
  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdateAcademicRecordDto {
  @ApiPropertyOptional({
    description: 'Estado del expediente',
    enum: RecordStatus,
  })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;

  @ApiPropertyOptional({
    description: 'Promedio general final',
    example: 8.5,
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Min(0)
  @Max(10)
  finalGPA?: number;

  @ApiPropertyOptional({
    description: 'Créditos completados',
    example: 95,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  completedCredits?: number;

  @ApiPropertyOptional({
    description: 'Número de faltas',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  absences?: number;

  @ApiPropertyOptional({
    description: 'Número de retrasos',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  tardiness?: number;

  @ApiPropertyOptional({
    description: 'Si fue promovido',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPromoted?: boolean;

  @ApiPropertyOptional({
    description: 'Notas sobre la promoción',
    example: 'Promovido con excelencia académica',
  })
  @IsOptional()
  @IsString()
  promotionNotes?: string;

  @ApiPropertyOptional({
    description: 'Observaciones generales',
  })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({
    description: 'Logros destacados (JSON)',
  })
  @IsOptional()
  @IsString()
  achievements?: string;
}

// =============== ACADEMIC RECORD ENTRY DTOs ===============

export class CreateAcademicRecordEntryDto {
  @ApiProperty({
    description: 'ID del expediente académico',
    example: 'record-uuid',
  })
  @IsString()
  @IsNotEmpty()
  academicRecordId: string;

  @ApiProperty({
    description: 'Tipo de entrada',
    enum: EntryType,
    example: EntryType.ACADEMIC,
  })
  @IsEnum(EntryType)
  type: EntryType;

  @ApiProperty({
    description: 'Período académico',
    enum: AcademicPeriod,
    example: AcademicPeriod.FIRST_TRIMESTER,
  })
  @IsEnum(AcademicPeriod)
  period: AcademicPeriod;

  @ApiProperty({
    description: 'Título de la entrada',
    example: 'Calificaciones del primer trimestre - Matemáticas',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada',
    example: 'Evaluación continua y examen final',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Fecha de la entrada',
    example: '2024-12-15',
  })
  @IsDateString()
  entryDate: string;

  @ApiPropertyOptional({
    description: 'ID de la asignación de asignatura',
    example: 'subject-assignment-uuid',
  })
  @IsOptional()
  @IsString()
  subjectAssignmentId?: string;

  @ApiPropertyOptional({
    description: 'Valor numérico (calificación)',
    example: 8.5,
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Min(0)
  @Max(10)
  numericValue?: number;

  @ApiPropertyOptional({
    description: 'Calificación con letra',
    example: 'A',
  })
  @IsOptional()
  @IsString()
  letterGrade?: string;

  @ApiPropertyOptional({
    description: 'Comentarios',
    example: 'Excelente progreso durante el trimestre',
  })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({
    description: 'Créditos de la materia',
    example: 6,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  credits?: number;

  @ApiPropertyOptional({
    description: 'Si la calificación es aprobatoria',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPassing?: boolean;
}

export class UpdateAcademicRecordEntryDto {
  @ApiPropertyOptional({
    description: 'Título de la entrada',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Valor numérico (calificación)',
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Min(0)
  @Max(10)
  numericValue?: number;

  @ApiPropertyOptional({
    description: 'Calificación con letra',
  })
  @IsOptional()
  @IsString()
  letterGrade?: string;

  @ApiPropertyOptional({
    description: 'Comentarios',
  })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({
    description: 'Si la calificación es aprobatoria',
  })
  @IsOptional()
  @IsBoolean()
  isPassing?: boolean;

  @ApiPropertyOptional({
    description: 'Si está exento',
  })
  @IsOptional()
  @IsBoolean()
  isExempt?: boolean;
}

// =============== ACADEMIC RECORD GRADE DTOs ===============

export class CreateAcademicRecordGradeDto {
  @ApiProperty({
    description: 'ID de la entrada del expediente',
    example: 'entry-uuid',
  })
  @IsString()
  @IsNotEmpty()
  entryId: string;

  @ApiProperty({
    description: 'Tipo de calificación',
    enum: GradeType,
    example: GradeType.EXAM,
  })
  @IsEnum(GradeType)
  gradeType: GradeType;

  @ApiProperty({
    description: 'Nombre de la evaluación',
    example: 'Examen Final de Matemáticas',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la evaluación',
    example: 'Examen comprensivo de álgebra y geometría',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Puntos obtenidos',
    example: 85,
  })
  @IsDecimal({ decimal_digits: '0,2' })
  @Min(0)
  earnedPoints: number;

  @ApiProperty({
    description: 'Puntos totales posibles',
    example: 100,
  })
  @IsDecimal({ decimal_digits: '0,2' })
  @Min(0)
  totalPoints: number;

  @ApiPropertyOptional({
    description: 'Peso en la calificación final (0.0 - 1.0)',
    example: 0.3,
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Min(0)
  @Max(1)
  weight?: number;

  @ApiProperty({
    description: 'Fecha de la evaluación',
    example: '2024-12-10',
  })
  @IsDateString()
  gradeDate: string;

  @ApiPropertyOptional({
    description: 'Fecha límite de entrega',
    example: '2024-12-10',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Comentarios del profesor',
    example: 'Excelente comprensión de los conceptos',
  })
  @IsOptional()
  @IsString()
  teacherComments?: string;
}

export class UpdateAcademicRecordGradeDto {
  @ApiPropertyOptional({
    description: 'Puntos obtenidos',
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Min(0)
  earnedPoints?: number;

  @ApiPropertyOptional({
    description: 'Comentarios del profesor',
  })
  @IsOptional()
  @IsString()
  teacherComments?: string;

  @ApiPropertyOptional({
    description: 'Si fue entregado tarde',
  })
  @IsOptional()
  @IsBoolean()
  isLate?: boolean;

  @ApiPropertyOptional({
    description: 'Si está justificado',
  })
  @IsOptional()
  @IsBoolean()
  isExcused?: boolean;

  @ApiPropertyOptional({
    description: 'Si se descarta de cálculos',
  })
  @IsOptional()
  @IsBoolean()
  isDropped?: boolean;
}

// =============== QUERY DTOs ===============

export class AcademicRecordQueryDto {
  @ApiPropertyOptional({
    description: 'Año académico',
    example: '2025-2026',
  })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({
    description: 'Estado del expediente',
    enum: RecordStatus,
  })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;

  @ApiPropertyOptional({
    description: 'Página',
    example: 1,
  })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({
    description: 'Límite por página',
    example: 10,
  })
  @IsOptional()
  limit?: string;
}