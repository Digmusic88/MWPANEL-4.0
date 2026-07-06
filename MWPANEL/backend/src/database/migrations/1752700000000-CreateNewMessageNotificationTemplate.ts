import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNewMessageNotificationTemplate1752700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert new message notification template
    await queryRunner.query(`
      INSERT INTO email_templates (
        id,
        name,
        description,
        type,
        subject,
        html_content,
        text_content,
        available_variables,
        is_active,
        is_system,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        'Notificación de Mensaje Nuevo',
        'Plantilla para notificar sobre mensajes nuevos en la plataforma',
        'new_message_notification',
        '💬 Tienes un nuevo mensaje de {{senderName}}',
        $template$
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nuevo Mensaje</title>
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        .message-info {
            background-color: #e8f4fd;
            border-left: 4px solid #74b9ff;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .message-info h2 {
            color: #2d3748;
            margin: 0 0 10px 0;
            font-size: 20px;
        }
        .message-preview {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            font-style: italic;
            color: #4a5568;
        }
        .sender-info {
            display: flex;
            align-items: center;
            margin: 15px 0;
        }
        .sender-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 15px;
        }
        .sender-details {
            flex: 1;
        }
        .sender-name {
            font-weight: bold;
            color: #2d3748;
            margin-bottom: 2px;
        }
        .sender-role {
            font-size: 14px;
            color: #718096;
        }
        .cta-button {
            display: inline-block;
            background-color: #00b894;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            margin: 20px 0;
            font-weight: bold;
            text-align: center;
        }
        .cta-container {
            text-align: center;
            margin: 30px 0;
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
        <div class="header">
            <h1><span class="emoji">💬</span> ¡Nuevo Mensaje! <span class="emoji">📩</span></h1>
        </div>

        <div class="content">
            <p>¡Hola <strong>{{userName}}</strong>!</p>

            <div class="message-info">
                <h2>Tienes un nuevo mensaje en la plataforma</h2>

                <div class="sender-info">
                    <div class="sender-avatar">
                        {{senderInitials}}
                    </div>
                    <div class="sender-details">
                        <div class="sender-name">{{senderName}}</div>
                        <div class="sender-role">{{senderRole}}</div>
                        <div class="timestamp">{{messageDate}}</div>
                    </div>
                </div>

                {{#if messageSubject}}
                <p><strong>Asunto:</strong> {{messageSubject}}</p>
                {{/if}}

                {{#if messagePreview}}
                <div class="message-preview">
                    "{{messagePreview}}"
                </div>
                {{/if}}
            </div>

            <p>Para leer el mensaje completo y responder, accede a la plataforma haciendo clic en el botón siguiente:</p>

            <div class="cta-container">
                <a href="{{platformUrl}}/messages" class="cta-button">
                    📨 Ver Mensaje Completo
                </a>
            </div>

            <p style="font-size: 14px; color: #718096; margin-top: 25px;">
                <strong>💡 Consejo:</strong> Puedes configurar tus preferencias de notificación desde tu perfil en la plataforma para personalizar cuándo recibes estos emails.
            </p>

            <p style="margin-top: 30px; font-style: italic; color: #636e72;">
                "La comunicación es el puente entre la confusión y la claridad."
            </p>
        </div>

        <div class="footer">
            <p>Este mensaje fue enviado automáticamente por el sistema de {{schoolName}}</p>
            <p>💌 ¡Mantente conectado con tu comunidad educativa! 🎓</p>
        </div>
    </div>
</body>
</html>
$template$,
        $textTemplate$
¡Hola {{userName}}!

💬 ¡NUEVO MENSAJE! 📩

Tienes un nuevo mensaje en la plataforma de {{schoolName}}.

De: {{senderName}} ({{senderRole}})
Fecha: {{messageDate}}
{{#if messageSubject}}Asunto: {{messageSubject}}{{/if}}

{{#if messagePreview}}
Mensaje:
"{{messagePreview}}"
{{/if}}

Para leer el mensaje completo y responder, accede a la plataforma:
{{platformUrl}}/messages

💡 Consejo: Puedes configurar tus preferencias de notificación desde tu perfil en la plataforma.

"La comunicación es el puente entre la confusión y la claridad."

Este mensaje fue enviado automáticamente por el sistema de {{schoolName}}
💌 ¡Mantente conectado con tu comunidad educativa! 🎓
$textTemplate$,
        '["userName", "senderName", "senderRole", "senderInitials", "messageDate", "messageSubject", "messagePreview", "platformUrl", "schoolName"]',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (type) DO UPDATE SET
        html_content = EXCLUDED.html_content,
        text_content = EXCLUDED.text_content,
        available_variables = EXCLUDED.available_variables,
        updated_at = NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM email_templates WHERE type = 'new_message_notification'
    `);
  }
}