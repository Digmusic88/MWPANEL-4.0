import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, In } from 'typeorm';
import { 
  LessonWorkspace, 
  LessonFolder, 
  LessonResource, 
  LessonResourceShare,
  LessonResourceAccessLog,
  LessonResourceType,
  LessonResourceVisibility 
} from '../entities';
import {
  CreateLessonWorkspaceDto,
  CreateLessonFolderDto,
  UpdateLessonFolderDto,
  CreateLessonResourceDto,
  UpdateLessonResourceDto,
  LessonResourceQueryDto,
  LessonWorkspaceQueryDto,
  LessonFolderQueryDto,
  ShareLessonResourceDto,
  ReorderLessonFoldersDto,
  ReorderLessonResourcesDto
} from '../dto';
import { GoogleDriveService } from '../../educational-resources/services/google-drive.service';
import { LessonsGoogleDriveService } from './lessons-google-drive.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    @InjectRepository(LessonWorkspace)
    private readonly workspaceRepository: Repository<LessonWorkspace>,
    
    @InjectRepository(LessonFolder)
    private readonly folderRepository: Repository<LessonFolder>,
    
    @InjectRepository(LessonResource)
    private readonly resourceRepository: Repository<LessonResource>,
    
    @InjectRepository(LessonResourceShare)
    private readonly shareRepository: Repository<LessonResourceShare>,
    
    @InjectRepository(LessonResourceAccessLog)
    private readonly accessLogRepository: Repository<LessonResourceAccessLog>,
    
    private readonly googleDriveService: GoogleDriveService,
    private readonly lessonsGoogleDriveService: LessonsGoogleDriveService,
  ) {
    this.logger.log('🔥 LessonsService initialized');
  }

  // ========================================
  // WORKSPACE OPERATIONS
  // ========================================

  async createWorkspace(dto: CreateLessonWorkspaceDto, userId: string): Promise<LessonWorkspace> {
    // Verificar que no existe ya un workspace para esta asignación
    const existingWorkspace = await this.workspaceRepository.findOne({
      where: { subjectAssignmentId: dto.subjectAssignmentId }
    });

    if (existingWorkspace) {
      // Si existe un workspace pero tiene driveFolderId, verificar si la carpeta realmente existe en Google Drive
      if (existingWorkspace.driveFolderId && this.lessonsGoogleDriveService.isDriveConfigured()) {
        try {
          // Intentar verificar si la carpeta existe en Google Drive
          await this.lessonsGoogleDriveService.getFileInfo(existingWorkspace.driveFolderId);
          // Si la carpeta existe, entonces el workspace es válido
          throw new BadRequestException('Ya existe un workspace para esta asignación de asignatura');
        } catch (error) {
          // Si la carpeta no existe en Google Drive, eliminar el registro huérfano y continuar
          this.logger.warn(`🗑️ Eliminando workspace huérfano con carpeta inexistente en Google Drive: ${existingWorkspace.id}`);
          await this.workspaceRepository.remove(existingWorkspace);
        }
      } else {
        // Si no tiene driveFolderId o Google Drive no está configurado, rechazar directamente
        throw new BadRequestException('Ya existe un workspace para esta asignación de asignatura');
      }
    }

    // Crear workspace en Google Drive si no se proporciona
    let driveFolderId = dto.driveFolderId;
    this.logger.log(`🎯 DEBUG createWorkspace - driveFolderId: ${driveFolderId}, isDriveConfigured: ${this.lessonsGoogleDriveService.isDriveConfigured()}`);
    if (!driveFolderId && this.lessonsGoogleDriveService.isDriveConfigured()) {
      this.logger.log(`🚀 DEBUG createWorkspace - Entering Google Drive creation path`);
      try {
        // Crear el workspace y sincronizar con Drive automáticamente después
        const workspace = this.workspaceRepository.create({
          subjectAssignmentId: dto.subjectAssignmentId,
          isActive: dto.isActive ?? true,
        });
        
        const savedWorkspace = await this.workspaceRepository.save(workspace);
        this.logger.log(`🚀 DEBUG createWorkspace - Saved workspace ${savedWorkspace.id}, about to sync with Drive`);
        
        // Sincronizar con Google Drive
        driveFolderId = await this.lessonsGoogleDriveService.syncWorkspaceWithDrive(savedWorkspace.id);
        
        return savedWorkspace;
      } catch (error) {
        this.logger.error('❌ Error creating Google Drive workspace folder:', error);
        this.logger.error('❌ Error details:', error.message);
        this.logger.error('❌ Error stack:', error.stack);
        // Continuar sin carpeta de Drive si hay error
      }
    }

    const workspace = this.workspaceRepository.create({
      subjectAssignmentId: dto.subjectAssignmentId,
      driveFolderId,
      isActive: dto.isActive ?? true,
    });

    return await this.workspaceRepository.save(workspace);
  }

  async getWorkspaces(query: LessonWorkspaceQueryDto, userId: string): Promise<LessonWorkspace[]> {
    console.log('🔥🔥🔥 LESSONS SERVICE - getWorkspaces EJECUTÁNDOSE 🔥🔥🔥');
    this.logger.log(`🚀 getWorkspaces called with userId: ${userId}, query: ${JSON.stringify(query)}`);
    const baseRelations = [
      'subjectAssignment',
      'subjectAssignment.subject',
      'subjectAssignment.classGroup',
      'subjectAssignment.teacher',
      'subjectAssignment.teacher.user',
      'subjectAssignment.teacher.user.profile',
      'subjectAssignment.academicYear'
    ];

    // Incluir folders si se solicita
    if (query.includeFolders) {
      baseRelations.push('folders');
    }

    // Incluir estadísticas si se solicita
    if (query.includeStats) {
      baseRelations.push('folders.resources');
    }

    const findOptions: FindManyOptions<LessonWorkspace> = {
      where: {},
      relations: baseRelations
    };

    if (query.isActive !== undefined) {
      findOptions.where = { ...findOptions.where, isActive: query.isActive };
    }

    if (query.isArchived !== undefined) {
      this.logger.log(`🔍 Adding isArchived filter: ${query.isArchived} (type: ${typeof query.isArchived})`);
      findOptions.where = { ...findOptions.where, isArchived: query.isArchived };
    }

    this.logger.log(`🔍 Final findOptions.where: ${JSON.stringify(findOptions.where)}`);
    const workspaces = await this.workspaceRepository.find(findOptions);
    this.logger.log(`📊 Found ${workspaces.length} workspaces from database`);
    
    // Filtrar workspaces por usuario - solo devolver workspaces del profesor actual
    if (userId && Array.isArray(workspaces)) {
      // Filtrar por user.id del teacher en la relación subjectAssignment
      const filteredWorkspaces = workspaces.filter(workspace => {
        if (!workspace || !workspace.subjectAssignment || !workspace.subjectAssignment.teacher || !workspace.subjectAssignment.teacher.user) {
          this.logger.warn(`⚠️ Workspace ${workspace?.id} missing required relations`);
          return false;
        }
        const teacherUserId = workspace.subjectAssignment.teacher.user.id;
        this.logger.log(`🔍 Workspace ${workspace.id}: teacherUserId=${teacherUserId}, currentUserId=${userId}`);
        return teacherUserId === userId;
      });
      this.logger.log(`🎯 Filtered workspaces for userId ${userId}: ${filteredWorkspaces.length} of ${workspaces.length}`);
      return filteredWorkspaces;
    }

    return workspaces;
  }

  async getWorkspaceById(id: string, userId: string): Promise<LessonWorkspace> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
      relations: ['folders']
    });

    if (!workspace) {
      throw new NotFoundException('Workspace no encontrado');
    }

    // TODO: Verificar permisos del usuario

    return workspace;
  }

  async deleteWorkspace(id: string, userId: string): Promise<void> {
    const workspace = await this.getWorkspaceById(id, userId);

    // Eliminar carpeta de Google Drive si existe
    if (workspace.driveFolderId) {
      try {
        await this.lessonsGoogleDriveService.deleteFolder(workspace.driveFolderId);
      } catch (error) {
        console.error('Error deleting Google Drive workspace folder:', error);
        // Continuar con la eliminación aunque falle Drive
      }
    }

    await this.workspaceRepository.remove(workspace);
  }

  async archiveWorkspace(id: string, userId: string): Promise<LessonWorkspace> {
    const workspace = await this.getWorkspaceById(id, userId);
    
    workspace.isArchived = true;
    workspace.isActive = false; // También marcarlo como inactivo
    
    return await this.workspaceRepository.save(workspace);
  }

  async unarchiveWorkspace(id: string, userId: string): Promise<LessonWorkspace> {
    const workspace = await this.getWorkspaceById(id, userId);
    
    workspace.isArchived = false;
    workspace.isActive = true; // También marcarlo como activo
    
    return await this.workspaceRepository.save(workspace);
  }

  async cloneWorkspace(id: string, newAcademicYearId: string, userId: string): Promise<LessonWorkspace> {
    const originalWorkspace = await this.workspaceRepository.findOne({
      where: { id },
      relations: [
        'subjectAssignment',
        'subjectAssignment.subject',
        'subjectAssignment.classGroup',
        'subjectAssignment.teacher',
        'subjectAssignment.teacher.user',
        'subjectAssignment.teacher.user.profile',
        'folders',
        'folders.resources'
      ]
    });

    if (!originalWorkspace) {
      throw new NotFoundException('Workspace no encontrado');
    }

    // TODO: Crear una nueva SubjectAssignment para el nuevo año académico
    // Por ahora, usaremos la misma assignment (esto debería mejorarse)
    
    // Crear el nuevo workspace
    const newWorkspace = this.workspaceRepository.create({
      subjectAssignmentId: originalWorkspace.subjectAssignmentId, // TODO: Usar nueva assignment
      isActive: true,
      isArchived: false,
    });

    const savedWorkspace = await this.workspaceRepository.save(newWorkspace);

    // Clonar carpetas y estructura (pero no los archivos por ahora)
    if (originalWorkspace.folders && originalWorkspace.folders.length > 0) {
      for (const folder of originalWorkspace.folders) {
        await this.createFolder(savedWorkspace.id, {
          name: folder.name,
          description: folder.description,
          orderIndex: folder.orderIndex,
          isActive: true
        }, userId);
      }
    }

    // Crear carpeta en Google Drive para el nuevo workspace
    if (this.lessonsGoogleDriveService.isDriveConfigured()) {
      try {
        await this.lessonsGoogleDriveService.syncWorkspaceWithDrive(savedWorkspace.id);
      } catch (error) {
        console.error('Error creating Google Drive folder for cloned workspace:', error);
      }
    }

    return savedWorkspace;
  }

  // ========================================
  // FOLDER OPERATIONS
  // ========================================

  async createFolder(workspaceId: string, dto: CreateLessonFolderDto, userId: string): Promise<LessonFolder> {
    const workspace = await this.getWorkspaceById(workspaceId, userId);

    // Crear carpeta de lección en Google Drive automáticamente
    let driveFolderId = dto.driveFolderId;
    if (!driveFolderId && this.lessonsGoogleDriveService.isDriveConfigured()) {
      try {
        // Asegurar que el workspace tenga carpeta en Drive
        if (!workspace.driveFolderId) {
          await this.lessonsGoogleDriveService.syncWorkspaceWithDrive(workspace.id);
          // Refrescar workspace data
          const updatedWorkspace = await this.workspaceRepository.findOne({ where: { id: workspaceId } });
          if (updatedWorkspace) {
            workspace.driveFolderId = updatedWorkspace.driveFolderId;
          }
        }

        // Crear carpeta de lección
        if (workspace.driveFolderId) {
          driveFolderId = await this.lessonsGoogleDriveService.createLessonFolder(
            workspace.driveFolderId,
            dto.name
          );
        }
      } catch (error) {
        console.error('Error creating Google Drive lesson folder:', error);
      }
    }

    // Calcular orderIndex si no se proporciona
    let orderIndex = dto.orderIndex;
    if (orderIndex === undefined) {
      const maxOrder = await this.folderRepository
        .createQueryBuilder('folder')
        .select('MAX(folder.orderIndex)', 'max')
        .where('folder.workspaceId = :workspaceId', { workspaceId })
        .getRawOne();
      
      orderIndex = (maxOrder?.max || 0) + 1;
    }

    const folder = this.folderRepository.create({
      workspaceId,
      name: dto.name,
      description: dto.description,
      orderIndex,
      driveFolderId,
      isActive: dto.isActive ?? true,
    });

    return await this.folderRepository.save(folder);
  }

  async getFolders(query: LessonFolderQueryDto, userId: string): Promise<LessonFolder[]> {
    const findOptions: FindManyOptions<LessonFolder> = {
      where: {},
      relations: query.includeResources ? ['resources'] : [],
      order: {}
    };

    if (query.workspaceId) {
      findOptions.where = { ...findOptions.where, workspaceId: query.workspaceId };
    }

    if (query.isActive !== undefined) {
      findOptions.where = { ...findOptions.where, isActive: query.isActive };
    }

    // Ordenamiento
    findOptions.order[query.sortBy] = query.sortOrder;

    return await this.folderRepository.find(findOptions);
  }

  async getFolderById(id: string, userId: string): Promise<LessonFolder> {
    const folder = await this.folderRepository.findOne({
      where: { id },
      relations: ['resources', 'workspace']
    });

    if (!folder) {
      throw new NotFoundException('Carpeta no encontrada');
    }

    // TODO: Verificar permisos del usuario

    return folder;
  }

  async updateFolder(id: string, dto: UpdateLessonFolderDto, userId: string): Promise<LessonFolder> {
    const folder = await this.getFolderById(id, userId);

    // Actualizar campos
    if (dto.name !== undefined) folder.name = dto.name;
    if (dto.description !== undefined) folder.description = dto.description;
    if (dto.orderIndex !== undefined) folder.orderIndex = dto.orderIndex;
    if (dto.isActive !== undefined) folder.isActive = dto.isActive;

    return await this.folderRepository.save(folder);
  }

  async deleteFolder(id: string, userId: string): Promise<void> {
    const folder = await this.getFolderById(id, userId);

    // Eliminar carpeta de Google Drive si existe
    if (folder.driveFolderId) {
      try {
        await this.lessonsGoogleDriveService.deleteFolder(folder.driveFolderId);
      } catch (error) {
        console.error('Error deleting Google Drive lesson folder:', error);
      }
    }

    await this.folderRepository.remove(folder);
  }

  async reorderFolders(workspaceId: string, dto: ReorderLessonFoldersDto, userId: string): Promise<void> {
    const workspace = await this.getWorkspaceById(workspaceId, userId);

    // Verificar que todas las carpetas pertenecen al workspace
    const folders = await this.folderRepository.find({
      where: { 
        id: In(dto.folderIds),
        workspaceId 
      }
    });

    if (folders.length !== dto.folderIds.length) {
      throw new BadRequestException('Algunas carpetas no pertenecen al workspace especificado');
    }

    // Actualizar orderIndex según el nuevo orden
    const updatePromises = dto.folderIds.map((folderId, index) => {
      return this.folderRepository.update(folderId, { orderIndex: index + 1 });
    });

    await Promise.all(updatePromises);
  }

  // ========================================
  // RESOURCE OPERATIONS
  // ========================================

  async createResource(folderId: string, dto: CreateLessonResourceDto, userId: string): Promise<LessonResource> {
    const folder = await this.getFolderById(folderId, userId);

    // Calcular orderIndex si no se proporciona
    let orderIndex = dto.orderIndex;
    if (orderIndex === undefined) {
      const maxOrder = await this.resourceRepository
        .createQueryBuilder('resource')
        .select('MAX(resource.orderIndex)', 'max')
        .where('resource.lessonFolderId = :folderId', { folderId })
        .getRawOne();
      
      orderIndex = (maxOrder?.max || 0) + 1;
    }

    const resource = this.resourceRepository.create({
      lessonFolderId: folderId,
      createdById: userId,
      title: dto.name,
      description: dto.description,
      type: dto.type,
      visibility: dto.visibility,
      orderIndex,
      isActive: dto.isActive ?? true,
    });

    // Handle TSX-specific fields if it's a TSX artifact
    if (dto.type === LessonResourceType.TSX_ARTIFACT) {
      const tsxDto = dto as any; // Type assertion since we know it's a TSX DTO
      if (tsxDto.sourceCode) {
        resource.tsxCode = tsxDto.sourceCode;
      }
      if (tsxDto.componentProps) {
        resource.tsxProps = tsxDto.componentProps;
      }
      if (tsxDto.dependencies) {
        resource.tsxDependencies = tsxDto.dependencies;
      }
      if (tsxDto.styles) {
        resource.tsxStyles = tsxDto.styles;
      }
    }

    // Handle other resource type specific fields
    if (dto.type === LessonResourceType.INTERNAL_DOC) {
      const docDto = dto as any;
      if (docDto.htmlContent) {
        resource.internalContent = docDto.htmlContent;
      }
    }

    if (dto.type === LessonResourceType.WEB_LINK || dto.type === LessonResourceType.YOUTUBE_LINK) {
      const linkDto = dto as any;
      if (linkDto.url) {
        resource.externalUrl = linkDto.url;
      }
    }

    return await this.resourceRepository.save(resource);
  }

  async getResources(query: LessonResourceQueryDto, userId: string): Promise<{ data: LessonResource[]; total: number }> {
    const queryBuilder = this.resourceRepository.createQueryBuilder('resource')
      .leftJoinAndSelect('resource.createdBy', 'createdBy')
      .leftJoinAndSelect('resource.lessonFolder', 'folder');

    // Filtros
    if (query.folderId) {
      queryBuilder.andWhere('resource.lessonFolderId = :folderId', { folderId: query.folderId });
    }

    if (query.type) {
      queryBuilder.andWhere('resource.type = :type', { type: query.type });
    }

    if (query.visibility) {
      queryBuilder.andWhere('resource.visibility = :visibility', { visibility: query.visibility });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('resource.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(resource.name ILIKE :search OR resource.description ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    if (query.tags && query.tags.length > 0) {
      // Búsqueda en JSON tags
      const tagConditions = query.tags.map((tag, index) => 
        `resource.tags::text ILIKE :tag${index}`
      ).join(' OR ');
      
      const tagParams = {};
      query.tags.forEach((tag, index) => {
        tagParams[`tag${index}`] = `%"${tag}"%`;
      });
      
      queryBuilder.andWhere(`(${tagConditions})`, tagParams);
    }

    if (query.ownOnly) {
      queryBuilder.andWhere('resource.createdById = :userId', { userId });
    }

    if (query.includeShared) {
      // Incluir recursos compartidos conmigo
      queryBuilder.orWhere(
        'EXISTS (SELECT 1 FROM lesson_resource_shares lrs WHERE lrs.resource_id = resource.id AND lrs.shared_with_id = :userId)',
        { userId }
      );
    }

    // Ordenamiento
    queryBuilder.orderBy(`resource.${query.sortBy}`, query.sortOrder);

    // Paginación
    const offset = (query.page - 1) * query.limit;
    queryBuilder.skip(offset).take(query.limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async getResourceById(id: string, userId: string): Promise<LessonResource> {
    // Validar parámetros de entrada
    if (!id) {
      throw new BadRequestException('Resource ID is required');
    }
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const resource = await this.resourceRepository.findOne({
      where: { id },
      relations: ['createdBy', 'lessonFolder', 'shares', 'accessLogs']
    });

    if (!resource) {
      throw new NotFoundException('Recurso no encontrado');
    }

    // Verificar permisos de acceso
    await this.checkResourceAccess(resource, userId);

    // Registrar acceso (solo si el recurso existe y los parámetros son válidos)
    await this.logResourceAccess(resource.id, userId, 'view');

    return resource;
  }

  async updateResource(id: string, dto: UpdateLessonResourceDto, userId: string): Promise<LessonResource> {
    // Validar que el ID no sea nulo
    if (!id) {
      throw new BadRequestException('Resource ID is required');
    }

    const resource = await this.getResourceById(id, userId);

    // Verificar permisos de edición
    if (resource.createdById !== userId) {
      // Verificar si tiene permisos de edición por compartir
      const share = await this.shareRepository.findOne({
        where: {
          resourceId: id,
          sharedWithId: userId,
          permissionLevel: In(['edit', 'admin'])
        }
      });

      if (!share || share.isExpired) {
        throw new ForbiddenException('No tienes permisos para editar este recurso');
      }
    }

    // Actualizar campos básicos
    if (dto.name !== undefined) resource.title = dto.name;
    if (dto.description !== undefined) resource.description = dto.description;
    if (dto.visibility !== undefined) resource.visibility = dto.visibility;
    if (dto.orderIndex !== undefined) resource.orderIndex = dto.orderIndex;
    if (dto.isActive !== undefined) resource.isActive = dto.isActive;

    // *** CRITICAL FIX: Handle TSX-specific fields for updates ***
    let tsxCodeUpdate = null;
    let tsxPropsUpdate = null;
    let tsxDependenciesUpdate = null;
    let tsxStylesUpdate = null;

    // Check if this is a TSX artifact update by checking if sourceCode is present
    const tsxDto = dto as any; // Type assertion to access sourceCode field
    if (tsxDto.sourceCode !== undefined) {
      console.log(`🔧 [UPDATE] Processing TSX artifact update, sourceCode length: ${tsxDto.sourceCode?.length || 0}`);
      tsxCodeUpdate = tsxDto.sourceCode;
    }
    if (tsxDto.componentProps !== undefined) {
      tsxPropsUpdate = tsxDto.componentProps;
    }
    if (tsxDto.dependencies !== undefined) {
      tsxDependenciesUpdate = tsxDto.dependencies;
    }
    if (tsxDto.customStyles !== undefined) {
      tsxStylesUpdate = tsxDto.customStyles;
    }

    // Use enhanced SQL query that includes TSX fields with correct column names
    console.log('🔧 [SQL] About to execute update query with parameters:', {
      id,
      title: resource.title,
      description: resource.description,
      visibility: resource.visibility,
      orderIndex: resource.orderIndex,
      isActive: resource.isActive,
      hasTsxCodeUpdate: !!tsxCodeUpdate,
      tsxCodeLength: tsxCodeUpdate?.length || 0,
      hasTsxPropsUpdate: !!tsxPropsUpdate,
      hasTsxDependenciesUpdate: !!tsxDependenciesUpdate,
      hasTsxStylesUpdate: !!tsxStylesUpdate
    });
    
    try {
      await this.resourceRepository.query(
        `UPDATE lesson_resources 
         SET title = $1, description = $2, visibility = $3, order_index = $4, is_active = $5,
             tsx_source_code = COALESCE($7, tsx_source_code),
             tsx_component_props = COALESCE($8, tsx_component_props),
             tsx_dependencies = COALESCE($9, tsx_dependencies),
             tsx_styles = COALESCE($10, tsx_styles),
             updated_at = NOW()
         WHERE id = $6`,
        [
          resource.title,
          resource.description,
          resource.visibility,
          resource.orderIndex,
          resource.isActive,
          id,
          tsxCodeUpdate,
          tsxPropsUpdate,
          tsxDependenciesUpdate,
          tsxStylesUpdate
        ]
      );
      console.log('✅ [SQL] Raw SQL update query executed successfully');
    } catch (sqlError) {
      console.error('❌ [SQL] Raw SQL update query failed:', sqlError);
      console.error('❌ [SQL] Error details:', {
        message: sqlError.message,
        code: sqlError.code,
        detail: sqlError.detail,
        hint: sqlError.hint
      });
      throw sqlError;
    }

    console.log(`✅ [UPDATE] Resource ${id} updated with TSX fields:`, {
      hasSourceCode: !!tsxCodeUpdate,
      sourceCodeLength: tsxCodeUpdate?.length || 0,
      hasProps: !!tsxPropsUpdate,
      hasDependencies: !!tsxDependenciesUpdate,
      hasStyles: !!tsxStylesUpdate
    });

    // Devolver el recurso completo actualizado usando raw SQL para evitar mapeo de TypeORM
    console.log('🔍 [SQL] Fetching updated resource with raw SQL query');
    try {
      const rawResults = await this.resourceRepository.query(
        `SELECT 
           lr.*,
           u.id as "createdBy_id", u.email as "createdBy_email", u.role as "createdBy_role",
           lf.id as "lessonFolder_id", lf.name as "lessonFolder_name"
         FROM lesson_resources lr
         LEFT JOIN users u ON lr.created_by_id = u.id
         LEFT JOIN lesson_folders lf ON lr.lesson_folder_id = lf.id
         WHERE lr.id = $1`,
        [id]
      );
      
      if (!rawResults || rawResults.length === 0) {
        throw new NotFoundException('Recurso no encontrado después de actualización');
      }
      
      const rawResource = rawResults[0];
      console.log('✅ [SQL] Raw resource fetch successful, tsx_source_code length:', rawResource.tsx_source_code?.length || 0);
      
      // Map raw result to LessonResource entity instance
      const updatedResource = new LessonResource();
      updatedResource.id = rawResource.id;
      updatedResource.lessonFolderId = rawResource.lesson_folder_id;
      updatedResource.type = rawResource.type;
      updatedResource.title = rawResource.title;
      updatedResource.description = rawResource.description;
      updatedResource.driveFileId = rawResource.drive_file_id;
      updatedResource.fileName = rawResource.file_name;
      updatedResource.mimeType = rawResource.mime_type;
      updatedResource.fileSize = rawResource.file_size;
      updatedResource.webViewLink = rawResource.web_view_link;
      updatedResource.downloadLink = rawResource.download_link;
      updatedResource.externalUrl = rawResource.external_url;
      updatedResource.internalContent = rawResource.internal_content;
      updatedResource.tsxCode = rawResource.tsx_source_code;
      updatedResource.tsxProps = rawResource.tsx_component_props;
      updatedResource.tsxDependencies = rawResource.tsx_dependencies;
      updatedResource.tsxStyles = rawResource.tsx_styles;
      updatedResource.orderIndex = rawResource.order_index;
      updatedResource.isActive = rawResource.is_active;
      updatedResource.visibility = rawResource.visibility;
      updatedResource.viewCount = rawResource.view_count;
      updatedResource.downloadCount = rawResource.download_count;
      updatedResource.createdById = rawResource.created_by_id;
      updatedResource.createdAt = rawResource.created_at;
      updatedResource.updatedAt = rawResource.updated_at;
      
      // Populate relations if data is available
      if (rawResource.createdBy_id) {
        updatedResource.createdBy = {
          id: rawResource.createdBy_id,
          email: rawResource.createdBy_email,
          role: rawResource.createdBy_role
        } as any;
      }
      
      if (rawResource.lessonFolder_id) {
        updatedResource.lessonFolder = {
          id: rawResource.lessonFolder_id,
          name: rawResource.lessonFolder_name
        } as any;
      }
      
      updatedResource.shares = []; // Will be populated by separate query if needed
      updatedResource.accessLogs = []; // Will be populated by separate query if needed
      
      console.log('🔍 [MAPPING] Mapped resource object - tsxCode length:', updatedResource.tsxCode?.length || 0);
      return updatedResource;
      
    } catch (rawQueryError) {
      console.error('❌ [SQL] Raw resource fetch query failed:', rawQueryError);
      throw rawQueryError;
    }
  }

  async deleteResource(id: string, userId: string): Promise<void> {
    const resource = await this.getResourceById(id, userId);

    // Solo el creador puede eliminar
    if (resource.createdById !== userId) {
      throw new ForbiddenException('Solo el creador puede eliminar este recurso');
    }

    // Eliminar archivo de Google Drive si existe
    if (resource.driveFileId) {
      try {
        await this.googleDriveService.deleteFile(resource.driveFileId);
      } catch (error) {
        console.error('Error deleting Google Drive file:', error);
      }
    }

    await this.resourceRepository.remove(resource);
  }

  async reorderResources(folderId: string, dto: ReorderLessonResourcesDto, userId: string): Promise<void> {
    const folder = await this.getFolderById(folderId, userId);

    // Verificar que todos los recursos pertenecen a la carpeta
    const resources = await this.resourceRepository.find({
      where: { 
        id: In(dto.resourceIds),
        lessonFolderId: folderId 
      }
    });

    if (resources.length !== dto.resourceIds.length) {
      throw new BadRequestException('Algunos recursos no pertenecen a la carpeta especificada');
    }

    // Actualizar orderIndex según el nuevo orden
    const updatePromises = dto.resourceIds.map((resourceId, index) => {
      return this.resourceRepository.update(resourceId, { orderIndex: index + 1 });
    });

    await Promise.all(updatePromises);
  }

  // ========================================
  // SHARING OPERATIONS
  // ========================================

  async shareResource(id: string, dto: ShareLessonResourceDto, userId: string): Promise<LessonResourceShare> {
    const resource = await this.getResourceById(id, userId);

    // Solo el creador puede compartir
    if (resource.createdById !== userId) {
      throw new ForbiddenException('Solo el creador puede compartir este recurso');
    }

    // Verificar que no existe ya un share activo
    const existingShare = await this.shareRepository.findOne({
      where: {
        resourceId: id,
        sharedWithId: dto.sharedWithId
      }
    });

    if (existingShare && existingShare.isActive) {
      throw new BadRequestException('El recurso ya está compartido con este usuario');
    }

    const share = this.shareRepository.create({
      resourceId: id,
      sharedWithId: dto.sharedWithId,
      sharedById: userId,
      permissionLevel: dto.permissionLevel,
      expiresAt: dto.expiresAt,
    });

    // Registrar acción de compartir
    await this.logResourceAccess(id, userId, 'share');

    return await this.shareRepository.save(share);
  }

  async unshareResource(id: string, sharedWithId: string, userId: string): Promise<void> {
    const resource = await this.getResourceById(id, userId);

    // Solo el creador puede quitar el compartir
    if (resource.createdById !== userId) {
      throw new ForbiddenException('Solo el creador puede quitar el compartir');
    }

    const share = await this.shareRepository.findOne({
      where: {
        resourceId: id,
        sharedWithId,
        sharedById: userId
      }
    });

    if (!share) {
      throw new NotFoundException('Compartir no encontrado');
    }

    await this.shareRepository.remove(share);
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private async checkResourceAccess(resource: LessonResource, userId: string): Promise<void> {
    // Es el creador
    if (resource.createdById === userId) {
      return;
    }

    // Verificar si está compartido conmigo
    const share = await this.shareRepository.findOne({
      where: {
        resourceId: resource.id,
        sharedWithId: userId
      }
    });

    if (share && share.isActive) {
      return;
    }

    // Verificar permisos por visibilidad
    switch (resource.visibility) {
      case LessonResourceVisibility.PUBLIC:
        return; // Acceso público
      
      case LessonResourceVisibility.CLASS:
        // TODO: Verificar que pertenece a la misma clase
        return;
      
      case LessonResourceVisibility.SCHOOL:
        // TODO: Verificar que pertenece a la misma escuela
        return;
      
        // TODO: Verificar que pertenece a la misma clase
      
      case LessonResourceVisibility.PRIVATE:
      default:
        throw new ForbiddenException('No tienes permisos para acceder a este recurso');
    }
  }

  private async logResourceAccess(resourceId: string, userId: string, action: string, ipAddress?: string, userAgent?: string): Promise<void> {
    // Validar parámetros requeridos
    if (!resourceId || !userId || !action) {
      this.logger.warn(`⚠️ Skipping access log due to missing parameters: resourceId=${resourceId}, userId=${userId}, action=${action}`);
      return; // Don't throw error, just skip logging
    }

    try {
      const log = this.accessLogRepository.create({
        resourceId,
        userId,
        action,
        ipAddress,
        userAgent,
      });

      await this.accessLogRepository.save(log);
      this.logger.log(`✅ Access log created: resource=${resourceId}, user=${userId}, action=${action}`);
    } catch (error) {
      this.logger.error(`❌ Failed to create access log: resource=${resourceId}, user=${userId}, action=${action}`, error);
      // Silently fail to prevent breaking the main operation
      // Log access failures shouldn't break resource operations
    }
  }

  async updateResourceWithFileData(resourceId: string, fileData: {
    driveFileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    webViewLink: string;
    downloadLink: string;
  }): Promise<void> {
    await this.resourceRepository.update(resourceId, {
      driveFileId: fileData.driveFileId,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      mimeType: fileData.mimeType,
      webViewLink: fileData.webViewLink,
      downloadLink: fileData.downloadLink
    });
  }
}