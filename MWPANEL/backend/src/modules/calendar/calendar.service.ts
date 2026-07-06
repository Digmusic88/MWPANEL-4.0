import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Like, QueryBuilder } from 'typeorm';
import {
  CalendarEvent,
  CalendarEventGroup,
  CalendarEventSubject,
  CalendarEventStudent,
  CalendarEventReminder,
  CalendarEventType,
  CalendarEventVisibility,
} from './entities';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  CalendarEventQueryDto,
} from './dto';
import { User } from '../users/entities/user.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent)
    private calendarEventsRepository: Repository<CalendarEvent>,
    @InjectRepository(CalendarEventGroup)
    private eventGroupsRepository: Repository<CalendarEventGroup>,
    @InjectRepository(CalendarEventSubject)
    private eventSubjectsRepository: Repository<CalendarEventSubject>,
    @InjectRepository(CalendarEventStudent)
    private eventStudentsRepository: Repository<CalendarEventStudent>,
    @InjectRepository(CalendarEventReminder)
    private eventRemindersRepository: Repository<CalendarEventReminder>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(Family)
    private familiesRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private familyStudentsRepository: Repository<FamilyStudent>,
    @InjectRepository(SubjectAssignment)
    private subjectAssignmentRepository: Repository<SubjectAssignment>,
  ) {}

  // ==================== CRUD EVENTOS ====================

  async create(
    createEventDto: CreateCalendarEventDto,
    userId: string,
  ): Promise<CalendarEvent> {
    // Validar fechas
    const startDate = new Date(createEventDto.startDate);
    const endDate = new Date(createEventDto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Crear el evento
    const event = this.calendarEventsRepository.create({
      ...createEventDto,
      startDate,
      endDate,
      recurrenceEnd: createEventDto.recurrenceEnd
        ? new Date(createEventDto.recurrenceEnd)
        : null,
      createdById: userId,
    });

    const savedEvent = await this.calendarEventsRepository.save(event);

    // Crear asignaciones si se proporcionan
    await this.createEventAssignments(savedEvent.id, createEventDto);

    // Crear recordatorios automáticos si está habilitado
    if (createEventDto.autoNotify) {
      await this.createAutoReminders(savedEvent);
    }

    return this.findOne(savedEvent.id, userId);
  }

  async findAll(
    query: CalendarEventQueryDto,
    userId: string,
  ): Promise<CalendarEvent[]> {
    console.log('🔍 [DEBUG] Calendar findAll - userId:', userId);
    console.log('🔍 [DEBUG] Calendar findAll - query:', query);

    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    console.log('🔍 [DEBUG] Calendar findAll - user role:', user.role);
    console.log('🔍 [DEBUG] Calendar findAll - user email:', user.email);

    const queryBuilder = this.calendarEventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.profile', 'createdByProfile')
      .leftJoinAndSelect('event.eventGroups', 'eventGroups')
      .leftJoinAndSelect('eventGroups.classGroup', 'classGroup')
      .leftJoinAndSelect('event.eventSubjects', 'eventSubjects')
      .leftJoinAndSelect('eventSubjects.subject', 'subject')
      .leftJoinAndSelect('event.eventStudents', 'eventStudents')
      .leftJoinAndSelect('eventStudents.student', 'student')
      .leftJoinAndSelect('event.relatedTask', 'relatedTask')
      .where('event.isActive = :isActive', { isActive: true });

    // Aplicar filtros de fecha
    if (query.startDate && query.endDate) {
      queryBuilder.andWhere(
        'event.startDate >= :startDate AND event.endDate <= :endDate',
        {
          startDate: new Date(query.startDate),
          endDate: new Date(query.endDate),
        },
      );
    }

    // Filtrar por tipo
    if (query.type) {
      queryBuilder.andWhere('event.type = :type', { type: query.type });
    }

    // Filtrar por texto de búsqueda
    if (query.search) {
      queryBuilder.andWhere(
        '(event.title ILIKE :search OR event.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Filtrar por tags
    if (query.tags && query.tags.length > 0) {
      queryBuilder.andWhere('event.tags && :tags', { tags: query.tags });
    }

    // Filtrar por estudiante específico
    if (query.studentId) {
      queryBuilder.andWhere(
        '(eventStudents.student.id = :studentId OR ' +
        'eventGroups.classGroup.id IN (SELECT cg.id FROM class_groups cg ' +
        'INNER JOIN students s ON s.classGroupId = cg.id WHERE s.id = :studentId))',
        { studentId: query.studentId }
      );
    }

    // Filtrar por grupo de clase
    if (query.classGroupIds && query.classGroupIds.length > 0) {
      queryBuilder.andWhere('eventGroups.classGroup.id IN (:...classGroupIds)', {
        classGroupIds: query.classGroupIds,
      });
    }

    // Filtrar por asignatura
    if (query.subjectIds && query.subjectIds.length > 0) {
      queryBuilder.andWhere('eventSubjects.subject.id IN (:...subjectIds)', {
        subjectIds: query.subjectIds,
      });
    }

    // Aplicar filtros de visibilidad según el rol del usuario
    await this.applyVisibilityFilters(queryBuilder, user, query);

    queryBuilder.orderBy('event.startDate', 'ASC');

    // DEBUG: Log SQL query
    console.log('🔍 [DEBUG] Final SQL Query:', queryBuilder.getSql());
    console.log('🔍 [DEBUG] Final Params:', JSON.stringify(queryBuilder.getParameters()));

    const results = await queryBuilder.getMany();
    console.log('🔍 [DEBUG] Results count:', results.length);
    return results;
  }

  async findOne(id: string, userId: string): Promise<CalendarEvent> {
    const event = await this.calendarEventsRepository.findOne({
      where: { id, isActive: true },
      relations: [
        'createdBy',
        'createdBy.profile',
        'lastModifiedBy',
        'lastModifiedBy.profile',
        'eventGroups',
        'eventGroups.classGroup',
        'eventSubjects',
        'eventSubjects.subject',
        'eventStudents',
        'eventStudents.student',
        'eventStudents.student.user',
        'eventStudents.student.user.profile',
        'relatedTask',
        'reminders',
      ],
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    // Verificar permisos de visualización
    await this.checkViewPermissions(event, userId);

    return event;
  }

  async update(
    id: string,
    updateEventDto: UpdateCalendarEventDto,
    userId: string,
  ): Promise<CalendarEvent> {
    const event = await this.findOne(id, userId);

    // Verificar permisos de edición
    await this.checkEditPermissions(event, userId);

    // Validar fechas si se actualizan
    if (updateEventDto.startDate || updateEventDto.endDate) {
      const startDate = updateEventDto.startDate
        ? new Date(updateEventDto.startDate)
        : event.startDate;
      const endDate = updateEventDto.endDate
        ? new Date(updateEventDto.endDate)
        : event.endDate;

      if (endDate <= startDate) {
        throw new BadRequestException(
          'La fecha de fin debe ser posterior a la fecha de inicio',
        );
      }
    }

    // Actualizar evento - Extraer campos de relaciones que no van en la entidad principal
    const { classGroupIds, subjectIds, studentIds, ...eventData } = updateEventDto;
    
    const updateData = {
      ...eventData,
      lastModifiedById: userId,
      startDate: updateEventDto.startDate
        ? new Date(updateEventDto.startDate)
        : undefined,
      endDate: updateEventDto.endDate
        ? new Date(updateEventDto.endDate)
        : undefined,
      recurrenceEnd: updateEventDto.recurrenceEnd
        ? new Date(updateEventDto.recurrenceEnd)
        : undefined,
    };
    
    await this.calendarEventsRepository.update(id, updateData);

    // Actualizar asignaciones si se proporcionan
    if (
      updateEventDto.classGroupIds ||
      updateEventDto.subjectIds ||
      updateEventDto.studentIds
    ) {
      await this.updateEventAssignments(id, updateEventDto);
    }

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const event = await this.findOne(id, userId);

    // Verificar permisos de eliminación
    await this.checkEditPermissions(event, userId);

    // Soft delete
    await this.calendarEventsRepository.update(id, {
      isActive: false,
      lastModifiedById: userId,
    });
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private async createEventAssignments(
    eventId: string,
    createEventDto: CreateCalendarEventDto,
  ): Promise<void> {
    // Crear asignaciones a grupos
    if (createEventDto.classGroupIds && createEventDto.classGroupIds.length > 0) {
      const groupAssignments = createEventDto.classGroupIds.map((groupId) =>
        this.eventGroupsRepository.create({ eventId, classGroupId: groupId }),
      );
      await this.eventGroupsRepository.save(groupAssignments);
    }

    // Crear asignaciones a asignaturas
    if (createEventDto.subjectIds && createEventDto.subjectIds.length > 0) {
      const subjectAssignments = createEventDto.subjectIds.map((subjectId) =>
        this.eventSubjectsRepository.create({ eventId, subjectId }),
      );
      await this.eventSubjectsRepository.save(subjectAssignments);
    }

    // Crear asignaciones a estudiantes específicos
    if (createEventDto.studentIds && createEventDto.studentIds.length > 0) {
      const studentAssignments = createEventDto.studentIds.map((studentId) =>
        this.eventStudentsRepository.create({ eventId, studentId }),
      );
      await this.eventStudentsRepository.save(studentAssignments);
    }
  }

  private async updateEventAssignments(
    eventId: string,
    updateEventDto: UpdateCalendarEventDto,
  ): Promise<void> {
    // Actualizar asignaciones a grupos
    if (updateEventDto.classGroupIds) {
      await this.eventGroupsRepository.delete({ eventId });
      if (updateEventDto.classGroupIds.length > 0) {
        const groupAssignments = updateEventDto.classGroupIds.map((groupId) =>
          this.eventGroupsRepository.create({ eventId, classGroupId: groupId }),
        );
        await this.eventGroupsRepository.save(groupAssignments);
      }
    }

    // Actualizar asignaciones a asignaturas
    if (updateEventDto.subjectIds) {
      await this.eventSubjectsRepository.delete({ eventId });
      if (updateEventDto.subjectIds.length > 0) {
        const subjectAssignments = updateEventDto.subjectIds.map((subjectId) =>
          this.eventSubjectsRepository.create({ eventId, subjectId }),
        );
        await this.eventSubjectsRepository.save(subjectAssignments);
      }
    }

    // Actualizar asignaciones a estudiantes
    if (updateEventDto.studentIds) {
      await this.eventStudentsRepository.delete({ eventId });
      if (updateEventDto.studentIds.length > 0) {
        const studentAssignments = updateEventDto.studentIds.map((studentId) =>
          this.eventStudentsRepository.create({ eventId, studentId }),
        );
        await this.eventStudentsRepository.save(studentAssignments);
      }
    }
  }

  private async createAutoReminders(event: CalendarEvent): Promise<void> {
    // Por ahora, crear recordatorio simple basado en notifyBefore
    const reminderTime = new Date(
      event.startDate.getTime() - (event.notifyBefore || 60) * 60 * 1000,
    );

    if (reminderTime > new Date()) {
      const reminder = this.eventRemindersRepository.create({
        eventId: event.id,
        userId: event.createdById,
        reminderTime,
        message: `Recordatorio: ${event.title}`,
        type: 'notification',
      });

      await this.eventRemindersRepository.save(reminder);
    }
  }

  private async applyVisibilityFilters(
    queryBuilder: any,
    user: User,
    query: CalendarEventQueryDto,
  ): Promise<void> {
    const publicEvents = 'event.visibility = :publicVisibility';
    const visibilityParams: any = { publicVisibility: CalendarEventVisibility.PUBLIC };

    switch (user.role) {
      case 'admin':
        // Los admins pueden ver todos los eventos
        break;
      case 'teacher':
        // Los profesores pueden ver eventos públicos, para profesores, o creados por ellos
        queryBuilder.andWhere(
          `(${publicEvents} OR event.visibility = :teachersOnly OR event.createdById = :userId OR event.visibility = :classSpecific OR event.visibility = :subjectSpecific)`,
          {
            ...visibilityParams,
            teachersOnly: CalendarEventVisibility.TEACHERS_ONLY,
            classSpecific: CalendarEventVisibility.CLASS_SPECIFIC,
            subjectSpecific: CalendarEventVisibility.SUBJECT_SPECIFIC,
            userId: user.id,
          },
        );
        break;
      case 'student':
        // Los estudiantes pueden ver eventos públicos, para estudiantes, y específicos de su clase/asignatura
        await this.applyStudentSpecificFilters(queryBuilder, user.id, visibilityParams);
        break;
      case 'family':
        // Las familias pueden ver eventos públicos, para familias, y específicos de las clases de sus hijos
        await this.applyFamilySpecificFilters(queryBuilder, user.id, visibilityParams);
        break;
      default:
        queryBuilder.andWhere(publicEvents, visibilityParams);
    }
  }

  private async applyStudentSpecificFilters(
    queryBuilder: any,
    userId: string,
    visibilityParams: any,
  ): Promise<void> {
    // Obtener información del estudiante con relaciones many-to-many correctas
    const student = await this.studentsRepository.findOne({
      where: { user: { id: userId } },
      relations: ['classGroups'],
    });

    console.log('🔍 [DEBUG] Student filter - userId:', userId);
    console.log('🔍 [DEBUG] Student found:', !!student);

    if (!student) {
      console.log('❌ [DEBUG] No student found, showing only public events');
      // Si no es un estudiante, solo mostrar eventos públicos
      queryBuilder.andWhere('event.visibility = :publicVisibility', visibilityParams);
      return;
    }

    console.log('🔍 [DEBUG] Student ID:', student.id);
    console.log('🔍 [DEBUG] Student classGroups:', student.classGroups?.map(cg => ({ id: cg.id, name: cg.name })));

    // Obtener los IDs de todas las clases y asignaturas del estudiante
    const classGroupIds: string[] = [];
    const subjectIds: string[] = [];

    // Obtener los IDs de los grupos de clase
    student.classGroups?.forEach(classGroup => {
      classGroupIds.push(classGroup.id);
      console.log('🔍 [DEBUG] ClassGroup:', classGroup.name, 'ID:', classGroup.id);
    });

    // Buscar asignaciones de materias para los grupos del estudiante
    if (classGroupIds.length > 0) {
      const subjectAssignments = await this.subjectAssignmentRepository.find({
        where: { classGroup: { id: In(classGroupIds) } },
        relations: ['subject'],
      });

      subjectAssignments.forEach(sa => {
        if (sa.subject && !subjectIds.includes(sa.subject.id)) {
          subjectIds.push(sa.subject.id);
          console.log('🔍 [DEBUG] Subject:', sa.subject.name, 'ID:', sa.subject.id);
        }
      });
    }

    console.log('🔍 [DEBUG] Final classGroupIds:', classGroupIds);
    console.log('🔍 [DEBUG] Final subjectIds:', subjectIds);

    // Filtro completo para estudiantes usando subconsultas para evitar problemas con LEFT JOINs
    let whereClause = `(
      event.visibility = :publicVisibility
      OR event.visibility = :studentsOnly
      OR (
        event.visibility = :classSpecific
        AND EXISTS (
          SELECT 1 FROM calendar_event_groups ceg
          WHERE ceg."eventId" = event.id
          AND ceg."classGroupId" IN (:...classGroupIds)
        )
      )
      OR (
        event.visibility = :subjectSpecific
        AND EXISTS (
          SELECT 1 FROM calendar_event_subjects ces
          WHERE ces."eventId" = event.id
          AND ces."subjectId" IN (:...subjectIds)
        )
      )
      OR EXISTS (
        SELECT 1 FROM calendar_event_students cest
        WHERE cest."eventId" = event.id
        AND cest."studentId" = :studentId
      )
    )`;

    const params = {
      ...visibilityParams,
      studentsOnly: CalendarEventVisibility.STUDENTS_ONLY,
      classSpecific: CalendarEventVisibility.CLASS_SPECIFIC,
      subjectSpecific: CalendarEventVisibility.SUBJECT_SPECIFIC,
      classGroupIds: classGroupIds.length > 0 ? classGroupIds : ['dummy'], // Evitar error si no hay clases
      subjectIds: subjectIds.length > 0 ? subjectIds : ['dummy'], // Evitar error si no hay asignaturas
      studentId: student.id,
    };

    console.log('🔍 [DEBUG] WhereClause:', whereClause);
    console.log('🔍 [DEBUG] Params:', params);

    queryBuilder.andWhere(whereClause, params);
  }

  private async applyFamilySpecificFilters(
    queryBuilder: any,
    userId: string,
    visibilityParams: any,
  ): Promise<void> {
    // Obtener los estudiantes asociados a esta familia con relaciones many-to-many correctas
    const familyStudents = await this.familyStudentsRepository.find({
      where: [
        { family: { primaryContact: { id: userId } } },
        { family: { secondaryContact: { id: userId } } }
      ],
      relations: ['student', 'student.classGroups'],
    });

    if (familyStudents.length === 0) {
      // Si no tiene estudiantes asociados, solo mostrar eventos públicos y para familias
      queryBuilder.andWhere(
        `(event.visibility = :publicVisibility OR event.visibility = :familiesOnly)`,
        {
          ...visibilityParams,
          familiesOnly: CalendarEventVisibility.FAMILIES_ONLY,
        },
      );
      return;
    }

    // Obtener todos los IDs de clases y asignaturas de los hijos
    const classGroupIds: string[] = [];
    const subjectIds: string[] = [];
    const studentIds: string[] = [];

    familyStudents.forEach(fs => {
      studentIds.push(fs.student.id);

      fs.student.classGroups?.forEach(classGroup => {
        if (!classGroupIds.includes(classGroup.id)) {
          classGroupIds.push(classGroup.id);
        }
      });
    });

    // Buscar asignaciones de materias para todos los grupos de clase de los hijos
    if (classGroupIds.length > 0) {
      const subjectAssignments = await this.subjectAssignmentRepository.find({
        where: { classGroup: { id: In(classGroupIds) } },
        relations: ['subject'],
      });

      subjectAssignments.forEach(sa => {
        if (sa.subject && !subjectIds.includes(sa.subject.id)) {
          subjectIds.push(sa.subject.id);
        }
      });
    }

    // Filtro completo para familias usando subconsultas para evitar problemas con LEFT JOINs
    let whereClause = `(
      event.visibility = :publicVisibility
      OR event.visibility = :familiesOnly
      OR (
        event.visibility = :classSpecific
        AND EXISTS (
          SELECT 1 FROM calendar_event_groups ceg
          WHERE ceg."eventId" = event.id
          AND ceg."classGroupId" IN (:...classGroupIds)
        )
      )
      OR (
        event.visibility = :subjectSpecific
        AND EXISTS (
          SELECT 1 FROM calendar_event_subjects ces
          WHERE ces."eventId" = event.id
          AND ces."subjectId" IN (:...subjectIds)
        )
      )
      OR EXISTS (
        SELECT 1 FROM calendar_event_students cest
        WHERE cest."eventId" = event.id
        AND cest."studentId" IN (:...studentIds)
      )
    )`;

    const params = {
      ...visibilityParams,
      familiesOnly: CalendarEventVisibility.FAMILIES_ONLY,
      classSpecific: CalendarEventVisibility.CLASS_SPECIFIC,
      subjectSpecific: CalendarEventVisibility.SUBJECT_SPECIFIC,
      classGroupIds: classGroupIds.length > 0 ? classGroupIds : ['dummy'],
      subjectIds: subjectIds.length > 0 ? subjectIds : ['dummy'],
      studentIds: studentIds.length > 0 ? studentIds : ['dummy'],
    };

    queryBuilder.andWhere(whereClause, params);
  }

  private async checkViewPermissions(
    event: CalendarEvent,
    userId: string,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar permisos de visualización según visibilidad del evento
    if (event.visibility === CalendarEventVisibility.PRIVATE && event.createdById !== userId) {
      throw new ForbiddenException('No tienes permisos para ver este evento');
    }

    if (event.visibility === CalendarEventVisibility.ADMIN_ONLY && user.role !== 'admin') {
      throw new ForbiddenException('Solo los administradores pueden ver este evento');
    }

    // Agregar más validaciones según sea necesario
  }

  private async checkEditPermissions(
    event: CalendarEvent,
    userId: string,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Solo el creador o un admin pueden editar
    if (event.createdById !== userId && user.role !== 'admin') {
      throw new ForbiddenException('No tienes permisos para editar este evento');
    }
  }

  // ==================== MÉTODOS ESPECÍFICOS ====================

  async getEventsByDateRange(
    startDate: string,
    endDate: string,
    userId: string,
  ): Promise<CalendarEvent[]> {
    const query: CalendarEventQueryDto = {
      startDate,
      endDate,
      onlyActive: true,
    };

    return this.findAll(query, userId);
  }

  async getUpcomingEvents(userId: string, days: number = 7): Promise<CalendarEvent[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.getEventsByDateRange(
      startDate.toISOString(),
      endDate.toISOString(),
      userId,
    );
  }

  async getEventsByType(
    type: CalendarEventType,
    userId: string,
  ): Promise<CalendarEvent[]> {
    const query: CalendarEventQueryDto = {
      type,
      onlyActive: true,
    };

    return this.findAll(query, userId);
  }

  async getEventsByStudent(
    studentId: string,
    userId: string,
  ): Promise<CalendarEvent[]> {
    const query: CalendarEventQueryDto = {
      studentId,
      onlyActive: true,
    };

    return this.findAll(query, userId);
  }

  async getTeacherClassEvents(userId: string): Promise<CalendarEvent[]> {
    // Find teacher by user ID
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
      relations: ['subjectAssignments', 'subjectAssignments.classGroup'],
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // Get class group IDs for this teacher
    const classGroupIds = teacher.subjectAssignments?.map(sa => sa.classGroup.id) || [];

    if (classGroupIds.length === 0) {
      return [];
    }

    // Filter events for teacher's classes
    const query: CalendarEventQueryDto = {
      visibility: CalendarEventVisibility.CLASS_SPECIFIC,
      onlyActive: true,
    };

    const allEvents = await this.findAll(query, userId);

    // Filter events that belong to teacher's classes
    return allEvents.filter(event => 
      event.eventGroups?.some(eg => classGroupIds.includes(eg.classGroup.id))
    );
  }

  // ==================== ADMIN METHODS ====================

  async getAdminStatistics() {
    const totalEvents = await this.calendarEventsRepository.count();
    
    const eventsByType = await this.calendarEventsRepository
      .createQueryBuilder('event')
      .select('event.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.type')
      .getRawMany();

    const eventsByVisibility = await this.calendarEventsRepository
      .createQueryBuilder('event')
      .select('event.visibility', 'visibility')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.visibility')
      .getRawMany();

    const upcomingEvents = await this.calendarEventsRepository.count({
      where: {
        startDate: Between(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      }
    });

    const recentEvents = await this.calendarEventsRepository.count({
      where: {
        createdAt: Between(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date())
      }
    });

    return {
      totalEvents,
      upcomingEvents,
      recentEvents,
      eventsByType: eventsByType.map(item => ({
        type: item.type,
        count: parseInt(item.count)
      })),
      eventsByVisibility: eventsByVisibility.map(item => ({
        visibility: item.visibility,
        count: parseInt(item.count)
      })),
      participationRate: 85, // Placeholder - could be calculated based on actual data
    };
  }

  async getEventTemplates() {
    // For now, return static templates - in the future could be stored in DB
    return [
      {
        id: '1',
        name: 'Examen Final',
        type: CalendarEventType.TEST_YOURSELF,
        visibility: CalendarEventVisibility.CLASS_SPECIFIC,
        duration: 120,
        description: 'Plantilla para exámenes finales',
        autoNotify: true,
        reminderDays: [7, 3, 1]
      },
      {
        id: '2',
        name: 'Reunión de Padres',
        type: CalendarEventType.MEETING,
        visibility: CalendarEventVisibility.FAMILIES_ONLY,
        duration: 60,
        description: 'Plantilla para reuniones con familias',
        autoNotify: true,
        reminderDays: [14, 7, 1]
      },
      {
        id: '3',
        name: 'Excursión',
        type: CalendarEventType.EXCURSION,
        visibility: CalendarEventVisibility.PUBLIC,
        duration: 480,
        description: 'Plantilla para excursiones escolares',
        autoNotify: true,
        reminderDays: [30, 14, 7]
      },
      {
        id: '4',
        name: 'Festividad Escolar',
        type: CalendarEventType.FESTIVAL,
        visibility: CalendarEventVisibility.PUBLIC,
        duration: 240,
        description: 'Plantilla para festividades escolares',
        autoNotify: true,
        reminderDays: [21, 14, 7]
      }
    ];
  }

  async createEventTemplate(templateData: any, userId: string) {
    // For now, just return the template data with an ID
    // In the future, this could save to a templates table
    return {
      id: Date.now().toString(),
      ...templateData,
      createdBy: userId,
      createdAt: new Date()
    };
  }

  async bulkImportEvents(importData: any, userId: string) {
    const { events } = importData;
    const results = {
      imported: 0,
      errors: [],
      total: events?.length || 0
    };

    if (!events || !Array.isArray(events)) {
      throw new BadRequestException('Se requiere un array de eventos para importar');
    }

    for (let i = 0; i < events.length; i++) {
      try {
        const eventData = events[i];
        await this.create(eventData, userId);
        results.imported++;
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error.message || 'Error desconocido'
        });
      }
    }

    return results;
  }

  async exportEvents(filters: any) {
    const query = this.calendarEventsRepository.createQueryBuilder('event')
      .leftJoinAndSelect('event.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.profile', 'profile')
      .leftJoinAndSelect('event.eventGroups', 'eventGroups')
      .leftJoinAndSelect('eventGroups.classGroup', 'classGroup')
      .leftJoinAndSelect('event.eventSubjects', 'eventSubjects')
      .leftJoinAndSelect('eventSubjects.subject', 'subject');

    if (filters.startDate) {
      query.andWhere('event.startDate >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('event.endDate <= :endDate', { endDate: filters.endDate });
    }

    if (filters.type) {
      query.andWhere('event.type = :type', { type: filters.type });
    }

    if (filters.visibility) {
      query.andWhere('event.visibility = :visibility', { visibility: filters.visibility });
    }

    const events = await query.getMany();

    // Transform events for export
    const exportData = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      visibility: event.visibility,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      createdBy: event.createdBy?.profile?.firstName + ' ' + event.createdBy?.profile?.lastName,
      classGroups: event.eventGroups?.map(eg => eg.classGroup.name).join(', ') || '',
      subjects: event.eventSubjects?.map(es => es.subject.name).join(', ') || '',
      createdAt: event.createdAt
    }));

    return {
      data: exportData,
      filename: `calendario_eventos_${new Date().toISOString().split('T')[0]}.xlsx`,
      totalEvents: exportData.length
    };
  }

  // ==================== DEBUG METHODS ====================

  async debugUserContext(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      return { error: 'Usuario no encontrado' };
    }

    let contextInfo: any = {
      user: {
        id: user.id,
        role: user.role,
        profile: {
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
        },
      },
    };

    // Si es estudiante, obtener información de clases y asignaturas (relación many-to-many)
    if (user.role === 'student') {
      const student = await this.studentsRepository.findOne({
        where: { user: { id: userId } },
        relations: ['classGroups'],
      });

      if (student) {
        // Obtener asignaciones de materias para los grupos del estudiante
        const classGroupIds = student.classGroups?.map(cg => cg.id) || [];
        let subjectAssignments: any[] = [];

        if (classGroupIds.length > 0) {
          subjectAssignments = await this.subjectAssignmentRepository.find({
            where: { classGroup: { id: In(classGroupIds) } },
            relations: ['subject', 'classGroup'],
          });
        }

        contextInfo.student = {
          id: student.id,
          classGroups: student.classGroups?.map(classGroup => ({
            id: classGroup.id,
            name: classGroup.name,
            subjectAssignments: subjectAssignments
              .filter(sa => sa.classGroup.id === classGroup.id)
              .map(sa => ({
                subject: {
                  id: sa.subject.id,
                  name: sa.subject.name,
                },
              })),
          })) || [],
        };
      }
    }

    // Si es familia, obtener información de los hijos (relación many-to-many)
    if (user.role === 'family') {
      const familyStudents = await this.familyStudentsRepository.find({
        where: [
          { family: { primaryContact: { id: userId } } },
          { family: { secondaryContact: { id: userId } } }
        ],
        relations: ['student', 'student.user', 'student.user.profile', 'student.classGroups'],
      });

      // Obtener todas las asignaciones de materias para los estudiantes de la familia
      const allClassGroupIds = familyStudents.flatMap(fs =>
        fs.student.classGroups?.map(cg => cg.id) || []
      );

      let familySubjectAssignments: any[] = [];
      if (allClassGroupIds.length > 0) {
        familySubjectAssignments = await this.subjectAssignmentRepository.find({
          where: { classGroup: { id: In(allClassGroupIds) } },
          relations: ['subject', 'classGroup'],
        });
      }

      contextInfo.family = {
        students: familyStudents.map(fs => ({
          id: fs.student.id,
          name: `${fs.student.user?.profile?.firstName} ${fs.student.user?.profile?.lastName}`,
          classGroups: fs.student.classGroups?.map(classGroup => ({
            id: classGroup.id,
            name: classGroup.name,
            subjectAssignments: familySubjectAssignments
              .filter(sa => sa.classGroup.id === classGroup.id)
              .map(sa => ({
                subject: {
                  id: sa.subject.id,
                  name: sa.subject.name,
                },
              })),
          })) || [],
        })),
      };
    }

    // Si es profesor, obtener información de las clases que enseña
    if (user.role === 'teacher') {
      const teacher = await this.teachersRepository.findOne({
        where: { user: { id: userId } },
        relations: ['subjectAssignments', 'subjectAssignments.classGroup', 'subjectAssignments.subject'],
      });

      if (teacher) {
        contextInfo.teacher = {
          id: teacher.id,
          subjectAssignments: teacher.subjectAssignments?.map(sa => ({
            classGroup: {
              id: sa.classGroup.id,
              name: sa.classGroup.name,
            },
            subject: {
              id: sa.subject.id,
              name: sa.subject.name,
            },
          })) || [],
        };
      }
    }

    return contextInfo;
  }
}