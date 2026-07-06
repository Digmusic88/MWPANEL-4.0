#!/bin/bash

# Script de migración para eliminar race conditions
# Este script ayuda a identificar y migrar componentes afectados

echo "🔍 Analizando componentes con race conditions..."
echo "=============================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorio base
BASE_DIR="/opt/mw-panel/frontend/src"

# 1. Buscar archivos .recursion-backup
echo -e "\n${YELLOW}📁 Archivos con .recursion-backup (componentes problemáticos):${NC}"
BACKUP_FILES=$(find "$BASE_DIR" -name "*.recursion-backup" -type f 2>/dev/null)
BACKUP_COUNT=$(echo "$BACKUP_FILES" | grep -c ".")

if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo -e "${RED}Encontrados $BACKUP_COUNT archivos con problemas de race conditions:${NC}"
    echo "$BACKUP_FILES" | while read -r file; do
        ORIGINAL_FILE="${file%.recursion-backup}"
        echo -e "  ${RED}⚠️${NC}  $(basename "$ORIGINAL_FILE")"
    done
else
    echo -e "${GREEN}✅ No se encontraron archivos .recursion-backup${NC}"
fi

# 2. Buscar imports de globalRaceConditionFix
echo -e "\n${YELLOW}🔍 Buscando imports de globalRaceConditionFix:${NC}"
IMPORTS=$(grep -r "globalRaceConditionFix" "$BASE_DIR" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v ".recursion-backup")

if [ -n "$IMPORTS" ]; then
    echo -e "${RED}⚠️  Encontrados imports peligrosos:${NC}"
    echo "$IMPORTS" | while IFS=: read -r file line; do
        echo -e "  ${RED}❌${NC} $(basename "$file"):$line"
    done
else
    echo -e "${GREEN}✅ No se encontraron imports de globalRaceConditionFix${NC}"
fi

# 3. Buscar monkey patches sospechosos
echo -e "\n${YELLOW}🔍 Buscando monkey patches (Array.prototype modifications):${NC}"
MONKEY_PATCHES=$(grep -r "Array\.prototype\." "$BASE_DIR" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -E "(map|filter|reduce|find)\s*=" | grep -v ".recursion-backup")

if [ -n "$MONKEY_PATCHES" ]; then
    echo -e "${RED}⚠️  Encontrados monkey patches peligrosos:${NC}"
    echo "$MONKEY_PATCHES" | while IFS=: read -r file line; do
        echo -e "  ${RED}🐒${NC} $(basename "$file")"
    done
else
    echo -e "${GREEN}✅ No se encontraron monkey patches${NC}"
fi

# 4. Buscar patrones problemáticos comunes
echo -e "\n${YELLOW}🔍 Buscando patrones problemáticos comunes:${NC}"

# Patrón: data?.items?.map sin validación
UNSAFE_MAPS=$(grep -r "\.map(" "$BASE_DIR" --include="*.tsx" 2>/dev/null | grep -v "safeArray" | grep -v "|| \[\]" | wc -l)
echo -e "  ${YELLOW}📊${NC} Llamadas a .map() sin validación aparente: $UNSAFE_MAPS"

# Patrón: acceso a propiedades profundas sin validación
DEEP_ACCESS=$(grep -r "\.[a-zA-Z_]\+\.[a-zA-Z_]\+\.[a-zA-Z_]\+" "$BASE_DIR" --include="*.tsx" 2>/dev/null | grep -v "get(" | wc -l)
echo -e "  ${YELLOW}📊${NC} Accesos a propiedades profundas sin get(): $DEEP_ACCESS"

# 5. Componentes ya refactorizados
echo -e "\n${YELLOW}✨ Componentes refactorizados (seguros):${NC}"
REFACTORED=$(find "$BASE_DIR" -name "*Refactored.tsx" -type f 2>/dev/null)
REFACTORED_COUNT=$(echo "$REFACTORED" | grep -c ".")

if [ "$REFACTORED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}Encontrados $REFACTORED_COUNT componentes refactorizados:${NC}"
    echo "$REFACTORED" | while read -r file; do
        echo -e "  ${GREEN}✅${NC} $(basename "$file")"
    done
else
    echo -e "${YELLOW}⚠️  No se encontraron componentes refactorizados aún${NC}"
fi

# 6. Generar reporte de migración
echo -e "\n${BLUE}📋 Generando reporte de migración...${NC}"
REPORT_FILE="/opt/mw-panel/RACE-CONDITION-MIGRATION-STATUS.md"

cat > "$REPORT_FILE" << EOF
# Estado de Migración: Race Conditions

**Fecha**: $(date +"%Y-%m-%d %H:%M:%S")

## 📊 Resumen

- **Componentes con .recursion-backup**: $BACKUP_COUNT
- **Imports de globalRaceConditionFix**: $(echo "$IMPORTS" | grep -c "." 2>/dev/null || echo "0")
- **Componentes refactorizados**: $REFACTORED_COUNT
- **Llamadas .map() sin validación**: $UNSAFE_MAPS
- **Accesos profundos sin get()**: $DEEP_ACCESS

## 🔴 Componentes Críticos a Migrar

EOF

# Listar componentes críticos
if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo "$BACKUP_FILES" | while read -r file; do
        ORIGINAL_FILE="${file%.recursion-backup}"
        COMPONENT_NAME=$(basename "$ORIGINAL_FILE")
        echo "- [ ] $COMPONENT_NAME" >> "$REPORT_FILE"
    done
fi

cat >> "$REPORT_FILE" << EOF

## ✅ Componentes Migrados

EOF

# Listar componentes migrados
if [ "$REFACTORED_COUNT" -gt 0 ]; then
    echo "$REFACTORED" | while read -r file; do
        COMPONENT_NAME=$(basename "$file")
        echo "- [x] $COMPONENT_NAME" >> "$REPORT_FILE"
    done
fi

cat >> "$REPORT_FILE" << EOF

## 📝 Próximos Pasos

1. Migrar componentes con .recursion-backup uno por uno
2. Usar \`safeArray\` y \`get\` de \`utils/safeAccess.ts\`
3. Implementar React Query para data fetching
4. Testear exhaustivamente cada componente migrado
5. Eliminar archivos .recursion-backup después de verificar
6. Finalmente, eliminar \`globalRaceConditionFix.ts\`

## 🛠️ Comando de Ayuda

Para migrar un componente específico:
\`\`\`bash
# 1. Crear versión refactorizada
cp ComponentName.tsx ComponentNameRefactored.tsx

# 2. Editar y aplicar patrones seguros
# 3. Testear el componente
# 4. Reemplazar el original cuando esté listo
\`\`\`
EOF

echo -e "${GREEN}✅ Reporte generado en: $REPORT_FILE${NC}"

# 7. Sugerencias finales
echo -e "\n${BLUE}💡 Sugerencias:${NC}"
echo -e "1. Comienza migrando NotificationCenter.tsx (ya tienes NotificationCenterRefactored.tsx)"
echo -e "2. Luego migra los dashboards principales (DuaDashboard, TeacherDashboard)"
echo -e "3. Usa el componente DuaDashboardRefactored.tsx como referencia"
echo -e "4. Ejecuta tests después de cada migración"
echo -e "5. Commitea frecuentemente para poder revertir si es necesario"

echo -e "\n${GREEN}🎯 Script completado. ¡Buena suerte con la migración!${NC}"