import { Module } from '@nestjs/common';
import { PrometheusModule as PrometheusNestModule } from '@willsoto/nestjs-prometheus';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [
    PrometheusNestModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        path: configService.get('prometheus.metricsPath', '/metrics'),
        defaultLabels: configService.get('prometheus.defaultLabels', {}),
        defaultMetrics: {
          enabled: false, // TEMPORARILY DISABLED to avoid conflicts
        },
      }),
    }),
    HealthModule,
  ],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MonitoringService],
})
export class MonitoringModule {}