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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ClassGroupsService } from './class-groups.service';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { UpdateClassGroupDto } from './dto/update-class-group.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Grupos de Clase')
@Controller('class-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClassGroupsController {
  constructor(private readonly classGroupsService: ClassGroupsService) {}

  @Get('my-classes')
  @ApiOperation({ summary: 'Obtener grupos de clase del profesor actual' })
  @ApiResponse({ status: 200, description: 'Lista de grupos de clase del profesor' })
  @Roles(UserRole.TEACHER)
  async findMyClasses(@Request() req: any) {
    const userId = req.user.sub;
    return this.classGroupsService.findTeacherClassesByUserId(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los grupos de clase' })
  @ApiQuery({ name: 'academicYearId', required: false, description: 'Filtrar por año académico' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filtrar por curso' })
  @ApiQuery({ name: 'tutorId', required: false, description: 'Filtrar por tutor' })
  @ApiResponse({ status: 200, description: 'Lista de grupos de clase obtenida exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async findAll(
    @Query('academicYearId') academicYearId?: string,
    @Query('courseId') courseId?: string,
    @Query('tutorId') tutorId?: string,
  ) {
    if (academicYearId) {
      return this.classGroupsService.findByAcademicYear(academicYearId);
    }
    if (courseId) {
      return this.classGroupsService.findByCourse(courseId);
    }
    if (tutorId) {
      return this.classGroupsService.findByTutor(tutorId);
    }
    return this.classGroupsService.findAll();
  }

  @Get('available-students')
  @ApiOperation({ summary: 'Obtener estudiantes disponibles para asignar' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filtrar por curso' })
  @ApiResponse({ status: 200, description: 'Lista de estudiantes disponibles' })
  @Roles(UserRole.ADMIN)
  async getAvailableStudents(@Query('courseId') courseId?: string) {
    return this.classGroupsService.getAvailableStudents(courseId);
  }

  @Get('available-teachers')
  @ApiOperation({ summary: 'Obtener profesores disponibles para asignar como tutores' })
  @ApiResponse({ status: 200, description: 'Lista de profesores disponibles' })
  @Roles(UserRole.ADMIN)
  async getAvailableTeachers() {
    return this.classGroupsService.getAvailableTeachers();
  }

  @Get('available-courses')
  @ApiOperation({ summary: 'Obtener cursos disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de cursos disponibles' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getAvailableCourses() {
    return this.classGroupsService.getAvailableCourses();
  }

  @Get('teacher/my-groups')
  @ApiOperation({ summary: 'Obtener grupos de clase del profesor autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de grupos del profesor' })
  @Roles(UserRole.TEACHER)
  async getMyGroups(@Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      return [];
    }
    return this.classGroupsService.findByTeacherUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un grupo de clase por ID' })
  @ApiResponse({ status: 200, description: 'Grupo de clase encontrado' })
  @ApiResponse({ status: 404, description: 'Grupo de clase no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findOne(@Param('id') id: string) {
    return this.classGroupsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo grupo de clase' })
  @ApiResponse({ status: 201, description: 'Grupo de clase creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 409, description: 'Grupo de clase ya existe' })
  @Roles(UserRole.ADMIN)
  async create(@Body() createClassGroupDto: CreateClassGroupDto) {
    return this.classGroupsService.create(createClassGroupDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un grupo de clase' })
  @ApiResponse({ status: 200, description: 'Grupo de clase actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo de clase no encontrado' })
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateClassGroupDto: UpdateClassGroupDto) {
    return this.classGroupsService.update(id, updateClassGroupDto);
  }

  @Post(':id/students')
  @ApiOperation({ summary: 'Asignar estudiantes a un grupo de clase' })
  @ApiResponse({ status: 200, description: 'Estudiantes asignados exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo de clase o estudiantes no encontrados' })
  @Roles(UserRole.ADMIN)
  async assignStudents(
    @Param('id') id: string,
    @Body() assignStudentsDto: AssignStudentsDto,
  ) {
    return this.classGroupsService.assignStudents(id, assignStudentsDto);
  }

  @Delete(':id/students/:studentId')
  @ApiOperation({ summary: 'Remover un estudiante de un grupo de clase' })
  @ApiResponse({ status: 200, description: 'Estudiante removido exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo de clase no encontrado' })
  @Roles(UserRole.ADMIN)
  async removeStudent(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.classGroupsService.removeStudent(id, studentId);
  }

  @Post(':id/tutor/:tutorId')
  @ApiOperation({ summary: 'Asignar tutor a un grupo de clase' })
  @ApiResponse({ status: 200, description: 'Tutor asignado exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo de clase o profesor no encontrado' })
  @Roles(UserRole.ADMIN)
  async assignTutor(@Param('id') id: string, @Param('tutorId') tutorId: string) {
    return this.classGroupsService.assignTutor(id, tutorId);
  }

  @Delete(':id/tutor')
  @ApiOperation({ summary: 'Remover tutor de un grupo de clase' })
  @ApiResponse({ status: 200, description: 'Tutor removido exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo de clase no encontrado' })
  @Roles(UserRole.ADMIN)
  async removeTutor(@Param('id') id: string) {
    return this.classGroupsService.removeTutor(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un grupo de clase' })
  @ApiResponse({ status: 200, description: 'Grupo de clase eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Grupo de clase no encontrado' })
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.classGroupsService.remove(id);
  }
}