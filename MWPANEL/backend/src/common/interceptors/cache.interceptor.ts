import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../services/cache.service';
import { LoggerService } from '../services/logger.service';
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHE_TAGS_METADATA,
} from '../decorators/cache.decorator';

/**
 * Interceptor for automatic caching based on decorators
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private cacheService: CacheService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('CacheInterceptor');
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Get cache metadata
    const cacheKey = this.reflector.get<string | Function>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    if (!cacheKey) {
      return next.handle();
    }

    // Get request for context
    const request = context.switchToHttp().getRequest();
    const args = this.extractArgs(context);
    
    // Generate cache key
    const key = typeof cacheKey === 'function' ? cacheKey(args) : cacheKey;
    const fullKey = this.addUserContext(key, request);

    // Try to get from cache
    const cached = await this.cacheService.get(fullKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${fullKey}`);
      return of(cached);
    }

    // Get TTL and tags
    const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());
    const tags = this.reflector.get<string[]>(CACHE_TAGS_METADATA, context.getHandler());

    // Execute handler and cache result
    return next.handle().pipe(
      tap(async (data) => {
        try {
          await this.cacheService.set(fullKey, data, { ttl, tags });
          this.logger.debug(`Cached result for ${fullKey}`);
        } catch (error) {
          this.logger.error(`Failed to cache ${fullKey}`, error);
        }
      }),
    );
  }

  private extractArgs(context: ExecutionContext): any[] {
    const type = context.getType();
    
    if (type === 'http') {
      const request = context.switchToHttp().getRequest();
      return [
        request.params.id,
        request.query.page || 1,
        request.query.limit || 10,
        request.query,
      ];
    }
    
    return context.getArgs();
  }

  private addUserContext(key: string, request: any): string {
    // Add user context for user-specific caching
    if (request.user && key.includes(':user:')) {
      return key.replace(':user:', `:user:${request.user.id}:`);
    }
    
    // Add role context if needed
    if (request.user && key.includes(':role:')) {
      return key.replace(':role:', `:role:${request.user.role}:`);
    }
    
    return key;
  }
}