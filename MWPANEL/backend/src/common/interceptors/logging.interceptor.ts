import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const url = request.url;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip || request.get('x-forwarded-for') || request.connection.remoteAddress;
    const userId = request.user?.id || 'anonymous';

    const now = Date.now();

    // Log de entrada de la petición
    this.logger.http(`Incoming ${method} ${url}`, {
      method,
      url,
      ip,
      userAgent,
      userId,
      body: this.sanitizeBody(request.body),
      query: request.query,
      params: request.params,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - now;
          const statusCode = response.statusCode;

          // Skip logging for streaming responses (proxy endpoints, file downloads, etc.)
          const isStreamingResponse = url.includes('/proxy/') || 
                                      response.get('content-disposition') || 
                                      data instanceof Buffer ||
                                      (typeof data === 'object' && data && data.constructor.name === 'StreamableFile');

          if (isStreamingResponse) {
            this.logger.http(`Streaming ${method} ${url} ${statusCode} - ${duration}ms`, {
              method,
              url,
              statusCode,
              duration,
              userId,
              responseType: 'stream',
            });
          } else {
            // Log de respuesta exitosa para respuestas regulares
            let responseSize = 0;
            try {
              responseSize = data ? JSON.stringify(data).length : 0;
            } catch (err) {
              responseSize = -1; // Indica que no se pudo serializar
            }
            
            this.logger.http(`Outgoing ${method} ${url} ${statusCode} - ${duration}ms`, {
              method,
              url,
              statusCode,
              duration,
              userId,
              responseSize,
            });
          }

          // Log de rendimiento para peticiones lentas
          if (duration > 1000) {
            this.logger.performance(`Slow request: ${method} ${url}`, duration, {
              method,
              url,
              userId,
            });
          }
        },
        error: (error) => {
          const duration = Date.now() - now;
          const statusCode = error.status || 500;

          // Log de error
          this.logger.error(
            `Error ${method} ${url} ${statusCode} - ${duration}ms`,
            error.stack,
            'HTTP',
          );

          // Log de seguridad para errores de autenticación
          if (statusCode === 401 || statusCode === 403) {
            this.logger.security('Unauthorized access attempt', {
              method,
              url,
              ip,
              userId,
              error: error.message,
            });
          }
        },
      }),
    );
  }

  /**
   * Sanitiza el body para evitar loggear información sensible
   */
  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };
    const sensitiveFields = [
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
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}