import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsNumber, IsDate, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class SubjectGradeDto {
  @ApiProperty({ description: 'Subject ID' })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ description: 'Subject name' })
  @IsString()
  subjectName: string;

  @ApiProperty({ description: 'Subject code' })
  @IsString()
  subjectCode: string;

  @ApiProperty({ description: 'Teacher first name', required: false })
  @IsOptional()
  @IsString()
  teacherFirstName?: string;

  @ApiProperty({ description: 'Teacher last name', required: false })
  @IsOptional()
  @IsString()
  teacherLastName?: string;

  @ApiProperty({ description: 'Total number of evaluations (exams + activities + tasks)', required: false })
  @IsOptional()
  @IsNumber()
  totalEvaluations?: number;

  @ApiProperty({ description: 'Average grade from all sources or "sin datos"', example: 8.5 })
  averageGrade: number | string;

  @ApiProperty({ description: 'Task grades average or "sin datos"', required: false })
  @IsOptional()
  taskAverage?: number | string;

  @ApiProperty({ description: 'Activity assessments average or "sin datos"', required: false })
  @IsOptional()
  activityAverage?: number | string;

  @ApiProperty({ description: 'Competency evaluations average or "sin datos"', required: false })
  @IsOptional()
  competencyAverage?: number | string;

  @ApiProperty({ description: 'Exam (Test Yourself) average', required: false })
  @IsOptional()
  examAverage?: number | null;

  @ApiProperty({ description: 'Number of graded tasks' })
  @IsNumber()
  gradedTasks: number;

  @ApiProperty({ description: 'Number of graded exams (Test Yourself)' })
  @IsNumber()
  @IsOptional()
  examGradedCount?: number;

  @ApiProperty({ description: 'Number of pending exams (Test Yourself)' })
  @IsNumber()
  @IsOptional()
  examPendingCount?: number;

  @ApiProperty({ description: 'Number of pending tasks' })
  @IsNumber()
  pendingTasks: number;

  @ApiProperty({ description: 'Number of activity assessments' })
  @IsNumber()
  activityAssessments: number;

  @ApiProperty({ description: 'Last update date' })
  @Type(() => Date)
  @IsDate()
  lastUpdated: Date;
}

export class GradeDetailDto {
  @ApiProperty({ description: 'Grade source ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Type of grade', enum: ['task', 'activity', 'evaluation', 'exam'] })
  @IsString()
  type: 'task' | 'activity' | 'evaluation' | 'exam';

  @ApiProperty({ description: 'Title of the graded item' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Grade value' })
  @IsNumber()
  grade: number;

  @ApiProperty({ description: 'Maximum possible grade' })
  @IsNumber()
  maxGrade: number;

  @ApiProperty({ description: 'Weight of this grade', required: false })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiProperty({ description: 'Date when graded' })
  @Type(() => Date)
  @IsDate()
  gradedAt: Date;

  @ApiProperty({ description: 'Teacher feedback', required: false })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiProperty({ description: 'Subject information' })
  subject: {
    id: string;
    name: string;
    code: string;
  };
}

export class StudentGradesResponseDto {
  @ApiProperty({ description: 'Student information' })
  student: {
    id: string;
    enrollmentNumber: string;
    firstName: string;
    lastName: string;
    classGroup: {
      id: string;
      name: string;
    };
    educationalLevel: {
      id: string;
      name: string;
    };
  };

  @ApiProperty({ description: 'Overall academic summary' })
  summary: {
    overallAverage: number | string;
    totalSubjects: number;
    totalGradedItems: number;
    totalPendingTasks: number;
    lastActivityDate: Date;
  };

  @ApiProperty({ description: 'Grades by subject', type: [SubjectGradeDto] })
  @IsArray()
  @Type(() => SubjectGradeDto)
  subjectGrades: SubjectGradeDto[];

  @ApiProperty({ description: 'Recent grade details', type: [GradeDetailDto] })
  @IsArray()
  @Type(() => GradeDetailDto)
  recentGrades: GradeDetailDto[];

  @ApiProperty({ description: 'Academic period' })
  academicPeriod: {
    current: string;
    year: string;
  };
}

export class ClassGradesResponseDto {
  @ApiProperty({ description: 'Class group information' })
  classGroup: {
    id: string;
    name: string;
    level: string;
    course: string;
  };

  @ApiProperty({ description: 'Subject information' })
  subject: {
    id: string;
    name: string;
    code: string;
  };

  @ApiProperty({ description: 'Students with their grades' })
  @IsArray()
  students: Array<{
    id: string;
    enrollmentNumber: string;
    firstName: string;
    lastName: string;
    grades: {
      taskAverage: number | string;
      activityAverage: number | string;
      overallAverage: number | string;
      gradedTasks: number;
      pendingTasks: number;
      lastActivity: Date;
    };
  }>;

  @ApiProperty({ description: 'Class statistics' })
  statistics: {
    classAverage: number;
    highestGrade: number;
    lowestGrade: number;
    passingRate: number;
  };
}