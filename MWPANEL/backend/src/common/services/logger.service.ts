import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(
    private configService?: ConfigService,
  ) {
    this.context = 'Application';
    
    const loggerConfig = this.configService?.get('logger') || this.getDefaultConfig();
    
    this.logger = winston.createLogger({
      level: loggerConfig.level,
      format: loggerConfig.format,
      transports: loggerConfig.transports,
      exitOnError: loggerConfig.exitOnError,
      levels: loggerConfig.levels,
    });
  }

  /**
   * Get default logger configuration
   */
  private getDefaultConfig() {
    return {
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
      exitOnError: false,
      levels: winston.config.npm.levels
    };
  }

  /**
   * Set the context for this logger instance
   */
  setContext(context: string) {
    this.context = context;
  }

  /**
   * Log a message with info level
   */
  log(message: any, context?: string): void {
    this.logger.info(this.formatMessage(message), {
      context: context || this.context,
    });
  }

  /**
   * Log an info message (alias for log)
   */
  info(message: any, context?: string): void {
    this.logger.info(this.formatMessage(message), {
      context: context || this.context,
    });
  }

  /**
   * Log an error message
   */
  error(message: any, trace?: string, context?: string): void {
    this.logger.error(this.formatMessage(message), {
      context: context || this.context,
      trace,
    });
  }

  /**
   * Log a warning message
   */
  warn(message: any, context?: string): void {
    this.logger.warn(this.formatMessage(message), {
      context: context || this.context,
    });
  }

  /**
   * Log a debug message
   */
  debug?(message: any, context?: string): void {
    this.logger.debug(this.formatMessage(message), {
      context: context || this.context,
    });
  }

  /**
   * Log a verbose message
   */
  verbose?(message: any, context?: string): void {
    this.logger.verbose(this.formatMessage(message), {
      context: context || this.context,
    });
  }

  /**
   * Log an HTTP request
   */
  http(message: any, meta?: any): void {
    this.logger.http(this.formatMessage(message), {
      context: this.context,
      ...meta,
    });
  }

  /**
   * Log an audit event (important user actions)
   */
  audit(action: string, userId: string, details: any): void {
    this.logger.info({
      message: `Audit: ${action}`,
      context: this.context,
      audit: true,
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log a security event
   */
  security(event: string, details: any): void {
    this.logger.warn({
      message: `Security: ${event}`,
      context: this.context,
      security: true,
      event,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log a performance metric
   */
  performance(operation: string, duration: number, metadata?: any): void {
    this.logger.info({
      message: `Performance: ${operation}`,
      context: this.context,
      performance: true,
      operation,
      duration,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): LoggerService {
    const childLogger = new LoggerService(this.configService);
    childLogger.setContext(`${this.context}:${context}`);
    return childLogger;
  }
  
  /**
   * Static factory method to create logger with context
   */
  static createWithContext(configService: ConfigService, context: string): LoggerService {
    const logger = new LoggerService(configService);
    logger.setContext(context);
    return logger;
  }

  /**
   * Format message to handle different types
   */
  private formatMessage(message: any): string {
    if (typeof message === 'object') {
      return JSON.stringify(message);
    }
    return message;
  }

  /**
   * Query logs (útil para debugging)
   */
  async queryLogs(options: {
    from?: Date;
    until?: Date;
    limit?: number;
    level?: string;
    context?: string;
  }): Promise<any[]> {
    // This would require implementing a query transport
    // For now, return empty array
    return [];
  }
}