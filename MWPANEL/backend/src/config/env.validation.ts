import { plainToClass } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync, IsBoolean, IsOptional, MinLength, IsEmail, IsUrl, Min, Max } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Min(1)
  @Max(65535)
  APP_PORT: number;

  @IsString()
  @MinLength(1)
  APP_NAME: string;

  // Database
  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  DATABASE_PORT: number;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  @MinLength(8)
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string;

  // JWT
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsString()
  @MinLength(32)
  REFRESH_TOKEN_SECRET: string;

  @IsString()
  REFRESH_TOKEN_EXPIRES_IN: string;

  // Redis
  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  // Email
  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;

  @IsEmail()
  @IsOptional()
  EMAIL_FROM?: string;

  // Google
  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_SECRET?: string;

  // AI Services
  @IsOptional()
  @IsString()
  HUGGINGFACE_API_KEY?: string;

  @IsOptional()
  @IsString()
  ANTHROPIC_API_KEY?: string;

  // Security
  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsNumber()
  RATE_LIMIT_TTL?: number;

  @IsOptional()
  @IsNumber()
  RATE_LIMIT_MAX?: number;

  // Admin defaults
  @IsEmail()
  ADMIN_EMAIL: string;

  @IsString()
  @MinLength(12)
  ADMIN_PASSWORD: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map(error => {
        const constraints = error.constraints;
        return constraints ? Object.values(constraints).join(', ') : '';
      })
      .filter(msg => msg.length > 0);
    
    throw new Error(`Configuration validation error:\n${errorMessages.join('\n')}`);
  }

  // Additional security checks for production
  if (validatedConfig.NODE_ENV === Environment.Production) {
    // Check for default/weak values
    const weakValues = ['changeme', 'password', 'secret', 'your-', 'example', 'test', '123'];
    const sensitiveFields = ['DATABASE_PASSWORD', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'ADMIN_PASSWORD'];
    
    for (const field of sensitiveFields) {
      const value = (validatedConfig as any)[field]?.toLowerCase();
      if (value && weakValues.some(weak => value.includes(weak))) {
        throw new Error(`Weak ${field} detected in production! Please use strong, unique values.`);
      }
    }

    // Ensure critical services are configured
    if (!validatedConfig.RESEND_API_KEY && !process.env.SMTP_HOST) {
      console.warn('⚠️  No email service configured. Email notifications will be disabled.');
    }

    if (!validatedConfig.REDIS_PASSWORD) {
      console.warn('⚠️  Redis running without password. Consider adding REDIS_PASSWORD for security.');
    }
  }

  return validatedConfig;
}