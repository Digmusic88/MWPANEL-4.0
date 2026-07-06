/**
 * @archivo: overdue-task-template.seed.ts
 * @módulo: Database - Email Template Seed
 * @función: Seed para crear plantilla de correo de tareas vencidas
 * @creado_por: Sistema de Automatización de Emails MW Panel 2.0
 * @fecha: 2025-07-18
 */

import { DataSource } from 'typeorm';
import { EmailTemplate, EmailTemplateType } from '../../modules/communications/entities/email-template.entity';
import { User } from '../../modules/users/entities/user.entity';

export async function seedOverdueTaskTemplate(dataSource: DataSource): Promise<void> {
  console.log('🌱 Seeding overdue task email template...');
  
  const templateRepository = dataSource.getRepository(EmailTemplate);
  const userRepository = dataSource.getRepository(User);

  // Buscar el usuario admin para asignar la plantilla
  const adminUser = await userRepository.findOne({
    where: { email: 'admin@mwpanel.com' }
  });

  if (!adminUser) {
    console.log('⚠️ Admin user not found, skipping overdue task template seed');
    return;
  }

  // Verificar si ya existe la plantilla
  const existingTemplate = await templateRepository.findOne({
    where: { type: EmailTemplateType.CHILD_TASK_OVERDUE }
  });

  if (existingTemplate) {
    console.log('ℹ️ Overdue task template already exists, skipping...');
    return;
  }

  // Crear la plantilla de correo para tareas vencidas
  const templateData = {
    name: 'Notificación de Tarea No Entregada',
    type: EmailTemplateType.CHILD_TASK_OVERDUE,
    subject: '📋 Recordatorio: {{studentName}} tiene una tarea pendiente de entrega',
    htmlContent: `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tarea No Entregada - MW Panel</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e74c3c;
            }
            .header h1 {
                color: #e74c3c;
                margin: 0;
                font-size: 24px;
            }
            .header .icon {
                font-size: 48px;
                margin-bottom: 10px;
            }
            .alert-box {
                background: #fee;
                border: 1px solid #e74c3c;
                border-radius: 5px;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid #e74c3c;
            }
            .task-info {
                background: #f8f9fa;
                border-radius: 5px;
                padding: 20px;
                margin: 20px 0;
            }
            .task-info h3 {
                color: #2c3e50;
                margin-top: 0;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            .info-row:last-child {
                border-bottom: none;
            }
            .label {
                font-weight: bold;
                color: #7f8c8d;
            }
            .value {
                color: #2c3e50;
            }
            .overdue-badge {
                background: #e74c3c;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
            }
            .actions {
                margin-top: 30px;
                text-align: center;
            }
            .button {
                display: inline-block;
                padding: 12px 24px;
                background: #3498db;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 0 10px;
            }
            .button:hover {
                background: #2980b9;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ecf0f1;
                font-size: 12px;
                color: #7f8c8d;
                text-align: center;
            }
            .greeting {
                font-size: 16px;
                margin-bottom: 20px;
            }
            @media (max-width: 600px) {
                .container {
                    padding: 20px;
                }
                .info-row {
                    flex-direction: column;
                }
                .button {
                    display: block;
                    margin: 10px 0;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="icon">📋</div>
                <h1>Tarea No Entregada</h1>
                <p>Notificación del sistema educativo</p>
            </div>

            <div class="greeting">
                <p>Estimado/a <strong>{{recipientName}}</strong>,</p>
            </div>

            <div class="alert-box">
                <h3>🚨 Atención Requerida</h3>
                <p>Le informamos que <strong>{{studentName}}</strong> tiene una tarea pendiente que no ha sido entregada dentro del plazo establecido.</p>
            </div>

            <div class="task-info">
                <h3>📝 Detalles de la Tarea</h3>
                
                <div class="info-row">
                    <span class="label">👤 Estudiante:</span>
                    <span class="value">{{studentName}}</span>
                </div>
                
                <div class="info-row">
                    <span class="label">📚 Asignatura:</span>
                    <span class="value">{{subjectName}}</span>
                </div>
                
                <div class="info-row">
                    <span class="label">📋 Nombre de la Tarea:</span>
                    <span class="value">{{taskTitle}}</span>
                </div>
                
                <div class="info-row">
                    <span class="label">📝 Descripción:</span>
                    <span class="value">{{taskDescription}}</span>
                </div>
                
                <div class="info-row">
                    <span class="label">📅 Fecha Límite:</span>
                    <span class="value">{{dueDate}}</span>
                </div>
                
                <div class="info-row">
                    <span class="label">⏰ Días de Retraso:</span>
                    <span class="value">
                        <span class="overdue-badge">{{daysOverdue}} días</span>
                    </span>
                </div>
                
                <div class="info-row">
                    <span class="label">👨‍🏫 Profesor:</span>
                    <span class="value">{{teacherName}}</span>
                </div>
            </div>

            <div style="background: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #27ae60; margin-top: 0;">💡 Recomendaciones</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Contacte con {{studentName}} para conocer el estado de la tarea</li>
                    <li>Si es necesario, póngase en contacto con {{teacherName}} para aclarar dudas</li>
                    <li>Ayude a {{studentName}} a organizar mejor sus tareas y horarios</li>
                    <li>Considere establecer recordatorios para futuras entregas</li>
                </ul>
            </div>

            <div class="actions">
                <a href="https://plataforma.mundoworld.school/family" class="button">
                    🏠 Acceder al Portal Familiar
                </a>
                <a href="https://plataforma.mundoworld.school/family/tasks" class="button">
                    📋 Ver Todas las Tareas
                </a>
            </div>

            <div class="footer">
                <p>
                    <strong>MW Panel - Sistema de Gestión Escolar</strong><br>
                    Este es un mensaje automático del sistema. No responda a este correo.<br>
                    Para contactar con el centro educativo, utilice los canales oficiales disponibles en la plataforma.
                </p>
                <p style="margin-top: 15px;">
                    <em>Fecha de envío: {{currentDate}}</em>
                </p>
            </div>
        </div>
    </body>
    </html>
    `,
    textContent: 'Estimado/a {{recipientName}}, le informamos que {{studentName}} tiene una tarea pendiente: {{taskTitle}} de la asignatura {{subjectName}}, que debía entregarse el {{dueDate}} ({{daysOverdue}} días de retraso). Profesor: {{teacherName}}. Por favor, contacte con el estudiante para resolver esta situación.',
    availableVariables: JSON.stringify([
      'recipientName', 'studentName', 'taskTitle', 'taskDescription', 
      'dueDate', 'subjectName', 'teacherName', 'daysOverdue', 'currentDate'
    ]),
    isActive: true,
    createdBy: adminUser,
    createdById: adminUser.id
  };

  const template = templateRepository.create(templateData);
  await templateRepository.save(template);

  console.log('✅ Overdue task email template created successfully');
}