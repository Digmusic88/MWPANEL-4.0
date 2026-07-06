import { registerAs } from '@nestjs/config';

export default registerAs('rateLimit', () => ({
  // Global rate limiting
  global: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10), // seconds
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // max requests per TTL
  },

  // Specific endpoint configurations
  endpoints: {
    // Auth endpoints - more restrictive
    login: {
      ttl: parseInt(process.env.RATE_LIMIT_LOGIN_TTL || '300', 10), // 5 minutes
      limit: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5', 10), // 5 attempts per 5 min
    },
    register: {
      ttl: parseInt(process.env.RATE_LIMIT_REGISTER_TTL || '3600', 10), // 1 hour
      limit: parseInt(process.env.RATE_LIMIT_REGISTER_MAX || '3', 10), // 3 registrations per hour
    },
    passwordReset: {
      ttl: parseInt(process.env.RATE_LIMIT_PASSWORD_TTL || '3600', 10), // 1 hour
      limit: parseInt(process.env.RATE_LIMIT_PASSWORD_MAX || '3', 10), // 3 attempts per hour
    },

    // API endpoints - balanced
    api: {
      ttl: parseInt(process.env.RATE_LIMIT_API_TTL || '60', 10), // 1 minute
      limit: parseInt(process.env.RATE_LIMIT_API_MAX || '60', 10), // 60 requests per minute
    },

    // File uploads - more restrictive
    upload: {
      ttl: parseInt(process.env.RATE_LIMIT_UPLOAD_TTL || '300', 10), // 5 minutes
      limit: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '10', 10), // 10 uploads per 5 min
    },

    // Report generation - very restrictive
    reports: {
      ttl: parseInt(process.env.RATE_LIMIT_REPORTS_TTL || '600', 10), // 10 minutes
      limit: parseInt(process.env.RATE_LIMIT_REPORTS_MAX || '5', 10), // 5 reports per 10 min
    },
  },

  // DDoS protection settings
  ddos: {
    // Skip rate limiting for these IPs (internal services, monitoring)
    whitelist: (process.env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean),
    
    // Block these IPs completely
    blacklist: (process.env.RATE_LIMIT_BLACKLIST || '').split(',').filter(Boolean),

    // Enable distributed rate limiting with Redis
    useRedis: process.env.RATE_LIMIT_USE_REDIS === 'true',

    // Headers to check for real IP (behind proxy)
    trustProxy: process.env.RATE_LIMIT_TRUST_PROXY === 'true',
    proxyHeaders: ['x-forwarded-for', 'x-real-ip'],

    // Response customization
    errorMessage: 'Demasiadas solicitudes. Por favor, intente más tarde.',
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Redis configuration for distributed rate limiting
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    keyPrefix: 'rate-limit:',
  },

  // Advanced security features
  security: {
    // Enable request fingerprinting (combine IP + User-Agent + other factors)
    enableFingerprinting: process.env.RATE_LIMIT_FINGERPRINT === 'true',
    
    // Enable gradual backoff (increase restrictions for repeat offenders)
    enableBackoff: process.env.RATE_LIMIT_BACKOFF === 'true',
    backoffMultiplier: parseFloat(process.env.RATE_LIMIT_BACKOFF_MULTIPLIER || '1.5'),
    
    // Enable CAPTCHA requirement after X failed attempts
    captchaThreshold: parseInt(process.env.RATE_LIMIT_CAPTCHA_THRESHOLD || '10', 10),
  },
}));