import { Injectable, NotFoundException, BadRequestException, ForbiddenException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not, In } from 'typeorm';
import { AttendanceRecord, AttendanceStatus } from './entities/attendance-record.entity';
import { AttendanceRequest, AttendanceRequestStatus, AttendanceRequestType } from './entities/attendance-request.entity';
import { Student } from '../students/entities/student.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { CommunicationsService } from '../communications/communications.service';
import { MessageType, MessagePriority } from '../communications/entities/message.entity';
import { Notification, NotificationType, NotificationStatus } from '../communications/entities/notification.entity';
import { FamilyAlertsService } from '../families/services/family-alerts.service';
import { EmailService } from '../communications/services/email.service';
import { EmailTemplateType } from '../communications/entities/email-template.entity';
import { EmailPriority } from '../communications/entities/email-notification.entity';
import {
  CreateAttendanceRecordDto,
  UpdateAttendanceRecordDto,
  CreateAttendanceRequestDto,
  ReviewAttendanceRequestDto,
  BulkMarkPresentDto,
} from './dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRecordRepository: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceRequest)
    private readonly attendanceRequestRepository: Repository<AttendanceRequest>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ClassGroup)
    private readonly classGroupRepository: Repository<ClassGroup>,
    @InjectRepository(Family)
    private readonly familyRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private readonly familyStudentRepository: Repository<FamilyStudent>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @Inject(forwardRef(() => CommunicationsService))
    private readonly communicationsService: CommunicationsService,
    @Inject(forwardRef(() => FamilyAlertsService))
    private readonly familyAlertsService: FamilyAlertsService,
    private readonly emailService: EmailService,
  ) {}

  // ==================== ATTENDANCE RECORDS ====================

  async createAttendanceRecord(
    createDto: CreateAttendanceRecordDto,
    userId: string,
  ): Promise<AttendanceRecord> {
    // Verificar que el estudiante existe
    const student = await this.studentRepository.findOne({
      where: { id: createDto.studentId },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Verificar si ya existe un registro para esa fecha
    const existingRecord = await this.attendanceRecordRepository.findOne({
      where: {
        studentId: createDto.studentId,
        date: new Date(createDto.date),
      },
    });

    if (existingRecord) {
      throw new BadRequestException('Ya existe un registro de asistencia para este estudiante en esta fecha');
    }

    const record = this.attendanceRecordRepository.create({
      ...createDto,
      date: new Date(createDto.date),
      markedById: userId,
      markedAt: new Date(),
    });

    const savedRecord = await this.attendanceRecordRepository.save(record);

    // Generar notificaciones automáticas para familias si es ausencia o tardanza
    await this.triggerFamilyNotifications(createDto.studentId, createDto.status, new Date(createDto.date));

    return savedRecord;
  }

  async updateAttendanceRecord(
    id: string,
    updateDto: UpdateAttendanceRecordDto,
    userId: string,
  ): Promise<AttendanceRecord> {
    const record = await this.attendanceRecordRepository.findOne({
      where: { id },
      relations: ['student'],
    });

    if (!record) {
      throw new NotFoundException('Registro de asistencia no encontrado');
    }

    const previousStatus = record.status;
    Object.assign(record, updateDto);
    record.markedById = userId;
    record.markedAt = new Date();

    const updatedRecord = await this.attendanceRecordRepository.save(record);

    // Generar notificaciones automáticas si el estado cambió a ausencia o tardanza
    if (updateDto.status && updateDto.status !== previousStatus) {
      await this.triggerFamilyNotifications(record.studentId, updateDto.status, record.date);
    }

    return updatedRecord;
  }

  async deleteAttendanceRecord(id: string): Promise<void> {
    const record = await this.attendanceRecordRepository.findOne({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Registro de asistencia no encontrado');
    }

    await this.attendanceRecordRepository.remove(record);
  }

  /** RGPD: studentId del registro (para validar acceso del profesor en el controlador). */
  async getRecordStudentId(id: string): Promise<string | undefined> {
    const record = await this.attendanceRecordRepository.findOne({ where: { id } });
    return record?.studentId;
  }

  /** RGPD: studentId de la solicitud (para validar acceso del profesor en el controlador). */
  async getRequestStudentId(id: string): Promise<string | undefined> {
    const request = await this.attendanceRequestRepository.findOne({ where: { id } });
    return request?.studentId;
  }

  async getAttendanceByGroup(
    classGroupId: string,
    date: string,
  ): Promise<AttendanceRecord[]> {
    // Obtener todos los estudiantes del grupo
    const classGroup = await this.classGroupRepository.findOne({
      where: { id: classGroupId },
      relations: ['students', 'students.user', 'students.user.profile'],
    });

    if (!classGroup) {
      throw new NotFoundException('Grupo de clase no encontrado');
    }

    // Filtrar solo estudiantes activos
    const students = classGroup.students.filter(student => student.user?.isActive === true);

    const studentIds = students.map(s => s.id);

    // Obtener registros de asistencia para esos estudiantes en la fecha especificada
    const records = await this.attendanceRecordRepository.find({
      where: {
        studentId: In(studentIds),
        date: new Date(date),
      },
      relations: ['student', 'student.user', 'student.user.profile', 'markedBy'],
    });

    return records;
  }

  async getAttendanceByStudent(
    studentId: string,
    startDate?: string,
    endDate?: string,
    requestingUserId?: string,
    requestingUserRole?: string,
    academicYearId?: string,
  ): Promise<AttendanceRecord[]> {
    // SECURITY CHECK: If requesting user is family, verify they have access to this student
    if (requestingUserRole === 'family' && requestingUserId) {
      const hasAccess = await this.verifyFamilyStudentAccess(requestingUserId, studentId);
      if (!hasAccess) {
        throw new ForbiddenException('No tienes permisos para ver la asistencia de este estudiante');
      }
    }

    // SECURITY CHECK: A student can only view their own attendance (fail-closed)
    if (requestingUserRole === 'student') {
      const student = await this.studentRepository.findOne({
        where: { id: studentId },
        relations: ['user'],
      });
      if (!student || student.user.id !== requestingUserId) {
        throw new ForbiddenException('No tienes permisos para ver la asistencia de este estudiante');
      }
    }

    const where: any = { studentId };

    if (startDate && endDate) {
      where.date = Between(new Date(startDate), new Date(endDate));
    }

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    return await this.attendanceRecordRepository.find({
      where,
      relations: ['markedBy', 'approvedRequest'],
      order: { date: 'DESC' },
    });
  }

  async bulkMarkPresent(
    bulkDto: BulkMarkPresentDto,
    userId: string,
  ): Promise<{ created: number; skipped: number }> {
    // Obtener todos los estudiantes del grupo
    const classGroup = await this.classGroupRepository.findOne({
      where: { id: bulkDto.classGroupId },
      relations: ['students', 'students.user'],
    });

    if (!classGroup) {
      throw new NotFoundException('Grupo de clase no encontrado');
    }

    // Filtrar solo estudiantes activos
    const students = classGroup.students.filter(student => student.user?.isActive === true);

    const targetDate = new Date(bulkDto.date);
    let created = 0;
    let skipped = 0;

    for (const student of students) {
      // Saltar si está en la lista de exclusión
      if (bulkDto.excludeStudentIds?.includes(student.id)) {
        skipped++;
        continue;
      }

      // Verificar si ya existe un registro
      const existingRecord = await this.attendanceRecordRepository.findOne({
        where: {
          studentId: student.id,
          date: targetDate,
        },
      });

      if (existingRecord) {
        skipped++;
        continue;
      }

      // Crear registro como presente
      const record = this.attendanceRecordRepository.create({
        studentId: student.id,
        date: targetDate,
        status: AttendanceStatus.PRESENT,
        markedById: userId,
        markedAt: new Date(),
      });

      await this.attendanceRecordRepository.save(record);
      created++;
    }

    return { created, skipped };
  }

  // ==================== ATTENDANCE REQUESTS ====================

  async createAttendanceRequest(
    createDto: CreateAttendanceRequestDto,
    userId: string,
  ): Promise<AttendanceRequest> {
    // Verificar que el usuario puede crear solicitudes para este estudiante
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Si es familia, verificar que el estudiante está relacionado
    if (user.role === UserRole.FAMILY) {
      const familyRelation = await this.familyStudentRepository.findOne({
        where: {
          family: { primaryContact: { id: userId } },
          student: { id: createDto.studentId },
        },
        relations: ['family', 'family.primaryContact', 'family.secondaryContact', 'student'],
      });

      // También verificar si es contacto secundario
      const familyRelationSecondary = !familyRelation ? await this.familyStudentRepository.findOne({
        where: {
          family: { secondaryContact: { id: userId } },
          student: { id: createDto.studentId },
        },
        relations: ['family', 'family.primaryContact', 'family.secondaryContact', 'student'],
      }) : null;

      if (!familyRelation && !familyRelationSecondary) {
        throw new ForbiddenException('No tienes permisos para crear solicitudes para este estudiante');
      }
    }

    // Verificar que no haya una solicitud pendiente para la misma fecha
    const existingRequest = await this.attendanceRequestRepository.findOne({
      where: {
        studentId: createDto.studentId,
        date: new Date(createDto.date),
        status: AttendanceRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException('Ya existe una solicitud pendiente para esta fecha');
    }

    // Validar fechas (no permitir fechas muy pasadas o muy futuras)
    const requestDate = new Date(createDto.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((requestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < -7) {
      throw new BadRequestException('No se pueden crear solicitudes para fechas de más de 7 días atrás');
    }
    
    if (daysDiff > 30) {
      throw new BadRequestException('No se pueden crear solicitudes para fechas de más de 30 días en el futuro');
    }

    const request = this.attendanceRequestRepository.create({
      ...createDto,
      date: requestDate,
      requestedById: userId,
    });

    const savedRequest = await this.attendanceRequestRepository.save(request);

    // Enviar notificación por email a profesores sobre la nueva solicitud
    console.log('🔍 DIAGNÓSTICO: Intentando enviar notificación para solicitud:', savedRequest.id);
    try {
      await this.notifyTeachersDirectly(savedRequest.id);
      console.log('✅ DIAGNÓSTICO: Notificación completada exitosamente');
    } catch (error) {
      console.warn('❌ DIAGNÓSTICO: Error enviando notificación a profesores:', error);
      // No bloqueamos la operación principal si falla la notificación
    }

    // Crear notificación in-app para profesores tutores
    try {
      await this.createAttendanceInAppNotification(savedRequest);
    } catch (error) {
      console.warn('❌ Error creando notificación in-app de asistencia:', error);
      // No bloqueamos la operación principal si falla la notificación
    }

    return savedRequest;
  }

  async reviewAttendanceRequest(
    id: string,
    reviewDto: ReviewAttendanceRequestDto,
    userId: string,
  ): Promise<AttendanceRequest> {
    const request = await this.attendanceRequestRepository.findOne({
      where: { id },
      relations: ['student', 'student.classGroups', 'requestedBy'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (request.status !== AttendanceRequestStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya ha sido revisada');
    }

    // Actualizar la solicitud
    request.status = reviewDto.status;
    request.reviewNote = reviewDto.reviewNote;
    request.reviewedById = userId;
    request.reviewedAt = new Date();

    const updatedRequest = await this.attendanceRequestRepository.save(request);

    // Si se aprueba, crear/actualizar el registro de asistencia
    if (reviewDto.status === AttendanceRequestStatus.APPROVED) {
      await this.applyApprovedRequest(request, userId);
    }

    // Enviar notificación a la familia sobre el resultado de la revisión
    await this.sendAttendanceReviewNotification(updatedRequest, userId);

    // Enviar notificación por email a la familia sobre la revisión
    console.log('🔍 DIAGNÓSTICO: Intentando enviar notificación de revisión para solicitud:', updatedRequest.id);
    try {
      await this.notifyFamilyRequestReviewed(updatedRequest.id, userId);
      console.log('✅ DIAGNÓSTICO: Notificación de revisión completada exitosamente');
    } catch (error) {
      console.warn('❌ DIAGNÓSTICO: Error enviando notificación por email a la familia:', error);
      // No bloqueamos la operación principal si falla la notificación
    }

    return updatedRequest;
  }

  private async applyApprovedRequest(
    request: AttendanceRequest,
    userId: string,
  ): Promise<void> {
    // Buscar si ya existe un registro para esa fecha
    let record = await this.attendanceRecordRepository.findOne({
      where: {
        studentId: request.studentId,
        date: request.date,
      },
    });

    // Determinar el estado según el tipo de solicitud
    let status: AttendanceStatus;
    switch (request.type) {
      case AttendanceRequestType.ABSENCE:
        status = AttendanceStatus.JUSTIFIED_ABSENCE;
        break;
      case AttendanceRequestType.LATE_ARRIVAL:
        status = AttendanceStatus.LATE;
        break;
      case AttendanceRequestType.EARLY_DEPARTURE:
        status = AttendanceStatus.EARLY_DEPARTURE;
        break;
    }

    if (record) {
      // Actualizar registro existente
      record.status = status;
      record.justification = request.reason;
      record.approvedRequestId = request.id;
      record.markedById = userId;
      record.markedAt = new Date();
      
      if (request.expectedArrivalTime) {
        record.arrivalTime = request.expectedArrivalTime;
      }
      
      if (request.expectedDepartureTime) {
        record.departureTime = request.expectedDepartureTime;
      }
    } else {
      // Crear nuevo registro
      record = this.attendanceRecordRepository.create({
        studentId: request.studentId,
        date: request.date,
        status,
        justification: request.reason,
        approvedRequestId: request.id,
        markedById: userId,
        markedAt: new Date(),
        arrivalTime: request.expectedArrivalTime,
        departureTime: request.expectedDepartureTime,
      });
    }

    await this.attendanceRecordRepository.save(record);
  }

  async getRequestsByStudent(
    studentId: string,
    status?: AttendanceRequestStatus,
    requestingUserId?: string,
    requestingUserRole?: string,
  ): Promise<AttendanceRequest[]> {
    // SECURITY CHECK: If requesting user is family, verify they have access to this student
    if (requestingUserRole === 'family' && requestingUserId) {
      const hasAccess = await this.verifyFamilyStudentAccess(requestingUserId, studentId);
      if (!hasAccess) {
        throw new ForbiddenException('No tienes permisos para ver las solicitudes de este estudiante');
      }
    }

    // SECURITY CHECK: A student can only view their own requests (fail-closed)
    if (requestingUserRole === 'student') {
      const student = await this.studentRepository.findOne({
        where: { id: studentId },
        relations: ['user'],
      });
      if (!student || student.user.id !== requestingUserId) {
        throw new ForbiddenException('No tienes permisos para ver las solicitudes de este estudiante');
      }
    }

    const where: any = { studentId };

    if (status) {
      where.status = status;
    }

    return await this.attendanceRequestRepository.find({
      where,
      relations: ['requestedBy', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingRequestsByGroup(classGroupId: string): Promise<AttendanceRequest[]> {
    // Obtener grupo con estudiantes
    const classGroup = await this.classGroupRepository.findOne({
      where: { id: classGroupId },
      relations: ['students', 'students.user'],
    });

    if (!classGroup) {
      throw new NotFoundException('Grupo de clase no encontrado');
    }

    // Filtrar solo estudiantes activos
    const activeStudents = classGroup.students.filter(student => student.user?.isActive === true);
    const studentIds = activeStudents.map(s => s.id);

    return await this.attendanceRequestRepository.find({
      where: {
        studentId: In(studentIds),
        status: AttendanceRequestStatus.PENDING,
      },
      relations: ['student', 'student.user', 'student.user.profile', 'requestedBy'],
      order: { createdAt: 'ASC' },
    });
  }

  async getRequestsByUser(userId: string): Promise<AttendanceRequest[]> {
    return await this.attendanceRequestRepository.find({
      where: { requestedById: userId },
      relations: ['student', 'student.user', 'student.user.profile', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== STATISTICS ====================

  async getAttendanceStats(
    classGroupId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    // Obtener grupo con estudiantes
    const classGroup = await this.classGroupRepository.findOne({
      where: { id: classGroupId },
      relations: ['students', 'students.user', 'students.user.profile'],
    });

    if (!classGroup) {
      throw new NotFoundException('Grupo de clase no encontrado');
    }

    // Filtrar solo estudiantes activos
    const students = classGroup.students.filter(student => student.user?.isActive === true);
    const stats = [];

    for (const student of students) {
      const records = await this.attendanceRecordRepository.find({
        where: {
          studentId: student.id,
          date: Between(new Date(startDate), new Date(endDate)),
        },
      });

      // Defensive programming for student name generation
      const profile = student.user?.profile;
      const firstName = profile?.firstName || '';
      const lastName = profile?.lastName || '';
      const fullName = profile?.fullName || '';
      const email = student.user?.email || '';
      
      let studentName = 'Estudiante sin nombre';
      
      if (firstName && lastName) {
        studentName = `${firstName} ${lastName}`;
      } else if (fullName) {
        studentName = fullName;
      } else if (firstName) {
        studentName = firstName;
      } else if (lastName) {
        studentName = lastName;
      } else if (email) {
        studentName = email;
      } else {
        studentName = `Estudiante ${student.id}`;
      }

      const present = records.filter(r => r.status === AttendanceStatus.PRESENT).length;
      const absent = records.filter(r => r.status === AttendanceStatus.ABSENT).length;
      const late = records.filter(r => r.status === AttendanceStatus.LATE).length;
      const justifiedLate = records.filter(r => r.status === AttendanceStatus.JUSTIFIED_LATE).length;
      const earlyDeparture = records.filter(r => r.status === AttendanceStatus.EARLY_DEPARTURE).length;
      const justifiedAbsence = records.filter(r => r.status === AttendanceStatus.JUSTIFIED_ABSENCE).length;
      const totalDays = records.length;

      // Attendance rate — política LOMLOE (igual que el boletín): retrasos y salidas
      // anticipadas cuentan como asistencia; solo restan faltas (injustificadas + justificadas).
      const attendanceRate = totalDays > 0 ? Math.round(((totalDays - absent - justifiedAbsence) / totalDays) * 100) : 0;

      const studentStats = {
        student: {
          id: student.id,
          name: studentName,
        },
        present,
        absent,
        late,
        justifiedLate,
        earlyDeparture,
        justifiedAbsence,
        totalDays,
        attendanceRate,
      };

      stats.push(studentStats);
    }

    return stats;
  }

  async getStudentAttendanceStats(
    studentId: string,
    days: number = 30,
    requestingUserId?: string,
    requestingUserRole?: string,
    academicYearId?: string,
  ): Promise<any> {
    // Verify access permissions
    if (requestingUserRole === 'student') {
      // Students can only see their own stats
      const student = await this.studentRepository.findOne({
        where: { id: studentId },
        relations: ['user'],
      });
      if (!student || student.user.id !== requestingUserId) {
        throw new ForbiddenException('No tienes permisos para ver esta información');
      }
    } else if (requestingUserRole === 'family') {
      // Families can only see their children's stats
      const family = await this.familyRepository.findOne({
        where: [
          { primaryContact: { id: requestingUserId } },
          { secondaryContact: { id: requestingUserId } }
        ]
      });
      if (!family) {
        throw new ForbiddenException('Familia no encontrada');
      }
      
      // Verify student is child of this family
      const familyStudent = await this.familyStudentRepository.findOne({
        where: { 
          family: { id: family.id },
          student: { id: studentId }
        }
      });
      if (!familyStudent) {
        throw new ForbiddenException('No tienes permisos para ver la información de este estudiante');
      }
    }

    const where: any = { studentId };

    if (academicYearId) {
      // Año concreto: estadísticas de TODO el año (no la ventana de días)
      where.academicYearId = academicYearId;
    } else {
      // Sin año: comportamiento por ventana de últimos `days` días
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      where.date = Between(startDate, new Date());
    }

    const records = await this.attendanceRecordRepository.find({
      where,
      order: { date: 'DESC' },
    });

    const presentDays = records.filter(r =>
      r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE || r.status === AttendanceStatus.JUSTIFIED_LATE
    ).length;
    const absentDays = records.filter(r =>
      r.status === AttendanceStatus.ABSENT
    ).length;
    const lateDays = records.filter(r =>
      r.status === AttendanceStatus.LATE
    ).length;
    const justifiedLateDays = records.filter(r =>
      r.status === AttendanceStatus.JUSTIFIED_LATE
    ).length;
    const justifiedAbsences = records.filter(r =>
      r.status === AttendanceStatus.JUSTIFIED_ABSENCE
    ).length;
    const totalDays = records.length;

    // Política LOMLOE (igual que el boletín): retrasos y salidas anticipadas cuentan como
    // asistencia; solo restan faltas (injustificadas + justificadas).
    const attendanceRate = totalDays > 0 ? Math.round(((totalDays - absentDays - justifiedAbsences) / totalDays) * 100) : 0;
    const punctualityRate = totalDays > 0 ? Math.round(((presentDays - lateDays) / totalDays) * 100) : 0;

    return {
      studentId,
      period: `${days} días`,
      stats: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        justifiedLateDays,
        justifiedAbsences,
        attendanceRate,
        punctualityRate,
        attendanceDays: `${presentDays}/${totalDays}`,
      },
      recentRecords: records.slice(0, 10).map(record => ({
        date: record.date,
        status: record.status,
        justification: record.justification,
        markedBy: record.markedById,
      })),
    };
  }

  // ==================== NOTIFICATIONS ====================

  private async sendAttendanceReviewNotification(
    request: AttendanceRequest,
    reviewerUserId: string,
  ): Promise<void> {
    try {
      // Cargar información completa del request si no está cargada
      const fullRequest = await this.attendanceRequestRepository.findOne({
        where: { id: request.id },
        relations: ['student', 'student.user', 'student.user.profile', 'requestedBy', 'reviewedBy'],
      });

      if (!fullRequest) return;

      const studentName = `${fullRequest.student.user.profile.firstName} ${fullRequest.student.user.profile.lastName}`;
      const reviewerName = fullRequest.reviewedBy ? 
        `${fullRequest.reviewedBy.profile?.firstName || ''} ${fullRequest.reviewedBy.profile?.lastName || ''}` : 
        'el profesor';

      let subject: string;
      let content: string;
      let priority = MessagePriority.NORMAL;

      if (request.status === AttendanceRequestStatus.APPROVED) {
        subject = `✅ Solicitud de asistencia aprobada - ${studentName}`;
        content = `La solicitud de ${this.getRequestTypeText(request.type)} para ${studentName} el día ${request.date.toLocaleDateString()} ha sido APROBADA por ${reviewerName}.`;
        
        if (request.reviewNote) {
          content += `\n\nNota del profesor: ${request.reviewNote}`;
        }
      } else {
        subject = `❌ Solicitud de asistencia rechazada - ${studentName}`;
        content = `La solicitud de ${this.getRequestTypeText(request.type)} para ${studentName} el día ${request.date.toLocaleDateString()} ha sido RECHAZADA por ${reviewerName}.`;
        priority = MessagePriority.HIGH;
        
        if (request.reviewNote) {
          content += `\n\nMotivo: ${request.reviewNote}`;
        }
      }

      // Crear mensaje de notificación
      await this.communicationsService.createMessage(reviewerUserId, {
        type: MessageType.NOTIFICATION,
        subject,
        content,
        priority,
        recipientId: fullRequest.requestedById,
        relatedStudentId: fullRequest.studentId,
        attendanceRequestId: fullRequest.id,
      });
    } catch (error) {
      // Log error but don't throw - notification failure shouldn't break the main flow
      console.error('Error sending attendance review notification:', error);
    }
  }

  private getRequestTypeText(type: AttendanceRequestType): string {
    switch (type) {
      case AttendanceRequestType.ABSENCE:
        return 'ausencia';
      case AttendanceRequestType.LATE_ARRIVAL:
        return 'retraso';
      case AttendanceRequestType.EARLY_DEPARTURE:
        return 'salida anticipada';
      default:
        return 'asistencia';
    }
  }

  // ==================== FAMILY-SPECIFIC METHODS ====================

  /**
   * Get all children (students) belonging to a specific family user
   * @param familyUserId - The ID of the family user
   * @returns Promise<Student[]> - Array of students belonging to this family
   */
  async getFamilyChildren(familyUserId: string): Promise<any[]> {
    try {
      // Find all family-student relationships where the user is either primary or secondary contact
      const familyRelations = await this.familyStudentRepository.find({
        where: [
          // Check if family user is primary contact
          {
            family: { primaryContact: { id: familyUserId } },
          },
          // Check if family user is secondary contact
          {
            family: { secondaryContact: { id: familyUserId } },
          },
        ],
        relations: [
          'student',
          'student.user',
          'student.user.profile',
          'student.classGroups',
        ],
      });

      // Extract students and format response - ONLY show their own children (PROTECCIÓN DE DATOS)
      const children = familyRelations.map(relation => ({
        id: relation.student.id,
        name: `${relation.student.user.profile.firstName} ${relation.student.user.profile.lastName}`,
        firstName: relation.student.user.profile.firstName,
        lastName: relation.student.user.profile.lastName,
        classGroups: relation.student.classGroups?.map(group => ({
          id: group.id,
          name: group.name,
        })) || [],
      }));

      return children;
    } catch (error) {
      console.error('Error getting family children:', error);
      throw new BadRequestException('Error al obtener la lista de hijos');
    }
  }

  // ==================== FAMILY NOTIFICATIONS ====================

  /**
   * Genera notificaciones automáticas para familias cuando hay ausencias o tardanzas
   * @param studentId - ID del estudiante
   * @param status - Estado de asistencia (ABSENT o LATE)
   */
  private async triggerFamilyNotifications(studentId: string, status: AttendanceStatus, recordDate?: Date): Promise<void> {
    try {
      // Solo generar notificaciones para ausencias y tardanzas
      if (status !== AttendanceStatus.ABSENT && status !== AttendanceStatus.LATE) {
        return;
      }

      // Obtener información del estudiante y su familia
      const familyRelations = await this.familyStudentRepository.find({
        where: { student: { id: studentId } },
        relations: ['family', 'family.primaryContact', 'family.primaryContact.profile', 'family.secondaryContact', 'family.secondaryContact.profile', 'student', 'student.user', 'student.user.profile'],
      });

      if (familyRelations.length === 0) {
        console.warn(`No family relations found for student ${studentId}`);
        return;
      }

      // Generar alertas para cada familia relacionada (normalmente será una)
      for (const relation of familyRelations) {
        const family = relation.family;
        const student = relation.student;

        if (!family || !student) {
          console.warn(`Missing family or student data for relation`);
          continue;
        }

        try {
          // Generar alertas automáticas para esta familia
          await this.familyAlertsService.generateAlertsForFamily(family.id);

          // Log de la notificación generada
          const studentName = student.user?.profile?.firstName || 'Estudiante';
          const statusText = status === AttendanceStatus.ABSENT ? 'ausencia' : 'tardanza';
          
          console.log(`✅ Notificación automática generada: ${statusText} de ${studentName} para familia ${family.id}`);

          // Enviar email inmediato a los contactos de la familia
          try {
            const fullStudentName = student.user?.profile
              ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
              : 'su hijo/a';
            const dateText = (recordDate ? new Date(recordDate) : new Date()).toLocaleDateString('es-ES', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            });
            const isAbsent = status === AttendanceStatus.ABSENT;
            const subject = isAbsent
              ? `⚠️ Ausencia registrada: ${fullStudentName} - ${dateText}`
              : `⏰ Retraso registrado: ${fullStudentName} - ${dateText}`;

            const contacts = [family.primaryContact, family.secondaryContact].filter(
              (c) => c && c.email && c.email.includes('@'),
            );

            await Promise.allSettled(
              contacts.map((contact) => {
                const contactName = contact.profile
                  ? `${contact.profile.firstName} ${contact.profile.lastName}`
                  : contact.email;
                const html = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: ${isAbsent ? '#ff4d4f' : '#faad14'}; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                      <h2 style="margin: 0;">${isAbsent ? 'Ausencia registrada' : 'Retraso registrado'}</h2>
                    </div>
                    <div style="border: 1px solid #e8e8e8; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
                      <p>Hola ${contactName},</p>
                      <p>Le informamos de que <strong>${fullStudentName}</strong> ha sido marcado/a como
                      <strong>${isAbsent ? 'AUSENTE' : 'CON RETRASO'}</strong> en el listado de clase el día <strong>${dateText}</strong>.</p>
                      <p>Si la ausencia está justificada, puede enviar una solicitud de justificación desde la plataforma
                      en el apartado de <strong>Asistencia</strong>.</p>
                      <p style="margin-top: 24px;">Un saludo,<br/>Mundo World School</p>
                    </div>
                  </div>`;
                return this.emailService.sendEmail({
                  to: contact.email,
                  subject,
                  htmlContent: html,
                  textContent: `${subject}. Puede justificar la ausencia desde la plataforma.`,
                  priority: EmailPriority.HIGH,
                  userId: contact.id,
                  triggerEvent: isAbsent ? 'student_marked_absent' : 'student_marked_late',
                  triggerResourceId: studentId,
                  triggerResourceType: 'attendance_record',
                });
              }),
            );
            console.log(`📧 Email de ${isAbsent ? 'ausencia' : 'retraso'} enviado a ${contacts.length} contacto(s) de la familia ${family.id}`);
          } catch (emailError) {
            console.error(`Error sending email notification:`, emailError);
            // No fallar todo el proceso si el email falla
          }

        } catch (alertError) {
          console.error(`Error generating family alerts for family ${family.id}:`, alertError);
          // Continuar con otras familias si una falla
        }
      }

    } catch (error) {
      console.error(`Error in triggerFamilyNotifications for student ${studentId}:`, error);
      // No lanzar el error para evitar que falle la creación del registro de asistencia
    }
  }

  // ==================== EMAIL NOTIFICATION METHODS ====================

  /**
   * Envía notificaciones por email directamente a los profesores sobre una nueva solicitud de asistencia
   */
  private async notifyTeachersDirectly(requestId: string): Promise<void> {
    console.log(`📧 [NotifyTeachers] Iniciando notificación para solicitud: ${requestId}`);

    try {
      // Obtener la solicitud con todas las relaciones necesarias
      const request = await this.attendanceRequestRepository.findOne({
        where: { id: requestId },
        relations: [
          'student',
          'student.user',
          'student.user.profile',
          'student.classGroups',
          'student.classGroups.tutor',
          'student.classGroups.tutor.user',
          'requestedBy'
        ],
      });

      if (!request) {
        console.error(`❌ [NotifyTeachers] Solicitud no encontrada: ${requestId}`);
        return;
      }

      console.log(`🔍 [NotifyTeachers] Solicitud encontrada:`, {
        id: request.id,
        studentId: request.student?.id,
        requestedById: request.requestedBy?.id,
        classGroupsCount: request.student?.classGroups?.length || 0
      });

      // Obtener todos los profesores únicos del estudiante (tutores de clase)
      const teachers = new Set<User>();

      if (request.student.classGroups) {
        for (const classGroup of request.student.classGroups) {
          console.log(`🔍 [NotifyTeachers] Verificando clase:`, {
            classId: classGroup.id,
            className: classGroup.name,
            hasTutor: !!classGroup.tutor,
            hasUser: !!classGroup.tutor?.user
          });

          if (classGroup.tutor?.user) {
            teachers.add(classGroup.tutor.user);
            console.log(`✅ [NotifyTeachers] Profesor agregado: ${classGroup.tutor.user.email}`);
          }
        }
      }

      if (teachers.size === 0) {
        console.warn(`⚠️ [NotifyTeachers] No se encontraron profesores para el estudiante ${request.student.id}`);
        return;
      }

      console.log(`👥 [NotifyTeachers] Total profesores encontrados: ${teachers.size}`);

      // Preparar datos para la plantilla
      const templateData = await this.prepareTeacherNotificationData(request);
      console.log(`📝 [NotifyTeachers] Datos de plantilla preparados:`, templateData);

      // Enviar email a cada profesor
      const emailPromises = Array.from(teachers).map(async (teacher) => {
        try {
          const teacherEmail = teacher.email;

          if (!teacherEmail) {
            console.warn(`⚠️ [NotifyTeachers] Profesor ${teacher.id} no tiene email configurado`);
            return;
          }

          console.log(`📧 [NotifyTeachers] Enviando email a: ${teacherEmail}`);

          await this.emailService.sendEmail({
            to: teacherEmail,
            subject: `📝 Nueva solicitud de justificación de ${templateData.studentName}`,
            templateType: EmailTemplateType.ATTENDANCE_REQUEST_TEACHER,
            templateData: {
              ...templateData,
              teacherName: teacher.email.split('@')[0],
            },
            priority: EmailPriority.NORMAL,
            userId: teacher.id,
            triggerEvent: 'attendance_request_created',
            triggerResourceId: requestId,
            triggerResourceType: 'attendance_request',
            triggeredBy: request.requestedById,
          });

          console.log(`✅ [NotifyTeachers] Email enviado exitosamente a: ${teacherEmail}`);
        } catch (error) {
          console.error(`❌ [NotifyTeachers] Error enviando email al profesor ${teacher.id}:`, error);
        }
      });

      await Promise.allSettled(emailPromises);
      console.log(`🎉 [NotifyTeachers] Proceso de notificación completado para solicitud: ${requestId}`);

    } catch (error) {
      console.error(`💥 [NotifyTeachers] Error crítico en notifyTeachersDirectly para ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Envía notificación por email a la familia cuando su solicitud es revisada
   */
  private async notifyFamilyRequestReviewed(requestId: string, reviewedById: string): Promise<void> {
    console.log(`📧 [NotifyFamily] Enviando notificación a familia para solicitud revisada: ${requestId}`);

    try {
      // Obtener la solicitud con todas las relaciones necesarias
      const request = await this.attendanceRequestRepository.findOne({
        where: { id: requestId },
        relations: [
          'student',
          'student.user',
          'student.user.profile',
          'student.classGroups',
          'requestedBy',
          'reviewedBy'
        ],
      });

      if (!request) {
        console.error(`❌ [NotifyFamily] Solicitud no encontrada: ${requestId}`);
        return;
      }

      // Obtener email de la familia
      const familyEmail = request.requestedBy.email;
      if (!familyEmail) {
        console.warn(`⚠️ [NotifyFamily] Familia ${request.requestedBy.id} no tiene email configurado`);
        return;
      }

      // Preparar datos para la plantilla
      const templateData = await this.prepareFamilyNotificationData(request);

      // Enviar email a la familia
      await this.emailService.sendEmail({
        to: familyEmail,
        subject: `${request.status === AttendanceRequestStatus.APPROVED ? '✅ Solicitud APROBADA' : '❌ Solicitud RECHAZADA'} - ${templateData.studentName}`,
        templateType: EmailTemplateType.ATTENDANCE_REQUEST_REVIEWED,
        templateData,
        priority: EmailPriority.NORMAL,
        userId: request.requestedBy.id,
        triggerEvent: 'attendance_request_reviewed',
        triggerResourceId: requestId,
        triggerResourceType: 'attendance_request',
        triggeredBy: reviewedById,
      });

      console.log(`✅ [NotifyFamily] Notificación enviada a la familia: ${familyEmail}`);

    } catch (error) {
      console.error(`❌ [NotifyFamily] Error en notifyFamilyRequestReviewed para ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Crear notificación in-app para profesores tutores sobre nueva solicitud de asistencia
   */
  private async createAttendanceInAppNotification(request: AttendanceRequest): Promise<void> {
    // Re-fetch with needed relations
    const fullRequest = await this.attendanceRequestRepository.findOne({
      where: { id: request.id },
      relations: [
        'student',
        'student.user',
        'student.user.profile',
        'student.classGroups',
        'student.classGroups.tutor',
        'student.classGroups.tutor.user',
      ],
    });

    if (!fullRequest?.student) {
      console.warn('❌ [InAppNotification] No se pudo cargar datos del estudiante');
      return;
    }

    const studentName = fullRequest.student.user?.profile
      ? `${fullRequest.student.user.profile.firstName || ''} ${fullRequest.student.user.profile.lastName || ''}`.trim()
      : 'Estudiante';

    const requestType = fullRequest.type || 'justificación';
    const reason = fullRequest.reason || 'Sin motivo especificado';

    // Collect unique tutor user IDs
    const teacherUserIds = new Set<string>();
    if (fullRequest.student.classGroups) {
      for (const classGroup of fullRequest.student.classGroups) {
        if (classGroup.tutor?.user?.id) {
          teacherUserIds.add(classGroup.tutor.user.id);
        }
      }
    }

    if (teacherUserIds.size === 0) {
      console.warn('⚠️ [InAppNotification] No se encontraron tutores para notificar');
      return;
    }

    // Create a notification for each teacher
    for (const teacherUserId of teacherUserIds) {
      try {
        const notification = this.notificationRepository.create({
          type: NotificationType.ATTENDANCE,
          title: 'Nueva solicitud de asistencia',
          content: `${studentName} - ${requestType}: ${reason}`,
          userId: teacherUserId,
          status: NotificationStatus.UNREAD,
          relatedStudentId: fullRequest.student.id,
          relatedResourceId: fullRequest.id,
          relatedResourceType: 'attendance_request',
          triggeredById: fullRequest.requestedById,
        });
        await this.notificationRepository.save(notification);
        console.log(`✅ [InAppNotification] Notificación creada para profesor: ${teacherUserId}`);
      } catch (error) {
        console.warn(`❌ [InAppNotification] Error creando notificación para profesor ${teacherUserId}:`, error);
      }
    }
  }

  /**
   * Prepara los datos para la plantilla de notificación a profesores
   */
  private async prepareTeacherNotificationData(request: AttendanceRequest): Promise<any> {
    // Cargar explícitamente el estudiante con sus relaciones
    const student = await this.studentRepository.findOne({
      where: { id: request.studentId },
      relations: ['user', 'user.profile', 'classGroups'],
    });

    console.log('🔍 [prepareTeacherNotificationData] Datos del estudiante:', {
      studentId: student?.id,
      hasUser: !!student?.user,
      hasProfile: !!student?.user?.profile,
      firstName: student?.user?.profile?.firstName,
      lastName: student?.user?.profile?.lastName,
    });

    const studentName = student?.user?.profile
      ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
      : 'Estudiante';
    const familyName = request.requestedBy.email.split('@')[0];

    // Obtener clase principal del estudiante
    const mainClass = student?.classGroups?.[0]?.name || 'Clase no asignada';

    // Mapear tipo de solicitud a etiqueta legible
    const requestTypeLabels = {
      [AttendanceRequestType.ABSENCE]: 'Falta justificada',
      [AttendanceRequestType.LATE_ARRIVAL]: 'Llegada tardía',
      [AttendanceRequestType.EARLY_DEPARTURE]: 'Salida anticipada',
    };

    return {
      studentName,
      studentInitials: this.getInitials(studentName),
      studentClass: mainClass,
      familyName,
      requestDate: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      absenceDate: new Date(request.date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      requestTypeLabel: requestTypeLabels[request.type],
      reason: request.reason,
      expectedArrivalTime: request.expectedArrivalTime || null,
      expectedDepartureTime: request.expectedDepartureTime || null,
      platformUrl: process.env.PLATFORM_URL || 'https://plataforma.mundoworld.school',
      schoolName: 'Mundo World School',
    };
  }

  /**
   * Prepara los datos para la plantilla de notificación a familias
   */
  private async prepareFamilyNotificationData(request: AttendanceRequest): Promise<any> {
    // Cargar explícitamente el estudiante con sus relaciones
    const student = await this.studentRepository.findOne({
      where: { id: request.studentId },
      relations: ['user', 'user.profile', 'classGroups'],
    });

    console.log('🔍 [prepareFamilyNotificationData] Datos del estudiante:', {
      studentId: student?.id,
      hasUser: !!student?.user,
      hasProfile: !!student?.user?.profile,
      firstName: student?.user?.profile?.firstName,
      lastName: student?.user?.profile?.lastName,
    });

    const studentName = student?.user?.profile
      ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
      : 'Estudiante';
    const familyName = request.requestedBy.email.split('@')[0];
    const teacherName = request.reviewedBy?.email.split('@')[0] || 'Profesor';

    // Obtener clase principal del estudiante
    const mainClass = student?.classGroups?.[0]?.name || 'Clase no asignada';

    // Mapear tipo de solicitud a etiqueta legible
    const requestTypeLabels = {
      [AttendanceRequestType.ABSENCE]: 'Falta justificada',
      [AttendanceRequestType.LATE_ARRIVAL]: 'Llegada tardía',
      [AttendanceRequestType.EARLY_DEPARTURE]: 'Salida anticipada',
    };

    return {
      familyName,
      studentName,
      studentInitials: this.getInitials(studentName),
      studentClass: mainClass,
      absenceDate: new Date(request.date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      requestTypeLabel: requestTypeLabels[request.type],
      reviewDate: request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Fecha no disponible',
      teacherName,
      teacherInitials: this.getInitials(teacherName),
      teacherRole: 'Profesor/a',
      reviewNote: request.reviewNote || null,
      isApproved: request.status === AttendanceRequestStatus.APPROVED,
      platformUrl: process.env.PLATFORM_URL || 'https://plataforma.mundoworld.school',
      schoolName: 'Mundo World School',
    };
  }

  /**
   * Obtiene las iniciales de un nombre completo
   */
  private getInitials(fullName: string): string {
    if (!fullName) return '??';

    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }

    return names.map(name => name.charAt(0).toUpperCase()).slice(0, 2).join('');
  }

  // ==================== ADMIN ANALYTICS METHODS ====================

  /**
   * Get attendance records created by a specific teacher
   * @param teacherId - The ID of the teacher
   * @param startDate - Optional start date filter (YYYY-MM-DD)
   * @param endDate - Optional end date filter (YYYY-MM-DD)
   * @param limit - Maximum number of records to return (default 100)
   * @returns Promise with records created by the teacher
   */
  async getRecordsByTeacher(
    teacherId: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100,
  ): Promise<any> {
    try {
      const queryBuilder = this.attendanceRecordRepository
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.student', 'student')
        .leftJoinAndSelect('student.user', 'studentUser')
        .leftJoinAndSelect('studentUser.profile', 'studentProfile')
        .leftJoinAndSelect('record.markedBy', 'markedBy')
        .leftJoinAndSelect('markedBy.profile', 'markedByProfile')
        .where('record.markedById = :teacherId', { teacherId });

      // Apply date filters if provided
      if (startDate) {
        queryBuilder.andWhere('record.date >= :startDate', { startDate });
      }
      if (endDate) {
        queryBuilder.andWhere('record.date <= :endDate', { endDate });
      }

      const records = await queryBuilder
        .orderBy('record.date', 'DESC')
        .addOrderBy('record.markedAt', 'DESC')
        .limit(limit)
        .getMany();

      // Calculate stats
      const totalRecords = records.length;
      const statsByStatus = {
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
        justifiedLate: records.filter(r => r.status === 'justified_late').length,
        earlyDeparture: records.filter(r => r.status === 'early_departure').length,
        justifiedAbsence: records.filter(r => r.status === 'justified_absence').length,
      };

      // Group by date to see activity
      const recordsByDate = records.reduce((acc, record) => {
        // Handle both Date objects and string dates from TypeORM
        const date = record.date instanceof Date
          ? record.date.toISOString().split('T')[0]
          : String(record.date).split('T')[0];
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date]++;
        return acc;
      }, {} as Record<string, number>);

      return {
        teacher: records[0]?.markedBy || null,
        totalRecords,
        statsByStatus,
        recordsByDate,
        records,
      };
    } catch (error) {
      console.error('Error getting records by teacher:', error);
      throw new Error('Error al obtener registros del profesor');
    }
  }

  /**
   * Get aggregated statistics for all teachers
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Promise with teacher statistics
   */
  async getTeacherStats(startDate: string, endDate: string): Promise<any> {
    try {
      const records = await this.attendanceRecordRepository
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.markedBy', 'markedBy')
        .leftJoinAndSelect('markedBy.profile', 'markedByProfile')
        .where('record.date BETWEEN :startDate AND :endDate', { startDate, endDate })
        .andWhere('record.markedById IS NOT NULL')
        .getMany();

      // Group by teacher
      const teacherStats = records.reduce((acc, record) => {
        const teacherId = record.markedById;
        if (!teacherId) return acc;

        if (!acc[teacherId]) {
          acc[teacherId] = {
            teacher: {
              id: teacherId,
              name: record.markedBy?.profile
                ? `${record.markedBy.profile.firstName} ${record.markedBy.profile.lastName}`
                : 'Unknown',
              email: record.markedBy?.email || '',
            },
            totalRecords: 0,
            recordsByStatus: {
              present: 0,
              absent: 0,
              late: 0,
              justifiedLate: 0,
              earlyDeparture: 0,
              justifiedAbsence: 0,
            },
            uniqueStudents: new Set(),
            uniqueDates: new Set(),
            lastActivityDate: null,
          };
        }

        acc[teacherId].totalRecords++;
        acc[teacherId].recordsByStatus[record.status]++;
        acc[teacherId].uniqueStudents.add(record.studentId);
        acc[teacherId].uniqueDates.add(record.date);

        // Track last activity
        if (!acc[teacherId].lastActivityDate || record.date > acc[teacherId].lastActivityDate) {
          acc[teacherId].lastActivityDate = record.date;
        }

        return acc;
      }, {} as Record<string, any>);

      // Convert sets to counts
      const teacherStatsArray = Object.values(teacherStats).map((stats: any) => ({
        ...stats,
        uniqueStudents: stats.uniqueStudents.size,
        uniqueDates: stats.uniqueDates.size,
      }));

      // Sort by total records descending
      teacherStatsArray.sort((a, b) => b.totalRecords - a.totalRecords);

      return {
        period: { startDate, endDate },
        totalTeachers: teacherStatsArray.length,
        teachers: teacherStatsArray,
      };
    } catch (error) {
      console.error('Error getting teacher stats:', error);
      throw new Error('Error al obtener estadísticas de profesores');
    }
  }

  /**
   * Get system-wide attendance alerts
   * @param days - Number of days to analyze (default 30)
   * @returns Promise with alerts for teachers and students
   */
  async getAttendanceAlerts(days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = new Date().toISOString().split('T')[0];

      // Get all attendance records in the period
      const records = await this.attendanceRecordRepository
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.student', 'student')
        .leftJoinAndSelect('student.user', 'studentUser')
        .leftJoinAndSelect('studentUser.profile', 'studentProfile')
        .leftJoinAndSelect('record.markedBy', 'markedBy')
        .leftJoinAndSelect('markedBy.profile', 'markedByProfile')
        .where('record.date >= :startDate', { startDate: startDateStr })
        .andWhere('record.date <= :endDate', { endDate: endDateStr })
        .getMany();

      // Find students with low attendance
      const studentStats = records.reduce((acc, record) => {
        const studentId = record.studentId;
        if (!acc[studentId]) {
          acc[studentId] = {
            student: {
              id: studentId,
              name: record.student?.user?.profile
                ? `${record.student.user.profile.firstName} ${record.student.user.profile.lastName}`
                : 'Unknown',
              enrollmentNumber: record.student?.enrollmentNumber || '',
            },
            totalDays: 0,
            present: 0,
            absent: 0,
            late: 0,
            justifiedAbsence: 0,
            consecutiveAbsences: 0,
            currentStreak: 0,
          };
        }

        acc[studentId].totalDays++;
        if (record.status === 'present') acc[studentId].present++;
        if (record.status === 'absent') {
          acc[studentId].absent++;
          acc[studentId].currentStreak++;
          if (acc[studentId].currentStreak > acc[studentId].consecutiveAbsences) {
            acc[studentId].consecutiveAbsences = acc[studentId].currentStreak;
          }
        } else {
          acc[studentId].currentStreak = 0;
        }
        if (record.status === 'late') acc[studentId].late++;
        if (record.status === 'justified_absence') acc[studentId].justifiedAbsence++;

        return acc;
      }, {} as Record<string, any>);

      // Calculate attendance rate and identify alerts
      const studentAlerts = Object.values(studentStats)
        .map((stats: any) => ({
          ...stats,
          // Política LOMLOE (igual que el boletín): solo restan faltas (injustificadas + justificadas).
          attendanceRate: stats.totalDays > 0 ? ((stats.totalDays - stats.absent - stats.justifiedAbsence) / stats.totalDays) * 100 : 0,
        }))
        .filter(stats => stats.attendanceRate < 85 || stats.consecutiveAbsences >= 3)
        .map(stats => ({
          ...stats,
          alertType: stats.attendanceRate < 70 ? 'critical' : stats.consecutiveAbsences >= 3 ? 'warning' : 'info',
          reason: stats.attendanceRate < 70
            ? `Asistencia muy baja (${stats.attendanceRate.toFixed(1)}%)`
            : `${stats.consecutiveAbsences} ausencias consecutivas`,
        }))
        .sort((a, b) => {
          // Sort by alert type: critical > warning > info
          const order = { critical: 0, warning: 1, info: 2 };
          return order[a.alertType] - order[b.alertType];
        });

      // Find teachers with no recent activity
      const teachersWithRecords = new Set(records.map(r => r.markedById).filter(Boolean));
      const allTeachers = await this.userRepository.find({
        where: { role: UserRole.TEACHER },
        relations: ['profile'],
      });

      const teacherAlerts = allTeachers
        .filter(teacher => !teachersWithRecords.has(teacher.id))
        .map(teacher => ({
          teacher: {
            id: teacher.id,
            name: teacher.profile
              ? `${teacher.profile.firstName} ${teacher.profile.lastName}`
              : 'Unknown',
            email: teacher.email,
          },
          alertType: 'warning',
          reason: `Sin registros de asistencia en los últimos ${days} días`,
        }));

      return {
        period: { startDate: startDateStr, endDate: endDateStr, days },
        summary: {
          totalStudentAlerts: studentAlerts.length,
          criticalStudents: studentAlerts.filter(a => a.alertType === 'critical').length,
          totalTeacherAlerts: teacherAlerts.length,
        },
        studentAlerts,
        teacherAlerts,
      };
    } catch (error) {
      console.error('Error getting attendance alerts:', error);
      throw new Error('Error al obtener alertas de asistencia');
    }
  }

  /**
   * Get system-wide overview of attendance
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Promise with global attendance metrics
   */
  async getAttendanceOverview(startDate: string, endDate: string): Promise<any> {
    try {
      const records = await this.attendanceRecordRepository
        .createQueryBuilder('record')
        .where('record.date BETWEEN :startDate AND :endDate', { startDate, endDate })
        .getMany();

      const totalRecords = records.length;
      const byStatus = {
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
        justifiedLate: records.filter(r => r.status === 'justified_late').length,
        earlyDeparture: records.filter(r => r.status === 'early_departure').length,
        justifiedAbsence: records.filter(r => r.status === 'justified_absence').length,
      };

      const uniqueStudents = new Set(records.map(r => r.studentId)).size;
      const uniqueDates = new Set(records.map(r => r.date)).size;

      // Política LOMLOE (igual que el boletín): retrasos y salidas anticipadas cuentan como
      // asistencia; solo restan faltas (injustificadas + justificadas).
      const attendanceRate = totalRecords > 0
        ? ((totalRecords - byStatus.absent - byStatus.justifiedAbsence) / totalRecords) * 100
        : 0;

      const punctualityRate = totalRecords > 0
        ? (byStatus.present / totalRecords) * 100
        : 0;

      return {
        period: { startDate, endDate },
        totalRecords,
        uniqueStudents,
        uniqueDates,
        byStatus,
        rates: {
          attendance: attendanceRate,
          punctuality: punctualityRate,
        },
      };
    } catch (error) {
      console.error('Error getting attendance overview:', error);
      throw new Error('Error al obtener vista general de asistencia');
    }
  }

  // ==================== SECURITY METHODS ====================

  /**
   * Verify if a family user has access to a specific student
   * @param familyUserId - The ID of the family user
   * @param studentId - The ID of the student
   * @returns Promise<boolean> - true if family has access, false otherwise
   */
  private async verifyFamilyStudentAccess(familyUserId: string, studentId: string): Promise<boolean> {
    try {
      // Check if there's a family-student relationship
      const familyRelation = await this.familyStudentRepository.findOne({
        where: [
          // Check if family user is primary contact
          {
            family: { primaryContact: { id: familyUserId } },
            student: { id: studentId },
          },
          // Check if family user is secondary contact
          {
            family: { secondaryContact: { id: familyUserId } },
            student: { id: studentId },
          },
        ],
      });

      return !!familyRelation;
    } catch (error) {
      console.error('Error verifying family-student access:', error);
      return false;
    }
  }
}