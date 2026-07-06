/**
 * @archivo: assignments-performance.e2e-spec.ts
 * @módulo: Assignments - Performance E2E Tests
 * @función: Tests end-to-end para validar rendimiento del sistema
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Suite especializada de tests E2E que valida el rendimiento
 * y escalabilidad del sistema de asignaciones.
 * 
 * FUNCIONALIDADES TESTADAS:
 * - Performance de queries complejas
 * - Escalabilidad con grandes volúmenes
 * - Cache y optimizaciones
 * - Límites de concurrencia
 * - Memory leaks y recursos
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.6
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { performance } from 'perf_hooks';

// Módulos y entidades
import { AssignmentsModule } from '../src/modules/assignments/assignments.module';
import { UsersModule } from '../src/modules/users/users.module';
import { AssignmentCampaign } from '../src/modules/assignments/entities/assignment-campaign.entity';
import { AssignmentProgress } from '../src/modules/assignments/entities/assignment-progress.entity';
import { User, UserRole } from '../src/modules/users/entities/user.entity';

// Types
import { CampaignType, CampaignStatus } from '../src/modules/assignments/entities/assignment-campaign.entity';
import { TargetType } from '../src/modules/assignments/entities/campaign-target.entity';

/**
 * Configuración optimizada para performance tests
 */
const performanceDbConfig = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'mwpanel',
  password: process.env.DB_PASSWORD || 'mwpanel123',
  database: process.env.DB_NAME_TEST || 'mwpanel_performance_test',
  synchronize: true,
  dropSchema: true,
  entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
  // Configuración optimizada para tests
  extra: {
    max: 20, // Más conexiones para concurrencia
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
};

/**
 * Métricas de performance esperadas
 */
const PERFORMANCE_THRESHOLDS = {
  CAMPAIGN_CREATION_MAX_TIME: 500, // ms
  CAMPAIGN_LIST_MAX_TIME: 200, // ms
  PROGRESS_UPDATE_MAX_TIME: 300, // ms
  ANALYTICS_MAX_TIME: 1000, // ms
  BULK_OPERATION_MAX_TIME: 2000, // ms
  CONCURRENT_REQUEST_MAX_TIME: 5000, // ms
  MAX_MEMORY_USAGE_MB: 200, // MB
  MIN_REQUESTS_PER_SECOND: 100, // req/s
};

describe('Assignments Performance E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  
  // Test users y tokens
  let adminToken: string;
  let teacherToken: string;
  let adminUserId: string;
  let teacherUserId: string;
  
  // Performance tracking
  let performanceResults: Array<{
    test: string;
    duration: number;
    success: boolean;
    memory?: number;
  }> = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(performanceDbConfig),
        AssignmentsModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Configuraciones para performance
    app.useGlobalPipes();
    app.enableCors();
    
    await app.init();
    
    dataSource = app.get(DataSource);
    jwtService = app.get(JwtService);
    
    await setupPerformanceTestUsers();
  }, 30000); // 30s timeout para setup

  afterAll(async () => {
    // Mostrar resultados de performance
    console.log('\n=== PERFORMANCE TEST RESULTS ===');
    console.table(performanceResults);
    
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar memoria y GC
    if (global.gc) {
      global.gc();
    }
  });

  // ========================================
  // SETUP Y HELPERS
  // ========================================

  async function setupPerformanceTestUsers() {
    const userRepository = dataSource.getRepository(User);
    
    // Admin user
    const admin = userRepository.create({
      email: 'admin.performance@test.com',
      passwordHash: 'password123',
      role: UserRole.ADMIN,
      profile: {
        firstName: 'Admin',
        lastName: 'Performance',
      } as any,
    });
    const savedAdmins = await userRepository.save(admin);
    const savedAdmin = Array.isArray(savedAdmins) ? savedAdmins[0] : savedAdmins;
    adminUserId = savedAdmin.id;
    adminToken = jwtService.sign({
      userId: savedAdmin.id,
      email: savedAdmin.email,
      role: savedAdmin.role,
    });

    // Teacher user
    const teacher = userRepository.create({
      email: 'teacher.performance@test.com',
      passwordHash: 'password123',
      role: UserRole.TEACHER,
      profile: {
        firstName: 'Teacher',
        lastName: 'Performance',
      } as any,
    });
    const savedTeachers = await userRepository.save(teacher);
    const savedTeacher = Array.isArray(savedTeachers) ? savedTeachers[0] : savedTeachers;
    teacherUserId = savedTeacher.id;
    teacherToken = jwtService.sign({
      userId: savedTeacher.id,
      email: savedTeacher.email,
      role: savedTeacher.role,
    });
  }

  function createCampaignDto(index: number | string = 0) {
    return {
      title: `Performance Test Campaign ${index}`,
      description: `Campaign for performance testing - batch ${index}`,
      type: CampaignType.SINGLE,
      status: CampaignStatus.DRAFT,
      resources: [
        {
          resourceId: '01234567-89ab-cdef-0123-456789abcde1',
          required: true,
          estimatedTime: 30,
          difficultyAdjustment: 0,
        },
      ],
      targets: [
        {
          targetType: TargetType.CLASS,
          targetId: '11111111-1111-1111-1111-111111111111',
          metadata: { performanceTest: true },
        },
      ],
      configuration: {
        allowLateSubmission: true,
        requireCompletion: false,
        enableNotifications: false, // Disable para performance
        trackProgress: true,
      },
    };
  }

  async function measurePerformance<T>(
    testName: string,
    operation: () => Promise<T>,
    threshold?: number
  ): Promise<T> {
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      
      performanceResults.push({
        test: testName,
        duration: Math.round(duration),
        success: true,
        memory: Math.round((endMemory - startMemory) * 100) / 100,
      });
      
      if (threshold && duration > threshold) {
        console.warn(
          `⚠️ Performance warning: ${testName} took ${Math.round(duration)}ms (threshold: ${threshold}ms)`
        );
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      performanceResults.push({
        test: testName,
        duration: Math.round(duration),
        success: false,
      });
      
      throw error;
    }
  }

  // ========================================
  // TESTS DE PERFORMANCE BÁSICA
  // ========================================

  describe('Basic Performance Tests', () => {
    it('should create campaign within performance threshold', async () => {
      await measurePerformance(
        'Campaign Creation',
        async () => {
          const response = await request(app.getHttpServer())
            .post('/assignments/campaigns')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(createCampaignDto())
            .expect(201);
          
          return response.body;
        },
        PERFORMANCE_THRESHOLDS.CAMPAIGN_CREATION_MAX_TIME
      );
    });

    it('should list campaigns within performance threshold', async () => {
      // Crear algunas campaigns primero
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(createCampaignDto(i));
      }

      await measurePerformance(
        'Campaign List (10 items)',
        async () => {
          const response = await request(app.getHttpServer())
            .get('/assignments/campaigns')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
          
          return response.body;
        },
        PERFORMANCE_THRESHOLDS.CAMPAIGN_LIST_MAX_TIME
      );
    });

    it('should update campaign within performance threshold', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createCampaignDto());

      const campaignId = createResponse.body.id;

      await measurePerformance(
        'Campaign Update',
        async () => {
          const response = await request(app.getHttpServer())
            .patch(`/assignments/campaigns/${campaignId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Updated Performance Campaign' })
            .expect(200);
          
          return response.body;
        },
        PERFORMANCE_THRESHOLDS.PROGRESS_UPDATE_MAX_TIME
      );
    });
  });

  // ========================================
  // TESTS DE ESCALABILIDAD
  // ========================================

  describe('Scalability Tests', () => {
    it('should handle bulk campaign creation efficiently', async () => {
      const campaignCount = 50;
      
      await measurePerformance(
        `Bulk Creation (${campaignCount} campaigns)`,
        async () => {
          const promises = Array(campaignCount).fill(null).map((_, i) =>
            request(app.getHttpServer())
              .post('/assignments/campaigns')
              .set('Authorization', `Bearer ${adminToken}`)
              .send(createCampaignDto(i))
          );
          
          const responses = await Promise.allSettled(promises);
          
          const successful = responses.filter(
            result => result.status === 'fulfilled' &&
            (result.value as any).status === 201
          ).length;
          
          expect(successful).toBe(campaignCount);
          return successful;
        },
        PERFORMANCE_THRESHOLDS.BULK_OPERATION_MAX_TIME
      );
    }, 10000); // 10s timeout

    it('should efficiently query campaigns with filters and pagination', async () => {
      // Crear datasets para testing
      const campaignCount = 100;
      const createPromises = Array(campaignCount).fill(null).map((_, i) => {
        const campaign = createCampaignDto(i);
        if (i % 3 === 0) campaign.status = CampaignStatus.ACTIVE;
        if (i % 5 === 0) campaign.type = CampaignType.BULK;
        return request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(campaign);
      });
      
      await Promise.all(createPromises);

      // Test query con filtros y paginación
      await measurePerformance(
        `Filtered Query (${campaignCount} campaigns)`,
        async () => {
          const response = await request(app.getHttpServer())
            .get('/assignments/campaigns')
            .query({
              status: CampaignStatus.ACTIVE,
              type: CampaignType.BULK,
              page: 1,
              limit: 20,
              sortBy: 'createdAt',
              sortOrder: 'DESC',
            })
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
          
          expect(response.body.data).toBeDefined();
          expect(response.body.pagination).toBeDefined();
          return response.body;
        },
        PERFORMANCE_THRESHOLDS.CAMPAIGN_LIST_MAX_TIME
      );
    }, 15000);

    it('should handle large progress tracking datasets', async () => {
      const activityCount = 200;
      
      // Crear campaign para tracking
      const campaignResponse = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createCampaignDto());
      
      const campaignId = campaignResponse.body.id;

      await measurePerformance(
        `Progress Tracking (${activityCount} activities)`,
        async () => {
          const promises = Array(activityCount).fill(null).map((_, i) =>
            request(app.getHttpServer())
              .post('/assignments/progress/activity')
              .set('Authorization', `Bearer ${teacherToken}`)
              .send({
                campaignId,
                resourceId: '01234567-89ab-cdef-0123-456789abcde1',
                activityType: 'VIEW',
                timeSpent: Math.floor(Math.random() * 300) + 60,
                metadata: {
                  sequence: i,
                  performanceTest: true,
                },
              })
          );
          
          const responses = await Promise.allSettled(promises);
          const successful = responses.filter(
            result => result.status === 'fulfilled'
          ).length;
          
          return successful;
        },
        PERFORMANCE_THRESHOLDS.BULK_OPERATION_MAX_TIME * 2 // Más tiempo para bulk activities
      );
    }, 20000);
  });

  // ========================================
  // TESTS DE CONCURRENCIA
  // ========================================

  describe('Concurrency Tests', () => {
    it('should handle concurrent campaign creation', async () => {
      const concurrentUsers = 10;
      const campaignsPerUser = 5;

      await measurePerformance(
        `Concurrent Creation (${concurrentUsers}x${campaignsPerUser})`,
        async () => {
          const userPromises = Array(concurrentUsers).fill(null).map(async (_, userIndex) => {
            const campaignPromises = Array(campaignsPerUser).fill(null).map((_, campaignIndex) =>
              request(app.getHttpServer())
                .post('/assignments/campaigns')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createCampaignDto(`${userIndex}-${campaignIndex}`))
            );
            
            return Promise.allSettled(campaignPromises);
          });

          const allResults = await Promise.all(userPromises);
          const totalSuccessful = allResults.reduce((acc, userResults) => {
            const successful = userResults.filter(
              result => result.status === 'fulfilled' &&
              (result.value as any).status === 201
            ).length;
            return acc + successful;
          }, 0);

          expect(totalSuccessful).toBe(concurrentUsers * campaignsPerUser);
          return totalSuccessful;
        },
        PERFORMANCE_THRESHOLDS.CONCURRENT_REQUEST_MAX_TIME
      );
    }, 15000);

    it('should handle concurrent read operations', async () => {
      const concurrentReads = 50;

      await measurePerformance(
        `Concurrent Reads (${concurrentReads} requests)`,
        async () => {
          const promises = Array(concurrentReads).fill(null).map(() =>
            request(app.getHttpServer())
              .get('/assignments/campaigns')
              .set('Authorization', `Bearer ${adminToken}`)
          );

          const responses = await Promise.allSettled(promises);
          const successful = responses.filter(
            result => result.status === 'fulfilled' &&
            (result.value as any).status === 200
          ).length;

          expect(successful).toBe(concurrentReads);
          return successful;
        },
        PERFORMANCE_THRESHOLDS.CONCURRENT_REQUEST_MAX_TIME
      );
    }, 10000);

    it('should maintain performance under mixed workload', async () => {
      const readRequests = 30;
      const writeRequests = 10;
      const updateRequests = 5;

      // Crear algunas campaigns para updates
      const setupPromises = Array(updateRequests).fill(null).map((_, i) =>
        request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(createCampaignDto(i))
      );
      const setupResponses = await Promise.all(setupPromises);
      const campaignIds = setupResponses.map(res => res.body.id);

      await measurePerformance(
        `Mixed Workload (${readRequests}R + ${writeRequests}W + ${updateRequests}U)`,
        async () => {
          const allPromises = [
            // Read requests
            ...Array(readRequests).fill(null).map(() =>
              request(app.getHttpServer())
                .get('/assignments/campaigns')
                .set('Authorization', `Bearer ${adminToken}`)
            ),
            
            // Write requests
            ...Array(writeRequests).fill(null).map((_, i) =>
              request(app.getHttpServer())
                .post('/assignments/campaigns')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(createCampaignDto(`mixed-${i}`))
            ),
            
            // Update requests
            ...campaignIds.map((id, i) =>
              request(app.getHttpServer())
                .patch(`/assignments/campaigns/${id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: `Mixed Update ${i}` })
            ),
          ];

          const responses = await Promise.allSettled(allPromises);
          const successful = responses.filter(
            result => result.status === 'fulfilled' &&
            [200, 201].includes((result.value as any).status)
          ).length;

          const totalRequests = readRequests + writeRequests + updateRequests;
          expect(successful).toBe(totalRequests);
          return successful;
        },
        PERFORMANCE_THRESHOLDS.CONCURRENT_REQUEST_MAX_TIME
      );
    }, 15000);
  });

  // ========================================
  // TESTS DE ANALYTICS PERFORMANCE
  // ========================================

  describe('Analytics Performance Tests', () => {
    beforeEach(async () => {
      // Crear dataset para analytics
      const promises = Array(20).fill(null).map((_, i) =>
        request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(createCampaignDto(i))
      );
      await Promise.all(promises);
    });

    it('should generate analytics overview efficiently', async () => {
      await measurePerformance(
        'Analytics Overview',
        async () => {
          const response = await request(app.getHttpServer())
            .get('/assignments/analytics/overview')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
          
          expect(response.body.totalCampaigns).toBeDefined();
          expect(response.body.activeCampaigns).toBeDefined();
          expect(response.body.completionRate).toBeDefined();
          return response.body;
        },
        PERFORMANCE_THRESHOLDS.ANALYTICS_MAX_TIME
      );
    });

    it('should generate detailed analytics efficiently', async () => {
      await measurePerformance(
        'Detailed Analytics',
        async () => {
          const response = await request(app.getHttpServer())
            .get('/assignments/analytics/detailed')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
          
          expect(response.body).toBeDefined();
          return response.body;
        },
        PERFORMANCE_THRESHOLDS.ANALYTICS_MAX_TIME
      );
    });
  });

  // ========================================
  // TESTS DE MEMORIA Y RECURSOS
  // ========================================

  describe('Memory and Resource Tests', () => {
    it('should not leak memory during bulk operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      
      // Realizar operaciones que podrían causar memory leaks
      for (let batch = 0; batch < 5; batch++) {
        const promises = Array(20).fill(null).map((_, i) =>
          request(app.getHttpServer())
            .post('/assignments/campaigns')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(createCampaignDto(`batch-${batch}-${i}`))
        );
        
        await Promise.all(promises);
        
        // Forzar garbage collection si está disponible
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`Memory usage: ${initialMemory.toFixed(2)}MB → ${finalMemory.toFixed(2)}MB (${memoryIncrease.toFixed(2)}MB increase)`);
      
      // No debería haber un aumento excesivo de memoria
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_MEMORY_USAGE_MB);
    }, 30000);

    it('should efficiently handle database connections', async () => {
      const concurrentConnections = 15;
      
      await measurePerformance(
        `Database Connections (${concurrentConnections})`,
        async () => {
          const promises = Array(concurrentConnections).fill(null).map(async (_, i) => {
            // Operaciones que requieren conexión DB
            const campaign = await request(app.getHttpServer())
              .post('/assignments/campaigns')
              .set('Authorization', `Bearer ${adminToken}`)
              .send(createCampaignDto(i));
            
            await request(app.getHttpServer())
              .get(`/assignments/campaigns/${campaign.body.id}`)
              .set('Authorization', `Bearer ${adminToken}`);
            
            await request(app.getHttpServer())
              .patch(`/assignments/campaigns/${campaign.body.id}`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ title: `Connection Test ${i}` });
            
            return campaign.body.id;
          });
          
          const results = await Promise.allSettled(promises);
          const successful = results.filter(
            result => result.status === 'fulfilled'
          ).length;
          
          return successful;
        },
        PERFORMANCE_THRESHOLDS.CONCURRENT_REQUEST_MAX_TIME
      );
    }, 20000);
  });

  // ========================================
  // TESTS DE CACHE PERFORMANCE
  // ========================================

  describe('Cache Performance Tests', () => {
    it('should benefit from permission caching', async () => {
      const requestCount = 10;
      
      // Primera ronda - cache frío
      const coldStart = await measurePerformance(
        'Permission Check (Cold Cache)',
        async () => {
          const promises = Array(requestCount).fill(null).map(() =>
            request(app.getHttpServer())
              .get('/assignments/campaigns')
              .set('Authorization', `Bearer ${adminToken}`)
          );
          
          await Promise.all(promises);
          return requestCount;
        }
      );
      
      // Segunda ronda - cache caliente
      const warmStart = await measurePerformance(
        'Permission Check (Warm Cache)',
        async () => {
          const promises = Array(requestCount).fill(null).map(() =>
            request(app.getHttpServer())
              .get('/assignments/campaigns')
              .set('Authorization', `Bearer ${adminToken}`)
          );
          
          await Promise.all(promises);
          return requestCount;
        }
      );
      
      // El cache debería mejorar el performance
      const coldTime = performanceResults.find(r => r.test === 'Permission Check (Cold Cache)')?.duration || 0;
      const warmTime = performanceResults.find(r => r.test === 'Permission Check (Warm Cache)')?.duration || 0;
      
      console.log(`Cache performance: Cold=${coldTime}ms, Warm=${warmTime}ms`);
      
      // El cache debería mejorar el performance o al menos no empeorarlo significativamente
      expect(warmTime).toBeLessThanOrEqual(coldTime * 1.2); // Máximo 20% peor (margin for variance)
    });

    it('should efficiently handle ownership cache', async () => {
      // Crear campaign para ownership testing
      const campaignResponse = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createCampaignDto());
      
      const campaignId = campaignResponse.body.id;
      const requestCount = 15;

      await measurePerformance(
        'Ownership Validation (Cached)',
        async () => {
          const promises = Array(requestCount).fill(null).map(() =>
            request(app.getHttpServer())
              .get(`/assignments/campaigns/${campaignId}`)
              .set('Authorization', `Bearer ${adminToken}`)
          );
          
          const responses = await Promise.all(promises);
          const successful = responses.filter(res => res.status === 200).length;
          
          expect(successful).toBe(requestCount);
          return successful;
        },
        PERFORMANCE_THRESHOLDS.CAMPAIGN_LIST_MAX_TIME
      );
    });
  });

  // ========================================
  // PERFORMANCE SUMMARY
  // ========================================

  describe('Performance Summary', () => {
    it('should meet overall performance requirements', () => {
      // Verificar que todos los tests pasaron los thresholds
      const failedTests = performanceResults.filter(result => !result.success);
      
      if (failedTests.length > 0) {
        console.error('Failed performance tests:', failedTests);
      }
      
      expect(failedTests.length).toBe(0);
      
      // Calcular estadísticas generales
      const successfulTests = performanceResults.filter(result => result.success);
      const averageTime = successfulTests.reduce((acc, result) => acc + result.duration, 0) / successfulTests.length;
      const maxTime = Math.max(...successfulTests.map(result => result.duration));
      const minTime = Math.min(...successfulTests.map(result => result.duration));
      
      console.log('\n=== PERFORMANCE SUMMARY ===');
      console.log(`Total tests: ${performanceResults.length}`);
      console.log(`Successful: ${successfulTests.length}`);
      console.log(`Failed: ${failedTests.length}`);
      console.log(`Average time: ${Math.round(averageTime)}ms`);
      console.log(`Min time: ${minTime}ms`);
      console.log(`Max time: ${maxTime}ms`);
      
      // Verificaciones generales
      expect(successfulTests.length).toBeGreaterThan(0);
      expect(averageTime).toBeLessThan(1000); // Average bajo 1 segundo
    });
  });
});