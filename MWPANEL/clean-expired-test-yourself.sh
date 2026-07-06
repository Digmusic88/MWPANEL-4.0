#!/bin/bash

# Script para limpiar Test Yourself vencidos
# Cambia el estado de 'published' a 'closed' para Test Yourself que ya pasaron su fecha

echo "🧹 Limpiando Test Yourself vencidos..."

# Mostrar cuántos hay antes de limpiar
EXPIRED_COUNT=$(docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "SELECT COUNT(*) FROM tasks WHERE \"taskType\" = 'exam' AND \"dueDate\" < NOW() AND status = 'published';" -t | tr -d ' ')

echo "📊 Test Yourself vencidos encontrados: $EXPIRED_COUNT"

if [ "$EXPIRED_COUNT" -gt 0 ]; then
    # Cerrar Test Yourself vencidos
    docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "UPDATE tasks SET status = 'closed', \"closedAt\" = NOW() WHERE \"taskType\" = 'exam' AND \"dueDate\" < NOW() AND status = 'published';"
    
    echo "✅ $EXPIRED_COUNT Test Yourself han sido cerrados"
else
    echo "✅ No hay Test Yourself vencidos que limpiar"
fi

echo "🎉 Limpieza completada"