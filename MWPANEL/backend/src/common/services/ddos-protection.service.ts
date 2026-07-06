import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { LoggerService } from './logger.service';

export interface AttackPattern {
  ip: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  blocked: boolean;
  reason: string;
}

/**
 * Advanced DDoS protection service
 */
@Injectable()
export class DDoSProtectionService {
  private redis: Redis;
  private attackPatterns: Map<string, AttackPattern> = new Map();

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('DDoSProtection');
    this.initializeRedis();
    this.startMonitoring();
  }

  private initializeRedis() {
    const config = this.configService.get('rateLimit');
    
    if (config.ddos.useRedis) {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        keyPrefix: 'ddos:',
      });

      this.redis.on('error', (err) => {
        this.logger.error('Redis error in DDoS protection', err?.message || err?.toString());
      });
    }
  }

  /**
   * Start monitoring for attack patterns
   */
  private startMonitoring() {
    // Check attack patterns every 30 seconds
    setInterval(() => {
      this.analyzePatterns();
    }, 30000);

    // Clean old patterns every 5 minutes
    setInterval(() => {
      this.cleanOldPatterns();
    }, 300000);
  }

  /**
   * Record a request for analysis
   */
  async recordRequest(
    ip: string,
    path: string,
    statusCode: number,
    responseTime: number,
  ): Promise<void> {
    const key = `request:${ip}:${Date.now()}`;
    const data = {
      ip,
      path,
      statusCode,
      responseTime,
      timestamp: Date.now(),
    };

    if (this.redis) {
      await this.redis.setex(key, 3600, JSON.stringify(data)); // Keep for 1 hour
    }

    // Quick pattern detection
    this.updateAttackPattern(ip, statusCode);
  }

  /**
   * Update attack pattern tracking
   */
  private updateAttackPattern(ip: string, statusCode: number) {
    const pattern = this.attackPatterns.get(ip) || {
      ip,
      count: 0,
      firstSeen: new Date(),
      lastSeen: new Date(),
      blocked: false,
      reason: '',
    };

    pattern.count++;
    pattern.lastSeen = new Date();

    // Check for suspicious patterns
    if (statusCode === 429) {
      // Rate limit violations
      if (pattern.count > 10) {
        pattern.reason = 'Excessive rate limit violations';
        this.blockIp(ip, pattern.reason);
      }
    } else if (statusCode >= 400 && statusCode < 500) {
      // Client errors
      if (pattern.count > 50) {
        pattern.reason = 'Excessive client errors';
        this.considerBlocking(ip, pattern);
      }
    }

    this.attackPatterns.set(ip, pattern);
  }

  /**
   * Analyze patterns for DDoS detection
   */
  private async analyzePatterns() {
    if (!this.redis) return;

    try {
      // Get all recent requests
      const keys = await this.redis.keys('request:*');
      const requests: any[] = [];

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          requests.push(JSON.parse(data));
        }
      }

      // Group by IP
      const ipGroups = new Map<string, any[]>();
      requests.forEach(req => {
        const group = ipGroups.get(req.ip) || [];
        group.push(req);
        ipGroups.set(req.ip, group);
      });

      // Analyze each IP
      for (const [ip, reqs] of ipGroups) {
        this.analyzeIpBehavior(ip, reqs);
      }
    } catch (error) {
      this.logger.error('Error analyzing DDoS patterns', error);
    }
  }

  /**
   * Analyze behavior of a specific IP
   */
  private analyzeIpBehavior(ip: string, requests: any[]) {
    const timeWindow = 60000; // 1 minute
    const now = Date.now();
    const recentRequests = requests.filter(r => now - r.timestamp < timeWindow);

    // Detection rules
    const rules = [
      {
        name: 'High request rate',
        check: () => recentRequests.length > 1000,
        severity: 'high',
      },
      {
        name: 'Rapid fire requests',
        check: () => {
          if (recentRequests.length < 2) return false;
          const intervals = [];
          for (let i = 1; i < recentRequests.length; i++) {
            intervals.push(recentRequests[i].timestamp - recentRequests[i-1].timestamp);
          }
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          return avgInterval < 10; // Less than 10ms between requests
        },
        severity: 'critical',
      },
      {
        name: 'Path scanning',
        check: () => {
          const uniquePaths = new Set(recentRequests.map(r => r.path));
          return uniquePaths.size > 50 && recentRequests.length > 100;
        },
        severity: 'medium',
      },
      {
        name: 'Error flooding',
        check: () => {
          const errors = recentRequests.filter(r => r.statusCode >= 400);
          return errors.length > 100;
        },
        severity: 'high',
      },
    ];

    // Check rules
    for (const rule of rules) {
      if (rule.check()) {
        this.logger.security(`DDoS pattern detected: ${rule.name}`, {
          ip,
          severity: rule.severity,
          requestCount: recentRequests.length,
        });

        if (rule.severity === 'critical' || rule.severity === 'high') {
          this.blockIp(ip, rule.name);
        }
      }
    }
  }

  /**
   * Block an IP address
   */
  async blockIp(ip: string, reason: string): Promise<void> {
    this.logger.security(`Blocking IP for DDoS protection`, {
      ip,
      reason,
    });

    // Add to blacklist
    const config = this.configService.get('rateLimit');
    if (!config.ddos.blacklist.includes(ip)) {
      config.ddos.blacklist.push(ip);
    }

    // Store in Redis for persistence
    if (this.redis) {
      await this.redis.sadd('blacklist', ip);
      await this.redis.hset('blacklist:reasons', ip, reason);
      await this.redis.expire('blacklist', 86400); // 24 hours
    }

    // Update pattern
    const pattern = this.attackPatterns.get(ip);
    if (pattern) {
      pattern.blocked = true;
      pattern.reason = reason;
    }

    // Emit event for other services
    this.logger.audit('IP blocked for DDoS', 'system', {
      ip,
      reason,
      timestamp: new Date(),
    });
  }

  /**
   * Consider blocking based on pattern analysis
   */
  private considerBlocking(ip: string, pattern: AttackPattern) {
    const timeSinceFirst = Date.now() - pattern.firstSeen.getTime();
    const requestsPerMinute = (pattern.count / timeSinceFirst) * 60000;

    if (requestsPerMinute > 200) {
      this.blockIp(ip, `Sustained high request rate: ${Math.round(requestsPerMinute)} req/min`);
    }
  }

  /**
   * Clean old attack patterns
   */
  private cleanOldPatterns() {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    for (const [ip, pattern] of this.attackPatterns) {
      if (pattern.lastSeen < oneHourAgo && !pattern.blocked) {
        this.attackPatterns.delete(ip);
      }
    }
  }

  /**
   * Get current attack patterns
   */
  getAttackPatterns(): AttackPattern[] {
    return Array.from(this.attackPatterns.values());
  }

  /**
   * Check if an IP is blocked
   */
  async isBlocked(ip: string): Promise<boolean> {
    // Check memory first
    const pattern = this.attackPatterns.get(ip);
    if (pattern?.blocked) return true;

    // Check Redis
    if (this.redis) {
      const isInBlacklist = await this.redis.sismember('blacklist', ip);
      return Boolean(isInBlacklist);
    }

    // Check config
    const config = this.configService.get('rateLimit');
    return config.ddos.blacklist.includes(ip);
  }

  /**
   * Unblock an IP address
   */
  async unblockIp(ip: string): Promise<void> {
    this.logger.info(`Unblocking IP: ${ip}`);

    // Remove from config
    const config = this.configService.get('rateLimit');
    const index = config.ddos.blacklist.indexOf(ip);
    if (index > -1) {
      config.ddos.blacklist.splice(index, 1);
    }

    // Remove from Redis
    if (this.redis) {
      await this.redis.srem('blacklist', ip);
      await this.redis.hdel('blacklist:reasons', ip);
    }

    // Update pattern
    const pattern = this.attackPatterns.get(ip);
    if (pattern) {
      pattern.blocked = false;
      pattern.reason = '';
    }
  }

  /**
   * Get DDoS protection statistics
   */
  async getStatistics() {
    const blocked = Array.from(this.attackPatterns.values()).filter(p => p.blocked);
    const active = Array.from(this.attackPatterns.values()).filter(p => !p.blocked);

    let redisBlocked = [];
    if (this.redis) {
      const blacklist = await this.redis.smembers('blacklist');
      const reasons = await this.redis.hgetall('blacklist:reasons');
      redisBlocked = blacklist.map(ip => ({
        ip,
        reason: reasons[ip] || 'Unknown',
      }));
    }

    return {
      totalPatterns: this.attackPatterns.size,
      blockedIps: blocked.length,
      activeMonitoring: active.length,
      redisBlacklist: redisBlocked,
      topOffenders: Array.from(this.attackPatterns.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }
}