import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  // Cache store configuration
  store: process.env.CACHE_STORE || 'redis',
  
  // Redis connection
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_CACHE_DB || '1', 10), // Use DB 1 for cache (0 for sessions)
  },

  // Default TTL (Time To Live) in seconds
  ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes default

  // Cache key prefix
  keyPrefix: process.env.CACHE_KEY_PREFIX || 'mw-cache:',

  // Cache strategies for different data types
  strategies: {
    // User data - cache for 5 minutes
    users: {
      ttl: parseInt(process.env.CACHE_USERS_TTL || '300', 10),
      max: 1000, // Max items in cache
    },
    
    // Student lists - cache for 10 minutes
    students: {
      ttl: parseInt(process.env.CACHE_STUDENTS_TTL || '600', 10),
      max: 5000,
    },
    
    // Competencies - cache for 1 hour (rarely change)
    competencies: {
      ttl: parseInt(process.env.CACHE_COMPETENCIES_TTL || '3600', 10),
      max: 500,
    },
    
    // Evaluations - cache for 5 minutes
    evaluations: {
      ttl: parseInt(process.env.CACHE_EVALUATIONS_TTL || '300', 10),
      max: 2000,
    },
    
    // Class groups - cache for 30 minutes
    classGroups: {
      ttl: parseInt(process.env.CACHE_GROUPS_TTL || '1800', 10),
      max: 200,
    },
    
    // Subjects - cache for 1 hour
    subjects: {
      ttl: parseInt(process.env.CACHE_SUBJECTS_TTL || '3600', 10),
      max: 300,
    },
    
    // Academic years - cache for 2 hours
    academicYears: {
      ttl: parseInt(process.env.CACHE_YEARS_TTL || '7200', 10),
      max: 50,
    },
    
    // Dashboard data - cache for 2 minutes
    dashboard: {
      ttl: parseInt(process.env.CACHE_DASHBOARD_TTL || '120', 10),
      max: 100,
    },
    
    // Reports - cache for 10 minutes
    reports: {
      ttl: parseInt(process.env.CACHE_REPORTS_TTL || '600', 10),
      max: 100,
    },
    
    // TypeQuest profiles - cache for 5 minutes
    typequest: {
      ttl: parseInt(process.env.CACHE_TYPEQUEST_TTL || '300', 10),
      max: 1000,
    },
  },

  // Cache invalidation patterns
  invalidation: {
    // Invalidate related caches on updates
    cascadeInvalidation: process.env.CACHE_CASCADE_INVALIDATION !== 'false',
    
    // Patterns for automatic invalidation
    patterns: {
      // When a user is updated, invalidate these patterns
      user: ['user:*', 'dashboard:*', 'students:*'],
      
      // When a student is updated
      student: ['student:*', 'class:*', 'evaluations:*', 'dashboard:*'],
      
      // When an evaluation is created/updated
      evaluation: ['evaluation:*', 'student:*', 'competencies:*', 'dashboard:*'],
      
      // When class groups change
      classGroup: ['class:*', 'students:*', 'subjects:*'],
    },
  },

  // Performance settings
  performance: {
    // Enable cache warming on startup
    warmOnStartup: process.env.CACHE_WARM_ON_STARTUP === 'true',
    
    // Batch size for cache operations
    batchSize: parseInt(process.env.CACHE_BATCH_SIZE || '100', 10),
    
    // Enable cache statistics
    enableStats: process.env.CACHE_ENABLE_STATS === 'true',
    
    // Compression for large values
    compress: process.env.CACHE_COMPRESS === 'true',
    compressionThreshold: parseInt(process.env.CACHE_COMPRESS_THRESHOLD || '1024', 10), // 1KB
  },

  // Cache tags for grouping related items
  tags: {
    enabled: process.env.CACHE_TAGS_ENABLED !== 'false',
  }
}));