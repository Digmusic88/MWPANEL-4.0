import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hitCount: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
}

@Injectable()
export class AICacheService {
  private readonly logger = new Logger(AICacheService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL: number;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(private readonly configService: ConfigService) {
    this.defaultTTL = this.configService.get<number>('AI_CACHE_TTL', 3600) * 1000; // Convert to milliseconds
    
    // Clean up expired entries every 10 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 10 * 60 * 1000);

    this.logger.log(`AI Cache service initialized with TTL: ${this.defaultTTL / 1000}s`);
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(params: Record<string, any>): string {
    // Create deterministic hash from parameters
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {} as Record<string, any>);

    const paramString = JSON.stringify(sortedParams);
    return createHash('sha256').update(paramString).digest('hex').substring(0, 16);
  }

  /**
   * Get cached content
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count and stats
    entry.hitCount++;
    this.stats.hits++;
    
    this.logger.debug(`Cache HIT for key: ${key} (hit count: ${entry.hitCount})`);
    return entry.data;
  }

  /**
   * Store content in cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entryTTL = ttl ? ttl * 1000 : this.defaultTTL;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: entryTTL,
      hitCount: 0
    };

    this.cache.set(key, entry);
    this.logger.debug(`Cache SET for key: ${key} (TTL: ${entryTTL / 1000}s)`);
  }

  /**
   * Check if content exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove specific entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.logger.log('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    // Estimate memory usage (rough calculation)
    let memoryUsage = 0;
    for (const [key, entry] of this.cache) {
      memoryUsage += key.length * 2; // UTF-16 encoding
      memoryUsage += JSON.stringify(entry.data).length * 2;
      memoryUsage += 64; // Overhead for entry metadata
    }

    return {
      totalEntries: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsage: Math.round(memoryUsage / 1024) // KB
    };
  }

  /**
   * Get frequently used content
   */
  getPopularEntries(limit: number = 10): Array<{ key: string; hitCount: number; age: number }> {
    const entries: Array<{ key: string; hitCount: number; age: number }> = [];
    
    for (const [key, entry] of this.cache) {
      const age = Date.now() - entry.timestamp;
      entries.push({ key, hitCount: entry.hitCount, age });
    }

    return entries
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit);
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} expired cache entries`);
    }
  }

  /**
   * Cache wrapper for AI content generation
   */
  async getOrSet<T>(
    key: string,
    generator: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate new content
    const data = await generator();
    
    // Store in cache
    await this.set(key, data, ttl);
    
    return data;
  }

  /**
   * Prefetch common content patterns
   */
  async prefetchCommonContent(patterns: Array<{
    ageGroup: 'starter' | 'explorer' | 'master';
    themes: string[];
    difficulties: ('easy' | 'medium' | 'hard' | 'expert')[];
  }>): Promise<void> {
    this.logger.log('Starting prefetch of common content patterns...');
    
    const prefetchPromises: Promise<void>[] = [];
    
    for (const pattern of patterns) {
      for (const theme of pattern.themes) {
        for (const difficulty of pattern.difficulties) {
          const key = this.generateKey({
            ageGroup: pattern.ageGroup,
            theme,
            difficulty,
            contentType: 'words',
            prefetch: true
          });

          // Only prefetch if not already cached
          if (!this.has(key)) {
            const promise = this.prefetchSinglePattern(pattern.ageGroup, theme, difficulty, key);
            prefetchPromises.push(promise);
          }
        }
      }
    }

    try {
      await Promise.all(prefetchPromises);
      this.logger.log(`Prefetch completed: ${prefetchPromises.length} patterns cached`);
    } catch (error) {
      this.logger.error('Error during prefetch:', error);
    }
  }

  private async prefetchSinglePattern(
    ageGroup: 'starter' | 'explorer' | 'master',
    theme: string,
    difficulty: 'easy' | 'medium' | 'hard' | 'expert',
    key: string
  ): Promise<void> {
    try {
      // This would be called by the anthropic service
      // For now, we'll just set a placeholder
      const placeholderData = {
        theme,
        ageGroup,
        difficulty,
        words: [], // Would be filled by actual AI generation
        prefetched: true,
        timestamp: Date.now()
      };

      await this.set(key, placeholderData, this.defaultTTL * 24); // Cache prefetched content longer
    } catch (error) {
      this.logger.error(`Failed to prefetch pattern ${ageGroup}/${theme}/${difficulty}:`, error);
    }
  }

  /**
   * Get cache entry details for debugging
   */
  getEntryDetails(key: string): CacheEntry<any> | null {
    return this.cache.get(key) || null;
  }

  /**
   * Optimize cache by removing least recently used entries when memory is high
   */
  optimizeCache(maxEntries: number = 1000): void {
    if (this.cache.size <= maxEntries) return;

    // Sort by last access time and hit count
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => {
        const scoreA = a[1].hitCount * 1000 + (Date.now() - a[1].timestamp);
        const scoreB = b[1].hitCount * 1000 + (Date.now() - b[1].timestamp);
        return scoreA - scoreB; // Lower score = less valuable
      });

    // Remove least valuable entries
    const toRemove = entries.slice(0, this.cache.size - maxEntries);
    toRemove.forEach(([key]) => this.cache.delete(key));

    this.logger.log(`Cache optimized: removed ${toRemove.length} entries`);
  }
}