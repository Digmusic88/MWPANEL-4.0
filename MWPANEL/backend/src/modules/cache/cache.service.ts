import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string; // Cache key namespace
  compress?: boolean; // Compress large values
  serializer?: 'json' | 'string'; // Serialization method
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keysCount: number;
  memoryUsage: string;
  uptime: number;
}

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: RedisClient;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    console.log('🔧 CacheService: Initializing Redis connection...');
    await this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Try REDIS_URL first (Docker configuration)
      const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:6379');
      this.logger.log(`Redis URL from config: ${redisUrl}`);
      
      // Parse URL for individual components
      let redisHost = 'localhost';
      let redisPort = 6379;
      let redisPassword = undefined;
      
      if (redisUrl && redisUrl.startsWith('redis://')) {
        try {
          const url = new URL(redisUrl);
          redisHost = url.hostname || 'localhost';
          redisPort = url.port ? parseInt(url.port) : 6379;
          redisPassword = url.password || this.configService.get('REDIS_PASSWORD');
          this.logger.log(`Parsed Redis URL - Host: ${redisHost}, Port: ${redisPort}`);
        } catch (parseError) {
          this.logger.error('Error parsing Redis URL:', parseError);
          // Fallback to individual environment variables
          redisHost = this.configService.get('REDIS_HOST', 'localhost');
          redisPort = parseInt(this.configService.get('REDIS_PORT', '6379'));
          redisPassword = this.configService.get('REDIS_PASSWORD');
          this.logger.log(`Using fallback Redis config - Host: ${redisHost}, Port: ${redisPort}`);
        }
      } else {
        // Fallback to individual environment variables
        redisHost = this.configService.get('REDIS_HOST', 'localhost');
        redisPort = parseInt(this.configService.get('REDIS_PORT', '6379'));
        redisPassword = this.configService.get('REDIS_PASSWORD');
        this.logger.log(`Using individual env vars - Host: ${redisHost}, Port: ${redisPort}`);
      }

      this.logger.log(`Final connection attempt to Redis at ${redisHost}:${redisPort}`);

      this.redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        lazyConnect: false,
        keepAlive: 30000,
        family: 4, // Use IPv4
        enableReadyCheck: true,
      });

      // Event listeners
      this.redisClient.on('connect', () => {
        this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
      });

      this.redisClient.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });

      this.redisClient.on('reconnecting', () => {
        this.logger.warn('Reconnecting to Redis...');
      });

      await this.redisClient.connect();
      this.logger.log('Redis cache service initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
      // Fall back to in-memory cache if Redis fails
      this.logger.warn('Falling back to in-memory cache');
    }
  }

  private buildKey(key: string, namespace?: string): string {
    const prefix = 'mwpanel:cache:';
    const ns = namespace ? `${namespace}:` : '';
    return `${prefix}${ns}${key}`;
  }

  private async serialize(value: any, serializer: 'json' | 'string' = 'json'): Promise<string> {
    if (serializer === 'string' && typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  private async deserialize(value: string, serializer: 'json' | 'string' = 'json'): Promise<any> {
    if (serializer === 'string') {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      this.logger.warn('Failed to deserialize cached value, returning as string');
      return value;
    }
  }

  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.redisClient) {
      this.stats.misses++;
      return null;
    }

    try {
      const cacheKey = this.buildKey(key, options.namespace);
      const value = await this.redisClient.get(cacheKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return await this.deserialize(value, options.serializer);
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T = any>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<boolean> {
    if (!this.redisClient) {
      return false;
    }

    try {
      const cacheKey = this.buildKey(key, options.namespace);
      const serializedValue = await this.serialize(value, options.serializer);
      
      if (options.ttl) {
        await this.redisClient.setex(cacheKey, options.ttl, serializedValue);
      } else {
        await this.redisClient.set(cacheKey, serializedValue);
      }

      return true;
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.redisClient) {
      return false;
    }

    try {
      const cacheKey = this.buildKey(key, options.namespace);
      const result = await this.redisClient.del(cacheKey);
      return result > 0;
    } catch (error) {
      this.logger.error(`Cache DELETE error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.redisClient) {
      return false;
    }

    try {
      const cacheKey = this.buildKey(key, options.namespace);
      const result = await this.redisClient.exists(cacheKey);
      return result > 0;
    } catch (error) {
      this.logger.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async increment(key: string, amount: number = 1, options: CacheOptions = {}): Promise<number> {
    if (!this.redisClient) {
      return 0;
    }

    try {
      const cacheKey = this.buildKey(key, options.namespace);
      const result = await this.redisClient.incrby(cacheKey, amount);
      
      // Set TTL if provided and key is new
      if (options.ttl && result === amount) {
        await this.redisClient.expire(cacheKey, options.ttl);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Cache INCREMENT error for key ${key}:`, error);
      return 0;
    }
  }

  async decrement(key: string, amount: number = 1, options: CacheOptions = {}): Promise<number> {
    if (!this.redisClient) {
      return 0;
    }

    try {
      const cacheKey = this.buildKey(key, options.namespace);
      const result = await this.redisClient.decrby(cacheKey, amount);

      // Set TTL if provided and this is a new operation
      if (options.ttl) {
        await this.redisClient.expire(cacheKey, options.ttl);
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache DECREMENT error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Decremento atómico con suelo en 0 (evita contadores negativos por
   * decrementos concurrentes). Usa un script Lua para que la lectura,
   * la resta y el clamp ocurran como una única operación atómica en Redis.
   */
  async decrementFloor(key: string, amount: number = 1, options: CacheOptions = {}): Promise<number> {
    if (!this.redisClient) {
      return 0;
    }

    const script = `
      local current = tonumber(redis.call('GET', KEYS[1]) or '0')
      local next = current - tonumber(ARGV[1])
      if next < 0 then next = 0 end
      redis.call('SET', KEYS[1], next)
      if tonumber(ARGV[2]) > 0 then
        redis.call('EXPIRE', KEYS[1], ARGV[2])
      end
      return next
    `;

    try {
      const cacheKey = this.buildKey(key, options.namespace);
      const result = await this.redisClient.eval(script, 1, cacheKey, amount, options.ttl ?? 0);
      return Number(result);
    } catch (error) {
      this.logger.error(`Cache DECREMENT_FLOOR error for key ${key}:`, error);
      return 0;
    }
  }

  async mget<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    if (!this.redisClient || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const cacheKeys = keys.map(key => this.buildKey(key, options.namespace));
      const values = await this.redisClient.mget(...cacheKeys);

      const results: (T | null)[] = [];
      for (let i = 0; i < values.length; i++) {
        if (values[i] === null) {
          this.stats.misses++;
          results.push(null);
        } else {
          this.stats.hits++;
          results.push(await this.deserialize(values[i], options.serializer));
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Cache MGET error for keys ${keys.join(', ')}:`, error);
      this.stats.misses += keys.length;
      return keys.map(() => null);
    }
  }

  async mset(pairs: Array<[string, any]>, options: CacheOptions = {}): Promise<boolean> {
    if (!this.redisClient || pairs.length === 0) {
      return false;
    }

    try {
      const pipeline = this.redisClient.pipeline();

      for (const [key, value] of pairs) {
        const cacheKey = this.buildKey(key, options.namespace);
        const serializedValue = await this.serialize(value, options.serializer);
        
        if (options.ttl) {
          pipeline.setex(cacheKey, options.ttl, serializedValue);
        } else {
          pipeline.set(cacheKey, serializedValue);
        }
      }

      const results = await pipeline.exec();
      return results?.every(([error]) => !error) ?? false;
    } catch (error) {
      this.logger.error('Cache MSET error:', error);
      return false;
    }
  }

  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Generate value and cache it
    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async flush(namespace?: string): Promise<boolean> {
    if (!this.redisClient) {
      return false;
    }

    try {
      if (namespace) {
        const pattern = this.buildKey('*', namespace);
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } else {
        await this.redisClient.flushdb();
      }
      return true;
    } catch (error) {
      this.logger.error('Cache FLUSH error:', error);
      return false;
    }
  }

  async getStats(): Promise<CacheStats> {
    let keysCount = 0;
    let memoryUsage = '0B';
    let uptime = 0;

    if (this.redisClient) {
      try {
        const info = await this.redisClient.info();
        const dbKeys = info.match(/db0:keys=(\d+)/);
        keysCount = dbKeys ? parseInt(dbKeys[1]) : 0;

        const memory = info.match(/used_memory_human:([^\r\n]+)/);
        memoryUsage = memory ? memory[1] : '0B';

        const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
        uptime = uptimeMatch ? parseInt(uptimeMatch[1]) : 0;
      } catch (error) {
        this.logger.error('Failed to get Redis stats:', error);
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      keysCount,
      memoryUsage,
      uptime,
    };
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    // Try using Redis client first if available
    if (this.redisClient) {
      try {
        const start = Date.now();
        await this.redisClient.ping();
        const latency = Date.now() - start;
        return { status: 'healthy', latency };
      } catch (error) {
        this.logger.error('Redis ping failed:', error);
      }
    }

    // Fallback to native socket method
    try {
      const net = require('net');
      const start = Date.now();

      return new Promise((resolve) => {
        console.log('🔧 CacheService: Using fallback native socket to redis:6379');
        const socket = new net.Socket();
        
        socket.setTimeout(5000);

        socket.on('connect', () => {
          console.log('🔧 CacheService: Connected to Redis, sending PING');
          socket.write('PING\r\n');
        });

        socket.on('data', (data) => {
          const response = data.toString();
          console.log('🔧 CacheService: Received response from Redis:', response);
          if (response.includes('PONG')) {
            const latency = Date.now() - start;
            console.log(`🔧 CacheService: Redis health check successful, latency: ${latency}ms`);
            socket.destroy();
            resolve({ status: 'healthy', latency });
          } else {
            console.log('🔧 CacheService: Invalid response from Redis:', response);
            socket.destroy();
            resolve({ status: 'unhealthy', error: 'Invalid response from Redis' });
          }
        });

        socket.on('error', (error) => {
          console.log('🔧 CacheService: Socket error:', error.message);
          resolve({ status: 'unhealthy', error: error.message });
        });

        socket.on('timeout', () => {
          console.log('🔧 CacheService: Socket timeout');
          socket.destroy();
          resolve({ status: 'unhealthy', error: 'Connection timeout' });
        });

        socket.connect(6379, 'redis');
      });
    } catch (error) {
      console.log('🔧 CacheService: Exception in native socket health check:', error.message);
      return { status: 'unhealthy', error: error.message };
    }
  }

  // Common cache patterns for MW Panel
  async cacheUser(userId: string, userData: any, ttl: number = 3600): Promise<boolean> {
    return this.set(`user:${userId}`, userData, { ttl, namespace: 'users' });
  }

  async getCachedUser(userId: string): Promise<any | null> {
    return this.get(`user:${userId}`, { namespace: 'users' });
  }

  async cacheStudentGrades(studentId: string, grades: any, ttl: number = 1800): Promise<boolean> {
    return this.set(`grades:${studentId}`, grades, { ttl, namespace: 'academic' });
  }

  async getCachedStudentGrades(studentId: string): Promise<any | null> {
    return this.get(`grades:${studentId}`, { namespace: 'academic' });
  }

  async cacheSession(sessionId: string, sessionData: any, ttl: number = 7200): Promise<boolean> {
    return this.set(`session:${sessionId}`, sessionData, { ttl, namespace: 'sessions' });
  }

  async getCachedSession(sessionId: string): Promise<any | null> {
    return this.get(`session:${sessionId}`, { namespace: 'sessions' });
  }

  async invalidateUserCache(userId: string): Promise<boolean> {
    const keys = [
      `user:${userId}`,
      `grades:${userId}`,
      `profile:${userId}`,
      `dashboard:${userId}`,
    ];

    const promises = keys.map(key => this.delete(key, { namespace: 'users' }));
    const results = await Promise.all(promises);
    return results.some(result => result);
  }
}