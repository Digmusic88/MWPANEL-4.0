#!/usr/bin/env bash
# Backfill BlogMedia.thumbnailUrl para vídeos legacy usando la URL de thumbnail
# auto-generada por Google Drive. Idempotente: salta los que ya tienen thumbnail.
#
# Uso:
#   ./backfill-video-thumbnails.sh dry      # muestra qué actualizaría
#   ./backfill-video-thumbnails.sh apply    # aplica los cambios

set -euo pipefail

MODE="${1:-dry}"
if [[ "$MODE" != "dry" && "$MODE" != "apply" ]]; then
  echo "Uso: $0 [dry|apply]"
  exit 1
fi

SQL_SELECT="SELECT id, metadata->>'googleDriveId' AS drive_id, filename
            FROM blog_media
            WHERE type = 'video'
              AND (\"thumbnailUrl\" IS NULL OR \"thumbnailUrl\" = '')
              AND metadata->>'googleDriveId' IS NOT NULL;"

ROWS=$(docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -At -F '|' -c "$SQL_SELECT")

if [[ -z "$ROWS" ]]; then
  echo "No hay vídeos sin thumbnailUrl. Nada que hacer."
  exit 0
fi

COUNT=0
while IFS='|' read -r id drive_id filename; do
  if [[ -z "$drive_id" ]]; then
    continue
  fi
  THUMB_URL="https://drive.google.com/thumbnail?id=${drive_id}&sz=w640-h360"
  if [[ "$MODE" == "dry" ]]; then
    echo "[dry-run] $id ($filename) -> $THUMB_URL"
  else
    docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c \
      "UPDATE blog_media SET \"thumbnailUrl\" = '$THUMB_URL' WHERE id = '$id';" > /dev/null
    echo "[applied] $id ($filename)"
  fi
  COUNT=$((COUNT+1))
done <<< "$ROWS"

echo "---"
echo "Procesados ${COUNT} vídeos (modo=${MODE})."
