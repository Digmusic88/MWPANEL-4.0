/**
 * @archivo: CreateAttendanceNotificationTemplates.ts
 * @función: Migración para crear plantillas de email para notificaciones de asistencia
 * @creado_por: Sistema de Notificaciones de Asistencia MW Panel 2.0
 * @fecha: 2025-01-26
 * @descripción: Crea plantillas para notificar a profesores sobre nuevas solicitudes y a familias sobre revisiones
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttendanceNotificationTemplates1753450000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Plantilla para notificar a profesores sobre nueva solicitud de asistencia
    await queryRunner.query(`
      INSERT INTO email_templates (
        id,
        name,
        type,
        subject,
        "htmlContent",
        "textContent",
        "availableVariables",
        "isActive",
        "isSystem",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        'Solicitud de Asistencia - Profesor',
        'attendance_request_teacher',
        '📝 Nueva solicitud de justificación de {{studentName}}',
        $template$
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nueva Solicitud de Justificación</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            background-color: #f8f9ff;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #ff7675 0%, #fd79a8 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .content {
            padding: 30px;
            line-height: 1.6;
        }
        .request-info {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .request-info h2 {
            color: #2d3748;
            margin: 0 0 15px 0;
            font-size: 20px;
        }
        .student-info {
            display: flex;
            align-items: center;
            margin: 15px 0;
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }
        .student-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 15px;
            font-size: 18px;
        }
        .student-details {
            flex: 1;
        }
        .student-name {
            font-weight: bold;
            color: #2d3748;
            margin-bottom: 5px;
            font-size: 18px;
        }
        .student-class {
            font-size: 14px;
            color: #718096;
        }
        .request-details {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .detail-label {
            font-weight: bold;
            color: #4a5568;
            min-width: 120px;
        }
        .detail-value {
            color: #2d3748;
            text-align: right;
        }
        .reason-text {
            background-color: #e8f4fd;
            border: 1px solid #74b9ff;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            font-style: italic;
            color: #2d3748;
            line-height: 1.5;
        }
        .cta-container {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            background-color: #0984e3;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            margin: 10px;
            font-weight: bold;
            text-align: center;
        }
        .cta-approve {
            background-color: #00b894;
        }
        .cta-reject {
            background-color: #e17055;
        }
        .footer {
            background-color: #f1f2f6;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #636e72;
        }
        .emoji {
            font-size: 1.5em;
            margin: 0 5px;
        }
        .timestamp {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 5px;
        }
        .urgent {
            background-color: #fee;
            border-left-color: #e74c3c;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><span class="emoji">📝</span> Nueva Solicitud <span class="emoji">⏰</span></h1>
        </div>

        <div class="content">
            <p>¡Hola <strong>{{teacherName}}</strong>!</p>

            <div class="request-info">
                <h2>Nueva solicitud de justificación pendiente de revisión</h2>

                <div class="student-info">
                    <div class="student-avatar">
                        {{studentInitials}}
                    </div>
                    <div class="student-details">
                        <div class="student-name">{{studentName}}</div>
                        <div class="student-class">{{studentClass}}</div>
                        <div class="timestamp">Solicitado por: {{familyName}} • {{requestDate}}</div>
                    </div>
                </div>

                <div class="request-details">
                    <div class="detail-row">
                        <span class="detail-label">📅 Fecha:</span>
                        <span class="detail-value">{{absenceDate}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">📋 Tipo:</span>
                        <span class="detail-value">{{requestTypeLabel}}</span>
                    </div>
                    {{#if expectedArrivalTime}}
                    <div class="detail-row">
                        <span class="detail-label">🕘 Llegada esperada:</span>
                        <span class="detail-value">{{expectedArrivalTime}}</span>
                    </div>
                    {{/if}}
                    {{#if expectedDepartureTime}}
                    <div class="detail-row">
                        <span class="detail-label">🕐 Salida esperada:</span>
                        <span class="detail-value">{{expectedDepartureTime}}</span>
                    </div>
                    {{/if}}
                </div>

                <div class="reason-text">
                    <strong>💬 Motivo de la solicitud:</strong><br>
                    "{{reason}}"
                </div>
            </div>

            <p>Puedes revisar y aprobar/rechazar esta solicitud directamente desde la plataforma:</p>

            <div class="cta-container">
                <a href="{{platformUrl}}/attendance/requests" class="cta-button">
                    📋 Revisar Solicitudes
                </a>
            </div>

            <p style="font-size: 14px; color: #718096; margin-top: 25px;">
                <strong>💡 Recordatorio:</strong> Las solicitudes de justificación requieren tu revisión para mantener el registro de asistencia actualizado.
            </p>

            <p style="margin-top: 30px; font-style: italic; color: #636e72;">
                "La comunicación entre familia y escuela es fundamental para el bienestar del estudiante."
            </p>
        </div>

        <div class="footer">
            <p>Este mensaje fue enviado automáticamente por el sistema de {{schoolName}}</p>
            <p>📚 Manteniendo la comunicación educativa fluida 🎓</p>
        </div>
    </div>
</body>
</html>
$template$,
        $textTemplate$
¡Hola {{teacherName}}!

📝 NUEVA SOLICITUD DE JUSTIFICACIÓN ⏰

Nueva solicitud de justificación pendiente de revisión:

👤 Estudiante: {{studentName}} ({{studentClass}})
👨‍👩‍👧‍👦 Familia: {{familyName}}
📅 Fecha solicitada: {{absenceDate}}
📋 Tipo: {{requestTypeLabel}}
{{#if expectedArrivalTime}}🕘 Llegada esperada: {{expectedArrivalTime}}{{/if}}
{{#if expectedDepartureTime}}🕐 Salida esperada: {{expectedDepartureTime}}{{/if}}
⏰ Fecha de solicitud: {{requestDate}}

💬 Motivo:
"{{reason}}"

Para revisar y aprobar/rechazar esta solicitud, accede a la plataforma:
{{platformUrl}}/attendance/requests

💡 Recordatorio: Las solicitudes de justificación requieren tu revisión para mantener el registro de asistencia actualizado.

"La comunicación entre familia y escuela es fundamental para el bienestar del estudiante."

Este mensaje fue enviado automáticamente por el sistema de {{schoolName}}
📚 Manteniendo la comunicación educativa fluida 🎓
$textTemplate$,
        '["teacherName", "studentName", "studentInitials", "studentClass", "familyName", "requestDate", "absenceDate", "requestTypeLabel", "reason", "expectedArrivalTime", "expectedDepartureTime", "platformUrl", "schoolName"]',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (type) DO UPDATE SET
        "htmlContent" = EXCLUDED."htmlContent",
        "textContent" = EXCLUDED."textContent",
        "availableVariables" = EXCLUDED."availableVariables",
        "updatedAt" = NOW()
    `);

    // Plantilla para notificar a familias sobre la revisión de su solicitud
    await queryRunner.query(`
      INSERT INTO email_templates (
        id,
        name,
        type,
        subject,
        "htmlContent",
        "textContent",
        "availableVariables",
        "isActive",
        "isSystem",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        'Respuesta Solicitud Asistencia - Familia',
        'attendance_request_reviewed',
        '{{#if isApproved}}✅ Solicitud APROBADA{{else}}❌ Solicitud RECHAZADA{{/if}} - {{studentName}}',
        $template$
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Respuesta a Solicitud de Justificación</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            background-color: #f8f9ff;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header.approved {
            background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
        }
        .header.rejected {
            background: linear-gradient(135deg, #e17055 0%, #fd79a8 100%);
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .content {
            padding: 30px;
            line-height: 1.6;
        }
        .status-info {
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .status-info.approved {
            background-color: #d4edda;
            border-left: 4px solid #00b894;
        }
        .status-info.rejected {
            background-color: #f8d7da;
            border-left: 4px solid #e17055;
        }
        .status-info h2 {
            color: #2d3748;
            margin: 0 0 15px 0;
            font-size: 20px;
        }
        .student-info {
            display: flex;
            align-items: center;
            margin: 15px 0;
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }
        .student-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 15px;
            font-size: 18px;
        }
        .student-details {
            flex: 1;
        }
        .student-name {
            font-weight: bold;
            color: #2d3748;
            margin-bottom: 5px;
            font-size: 18px;
        }
        .student-class {
            font-size: 14px;
            color: #718096;
        }
        .request-summary {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .detail-label {
            font-weight: bold;
            color: #4a5568;
            min-width: 120px;
        }
        .detail-value {
            color: #2d3748;
            text-align: right;
        }
        .review-note {
            background-color: #e8f4fd;
            border: 1px solid #74b9ff;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            color: #2d3748;
            line-height: 1.5;
        }
        .teacher-info {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 10px;
            background-color: #f1f3f4;
            border-radius: 8px;
        }
        .teacher-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 15px;
        }
        .teacher-details {
            flex: 1;
        }
        .teacher-name {
            font-weight: bold;
            color: #2d3748;
            margin-bottom: 2px;
        }
        .teacher-role {
            font-size: 14px;
            color: #718096;
        }
        .cta-container {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            background-color: #0984e3;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            margin: 10px;
            font-weight: bold;
            text-align: center;
        }
        .footer {
            background-color: #f1f2f6;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #636e72;
        }
        .emoji {
            font-size: 1.5em;
            margin: 0 5px;
        }
        .timestamp {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header {{#if isApproved}}approved{{else}}rejected{{/if}}">
            <h1>
                {{#if isApproved}}
                <span class="emoji">✅</span> Solicitud Aprobada <span class="emoji">🎉</span>
                {{else}}
                <span class="emoji">❌</span> Solicitud Rechazada <span class="emoji">📋</span>
                {{/if}}
            </h1>
        </div>

        <div class="content">
            <p>¡Hola <strong>{{familyName}}</strong>!</p>

            <div class="status-info {{#if isApproved}}approved{{else}}rejected{{/if}}">
                <h2>
                    {{#if isApproved}}
                    ✅ Tu solicitud de justificación ha sido APROBADA
                    {{else}}
                    ❌ Tu solicitud de justificación ha sido RECHAZADA
                    {{/if}}
                </h2>

                <div class="student-info">
                    <div class="student-avatar">
                        {{studentInitials}}
                    </div>
                    <div class="student-details">
                        <div class="student-name">{{studentName}}</div>
                        <div class="student-class">{{studentClass}}</div>
                        <div class="timestamp">Revisado: {{reviewDate}}</div>
                    </div>
                </div>

                <div class="request-summary">
                    <div class="detail-row">
                        <span class="detail-label">📅 Fecha solicitada:</span>
                        <span class="detail-value">{{absenceDate}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">📋 Tipo:</span>
                        <span class="detail-value">{{requestTypeLabel}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">📝 Estado:</span>
                        <span class="detail-value">
                            {{#if isApproved}}
                            ✅ APROBADA
                            {{else}}
                            ❌ RECHAZADA
                            {{/if}}
                        </span>
                    </div>
                </div>

                <div class="teacher-info">
                    <div class="teacher-avatar">
                        {{teacherInitials}}
                    </div>
                    <div class="teacher-details">
                        <div class="teacher-name">{{teacherName}}</div>
                        <div class="teacher-role">{{teacherRole}}</div>
                    </div>
                </div>

                {{#if reviewNote}}
                <div class="review-note">
                    <strong>💬 Comentario del profesor:</strong><br>
                    "{{reviewNote}}"
                </div>
                {{/if}}
            </div>

            {{#if isApproved}}
            <p>🎉 <strong>¡Excelente!</strong> La justificación ha sido registrada en el sistema de asistencia.</p>
            {{else}}
            <p>📝 Para más información sobre los motivos del rechazo, puedes contactar directamente con el profesor o la administración.</p>
            {{/if}}

            <div class="cta-container">
                <a href="{{platformUrl}}/attendance/family" class="cta-button">
                    📊 Ver Historial de Asistencia
                </a>
            </div>

            <p style="font-size: 14px; color: #718096; margin-top: 25px;">
                <strong>💡 Recordatorio:</strong> Puedes crear nuevas solicitudes de justificación desde tu panel familiar en la plataforma.
            </p>

            <p style="margin-top: 30px; font-style: italic; color: #636e72;">
                "La colaboración entre familia y escuela fortalece el proceso educativo."
            </p>
        </div>

        <div class="footer">
            <p>Este mensaje fue enviado automáticamente por el sistema de {{schoolName}}</p>
            <p>👨‍👩‍👧‍👦 Manteniendo a las familias informadas 🎓</p>
        </div>
    </div>
</body>
</html>
$template$,
        $textTemplate$
¡Hola {{familyName}}!

{{#if isApproved}}✅ SOLICITUD APROBADA 🎉{{else}}❌ SOLICITUD RECHAZADA 📋{{/if}}

{{#if isApproved}}
✅ Tu solicitud de justificación ha sido APROBADA
{{else}}
❌ Tu solicitud de justificación ha sido RECHAZADA
{{/if}}

👤 Estudiante: {{studentName}} ({{studentClass}})
📅 Fecha solicitada: {{absenceDate}}
📋 Tipo: {{requestTypeLabel}}
📝 Estado: {{#if isApproved}}✅ APROBADA{{else}}❌ RECHAZADA{{/if}}
⏰ Revisado: {{reviewDate}}

👨‍🏫 Revisado por: {{teacherName}} ({{teacherRole}})

{{#if reviewNote}}
💬 Comentario del profesor:
"{{reviewNote}}"
{{/if}}

{{#if isApproved}}
🎉 ¡Excelente! La justificación ha sido registrada en el sistema de asistencia.
{{else}}
📝 Para más información sobre los motivos del rechazo, puedes contactar directamente con el profesor o la administración.
{{/if}}

Para ver el historial completo de asistencia, accede a la plataforma:
{{platformUrl}}/attendance/family

💡 Recordatorio: Puedes crear nuevas solicitudes de justificación desde tu panel familiar en la plataforma.

"La colaboración entre familia y escuela fortalece el proceso educativo."

Este mensaje fue enviado automáticamente por el sistema de {{schoolName}}
👨‍👩‍👧‍👦 Manteniendo a las familias informadas 🎓
$textTemplate$,
        '["familyName", "studentName", "studentInitials", "studentClass", "absenceDate", "requestTypeLabel", "reviewDate", "teacherName", "teacherInitials", "teacherRole", "reviewNote", "isApproved", "platformUrl", "schoolName"]',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (type) DO UPDATE SET
        "htmlContent" = EXCLUDED."htmlContent",
        "textContent" = EXCLUDED."textContent",
        "availableVariables" = EXCLUDED."availableVariables",
        "updatedAt" = NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM email_templates WHERE type IN ('attendance_request_teacher', 'attendance_request_reviewed')
    `);
  }
}