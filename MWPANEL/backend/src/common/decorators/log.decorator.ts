import { LoggerService } from '../services/logger.service';

/**
 * Decorator para loggear automáticamente la entrada y salida de métodos
 */
export function Log(message?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger: LoggerService = this.logger || (() => {
        const log = new LoggerService();
        log.setContext(target.constructor.name);
        return log;
      })();
      const startTime = Date.now();
      const methodMessage = message || `${target.constructor.name}.${propertyName}`;

      try {
        // Log de entrada
        logger.debug(`→ ${methodMessage}`);

        // Ejecutar método original
        const result = await originalMethod.apply(this, args);

        // Log de salida exitosa
        const duration = Date.now() - startTime;
        logger.debug(`← ${methodMessage} (${duration}ms)`);

        return result;
      } catch (error) {
        // Log de error
        const duration = Date.now() - startTime;
        logger.error(`✗ ${methodMessage} (${duration}ms): ${error.message}`, error.stack);

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator para loggear acciones de auditoría
 */
export function Audit(action: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger: LoggerService = this.logger || (() => {
        const log = new LoggerService();
        log.setContext(target.constructor.name);
        return log;
      })();
      
      try {
        // Ejecutar método original
        const result = await originalMethod.apply(this, args);

        // Log de auditoría
        const userId = this.request?.user?.id || 'system';
        logger.audit(action, userId, {
          method: `${target.constructor.name}.${propertyName}`,
          args: args.length > 0 ? args : undefined,
          result: result?.id || result,
        });

        return result;
      } catch (error) {
        // Log de error en auditoría
        const userId = this.request?.user?.id || 'system';
        logger.audit(`${action} (FAILED)`, userId, {
          method: `${target.constructor.name}.${propertyName}`,
          args: args.length > 0 ? args : undefined,
          error: error.message,
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator para medir performance
 */
export function Measure(operationName?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger: LoggerService = this.logger || (() => {
        const log = new LoggerService();
        log.setContext(target.constructor.name);
        return log;
      })();
      const operation = operationName || `${target.constructor.name}.${propertyName}`;
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Log de performance
        logger.performance(operation, duration, {
          args: args.length,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Log de performance con error
        logger.performance(`${operation} (FAILED)`, duration, {
          args: args.length,
          error: error.message,
        });

        throw error;
      }
    };

    return descriptor;
  };
}