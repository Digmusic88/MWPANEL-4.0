/**
 * @archivo: assignment-rate-limit.middleware.ts
 * @módulo: Assignments - Middleware
 * @función: Middleware para rate limiting específico de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Middleware especializado para control de rate limiting en operaciones
 * de asignaciones, con límites diferenciados por tipo de operación y rol.
 * 
 * FUNCIONALIDADES:
 * - Rate limiting por endpoint y usuario
 * - Límites diferenciados por rol
 * - Protección contra spam de actividades
 * - Cache distribuido para límites
 * - Logging de intentos de abuso
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.5
 */

import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Configuración de rate limiting por endpoint
 */
interface RateLimitConfig {
  windowMs: number; // Ventana de tiempo en milisegundos
  maxRequests: number; // Máximo número de requests
  skipSuccessful?: boolean; // Si saltar requests exitosos
  message?: string; // Mensaje personalizado
}

/**
 * Límites por rol y tipo de operación
 */
const RATE_LIMITS: Record<string, Record<string, RateLimitConfig>> = {
  // Límites para estudiantes
  student: {
    'POST:/assignments/progress/activity': {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 10, // Max 10 actividades por minuto
      message: 'Demasiadas actividades registradas. Espera un momento.',
    },
    'POST:/assignments/progress/completion': {
      windowMs: 5 * 60 * 1000, // 5 minutos
      maxRequests: 5, // Max 5 completados cada 5 minutos
      message: 'Demasiadas finalizaciones. Tómate tu tiempo.',
    },
    'GET:/assignments/campaigns': {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 30, // Max 30 consultas por minuto
    },
    'GET:/assignments/progress/dashboard': {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 20, // Max 20 consultas de dashboard por minuto
    },
  },
  
  // Límites para profesores
  teacher: {
    'POST:/assignments/campaigns': {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 5, // Max 5 campañas por minuto
      message: 'Límite de creación de campañas alcanzado.',
    },
    'POST:/assignments/progress/reports': {
      windowMs: 5 * 60 * 1000, // 5 minutos
      maxRequests: 10, // Max 10 reportes cada 5 minutos
      message: 'Demasiadas generaciones de reportes.',
    },
    'GET:/assignments/analytics': {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 50, // Max 50 consultas de analytics por minuto
    },
    'PATCH:/assignments/campaigns/bulk-update': {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 2, // Max 2 operaciones bulk por minuto
      message: 'Demasiadas operaciones masivas.',
    },
  },
  
  // Límites para familias
  family: {
    'GET:/assignments/progress/dashboard': {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 30, // Max 30 consultas por minuto
    },
    'GET:/assignments/progress/reports': {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 15, // Max 15 reportes por minuto
    },
  },
  
  // Límites para administradores (más permisivos)
  admin: {
    'POST:/assignments/campaigns': {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 20, // Max 20 campañas por minuto
    },
    'PATCH:/assignments/campaigns/bulk-update': {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 10, // Max 10 operaciones bulk por minuto
    },
  },
};

/**
 * Cache en memoria para tracking de requests
 */
interface RequestTracker {
  count: number;
  resetTime: number;
}

@Injectable()
export class AssignmentRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AssignmentRateLimitMiddleware.name);
  private readonly requestCache = new Map<string, RequestTracker>();
  private readonly suspiciousActivity = new Map<string, number>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    // Limpiar cache periódicamente
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000); // Cada 5 minutos
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extraer información del usuario
      const user = (req as any).user;
      if (!user) {
        return next(); // Sin usuario, pasar al siguiente middleware
      }

      const userId = user.userId;
      const userRole = user.role;
      const method = req.method;
      const path = this.normalizePath(req.path);
      const endpoint = `${method}:${path}`;

      // Obtener configuración de límites para este rol y endpoint
      const roleConfig = RATE_LIMITS[userRole];
      if (!roleConfig) {
        return next(); // Sin configuración específica para este rol
      }

      const endpointConfig = this.findEndpointConfig(roleConfig, endpoint);
      if (!endpointConfig) {
        return next(); // Sin límites para este endpoint
      }

      // Verificar rate limit
      const rateLimitKey = `${userId}:${endpoint}`;
      const isAllowed = await this.checkRateLimit(rateLimitKey, endpointConfig);

      if (!isAllowed) {
        await this.handleRateLimitExceeded(userId, userRole, endpoint, req.ip);
        
        const message = endpointConfig.message || 'Demasiadas solicitudes. Intenta más tarde.';
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message,
            error: 'Too Many Requests',
            retryAfter: Math.ceil(endpointConfig.windowMs / 1000),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Agregar headers informativos
      this.addRateLimitHeaders(res, rateLimitKey, endpointConfig);

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(
        `Error en rate limit middleware: ${error.message}`,
        error.stack,
      );
      next(); // En caso de error, permitir continuar
    }
  }

  /**
   * Verifica si la request está dentro del límite
   */
  private async checkRateLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<boolean> {
    const now = Date.now();
    const tracker = this.requestCache.get(key);

    if (!tracker || now > tracker.resetTime) {
      // Nueva ventana o expirada
      this.requestCache.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return true;
    }

    if (tracker.count >= config.maxRequests) {
      return false; // Límite excedido
    }

    // Incrementar contador
    tracker.count++;
    return true;
  }

  /**
   * Encuentra configuración de endpoint (con wildcards)
   */
  private findEndpointConfig(
    roleConfig: Record<string, RateLimitConfig>,
    endpoint: string,
  ): RateLimitConfig | undefined {
    // Buscar match exacto primero
    if (roleConfig[endpoint]) {
      return roleConfig[endpoint];
    }

    // Buscar patterns con wildcards
    for (const pattern in roleConfig) {
      if (this.matchesPattern(endpoint, pattern)) {
        return roleConfig[pattern];
      }
    }

    return undefined;
  }

  /**
   * Verifica si un endpoint coincide con un patrón
   */
  private matchesPattern(endpoint: string, pattern: string): boolean {
    // Convertir pattern a regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/:\w+/g, '[^/]+'); // :id, :userId, etc.
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(endpoint);
  }

  /**
   * Normaliza el path removiendo query parameters
   */
  private normalizePath(path: string): string {
    return path.split('?')[0];
  }

  /**
   * Maneja cuando se excede el rate limit
   */
  private async handleRateLimitExceeded(
    userId: string,
    userRole: string,
    endpoint: string,
    ip: string,
  ): Promise<void> {
    // Incrementar contador de actividad sospechosa
    const suspiciousKey = `${userId}:${ip}`;
    const currentCount = this.suspiciousActivity.get(suspiciousKey) || 0;
    this.suspiciousActivity.set(suspiciousKey, currentCount + 1);

    // Log del evento
    this.logger.warn(
      `Rate limit exceeded - User: ${userId} (${userRole}), Endpoint: ${endpoint}, IP: ${ip}, Count: ${currentCount + 1}`,
    );

    // Si hay demasiados intentos, considerar bloqueo temporal
    if (currentCount >= 10) {
      this.logger.error(
        `Suspicious activity detected - User: ${userId}, IP: ${ip}. Consider temporary ban.`,
      );
      
      // Aquí se podría implementar bloqueo temporal o alertas adicionales
    }
  }

  /**
   * Agrega headers informativos sobre rate limiting
   */
  private addRateLimitHeaders(
    res: Response,
    key: string,
    config: RateLimitConfig,
  ): void {
    const tracker = this.requestCache.get(key);
    if (tracker) {
      const remaining = Math.max(0, config.maxRequests - tracker.count);
      const resetTime = Math.ceil((tracker.resetTime - Date.now()) / 1000);

      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
        'X-RateLimit-Window': Math.ceil(config.windowMs / 1000).toString(),
      });
    }
  }

  /**
   * Limpia el cache de entries expirados
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Limpiar request cache
    for (const [key, tracker] of this.requestCache.entries()) {
      if (now > tracker.resetTime) {
        this.requestCache.delete(key);
        cleanedCount++;
      }
    }

    // Limpiar actividad sospechosa (después de 1 hora)
    const oneHourAgo = now - 60 * 60 * 1000;
    for (const [key, timestamp] of this.suspiciousActivity.entries()) {
      if (timestamp < oneHourAgo) {
        this.suspiciousActivity.delete(key);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Obtener estadísticas actuales de rate limiting
   */
  public getStats(): {
    activeLimits: number;
    suspiciousActivity: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  } {
    const endpointCounts = new Map<string, number>();

    // Contar requests por endpoint
    for (const key of this.requestCache.keys()) {
      const endpoint = key.split(':').slice(1).join(':');
      endpointCounts.set(endpoint, (endpointCounts.get(endpoint) || 0) + 1);
    }

    // Top 10 endpoints más usados
    const topEndpoints = Array.from(endpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return {
      activeLimits: this.requestCache.size,
      suspiciousActivity: this.suspiciousActivity.size,
      topEndpoints,
    };
  }

  /**
   * Resetear límites para un usuario específico (para testing o administración)
   */
  public resetUserLimits(userId: string): void {
    for (const key of this.requestCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.requestCache.delete(key);
      }
    }
    
    this.logger.log(`Reset rate limits for user: ${userId}`);
  }
}