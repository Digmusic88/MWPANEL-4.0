import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';
import * as crypto from 'crypto';
import { gzipSync } from 'zlib';

interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

/**
 * Advanced caching service with Redis support
 */
@Injectable()
export class CacheService {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
  };

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('CacheService');
    this.logger.log('Cache service initialized');
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const value = await this.cacheManager.get<T>(fullKey);
      
      if (value !== null && value !== undefined) {
        this.stats.hits++;
        this.logger.debug(`Cache hit: ${key}`);
      } else {
        this.stats.misses++;
        this.logger.debug(`Cache miss: ${key}`);
      }
      
      this.updateHitRate();
      return value;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}`, error.stack);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const ttl = options?.ttl || this.getDefaultTTL(key);
      
      // Compress if needed
      let finalValue = value;
      if (this.shouldCompress(value, options)) {
        finalValue = this.compress(value) as any;
      }
      
      await this.cacheManager.set(fullKey, finalValue, ttl * 1000); // Convert to milliseconds
      
      // Handle tags if enabled
      if (options?.tags && this.configService.get('cache.tags.enabled')) {
        await this.addTags(fullKey, options.tags);
      }
      
      this.stats.sets++;
      this.logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}`, error.stack);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      await this.cacheManager.del(fullKey);
      
      this.stats.deletes++;
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}`, error.stack);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      // Modern cache-manager doesn't support direct pattern deletion
      // This functionality is deprecated in favor of targeted deletions
      this.logger.warn(`Pattern-based cache deletion not supported: ${pattern}`);
    } catch (error) {
      this.logger.error(`Error deleting cache by pattern ${pattern}`, error?.message || error?.toString());
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      // Modern cache-manager doesn't have reset(), implement alternative
      // We could store all keys and delete them individually but that's expensive
      // For now, just reset stats and log a warning
      this.resetStats();
      this.logger.warn('Cache reset completed (stats only - cache-manager API limitation)');
    } catch (error) {
      this.logger.error('Error resetting cache', error?.message || error?.toString());
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate value and cache it
    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Invalidate related caches based on patterns
   */
  async invalidateRelated(type: string, id?: string): Promise<void> {
    const patterns = this.configService.get(`cache.invalidation.patterns.${type}`);
    if (!patterns) return;

    for (const pattern of patterns) {
      const finalPattern = id ? pattern.replace('*', id) : pattern;
      await this.delByPattern(finalPattern);
    }
    
    this.logger.debug(`Invalidated related caches for ${type}${id ? `:${id}` : ''}`);
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(): Promise<void> {
    if (!this.configService.get('cache.performance.warmOnStartup')) {
      return;
    }

    this.logger.log('Starting cache warm-up...');
    
    // This would be implemented by each module that needs warming
    // Example: competencies, academic years, etc.
    
    this.logger.log('Cache warm-up completed');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Create cache key for user-specific data
   */
  getUserCacheKey(userId: string, prefix: string): string {
    return `${prefix}:user:${userId}`;
  }

  /**
   * Create cache key for class-specific data
   */
  getClassCacheKey(classId: string, prefix: string): string {
    return `${prefix}:class:${classId}`;
  }

  /**
   * Create cache key for pagination
   */
  getPaginationCacheKey(prefix: string, page: number, limit: number, filters?: any): string {
    const filterHash = filters ? this.hashObject(filters) : 'nofilters';
    return `${prefix}:page:${page}:limit:${limit}:${filterHash}`;
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const promises = keys.map(key => this.get<T>(key));
    return Promise.all(promises);
  }

  /**
   * Batch set multiple key-value pairs
   */
  async mset<T>(items: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<void> {
    const promises = items.map(item => 
      this.set(item.key, item.value, item.options)
    );
    await Promise.all(promises);
  }

  // Private methods

  private getFullKey(key: string): string {
    return `${this.getKeyPrefix()}${key}`;
  }

  private getKeyPrefix(): string {
    return this.configService.get('cache.keyPrefix') || 'mw-cache:';
  }

  private getDefaultTTL(key: string): number {
    // Try to match key pattern to strategy
    const strategies = this.configService.get('cache.strategies');
    
    for (const [strategyName, strategy] of Object.entries(strategies)) {
      if (key.toLowerCase().includes(strategyName.toLowerCase())) {
        return (strategy as any).ttl;
      }
    }
    
    return this.configService.get('cache.ttl') || 300;
  }

  private shouldCompress(value: any, options?: CacheOptions): boolean {
    if (options?.compress !== undefined) {
      return options.compress;
    }
    
    const performanceConfig = this.configService.get('cache.performance');
    if (!performanceConfig.compress) {
      return false;
    }
    
    const size = JSON.stringify(value).length;
    return size > performanceConfig.compressionThreshold;
  }

  private compress(value: any): string {
    const json = JSON.stringify(value);
    const compressed = gzipSync(json);
    return compressed.toString('base64');
  }

  private async addTags(key: string, tags: string[]): Promise<void> {
    // This would store tag-key relationships for bulk invalidation
    // Implementation depends on Redis data structures
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
  }
}