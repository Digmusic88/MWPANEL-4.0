/**
 * @archivo: attendance-notifications.service.ts
 * @módulo: Attendance - Email Notifications Service
 * @función: Servicio para envío de notificaciones por email relacionadas con asistencia
 * @creado_por: Sistema de Notificaciones de Asistencia MW Panel 2.0
 * @fecha: 2025-01-26
 * @dependencias: EmailService, AttendanceRequest entity, User entity
 * @propósito: Gestión centralizada de emails para solicitudes de asistencia
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '../../communications/services/email.service';
import { EmailTemplateType } from '../../communications/entities/email-template.entity';
import { EmailPriority } from '../../communications/entities/email-notification.entity';
import { AttendanceRequest, AttendanceRequestType, AttendanceRequestStatus } from '../entities/attendance-request.entity';
import { User } from '../../users/entities/user.entity';
import { Student } from '../../students/entities/student.entity';

@Injectable()
export class AttendanceNotificationsService {
  private readonly logger = new Logger(AttendanceNotificationsService.name);

  constructor(
    @InjectRepository(AttendanceRequest)
    private readonly attendanceRequestRepository: Repository<AttendanceRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Envía notificación por email a profesores cuando se crea una nueva solicitud de asistencia
   */
  async notifyTeachersNewRequest(requestId: string): Promise<void> {
    this.logger.log(`📧 Enviando notificación a profesores para solicitud: ${requestId}`);

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
        throw new NotFoundException(`Solicitud de asistencia no encontrada: ${requestId}`);
      }

      // Obtener todos los profesores únicos del estudiante (tutores de clase)
      const teachers = new Set<User>();

      if (request.student.classGroups) {
        for (const classGroup of request.student.classGroups) {
          if (classGroup.tutor?.user) {
            teachers.add(classGroup.tutor.user);
          }
        }
      }

      if (teachers.size === 0) {
        this.logger.warn(`No se encontraron profesores para el estudiante ${request.student.id}`);
        return;
      }

      // Preparar datos para la plantilla
      const templateData = await this.prepareTeacherNotificationData(request);

      // Enviar email a cada profesor
      const emailPromises = Array.from(teachers).map(async (teacher) => {
        try {
          const teacherEmail = teacher.email;

          if (!teacherEmail) {
            this.logger.warn(`Profesor ${teacher.id} no tiene email configurado`);
            return;
          }

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

          this.logger.log(`✅ Notificación enviada al profesor: ${teacherEmail}`);
        } catch (error) {
          this.logger.error(`❌ Error enviando email al profesor ${teacher.id}:`, error);
        }
      });

      await Promise.allSettled(emailPromises);
      this.logger.log(`📧 Proceso de notificación a profesores completado para solicitud: ${requestId}`);

    } catch (error) {
      this.logger.error(`❌ Error en notifyTeachersNewRequest para ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Envía notificación por email a la familia cuando su solicitud es revisada
   */
  async notifyFamilyRequestReviewed(requestId: string, reviewedById: string): Promise<void> {
    this.logger.log(`📧 Enviando notificación a familia para solicitud revisada: ${requestId}`);

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
        throw new NotFoundException(`Solicitud de asistencia no encontrada: ${requestId}`);
      }

      // Obtener email de la familia
      const familyEmail = request.requestedBy.email;
      if (!familyEmail) {
        this.logger.warn(`Familia ${request.requestedBy.id} no tiene email configurado`);
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

      this.logger.log(`✅ Notificación enviada a la familia: ${familyEmail}`);

    } catch (error) {
      this.logger.error(`❌ Error en notifyFamilyRequestReviewed para ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Prepara los datos para la plantilla de notificación a profesores
   */
  private async prepareTeacherNotificationData(request: AttendanceRequest): Promise<any> {
    // Obtener nombre completo del estudiante desde el perfil
    const firstName = request.student.user?.profile?.firstName || '';
    const lastName = request.student.user?.profile?.lastName || '';
    const studentName = `${firstName} ${lastName}`.trim() || `Estudiante ${request.student.enrollmentNumber}`;
    const familyName = request.requestedBy.email.split('@')[0];

    // Obtener clase principal del estudiante
    const mainClass = request.student.classGroups?.[0]?.name || 'Clase no asignada';

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
    // Obtener nombre completo del estudiante desde el perfil
    const firstName = request.student.user?.profile?.firstName || '';
    const lastName = request.student.user?.profile?.lastName || '';
    const studentName = `${firstName} ${lastName}`.trim() || `Estudiante ${request.student.enrollmentNumber}`;
    const familyName = request.requestedBy.email.split('@')[0];
    const teacherName = request.reviewedBy?.email.split('@')[0] || 'Profesor';

    // Obtener clase principal del estudiante
    const mainClass = request.student.classGroups?.[0]?.name || 'Clase no asignada';

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
}