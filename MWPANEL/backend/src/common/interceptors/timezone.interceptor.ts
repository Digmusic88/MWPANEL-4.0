import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TimezoneService } from '../../modules/settings/services/timezone.service';

@Injectable()
export class TimezoneInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimezoneInterceptor.name);

  constructor(private readonly timezoneService: TimezoneService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(async (data) => {
        try {
          // Aplicar transformación de timezone solo a respuestas que contienen datos
          if (data && typeof data === 'object') {
            return await this.transformTimezones(data);
          }
          return data;
        } catch (error) {
          this.logger.warn('Error applying timezone transformation:', error);
          return data;
        }
      }),
    );
  }

  private async transformTimezones(obj: any): Promise<any> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    // Si es un array, transformar cada elemento
    if (Array.isArray(obj)) {
      return Promise.all(obj.map((item) => this.transformTimezones(item)));
    }

    // Si es un objeto Date, formatear con timezone
    if (obj instanceof Date) {
      return this.timezoneService.formatDateWithTimezone(obj);
    }

    // Si es un objeto normal, buscar propiedades de fecha
    const transformed = { ...obj };
    const dateFields = ['createdAt', 'updatedAt', 'sentAt', 'deliveredAt', 'readAt', 'scheduledAt', 'dueDate', 'startDate', 'endDate'];

    for (const key of Object.keys(transformed)) {
      const value = transformed[key];

      if (value instanceof Date || (typeof value === 'string' && this.isDateString(value))) {
        // Formatear fechas especiales con timezone
        if (dateFields.includes(key)) {
          transformed[`${key}Formatted`] = await this.timezoneService.formatDateWithTimezone(
            value instanceof Date ? value : new Date(value)
          );
        }
      } else if (value && typeof value === 'object') {
        // Recursivamente transformar objetos anidados
        transformed[key] = await this.transformTimezones(value);
      }
    }

    return transformed;
  }

  private isDateString(value: string): boolean {
    // Verificar si el string parece una fecha ISO
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return isoDateRegex.test(value) && !isNaN(new Date(value).getTime());
  }
}