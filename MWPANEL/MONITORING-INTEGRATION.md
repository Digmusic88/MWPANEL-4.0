# Sistema de Monitoreo Integrado - MW Panel 2.0

## Estado de Implementación

✅ **COMPLETADO**: El sistema de monitoreo con Prometheus y Grafana está completamente implementado e integrado en el panel de administración.

## Acceso al Centro de Monitoreo

### Desde el Panel de Administración
1. Iniciar sesión como administrador
2. Navegar a **Configuración del Sistema** → **Centro de Monitoreo**
3. URL directa: `/admin/monitoring`

### Componentes del Centro de Monitoreo

#### 1. Dashboard Principal
- **Métricas del Sistema**: CPU, Memoria, Disco, Conexiones DB
- **Métricas de Rendimiento**: Tiempo de respuesta, tasa de errores
- **Métricas de Negocio**: Usuarios activos, actividades, mensajes
- **Gráficos en Tiempo Real**: Actualización cada 5 segundos

#### 2. Centro de Alertas
- **Reglas de Alertas**: Configuración de umbrales y condiciones
- **Gestión de Notificaciones**: Email, Webhook, SMS
- **Historial de Alertas**: Registro completo con resoluciones
- **Estado en Tiempo Real**: Alertas activas y resueltas

#### 3. Visor de Métricas
- **Métricas Detalladas**: Todas las métricas de Prometheus
- **Gráficos Personalizables**: Selección de período y métricas
- **Exportación de Datos**: CSV y gráficos PNG
- **Comparación de Períodos**: Análisis de tendencias

#### 4. Logs del Sistema
- **Vista Terminal**: Logs en tiempo real estilo consola
- **Filtros Avanzados**: Por servicio, nivel, fecha
- **Búsqueda en Tiempo Real**: Búsqueda de texto completo
- **Exportación de Logs**: Descarga en formato TXT

## Configuración Backend

### Endpoints API Implementados

```typescript
// Base URL: /api/monitoring

// Métricas
GET /api/monitoring/metrics/system?timeRange=1h
GET /api/monitoring/metrics/performance?timeRange=1h
GET /api/monitoring/metrics/custom/:metricName
GET /api/monitoring/metrics/export

// Alertas
GET /api/monitoring/alerts/active
GET /api/monitoring/alerts/history
GET /api/monitoring/alerts/rules
POST /api/monitoring/alerts/rules
PUT /api/monitoring/alerts/rules/:id
DELETE /api/monitoring/alerts/rules/:id
POST /api/monitoring/alerts/resolve/:id

// Logs
GET /api/monitoring/logs/system
GET /api/monitoring/logs/services
POST /api/monitoring/logs/export

// Diagnóstico
POST /api/monitoring/diagnostics/run
POST /api/monitoring/services/restart/:serviceName
```

### Módulo de Monitoreo

```typescript
// /backend/src/modules/monitoring/monitoring.module.ts
@Module({
  imports: [
    PrometheusModule.register({
      defaultLabels: {
        app: 'mw-panel',
      },
    }),
    TerminusModule,
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringInterceptor],
  exports: [MonitoringService],
})
export class MonitoringModule {}
```

## Configuración Frontend

### Componentes Implementados

```typescript
// /frontend/src/pages/admin/Monitoring/
├── index.tsx                 // Contenedor principal con tabs
├── MonitoringDashboard.tsx   // Dashboard con métricas en tiempo real
├── AlertCenter.tsx           // Gestión de alertas y reglas
├── MetricsViewer.tsx         // Visualización detallada de métricas
└── SystemLogs.tsx            // Visor de logs del sistema
```

### Servicio de Monitoreo

```typescript
// /frontend/src/services/monitoring.service.ts
class MonitoringService {
  // Métricas del sistema
  async getSystemMetrics(timeRange: string): Promise<SystemMetrics>
  async getPerformanceMetrics(timeRange: string): Promise<PerformanceMetrics>
  
  // Alertas
  async getActiveAlerts(): Promise<Alert[]>
  async getAlertRules(): Promise<AlertRule[]>
  async createAlertRule(rule: CreateAlertRuleDto): Promise<AlertRule>
  
  // Logs
  async getSystemLogs(filters: LogFilters): Promise<LogEntry[]>
  async exportLogs(filters: LogFilters): Promise<Blob>
  
  // Diagnóstico
  async runDiagnostics(tests: string[]): Promise<DiagnosticResult>
  async restartService(serviceName: string): Promise<void>
}
```

## Stack de Monitoreo con Docker

### docker-compose.monitoring.yml

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    volumes:
      - ./monitoring/grafana:/etc/grafana/provisioning
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    environment:
      DATA_SOURCE_NAME: "postgresql://mwpanel:password@postgres:5432/mwpanel?sslmode=disable"
    ports:
      - "9187:9187"

  redis-exporter:
    image: oliver006/redis_exporter:latest
    environment:
      REDIS_ADDR: "redis:6379"
    ports:
      - "9121:9121"
```

## Scripts de Gestión

### Inicio del Sistema de Monitoreo
```bash
# Iniciar stack de monitoreo
./scripts/start-monitoring.sh

# Verificar estado
./scripts/check-monitoring.sh

# Detener monitoreo
./scripts/stop-monitoring.sh
```

## Métricas Personalizadas Implementadas

### Métricas HTTP
- `http_request_duration_seconds`: Duración de las peticiones HTTP
- `http_requests_total`: Total de peticiones HTTP
- `http_request_errors_total`: Total de errores HTTP

### Métricas de Base de Datos
- `db_query_duration_seconds`: Duración de las consultas
- `db_connections_active`: Conexiones activas
- `db_query_errors_total`: Errores en consultas

### Métricas de Cache
- `cache_hits_total`: Aciertos de cache
- `cache_misses_total`: Fallos de cache
- `cache_operations_duration_seconds`: Duración de operaciones

### Métricas de Negocio
- `active_users_total`: Usuarios activos por rol
- `login_attempts_total`: Intentos de login
- `activities_created_total`: Actividades creadas
- `messages_sent_total`: Mensajes enviados
- `evaluations_completed_total`: Evaluaciones completadas

## Dashboards de Grafana

### MW Panel Overview
- Sistema general con CPU, memoria, disco
- Métricas HTTP y tiempos de respuesta
- Estado de servicios y contenedores

### MW Panel Business Metrics
- Usuarios activos por rol
- Actividades y evaluaciones
- Mensajes y comunicaciones
- Tendencias de uso

## Seguridad

### Autenticación
- El acceso al centro de monitoreo requiere rol de administrador
- Las métricas sensibles están protegidas por JWT
- Los endpoints de diagnóstico requieren permisos especiales

### Configuración de Prometheus
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'mw-panel-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 10s
```

## Mantenimiento

### Rotación de Logs
- Los logs se rotan automáticamente cada 7 días
- Se mantienen hasta 30 días de histórico
- Compresión automática de logs antiguos

### Retención de Métricas
- Prometheus retiene 15 días de métricas
- Grafana mantiene dashboards y configuraciones persistentes
- Backups automáticos de configuraciones

## Troubleshooting

### El centro de monitoreo no carga
1. Verificar que el usuario tiene rol de administrador
2. Comprobar que los servicios de monitoreo están ejecutándose:
   ```bash
   ./scripts/check-monitoring.sh
   ```

### Las métricas no se actualizan
1. Verificar que Prometheus está scrapeando correctamente:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```
2. Comprobar los logs del backend:
   ```bash
   docker-compose logs -f backend | grep prometheus
   ```

### Las alertas no se envían
1. Verificar la configuración de canales de notificación
2. Comprobar los logs del servicio de alertas
3. Validar las reglas de alerta en el centro de alertas

## Próximos Pasos

1. **Integración con Alertmanager**: Para gestión avanzada de alertas
2. **Métricas de TypeQuest**: Integrar métricas del sistema de mecanografía
3. **Dashboard Móvil**: Versión optimizada para dispositivos móviles
4. **Exportación de Reportes**: Generación de informes PDF con métricas

---

**Última actualización**: Enero 2025
**Versión**: 1.0.0
**Estado**: ✅ Completado y en producción