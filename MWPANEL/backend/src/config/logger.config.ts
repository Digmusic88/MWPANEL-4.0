import { registerAs } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

export default registerAs('logger', () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';
  
  // Formato personalizado para los logs
  const logFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  );

  // Formato para consola en desarrollo
  const consoleFormat = winston.format.combine(
    winston.format.colorize({
      all: true,
      colors: {
        error: 'red',
        warn: 'yellow',
        info: 'cyan',
        verbose: 'blue',
        debug: 'green',
        silly: 'magenta',
      },
    }),
    winston.format.timestamp({
      format: 'HH:mm:ss.SSS',
    }),
    winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
      let log = `${timestamp} `;
      
      // Agregar contexto si existe
      if (context) {
        log += `[${context}] `;
      }
      
      log += `${level}: ${message}`;
      
      // Agregar metadata si existe
      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
      }
      
      // Agregar stack trace si existe
      if (trace) {
        log += `\n${trace}`;
      }
      
      return log;
    }),
  );

  // Transportes para los logs
  const transports: winston.transport[] = [];

  // Console transport (siempre activo excepto en tests)
  if (!isTest) {
    transports.push(
      new winston.transports.Console({
        level: isDevelopment ? 'debug' : 'info',
        format: isDevelopment ? consoleFormat : logFormat,
      }),
    );
  }

  // File transport para errores
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: logFormat,
    }),
  );

  // File transport para todos los logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
      level: isDevelopment ? 'debug' : 'info',
      format: logFormat,
    }),
  );

  // File transport para logs de auditoría (acciones importantes)
  transports.push(
    new DailyRotateFile({
      filename: 'logs/audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'info',
      format: logFormat,
      // Solo logs con metadata de auditoría
      // Note: filter property removed as it's not supported in this transport configuration
    }),
  );

  return {
    // Nivel de log por defecto
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    
    // Formato de logs
    format: logFormat,
    
    // Transportes
    transports,
    
    // Configuración adicional
    exitOnError: false,
    
    // Niveles personalizados
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      debug: 5,
      silly: 6,
    },
  };
});