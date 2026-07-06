import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In } from 'typeorm';
import { FamilyAccessControl } from '../entities/family-access-control.entity';
import { FamilyAccessLog, AccessAction } from '../entities/family-access-log.entity';
import { StudentNote } from '../entities/student-note.entity';
import { CreateFamilyAccessControlDto, UpdateFamilyAccessControlDto } from '../dto/family-access-control.dto';
import { FamiliesService } from '../../families/families.service';
import { UserRole } from '../../users/entities/user.entity';

export interface AccessValidationResult {
  allowed: boolean;
  reason?: string;
  remainingViews?: number;
  remainingDownloads?: number;
}

export interface FamilyAccessStats {
  totalViews: number;
  totalDownloads: number;
  todayViews: number;
  todayDownloads: number;
  blockedAttempts: number;
  lastAccess: Date;
  accessControlsCount: number;
}

@Injectable()
export class FamilyAccessService {
  constructor(
    @InjectRepository(FamilyAccessControl)
    private accessControlRepository: Repository<FamilyAccessControl>,
    @InjectRepository(FamilyAccessLog)
    private accessLogRepository: Repository<FamilyAccessLog>,
    @InjectRepository(StudentNote)
    private noteRepository: Repository<StudentNote>,
    private familiesService: FamiliesService,
    private dataSource: DataSource,
  ) {}

  /**
   * Create or update family access control for a student
   */
  async createOrUpdateAccessControl(
    dto: CreateFamilyAccessControlDto
  ): Promise<FamilyAccessControl> {
    // Check if control already exists
    const existing = await this.accessControlRepository.findOne({
      where: {
        studentId: dto.studentId,
        familyId: dto.familyId,
      },
    });

    if (existing) {
      // Update existing control
      Object.assign(existing, dto);
      return await this.accessControlRepository.save(existing);
    } else {
      // Create new control
      const control = this.accessControlRepository.create(dto);
      return await this.accessControlRepository.save(control);
    }
  }

  /**
   * Update family access control
   */
  async updateAccessControl(
    id: string,
    dto: UpdateFamilyAccessControlDto
  ): Promise<FamilyAccessControl> {
    const control = await this.accessControlRepository.findOne({ where: { id } });
    if (!control) {
      throw new NotFoundException('Control de acceso no encontrado');
    }

    Object.assign(control, dto);
    return await this.accessControlRepository.save(control);
  }

  /**
   * Get family access control for a specific student-family pair
   */
  async getAccessControl(
    studentId: string,
    familyId: string
  ): Promise<FamilyAccessControl | null> {
    return await this.accessControlRepository.findOne({
      where: {
        studentId,
        familyId,
      },
      relations: ['student', 'family'],
    });
  }

  /**
   * Get all access controls for a family
   */
  async getFamilyAccessControls(familyId: string): Promise<FamilyAccessControl[]> {
    return await this.accessControlRepository.find({
      where: { familyId },
      relations: ['student', 'student.user', 'student.user.profile'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all access controls for a student
   */
  async getStudentAccessControls(studentId: string): Promise<FamilyAccessControl[]> {
    return await this.accessControlRepository.find({
      where: { studentId },
      relations: ['family', 'family.primaryContact', 'family.primaryContact.profile'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Validate if family can access a specific note
   */
  async validateNoteAccess(
    noteId: string,
    familyUserId: string,
    action: AccessAction = AccessAction.VIEW
  ): Promise<AccessValidationResult> {
    // Get the note
    const note = await this.noteRepository.findOne({
      where: { id: noteId },
      relations: ['author'],
    });

    if (!note) {
      return { allowed: false, reason: 'Nota no encontrada' };
    }

    // Find family for the user
    const family = await this.familiesService.findFamilyByUserId(familyUserId);
    if (!family) {
      return { allowed: false, reason: 'Usuario no pertenece a ninguna familia' };
    }

    // Check if the note author is a child of this family
    console.log('🔧 DEBUG: Checking if note.authorId', note.authorId, 'belongs to family.id', family.id);
    
    // First, convert userId to studentId
    const studentResult = await this.dataSource.query(`
      SELECT id FROM students WHERE "userId" = $1
    `, [note.authorId]);
    
    console.log('🔧 DEBUG: Student lookup result:', studentResult);
    
    if (studentResult.length === 0) {
      console.log('🔧 DEBUG: No student found for userId:', note.authorId);
      return { allowed: false, reason: 'El autor de la nota no es un estudiante' };
    }
    
    const studentId = studentResult[0].id;
    console.log('🔧 DEBUG: Found studentId:', studentId, 'for userId:', note.authorId);
    
    const isChildNote = await this.isStudentOfFamily(studentId, family.id);
    console.log('🔧 DEBUG: isStudentOfFamily result:', isChildNote);
    
    if (!isChildNote) {
      return { allowed: false, reason: 'La nota no pertenece a un hijo de esta familia' };
    }

    // Get access control for this student-family pair
    const accessControl = await this.getAccessControl(note.authorId, family.id);
    
    // If no specific control exists, use default permissive settings
    if (!accessControl) {
      if (action === AccessAction.DOWNLOAD) {
        return { allowed: false, reason: 'Descarga no permitida por configuración por defecto' };
      }
      return { allowed: true };
    }

    // Validate basic access
    const basicValidation = this.validateBasicAccess(accessControl, action);
    if (!basicValidation.allowed) {
      await this.logAccess(family.id, note.authorId, familyUserId, noteId, action, false, basicValidation.reason);
      return basicValidation;
    }

    // Validate time-based restrictions
    const timeValidation = this.validateTimeAccess(accessControl);
    if (!timeValidation.allowed) {
      await this.logAccess(family.id, note.authorId, familyUserId, noteId, action, false, timeValidation.reason);
      return timeValidation;
    }

    // Validate content restrictions
    const contentValidation = this.validateContentAccess(accessControl, note);
    if (!contentValidation.allowed) {
      await this.logAccess(family.id, note.authorId, familyUserId, noteId, action, false, contentValidation.reason);
      return contentValidation;
    }

    // Validate usage limits
    const usageValidation = await this.validateUsageLimits(accessControl, family.id, note.authorId, action);
    if (!usageValidation.allowed) {
      await this.logAccess(family.id, note.authorId, familyUserId, noteId, action, false, usageValidation.reason);
      return usageValidation;
    }

    // Log successful access
    await this.logAccess(family.id, note.authorId, familyUserId, noteId, action, true);

    return { 
      allowed: true,
      remainingViews: usageValidation.remainingViews,
      remainingDownloads: usageValidation.remainingDownloads
    };
  }

  /**
   * Filter notes based on family access controls
   */
  async filterNotesForFamily(
    notes: StudentNote[],
    familyUserId: string
  ): Promise<StudentNote[]> {
    console.log('🔧 DEBUG: filterNotesForFamily called with', notes.length, 'notes, familyUserId:', familyUserId);
    
    const family = await this.familiesService.findFamilyByUserId(familyUserId);
    console.log('🔧 DEBUG: findFamilyByUserId result:', family ? 'found family' : 'family not found');
    
    if (!family) {
      console.log('🔧 DEBUG: No family found, returning empty array');
      return [];
    }

    console.log('🔧 DEBUG: Family found, family.id:', family.id);
    const filteredNotes: StudentNote[] = [];

    for (const note of notes) {
      console.log('🔧 DEBUG: Validating note access for note.id:', note.id);
      const validation = await this.validateNoteAccess(note.id, familyUserId, AccessAction.VIEW);
      console.log('🔧 DEBUG: Note access validation result:', validation);
      if (validation.allowed) {
        filteredNotes.push(note);
        console.log('🔧 DEBUG: Note allowed, added to filtered notes');
      } else {
        console.log('🔧 DEBUG: Note blocked, reason:', validation.reason);
      }
    }

    console.log('🔧 DEBUG: filterNotesForFamily returning', filteredNotes.length, 'notes');
    return filteredNotes;
  }

  /**
   * Get family access statistics
   */
  async getFamilyAccessStats(familyId: string, studentId?: string): Promise<FamilyAccessStats> {
    const whereClause: any = { familyId };
    if (studentId) {
      whereClause.studentId = studentId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total stats
    const [totalViews, totalDownloads, todayViews, todayDownloads, blockedAttempts] = await Promise.all([
      this.accessLogRepository.count({
        where: { ...whereClause, action: AccessAction.VIEW, accessGranted: true }
      }),
      this.accessLogRepository.count({
        where: { ...whereClause, action: AccessAction.DOWNLOAD, accessGranted: true }
      }),
      this.accessLogRepository.count({
        where: { 
          ...whereClause, 
          action: AccessAction.VIEW, 
          accessGranted: true,
          createdAt: Between(today, tomorrow)
        }
      }),
      this.accessLogRepository.count({
        where: { 
          ...whereClause, 
          action: AccessAction.DOWNLOAD, 
          accessGranted: true,
          createdAt: Between(today, tomorrow)
        }
      }),
      this.accessLogRepository.count({
        where: { ...whereClause, accessGranted: false }
      }),
    ]);

    // Get last access
    const lastAccessLog = await this.accessLogRepository.findOne({
      where: { ...whereClause, accessGranted: true },
      order: { createdAt: 'DESC' },
    });

    // Get access controls count
    const accessControlsCount = await this.accessControlRepository.count({
      where: studentId ? { familyId, studentId } : { familyId }
    });

    return {
      totalViews,
      totalDownloads,
      todayViews,
      todayDownloads,
      blockedAttempts,
      lastAccess: lastAccessLog?.createdAt,
      accessControlsCount,
    };
  }

  /**
   * Delete access control
   */
  async deleteAccessControl(id: string): Promise<void> {
    const result = await this.accessControlRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Control de acceso no encontrado');
    }
  }

  // Private helper methods

  private validateBasicAccess(
    control: FamilyAccessControl,
    action: AccessAction
  ): AccessValidationResult {
    if (!control.canViewNotes && action === AccessAction.VIEW) {
      return { allowed: false, reason: 'Visualización de notas no permitida' };
    }

    if (!control.canDownloadFiles && action === AccessAction.DOWNLOAD) {
      return { allowed: false, reason: 'Descarga de archivos no permitida' };
    }

    return { allowed: true };
  }

  private validateTimeAccess(control: FamilyAccessControl): AccessValidationResult {
    const now = new Date();
    
    if (!control.isAccessAllowed(now)) {
      const timeStr = now.toTimeString().substring(0, 5);
      
      if (control.accessStartTime && control.accessEndTime) {
        if (timeStr < control.accessStartTime || timeStr > control.accessEndTime) {
          return { 
            allowed: false, 
            reason: `Acceso solo permitido entre ${control.accessStartTime} y ${control.accessEndTime}` 
          };
        }
      }

      if (control.weekendRestriction) {
        const dayOfWeek = now.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          return { allowed: false, reason: 'Acceso no permitido en fines de semana' };
        }
      }

      if (control.allowedDaysOfWeek && control.allowedDaysOfWeek.length > 0) {
        const dayOfWeek = now.getDay();
        if (!control.allowedDaysOfWeek.includes(dayOfWeek)) {
          return { allowed: false, reason: 'Acceso no permitido en este día de la semana' };
        }
      }
    }

    return { allowed: true };
  }

  private validateContentAccess(
    control: FamilyAccessControl,
    note: StudentNote
  ): AccessValidationResult {
    // Check subject restrictions
    if (note.subject && !control.canAccessSubject(note.subject.name || note.subject.toString())) {
      return { allowed: false, reason: `Acceso no permitido para la materia: ${note.subject.name || note.subject}` };
    }

    // Check note type restrictions
    if (!control.canAccessNoteType(note.type)) {
      return { allowed: false, reason: `Acceso no permitido para el tipo de nota: ${note.type}` };
    }

    // Check file size restrictions - Skip for now since StudentNote doesn't have fileSize
    // TODO: Add fileSize field to StudentNote entity if needed for parental controls
    
    // Check content violations (keywords) - Use content field instead of description
    if (control.hasContentViolation(note.title, note.content || '')) {
      return { allowed: false, reason: 'Contenido bloqueado por filtros de palabras clave' };
    }

    // Check retention period
    if (control.retentionDays > 0) {
      const maxAge = new Date();
      maxAge.setDate(maxAge.getDate() - control.retentionDays);
      if (note.createdAt < maxAge) {
        return { allowed: false, reason: `Solo se pueden ver notas de los últimos ${control.retentionDays} días` };
      }
    }

    return { allowed: true };
  }

  private async validateUsageLimits(
    control: FamilyAccessControl,
    familyId: string,
    studentId: string,
    action: AccessAction
  ): Promise<AccessValidationResult & { remainingViews?: number; remainingDownloads?: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check daily view limit
    if (action === AccessAction.VIEW && control.maxDailyViews > 0) {
      const todayViews = await this.accessLogRepository.count({
        where: {
          familyId,
          studentId,
          action: AccessAction.VIEW,
          accessGranted: true,
          createdAt: Between(today, tomorrow),
        },
      });

      if (todayViews >= control.maxDailyViews) {
        return { 
          allowed: false, 
          reason: `Límite diario de visualizaciones alcanzado (${control.maxDailyViews})`,
          remainingViews: 0
        };
      }

      return { 
        allowed: true, 
        remainingViews: control.maxDailyViews - todayViews 
      };
    }

    // Check daily download limit
    if (action === AccessAction.DOWNLOAD && control.maxDailyDownloads > 0) {
      const todayDownloads = await this.accessLogRepository.count({
        where: {
          familyId,
          studentId,
          action: AccessAction.DOWNLOAD,
          accessGranted: true,
          createdAt: Between(today, tomorrow),
        },
      });

      if (todayDownloads >= control.maxDailyDownloads) {
        return { 
          allowed: false, 
          reason: `Límite diario de descargas alcanzado (${control.maxDailyDownloads})`,
          remainingDownloads: 0
        };
      }

      return { 
        allowed: true, 
        remainingDownloads: control.maxDailyDownloads - todayDownloads 
      };
    }

    return { allowed: true };
  }

  private async logAccess(
    familyId: string,
    studentId: string,
    familyUserId: string,
    noteId?: string,
    action: AccessAction = AccessAction.VIEW,
    accessGranted: boolean = true,
    denialReason?: string
  ): Promise<void> {
    // Get note details if provided
    let note: StudentNote | null = null;
    if (noteId) {
      note = await this.noteRepository.findOne({ where: { id: noteId } });
    }

    const log = this.accessLogRepository.create({
      familyId,
      studentId,
      familyUserId,
      noteId,
      action,
      accessGranted,
      denialReason,
      noteType: note?.type,
      subject: note?.subject?.name || note?.subject?.toString() || null,
      // IP and User Agent would typically be extracted from request context
      // metadata: additional context
    });

    await this.accessLogRepository.save(log);
  }

  private async isStudentOfFamily(studentId: string, familyId: string): Promise<boolean> {
    const result = await this.dataSource.query(`
      SELECT 1 FROM family_students fs
      WHERE fs."familyId" = $1 AND fs."studentId" = $2
    `, [familyId, studentId]);

    return result.length > 0;
  }

  // ==================== RGPD OWNERSHIP CHECKS ====================

  /** ¿El usuario (User.id) es contacto primario o secundario de esta familia? */
  private async isFamilyOwnedByUser(userId: string, familyId: string): Promise<boolean> {
    if (!userId || !familyId) return false;
    const rows = await this.dataSource.query(`
      SELECT 1 FROM families f
      WHERE f.id = $1 AND (f."primaryContactId" = $2 OR f."secondaryContactId" = $2)
      LIMIT 1
    `, [familyId, userId]);
    return rows.length > 0;
  }

  /** ¿El usuario (User.id) es el propio alumno (owner del perfil de estudiante)? */
  private async isStudentSelf(userId: string, studentId: string): Promise<boolean> {
    if (!userId || !studentId) return false;
    const rows = await this.dataSource.query(`
      SELECT 1 FROM students s
      WHERE s.id = $1 AND s."userId" = $2
      LIMIT 1
    `, [studentId, userId]);
    return rows.length > 0;
  }

  /** ¿El usuario familia (User.id) tutela a este alumno? */
  private async doesUserGuardStudent(userId: string, studentId: string): Promise<boolean> {
    if (!userId || !studentId) return false;
    const rows = await this.dataSource.query(`
      SELECT 1 FROM family_students fs
      JOIN families f ON f.id = fs."familyId"
      WHERE fs."studentId" = $1 AND (f."primaryContactId" = $2 OR f."secondaryContactId" = $2)
      LIMIT 1
    `, [studentId, userId]);
    return rows.length > 0;
  }

  /**
   * RGPD: valida que el usuario puede operar sobre los controles de esta familia.
   * ADMIN acceso total; FAMILY solo su propia familia; el resto denegado.
   */
  async assertUserCanAccessFamily(user: any, familyId: string): Promise<void> {
    if (user?.role === UserRole.ADMIN) return;
    if (user?.role === UserRole.FAMILY && (await this.isFamilyOwnedByUser(user.id, familyId))) return;
    throw new ForbiddenException('No tienes acceso a los controles de esta familia');
  }

  /**
   * RGPD: valida que el usuario puede operar sobre los controles de este alumno.
   * ADMIN acceso total; STUDENT solo su propio perfil; FAMILY solo alumnos que tutela.
   */
  async assertUserCanAccessStudent(user: any, studentId: string): Promise<void> {
    if (user?.role === UserRole.ADMIN) return;
    if (user?.role === UserRole.STUDENT && (await this.isStudentSelf(user.id, studentId))) return;
    if (user?.role === UserRole.FAMILY && (await this.doesUserGuardStudent(user.id, studentId))) return;
    throw new ForbiddenException('No tienes acceso a los controles de este alumno');
  }

  /**
   * RGPD: valida acceso a un control identificado por par alumno-familia.
   * ADMIN total; FAMILY si es su familia; STUDENT si es su propio perfil.
   */
  async assertUserCanAccessStudentFamilyPair(user: any, studentId: string, familyId: string): Promise<void> {
    if (user?.role === UserRole.ADMIN) return;
    // No basta con poseer uno de los dos ids: el par alumno-familia debe ser real
    // (esa familia tutela a ese alumno), además de que el usuario sea su dueño.
    if (
      user?.role === UserRole.FAMILY &&
      (await this.isFamilyOwnedByUser(user.id, familyId)) &&
      (await this.isStudentOfFamily(studentId, familyId))
    ) {
      return;
    }
    if (
      user?.role === UserRole.STUDENT &&
      (await this.isStudentSelf(user.id, studentId)) &&
      (await this.isStudentOfFamily(studentId, familyId))
    ) {
      return;
    }
    throw new ForbiddenException('No tienes acceso a este control de acceso');
  }

  /**
   * RGPD: valida acceso a un control por su id (PUT/DELETE). Carga el control para
   * resolver su alumno/familia y comprueba la propiedad del usuario.
   */
  async assertUserCanManageControl(user: any, controlId: string): Promise<void> {
    if (user?.role === UserRole.ADMIN) return;
    const control = await this.accessControlRepository.findOne({ where: { id: controlId } });
    if (!control) {
      throw new NotFoundException('Control de acceso no encontrado');
    }
    if (user?.role === UserRole.FAMILY && (await this.isFamilyOwnedByUser(user.id, control.familyId))) return;
    if (user?.role === UserRole.STUDENT && (await this.isStudentSelf(user.id, control.studentId))) return;
    throw new ForbiddenException('No tienes acceso a este control de acceso');
  }
}