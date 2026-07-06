import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseBoolPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { RubricFoldersService } from '../services/rubric-folders.service';
import {
  CreateRubricFolderDto,
  UpdateRubricFolderDto,
  MoveRubricToFolderDto,
  BulkMoveRubricsDto,
  RubricFolderStatsDto,
  FolderTreeDto,
} from '../dto/rubric-folder.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { RubricFolder } from '../entities/rubric-folder.entity';
import { Rubric } from '../entities/rubric.entity';

@ApiTags('rubric-folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rubric-folders')
export class RubricFoldersController {
  constructor(private readonly foldersService: RubricFoldersService) {
    console.log('[DEBUG] RubricFoldersController initialized with endpoints:', [
      'GET /rubric-folders',
      'POST /rubric-folders',
      'POST /rubric-folders/move-rubric',
      'POST /rubric-folders/bulk-move-rubrics',
      'GET /rubric-folders/tree',
      'GET /rubric-folders/:id',
      'GET /rubric-folders/:id/stats',
      'PATCH /rubric-folders/:id',
      'DELETE /rubric-folders/:id'
    ]);
  }

  // ==================== CRUD CARPETAS ====================

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todas las carpetas del profesor' })
  @ApiQuery({ name: 'includeShared', required: false, description: 'Incluir carpetas compartidas', type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de carpetas del profesor', type: [RubricFolder] })
  async findAll(
    @Request() req: any,
    @Query('includeShared', new ParseBoolPipe({ optional: true })) includeShared?: boolean,
  ): Promise<RubricFolder[]> {
    const userId = req.user.sub || req.user.id;
    console.log('[DEBUG] RubricFoldersController findAll - userId:', userId, 'includeShared:', includeShared);
    return this.foldersService.findAll(userId, includeShared || false);
  }

  @Get('tree')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener árbol jerárquico de carpetas' })
  @ApiResponse({ status: 200, description: 'Árbol jerárquico de carpetas', type: [FolderTreeDto] })
  async getFolderTree(@Request() req: any): Promise<FolderTreeDto[]> {
    const userId = req.user.sub || req.user.id;
    return this.foldersService.getFolderTree(userId);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener carpeta por ID' })
  @ApiParam({ name: 'id', description: 'ID de la carpeta', type: 'string' })
  @ApiResponse({ status: 200, description: 'Carpeta encontrada', type: RubricFolder })
  @ApiResponse({ status: 404, description: 'Carpeta no encontrada' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<RubricFolder> {
    const userId = req.user.sub || req.user.id;
    return this.foldersService.findOne(id, userId);
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nueva carpeta' })
  @ApiResponse({ status: 201, description: 'Carpeta creada exitosamente', type: RubricFolder })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(
    @Body() createFolderDto: CreateRubricFolderDto,
    @Request() req: any,
  ): Promise<RubricFolder> {
    const userId = req.user.sub || req.user.id;
    console.log('[DEBUG] RubricFoldersController create - userId:', userId, 'folderData:', createFolderDto);
    return this.foldersService.create(createFolderDto, userId);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar carpeta existente' })
  @ApiParam({ name: 'id', description: 'ID de la carpeta', type: 'string' })
  @ApiResponse({ status: 200, description: 'Carpeta actualizada exitosamente', type: RubricFolder })
  @ApiResponse({ status: 404, description: 'Carpeta no encontrada' })
  @ApiResponse({ status: 403, description: 'Sin permisos para editar esta carpeta' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFolderDto: UpdateRubricFolderDto,
    @Request() req: any,
  ): Promise<RubricFolder> {
    const userId = req.user.sub || req.user.id;
    console.log('[DEBUG] RubricFoldersController update - id:', id, 'userId:', userId, 'updateData:', updateFolderDto);
    return this.foldersService.update(id, updateFolderDto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar carpeta (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID de la carpeta', type: 'string' })
  @ApiResponse({ status: 200, description: 'Carpeta eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Carpeta no encontrada' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar carpeta con contenido' })
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.sub || req.user.id;
    console.log('[DEBUG] RubricFoldersController remove - id:', id, 'userId:', userId);
    return this.foldersService.remove(id, userId);
  }

  @Get(':id/stats')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de una carpeta' })
  @ApiParam({ name: 'id', description: 'ID de la carpeta', type: 'string' })
  @ApiResponse({ status: 200, description: 'Estadísticas de la carpeta', type: RubricFolderStatsDto })
  @ApiResponse({ status: 404, description: 'Carpeta no encontrada' })
  async getFolderStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<RubricFolderStatsDto> {
    const userId = req.user.sub || req.user.id;
    return this.foldersService.getFolderStats(id, userId);
  }

  // ==================== OPERACIONES CON RÚBRICAS ====================

  @Post('move-rubric')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mover rúbrica a otra carpeta' })
  @ApiResponse({ status: 200, description: 'Rúbrica movida exitosamente', type: Rubric })
  @ApiResponse({ status: 404, description: 'Rúbrica o carpeta no encontrada' })
  @ApiResponse({ status: 403, description: 'Sin permisos para mover esta rúbrica' })
  @HttpCode(HttpStatus.OK)
  async moveRubric(
    @Body() moveDto: MoveRubricToFolderDto,
    @Request() req: any,
  ): Promise<Rubric> {
    const userId = req.user.sub || req.user.id;
    console.log('[DEBUG] RubricFoldersController moveRubric - userId:', userId, 'moveData:', moveDto);
    
    // ⚠️ CRITICAL: Frontend sends { rubricId, folderId } but DTO expects MoveRubricToFolderDto
    // Let's handle both formats for compatibility
    const moveData: MoveRubricToFolderDto = {
      rubricId: moveDto.rubricId,
      folderId: moveDto.folderId
    };
    
    const result = await this.foldersService.moveRubricToFolder(moveData, userId);
    console.log('[DEBUG] RubricFoldersController moveRubric - SUCCESS:', result.id, 'moved to folder:', result.folderId);
    return result;
  }

  @Post('bulk-move-rubrics')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mover múltiples rúbricas a otra carpeta' })
  @ApiResponse({ status: 200, description: 'Rúbricas movidas exitosamente', type: [Rubric] })
  @ApiResponse({ status: 404, description: 'Una o más rúbricas no encontradas' })
  @ApiResponse({ status: 403, description: 'Sin permisos para mover estas rúbricas' })
  @HttpCode(HttpStatus.OK)
  async bulkMoveRubrics(
    @Body() bulkMoveDto: BulkMoveRubricsDto,
    @Request() req: any,
  ): Promise<Rubric[]> {
    const userId = req.user.sub || req.user.id;
    console.log('[DEBUG] RubricFoldersController bulkMoveRubrics - userId:', userId, 'bulkMoveData:', bulkMoveDto);
    return this.foldersService.bulkMoveRubrics(bulkMoveDto, userId);
  }

  // ==================== ENDPOINTS DE TESTING (OPCIONAL) ====================

  @Get('test/validate/:rubricId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'TEST: Validar acceso a rúbrica' })
  async testValidateRubricAccess(
    @Param('rubricId', ParseUUIDPipe) rubricId: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    // Este endpoint es para testing - validar que el profesor tiene acceso a la rúbrica
    try {
      console.log('[TEST] Validating rubric access - rubricId:', rubricId, 'userId:', userId);
      // Intentar mover la rúbrica a null (carpeta raíz) para verificar permisos
      const moveDto: MoveRubricToFolderDto = { rubricId, folderId: undefined };
      const result = await this.foldersService.moveRubricToFolder(moveDto, userId);
      return {
        success: true,
        message: 'Usuario tiene acceso a la rúbrica',
        rubricId: result.id,
        currentFolderId: result.folderId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        rubricId,
        userId,
      };
    }
  }
}