import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Res,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CredentialsPDFService } from '../users/services/credentials-pdf.service';

@ApiTags('Profesores')
@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly credentialsPDFService: CredentialsPDFService,
  ) {}

  @Get('test-stats')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'TEST - Estadísticas del profesor' })
  @ApiResponse({ status: 200, description: 'Test endpoint working' })
  async getMyStatistics(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    console.log('🧪 TEST getMyStatistics called for userId:', userId);
    return {
      message: "TEST ENDPOINT WORKING",
      totalClasses: 3,
      totalStudents: 25,
      totalSubjects: 5,
      weeklyHours: 20,
      specialties: ["Educación Primaria"],
      employeeNumber: "EMP001",
      department: "Departamento de Primaria",
      position: "Profesor",
      isActive: true,
      lastActivity: new Date()
    };
  }

  @Get('test-schedules')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'TEST - Horarios del profesor' })
  @ApiResponse({ status: 200, description: 'Test schedules endpoint working' })
  async getMySchedules(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    console.log('🧪 TEST getMySchedules called for userId:', userId);
    return [
      {
        message: "TEST SCHEDULES ENDPOINT WORKING",
        id: 'schedule-1',
        subject: 'Matemáticas',
        classGroup: 'Grupo A',
        dayOfWeek: 'Lunes',
        timeSlot: '08:00-09:00',
        classroom: 'Aula 101',
        duration: 60,
        isActive: true
      },
      {
        id: 'schedule-2',
        subject: 'Lengua Española',
        classGroup: 'Grupo A',
        dayOfWeek: 'Martes',
        timeSlot: '09:00-10:00',
        classroom: 'Aula 102',
        duration: 60,
        isActive: true
      }
    ];
  }

  @Get('credentials/download')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Generar y descargar PDF con credenciales de profesores' })
  @ApiResponse({ 
    status: 200, 
    description: 'PDF con credenciales generado exitosamente',
    headers: {
      'Content-Type': { description: 'application/pdf' },
      'Content-Disposition': { description: 'attachment; filename="credenciales_profesores.pdf"' }
    }
  })
  async downloadTeachersCredentials(
    @Res() res: Response,
    @Query('includeInactive') includeInactive?: string
  ) {
    try {
      const includeInactiveUsers = includeInactive === 'true';
      
      const result = await this.credentialsPDFService.generateCredentialsPDF({
        role: UserRole.TEACHER,
        includeInactiveUsers
      });

      // Configurar headers para descarga del PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.size);

      // Enviar el archivo
      res.sendFile(result.filePath, (error) => {
        if (error) {
          console.error('Error sending PDF file:', error);
          if (!res.headersSent) {
            res.status(500).json({ message: 'Error al enviar el archivo PDF' });
          }
        } else {
          // Limpiar archivo después de enviarlo (opcional)
          setTimeout(() => {
            try {
              require('fs').unlinkSync(result.filePath);
            } catch (cleanupError) {
              console.warn('Could not clean up PDF file:', cleanupError);
            }
          }, 5000);
        }
      });
    } catch (error) {
      console.error('Error generating teachers credentials PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          message: 'Error al generar PDF de credenciales',
          error: error.message 
        });
      }
    }
  }

  @Get('dashboard/my-dashboard')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener datos del dashboard del profesor actual' })
  @ApiResponse({ status: 200, description: 'Datos del dashboard del profesor' })
  @ApiResponse({ status: 404, description: 'Profesor no encontrado' })
  getMyDashboard(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.teachersService.getTeacherDashboard(userId);
  }

  @Get('me')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener datos del profesor logueado' })
  @ApiResponse({ status: 200, description: 'Datos del profesor' })
  @ApiResponse({ status: 404, description: 'Profesor no encontrado' })
  async getMe(@Request() req: any) {
    console.log('🎯 GET /teachers/me called!');
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    console.log('🔑 User ID from token:', userId);
    const teacher = await this.teachersService.findByUserId(userId);
    console.log('🏫 Teacher found:', !!teacher);
    
    // Log para debugging
    console.log('👩‍🏫 Teacher data:', {
      id: teacher.id,
      employeeNumber: teacher.employeeNumber,
      subjectAssignmentsCount: teacher.subjectAssignments?.length || 0,
      tutoredClassesCount: teacher.tutoredClasses?.length || 0,
      subjectsCount: teacher.subjects?.length || 0
    });
    
    // Calcular estadísticas reales basadas en los datos del profesor
    const totalClasses = teacher.tutoredClasses?.length || 0;
    const totalStudents = teacher.tutoredClasses?.reduce((sum, classGroup) => 
      sum + (classGroup.students?.length || 0), 0) || 0;
    const totalSubjects = teacher.subjectAssignments?.length || teacher.subjects?.length || 0;
    const weeklyHours = teacher.subjectAssignments?.reduce((sum, assignment) => 
      sum + (assignment.weeklyHours || 0), 0) || 0;
    
    const statistics = {
      totalClasses,
      totalStudents,
      totalSubjects,
      weeklyHours,
      specialties: teacher.specialties || [],
      employeeNumber: teacher.employeeNumber,
      department: teacher.user?.profile?.department || null,
      position: teacher.user?.profile?.position || null,
      isActive: teacher.user?.isActive || false,
      lastActivity: teacher.user?.lastLoginAt || null
    };
    
    // Generar horarios basados en las asignaciones reales o datos de ejemplo
    let schedules = [];
    
    if (teacher.subjectAssignments && teacher.subjectAssignments.length > 0) {
      schedules = teacher.subjectAssignments.map((assignment, index) => {
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const timeSlots = ['08:00-09:00', '09:00-10:00', '10:30-11:30', '11:30-12:30', '12:30-13:30'];
        
        return {
          id: `schedule-${assignment.id || index}`,
          subject: assignment.subject?.name || 'Sin asignatura',
          classGroup: assignment.classGroup?.name || 'Sin grupo',
          dayOfWeek: days[index % days.length],
          timeSlot: timeSlots[index % timeSlots.length],
          classroom: `Aula ${100 + index}`,
          duration: 60,
          isActive: true
        };
      });
    } else {
      // No hay asignaciones reales - mostrar array vacío
      schedules = [];
    }
    
    // Log detallado para debugging del profesor
    console.log('🔍 Raw teacher data:', {
      subjectAssignments: teacher.subjectAssignments,
      subjectAssignmentsLength: teacher.subjectAssignments?.length,
      subjectAssignmentsIds: teacher.subjectAssignments?.map(sa => sa.id),
      subjects: teacher.subjects,
      subjectsLength: teacher.subjects?.length,
      tutoredClasses: teacher.tutoredClasses,
      tutoredClassesLength: teacher.tutoredClasses?.length
    });
    
    // NO agregar datos de ejemplo - usar solo datos reales
    // El profesor debe tener asignaciones reales en la base de datos
    
    return {
      ...teacher,
      statistics,
      schedules
    };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo profesor' })
  @ApiResponse({ status: 201, description: 'Profesor creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Email o número de empleado ya existe' })
  create(@Body() createTeacherDto: CreateTeacherDto) {
    return this.teachersService.create(createTeacherDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener todos los profesores' })
  @ApiResponse({ status: 200, description: 'Lista de profesores' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    const shouldIncludeInactive = includeInactive === 'true';
    return this.teachersService.findAll(shouldIncludeInactive);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar un profesor' })
  @ApiResponse({ status: 200, description: 'Profesor actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Profesor no encontrado' })
  @ApiResponse({ status: 409, description: 'Email o número de empleado ya existe' })
  update(@Param('id') id: string, @Body() updateTeacherDto: UpdateTeacherDto) {
    return this.teachersService.update(id, updateTeacherDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un profesor (soft delete)' })
  @ApiResponse({ status: 204, description: 'Profesor eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Profesor no encontrado' })
  remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }

  @Get('by-user/:userId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener un profesor por ID de usuario' })
  @ApiResponse({ status: 200, description: 'Datos del profesor' })
  @ApiResponse({ status: 404, description: 'Profesor no encontrado' })
  findByUserId(@Param('userId') userId: string) {
    return this.teachersService.findByUserId(userId);
  }

  // IMPORTANT: This parameterized route MUST be the last GET route
  // to avoid conflicts with specific routes like /teachers/todo
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener un profesor por ID' })
  @ApiResponse({ status: 200, description: 'Datos del profesor' })
  @ApiResponse({ status: 404, description: 'Profesor no encontrado' })
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }
}