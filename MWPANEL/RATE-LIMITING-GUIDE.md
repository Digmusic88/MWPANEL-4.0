# 🛡️ Sistema de Rate Limiting y Protección DDoS - MW Panel

## 📋 Resumen

Sistema avanzado de rate limiting implementado con NestJS Throttler y rate-limiter-flexible, proporcionando protección contra ataques DDoS, fuerza bruta y abuso de API.

## 🎯 Características Implementadas

1. ✅ **Rate limiting global y por endpoint**
2. ✅ **Protección DDoS avanzada con detección de patrones**
3. ✅ **Soporte para Redis (distribuido)**
4. ✅ **Fingerprinting de requests**
5. ✅ **Exponential backoff para infractores**
6. ✅ **Whitelist/Blacklist de IPs**
7. ✅ **Headers de rate limit estándar**
8. ✅ **Panel de administración**

## 📁 Estructura de Archivos

```
backend/
├── src/
│   ├── config/
│   │   └── rate-limit.config.ts         # Configuración central
│   ├── common/
│   │   ├── guards/
│   │   │   └── throttle.guard.ts        # Guard personalizado
│   │   ├── middleware/
│   │   │   └── rate-limit.middleware.ts # Middleware avanzado
│   │   ├── decorators/
│   │   │   └── rate-limit.decorator.ts  # Decoradores útiles
│   │   └── services/
│   │       └── ddos-protection.service.ts # Servicio DDoS
│   └── modules/
│       └── settings/
│           └── controllers/
│               └── rate-limit.controller.ts # API de gestión
└── .env.rate-limit.example              # Variables de entorno
```

## 🔧 Configuración

### Variables de Entorno

```bash
# Copiar las variables de ejemplo
cat backend/.env.rate-limit.example >> backend/.env

# Editar según necesidades
nano backend/.env
```

### Límites por Defecto

| Endpoint | Límite | Ventana | Descripción |
|----------|--------|---------|-------------|
| Global | 100 req | 60s | Todos los endpoints |
| Login | 5 req | 5 min | Intentos de login |
| Register | 3 req | 1 hora | Registros nuevos |
| Upload | 10 req | 5 min | Subida de archivos |
| Reports | 5 req | 10 min | Generación de reportes |
| API | 60 req | 1 min | Llamadas API generales |

## 💻 Uso del Sistema

### 1. Decoradores en Controllers

```typescript
import { 
  AuthRateLimit, 
  UploadRateLimit, 
  ReportRateLimit,
  NoRateLimit 
} from '@/common/decorators/rate-limit.decorator';

@Controller('auth')
export class AuthController {
  @Post('login')
  @AuthRateLimit() // 5 intentos cada 5 minutos
  async login(@Body() dto: LoginDto) {
    // ...
  }

  @Post('upload')
  @UploadRateLimit() // 10 archivos cada 5 minutos
  async upload(@UploadedFile() file) {
    // ...
  }

  @Get('health')
  @NoRateLimit() // Sin límite para health checks
  async health() {
    // ...
  }
}
```

### 2. Rate Limiting Personalizado

```typescript
import { RateLimit, UserRateLimit } from '@/common/decorators/rate-limit.decorator';

@Controller('api')
export class ApiController {
  @Get('data')
  @RateLimit(10, 60) // 10 requests por minuto
  async getData() {
    // ...
  }

  @Post('action')
  @UserRateLimit(5, 300) // 5 por usuario cada 5 minutos
  async performAction() {
    // ...
  }
}
```

### 3. Protección DDoS Automática

El sistema detecta automáticamente patrones de ataque:

- **Alta tasa de requests**: >1000 req/min
- **Rapid fire**: <10ms entre requests
- **Path scanning**: >50 rutas diferentes
- **Error flooding**: >100 errores/min

## 📊 Headers de Respuesta

El sistema añade headers estándar:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642684800
Retry-After: 45
```

## 🔍 API de Administración

### Endpoints de Gestión

```bash
# Ver estadísticas
GET /api/settings/rate-limit/statistics

# Ver patrones de ataque
GET /api/settings/rate-limit/patterns

# Bloquear IP manualmente
POST /api/settings/rate-limit/block/192.168.1.100
{
  "reason": "Suspicious activity detected"
}

# Desbloquear IP
DELETE /api/settings/rate-limit/block/192.168.1.100

# Verificar estado de IP
GET /api/settings/rate-limit/blocked/192.168.1.100
```

### Respuesta de Estadísticas

```json
{
  "totalPatterns": 45,
  "blockedIps": 3,
  "activeMonitoring": 42,
  "redisBlacklist": [
    {
      "ip": "192.168.1.100",
      "reason": "Excessive rate limit violations"
    }
  ],
  "topOffenders": [
    {
      "ip": "192.168.1.50",
      "count": 1543,
      "firstSeen": "2024-01-17T10:00:00Z",
      "lastSeen": "2024-01-17T10:30:00Z",
      "blocked": true,
      "reason": "High request rate"
    }
  ]
}
```

## 🛡️ Características de Seguridad

### 1. Fingerprinting

Combina múltiples factores para identificar usuarios:
- IP Address
- User-Agent
- Accept-Language
- Accept-Encoding

### 2. Exponential Backoff

Aumenta restricciones para infractores reincidentes:
- 1ra violación: Bloqueo normal
- 2da violación: Bloqueo × 1.5
- 3ra violación: Bloqueo × 2.25
- etc.

### 3. Whitelist/Blacklist

```bash
# Whitelist (nunca limitados)
RATE_LIMIT_WHITELIST=127.0.0.1,10.0.0.1

# Blacklist (siempre bloqueados)
RATE_LIMIT_BLACKLIST=192.168.1.100,172.16.0.50
```

## 📈 Monitoreo y Alertas

### Logs de Seguridad

```bash
# Ver intentos de rate limit
grep "Rate limit exceeded" logs/application-*.log

# Ver IPs bloqueadas
grep "Blocking IP for DDoS" logs/security-*.log

# Analizar patrones
./scripts/analyze-logs.sh security
```

### Métricas Importantes

1. **Requests por minuto**: Normal <1000
2. **IPs únicas**: Spike indica ataque distribuido
3. **Errores 429**: Aumento indica ataque
4. **Latencia**: Aumento puede indicar DDoS

## 🚀 Mejores Prácticas

### 1. Configuración por Ambiente

```bash
# Desarrollo
RATE_LIMIT_MAX=1000  # Más permisivo

# Producción
RATE_LIMIT_MAX=100   # Más restrictivo
```

### 2. Endpoints Críticos

Siempre proteger:
- Login/Register
- Password reset
- File uploads
- Report generation
- Payment processing

### 3. Excepciones

No limitar:
- Health checks
- Static assets
- WebSocket connections (usar límites diferentes)

## 🔄 Integración con Redis

### Configuración Redis

```bash
# Habilitar Redis para rate limiting distribuido
RATE_LIMIT_USE_REDIS=true
REDIS_HOST=redis
REDIS_PORT=6379
```

### Ventajas

- Rate limiting compartido entre instancias
- Persistencia de blacklists
- Mejor rendimiento
- Estadísticas centralizadas

## 🎯 Testing

### Prueba Manual

```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  sleep 0.1
done

# Verificar headers
curl -i http://localhost:3000/api/users
```

### Prueba de Carga

```bash
# Instalar artillery
npm install -g artillery

# Crear test
cat > load-test.yml << EOF
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 100
scenarios:
  - flow:
    - get:
        url: "/api/users"
EOF

# Ejecutar
artillery run load-test.yml
```

## 🐛 Troubleshooting

### Rate Limit No Funciona

1. Verificar orden de guards en `app.module.ts`
2. Comprobar que Redis está corriendo
3. Revisar logs de errores

### IPs Incorrectas

1. Configurar `RATE_LIMIT_TRUST_PROXY=true`
2. Verificar headers de Nginx
3. Ajustar `proxyHeaders` en config

### Falsos Positivos

1. Añadir IPs internas a whitelist
2. Ajustar umbrales según tráfico
3. Revisar fingerprinting

## 📝 Checklist de Implementación

- [x] NestJS Throttler configurado
- [x] rate-limiter-flexible instalado
- [x] Guards y middleware implementados
- [x] Decoradores personalizados
- [x] Servicio DDoS protection
- [x] API de administración
- [x] Headers de rate limit
- [x] Integración con Redis
- [x] Logging y monitoreo
- [x] Documentación completa

El sistema de rate limiting está completamente operativo y listo para proteger la aplicación contra abusos y ataques.