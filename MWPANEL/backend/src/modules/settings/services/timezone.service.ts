import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimezoneSetting } from '../entities/timezone-setting.entity';

export interface TimezoneConfig {
  timezone: string;
  displayFormat: string;
  autoDST: boolean;
}

export interface TimezoneInfo {
  timezone: string;
  displayName: string;
  abbreviation: string;
  offset: string;
  isDST: boolean;
  currentTime: string;
}

@Injectable()
export class TimezoneService {
  private readonly logger = new Logger(TimezoneService.name);
  private cachedConfig: TimezoneConfig | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  constructor(
    @InjectRepository(TimezoneSetting)
    private readonly timezoneRepository: Repository<TimezoneSetting>,
  ) {}

  /**
   * Obtiene la configuración activa de timezone
   */
  async getTimezoneConfig(): Promise<TimezoneConfig> {
    const now = Date.now();

    // Usar caché si está válido
    if (this.cachedConfig && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedConfig;
    }

    try {
      const activeSetting = await this.timezoneRepository.findOne({
        where: { isActive: true },
        order: { updatedAt: 'DESC' },
      });

      if (activeSetting) {
        this.cachedConfig = {
          timezone: activeSetting.timezone,
          displayFormat: activeSetting.displayFormat,
          autoDST: activeSetting.autoDST,
        };
        this.cacheTimestamp = now;
        return this.cachedConfig;
      }
    } catch (error) {
      this.logger.warn('Error obteniendo configuración de timezone desde BD:', error);
    }

    // Fallback a configuración por defecto
    const defaultConfig = {
      timezone: 'Europe/Madrid',
      displayFormat: 'DD/MM/YYYY HH:mm',
      autoDST: true,
    };

    this.cachedConfig = defaultConfig;
    this.cacheTimestamp = now;
    return defaultConfig;
  }

  /**
   * Actualiza la configuración de timezone
   */
  async updateTimezoneConfig(config: Partial<TimezoneConfig>): Promise<TimezoneConfig> {
    try {
      // Desactivar configuración anterior
      await this.timezoneRepository.update(
        { isActive: true },
        { isActive: false }
      );

      // Crear nueva configuración activa
      const newSetting = this.timezoneRepository.create({
        timezone: config.timezone || 'Europe/Madrid',
        displayFormat: config.displayFormat || 'DD/MM/YYYY HH:mm',
        autoDST: config.autoDST !== undefined ? config.autoDST : true,
        isActive: true,
      });

      await this.timezoneRepository.save(newSetting);

      // Limpiar caché
      this.cachedConfig = null;
      this.cacheTimestamp = 0;

      this.logger.log(`Configuración de timezone actualizada: ${JSON.stringify(config)}`);

      return this.getTimezoneConfig();
    } catch (error) {
      this.logger.error('Error actualizando configuración de timezone:', error);
      throw error;
    }
  }

  /**
   * Formatea una fecha usando la configuración de timezone del sistema
   */
  async formatDateWithTimezone(date: Date | string, customConfig?: TimezoneConfig): Promise<string> {
    const config = customConfig || await this.getTimezoneConfig();
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    try {
      return dateObj.toLocaleString('es-ES', {
        timeZone: config.timezone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch (error) {
      this.logger.warn('Error formateando fecha con timezone:', error);
      return dateObj.toLocaleString('es-ES');
    }
  }

  /**
   * Convierte una fecha UTC a la timezone configurada del sistema
   */
  async convertToSystemTimezone(utcDate: Date | string): Promise<Date> {
    const config = await this.getTimezoneConfig();
    const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

    try {
      // Usar Intl.DateTimeFormat para obtener la fecha en la timezone correcta
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: config.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const parts = formatter.formatToParts(dateObj);
      const partsMap = parts.reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {} as any);

      // Crear nueva fecha en la timezone del sistema
      return new Date(
        `${partsMap.year}-${partsMap.month}-${partsMap.day}T${partsMap.hour}:${partsMap.minute}:${partsMap.second}`
      );
    } catch (error) {
      this.logger.warn('Error convirtiendo fecha a timezone del sistema:', error);
      return dateObj;
    }
  }

  /**
   * Invalida el caché de configuración (útil después de cambios)
   */
  invalidateCache(): void {
    this.cachedConfig = null;
    this.cacheTimestamp = 0;
    this.logger.log('Cache de configuración de timezone invalidado');
  }

  /**
   * Lista de zonas horarias disponibles
   */
  getAvailableTimezones(): Array<{ value: string; label: string; offset: string }> {
    return [
      { value: 'Europe/Madrid', label: 'Madrid (España)', offset: '+01:00/+02:00' },
      { value: 'Europe/London', label: 'Londres (Reino Unido)', offset: '+00:00/+01:00' },
      { value: 'Europe/Paris', label: 'París (Francia)', offset: '+01:00/+02:00' },
      { value: 'Europe/Berlin', label: 'Berlín (Alemania)', offset: '+01:00/+02:00' },
      { value: 'Europe/Rome', label: 'Roma (Italia)', offset: '+01:00/+02:00' },
      { value: 'America/New_York', label: 'Nueva York (Estados Unidos)', offset: '-05:00/-04:00' },
      { value: 'America/Los_Angeles', label: 'Los Angeles (Estados Unidos)', offset: '-08:00/-07:00' },
      { value: 'America/Mexico_City', label: 'Ciudad de México (México)', offset: '-06:00' },
      { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (Argentina)', offset: '-03:00' },
      { value: 'UTC', label: 'UTC (Tiempo Universal)', offset: '+00:00' },
    ];
  }
}