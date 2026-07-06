import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, QueryRunner, DataSource, LessThan, MoreThan } from 'typeorm';
import { MeetingPeriod } from '../entities/meeting-period.entity';
import { MeetingSlot } from '../entities/meeting-slot.entity';
import { MeetingBooking, MeetingBookingStatus } from '../entities/meeting-booking.entity';
import { MeetingSpace } from '../entities/meeting-space.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Family, FamilyStudent } from '../../users/entities/family.entity';
import { Student } from '../../students/entities/student.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { User } from '../../users/entities/user.entity';
import {
  CreateMeetingPeriodDto,
  UpdateMeetingPeriodDto,
  CreateMeetingSlotDto,
  CreateBulkSlotsDto,
  BookMeetingSlotDto,
  CancelBookingDto,
  UpdateBookingDto,
  MeetingFiltersDto,
  CreateMeetingSpaceDto,
  UpdateMeetingSpaceDto,
  SpaceAvailabilityResponseDto,
} from '../dto';
import { CalendarService } from '../../calendar/calendar.service';
import { CalendarEventType, CalendarEventVisibility } from '../../calendar/entities/calendar-event.entity';
import { NotificationService } from '../../communications/services/notification.service';
import { EmailService } from '../../communications/services/email.service';
import { EmailPriority } from '../../communications/entities/email-notification.entity';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(MeetingPeriod)
    private meetingPeriodsRepository: Repository<MeetingPeriod>,
    @InjectRepository(MeetingSlot)
    private meetingSlotsRepository: Repository<MeetingSlot>,
    @InjectRepository(MeetingBooking)
    private meetingBookingsRepository: Repository<MeetingBooking>,
    @InjectRepository(MeetingSpace)
    private meetingSpacesRepository: Repository<MeetingSpace>,
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(Family)
    private familiesRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private familyStudentsRepository: Repository<FamilyStudent>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(ClassGroup)
    private classGroupsRepository: Repository<ClassGroup>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
    private calendarService: CalendarService, // ✅ Integración con calendario
    private notificationService: NotificationService, // ✅ Sistema de notificaciones
    private emailService: EmailService, // ✅ Emails directos a familias (confirmación/denegación)
  ) {}

  /**
   * Envía email a los contactos de la familia cuando el profesor
   * confirma o deniega una reserva de reunión.
   */
  private async sendBookingDecisionEmails(
    booking: MeetingBooking,
    decision: 'confirmed' | 'denied',
    reason?: string,
  ): Promise<void> {
    const family = await this.familiesRepository.findOne({
      where: { id: booking.familyId },
      relations: ['primaryContact', 'primaryContact.profile', 'secondaryContact', 'secondaryContact.profile'],
    });

    if (!family) return;

    const teacherName = booking.slot?.teacher?.user?.profile
      ? `${booking.slot.teacher.user.profile.firstName} ${booking.slot.teacher.user.profile.lastName}`
      : 'el profesor/a';
    const studentName = booking.student?.user?.profile
      ? `${booking.student.user.profile.firstName} ${booking.student.user.profile.lastName}`
      : 'su hijo/a';
    const meetingDate = booking.slot?.startDatetime
      ? new Date(booking.slot.startDatetime).toLocaleDateString('es-ES', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
      : '';
    const meetingTime = booking.slot?.startDatetime
      ? new Date(booking.slot.startDatetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : '';

    const isConfirmed = decision === 'confirmed';
    const subject = isConfirmed
      ? `✅ Reunión confirmada con ${teacherName} - ${meetingDate}`
      : `❌ Solicitud de reunión no aceptada - ${meetingDate}`;

    const buildHtml = (contactName: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${isConfirmed ? '#52c41a' : '#ff4d4f'}; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">${isConfirmed ? 'Reunión confirmada' : 'Solicitud de reunión no aceptada'}</h2>
        </div>
        <div style="border: 1px solid #e8e8e8; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p>Hola ${contactName},</p>
          <p>${isConfirmed
            ? `Su solicitud de reunión con <strong>${teacherName}</strong> ha sido <strong>confirmada</strong>.`
            : `Lamentablemente, su solicitud de reunión con <strong>${teacherName}</strong> no ha podido ser aceptada.`}</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><strong>Alumno/a</strong></td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${studentName}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><strong>Fecha</strong></td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${meetingDate}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><strong>Hora</strong></td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${meetingTime}</td></tr>
            ${isConfirmed && booking.space?.name ? `<tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><strong>Lugar</strong></td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${booking.space.name}${booking.space.location ? ` (${booking.space.location})` : ''}</td></tr>` : ''}
            ${!isConfirmed && reason ? `<tr><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><strong>Motivo</strong></td><td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${reason}</td></tr>` : ''}
          </table>
          ${!isConfirmed ? '<p>Puede solicitar una nueva reunión en otro horario disponible desde la plataforma.</p>' : ''}
          <p style="margin-top: 24px;">Un saludo,<br/>Mundo World School</p>
        </div>
      </div>`;

    const contacts = [family.primaryContact, family.secondaryContact].filter(
      (c) => c && c.email && c.email.includes('@'),
    );

    await Promise.allSettled(
      contacts.map((contact) => {
        const contactName = contact.profile
          ? `${contact.profile.firstName} ${contact.profile.lastName}`
          : contact.email;
        return this.emailService.sendEmail({
          to: contact.email,
          subject,
          htmlContent: buildHtml(contactName),
          textContent: `${subject}. Alumno/a: ${studentName}. Fecha: ${meetingDate} ${meetingTime}.${reason ? ` Motivo: ${reason}` : ''}`,
          priority: EmailPriority.HIGH,
          userId: contact.id,
          triggerEvent: isConfirmed ? 'meeting_confirmed' : 'meeting_denied',
          triggerResourceId: booking.id,
          triggerResourceType: 'meeting_booking',
        });
      }),
    );
  }

  // ADMIN METHODS - Managing Periods
  async createPeriod(createDto: CreateMeetingPeriodDto, adminId: string): Promise<MeetingPeriod> {
    // Validate dates
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);
    const bookingDeadline = new Date(createDto.bookingDeadline);

    if (endDate <= startDate) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    if (bookingDeadline >= endDate) {
      throw new BadRequestException('La fecha límite de reserva debe ser anterior a la fecha de fin');
    }

    const period = this.meetingPeriodsRepository.create({
      ...createDto,
      createdById: adminId,
    });

    const savedPeriod = await this.meetingPeriodsRepository.save(period);
    
    // Load relations for the response
    return this.getPeriodById(savedPeriod.id);
  }

  async getAllPeriods(): Promise<MeetingPeriod[]> {
    return this.meetingPeriodsRepository.find({
      relations: ['createdBy', 'createdBy.profile'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPeriodById(id: string): Promise<MeetingPeriod> {
    const period = await this.meetingPeriodsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'createdBy.profile'],
    });

    if (!period) {
      throw new NotFoundException('Período de reuniones no encontrado');
    }

    return period;
  }

  async updatePeriod(id: string, updateDto: UpdateMeetingPeriodDto): Promise<MeetingPeriod> {
    const period = await this.getPeriodById(id);

    // Validate dates if they're being updated
    if (updateDto.startDate || updateDto.endDate || updateDto.bookingDeadline) {
      const startDate = new Date(updateDto.startDate || period.startDate);
      const endDate = new Date(updateDto.endDate || period.endDate);
      const bookingDeadline = new Date(updateDto.bookingDeadline || period.bookingDeadline);

      if (endDate <= startDate) {
        throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
      }

      if (bookingDeadline >= endDate) {
        throw new BadRequestException('La fecha límite de reserva debe ser anterior a la fecha de fin');
      }
    }

    Object.assign(period, updateDto);
    return this.meetingPeriodsRepository.save(period);
  }

  async deletePeriod(id: string): Promise<void> {
    const period = await this.getPeriodById(id);
    
    // Check if there are any confirmed bookings
    const confirmedBookings = await this.meetingBookingsRepository.count({
      where: { periodId: id, status: MeetingBookingStatus.CONFIRMED },
    });

    if (confirmedBookings > 0) {
      throw new BadRequestException('No se puede eliminar un período con reservas confirmadas');
    }

    await this.meetingPeriodsRepository.remove(period);
  }

  // TEACHER METHODS - Managing Slots
  async createSlot(createDto: CreateMeetingSlotDto, teacherId: string): Promise<MeetingSlot> {
    const teacher = await this.getTeacherByUserId(teacherId);
    const period = await this.getPeriodById(createDto.periodId);

    if (!period.isActive) {
      throw new BadRequestException('No se pueden crear slots en un período inactivo');
    }

    // Crear la fecha respetando la hora local española sin conversión de timezone
    // Si la fecha no incluye zona horaria, la tratamos como hora local de España
    let startDatetime: Date;
    
    if (createDto.startDatetime.includes('Z') || createDto.startDatetime.includes('+') || createDto.startDatetime.includes('-')) {
      // Si ya tiene zona horaria, usarla directamente
      startDatetime = new Date(createDto.startDatetime);
    } else {
      // Si no tiene zona horaria, tratarla como hora local de España
      // Crear la fecha forzando que se interprete como horario local sin DST automático
      const [datepart, timepart] = createDto.startDatetime.split('T');
      const [year, month, day] = datepart.split('-').map(Number);
      const [hour, minute, second = 0] = timepart.split(':').map(Number);
      
      // Crear Date con año, mes (0-indexado), día, hora, minuto, segundo
      // Esto evita cualquier conversión automática de timezone
      startDatetime = new Date(year, month - 1, day, hour, minute, second);
    }
    
    // Validate slot is within period
    if (!period.isInPeriod(startDatetime)) {
      throw new BadRequestException('El slot debe estar dentro del período de reuniones');
    }

    // Check for conflicting slots
    await this.checkForConflictingSlots(teacher.id, startDatetime, createDto.durationMinutes || 30);

    const slot = this.meetingSlotsRepository.create({
      ...createDto,
      teacherId: teacher.id,
      startDatetime,
    });

    return this.meetingSlotsRepository.save(slot);
  }

  async createBulkSlots(createDto: CreateBulkSlotsDto, teacherId: string): Promise<MeetingSlot[]> {
    // Debug log to understand the data structure
    console.log('=== SERVICE DEBUG BULK SLOTS ===');
    console.log('createDto:', JSON.stringify(createDto, null, 2));
    console.log('createDto.slots:', createDto.slots);
    console.log('createDto.slots type:', typeof createDto.slots);
    console.log('createDto.slots isArray:', Array.isArray(createDto.slots));
    console.log('================================');

    // Defensive transformation - handle cases where slots might be stringified JSON
    let slotsArray: any[] = [];
    
    if (!createDto.slots) {
      throw new BadRequestException('El campo slots es requerido');
    }
    
    if (Array.isArray(createDto.slots)) {
      slotsArray = createDto.slots;
    } else if (typeof createDto.slots === 'string') {
      try {
        slotsArray = JSON.parse(createDto.slots);
        if (!Array.isArray(slotsArray)) {
          throw new Error('Parsed slots is not an array');
        }
      } catch (error) {
        throw new BadRequestException('Los slots deben ser un arreglo válido (formato JSON incorrecto)');
      }
    } else {
      throw new BadRequestException('Los slots deben ser un arreglo válido');
    }

    console.log('=== AFTER TRANSFORMATION ===');
    console.log('slotsArray:', slotsArray);
    console.log('slotsArray length:', slotsArray.length);
    console.log('slotsArray isArray:', Array.isArray(slotsArray));
    console.log('============================');

    // Replace createDto.slots with the transformed array
    createDto.slots = slotsArray;

    const teacher = await this.getTeacherByUserId(teacherId);
    const period = await this.getPeriodById(createDto.periodId);

    if (!period.isActive) {
      throw new BadRequestException('No se pueden crear slots en un período inactivo');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const createdSlots: MeetingSlot[] = [];

      for (const slotData of createDto.slots) {
        // Crear la fecha respetando la hora local española sin conversión de timezone
        // Si la fecha no incluye zona horaria, la tratamos como hora local de España
        let startDatetime: Date;
        
        if (slotData.startDatetime.includes('Z') || slotData.startDatetime.includes('+') || slotData.startDatetime.includes('-')) {
          // Si ya tiene zona horaria, usarla directamente
          startDatetime = new Date(slotData.startDatetime);
        } else {
          // Si no tiene zona horaria, tratarla como hora local de España
          // Crear la fecha forzando que se interprete como horario local sin DST automático
          const [datepart, timepart] = slotData.startDatetime.split('T');
          const [year, month, day] = datepart.split('-').map(Number);
          const [hour, minute, second = 0] = timepart.split(':').map(Number);
          
          // Crear Date con año, mes (0-indexado), día, hora, minuto, segundo
          // Esto evita cualquier conversión automática de timezone
          startDatetime = new Date(year, month - 1, day, hour, minute, second);
        }
        
        // Validate slot is within period
        if (!period.isInPeriod(startDatetime)) {
          throw new BadRequestException(`El slot ${slotData.startDatetime} debe estar dentro del período de reuniones`);
        }

        // Check for conflicting slots
        await this.checkForConflictingSlots(teacher.id, startDatetime, slotData.durationMinutes || 30, queryRunner);

        const slot = queryRunner.manager.create(MeetingSlot, {
          periodId: createDto.periodId,
          teacherId: teacher.id,
          startDatetime,
          durationMinutes: slotData.durationMinutes || 30,
          notes: createDto.notes,
        });

        const savedSlot = await queryRunner.manager.save(slot);
        createdSlots.push(savedSlot);
      }

      await queryRunner.commitTransaction();
      return createdSlots;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTeacherSlots(teacherId: string, filters?: MeetingFiltersDto): Promise<MeetingSlot[]> {
    const teacher = await this.getTeacherByUserId(teacherId);

    // Obtener la fecha/hora actual para filtrar slots pasados
    const now = new Date();

    const queryBuilder = this.meetingSlotsRepository
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.period', 'period')
      .leftJoinAndSelect('slot.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('slot.bookings', 'bookings', 'bookings.status IN (:...statuses)', { statuses: [MeetingBookingStatus.CONFIRMED, MeetingBookingStatus.PENDING] })
      .leftJoinAndSelect('bookings.family', 'family')
      .leftJoinAndSelect('family.primaryContact', 'primaryContact')
      .leftJoinAndSelect('primaryContact.profile', 'primaryProfile')
      .leftJoinAndSelect('bookings.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .where('slot.teacherId = :teacherId', { teacherId: teacher.id })
      // Filtrar automáticamente los slots cuya fecha ya pasó
      // Solo mostrar slots con fecha >= ahora
      .andWhere('slot.startDatetime >= :now', { now })
      .orderBy('slot.startDatetime', 'ASC');

    if (filters?.periodId) {
      queryBuilder.andWhere('slot.periodId = :periodId', { periodId: filters.periodId });
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('slot.startDatetime >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('slot.startDatetime <= :endDate', { endDate: filters.endDate });
    }

    if (filters?.availableOnly) {
      queryBuilder.andWhere('slot.isAvailable = true');
      queryBuilder.andWhere('bookings.id IS NULL');
    }

    return queryBuilder.getMany();
  }

  async getTeacherFamilies(teacherId: string): Promise<any[]> {
    const teacher = await this.getTeacherByUserId(teacherId);

    // Get class groups where teacher is tutor
    const classGroups = await this.classGroupsRepository.find({
      where: { tutor: { id: teacher.id } },
      relations: ['students', 'students.user', 'students.user.profile'],
    });

    // Get families for students in teacher's tutored classes
    const familiesMap = new Map();

    for (const classGroup of classGroups) {
      for (const student of classGroup.students) {
        const familyStudents = await this.familyStudentsRepository.find({
          where: { studentId: student.id },
          relations: [
            'family',
            'family.primaryContact',
            'family.primaryContact.profile',
            'family.secondaryContact',
            'family.secondaryContact.profile',
          ],
        });

        for (const familyStudent of familyStudents) {
          if (!familiesMap.has(familyStudent.family.id)) {
            familiesMap.set(familyStudent.family.id, {
              family: familyStudent.family,
              students: [],
            });
          }
          familiesMap.get(familyStudent.family.id).students.push(student);
        }
      }
    }

    return Array.from(familiesMap.values());
  }

  /**
   * Obtener familias que aún no tienen reserva en un período específico
   * Solo devuelve familias del profesor que no tienen ninguna reunión confirmada o pendiente
   */
  async getFamiliesWithoutBookingInPeriod(periodId: string, teacherId: string): Promise<any[]> {
    const teacher = await this.getTeacherByUserId(teacherId);

    // Verificar que el período existe
    const period = await this.meetingPeriodsRepository.findOne({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Período de reuniones no encontrado');
    }

    // Obtener todas las familias del profesor
    const allFamilies = await this.getTeacherFamilies(teacherId);

    console.log(`🔍 [Service] Total families for teacher: ${allFamilies.length}`);

    // Obtener todas las reservas del período para este profesor
    const bookingsInPeriod = await this.meetingBookingsRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.slot', 'slot')
      .leftJoin('slot.teacher', 'teacher')
      .where('booking.periodId = :periodId', { periodId })
      .andWhere('teacher.id = :teacherId', { teacherId: teacher.id })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [MeetingBookingStatus.CONFIRMED, MeetingBookingStatus.PENDING],
      })
      .select(['booking.id', 'booking.familyId'])
      .getMany();

    console.log(`🔍 [Service] Bookings in period: ${bookingsInPeriod.length}`);

    // Crear un Set con los IDs de familias que YA tienen reserva
    const familiesWithBooking = new Set(bookingsInPeriod.map((booking) => booking.familyId));

    console.log(`🔍 [Service] Families with booking: ${familiesWithBooking.size}`);

    // Filtrar familias que NO están en el Set de reservas
    const familiesWithoutBooking = allFamilies.filter(
      (familyData) => !familiesWithBooking.has(familyData.family.id),
    );

    console.log(`🔍 [Service] Families without booking: ${familiesWithoutBooking.length}`);

    return familiesWithoutBooking;
  }

  /**
   * Asignar manualmente un slot a una familia específica
   * Crea una reserva directamente sin que la familia la haya solicitado
   */
  async assignSlotToFamily(
    slotId: string,
    teacherId: string,
    familyId: string,
    studentId: string,
    notes?: string,
  ): Promise<MeetingBooking> {
    console.log('🔍 [Service] assignSlotToFamily iniciado:', { slotId, teacherId, familyId, studentId, notes });

    try {
      console.log('1️⃣ Obteniendo profesor...');
      const teacher = await this.getTeacherByUserId(teacherId);
      console.log(`✅ Profesor encontrado: ${teacher.id}`);

      // Verificar que el slot existe y pertenece al profesor
      console.log('2️⃣ Verificando slot...');
      const slot = await this.meetingSlotsRepository.findOne({
        where: { id: slotId, teacherId: teacher.id },
        relations: ['period', 'bookings', 'teacher'],
      });

      if (!slot) {
        console.error(`❌ Slot no encontrado o no pertenece al profesor. SlotId: ${slotId}, TeacherId: ${teacher.id}`);
        throw new NotFoundException('Slot no encontrado o no tienes permiso para asignarlo');
      }
      console.log(`✅ Slot encontrado: ${slot.id}, Disponible: ${slot.isAvailable}`);

      // Verificar que el slot está disponible
      console.log('3️⃣ Verificando disponibilidad...');
      if (!slot.isAvailable) {
        console.error(`❌ Slot no disponible: ${slot.id}`);
        throw new BadRequestException('El slot no está disponible');
      }

      // Verificar que el slot no tiene ya una reserva activa
      console.log('4️⃣ Verificando reservas activas...');
      const hasActiveBooking = slot.bookings?.some(
        (booking) =>
          booking.status === MeetingBookingStatus.CONFIRMED ||
          booking.status === MeetingBookingStatus.PENDING,
      );

      if (hasActiveBooking) {
        console.error(`❌ Slot ya tiene una reserva activa: ${slot.id}`);
        throw new ConflictException('El slot ya tiene una reserva activa');
      }
      console.log('✅ Slot no tiene reservas activas');

      // Verificar que la familia existe
      console.log('5️⃣ Verificando familia...');
      const family = await this.familiesRepository.findOne({
        where: { id: familyId },
        relations: ['primaryContact', 'primaryContact.profile'],
      });

      if (!family) {
        console.error(`❌ Familia no encontrada: ${familyId}`);
        throw new NotFoundException('Familia no encontrada');
      }
      console.log(`✅ Familia encontrada: ${family.id}`);

      // Verificar que el estudiante existe y pertenece a la familia
      console.log('6️⃣ Verificando estudiante...');
      const student = await this.studentsRepository.findOne({
        where: { id: studentId },
        relations: ['user', 'user.profile'],
      });

      if (!student) {
        console.error(`❌ Estudiante no encontrado: ${studentId}`);
        throw new NotFoundException('Estudiante no encontrado');
      }
      console.log(`✅ Estudiante encontrado: ${student.id}`);

      // Verificar que el estudiante pertenece a la familia
      console.log('7️⃣ Verificando relación familia-estudiante...');
      const familyStudent = await this.familyStudentsRepository.findOne({
        where: { familyId: family.id, studentId: student.id },
      });

      if (!familyStudent) {
        console.error(`❌ Estudiante ${studentId} no pertenece a familia ${familyId}`);
        throw new BadRequestException('El estudiante no pertenece a la familia seleccionada');
      }
      console.log('✅ Relación familia-estudiante verificada');

      // Verificar que la familia no tiene ya una reserva para este estudiante en este período
      console.log('8️⃣ Verificando reservas existentes para estudiante en período...');
      console.log(`   🔍 Buscando con: familyId=${family.id}, studentId=${student.id}, periodId=${slot.period.id}`);
      const existingBooking = await this.meetingBookingsRepository.findOne({
        where: [
          {
            familyId: family.id,
            studentId: student.id,
            periodId: slot.period.id,
            status: MeetingBookingStatus.CONFIRMED,
          },
          {
            familyId: family.id,
            studentId: student.id,
            periodId: slot.period.id,
            status: MeetingBookingStatus.PENDING,
          },
        ],
      });
      console.log(`   🔍 Booking encontrado: ${existingBooking ? 'SÍ - ' + existingBooking.id : 'NO'}`);

      if (existingBooking) {
        console.error(`❌ Familia ${familyId} ya tiene reserva para estudiante ${studentId} en período ${slot.period.id}`);
        throw new ConflictException(
          'Ya existe una reunión reservada para este estudiante en este período',
        );
      }
      console.log('✅ No hay reservas existentes para este estudiante en este período');

      // Crear la reserva directamente como CONFIRMADA
      console.log('9️⃣ Creando reserva...');
      console.log(`   🔍 slot.id = ${slot.id}`);
      console.log(`   🔍 slot.period.id = ${slot.period.id}`);
      console.log(`   🔍 family.id = ${family.id}`);
      console.log(`   🔍 student.id = ${student.id}`);

      const booking = this.meetingBookingsRepository.create({
        slotId: slot.id,
        familyId: family.id,
        studentId: student.id,
        periodId: slot.period.id,
        status: MeetingBookingStatus.CONFIRMED,
        notes: notes || `Asignado manualmente por el profesor`,
        bookingDate: new Date(),
      });
      console.log('✅ Objeto de reserva creado');
      console.log(`   🔍 booking.slotId = ${booking.slotId}`);
      console.log(`   🔍 booking.familyId = ${booking.familyId}`);
      console.log(`   🔍 booking.studentId = ${booking.studentId}`);
      console.log(`   🔍 booking.periodId = ${booking.periodId}`);

      console.log('🔟 Guardando reserva en BD...');
      const savedBooking = await this.meetingBookingsRepository.save(booking);
      console.log(`✅ Reserva guardada con ID: ${savedBooking.id}`);

      // Actualizar disponibilidad del slot
      console.log('1️⃣1️⃣ Actualizando disponibilidad del slot...');
      slot.isAvailable = false;
      await this.meetingSlotsRepository.save(slot);
      console.log('✅ Slot marcado como no disponible');

      console.log(`✅ [Service] Slot ${slotId} asignado exitosamente a familia ${familyId}`);

      // Enviar notificación a la familia
      console.log('1️⃣2️⃣ Enviando notificación a familia...');
      try {
        await this.notificationService.processEvent({
          type: 'meeting_booked',
          recipientIds: [family.primaryContact.id],
          data: {
            teacherName: teacher.user.profile
              ? `${teacher.user.profile.firstName} ${teacher.user.profile.lastName}`
              : 'Profesor',
            studentName: student.user.profile
              ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
              : 'Estudiante',
            meetingDate: new Date(slot.startDatetime).toLocaleDateString('es-ES'),
            meetingTime: new Date(slot.startDatetime).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            durationMinutes: slot.durationMinutes,
            periodName: slot.period.name,
          },
          priority: EmailPriority.HIGH,
          immediate: true,
        });
        console.log('✅ Notificación enviada exitosamente');
      } catch (error) {
        console.error('⚠️ Error al enviar notificación de asignación de reunión:', error);
        // No lanzamos el error para no fallar la asignación
      }

      // Retornar la reserva con todas las relaciones
      console.log('1️⃣3️⃣ Obteniendo reserva con relaciones completas...');
      const finalBooking = await this.meetingBookingsRepository.findOne({
        where: { id: savedBooking.id },
        relations: [
          'slot',
          'slot.teacher',
          'slot.teacher.user',
          'slot.teacher.user.profile',
          'family',
          'family.primaryContact',
          'family.primaryContact.profile',
          'student',
          'student.user',
          'student.user.profile',
          'period',
        ],
      });
      console.log('✅ Reserva con relaciones obtenida, retornando...');

      return finalBooking;
    } catch (error) {
      console.error('❌❌❌ ERROR EN assignSlotToFamily:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  async deleteSlot(slotId: string, teacherId: string): Promise<void> {
    const teacher = await this.getTeacherByUserId(teacherId);
    
    const slot = await this.meetingSlotsRepository.findOne({
      where: { id: slotId, teacherId: teacher.id },
      relations: ['bookings'],
    });

    if (!slot) {
      throw new NotFoundException('Slot no encontrado');
    }

    // Check if slot has confirmed bookings
    const hasConfirmedBooking = slot.bookings?.some(
      booking => booking.status === MeetingBookingStatus.CONFIRMED
    );

    if (hasConfirmedBooking) {
      throw new BadRequestException('No se puede eliminar un slot con reservas confirmadas');
    }

    await this.meetingSlotsRepository.remove(slot);
  }

  // FAMILY METHODS - Booking Slots
  async getAvailableSlotsForFamily(familyId: string, filters?: MeetingFiltersDto): Promise<MeetingSlot[]> {
    console.log('🎯 [getAvailableSlotsForFamily] START - familyId:', familyId);
    console.log('🎯 [getAvailableSlotsForFamily] filters:', JSON.stringify(filters));

    const family = await this.getFamilyByUserId(familyId);
    console.log('🎯 [getAvailableSlotsForFamily] Found family:', family.id);

    // Get students associated with this family
    const familyStudents = await this.familyStudentsRepository.find({
      where: { familyId: family.id },
      relations: ['student', 'student.classGroups', 'student.classGroups.tutor', 'student.classGroups.tutor.user', 'student.classGroups.tutor.user.profile'],
    });

    console.log('🎯 [getAvailableSlotsForFamily] Family has', familyStudents.length, 'students');
    familyStudents.forEach((fs, idx) => {
      console.log(`🎯 Student ${idx + 1}:`, {
        id: fs.student.id,
        classGroups: fs.student.classGroups.length,
        tutors: fs.student.classGroups.map(cg => ({
          classGroup: cg.name,
          tutorId: cg.tutor?.id,
          tutorName: cg.tutor?.user?.profile ? `${cg.tutor.user.profile.firstName} ${cg.tutor.user.profile.lastName}` : cg.tutor?.user?.email
        }))
      });
    });

    if (familyStudents.length === 0) {
      console.log('🚨 No students found for family');
      return [];
    }

    // Get tutor teacher IDs - filter by specific student if provided
    const tutorIds = new Set<string>();

    if (filters?.studentId) {
      console.log('🔍 Filtering by specific studentId:', filters.studentId);

      // If studentId is provided, only get tutor for THAT student
      const specificFamilyStudent = familyStudents.find(fs => fs.student.id === filters.studentId);

      if (!specificFamilyStudent) {
        console.log('🚨 Student not found in family:', filters.studentId);
        return [];
      }

      console.log('✅ Found specific student:', {
        id: specificFamilyStudent.student.id,
        classGroups: specificFamilyStudent.student.classGroups.length
      });

      for (const classGroup of specificFamilyStudent.student.classGroups) {
        if (classGroup.tutor) {
          tutorIds.add(classGroup.tutor.id);
          console.log('✅ Added tutor for student:', {
            studentId: filters.studentId,
            tutorId: classGroup.tutor.id,
            tutorName: classGroup.tutor.user?.profile ? `${classGroup.tutor.user.profile.firstName} ${classGroup.tutor.user.profile.lastName}` : classGroup.tutor.user?.email,
            classGroup: classGroup.name
          });
        } else {
          console.log('⚠️ ClassGroup has no tutor:', classGroup.name);
        }
      }
    } else {
      console.log('🔍 No studentId filter - getting tutors for ALL students');
      // If no studentId, get tutors for ALL students (old behavior)
      for (const familyStudent of familyStudents) {
        for (const classGroup of familyStudent.student.classGroups) {
          if (classGroup.tutor) {
            tutorIds.add(classGroup.tutor.id);
          }
        }
      }
    }

    console.log('🎯 Final tutorIds:', Array.from(tutorIds));

    if (tutorIds.size === 0) {
      console.log('🚨 No tutors found for the selected criteria');
      return [];
    }

    // Primero obtener IDs de slots que tienen bookings CONFIRMED o PENDING
    const slotsWithActiveBookings = await this.meetingBookingsRepository
      .createQueryBuilder('booking')
      .select('booking.slotId')
      .where('booking.status IN (:...statuses)', {
        statuses: [MeetingBookingStatus.CONFIRMED, MeetingBookingStatus.PENDING]
      })
      .getMany();

    const excludedSlotIds = slotsWithActiveBookings.map(b => b.slotId);

    console.log('🔍 [getAvailableSlotsForFamily] Slots excluidos (con bookings activos):', excludedSlotIds.length);

    // Query principal excluyendo esos slots
    const queryBuilder = this.meetingSlotsRepository
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.period', 'period')
      .leftJoinAndSelect('slot.bookings', 'bookings') // Cargar bookings para isBookable()
      .leftJoinAndSelect('slot.teacher', 'teacher') // Cargar información del profesor
      .leftJoinAndSelect('teacher.user', 'teacherUser') // Cargar usuario del profesor
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile') // Cargar perfil del profesor
      .where('slot.teacherId IN (:...tutorIds)', { tutorIds: Array.from(tutorIds) })
      .andWhere('slot.isAvailable = true')
      .andWhere('slot.startDatetime > :now', { now: new Date() })
      .andWhere('period.isActive = true')
      .andWhere('period.bookingDeadline >= :now', { now: new Date() });

    // Excluir slots que tienen bookings activos
    if (excludedSlotIds.length > 0) {
      queryBuilder.andWhere('slot.id NOT IN (:...excludedSlotIds)', { excludedSlotIds });
    }

    queryBuilder.orderBy('slot.startDatetime', 'ASC');

    console.log('🔍 [getAvailableSlotsForFamily] Query ejecutada para tutorIds:', Array.from(tutorIds));

    if (filters?.periodId) {
      queryBuilder.andWhere('slot.periodId = :periodId', { periodId: filters.periodId });
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('slot.startDatetime >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('slot.startDatetime <= :endDate', { endDate: filters.endDate });
    }

    const slots = await queryBuilder.getMany();

    console.log('🔍 [getAvailableSlotsForFamily] Slots disponibles encontrados:', slots.length);
    console.log('🔍 [getAvailableSlotsForFamily] Expected tutorIds:', Array.from(tutorIds));

    slots.forEach((slot, index) => {
      console.log(`🔍 Slot ${index + 1}:`, {
        id: slot.id,
        startDatetime: slot.startDatetime,
        teacherId: slot.teacherId,
        teacherName: slot.teacher?.user?.profile ? `${slot.teacher.user.profile.firstName} ${slot.teacher.user.profile.lastName}` : slot.teacher?.user?.email,
        hasBookings: slot.bookings?.length || 0,
        bookingsStatuses: slot.bookings?.map(b => b.status) || [],
        isBookable: slot.isBookable(),
        matchesFilter: tutorIds.has(slot.teacherId) ? '✅ YES' : '❌ NO'
      });
    });

    console.log('🎯 [getAvailableSlotsForFamily] END - returning', slots.length, 'slots');
    return slots;
  }

  async bookSlot(bookingDto: BookMeetingSlotDto, familyUserId: string): Promise<MeetingBooking> {
    const family = await this.getFamilyByUserId(familyUserId);

    let familyStudent: any = null;
    let selectedStudentId: string;

    // Handle family-wide booking vs specific student booking
    if (bookingDto.studentId) {
      // Specific student booking - verify student belongs to family
      familyStudent = await this.familyStudentsRepository.findOne({
        where: { familyId: family.id, studentId: bookingDto.studentId },
        relations: ['student', 'student.classGroups', 'student.classGroups.tutor'],
      });

      if (!familyStudent) {
        throw new ForbiddenException('El estudiante no pertenece a esta familia');
      }
      selectedStudentId = bookingDto.studentId;
    } else {
      // Family-wide booking - find any student from the family that has the teacher as tutor
      const familyStudents = await this.familyStudentsRepository.find({
        where: { familyId: family.id },
        relations: ['student', 'student.classGroups', 'student.classGroups.tutor'],
      });

      if (familyStudents.length === 0) {
        throw new BadRequestException('No hay estudiantes asociados a esta familia');
      }

      // Use the first student for the booking (family-wide approach)
      familyStudent = familyStudents[0];
      selectedStudentId = familyStudent.studentId;
    }

    const slot = await this.meetingSlotsRepository.findOne({
      where: { id: bookingDto.slotId },
      relations: ['period', 'teacher', 'bookings'],
    });

    if (!slot) {
      throw new NotFoundException('Slot no encontrado');
    }

    // For family-wide bookings, we're more flexible with teacher verification
    // Verify that the teacher is a tutor of at least one student in the family
    if (bookingDto.studentId) {
      // Specific student - verify teacher is tutor of that specific student
      const isTutor = familyStudent.student.classGroups.some(
        classGroup => classGroup.tutor && classGroup.tutor.id === slot.teacher.id
      );

      if (!isTutor) {
        throw new ForbiddenException('El profesor no es tutor de este estudiante');
      }
    } else {
      // Family-wide - verify teacher is tutor of at least one student in the family
      const familyStudents = await this.familyStudentsRepository.find({
        where: { familyId: family.id },
        relations: ['student', 'student.classGroups', 'student.classGroups.tutor'],
      });

      const isTutorOfAnyStudent = familyStudents.some(fs =>
        fs.student.classGroups.some(
          classGroup => classGroup.tutor && classGroup.tutor.id === slot.teacher.id
        )
      );

      if (!isTutorOfAnyStudent) {
        throw new ForbiddenException('El profesor no es tutor de ningún estudiante de esta familia');
      }
    }

    // Check if slot is bookable
    if (!slot.isBookable()) {
      throw new BadRequestException('Este slot no está disponible para reserva');
    }

    // Check if this student already has a booking in this period
    // Due to database constraint UNIQUE (familyId, studentId, periodId), each student can only have one booking per period
    console.log('🔍 [bookSlot] Checking for existing student booking:', {
      familyId: family.id,
      studentId: selectedStudentId,
      periodId: slot.periodId,
      statuses: [MeetingBookingStatus.CONFIRMED, MeetingBookingStatus.PENDING]
    });

    const existingStudentBooking = await this.meetingBookingsRepository
      .createQueryBuilder('booking')
      .where('booking.familyId = :familyId', { familyId: family.id })
      .andWhere('booking.studentId = :studentId', { studentId: selectedStudentId })
      .andWhere('booking.periodId = :periodId', { periodId: slot.periodId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [MeetingBookingStatus.CONFIRMED, MeetingBookingStatus.PENDING]
      })
      .leftJoinAndSelect('booking.slot', 'slot')
      .leftJoinAndSelect('slot.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('booking.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .getOne();

    console.log('🔍 [bookSlot] Existing student booking found:', existingStudentBooking ? 'YES' : 'NO');
    if (existingStudentBooking) {
      console.log('🔍 [bookSlot] Existing booking details:', {
        id: existingStudentBooking.id,
        status: existingStudentBooking.status,
        studentId: existingStudentBooking.studentId,
        slotId: existingStudentBooking.slotId
      });
    }

    if (existingStudentBooking) {
      const studentName = existingStudentBooking.student?.user?.profile
        ? `${existingStudentBooking.student.user.profile.firstName} ${existingStudentBooking.student.user.profile.lastName}`
        : 'este estudiante';
      const teacherName = existingStudentBooking.slot?.teacher?.user?.profile
        ? `${existingStudentBooking.slot.teacher.user.profile.firstName} ${existingStudentBooking.slot.teacher.user.profile.lastName}`
        : 'un profesor';
      const bookingDate = existingStudentBooking.slot?.startDatetime
        ? new Date(existingStudentBooking.slot.startDatetime).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'fecha no disponible';
      throw new ConflictException(
        `${studentName} ya tiene una reunión reservada en este período con ${teacherName} el ${bookingDate}. ` +
        `Cada estudiante solo puede tener una reserva por período. Por favor, cancele la reserva existente si desea reservar otra fecha.`
      );
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Double-check slot availability within transaction
      const lockedSlot = await queryRunner.manager.findOne(MeetingSlot, {
        where: { id: bookingDto.slotId },
        lock: { mode: 'pessimistic_write' },
      });

      // Check if slot already has a CONFIRMED or PENDING booking
      const existingActiveBooking = await queryRunner.manager.findOne(MeetingBooking, {
        where: [
          { slotId: bookingDto.slotId, status: MeetingBookingStatus.CONFIRMED },
          { slotId: bookingDto.slotId, status: MeetingBookingStatus.PENDING }
        ],
      });

      if (existingActiveBooking) {
        throw new ConflictException('Este slot ya ha sido reservado');
      }

      // Create booking with PENDING status - teacher must confirm
      const booking = queryRunner.manager.create(MeetingBooking, {
        slotId: bookingDto.slotId,
        familyId: family.id,
        studentId: selectedStudentId, // Use the selected student ID (either specific or first family student)
        periodId: slot.periodId,
        notes: bookingDto.notes,
        status: MeetingBookingStatus.PENDING, // Changed from CONFIRMED - teacher must confirm
      });

      const savedBooking = await queryRunner.manager.save(booking);

      await queryRunner.commitTransaction();

      // Return booking with relations
      const bookingWithRelations = await this.meetingBookingsRepository.findOne({
        where: { id: savedBooking.id },
        relations: [
          'slot',
          'slot.period',
          'slot.teacher',
          'slot.teacher.user',
          'slot.teacher.user.profile',
          'family',
          'family.primaryContact',
          'family.primaryContact.profile',
          'student',
          'student.user',
          'student.user.profile',
        ],
      });

      // ✅ Crear evento de calendario automáticamente
      try {
        await this.createCalendarEventForMeeting(bookingWithRelations);
        console.log('📅 Evento de calendario creado para reunión:', bookingWithRelations.id);
      } catch (calendarError) {
        console.error('❌ Error al crear evento de calendario (no crítico):', calendarError);
        // No lanzamos error para no afectar la reserva exitosa
      }

      // ✅ Enviar notificación al profesor
      try {
        await this.notificationService.processEvent({
          type: 'meeting_booked',
          triggeredById: bookingWithRelations.family.primaryContact.id,
          data: {
            teacherUserId: bookingWithRelations.slot.teacher.user.id,
            teacherName: `${bookingWithRelations.slot.teacher.user.profile?.firstName || ''} ${bookingWithRelations.slot.teacher.user.profile?.lastName || ''}`.trim(),
            familyName: `${bookingWithRelations.family.primaryContact.profile?.firstName || ''} ${bookingWithRelations.family.primaryContact.profile?.lastName || ''}`.trim(),
            studentName: bookingWithRelations.student
              ? `${bookingWithRelations.student.user.profile?.firstName || ''} ${bookingWithRelations.student.user.profile?.lastName || ''}`.trim()
              : 'No especificado',
            meetingDate: bookingWithRelations.slot.startDatetime.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            meetingTime: bookingWithRelations.slot.getFormattedTimeSlot(),
            notes: bookingWithRelations.notes || 'Sin notas adicionales',
            resourceId: bookingWithRelations.id,
            resourceType: 'meeting_booking',
          },
          priority: EmailPriority.HIGH,
          immediate: true,
        });
        console.log('✉️ Notificación enviada al profesor:', bookingWithRelations.slot.teacher.user.email);
      } catch (notificationError) {
        console.error('❌ Error al enviar notificación (no crítico):', notificationError);
        // No lanzamos error para no afectar la reserva exitosa
      }

      return bookingWithRelations;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getFamilyBookings(familyUserId: string, filters?: MeetingFiltersDto): Promise<MeetingBooking[]> {
    console.log('🎯 Service getFamilyBookings called with familyUserId:', familyUserId);
    
    const family = await this.getFamilyByUserId(familyUserId);
    console.log('🎯 Found family:', family?.id);
    
    if (!family) {
      console.log('🚨 No family found for user:', familyUserId);
      return [];
    }

    const queryBuilder = this.meetingBookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.slot', 'slot')
      .leftJoinAndSelect('slot.period', 'period')
      .leftJoinAndSelect('slot.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('booking.family', 'family')
      .leftJoinAndSelect('family.primaryContact', 'primaryContact')
      .leftJoinAndSelect('primaryContact.profile', 'primaryProfile')
      .leftJoinAndSelect('booking.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .where('booking.familyId = :familyId', { familyId: family.id })
      .orderBy('slot.startDatetime', 'ASC');

    if (filters?.periodId) {
      queryBuilder.andWhere('booking.periodId = :periodId', { periodId: filters.periodId });
    }

    if (filters?.bookingStatus) {
      queryBuilder.andWhere('booking.status = :status', { status: filters.bookingStatus });
    }

    const bookings = await queryBuilder.getMany();
    console.log('🎯 Query returned bookings count:', bookings.length);
    
    // Debug each booking
    bookings.forEach((booking, index) => {
      console.log(`🎯 Booking ${index}:`, {
        id: booking.id,
        familyId: booking.familyId,
        hasFamily: !!booking.family,
        familyObjId: booking.family?.id,
        hasPrimaryContact: !!booking.family?.primaryContact
      });
    });

    return bookings;
  }

  async cancelBooking(bookingId: string, familyUserId: string, cancelDto?: CancelBookingDto): Promise<MeetingBooking> {
    const family = await this.getFamilyByUserId(familyUserId);

    const booking = await this.meetingBookingsRepository.findOne({
      where: { id: bookingId, familyId: family.id },
      relations: ['slot', 'slot.teacher', 'slot.teacher.user'],
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (!booking.isCancellable()) {
      throw new BadRequestException('Esta reserva no se puede cancelar');
    }

    booking.cancel(cancelDto?.reason);
    const savedBooking = await this.meetingBookingsRepository.save(booking);

    // Cancelar evento de calendario si existe
    if (savedBooking.calendarEventId && savedBooking.slot?.teacher?.user?.id) {
      try {
        await this.cancelCalendarEventForMeeting(
          savedBooking.calendarEventId,
          savedBooking.slot.teacher.user.id,
          cancelDto?.reason
        );
        console.log('📅 Evento de calendario cancelado para reunión:', savedBooking.id);
      } catch (calendarError) {
        console.error('❌ Error al cancelar evento de calendario (no crítico):', calendarError);
        // No lanzamos error para no afectar la cancelación exitosa
      }
    }

    // Reload booking with all necessary relations for the response
    return this.meetingBookingsRepository.findOne({
      where: { id: bookingId },
      relations: [
        'slot',
        'slot.period',
        'slot.teacher',
        'slot.teacher.user',
        'slot.teacher.user.profile',
        'family',
        'family.primaryContact',
        'family.primaryContact.profile',
        'student',
        'student.user',
        'student.user.profile',
      ],
    });
  }

  /**
   * Obtener una reserva específica por ID
   * Incluye todas las relaciones necesarias
   */
  async getBookingById(bookingId: string): Promise<MeetingBooking> {
    const booking = await this.meetingBookingsRepository.findOne({
      where: { id: bookingId },
      relations: [
        'slot',
        'slot.period',
        'slot.teacher',
        'slot.teacher.user',
        'slot.teacher.user.profile',
        'family',
        'family.primaryContact',
        'family.primaryContact.profile',
        'student',
        'student.user',
        'student.user.profile',
        'space',
      ],
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return booking;
  }

  /**
   * Obtener todas las reservas de los slots de un profesor
   * Incluye confirmadas y canceladas
   * Por defecto solo muestra futuras, usar showPast=true para ver pasadas
   */
  async getTeacherBookings(teacherUserId: string, filters?: MeetingFiltersDto): Promise<MeetingBooking[]> {
    console.log('🎯 Service getTeacherBookings called with teacherUserId:', teacherUserId);
    console.log('🎯 Filters received:', JSON.stringify(filters));
    console.log('🎯 filters.showPast value:', filters?.showPast, 'type:', typeof filters?.showPast);
    console.log('🎯 filters.showPast === true?', filters?.showPast === true);

    const teacher = await this.getTeacherByUserId(teacherUserId);
    console.log('🎯 Found teacher:', teacher?.id);

    const queryBuilder = this.meetingBookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.slot', 'slot')
      .leftJoinAndSelect('slot.period', 'period')
      .leftJoinAndSelect('slot.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('booking.family', 'family')
      .leftJoinAndSelect('family.primaryContact', 'primaryContact')
      .leftJoinAndSelect('primaryContact.profile', 'primaryProfile')
      .leftJoinAndSelect('booking.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .where('teacher.id = :teacherId', { teacherId: teacher.id });

    // Filtrar por período
    if (filters?.periodId) {
      queryBuilder.andWhere('booking.periodId = :periodId', { periodId: filters.periodId });
    }

    // Filtrar por estado
    if (filters?.bookingStatus) {
      queryBuilder.andWhere('booking.status = :status', { status: filters.bookingStatus });
    }

    // Filtrar por reuniones futuras o pasadas
    // IMPORTANTE: Si showPast no está definido (undefined), devolvemos TODAS las reservas
    // para que el frontend pueda filtrarlas en la UI (tabs de próximas/pasadas)
    const now = new Date();
    console.log('📅 Current time:', now.toISOString());
    console.log('📅 showPast value:', filters?.showPast, 'type:', typeof filters?.showPast);

    if (filters?.showPast === true) {
      console.log('🔙 FILTERING FOR PAST MEETINGS (startDatetime < now)');
      // Solo mostrar reuniones pasadas (archivadas)
      queryBuilder.andWhere('slot.startDatetime < :now', { now });
      // Ordenar las pasadas de más cercana a más lejana (ASC = soonest first)
      queryBuilder.orderBy('slot.startDatetime', 'ASC');
    } else if (filters?.showPast === false) {
      console.log('⏭️ FILTERING FOR UPCOMING MEETINGS (startDatetime >= now)');
      // Explícitamente solo mostrar reuniones futuras
      queryBuilder.andWhere('slot.startDatetime >= :now', { now });
      // Ordenar las futuras de más cercana a más lejana (ASC = soonest first)
      queryBuilder.orderBy('slot.startDatetime', 'ASC');
    } else {
      console.log('📋 NO TIME FILTER - Returning ALL bookings (past and upcoming)');
      // Si showPast no está definido, devolver TODAS las reservas
      // El frontend las filtrará en la UI para las tabs de próximas/pasadas
      queryBuilder.orderBy('slot.startDatetime', 'DESC');
    }

    // Log the SQL query for debugging
    const sql = queryBuilder.getSql();
    console.log('📝 SQL Query:', sql);

    const bookings = await queryBuilder.getMany();

    console.log(`📊 Found ${bookings.length} bookings for teacher ${teacher.id}`);
    if (bookings.length > 0) {
      console.log('📋 Sample bookings:', bookings.slice(0, 3).map(b => ({
        id: b.id,
        date: b.slot?.startDatetime,
        status: b.status
      })));
    }

    return bookings;
  }

  /**
   * Obtener historial de reuniones entre un profesor y una familia específica
   * Incluye todas las reservas (pasadas, pendientes, confirmadas, canceladas)
   */
  async getFamilyMeetingsHistoryForTeacher(familyId: string, teacherUserId: string): Promise<{
    family: {
      id: string;
      primaryContact: {
        id: string;
        email: string;
        profile?: {
          firstName: string;
          lastName: string;
        };
      };
      secondaryContact?: {
        id: string;
        email: string;
        profile?: {
          firstName: string;
          lastName: string;
        };
      };
    };
    bookings: Array<{
      id: string;
      status: string;
      notes: string | null;
      cancelReason: string | null;
      spaceId: string | null;
      createdAt: string;
      slot: {
        id: string;
        startDatetime: string;
        durationMinutes: number;
      };
      student: {
        id: string;
        enrollmentNumber: string;
        user: {
          id: string;
          email: string;
          profile?: {
            firstName: string;
            lastName: string;
          };
        };
      };
    }>;
    stats: {
      total: number;
      confirmed: number;
      cancelled: number;
      pending: number;
      completed: number;
    };
  }> {
    console.log('🔍 [Service] getFamilyMeetingsHistoryForTeacher called with:', { familyId, teacherUserId });

    // Obtener el teacher
    const teacher = await this.getTeacherByUserId(teacherUserId);
    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // Obtener la familia con sus contactos
    const family = await this.familiesRepository.findOne({
      where: { id: familyId },
      relations: [
        'primaryContact',
        'primaryContact.profile',
        'secondaryContact',
        'secondaryContact.profile',
      ],
    });

    if (!family) {
      throw new NotFoundException('Familia no encontrada');
    }

    // Obtener todas las reservas entre este profesor y esta familia
    const bookings = await this.meetingBookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.slot', 'slot')
      .leftJoinAndSelect('slot.period', 'period')
      .leftJoinAndSelect('booking.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .where('booking.familyId = :familyId', { familyId })
      .andWhere('slot.teacherId = :teacherId', { teacherId: teacher.id })
      .orderBy('slot.startDatetime', 'DESC')
      .getMany();

    console.log(`📊 Found ${bookings.length} bookings between teacher ${teacher.id} and family ${familyId}`);

    // Calcular estadísticas
    const now = new Date();
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      completed: bookings.filter(b =>
        b.status === 'confirmed' && new Date(b.slot.startDatetime) < now
      ).length,
    };

    return {
      family: {
        id: family.id,
        primaryContact: {
          id: family.primaryContact.id,
          email: family.primaryContact.email,
          profile: family.primaryContact.profile ? {
            firstName: family.primaryContact.profile.firstName,
            lastName: family.primaryContact.profile.lastName,
          } : undefined,
        },
        secondaryContact: family.secondaryContact ? {
          id: family.secondaryContact.id,
          email: family.secondaryContact.email,
          profile: family.secondaryContact.profile ? {
            firstName: family.secondaryContact.profile.firstName,
            lastName: family.secondaryContact.profile.lastName,
          } : undefined,
        } : undefined,
      },
      bookings: bookings.map(booking => ({
        id: booking.id,
        status: booking.status,
        notes: booking.notes,
        cancelReason: booking.cancelReason,
        spaceId: booking.spaceId,
        createdAt: booking.createdAt.toISOString(),
        slot: {
          id: booking.slot.id,
          startDatetime: booking.slot.startDatetime.toISOString(),
          durationMinutes: booking.slot.durationMinutes,
        },
        student: {
          id: booking.student.id,
          enrollmentNumber: booking.student.enrollmentNumber,
          user: {
            id: booking.student.user.id,
            email: booking.student.user.email,
            profile: booking.student.user.profile ? {
              firstName: booking.student.user.profile.firstName,
              lastName: booking.student.user.profile.lastName,
            } : undefined,
          },
        },
      })),
      stats,
    };
  }

  /**
   * Cancelar una reserva por ID (sin validación de familia)
   * Este método es usado cuando el profesor cancela una reserva
   * La validación de permisos debe hacerse en el controller
   */
  async cancelBookingById(bookingId: string, cancelDto?: CancelBookingDto): Promise<MeetingBooking> {
    const booking = await this.meetingBookingsRepository.findOne({
      where: { id: bookingId },
      relations: ['slot', 'slot.teacher', 'slot.teacher.user'],
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // No validamos isCancellable() porque el profesor puede cancelar en cualquier momento
    booking.cancel(cancelDto?.reason);
    const savedBooking = await this.meetingBookingsRepository.save(booking);

    // Cancelar evento de calendario si existe
    if (savedBooking.calendarEventId && savedBooking.slot?.teacher?.user?.id) {
      try {
        await this.cancelCalendarEventForMeeting(
          savedBooking.calendarEventId,
          savedBooking.slot.teacher.user.id,
          cancelDto?.reason
        );
        console.log('📅 Evento de calendario cancelado para reunión:', savedBooking.id);
      } catch (calendarError) {
        console.error('❌ Error al cancelar evento de calendario (no crítico):', calendarError);
      }
    }

    // Reload booking with all necessary relations for the response
    return this.meetingBookingsRepository.findOne({
      where: { id: bookingId },
      relations: [
        'slot',
        'slot.period',
        'slot.teacher',
        'slot.teacher.user',
        'slot.teacher.user.profile',
        'family',
        'family.primaryContact',
        'family.primaryContact.profile',
        'student',
        'student.user',
        'student.user.profile',
      ],
    });
  }

  // HELPER METHODS
  private async getTeacherByUserId(userId: string): Promise<Teacher> {
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    return teacher;
  }

  async getFamilyStudents(familyId: string): Promise<Student[]> {
    console.log('🔍 getFamilyStudents called with familyId:', familyId);

    // Find the family by familyId (which is the user ID of either primary or secondary contact)
    const family = await this.familiesRepository
      .createQueryBuilder('family')
      .leftJoinAndSelect('family.primaryContact', 'primaryContact')
      .leftJoinAndSelect('family.secondaryContact', 'secondaryContact')
      .where('family.primaryContactId = :familyId', { familyId })
      .orWhere('family.secondaryContactId = :familyId', { familyId })
      .getOne();

    console.log('👨‍👩‍👧‍👦 Family found:', family ? family.id : 'NOT FOUND');
    if (family) {
      console.log('👨‍👩‍👧‍👦 User is:',
        family.primaryContactId === familyId ? 'PRIMARY CONTACT' : 'SECONDARY CONTACT'
      );
    }

    if (!family) {
      throw new NotFoundException('Familia no encontrada');
    }

    // Get the students associated with this family
    const familyStudents = await this.familyStudentsRepository.find({
      where: { familyId: family.id },
      relations: [
        'student',
        'student.user',
        'student.user.profile',
      ],
    });

    console.log('👦👧 Family students found:', familyStudents.length);
    console.log('👦👧 Students details:', familyStudents.map(fs => ({ 
      id: fs.student?.id, 
      email: fs.student?.user?.email,
      enrollmentNumber: fs.student?.enrollmentNumber 
    })));

    // Return the students with their tutor information (simplified for now)
    return familyStudents.map(fs => ({
      ...fs.student,
      tutors: [], // Simplified for debugging
    }));
  }

  private async getFamilyByUserId(userId: string): Promise<Family> {
    console.log('🔍 getFamilyByUserId - Looking for family with primaryContactId or secondaryContactId:', userId);

    // Buscar familia donde el usuario sea contacto primario O secundario
    const family = await this.familiesRepository
      .createQueryBuilder('family')
      .leftJoinAndSelect('family.primaryContact', 'primaryContact')
      .leftJoinAndSelect('family.secondaryContact', 'secondaryContact')
      .where('family.primaryContactId = :userId', { userId })
      .orWhere('family.secondaryContactId = :userId', { userId })
      .getOne();

    console.log('🔍 getFamilyByUserId - Found family:', family ? family.id : 'NULL');
    if (family) {
      console.log('🔍 getFamilyByUserId - User is:',
        family.primaryContactId === userId ? 'PRIMARY CONTACT' : 'SECONDARY CONTACT'
      );
    }

    if (!family) {
      throw new NotFoundException('Familia no encontrada');
    }

    return family;
  }

  private async checkForConflictingSlots(
    teacherId: string, 
    startDatetime: Date, 
    duration: number, 
    queryRunner?: QueryRunner
  ): Promise<void> {
    const endDatetime = new Date(startDatetime);
    endDatetime.setMinutes(endDatetime.getMinutes() + duration);

    const repository = queryRunner 
      ? queryRunner.manager.getRepository(MeetingSlot)
      : this.meetingSlotsRepository;

    const conflictingSlot = await repository
      .createQueryBuilder('slot')
      .where('slot.teacherId = :teacherId', { teacherId })
      .andWhere('slot.isAvailable = true')
      .andWhere(
        '(slot.startDatetime < :endDatetime AND (slot.startDatetime + (slot.durationMinutes * interval \'1 minute\')) > :startDatetime)',
        { startDatetime, endDatetime }
      )
      .getOne();

    if (conflictingSlot) {
      throw new ConflictException('Ya existe un slot en ese horario');
    }
  }

  /**
   * ✅ Crea un evento de calendario automáticamente cuando se confirma una reunión
   * El evento aparecerá en el calendario del profesor y de administradores
   */
  private async createCalendarEventForMeeting(booking: MeetingBooking): Promise<void> {
    console.log('📅 Creating calendar event for meeting:', booking.id);

    // Obtener nombre de la familia
    const familyName = booking.family?.primaryContact?.profile
      ? `${booking.family.primaryContact.profile.firstName} ${booking.family.primaryContact.profile.lastName}`
      : 'Familia';

    // Obtener nombre del estudiante si existe
    const studentName = booking.student?.user?.profile
      ? `${booking.student.user.profile.firstName} ${booking.student.user.profile.lastName}`
      : null;

    // Construir título del evento
    const title = studentName
      ? `Reunión con ${familyName} (${studentName})`
      : `Reunión con ${familyName}`;

    // Construir descripción del evento
    const description = [
      `Reunión programada con ${familyName}`,
      studentName ? `Estudiante: ${studentName}` : null,
      booking.notes ? `Notas: ${booking.notes}` : null,
      `Periodo: ${booking.slot.period.name}`,
      `Reserva ID: ${booking.id}`,
    ].filter(Boolean).join('\n');

    // Calcular fechas de inicio y fin
    const startDate = new Date(booking.slot.startDatetime);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + booking.slot.durationMinutes);

    console.log('📅 Event details:', {
      title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      teacherId: booking.slot.teacher.user.id,
    });

    // Crear evento en el calendario
    try {
      const calendarEvent = await this.calendarService.create(
        {
          title,
          description,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          type: CalendarEventType.MEETING,
          visibility: CalendarEventVisibility.TEACHERS_ONLY, // Visible para profesores y admins
          color: '#10b981', // Verde para reuniones
          isAllDay: false,
          location: 'Por determinar', // Puede ser actualizado después
          priority: 2, // Prioridad alta
          autoNotify: true, // Notificaciones automáticas
          notifyBefore: 60, // Notificar 1 hora antes
          tags: ['reunion', 'familia', booking.slot.period.name],
        },
        booking.slot.teacher.user.id, // El profesor es el creador del evento
      );

      // Guardar el ID del evento de calendario en el booking
      await this.meetingBookingsRepository.update(booking.id, {
        calendarEventId: calendarEvent.id,
      });

      console.log('✅ Calendar event created successfully for meeting:', booking.id, 'Event ID:', calendarEvent.id);
    } catch (error) {
      console.error('❌ Failed to create calendar event:', error);
      throw error;
    }
  }

  /**
   * Cancela el evento de calendario asociado a una reunión
   * Hace soft delete del evento para mantener el historial
   */
  private async cancelCalendarEventForMeeting(
    calendarEventId: string,
    teacherUserId: string,
    cancelReason?: string,
  ): Promise<void> {
    try {
      console.log('📅 Intentando cancelar evento de calendario:', calendarEventId, 'Teacher ID:', teacherUserId);

      // Obtener el evento para verificar que existe
      const event = await this.calendarService.findOne(
        calendarEventId,
        teacherUserId, // ✅ Usar el userId del profesor
      );

      if (!event) {
        console.warn('⚠️ Evento de calendario no encontrado:', calendarEventId);
        return;
      }

      console.log('📅 Evento encontrado, actualizando título y descripción...');

      // Actualizar el evento con información de cancelación
      await this.calendarService.update(
        calendarEventId,
        {
          title: `[CANCELADA] ${event.title}`,
          description: cancelReason
            ? `${event.description}\n\n❌ CANCELADA: ${cancelReason}`
            : `${event.description}\n\n❌ Reunión cancelada`,
          color: '#ef4444', // Rojo para indicar cancelación
        },
        event.createdById,
      );

      console.log('📅 Evento actualizado, haciendo soft delete...');

      // Hacer soft delete del evento
      await this.calendarService.remove(calendarEventId, event.createdById);

      console.log('✅ Evento de calendario cancelado exitosamente:', calendarEventId);
    } catch (error) {
      console.error('❌ Error al cancelar evento de calendario:', error);
      console.error('Error details:', error.message, error.stack);
      // No lanzamos el error para que la cancelación de la reserva no falle
      // Solo logueamos el error
    }
  }

  /**
   * Obtener estadísticas completas de un período de reuniones
   * Incluye slots, reservas, profesores y familias
   */
  async getPeriodStatistics(periodId: string): Promise<{
    totalSlots: number;
    availableSlots: number;
    bookedSlots: number;
    uniqueTeachers: number;
    uniqueFamilies: number;
    slotsByTeacher: Array<{
      teacherId: string;
      teacherName: string;
      teacherEmail: string;
      totalSlots: number;
      availableSlots: number;
      bookedSlots: number;
    }>;
    recentBookings: Array<{
      id: string;
      familyName: string;
      studentName: string;
      teacherName: string;
      slotDate: Date;
      status: string;
      bookedAt: Date;
    }>;
  }> {
    console.log('📊 Calculating statistics for period:', periodId);

    // Verificar que el período existe
    const period = await this.meetingPeriodsRepository.findOne({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Período no encontrado');
    }

    // 1. Contar slots totales del período
    const totalSlots = await this.meetingSlotsRepository.count({
      where: { periodId },
    });

    // 2. Contar slots disponibles
    const availableSlots = await this.meetingSlotsRepository.count({
      where: { periodId, isAvailable: true },
    });

    // 3. Contar slots reservados (bookings confirmados)
    const bookedSlots = await this.meetingBookingsRepository.count({
      where: {
        periodId,
        status: MeetingBookingStatus.CONFIRMED,
      },
    });

    // 4. Contar profesores únicos que tienen slots en este período
    const uniqueTeachersResult = await this.meetingSlotsRepository
      .createQueryBuilder('slot')
      .select('COUNT(DISTINCT slot.teacherId)', 'count')
      .where('slot.periodId = :periodId', { periodId })
      .getRawOne();
    const uniqueTeachers = parseInt(uniqueTeachersResult?.count || '0', 10);

    // 5. Contar familias únicas con reservas confirmadas
    const uniqueFamiliesResult = await this.meetingBookingsRepository
      .createQueryBuilder('booking')
      .select('COUNT(DISTINCT booking.familyId)', 'count')
      .where('booking.periodId = :periodId', { periodId })
      .andWhere('booking.status = :status', { status: MeetingBookingStatus.CONFIRMED })
      .getRawOne();
    const uniqueFamilies = parseInt(uniqueFamiliesResult?.count || '0', 10);

    // 6. Estadísticas por profesor
    const slotsByTeacherRaw = await this.meetingSlotsRepository
      .createQueryBuilder('slot')
      .leftJoin('slot.teacher', 'teacher')
      .leftJoin('teacher.user', 'user')
      .leftJoin('user.profile', 'profile')
      .leftJoin('meeting_bookings', 'booking', 'booking.slotId = slot.id AND booking.status = :status', {
        status: MeetingBookingStatus.CONFIRMED,
      })
      .select('teacher.id', 'teacherId')
      .addSelect('user.email', 'teacherEmail')
      .addSelect("CONCAT(profile.firstName, ' ', profile.lastName)", 'teacherName')
      .addSelect('COUNT(slot.id)', 'totalSlots')
      .addSelect('SUM(CASE WHEN slot.isAvailable = true THEN 1 ELSE 0 END)', 'availableSlots')
      .addSelect('COUNT(booking.id)', 'bookedSlots')
      .where('slot.periodId = :periodId', { periodId })
      .groupBy('teacher.id')
      .addGroupBy('user.email')
      .addGroupBy('profile.firstName')
      .addGroupBy('profile.lastName')
      .getRawMany();

    const slotsByTeacher = slotsByTeacherRaw.map((raw) => ({
      teacherId: raw.teacherId,
      teacherName: raw.teacherName || 'Sin nombre',
      teacherEmail: raw.teacherEmail || '',
      totalSlots: parseInt(raw.totalSlots, 10),
      availableSlots: parseInt(raw.availableSlots || '0', 10),
      bookedSlots: parseInt(raw.bookedSlots || '0', 10),
    }));

    // 7. Últimas reservas recientes (últimas 10)
    const recentBookingsRaw = await this.meetingBookingsRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.slot', 'slot')
      .leftJoin('slot.teacher', 'teacher')
      .leftJoin('teacher.user', 'teacherUser')
      .leftJoin('teacherUser.profile', 'teacherProfile')
      .leftJoin('booking.family', 'family')
      .leftJoin('family.primaryContact', 'familyUser')
      .leftJoin('familyUser.profile', 'familyProfile')
      .leftJoin('booking.student', 'student')
      .leftJoin('student.user', 'studentUser')
      .leftJoin('studentUser.profile', 'studentProfile')
      .select('booking.id', 'id')
      .addSelect('booking.status', 'status')
      .addSelect('booking.bookingDate', 'bookedAt')
      .addSelect('slot.startDatetime', 'slotDate')
      .addSelect("CONCAT(familyProfile.firstName, ' ', familyProfile.lastName)", 'familyName')
      .addSelect("CONCAT(studentProfile.firstName, ' ', studentProfile.lastName)", 'studentName')
      .addSelect("CONCAT(teacherProfile.firstName, ' ', teacherProfile.lastName)", 'teacherName')
      .where('booking.periodId = :periodId', { periodId })
      .orderBy('booking.bookingDate', 'DESC')
      .limit(10)
      .getRawMany();

    const recentBookings = recentBookingsRaw.map((raw) => ({
      id: raw.id,
      familyName: raw.familyName || 'Sin nombre',
      studentName: raw.studentName || 'No especificado',
      teacherName: raw.teacherName || 'Sin nombre',
      slotDate: new Date(raw.slotDate),
      status: raw.status,
      bookedAt: new Date(raw.bookedAt),
    }));

    console.log('📊 Statistics calculated:', {
      totalSlots,
      availableSlots,
      bookedSlots,
      uniqueTeachers,
      uniqueFamilies,
      teachersWithSlots: slotsByTeacher.length,
    });

    return {
      totalSlots,
      availableSlots,
      bookedSlots,
      uniqueTeachers,
      uniqueFamilies,
      slotsByTeacher,
      recentBookings,
    };
  }

  /**
   * Obtener slots en formato calendario para vista de admin
   * Devuelve todos los slots del período con información completa para renderizar calendario
   */
  async getPeriodCalendarSlots(periodId: string): Promise<Array<{
    id: string;
    startDatetime: Date;
    endDatetime: Date;
    durationMinutes: number;
    isAvailable: boolean;
    teacher: {
      id: string;
      name: string;
      email: string;
    };
    booking?: {
      id: string;
      familyName: string;
      studentName: string;
      status: string;
      bookedAt: Date;
      notes?: string;
    };
  }>> {
    console.log('📅 Obteniendo slots en formato calendario para período:', periodId);

    // Obtener todos los slots con sus relaciones usando QueryBuilder con leftJoinAndSelect
    const slots = await this.meetingSlotsRepository
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('slot.bookings', 'booking')
      .leftJoinAndSelect('booking.family', 'family')
      .leftJoinAndSelect('family.primaryContact', 'familyUser')
      .leftJoinAndSelect('familyUser.profile', 'familyProfile')
      .leftJoinAndSelect('booking.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .leftJoinAndSelect('booking.space', 'space')
      .where('slot.periodId = :periodId', { periodId })
      .orderBy('slot.startDatetime', 'ASC')
      .getMany();

    console.log(`🔍 Total slots cargados: ${slots.length}`);
    const slotsWithBookings = slots.filter(s => s.bookings && s.bookings.length > 0);
    console.log(`🔍 Slots con bookings: ${slotsWithBookings.length}`);
    if (slotsWithBookings.length > 0) {
      const firstSlotWithBooking = slotsWithBookings[0];
      console.log('🔍 Primer slot con bookings:', {
        slotId: firstSlotWithBooking.id,
        bookingsCount: firstSlotWithBooking.bookings.length,
        firstBooking: firstSlotWithBooking.bookings[0] ? {
          id: firstSlotWithBooking.bookings[0].id,
          status: firstSlotWithBooking.bookings[0].status,
          familyId: firstSlotWithBooking.bookings[0].familyId,
          hasFamily: !!firstSlotWithBooking.bookings[0].family,
          hasFamilyContact: !!firstSlotWithBooking.bookings[0].family?.primaryContact,
          hasFamilyProfile: !!firstSlotWithBooking.bookings[0].family?.primaryContact?.profile,
        } : 'null',
      });
    }

    const calendarSlots = slots.map((slot) => {
      const endDatetime = new Date(slot.startDatetime);
      endDatetime.setMinutes(endDatetime.getMinutes() + slot.durationMinutes);

      // Filtrar solo bookings confirmados
      const confirmedBooking = slot.bookings?.find(
        (b) => b.status === MeetingBookingStatus.CONFIRMED,
      );

      // Log para debugging
      if (confirmedBooking) {
        console.log('📝 Booking encontrado:', {
          bookingId: confirmedBooking.id,
          familyId: confirmedBooking.familyId,
          studentId: confirmedBooking.studentId,
          hasFamily: !!confirmedBooking.family,
          hasFamilyContact: !!confirmedBooking.family?.primaryContact,
          hasFamilyProfile: !!confirmedBooking.family?.primaryContact?.profile,
          hasStudent: !!confirmedBooking.student,
          hasStudentUser: !!confirmedBooking.student?.user,
          hasStudentProfile: !!confirmedBooking.student?.user?.profile,
        });
      }

      const booking = confirmedBooking;

      return {
        id: slot.id,
        startDatetime: slot.startDatetime,
        endDatetime,
        durationMinutes: slot.durationMinutes,
        isAvailable: slot.isAvailable,
        teacher: {
          id: slot.teacher.id,
          name: slot.teacher.user?.profile
            ? `${slot.teacher.user.profile.firstName} ${slot.teacher.user.profile.lastName}`
            : 'Sin nombre',
          email: slot.teacher.user?.email || '',
        },
        booking: booking
          ? {
              id: booking.id,
              familyName: booking.family?.primaryContact?.profile
                ? `${booking.family.primaryContact.profile.firstName} ${booking.family.primaryContact.profile.lastName}`
                : 'Sin nombre',
              studentName: booking.student?.user?.profile
                ? `${booking.student.user.profile.firstName} ${booking.student.user.profile.lastName}`
                : 'No especificado',
              spaceName: booking.space?.name || null,
              spaceLocation: booking.space?.location || null,
              spaceColor: booking.space?.color || null,
              status: booking.status,
              bookedAt: booking.bookingDate,
              notes: booking.notes,
            }
          : undefined,
      };
    });

    console.log(`✅ Devolviendo ${calendarSlots.length} slots para calendario`);
    return calendarSlots;
  }

  // MEETING SPACES METHODS
  async createSpace(createDto: CreateMeetingSpaceDto): Promise<MeetingSpace> {
    const space = this.meetingSpacesRepository.create(createDto);
    return await this.meetingSpacesRepository.save(space);
  }

  async getAllSpaces(): Promise<MeetingSpace[]> {
    return await this.meetingSpacesRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getActiveSpaces(): Promise<MeetingSpace[]> {
    return await this.meetingSpacesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getSpaceById(id: string): Promise<MeetingSpace> {
    const space = await this.meetingSpacesRepository.findOne({
      where: { id },
    });

    if (!space) {
      throw new NotFoundException('Espacio no encontrado');
    }

    return space;
  }

  async updateSpace(id: string, updateDto: UpdateMeetingSpaceDto): Promise<MeetingSpace> {
    const space = await this.getSpaceById(id);

    Object.assign(space, updateDto);

    return await this.meetingSpacesRepository.save(space);
  }

  async deleteSpace(id: string): Promise<void> {
    const space = await this.getSpaceById(id);

    // Verificar que no hay reservas futuras usando este espacio
    const futureBookings = await this.meetingBookingsRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.slot', 'slot')
      .where('booking.spaceId = :spaceId', { spaceId: id })
      .andWhere('slot.startDatetime > :now', { now: new Date() })
      .andWhere('booking.status = :status', { status: MeetingBookingStatus.CONFIRMED })
      .getCount();

    if (futureBookings > 0) {
      throw new BadRequestException(
        `No se puede eliminar el espacio porque tiene ${futureBookings} reunión(es) programada(s)`,
      );
    }

    await this.meetingSpacesRepository.remove(space);
  }

  async checkSpaceAvailability(
    spaceId: string,
    startDatetime: Date,
    durationMinutes: number,
  ): Promise<SpaceAvailabilityResponseDto> {
    // Verificar que el espacio existe
    await this.getSpaceById(spaceId);

    // Calcular la hora de fin
    const endDatetime = new Date(startDatetime);
    endDatetime.setMinutes(endDatetime.getMinutes() + durationMinutes);

    // Buscar reservas conflictivas
    const conflictingBooking = await this.meetingBookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.slot', 'slot')
      .leftJoinAndSelect('booking.space', 'space')
      .leftJoinAndSelect('slot.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('booking.family', 'family')
      .leftJoinAndSelect('family.primaryContact', 'familyUser')
      .leftJoinAndSelect('familyUser.profile', 'familyProfile')
      .where('booking.spaceId = :spaceId', { spaceId })
      .andWhere('booking.status = :status', { status: MeetingBookingStatus.CONFIRMED })
      .andWhere(
        '("slot"."startDatetime" < :endTime AND ' +
        '("slot"."startDatetime" + ("slot"."durationMinutes" || \' minutes\')::INTERVAL) > :startTime)',
        {
          startTime: startDatetime,
          endTime: endDatetime,
        },
      )
      .getOne();

    if (conflictingBooking) {
      const slotEndTime = new Date(conflictingBooking.slot.startDatetime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + conflictingBooking.slot.durationMinutes);

      return {
        isAvailable: false,
        conflictingBooking: {
          id: conflictingBooking.id,
          teacherName: conflictingBooking.slot.teacher.user?.profile
            ? `${conflictingBooking.slot.teacher.user.profile.firstName} ${conflictingBooking.slot.teacher.user.profile.lastName}`
            : 'Sin nombre',
          familyName: conflictingBooking.family?.primaryContact?.profile
            ? `${conflictingBooking.family.primaryContact.profile.firstName} ${conflictingBooking.family.primaryContact.profile.lastName}`
            : 'Sin nombre',
          startTime: conflictingBooking.slot.startDatetime.toISOString(),
          endTime: slotEndTime.toISOString(),
        },
      };
    }

    return {
      isAvailable: true,
    };
  }

  // ADMIN BOOKING MANAGEMENT
  async updateBooking(bookingId: string, updateDto: UpdateBookingDto): Promise<MeetingBooking> {
    try {
      console.log('🔍 updateBooking called with:', { bookingId, updateDto });

      const booking = await this.meetingBookingsRepository.findOne({
        where: { id: bookingId },
        relations: ['slot', 'space', 'family', 'student'],
      });

      if (!booking) {
        throw new NotFoundException('Reserva no encontrada');
      }

      console.log('📝 Current booking state:', {
        id: booking.id,
        currentSpaceId: booking.spaceId,
        newSpaceId: updateDto.spaceId
      });

      // Si se está cambiando el espacio, validar disponibilidad
      if (updateDto.spaceId && updateDto.spaceId !== booking.spaceId) {
        const availability = await this.checkSpaceAvailability(
          updateDto.spaceId,
          booking.slot.startDatetime,
          booking.slot.durationMinutes,
        );

        if (!availability.isAvailable) {
          throw new ConflictException(
            `El espacio seleccionado no está disponible en ese horario. ` +
            `Conflicto con reunión de ${availability.conflictingBooking.teacherName} con ${availability.conflictingBooking.familyName}`,
          );
        }

        booking.spaceId = updateDto.spaceId;
      }

      // Actualizar otros campos
      if (updateDto.notes !== undefined) {
        booking.notes = updateDto.notes;
      }

      if (updateDto.status) {
        booking.status = updateDto.status;
        if (updateDto.status === MeetingBookingStatus.CANCELLED) {
          booking.cancelledAt = new Date();
          booking.cancelReason = updateDto.cancelReason || 'Cancelado por administrador';
        }
      }

      console.log('💾 Saving booking with updates...');
      const updatedBooking = await this.meetingBookingsRepository.save(booking);
      console.log('✅ Booking saved successfully');

      // Recargar con todas las relaciones para la respuesta
      console.log('📚 Reloading booking with all relations...');
      const result = await this.meetingBookingsRepository.findOne({
        where: { id: updatedBooking.id },
        relations: [
          'slot',
          'slot.teacher',
          'slot.teacher.user',
          'slot.teacher.user.profile',
          'family',
          'family.primaryContact',
          'family.primaryContact.profile',
          'student',
          'student.user',
          'student.user.profile',
          'space',
        ],
      });
      console.log('✅ Booking reloaded with relations');
      return result;
    } catch (error) {
      console.error('❌ Error in updateBooking:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  // TEACHER BOOKING MANAGEMENT

  /**
   * Obtener espacios disponibles para una fecha/hora específica
   */
  async getAvailableSpaces(startDatetime: Date, durationMinutes: number) {
    // Obtener todos los espacios activos
    const allSpaces = await this.meetingSpacesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    // Verificar disponibilidad de cada espacio
    const spacesWithAvailability = await Promise.all(
      allSpaces.map(async (space) => {
        const availability = await this.checkSpaceAvailability(
          space.id,
          startDatetime,
          durationMinutes,
        );

        return {
          id: space.id,
          name: space.name,
          type: space.type,
          location: space.location,
          capacity: space.capacity,
          color: space.color,
          isAvailable: availability.isAvailable,
          conflictingBooking: availability.conflictingBooking,
        };
      }),
    );

    return spacesWithAvailability;
  }

  /**
   * Confirmar una reserva por el profesor y opcionalmente asignar espacio
   */
  async confirmBookingByTeacher(
    bookingId: string,
    teacherId: string,
    spaceId?: string,
    notes?: string,
  ): Promise<MeetingBooking> {
    const booking = await this.meetingBookingsRepository.findOne({
      where: { id: bookingId },
      relations: ['slot', 'slot.teacher', 'slot.teacher.user', 'space'],
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Verificar que el profesor es el dueño del slot
    if (booking.slot.teacher.user.id !== teacherId) {
      throw new ForbiddenException('No tienes permisos para confirmar esta reserva');
    }

    // Verificar que la reserva está pendiente
    if (booking.status !== MeetingBookingStatus.PENDING) {
      throw new BadRequestException('Esta reserva ya ha sido procesada');
    }

    // El espacio es OBLIGATORIO al confirmar
    if (!spaceId) {
      throw new BadRequestException('Debes asignar un espacio para confirmar la reserva');
    }

    // Validar disponibilidad del espacio
    const availability = await this.checkSpaceAvailability(
      spaceId,
      booking.slot.startDatetime,
      booking.slot.durationMinutes,
    );

    if (!availability.isAvailable) {
      throw new ConflictException(
        `El espacio seleccionado no está disponible. ${availability.conflictingBooking
          ? `Conflicto con reunión de ${availability.conflictingBooking.teacherName} con ${availability.conflictingBooking.familyName}`
          : ''}`
      );
    }

    booking.spaceId = spaceId;

    // Actualizar estado y notas
    booking.status = MeetingBookingStatus.CONFIRMED;
    if (notes !== undefined) {
      booking.notes = notes;
    }

    await this.meetingBookingsRepository.save(booking);

    // Recargar con todas las relaciones
    const confirmedBooking = await this.meetingBookingsRepository.findOne({
      where: { id: bookingId },
      relations: [
        'slot',
        'slot.teacher',
        'slot.teacher.user',
        'slot.teacher.user.profile',
        'family',
        'family.primaryContact',
        'family.primaryContact.profile',
        'student',
        'student.user',
        'student.user.profile',
        'space',
      ],
    });

    // Notificar a la familia por email (no crítico)
    try {
      await this.sendBookingDecisionEmails(confirmedBooking, 'confirmed');
    } catch (emailError) {
      console.error('⚠️ Error enviando email de confirmación de reunión:', emailError);
    }

    return confirmedBooking;
  }

  /**
   * Denegar/Rechazar una reserva pendiente por el profesor
   */
  async denyBookingByTeacher(
    bookingId: string,
    teacherId: string,
    reason: string,
  ): Promise<MeetingBooking> {
    const booking = await this.meetingBookingsRepository.findOne({
      where: { id: bookingId },
      relations: ['slot', 'slot.teacher', 'slot.teacher.user', 'space'],
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Verificar que el profesor es el dueño del slot
    if (booking.slot.teacher.user.id !== teacherId) {
      throw new ForbiddenException('No tienes permisos para denegar esta reserva');
    }

    // Verificar que la reserva está pendiente
    if (booking.status !== MeetingBookingStatus.PENDING) {
      throw new BadRequestException('Solo se pueden denegar reservas pendientes');
    }

    // Cancelar la reserva con el motivo proporcionado
    booking.status = MeetingBookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelReason = reason;

    await this.meetingBookingsRepository.save(booking);

    // Recargar con todas las relaciones
    const deniedBooking = await this.meetingBookingsRepository.findOne({
      where: { id: bookingId },
      relations: [
        'slot',
        'slot.period',
        'slot.teacher',
        'slot.teacher.user',
        'slot.teacher.user.profile',
        'family',
        'family.primaryContact',
        'family.primaryContact.profile',
        'student',
        'student.user',
        'student.user.profile',
        'space',
      ],
    });

    // Notificar a la familia por email con el motivo (no crítico)
    try {
      await this.sendBookingDecisionEmails(deniedBooking, 'denied', reason);
    } catch (emailError) {
      console.error('⚠️ Error enviando email de denegación de reunión:', emailError);
    }

    return deniedBooking;
  }

  /**
   * Asignar o cambiar espacio de una reserva por el profesor
   */
  async assignSpaceByTeacher(
    bookingId: string,
    teacherId: string,
    spaceId: string | null,
  ): Promise<MeetingBooking> {
    const booking = await this.meetingBookingsRepository.findOne({
      where: { id: bookingId },
      relations: ['slot', 'slot.teacher', 'slot.teacher.user', 'space'],
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Verificar que el profesor es el dueño del slot
    if (booking.slot.teacher.user.id !== teacherId) {
      throw new ForbiddenException('No tienes permisos para modificar esta reserva');
    }

    // Solo se pueden asignar espacios a reservas confirmadas
    if (booking.status !== MeetingBookingStatus.CONFIRMED) {
      throw new BadRequestException('Solo se pueden asignar espacios a reservas confirmadas');
    }

    // Si se proporciona spaceId, validar disponibilidad
    if (spaceId) {
      const availability = await this.checkSpaceAvailability(
        spaceId,
        booking.slot.startDatetime,
        booking.slot.durationMinutes,
      );

      if (!availability.isAvailable) {
        throw new ConflictException(
          `El espacio seleccionado no está disponible. ${availability.conflictingBooking
            ? `Conflicto con reunión de ${availability.conflictingBooking.teacherName} con ${availability.conflictingBooking.familyName}`
            : ''}`
        );
      }
    }

    booking.spaceId = spaceId;
    await this.meetingBookingsRepository.save(booking);

    // Recargar con todas las relaciones
    return await this.meetingBookingsRepository.findOne({
      where: { id: bookingId },
      relations: [
        'slot',
        'slot.teacher',
        'slot.teacher.user',
        'slot.teacher.user.profile',
        'family',
        'family.primaryContact',
        'family.primaryContact.profile',
        'student',
        'student.user',
        'student.user.profile',
        'space',
      ],
    });
  }

  /**
   * Obtener el conteo de reservas pendientes para un profesor
   * Usado para el sistema de notificaciones y badges.
   *
   * Solo cuenta reservas pendientes cuya reunión aún NO ha pasado: una reserva
   * pendiente de una fecha ya vencida no puede confirmarse (no se le puede
   * asignar espacio en el pasado) y dejaría el badge encendido para siempre sin
   * forma de descartarla. Esas se expiran automáticamente por cron.
   */
  async getPendingBookingsCount(teacherUserId: string): Promise<number> {
    const teacher = await this.getTeacherByUserId(teacherUserId);

    const count = await this.meetingBookingsRepository.count({
      where: {
        slot: { teacherId: teacher.id, startDatetime: MoreThan(new Date()) },
        status: MeetingBookingStatus.PENDING,
      },
    });

    return count;
  }

  /**
   * Expira automáticamente las reservas PENDIENTES cuya reunión ya ha pasado.
   * Una reserva pendiente sin confirmar cuya fecha ya venció no es accionable
   * (no se puede confirmar asignando espacio en el pasado ni tiene sentido
   * denegarla a mano), así que quedaría contando en el badge del profesor de
   * forma permanente. Este job las marca como canceladas para que el sistema
   * quede coherente y el badge se apague solo. Se ejecuta cada hora.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireStalePendingBookings(): Promise<number> {
    const stale = await this.meetingBookingsRepository.find({
      where: {
        status: MeetingBookingStatus.PENDING,
        slot: { startDatetime: LessThan(new Date()) },
      },
      relations: ['slot'],
    });

    if (!stale.length) return 0;

    const now = new Date();
    for (const booking of stale) {
      booking.status = MeetingBookingStatus.CANCELLED;
      booking.cancelledAt = now;
      booking.cancelReason =
        'Reunión expirada automáticamente: no se confirmó antes de la fecha prevista.';
    }
    await this.meetingBookingsRepository.save(stale);

    console.log(`🧹 [Meetings] Expiradas ${stale.length} reserva(s) pendiente(s) vencida(s).`);
    return stale.length;
  }
}