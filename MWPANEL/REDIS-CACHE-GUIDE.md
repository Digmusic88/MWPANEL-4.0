# 🚀 Sistema de Cache Redis - MW Panel

## 📋 Resumen

Sistema de cache implementado con Redis y cache-manager para mejorar el rendimiento de queries frecuentes, reducir carga en base de datos y acelerar tiempos de respuesta.

## 🎯 Características Implementadas

1. ✅ **Cache Redis distribuido con fallback a memoria**
2. ✅ **Estrategias de cache por tipo de dato**
3. ✅ **Invalidación automática en cascada**
4. ✅ **Decoradores para caching declarativo**
5. ✅ **Interceptor automático de cache**
6. ✅ **Compresión de valores grandes**
7. ✅ **Cache warming al inicio**
8. ✅ **Estadísticas de rendimiento**

## 📁 Estructura de Archivos

```
backend/
├── src/
│   ├── config/
│   │   └── cache.config.ts              # Configuración central de cache
│   ├── common/
│   │   ├── cache/
│   │   │   └── cache.module.ts          # Módulo global de cache
│   │   ├── services/
│   │   │   └── cache.service.ts         # Servicio principal de cache
│   │   ├── decorators/
│   │   │   └── cache.decorator.ts       # Decoradores de cache
│   │   └── interceptors/
│   │       └── cache.interceptor.ts     # Interceptor automático
│   └── modules/
│       ├── users/
│       │   └── users.service.cached.ts  # Ejemplo: Users con cache
│       ├── competencies/
│       │   └── competencies.service.cached.ts # Ejemplo: Competencias
│       └── dashboard/
│           └── dashboard.service.cached.ts    # Ejemplo: Dashboard
└── .env.cache.example                   # Variables de entorno
```

## 🔧 Configuración

### Variables de Entorno

```bash
# Copiar las variables de ejemplo
cat backend/.env.cache.example >> backend/.env

# Configuración mínima requerida
CACHE_STORE=redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_CACHE_DB=1    # Diferente a sesiones (DB 0)
```

### Estrategias de Cache por Defecto

| Tipo de Dato | TTL | Descripción |
|--------------|-----|-------------|
| Users | 5 min | Datos de usuario, perfiles |
| Students | 10 min | Listas de estudiantes |
| Competencies | 1 hora | Competencias educativas (cambian poco) |
| Evaluations | 5 min | Evaluaciones y calificaciones |
| Class Groups | 30 min | Grupos de clase |
| Subjects | 1 hora | Asignaturas |
| Academic Years | 2 horas | Años académicos |
| Dashboard | 2 min | Datos del dashboard |
| Reports | 10 min | Reportes generados |
| TypeQuest | 5 min | Perfiles de TypeQuest |

## 💻 Uso del Sistema

### 1. Inyectar el Servicio de Cache

```typescript
import { CacheService } from '@/common/services/cache.service';

@Injectable()
export class MyService {
  constructor(
    private cacheService: CacheService,
  ) {}
}
```

### 2. Patrones de Uso Básicos

```typescript
// Get o set automático (recomendado)
async findUser(id: string) {
  return this.cacheService.getOrSet(
    `user:${id}`,
    async () => {
      // Esta función solo se ejecuta si no hay cache
      return this.userRepository.findOne({ where: { id } });
    },
    { ttl: 300 } // 5 minutos
  );
}

// Get y set manual
async getData(key: string) {
  // Intentar obtener del cache
  const cached = await this.cacheService.get(key);
  if (cached) return cached;
  
  // Generar dato
  const data = await this.generateData();
  
  // Guardar en cache
  await this.cacheService.set(key, data, { ttl: 600 });
  return data;
}
```

### 3. Cache con Decoradores

```typescript
import { Cacheable, CacheEvict, CacheTTL } from '@/common/decorators/cache.decorator';

@Injectable()
export class ProductService {
  // Cache automático con decorador
  @Cacheable('products:all', 3600) // 1 hora
  async findAll() {
    return this.productRepository.find();
  }
  
  // Cache con key dinámico
  @Cacheable((args) => `product:${args[0]}`)
  @CacheTTL(1800) // 30 minutos
  async findOne(id: string) {
    return this.productRepository.findOne({ where: { id } });
  }
  
  // Invalidar cache al actualizar
  @CacheEvict(['products:*', 'dashboard:*'])
  async update(id: string, data: any) {
    return this.productRepository.update(id, data);
  }
}
```

### 4. Cache para Paginación

```typescript
async findAllPaginated(page: number, limit: number, filters?: any) {
  const cacheKey = this.cacheService.getPaginationCacheKey(
    'users',
    page,
    limit,
    filters
  );
  
  return this.cacheService.getOrSet(
    cacheKey,
    async () => {
      // Query con paginación
      const [data, total] = await this.userRepository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        where: filters,
      });
      return { data, total, page, limit };
    },
    { ttl: 300 }
  );
}
```

### 5. Cache por Usuario

```typescript
async getUserDashboard(userId: string) {
  const cacheKey = this.cacheService.getUserCacheKey(userId, 'dashboard');
  
  return this.cacheService.getOrSet(
    cacheKey,
    async () => {
      // Generar dashboard específico del usuario
      return this.generateDashboard(userId);
    },
    { ttl: 120 } // 2 minutos
  );
}
```

### 6. Invalidación de Cache

```typescript
// Invalidar un key específico
await this.cacheService.del('user:123');

// Invalidar por patrón
await this.cacheService.delByPattern('users:*');

// Invalidar relacionados (configurable)
await this.cacheService.invalidateRelated('user', '123');
// Invalida: user:*, dashboard:*, students:*

// Limpiar todo el cache
await this.cacheService.reset();
```

### 7. Operaciones Batch

```typescript
// Obtener múltiples valores
const keys = ['user:1', 'user:2', 'user:3'];
const users = await this.cacheService.mget(keys);

// Guardar múltiples valores
await this.cacheService.mset([
  { key: 'user:1', value: user1, options: { ttl: 300 } },
  { key: 'user:2', value: user2, options: { ttl: 300 } },
]);
```

## 📊 Estadísticas de Cache

```typescript
// Obtener estadísticas
const stats = this.cacheService.getStats();
console.log(stats);
// {
//   hits: 1523,
//   misses: 234,
//   sets: 1757,
//   deletes: 89,
//   hitRate: 86.7
// }
```

## 🔄 Invalidación en Cascada

Configurada automáticamente para mantener consistencia:

```javascript
// Cuando se actualiza un usuario, se invalidan:
user:* → Todos los caches del usuario
dashboard:* → Dashboards que incluyen datos del usuario
students:* → Listas de estudiantes (si el usuario es estudiante)

// Cuando se actualiza una evaluación:
evaluation:* → Evaluaciones
student:* → Datos del estudiante evaluado
competencies:* → Competencias relacionadas
dashboard:* → Dashboards afectados
```

## 🚀 Cache Warming

Para pre-cargar datos frecuentes al inicio:

```typescript
@Injectable()
export class CacheWarmupService {
  constructor(
    private competenciesService: CompetenciesService,
    private cacheService: CacheService,
  ) {}
  
  async onApplicationBootstrap() {
    if (this.configService.get('cache.performance.warmOnStartup')) {
      await this.warmupCache();
    }
  }
  
  private async warmupCache() {
    // Cargar competencias (cambian poco)
    await this.competenciesService.findAll();
    
    // Cargar años académicos
    await this.academicYearService.findAll();
    
    // Cargar configuraciones
    await this.settingsService.getAll();
  }
}
```

## 🎯 Mejores Prácticas

### 1. TTL Apropiados

```typescript
// ❌ Malo: TTL muy largo para datos volátiles
@Cacheable('active-users', 3600) // 1 hora es mucho

// ✅ Bueno: TTL corto para datos que cambian
@Cacheable('active-users', 60) // 1 minuto
```

### 2. Keys Descriptivos

```typescript
// ❌ Malo: Keys ambiguos
const key = 'data';

// ✅ Bueno: Keys descriptivos y únicos
const key = `user:${userId}:preferences:${year}`;
```

### 3. Invalidación Correcta

```typescript
// ❌ Malo: No invalidar cache al actualizar
async updateUser(id: string, data: any) {
  return this.userRepository.update(id, data);
}

// ✅ Bueno: Invalidar cache relevante
async updateUser(id: string, data: any) {
  const result = await this.userRepository.update(id, data);
  await this.cacheService.invalidateRelated('user', id);
  return result;
}
```

### 4. Manejo de Errores

```typescript
// El servicio de cache maneja errores automáticamente
// Si Redis falla, continúa sin cache (no bloquea la app)
const data = await this.cacheService.get(key); // null si falla
```

## 📈 Monitoreo y Debugging

### Logs de Cache

```bash
# Ver hits/misses de cache
grep "Cache hit\|Cache miss" logs/application-*.log

# Analizar patrones de cache
./scripts/analyze-logs.sh | grep cache

# Ver invalidaciones
grep "invalidated" logs/application-*.log
```

### Redis CLI

```bash
# Conectar a Redis
docker-compose exec redis redis-cli

# Seleccionar DB de cache
SELECT 1

# Ver todas las keys de cache
KEYS mw-cache:*

# Ver TTL de una key
TTL mw-cache:user:123

# Monitorear comandos en tiempo real
MONITOR
```

## 🔍 Troubleshooting

### Cache No Funciona

1. Verificar que Redis está corriendo:
```bash
docker-compose ps redis
```

2. Verificar conexión:
```bash
docker-compose exec backend npm run test:redis
```

3. Verificar configuración:
```bash
grep CACHE backend/.env
```

### Hit Rate Bajo

1. Revisar TTLs - pueden ser muy cortos
2. Verificar invalidaciones excesivas
3. Analizar patrones de acceso

### Memoria Redis Alta

1. Revisar tamaño de valores:
```bash
redis-cli --bigkeys
```

2. Ajustar límites de memoria:
```bash
CONFIG SET maxmemory 512mb
CONFIG SET maxmemory-policy allkeys-lru
```

## 📝 Checklist de Implementación

- [x] Cache manager con Redis configurado
- [x] Servicio de cache con patrones comunes
- [x] Decoradores para caching declarativo
- [x] Interceptor automático de cache
- [x] Invalidación en cascada
- [x] Compresión de valores grandes
- [x] Estadísticas de rendimiento
- [x] Ejemplos en servicios clave
- [x] Variables de entorno
- [x] Documentación completa

El sistema de cache está completamente operativo y listo para mejorar el rendimiento de la aplicación.