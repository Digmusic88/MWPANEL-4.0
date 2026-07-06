import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../modules/users/entities/user.entity';

import { GroupPhotosService } from '../services/group-photos.service';
import { FaceDetectionsService } from '../services/face-detections.service';
import { ImageProcessingService } from '../services/image-processing.service';
import { FacialRecognitionService } from '../services/facial-recognition.service';
import { CreateGroupPhotoDto, ProcessFacesDto } from '../dto';
import { ProcessingStatus } from '../entities/group-photo.entity';

@ApiTags('group-photos')
@Controller('group-photos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupPhotosController {
  constructor(
    private readonly groupPhotosService: GroupPhotosService,
    private readonly faceDetectionsService: FaceDetectionsService,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly facialRecognitionService: FacialRecognitionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Subir una nueva foto grupal' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Foto grupal creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o archivo faltante' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createGroupPhotoDto: CreateGroupPhotoDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('El archivo de imagen es requerido');
    }

    // Validar la imagen
    const validation = await this.imageProcessingService.validateImage(file.path);
    if (!validation.isValid) {
      throw new BadRequestException(validation.error);
    }

    // Crear la foto grupal
    const groupPhoto = await this.groupPhotosService.create(
      {
        ...createGroupPhotoDto,
        uploadedById: req.user.id,
        metadata: {
          ...createGroupPhotoDto.metadata,
          ...validation.metadata,
        },
      },
      file,
    );

    return {
      success: true,
      data: groupPhoto,
      message: 'Foto grupal subida exitosamente',
    };
  }

  @Post(':id/process-faces')
  @ApiOperation({ summary: 'Procesar detecciones faciales desde el cliente' })
  @ApiResponse({ status: 200, description: 'Caras procesadas exitosamente' })
  @ApiResponse({ status: 404, description: 'Foto grupal no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async processFaces(
    @Param('id') id: string,
    @Body() processFacesDto: ProcessFacesDto,
    @Request() req: any,
  ) {
    const groupPhoto = await this.groupPhotosService.findOne(id);
    
    // Actualizar estado a procesando
    await this.groupPhotosService.updateProcessingStatus(id, ProcessingStatus.PROCESSING);

    try {
      // Procesar las caras detectadas desde el cliente
      const result = await this.facialRecognitionService.processFacesFromClientDetections(
        groupPhoto.originalUrl.replace('/', ''),
        processFacesDto.faces,
        id,
      );

      // Crear las detecciones en la base de datos
      console.log(`🔍 DEBUG: About to save ${result.faces.length} face detections`);
      result.faces.forEach((face, index) => {
        console.log(`🔍 Face ${index}: thumbnailUrl = "${face.thumbnailUrl}"`);
      });
      
      const faceDetections = await Promise.all(
        result.faces.map(async (face) => {
          return await this.faceDetectionsService.create({
            groupPhotoId: id,
            faceCoordinates: face.coordinates,
            thumbnailUrl: face.thumbnailUrl,
            confidenceScore: face.confidence,
          });
        })
      );

      // Actualizar estado a completado
      await this.groupPhotosService.updateProcessingStatus(id, ProcessingStatus.COMPLETED, result.totalFaces);

      return {
        success: true,
        data: {
          groupPhoto,
          faceDetections,
          statistics: {
            totalFaces: result.totalFaces,
            processedFaces: faceDetections.length,
          },
        },
        message: `${result.totalFaces} caras procesadas exitosamente`,
      };
    } catch (error) {
      // Actualizar estado a fallido
      await this.groupPhotosService.updateProcessingStatus(id, ProcessingStatus.FAILED);
      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Obtener todas las fotos grupales' })
  @ApiResponse({ status: 200, description: 'Lista de fotos grupales' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findAll(@Query('classGroupId') classGroupId?: string) {
    console.log('🔍 [GroupPhotosController] findAll called with classGroupId:', classGroupId);
    let photos;
    
    if (classGroupId) {
      console.log('🔍 [GroupPhotosController] Calling findByClassGroup');
      photos = await this.groupPhotosService.findByClassGroup(classGroupId);
    } else {
      console.log('🔍 [GroupPhotosController] Calling findAll');
      photos = await this.groupPhotosService.findAll();
    }

    console.log('🔍 [GroupPhotosController] Photos returned:', photos?.length || 0);
    return {
      success: true,
      data: photos,
      message: 'Fotos grupales obtenidas exitosamente',
    };
  }

  @Get('my-photos')
  @ApiOperation({ summary: 'Obtener fotos grupales subidas por el usuario actual' })
  @ApiResponse({ status: 200, description: 'Lista de fotos del usuario' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findMyPhotos(@Request() req: any) {
    const photos = await this.groupPhotosService.findByUser(req.user.id);
    
    return {
      success: true,
      data: photos,
      message: 'Fotos del usuario obtenidas exitosamente',
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Obtener estadísticas del sistema de fotos grupales' })
  @ApiResponse({ status: 200, description: 'Estadísticas del sistema' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getStatistics() {
    const [photoStats, faceStats] = await Promise.all([
      this.groupPhotosService.getStatistics(),
      this.faceDetectionsService.getStatistics(),
    ]);

    return {
      success: true,
      data: {
        photos: photoStats,
        faces: faceStats,
      },
      message: 'Estadísticas obtenidas exitosamente',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una foto grupal específica' })
  @ApiResponse({ status: 200, description: 'Foto grupal encontrada' })
  @ApiResponse({ status: 404, description: 'Foto grupal no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findOne(@Param('id') id: string) {
    const groupPhoto = await this.groupPhotosService.findOne(id);
    
    return {
      success: true,
      data: groupPhoto,
      message: 'Foto grupal obtenida exitosamente',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una foto grupal' })
  @ApiResponse({ status: 200, description: 'Foto grupal actualizada' })
  @ApiResponse({ status: 404, description: 'Foto grupal no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async update(
    @Param('id') id: string,
    @Body() updateGroupPhotoDto: any,
    @Request() req: any,
  ) {
    const groupPhoto = await this.groupPhotosService.update(id, updateGroupPhotoDto);
    
    return {
      success: true,
      data: groupPhoto,
      message: 'Foto grupal actualizada exitosamente',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una foto grupal' })
  @ApiResponse({ status: 200, description: 'Foto grupal eliminada' })
  @ApiResponse({ status: 404, description: 'Foto grupal no encontrada' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async remove(@Param('id') id: string, @Request() req: any) {
    // Limpiar thumbnails asociados
    await this.imageProcessingService.cleanupThumbnails(id);
    
    // Eliminar detecciones faciales
    await this.faceDetectionsService.removeByGroupPhoto(id);
    
    // Eliminar la foto grupal
    await this.groupPhotosService.remove(id);
    
    return {
      success: true,
      message: 'Foto grupal eliminada exitosamente',
    };
  }
}