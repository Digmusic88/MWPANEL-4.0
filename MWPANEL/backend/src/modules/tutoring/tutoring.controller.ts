import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  ForbiddenException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { TutoringService } from './tutoring.service';
import {
  CreateTutoringGroupDto,
  UpdateTutoringGroupDto,
  AssignStudentsDto,
  RemoveStudentsDto
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FamilyAccessService } from '../../common/family-access/family-access.service';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Tutorías')
@Controller('tutoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TutoringController {
  constructor(
    private readonly tutoringService: TutoringService,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  /**
   * RGPD: una familia solo puede consultar/contactar al tutor de un alumno del que es
   * tutora (contacto primario/secundario). Evita el IDOR de enumerar studentIds ajenos.
   * ADMIN pasa sin restricción.
   */
  private async assertFamilyStudentAccess(user: any, studentId: string): Promise<void> {
    if (user?.role === UserRole.FAMILY) {
      const ok = await this.familyAccess.canFamilyAccessStudent(user.id, studentId);
      if (!ok) throw new ForbiddenException('No tienes acceso a este alumno');
    }
  }

  @Post('groups')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear grupo de tutoría' })
  @ApiResponse({ status: 201, description: 'Grupo de tutoría creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Tutor no encontrado' })
  create(@Body() createTutoringGroupDto: CreateTutoringGroupDto) {
    return this.tutoringService.create(createTutoringGroupDto);
  }

  @Get('groups')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener todos los grupos de tutoría' })
  @ApiResponse({ status: 200, description: 'Lista de grupos de tutoría' })
  findAll() {
    return this.tutoringService.findAll();
  }

  @Get('groups/tutor/:tutorId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener grupos de tutoría de un tutor específico' })
  @ApiResponse({ status: 200, description: 'Lista de grupos de tutoría del tutor' })
  findByTutor(@Param('tutorId') tutorId: string) {
    return this.tutoringService.findByTutor(tutorId);
  }

  @Get('groups/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener grupo de tutoría por ID' })
  @ApiResponse({ status: 200, description: 'Datos del grupo de tutoría' })
  @ApiResponse({ status: 404, description: 'Grupo de tutoría no encontrado' })
  findOne(@Param('id') id: string) {
    return this.tutoringService.findOne(id);
  }

  @Patch('groups/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar grupo de tutoría' })
  @ApiResponse({ status: 200, description: 'Grupo de tutoría actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo de tutoría no encontrado' })
  update(@Param('id') id: string, @Body() updateTutoringGroupDto: UpdateTutoringGroupDto) {
    return this.tutoringService.update(id, updateTutoringGroupDto);
  }

  @Delete('groups/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar grupo de tutoría (soft delete)' })
  @ApiResponse({ status: 200, description: 'Grupo de tutoría eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo de tutoría no encontrado' })
  remove(@Param('id') id: string) {
    return this.tutoringService.remove(id);
  }

  @Post('groups/:id/students')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Asignar estudiantes a un grupo de tutoría' })
  @ApiResponse({ status: 200, description: 'Estudiantes asignados exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo de tutoría o estudiantes no encontrados' })
  @ApiResponse({ status: 409, description: 'Algunos estudiantes ya están asignados' })
  assignStudents(@Param('id') id: string, @Body() assignStudentsDto: AssignStudentsDto) {
    return this.tutoringService.assignStudents(id, assignStudentsDto);
  }

  @Delete('groups/:id/students')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Remover estudiantes de un grupo de tutoría' })
  @ApiResponse({ status: 200, description: 'Estudiantes removidos exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo de tutoría no encontrado' })
  removeStudents(@Param('id') id: string, @Body() removeStudentsDto: RemoveStudentsDto) {
    return this.tutoringService.removeStudents(id, removeStudentsDto);
  }

  @Get('students/available')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener estudiantes disponibles para asignar a tutoría' })
  @ApiResponse({ status: 200, description: 'Lista de estudiantes disponibles' })
  getAvailableStudents(@Query('groupId') groupId?: string) {
    return this.tutoringService.getAvailableStudents(groupId);
  }

  @Get('groups/:id/students')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener estudiantes de un grupo de tutoría' })
  @ApiResponse({ status: 200, description: 'Lista de estudiantes del grupo' })
  getStudentsByGroup(@Param('id') id: string) {
    return this.tutoringService.getStudentsByTutoringGroup(id);
  }

  @Post('contact-tutor')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Contactar con el tutor de un estudiante' })
  @ApiResponse({ status: 201, description: 'Conversación creada exitosamente' })
  @ApiResponse({ status: 404, description: 'Estudiante o tutor no encontrado' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        studentId: { type: 'string', description: 'ID del estudiante' },
        initialMessage: { type: 'string', description: 'Mensaje inicial de la conversación' }
      },
      required: ['studentId', 'initialMessage']
    }
  })
  async contactTutor(
    @Request() req: any,
    @Body() body: { studentId: string; initialMessage: string }
  ) {
    await this.assertFamilyStudentAccess(req.user, body.studentId);
    return await this.tutoringService.contactTutor(req.user.id, body.studentId, body.initialMessage);
  }

  @Get('student/:studentId/tutor')
  @Roles(UserRole.FAMILY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener información del tutor de un estudiante' })
  @ApiResponse({ status: 200, description: 'Información del tutor' })
  @ApiResponse({ status: 404, description: 'Estudiante no tiene tutor asignado' })
  async getStudentTutor(@Request() req: any, @Param('studentId') studentId: string) {
    await this.assertFamilyStudentAccess(req.user, studentId);
    return await this.tutoringService.getStudentTutor(studentId);
  }
}