import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { LoggerService } from '../services/logger.service';

/**
 * Custom throttler guard with enhanced features
 */
@Injectable()
export class CustomThrottleGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    private configService: ConfigService,
    reflector: Reflector,
    private logger: LoggerService,
  ) {
    super(options, storageService, reflector);
    this.logger.setContext('ThrottleGuard');
  }

  /**
   * Generate a unique key for rate limiting
   */
  protected async getTracker(req: Request): Promise<string> {
    const config = this.configService.get('rateLimit');
    
    // Check if IP is blacklisted
    const clientIp = this.getClientIp(req);
    if (config.ddos.blacklist.includes(clientIp)) {
      this.logger.security('Blocked blacklisted IP', {
        ip: clientIp,
        path: req.path,
      });
      throw new ThrottlerException('Access denied');
    }

    // Use fingerprinting if enabled
    if (config.security.enableFingerprinting) {
      return this.generateFingerprint(req);
    }

    return clientIp;
  }


  /**
   * Check if request should be allowed based on custom logic
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const config = this.configService.get('rateLimit');
    
    // Skip rate limiting for whitelisted IPs if config exists
    if (config?.ddos?.whitelist) {
      const clientIp = this.getClientIp(req);
      if (config.ddos.whitelist.includes(clientIp)) {
        return true;
      }
    }

    // Use parent throttler logic
    try {
      return await super.canActivate(context);
    } catch (error) {
      const clientIp = this.getClientIp(req);
      this.logger.security('Rate limit exceeded', {
        path: req.path,
        ip: clientIp,
        userAgent: req.headers['user-agent'],
      });
      throw error;
    }
  }

  /**
   * Get real client IP considering proxy headers
   */
  private getClientIp(req: Request): string {
    const config = this.configService.get('rateLimit');
    
    if (config.ddos.trustProxy) {
      // Check proxy headers in order
      for (const header of config.ddos.proxyHeaders) {
        const value = req.headers[header];
        if (value) {
          // Handle comma-separated list (X-Forwarded-For)
          const ips = String(value).split(',').map(ip => ip.trim());
          return ips[0];
        }
      }
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Generate a fingerprint combining multiple factors
   */
  private generateFingerprint(req: Request): string {
    const factors = [
      this.getClientIp(req),
      req.headers['user-agent'] || 'unknown',
      req.headers['accept-language'] || 'unknown',
      req.headers['accept-encoding'] || 'unknown',
    ];

    // Create a simple hash of the factors
    const fingerprint = factors.join('|');
    return `fingerprint:${Buffer.from(fingerprint).toString('base64')}`;
  }

  /**
   * Get endpoint-specific rate limits
   */
  private getEndpointLimit(path: string): { limit: number; ttl: number } | null {
    const config = this.configService.get('rateLimit.endpoints');
    
    // Auth endpoints
    if (path.includes('/auth/login')) {
      return config.login;
    }
    if (path.includes('/auth/register')) {
      return config.register;
    }
    if (path.includes('/auth/password') || path.includes('/auth/reset')) {
      return config.passwordReset;
    }
    
    // File uploads
    if (path.includes('/upload') || path.includes('/files')) {
      return config.upload;
    }
    
    // Reports
    if (path.includes('/reports') || path.includes('/export')) {
      return config.reports;
    }
    
    // Default API limits
    if (path.startsWith('/api')) {
      return config.api;
    }
    
    return null;
  }

  /**
   * Apply exponential backoff for repeat offenders
   */

  protected async throwThrottlingException(context: ExecutionContext, throttlerLimitDetail: any): Promise<void> {
    const config = this.configService.get('rateLimit.ddos');
    throw new ThrottlerException(config?.errorMessage || 'Rate limit exceeded');
  }
}