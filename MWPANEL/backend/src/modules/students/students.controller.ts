import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Res, Query, HttpCode, HttpStatus, Logger, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CredentialsPDFService } from '../users/services/credentials-pdf.service';
import { RecentActivityService } from './services/recent-activity.service';
import { RecentActivityItemDto } from './dto/recent-activity.dto';
import { SecretariaFichaService } from './secretaria-ficha/secretaria-ficha.service';

// Interfaces for student notifications
export interface StudentNotification {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  isViewed: boolean;
  createdAt: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  subject?: {
    name: string;
    code: string;
  };
  metadata?: any;
}

export interface StudentNotificationSummary {
  totalNotifications: number;
  unviewedNotifications: number;
  criticalNotifications: number;
  notificationsByType: Record<string, number>;
  notifications: StudentNotification[];
}

@ApiTags('Estudiantes')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  private readonly logger = new Logger(StudentsController.name);
  // Simple in-memory storage for demo viewed states
  private viewedNotifications = new Set<string>();

  constructor(
    private readonly studentsService: StudentsService,
    private readonly credentialsPDFService: CredentialsPDFService,
    private readonly recentActivityService: RecentActivityService,
    private readonly secretariaFichaService: SecretariaFichaService,
  ) {}

  @Get(':id/secretaria-ficha')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ficha del alumno gestionada en Secretaría (solo lectura)' })
  async getSecretariaFicha(@Param('id') id: string, @Res() res: Response) {
    const result = await this.secretariaFichaService.fetchFicha(id);
    if (result.kind === 'none') return res.status(HttpStatus.NO_CONTENT).send();
    if (result.kind === 'error') return res.status(HttpStatus.BAD_GATEWAY).json({ message: result.message });
    return res.status(HttpStatus.OK).json(result.ficha);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los estudiantes (solo administración)' })
  @ApiResponse({ status: 200, description: 'Lista de estudiantes' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    const includeInactiveBool = includeInactive === 'true';
    return this.studentsService.findAll(includeInactiveBool);
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener mi perfil de estudiante' })
  @ApiResponse({ status: 200, description: 'Datos del estudiante actual' })
  getMyProfile(@Request() req: any) {
    return this.studentsService.findByUserId(req.user.id);
  }

  @Get('me/statistics')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Obtener mis estadísticas académicas' })
  @ApiResponse({ status: 200, description: 'Estadísticas del estudiante actual' })
  getMyStatistics(@Request() req: any) {
    return this.studentsService.getStudentStatistics(req.user.id);
  }

  @Get('my-students')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estudiantes asignados al profesor actual' })
  @ApiResponse({ status: 200, description: 'Lista de estudiantes del profesor' })
  getMyStudents(@Request() req: any) {
    // Alumnos accesibles: grupos donde es tutor + grupos donde imparte asignatura
    return this.studentsService.findAccessibleStudentsByUserId(req.user.userId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nuevo estudiante' })
  @ApiResponse({ status: 201, description: 'Estudiante creado exitosamente' })
  create(@Body() createStudentDto: any) {
    return this.studentsService.create(createStudentDto);
  }

  @Patch('me/password')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Cambiar mi contraseña' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada exitosamente' })
  changeMyPassword(@Request() req: any, @Body() changePasswordDto: any) {
    return this.studentsService.changePassword(req.user.id, changePasswordDto);
  }

  // Test endpoint to verify controller is working
  @Post('test-endpoint')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Endpoint de prueba' })
  testEndpoint(@Body() testDto: any) {
    console.log('🚨🚨🚨 [TEST ENDPOINT] WORKING! Data:', testDto);
    return { success: true, message: 'Controller is working!', data: testDto };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualizar estudiante' })
  @ApiResponse({ status: 200, description: 'Estudiante actualizado exitosamente' })
  update(@Param('id') id: string, @Body() updateStudentDto: any, @Request() req: any) {
    console.log('🚨🚨🚨 [CONTROLLER] ===== PATCH REQUEST RECEIVED =====');
    console.log('🚨 [CONTROLLER] Update student called with ID:', id);
    console.log('🚨 [CONTROLLER] User:', req.user?.email || 'NO_USER');
    console.log('🚨 [CONTROLLER] Request body:', JSON.stringify(updateStudentDto, null, 2));
    console.log('🚨 [CONTROLLER] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🚨🚨🚨 [CONTROLLER] ========================================');
    
    try {
      const result = this.studentsService.update(id, updateStudentDto);
      console.log('🚨 [CONTROLLER] Service call successful');
      return result;
    } catch (error) {
      console.log('🚨 [CONTROLLER] Service call failed:', error);
      throw error;
    }
  }

  @Delete(':id/photo')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar foto de perfil del estudiante' })
  @ApiResponse({ status: 200, description: 'Foto de perfil eliminada exitosamente' })
  async removePhoto(@Param('id') id: string) {
    await this.studentsService.removePhoto(id);
    return {
      success: true,
      message: 'Foto de perfil eliminada exitosamente'
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar estudiante' })
  @ApiResponse({ status: 200, description: 'Estudiante eliminado exitosamente' })
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar estudiante y sus familias' })
  @ApiResponse({ status: 200, description: 'Estudiante y familias desactivados exitosamente' })
  async deactivateStudentAndFamilies(@Param('id') id: string) {
    const result = await this.studentsService.deactivateStudentAndFamilies(id);
    return {
      success: true,
      message: `Estudiante desactivado exitosamente. ${result.deactivatedFamilies} familias desactivadas (${result.deactivatedFamilyContacts} contactos).`,
      data: {
        studentId: result.student.id,
        studentName: `${result.student.user.profile.firstName} ${result.student.user.profile.lastName}`,
        deactivatedFamilies: result.deactivatedFamilies,
        deactivatedFamilyContacts: result.deactivatedFamilyContacts
      }
    };
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reactivar estudiante y sus familias' })
  @ApiResponse({ status: 200, description: 'Estudiante y familias reactivados exitosamente' })
  async reactivateStudentAndFamilies(@Param('id') id: string) {
    const result = await this.studentsService.reactivateStudentAndFamilies(id);
    return {
      success: true,
      message: `Estudiante reactivado exitosamente. ${result.reactivatedFamilies} familias reactivadas (${result.reactivatedFamilyContacts} contactos).`,
      data: {
        studentId: result.student.id,
        studentName: `${result.student.user.profile.firstName} ${result.student.user.profile.lastName}`,
        reactivatedFamilies: result.reactivatedFamilies,
        reactivatedFamilyContacts: result.reactivatedFamilyContacts
      }
    };
  }

  @Get('credentials/download')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Generar y descargar PDF con credenciales de estudiantes' })
  @ApiResponse({ 
    status: 200, 
    description: 'PDF con credenciales generado exitosamente',
    headers: {
      'Content-Type': { description: 'application/pdf' },
      'Content-Disposition': { description: 'attachment; filename="credenciales_estudiantes.pdf"' }
    }
  })
  async downloadStudentsCredentials(
    @Res() res: Response,
    @Query('includeInactive') includeInactive?: string
  ) {
    try {
      const includeInactiveUsers = includeInactive === 'true';
      
      const result = await this.credentialsPDFService.generateCredentialsPDF({
        role: UserRole.STUDENT,
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
      console.error('Error generating students credentials PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          message: 'Error al generar PDF de credenciales',
          error: error.message 
        });
      }
    }
  }

  // Endpoint para actividad reciente real del sistema
  @Get('admin/recent-activity')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener actividad reciente real del sistema' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de actividades recientes reales',
    type: [RecentActivityItemDto]
  })
  async getRecentActivity(@Query('limit') limit?: string): Promise<RecentActivityItemDto[]> {
    const limitNumber = limit ? parseInt(limit, 10) : 20;
    return this.recentActivityService.getRecentActivity(limitNumber);
  }

  // ===== STUDENT NOTIFICATIONS ENDPOINTS ===== (MUST BE BEFORE :id ROUTE)
  
  @Get('notifications')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Obtener notificaciones del estudiante',
    description: 'Devuelve todas las notificaciones pendientes para el estudiante'
  })
  @ApiResponse({
    status: 200,
    description: 'Notificaciones obtenidas exitosamente',
  })
  async getStudentNotifications(
    @Request() req,
    @Query('includeViewed') includeViewed: string = 'false',
    @Query('limit') limit: string = '20',
  ): Promise<StudentNotificationSummary> {
    try {
      this.logger.log(`📨 Getting notifications for student (user: ${req.user.sub})`);
      this.logger.log(`📊 Current viewed set size: ${this.viewedNotifications.size}`);
      this.logger.log(`📝 Current viewed notifications: ${Array.from(this.viewedNotifications).join(', ')}`);

      // No demo notifications - return empty array for production use
      const demoNotifications: StudentNotification[] = [];

      // Calculate summary
      const unviewedNotifications = demoNotifications.filter(n => !n.isViewed).length;
      const criticalNotifications = demoNotifications.filter(n => n.priority === 'critical').length;
      
      const notificationsByType = demoNotifications.reduce((acc, notification) => {
        acc[notification.type] = (acc[notification.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const result: StudentNotificationSummary = {
        totalNotifications: demoNotifications.length,
        unviewedNotifications,
        criticalNotifications,
        notificationsByType,
        notifications: demoNotifications,
      };

      this.logger.log(`📤 Returning ${result.totalNotifications} demo notifications for student`);
      this.logger.log(`📊 Summary: total=${result.totalNotifications}, unviewed=${result.unviewedNotifications}, critical=${result.criticalNotifications}`);
      this.logger.log(`📋 Notifications viewed status: ${demoNotifications.map(n => `${n.id}:${n.isViewed}`).join(', ')}`);
      return result;

    } catch (error) {
      this.logger.error('Error getting student notifications:', error);
      throw error;
    }
  }

  @Post('notifications/:id/view')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Marcar notificación como vista',
    description: 'Marca una notificación específica como vista'
  })
  async markStudentNotificationAsViewed(
    @Request() req,
    @Param('id') notificationId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🔔 STUDENT NOTIFICATION: Received mark as viewed request`);
      this.logger.log(`📋 Details: notificationId=${notificationId}, userId=${req.user.sub}`);
      this.logger.log(`📊 Current viewed set size before: ${this.viewedNotifications.size}`);
      this.logger.log(`📝 Current viewed notifications: ${Array.from(this.viewedNotifications).join(', ')}`);
      
      // Add notification to viewed set
      this.viewedNotifications.add(notificationId);
      
      this.logger.log(`✅ Successfully added ${notificationId} to viewed set`);
      this.logger.log(`📊 Current viewed set size after: ${this.viewedNotifications.size}`);
      this.logger.log(`📝 Updated viewed notifications: ${Array.from(this.viewedNotifications).join(', ')}`);
      
      return {
        success: true,
        message: 'Notificación marcada como vista',
      };
    } catch (error) {
      this.logger.error('❌ Error marking notification as viewed:', error);
      throw error;
    }
  }

  @Post('notifications/view-all')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Marcar todas las notificaciones como vistas',
    description: 'Marca todas las notificaciones del estudiante como vistas'
  })
  async markAllStudentNotificationsAsViewed(
    @Request() req,
  ): Promise<{ success: boolean; message: string; updated: number }> {
    try {
      // No demo notifications to mark as viewed - just return success
      this.logger.log(`Marking all notifications as viewed for user ${req.user.sub} - no notifications to mark`);
      
      return {
        success: true,
        message: 'Todas las notificaciones marcadas como vistas',
        updated: 0,
      };
    } catch (error) {
      this.logger.error('Error marking all notifications as viewed:', error);
      throw error;
    }
  }

  // ===== PARAMETERIZED ROUTES (MUST BE LAST) =====
  
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener estudiante por ID' })
  @ApiResponse({ status: 200, description: 'Datos del estudiante' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    // RGPD: un profesor solo puede acceder a alumnos de sus grupos (tutoría o asignatura)
    if (req.user?.role === UserRole.TEACHER) {
      const allowed = await this.studentsService.canTeacherAccessStudent(req.user.userId, id);
      if (!allowed) {
        throw new ForbiddenException('No tienes acceso a este alumno');
      }
    }
    return this.studentsService.findOne(id);
  }
}