import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { LogbookTagsService } from '../services/logbook-tags.service';
import {
  CreateLogbookTagDto,
  UpdateLogbookTagDto,
  LogbookTagResponseDto,
  TagUsageStatsDto,
  PopularColorDto,
} from '../dto/logbook-tag.dto';

@ApiTags('Logbook Tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
@Controller('logbook/tags')
export class LogbookTagsController {
  constructor(private readonly tagsService: LogbookTagsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva etiqueta de bitácora' })
  @ApiBody({ type: CreateLogbookTagDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Etiqueta creada exitosamente',
    type: LogbookTagResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Ya existe una etiqueta con ese nombre',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para crear etiquetas',
  })
  async createTag(
    @CurrentUser() user: any,
    @Body() createTagDto: CreateLogbookTagDto,
  ): Promise<LogbookTagResponseDto> {
    try {
      const tag = await this.tagsService.createTag(user.id, createTagDto);
      return {
        id: tag.id,
        ownerUserId: tag.ownerUserId,
        name: tag.name,
        colorHex: tag.colorHex,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las etiquetas del usuario actual' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de etiquetas del usuario',
    type: [LogbookTagResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para ver etiquetas',
  })
  async getTags(@CurrentUser() user: any): Promise<LogbookTagResponseDto[]> {
    try {
      const tags = await this.tagsService.getTagsByUser(user.id);
      return tags.map(tag => ({
        id: tag.id,
        ownerUserId: tag.ownerUserId,
        name: tag.name,
        colorHex: tag.colorHex,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      }));
    } catch (error) {
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener etiqueta específica por ID' })
  @ApiParam({ name: 'id', description: 'ID de la etiqueta', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detalles de la etiqueta',
    type: LogbookTagResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Etiqueta no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para acceder a esta etiqueta',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async getTag(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<LogbookTagResponseDto> {
    try {
      const tag = await this.tagsService.getTagById(id, user.id);
      return {
        id: tag.id,
        ownerUserId: tag.ownerUserId,
        name: tag.name,
        colorHex: tag.colorHex,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar etiqueta existente' })
  @ApiParam({ name: 'id', description: 'ID de la etiqueta', format: 'uuid' })
  @ApiBody({ type: UpdateLogbookTagDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Etiqueta actualizada exitosamente',
    type: LogbookTagResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Etiqueta no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Ya existe una etiqueta con ese nombre',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para modificar esta etiqueta',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async updateTag(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateTagDto: UpdateLogbookTagDto,
  ): Promise<LogbookTagResponseDto> {
    try {
      const tag = await this.tagsService.updateTag(id, user.id, updateTagDto);
      return {
        id: tag.id,
        ownerUserId: tag.ownerUserId,
        name: tag.name,
        colorHex: tag.colorHex,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar etiqueta' })
  @ApiParam({ name: 'id', description: 'ID de la etiqueta', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Etiqueta eliminada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Etiqueta no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'No se puede eliminar la etiqueta porque tiene entradas asociadas',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para eliminar esta etiqueta',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async deleteTag(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<void> {
    try {
      await this.tagsService.deleteTag(id, user.id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stats/usage')
  @ApiOperation({ summary: 'Obtener estadísticas de uso de etiquetas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas de uso de etiquetas del usuario',
    type: [TagUsageStatsDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para ver estadísticas',
  })
  async getTagUsageStats(@CurrentUser() user: any): Promise<TagUsageStatsDto[]> {
    try {
      return await this.tagsService.getTagUsageStats(user.id);
    } catch (error) {
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('popular/colors')
  @ApiOperation({ summary: 'Obtener colores populares para etiquetas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de colores más utilizados en etiquetas',
    type: [PopularColorDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para ver colores populares',
  })
  async getPopularColors(): Promise<PopularColorDto[]> {
    try {
      return await this.tagsService.getPopularColors();
    } catch (error) {
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}