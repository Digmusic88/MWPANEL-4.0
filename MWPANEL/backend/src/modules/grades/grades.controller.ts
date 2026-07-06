import { 
  Controller, 
  Get, 
  Post,
  Param, 
  UseGuards, 
  Request,
  Query,
  Body,
  ParseUUIDPipe,
  Res,
  Delete,
  Put,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GradesService } from './grades.service';
import { StudentGradesResponseDto, ClassGradesResponseDto } from './dto/student-grades.dto';

@ApiTags('grades')
@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Get all grades for a specific student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Student grades retrieved successfully',
    type: StudentGradesResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiQuery({ name: 'academicYearId', required: false, description: 'Filtrar por año académico' })
  async getStudentGrades(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Request() req,
    @Query('academicYearId') academicYearId?: string,
  ): Promise<StudentGradesResponseDto> {
    return this.gradesService.getStudentGrades(
      studentId,
      req.user.id,
      req.user.role,
      academicYearId,
    );
  }

  @Get('student/:studentId/available-years')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Años académicos con datos (notas/asistencia) para un alumno' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Lista de años con datos (puede ser vacía)' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getStudentAvailableYears(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Request() req,
  ) {
    return this.gradesService.getStudentAvailableYears(
      studentId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('student/:studentId/details/:gradeType')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Get detailed grade breakdown for a specific student by grade type' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiParam({ name: 'gradeType', description: 'Grade type: task, activity, or test-yourself' })
  @ApiResponse({ 
    status: 200, 
    description: 'Student grade details retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentGradeDetails(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('gradeType') gradeType: string,
    @Request() req,
  ) {
    return this.gradesService.getStudentGradeDetails(
      studentId,
      gradeType,
      req.user.id,
      req.user.role,
    );
  }

  @Get('my-grades')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get current student\'s own grades' })
  @ApiResponse({ 
    status: 200, 
    description: 'Student grades retrieved successfully',
    type: StudentGradesResponseDto,
  })
  @ApiQuery({ name: 'academicYearId', required: false, description: 'Filtrar por año académico' })
  async getMyGrades(
    @Request() req,
    @Query('academicYearId') academicYearId?: string,
  ): Promise<StudentGradesResponseDto> {
    // First get the student record from user ID
    const student = await this.gradesService.getStudentByUserId(req.user.id);

    return this.gradesService.getStudentGrades(
      student.id,
      req.user.id,
      UserRole.STUDENT,
      academicYearId,
    );
  }

  @Get('family/children')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Get grades for all children of a family' })
  @ApiResponse({ 
    status: 200, 
    description: 'Children grades retrieved successfully',
    type: [StudentGradesResponseDto],
  })
  async getFamilyChildrenGrades(@Request() req): Promise<StudentGradesResponseDto[]> {
    return this.gradesService.getFamilyChildrenGrades(req.user.id);
  }

  @Get('family/child/:studentId')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Get grades for a specific child' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Child grades retrieved successfully',
    type: StudentGradesResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not authorized to view this student' })
  @ApiQuery({ name: 'academicYearId', required: false, description: 'Filtrar por año académico' })
  async getFamilyChildGrades(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Request() req,
    @Query('academicYearId') academicYearId?: string,
  ): Promise<StudentGradesResponseDto> {
    return this.gradesService.getStudentGrades(
      studentId,
      req.user.id,
      UserRole.FAMILY,
      academicYearId,
    );
  }

  @Get('teacher/test-debug/:classGroupId/:subjectId')
  @Roles(UserRole.TEACHER)
  async testDebugEndpoint(
    @Param('classGroupId') classGroupId: string,
    @Param('subjectId') subjectId: string,
    @Request() req,
  ) {
    console.log('🚀 TEST DEBUG ENDPOINT HIT!');
    return {
      message: 'Test endpoint working',
      userId: req.user.id,
      teacherId: req.user.teacherId,
      classGroupId,
      subjectId
    };
  }

  @Get('teacher/class/:classGroupId/subject/:subjectId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get grades for all students in a class for a specific subject' })
  @ApiParam({ name: 'classGroupId', description: 'Class group ID' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Class grades retrieved successfully',
    type: ClassGradesResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not authorized for this class/subject' })
  async getClassGrades(
    @Param('classGroupId', ParseUUIDPipe) classGroupId: string,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Request() req,
  ) {
    console.log('🔍 getClassGrades CONTROLLER START');
    
    try {
      console.log('🔍 getClassGrades CONTROLLER - userId:', req.user.id);
      console.log('🔍 getClassGrades CONTROLLER - classGroupId:', classGroupId);
      console.log('🔍 getClassGrades CONTROLLER - subjectId:', subjectId);
      
      // First get the teacher ID from user ID  
      const teacher = await this.gradesService.getTeacherByUserId(req.user.id);
      console.log('🔍 getClassGrades CONTROLLER - teacher found:', teacher.id);
      
      const result = await this.gradesService.getClassGrades(
        classGroupId,
        subjectId,
        teacher.id,
      );
      
      console.log('✅ getClassGrades CONTROLLER - success');
      return result;
    } catch (error) {
      console.log('❌ getClassGrades CONTROLLER - error:', error.message);
      throw error;
    }
  }

  @Get('teacher/debug')
  @Roles(UserRole.TEACHER)
  async debugTeacher(@Request() req) {
    return {
      teacherId: req.user.teacherId,
      userId: req.user.id,
      userRole: req.user.role,
      userEmail: req.user.email,
      hasTeacherId: !!req.user.teacherId,
      message: 'Debug info for teacher'
    };
  }

  @Get('teacher/my-classes')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get summary of grades for all teacher\'s classes' })
  @ApiResponse({ 
    status: 200, 
    description: 'Teacher classes summary retrieved successfully',
  })
  async getTeacherClassesSummary(@Request() req) {
    // Use teacherId directly from JWT token if available, otherwise fallback to user lookup
    console.log('🔍 Controller Debug - req.user object:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      teacherId: req.user.teacherId,
      hasTeacherId: !!req.user.teacherId
    });
    
    const teacherId = req.user.teacherId || null;
    console.log('🔍 Controller Debug - teacherId extracted:', teacherId);
    
    if (teacherId) {
      console.log('✅ Using getTeacherClassesSummaryByTeacherId with teacherId:', teacherId);
      return this.gradesService.getTeacherClassesSummaryByTeacherId(teacherId);
    } else {
      console.log('❌ Falling back to getTeacherClassesSummary with userId:', req.user.id);
      return this.gradesService.getTeacherClassesSummary(req.user.id);
    }
  }

  @Get('teacher/centralized')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get centralized grades for all students in teacher\'s classes (reuses student panel logic)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Centralized grades retrieved successfully',
  })
  async getTeacherCentralizedGrades(@Request() req) {
    // First get the teacher record from user ID
    const teacher = await this.gradesService.getTeacherByUserId(req.user.id);
    
    return this.gradesService.getTeacherCentralizedGrades(teacher.id);
  }

  @Get('gradebook/:subjectAssignmentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cuaderno unificado: todas las calificaciones existentes de una asignación (actividades, tareas y Test Yourself)' })
  @ApiResponse({ status: 200, description: 'Cuaderno obtenido correctamente' })
  async getGradebook(@Param('subjectAssignmentId') subjectAssignmentId: string, @Request() req) {
    return this.gradesService.getGradebook(subjectAssignmentId, req.user.id, req.user.role);
  }

  @Get('admin/overview')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get grades overview for the entire school' })
  @ApiQuery({ name: 'levelId', required: false, description: 'Filter by educational level' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter by course' })
  @ApiQuery({ name: 'classGroupId', required: false, description: 'Filter by class group' })
  @ApiResponse({ 
    status: 200, 
    description: 'School grades overview retrieved successfully',
  })
  async getSchoolGradesOverview(
    @Query('levelId') levelId?: string,
    @Query('courseId') courseId?: string,
    @Query('classGroupId') classGroupId?: string,
  ) {
    return this.gradesService.getSchoolGradesOverview({
      levelId,
      courseId,
      classGroupId,
    });
  }

  @Get('export/student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY)
  @ApiOperation({ summary: 'Export student grades as PDF' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiQuery({ name: 'period', required: false, description: 'Academic period' })
  @ApiResponse({ 
    status: 200, 
    description: 'PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async exportStudentGrades(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('period') period: string,
    @Request() req,
    @Res() res,
  ) {
    const result = await this.gradesService.exportStudentGrades(
      studentId,
      req.user.id,
      req.user.role,
      period,
    );

    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Content-Length': result.buffer.length,
    });

    return res.send(result.buffer);
  }

  @Get('unified-system/health')
  @ApiOperation({ summary: 'Health check for unified grading system' })
  @ApiResponse({ status: 200, description: 'System status' })
  async unifiedGradingHealth() {
    return {
      status: 'OPERATIONAL',
      message: 'Unified Grading System ready for teacher testing',
      timestamp: new Date(),
      version: '2.0',
      endpoints: [
        'GET /scales - All grading scales',
        'POST /convert - Convert single grade',
        'POST /batch-convert - Batch conversion',
        'GET /grades - List grades',
        'POST /grades - Create grade',
        'GET /analytics - Analytics',
        'GET /reports/summary - Summary report',
        'GET /reports/detailed - Detailed report'
      ]
    };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get general grades summary for admin dashboard' })
  @ApiResponse({ 
    status: 200, 
    description: 'Grades summary retrieved successfully',
  })
  async getGradesSummary() {
    return this.gradesService.getSchoolGradesOverview({});
  }
}