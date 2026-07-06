# 📝 Sistema de Logging Estructurado - MW Panel

## 📋 Resumen

Sistema profesional de logging implementado con Winston para MW Panel, proporcionando logs estructurados, rotación automática, y análisis avanzado.

## 🎯 Características Implementadas

1. ✅ **Logs estructurados con Winston**
2. ✅ **Rotación diaria automática**
3. ✅ **Múltiples niveles de log**
4. ✅ **Logs de auditoría separados**
5. ✅ **Interceptor HTTP global**
6. ✅ **Decoradores para logging automático**
7. ✅ **Script de análisis de logs**
8. ✅ **Request ID tracking**

## 📁 Estructura de Archivos

```
backend/
├── src/
│   ├── config/
│   │   └── logger.config.ts          # Configuración de Winston
│   ├── common/
│   │   ├── services/
│   │   │   └── logger.service.ts     # Servicio de logging
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts # Interceptor HTTP
│   │   ├── decorators/
│   │   │   └── log.decorator.ts      # Decoradores de logging
│   │   └── middleware/
│   │       └── request-context.middleware.ts # Request ID
│   └── app.module.ts                 # Integración global
├── logs/                            # Directorio de logs
│   ├── application-YYYY-MM-DD.log   # Logs generales
│   ├── error-YYYY-MM-DD.log        # Solo errores
│   └── audit-YYYY-MM-DD.log        # Auditoría
└── scripts/
    └── analyze-logs.sh              # Análisis de logs
```

## 🔧 Configuración

### Variables de Entorno

```bash
# .env
LOG_LEVEL=debug              # Nivel de log (error, warn, info, debug)
LOG_MAX_FILES=14d           # Retención de logs
LOG_MAX_SIZE=20m            # Tamaño máximo por archivo
```

### Niveles de Log

```typescript
{
  error: 0,    // Errores críticos
  warn: 1,     // Advertencias
  info: 2,     // Información general
  http: 3,     // Logs HTTP
  verbose: 4,  // Información detallada
  debug: 5,    // Debugging
  silly: 6     // Todo
}
```

## 💻 Uso del Sistema

### 1. Inyectar el Logger en un Servicio

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../common/services/logger.service';

@Injectable()
export class MyService {
  constructor(
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('MyService');
  }

  async myMethod() {
    // Log simple
    this.logger.log('Método ejecutado');
    
    // Log con metadata
    this.logger.info('Usuario creado', {
      userId: user.id,
      email: user.email,
    });
    
    // Log de error
    try {
      // código...
    } catch (error) {
      this.logger.error('Error en operación', error.stack);
    }
  }
}
```

### 2. Usar Decoradores

```typescript
import { Log, Audit, Measure } from '../common/decorators/log.decorator';

@Injectable()
export class UserService {
  @Log('Creating new user')
  @Measure('user.create')
  async createUser(data: CreateUserDto) {
    // El método será loggeado automáticamente
    return this.userRepository.save(data);
  }

  @Audit('User deletion')
  async deleteUser(id: string) {
    // Genera log de auditoría automáticamente
    return this.userRepository.delete(id);
  }
}
```

### 3. Logs Especializados

```typescript
// Log de seguridad
this.logger.security('Failed login attempt', {
  email: email,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
});

// Log de rendimiento
this.logger.performance('Database query', 245, {
  query: 'SELECT * FROM users',
  rows: 100,
});

// Log de auditoría
this.logger.audit('User updated profile', userId, {
  changes: { name: 'New Name' },
  timestamp: new Date(),
});
```

## 📊 Análisis de Logs

### Script de Análisis

```bash
# Ver resumen general
./scripts/analyze-logs.sh summary

# Ver últimos errores
./scripts/analyze-logs.sh errors -n 50

# Ver eventos de seguridad
./scripts/analyze-logs.sh security

# Analizar rendimiento
./scripts/analyze-logs.sh performance

# Ver logs de auditoría
./scripts/analyze-logs.sh audit

# Buscar en logs
./scripts/analyze-logs.sh search "user@example.com"

# Seguir logs en tiempo real
./scripts/analyze-logs.sh tail
```

### Ejemplos de Salida

#### Resumen
```
📊 Resumen de logs del sistema:
==================================

Logs de hoy:
application-2025-01-17.log:     15234 líneas
error-2025-01-17.log:            342 líneas
audit-2025-01-17.log:            892 líneas

Distribución por nivel:
   8234 info
   3421 debug
    892 http
    342 error
    123 warn
```

#### Análisis de Rendimiento
```
⚡ Análisis de rendimiento:
============================

Operaciones más lentas:
auth.validateUser: 523ms
user.findByEmail: 234ms
database.query: 189ms

Promedio por operación:
auth.login                               45.23ms
user.create                              89.45ms
file.upload                             234.12ms
```

## 🔍 Formato de Logs

### Log Estándar
```json
{
  "timestamp": "2025-01-17 14:23:45.123",
  "level": "info",
  "message": "User logged in",
  "context": "AuthService",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "metadata": {
    "email": "user@example.com",
    "role": "teacher"
  }
}
```

### Log de Error
```json
{
  "timestamp": "2025-01-17 14:23:45.123",
  "level": "error",
  "message": "Database connection failed",
  "context": "DatabaseService",
  "trace": "Error: Connection timeout\n    at...",
  "metadata": {
    "host": "localhost",
    "port": 5432
  }
}
```

### Log de Auditoría
```json
{
  "timestamp": "2025-01-17 14:23:45.123",
  "level": "info",
  "message": "Audit: User profile updated",
  "context": "UserService",
  "audit": true,
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "action": "profile.update",
  "details": {
    "changes": {
      "name": "New Name",
      "email": "newemail@example.com"
    }
  }
}
```

## 🛡️ Seguridad en Logs

### Sanitización Automática

El sistema automáticamente redacta información sensible:

```typescript
// Campos sensibles que se redactan:
[
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'refreshToken',
  'accessToken',
  'apiKey',
  'secret',
  'creditCard',
  'cvv',
]

// Resultado en logs:
{
  "email": "user@example.com",
  "password": "[REDACTED]"
}
```

## 🚀 Mejores Prácticas

### 1. Contexto Consistente
```typescript
constructor(private logger: LoggerService) {
  this.logger.setContext('MyService');
}
```

### 2. Niveles Apropiados
- **Error**: Errores que requieren atención inmediata
- **Warn**: Situaciones anormales pero manejables
- **Info**: Eventos importantes del negocio
- **Debug**: Información de desarrollo

### 3. Metadata Útil
```typescript
this.logger.info('Operación completada', {
  duration: endTime - startTime,
  userId: user.id,
  operation: 'user.update',
  changes: 5,
});
```

### 4. Logs Estructurados
```typescript
// ❌ Malo
this.logger.log(`User ${userId} logged in at ${time}`);

// ✅ Bueno
this.logger.log('User logged in', {
  userId,
  time,
  ip: request.ip,
});
```

## 📈 Monitoreo y Alertas

### Integración con Herramientas

El formato JSON permite fácil integración con:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki**
- **AWS CloudWatch**
- **Datadog**

### Queries Útiles

```bash
# Errores en las últimas 24 horas
jq 'select(.level == "error")' logs/application-*.log

# Operaciones lentas (>500ms)
jq 'select(.performance == true and .duration > 500)' logs/application-*.log

# Logins fallidos
jq 'select(.security == true and .event == "Failed login attempt")' logs/application-*.log
```

## 🔄 Rotación y Limpieza

- **Rotación diaria**: Nuevos archivos cada día
- **Compresión automática**: Archivos antiguos se comprimen
- **Retención configurable**: Por defecto 7-30 días
- **Limpieza automática**: Winston elimina archivos viejos

## 🎯 Beneficios del Sistema

1. **Debugging Mejorado**: Trazabilidad completa de errores
2. **Auditoría Completa**: Registro de todas las acciones importantes
3. **Análisis de Rendimiento**: Identificación de cuellos de botella
4. **Seguridad**: Detección de intentos de acceso no autorizado
5. **Cumplimiento**: Logs para auditorías y compliance
6. **Troubleshooting**: Request ID para seguir flujos completos

## 📝 Checklist de Implementación

- [x] Winston instalado y configurado
- [x] LoggerService implementado
- [x] Interceptor HTTP global
- [x] Decoradores de logging
- [x] Request ID middleware
- [x] Rotación de logs configurada
- [x] Script de análisis
- [x] Documentación completa
- [ ] Integración con servicio externo (opcional)
- [ ] Alertas automáticas (opcional)

El sistema de logging está completamente operativo y listo para producción.