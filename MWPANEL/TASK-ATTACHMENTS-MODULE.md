# 📎 MÓDULO DE ARCHIVOS ADJUNTOS - ESPECIFICACIÓN TÉCNICA COMPLETA

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura Técnica](#arquitectura-técnica)
3. [Backend - Implementación Detallada](#backend-implementación-detallada)
4. [Frontend - Implementación Detallada](#frontend-implementación-detallada)
5. [Roadmap de Implementación](#roadmap-de-implementación)
6. [Guías de Implementación Paso a Paso](#guías-de-implementación-paso-a-paso)
7. [Seguridad y Permisos](#seguridad-y-permisos)
8. [Optimización y Rendimiento](#optimización-y-rendimiento)
9. [Estimaciones de Costos](#estimaciones-de-costos)
10. [Apéndices](#apéndices)

---

## 🎯 RESUMEN EJECUTIVO

### Objetivo Principal
Desarrollar un sistema completo de gestión de archivos adjuntos para tareas y actividades educativas, integrado con Google Drive, que permita a estudiantes subir sus entregas y a profesores gestionar material de apoyo, todo dentro de una interfaz visual tipo Google Drive.

### Características Principales
- 🗂️ **Explorador visual de archivos** tipo Google Drive
- 📁 **Estructura de carpetas organizada** por año escolar, asignatura y tarea
- 🔒 **Permisos granulares** basados en roles (estudiante, profesor, admin)
- 🔍 **Búsqueda avanzada** con posibilidad de OCR
- 📊 **Auditoría completa** de todas las acciones
- 💾 **Integración nativa** con Google Drive compartido
- 🎨 **Interfaz moderna** con drag & drop y vistas múltiples

### Stack Tecnológico
- **Backend**: NestJS + TypeORM + PostgreSQL
- **Frontend**: React + TypeScript + TailwindCSS + Ant Design
- **Storage**: Google Drive API (unidad compartida existente)
- **Cache**: Redis (existente)
- **Queue**: Bull Queue (para procesamiento asíncrono)
- **Search**: PostgreSQL FTS → Elasticsearch (futuro)

---

## 🏗️ ARQUITECTURA TÉCNICA

### Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  DriveExplorer │ FileGrid/List │ Preview │ Upload │ Search     │
└────────────────┴────────────────┴─────────┴────────┴───────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (NestJS)                        │
├─────────────────────────────────────────────────────────────────┤
│  Auth Guard │ Permission Guard │ Rate Limiter │ Validation      │
└─────────────┴─────────────────┴──────────────┴─────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   TASK ATTACHMENTS SERVICE   │   │    GOOGLE DRIVE SERVICE     │
├─────────────────────────────┤   ├─────────────────────────────┤
│ • Upload/Download            │   │ • File Operations           │
│ • Permissions                │   │ • Folder Management         │
│ • Versioning                 │   │ • Sharing                   │
│ • Comments                   │   │ • Thumbnails                │
└─────────────────────────────┘   └─────────────────────────────┘
                    │                               │
                    ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│       PostgreSQL DB          │   │     Google Drive API        │
├─────────────────────────────┤   ├─────────────────────────────┤
│ • Metadata                   │   │ • File Storage              │
│ • Permissions               │   │ • Folder Structure          │
│ • Audit Logs                │   │ • Shared Drive              │
│ • Cache                     │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
```

### Flujo de Datos Principal

1. **Upload de Archivo**:
   ```
   Usuario → Frontend Upload → API Validation → Permission Check 
   → Google Drive Upload → DB Metadata Save → Cache Update → Response
   ```

2. **Navegación de Carpetas**:
   ```
   Usuario → Folder Click → Check Cache → If Miss: Drive API 
   → Update Cache → Filter by Permissions → Return Contents
   ```

3. **Búsqueda**:
   ```
   Usuario → Search Query → Permission Filter → DB Search 
   → Optional: Elasticsearch → Return Results with Highlights
   ```

---

## 💻 BACKEND - IMPLEMENTACIÓN DETALLADA

### 📁 Estructura de Módulos

```
backend/src/modules/task-attachments/
├── controllers/
│   ├── task-attachments.controller.ts
│   ├── folder-navigation.controller.ts
│   └── search.controller.ts
├── services/
│   ├── task-attachments.service.ts
│   ├── permissions.service.ts
│   ├── folder-cache.service.ts
│   ├── audit.service.ts
│   └── search.service.ts
├── entities/
│   ├── task-attachment.entity.ts
│   ├── attachment-log.entity.ts
│   ├── attachment-comment.entity.ts
│   ├── folder-cache.entity.ts
│   └── share-link.entity.ts
├── dto/
│   ├── create-attachment.dto.ts
│   ├── update-attachment.dto.ts
│   ├── folder-contents.dto.ts
│   ├── search-filters.dto.ts
│   └── share-options.dto.ts
├── guards/
│   └── attachment-permission.guard.ts
└── task-attachments.module.ts
```

### 🗄️ Entidades de Base de Datos

#### 1. TaskAttachment Entity
```typescript
@Entity('task_attachments')
@Index(['taskId', 'attachmentType'])
@Index(['academicYear', 'subjectId'])
export class TaskAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  taskId: string;

  @Column()
  @Index()
  academicYear: string; // "2024-2025"

  @Column({ type: 'enum', enum: ['instruction', 'submission'] })
  attachmentType: AttachmentType;

  @Column()
  fileName: string;

  @Column()
  normalizedFileName: string; // Sin tildes ni espacios

  @Column()
  mimeType: string;

  @Column('bigint')
  fileSize: number;

  // Google Drive Integration
  @Column()
  driveFileId: string;

  @Column()
  driveFolderId: string;

  @Column()
  webViewLink: string;

  @Column()
  downloadLink: string;

  @Column({ nullable: true })
  thumbnailLink?: string;

  // Permissions & Sharing
  @Column()
  uploadedById: string;

  @Column({ type: 'simple-array', nullable: true })
  sharedWith?: string[];

  @Column({ 
    type: 'enum', 
    enum: ['private', 'public', 'shared'],
    default: 'private'
  })
  visibility: 'private' | 'public' | 'shared';

  // Versioning
  @Column({ default: 1 })
  version: number;

  @Column({ nullable: true })
  previousVersionId?: string;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    originalFileName?: string;
    studentName?: string;
    taskName?: string;
    subject?: string;
    folderPath?: string[];
    tags?: string[];
    ocrText?: string;
    ocrProcessedAt?: Date;
  };

  // Status
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  uploadedBy: User;

  @ManyToOne(() => Task)
  task: Task;

  @ManyToOne(() => Subject)
  subject: Subject;

  @OneToMany(() => AttachmentLog, log => log.attachment)
  logs: AttachmentLog[];

  @OneToMany(() => AttachmentComment, comment => comment.attachment)
  comments: AttachmentComment[];
}
```

#### 2. AttachmentLog Entity (Auditoría)
```typescript
@Entity('attachment_logs')
@Index(['fileId', 'action', 'timestamp'])
@Index(['userId', 'timestamp'])
export class AttachmentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  fileId: string;

  @Column({ 
    type: 'enum', 
    enum: [
      'upload', 'view', 'download', 'delete', 'restore',
      'share', 'unshare', 'move', 'rename', 'version_create',
      'version_restore', 'comment_add', 'comment_delete',
      'permission_change', 'metadata_update'
    ] 
  })
  action: FileAction;

  @Column()
  performedById: string;

  @Column({ type: 'jsonb' })
  context: {
    ip: string;
    userAgent: string;
    browser?: string;
    os?: string;
    device?: string;
    location?: {
      country?: string;
      city?: string;
      coordinates?: [number, number];
    };
    sessionId?: string;
    requestId?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  details?: {
    previousValue?: any;
    newValue?: any;
    targetUserId?: string;
    targetPath?: string;
    shareOptions?: any;
    errorMessage?: string;
  };

  @CreateDateColumn()
  timestamp: Date;

  // Relations
  @ManyToOne(() => TaskAttachment)
  attachment: TaskAttachment;

  @ManyToOne(() => User)
  performedBy: User;
}
```

#### 3. FolderCache Entity
```typescript
@Entity('folder_cache')
@Index(['path'])
@Index(['driveFolderId', 'lastSyncedAt'])
export class FolderCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  path: string; // "/Archivos_Adjuntos/Tareas/2024-2025/5to_Primaria/Matematicas"

  @Column()
  @Index()
  driveFolderId: string;

  @Column({ nullable: true })
  parentId?: string;

  @Column()
  name: string;

  @Column()
  normalizedName: string; // Sin tildes ni espacios

  @Column()
  depth: number;

  @Column({ default: 0 })
  childrenCount: number;

  @Column({ default: 0 })
  filesCount: number;

  @Column('bigint', { default: 0 })
  totalSize: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    academicYear?: string;
    grade?: string;
    subject?: string;
    taskId?: string;
    taskName?: string;
    folderType?: 'root' | 'year' | 'grade' | 'subject' | 'task' | 'submissions' | 'materials';
    permissions?: {
      viewableBy?: string[]; // Role names or user IDs
      editableBy?: string[];
    };
  };

  @UpdateDateColumn()
  lastSyncedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
```

### 🔌 Servicios Principales

#### 1. TaskAttachmentsService
```typescript
@Injectable()
export class TaskAttachmentsService {
  private readonly logger = new Logger(TaskAttachmentsService.name);

  constructor(
    @InjectRepository(TaskAttachment)
    private attachmentRepository: Repository<TaskAttachment>,
    @InjectRepository(AttachmentLog)
    private logRepository: Repository<AttachmentLog>,
    @InjectRepository(FolderCache)
    private folderCacheRepository: Repository<FolderCache>,
    private googleDriveService: GoogleDriveService,
    private permissionsService: PermissionsService,
    private auditService: AuditService,
    @InjectQueue('file-processing')
    private fileQueue: Queue,
  ) {}

  /**
   * Upload de archivo con organización automática
   */
  async uploadAttachment(
    file: Express.Multer.File,
    metadata: CreateAttachmentDto,
    user: User,
    context: RequestContext
  ): Promise<TaskAttachment> {
    // 1. Validar permisos
    await this.permissionsService.validateAction(user, 'upload', metadata.taskId);

    // 2. Normalizar nombres
    const normalizedFileName = this.normalizeFileName(file.originalname);
    const studentFolderName = this.formatStudentName(user);

    // 3. Construir path según convenciones
    const path = await this.buildFilePath(metadata, user);
    
    // 4. Subir a Google Drive
    const driveResult = await this.googleDriveService.uploadFile(
      file.buffer,
      normalizedFileName,
      file.mimetype,
      path
    );

    // 5. Guardar metadata en BD
    const attachment = await this.attachmentRepository.save({
      ...metadata,
      fileName: file.originalname,
      normalizedFileName,
      mimeType: file.mimetype,
      fileSize: file.size,
      ...driveResult,
      uploadedById: user.id,
      metadata: {
        originalFileName: file.originalname,
        studentName: studentFolderName,
        taskName: metadata.taskName,
        subject: metadata.subject,
        folderPath: path,
      }
    });

    // 6. Actualizar cache de carpetas
    await this.updateFolderCache(path, driveResult.folderId);

    // 7. Log de auditoría
    await this.auditService.log('upload', attachment.id, user.id, context);

    // 8. Encolar procesamiento asíncrono
    if (this.shouldProcessFile(file.mimetype)) {
      await this.fileQueue.add('process-file', {
        attachmentId: attachment.id,
        driveFileId: driveResult.fileId,
        tasks: ['thumbnail', 'ocr', 'index']
      });
    }

    return attachment;
  }

  /**
   * Construir path según convenciones
   */
  private async buildFilePath(
    metadata: CreateAttachmentDto,
    user: User
  ): Promise<string[]> {
    const academicYear = await this.getCurrentAcademicYear();
    const task = await this.taskRepository.findOne(metadata.taskId);
    
    // Normalizar nombres
    const subjectName = this.normalizeName(metadata.subject);
    const taskFolder = `T${task.id.toString().padStart(3, '0')}-${this.normalizeName(task.title)}`;
    
    const basePath = ['Archivos_Adjuntos', 'Tareas', academicYear];

    if (metadata.attachmentType === 'submission') {
      // Entregas de estudiantes
      const grade = await this.getUserGrade(user.id);
      const gradeName = this.normalizeGradeName(grade);
      const studentName = this.formatStudentName(user);
      
      return [
        ...basePath,
        gradeName,
        subjectName,
        taskFolder,
        'Entregas',
        studentName
      ];
    } else {
      // Material del profesor
      return [
        ...basePath,
        subjectName,
        taskFolder,
        'Material_Profesor'
      ];
    }
  }

  /**
   * Normalización de nombres para carpetas
   */
  private normalizeName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
      .replace(/ñ/g, 'n')
      .replace(/Ñ/g, 'N')
      .replace(/[^a-zA-Z0-9]/g, '_') // Reemplazar caracteres especiales
      .replace(/_+/g, '_') // Eliminar múltiples guiones bajos
      .replace(/^_|_$/g, ''); // Eliminar guiones bajos al inicio/final
  }

  private formatStudentName(user: User): string {
    const profile = user.userProfile;
    if (!profile) return `Usuario_${user.id}`;

    const nombre = this.normalizeName(profile.nombre || '');
    const apellido1 = this.normalizeName(profile.apellido1 || '');
    const apellido2 = this.normalizeName(profile.apellido2 || '');

    return [nombre, apellido1, apellido2]
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('_');
  }

  /**
   * Listar contenido de carpeta con validación de permisos
   */
  async listFolderContents(
    folderId: string,
    user: User,
    options: ListOptions = {}
  ): Promise<FolderContentsDto> {
    // 1. Verificar cache
    const cachedFolder = await this.folderCacheRepository.findOne({
      where: { driveFolderId: folderId }
    });

    // 2. Validar permisos
    if (cachedFolder) {
      const hasAccess = await this.permissionsService.canViewFolder(
        user,
        cachedFolder
      );
      if (!hasAccess) {
        throw new ForbiddenException('No tienes permisos para ver esta carpeta');
      }
    }

    // 3. Obtener contenido
    let contents: DriveContents;
    
    if (cachedFolder && this.isCacheValid(cachedFolder)) {
      // Usar cache
      contents = await this.getContentsFromCache(folderId);
    } else {
      // Obtener de Google Drive
      contents = await this.googleDriveService.listFolderContents(folderId);
      
      // Actualizar cache
      await this.updateFolderCache(cachedFolder?.path, folderId, contents);
    }

    // 4. Filtrar por permisos
    const filtered = await this.filterContentsByPermissions(contents, user);

    // 5. Aplicar opciones (paginación, ordenamiento, filtros)
    const processed = this.applyListOptions(filtered, options);

    return {
      folderId,
      folderName: cachedFolder?.name,
      path: cachedFolder?.path,
      items: processed.items,
      totalCount: processed.total,
      hasMore: processed.hasMore,
      nextPageToken: processed.nextPageToken
    };
  }

  /**
   * Búsqueda con permisos
   */
  async searchAttachments(
    query: string,
    filters: SearchFiltersDto,
    user: User
  ): Promise<SearchResultsDto> {
    const qb = this.attachmentRepository.createQueryBuilder('attachment')
      .leftJoinAndSelect('attachment.uploadedBy', 'uploader')
      .leftJoinAndSelect('attachment.task', 'task')
      .where('attachment.isActive = :isActive', { isActive: true })
      .andWhere('attachment.isDeleted = :isDeleted', { isDeleted: false });

    // Búsqueda por nombre
    if (query) {
      qb.andWhere(
        '(attachment.fileName ILIKE :query OR attachment.metadata->\'ocrText\' ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    // Filtros
    if (filters.mimeTypes?.length) {
      qb.andWhere('attachment.mimeType IN (:...mimeTypes)', { 
        mimeTypes: filters.mimeTypes 
      });
    }

    if (filters.dateFrom) {
      qb.andWhere('attachment.createdAt >= :dateFrom', { 
        dateFrom: filters.dateFrom 
      });
    }

    if (filters.dateTo) {
      qb.andWhere('attachment.createdAt <= :dateTo', { 
        dateTo: filters.dateTo 
      });
    }

    // Aplicar permisos
    qb.andWhere(
      new Brackets(qb => {
        this.permissionsService.applyAttachmentPermissions(qb, user);
      })
    );

    // Paginación
    const total = await qb.getCount();
    const items = await qb
      .orderBy('attachment.createdAt', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getMany();

    return {
      items,
      total,
      page: filters.page,
      totalPages: Math.ceil(total / filters.limit),
      query,
      filters
    };
  }

  /**
   * Sistema de versiones
   */
  async createVersion(
    attachmentId: string,
    file: Express.Multer.File,
    user: User,
    context: RequestContext
  ): Promise<TaskAttachment> {
    const original = await this.attachmentRepository.findOne(attachmentId);
    
    if (!original) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Validar permisos
    await this.permissionsService.validateAction(user, 'edit', original);

    // Crear nueva versión
    const newVersion = await this.uploadAttachment(
      file,
      {
        ...original,
        version: original.version + 1,
        previousVersionId: original.id
      },
      user,
      context
    );

    // Log de auditoría
    await this.auditService.log('version_create', newVersion.id, user.id, {
      ...context,
      previousVersion: original.version,
      newVersion: newVersion.version
    });

    return newVersion;
  }

  /**
   * Mover a papelera
   */
  async moveToTrash(
    attachmentId: string,
    user: User,
    context: RequestContext
  ): Promise<void> {
    const attachment = await this.attachmentRepository.findOne(attachmentId);
    
    if (!attachment) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Validar permisos
    await this.permissionsService.validateAction(user, 'delete', attachment);

    // Mover a carpeta de papelera en Drive
    const trashFolderId = await this.getOrCreateTrashFolder();
    await this.googleDriveService.moveFile(
      attachment.driveFileId,
      trashFolderId
    );

    // Marcar como eliminado
    attachment.isDeleted = true;
    attachment.deletedAt = new Date();
    await this.attachmentRepository.save(attachment);

    // Log de auditoría
    await this.auditService.log('delete', attachmentId, user.id, context);

    // Programar eliminación permanente (30 días)
    await this.fileQueue.add(
      'schedule-permanent-delete',
      { attachmentId },
      { delay: 30 * 24 * 60 * 60 * 1000 }
    );
  }
}
```

#### 2. Google Drive Service Extendido
```typescript
@Injectable()
export class GoogleDriveService {
  // ... código existente ...

  /**
   * Listar contenido de carpeta con metadata completa
   */
  async listFolderContents(
    folderId: string,
    includeDeleted = false
  ): Promise<DriveContents> {
    try {
      const query = [
        `'${folderId}' in parents`,
        !includeDeleted && 'trashed = false'
      ].filter(Boolean).join(' and ');

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink,parents)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        orderBy: 'folder,name'
      });

      const files = response.data.files || [];
      
      // Separar carpetas y archivos
      const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
      const documents = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

      return {
        folders: folders.map(f => ({
          id: f.id,
          name: f.name,
          createdTime: f.createdTime,
          modifiedTime: f.modifiedTime,
          hasChildren: true // Se determina con otra llamada si es necesario
        })),
        files: documents.map(f => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: parseInt(f.size || '0'),
          createdTime: f.createdTime,
          modifiedTime: f.modifiedTime,
          webViewLink: f.webViewLink,
          thumbnailLink: f.thumbnailLink
        }))
      };
    } catch (error) {
      this.logger.error(`Error listing folder contents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Crear estructura de carpetas completa
   */
  async createFolderPath(pathArray: string[]): Promise<string> {
    let currentParentId = this.sharedDriveId;
    
    for (const folderName of pathArray) {
      currentParentId = await this.findOrCreateFolder(
        folderName,
        currentParentId
      );
    }
    
    return currentParentId;
  }

  /**
   * Mover archivo entre carpetas
   */
  async moveFile(fileId: string, newParentId: string): Promise<void> {
    try {
      // Obtener parents actuales
      const file = await this.drive.files.get({
        fileId: fileId,
        fields: 'parents',
        supportsAllDrives: true
      });

      const previousParents = file.data.parents?.join(',') || '';

      // Mover archivo
      await this.drive.files.update({
        fileId: fileId,
        addParents: newParentId,
        removeParents: previousParents,
        supportsAllDrives: true,
        fields: 'id, parents'
      });

      this.logger.log(`File ${fileId} moved to ${newParentId}`);
    } catch (error) {
      this.logger.error(`Error moving file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener árbol de carpetas
   */
  async getFolderTree(
    rootFolderId: string,
    maxDepth: number = 3,
    currentDepth: number = 0
  ): Promise<FolderNode> {
    if (currentDepth >= maxDepth) {
      return null;
    }

    const contents = await this.listFolderContents(rootFolderId);
    
    const children = await Promise.all(
      contents.folders.map(async folder => {
        const childNode = await this.getFolderTree(
          folder.id,
          maxDepth,
          currentDepth + 1
        );
        return {
          id: folder.id,
          name: folder.name,
          children: childNode?.children || [],
          metadata: {
            createdTime: folder.createdTime,
            modifiedTime: folder.modifiedTime
          }
        };
      })
    );

    return {
      id: rootFolderId,
      name: 'Root',
      children,
      metadata: {}
    };
  }

  /**
   * Generar thumbnail para archivo
   */
  async generateThumbnail(fileId: string): Promise<string> {
    try {
      // Google Drive genera automáticamente thumbnails para muchos tipos
      const file = await this.drive.files.get({
        fileId: fileId,
        fields: 'thumbnailLink',
        supportsAllDrives: true
      });

      if (file.data.thumbnailLink) {
        return file.data.thumbnailLink;
      }

      // Para archivos sin thumbnail automático, generar uno personalizado
      // Esto requeriría descargar el archivo y procesarlo
      return null;
    } catch (error) {
      this.logger.error(`Error generating thumbnail: ${error.message}`);
      return null;
    }
  }
}
```

### 🔐 Sistema de Permisos

```typescript
@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Subject) private subjectRepository: Repository<Subject>,
    @InjectRepository(ClassGroup) private classGroupRepository: Repository<ClassGroup>,
  ) {}

  /**
   * Validar acción sobre archivo/carpeta
   */
  async validateAction(
    user: User,
    action: FileAction,
    target: TaskAttachment | string
  ): Promise<boolean> {
    // Admin tiene acceso total
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Si es string, es un taskId
    if (typeof target === 'string') {
      return this.validateTaskAccess(user, action, target);
    }

    // Validar sobre archivo específico
    switch (user.role) {
      case UserRole.STUDENT:
        return this.validateStudentAccess(user, action, target);
      
      case UserRole.TEACHER:
        return this.validateTeacherAccess(user, action, target);
      
      case UserRole.FAMILY:
        return this.validateFamilyAccess(user, action, target);
      
      default:
        return false;
    }
  }

  private async validateStudentAccess(
    user: User,
    action: FileAction,
    attachment: TaskAttachment
  ): Promise<boolean> {
    switch (action) {
      case 'view':
        // Puede ver sus propios archivos
        if (attachment.uploadedById === user.id) return true;
        // Puede ver material del profesor
        if (attachment.attachmentType === 'instruction') return true;
        // Puede ver si está compartido con él
        if (attachment.sharedWith?.includes(user.id)) return true;
        return false;

      case 'upload':
        // Solo puede subir sus propias entregas
        return attachment.attachmentType === 'submission' && 
               attachment.uploadedById === user.id;

      case 'edit':
      case 'delete':
        // Solo sus propios archivos no evaluados
        return attachment.uploadedById === user.id &&
               attachment.attachmentType === 'submission' &&
               !attachment.metadata?.isGraded;

      default:
        return false;
    }
  }

  private async validateTeacherAccess(
    user: User,
    action: FileAction,
    attachment: TaskAttachment
  ): Promise<boolean> {
    // Verificar si el profesor tiene acceso a la asignatura
    const teacherSubjects = await this.getTeacherSubjects(user.id);
    const hasSubjectAccess = teacherSubjects.some(
      s => s.id === attachment.metadata?.subjectId
    );

    if (!hasSubjectAccess) {
      return false;
    }

    switch (action) {
      case 'view':
      case 'download':
        // Puede ver todo de sus asignaturas
        return true;

      case 'upload':
      case 'edit':
      case 'delete':
        // Puede modificar material docente
        if (attachment.attachmentType === 'instruction') return true;
        // No puede modificar entregas de estudiantes
        return false;

      case 'share':
        // Puede compartir material docente
        return attachment.attachmentType === 'instruction';

      default:
        return false;
    }
  }

  private async validateFamilyAccess(
    user: User,
    action: FileAction,
    attachment: TaskAttachment
  ): Promise<boolean> {
    // Obtener hijos de la familia
    const childrenIds = await this.getFamilyChildren(user.id);

    switch (action) {
      case 'view':
      case 'download':
        // Puede ver entregas de sus hijos
        if (attachment.attachmentType === 'submission' &&
            childrenIds.includes(attachment.uploadedById)) {
          return true;
        }
        // Puede ver material docente público
        if (attachment.attachmentType === 'instruction' &&
            attachment.visibility === 'public') {
          return true;
        }
        return false;

      default:
        // Las familias solo pueden ver, no modificar
        return false;
    }
  }

  /**
   * Aplicar filtros de permisos a query
   */
  applyAttachmentPermissions(
    qb: SelectQueryBuilder<TaskAttachment>,
    user: User
  ): void {
    switch (user.role) {
      case UserRole.ADMIN:
        // Sin restricciones
        break;

      case UserRole.STUDENT:
        qb.where(new Brackets(qb => {
          qb.where('attachment.uploadedById = :userId', { userId: user.id })
            .orWhere('attachment.attachmentType = :type', { type: 'instruction' })
            .orWhere(':userId = ANY(attachment.sharedWith)', { userId: user.id });
        }));
        break;

      case UserRole.TEACHER:
        // Necesita join con subjects para filtrar por asignatura
        qb.innerJoin('attachment.task', 'task')
          .innerJoin('task.subject', 'subject')
          .innerJoin('subject.teachers', 'teacher')
          .where('teacher.id = :teacherId', { teacherId: user.id });
        break;

      case UserRole.FAMILY:
        // Obtener IDs de hijos y filtrar
        const childrenIds = await this.getFamilyChildren(user.id);
        qb.where(new Brackets(qb => {
          qb.where('attachment.uploadedById IN (:...childrenIds)', { childrenIds })
            .orWhere(new Brackets(qb => {
              qb.where('attachment.attachmentType = :type', { type: 'instruction' })
                .andWhere('attachment.visibility = :visibility', { visibility: 'public' });
            }));
        }));
        break;
    }
  }

  /**
   * Verificar acceso a carpeta
   */
  async canViewFolder(user: User, folder: FolderCache): Promise<boolean> {
    // Admin siempre puede ver
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const metadata = folder.metadata;
    
    // Verificar por tipo de carpeta
    switch (metadata?.folderType) {
      case 'submissions':
        // Carpeta de entregas
        if (user.role === UserRole.STUDENT) {
          // Solo puede ver su propia carpeta
          return folder.name === this.formatStudentName(user);
        }
        if (user.role === UserRole.TEACHER) {
          // Verificar si es profesor de la asignatura
          return await this.isTeacherOfSubject(user.id, metadata.subject);
        }
        break;

      case 'materials':
        // Material docente - todos pueden ver
        return true;

      default:
        // Para otras carpetas, verificar metadata de permisos
        if (metadata?.permissions?.viewableBy?.includes(user.role)) {
          return true;
        }
        if (metadata?.permissions?.viewableBy?.includes(user.id)) {
          return true;
        }
    }

    return false;
  }
}
```

### 🔌 API Endpoints

```typescript
@ApiTags('Task Attachments')
@Controller('task-attachments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaskAttachmentsController {
  constructor(
    private readonly attachmentsService: TaskAttachmentsService,
    private readonly folderService: FolderNavigationService,
    private readonly searchService: AttachmentSearchService,
  ) {}

  // ===== GESTIÓN DE ARCHIVOS =====

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB inicial
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'audio/mpeg',
        'application/zip'
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`), false);
      }
    }
  }))
  @ApiOperation({ summary: 'Subir archivo adjunto' })
  @ApiConsumes('multipart/form-data')
  async uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDto: CreateAttachmentDto,
    @CurrentUser() user: User,
    @Req() req: Request
  ) {
    const context = this.extractRequestContext(req);
    return this.attachmentsService.uploadAttachment(file, createDto, user, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener información de archivo' })
  async getAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ) {
    return this.attachmentsService.getAttachmentById(id, user);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Descargar archivo' })
  async downloadAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const context = this.extractRequestContext(req);
    const result = await this.attachmentsService.downloadAttachment(id, user, context);
    
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar archivo (mover a papelera)' })
  async deleteAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Req() req: Request
  ) {
    const context = this.extractRequestContext(req);
    await this.attachmentsService.moveToTrash(id, user, context);
    return { message: 'Archivo movido a la papelera' };
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restaurar archivo de papelera' })
  async restoreAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Req() req: Request
  ) {
    const context = this.extractRequestContext(req);
    return this.attachmentsService.restoreFromTrash(id, user, context);
  }

  // ===== NAVEGACIÓN DE CARPETAS =====

  @Get('folders/:folderId/contents')
  @ApiOperation({ summary: 'Listar contenido de carpeta' })
  async getFolderContents(
    @Param('folderId') folderId: string,
    @Query() options: ListOptionsDto,
    @CurrentUser() user: User
  ) {
    return this.folderService.listFolderContents(folderId, user, options);
  }

  @Get('folders/tree')
  @ApiOperation({ summary: 'Obtener árbol de carpetas' })
  async getFolderTree(
    @Query('rootId') rootId: string,
    @Query('maxDepth', ParseIntPipe) maxDepth: number = 3,
    @CurrentUser() user: User
  ) {
    return this.folderService.getUserFolderTree(rootId || 'root', user, maxDepth);
  }

  @Post('folders/create')
  @ApiOperation({ summary: 'Crear nueva carpeta' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async createFolder(
    @Body() createFolderDto: CreateFolderDto,
    @CurrentUser() user: User
  ) {
    return this.folderService.createFolder(createFolderDto, user);
  }

  // ===== BÚSQUEDA =====

  @Get('search')
  @ApiOperation({ summary: 'Buscar archivos' })
  async searchAttachments(
    @Query() searchDto: SearchAttachmentsDto,
    @CurrentUser() user: User
  ) {
    return this.searchService.search(searchDto.query, searchDto.filters, user);
  }

  @Get('search/suggestions')
  @ApiOperation({ summary: 'Obtener sugerencias de búsqueda' })
  async getSearchSuggestions(
    @Query('q') query: string,
    @CurrentUser() user: User
  ) {
    return this.searchService.getSuggestions(query, user);
  }

  // ===== VERSIONES =====

  @Get(':id/versions')
  @ApiOperation({ summary: 'Obtener historial de versiones' })
  async getVersionHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ) {
    return this.attachmentsService.getVersionHistory(id, user);
  }

  @Post(':id/versions')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Crear nueva versión' })
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Req() req: Request
  ) {
    const context = this.extractRequestContext(req);
    return this.attachmentsService.createVersion(id, file, user, context);
  }

  @Post('versions/:versionId/restore')
  @ApiOperation({ summary: 'Restaurar versión anterior' })
  async restoreVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: User,
    @Req() req: Request
  ) {
    const context = this.extractRequestContext(req);
    return this.attachmentsService.restoreVersion(versionId, user, context);
  }

  // ===== COMENTARIOS =====

  @Get(':id/comments')
  @ApiOperation({ summary: 'Obtener comentarios de archivo' })
  async getComments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ) {
    return this.attachmentsService.getComments(id, user);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Añadir comentario' })
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: User
  ) {
    return this.attachmentsService.addComment(id, createCommentDto.content, user);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Eliminar comentario' })
  async deleteComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User
  ) {
    await this.attachmentsService.deleteComment(commentId, user);
    return { message: 'Comentario eliminado' };
  }

  // ===== COMPARTIR =====

  @Post(':id/share')
  @ApiOperation({ summary: 'Compartir archivo' })
  async shareAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() shareDto: ShareAttachmentDto,
    @CurrentUser() user: User
  ) {
    return this.attachmentsService.shareAttachment(id, shareDto, user);
  }

  @Delete(':id/share/:userId')
  @ApiOperation({ summary: 'Dejar de compartir con usuario' })
  async unshareAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User
  ) {
    await this.attachmentsService.unshareAttachment(id, userId, user);
    return { message: 'Archivo dejado de compartir' };
  }

  // ===== OPERACIONES EN LOTE =====

  @Post('batch/download')
  @ApiOperation({ summary: 'Descargar múltiples archivos como ZIP' })
  async batchDownload(
    @Body() batchDto: BatchDownloadDto,
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    const zipStream = await this.attachmentsService.createBatchZip(
      batchDto.fileIds,
      user
    );
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="archivos.zip"');
    zipStream.pipe(res);
  }

  @Post('batch/delete')
  @ApiOperation({ summary: 'Eliminar múltiples archivos' })
  async batchDelete(
    @Body() batchDto: BatchDeleteDto,
    @CurrentUser() user: User,
    @Req() req: Request
  ) {
    const context = this.extractRequestContext(req);
    const results = await this.attachmentsService.batchDelete(
      batchDto.fileIds,
      user,
      context
    );
    return results;
  }

  @Post('batch/move')
  @ApiOperation({ summary: 'Mover múltiples archivos' })
  async batchMove(
    @Body() batchDto: BatchMoveDto,
    @CurrentUser() user: User
  ) {
    return this.attachmentsService.batchMove(
      batchDto.fileIds,
      batchDto.targetFolderId,
      user
    );
  }

  // ===== AUDITORÍA =====

  @Get(':id/audit-log')
  @ApiOperation({ summary: 'Obtener log de auditoría de archivo' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getAuditLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filters: AuditLogFiltersDto,
    @CurrentUser() user: User
  ) {
    return this.attachmentsService.getAuditLog(id, filters, user);
  }

  @Get('audit/export')
  @ApiOperation({ summary: 'Exportar logs de auditoría' })
  @Roles(UserRole.ADMIN)
  async exportAuditLogs(
    @Query() filters: AuditExportFiltersDto,
    @Query('format') format: 'csv' | 'json' | 'pdf' = 'csv',
    @Res() res: Response
  ) {
    const data = await this.attachmentsService.exportAuditLogs(filters, format);
    
    const contentType = {
      csv: 'text/csv',
      json: 'application/json',
      pdf: 'application/pdf'
    }[format];
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs.${format}"`);
    res.send(data);
  }

  // ===== METADATA Y ESTADÍSTICAS =====

  @Get('metadata/export')
  @ApiOperation({ summary: 'Exportar metadata de carpeta' })
  async exportMetadata(
    @Query('folderId') folderId: string,
    @Query('format') format: 'csv' | 'excel' = 'excel',
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    const data = await this.attachmentsService.exportFolderMetadata(
      folderId,
      format,
      user
    );
    
    const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const extension = format === 'csv' ? 'csv' : 'xlsx';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="metadata.${extension}"`);
    res.send(data);
  }

  @Get('statistics/folder/:folderId')
  @ApiOperation({ summary: 'Obtener estadísticas de carpeta' })
  async getFolderStatistics(
    @Param('folderId') folderId: string,
    @CurrentUser() user: User
  ) {
    return this.attachmentsService.getFolderStatistics(folderId, user);
  }

  // ===== UTILIDADES =====

  private extractRequestContext(req: Request): RequestContext {
    return {
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
      sessionId: req.session?.id,
      requestId: req.id
    };
  }
}
```

---

## 🎨 FRONTEND - IMPLEMENTACIÓN DETALLADA

### 📁 Estructura de Componentes

```
frontend/src/
├── components/
│   └── attachments/
│       ├── DriveExplorer/
│       │   ├── DriveExplorer.tsx
│       │   ├── DriveToolbar.tsx
│       │   ├── BreadcrumbNav.tsx
│       │   └── index.ts
│       ├── FolderTree/
│       │   ├── FolderTree.tsx
│       │   ├── FolderNode.tsx
│       │   ├── useLazyTree.ts
│       │   └── index.ts
│       ├── FileViews/
│       │   ├── FileGrid.tsx
│       │   ├── FileList.tsx
│       │   ├── FileCard.tsx
│       │   ├── FileIcon.tsx
│       │   └── index.ts
│       ├── FileUpload/
│       │   ├── UploadZone.tsx
│       │   ├── UploadProgress.tsx
│       │   ├── ChunkedUploader.tsx
│       │   └── index.ts
│       ├── FilePreview/
│       │   ├── PreviewPanel.tsx
│       │   ├── PDFViewer.tsx
│       │   ├── ImageViewer.tsx
│       │   ├── VideoPlayer.tsx
│       │   └── index.ts
│       ├── FileActions/
│       │   ├── ContextMenu.tsx
│       │   ├── ShareModal.tsx
│       │   ├── VersionHistory.tsx
│       │   ├── CommentsPanel.tsx
│       │   └── index.ts
│       ├── Search/
│       │   ├── SearchBar.tsx
│       │   ├── SearchFilters.tsx
│       │   ├── SearchResults.tsx
│       │   └── index.ts
│       └── common/
│           ├── icons.tsx
│           ├── hooks.ts
│           └── utils.ts
├── pages/
│   └── tasks/
│       └── TaskAttachments.tsx
├── services/
│   └── attachments/
│       ├── api.ts
│       ├── types.ts
│       └── cache.ts
└── store/
    └── attachments/
        ├── attachmentsStore.ts
        └── types.ts
```

### 🎯 Componente Principal: DriveExplorer

```typescript
// components/attachments/DriveExplorer/DriveExplorer.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { message } from 'antd';
import { FolderTree } from '../FolderTree';
import { FileGrid } from '../FileViews/FileGrid';
import { FileList } from '../FileViews/FileList';
import { DriveToolbar } from './DriveToolbar';
import { BreadcrumbNav } from './BreadcrumbNav';
import { PreviewPanel } from '../FilePreview';
import { ContextMenu } from '../FileActions';
import { useAttachmentsStore } from '@/store/attachments';
import { attachmentsApi } from '@/services/attachments';
import { useAuth } from '@/hooks/useAuth';
import { useDragAndDrop } from '../common/hooks';
import type { 
  DriveFile, 
  DriveFolder, 
  ViewMode, 
  FileAction,
  UploadProgress 
} from '@/services/attachments/types';

interface DriveExplorerProps {
  taskId?: string;
  initialFolderId?: string;
  allowUpload?: boolean;
  viewMode?: ViewMode;
  onFileSelect?: (file: DriveFile) => void;
}

export const DriveExplorer: React.FC<DriveExplorerProps> = ({
  taskId,
  initialFolderId = 'root',
  allowUpload = true,
  viewMode: initialViewMode = 'grid',
  onFileSelect
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Estado local
  const [currentFolderId, setCurrentFolderId] = useState(initialFolderId);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: DriveFile;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());

  // Estado global con Zustand
  const {
    folderPath,
    setFolderPath,
    expandedFolders,
    toggleFolder,
    addRecentFile
  } = useAttachmentsStore();

  // Queries
  const { data: folderContents, isLoading } = useQuery({
    queryKey: ['folder-contents', currentFolderId],
    queryFn: () => attachmentsApi.getFolderContents(currentFolderId),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: folderTree } = useQuery({
    queryKey: ['folder-tree', user?.id],
    queryFn: () => attachmentsApi.getFolderTree(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async ({ file, metadata }: { file: File; metadata: any }) => {
      const formData = new FormData();
      formData.append('file', file);
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });
      
      return attachmentsApi.uploadFile(formData, {
        onUploadProgress: (progress) => {
          setUploadProgress(prev => new Map(prev).set(file.name, {
            loaded: progress.loaded,
            total: progress.total,
            percentage: Math.round((progress.loaded / progress.total) * 100)
          }));
        }
      });
    },
    onSuccess: (data, variables) => {
      message.success(`${variables.file.name} subido exitosamente`);
      queryClient.invalidateQueries(['folder-contents', currentFolderId]);
      addRecentFile(data);
      setUploadProgress(prev => {
        const next = new Map(prev);
        next.delete(variables.file.name);
        return next;
      });
    },
    onError: (error: any, variables) => {
      message.error(`Error al subir ${variables.file.name}: ${error.message}`);
      setUploadProgress(prev => {
        const next = new Map(prev);
        next.delete(variables.file.name);
        return next;
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (fileIds: string[]) => 
      attachmentsApi.batchDelete(fileIds),
    onSuccess: () => {
      message.success('Archivos eliminados correctamente');
      queryClient.invalidateQueries(['folder-contents']);
      setSelectedFiles(new Set());
    }
  });

  // Drag & Drop para subir archivos
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!allowUpload) return;

    for (const file of acceptedFiles) {
      const metadata = {
        taskId,
        attachmentType: user?.role === 'STUDENT' ? 'submission' : 'instruction',
        subject: folderPath[folderPath.length - 1]?.name || 'General',
        academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
      };

      uploadMutation.mutate({ file, metadata });
    }
  }, [allowUpload, taskId, user, folderPath, uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    disabled: !allowUpload
  });

  // Drag & Drop para mover archivos
  const { 
    draggedItem, 
    handleDragStart, 
    handleDragEnd,
    handleDrop 
  } = useDragAndDrop({
    onMove: async (itemId: string, targetFolderId: string) => {
      try {
        await attachmentsApi.moveFile(itemId, targetFolderId);
        queryClient.invalidateQueries(['folder-contents']);
        message.success('Archivo movido correctamente');
      } catch (error) {
        message.error('Error al mover el archivo');
      }
    }
  });

  // Navegación de carpetas
  const navigateToFolder = useCallback((folderId: string, folderName?: string) => {
    setCurrentFolderId(folderId);
    
    if (folderName) {
      setFolderPath(prev => [...prev, { id: folderId, name: folderName }]);
    }
  }, [setFolderPath]);

  // Selección de archivos
  const handleFileSelect = useCallback((fileId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + click: toggle individual
      setSelectedFiles(prev => {
        const next = new Set(prev);
        if (next.has(fileId)) {
          next.delete(fileId);
        } else {
          next.add(fileId);
        }
        return next;
      });
    } else if (event.shiftKey && selectedFiles.size > 0) {
      // Shift + click: selección de rango
      const files = folderContents?.files || [];
      const lastSelected = Array.from(selectedFiles).pop();
      const lastIndex = files.findIndex(f => f.id === lastSelected);
      const currentIndex = files.findIndex(f => f.id === fileId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const range = files.slice(start, end + 1).map(f => f.id);
        
        setSelectedFiles(prev => new Set([...prev, ...range]));
      }
    } else {
      // Click simple: selección única
      setSelectedFiles(new Set([fileId]));
    }
  }, [selectedFiles, folderContents]);

  const handleSelectAll = useCallback(() => {
    const allFileIds = folderContents?.files.map(f => f.id) || [];
    setSelectedFiles(new Set(allFileIds));
  }, [folderContents]);

  const handleSelectNone = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  // Context menu
  const handleContextMenu = useCallback((event: React.MouseEvent, file: DriveFile) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      file
    });
  }, []);

  // File actions
  const handleFileAction = useCallback(async (action: FileAction, file?: DriveFile) => {
    const targetFiles = file ? [file] : Array.from(selectedFiles).map(id => 
      folderContents?.files.find(f => f.id === id)!
    );

    switch (action) {
      case 'preview':
        if (targetFiles[0]) {
          setShowPreview(targetFiles[0].id);
        }
        break;

      case 'download':
        if (targetFiles.length === 1) {
          window.open(targetFiles[0].downloadLink, '_blank');
        } else {
          // Descarga múltiple como ZIP
          const response = await attachmentsApi.batchDownload(
            targetFiles.map(f => f.id)
          );
          // Manejar descarga del ZIP
        }
        break;

      case 'delete':
        if (confirm(`¿Eliminar ${targetFiles.length} archivo(s)?`)) {
          deleteMutation.mutate(targetFiles.map(f => f.id));
        }
        break;

      case 'share':
        // Abrir modal de compartir
        break;

      case 'rename':
        // Abrir modal de renombrar
        break;

      case 'move':
        // Iniciar modo de mover
        break;

      case 'openInDrive':
        if (targetFiles[0]) {
          window.open(targetFiles[0].webViewLink, '_blank');
        }
        break;
    }

    setContextMenu(null);
  }, [selectedFiles, folderContents, deleteMutation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault();
            handleSelectAll();
            break;
          case 'd':
            e.preventDefault();
            handleSelectNone();
            break;
        }
      } else if (e.key === 'Delete' && selectedFiles.size > 0) {
        handleFileAction('delete');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectAll, handleSelectNone, selectedFiles, handleFileAction]);

  return (
    <div 
      className="h-full flex flex-col bg-gray-50"
      {...getRootProps()}
      onClick={() => setContextMenu(null)}
    >
      <input {...getInputProps()} />

      {/* Header con toolbar */}
      <div className="bg-white border-b px-4 py-3">
        <DriveToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCount={selectedFiles.size}
          onUpload={() => document.getElementById('file-input')?.click()}
          onBatchAction={handleFileAction}
          allowUpload={allowUpload}
        />
        
        <BreadcrumbNav
          path={folderPath}
          onNavigate={(folderId) => navigateToFolder(folderId)}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar con árbol de carpetas */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <FolderTree
            tree={folderTree}
            currentFolderId={currentFolderId}
            expandedFolders={expandedFolders}
            onFolderClick={navigateToFolder}
            onFolderToggle={toggleFolder}
            onDrop={handleDrop}
            draggedItem={draggedItem}
          />
        </div>

        {/* Vista de archivos */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-full"
              >
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Cargando archivos...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {viewMode === 'grid' ? (
                  <FileGrid
                    files={folderContents?.files || []}
                    folders={folderContents?.folders || []}
                    selectedFiles={selectedFiles}
                    onFileSelect={handleFileSelect}
                    onFileDoubleClick={(file) => handleFileAction('preview', file)}
                    onFolderDoubleClick={navigateToFolder}
                    onContextMenu={handleContextMenu}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    searchQuery={searchQuery}
                  />
                ) : (
                  <FileList
                    files={folderContents?.files || []}
                    folders={folderContents?.folders || []}
                    selectedFiles={selectedFiles}
                    onFileSelect={handleFileSelect}
                    onFileDoubleClick={(file) => handleFileAction('preview', file)}
                    onFolderDoubleClick={navigateToFolder}
                    onContextMenu={handleContextMenu}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    searchQuery={searchQuery}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Panel de vista previa */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="w-96 bg-white border-l shadow-lg"
            >
              <PreviewPanel
                fileId={showPreview}
                onClose={() => setShowPreview(null)}
                onAction={handleFileAction}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload overlay */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-blue-500 bg-opacity-10 z-50 flex items-center justify-center"
          >
            <div className="bg-white rounded-lg shadow-xl p-8 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xl font-medium text-gray-900">Suelta los archivos aquí</p>
              <p className="text-gray-500 mt-2">Los archivos se subirán a la carpeta actual</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress overlay */}
      <AnimatePresence>
        {uploadProgress.size > 0 && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed bottom-0 right-0 m-4 bg-white rounded-lg shadow-xl p-4 w-96 max-h-64 overflow-y-auto"
          >
            <h3 className="font-medium mb-3">Subiendo archivos</h3>
            {Array.from(uploadProgress.entries()).map(([fileName, progress]) => (
              <div key={fileName} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate flex-1 mr-2">{fileName}</span>
                  <span>{progress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            file={contextMenu.file}
            onAction={handleFileAction}
            onClose={() => setContextMenu(null)}
            userRole={user?.role}
          />
        )}
      </AnimatePresence>

      {/* Hidden file input for upload */}
      <input
        id="file-input"
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          onDrop(files);
          e.target.value = '';
        }}
      />
    </div>
  );
};
```

### 🌳 Componente FolderTree con Lazy Loading

```typescript
// components/attachments/FolderTree/FolderTree.tsx
import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { useLazyLoad } from './useLazyLoad';
import type { FolderNode, DraggedItem } from '@/services/attachments/types';

interface FolderTreeProps {
  tree?: FolderNode;
  currentFolderId: string;
  expandedFolders: Set<string>;
  onFolderClick: (folderId: string, folderName: string) => void;
  onFolderToggle: (folderId: string) => void;
  onDrop?: (item: DraggedItem, targetFolderId: string) => void;
  draggedItem?: DraggedItem | null;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  tree,
  currentFolderId,
  expandedFolders,
  onFolderClick,
  onFolderToggle,
  onDrop,
  draggedItem
}) => {
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());
  const { loadChildren } = useLazyLoad();

  const handleToggle = useCallback(async (node: FolderNode) => {
    onFolderToggle(node.id);
    
    // Si se está expandiendo y no tiene hijos cargados, cargarlos
    if (!expandedFolders.has(node.id) && !node.isLoaded) {
      setLoadingFolders(prev => new Set(prev).add(node.id));
      
      try {
        await loadChildren(node.id);
      } finally {
        setLoadingFolders(prev => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
      }
    }
  }, [expandedFolders, onFolderToggle, loadChildren]);

  const renderNode = (node: FolderNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.id);
    const isLoading = loadingFolders.has(node.id);
    const isCurrent = node.id === currentFolderId;
    const hasChildren = node.hasChildren || (node.children && node.children.length > 0);

    return (
      <div key={node.id}>
        <motion.div
          className={`
            flex items-center px-3 py-2 cursor-pointer rounded-md
            hover:bg-gray-100 transition-colors
            ${isCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
            ${draggedItem && node.id !== draggedItem.id ? 'hover:bg-blue-100' : ''}
          `}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => onFolderClick(node.id, node.name)}
          onDragOver={(e) => {
            if (draggedItem && draggedItem.id !== node.id) {
              e.preventDefault();
              e.currentTarget.classList.add('bg-blue-100');
            }
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('bg-blue-100');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('bg-blue-100');
            if (draggedItem && onDrop && draggedItem.id !== node.id) {
              onDrop(draggedItem, node.id);
            }
          }}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Chevron para expandir/colapsar */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(node);
              }}
              className="mr-1 p-0.5 hover:bg-gray-200 rounded"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}
          
          {/* Icono de carpeta */}
          <div className="mr-2">
            {isExpanded ? (
              <FolderOpen size={18} className="text-yellow-600" />
            ) : (
              <Folder size={18} className="text-yellow-500" />
            )}
          </div>
          
          {/* Nombre de la carpeta */}
          <span className="flex-1 truncate text-sm font-medium">
            {node.name}
          </span>
          
          {/* Contador de archivos */}
          {node.metadata?.filesCount > 0 && (
            <span className="text-xs text-gray-500 ml-2">
              {node.metadata.filesCount}
            </span>
          )}
        </motion.div>

        {/* Hijos */}
        <AnimatePresence>
          {isExpanded && node.children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {node.children.map(child => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (!tree) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Folder size={48} className="mx-auto mb-2 text-gray-300" />
        <p>No hay carpetas disponibles</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {renderNode(tree)}
    </div>
  );
};
```

### 📊 Vista Grid de Archivos

```typescript
// components/attachments/FileViews/FileGrid.tsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileCard } from './FileCard';
import { FolderCard } from './FolderCard';
import type { DriveFile, DriveFolder } from '@/services/attachments/types';

interface FileGridProps {
  files: DriveFile[];
  folders: DriveFolder[];
  selectedFiles: Set<string>;
  onFileSelect: (fileId: string, event: React.MouseEvent) => void;
  onFileDoubleClick: (file: DriveFile) => void;
  onFolderDoubleClick: (folderId: string, folderName: string) => void;
  onContextMenu: (event: React.MouseEvent, file: DriveFile) => void;
  onDragStart?: (item: any) => void;
  onDragEnd?: () => void;
  searchQuery?: string;
}

export const FileGrid: React.FC<FileGridProps> = ({
  files,
  folders,
  selectedFiles,
  onFileSelect,
  onFileDoubleClick,
  onFolderDoubleClick,
  onContextMenu,
  onDragStart,
  onDragEnd,
  searchQuery = ''
}) => {
  // Filtrar por búsqueda
  const filteredItems = useMemo(() => {
    if (!searchQuery) {
      return { files, folders };
    }

    const query = searchQuery.toLowerCase();
    return {
      files: files.filter(f => f.name.toLowerCase().includes(query)),
      folders: folders.filter(f => f.name.toLowerCase().includes(query))
    };
  }, [files, folders, searchQuery]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Carpetas primero */}
      {filteredItems.folders.map(folder => (
        <motion.div key={folder.id} variants={itemVariants}>
          <FolderCard
            folder={folder}
            onDoubleClick={() => onFolderDoubleClick(folder.id, folder.name)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        </motion.div>
      ))}

      {/* Archivos */}
      {filteredItems.files.map(file => (
        <motion.div key={file.id} variants={itemVariants}>
          <FileCard
            file={file}
            isSelected={selectedFiles.has(file.id)}
            onClick={(e) => onFileSelect(file.id, e)}
            onDoubleClick={() => onFileDoubleClick(file)}
            onContextMenu={(e) => onContextMenu(e, file)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        </motion.div>
      ))}

      {/* Mensaje si no hay resultados */}
      {filteredItems.files.length === 0 && filteredItems.folders.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="col-span-full text-center py-8"
        >
          <p className="text-gray-500">
            {searchQuery 
              ? `No se encontraron resultados para "${searchQuery}"`
              : 'Esta carpeta está vacía'
            }
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};
```

### 🎴 File Card con Thumbnails

```typescript
// components/attachments/FileViews/FileCard.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { getFileIcon } from '../common/icons';
import { formatFileSize, formatDate } from '../common/utils';
import type { DriveFile } from '@/services/attachments/types';

interface FileCardProps {
  file: DriveFile;
  isSelected: boolean;
  onClick: (event: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onDragStart?: (item: any) => void;
  onDragEnd?: () => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onDragEnd
}) => {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const isImage = file.mimeType.startsWith('image/');
  const isPDF = file.mimeType === 'application/pdf';
  const hasNativeThumbnail = file.thumbnailLink && (isImage || isPDF);

  const FileIcon = getFileIcon(file.mimeType);

  return (
    <motion.div
      className={`
        relative group cursor-pointer rounded-lg overflow-hidden
        transition-all duration-200
        ${isSelected 
          ? 'ring-2 ring-blue-500 shadow-lg transform scale-105' 
          : 'hover:shadow-md hover:transform hover:scale-105'
        }
      `}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={(e) => {
        if (onDragStart) {
          e.dataTransfer.effectAllowed = 'move';
          onDragStart({ type: 'file', ...file });
        }
      }}
      onDragEnd={onDragEnd}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Checkbox de selección */}
      <div className={`
        absolute top-2 left-2 z-10 transition-opacity
        ${isSelected || 'opacity-0 group-hover:opacity-100'}
      `}>
        <div className={`
          w-5 h-5 rounded border-2 flex items-center justify-center
          ${isSelected 
            ? 'bg-blue-500 border-blue-500' 
            : 'bg-white border-gray-300'
          }
        `}>
          {isSelected && <Check size={14} className="text-white" />}
        </div>
      </div>

      {/* Thumbnail o icono */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {hasNativeThumbnail && !thumbnailError ? (
          <>
            {/* Placeholder mientras carga */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <FileIcon size={48} className="text-gray-400" />
              </div>
            )}
            
            {/* Imagen thumbnail */}
            <img
              src={file.thumbnailLink}
              alt={file.name}
              className={`
                absolute inset-0 w-full h-full object-cover
                transition-opacity duration-300
                ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              onLoad={() => setImageLoaded(true)}
              onError={() => setThumbnailError(true)}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FileIcon size={48} className="text-gray-400" />
          </div>
        )}

        {/* Badge de versión */}
        {file.version > 1 && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
            v{file.version}
          </div>
        )}

        {/* Indicador de compartido */}
        {file.sharedWith && file.sharedWith.length > 0 && (
          <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1 rounded">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
          </div>
        )}
      </div>

      {/* Información del archivo */}
      <div className="p-3 bg-white">
        <p className="text-sm font-medium text-gray-900 truncate mb-1" title={file.name}>
          {file.name}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatFileSize(file.size)}</span>
          <span>{formatDate(file.modifiedTime)}</span>
        </div>
      </div>
    </motion.div>
  );
};
```

### 🔍 Sistema de Búsqueda

```typescript
// components/attachments/Search/SearchBar.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';
import { attachmentsApi } from '@/services/attachments';
import { SearchFilters } from './SearchFilters';
import type { SearchSuggestion } from '@/services/attachments/types';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Buscar archivos...'
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Query para sugerencias
  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions', value],
    queryFn: () => attachmentsApi.getSearchSuggestions(value),
    enabled: value.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchValue: string) => {
      if (onSearch) {
        onSearch(searchValue);
      }
    }, 300),
    [onSearch]
  );

  // Manejar cambio de input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(newValue.length >= 2);
    debouncedSearch(newValue);
  };

  // Manejar selección de sugerencia
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text);
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(suggestion.text);
    }
  };

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1 max-w-2xl">
      <div className="relative">
        {/* Icono de búsqueda */}
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        
        {/* Input de búsqueda */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => value.length >= 2 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-24 py-2 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all duration-200"
        />
        
        {/* Botones de acción */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {/* Clear button */}
          {value && (
            <button
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={16} className="text-gray-500" />
            </button>
          )}
          
          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              p-1.5 rounded transition-all
              ${showFilters 
                ? 'bg-blue-100 text-blue-600' 
                : 'hover:bg-gray-100 text-gray-500'
              }
            `}
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Sugerencias de búsqueda */}
      <AnimatePresence>
        {showSuggestions && suggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors
                           flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <Search size={16} className="text-gray-400" />
                    <span className="text-sm">
                      {suggestion.highlighted ? (
                        <span dangerouslySetInnerHTML={{ __html: suggestion.highlighted }} />
                      ) : (
                        suggestion.text
                      )}
                    </span>
                  </div>
                  {suggestion.category && (
                    <span className="text-xs text-gray-500 group-hover:text-gray-700">
                      {suggestion.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel de filtros */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute z-40 w-full mt-2"
          >
            <SearchFilters
              filters={filters}
              onChange={setFilters}
              onClose={() => setShowFilters(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

### 📤 Sistema de Upload con Chunking

```typescript
// components/attachments/FileUpload/ChunkedUploader.tsx
import React, { useState, useCallback } from 'react';
import { Upload, X, Pause, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChunkedUpload } from '../hooks/useChunkedUpload';
import type { UploadFile, UploadStatus } from '@/services/attachments/types';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por chunk

interface ChunkedUploaderProps {
  onComplete?: (file: UploadFile) => void;
  maxFileSize?: number;
  acceptedTypes?: string[];
}

export const ChunkedUploader: React.FC<ChunkedUploaderProps> = ({
  onComplete,
  maxFileSize = 5 * 1024 * 1024 * 1024, // 5GB
  acceptedTypes
}) => {
  const [files, setFiles] = useState<Map<string, UploadFile>>(new Map());
  const { uploadFile, pauseUpload, resumeUpload, cancelUpload } = useChunkedUpload();

  const handleFileSelect = useCallback(async (selectedFiles: FileList) => {
    const newFiles = new Map(files);

    for (const file of Array.from(selectedFiles)) {
      // Validaciones
      if (file.size > maxFileSize) {
        console.error(`${file.name} excede el tamaño máximo permitido`);
        continue;
      }

      if (acceptedTypes && !acceptedTypes.includes(file.type)) {
        console.error(`${file.name} no es un tipo de archivo permitido`);
        continue;
      }

      const uploadFile: UploadFile = {
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: 'pending',
        chunks: Math.ceil(file.size / CHUNK_SIZE),
        uploadedChunks: 0
      };

      newFiles.set(uploadFile.id, uploadFile);
      
      // Iniciar upload
      handleUpload(uploadFile);
    }

    setFiles(newFiles);
  }, [files, maxFileSize, acceptedTypes]);

  const handleUpload = async (uploadFile: UploadFile) => {
    try {
      await uploadFile(
        uploadFile,
        (progress) => {
          setFiles(prev => {
            const next = new Map(prev);
            const file = next.get(uploadFile.id);
            if (file) {
              file.progress = progress.percentage;
              file.uploadedChunks = progress.uploadedChunks;
              file.status = 'uploading';
            }
            return next;
          });
        },
        (result) => {
          setFiles(prev => {
            const next = new Map(prev);
            const file = next.get(uploadFile.id);
            if (file) {
              file.status = 'completed';
              file.result = result;
            }
            return next;
          });
          
          if (onComplete) {
            onComplete(uploadFile);
          }
        },
        (error) => {
          setFiles(prev => {
            const next = new Map(prev);
            const file = next.get(uploadFile.id);
            if (file) {
              file.status = 'error';
              file.error = error.message;
            }
            return next;
          });
        }
      );
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handlePause = (fileId: string) => {
    pauseUpload(fileId);
    setFiles(prev => {
      const next = new Map(prev);
      const file = next.get(fileId);
      if (file) {
        file.status = 'paused';
      }
      return next;
    });
  };

  const handleResume = (fileId: string) => {
    const file = files.get(fileId);
    if (file) {
      resumeUpload(fileId);
      file.status = 'uploading';
      setFiles(new Map(files));
    }
  };

  const handleCancel = (fileId: string) => {
    cancelUpload(fileId);
    setFiles(prev => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
  };

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Zona de drop */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8
                   hover:border-blue-400 transition-colors cursor-pointer
                   text-center"
        onClick={() => document.getElementById('chunked-file-input')?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
          handleFileSelect(e.dataTransfer.files);
        }}
      >
        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Arrastra archivos aquí o haz clic para seleccionar
        </p>
        <p className="text-sm text-gray-500">
          Tamaño máximo: {Math.round(maxFileSize / (1024 * 1024 * 1024))}GB
        </p>
      </div>

      {/* Input oculto */}
      <input
        id="chunked-file-input"
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        accept={acceptedTypes?.join(',')}
      />

      {/* Lista de archivos */}
      <AnimatePresence>
        {files.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-4 space-y-3"
          >
            {Array.from(files.values()).map(file => (
              <motion.div
                key={file.id}
                layout
                className="bg-white rounded-lg shadow p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(file.status)}
                    <div className="flex-1">
                      <p className="font-medium text-sm truncate">
                        {file.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {file.uploadedChunks} / {file.chunks} chunks
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {file.status === 'uploading' && (
                      <button
                        onClick={() => handlePause(file.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Pause size={16} />
                      </button>
                    )}
                    
                    {file.status === 'paused' && (
                      <button
                        onClick={() => handleResume(file.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleCancel(file.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {(file.status === 'uploading' || file.status === 'paused') && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{Math.round(file.progress)}%</span>
                      <span>
                        {Math.round((file.file.size * file.progress) / 100 / 1024 / 1024)}MB
                        / {Math.round(file.file.size / 1024 / 1024)}MB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="bg-blue-500 h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {/* Error message */}
                {file.status === 'error' && file.error && (
                  <p className="text-sm text-red-600 mt-2">{file.error}</p>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### 📅 FASE 1: Sistema Base (2-3 semanas)
**Objetivo**: MVP funcional con características esenciales

#### Backend Tasks
- [ ] Crear módulo task-attachments
- [ ] Implementar entidades (TaskAttachment, AttachmentLog, FolderCache)
- [ ] Crear servicios base (upload, download, list, delete)
- [ ] Extender GoogleDriveService con métodos necesarios
- [ ] Implementar sistema de permisos básico
- [ ] Crear endpoints REST principales
- [ ] Añadir validaciones y guards
- [ ] Crear migraciones de base de datos
- [ ] Tests unitarios básicos

#### Frontend Tasks
- [ ] Crear estructura de componentes
- [ ] Implementar DriveExplorer básico
- [ ] Vista de árbol de carpetas (sin lazy loading)
- [ ] Vista grid/lista simple
- [ ] Sistema de upload básico (< 50MB)
- [ ] Menú contextual con acciones básicas
- [ ] Integración con API
- [ ] Manejo de errores
- [ ] Tests de componentes

#### DevOps Tasks
- [ ] Configurar variables de entorno
- [ ] Verificar conexión Google Drive
- [ ] Crear carpeta base en Drive
- [ ] Documentar endpoints

**Entregables**:
- ✓ Upload/download funcional
- ✓ Navegación de carpetas
- ✓ Permisos por rol
- ✓ UI básica tipo Drive

---

### 📅 FASE 2: Mejoras de Productividad (2-3 semanas)
**Objetivo**: Optimizar rendimiento y UX

#### Backend Tasks
- [ ] Implementar lazy loading para carpetas
- [ ] Sistema de cache con Redis
- [ ] Procesamiento de thumbnails con Sharp.js
- [ ] Bull Queue para tareas asíncronas
- [ ] Sistema de versiones
- [ ] Comentarios en archivos
- [ ] Compartir archivos básico
- [ ] Búsqueda por nombre
- [ ] Exportación de metadatos
- [ ] Auditoría mejorada

#### Frontend Tasks
- [ ] Lazy loading en árbol de carpetas
- [ ] Drag & drop para organizar
- [ ] Chunking para archivos hasta 200MB
- [ ] Vista previa de archivos
- [ ] Panel de versiones
- [ ] Sistema de comentarios
- [ ] Búsqueda con sugerencias
- [ ] Selección múltiple mejorada
- [ ] Animaciones y transiciones
- [ ] Modo oscuro (opcional)

#### Performance Tasks
- [ ] Optimizar queries de BD
- [ ] Implementar paginación
- [ ] Comprimir respuestas
- [ ] CDN para assets

**Entregables**:
- ✓ Performance < 500ms
- ✓ Thumbnails automáticos
- ✓ Colaboración básica
- ✓ UX mejorada

---

### 📅 FASE 3: Características Enterprise (4-6 semanas)
**Objetivo**: Sistema completo nivel enterprise

#### Backend Tasks
- [ ] OCR con Tesseract.js
- [ ] Elasticsearch para búsqueda full-text
- [ ] WebSockets con Socket.io
- [ ] Notificaciones en tiempo real
- [ ] Sistema de papelera/reciclaje
- [ ] Compartir con enlaces avanzados
- [ ] Permisos granulares
- [ ] Backup automático
- [ ] API GraphQL (opcional)
- [ ] Microservicios para procesamiento

#### Frontend Tasks
- [ ] Búsqueda avanzada con OCR
- [ ] NotificationCenter
- [ ] Colaboración en tiempo real
- [ ] Chunking para archivos 5GB+
- [ ] Vista previa avanzada
- [ ] Editor de permisos
- [ ] Dashboard de analytics
- [ ] Temas personalizables
- [ ] PWA support
- [ ] Accesibilidad WCAG 2.1

#### Infrastructure Tasks
- [ ] Configurar Elasticsearch
- [ ] Redis Cluster
- [ ] Queue workers
- [ ] Monitoring setup
- [ ] CI/CD pipeline

**Entregables**:
- ✓ OCR funcional
- ✓ Búsqueda inteligente
- ✓ Real-time collaboration
- ✓ Enterprise security

---

## 📚 GUÍAS DE IMPLEMENTACIÓN PASO A PASO

### 🔧 Guía 1: Configuración Inicial del Backend

#### Paso 1: Crear el módulo
```bash
cd mw-panel/backend/src/modules
mkdir task-attachments
cd task-attachments
mkdir controllers services entities dto guards
touch task-attachments.module.ts
```

#### Paso 2: Crear las entidades
```typescript
// entities/task-attachment.entity.ts
// Copiar el código de la entidad TaskAttachment de arriba
```

#### Paso 3: Crear las migraciones
```bash
npm run migration:generate -- -n CreateTaskAttachmentsModule
```

#### Paso 4: Registrar el módulo
```typescript
// app.module.ts
import { TaskAttachmentsModule } from './modules/task-attachments/task-attachments.module';

@Module({
  imports: [
    // ... otros módulos
    TaskAttachmentsModule,
  ],
})
export class AppModule {}
```

### 🔧 Guía 2: Implementar Upload Básico

#### Paso 1: Crear el DTO
```typescript
// dto/create-attachment.dto.ts
import { IsString, IsEnum, IsUUID, IsOptional } from 'class-validator';

export class CreateAttachmentDto {
  @IsUUID()
  taskId: string;

  @IsEnum(['instruction', 'submission'])
  attachmentType: 'instruction' | 'submission';

  @IsString()
  subject: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

#### Paso 2: Implementar el servicio
```typescript
// services/task-attachments.service.ts
// Implementar método uploadAttachment básico
```

#### Paso 3: Crear el endpoint
```typescript
// controllers/task-attachments.controller.ts
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadAttachment(
  @UploadedFile() file: Express.Multer.File,
  @Body() createDto: CreateAttachmentDto,
  @CurrentUser() user: User
) {
  return this.service.uploadAttachment(file, createDto, user);
}
```

### 🔧 Guía 3: Implementar Frontend Básico

#### Paso 1: Instalar dependencias
```bash
cd mw-panel/frontend
npm install react-dropzone framer-motion lucide-react
```

#### Paso 2: Crear el servicio API
```typescript
// services/attachments/api.ts
import { apiClient } from '@/services/api';

export const attachmentsApi = {
  uploadFile: (formData: FormData) => 
    apiClient.post('/task-attachments/upload', formData),
    
  getFolderContents: (folderId: string) =>
    apiClient.get(`/task-attachments/folders/${folderId}/contents`),
    
  // ... más métodos
};
```

#### Paso 3: Crear componente básico
```typescript
// components/attachments/DriveExplorer/DriveExplorer.tsx
// Implementar versión simplificada del componente
```

---

## 🔒 SEGURIDAD Y PERMISOS

### Sistema de Permisos por Rol

#### Estudiantes (STUDENT)
- **Ver**: Sus propias entregas + material del profesor
- **Subir**: Solo en carpeta de entregas propias
- **Editar**: Solo sus archivos no evaluados
- **Eliminar**: Solo sus archivos no evaluados
- **Compartir**: No permitido

#### Profesores (TEACHER)
- **Ver**: Todo de sus asignaturas
- **Subir**: En carpetas de material docente
- **Editar**: Solo material propio
- **Eliminar**: Solo material propio
- **Compartir**: Material docente con otros profesores

#### Familias (FAMILY)
- **Ver**: Entregas de sus hijos + material público
- **Subir**: No permitido
- **Editar**: No permitido
- **Eliminar**: No permitido
- **Compartir**: No permitido

#### Administradores (ADMIN)
- **Acceso total** a todas las operaciones

### Validaciones de Seguridad

1. **Validación en Servidor**: Todos los permisos se validan en backend
2. **Sanitización de Nombres**: Eliminar caracteres peligrosos en nombres de archivo
3. **Tipos MIME**: Lista blanca de tipos permitidos
4. **Tamaño Máximo**: Límites configurables por tipo de usuario
5. **Rate Limiting**: Límites de subida por usuario/hora
6. **Auditoría Completa**: Registro de todas las acciones

---

## 📊 OPTIMIZACIÓN Y RENDIMIENTO

### Estrategias de Optimización

#### 1. Cache Multinivel
```typescript
// Cache Strategy
- L1: Frontend (React Query) - 5 min
- L2: Redis - 30 min  
- L3: PostgreSQL - Persistente
```

#### 2. Lazy Loading
- Árbol de carpetas: Cargar solo primer nivel
- Archivos: Paginación de 50 items
- Thumbnails: Generación asíncrona

#### 3. Compresión
- Gzip para respuestas API
- WebP para thumbnails
- Minificación de assets

#### 4. CDN Strategy
- Assets estáticos en CDN
- Thumbnails con cache largo
- API responses con cache corto

### Métricas Objetivo
- **Tiempo de carga inicial**: < 2s
- **Navegación entre carpetas**: < 500ms
- **Upload pequeño (< 10MB)**: < 5s
- **Preview de archivo**: < 1s
- **Búsqueda**: < 300ms

---

## 💰 ESTIMACIONES DE COSTOS

### FASE 1: Sistema Base
- **Desarrollo**: 2-3 semanas
- **Infraestructura**: $0 (usa servicios existentes)
- **Servicios externos**: $0

### FASE 2: Mejoras
- **Desarrollo**: 2-3 semanas adicionales
- **Procesamiento**: ~$20-50/mes (CPU para thumbnails)
- **Cache mejorado**: Incluido en Redis existente

### FASE 3: Enterprise
- **Desarrollo**: 4-6 semanas adicionales
- **OCR**: 
  - Tesseract.js: $0 (pero lento)
  - Google Vision: $1.50/1000 páginas
- **Elasticsearch**: $200-500/mes
- **Workers adicionales**: $100-300/mes

### Recomendación por Presupuesto

#### Presupuesto Bajo ($0-50/mes)
- Implementar Fase 1 completa
- Fase 2 sin procesamiento pesado
- OCR con Tesseract limitado

#### Presupuesto Medio ($50-200/mes)
- Fases 1 y 2 completas
- OCR selectivo con Google Vision
- Cache optimizado

#### Presupuesto Alto ($200+/mes)
- Todas las fases
- OCR completo
- Elasticsearch
- Real-time features

---

## 📝 APÉNDICES

### A. Decisiones Técnicas

1. **¿Por qué Google Drive?**
   - Ya está configurado en el sistema
   - Almacenamiento ilimitado
   - Backup automático
   - Compartición nativa

2. **¿Por qué no construir sobre módulo de recursos?**
   - Diferentes casos de uso
   - Permisos más complejos
   - Estructura de carpetas específica
   - Necesita versionado

3. **¿PostgreSQL FTS vs Elasticsearch?**
   - Empezar con PostgreSQL (gratis)
   - Migrar a Elastic solo con volumen

### B. Alternativas Consideradas

1. **Almacenamiento Local**
   - ❌ Limitado por espacio servidor
   - ❌ Sin backup automático
   - ❌ Difícil de escalar

2. **AWS S3**
   - ✅ Escalable
   - ❌ Costo por GB
   - ❌ Requiere migración

3. **Módulo Recursos Existente**
   - ✅ Código reutilizable
   - ❌ Casos de uso diferentes
   - ❌ Complejidad añadida

### C. Referencias y Recursos

1. **Google Drive API**
   - [Documentación oficial](https://developers.google.com/drive/api/v3/reference)
   - [Guía de autenticación](https://developers.google.com/drive/api/v3/about-auth)

2. **Tecnologías**
   - [NestJS Docs](https://docs.nestjs.com)
   - [React Query](https://tanstack.com/query)
   - [Framer Motion](https://www.framer.com/motion)

3. **Herramientas**
   - [Bull Queue](https://docs.bullmq.io)
   - [Sharp.js](https://sharp.pixelplumbing.com)
   - [Tesseract.js](https://tesseract.projectnaptha.com)

---

## 🎯 CONCLUSIÓN

Este documento proporciona una guía completa para implementar un sistema profesional de gestión de archivos adjuntos. La implementación modular permite comenzar con un MVP funcional y escalar según las necesidades y presupuesto disponible.

**Próximos pasos**:
1. Revisar y aprobar el plan
2. Configurar el entorno de desarrollo
3. Comenzar con Fase 1
4. Iterar basándose en feedback

**Última actualización**: [FECHA]
**Estado actual**: Diseño completo, pendiente implementación