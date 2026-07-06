import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CacheService, CacheStats } from './cache.service';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

class CacheOperationDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  namespace?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  value?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(86400) // Max 24 hours
  ttl?: number;
}

class FlushCacheDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  namespace?: string;
}

@ApiTags('Cache Management')
@ApiBearerAuth()
@Controller('cache')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get cache statistics and performance metrics' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved successfully' })
  async getStats(): Promise<CacheStats> {
    return this.cacheService.getStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check cache health and connectivity' })
  @ApiResponse({ status: 200, description: 'Cache health status' })
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    console.log('🔍 CACHE CONTROLLER: Cache health check called - using native socket implementation');
    console.log('🎯 CACHE CONTROLLER: Method executed at', new Date().toISOString());
    
    try {
      // Use native Node.js socket for simplicity
      const net = require('net');
      const start = Date.now();

      return new Promise((resolve) => {
        console.log('🔌 Creating socket connection to redis:6379');
        const socket = new net.Socket();
        
        socket.setTimeout(5000);

        socket.on('connect', () => {
          console.log('✅ Connected to Redis, sending PING');
          socket.write('PING\r\n');
        });

        socket.on('data', (data) => {
          const response = data.toString();
          console.log('📦 Received response from Redis:', response);
          if (response.includes('PONG')) {
            const latency = Date.now() - start;
            console.log(`✅ Redis health check successful, latency: ${latency}ms`);
            socket.destroy();
            resolve({ status: 'healthy', latency });
          } else {
            console.log('❌ Invalid response from Redis:', response);
            socket.destroy();
            resolve({ status: 'unhealthy', error: 'Invalid response from Redis' });
          }
        });

        socket.on('error', (error) => {
          console.log('❌ Socket error:', error.message);
          resolve({ status: 'unhealthy', error: error.message });
        });

        socket.on('timeout', () => {
          console.log('⏱️ Socket timeout');
          socket.destroy();
          resolve({ status: 'unhealthy', error: 'Connection timeout' });
        });

        socket.connect(6379, 'redis');
      });
    } catch (error) {
      console.log('💥 Exception in health check:', error.message);
      return { status: 'unhealthy', error: error.message };
    }
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get value from cache by key' })
  @ApiResponse({ status: 200, description: 'Value retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Key not found' })
  @ApiParam({ name: 'key', type: String, description: 'Cache key' })
  @ApiQuery({ name: 'namespace', required: false, type: String, description: 'Cache namespace' })
  async getValue(
    @Param('key') key: string,
    @Query('namespace') namespace?: string,
  ): Promise<{ key: string; value: any; exists: boolean }> {
    if (!key) {
      throw new BadRequestException('Cache key is required');
    }

    const value = await this.cacheService.get(key, { namespace });
    const exists = value !== null;

    return {
      key,
      value,
      exists,
    };
  }

  @Post('key')
  @ApiOperation({ summary: 'Set value in cache' })
  @ApiResponse({ status: 201, description: 'Value cached successfully' })
  @ApiResponse({ status: 400, description: 'Invalid cache operation' })
  @ApiBody({ type: CacheOperationDto })
  async setValue(
    @Body() cacheDto: CacheOperationDto,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; key: string; ttl?: number }> {
    if (!cacheDto.key || cacheDto.value === undefined) {
      throw new BadRequestException('Key and value are required');
    }

    const success = await this.cacheService.set(cacheDto.key, cacheDto.value, {
      namespace: cacheDto.namespace,
      ttl: cacheDto.ttl,
    });

    if (!success) {
      throw new BadRequestException('Failed to cache value');
    }

    return {
      success,
      key: cacheDto.key,
      ttl: cacheDto.ttl,
    };
  }

  @Delete('key/:key')
  @ApiOperation({ summary: 'Delete value from cache' })
  @ApiResponse({ status: 200, description: 'Value deleted successfully' })
  @ApiParam({ name: 'key', type: String, description: 'Cache key to delete' })
  @ApiQuery({ name: 'namespace', required: false, type: String, description: 'Cache namespace' })
  async deleteValue(
    @CurrentUser() user: User,
    @Param('key') key: string,
    @Query('namespace') namespace?: string,
  ): Promise<{ success: boolean; key: string }> {
    if (!key) {
      throw new BadRequestException('Cache key is required');
    }

    const success = await this.cacheService.delete(key, { namespace });

    return {
      success,
      key,
    };
  }

  @Post('flush')
  @ApiOperation({ summary: 'Flush cache (clear all or by namespace)' })
  @ApiResponse({ status: 200, description: 'Cache flushed successfully' })
  @ApiResponse({ status: 400, description: 'Cache flush failed' })
  @ApiBody({ type: FlushCacheDto })
  async flushCache(
    @Body() flushDto: FlushCacheDto,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; namespace?: string; message: string }> {
    const success = await this.cacheService.flush(flushDto.namespace);

    if (!success) {
      throw new BadRequestException('Failed to flush cache');
    }

    const message = flushDto.namespace
      ? `Cache namespace '${flushDto.namespace}' flushed successfully`
      : 'Entire cache flushed successfully';

    return {
      success,
      namespace: flushDto.namespace,
      message,
    };
  }

  @Get('exists/:key')
  @ApiOperation({ summary: 'Check if key exists in cache' })
  @ApiResponse({ status: 200, description: 'Key existence checked' })
  @ApiParam({ name: 'key', type: String, description: 'Cache key to check' })
  @ApiQuery({ name: 'namespace', required: false, type: String, description: 'Cache namespace' })
  async keyExists(
    @Param('key') key: string,
    @Query('namespace') namespace?: string,
  ): Promise<{ key: string; exists: boolean }> {
    if (!key) {
      throw new BadRequestException('Cache key is required');
    }

    const exists = await this.cacheService.exists(key, { namespace });

    return {
      key,
      exists,
    };
  }

  @Post('increment/:key')
  @ApiOperation({ summary: 'Increment numeric value in cache' })
  @ApiResponse({ status: 200, description: 'Value incremented successfully' })
  @ApiParam({ name: 'key', type: String, description: 'Cache key to increment' })
  @ApiQuery({ name: 'amount', required: false, type: Number, description: 'Amount to increment by (default: 1)' })
  @ApiQuery({ name: 'namespace', required: false, type: String, description: 'Cache namespace' })
  @ApiQuery({ name: 'ttl', required: false, type: Number, description: 'TTL in seconds' })
  async incrementValue(
    @CurrentUser() user: User,
    @Param('key') key: string,
    @Query('amount') amount?: number,
    @Query('namespace') namespace?: string,
    @Query('ttl') ttl?: number,
  ): Promise<{ key: string; newValue: number }> {
    if (!key) {
      throw new BadRequestException('Cache key is required');
    }

    const parsedAmount = amount ? Number(amount) : 1;
    const parsedTtl = ttl ? Number(ttl) : undefined;

    if (isNaN(parsedAmount)) {
      throw new BadRequestException('Amount must be a valid number');
    }

    const newValue = await this.cacheService.increment(key, parsedAmount, {
      namespace,
      ttl: parsedTtl,
    });

    return {
      key,
      newValue,
    };
  }

  @Post('decrement/:key')
  @ApiOperation({ summary: 'Decrement numeric value in cache' })
  @ApiResponse({ status: 200, description: 'Value decremented successfully' })
  @ApiParam({ name: 'key', type: String, description: 'Cache key to decrement' })
  @ApiQuery({ name: 'amount', required: false, type: Number, description: 'Amount to decrement by (default: 1)' })
  @ApiQuery({ name: 'namespace', required: false, type: String, description: 'Cache namespace' })
  @ApiQuery({ name: 'ttl', required: false, type: Number, description: 'TTL in seconds' })
  async decrementValue(
    @CurrentUser() user: User,
    @Param('key') key: string,
    @Query('amount') amount?: number,
    @Query('namespace') namespace?: string,
    @Query('ttl') ttl?: number,
  ): Promise<{ key: string; newValue: number }> {
    if (!key) {
      throw new BadRequestException('Cache key is required');
    }

    const parsedAmount = amount ? Number(amount) : 1;
    const parsedTtl = ttl ? Number(ttl) : undefined;

    if (isNaN(parsedAmount)) {
      throw new BadRequestException('Amount must be a valid number');
    }

    const newValue = await this.cacheService.decrement(key, parsedAmount, {
      namespace,
      ttl: parsedTtl,
    });

    return {
      key,
      newValue,
    };
  }

  // MW Panel specific cache operations
  @Delete('user/:userId')
  @ApiOperation({ summary: 'Invalidate all cache for specific user' })
  @ApiResponse({ status: 200, description: 'User cache invalidated successfully' })
  @ApiParam({ name: 'userId', type: String, description: 'User ID' })
  async invalidateUserCache(
    @Param('userId') userId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; userId: string; message: string }> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const success = await this.cacheService.invalidateUserCache(userId);

    return {
      success,
      userId,
      message: success 
        ? 'User cache invalidated successfully' 
        : 'No cache entries found for user',
    };
  }

  @Get('dashboard/performance')
  @ApiOperation({ summary: 'Get cache performance dashboard data' })
  @ApiResponse({ status: 200, description: 'Performance data retrieved' })
  async getPerformanceDashboard(): Promise<{
    stats: CacheStats;
    health: { status: 'healthy' | 'unhealthy'; latency?: number; error?: string };
    recommendations: string[];
  }> {
    const [stats, health] = await Promise.all([
      this.cacheService.getStats(),
      this.cacheService.healthCheck(),
    ]);

    const recommendations: string[] = [];
    
    // Generate recommendations based on stats
    if (stats.hitRate < 70) {
      recommendations.push('Cache hit rate is below 70%. Consider reviewing cache strategies.');
    }
    
    if (stats.keysCount > 100000) {
      recommendations.push('High number of cached keys. Consider implementing key expiration policies.');
    }
    
    if (health.latency && health.latency > 100) {
      recommendations.push('Cache latency is high. Check Redis server performance.');
    }
    
    if (stats.hitRate > 90) {
      recommendations.push('Excellent cache performance! Current strategies are working well.');
    }

    return {
      stats,
      health,
      recommendations,
    };
  }
}