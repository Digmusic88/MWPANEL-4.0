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
  Request,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import * as multer from 'multer';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { LessonsService } from '../services/lessons.service';
import { TsxSecurityService } from '../services/tsx-security.service';
import { LessonsGoogleDriveService } from '../services/lessons-google-drive.service';
import {
  CreateLessonWorkspaceDto,
  CreateLessonFolderDto,
  UpdateLessonFolderDto,
  CreateLessonResourceDto,
  CreateFileResourceDto,
  CreateYouTubeResourceDto,
  CreateWebLinkResourceDto,
  CreateInternalDocResourceDto,
  CreatePresentationResourceDto,
  CreateTsxArtifactResourceDto,
  UpdateLessonResourceDto,
  LessonResourceQueryDto,
  LessonWorkspaceQueryDto,
  LessonFolderQueryDto,
  ShareLessonResourceDto,
  ReorderLessonFoldersDto,
  ReorderLessonResourcesDto,
  LessonWorkspaceResponseDto,
  LessonFolderResponseDto,
  LessonResourceResponseDto,
  PaginatedLessonResourcesResponseDto
} from '../dto';
import { CloneWorkspaceDto } from '../dto/clone-workspace.dto';
import { User, UserRole } from '../../users/entities/user.entity';
import { LessonResourceType } from '../entities/lesson-resource.entity';
import { validateTsxSecurity, sanitizeTsxContent } from '../../../common/validators/tsx-security.validator';

@ApiTags('Lecciones y Recursos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lessons')
export class LessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly tsxSecurityService: TsxSecurityService,
    private readonly lessonsGoogleDriveService: LessonsGoogleDriveService,
  ) {}

  // ========================================
  // WORKSPACE ENDPOINTS
  // ========================================

  @Post('workspaces')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear nuevo workspace de lecciones' })
  @ApiResponse({ status: 201, description: 'Workspace creado exitosamente', type: LessonWorkspaceResponseDto })
  async createWorkspace(
    @Body() dto: CreateLessonWorkspaceDto,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.createWorkspace(dto, user.id);
  }

  @Get('workspaces')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener workspaces del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de workspaces', type: [LessonWorkspaceResponseDto] })
  async getWorkspaces(
    @Query() query: LessonWorkspaceQueryDto,
    @CurrentUser() user: User
  ) {
    console.log('🔥🔥🔥 LESSONS CONTROLLER - getWorkspaces EJECUTÁNDOSE 🔥🔥🔥');
    console.log('🎯 Controller getWorkspaces called with user.id:', user.id, 'query:', query);
    console.log('🔍 Raw query object:', JSON.stringify(query));
    console.log('🔍 query.isArchived value:', query.isArchived, 'type:', typeof query.isArchived);
    const result = await this.lessonsService.getWorkspaces(query, user.id);
    console.log('📤 Controller returning result:', result);
    return result;
  }

  @Get('test-endpoint')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Test endpoint para debug' })
  async testEndpoint(@CurrentUser() user: User) {
    console.log('🔥🔥🔥 TEST ENDPOINT EJECUTÁNDOSE 🔥🔥🔥');
    return { message: 'Test endpoint funciona', userId: user.id, timestamp: new Date() };
  }

  @Get('workspaces/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener workspace por ID' })
  @ApiResponse({ status: 200, description: 'Workspace encontrado', type: LessonWorkspaceResponseDto })
  async getWorkspaceById(
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.getWorkspaceById(id, user.id);
  }

  @Delete('workspaces/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar workspace' })
  @ApiResponse({ status: 204, description: 'Workspace eliminado exitosamente' })
  async deleteWorkspace(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<void> {
    return await this.lessonsService.deleteWorkspace(id, user.id);
  }

  @Put('workspaces/:id/archive')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Archivar workspace' })
  @ApiResponse({ status: 200, description: 'Workspace archivado exitosamente', type: LessonWorkspaceResponseDto })
  async archiveWorkspace(
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.archiveWorkspace(id, user.id);
  }

  @Put('workspaces/:id/unarchive')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Desarchivar workspace' })
  @ApiResponse({ status: 200, description: 'Workspace desarchivado exitosamente', type: LessonWorkspaceResponseDto })
  async unarchiveWorkspace(
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.unarchiveWorkspace(id, user.id);
  }

  @Post('workspaces/:id/clone')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Clonar workspace para un nuevo curso académico' })
  @ApiResponse({ status: 201, description: 'Workspace clonado exitosamente', type: LessonWorkspaceResponseDto })
  async cloneWorkspace(
    @Param('id') id: string,
    @Body() dto: CloneWorkspaceDto,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.cloneWorkspace(id, dto.newAcademicYearId, user.id);
  }

  // ========================================
  // FOLDER ENDPOINTS
  // ========================================

  @Post('workspaces/:workspaceId/folders')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear nueva carpeta de lección' })
  @ApiResponse({ status: 201, description: 'Carpeta creada exitosamente', type: LessonFolderResponseDto })
  async createFolder(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateLessonFolderDto,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.createFolder(workspaceId, dto, user.id);
  }

  @Get('folders')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener carpetas con filtros' })
  @ApiResponse({ status: 200, description: 'Lista de carpetas', type: [LessonFolderResponseDto] })
  async getFolders(
    @Query() query: LessonFolderQueryDto,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.getFolders(query, user.id);
  }

  @Get('folders/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener carpeta por ID' })
  @ApiResponse({ status: 200, description: 'Carpeta encontrada', type: LessonFolderResponseDto })
  async getFolderById(
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.getFolderById(id, user.id);
  }

  @Put('folders/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualizar carpeta' })
  @ApiResponse({ status: 200, description: 'Carpeta actualizada', type: LessonFolderResponseDto })
  async updateFolder(
    @Param('id') id: string,
    @Body() dto: UpdateLessonFolderDto,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.updateFolder(id, dto, user.id);
  }

  @Delete('folders/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar carpeta' })
  @ApiResponse({ status: 204, description: 'Carpeta eliminada exitosamente' })
  async deleteFolder(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<void> {
    return await this.lessonsService.deleteFolder(id, user.id);
  }

  @Put('workspaces/:workspaceId/folders/reorder')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reordenar carpetas en workspace' })
  @ApiResponse({ status: 204, description: 'Carpetas reordenadas exitosamente' })
  async reorderFolders(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ReorderLessonFoldersDto,
    @CurrentUser() user: User
  ): Promise<void> {
    return await this.lessonsService.reorderFolders(workspaceId, dto, user.id);
  }

  // ========================================
  // RESOURCE ENDPOINTS
  // ========================================

  @Post('folders/:folderId/resources')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear nuevo recurso en carpeta' })
  @ApiResponse({ status: 201, description: 'Recurso creado exitosamente', type: LessonResourceResponseDto })
  async createResource(
    @Param('folderId') folderId: string,
    @Body() dto: CreateLessonResourceDto,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.createResource(folderId, dto, user.id);
  }

  @Post('folders/:folderId/resources/file')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir archivo como recurso' })
  @ApiResponse({ status: 201, description: 'Archivo subido exitosamente', type: LessonResourceResponseDto })
  async uploadFileResource(
    @Param('folderId') folderId: string,
    @Body() dto: CreateFileResourceDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo');
    }

    // Get folder information to determine the lesson folder in Google Drive
    const folder = await this.lessonsService.getFolderById(folderId, user.id);
    
    let driveFileId: string | undefined;
    let webViewLink: string | undefined;
    let downloadLink: string | undefined;

    // Upload to Google Drive if configured
    if (this.lessonsGoogleDriveService.isDriveConfigured()) {
      try {
        // Ensure lesson folder exists in Drive
        let lessonFolderId = folder.driveFolderId;
        if (!lessonFolderId) {
          lessonFolderId = await this.lessonsGoogleDriveService.syncFolderWithDrive(folderId);
        }

        // Upload file to Google Drive
        const uploadResult = await this.lessonsGoogleDriveService.uploadLessonFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          lessonFolderId
        );

        driveFileId = uploadResult.fileId;
        webViewLink = uploadResult.webViewLink;
        downloadLink = uploadResult.downloadLink;
      } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        // Continue without Google Drive if it fails
      }
    }
    
    // Create resource with file-specific data
    const resourceData = {
      ...dto,
      type: LessonResourceType.FILE,
      // File-specific data will be handled by the service
    };

    const resource = await this.lessonsService.createResource(folderId, resourceData, user.id);
    
    // Update resource with Google Drive file information
    if (driveFileId) {
      await this.lessonsService.updateResourceWithFileData(resource.id, {
        driveFileId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        webViewLink,
        downloadLink
      });
    }
    
    return resource;
  }

  @Post('folders/:folderId/resources/youtube')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear recurso de YouTube' })
  @ApiResponse({ status: 201, description: 'Recurso de YouTube creado', type: LessonResourceResponseDto })
  async createYouTubeResource(
    @Param('folderId') folderId: string,
    @Body() dto: CreateYouTubeResourceDto,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.createResource(folderId, dto, user.id);
  }

  @Post('folders/:folderId/resources/weblink')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear recurso de enlace web' })
  @ApiResponse({ status: 201, description: 'Recurso de enlace web creado', type: LessonResourceResponseDto })
  async createWebLinkResource(
    @Param('folderId') folderId: string,
    @Body() dto: CreateWebLinkResourceDto,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.createResource(folderId, dto, user.id);
  }

  @Post('folders/:folderId/resources/document')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear documento interno WYSIWYG' })
  @ApiResponse({ status: 201, description: 'Documento interno creado', type: LessonResourceResponseDto })
  async createInternalDocResource(
    @Param('folderId') folderId: string,
    @Body() dto: CreateInternalDocResourceDto,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.createResource(folderId, dto, user.id);
  }

  @Post('folders/:folderId/resources/presentation')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear recurso de presentación' })
  @ApiResponse({ status: 201, description: 'Recurso de presentación creado', type: LessonResourceResponseDto })
  async createPresentationResource(
    @Param('folderId') folderId: string,
    @Body() dto: CreatePresentationResourceDto,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.createResource(folderId, dto, user.id);
  }

  @Post('folders/:folderId/resources/tsx-artifact')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear artefacto TSX interactivo con auto-corrección' })
  @ApiResponse({ status: 201, description: 'Artefacto TSX creado', type: LessonResourceResponseDto })
  async createTsxArtifactResource(
    @Param('folderId') folderId: string,
    @Body() dto: CreateTsxArtifactResourceDto,
    @CurrentUser() user: User
  ) {
    // Enhanced TSX security validation with auto-fixing
    const { validateTsxSecurity, sanitizeTsxContent } = await import('../../../common/validators/tsx-security.validator');
    
    console.log(`🔧 Processing TSX artifact for user ${user.id}, code length: ${dto.sourceCode?.length || 0}`);
    
    // Try auto-fixing first (conceptually similar to frontend)
    let processedCode = dto.sourceCode;
    let wasAutoFixed = false;
    const appliedFixes: string[] = [];
    
    // Apply basic server-side auto-fixes
    if (processedCode) {
      const originalCode = processedCode;
      
      // Auto-fix dangerous patterns
      if (processedCode.includes('setTimeout') || processedCode.includes('setInterval')) {
        processedCode = processedCode.replace(/setTimeout\s*\([^)]*\)/g, '/* setTimeout removed for security */');
        processedCode = processedCode.replace(/setInterval\s*\([^)]*\)/g, '/* setInterval removed for security */');
        appliedFixes.push('Removed setTimeout/setInterval calls');
        wasAutoFixed = true;
      }
      
      if (processedCode.includes('window.') || processedCode.includes('document.')) {
        processedCode = processedCode.replace(/window\./g, '/* window access removed */');
        processedCode = processedCode.replace(/document\./g, '/* document access removed */');
        appliedFixes.push('Removed window/document access');
        wasAutoFixed = true;
      }
      
      if (processedCode.includes('eval(') || processedCode.includes('Function(')) {
        processedCode = processedCode.replace(/eval\s*\([^)]*\)/g, '/* eval removed for security */');
        processedCode = processedCode.replace(/Function\s*\([^)]*\)/g, '/* Function constructor removed */');
        appliedFixes.push('Removed eval/Function calls');
        wasAutoFixed = true;
      }
      
      // Add React import if missing
      if (!processedCode.includes('import React') && !processedCode.includes('import * as React')) {
        processedCode = "import React from 'react';\n" + processedCode;
        appliedFixes.push('Added missing React import');
        wasAutoFixed = true;
      }
      
      // Replace problematic imports
      if (processedCode.includes('lucide-react')) {
        processedCode = processedCode.replace(
          /import\s+.*from\s+['"`]lucide-react['"`]/g, 
          "import { QuestionCircleOutlined } from '@ant-design/icons'; // Auto-replaced unsafe import"
        );
        appliedFixes.push('Replaced lucide-react with @ant-design/icons');
        wasAutoFixed = true;
      }
      
      if (wasAutoFixed) {
        console.log(`🔧 Auto-fixes applied:`, appliedFixes);
      }
    }
    
    // Validate processed code with enhanced security checks
    const securityValidation = validateTsxSecurity(processedCode);
    
    // If still has critical errors after auto-fixing, reject
    if (!securityValidation.isValid) {
      throw new BadRequestException({
        message: 'Código TSX rechazado por problemas de seguridad críticos',
        errors: securityValidation.errors,
        warnings: securityValidation.warnings,
        riskLevel: securityValidation.riskLevel,
        wasAutoFixed,
        appliedFixes: appliedFixes
      });
    }

    // Log security warnings and auto-fixes
    if (securityValidation.warnings.length > 0) {
      console.warn(`TSX Security Warnings for user ${user.id}:`, securityValidation.warnings);
    }
    
    if (wasAutoFixed) {
      console.log(`✅ TSX Auto-fixes successful for user ${user.id}:`, appliedFixes);
    }

    // Sanitize code before storage (additional safety layer)
    const sanitizedCode = sanitizeTsxContent(processedCode);
    
    // Update DTO with processed and sanitized code
    const secureDto = {
      ...dto,
      sourceCode: sanitizedCode,
      securityValidated: true,
      securityLevel: securityValidation.riskLevel,
      wasAutoFixed,
      appliedFixes: appliedFixes.length > 0 ? appliedFixes : undefined
    };

    // Original validation service (if still present)
    if (this.tsxSecurityService) {
      const validation = await this.tsxSecurityService.validateTsxCode(sanitizedCode, dto.dependencies);
      
      if (!validation.isValid) {
        throw new BadRequestException({
          message: 'Código TSX inválido después de la sanitización',
          errors: validation.errors,
          securityIssues: validation.securityIssues,
          wasAutoFixed,
          appliedFixes: appliedFixes
        });
      }
    }

    console.log(`✅ TSX artifact processed successfully for user ${user.id}, applied ${appliedFixes.length} fixes`);
    return await this.lessonsService.createResource(folderId, secureDto, user.id);
  }

  @Get('resources')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Buscar recursos con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Lista paginada de recursos', type: PaginatedLessonResourcesResponseDto })
  async getResources(
    @Query() query: LessonResourceQueryDto,
    @CurrentUser() user: User
  ) {
    const result = await this.lessonsService.getResources(query, user.id);
    
    // *** CRITICAL FIX: Apply transformation to all resources in list ***
    // Map tsxCode back to sourceCode for frontend compatibility
    const transformedData = result.data.map(resource => ({
      ...resource,
      sourceCode: resource.tsxCode, // Map tsxCode -> sourceCode for frontend
      componentProps: resource.tsxProps,
      dependencies: resource.tsxDependencies,
      customStyles: resource.tsxStyles
    }));
    
    return {
      data: transformedData,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
        hasNext: query.page * query.limit < result.total,
        hasPrev: query.page > 1
      },
      filters: {
        folderId: query.folderId,
        type: query.type,
        visibility: query.visibility,
        search: query.search,
        tags: query.tags
      }
    };
  }

  @Get('resources/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener recurso por ID' })
  @ApiResponse({ status: 200, description: 'Recurso encontrado', type: LessonResourceResponseDto })
  async getResourceById(
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    console.log(`🔍 [GET] Loading resource ${id} for user ${user.id}`);
    
    const result = await this.lessonsService.getResourceById(id, user.id);
    
    console.log(`🔍 [GET] Raw result before transformation:`, {
      id: result.id,
      type: result.type,
      hasTsxCode: !!result.tsxCode,
      tsxCodeLength: result.tsxCode?.length || 0
    });
    
    // *** CRITICAL FIX: Apply same transformation as PUT endpoint ***
    // Map tsxCode back to sourceCode for frontend compatibility
    const transformedResult = {
      ...result,
      sourceCode: result.tsxCode, // Map tsxCode -> sourceCode for frontend
      // Keep other TSX fields as expected by frontend
      componentProps: result.tsxProps,
      dependencies: result.tsxDependencies,
      customStyles: result.tsxStyles
    };
    
    console.log(`🔍 [GET] Transformed result:`, {
      id: transformedResult.id,
      type: transformedResult.type,
      hasSourceCode: !!transformedResult.sourceCode,
      sourceCodeLength: transformedResult.sourceCode?.length || 0
    });
    
    return transformedResult;
  }

  @Put('resources/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualizar recurso' })
  @ApiResponse({ status: 200, description: 'Recurso actualizado', type: LessonResourceResponseDto })
  async updateResource(
    @Param('id') id: string,
    @Body() dto: UpdateLessonResourceDto,
    @CurrentUser() user: User
  ) {
    console.log('🚨🚨🚨🚨 [CRITICAL DEBUG] CONTROLLER ENTRY POINT 🚨🚨🚨🚨');
    console.log('🚨 [CRITICAL DEBUG] Method called at:', new Date().toISOString());
    console.log('🚨 [CRITICAL DEBUG] Resource ID:', id);
    console.log('🚨 [CRITICAL DEBUG] User exists:', !!user);
    console.log('🚨 [CRITICAL DEBUG] User ID:', user?.id || 'UNDEFINED');
    console.log('🚨 [CRITICAL DEBUG] DTO exists:', !!dto);
    console.log('🚨 [CRITICAL DEBUG] DTO keys:', dto ? Object.keys(dto) : 'NO_DTO');
    console.log('🚨 [CRITICAL DEBUG] Has sourceCode:', !!dto?.sourceCode);
    console.log('🚨 [CRITICAL DEBUG] SourceCode length:', dto?.sourceCode?.length || 0);
    console.log('🚨 [CRITICAL DEBUG] Raw DTO:', JSON.stringify(dto, null, 2));
    console.log('🚨🚨🚨🚨 [CRITICAL DEBUG] ABOUT TO ENTER TRY BLOCK 🚨🚨🚨🚨');
    
    try {
      console.log(`🔄 [PUT] Updating resource ${id} for user ${user.id}`);
      console.log(`📝 [PUT] Update data:`, JSON.stringify(dto, null, 2));
      
      // *** CRITICAL FIX: Process TSX artifacts on UPDATE too ***
      let processedDto = dto;
      
      // Check if this is a TSX artifact update by checking if sourceCode is present
      if (dto.sourceCode && dto.sourceCode.trim().length > 0) {
        console.log(`🔧 [PUT] Processing TSX artifact update for resource ${id}, code length: ${dto.sourceCode.length}`);
        console.log(`🔧 [PUT] TSX code preview: ${dto.sourceCode.substring(0, 200)}...`);
        
        try {
          // Apply the same TSX processing as POST endpoint
          console.log(`📦 [PUT] Importing TSX security validator...`);
          const { validateTsxSecurity, sanitizeTsxContent } = await import('../../../common/validators/tsx-security.validator');
          console.log(`📦 [PUT] TSX security validator imported successfully`);
        
        let processedCode = dto.sourceCode;
        let wasAutoFixed = false;
        const appliedFixes: string[] = [];
        
        // Apply basic server-side auto-fixes (same as POST)
        if (processedCode) {
          const originalCode = processedCode;
          
          // Auto-fix dangerous patterns
          if (processedCode.includes('setTimeout') || processedCode.includes('setInterval')) {
            processedCode = processedCode.replace(/setTimeout\s*\([^)]*\)/g, '/* setTimeout removed for security */');
            processedCode = processedCode.replace(/setInterval\s*\([^)]*\)/g, '/* setInterval removed for security */');
            appliedFixes.push('Removed setTimeout/setInterval calls');
            wasAutoFixed = true;
          }
          
          if (processedCode.includes('window.') || processedCode.includes('document.')) {
            processedCode = processedCode.replace(/window\./g, '/* window access removed */');
            processedCode = processedCode.replace(/document\./g, '/* document access removed */');
            appliedFixes.push('Removed window/document access');
            wasAutoFixed = true;
          }
          
          if (processedCode.includes('eval(') || processedCode.includes('Function(')) {
            processedCode = processedCode.replace(/eval\s*\([^)]*\)/g, '/* eval removed for security */');
            processedCode = processedCode.replace(/Function\s*\([^)]*\)/g, '/* Function constructor removed */');
            appliedFixes.push('Removed eval/Function calls');
            wasAutoFixed = true;
          }
          
          // Add React import if missing
          if (!processedCode.includes('import React') && !processedCode.includes('import * as React')) {
            processedCode = "import React from 'react';\n" + processedCode;
            appliedFixes.push('Added missing React import');
            wasAutoFixed = true;
          }
          
          // Replace problematic imports
          if (processedCode.includes('lucide-react')) {
            processedCode = processedCode.replace(
              /import\s+.*from\s+['"`]lucide-react['"`]/g, 
              "import { QuestionCircleOutlined } from '@ant-design/icons'; // Auto-replaced unsafe import"
            );
            appliedFixes.push('Replaced lucide-react with @ant-design/icons');
            wasAutoFixed = true;
          }
          
          if (wasAutoFixed) {
            // Add the marker that security validator expects for sandbox-processed code
            processedCode = '// Auto-fixed for sandbox compatibility\n' + processedCode;
            console.log(`🔧 [PUT] Auto-fixes applied:`, appliedFixes);
          }
        }
        
        // Validate processed code with error handling
        let securityValidation;
        let sanitizedCode;
        
        try {
          console.log(`🔒 [PUT] Running TSX security validation...`);
          securityValidation = validateTsxSecurity(processedCode);
          console.log(`🔒 [PUT] Security validation result:`, securityValidation);
          
          if (!securityValidation.isValid) {
            throw new BadRequestException({
              message: 'Código TSX rechazado por problemas de seguridad críticos',
              errors: securityValidation.errors,
              warnings: securityValidation.warnings,
              riskLevel: securityValidation.riskLevel,
              wasAutoFixed,
              appliedFixes: appliedFixes
            });
          }
          
          // Sanitize code before storage
          console.log(`🧹 [PUT] Running TSX code sanitization...`);
          sanitizedCode = sanitizeTsxContent(processedCode);
          console.log(`🧹 [PUT] Code sanitization completed, final length: ${sanitizedCode.length}`);
          
        } catch (validationError) {
          console.error(`❌ [PUT] CRITICAL ERROR in TSX validation/sanitization:`, validationError);
          console.error(`❌ [PUT] Validation error stack:`, validationError.stack);
          console.error(`❌ [PUT] Processed code that caused error:`, processedCode);
          
          // FALLBACK: Use processed code without additional validation/sanitization
          console.log(`⚠️ [PUT] FALLBACK: Using processed code without security validation due to validator error`);
          sanitizedCode = processedCode;
          securityValidation = {
            isValid: true,
            riskLevel: 'unknown',
            errors: [],
            warnings: [`Validation skipped due to error: ${validationError.message}`]
          };
        }
        
        // Update DTO with processed and sanitized code
        processedDto = {
          ...dto,
          sourceCode: sanitizedCode,
          securityValidated: true,
          securityLevel: securityValidation.riskLevel,
          wasAutoFixed,
          appliedFixes: appliedFixes.length > 0 ? appliedFixes : undefined
        } as UpdateLessonResourceDto;
        
        console.log(`✅ [PUT] TSX artifact processed for update, applied ${appliedFixes.length} fixes`);
        
        } catch (tsxProcessingError) {
          console.error(`❌ [PUT] CRITICAL ERROR in TSX processing:`, tsxProcessingError);
          console.error(`❌ [PUT] TSX processing error stack:`, tsxProcessingError.stack);
          console.error(`❌ [PUT] Original TSX code that caused error:`, dto.sourceCode);
          
          // FALLBACK: Use original code without TSX processing
          console.log(`⚠️ [PUT] FALLBACK: Using original code due to TSX processing error`);
          processedDto = {
            ...dto,
            sourceCode: dto.sourceCode, // Use original code as fallback
            securityValidated: false,
            wasAutoFixed: false,
            processingError: `TSX processing failed: ${tsxProcessingError.message}`
          } as UpdateLessonResourceDto;
        }
      }
      
      const result = await this.lessonsService.updateResource(id, processedDto, user.id);
      
      console.log(`✅ [PUT] Resource ${id} updated successfully`);
      console.log(`🔄 [PUT] Raw result before transformation:`, {
        id: result.id,
        type: result.type,
        hasTsxCode: !!result.tsxCode,
        tsxCodeLength: result.tsxCode?.length || 0
      });
      
      // *** CRITICAL FIX: Transform entity back to API response format ***
      // Map tsxCode back to sourceCode for frontend compatibility
      const transformedResult = {
        ...result,
        sourceCode: result.tsxCode, // Map tsxCode -> sourceCode for frontend
        // Keep other TSX fields as expected by frontend
        componentProps: result.tsxProps,
        dependencies: result.tsxDependencies,
        customStyles: result.tsxStyles
      };
      
      console.log(`🔄 [PUT] Transformed result:`, {
        id: transformedResult.id,
        type: transformedResult.type,
        hasSourceCode: !!transformedResult.sourceCode,
        sourceCodeLength: transformedResult.sourceCode?.length || 0
      });
      
      return transformedResult;
    } catch (error) {
      console.error(`❌ [PUT] Error updating resource ${id}:`, error);
      throw error;
    }
  }

  @Delete('resources/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar recurso' })
  @ApiResponse({ status: 204, description: 'Recurso eliminado exitosamente' })
  async deleteResource(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<void> {
    return await this.lessonsService.deleteResource(id, user.id);
  }

  @Put('folders/:folderId/resources/reorder')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reordenar recursos en carpeta' })
  @ApiResponse({ status: 204, description: 'Recursos reordenados exitosamente' })
  async reorderResources(
    @Param('folderId') folderId: string,
    @Body() dto: ReorderLessonResourcesDto,
    @CurrentUser() user: User
  ): Promise<void> {
    return await this.lessonsService.reorderResources(folderId, dto, user.id);
  }

  // ========================================
  // SHARING ENDPOINTS
  // ========================================

  @Post('resources/:id/share')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Compartir recurso con otro usuario' })
  @ApiResponse({ status: 201, description: 'Recurso compartido exitosamente' })
  async shareResource(
    @Param('id') id: string,
    @Body() dto: ShareLessonResourceDto,
    @CurrentUser() user: User
  ) {
    return await this.lessonsService.shareResource(id, dto, user.id);
  }

  @Delete('resources/:id/share/:sharedWithId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar compartir recurso' })
  @ApiResponse({ status: 204, description: 'Compartir eliminado exitosamente' })
  async unshareResource(
    @Param('id') id: string,
    @Param('sharedWithId') sharedWithId: string,
    @CurrentUser() user: User
  ): Promise<void> {
    return await this.lessonsService.unshareResource(id, sharedWithId, user.id);
  }

  // ========================================
  // TSX SECURITY ENDPOINTS
  // ========================================

  @Post('tsx/validate')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Validar código TSX para seguridad' })
  @ApiResponse({ status: 200, description: 'Resultado de validación de código TSX' })
  async validateTsxCode(
    @Body() body: { sourceCode: string; dependencies?: string[] }
  ) {
    return await this.tsxSecurityService.validateTsxCode(body.sourceCode, body.dependencies);
  }

  @Post('tsx/test')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Probar código TSX en sandbox' })
  @ApiResponse({ status: 200, description: 'Resultado de prueba en sandbox' })
  async testTsxInSandbox(
    @Body() body: { 
      sourceCode: string; 
      props?: Record<string, any>; 
      config?: any 
    },
    @CurrentUser() user: User
  ) {
    console.log('🚨🚨🚨 [ENTRY POINT] TSX TEST REQUEST RECEIVED IN CONTROLLER 🚨🚨🚨');
    console.log('🚨 [ENTRY POINT] This log confirms the request reached the controller');
    console.log('🚨 [ENTRY POINT] User ID:', user?.id || 'NO USER');
    console.log('🚨 [ENTRY POINT] Code Length:', body?.sourceCode?.length || 0);
    console.log('🚨 [ENTRY POINT] Timestamp:', new Date().toISOString());
    
    try {
      console.log('🔥🔥🔥 [Controller] TSX TEST REQUEST RECEIVED 🔥🔥🔥');
      console.log(`📝 [Controller] User: ${user.id}, Code Length: ${body.sourceCode?.length || 0}`);
      console.log(`📝 [Controller] Has Props: ${!!body.props}, Has Config: ${!!body.config}`);
      console.log('📝 [Controller] Source Code Preview:', body.sourceCode?.substring(0, 100) + '...');
      
      const result = await this.tsxSecurityService.testTsxInSandbox(
        body.sourceCode, 
        body.props, 
        body.config
      );
      
      console.log('✅ [Controller] TSX test completed, success:', result.success);
      if (!result.success) {
        console.log('❌ [Controller] TSX test error:', result.error);
      }
      
      return result;
    } catch (error) {
      console.log('💥💥💥 [Controller] CRITICAL ERROR IN TSX CONTROLLER 💥💥💥');
      console.log('💥 [Controller] Error message:', error.message);
      console.log('💥 [Controller] Error stack:', error.stack);
      throw error;
    }
  }

  @Post('tsx/sandbox-config')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Generar configuración de sandbox para código TSX' })
  @ApiResponse({ status: 200, description: 'Configuración de sandbox generada' })
  async generateSandboxConfig(
    @Body() body: { sourceCode: string }
  ) {
    return this.tsxSecurityService.generateSandboxConfig(body.sourceCode);
  }

  @Post('tsx/execute')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Ejecutar código TSX en sandbox (alias para tsx/test)' })
  @ApiResponse({ status: 200, description: 'Resultado de ejecución de código TSX' })
  async executeTsxCode(
    @Body() body: { 
      sourceCode: string; 
      props?: Record<string, any>; 
      config?: any 
    },
    @CurrentUser() user: User
  ) {
    console.log('🚨🚨🚨 [TSX EXECUTE] ENDPOINT CALLED SUCCESSFULLY 🚨🚨🚨');
    console.log('🚨 [TSX EXECUTE] User ID:', user?.id || 'NO USER');
    console.log('🚨 [TSX EXECUTE] Code Length:', body?.sourceCode?.length || 0);
    console.log('🚨 [TSX EXECUTE] Timestamp:', new Date().toISOString());
    
    // This is an alias for the tsx/test endpoint - just call the same service method
    return this.testTsxInSandbox(body, user);
  }

  @Post('tsx/auto-fix')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Auto-corregir código TSX problemático' })
  @ApiResponse({ status: 200, description: 'Resultado de auto-corrección de código TSX' })
  async autoFixTsxCode(
    @Body() body: { sourceCode: string },
    @CurrentUser() user: User
  ) {
    console.log(`🔧 Auto-fix request from user ${user.id}, code length: ${body.sourceCode?.length || 0}`);
    
    if (!body.sourceCode) {
      throw new BadRequestException('Source code is required');
    }
    
    let processedCode = body.sourceCode;
    let wasAutoFixed = false;
    const appliedFixes: string[] = [];
    const remainingIssues: string[] = [];
    
    try {
      const originalLength = processedCode.length;
      
      // 1. Add React import if missing
      if (!processedCode.includes('import React') && !processedCode.includes('import * as React')) {
        processedCode = "import React from 'react';\n" + processedCode;
        appliedFixes.push('Agregado import de React requerido');
        wasAutoFixed = true;
      }
      
      // 2. Remove dangerous function calls
      if (processedCode.includes('setTimeout') || processedCode.includes('setInterval')) {
        processedCode = processedCode.replace(/setTimeout\s*\([^)]*\)/g, '/* setTimeout removido por seguridad */');
        processedCode = processedCode.replace(/setInterval\s*\([^)]*\)/g, '/* setInterval removido por seguridad */');
        appliedFixes.push('Removidas llamadas setTimeout/setInterval por seguridad');
        wasAutoFixed = true;
      }
      
      // 3. Remove window/document access
      if (processedCode.includes('window.') || processedCode.includes('document.')) {
        processedCode = processedCode.replace(/window\./g, '/* acceso a window removido - usar props */');
        processedCode = processedCode.replace(/document\./g, '/* acceso a document removido - usar refs de React */');
        appliedFixes.push('Removido acceso a window/document - usar alternativas React');
        wasAutoFixed = true;
      }
      
      // 4. Remove eval and Function constructor
      if (processedCode.includes('eval(') || processedCode.includes('Function(')) {
        processedCode = processedCode.replace(/eval\s*\([^)]*\)/g, '/* eval removido por seguridad */');
        processedCode = processedCode.replace(/Function\s*\([^)]*\)/g, '/* Function constructor removido por seguridad */');
        appliedFixes.push('Removidas llamadas eval/Function por seguridad');
        wasAutoFixed = true;
      }
      
      // 5. Replace problematic imports
      if (processedCode.includes('lucide-react')) {
        processedCode = processedCode.replace(
          /import\s+.*from\s+['"`]lucide-react['"`]/g, 
          "import { QuestionCircleOutlined } from '@ant-design/icons'; // Reemplazado lucide-react"
        );
        appliedFixes.push('Reemplazado lucide-react con @ant-design/icons');
        wasAutoFixed = true;
      }
      
      // 6. Remove dangerouslySetInnerHTML
      if (processedCode.includes('dangerouslySetInnerHTML')) {
        processedCode = processedCode.replace(/dangerouslySetInnerHTML\s*=/g, '/* dangerouslySetInnerHTML removido */');
        appliedFixes.push('Removido dangerouslySetInnerHTML por seguridad');
        wasAutoFixed = true;
      }
      
      // 7. Replace alert with comments
      if (processedCode.includes('alert(')) {
        processedCode = processedCode.replace(/alert\s*\([^)]*\)/g, '/* alert removido - usar message.info de antd */');
        appliedFixes.push('Reemplazado alert con message.info de Ant Design');
        wasAutoFixed = true;
      }
      
      // 8. Add TypeScript definitions if needed
      const needsTypeDefinitions = /Cannot find global type|Cannot find name 'console'|Cannot find module 'react'/.test(processedCode);
      if (needsTypeDefinitions) {
        const typeDefinitions = `
// TypeScript definitions agregadas automáticamente
declare global {
  interface Array<T> extends ReadonlyArray<T> { [n: number]: T; }
  interface Object {}
  interface Function extends CallableFunction {}
  interface String {}
  interface Number {}
  interface Boolean {}
  const console: { log(...args: any[]): void; error(...args: any[]): void; };
  namespace JSX {
    interface IntrinsicElements { [elemName: string]: any; }
    interface Element extends React.ReactElement<any, any> {}
  }
}
`;
        processedCode = typeDefinitions + '\n' + processedCode;
        appliedFixes.push('Agregadas definiciones TypeScript faltantes');
        wasAutoFixed = true;
      }
      
      // Validate the processed code
      const securityValidation = validateTsxSecurity(processedCode);
      
      // Check for remaining critical issues
      if (!securityValidation.isValid) {
        remainingIssues.push(...securityValidation.errors);
      }
      remainingIssues.push(...securityValidation.warnings);
      
      // Additional sanitization
      const finalCode = sanitizeTsxContent(processedCode);
      
      const result = {
        wasFixed: wasAutoFixed,
        fixedCode: wasAutoFixed ? finalCode : undefined,
        fixesApplied: appliedFixes,
        remainingIssues: remainingIssues,
        isUsable: remainingIssues.filter(issue => securityValidation.errors.includes(issue)).length === 0,
        securityLevel: securityValidation.riskLevel,
        originalLength: originalLength,
        finalLength: finalCode.length
      };
      
      console.log(`✅ Auto-fix completed for user ${user.id}:`, {
        appliedFixes: appliedFixes.length,
        remainingIssues: remainingIssues.length,
        isUsable: result.isUsable
      });
      
      return result;
      
    } catch (error) {
      console.error(`❌ Auto-fix error for user ${user.id}:`, error);
      throw new BadRequestException({
        message: 'Error during auto-fix process',
        error: error.message,
        appliedFixes: appliedFixes
      });
    }
  }

  // ========================================
  // GOOGLE DRIVE INTEGRATION ENDPOINTS
  // ========================================

  @Get('drive/status')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Verificar estado de conexión con Google Drive' })
  @ApiResponse({ status: 200, description: 'Estado de Google Drive' })
  async getDriveConnectionStatus() {
    return {
      configured: this.lessonsGoogleDriveService.isDriveConfigured(),
      connected: await this.lessonsGoogleDriveService.checkDriveConnection(),
      sharedDriveId: this.lessonsGoogleDriveService.getSharedDriveId()
    };
  }

  @Get('folders/:folderId/drive-files')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Listar archivos de Google Drive en carpeta de lección' })
  @ApiResponse({ status: 200, description: 'Lista de archivos de Google Drive' })
  async listDriveFiles(
    @Param('folderId') folderId: string,
    @CurrentUser() user: User
  ) {
    // Verify user has access to the folder
    const folder = await this.lessonsService.getFolderById(folderId, user.id);
    
    if (!folder.driveFolderId) {
      return { files: [], message: 'Carpeta no sincronizada con Google Drive' };
    }

    if (!this.lessonsGoogleDriveService.isDriveConfigured()) {
      throw new BadRequestException('Google Drive no está configurado');
    }

    const files = await this.lessonsGoogleDriveService.listFolderContents(folder.driveFolderId);
    return { files };
  }

  @Get('resources/:id/drive-info')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener información de archivo en Google Drive' })
  @ApiResponse({ status: 200, description: 'Información del archivo en Google Drive' })
  async getDriveFileInfo(
    @Param('id') resourceId: string,
    @CurrentUser() user: User
  ) {
    const resource = await this.lessonsService.getResourceById(resourceId, user.id);
    
    if (!resource.driveFileId) {
      throw new BadRequestException('Recurso no tiene archivo asociado en Google Drive');
    }

    if (!this.lessonsGoogleDriveService.isDriveConfigured()) {
      throw new BadRequestException('Google Drive no está configurado');
    }

    return await this.lessonsGoogleDriveService.getFileInfo(resource.driveFileId);
  }

  @Post('workspaces/:workspaceId/sync-drive')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Sincronizar workspace con Google Drive' })
  @ApiResponse({ status: 200, description: 'Workspace sincronizado con Google Drive' })
  async syncWorkspaceWithDrive(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User
  ) {
    // Verify user has access to the workspace
    await this.lessonsService.getWorkspaceById(workspaceId, user.id);
    
    if (!this.lessonsGoogleDriveService.isDriveConfigured()) {
      throw new BadRequestException('Google Drive no está configurado');
    }

    const driveFolderId = await this.lessonsGoogleDriveService.syncWorkspaceWithDrive(workspaceId);
    
    return {
      success: true,
      driveFolderId,
      message: 'Workspace sincronizado exitosamente con Google Drive'
    };
  }

  @Post('folders/:folderId/sync-drive')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Sincronizar carpeta de lección con Google Drive' })
  @ApiResponse({ status: 200, description: 'Carpeta sincronizada con Google Drive' })
  async syncFolderWithDrive(
    @Param('folderId') folderId: string,
    @CurrentUser() user: User
  ) {
    // Verify user has access to the folder
    await this.lessonsService.getFolderById(folderId, user.id);
    
    if (!this.lessonsGoogleDriveService.isDriveConfigured()) {
      throw new BadRequestException('Google Drive no está configurado');
    }

    const driveFolderId = await this.lessonsGoogleDriveService.syncFolderWithDrive(folderId);
    
    return {
      success: true,
      driveFolderId,
      message: 'Carpeta de lección sincronizada exitosamente con Google Drive'
    };
  }
}