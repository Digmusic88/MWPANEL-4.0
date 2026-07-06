# 📊 Guía de Monitoreo con Prometheus/Grafana - MW Panel

## 📋 Resumen

Sistema completo de monitoreo implementado con Prometheus para recolección de métricas y Grafana para visualización, incluyendo métricas de negocio, rendimiento del sistema y alertas automatizadas.

## 🎯 Características Implementadas

1. ✅ **Recolección de métricas con Prometheus**
2. ✅ **Visualización con Grafana**
3. ✅ **Métricas de negocio personalizadas**
4. ✅ **Exporters para PostgreSQL, Redis y Node**
5. ✅ **Dashboards predefinidos**
6. ✅ **Sistema de alertas**
7. ✅ **Integración con NestJS**
8. ✅ **Scripts de administración**

## 📁 Estructura de Archivos

```
mw-panel/
├── backend/src/
│   ├── config/
│   │   └── prometheus.config.ts         # Configuración de métricas
│   └── modules/monitoring/
│       ├── monitoring.module.ts         # Módulo principal
│       ├── monitoring.service.ts        # Servicio de métricas
│       ├── monitoring.controller.ts     # Endpoints de métricas
│       └── interceptors/
│           └── metrics.interceptor.ts   # Interceptor HTTP
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml              # Configuración principal
│   │   └── alerts.yml                  # Reglas de alertas
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/
│       │   │   └── prometheus.yml      # Datasource config
│       │   └── dashboards/
│       │       └── dashboard.yml       # Dashboard config
│       └── dashboards/
│           ├── mw-panel-overview.json  # Dashboard general
│           └── mw-panel-business.json  # Métricas de negocio
├── docker-compose.monitoring.yml        # Stack de monitoreo
└── scripts/
    ├── start-monitoring.sh             # Iniciar monitoreo
    ├── stop-monitoring.sh              # Detener monitoreo
    └── check-monitoring.sh             # Verificar estado
```

## 🔧 Instalación y Configuración

### 1. Dependencias Instaladas

```bash
# Backend
npm install --save @willsoto/nestjs-prometheus prom-client @nestjs/terminus
```

### 2. Servicios de Monitoreo

El stack incluye:
- **Prometheus**: Recolección y almacenamiento de métricas
- **Grafana**: Visualización y dashboards
- **Node Exporter**: Métricas del sistema operativo
- **PostgreSQL Exporter**: Métricas de base de datos
- **Redis Exporter**: Métricas de cache

## 💻 Uso del Sistema

### Iniciar Monitoreo

```bash
# Iniciar todos los servicios de monitoreo
./scripts/start-monitoring.sh

# Verificar estado
./scripts/check-monitoring.sh
```

### Detener Monitoreo

```bash
# Detener servicios (conservando datos)
./scripts/stop-monitoring.sh

# Detener y eliminar datos
./scripts/stop-monitoring.sh
# Responder 'y' cuando pregunte sobre eliminar volúmenes
```

### URLs de Acceso

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - Usuario: `admin`
  - Contraseña: `admin123`
- **Métricas MW Panel**: http://localhost:3000/api/metrics

## 📊 Métricas Disponibles

### Métricas HTTP

```prometheus
# Duración de requests
http_request_duration_seconds{method="GET",route="/api/students",status_code="200"}

# Total de requests
http_requests_total{method="POST",route="/api/auth/login",status_code="401"}

# Errores HTTP
http_requests_errors_total{method="GET",route="/api/users",error_type="server_error"}
```

### Métricas de Base de Datos

```prometheus
# Duración de queries
db_query_duration_seconds{query_type="SELECT",table="students"}

# Conexiones activas
db_connections_active{state="active"}
db_connections_active{state="idle"}

# Errores de queries
db_query_errors_total{query_type="INSERT",error_type="constraint_violation"}
```

### Métricas de Cache

```prometheus
# Cache hits/misses
cache_hits_total{cache_type="redis",key_pattern="user:*"}
cache_misses_total{cache_type="redis",key_pattern="competency:*"}

# Evictions
cache_evictions_total{cache_type="redis",reason="ttl_expired"}
```

### Métricas de Negocio

```prometheus
# Usuarios activos por rol
active_users_total{role="teacher"}
active_users_total{role="student"}

# Estudiantes matriculados
students_enrolled_total{educational_level="Primaria",course="all"}

# Actividades creadas
activities_created_total{type="task",subject="Matemáticas"}

# Evaluaciones completadas
evaluations_completed_total{evaluation_type="competency",competency="Comunicación"}

# Mensajes intercambiados
messages_exchanged_total{sender_role="teacher",receiver_role="family"}
```

### Métricas del Sistema

```prometheus
# Uso de memoria
nodejs_memory_usage_bytes{type="heapUsed"}
nodejs_memory_usage_bytes{type="heapTotal"}

# CPU
nodejs_cpu_usage_percentage

# Métricas del OS (via Node Exporter)
node_cpu_seconds_total
node_memory_MemAvailable_bytes
node_filesystem_avail_bytes
```

## 📈 Dashboards Disponibles

### 1. MW Panel Overview

Dashboard general con:
- Request rate por endpoint
- Percentil 95 de tiempo de respuesta
- Usuarios activos por rol
- Cache hit rate
- Uso de memoria
- Conexiones de base de datos

### 2. MW Panel Business Metrics

Métricas de negocio:
- Total de estudiantes matriculados
- Actividades creadas (24h)
- Evaluaciones completadas (24h)
- Mensajes intercambiados (24h)
- Distribución de estudiantes por nivel educativo
- Flujo de mensajes entre roles
- KPIs principales (attendance, enrollment, completion rates)

## 🚨 Sistema de Alertas

### Alertas Configuradas

1. **High Error Rate**
   - Condición: Tasa de error > 5% por 5 minutos
   - Severidad: Warning

2. **High Response Time**
   - Condición: P95 > 2 segundos por 5 minutos
   - Severidad: Warning

3. **Database Connection Issue**
   - Condición: Sin conexiones activas por 2 minutos
   - Severidad: Critical

4. **High Memory Usage**
   - Condición: Heap usado > 90% por 5 minutos
   - Severidad: Warning

5. **Low Cache Hit Rate**
   - Condición: Hit rate < 50% por 10 minutos
   - Severidad: Warning

6. **Low Student Attendance**
   - Condición: Tasa de asistencia < 80% por 1 hora
   - Severidad: Info

7. **High Failed Login Attempts**
   - Condición: > 10 intentos fallidos por minuto
   - Severidad: Security

## 🛠️ Uso en el Código

### Registrar Métricas Personalizadas

```typescript
// En cualquier servicio
constructor(private monitoringService: MonitoringService) {}

// Registrar actividad creada
this.monitoringService.recordActivityCreated('task', 'Matemáticas');

// Registrar evaluación completada
this.monitoringService.recordEvaluationCompleted('competency', 'Comunicación');

// Registrar mensaje enviado
this.monitoringService.recordMessageExchanged('teacher', 'family');
```

### Métricas Automáticas

El `MetricsInterceptor` registra automáticamente:
- Duración de cada request HTTP
- Status code de respuesta
- Errores y excepciones

### Obtener Métricas de Módulo

```typescript
// GET /api/monitoring/metrics/auth
{
  "loginAttempts": 125,
  "activeSessions": 48
}

// GET /api/monitoring/metrics/students
{
  "enrollmentRate": 85.5,
  "attendanceRate": 92.3
}
```

## 🔍 Queries Útiles de Prometheus

### Top 10 endpoints más lentos

```promql
topk(10, 
  histogram_quantile(0.95,
    sum by (route) (rate(http_request_duration_seconds_bucket[5m]))
  )
)
```

### Tasa de error por endpoint

```promql
sum by (route) (rate(http_requests_errors_total[5m])) 
/ 
sum by (route) (rate(http_requests_total[5m])) 
* 100
```

### Usuarios activos en las últimas 24h

```promql
sum(active_users_total)
```

### Crecimiento de estudiantes

```promql
increase(students_enrolled_total[30d])
```

## 🎯 Mejores Prácticas

### 1. Nombres de Métricas

```typescript
// ✅ Bueno: Descriptivo y con unidades
http_request_duration_seconds
cache_hit_rate_percentage

// ❌ Malo: Ambiguo
request_time
cache_rate
```

### 2. Labels Consistentes

```typescript
// ✅ Bueno: Labels reutilizables
{ method: "GET", route: "/api/users", status_code: "200" }

// ❌ Malo: Labels específicos
{ get_users_success: "true" }
```

### 3. Cardinalidad

```typescript
// ✅ Bueno: Labels con valores limitados
{ role: "teacher" } // 4 posibles valores

// ❌ Malo: Labels con alta cardinalidad
{ user_id: "12345" } // Miles de valores posibles
```

## 🐛 Troubleshooting

### Prometheus no recolecta métricas

1. Verificar que el backend expone métricas:
   ```bash
   curl http://localhost:3000/api/metrics
   ```

2. Verificar configuración de targets:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

### Grafana no muestra datos

1. Verificar datasource:
   - Settings → Data Sources → Prometheus
   - Test connection

2. Verificar queries en Prometheus directamente

### Alta utilización de memoria

1. Revisar retención de datos en Prometheus
2. Ajustar intervalo de scraping si es necesario
3. Limitar métricas con alta cardinalidad

## 📝 Checklist de Implementación

- [x] Instalación de dependencias
- [x] Configuración de Prometheus
- [x] Módulo de monitoreo en NestJS
- [x] Interceptor para métricas HTTP
- [x] Métricas de negocio personalizadas
- [x] Exporters para infraestructura
- [x] Dashboards de Grafana
- [x] Sistema de alertas
- [x] Scripts de administración
- [x] Documentación completa

## 🎉 Conclusión

El sistema de monitoreo está completamente operativo, proporcionando visibilidad completa del rendimiento del sistema, métricas de negocio y alertas proactivas para mantener la salud del sistema MW Panel.