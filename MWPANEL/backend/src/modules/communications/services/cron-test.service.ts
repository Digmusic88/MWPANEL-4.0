import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Servicio de prueba para verificar que los cron jobs funcionan
 */
@Injectable()
export class CronTestService implements OnModuleInit {
  private readonly logger = new Logger(CronTestService.name);

  onModuleInit() {
    this.logger.log('🔧 CronTestService initialized - Cron jobs should be active');
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async testCronEvery30Seconds() {
    this.logger.log('✅ Cron test running every 30 seconds - ' + new Date().toISOString());
  }
}