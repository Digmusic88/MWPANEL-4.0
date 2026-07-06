import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { BirthdayAutomationService } from './birthday-automation.service';
import { CronTestService } from './cron-test.service';

/**
 * Servicio para asegurar que todos los cron jobs se inicialicen correctamente
 */
@Injectable()
export class CronInitializerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CronInitializerService.name);

  constructor(private moduleRef: ModuleRef) {}

  async onApplicationBootstrap() {
    this.logger.log('🚀 Initializing all cron job services...');

    try {
      // Forzar la obtención de instancias para asegurar que se inicialicen
      const birthdayService = this.moduleRef.get(BirthdayAutomationService, { strict: false });
      const cronTestService = this.moduleRef.get(CronTestService, { strict: false });

      if (birthdayService) {
        this.logger.log('✅ BirthdayAutomationService initialized successfully');
      } else {
        this.logger.error('❌ Failed to initialize BirthdayAutomationService');
      }

      if (cronTestService) {
        this.logger.log('✅ CronTestService initialized successfully');
      } else {
        this.logger.error('❌ Failed to initialize CronTestService');
      }

      this.logger.log('🎯 All cron job services initialization attempted');
    } catch (error) {
      this.logger.error('❌ Error initializing cron services:', error);
    }
  }
}