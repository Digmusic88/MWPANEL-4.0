#!/bin/bash
# Auto-fix Nginx backend IP for MW Panel
# Detects when Docker container IP changes and updates Nginx config automatically
# Created: 2025-12-07

NGINX_CONF="/etc/nginx/sites-enabled/mw-panel.conf"
LOG_FILE="/var/log/mw-panel-ip-monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Try to find backend container (with or without -prod suffix)
CONTAINER_NAME=""
for name in "mw-panel-backend-prod" "mw-panel-backend"; do
    if docker inspect "$name" >/dev/null 2>&1; then
        CONTAINER_NAME="$name"
        break
    fi
done

if [ -z "$CONTAINER_NAME" ]; then
    log "ERROR: No backend container found (tried mw-panel-backend-prod and mw-panel-backend)"
    exit 1
fi

# Get current container IP
CURRENT_IP=$(docker inspect "$CONTAINER_NAME" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)

if [ -z "$CURRENT_IP" ]; then
    log "ERROR: Could not get IP for container $CONTAINER_NAME. Container might be down."
    exit 1
fi

# Get IP configured in Nginx
CONFIGURED_IP=$(grep -oP 'proxy_pass http://\K[0-9.]+(?=:3000)' "$NGINX_CONF" | head -1)

if [ -z "$CONFIGURED_IP" ]; then
    log "ERROR: Could not find backend IP in Nginx config"
    exit 1
fi

# Compare IPs
if [ "$CURRENT_IP" != "$CONFIGURED_IP" ]; then
    log "IP MISMATCH DETECTED: Nginx=$CONFIGURED_IP, Container=$CURRENT_IP"
    log "Updating Nginx configuration..."

    # Update all occurrences of the old IP
    sed -i "s/$CONFIGURED_IP:3000/$CURRENT_IP:3000/g" "$NGINX_CONF"

    # Test Nginx config
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        log "SUCCESS: Nginx updated and reloaded. New backend IP: $CURRENT_IP"

        # Verify the fix worked
        sleep 2
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health/status 2>/dev/null)
        if [ "$HTTP_CODE" = "200" ]; then
            log "VERIFIED: Backend responding correctly"
        else
            log "WARNING: Backend health check returned $HTTP_CODE"
        fi
    else
        log "ERROR: Nginx config test failed. Reverting changes..."
        sed -i "s/$CURRENT_IP:3000/$CONFIGURED_IP:3000/g" "$NGINX_CONF"
        exit 1
    fi
else
    # Only log mismatches to avoid filling the log
    :
fi

exit 0
