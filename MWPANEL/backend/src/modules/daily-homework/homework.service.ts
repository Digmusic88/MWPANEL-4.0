import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { HomeworkSubject } from './entities/homework-subject.entity';
import { HomeworkActivity } from './entities/homework-activity.entity';
import { HomeworkActivityRecord, HwRecordStatus } from './entities/homework-activity-record.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { EmailService } from '../communications/services/email.service';
import { EmailPriority } from '../communications/entities/email-notification.entity';
import { Notification, NotificationType, NotificationStatus } from '../communications/entities/notification.entity';
import { FamilyAlert, AlertType, AlertPriority } from '../families/entities/family-alert.entity';

@Injectable()
export class HomeworkService {
  private readonly logger = new Logger(HomeworkService.name);

  // Timers pendientes: key = `${studentId}_${activityId}` → timer que enviará la notificación en 5 min
  private readonly pendingNotifTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    @InjectRepository(HomeworkSubject) private subjectsRepo: Repository<HomeworkSubject>,
    @InjectRepository(HomeworkActivity) private activitiesRepo: Repository<HomeworkActivity>,
    @InjectRepository(HomeworkActivityRecord) private recordsRepo: Repository<HomeworkActivityRecord>,
    @InjectRepository(Teacher) private teachersRepo: Repository<Teacher>,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(Family) private familiesRepo: Repository<Family>,
    @InjectRepository(FamilyStudent) private familyStudentsRepo: Repository<FamilyStudent>,
    @InjectRepository(Notification) private notificationsRepo: Repository<Notification>,
    @InjectRepository(FamilyAlert) private familyAlertsRepo: Repository<FamilyAlert>,
    private readonly emailService: EmailService,
  ) {}

  private async getTeacher(userId: string): Promise<Teacher> {
    const t = await this.teachersRepo.findOne({ where: { user: { id: userId } } });
    if (!t) throw new NotFoundException('Perfil de profesor no encontrado');
    return t;
  }

  private async verifySubjectOwner(subjectId: string, teacherId: string): Promise<HomeworkSubject> {
    const s = await this.subjectsRepo.findOne({ where: { id: subjectId } });
    if (!s) throw new NotFoundException('Asignatura no encontrada');
    if (s.teacherId !== teacherId) throw new ForbiddenException('No tienes acceso a esta asignatura');
    return s;
  }

  // ---- SUBJECTS ----

  async getMySubjects(userId: string) {
    const teacher = await this.getTeacher(userId);
    const subjects = await this.subjectsRepo.find({
      where: { teacherId: teacher.id },
      relations: ['students'],
      order: { createdAt: 'ASC' },
    });
    return subjects.map((s) => ({
      id: s.id, name: s.name, color: s.color,
      studentCount: s.students?.length ?? 0,
      createdAt: s.createdAt,
    }));
  }

  async createSubject(dto: { name: string; color: string }, userId: string) {
    const teacher = await this.getTeacher(userId);
    const s = this.subjectsRepo.create({ name: dto.name, color: dto.color, teacherId: teacher.id });
    return this.subjectsRepo.save(s);
  }

  async updateSubject(subjectId: string, dto: { name?: string; color?: string }, userId: string) {
    const teacher = await this.getTeacher(userId);
    const s = await this.verifySubjectOwner(subjectId, teacher.id);
    if (dto.name !== undefined) s.name = dto.name;
    if (dto.color !== undefined) s.color = dto.color;
    return this.subjectsRepo.save(s);
  }

  async deleteSubject(subjectId: string, userId: string) {
    const teacher = await this.getTeacher(userId);
    await this.verifySubjectOwner(subjectId, teacher.id);
    await this.subjectsRepo.delete(subjectId);
    return { deleted: true };
  }

  // ---- STUDENTS IN SUBJECT ----

  async getSubjectStudents(subjectId: string, userId: string) {
    const teacher = await this.getTeacher(userId);
    const s = await this.subjectsRepo.findOne({
      where: { id: subjectId, teacherId: teacher.id },
      relations: ['students', 'students.user', 'students.user.profile'],
    });
    if (!s) throw new NotFoundException('Asignatura no encontrada');
    return s.students.map((st) => ({
      id: st.id,
      name: st.user?.profile ? `${st.user.profile.firstName} ${st.user.profile.lastName}` : 'Alumno',
      enrollmentNumber: st.enrollmentNumber,
      avatarUrl: st.user?.profile?.avatarUrl ?? null,
    }));
  }

  async setSubjectStudents(subjectId: string, studentIds: string[], userId: string) {
    const teacher = await this.getTeacher(userId);
    const s = await this.subjectsRepo.findOne({ where: { id: subjectId, teacherId: teacher.id }, relations: ['students'] });
    if (!s) throw new NotFoundException('Asignatura no encontrada');
    const students = studentIds.length > 0 ? await this.studentsRepo.findBy({ id: In(studentIds) }) : [];
    s.students = students;
    await this.subjectsRepo.save(s);
    return { updated: true, studentCount: students.length };
  }

  // Search all students for the picker
  async searchAllStudents(query: string) {
    const qb = this.studentsRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'u')
      .leftJoinAndSelect('u.profile', 'p')
      .leftJoinAndSelect('s.classGroups', 'cg');
    if (query && query.trim()) {
      qb.where(
        "(LOWER(p.firstName || ' ' || p.lastName) LIKE LOWER(:q) OR LOWER(s.enrollmentNumber) LIKE LOWER(:q))",
        { q: `%${query.trim()}%` }
      );
    }
    qb.orderBy('p.lastName', 'ASC').addOrderBy('p.firstName', 'ASC').take(50);
    const students = await qb.getMany();
    return students.map((st) => ({
      id: st.id,
      name: st.user?.profile ? `${st.user.profile.firstName} ${st.user.profile.lastName}` : 'Alumno',
      enrollmentNumber: st.enrollmentNumber,
      classGroupName: st.classGroups?.[0]?.name ?? null,
      avatarUrl: st.user?.profile?.avatarUrl ?? null,
    }));
  }

  // ---- ACTIVITIES ----

  async createActivity(subjectId: string, dto: { name: string; date: string; description?: string }, userId: string) {
    const teacher = await this.getTeacher(userId);
    await this.verifySubjectOwner(subjectId, teacher.id);
    const act = this.activitiesRepo.create({ subjectId, name: dto.name, date: dto.date, description: dto.description ?? null });
    return this.activitiesRepo.save(act);
  }

  async updateActivity(activityId: string, dto: { name?: string; description?: string }, userId: string) {
    const teacher = await this.getTeacher(userId);
    const act = await this.activitiesRepo.findOne({ where: { id: activityId }, relations: ['subject'] });
    if (!act) throw new NotFoundException('Actividad no encontrada');
    if (act.subject.teacherId !== teacher.id) throw new ForbiddenException();
    if (dto.name !== undefined) act.name = dto.name;
    if (dto.description !== undefined) act.description = dto.description;
    return this.activitiesRepo.save(act);
  }

  async deleteActivity(activityId: string, userId: string) {
    const teacher = await this.getTeacher(userId);
    const act = await this.activitiesRepo.findOne({ where: { id: activityId }, relations: ['subject'] });
    if (!act) throw new NotFoundException('Actividad no encontrada');
    if (act.subject.teacherId !== teacher.id) throw new ForbiddenException();
    await this.activitiesRepo.delete(activityId);
    return { deleted: true };
  }

  // ---- RECORDS ----

  async upsertActivityRecord(activityId: string, studentId: string, status: HwRecordStatus, notes: string | null, userId: string) {
    const teacher = await this.getTeacher(userId);
    const act = await this.activitiesRepo.findOne({ where: { id: activityId }, relations: ['subject'] });
    if (!act) throw new NotFoundException('Actividad no encontrada');
    if (act.subject.teacherId !== teacher.id) throw new ForbiddenException();

    const existing = await this.recordsRepo.findOne({ where: { activityId, studentId } });
    let saved: HomeworkActivityRecord;
    if (existing) {
      existing.status = status;
      existing.notes = notes;
      existing.recordedByTeacherId = teacher.id;
      saved = await this.recordsRepo.save(existing);
    } else {
      const r = this.recordsRepo.create({ activityId, studentId, status, notes, recordedByTeacherId: teacher.id });
      saved = await this.recordsRepo.save(r);
    }

    // Gestión de notificaciones con retraso de 5 minutos.
    // Si el profesor cambia el estado antes de que pasen los 5 min se cancela el timer anterior
    // y se programa uno nuevo (o ninguno si el nuevo estado es COMPLETED/null).
    const timerKey = `${studentId}_${activityId}`;

    // Cancelar cualquier timer pendiente para esta combinación alumno+actividad
    if (this.pendingNotifTimers.has(timerKey)) {
      clearTimeout(this.pendingNotifTimers.get(timerKey)!);
      this.pendingNotifTimers.delete(timerKey);
      this.logger.log(`⏹ Timer de notificación cancelado para ${timerKey} (nuevo estado: ${status})`);
    }

    if (status === HwRecordStatus.NOT_DONE || status === HwRecordStatus.PARTIAL) {
      const delayMs = 5 * 60 * 1000; // 5 minutos
      const timer = setTimeout(() => {
        this.pendingNotifTimers.delete(timerKey);
        // Verificar el estado actual en BD antes de enviar.
        // Cubre el caso en que el profesor cambie el estado dentro de los 5 min
        // y el timer no se haya podido cancelar (ej. condición de carrera entre peticiones).
        this.recordsRepo.findOne({ where: { activityId, studentId } }).then((currentRecord) => {
          if (!currentRecord || currentRecord.status === HwRecordStatus.COMPLETED) {
            this.logger.log(`⏹ Notificación omitida — estado actual en BD: ${currentRecord?.status ?? 'sin registro'} para ${timerKey}`);
            return;
          }
          return this.notifyFamilyHomeworkStatus(studentId, act, currentRecord.status, teacher);
        }).catch((err) =>
          this.logger.warn(`⚠️ Error enviando notificación de tarea a familia: ${err?.message}`),
        );
      }, delayMs);
      this.pendingNotifTimers.set(timerKey, timer);
      this.logger.log(`⏳ Notificación programada en 5 min — alumno ${studentId}, actividad "${act.name}" (${status})`);
    } else {
      // Si la tarea se marca como REALIZADA, desactivar cualquier alerta familiar pendiente
      this.deactivateHomeworkAlerts(studentId, activityId).catch((err) =>
        this.logger.warn(`⚠️ Error desactivando alertas de tarea: ${err?.message}`),
      );
    }

    return saved;
  }

  async deleteActivityRecord(recordId: string, userId: string) {
    const teacher = await this.getTeacher(userId);
    const r = await this.recordsRepo.findOne({ where: { id: recordId }, relations: ['activity', 'activity.subject'] });
    if (!r) throw new NotFoundException('Registro no encontrado');
    if (r.activity.subject.teacherId !== teacher.id) throw new ForbiddenException();
    await this.recordsRepo.delete(recordId);
    return { deleted: true };
  }

  // ---- GRID ----

  async getSubjectGrid(subjectId: string, startDate: string, endDate: string, userId: string) {
    const teacher = await this.getTeacher(userId);
    const subject = await this.subjectsRepo.findOne({
      where: { id: subjectId, teacherId: teacher.id },
      relations: ['students', 'students.user', 'students.user.profile'],
    });
    if (!subject) throw new NotFoundException('Asignatura no encontrada');

    const activities = await this.activitiesRepo.find({
      where: { subjectId, date: Between(startDate as any, endDate as any) as any },
      order: { date: 'ASC', createdAt: 'ASC' },
    });

    const activityIds = activities.map((a) => a.id);
    const records = activityIds.length > 0
      ? await this.recordsRepo.find({ where: { activityId: In(activityIds) } })
      : [];

    const recordMap = new Map<string, HomeworkActivityRecord>();
    records.forEach((r) => recordMap.set(`${r.activityId}_${r.studentId}`, r));

    // Group activities by date
    const dateMap = new Map<string, HomeworkActivity[]>();
    activities.forEach((a) => {
      const d = typeof a.date === 'string' ? a.date : (a.date as any).toISOString().split('T')[0];
      if (!dateMap.has(d)) dateMap.set(d, []);
      dateMap.get(d)!.push(a);
    });

    const students = subject.students.map((st) => ({
      id: st.id,
      name: st.user?.profile ? `${st.user.profile.firstName} ${st.user.profile.lastName}` : 'Alumno',
      enrollmentNumber: st.enrollmentNumber,
    }));

    const dates = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, acts]) => ({
      date,
      activities: acts.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        records: Object.fromEntries(
          students.map((st) => {
            const r = recordMap.get(`${a.id}_${st.id}`);
            return [st.id, r ? { recordId: r.id, status: r.status, notes: r.notes } : { recordId: null, status: null, notes: null }];
          })
        ),
      })),
    }));

    return { subject: { id: subject.id, name: subject.name, color: subject.color }, students, dates };
  }

  // ---- FAMILY ----

  async getFamilySubjects(studentId: string, userId: string) {
    // Verify family has access to this student
    const family = await this.familiesRepo
      .createQueryBuilder('f')
      .where('f.primaryContactId = :userId OR f.secondaryContactId = :userId', { userId })
      .getOne();
    if (!family) throw new ForbiddenException('Acceso no autorizado');
    const fs = await this.familyStudentsRepo.findOne({ where: { familyId: family.id, studentId } });
    if (!fs) throw new ForbiddenException('Este alumno no pertenece a tu familia');

    const subjects = await this.subjectsRepo
      .createQueryBuilder('hs')
      .innerJoin('hs.students', 'st', 'st.id = :sid', { sid: studentId })
      .leftJoinAndSelect('hs.teacher', 't')
      .leftJoinAndSelect('t.user', 'u')
      .leftJoinAndSelect('u.profile', 'p')
      .getMany();

    return subjects.map((s) => ({
      id: s.id, name: s.name, color: s.color,
      teacherName: s.teacher?.user?.profile
        ? `${s.teacher.user.profile.firstName} ${s.teacher.user.profile.lastName}`
        : 'Profesor',
    }));
  }

  async getFamilySubjectGrid(subjectId: string, studentId: string, startDate: string, endDate: string, userId: string) {
    // Verify family access
    const family = await this.familiesRepo
      .createQueryBuilder('f')
      .where('f.primaryContactId = :userId OR f.secondaryContactId = :userId', { userId })
      .getOne();
    if (!family) throw new ForbiddenException();
    const fs = await this.familyStudentsRepo.findOne({ where: { familyId: family.id, studentId } });
    if (!fs) throw new ForbiddenException();

    const subject = await this.subjectsRepo.findOne({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException();

    const activities = await this.activitiesRepo.find({
      where: { subjectId, date: Between(startDate as any, endDate as any) as any },
      order: { date: 'ASC', createdAt: 'ASC' },
    });

    const activityIds = activities.map((a) => a.id);
    const records = activityIds.length > 0
      ? await this.recordsRepo.find({ where: { activityId: In(activityIds), studentId } })
      : [];
    const recordMap = new Map(records.map((r) => [r.activityId, r]));

    const dateMap = new Map<string, HomeworkActivity[]>();
    activities.forEach((a) => {
      const d = typeof a.date === 'string' ? a.date : (a.date as any).toISOString().split('T')[0];
      if (!dateMap.has(d)) dateMap.set(d, []);
      dateMap.get(d)!.push(a);
    });

    const dates = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, acts]) => ({
      date,
      activities: acts.map((a) => {
        const r = recordMap.get(a.id);
        return { id: a.id, name: a.name, description: a.description, status: r?.status ?? null, recordId: r?.id ?? null };
      }),
    }));

    return { subject: { id: subject.id, name: subject.name, color: subject.color }, dates };
  }

  // ---- RESUMEN DE PENDIENTES POR ASIGNATURA ----

  async getSubjectPendingSummary(userId: string): Promise<Array<{ id: string; name: string; color: string; pendingCount: number }>> {
    const teacher = await this.getTeacher(userId);
    const subjects = await this.subjectsRepo.find({ where: { teacherId: teacher.id } });
    if (subjects.length === 0) return [];

    const subjectIds = subjects.map((s) => s.id);
    const counts = await this.recordsRepo
      .createQueryBuilder('r')
      .select('ha.subjectId', 'subjectId')
      .addSelect('COUNT(r.id)', 'cnt')
      .innerJoin(HomeworkActivity, 'ha', 'ha.id = r.activityId')
      .where('ha.subjectId IN (:...subjectIds)', { subjectIds })
      .andWhere('r.status IN (:...statuses)', { statuses: [HwRecordStatus.NOT_DONE, HwRecordStatus.PARTIAL] })
      .groupBy('ha.subjectId')
      .getRawMany();

    const countMap = new Map<string, number>(counts.map((c) => [c.subjectId, parseInt(c.cnt, 10)]));

    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      pendingCount: countMap.get(s.id) ?? 0,
    }));
  }

  // ---- NOTIFICACIONES A FAMILIA ----

  private async notifyFamilyHomeworkStatus(
    studentId: string,
    activity: HomeworkActivity,
    status: HwRecordStatus,
    teacher: Teacher,
  ): Promise<void> {
    // 1. Obtener nombre del alumno
    const student = await this.studentsRepo.findOne({
      where: { id: studentId },
      relations: ['user', 'user.profile'],
    });
    if (!student) return;

    const firstName = student.user?.profile?.firstName ?? '';
    const lastName = student.user?.profile?.lastName ?? '';
    const studentName = `${firstName} ${lastName}`.trim() || 'el alumno/a';

    // 2. Obtener emails e IDs de los contactos familiares
    const familyStudents = await this.familyStudentsRepo.find({
      where: { studentId },
      relations: ['family', 'family.primaryContact', 'family.secondaryContact'],
    });

    // Map email → userId para pasar userId a sendEmail y evitar el constraint NOT NULL en recipientId
    const emailsToNotify = new Map<string, string>(); // email → userId
    const familyUserIds: string[] = [];
    for (const fs of familyStudents) {
      if (fs.family?.primaryContact?.email && fs.family.primaryContact.id) {
        emailsToNotify.set(fs.family.primaryContact.email, fs.family.primaryContact.id);
        familyUserIds.push(fs.family.primaryContact.id);
      }
      if (fs.family?.secondaryContact?.email && fs.family.secondaryContact.id) {
        emailsToNotify.set(fs.family.secondaryContact.email, fs.family.secondaryContact.id);
        familyUserIds.push(fs.family.secondaryContact.id);
      }
    }

    if (emailsToNotify.size === 0) {
      this.logger.warn(`⚠️ No se encontraron emails familiares para el alumno ${studentId}`);
      return;
    }

    // 3. Preparar contenido del email según el estado
    const isNotDone = status === HwRecordStatus.NOT_DONE;
    const statusLabel = isNotDone ? 'No realizada' : 'Realizada a medias';
    const statusColor = isNotDone ? '#ff4d4f' : '#faad14';
    const statusEmoji = isNotDone ? '😢' : '😐';
    const subjectName = activity.subject?.name ?? 'la asignatura';
    const activityName = activity.name;
    const activityDate = typeof activity.date === 'string'
      ? new Date(activity.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : new Date(activity.date as any).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const motivationalMessage = isNotDone
      ? `La realización diaria de las tareas es fundamental para el aprendizaje y desarrollo de su hijo/a. Trabajar de forma constante y organizada ayuda a consolidar los conocimientos adquiridos en clase, desarrollar hábitos de estudio y mejorar el rendimiento académico. Le animamos a que refuerce en casa la importancia del esfuerzo diario.`
      : `Su hijo/a ha realizado la tarea de forma parcial. Completar las tareas al 100% es importante para afianzar los contenidos trabajados en clase. El esfuerzo constante y llevar las actividades al día marca una gran diferencia en la evolución y el progreso escolar. Le pedimos que, si es posible, ayude a su hijo/a a dedicar un poco más de tiempo a la tarea.`;

    const emailSubject = `${statusEmoji} Tarea ${isNotDone ? 'no realizada' : 'realizada a medias'} — ${studentName}`;

    const alertBg    = isNotDone ? '#fff3f3' : '#fffbe6';
    const alertBorder = isNotDone ? '#e74c3c' : '#e67e22';
    const alertTitle  = isNotDone ? '#c0392b' : '#d35400';
    const headerBorder = isNotDone ? '#e74c3c' : '#ff9f43';
    const headerColor  = isNotDone ? '#c0392b' : '#e67e22';
    const currentDate  = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailSubject} - Mundo World School</title>
    <style>
        body {
            font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
            background-color: #f4f6f8;
            color: #2c3e50;
            margin: 0;
            padding: 40px 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            padding: 30px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid ${headerBorder};
            padding-bottom: 20px;
        }
        .header h1 {
            font-size: 26px;
            color: ${headerColor};
            margin: 10px 0;
        }
        .header p {
            font-size: 14px;
            color: #7f8c8d;
        }
        .alert-box {
            background-color: ${alertBg};
            border-left: 5px solid ${alertBorder};
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
        }
        .alert-box h3 {
            color: ${alertTitle};
            margin-top: 0;
        }
        .task-info {
            background-color: #f9fafb;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ecf0f1;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: 600;
            color: #95a5a6;
        }
        .value {
            font-weight: 500;
            color: #2c3e50;
        }
        .status-badge {
            background-color: ${alertBorder};
            color: white;
            padding: 4px 10px;
            border-radius: 15px;
            font-size: 12px;
        }
        .advice-box {
            background: #eafaf1;
            border-left: 4px solid #27ae60;
            border-radius: 0 8px 8px 0;
            padding: 15px 20px;
            margin-top: 25px;
        }
        .advice-box h4 {
            color: #1e8449;
            margin: 0 0 8px 0;
            font-size: 14px;
        }
        .advice-box ul {
            margin: 0;
            padding-left: 18px;
            color: #1e8449;
            font-size: 14px;
            line-height: 1.7;
        }
        .btn {
            display: inline-block;
            margin-top: 30px;
            padding: 12px 24px;
            background-color: #27ae60;
            color: #ffffff;
            text-decoration: none;
            font-weight: bold;
            border-radius: 6px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 12px;
            color: #7f8c8d;
            border-top: 1px solid #ecf0f1;
            padding-top: 20px;
        }
        .footer img {
            margin-top: 10px;
            width: 100px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">

        <div class="header">
            <div style="font-size: 42px;">${statusEmoji}</div>
            <h1>Tarea ${statusLabel}</h1>
            <p>Notificación del sistema educativo · Mundo World School</p>
        </div>

        <p>Estimada familia de <strong>${studentName}</strong>,</p>

        <div class="alert-box">
            <h3>${isNotDone ? '🚨 Tarea no realizada' : '⚠️ Tarea realizada a medias'}</h3>
            <p>${motivationalMessage}</p>
        </div>

        <div class="task-info">
            <h3>📝 Detalles de la actividad</h3>

            <div class="info-row">
                <span class="label">👤 Estudiante:</span>
                <span class="value">${studentName}</span>
            </div>
            <div class="info-row">
                <span class="label">📚 Asignatura:</span>
                <span class="value">${subjectName}</span>
            </div>
            <div class="info-row">
                <span class="label">📋 Actividad:</span>
                <span class="value">${activityName}</span>
            </div>
            <div class="info-row">
                <span class="label">📅 Fecha:</span>
                <span class="value">${activityDate}</span>
            </div>
            <div class="info-row">
                <span class="label">Estado:</span>
                <span class="value"><span class="status-badge">${statusLabel}</span></span>
            </div>
        </div>

        <div class="advice-box">
            <h4>💡 Recomendaciones</h4>
            <ul>
                <li>Hable con ${studentName} sobre la importancia de completar las tareas diarias</li>
                <li>Reserve un momento tranquilo en casa para hacer las actividades</li>
                <li>Si necesita apoyo, contacte con el profesorado a través de la plataforma</li>
                <li>El esfuerzo constante marca la diferencia en el progreso escolar</li>
            </ul>
        </div>

        <div style="text-align: center;">
            <a href="https://plataforma.mundoworld.school/family" class="btn">🏠 Acceder al Portal Familiar</a>
        </div>

        <div class="footer">
            <p>
                <strong>MW Panel – Mundo World School</strong><br>
                Este es un mensaje automático. Por favor, no responda a este correo.<br>
                Fecha de envío: ${currentDate}
            </p>
            <img src="https://plataforma.mundoworld.school/logo-MWSchool.png" alt="Logo Mundo World School">
        </div>

    </div>
</body>
</html>`;

    // 4. Crear notificaciones en la campana para los contactos familiares
    const notifTitle = `${isNotDone ? '😢 Tarea no realizada' : '😐 Tarea a medias'} — ${studentName}`;
    const notifContent = `La actividad "${activityName}" de ${subjectName} (${activityDate}) ha sido marcada como ${statusLabel.toLowerCase()}.`;

    for (const familyUserId of familyUserIds) {
      try {
        const notif = this.notificationsRepo.create({
          title: notifTitle,
          content: notifContent,
          type: NotificationType.ACADEMIC,
          status: NotificationStatus.UNREAD,
          userId: familyUserId,
          relatedStudentId: studentId,
          relatedResourceId: activity.id,
          relatedResourceType: 'homework_activity',
          actionUrl: '/family/daily-homework',
        });
        await this.notificationsRepo.save(notif);
      } catch (err) {
        this.logger.warn(`⚠️ Error creando notificación para familiar ${familyUserId}: ${err?.message}`);
      }
    }

    // 5. Enviar email a cada contacto familiar (con userId para evitar constraint NOT NULL)
    for (const [email, userId] of emailsToNotify) {
      try {
        await this.emailService.sendEmail({
          to: email,
          userId,
          subject: emailSubject,
          htmlContent,
          priority: EmailPriority.NORMAL,
          triggerEvent: 'homework_status_alert',
          triggerResourceId: activity.id,
          triggerResourceType: 'homework_activity',
        });
        this.logger.log(`✅ Notificación de tarea enviada a ${email} para alumno ${studentName}`);
      } catch (err) {
        this.logger.warn(`⚠️ Error al enviar notificación a ${email}: ${err?.message}`);
      }
    }
  }

  private async deactivateHomeworkAlerts(studentId: string, activityId: string): Promise<void> {
    try {
      await this.familyAlertsRepo
        .createQueryBuilder()
        .update()
        .set({ isActive: false })
        .where('studentId = :studentId', { studentId })
        .andWhere('alertType IN (:...types)', { types: [AlertType.HOMEWORK_NOT_DONE, AlertType.HOMEWORK_PARTIAL] })
        .andWhere("metadata->>'taskId' = :activityId", { activityId })
        .andWhere('isActive = true')
        .execute();
      this.logger.log(`✅ Alertas familiares desactivadas para alumno ${studentId}, actividad ${activityId}`);
    } catch (err) {
      this.logger.warn(`⚠️ Error desactivando alertas familiares: ${err?.message}`);
    }
  }
}
