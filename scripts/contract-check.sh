#!/usr/bin/env bash
# SP-7 — Verifica el contrato de integración Secretaría -> MW Panel (READ-ONLY).
# Exit 0 = contrato OK · Exit 1 = contrato roto · Exit 2 = no se pudo verificar.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/contract-check.sql"
DB_CONTAINER="mw-panel-db-prod"

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "⚠️  No se pudo verificar el contrato: contenedor ${DB_CONTAINER} no está corriendo"
    exit 2
fi

# -i es OBLIGATORIO: sin él, docker no reenvía stdin y psql corre vacío con exit 0 engañoso.
if docker exec -i "$DB_CONTAINER" psql -U mwpanel -d mwpanel -v ON_ERROR_STOP=1 -q -f - < "$SQL_FILE" 2>&1; then
    echo "✅ Contrato Secretaría↔MW Panel OK"
    exit 0
else
    echo ""
    echo "⚠️⚠️⚠️  CONTRATO ROTO Secretaría↔MW Panel — ver detalle arriba y docs/CONTRATO_MWPANEL.md"
    exit 1
fi
