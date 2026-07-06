import { SetMetadata } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';

/**
 * Custom rate limit decorators
 */

// Metadata keys
export const RATE_LIMIT_KEY = 'rateLimit';
export const RATE_LIMIT_TYPE_KEY = 'rateLimitType';

/**
 * Apply custom rate limiting to a route
 */
export const RateLimit = (limit: number, ttl: number) => 
  SetMetadata(RATE_LIMIT_KEY, { limit, ttl });

/**
 * Apply rate limiting by type
 */
export const RateLimitType = (type: 'login' | 'api' | 'upload' | 'reports') =>
  SetMetadata(RATE_LIMIT_TYPE_KEY, type);

/**
 * Generous rate limit for authentication endpoints (production-ready)
 */
export const AuthRateLimit = () => Throttle({ default: { limit: 100, ttl: 300 } });

/**
 * Rate limit for file uploads
 */
export const UploadRateLimit = () => Throttle({ default: { limit: 50, ttl: 300 } });

/**
 * Rate limit for report generation
 */
export const ReportRateLimit = () => Throttle({ default: { limit: 20, ttl: 600 } });

/**
 * Skip rate limiting (for health checks, etc.)
 */
export const NoRateLimit = () => SkipThrottle();

/**
 * Apply progressive rate limiting (gets stricter with repeated violations)
 */
export const ProgressiveRateLimit = () => SetMetadata('progressiveRateLimit', true);

/**
 * Rate limit by user ID instead of IP
 */
export const UserRateLimit = (limit: number, ttl: number) => 
  SetMetadata('userRateLimit', { limit, ttl });

/**
 * Combine IP and User rate limiting
 */
export const CombinedRateLimit = (
  ipLimit: number,
  ipTtl: number,
  userLimit: number,
  userTtl: number,
) => SetMetadata('combinedRateLimit', { 
  ip: { limit: ipLimit, ttl: ipTtl },
  user: { limit: userLimit, ttl: userTtl },
});