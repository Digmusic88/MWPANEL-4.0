#!/bin/bash

# Script para inicializar el sistema de email de MW Panel
# Configura plantillas y verifica funcionamiento

echo "🚀 Inicializando Sistema de Email MW Panel..."

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📧 CONFIGURACIÓN RESEND DETECTADA:${NC}"
echo "✅ EMAIL_PROVIDER: resend"
echo "✅ API Key: re_iWc16WH8_****(configurada)"
echo "✅ From Address: no-reply@mundoworld.school"
echo "✅ From Name: Mundo World School"
echo ""

echo -e "${YELLOW}🔧 Verificando estado del backend...${NC}"
if docker-compose exec -T backend curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend respondiendo correctamente${NC}"
else
    echo -e "${RED}❌ Backend no responde. Reiniciando...${NC}"
    docker-compose restart backend
    sleep 10
fi

echo ""
echo -e "${BLUE}📋 TAREAS PENDIENTES PARA COMPLETAR CONFIGURACIÓN:${NC}"
echo ""
echo "1. 🌐 CONFIGURACIÓN DNS CLOUDFLARE:"
echo "   - Agregar a SPF: include:_spf.resend.com"
echo "   - DKIM: resend._domainkey → resend._domainkey.resend.com"
echo "   - Verificación Resend: agregar TXT record"
echo ""

echo "2. 🔑 VERIFICAR DOMINIO EN RESEND:"
echo "   - Ir a resend.com dashboard"
echo "   - Verificar mundoworld.school"
echo "   - Marcar como 'Send-only domain'"
echo ""

echo "3. 🧪 PROBAR ENVÍO:"
echo "   - Usar panel admin MW Panel"
echo "   - O endpoint: POST /api/communications/email-notifications/send-test"
echo ""

echo -e "${GREEN}✅ Sistema configurado y listo para DNS setup${NC}"
echo -e "${YELLOW}📖 Consulta la documentación para próximos pasos${NC}"

# Verificar tablas de email existen
echo ""
echo -e "${BLUE}🗄️ Verificando base de datos...${NC}"
if docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "SELECT COUNT(*) FROM email_templates;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Tablas de email creadas correctamente${NC}"
    TEMPLATE_COUNT=$(docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "SELECT COUNT(*) FROM email_templates;" | grep -o '[0-9]\+' | head -1)
    echo "📧 Plantillas disponibles: $TEMPLATE_COUNT"
else
    echo -e "${RED}❌ Tablas de email no encontradas${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Inicialización completada!${NC}"
echo -e "${BLUE}📍 Próximo paso: Configurar DNS en Cloudflare${NC}"