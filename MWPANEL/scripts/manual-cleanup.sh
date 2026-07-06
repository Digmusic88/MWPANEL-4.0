#!/bin/bash

# ============================================
# LIMPIEZA MANUAL RÁPIDA 
# ============================================
# 
# DESCRIPCIÓN:
# Script simple para limpiar manualmente las
# comparticiones de apuntes expiradas.
#
# USO:
# ./scripts/manual-cleanup.sh
# ============================================

echo "🧹 INICIANDO LIMPIEZA MANUAL..."

# Ejecutar limpieza SQL directa
RESULT=$(docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "
UPDATE shared_notes 
SET status = 'revoked', \"updatedAt\" = NOW() 
WHERE status = 'active' 
  AND \"expiresAt\" IS NOT NULL 
  AND \"expiresAt\" < NOW();
")

# Obtener estadísticas
STATS=$(docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN status = 'revoked' THEN 1 END) as revoked
FROM shared_notes;
" | grep -E "^\s*[0-9]" | tr -d ' ')

echo "✅ LIMPIEZA COMPLETADA"
echo "$RESULT"
echo ""
echo "📊 ESTADÍSTICAS ACTUALES:"
echo "   $STATS"
echo ""
echo "🎉 ¡Los apuntes expirados han sido eliminados de las listas!"
echo "   Los usuarios ya no verán apuntes expirados en sus listas de compartición."