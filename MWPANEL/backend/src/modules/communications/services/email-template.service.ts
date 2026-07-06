/**
 * @archivo: email-template.service.ts
 * @módulo: Communications - Email Notifications System
 * @función: Servicio para gestión de plantillas de correo
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @dependencias: EmailTemplate entity
 * @propósito: CRUD y gestión de plantillas dinámicas de correo HTML
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate, EmailTemplateType } from '../entities/email-template.entity';

import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from '../dto/email-template.dto';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
  ) {}

  /**
   * Crea una nueva plantilla de correo
   */
  async createTemplate(createDto: CreateEmailTemplateDto): Promise<EmailTemplate> {
    const template = this.emailTemplateRepository.create({
      ...createDto,
      availableVariables: createDto.availableVariables ? JSON.stringify(createDto.availableVariables) : null,
    });

    const savedTemplate = await this.emailTemplateRepository.save(template);
    this.logger.log(`✅ Created email template: ${savedTemplate.name}`);
    
    return savedTemplate;
  }

  /**
   * Actualiza una plantilla existente
   */
  async updateTemplate(id: string, updateDto: UpdateEmailTemplateDto): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOne({ where: { id } });
    
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    // Permitir edición de todas las plantillas - las plantillas del sistema ahora son editables
    // if (template.isSystem && (updateDto.htmlContent || updateDto.textContent)) {
    //   throw new Error('Cannot modify core content of system templates');
    // }

    Object.assign(template, {
      ...updateDto,
      availableVariables: updateDto.availableVariables ? JSON.stringify(updateDto.availableVariables) : template.availableVariables,
    });

    const savedTemplate = await this.emailTemplateRepository.save(template);
    this.logger.log(`✅ Updated email template: ${savedTemplate.name}`);
    
    return savedTemplate;
  }

  /**
   * Obtiene todas las plantillas
   */
  async getAllTemplates(): Promise<EmailTemplate[]> {
    return await this.emailTemplateRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['createdBy', 'lastEditedBy'],
    });
  }

  /**
   * Obtiene plantillas activas
   */
  async getActiveTemplates(): Promise<EmailTemplate[]> {
    return await this.emailTemplateRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Obtiene una plantilla por ID
   */
  async getTemplateById(id: string): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOne({
      where: { id },
      relations: ['createdBy', 'lastEditedBy'],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Obtiene una plantilla por tipo
   */
  async getTemplateByType(type: EmailTemplateType): Promise<EmailTemplate | null> {
    return await this.emailTemplateRepository.findOne({
      where: { type, isActive: true },
    });
  }

  /**
   * Clona una plantilla existente
   */
  async cloneTemplate(id: string, newName: string, userId?: string): Promise<EmailTemplate> {
    const originalTemplate = await this.getTemplateById(id);
    
    const clonedTemplate = this.emailTemplateRepository.create({
      name: newName,
      type: originalTemplate.type,
      subject: `[COPIA] ${originalTemplate.subject}`,
      htmlContent: originalTemplate.htmlContent,
      textContent: originalTemplate.textContent,
      availableVariables: originalTemplate.availableVariables,
      isActive: false, // Las clones empiezan inactivas
      isSystem: false, // Las clones nunca son del sistema
      createdById: userId,
    });

    const savedTemplate = await this.emailTemplateRepository.save(clonedTemplate);
    this.logger.log(`✅ Cloned email template: ${originalTemplate.name} -> ${newName}`);
    
    return savedTemplate;
  }

  /**
   * Elimina una plantilla (solo si no es del sistema)
   */
  async deleteTemplate(id: string): Promise<void> {
    const template = await this.getTemplateById(id);
    
    // Permitir eliminación de todas las plantillas - las plantillas del sistema ahora son editables
    // if (template.isSystem) {
    //   throw new Error('Cannot delete system templates');
    // }

    await this.emailTemplateRepository.remove(template);
    this.logger.log(`🗑️ Deleted email template: ${template.name}`);
  }

  /**
   * Activa/desactiva una plantilla
   */
  async toggleTemplateActive(id: string): Promise<EmailTemplate> {
    const template = await this.getTemplateById(id);
    template.isActive = !template.isActive;
    
    const savedTemplate = await this.emailTemplateRepository.save(template);
    this.logger.log(`🔄 Toggled template active status: ${template.name} -> ${template.isActive}`);
    
    return savedTemplate;
  }

  /**
   * Obtiene variables disponibles para un tipo de plantilla
   */
  getAvailableVariablesForType(type: EmailTemplateType): string[] {
    const commonVariables = [
      'userName', 'userEmail', 'userRole',
      'schoolName', 'platformUrl', 'logoUrl',
      'currentDate', 'currentYear',
      'supportEmail', 'unsubscribeUrl'
    ];

    const typeSpecificVariables: Record<EmailTemplateType, string[]> = {
      [EmailTemplateType.GRADE_NOTIFICATION]: ['gradeName', 'gradeValue', 'subjectName', 'teacherName'],
      [EmailTemplateType.ASSIGNMENT_REMINDER]: ['assignmentTitle', 'dueDate', 'subjectName', 'description'],
      [EmailTemplateType.EVENT_REMINDER]: ['eventTitle', 'eventDate', 'eventLocation', 'eventDescription'],
      [EmailTemplateType.MESSAGE_FROM_TEACHER]: ['messageContent', 'teacherName', 'replyUrl'],
      
      [EmailTemplateType.CHILD_GRADE_UPDATE]: [
        'recipientName', 'studentFullName', 'gradeDate', 'subjectName', 
        'activityName', 'gradeValue', 'gradeScale', 'passingThreshold', 
        'teacherName', 'teacherComments', 'isPassing', 'achievementLevel',
        'currentDate', 'period'
      ],
      [EmailTemplateType.CHILD_ABSENCE]: ['childName', 'absenceDate', 'absenceReason', 'teacherName'],
      [EmailTemplateType.CHILD_TASK_OVERDUE]: ['studentName', 'taskTitle', 'dueDate', 'subjectName', 'teacherName', 'daysOverdue'],
      [EmailTemplateType.SCHOOL_EVENT]: ['eventTitle', 'eventDate', 'eventLocation', 'eventDescription'],
      [EmailTemplateType.TEACHER_MESSAGE]: ['teacherName', 'messageContent', 'childName', 'replyUrl'],
      
      [EmailTemplateType.NEW_ASSIGNMENT]: ['assignmentTitle', 'className', 'dueDate', 'adminName'],
      [EmailTemplateType.ADMIN_MESSAGE]: ['messageContent', 'adminName', 'urgencyLevel'],
      [EmailTemplateType.SYSTEM_INCIDENT]: ['incidentType', 'incidentDescription', 'resolvedDate'],
      
      [EmailTemplateType.SYSTEM_ERROR]: ['errorType', 'errorMessage', 'timestamp', 'affectedUsers'],
      [EmailTemplateType.BACKUP_REPORT]: ['backupStatus', 'backupDate', 'backupSize', 'nextBackupDate'],
      [EmailTemplateType.USER_ACTIVITY]: ['activityType', 'userName', 'timestamp', 'details'],
      
      [EmailTemplateType.WELCOME]: ['temporaryPassword', 'loginUrl', 'firstSteps'],
      [EmailTemplateType.WELCOME_FAMILY]: ['userName', 'fullName', 'email', 'password', 'platformUrl', 'loginUrl', 'supportEmail'],
      [EmailTemplateType.PASSWORD_RESET]: ['resetToken', 'resetUrl', 'expiryTime'],
      [EmailTemplateType.SYSTEM_MAINTENANCE]: ['maintenanceStart', 'maintenanceEnd', 'expectedDowntime'],
      [EmailTemplateType.BIRTHDAY_GREETING]: ['birthDate', 'age', 'wishMessage'],
      [EmailTemplateType.NEW_MESSAGE_NOTIFICATION]: ['senderName', 'senderRole', 'senderInitials', 'messageDate', 'messageSubject', 'messagePreview'],
      [EmailTemplateType.ATTENDANCE_REQUEST_TEACHER]: ['teacherName', 'studentName', 'studentInitials', 'studentClass', 'familyName', 'requestDate', 'absenceDate', 'requestTypeLabel', 'reason', 'expectedArrivalTime', 'expectedDepartureTime'],
      [EmailTemplateType.ATTENDANCE_REQUEST_REVIEWED]: ['familyName', 'studentName', 'studentInitials', 'studentClass', 'absenceDate', 'requestTypeLabel', 'reviewDate', 'teacherName', 'teacherInitials', 'teacherRole', 'reviewNote', 'isApproved'],
      [EmailTemplateType.CUSTOM]: [],
    };

    return [...commonVariables, ...(typeSpecificVariables[type] || [])];
  }

  /**
   * Inicializa plantillas del sistema por defecto
   */
  async initializeSystemTemplates(): Promise<void> {
    this.logger.log('🔧 Initializing system email templates...');

    const systemTemplates = await this.getSystemTemplateDefinitions();

    for (const templateDef of systemTemplates) {
      const existing = await this.emailTemplateRepository.findOne({
        where: { type: templateDef.type, isSystem: true },
      });

      if (!existing) {
        await this.createTemplate({
          ...templateDef,
          isActive: true,
        });
      }
    }

    this.logger.log('✅ System email templates initialized');
  }

  /**
   * Definiciones de plantillas del sistema
   */
  private async getSystemTemplateDefinitions(): Promise<CreateEmailTemplateDto[]> {
    return [
      {
        name: 'Bienvenida al Sistema',
        type: EmailTemplateType.WELCOME,
        subject: 'Bienvenido a {{schoolName}}',
        htmlContent: await this.getWelcomeTemplateHtml(),
        textContent: await this.getWelcomeTemplateText(),
        availableVariables: this.getAvailableVariablesForType(EmailTemplateType.WELCOME),
      },
      {
        name: 'Recuperación de Contraseña',
        type: EmailTemplateType.PASSWORD_RESET,
        subject: 'Restablecer contraseña - {{schoolName}}',
        htmlContent: await this.getPasswordResetTemplateHtml(),
        textContent: await this.getPasswordResetTemplateText(),
        availableVariables: this.getAvailableVariablesForType(EmailTemplateType.PASSWORD_RESET),
      },
      // Agregar más plantillas del sistema según sea necesario
    ];
  }

  private async getWelcomeTemplateHtml(): Promise<string> {
    return `
      <mjml>
        <mj-head>
          <mj-title>Bienvenido a {{schoolName}}</mj-title>
          <mj-preview>Tu cuenta ha sido creada exitosamente</mj-preview>
        </mj-head>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-image width="200px" src="{{logoUrl}}" alt="{{schoolName}}"></mj-image>
              <mj-text font-size="24px" color="#4CAF50" align="center">
                ¡Bienvenido a {{schoolName}}!
              </mj-text>
              <mj-text>
                Hola {{userName}},
              </mj-text>
              <mj-text>
                Tu cuenta ha sido creada exitosamente. Puedes acceder a la plataforma con las siguientes credenciales:
              </mj-text>
              <mj-text>
                <strong>Email:</strong> {{userEmail}}<br>
                <strong>Contraseña temporal:</strong> {{temporaryPassword}}
              </mj-text>
              <mj-button href="{{loginUrl}}" background-color="#4CAF50">
                Acceder a la Plataforma
              </mj-button>
              <mj-text font-size="12px" color="#666">
                Este es un mensaje automático. No responda a este correo.
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `;
  }

  private async getWelcomeTemplateText(): Promise<string> {
    return `
¡Bienvenido a {{schoolName}}!

Hola {{userName}},

Tu cuenta ha sido creada exitosamente. Puedes acceder a la plataforma con las siguientes credenciales:

Email: {{userEmail}}
Contraseña temporal: {{temporaryPassword}}

Accede a la plataforma en: {{loginUrl}}

---
{{schoolName}}
{{supportEmail}}

Este es un mensaje automático. No responda a este correo.
    `.trim();
  }

  private async getPasswordResetTemplateHtml(): Promise<string> {
    return `
      <mjml>
        <mj-head>
          <mj-title>Restablecer contraseña</mj-title>
        </mj-head>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-image width="200px" src="{{logoUrl}}" alt="{{schoolName}}"></mj-image>
              <mj-text font-size="20px" color="#FF9800" align="center">
                Restablecer Contraseña
              </mj-text>
              <mj-text>
                Hola {{userName}},
              </mj-text>
              <mj-text>
                Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:
              </mj-text>
              <mj-button href="{{resetUrl}}" background-color="#FF9800">
                Restablecer Contraseña
              </mj-button>
              <mj-text>
                Este enlace expirará en {{expiryTime}}.
              </mj-text>
              <mj-text font-size="12px" color="#666">
                Si no solicitaste este cambio, ignora este correo.
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `;
  }

  private async getPasswordResetTemplateText(): Promise<string> {
    return `
Restablecer Contraseña - {{schoolName}}

Hola {{userName}},

Has solicitado restablecer tu contraseña. Visita el siguiente enlace para crear una nueva contraseña:

{{resetUrl}}

Este enlace expirará en {{expiryTime}}.

Si no solicitaste este cambio, ignora este correo.

---
{{schoolName}}
{{supportEmail}}
    `.trim();
  }
}