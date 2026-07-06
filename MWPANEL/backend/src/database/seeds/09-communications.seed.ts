import { DataSource } from 'typeorm';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { ClassGroup } from '../../modules/students/entities/class-group.entity';
import { Student } from '../../modules/students/entities/student.entity';
import { Message, MessageType, MessagePriority } from '../../modules/communications/entities/message.entity';
import { Notification, NotificationType, NotificationStatus } from '../../modules/communications/entities/notification.entity';

export const seedCommunications = async (dataSource: DataSource): Promise<void> => {
  const userRepository = dataSource.getRepository(User);
  const classGroupRepository = dataSource.getRepository(ClassGroup);
  const studentRepository = dataSource.getRepository(Student);
  const messageRepository = dataSource.getRepository(Message);
  const notificationRepository = dataSource.getRepository(Notification);

  // Obtener usuarios existentes
  const admin = await userRepository.findOne({
    where: { email: 'admin@mwpanel.com' },
    relations: ['profile'],
  });
  
  const teachers = await userRepository.find({
    where: { role: UserRole.TEACHER },
    relations: ['profile'],
    take: 3,
  });

  const families = await userRepository.find({
    where: { role: UserRole.FAMILY },
    relations: ['profile'],
    take: 3,
  });

  const students = await studentRepository.find({
    relations: ['user', 'user.profile'],
    take: 5,
  });

  const classGroups = await classGroupRepository.find({
    relations: ['tutor', 'students'],
    take: 2,
  });

  if (!admin || teachers.length === 0 || families.length === 0 || students.length === 0) {
    console.log('→ Faltan usuarios base para crear comunicaciones');
    return;
  }

  console.log(`→ Creando comunicaciones entre ${teachers.length} profesores, ${families.length} familias y ${students.length} estudiantes`);

  let messagesCreated = 0;
  let notificationsCreated = 0;

  // ==================== MENSAJES DE PRUEBA ====================

  const sampleMessages = [
    // Mensajes de profesores a familias
    {
      sender: teachers[0],
      recipient: families[0],
      relatedStudent: students[0],
      type: MessageType.DIRECT,
      priority: MessagePriority.NORMAL,
      subject: 'Progreso académico de ' + students[0].user.profile.firstName,
      content: `Estimada familia,\n\nMe complace informarles que ${students[0].user.profile.firstName} está mostrando un excelente progreso en matemáticas. Ha mejorado significativamente en la resolución de problemas y muestra gran interés por aprender.\n\nSaludos cordiales,\n${teachers[0].profile.firstName} ${teachers[0].profile.lastName}`,
    },
    {
      sender: teachers[1],
      recipient: families[1],
      relatedStudent: students[1],
      type: MessageType.DIRECT,
      priority: MessagePriority.HIGH,
      subject: 'Reunión para revisar evaluaciones',
      content: `Buenos días,\n\nMe gustaría programar una reunión con ustedes para revisar las últimas evaluaciones de ${students[1].user.profile.firstName} y discutir estrategias de apoyo.\n\n¿Estarían disponibles esta semana?\n\nGracias,\n${teachers[1].profile.firstName} ${teachers[1].profile.lastName}`,
    },
    {
      sender: teachers[2],
      recipient: families[2],
      relatedStudent: students[2],
      type: MessageType.DIRECT,
      priority: MessagePriority.NORMAL,
      subject: 'Participación en actividades extraescolares',
      content: `Estimados padres,\n\n${students[2].user.profile.firstName} ha mostrado gran interés en las actividades de ciencias. Les recomiendo considerar su participación en el club de ciencias que iniciará el próximo mes.\n\nQuedo a su disposición para más información.\n\nAtentamente,\n${teachers[2].profile.firstName}`,
    },
    // Mensajes de familias a profesores
    {
      sender: families[0],
      recipient: teachers[0],
      relatedStudent: students[0],
      type: MessageType.DIRECT,
      priority: MessagePriority.NORMAL,
      subject: 'Agradecimiento por el apoyo',
      content: `Estimado/a profesor/a,\n\nQueremos agradecerle por el apoyo y dedicación que ha mostrado con ${students[0].user.profile.firstName}. Hemos notado una mejora significativa en su actitud hacia el estudio.\n\nMuchas gracias por su excelente trabajo.\n\nFamilia ${students[0].user.profile.lastName}`,
    },
    {
      sender: families[1],
      recipient: teachers[1],
      relatedStudent: students[1],
      type: MessageType.DIRECT,
      priority: MessagePriority.NORMAL,
      subject: 'Consulta sobre tareas',
      content: `Buenos días,\n\nTenemos algunas dudas sobre las tareas de matemáticas de esta semana. ¿Sería posible que nos envíe algunos ejemplos adicionales para practicar en casa?\n\nGracias por su tiempo.\n\nFamilia ${students[1].user.profile.lastName}`,
    },
    // Comunicados del administrador
    {
      sender: admin,
      recipient: families[0],
      type: MessageType.ANNOUNCEMENT,
      priority: MessagePriority.HIGH,
      subject: 'Importante: Reunión de padres de familia',
      content: 'Estimadas familias,\n\nLes recordamos que la reunión general de padres de familia se realizará el próximo viernes 28 de junio a las 18:00 horas en el salón de actos.\n\nTemas a tratar:\n- Calendario del próximo curso\n- Nuevas actividades extraescolares\n- Mejoras en las instalaciones\n\nEsperamos contar con su asistencia.\n\nAdministración del Centro',
    },
    {
      sender: admin,
      recipient: teachers[0],
      type: MessageType.ANNOUNCEMENT,
      priority: MessagePriority.NORMAL,
      subject: 'Actualización del sistema de evaluaciones',
      content: 'Estimado equipo docente,\n\nInformamos que el sistema de evaluaciones ha sido actualizado con nuevas funcionalidades. Próximamente programaremos una sesión de capacitación.\n\nGracias por su colaboración.\n\nEquipo Administrativo',
    },
  ];

  // Crear mensajes
  for (const messageData of sampleMessages) {
    try {
      const existingMessage = await messageRepository.findOne({
        where: {
          senderId: messageData.sender.id,
          subject: messageData.subject,
        },
      });

      if (!existingMessage) {
        const message = messageRepository.create({
          ...messageData,
          senderId: messageData.sender.id,
          recipientId: messageData.recipient.id,
          relatedStudentId: messageData.relatedStudent?.id || null,
          isRead: Math.random() > 0.6, // 40% no leídos para simular realismo
          readAt: Math.random() > 0.6 ? new Date() : null,
        });

        await messageRepository.save(message);
        messagesCreated++;
        console.log(`✓ Mensaje creado: ${messageData.sender.profile.firstName} → ${messageData.recipient.profile.firstName} (${messageData.subject.substring(0, 30)}...)`);
      }
    } catch (error) {
      console.log(`→ Error creando mensaje: ${error.message}`);
    }
  }

  // ==================== NOTIFICACIONES DE PRUEBA ====================

  const sampleNotifications = [
    // Notificaciones de nuevas evaluaciones
    {
      user: families[0],
      triggeredBy: teachers[0],
      relatedStudent: students[0],
      type: NotificationType.EVALUATION,
      title: 'Nueva evaluación disponible',
      content: `Se ha publicado una nueva evaluación de ${students[0].user.profile.firstName} en Matemáticas para el 1º Trimestre.`,
      actionUrl: '/evaluations',
    },
    {
      user: families[1],
      triggeredBy: teachers[1],
      relatedStudent: students[1],
      type: NotificationType.EVALUATION,
      title: 'Evaluación actualizada',
      content: `La evaluación de ${students[1].user.profile.firstName} en Lengua y Literatura ha sido actualizada.`,
      actionUrl: '/evaluations',
    },
    // Notificaciones de mensajes
    {
      user: families[0],
      triggeredBy: teachers[0],
      type: NotificationType.MESSAGE,
      title: 'Nuevo mensaje del profesor',
      content: `Tiene un nuevo mensaje de ${teachers[0].profile.firstName} ${teachers[0].profile.lastName}`,
      actionUrl: '/messages',
    },
    {
      user: teachers[0],
      triggeredBy: families[0],
      type: NotificationType.MESSAGE,
      title: 'Respuesta de la familia',
      content: `La familia ${families[0].profile.lastName} ha respondido a su mensaje`,
      actionUrl: '/messages',
    },
    // Notificaciones académicas
    {
      user: families[0],
      triggeredBy: admin,
      type: NotificationType.ACADEMIC,
      title: 'Evento académico próximo',
      content: 'Recordatorio: Reunión de padres de familia este viernes a las 18:00 horas',
      actionUrl: '/events',
    },
    {
      user: families[1],
      triggeredBy: admin,
      type: NotificationType.ACADEMIC,
      title: 'Período de inscripciones abiertas',
      content: 'Las inscripciones para actividades extraescolares están abiertas hasta el 30 de junio',
      actionUrl: '/extracurriculars',
    },
    // Notificaciones del sistema
    {
      user: teachers[0],
      triggeredBy: admin,
      type: NotificationType.SYSTEM,
      title: 'Actualización del sistema',
      content: 'El sistema de evaluaciones ha sido actualizado con nuevas funcionalidades',
      actionUrl: '/system',
    },
    {
      user: families[2],
      type: NotificationType.REMINDER,
      title: 'Recordatorio de documentación',
      content: 'Recuerde entregar la documentación médica actualizada antes del 15 de julio',
      actionUrl: '/documents',
    },
  ];

  // Crear notificaciones
  for (const notificationData of sampleNotifications) {
    try {
      const existingNotification = await notificationRepository.findOne({
        where: {
          userId: notificationData.user.id,
          title: notificationData.title,
        },
      });

      if (!existingNotification) {
        const notification = notificationRepository.create({
          ...notificationData,
          userId: notificationData.user.id,
          triggeredById: notificationData.triggeredBy?.id || null,
          relatedStudentId: notificationData.relatedStudent?.id || null,
          // Simular que algunas notificaciones han sido leídas
          status: Math.random() > 0.7 ? NotificationStatus.READ : NotificationStatus.UNREAD,
          readAt: Math.random() > 0.7 ? new Date() : null,
        });

        await notificationRepository.save(notification);
        notificationsCreated++;
        console.log(`✓ Notificación creada: ${notificationData.user.profile.firstName} ← ${notificationData.title}`);
      }
    } catch (error) {
      console.log(`→ Error creando notificación: ${error.message}`);
    }
  }

  // ==================== MENSAJES GRUPALES ====================

  if (classGroups.length > 0) {
    try {
      const groupMessage = messageRepository.create({
        sender: teachers[0],
        senderId: teachers[0].id,
        targetGroup: classGroups[0],
        targetGroupId: classGroups[0].id,
        type: MessageType.GROUP,
        priority: MessagePriority.NORMAL,
        subject: `Comunicado para el grupo ${classGroups[0].name}`,
        content: `Estimadas familias del grupo ${classGroups[0].name},\n\nLes informamos que la próxima semana tendremos evaluaciones de fin de trimestre. Les recomendamos repasar los temas vistos en clase.\n\nCualquier duda, estoy a su disposición.\n\nSaludos cordiales,\n${teachers[0].profile.firstName} ${teachers[0].profile.lastName}`,
        isRead: false,
      });

      await messageRepository.save(groupMessage);
      messagesCreated++;
      console.log(`✓ Mensaje grupal creado para: ${classGroups[0].name}`);
    } catch (error) {
      console.log(`→ Error creando mensaje grupal: ${error.message}`);
    }
  }

  console.log(`✓ Sistema de comunicaciones completado: ${messagesCreated} mensajes y ${notificationsCreated} notificaciones creadas`);
};