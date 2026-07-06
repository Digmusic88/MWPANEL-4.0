import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  DailyHomeworkRecord,
  DailyHomeworkStatus,
} from './entities/daily-homework-record.entity';
import {
  DailyHomeworkNotification,
  NotificationChannel,
  NotificationStatus,
} from './entities/daily-homework-notification.entity';
import {
  UpsertDailyHomeworkDto,
  BulkUpsertDailyHomeworkDto,
  GridResponseDto,
  FamilyHistoryResponseDto,
} from './dto/daily-homework.dto';
import { Student } from '../students/entities/student.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { User } from '../users/entities/user.entity';
import { Notification, NotificationType, NotificationStatus as InAppNotificationStatus } from '../communications/entities/notification.entity';
import { EmailService } from '../communications/services/email.service';
import { EmailPriority } from '../communications/entities/email-notification.entity';

@Injectable()
export class DailyHomeworkService {
  private readonly logger = new Logger(DailyHomeworkService.name);

  constructor(
    @InjectRepository(DailyHomeworkRecord)
    private recordsRepository: Repository<DailyHomeworkRecord>,
    @InjectRepository(DailyHomeworkNotification)
    private notificationsRepository: Repository<DailyHomeworkNotification>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(ClassGroup)
    private classGroupsRepository: Repository<ClassGroup>,
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(SubjectAssignment)
    private subjectAssignmentsRepository: Repository<SubjectAssignment>,
    @InjectRepository(Family)
    private familiesRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private familyStudentsRepository: Repository<FamilyStudent>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private readonly emailService: EmailService,
  ) {}

  // ==================== PERMISOS ====================

  private async verifyTeacherGroupAccess(teacherId: string, classGroupId: string): Promise<void> {
    // El profesor puede editar si tiene alguna asignación de asignatura en ese grupo
    const assignment = await this.subjectAssignmentsRepository.findOne({
      where: { classGroupId, teacherId },
    });
    if (!assignment) {
      throw new ForbiddenException('No tienes acceso a este grupo de clase');
    }
  }

  private async getTeacherFromUserId(userId: string): Promise<Teacher> {
    const teacher = await this.teachersRepository.findOne({ where: { user: { id: userId } } });
    if (!teacher) throw new NotFoundException('Perfil de profesor no encontrado');
    return teacher;
  }

  // ==================== UPSERT (CREAR / ACTUALIZAR) ====================

  async upsertRecord(dto: UpsertDailyHomeworkDto, userId: string): Promise<DailyHomeworkRecord> {
    const teacher = await this.getTeacherFromUserId(userId);
    await this.verifyTeacherGroupAccess(teacher.id, dto.classGroupId);

    const date = new Date(dto.date);
    // Normalizar a medianoche UTC para evitar desfases de zona horaria
    date.setUTCHours(0, 0, 0, 0);

    // Buscar registro existente
    const existing = await this.recordsRepository.findOne({
      where: {
        studentId: dto.studentId,
        classGroupId: dto.classGroupId,
        date,
        subjectAssignmentId: dto.subjectAssignmentId ?? null,
      },
    });

    const previousStatus = existing?.status ?? null;

    let record: DailyHomeworkRecord;
    if (existing) {
      existing.status = dto.status;
      existing.notes = dto.notes ?? null;
      existing.recordedByTeacherId = teacher.id;
      record = await this.recordsRepository.save(existing);
    } else {
      record = this.recordsRepository.create({
        studentId: dto.studentId,
        classGroupId: dto.classGroupId,
        subjectAssignmentId: dto.subjectAssignmentId ?? null,
        date,
        status: dto.status,
        recordedByTeacherId: teacher.id,
        notes: dto.notes ?? null,
      });
      record = await this.recordsRepository.save(record);
    }

    // Disparar notificación si aplica
    await this.handleNotification(record, previousStatus);

    return record;
  }

  async deleteRecord(recordId: string, userId: string): Promise<{ deleted: boolean }> {
    const teacher = await this.getTeacherFromUserId(userId);
    const record = await this.recordsRepository.findOne({ where: { id: recordId } });
    if (!record) throw new NotFoundException('Registro no encontrado');
    await this.verifyTeacherGroupAccess(teacher.id, record.classGroupId);
    await this.recordsRepository.remove(record);
    return { deleted: true };
  }

  async bulkUpsert(dto: BulkUpsertDailyHomeworkDto, userId: string): Promise<DailyHomeworkRecord[]> {
    const teacher = await this.getTeacherFromUserId(userId);
    await this.verifyTeacherGroupAccess(teacher.id, dto.classGroupId);

    const results: DailyHomeworkRecord[] = [];
    for (const item of dto.records) {
      const record = await this.upsertRecord(
        {
          studentId: item.studentId,
          classGroupId: dto.classGroupId,
          subjectAssignmentId: dto.subjectAssignmentId,
          date: dto.date,
          status: item.status,
          notes: item.notes,
        },
        userId,
      );
      results.push(record);
    }
    return results;
  }

  // ==================== GRID PARA PROFESOR ====================

  async getGrid(
    classGroupId: string,
    startDate: string,
    endDate: string,
    subjectAssignmentId: string | null,
    userId: string,
  ): Promise<GridResponseDto> {
    const teacher = await this.getTeacherFromUserId(userId);
    await this.verifyTeacherGroupAccess(teacher.id, classGroupId);

    // Cargar el grupo con sus estudiantes
    const classGroup = await this.classGroupsRepository.findOne({
      where: { id: classGroupId },
      relations: ['students', 'students.user', 'students.user.profile'],
    });
    if (!classGroup) throw new NotFoundException('Grupo no encontrado');

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // Cargar registros del rango
    const whereCondition: any = {
      classGroupId,
      date: Between(start, end),
    };
    if (subjectAssignmentId) {
      whereCondition.subjectAssignmentId = subjectAssignmentId;
    }

    const records = await this.recordsRepository.find({ where: whereCondition });

    // Generar TODAS las fechas laborables del rango (lunes–viernes)
    // así el profesor siempre ve columnas aunque no haya registros previos
    const dates: string[] = [];
    const cursor = new Date(start);
    cursor.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setUTCHours(0, 0, 0, 0);
    while (cursor <= endDay) {
      const dow = cursor.getUTCDay(); // 0=dom, 6=sáb
      if (dow !== 0 && dow !== 6) {
        dates.push(cursor.toISOString().split('T')[0]);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // Construir mapa de registros: studentId+date → record
    const recordMap = new Map<string, DailyHomeworkRecord>();
    records.forEach((r) => {
      const d = r.date instanceof Date ? r.date : new Date(r.date);
      const key = `${r.studentId}_${d.toISOString().split('T')[0]}`;
      recordMap.set(key, r);
    });

    // Construir filas
    const rows = (classGroup.students || []).map((student) => {
      const cells: { [dateStr: string]: any } = {};
      dates.forEach((dateStr) => {
        const key = `${student.id}_${dateStr}`;
        const rec = recordMap.get(key);
        cells[dateStr] = {
          studentId: student.id,
          status: rec?.status ?? null,
          recordId: rec?.id ?? null,
          notes: rec?.notes ?? null,
        };
      });
      return {
        studentId: student.id,
        studentName: `${student.user?.profile?.firstName ?? ''} ${student.user?.profile?.lastName ?? ''}`.trim(),
        enrollmentNumber: student.enrollmentNumber ?? '',
        cells,
      };
    });

    // Ordenar filas por apellido
    rows.sort((a, b) => a.studentName.localeCompare(b.studentName, 'es'));

    return {
      dates,
      rows,
      classGroupId,
      subjectAssignmentId: subjectAssignmentId ?? null,
    };
  }

  // ==================== HISTORIAL PARA FAMILIAS ====================

  async getFamilyHistory(
    studentId: string,
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<FamilyHistoryResponseDto> {
    // Verificar que la familia tiene acceso a este estudiante
    // Family primaryContactId o secondaryContactId debe coincidir con userId
    const family = await this.familiesRepository
      .createQueryBuilder('f')
      .where('f.primaryContactId = :userId OR f.secondaryContactId = :userId', { userId })
      .getOne();
    if (!family) throw new ForbiddenException('Acceso denegado');
    const access = await this.familyStudentsRepository.findOne({
      where: { studentId, familyId: family.id },
    });
    if (!access) throw new ForbiddenException('No tienes acceso a este alumno');

    const student = await this.studentsRepository.findOne({
      where: { id: studentId },
      relations: ['user', 'user.profile'],
    });
    if (!student) throw new NotFoundException('Estudiante no encontrado');

    // Rango de fechas (por defecto: últimos 30 días)
    const end = endDate ? new Date(endDate) : new Date();
    end.setUTCHours(23, 59, 59, 999);
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    start.setUTCHours(0, 0, 0, 0);

    const records = await this.recordsRepository.find({
      where: { studentId, date: Between(start, end) },
      relations: ['subjectAssignment', 'subjectAssignment.subject', 'classGroup', 'recordedByTeacher', 'recordedByTeacher.user', 'recordedByTeacher.user.profile'],
      order: { date: 'DESC' },
    });

    const formattedRecords = records.map((r) => {
      const d = r.date instanceof Date ? r.date : new Date(r.date);
      return {
        id: r.id,
        date: d.toISOString().split('T')[0],
        status: r.status,
        notes: r.notes,
        subjectName: r.subjectAssignment?.subject?.name ?? null,
        classGroupName: r.classGroup?.name ?? '',
        teacherName: `${r.recordedByTeacher?.user?.profile?.firstName ?? ''} ${r.recordedByTeacher?.user?.profile?.lastName ?? ''}`.trim(),
      };
    });

    const summary = {
      totalDays: records.length,
      completed: records.filter((r) => r.status === DailyHomeworkStatus.COMPLETED).length,
      partial: records.filter((r) => r.status === DailyHomeworkStatus.PARTIAL).length,
      notDone: records.filter((r) => r.status === DailyHomeworkStatus.NOT_DONE).length,
    };

    return {
      studentId,
      studentName: `${student.user?.profile?.firstName ?? ''} ${student.user?.profile?.lastName ?? ''}`.trim(),
      records: formattedRecords,
      summary,
    };
  }

  // ==================== NOTIFICACIONES ====================

  private async handleNotification(
    record: DailyHomeworkRecord,
    previousStatus: DailyHomeworkStatus | null,
  ): Promise<void> {
    const { status } = record;

    // No notificar si el estado es COMPLETED
    if (status === DailyHomeworkStatus.COMPLETED) {
      this.logger.log(`✅ Estado COMPLETED para estudiante ${record.studentId} - sin notificación`);
      return;
    }

    // No duplicar: si el estado no cambió y ya se envió notificación, saltar
    if (previousStatus === status && record.notificationSentAt) {
      this.logger.log(`⏭ Estado sin cambio (${status}), notificación ya enviada - skipping`);
      return;
    }

    // Cargar datos necesarios
    const student = await this.studentsRepository.findOne({
      where: { id: record.studentId },
      relations: ['user', 'user.profile'],
    });
    if (!student) return;

    const familyStudents = await this.familyStudentsRepository.find({
      where: { studentId: record.studentId },
      relations: ['family', 'family.primaryContact'],
    });

    if (familyStudents.length === 0) {
      this.logger.log(`ℹ️ No hay familiares vinculados al alumno ${record.studentId}`);
      return;
    }

    const studentName = `${student.user?.profile?.firstName ?? ''} ${student.user?.profile?.lastName ?? ''}`.trim();
    const date = record.date instanceof Date ? record.date : new Date(record.date);
    const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const statusText = status === DailyHomeworkStatus.PARTIAL
      ? 'realizada a medias'
      : 'no ha sido realizada';
    const emoji = status === DailyHomeworkStatus.PARTIAL ? '🟡' : '🔴';

    // Cargar asignatura si existe
    let subjectText = '';
    if (record.subjectAssignmentId) {
      const sa = await this.subjectAssignmentsRepository.findOne({
        where: { id: record.subjectAssignmentId },
        relations: ['subject'],
      });
      if (sa?.subject) subjectText = ` de ${sa.subject.name}`;
    }

    const title = `${emoji} Actividad diaria${subjectText}: ${studentName}`;
    const content = `Se ha registrado que la tarea del día ${dateStr}${subjectText} de ${studentName} ha sido ${statusText}. Puedes revisar el historial completo en la plataforma.`;

    for (const fs of familyStudents) {
      const familyUser = fs.family?.primaryContact;
      if (!familyUser) continue;

      // 1. Notificación in-app
      try {
        const inAppNotif = this.notificationRepository.create({
          title,
          content,
          type: NotificationType.ACADEMIC,
          status: InAppNotificationStatus.UNREAD,
          userId: familyUser.id,
          relatedStudentId: record.studentId,
          actionUrl: '/family/daily-homework',
        });
        await this.notificationRepository.save(inAppNotif);

        // Registrar en nuestra tabla
        const notifLog = this.notificationsRepository.create({
          recordId: record.id,
          studentId: record.studentId,
          guardianUserId: familyUser.id,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
          reason: `Status changed to ${status}`,
          sentAt: new Date(),
          recordStatusSnapshot: status,
        });
        await this.notificationsRepository.save(notifLog);
      } catch (err) {
        this.logger.error(`Error sending in-app notification to ${familyUser.id}: ${err.message}`);
        const notifLog = this.notificationsRepository.create({
          recordId: record.id,
          studentId: record.studentId,
          guardianUserId: familyUser.id,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.FAILED,
          reason: `Status changed to ${status}`,
          sentAt: new Date(),
          errorMessage: err.message,
          recordStatusSnapshot: status,
        });
        await this.notificationsRepository.save(notifLog);
      }

      // 2. Email
      if (familyUser.email) {
        const emailHtml = this.buildEmailHtml(studentName, dateStr, statusText, subjectText, status);
        try {
          await this.emailService.sendEmail({
            to: familyUser.email,
            subject: `Actividad diaria: ${studentName} - ${dateStr}`,
            htmlContent: emailHtml,
            textContent: content,
            userId: familyUser.id,
            priority: EmailPriority.NORMAL,
          });

          const emailLog = this.notificationsRepository.create({
            recordId: record.id,
            studentId: record.studentId,
            guardianUserId: familyUser.id,
            channel: NotificationChannel.EMAIL,
            status: NotificationStatus.SENT,
            reason: `Status changed to ${status}`,
            sentAt: new Date(),
            recordStatusSnapshot: status,
          });
          await this.notificationsRepository.save(emailLog);
        } catch (err) {
          this.logger.error(`Error sending email to ${familyUser.email}: ${err.message}`);
          const emailLog = this.notificationsRepository.create({
            recordId: record.id,
            studentId: record.studentId,
            guardianUserId: familyUser.id,
            channel: NotificationChannel.EMAIL,
            status: NotificationStatus.FAILED,
            reason: `Status changed to ${status}`,
            sentAt: new Date(),
            errorMessage: err.message,
            recordStatusSnapshot: status,
          });
          await this.notificationsRepository.save(emailLog);
        }
      }
    }

    // Actualizar timestamp de última notificación
    await this.recordsRepository.update(record.id, { notificationSentAt: new Date() });
  }

  private buildEmailHtml(
    studentName: string,
    dateStr: string,
    statusText: string,
    subjectText: string,
    status: DailyHomeworkStatus,
  ): string {
    const color = status === DailyHomeworkStatus.PARTIAL ? '#faad14' : '#ff4d4f';
    const emoji = status === DailyHomeworkStatus.PARTIAL ? '🟡' : '🔴';
    const label = status === DailyHomeworkStatus.PARTIAL ? 'Realizada a medias' : 'No realizada';

    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #1890ff; padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 20px;">MW Panel - Actividad Diaria</h1>
    </div>
    <div style="padding: 24px;">
      <p style="color: #595959; font-size: 15px;">Hola,</p>
      <p style="color: #595959; font-size: 15px;">
        Te informamos que la tarea del día <strong>${dateStr}</strong>${subjectText} de
        <strong>${studentName}</strong> ha sido registrada como:
      </p>
      <div style="text-align: center; margin: 24px 0; padding: 16px; background: ${color}15; border-radius: 8px; border-left: 4px solid ${color};">
        <span style="font-size: 32px;">${emoji}</span>
        <p style="color: ${color}; font-size: 18px; font-weight: bold; margin: 8px 0 0;">${label}</p>
      </div>
      <p style="color: #595959; font-size: 14px;">
        Puedes revisar el historial completo de actividades diarias accediendo a la plataforma.
        Si tienes alguna duda, no dudes en contactar con el profesorado a través del sistema de mensajes.
      </p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="https://plataforma.mundoworld.school/family/daily-homework"
           style="display: inline-block; background: #1890ff; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold;">
          Ver historial de actividades
        </a>
      </div>
    </div>
    <div style="background: #f0f0f0; padding: 12px; text-align: center;">
      <p style="color: #8c8c8c; font-size: 12px; margin: 0;">
        Este es un mensaje automático de MW Panel. Por favor, no respondas a este correo.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  // ==================== HELPERS ADICIONALES ====================

  // sub is the JWT subject (userId)
  async getTeacherClassGroups(userId: string): Promise<ClassGroup[]> {
    const teacher = await this.getTeacherFromUserId(userId);
    const assignments = await this.subjectAssignmentsRepository.find({
      where: { teacherId: teacher.id },
      relations: ['classGroup'],
    });
    const groupMap = new Map<string, ClassGroup>();
    assignments.forEach((a) => {
      if (a.classGroup) groupMap.set(a.classGroup.id, a.classGroup);
    });
    return Array.from(groupMap.values());
  }
}
