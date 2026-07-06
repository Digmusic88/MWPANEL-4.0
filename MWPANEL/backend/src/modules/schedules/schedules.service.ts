import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Classroom } from '../students/entities/classroom.entity';
import { TimeSlot } from '../students/entities/time-slot.entity';
import { ScheduleSession } from '../students/entities/schedule-session.entity';
import { AcademicCalendar } from '../students/entities/academic-calendar.entity';
import { EducationalLevel } from '../students/entities/educational-level.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { CreateScheduleSessionDto } from './dto/create-schedule-session.dto';
import { UpdateScheduleSessionDto } from './dto/update-schedule-session.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Classroom)
    private readonly classroomRepository: Repository<Classroom>,
    @InjectRepository(TimeSlot)
    private readonly timeSlotRepository: Repository<TimeSlot>,
    @InjectRepository(ScheduleSession)
    private readonly scheduleSessionRepository: Repository<ScheduleSession>,
    @InjectRepository(AcademicCalendar)
    private readonly academicCalendarRepository: Repository<AcademicCalendar>,
    @InjectRepository(EducationalLevel)
    private readonly educationalLevelRepository: Repository<EducationalLevel>,
    @InjectRepository(SubjectAssignment)
    private readonly subjectAssignmentRepository: Repository<SubjectAssignment>,
    @InjectRepository(AcademicYear)
    private readonly academicYearRepository: Repository<AcademicYear>,
  ) {}

  // ==================== CLASSROOMS ====================

  async findAllClassrooms(): Promise<Classroom[]> {
    return this.classroomRepository.find({
      relations: ['preferredEducationalLevel'],
      order: { building: 'ASC', floor: 'ASC', name: 'ASC' },
    });
  }

  async findOneClassroom(id: string): Promise<Classroom> {
    const classroom = await this.classroomRepository.findOne({
      where: { id },
      relations: ['preferredEducationalLevel'],
    });

    if (!classroom) {
      throw new NotFoundException(`Aula con ID ${id} no encontrada`);
    }

    return classroom;
  }

  async createClassroom(createClassroomDto: CreateClassroomDto): Promise<Classroom> {
    const { preferredEducationalLevelId, ...classroomData } = createClassroomDto;

    // Check if code already exists
    const existingClassroom = await this.classroomRepository.findOne({
      where: { code: createClassroomDto.code },
    });

    if (existingClassroom) {
      throw new ConflictException(`Ya existe un aula con el código ${createClassroomDto.code}`);
    }

    const classroom = this.classroomRepository.create(classroomData);

    // Set educational level if provided
    if (preferredEducationalLevelId) {
      const educationalLevel = await this.educationalLevelRepository.findOne({
        where: { id: preferredEducationalLevelId },
      });
      if (!educationalLevel) {
        throw new NotFoundException(`Nivel educativo con ID ${preferredEducationalLevelId} no encontrado`);
      }
      classroom.preferredEducationalLevel = educationalLevel;
    }

    return this.classroomRepository.save(classroom);
  }

  async updateClassroom(id: string, updateClassroomDto: UpdateClassroomDto): Promise<Classroom> {
    const classroom = await this.findOneClassroom(id);
    const { preferredEducationalLevelId, ...updateData } = updateClassroomDto;

    // Check code uniqueness if being updated
    if (updateData.code && updateData.code !== classroom.code) {
      const existingClassroom = await this.classroomRepository.findOne({
        where: { code: updateData.code },
      });
      if (existingClassroom) {
        throw new ConflictException(`Ya existe un aula con el código ${updateData.code}`);
      }
    }

    // Update educational level if provided
    if (preferredEducationalLevelId) {
      const educationalLevel = await this.educationalLevelRepository.findOne({
        where: { id: preferredEducationalLevelId },
      });
      if (!educationalLevel) {
        throw new NotFoundException(`Nivel educativo con ID ${preferredEducationalLevelId} no encontrado`);
      }
      classroom.preferredEducationalLevel = educationalLevel;
    }

    Object.assign(classroom, updateData);
    return this.classroomRepository.save(classroom);
  }

  async removeClassroom(id: string): Promise<void> {
    const classroom = await this.findOneClassroom(id);

    // Check if classroom is being used in any active schedule session
    const activeSchedules = await this.scheduleSessionRepository.count({
      where: { classroom: { id }, isActive: true },
    });

    if (activeSchedules > 0) {
      throw new BadRequestException(`No se puede eliminar el aula ${classroom.name} porque tiene horarios activos asignados`);
    }

    await this.classroomRepository.remove(classroom);
  }

  // ==================== TIME SLOTS ====================

  async findAllTimeSlots(): Promise<TimeSlot[]> {
    return this.timeSlotRepository.find({
      relations: ['educationalLevel'],
      order: { educationalLevel: { code: 'ASC' }, order: 'ASC' },
    });
  }

  async findTimeSlotsByEducationalLevel(educationalLevelId: string): Promise<TimeSlot[]> {
    return this.timeSlotRepository.find({
      where: { educationalLevel: { id: educationalLevelId } },
      relations: ['educationalLevel'],
      order: { order: 'ASC' },
    });
  }

  async findOneTimeSlot(id: string): Promise<TimeSlot> {
    const timeSlot = await this.timeSlotRepository.findOne({
      where: { id },
      relations: ['educationalLevel'],
    });

    if (!timeSlot) {
      throw new NotFoundException(`Franja horaria con ID ${id} no encontrada`);
    }

    return timeSlot;
  }

  async createTimeSlot(createTimeSlotDto: CreateTimeSlotDto): Promise<TimeSlot> {
    const { educationalLevelId, ...timeSlotData } = createTimeSlotDto;

    // Validate educational level exists
    const educationalLevel = await this.educationalLevelRepository.findOne({
      where: { id: educationalLevelId },
    });
    if (!educationalLevel) {
      throw new NotFoundException(`Nivel educativo con ID ${educationalLevelId} no encontrado`);
    }

    // Validate time format and logic
    if (timeSlotData.startTime >= timeSlotData.endTime) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la hora de fin');
    }

    // Check for overlapping time slots in the same educational level
    const overlappingSlot = await this.timeSlotRepository
      .createQueryBuilder('timeSlot')
      .where('timeSlot.educationalLevel.id = :educationalLevelId', { educationalLevelId })
      .andWhere('timeSlot.isActive = true')
      .andWhere('(timeSlot.startTime < :endTime AND timeSlot.endTime > :startTime)', {
        startTime: timeSlotData.startTime,
        endTime: timeSlotData.endTime,
      })
      .getOne();

    if (overlappingSlot) {
      throw new ConflictException(`Ya existe una franja horaria que se superpone: ${overlappingSlot.name}`);
    }

    const timeSlot = this.timeSlotRepository.create({
      ...timeSlotData,
      educationalLevel,
    });

    return this.timeSlotRepository.save(timeSlot);
  }

  async updateTimeSlot(id: string, updateTimeSlotDto: UpdateTimeSlotDto): Promise<TimeSlot> {
    const timeSlot = await this.findOneTimeSlot(id);
    const { educationalLevelId, ...updateData } = updateTimeSlotDto;

    // Update educational level if provided
    if (educationalLevelId) {
      const educationalLevel = await this.educationalLevelRepository.findOne({
        where: { id: educationalLevelId },
      });
      if (!educationalLevel) {
        throw new NotFoundException(`Nivel educativo con ID ${educationalLevelId} no encontrado`);
      }
      timeSlot.educationalLevel = educationalLevel;
    }

    // Validate time logic if being updated
    const startTime = updateData.startTime || timeSlot.startTime;
    const endTime = updateData.endTime || timeSlot.endTime;
    if (startTime >= endTime) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la hora de fin');
    }

    Object.assign(timeSlot, updateData);
    return this.timeSlotRepository.save(timeSlot);
  }

  async removeTimeSlot(id: string): Promise<void> {
    const timeSlot = await this.findOneTimeSlot(id);

    // Check if time slot is being used in any active schedule session
    const activeSchedules = await this.scheduleSessionRepository.count({
      where: { timeSlot: { id }, isActive: true },
    });

    if (activeSchedules > 0) {
      throw new BadRequestException(`No se puede eliminar la franja horaria ${timeSlot.name} porque tiene horarios activos asignados`);
    }

    await this.timeSlotRepository.remove(timeSlot);
  }

  // ==================== SCHEDULE SESSIONS ====================

  async findAllScheduleSessions(): Promise<ScheduleSession[]> {
    return this.scheduleSessionRepository.find({
      relations: [
        'subjectAssignment',
        'subjectAssignment.teacher',
        'subjectAssignment.teacher.user',
        'subjectAssignment.teacher.user.profile',
        'subjectAssignment.subject',
        'subjectAssignment.classGroup',
        'classroom',
        'timeSlot',
        'academicYear',
      ],
      order: { dayOfWeek: 'ASC', timeSlot: { order: 'ASC' } },
    });
  }

  async findScheduleSessionsByTeacher(teacherId: string): Promise<ScheduleSession[]> {
    return this.scheduleSessionRepository.find({
      where: { 
        subjectAssignment: { teacher: { id: teacherId } },
        isActive: true 
      },
      relations: [
        'subjectAssignment',
        'subjectAssignment.subject',
        'subjectAssignment.classGroup',
        'classroom',
        'timeSlot',
        'academicYear',
      ],
      order: { dayOfWeek: 'ASC', timeSlot: { order: 'ASC' } },
    });
  }

  async findScheduleSessionsByClassGroup(classGroupId: string): Promise<ScheduleSession[]> {
    return this.scheduleSessionRepository.find({
      where: { 
        subjectAssignment: { classGroup: { id: classGroupId } },
        isActive: true 
      },
      relations: [
        'subjectAssignment',
        'subjectAssignment.teacher',
        'subjectAssignment.teacher.user',
        'subjectAssignment.teacher.user.profile',
        'subjectAssignment.subject',
        'classroom',
        'timeSlot',
        'academicYear',
      ],
      order: { dayOfWeek: 'ASC', timeSlot: { order: 'ASC' } },
    });
  }

  async findScheduleSessionsForStudent(userId: string): Promise<ScheduleSession[]> {
    // Get student's class groups and then find schedule sessions
    return this.scheduleSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.subjectAssignment', 'assignment')
      .leftJoinAndSelect('assignment.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('assignment.subject', 'subject')
      .leftJoinAndSelect('assignment.classGroup', 'classGroup')
      .leftJoinAndSelect('session.classroom', 'classroom')
      .leftJoinAndSelect('session.timeSlot', 'timeSlot')
      .leftJoinAndSelect('session.academicYear', 'academicYear')
      .innerJoin('classGroup.students', 'student')
      .innerJoin('student.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('session.isActive = :isActive', { isActive: true })
      .orderBy('session.dayOfWeek', 'ASC')
      .addOrderBy('timeSlot.order', 'ASC')
      .getMany();
  }

  async findScheduleSessionsByClassroom(classroomId: string): Promise<ScheduleSession[]> {
    return this.scheduleSessionRepository.find({
      where: { 
        classroom: { id: classroomId },
        isActive: true 
      },
      relations: [
        'subjectAssignment',
        'subjectAssignment.teacher',
        'subjectAssignment.teacher.user',
        'subjectAssignment.teacher.user.profile',
        'subjectAssignment.subject',
        'subjectAssignment.classGroup',
        'timeSlot',
        'academicYear',
      ],
      order: { dayOfWeek: 'ASC', timeSlot: { order: 'ASC' } },
    });
  }

  async createScheduleSession(createScheduleSessionDto: CreateScheduleSessionDto): Promise<ScheduleSession> {
    const {
      subjectAssignmentId,
      classroomId,
      timeSlotId,
      academicYearId,
      ...sessionData
    } = createScheduleSessionDto;

    // Validate all referenced entities exist
    const subjectAssignment = await this.subjectAssignmentRepository.findOne({
      where: { id: subjectAssignmentId },
      relations: ['teacher', 'subject', 'classGroup'],
    });
    if (!subjectAssignment) {
      throw new NotFoundException(`Asignación de asignatura con ID ${subjectAssignmentId} no encontrada`);
    }

    const classroom = await this.classroomRepository.findOne({
      where: { id: classroomId },
    });
    if (!classroom) {
      throw new NotFoundException(`Aula con ID ${classroomId} no encontrada`);
    }

    const timeSlot = await this.timeSlotRepository.findOne({
      where: { id: timeSlotId },
    });
    if (!timeSlot) {
      throw new NotFoundException(`Franja horaria con ID ${timeSlotId} no encontrada`);
    }

    const academicYear = await this.academicYearRepository.findOne({
      where: { id: academicYearId },
    });
    if (!academicYear) {
      throw new NotFoundException(`Año académico con ID ${academicYearId} no encontrado`);
    }

    // Check for conflicts
    await this.checkScheduleConflicts(createScheduleSessionDto);

    const scheduleSession = this.scheduleSessionRepository.create({
      ...sessionData,
      subjectAssignment,
      classroom,
      timeSlot,
      academicYear,
    });

    return this.scheduleSessionRepository.save(scheduleSession);
  }

  private async checkScheduleConflicts(scheduleDto: CreateScheduleSessionDto): Promise<void> {
    const { subjectAssignmentId, classroomId, timeSlotId, dayOfWeek, academicYearId } = scheduleDto;

    // Check classroom conflict
    const classroomConflict = await this.scheduleSessionRepository.findOne({
      where: {
        classroom: { id: classroomId },
        timeSlot: { id: timeSlotId },
        dayOfWeek,
        academicYear: { id: academicYearId },
        isActive: true,
      },
    });

    if (classroomConflict) {
      throw new ConflictException('El aula ya está ocupada en ese horario');
    }

    // Check teacher conflict (teacher can't be in two places at once)
    const subjectAssignment = await this.subjectAssignmentRepository.findOne({
      where: { id: subjectAssignmentId },
      relations: ['teacher', 'classGroup'],
    });

    if (!subjectAssignment) {
      throw new NotFoundException(`Asignación de asignatura con ID ${subjectAssignmentId} no encontrada`);
    }

    if (!subjectAssignment.teacher) {
      throw new NotFoundException(`La asignación de asignatura con ID ${subjectAssignmentId} no tiene profesor asignado`);
    }

    if (!subjectAssignment.classGroup) {
      throw new NotFoundException(`La asignación de asignatura con ID ${subjectAssignmentId} no tiene grupo de clase asignado`);
    }

    const teacherConflict = await this.scheduleSessionRepository.findOne({
      where: {
        subjectAssignment: { teacher: { id: subjectAssignment.teacher.id } },
        timeSlot: { id: timeSlotId },
        dayOfWeek,
        academicYear: { id: academicYearId },
        isActive: true,
      },
    });

    if (teacherConflict) {
      throw new ConflictException('El profesor ya tiene una clase asignada en ese horario');
    }

    // Check class group conflict (students can't be in two classes at once)
    const classGroupConflict = await this.scheduleSessionRepository.findOne({
      where: {
        subjectAssignment: { classGroup: { id: subjectAssignment.classGroup.id } },
        timeSlot: { id: timeSlotId },
        dayOfWeek,
        academicYear: { id: academicYearId },
        isActive: true,
      },
    });

    if (classGroupConflict) {
      throw new ConflictException('El grupo de clase ya tiene una asignatura asignada en ese horario');
    }
  }

  async updateScheduleSession(id: string, updateScheduleSessionDto: UpdateScheduleSessionDto): Promise<ScheduleSession> {
    const scheduleSession = await this.scheduleSessionRepository.findOne({
      where: { id },
      relations: ['subjectAssignment', 'classroom', 'timeSlot', 'academicYear'],
    });

    if (!scheduleSession) {
      throw new NotFoundException(`Sesión de horario con ID ${id} no encontrada`);
    }

    // If critical fields are being updated, check for conflicts
    const conflictFields = ['subjectAssignmentId', 'classroomId', 'timeSlotId', 'dayOfWeek', 'academicYearId'];
    const hasConflictChanges = conflictFields.some(field => updateScheduleSessionDto[field] !== undefined);

    if (hasConflictChanges) {
      const conflictDto = {
        subjectAssignmentId: updateScheduleSessionDto.subjectAssignmentId || scheduleSession.subjectAssignment.id,
        classroomId: updateScheduleSessionDto.classroomId || scheduleSession.classroom.id,
        timeSlotId: updateScheduleSessionDto.timeSlotId || scheduleSession.timeSlot.id,
        dayOfWeek: updateScheduleSessionDto.dayOfWeek || scheduleSession.dayOfWeek,
        academicYearId: updateScheduleSessionDto.academicYearId || scheduleSession.academicYear.id,
      };

      // Temporarily disable the current session to avoid self-conflict
      scheduleSession.isActive = false;
      await this.scheduleSessionRepository.save(scheduleSession);

      try {
        await this.checkScheduleConflicts(conflictDto as CreateScheduleSessionDto);
      } catch (error) {
        // Re-enable the session if there's a conflict
        scheduleSession.isActive = true;
        await this.scheduleSessionRepository.save(scheduleSession);
        throw error;
      }

      // Re-enable the session
      scheduleSession.isActive = true;
    }

    // Update referenced entities if IDs are provided
    if (updateScheduleSessionDto.subjectAssignmentId) {
      const subjectAssignment = await this.subjectAssignmentRepository.findOne({
        where: { id: updateScheduleSessionDto.subjectAssignmentId },
      });
      if (!subjectAssignment) {
        throw new NotFoundException(`Asignación de asignatura con ID ${updateScheduleSessionDto.subjectAssignmentId} no encontrada`);
      }
      scheduleSession.subjectAssignment = subjectAssignment;
    }

    if (updateScheduleSessionDto.classroomId) {
      const classroom = await this.classroomRepository.findOne({
        where: { id: updateScheduleSessionDto.classroomId },
      });
      if (!classroom) {
        throw new NotFoundException(`Aula con ID ${updateScheduleSessionDto.classroomId} no encontrada`);
      }
      scheduleSession.classroom = classroom;
    }

    if (updateScheduleSessionDto.timeSlotId) {
      const timeSlot = await this.timeSlotRepository.findOne({
        where: { id: updateScheduleSessionDto.timeSlotId },
      });
      if (!timeSlot) {
        throw new NotFoundException(`Franja horaria con ID ${updateScheduleSessionDto.timeSlotId} no encontrada`);
      }
      scheduleSession.timeSlot = timeSlot;
    }

    if (updateScheduleSessionDto.academicYearId) {
      const academicYear = await this.academicYearRepository.findOne({
        where: { id: updateScheduleSessionDto.academicYearId },
      });
      if (!academicYear) {
        throw new NotFoundException(`Año académico con ID ${updateScheduleSessionDto.academicYearId} no encontrado`);
      }
      scheduleSession.academicYear = academicYear;
    }

    // Update other fields
    Object.assign(scheduleSession, {
      dayOfWeek: updateScheduleSessionDto.dayOfWeek,
      startDate: updateScheduleSessionDto.startDate,
      endDate: updateScheduleSessionDto.endDate,
      isActive: updateScheduleSessionDto.isActive,
      notes: updateScheduleSessionDto.notes,
    });

    return this.scheduleSessionRepository.save(scheduleSession);
  }

  async removeScheduleSession(id: string): Promise<void> {
    const scheduleSession = await this.scheduleSessionRepository.findOne({
      where: { id },
    });

    if (!scheduleSession) {
      throw new NotFoundException(`Sesión de horario con ID ${id} no encontrada`);
    }

    await this.scheduleSessionRepository.remove(scheduleSession);
  }
}