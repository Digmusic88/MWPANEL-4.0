#!/bin/bash

echo "📧 Procesando emails pendientes..."

# Obtener emails pendientes
PENDING_EMAILS=$(docker-compose exec -T postgres psql -U mwpanel -d mwpanel -t -c "
SELECT json_agg(
  json_build_object(
    'id', id,
    'email', \"recipientEmail\",
    'subject', \"subject\",
    'html', \"htmlContent\"
  )
) 
FROM email_notifications 
WHERE \"status\" = 'pending' 
AND \"triggerEvent\" = 'user_birthday'
LIMIT 10;
")

# Si no hay emails pendientes, salir
if [ "$PENDING_EMAILS" = "" ] || [ "$PENDING_EMAILS" = "null" ]; then
  echo "✅ No hay emails pendientes para procesar"
  exit 0
fi

echo "📬 Emails pendientes encontrados. Enviando..."

# Enviar cada email usando Resend API
echo "$PENDING_EMAILS" | jq -r '.[] | @json' | while read -r email_json; do
  EMAIL=$(echo "$email_json" | jq -r '.email')
  SUBJECT=$(echo "$email_json" | jq -r '.subject')
  HTML=$(echo "$email_json" | jq -r '.html')
  ID=$(echo "$email_json" | jq -r '.id')
  
  echo "📤 Enviando email a: $EMAIL"
  
  # Crear JSON para Resend
  JSON_DATA=$(jq -n \
    --arg from "Mundo World School <noreply@mundoworld.school>" \
    --arg to "$EMAIL" \
    --arg subject "$SUBJECT" \
    --arg html "$HTML" \
    '{from: $from, to: [$to], subject: $subject, html: $html}')
  
  # Enviar email via Resend
  RESPONSE=$(curl -s -X POST "https://api.resend.com/emails" \
    -H "Authorization: " \
    -H "Content-Type: application/json" \
    -d "$JSON_DATA")
  
  # Verificar respuesta
  if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    RESEND_ID=$(echo "$RESPONSE" | jq -r '.id')
    echo "✅ Email enviado exitosamente. ID: $RESEND_ID"
    
    # Actualizar estado en la base de datos
    docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "
      UPDATE email_notifications 
      SET 
        \"status\" = 'sent',
        \"sentAt\" = NOW(),
        \"providerMessageId\" = '$RESEND_ID',
        \"providerResponse\" = '$RESPONSE'::jsonb
      WHERE id = '$ID';
    "
  else
    echo "❌ Error enviando email: $RESPONSE"
  fi
  
  # Esperar un poco entre emails para no saturar
  sleep 1
done

echo "✅ Proceso completado"

# Mostrar resumen
docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "
SELECT 
  \"status\",
  COUNT(*) as total
FROM email_notifications 
WHERE \"triggerEvent\" = 'user_birthday'
AND DATE(\"createdAt\") = CURRENT_DATE
GROUP BY \"status\";
"
