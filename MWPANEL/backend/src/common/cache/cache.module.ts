import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { CacheService } from '../services/cache.service';
import { CacheInterceptor } from '../interceptors/cache.interceptor';
import { LoggerService } from '../services/logger.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const cacheConfig = configService.get('cache');
        
        // Use Redis if configured, otherwise use in-memory
        if (cacheConfig.store === 'redis') {
          return {
            store: redisStore,
            host: cacheConfig.redis.host,
            port: cacheConfig.redis.port,
            password: cacheConfig.redis.password,
            db: cacheConfig.redis.db,
            ttl: cacheConfig.ttl,
            max: 5000, // Max number of items in cache
          };
        }
        
        // Fallback to memory store
        return {
          ttl: cacheConfig.ttl,
          max: 1000,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService, CacheInterceptor, LoggerService],
  exports: [CacheService, CacheInterceptor],
})
export class CacheModule {}