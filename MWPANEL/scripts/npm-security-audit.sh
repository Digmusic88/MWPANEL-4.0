#!/bin/bash
#
# NPM Security Audit Script for MW Panel
# Runs weekly to check for vulnerabilities in npm packages
#
# Created: 2026-01-01
# Purpose: Automated npm vulnerability scanning
#

LOG_FILE="/var/log/mw-panel-npm-audit.log"
ALERT_EMAIL="diegomusica88@gmail.com"
RESEND_API_KEY="..."

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_alert() {
    local subject="$1"
    local message="$2"

    curl -s -X POST "https://api.resend.com/emails" \
        -H "Authorization: Bearer $RESEND_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"from\": \"MW Panel Security <no-reply@mundoworld.school>\",
            \"to\": [\"$ALERT_EMAIL\"],
            \"subject\": \"$subject\",
            \"html\": \"$message\"
        }" > /dev/null 2>&1
}

audit_project() {
    local project_name="$1"
    local project_path="$2"

    if [ ! -d "$project_path" ]; then
        log_message "ERROR: Directorio no encontrado: $project_path"
        return 1
    fi

    log_message "Auditando $project_name..."
    cd "$project_path"

    # Run npm audit and capture output
    local audit_output=$(npm audit --json 2>/dev/null)
    local vulnerabilities=$(echo "$audit_output" | grep -o '"vulnerabilities":{[^}]*}' | head -1)
    local total=$(echo "$audit_output" | grep -o '"total":[0-9]*' | head -1 | grep -o '[0-9]*')
    local critical=$(echo "$audit_output" | grep -o '"critical":[0-9]*' | head -1 | grep -o '[0-9]*')
    local high=$(echo "$audit_output" | grep -o '"high":[0-9]*' | head -1 | grep -o '[0-9]*')

    # Default to 0 if not found
    total=${total:-0}
    critical=${critical:-0}
    high=${high:-0}

    log_message "$project_name: Total=$total, Critical=$critical, High=$high"

    echo "$project_name|$total|$critical|$high"
}

main() {
    log_message "=== INICIANDO AUDITORÍA NPM SEMANAL ==="

    # Store results
    local results=""

    # Audit MW Panel Backend
    results+=$(audit_project "MW Panel Backend" "/opt/mw-panel/backend")
    results+="\n"

    # Audit MW Panel Frontend
    results+=$(audit_project "MW Panel Frontend" "/opt/mw-panel/frontend")
    results+="\n"

    # Audit Cambridge Mocks
    results+=$(audit_project "Cambridge Mocks" "/opt/cambridge-mocks-prod")
    results+="\n"

    # Parse results for alert
    local total_critical=0
    local total_high=0
    local report=""

    while IFS='|' read -r name total critical high; do
        if [ -n "$name" ]; then
            report+="<tr><td>$name</td><td>$total</td><td style='color:red;font-weight:bold;'>$critical</td><td style='color:orange;'>$high</td></tr>"
            total_critical=$((total_critical + critical))
            total_high=$((total_high + high))
        fi
    done <<< "$(echo -e "$results")"

    # Build HTML table
    local html_report="<h2>Informe de Auditoría NPM</h2>
    <p><strong>Fecha:</strong> $(date '+%Y-%m-%d %H:%M:%S')</p>
    <table border='1' style='border-collapse:collapse;width:100%;'>
    <tr style='background:#f4f4f4;'><th>Proyecto</th><th>Total</th><th>Críticas</th><th>Altas</th></tr>
    $report
    </table>"

    # Determine if alert is needed
    if [ "$total_critical" -gt 0 ]; then
        log_message "ALERTA: Se encontraron $total_critical vulnerabilidades críticas"
        send_alert "🚨 CRÍTICO: Vulnerabilidades NPM Detectadas" "$html_report<p style='color:red;font-weight:bold;'>Se encontraron $total_critical vulnerabilidades CRÍTICAS que requieren atención inmediata.</p>"
    elif [ "$total_high" -gt 0 ]; then
        log_message "ADVERTENCIA: Se encontraron $total_high vulnerabilidades altas"
        send_alert "⚠️ Vulnerabilidades NPM Detectadas" "$html_report<p style='color:orange;'>Se encontraron $total_high vulnerabilidades de nivel ALTO.</p>"
    else
        log_message "✅ No se encontraron vulnerabilidades críticas o altas"
    fi

    log_message "=== AUDITORÍA NPM COMPLETADA ==="
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
