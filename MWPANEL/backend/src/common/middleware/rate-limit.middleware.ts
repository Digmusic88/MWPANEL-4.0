import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LoggerService } from '../services/logger.service';

/**
 * Advanced rate limiting middleware with Redis support
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private rateLimiter: RateLimiterRedis | RateLimiterMemory;
  private loginLimiter: RateLimiterRedis | RateLimiterMemory;
  private uploadLimiter: RateLimiterRedis | RateLimiterMemory;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('RateLimitMiddleware');
    this.initializeRateLimiters();
  }

  private initializeRateLimiters() {
    const config = this.configService.get('rateLimit');
    
    // Create Redis client if enabled
    const redisClient = config.ddos.useRedis
      ? new Redis({
          host: config.redis.host,
          port: config.redis.port,
          enableOfflineQueue: false,
        })
      : null;

    // Global rate limiter
    this.rateLimiter = this.createRateLimiter(
      'global',
      config.global.limit,
      config.global.ttl,
      redisClient,
    );

    // Login rate limiter (stricter)
    this.loginLimiter = this.createRateLimiter(
      'login',
      config.endpoints.login.limit,
      config.endpoints.login.ttl,
      redisClient,
    );

    // Upload rate limiter
    this.uploadLimiter = this.createRateLimiter(
      'upload',
      config.endpoints.upload.limit,
      config.endpoints.upload.ttl,
      redisClient,
    );

    if (redisClient) {
      redisClient.on('error', (err) => {
        this.logger.error('Redis connection error for rate limiting', err?.message || err?.toString());
      });
    }
  }

  private createRateLimiter(
    keyPrefix: string,
    points: number,
    duration: number,
    redisClient: Redis | null,
  ) {
    const config = this.configService.get('rateLimit');

    const options = {
      keyPrefix: `${config.redis.keyPrefix}${keyPrefix}:`,
      points, // Number of requests
      duration, // Per duration in seconds
      blockDuration: duration, // Block for same duration
    };

    if (redisClient) {
      return new RateLimiterRedis({
        ...options,
        storeClient: redisClient,
        insuranceLimiter: new RateLimiterMemory(options), // Fallback if Redis fails
      });
    }

    return new RateLimiterMemory(options);
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const config = this.configService.get('rateLimit');
      const clientIp = this.getClientIp(req);
      
      // Check blacklist
      if (config.ddos.blacklist.includes(clientIp)) {
        this.logger.security('Blocked blacklisted IP in middleware', {
          ip: clientIp,
          path: req.path,
        });
        return res.status(403).json({
          statusCode: 403,
          message: 'Access denied',
        });
      }

      // Skip whitelist
      if (config.ddos.whitelist.includes(clientIp)) {
        return next();
      }

      // Select appropriate rate limiter
      const limiter = this.selectRateLimiter(req.path);
      const key = this.generateKey(req);

      // Consume a point
      await limiter.consume(key);

      // Add rate limit headers
      const rateLimiterRes = await limiter.get(key);
      if (rateLimiterRes) {
        res.setHeader('X-RateLimit-Limit', limiter.points);
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
        res.setHeader('X-RateLimit-Reset', rateLimiterRes.msBeforeNext);
      }

      next();
    } catch (rejRes) {
      // Rate limit exceeded
      const config = this.configService.get('rateLimit');
      
      if (rejRes instanceof Error) {
        this.logger.error('Rate limiter error', rejRes.stack);
        return next(); // Don't block on errors
      }

      // Log the rate limit violation
      this.logger.security('Rate limit exceeded in middleware', {
        ip: this.getClientIp(req),
        path: req.path,
        remainingPoints: rejRes.remainingPoints || 0,
        msBeforeNext: rejRes.msBeforeNext || 0,
      });

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', rejRes.points || 0);
      res.setHeader('X-RateLimit-Remaining', rejRes.remainingPoints || 0);
      res.setHeader('X-RateLimit-Reset', rejRes.msBeforeNext || 0);
      res.setHeader('Retry-After', Math.round((rejRes.msBeforeNext || 0) / 1000));

      return res.status(429).json({
        statusCode: 429,
        message: config.ddos.errorMessage,
        retryAfter: Math.round((rejRes.msBeforeNext || 0) / 1000),
      });
    }
  }

  private getClientIp(req: Request): string {
    const config = this.configService.get('rateLimit');
    
    if (config.ddos.trustProxy) {
      for (const header of config.ddos.proxyHeaders) {
        const value = req.headers[header];
        if (value) {
          const ips = String(value).split(',').map(ip => ip.trim());
          return ips[0];
        }
      }
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private selectRateLimiter(path: string) {
    // Use specific limiters for sensitive endpoints
    if (path.includes('/auth/login')) {
      return this.loginLimiter;
    }
    if (path.includes('/upload') || path.includes('/files')) {
      return this.uploadLimiter;
    }
    
    return this.rateLimiter;
  }

  private generateKey(req: Request): string {
    const config = this.configService.get('rateLimit');
    const baseKey = this.getClientIp(req);
    
    // Add user ID if authenticated
    const userId = (req as any).user?.id;
    if (userId) {
      return `${baseKey}:user:${userId}`;
    }

    // Use fingerprinting if enabled
    if (config.security.enableFingerprinting) {
      const userAgent = req.headers['user-agent'] || 'unknown';
      return `${baseKey}:${Buffer.from(userAgent).toString('base64').substring(0, 10)}`;
    }

    return baseKey;
  }
}