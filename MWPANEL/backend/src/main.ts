// Import polyfills first
import './polyfills';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Compression
  app.use(compression());

  // Additional security headers
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(self), camera=()');
    next();
  });

  // CORS
  const corsOrigins = configService.get('CORS_ORIGIN', '*');
  const allowedOrigins = corsOrigins === '*' ? true : corsOrigins.split(',').map(origin => origin.trim());
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });

  // Static file serving for profile photos
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Configure request body parsing for large files up to 10GB (Google Drive storage)
  app.use(express.json({ limit: '10gb' }));
  app.use(express.urlencoded({ extended: true, limit: '10gb' }));

  // Global prefix
  app.setGlobalPrefix('api');

  // Basic request logging - before all other middleware
  app.use((req, res, next) => {
    next();
  });



  // Request logging middleware
  app.use((req, res, next) => {
    // Log ALL requests to grade-with-rubric endpoint
    if (req.url.includes('grade-with-rubric')) {
      console.log('⭐⭐⭐ ===================================================');
      console.log('⭐⭐⭐ REQUEST TO GRADE-WITH-RUBRIC ENDPOINT RECEIVED');
      console.log('⭐⭐⭐ ===================================================');
      console.log('⭐ [MIDDLEWARE] Method:', req.method);
      console.log('⭐ [MIDDLEWARE] Full URL:', req.url);
      console.log('⭐ [MIDDLEWARE] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('⭐ [MIDDLEWARE] Body:', JSON.stringify(req.body, null, 2));
    }
    if (req.method === 'POST' && req.url.includes('/subjects')) {
      console.log('🚀 [REQUEST] POST /subjects incoming');
      console.log('🚀 [REQUEST] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('🚀 [REQUEST] Body:', JSON.stringify(req.body, null, 2));
    }
    if (req.method === 'POST' && req.url.includes('/classrooms')) {
      console.log('🏫 [REQUEST] POST /classrooms incoming');
      console.log('🏫 [REQUEST] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('🏫 [REQUEST] Body:', JSON.stringify(req.body, null, 2));
    }
    if (req.method === 'POST' && req.url.includes('/evaluations')) {
      console.log('📝 [REQUEST] POST /evaluations incoming');
      console.log('📝 [REQUEST] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('📝 [REQUEST] Body:', JSON.stringify(req.body, null, 2));
      console.log('📝 [REQUEST] Raw Body:', req.body);
    }
    if (req.method === 'POST' && req.url.includes('/import-with-competencies')) {
      console.log('🎯 [RUBRIC DEBUG] POST /import-with-competencies incoming');
      console.log('🎯 [RUBRIC DEBUG] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('🎯 [RUBRIC DEBUG] Body:', JSON.stringify(req.body, null, 2));
      console.log('🎯 [RUBRIC DEBUG] competencyMappings type:', typeof req.body?.competencyMappings);
      console.log('🎯 [RUBRIC DEBUG] competencyMappings value:', req.body?.competencyMappings);
    }
    if (req.method === 'PATCH') {
      console.log('🔧 [REQUEST] PATCH incoming');
      console.log('🔧 [REQUEST] URL:', req.url);
      console.log('🔧 [REQUEST] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('🔧 [REQUEST] Body:', JSON.stringify(req.body, null, 2));
      console.log('🔧 [REQUEST] Raw Body:', req.body);
    }
    if (req.method === 'PUT' && req.url.includes('configurations')) {
      console.log('⚙️ [REQUEST] PUT CONFIGURATIONS incoming');
      console.log('⚙️ [REQUEST] Full URL:', req.url);
      console.log('⚙️ [REQUEST] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('⚙️ [REQUEST] Body type:', typeof req.body);
      console.log('⚙️ [REQUEST] Body:', JSON.stringify(req.body, null, 2));
      console.log('⚙️ [REQUEST] Raw Body:', req.body);
    }
    if (req.method === 'POST' && req.url.includes('/slots/bulk')) {
      console.log('🗓️ [REQUEST] POST BULK SLOTS incoming');
      console.log('🗓️ [REQUEST] Full URL:', req.url);
      console.log('🗓️ [REQUEST] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('🗓️ [REQUEST] Body type:', typeof req.body);
      console.log('🗓️ [REQUEST] Body:', JSON.stringify(req.body, null, 2));
      console.log('🗓️ [REQUEST] Raw Body:', req.body);
      console.log('🗓️ [REQUEST] Body.slots type:', typeof req.body?.slots);
      console.log('🗓️ [REQUEST] Body.slots isArray:', Array.isArray(req.body?.slots));
    }
    next();
  });

  // Validation with detailed error logging
  const logger = new Logger('ValidationPipe');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      skipMissingProperties: true,
      transformOptions: {
        enableImplicitConversion: false,  // Disabled to allow manual @Transform decorators to work correctly
      },
      exceptionFactory: (errors) => {
        console.log('🚨🚨🚨 VALIDATION PIPE TRIGGERED!');
        console.log('🚨 VALIDATION ERRORS COUNT:', errors.length);
        logger.error('Validation failed with errors:');
        errors.forEach((error, index) => {
          console.log(`🚨 Error ${index + 1}: Property: ${error.property}, Value: ${JSON.stringify(error.value)}, Constraints: ${JSON.stringify(error.constraints)}`);
          logger.error(`Error ${index + 1}:`);
          logger.error(`  Property: ${error.property}`);
          logger.error(`  Value: ${JSON.stringify(error.value)}`);
          logger.error(`  Constraints: ${JSON.stringify(error.constraints)}`);
        });
        console.log('🚨 VALIDATION PIPE RETURNING BadRequestException');
        return new BadRequestException({
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            value: err.value,
            constraints: err.constraints
          }))
        });
      },
    }),
  );

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MW Panel API')
      .setDescription('School Management System API Documentation')
      .setVersion('2.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get('PORT', 3000);
  await app.listen(port);
  
  console.log(`MW Panel Backend running on: http://localhost:${port}`);
  console.log(`Environment: ${configService.get('NODE_ENV', 'development')}`);
}

bootstrap();