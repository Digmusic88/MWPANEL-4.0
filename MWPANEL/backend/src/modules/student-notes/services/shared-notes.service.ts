import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { SharedNote, SharedNoteType, SharedNoteStatus } from '../entities/shared-note.entity';
import { StudentNote } from '../entities/student-note.entity';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { User } from '../../users/entities/user.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { GoogleDriveService } from '../../educational-resources/services/google-drive.service';
import { NotificationService } from '../../communications/services/notification.service';
import { Notification, NotificationType } from '../../communications/entities/notification.entity';
import { 
  ShareNoteDto, 
  SharedNotesQueryDto, 
  UpdateSharedNoteDto,
  ClassmateDto,
  StudentTeacherDto,
  SharedNoteResponseDto
} from '../dto/share-note.dto';

@Injectable()
export class SharedNotesService {
  constructor(
    @InjectRepository(SharedNote)
    private sharedNoteRepository: Repository<SharedNote>,
    @InjectRepository(StudentNote)
    private studentNoteRepository: Repository<StudentNote>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(SubjectAssignment)
    private subjectAssignmentRepository: Repository<SubjectAssignment>,
    @InjectRepository(ClassGroup)
    private classGroupRepository: Repository<ClassGroup>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private googleDriveService: GoogleDriveService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Obtener compañeros de clase de un estudiante
   */
  async getClassmates(userId: string): Promise<ClassmateDto[]> {
    // Buscar el estudiante
    const student = await this.studentRepository.findOne({
      where: { user: { id: userId } },
      relations: ['classGroups', 'classGroups.students', 'classGroups.students.user', 'classGroups.students.user.profile'],
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const classmatesMap = new Map<string, ClassmateDto>();

    // Recorrer todas las clases del estudiante
    for (const classGroup of student.classGroups) {
      for (const classmate of classGroup.students) {
        // Excluir al propio estudiante
        if (classmate.id === student.id) continue;

        const classmateId = classmate.user.id;
        
        if (!classmatesMap.has(classmateId)) {
          classmatesMap.set(classmateId, {
            id: classmateId,
            firstName: classmate.user.profile?.firstName || 'N/A',
            lastName: classmate.user.profile?.lastName || 'N/A',
            email: classmate.user.email,
            photoUrl: classmate.user.profile?.avatarUrl,
            classGroups: [],
          });
        }

        // Añadir información de la clase
        const classmateDto = classmatesMap.get(classmateId)!;
        if (!classmateDto.classGroups.find(cg => cg.id === classGroup.id)) {
          classmateDto.classGroups.push({
            id: classGroup.id,
            name: classGroup.name,
            section: classGroup.section,
          });
        }
      }
    }

    return Array.from(classmatesMap.values());
  }

  /**
   * Obtener profesores de un estudiante
   */
  async getStudentTeachers(userId: string): Promise<StudentTeacherDto[]> {
    // Buscar el estudiante
    const student = await this.studentRepository.findOne({
      where: { user: { id: userId } },
      relations: ['classGroups'],
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const classGroupIds = student.classGroups.map(cg => cg.id);

    // Buscar asignaciones de materias para las clases del estudiante
    const subjectAssignments = await this.subjectAssignmentRepository.find({
      where: { classGroupId: In(classGroupIds) },
      relations: ['teacher', 'teacher.user', 'teacher.user.profile', 'subject', 'classGroup'],
    });

    const teachersMap = new Map<string, StudentTeacherDto>();

    for (const assignment of subjectAssignments) {
      const teacherId = assignment.teacher.user.id;
      
      if (!teachersMap.has(teacherId)) {
        teachersMap.set(teacherId, {
          id: teacherId,
          firstName: assignment.teacher.user.profile?.firstName || 'N/A',
          lastName: assignment.teacher.user.profile?.lastName || 'N/A',
          email: assignment.teacher.user.email,
          photoUrl: assignment.teacher.user.profile?.avatarUrl,
          subjects: [],
        });
      }

      // Añadir información de la materia
      const teacherDto = teachersMap.get(teacherId)!;
      teacherDto.subjects.push({
        id: assignment.subject.id,
        name: assignment.subject.name,
        classGroup: {
          id: assignment.classGroup.id,
          name: assignment.classGroup.name,
          section: assignment.classGroup.section,
        },
      });
    }

    return Array.from(teachersMap.values());
  }

  /**
   * Compartir un apunte
   */
  async shareNote(noteId: string, userId: string, shareNoteDto: ShareNoteDto): Promise<SharedNote[]> {
    console.log('=== SHARE NOTE SERVICE CALLED ===');
    console.log('Note ID:', noteId);
    console.log('User ID:', userId);
    console.log('Recipients:', shareNoteDto.recipientIds);
    
    // Verificar que el apunte existe y pertenece al usuario
    const note = await this.studentNoteRepository.findOne({
      where: { id: noteId, authorId: userId },
      relations: ['subject'],
    });

    console.log('🔔 VALIDACIÓN: Apunte encontrado:', !!note);

    if (!note) {
      throw new NotFoundException('Apunte no encontrado o no tienes permisos para compartirlo');
    }

    // Verificar que no sea privado si se está compartiendo
    if (note.isPrivate) {
      throw new BadRequestException('No puedes compartir un apunte privado');
    }

    console.log('🔔 VALIDACIÓN: Apunte no es privado, continuando...');

    // Verificar que los destinatarios existen y son válidos
    await this.validateRecipients(userId, shareNoteDto.recipientIds, shareNoteDto.sharedWithType);

    console.log('🔔 VALIDACIÓN: Destinatarios validados correctamente');

    // Crear permisos
    const permissions = {
      view: true,
      comment: shareNoteDto.allowComments || false,
      download: shareNoteDto.allowDownload || false,
    };

    const sharedNotes: SharedNote[] = [];

    console.log('🔔 BUCLE: Iniciando loop para', shareNoteDto.recipientIds.length, 'destinatarios');

    // Crear registro para cada destinatario
    for (const recipientId of shareNoteDto.recipientIds) {
      console.log('🔔 BUCLE: Procesando destinatario', recipientId);
      
      // Verificar que no esté ya compartido con este usuario
      const existingShare = await this.sharedNoteRepository.findOne({
        where: {
          noteId,
          sharedById: userId,
          sharedWithId: recipientId,
          status: SharedNoteStatus.ACTIVE,
        },
      });

      console.log('🔔 DUPLICADO: ¿Ya existe compartido?', !!existingShare);

      if (existingShare) {
        console.log('🔔 SKIP: Saltando destinatario ya compartido', recipientId);
        continue; // Skip if already shared
      }

      console.log('🔔 CREAR: Creando nuevo SharedNote para', recipientId);

      const sharedNote = this.sharedNoteRepository.create({
        noteId,
        sharedById: userId,
        sharedWithId: recipientId,
        sharedWithType: shareNoteDto.sharedWithType,
        message: shareNoteDto.message,
        expiresAt: shareNoteDto.expiresAt ? new Date(shareNoteDto.expiresAt) : null,
        permissions: JSON.stringify(permissions),
        status: SharedNoteStatus.ACTIVE,
      });

      console.log('🔔 GUARDAR: Guardando SharedNote en BD...');
      const savedSharedNote = await this.sharedNoteRepository.save(sharedNote);
      sharedNotes.push(savedSharedNote);

      console.log('🔔 GUARDADO: SharedNote guardado con ID:', savedSharedNote.id);
      console.log('🔔 NOTIFICACIÓN: Iniciando creación de notificación...');
      
      // Crear notificación en la campana para el destinatario
      try {
        console.log('🔔 LLAMANDO: createSharedNoteNotification...');
        await this.createSharedNoteNotification(savedSharedNote, note, userId, recipientId);
        console.log('🔔 ÉXITO: Notificación creada exitosamente para:', savedSharedNote.id);
      } catch (error) {
        console.error('🔔 ERROR: Failed to create notification for shared note:', savedSharedNote.id, error);
      }
    }

    return sharedNotes;
  }

  /**
   * Obtener apuntes compartidos conmigo
   */
  async getSharedWithMe(userId: string, query: SharedNotesQueryDto): Promise<{
    sharedNotes: SharedNoteResponseDto[];
    total: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, sharedWithType, search, sortBy = 'sharedAt', sortOrder = 'DESC' } = query;
    
    const queryBuilder = this.sharedNoteRepository.createQueryBuilder('sn')
      .leftJoinAndSelect('sn.note', 'note')
      .leftJoinAndSelect('sn.sharedBy', 'sharedBy')
      .leftJoinAndSelect('sn.sharedWith', 'sharedWith')
      .leftJoinAndSelect('sharedBy.profile', 'sharedByProfile')
      .leftJoinAndSelect('sharedWith.profile', 'sharedWithProfile')
      .leftJoinAndSelect('note.subject', 'subject')
      .where('sn.sharedWithId = :userId', { userId })
      .andWhere('sn.status NOT IN (:...excludedStatuses)', { excludedStatuses: [SharedNoteStatus.REVOKED] })
      .andWhere('note.isPrivate = :isPrivate', { isPrivate: false }); // Excluir notas privadas

    if (sharedWithType) {
      queryBuilder.andWhere('sn.sharedWithType = :sharedWithType', { sharedWithType });
    }

    if (search) {
      queryBuilder.andWhere('(note.title ILIKE :search OR note.content ILIKE :search)', { 
        search: `%${search}%` 
      });
    }

    // Count total
    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    // Get paginated results
    const sharedNotes = await queryBuilder
      .orderBy(`sn.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    console.log('📊 SHARED WITH ME - Found sharedNotes before mapping:', sharedNotes.length, 'notes');
    const responseData = await Promise.all(sharedNotes.map(note => this.mapToResponseDto(note)));

    return {
      sharedNotes: responseData,
      total,
      totalPages,
    };
  }

  /**
   * Obtener apuntes que he compartido
   */
  async getSharedByMe(userId: string, query: SharedNotesQueryDto): Promise<{
    sharedNotes: SharedNoteResponseDto[];
    total: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, sharedWithType, search, sortBy = 'sharedAt', sortOrder = 'DESC' } = query;
    
    const queryBuilder = this.sharedNoteRepository.createQueryBuilder('sn')
      .leftJoinAndSelect('sn.note', 'note')
      .leftJoinAndSelect('sn.sharedBy', 'sharedBy')
      .leftJoinAndSelect('sn.sharedWith', 'sharedWith')
      .leftJoinAndSelect('sharedBy.profile', 'sharedByProfile')
      .leftJoinAndSelect('sharedWith.profile', 'sharedWithProfile')
      .leftJoinAndSelect('note.subject', 'subject')
      .where('sn.sharedById = :userId', { userId })
      .andWhere('sn.status NOT IN (:...excludedStatuses)', { excludedStatuses: [SharedNoteStatus.REVOKED] })
      .andWhere('note.isPrivate = :isPrivate', { isPrivate: false }); // Excluir notas privadas

    if (sharedWithType) {
      queryBuilder.andWhere('sn.sharedWithType = :sharedWithType', { sharedWithType });
    }

    if (search) {
      queryBuilder.andWhere('(note.title ILIKE :search OR note.content ILIKE :search)', { 
        search: `%${search}%` 
      });
    }

    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    const sharedNotes = await queryBuilder
      .orderBy(`sn.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const responseData = await Promise.all(sharedNotes.map(note => this.mapToResponseDto(note)));

    return {
      sharedNotes: responseData,
      total,
      totalPages,
    };
  }

  /**
   * Revocar acceso a apunte compartido
   */
  async revokeSharedNote(sharedNoteId: string, userId: string): Promise<void> {
    const sharedNote = await this.sharedNoteRepository.findOne({
      where: { id: sharedNoteId, sharedById: userId },
    });

    if (!sharedNote) {
      throw new NotFoundException('Apunte compartido no encontrado');
    }

    sharedNote.status = SharedNoteStatus.REVOKED;
    await this.sharedNoteRepository.save(sharedNote);
  }

  /**
   * Actualizar apunte compartido
   */
  async updateSharedNote(sharedNoteId: string, userId: string, updateDto: UpdateSharedNoteDto): Promise<SharedNote> {
    const sharedNote = await this.sharedNoteRepository.findOne({
      where: { id: sharedNoteId, sharedById: userId },
    });

    if (!sharedNote) {
      throw new NotFoundException('Apunte compartido no encontrado');
    }

    if (updateDto.message !== undefined) {
      sharedNote.message = updateDto.message;
    }

    if (updateDto.expiresAt !== undefined) {
      sharedNote.expiresAt = new Date(updateDto.expiresAt);
    }

    if (updateDto.isActive !== undefined) {
      sharedNote.status = updateDto.isActive ? SharedNoteStatus.ACTIVE : SharedNoteStatus.REVOKED;
    }

    // Actualizar permisos
    if (updateDto.allowComments !== undefined || updateDto.allowDownload !== undefined) {
      const currentPermissions = sharedNote.permissionsObject;
      if (updateDto.allowComments !== undefined) {
        currentPermissions.comment = updateDto.allowComments;
      }
      if (updateDto.allowDownload !== undefined) {
        currentPermissions.download = updateDto.allowDownload;
      }
      sharedNote.permissionsObject = currentPermissions;
    }

    return await this.sharedNoteRepository.save(sharedNote);
  }

  /**
   * Registrar acceso a apunte compartido
   */
  async recordAccess(sharedNoteId: string, userId: string): Promise<void> {
    const sharedNote = await this.sharedNoteRepository.findOne({
      where: { id: sharedNoteId, sharedWithId: userId },
    });

    if (!sharedNote) {
      throw new NotFoundException('Apunte compartido no encontrado o no tienes permisos para acceder');
    }

    // 🔒 VALIDACIÓN CRÍTICA: Bloquear acceso a apuntes expirados
    if (sharedNote.isExpired) {
      console.log('🚫 Access denied - shared note expired:', {
        sharedNoteId,
        userId,
        expiresAt: sharedNote.expiresAt,
        currentTime: new Date().toISOString()
      });
      throw new BadRequestException('Este apunte compartido ha expirado y ya no está disponible');
    }

    if (sharedNote.isViewable) {
      console.log('✅ Access granted - recording access:', { sharedNoteId, userId });
      sharedNote.lastAccessedAt = new Date();
      sharedNote.accessCount += 1;
      await this.sharedNoteRepository.save(sharedNote);
    } else {
      console.log('🚫 Access denied - note not viewable:', { sharedNoteId, userId });
      throw new BadRequestException('No tienes permisos para ver este apunte');
    }
  }

  /**
   * Stream de archivo para apunte compartido (similar a streamFile pero para shared notes)
   */
  async streamSharedFile(sharedNoteId: string, userId: string): Promise<{
    stream: Buffer;
    contentType: string;
    fileName: string;
  }> {
    console.log('📁🔗 streamSharedFile - Starting:', { sharedNoteId, userId });

    // DEBUG: Verificar qué hay exactamente en la BD para este sharedNoteId
    const allSharedNotes = await this.sharedNoteRepository.find({
      where: { id: sharedNoteId },
      relations: ['note'],
    });
    
    console.log('🔍 DEBUG - All shared notes with this ID:', allSharedNotes.length);
    allSharedNotes.forEach((note, index) => {
      console.log(`🔍 Note ${index + 1}:`, {
        id: note.id,
        sharedById: note.sharedById,
        sharedWithId: note.sharedWithId,
        status: note.status,
        noteId: note.noteId
      });
    });

    console.log('🔍 DEBUG - Query conditions:');
    console.log(`  Condition 1: id='${sharedNoteId}' AND sharedWithId='${userId}'`);
    console.log(`  Condition 2: id='${sharedNoteId}' AND sharedById='${userId}'`);

    // Buscar el apunte compartido y verificar permisos (tanto para quien envió como quien recibió)
    const sharedNote = await this.sharedNoteRepository.findOne({
      where: [
        { id: sharedNoteId, sharedWithId: userId },  // Usuario que recibió el apunte
        { id: sharedNoteId, sharedById: userId }     // Usuario que envió el apunte
      ],
      relations: ['note'],
    });

    console.log('📋 Query result:', {
      found: !!sharedNote,
      queryUserId: userId,
      foundSharedById: sharedNote?.sharedById,
      foundSharedWithId: sharedNote?.sharedWithId,
      matches: sharedNote ? [
        `sharedWithId match: ${sharedNote.sharedWithId === userId}`,
        `sharedById match: ${sharedNote.sharedById === userId}`
      ] : ['No matches']
    });

    if (!sharedNote) {
      console.log('❌ Shared note not found or no permissions');
      throw new NotFoundException('Apunte compartido no encontrado o no tienes permisos para acceder');
    }

    // Verificar que no esté expirado
    if (sharedNote.isExpired) {
      console.log('❌ Shared note is expired');
      throw new BadRequestException('Este apunte compartido ha expirado y ya no está disponible');
    }

    // Verificar permisos de visualización
    if (!sharedNote.isViewable) {
      console.log('❌ No view permissions');
      throw new BadRequestException('No tienes permisos para ver este apunte');
    }

    const note = sharedNote.note;

    if (!note.driveFileId) {
      console.log('❌ No drive file ID');
      throw new BadRequestException('El apunte no tiene archivo adjunto');
    }

    console.log('🔗 Downloading from Google Drive:', { driveFileId: note.driveFileId });

    try {
      // Usar el servicio de Google Drive para descargar el archivo
      const fileBuffer = await this.googleDriveService.downloadFile(note.driveFileId);
      
      // Determinar content type basado en el tipo de nota y metadata
      let contentType = 'application/octet-stream';
      if (note.metadata?.mimeType) {
        contentType = note.metadata.mimeType;
      } else if (note.type === 'voice') {
        contentType = 'audio/mpeg';
      } else if (note.type === 'drawing') {
        contentType = 'image/png';
      }

      console.log('✅ File stream successful:', {
        bufferSize: fileBuffer.length,
        contentType,
        fileName: note.fileName
      });

      // Registrar el acceso
      sharedNote.lastAccessedAt = new Date();
      sharedNote.accessCount += 1;
      await this.sharedNoteRepository.save(sharedNote);

      return {
        stream: fileBuffer,
        contentType,
        fileName: note.fileName || 'archivo',
      };
    } catch (error) {
      console.error('🚨 Error downloading shared file from Google Drive:', error);
      throw new BadRequestException('Error al obtener el archivo: ' + error.message);
    }
  }

  /**
   * Eliminar apunte expirado de la lista (tanto receptor como emisor pueden eliminarlo)
   * Esta función oculta el apunte de las listas sin eliminarlo físicamente de la BD
   */
  async removeExpiredSharedNote(sharedNoteId: string, userId: string): Promise<void> {
    console.log('🗑️ removeExpiredSharedNote called:', { sharedNoteId, userId });

    // Permitir eliminar tanto al receptor (sharedWithId) como al emisor (sharedById)
    const sharedNote = await this.sharedNoteRepository.findOne({
      where: [
        { id: sharedNoteId, sharedWithId: userId }, // Receptor puede eliminar
        { id: sharedNoteId, sharedById: userId }    // Emisor puede eliminar
      ],
    });

    console.log('🔍 sharedNote found:', {
      found: !!sharedNote,
      id: sharedNote?.id,
      status: sharedNote?.status,
      isExpired: sharedNote?.isExpired,
      sharedById: sharedNote?.sharedById,
      sharedWithId: sharedNote?.sharedWithId,
      expiresAt: sharedNote?.expiresAt
    });

    if (!sharedNote) {
      console.log('❌ Shared note not found or no permissions');
      throw new NotFoundException('Apunte compartido no encontrado o no tienes permisos para eliminarlo');
    }

    // Verificar que el apunte esté expirado O revocado (permitir eliminar ambos)
    if (!sharedNote.isExpired && sharedNote.status !== SharedNoteStatus.REVOKED) {
      console.log('❌ Note is not expired or revoked, cannot delete');
      throw new BadRequestException('Solo se pueden eliminar apuntes expirados o revocados');
    }

    console.log('✅ All validations passed, marking as REVOKED for hiding from lists');

    // Cambiar el status a 'revoked' - esto hará que las consultas lo excluyan automáticamente
    sharedNote.status = SharedNoteStatus.REVOKED;
    const savedNote = await this.sharedNoteRepository.save(sharedNote);
    
    console.log('💾 Note saved successfully - will be hidden from lists:', {
      id: savedNote.id,
      newStatus: savedNote.status,
      isRevoked: savedNote.status === SharedNoteStatus.REVOKED,
      willBeHidden: true
    });
  }

  /**
   * Validar que los destinatarios son válidos para compartir
   */
  private async validateRecipients(userId: string, recipientIds: string[], sharedWithType: SharedNoteType): Promise<void> {
    if (sharedWithType === SharedNoteType.STUDENT) {
      const classmates = await this.getClassmates(userId);
      const classmateIds = classmates.map(c => c.id);
      
      for (const recipientId of recipientIds) {
        if (!classmateIds.includes(recipientId)) {
          throw new ForbiddenException(`No puedes compartir con el usuario ${recipientId} - no es tu compañero de clase`);
        }
      }
    } else if (sharedWithType === SharedNoteType.TEACHER) {
      const teachers = await this.getStudentTeachers(userId);
      const teacherIds = teachers.map(t => t.id);
      
      for (const recipientId of recipientIds) {
        if (!teacherIds.includes(recipientId)) {
          throw new ForbiddenException(`No puedes compartir con el usuario ${recipientId} - no es tu profesor`);
        }
      }
    }
  }

  /**
   * Mapear entidad a DTO de respuesta
   */
  private async mapToResponseDto(sharedNote: SharedNote): Promise<SharedNoteResponseDto> {
    console.log('🚀 mapToResponseDto INICIO - Processing sharedNote:', sharedNote.id);
    // DEBUG: Verificar qué datos tenemos
    console.log('🔍 SharedNotesService DEBUG:', {
      noteId: sharedNote.note.id,
      noteType: sharedNote.note.type,
      driveFileId: sharedNote.note.driveFileId,
      webViewLink: sharedNote.note.webViewLink,
      webContentLink: sharedNote.note.webContentLink,
      noteObject: Object.keys(sharedNote.note)
    });
    
    // 🔧 GENERACIÓN CORRECTA DE URLs SEGÚN TIPO DE ARCHIVO
    let fileUrl: string | null = null;
    
    console.log('🔧 GOOGLE DRIVE URL GENERATION - driveFileId available:', !!sharedNote.note.driveFileId);
    console.log('🔧 Note type:', sharedNote.note.type);
    
    if (sharedNote.note.driveFileId) {
      const driveFileId = sharedNote.note.driveFileId;
      
      // Generar URL según el tipo de archivo para evitar CORS
      if (sharedNote.note.type === 'voice') {
        // Para audio: usar direct view con formato específico
        fileUrl = `https://drive.google.com/file/d/${driveFileId}/view`;
        console.log('🎵 VOICE - Generated direct view URL:', fileUrl);
      } else if (sharedNote.note.type === 'drawing') {
        // Para imágenes: usar thumbnail o direct link
        fileUrl = `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w1000`;
        console.log('🎨 DRAWING - Generated thumbnail URL:', fileUrl);
      } else {
        // Para otros tipos: usar formato de descarga
        fileUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
        console.log('📄 OTHER - Generated download URL:', fileUrl);
      }
    } else if (sharedNote.note.webViewLink) {
      fileUrl = sharedNote.note.webViewLink;
      console.log('🔧 Using webViewLink:', fileUrl);
    } else {
      console.log('🔧 No URL available');
    }

    console.log('🏁 FINAL RESULT - fileUrl before return:', fileUrl);
    return {
      id: sharedNote.id,
      noteId: sharedNote.noteId,
      note: {
        id: sharedNote.note.id,
        title: sharedNote.note.title,
        type: sharedNote.note.type,
        content: sharedNote.note.content,
        fileUrl: fileUrl,
        fileName: sharedNote.note.fileName,
        fileMimeType: sharedNote.note.metadata?.mimeType,
        fileSize: sharedNote.note.metadata?.fileSize,
        metadata: sharedNote.note.metadata,
        tags: sharedNote.note.tags,
        createdAt: sharedNote.note.createdAt,
        subject: sharedNote.note.subject ? {
          id: sharedNote.note.subject.id,
          name: sharedNote.note.subject.name,
        } : undefined,
      },
      sharedBy: {
        id: sharedNote.sharedBy.id,
        firstName: sharedNote.sharedBy.profile?.firstName || 'N/A',
        lastName: sharedNote.sharedBy.profile?.lastName || 'N/A',
        email: sharedNote.sharedBy.email,
      },
      sharedWith: {
        id: sharedNote.sharedWith.id,
        firstName: sharedNote.sharedWith.profile?.firstName || 'N/A',
        lastName: sharedNote.sharedWith.profile?.lastName || 'N/A',
        email: sharedNote.sharedWith.email,
      },
      sharedWithType: sharedNote.sharedWithType,
      status: sharedNote.status,
      message: sharedNote.message,
      permissions: sharedNote.permissionsObject,
      expiresAt: sharedNote.expiresAt,
      lastAccessedAt: sharedNote.lastAccessedAt,
      accessCount: sharedNote.accessCount,
      sharedAt: sharedNote.sharedAt,
      isExpired: sharedNote.isExpired,
      isViewable: sharedNote.isViewable,
    };
  }

  /**
   * Crear notificación para apunte compartido
   */
  private async createSharedNoteNotification(
    sharedNote: SharedNote, 
    note: StudentNote, 
    sharerId: string, 
    recipientId: string
  ): Promise<void> {
    console.log('🚀 DEBUG: createSharedNoteNotification called with:', {
      sharedNoteId: sharedNote.id,
      noteTitle: note.title,
      sharerId,
      recipientId
    });
    
    try {
      // Obtener información del usuario que comparte
      const sharer = await this.userRepository.findOne({
        where: { id: sharerId },
        relations: ['profile'],
      });

      // Obtener información del destinatario
      const recipient = await this.userRepository.findOne({
        where: { id: recipientId },
        relations: ['profile'],
      });

      if (!sharer || !recipient) {
        console.error('Usuario no encontrado para notificación de apunte compartido');
        return;
      }

      const sharerName = sharer.profile 
        ? `${sharer.profile.firstName} ${sharer.profile.lastName}`.trim()
        : sharer.email.split('@')[0];

      // Crear notificación en la base de datos
      const notification = this.notificationRepository.create({
        title: `📝 ${sharerName} ha compartido un apunte contigo`,
        content: `Has recibido un nuevo apunte: "${note.title}" de tipo ${note.type}`,
        type: NotificationType.SHARED_NOTE,
        userId: recipientId,
        triggeredById: sharerId,
        relatedResourceId: sharedNote.id,
        relatedResourceType: 'shared_note',
        actionUrl: `/student/notes/shared/${sharedNote.id}`,
      });

      await this.notificationRepository.save(notification);

      // También enviar notificación por email usando el servicio de notificaciones
      await this.notificationService.notifySharedNote(recipientId, {
        noteTitle: note.title,
        sharerName: sharerName,
        noteType: note.type,
        subjectName: note.subject?.name || 'General',
        sharedNoteId: sharedNote.id,
        message: sharedNote.message,
      }, sharerId);

      console.log(`✅ Notificación creada para apunte compartido: ${sharedNote.id} -> ${recipientId}`);

    } catch (error) {
      console.error('Error creando notificación para apunte compartido:', error);
      // No lanzamos el error para no fallar la operación principal de compartir
    }
  }
}