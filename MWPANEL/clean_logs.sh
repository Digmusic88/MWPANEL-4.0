#!/bin/bash

# Script para limpiar logs de debugging del sistema Mind Map

echo "🧹 Iniciando limpieza de logs de debugging..."

# Archivos a limpiar
FILES=(
    "frontend/src/components/student-notes/MindMapEditor.tsx"
    "frontend/src/components/student-notes/MindMapViewer.tsx" 
    "frontend/src/pages/student/MisApuntesPageNew.tsx"
    "backend/src/main.ts"
)

# Patterns a remover
PATTERNS=(
    "console\.log.*🚨.*"
    "console\.log.*💡.*"
    "console\.log.*🔥.*" 
    "console\.log.*🧠.*"
    "console\.log.*🎨.*"
    "console\.log.*🔄.*"
    "console\.log.*➕.*"
    "console\.log.*💾.*"
    "console\.log.*📊.*"
    "console\.log.*🏷️.*"
    "console\.log.*🔧.*"
    "console\.log.*🎯.*"
    "console\.log.*📋.*"
    "console\.log.*✅.*"
    "console\.log.*📝.*"
    "console\.error.*🚨.*"
    "window\.console\.error.*🚨.*"
    "window\.console\.log.*💡.*"
    "window\.console\.log.*🔥.*"
    "window\.console\.log.*💥.*"
    "// LOGGING.*"
    "// INDESTRUCTIBLE.*"
    "// 🚨.*"
    "// 💡.*"
    "// 🔥.*"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "🧹 Limpiando $file..."
        
        # Crear backup
        cp "$file" "$file.backup"
        
        # Limpiar cada pattern
        for pattern in "${PATTERNS[@]}"; do
            # Remover líneas completas que contengan los patterns
            sed -i "/^.*$pattern.*$/d" "$file"
        done
        
        echo "  ✅ $file limpiado"
    else
        echo "  ⚠️ $file no encontrado"
    fi
done

echo ""
echo "🎉 Limpieza completada! Los archivos originales están respaldados con extensión .backup"
echo ""
echo "Para aplicar los cambios:"
echo "1. Reiniciar backend: docker-compose restart backend"
echo "2. Rebuildar frontend: cd frontend && npm run build"
echo "3. Copiar dist: cp -r frontend/dist/* dist-frontend/"
echo "4. Reiniciar nginx: docker restart mw-panel-nginx"