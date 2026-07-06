import { Injectable, NestMiddleware, ServiceUnavailableException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../../modules/settings/settings.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly settingsService: SettingsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Allow maintenance settings endpoints to work even during maintenance
    const isMaintenanceEndpoint = req.path.includes('/api/settings/maintenance');
    const isAuthEndpoint = req.path.includes('/api/auth');
    const isHealthEndpoint = req.path.includes('/health');

    // Always allow these endpoints during maintenance
    if (isMaintenanceEndpoint || isAuthEndpoint || isHealthEndpoint) {
      return next();
    }

    try {
      const maintenanceMode = await this.settingsService.getBoolean('system_maintenanceMode', false);

      if (maintenanceMode) {
        // Check if user is admin - admins can access during maintenance
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
            if (decoded && decoded.role === 'admin') {
              // Admin user - allow access during maintenance
              return next();
            }
          } catch (jwtError) {
            // Invalid token - proceed to block
          }
        }

        // Not admin or no token - block access
        const maintenanceDurationMinutes = await this.settingsService.getNumber('system_maintenanceDuration', 60);
        const retryAfterSeconds = maintenanceDurationMinutes * 60;

        throw new ServiceUnavailableException({
          statusCode: 503,
          message: 'Sistema en modo mantenimiento',
          error: 'Service Unavailable',
          maintenanceMode: true,
          retryAfter: retryAfterSeconds,
          estimatedDuration: maintenanceDurationMinutes
        });
      }
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException)) {
        console.warn('Could not check maintenance status:', error.message);
      } else {
        throw error;
      }
    }

    next();
  }
}