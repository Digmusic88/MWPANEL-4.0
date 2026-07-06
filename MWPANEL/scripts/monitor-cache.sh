#!/bin/bash

# Script para monitorear el rendimiento del cache Redis
# Uso: ./monitor-cache.sh [comando]

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuración
REDIS_CONTAINER="mw-panel-redis-1"
CACHE_DB=1
LOG_FILE="/opt/mw-panel/backend/logs/cache-monitor.log"

# Función de ayuda
show_help() {
    echo "Monitor de Cache Redis - MW Panel"
    echo "================================="
    echo ""
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos:"
    echo "  stats     - Mostrar estadísticas generales"
    echo "  keys      - Listar keys de cache"
    echo "  monitor   - Monitorear comandos en tiempo real"
    echo "  analyze   - Analizar patrones de uso"
    echo "  clean     - Limpiar cache expirado"
    echo "  report    - Generar reporte de rendimiento"
    echo "  help      - Mostrar esta ayuda"
}

# Verificar que Redis está corriendo
check_redis() {
    if ! docker ps | grep -q "$REDIS_CONTAINER"; then
        echo -e "${RED}❌ Redis no está corriendo${NC}"
        echo "Inicia el sistema con: ./start-all-optimized.sh"
        exit 1
    fi
}

# Obtener estadísticas generales
show_stats() {
    echo -e "${BLUE}📊 Estadísticas de Cache Redis${NC}"
    echo "================================="
    
    # Info general
    echo -e "\n${YELLOW}Información General:${NC}"
    docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB INFO server | grep -E "redis_version|uptime_in_days"
    
    # Memoria
    echo -e "\n${YELLOW}Uso de Memoria:${NC}"
    docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB INFO memory | grep -E "used_memory_human|used_memory_peak_human|maxmemory_human"
    
    # Keys
    echo -e "\n${YELLOW}Estadísticas de Keys:${NC}"
    TOTAL_KEYS=$(docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB DBSIZE | awk '{print $2}')
    echo "Total de keys: $TOTAL_KEYS"
    
    # Distribución por tipo
    echo -e "\n${YELLOW}Distribución por Tipo:${NC}"
    docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB --scan --pattern "mw-cache:*" | \
        awk -F: '{print $2}' | sort | uniq -c | sort -nr | head -10
    
    # Hit rate (desde logs)
    if [ -f "$LOG_FILE" ]; then
        echo -e "\n${YELLOW}Hit Rate (últimas 24h):${NC}"
        HITS=$(grep -c "Cache hit" "$LOG_FILE" 2>/dev/null || echo 0)
        MISSES=$(grep -c "Cache miss" "$LOG_FILE" 2>/dev/null || echo 0)
        TOTAL=$((HITS + MISSES))
        if [ $TOTAL -gt 0 ]; then
            HIT_RATE=$(echo "scale=2; $HITS * 100 / $TOTAL" | bc)
            echo "Hits: $HITS"
            echo "Misses: $MISSES"
            echo -e "${GREEN}Hit Rate: ${HIT_RATE}%${NC}"
        else
            echo "No hay datos suficientes"
        fi
    fi
}

# Listar keys
list_keys() {
    echo -e "${BLUE}🔑 Keys de Cache${NC}"
    echo "=================="
    
    echo -e "\n${YELLOW}Top 20 keys por tamaño:${NC}"
    docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB --scan --pattern "mw-cache:*" | \
        head -20 | while read key; do
            SIZE=$(docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB MEMORY USAGE "$key" 2>/dev/null || echo 0)
            TTL=$(docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB TTL "$key")
            echo "$key - Size: $SIZE bytes - TTL: $TTL seconds"
        done | sort -k4 -nr | head -20
    
    echo -e "\n${YELLOW}Keys por categoría:${NC}"
    for pattern in "user:*" "dashboard:*" "competencies:*" "students:*" "evaluations:*"; do
        COUNT=$(docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB --scan --pattern "mw-cache:$pattern" | wc -l)
        echo "$pattern: $COUNT keys"
    done
}

# Monitorear en tiempo real
monitor_redis() {
    echo -e "${BLUE}📡 Monitoreando Redis (Ctrl+C para salir)${NC}"
    echo "=========================================="
    echo ""
    docker exec -it $REDIS_CONTAINER redis-cli -n $CACHE_DB MONITOR | \
        grep -E "GET|SET|DEL|EXPIRE" | \
        awk '{
            cmd = $3;
            key = $4;
            if (cmd ~ /GET/) printf "\033[0;32m[GET]\033[0m ";
            else if (cmd ~ /SET/) printf "\033[0;33m[SET]\033[0m ";
            else if (cmd ~ /DEL/) printf "\033[0;31m[DEL]\033[0m ";
            else if (cmd ~ /EXPIRE/) printf "\033[0;35m[TTL]\033[0m ";
            print key;
        }'
}

# Analizar patrones
analyze_patterns() {
    echo -e "${BLUE}🔍 Análisis de Patrones de Cache${NC}"
    echo "===================================="
    
    # Keys más accedidas (requiere logs)
    if [ -f "$LOG_FILE" ]; then
        echo -e "\n${YELLOW}Top 10 keys más accedidas:${NC}"
        grep "Cache hit\|Cache miss" "$LOG_FILE" | \
            awk -F': ' '{print $NF}' | \
            sort | uniq -c | sort -nr | head -10
    fi
    
    # TTL promedio
    echo -e "\n${YELLOW}TTL promedio por tipo:${NC}"
    for pattern in "user" "dashboard" "competencies" "students"; do
        AVG_TTL=$(docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB --scan --pattern "mw-cache:$pattern:*" | \
            head -50 | while read key; do
                docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB TTL "$key" 2>/dev/null
            done | awk '{sum+=$1; count++} END {if(count>0) print int(sum/count); else print 0}')
        echo "$pattern: ~$AVG_TTL seconds"
    done
    
    # Keys sin TTL (peligroso)
    echo -e "\n${YELLOW}Keys sin expiración:${NC}"
    NO_TTL_COUNT=0
    docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB --scan --pattern "mw-cache:*" | \
        head -100 | while read key; do
            TTL=$(docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB TTL "$key")
            if [ "$TTL" = "-1" ]; then
                echo "$key"
                ((NO_TTL_COUNT++))
            fi
        done
    echo "Total sin TTL: $NO_TTL_COUNT"
}

# Limpiar cache
clean_cache() {
    echo -e "${BLUE}🧹 Limpieza de Cache${NC}"
    echo "====================="
    
    read -p "¿Estás seguro de que quieres limpiar el cache? (s/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        # Contar keys antes
        BEFORE=$(docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB DBSIZE | awk '{print $2}')
        
        # Ejecutar limpieza de keys expiradas
        docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB EVAL "
            local keys = redis.call('keys', 'mw-cache:*')
            local deleted = 0
            for i=1,#keys,5000 do
                local batch = {}
                for j=i,math.min(i+4999,#keys) do
                    local ttl = redis.call('ttl', keys[j])
                    if ttl == -2 then
                        table.insert(batch, keys[j])
                    end
                end
                if #batch > 0 then
                    deleted = deleted + redis.call('del', unpack(batch))
                end
            end
            return deleted
        " 0
        
        # Contar keys después
        AFTER=$(docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB DBSIZE | awk '{print $2}')
        DELETED=$((BEFORE - AFTER))
        
        echo -e "${GREEN}✅ Limpieza completada${NC}"
        echo "Keys antes: $BEFORE"
        echo "Keys después: $AFTER"
        echo "Keys eliminadas: $DELETED"
    else
        echo "Limpieza cancelada"
    fi
}

# Generar reporte
generate_report() {
    echo -e "${BLUE}📄 Generando Reporte de Cache${NC}"
    echo "==============================="
    
    REPORT_FILE="/tmp/cache-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "REPORTE DE CACHE REDIS - MW PANEL"
        echo "================================="
        echo "Fecha: $(date)"
        echo ""
        
        echo "ESTADÍSTICAS GENERALES"
        echo "---------------------"
        docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB INFO | grep -E "redis_version|uptime_in_days|used_memory_human|db1"
        echo ""
        
        echo "DISTRIBUCIÓN DE KEYS"
        echo "-------------------"
        docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB --scan --pattern "mw-cache:*" | \
            awk -F: '{print $2}' | sort | uniq -c | sort -nr
        echo ""
        
        echo "ANÁLISIS DE MEMORIA"
        echo "------------------"
        docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB MEMORY DOCTOR
        echo ""
        
        echo "RECOMENDACIONES"
        echo "---------------"
        # Analizar y dar recomendaciones
        TOTAL_KEYS=$(docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB DBSIZE | awk '{print $2}')
        if [ $TOTAL_KEYS -gt 10000 ]; then
            echo "⚠️  Alto número de keys ($TOTAL_KEYS). Considera revisar TTLs."
        fi
        
        # Check memory usage
        USED_MEMORY=$(docker exec $REDIS_CONTAINER redis-cli -n $CACHE_DB INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        echo "💾 Memoria usada: $USED_MEMORY"
        
    } > "$REPORT_FILE"
    
    echo -e "${GREEN}✅ Reporte generado: $REPORT_FILE${NC}"
    echo ""
    cat "$REPORT_FILE"
}

# Main
check_redis

case "${1:-stats}" in
    stats)
        show_stats
        ;;
    keys)
        list_keys
        ;;
    monitor)
        monitor_redis
        ;;
    analyze)
        analyze_patterns
        ;;
    clean)
        clean_cache
        ;;
    report)
        generate_report
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Comando no reconocido: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac