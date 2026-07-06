/**
 * @archivo: custom-validators.ts
 * @módulo: Assignments - Validators
 * @función: Validadores personalizados para el sistema de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Validadores personalizados usando class-validator para validaciones
 * complejas de negocio, transformaciones de datos y reglas específicas.
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.4
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validador para fechas futuras
 */
@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(date: string, args: ValidationArguments) {
    if (!date) return true; // Opcional
    
    const inputDate = new Date(date);
    const now = new Date();
    
    // Permitir hasta 5 minutos de tolerancia hacia atrás
    const tolerance = 5 * 60 * 1000; // 5 minutos en milisegundos
    return inputDate.getTime() > (now.getTime() - tolerance);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} debe ser una fecha futura`;
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

/**
 * Validador para rangos de fechas válidos
 */
@ValidatorConstraint({ name: 'isValidDateRange', async: false })
export class IsValidDateRangeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value || !value.start || !value.end) return true; // Opcional
    
    const startDate = new Date(value.start);
    const endDate = new Date(value.end);
    
    // Verificar que end sea posterior a start
    if (endDate <= startDate) return false;
    
    // Verificar que el rango no sea excesivamente largo (máximo 1 año)
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > oneYear) return false;
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} debe tener una fecha fin posterior a la fecha inicio y no exceder 1 año`;
  }
}

export function IsValidDateRange(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDateRangeConstraint,
    });
  };
}

/**
 * Validador para configuraciones de progreso válidas
 */
@ValidatorConstraint({ name: 'isValidProgressWeights', async: false })
export class IsValidProgressWeightsConstraint implements ValidatorConstraintInterface {
  validate(weights: any, args: ValidationArguments) {
    if (!weights) return true; // Opcional
    
    const completionWeight = weights.completionWeight || 0.6;
    const qualityWeight = weights.qualityWeight || 0.3;
    const timelinessWeight = weights.timelinessWeight || 0.1;
    
    const total = completionWeight + qualityWeight + timelinessWeight;
    
    // Tolerancia de 0.01 para errores de punto flotante
    return Math.abs(total - 1.0) <= 0.01;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} los pesos deben sumar exactamente 1.0`;
  }
}

export function IsValidProgressWeights(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidProgressWeightsConstraint,
    });
  };
}

/**
 * Validador para URLs de webhook seguras
 */
@ValidatorConstraint({ name: 'isSecureWebhookUrl', async: false })
export class IsSecureWebhookUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string, args: ValidationArguments) {
    if (!url) return true; // Opcional
    
    try {
      const urlObj = new URL(url);
      
      // Debe ser HTTPS
      if (urlObj.protocol !== 'https:') return false;
      
      // No permitir localhost o IPs privadas en producción
      const hostname = urlObj.hostname.toLowerCase();
      if (hostname === 'localhost' || 
          hostname === '127.0.0.1' || 
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        return process.env.NODE_ENV === 'development';
      }
      
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} debe ser una URL HTTPS válida y segura`;
  }
}

export function IsSecureWebhookUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSecureWebhookUrlConstraint,
    });
  };
}

/**
 * Validador para expresiones cron válidas
 */
@ValidatorConstraint({ name: 'isValidCron', async: false })
export class IsValidCronConstraint implements ValidatorConstraintInterface {
  validate(cronExpression: string, args: ValidationArguments) {
    if (!cronExpression) return true; // Opcional
    
    // Regex básico para expresiones cron de 5 campos (minuto, hora, día, mes, día_semana)
    const cronRegex = /^(\*|([0-5]?\d))(\/([0-5]?\d))? (\*|([01]?\d|2[0-3]))(\/([01]?\d|2[0-3]))? (\*|([12]?\d|3[01]))(\/([12]?\d|3[01]))? (\*|([1-9]|1[012]))(\/([1-9]|1[012]))? (\*|[0-6])(\/[0-6])?$/;
    
    if (!cronRegex.test(cronExpression)) return false;
    
    // Validaciones adicionales
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) return false;
    
    // Validar rangos específicos
    const [minute, hour, day, month, dayOfWeek] = parts;
    
    return this.validateCronField(minute, 0, 59) &&
           this.validateCronField(hour, 0, 23) &&
           this.validateCronField(day, 1, 31) &&
           this.validateCronField(month, 1, 12) &&
           this.validateCronField(dayOfWeek, 0, 6);
  }

  private validateCronField(field: string, min: number, max: number): boolean {
    if (field === '*') return true;
    
    // Validar números individuales
    if (/^\d+$/.test(field)) {
      const num = parseInt(field, 10);
      return num >= min && num <= max;
    }
    
    // Validar rangos (1-5)
    if (/^\d+-\d+$/.test(field)) {
      const [start, end] = field.split('-').map(n => parseInt(n, 10));
      return start >= min && end <= max && start <= end;
    }
    
    // Validar steps (*/5, 1-10/2)
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepNum = parseInt(step, 10);
      if (stepNum <= 0 || stepNum > max) return false;
      
      if (range === '*') return true;
      return this.validateCronField(range, min, max);
    }
    
    // Validar listas (1,3,5)
    if (field.includes(',')) {
      const values = field.split(',').map(n => parseInt(n, 10));
      return values.every(val => val >= min && val <= max);
    }
    
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} debe ser una expresión cron válida (5 campos)`;
  }
}

export function IsValidCron(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCronConstraint,
    });
  };
}

/**
 * Validador para configuración de dificultad válida
 */
@ValidatorConstraint({ name: 'isValidDifficultyAdjustment', async: false })
export class IsValidDifficultyAdjustmentConstraint implements ValidatorConstraintInterface {
  validate(adjustment: number, args: ValidationArguments) {
    if (adjustment === undefined || adjustment === null) return true; // Opcional
    
    // Debe estar entre 0.1 y 3.0
    if (adjustment < 0.1 || adjustment > 3.0) return false;
    
    // Solo permitir hasta 2 decimales
    const decimalPlaces = (adjustment.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) return false;
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} debe estar entre 0.1 y 3.0 con máximo 2 decimales`;
  }
}

export function IsValidDifficultyAdjustment(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDifficultyAdjustmentConstraint,
    });
  };
}

/**
 * Validador para metadatos de target válidos
 */
@ValidatorConstraint({ name: 'isValidTargetMetadata', async: false })
export class IsValidTargetMetadataConstraint implements ValidatorConstraintInterface {
  validate(metadata: any, args: ValidationArguments) {
    if (!metadata || typeof metadata !== 'object') return true; // Opcional
    
    // Verificar tamaño del objeto serializado (máximo 64KB)
    const serialized = JSON.stringify(metadata);
    if (serialized.length > 65536) return false;
    
    // No permitir propiedades que empiecen con underscore (reserved)
    const keys = Object.keys(metadata);
    if (keys.some(key => key.startsWith('_'))) return false;
    
    // Validar tipos de valores permitidos
    const allowedTypes = ['string', 'number', 'boolean'];
    return this.validateObjectValues(metadata, allowedTypes);
  }

  private validateObjectValues(obj: any, allowedTypes: string[]): boolean {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      
      if (Array.isArray(value)) {
        // Arrays solo de tipos primitivos
        if (!value.every(item => allowedTypes.includes(typeof item))) return false;
      } else if (typeof value === 'object') {
        // Objetos anidados (máximo 2 niveles)
        if (!this.validateObjectValues(value, allowedTypes)) return false;
      } else if (!allowedTypes.includes(typeof value)) {
        return false;
      }
    }
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} debe contener solo tipos primitivos y no exceder 64KB`;
  }
}

export function IsValidTargetMetadata(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTargetMetadataConstraint,
    });
  };
}

/**
 * Validador para configuración de notificaciones coherente
 */
@ValidatorConstraint({ name: 'isCoherentNotificationConfig', async: false })
export class IsCoherentNotificationConfigConstraint implements ValidatorConstraintInterface {
  validate(config: any, args: ValidationArguments) {
    if (!config || typeof config !== 'object') return true; // Opcional
    
    // Si sendReminderNotification es true, debe tener reminderDaysBefore
    if (config.sendReminderNotification === true && !config.reminderDaysBefore) {
      return false;
    }
    
    // Si escalateOverdueAfterDays está definido, debe ser mayor que reminderDaysBefore
    if (config.escalateOverdueAfterDays && config.reminderDaysBefore) {
      if (config.escalateOverdueAfterDays <= config.reminderDaysBefore) return false;
    }
    
    // Si tiene customNotificationEmails, sendReminderNotification debería ser true
    if (config.customNotificationEmails && config.customNotificationEmails.length > 0) {
      if (config.sendReminderNotification === false) return false;
    }
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} configuración de notificaciones incoherente`;
  }
}

export function IsCoherentNotificationConfig(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCoherentNotificationConfigConstraint,
    });
  };
}

/**
 * Utilidades de validación
 */
export class ValidationUtils {
  /**
   * Valida que un UUID existe en la base de datos
   */
  static async validateUUIDExists(
    uuid: string,
    repository: any,
    errorMessage: string = 'Registro no encontrado'
  ): Promise<boolean> {
    try {
      const entity = await repository.findOne({ where: { id: uuid } });
      return !!entity;
    } catch {
      return false;
    }
  }

  /**
   * Sanitiza texto de entrada
   */
  static sanitizeText(text: string): string {
    if (!text) return text;
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Múltiples espacios → espacio único
      .replace(/[<>]/g, '') // Remover < y > por seguridad
      .substring(0, 10000); // Límite máximo de caracteres
  }

  /**
   * Valida formato de email múltiples
   */
  static validateMultipleEmails(emails: string[]): boolean {
    if (!Array.isArray(emails)) return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every(email => emailRegex.test(email));
  }

  /**
   * Calcula hash para validar integridad de datos
   */
  static calculateDataHash(data: any): string {
    const crypto = require('crypto');
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Valida que una fecha esté dentro de un rango académico válido
   */
  static isValidAcademicDate(date: string): boolean {
    const inputDate = new Date(date);
    const currentYear = new Date().getFullYear();
    
    // Fechas académicas válidas: 2 años atrás hasta 5 años adelante
    const minDate = new Date(currentYear - 2, 0, 1);
    const maxDate = new Date(currentYear + 5, 11, 31);
    
    return inputDate >= minDate && inputDate <= maxDate;
  }
}