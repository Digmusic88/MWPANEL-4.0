#!/bin/bash

echo "🎂 Forzando automatización de cumpleaños..."

# Ejecutar directamente el procesamiento de cumpleaños usando psql
docker-compose exec -T postgres psql -U mwpanel -d mwpanel << 'EOF'
-- Verificar usuarios con cumpleaños hoy
SELECT 
  u.email,
  up."firstName", 
  up."lastName",
  up."dateOfBirth"
FROM users u
INNER JOIN user_profiles up ON u.id = up."userId"
WHERE u."isActive" = true
  AND up."dateOfBirth" IS NOT NULL
  AND TO_CHAR(up."dateOfBirth", 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD');

-- Crear email de cumpleaños si no existe
WITH birthday_users AS (
  SELECT 
    u.id as user_id,
    u.email,
    up."firstName", 
    up."lastName"
  FROM users u
  INNER JOIN user_profiles up ON u.id = up."userId"
  WHERE u."isActive" = true
    AND up."dateOfBirth" IS NOT NULL
    AND TO_CHAR(up."dateOfBirth", 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD')
),
automation AS (
  SELECT 
    ea."templateId",
    et.subject,
    et."htmlContent"
  FROM email_automations ea
  INNER JOIN email_templates et ON ea."templateId" = et.id
  WHERE ea."eventType" = 'user_birthday' 
  AND ea."isActive" = true
  LIMIT 1
)
INSERT INTO email_notifications (
  "recipientId",
  "recipientEmail", 
  "templateId", 
  "subject", 
  "htmlContent", 
  "templateData", 
  "status", 
  "priority", 
  "triggerEvent", 
  "isTest",
  "createdAt",
  "updatedAt"
)
SELECT 
  bu.user_id,
  bu.email,
  a."templateId",
  REPLACE(a.subject, '{{userName}}', bu."firstName"),
  REPLACE(REPLACE(a."htmlContent", '{{userName}}', bu."firstName"), '{{fullName}}', bu."firstName" || ' ' || bu."lastName"),
  json_build_object(
    'userName', bu."firstName",
    'fullName', bu."firstName" || ' ' || bu."lastName",
    'schoolName', 'Mundo World School'
  )::text,
  'pending',
  'normal',
  'user_birthday',
  false,
  NOW(),
  NOW()
FROM birthday_users bu, automation a
WHERE NOT EXISTS (
  SELECT 1 FROM email_notifications en
  WHERE en."recipientEmail" = bu.email
  AND en."triggerEvent" = 'user_birthday'
  AND DATE(en."createdAt") = CURRENT_DATE
);

-- Mostrar emails pendientes
SELECT 
  "recipientEmail",
  "subject",
  "status",
  "createdAt"
FROM email_notifications 
WHERE "triggerEvent" = 'user_birthday'
AND "status" = 'pending'
ORDER BY "createdAt" DESC;
EOF

echo "✅ Automatización completada. Ahora procesando emails pendientes..."

# Ahora necesitamos procesar los emails pendientes
echo "📧 Para enviar los emails pendientes, ejecuta: ./process-pending-emails.sh"