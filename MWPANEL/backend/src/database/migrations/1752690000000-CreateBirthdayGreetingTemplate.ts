import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBirthdayGreetingTemplate1752690000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert birthday greeting template
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
        'Recordatorio de Cumpleaños',
        'Plantilla para notificar a todos los usuarios sobre cumpleaños de compañeros',
        'birthday_greeting',
        '🎉 ¡Hoy es el cumpleaños de {{birthdayPersonName}}!',
        $template$
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Feliz Cumpleaños!</title>
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
        .birthday-person {
            background-color: #fff3cd;
            border: 2px solid #ffeaa7;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
        .birthday-person h2 {
            color: #e17055;
            margin: 0 0 10px 0;
            font-size: 24px;
        }
        .emoji {
            font-size: 2em;
            margin: 10px 0;
        }
        .message {
            background-color: #e8f4fd;
            border-left: 4px solid #74b9ff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .footer {
            background-color: #f1f2f6;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #636e72;
        }
        .cta-button {
            display: inline-block;
            background-color: #00b894;
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 25px;
            margin: 20px 0;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 ¡Es un día especial! 🎉</h1>
        </div>
        
        <div class="content">
            <p>¡Hola <strong>{{userName}}</strong>!</p>
            
            <div class="birthday-person">
                <div class="emoji">🎂✨</div>
                <h2>{{birthdayPersonName}}</h2>
                <p><strong>¡Está cumpliendo años hoy!</strong></p>
            </div>
            
            <div class="message">
                <p><strong>{{humorousMessage}}</strong></p>
            </div>
            
            <p>En <strong>{{schoolName}}</strong> celebramos cada momento especial junto a nuestra comunidad educativa. Los cumpleaños son ocasiones perfectas para fortalecer los lazos que nos unen.</p>
            
            <p>¿Por qué no le dedicas unos segundos para enviarle un mensaje de felicitación? Un pequeño gesto puede alegrar mucho el día de alguien.</p>
            
            <div style="text-align: center;">
                <a href="https://plataforma.mundoworld.school/messages" class="cta-button">
                    💌 Enviar Felicitación
                </a>
            </div>
            
            <p style="margin-top: 30px; font-style: italic; color: #636e72;">
                "Los mejores regalos no siempre vienen en cajas envueltas. A veces, vienen en forma de buenos deseos y sonrisas sinceras."
            </p>
        </div>
        
        <div class="footer">
            <p>Este mensaje fue enviado automáticamente por el sistema de {{schoolName}}</p>
            <p>🎈 ¡Que tengas un día maravilloso! 🎈</p>
        </div>
    </div>
</body>
</html>
$template$,
        $textTemplate$
¡Hola {{userName}}!

🎉 ¡ES UN DÍA ESPECIAL! 🎉

{{birthdayPersonName}} está cumpliendo años hoy.

{{humorousMessage}}

En {{schoolName}} celebramos cada momento especial junto a nuestra comunidad educativa. Los cumpleaños son ocasiones perfectas para fortalecer los lazos que nos unen.

¿Por qué no le dedicas unos segundos para enviarle un mensaje de felicitación? Un pequeño gesto puede alegrar mucho el día de alguien.

Puedes enviar tu felicitación en: https://plataforma.mundoworld.school/messages

"Los mejores regalos no siempre vienen en cajas envueltas. A veces, vienen en forma de buenos deseos y sonrisas sinceras."

Este mensaje fue enviado automáticamente por el sistema de {{schoolName}}
🎈 ¡Que tengas un día maravilloso! 🎈
$textTemplate$,
        '["userName", "birthdayPersonName", "humorousMessage", "schoolName"]',
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
      DELETE FROM email_templates WHERE type = 'birthday_greeting'
    `);
  }
}