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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { CreateScheduleSessionDto } from './dto/create-schedule-session.dto';
import { UpdateScheduleSessionDto } from './dto/update-schedule-session.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  // ==================== CLASSROOMS ====================

  @Get('classrooms')
  @ApiOperation({ summary: 'Obtener todas las aulas' })
  @ApiResponse({ status: 200, description: 'Lista de aulas obtenida exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAllClassrooms() {
    return this.schedulesService.findAllClassrooms();
  }

  @Post('classrooms')
  @ApiOperation({ summary: 'Crear nueva aula' })
  @ApiResponse({ status: 201, description: 'Aula creada exitosamente' })
  @Roles(UserRole.ADMIN)
  createClassroom(@Body() createClassroomDto: CreateClassroomDto) {
    console.log('🏫 [CONTROLLER] Creating classroom with DTO:', JSON.stringify(createClassroomDto, null, 2));
    console.log('🏫 [CONTROLLER] DTO type details:', {
      name: typeof createClassroomDto.name,
      code: typeof createClassroomDto.code,
      capacity: typeof createClassroomDto.capacity,
      type: typeof createClassroomDto.type,
      typeValue: createClassroomDto.type,
      equipment: typeof createClassroomDto.equipment,
      building: typeof createClassroomDto.building,
      floor: typeof createClassroomDto.floor,
      description: typeof createClassroomDto.description,
      isActive: typeof createClassroomDto.isActive,
      preferredEducationalLevelId: typeof createClassroomDto.preferredEducationalLevelId
    });
    return this.schedulesService.createClassroom(createClassroomDto);
  }

  @Get('classrooms/:id')
  @ApiOperation({ summary: 'Obtener aula por ID' })
  @ApiResponse({ status: 200, description: 'Aula obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findOneClassroom(@Param('id') id: string) {
    return this.schedulesService.findOneClassroom(id);
  }

  @Patch('classrooms/:id')
  @ApiOperation({ summary: 'Actualizar aula' })
  @ApiResponse({ status: 200, description: 'Aula actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  @Roles(UserRole.ADMIN)
  updateClassroom(@Param('id') id: string, @Body() updateClassroomDto: UpdateClassroomDto) {
    return this.schedulesService.updateClassroom(id, updateClassroomDto);
  }

  @Delete('classrooms/:id')
  @ApiOperation({ summary: 'Eliminar aula' })
  @ApiResponse({ status: 200, description: 'Aula eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  @Roles(UserRole.ADMIN)
  removeClassroom(@Param('id') id: string) {
    return this.schedulesService.removeClassroom(id);
  }

  // ==================== TIME SLOTS ====================

  @Get('time-slots')
  @ApiOperation({ summary: 'Obtener todas las franjas horarias' })
  @ApiResponse({ status: 200, description: 'Lista de franjas horarias obtenida exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAllTimeSlots() {
    return this.schedulesService.findAllTimeSlots();
  }

  @Get('time-slots/by-educational-level/:educationalLevelId')
  @ApiOperation({ summary: 'Obtener franjas horarias por nivel educativo' })
  @ApiResponse({ status: 200, description: 'Franjas horarias del nivel educativo obtenidas exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findTimeSlotsByEducationalLevel(@Param('educationalLevelId') educationalLevelId: string) {
    return this.schedulesService.findTimeSlotsByEducationalLevel(educationalLevelId);
  }

  @Post('time-slots')
  @ApiOperation({ summary: 'Crear nueva franja horaria' })
  @ApiResponse({ status: 201, description: 'Franja horaria creada exitosamente' })
  @Roles(UserRole.ADMIN)
  createTimeSlot(@Body() createTimeSlotDto: CreateTimeSlotDto) {
    return this.schedulesService.createTimeSlot(createTimeSlotDto);
  }

  @Get('time-slots/:id')
  @ApiOperation({ summary: 'Obtener franja horaria por ID' })
  @ApiResponse({ status: 200, description: 'Franja horaria obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Franja horaria no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findOneTimeSlot(@Param('id') id: string) {
    return this.schedulesService.findOneTimeSlot(id);
  }

  @Patch('time-slots/:id')
  @ApiOperation({ summary: 'Actualizar franja horaria' })
  @ApiResponse({ status: 200, description: 'Franja horaria actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Franja horaria no encontrada' })
  @Roles(UserRole.ADMIN)
  updateTimeSlot(@Param('id') id: string, @Body() updateTimeSlotDto: UpdateTimeSlotDto) {
    return this.schedulesService.updateTimeSlot(id, updateTimeSlotDto);
  }

  @Delete('time-slots/:id')
  @ApiOperation({ summary: 'Eliminar franja horaria' })
  @ApiResponse({ status: 200, description: 'Franja horaria eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Franja horaria no encontrada' })
  @Roles(UserRole.ADMIN)
  removeTimeSlot(@Param('id') id: string) {
    return this.schedulesService.removeTimeSlot(id);
  }

  // ==================== SCHEDULE SESSIONS ====================

  @Get('sessions')
  @ApiOperation({ summary: 'Obtener todas las sesiones de horario' })
  @ApiResponse({ status: 200, description: 'Lista de sesiones de horario obtenida exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAllScheduleSessions() {
    return this.schedulesService.findAllScheduleSessions();
  }

  @Get('sessions/by-teacher/:teacherId')
  @ApiOperation({ summary: 'Obtener horario por profesor' })
  @ApiResponse({ status: 200, description: 'Horario del profesor obtenido exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findScheduleSessionsByTeacher(@Param('teacherId') teacherId: string) {
    return this.schedulesService.findScheduleSessionsByTeacher(teacherId);
  }

  @Get('sessions/by-class-group/:classGroupId')
  @ApiOperation({ summary: 'Obtener horario por grupo de clase' })
  @ApiResponse({ status: 200, description: 'Horario del grupo obtenido exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  findScheduleSessionsByClassGroup(@Param('classGroupId') classGroupId: string) {
    return this.schedulesService.findScheduleSessionsByClassGroup(classGroupId);
  }

  @Get('sessions/by-classroom/:classroomId')
  @ApiOperation({ summary: 'Obtener horario por aula' })
  @ApiResponse({ status: 200, description: 'Horario del aula obtenido exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findScheduleSessionsByClassroom(@Param('classroomId') classroomId: string) {
    return this.schedulesService.findScheduleSessionsByClassroom(classroomId);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Crear nueva sesión de horario' })
  @ApiResponse({ status: 201, description: 'Sesión de horario creada exitosamente' })
  @Roles(UserRole.ADMIN)
  createScheduleSession(@Body() createScheduleSessionDto: CreateScheduleSessionDto) {
    return this.schedulesService.createScheduleSession(createScheduleSessionDto);
  }

  @Patch('sessions/:id')
  @ApiOperation({ summary: 'Actualizar sesión de horario' })
  @ApiResponse({ status: 200, description: 'Sesión de horario actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Sesión de horario no encontrada' })
  @Roles(UserRole.ADMIN)
  updateScheduleSession(@Param('id') id: string, @Body() updateScheduleSessionDto: UpdateScheduleSessionDto) {
    return this.schedulesService.updateScheduleSession(id, updateScheduleSessionDto);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Eliminar sesión de horario' })
  @ApiResponse({ status: 200, description: 'Sesión de horario eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Sesión de horario no encontrada' })
  @Roles(UserRole.ADMIN)
  removeScheduleSession(@Param('id') id: string) {
    return this.schedulesService.removeScheduleSession(id);
  }

  // ==================== TEACHER SPECIFIC ENDPOINTS ====================

  @Get('teacher/current')
  @ApiOperation({ summary: 'Obtener horario del profesor actual' })
  @ApiResponse({ status: 200, description: 'Horario del profesor obtenido exitosamente' })
  @Roles(UserRole.TEACHER)
  findCurrentTeacherSchedule(@Request() request: any) {
    return this.schedulesService.findScheduleSessionsByTeacher(request.user?.id);
  }

  // ==================== STUDENT SPECIFIC ENDPOINTS ====================

  @Get('student/current')
  @ApiOperation({ summary: 'Obtener horario del estudiante actual' })
  @ApiResponse({ status: 200, description: 'Horario del estudiante obtenido exitosamente' })
  @Roles(UserRole.STUDENT)
  findCurrentStudentSchedule(@Request() request: any) {
    return this.schedulesService.findScheduleSessionsForStudent(request.user?.id);
  }
}