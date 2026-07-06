import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { LogbookEntriesService } from '../services/logbook-entries.service';
import { LogbookSeriesService } from '../services/logbook-series.service';
import {
  CreateLogbookEntryDto,
  UpdateLogbookEntryDto,
  LogbookEntryQueryDto,
  LogbookEntryResponseDto,
  LogbookEntriesPageDto,
  EntryStatsDto,
  CreateEntryWithSeriesResponseDto,
  DeleteFutureEntriesDto,
  LogbookSeriesDto,
  DeleteEntryConfirmationDto,
  SeriesDeletionInfoDto,
} from '../dto/logbook-entry.dto';

@ApiTags('Logbook Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
@Controller('logbook/entries')
export class LogbookEntriesController {
  constructor(
    private readonly entriesService: LogbookEntriesService,
    private readonly seriesService: LogbookSeriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva entrada de bitácora (con opción de series recurrentes)' })
  @ApiBody({ type: CreateLogbookEntryDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Entrada creada exitosamente',
    type: CreateEntryWithSeriesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para crear entradas',
  })
  async createEntry(
    @CurrentUser() user: any,
    @Body() createEntryDto: CreateLogbookEntryDto,
  ): Promise<CreateEntryWithSeriesResponseDto> {
    console.error('🔥🔥🔥 LOGBOOK CONTROLLER ENTRY POINT - THIS SHOULD ALWAYS APPEAR!');
    console.error('🔥🔥🔥 User ID:', user?.id);
    console.error('🔥🔥🔥 DTO repeatUntilCourseEnd:', createEntryDto.repeatUntilCourseEnd);
    console.error('🔥🔥🔥 Full DTO:', JSON.stringify(createEntryDto, null, 2));

    try {
      if (createEntryDto.repeatUntilCourseEnd === true) {
        console.error('🔥 TAKING RECURRING PATH - CREATING SERIES');
        const result = await this.seriesService.createRecurringSeries(user.id, createEntryDto);
        console.error('🔥 SERIES RESULT:', JSON.stringify(result, null, 2));
        return result;
      } else {
        console.error('🔥 TAKING SINGLE ENTRY PATH - repeatUntilCourseEnd is:', createEntryDto.repeatUntilCourseEnd);
        // Crear entrada individual
        const entry = await this.entriesService.createEntry(user.id, createEntryDto);
        return {
          entry: this.mapEntryToResponse(entry),
        };
      }
    } catch (error) {
      console.error('❌ Error in createEntry:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Obtener entradas de bitácora del usuario con filtros' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Fecha de inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fecha de fin (YYYY-MM-DD)' })
  @ApiQuery({ name: 'tagId', required: false, description: 'ID de etiqueta para filtrar' })
  @ApiQuery({ name: 'search', required: false, description: 'Término de búsqueda' })
  @ApiQuery({ name: 'pinnedOnly', required: false, type: Boolean, description: 'Solo entradas fijadas' })
  @ApiQuery({ name: 'visibility', required: false, enum: ['private', 'staff', 'admin'], description: 'Nivel de visibilidad' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['dateLocal', 'createdAt', 'title', 'updatedAt'], description: 'Campo para ordenar' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Orden' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista paginada de entradas del usuario',
    type: LogbookEntriesPageDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para ver entradas',
  })
  async getEntries(
    @CurrentUser() user: any,
    @Query() query: LogbookEntryQueryDto,
  ): Promise<LogbookEntriesPageDto> {
    try {
      const { entries, total } = await this.entriesService.getEntries(user.id, query);
      const page = query.page || 1;
      const limit = query.limit || 20;
      const totalPages = Math.ceil(total / limit);

      return {
        entries: entries.map(entry => this.mapEntryToResponse(entry)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('week/:weekStart')
  @ApiOperation({ summary: 'Obtener entradas de una semana específica' })
  @ApiParam({ name: 'weekStart', description: 'Fecha de inicio de semana (YYYY-MM-DD)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Entradas de la semana especificada',
    type: [LogbookEntryResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Formato de fecha inválido',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para ver entradas',
  })
  async getWeekEntries(
    @CurrentUser() user: any,
    @Param('weekStart') weekStart: string,
  ): Promise<LogbookEntryResponseDto[]> {
    try {
      const entries = await this.entriesService.getWeekEntries(user.id, weekStart);
      return entries.map(entry => this.mapEntryToResponse(entry));
    } catch (error) {
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('month/:year/:month')
  @ApiOperation({ summary: 'Obtener entradas de un mes específico' })
  @ApiParam({ name: 'year', description: 'Año (YYYY)' })
  @ApiParam({ name: 'month', description: 'Mes (1-12)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Entradas del mes especificado',
    type: [LogbookEntryResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Año o mes inválido',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para ver entradas',
  })
  async getMonthEntries(
    @CurrentUser() user: any,
    @Param('year') year: string,
    @Param('month') month: string,
  ): Promise<LogbookEntryResponseDto[]> {
    try {
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw new HttpException('Año o mes inválido', HttpStatus.BAD_REQUEST);
      }

      const entries = await this.entriesService.getMonthEntries(user.id, yearNum, monthNum);
      return entries.map(entry => this.mapEntryToResponse(entry));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar entradas por término de búsqueda' })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Límite de resultados (máximo 50)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultados de búsqueda',
    type: [LogbookEntryResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Término de búsqueda requerido',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para buscar entradas',
  })
  async searchEntries(
    @CurrentUser() user: any,
    @Query('q') searchTerm: string,
    @Query('limit') limit?: number,
  ): Promise<LogbookEntryResponseDto[]> {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        throw new HttpException('Término de búsqueda requerido', HttpStatus.BAD_REQUEST);
      }

      const searchLimit = Math.min(limit || 10, 50);
      const entries = await this.entriesService.searchEntries(user.id, searchTerm.trim(), searchLimit);
      return entries.map(entry => this.mapEntryToResponse(entry));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de entradas del usuario' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas de entradas del usuario',
    type: EntryStatsDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para ver estadísticas',
  })
  async getEntryStats(@CurrentUser() user: any): Promise<EntryStatsDto> {
    try {
      return await this.entriesService.getEntryStats(user.id);
    } catch (error) {
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id/deletion-info')
  @ApiOperation({ summary: 'Verificar si la eliminación de entrada requiere confirmación (series)' })
  @ApiParam({ name: 'id', description: 'ID de la entrada', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Información sobre la eliminación de la entrada',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            requiresConfirmation: { type: 'boolean', example: false }
          }
        },
        { $ref: '#/components/schemas/SeriesDeletionInfoDto' }
      ]
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Entrada no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para acceder a esta entrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async getDeletionInfo(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<any> {
    try {
      return await this.entriesService.checkSeriesDeletionInfo(id, user.id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id/confirmed')
  @ApiOperation({ summary: 'Eliminar entrada con confirmación para series' })
  @ApiParam({ name: 'id', description: 'ID de la entrada', format: 'uuid' })
  @ApiBody({ type: DeleteEntryConfirmationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Entrada(s) eliminada(s) exitosamente',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number', description: 'Número de entradas eliminadas' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Entrada no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Tipo de eliminación inválido',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para eliminar esta entrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async deleteEntryConfirmed(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() confirmationDto: DeleteEntryConfirmationDto,
  ): Promise<{ deletedCount: number }> {
    try {
      return await this.entriesService.deleteEntryWithConfirmation(
        id,
        user.id,
        confirmationDto.deletionType
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener entrada específica por ID' })
  @ApiParam({ name: 'id', description: 'ID de la entrada', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detalles de la entrada',
    type: LogbookEntryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Entrada no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para acceder a esta entrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async getEntry(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<LogbookEntryResponseDto> {
    try {
      const entry = await this.entriesService.getEntryById(id, user.id);
      return this.mapEntryToResponse(entry);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar entrada existente' })
  @ApiParam({ name: 'id', description: 'ID de la entrada', format: 'uuid' })
  @ApiBody({ type: UpdateLogbookEntryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Entrada actualizada exitosamente',
    type: LogbookEntryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Entrada no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para modificar esta entrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async updateEntry(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateEntryDto: UpdateLogbookEntryDto,
  ): Promise<LogbookEntryResponseDto> {
    try {
      const entry = await this.entriesService.updateEntry(id, user.id, updateEntryDto);
      return this.mapEntryToResponse(entry);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Alternar estado de fijado de una entrada' })
  @ApiParam({ name: 'id', description: 'ID de la entrada', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estado de fijado alternado exitosamente',
    type: LogbookEntryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Entrada no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para modificar esta entrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async togglePin(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<LogbookEntryResponseDto> {
    try {
      const entry = await this.entriesService.togglePin(id, user.id);
      return this.mapEntryToResponse(entry);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar entrada (legacy - solo para entradas individuales)' })
  @ApiParam({ name: 'id', description: 'ID de la entrada', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Entrada eliminada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Entrada no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para eliminar esta entrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async deleteEntry(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<void> {
    try {
      await this.entriesService.deleteEntry(id, user.id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':id/delete-future')
  @ApiOperation({ summary: 'Eliminar entradas futuras de una serie desde la entrada especificada' })
  @ApiParam({ name: 'id', description: 'ID de la entrada de referencia', format: 'uuid' })
  @ApiBody({ type: DeleteFutureEntriesDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Entradas futuras eliminadas exitosamente',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number', description: 'Número de entradas eliminadas' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Entrada no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'La entrada no pertenece a una serie',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para modificar esta entrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async deleteFutureEntries(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() deleteFutureDto: DeleteFutureEntriesDto,
  ): Promise<{ deletedCount: number }> {
    try {
      const deletedCount = await this.seriesService.deleteFutureEntries(
        id,
        user.id,
        deleteFutureDto.inclusive || false
      );
      return { deletedCount };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('series/:seriesId')
  @ApiOperation({ summary: 'Obtener todas las entradas de una serie' })
  @ApiParam({ name: 'seriesId', description: 'ID de la serie', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Entradas de la serie',
    type: [LogbookEntryResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Serie no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para acceder a esta serie',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async getSeriesEntries(
    @CurrentUser() user: any,
    @Param('seriesId') seriesId: string,
  ): Promise<LogbookEntryResponseDto[]> {
    try {
      const entries = await this.seriesService.getSeriesEntries(seriesId, user.id);
      return entries.map(entry => this.mapEntryToResponse(entry));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch('series/:seriesId')
  @ApiOperation({ summary: 'Actualizar una serie (solo afecta entradas placeholder futuras)' })
  @ApiParam({ name: 'seriesId', description: 'ID de la serie', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        endDate: { type: 'string', format: 'date', description: 'Nueva fecha de fin' },
        tagId: { type: 'string', format: 'uuid', description: 'Nuevo ID de etiqueta' },
        visibility: { type: 'string', enum: ['private', 'staff', 'admin'], description: 'Nueva visibilidad' },
        startedAtLocal: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$', description: 'Nueva hora de inicio' },
        endedAtLocal: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$', description: 'Nueva hora de fin' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Serie actualizada exitosamente',
    type: LogbookSeriesDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Serie no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para modificar esta serie',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async updateSeries(
    @CurrentUser() user: any,
    @Param('seriesId') seriesId: string,
    @Body() updateData: Partial<{
      endDate: string;
      tagId: string;
      visibility: string;
      startedAtLocal: string;
      endedAtLocal: string;
    }>,
  ): Promise<LogbookSeriesDto> {
    try {
      const series = await this.seriesService.updateSeries(seriesId, user.id, updateData);
      return {
        id: series.id,
        ownerUserId: series.ownerUserId,
        ruleRrule: series.ruleRrule,
        startDate: series.startDate,
        endDate: series.endDate,
        startedAtLocal: series.startedAtLocal,
        endedAtLocal: series.endedAtLocal,
        tagId: series.tagId,
        visibility: series.visibility,
        createdAt: series.createdAt,
        updatedAt: series.updatedAt,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('series/:seriesId')
  @ApiOperation({ summary: 'Eliminar una serie completa (solo entradas placeholder)' })
  @ApiParam({ name: 'seriesId', description: 'ID de la serie', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Serie eliminada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Serie no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sin permisos para eliminar esta serie',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async deleteSeries(
    @CurrentUser() user: any,
    @Param('seriesId') seriesId: string,
  ): Promise<void> {
    try {
      await this.seriesService.deleteSeries(seriesId, user.id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private mapEntryToResponse(entry: any): LogbookEntryResponseDto {
    return {
      id: entry.id,
      ownerUserId: entry.ownerUserId,
      tagId: entry.tagId,
      title: entry.title,
      contentRich: entry.contentRich,
      contentPlain: entry.contentPlain,
      dateLocal: entry.dateLocal,
      startedAtLocal: entry.startedAtLocal,
      endedAtLocal: entry.endedAtLocal,
      durationMin: entry.durationMin,
      pinned: entry.pinned,
      visibility: entry.visibility,
      attachmentsCnt: entry.attachmentsCnt,
      seriesId: entry.seriesId,
      isPlaceholder: entry.isPlaceholder,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      tag: entry.tag ? {
        id: entry.tag.id,
        name: entry.tag.name,
        colorHex: entry.tag.colorHex,
      } : undefined,
    };
  }
}