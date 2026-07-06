import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { UserRole } from '../../../modules/users/entities/user.entity';

import { FaceDetectionsService } from '../services/face-detections.service';
import { StudentsService } from '../../students/students.service';
import { AssignFaceDto, CreateFaceDetectionDto } from '../dto';

@ApiTags('face-detections')
@Controller('face-detections')
export class FaceDetectionsController {
  constructor(
    private readonly faceDetectionsService: FaceDetectionsService,
    private readonly studentsService: StudentsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Crear una nueva detección facial' })
  @ApiResponse({ status: 201, description: 'Detección facial creada exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async create(@Body() createFaceDetectionDto: CreateFaceDetectionDto) {
    const faceDetection = await this.faceDetectionsService.create(createFaceDetectionDto);
    
    return {
      success: true,
      data: faceDetection,
      message: 'Detección facial creada exitosamente',
    };
  }


  @Get('search-students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Buscar estudiantes para autocompletado' })
  @ApiResponse({ status: 200, description: 'Lista de estudiantes encontrados' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async searchStudents(@Query('search') search: string) {
    console.log('🔍 [FaceDetections] Endpoint search-students llamado con:', search);
    
    if (!search || search.length < 2) {
      console.log('🔍 [FaceDetections] Búsqueda muy corta, retornando array vacío');
      return {
        success: true,
        data: [],
        message: 'Búsqueda requiere al menos 2 caracteres',
      };
    }

    try {
      // Usar el servicio real de estudiantes para búsqueda completa
      console.log('🔍 [FaceDetections] Llamando a studentsService.searchByName con:', search);
      const students = await this.studentsService.searchByName(search);
      console.log('🔍 [FaceDetections] StudentsService retornó:', students.length, 'estudiantes');
      
      // Formatear datos para el frontend (incluir TODOS los estudiantes, con y sin foto)
      const formattedStudents = students.map(student => {
        const firstName = student.user?.profile?.firstName || '';
        const lastName = student.user?.profile?.lastName || '';
        let fullName = `${firstName} ${lastName}`.trim();
        
        // Si no hay nombre real, usar el número de matrícula como nombre de fallback
        if (!fullName) {
          fullName = `Estudiante ${student.enrollmentNumber}`;
        }

        return {
          id: student.id,
          name: fullName,
          enrollmentNumber: student.enrollmentNumber,
          educationalLevel: student.educationalLevel?.name || 'Sin nivel',
          course: student.course?.name || 'Sin curso',
          photoUrl: student.user?.profile?.avatarUrl || null, // Incluir foto si existe
        };
      });
      
      console.log('🔍 [FaceDetections] Estudiantes encontrados:', formattedStudents.length);
      console.log('🔍 [FaceDetections] Ejemplos de estudiantes:', formattedStudents.slice(0, 3).map(s => ({
        name: s.name,
        enrollmentNumber: s.enrollmentNumber,
        hasPhoto: !!s.photoUrl
      })));
      
      return {
        success: true,
        data: formattedStudents,
        message: `${formattedStudents.length} estudiantes encontrados`,
      };
    } catch (error) {
      console.error('🔍 [FaceDetections] Error en searchStudents:', error);
      return {
        success: false,
        data: [],
        message: `Error en búsqueda: ${error.message}`,
      };
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Obtener todas las detecciones faciales' })
  @ApiResponse({ status: 200, description: 'Lista de detecciones faciales' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findAll(
    @Query('groupPhotoId') groupPhotoId?: string,
    @Query('studentId') studentId?: string,
    @Query('unassigned') unassigned?: string,
  ) {
    let faceDetections;

    console.error('🔍 [Controller] FaceDetections findAll called');
    console.error('🔍 [Controller] Query params:', { groupPhotoId, studentId, unassigned });

    if (groupPhotoId) {
      console.error('🔍 [Controller] Calling findByGroupPhoto with:', groupPhotoId);
      faceDetections = await this.faceDetectionsService.findByGroupPhoto(groupPhotoId);
    } else if (studentId) {
      faceDetections = await this.faceDetectionsService.findByStudent(studentId);
    } else if (unassigned === 'true') {
      faceDetections = await this.faceDetectionsService.findUnassigned();
    } else {
      faceDetections = await this.faceDetectionsService.findAll();
    }

    return {
      success: true,
      data: faceDetections,
      message: 'Detecciones faciales obtenidas exitosamente',
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Obtener una detección facial específica' })
  @ApiResponse({ status: 200, description: 'Detección facial encontrada' })
  @ApiResponse({ status: 404, description: 'Detección facial no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findOne(@Param('id') id: string) {
    const faceDetection = await this.faceDetectionsService.findOne(id);
    
    return {
      success: true,
      data: faceDetection,
      message: 'Detección facial obtenida exitosamente',
    };
  }

  @Post(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Asignar una cara a un estudiante' })
  @ApiResponse({ status: 200, description: 'Cara asignada exitosamente' })
  @ApiResponse({ status: 400, description: 'Cara ya asignada o datos inválidos' })
  @ApiResponse({ status: 404, description: 'Detección facial no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async assign(
    @Param('id') id: string,
    @Body() assignFaceDto: AssignFaceDto,
    @Request() req: any,
  ) {
    const faceDetection = await this.faceDetectionsService.assignToStudent(id, {
      ...assignFaceDto,
      assignedById: req.user.id,
    });

    // Actualizar la foto de perfil del estudiante si no tiene una
    try {
      const student = await this.studentsService.findOne(assignFaceDto.studentId);
      if (!student.user?.profile?.avatarUrl && faceDetection.thumbnailUrl) {
        // Update the student's avatar through the user profile
        await this.studentsService.updatePhoto(
          assignFaceDto.studentId,
          faceDetection.thumbnailUrl,
        );
        console.log(`✅ Updated student ${assignFaceDto.studentId} photo from facial recognition thumbnail`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not update student photo: ${error.message}`);
      // Don't fail the face assignment if photo update fails
    }

    return {
      success: true,
      data: faceDetection,
      message: 'Cara asignada exitosamente al estudiante',
    };
  }

  @Post(':id/unassign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Desasignar una cara de un estudiante' })
  @ApiResponse({ status: 200, description: 'Cara desasignada exitosamente' })
  @ApiResponse({ status: 400, description: 'Cara no está asignada' })
  @ApiResponse({ status: 404, description: 'Detección facial no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async unassign(@Param('id') id: string, @Request() req: any) {
    const faceDetection = await this.faceDetectionsService.unassignFromStudent(id, req.user.id);
    
    return {
      success: true,
      data: faceDetection,
      message: 'Cara desasignada exitosamente',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Eliminar una detección facial' })
  @ApiResponse({ status: 200, description: 'Detección facial eliminada' })
  @ApiResponse({ status: 404, description: 'Detección facial no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async remove(@Param('id') id: string) {
    await this.faceDetectionsService.remove(id);
    
    return {
      success: true,
      message: 'Detección facial eliminada exitosamente',
    };
  }
}