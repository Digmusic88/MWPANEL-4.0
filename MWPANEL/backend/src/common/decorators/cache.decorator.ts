import { SetMetadata } from '@nestjs/common';

/**
 * Cache decorators for easy caching configuration
 */

// Metadata keys
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';
export const CACHE_TAGS_METADATA = 'cache:tags';

/**
 * Decorator to enable caching on a method
 * @param key - Cache key or function to generate key
 * @param ttl - Time to live in seconds (optional)
 */
export const Cacheable = (key?: string | ((args: any[]) => string), ttl?: number) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_KEY_METADATA, key || propertyName, target, propertyName);
    if (ttl) {
      Reflect.defineMetadata(CACHE_TTL_METADATA, ttl, target, propertyName);
    }
    return descriptor;
  };
};

/**
 * Decorator to set cache TTL
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);

/**
 * Decorator to set cache tags for grouping
 */
export const CacheTags = (...tags: string[]) => SetMetadata(CACHE_TAGS_METADATA, tags);

/**
 * Decorator to invalidate cache when method is called
 */
export const CacheEvict = (patterns: string[]) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      // Get cache service if available
      const cacheService = (this as any).cacheService;
      if (cacheService) {
        for (const pattern of patterns) {
          await cacheService.delByPattern(pattern);
        }
      }
      
      return result;
    };

    return descriptor;
  };
};

/**
 * Decorator to clear all cache of a specific type
 */
export const CacheClear = (type: string) => {
  return CacheEvict([`${type}:*`]);
};

/**
 * Common cache configurations
 */

// Cache user data for 5 minutes
export const CacheUser = () => Cacheable((args) => `user:${args[0]}`, 300);

// Cache student data for 10 minutes
export const CacheStudent = () => Cacheable((args) => `student:${args[0]}`, 600);

// Cache class data for 30 minutes
export const CacheClass = () => Cacheable((args) => `class:${args[0]}`, 1800);

// Cache competencies for 1 hour
export const CacheCompetencies = () => Cacheable('competencies:all', 3600);

// Cache dashboard data for 2 minutes
export const CacheDashboard = (userId: string) => Cacheable(`dashboard:${userId}`, 120);

// Cache pagination results
export const CachePagination = (prefix: string) => {
  return Cacheable((args) => {
    const [page, limit, filters] = args;
    const filterStr = filters ? JSON.stringify(filters) : 'all';
    return `${prefix}:page:${page}:limit:${limit}:${filterStr}`;
  }, 300);
};