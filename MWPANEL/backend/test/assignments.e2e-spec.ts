/**
 * @archivo: assignments.e2e-spec.ts
 * @módulo: Assignments - E2E Tests
 * @función: Tests end-to-end completos del sistema de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Suite completa de tests E2E que valida todo el flujo del sistema
 * de asignaciones desde la API hasta la base de datos.
 * 
 * FUNCIONALIDADES TESTADAS:
 * - Gestión completa de campañas (CRUD)
 * - Sistema de progreso y tracking
 * - Permisos y autorización
 * - Rate limiting y seguridad
 * - Analytics y reportes
 * - Operaciones masivas
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.6
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

// Módulos y entidades
import { AssignmentsModule } from '../src/modules/assignments/assignments.module';
import { UsersModule } from '../src/modules/users/users.module';
import { EducationalResourcesModule } from '../src/modules/educational-resources/educational-resources.module';
import { AssignmentCampaign } from '../src/modules/assignments/entities/assignment-campaign.entity';
import { AssignmentProgress } from '../src/modules/assignments/entities/assignment-progress.entity';
import { User, UserRole } from '../src/modules/users/entities/user.entity';

// DTOs y tipos
import {
  CampaignType,
  CampaignStatus,
} from '../src/modules/assignments/entities/assignment-campaign.entity';
import {
  TargetType,
} from '../src/modules/assignments/entities/campaign-target.entity';
import {
  ProgressStatus,
} from '../src/modules/assignments/entities/assignment-progress.entity';

/**
 * Configuración de test database
 */
const testDbConfig = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'mwpanel',
  password: process.env.DB_PASSWORD || 'mwpanel123',
  database: process.env.DB_NAME_TEST || 'mwpanel_test',
  synchronize: true,
  dropSchema: true,
  entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
};

describe('Assignments System E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  
  // Tokens de autenticación para diferentes roles
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let familyToken: string;
  
  // IDs de recursos de test
  let adminUserId: string;
  let teacherUserId: string;
  let studentUserId: string;
  let familyUserId: string;
  let campaignId: string;
  let resourceId: string;
  let classId: string;

  beforeAll(async () => {
    // Configurar módulo de testing
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),
        AssignmentsModule,
        UsersModule,
        EducationalResourcesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    dataSource = app.get(DataSource);
    jwtService = app.get(JwtService);
    
    // Crear usuarios de test y generar tokens
    await setupTestUsers();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar datos de test antes de cada prueba
    await cleanupTestData();
  });

  // ========================================
  // SETUP Y HELPERS
  // ========================================

  async function setupTestUsers() {
    // Crear usuarios de test para cada rol
    const users = [
      {
        email: 'admin.test@mwpanel.com',
        passwordHash: 'password123',
        firstName: 'Admin',
        lastName: 'Test',
        role: UserRole.ADMIN,
      },
      {
        email: 'teacher.test@mwpanel.com',
        passwordHash: 'password123',
        firstName: 'Teacher',
        lastName: 'Test',
        role: UserRole.TEACHER,
      },
      {
        email: 'student.test@mwpanel.com',
        passwordHash: 'password123',
        firstName: 'Student',
        lastName: 'Test',
        role: UserRole.STUDENT,
      },
      {
        email: 'family.test@mwpanel.com',
        passwordHash: 'password123',
        firstName: 'Family',
        lastName: 'Test',
        role: UserRole.FAMILY,
      },
    ];

    const userRepository = dataSource.getRepository(User);
    
    for (const userData of users) {
      const user = userRepository.create(userData);
      const savedUser = await userRepository.save(user);
      
      // Generar JWT token
      const payload = { 
        userId: savedUser.id, 
        email: savedUser.email, 
        role: savedUser.role 
      };
      const token = jwtService.sign(payload);
      
      // Asignar tokens por rol
      switch (savedUser.role) {
        case UserRole.ADMIN:
          adminUserId = savedUser.id;
          adminToken = token;
          break;
        case UserRole.TEACHER:
          teacherUserId = savedUser.id;
          teacherToken = token;
          break;
        case UserRole.STUDENT:
          studentUserId = savedUser.id;
          studentToken = token;
          break;
        case UserRole.FAMILY:
          familyUserId = savedUser.id;
          familyToken = token;
          break;
      }
    }
    
    // Crear recursos de test adicionales
    await setupTestResources();
  }

  async function setupTestResources() {
    // Aquí crearemos recursos educativos, clases, etc. de test
    // Por ahora usamos IDs ficticios
    resourceId = '01234567-89ab-cdef-0123-456789abcde1';
    classId = '11111111-1111-1111-1111-111111111111';
  }

  async function cleanupTestData() {
    // Limpiar datos de campaigns y progress
    const campaignRepository = dataSource.getRepository(AssignmentCampaign);
    const progressRepository = dataSource.getRepository(AssignmentProgress);
    
    await progressRepository.delete({});
    await campaignRepository.delete({});
  }

  function createCampaignDto(overrides = {}) {
    return {
      title: 'Test Campaign',
      description: 'Campaign for E2E testing',
      type: CampaignType.SINGLE,
      status: CampaignStatus.DRAFT,
      resources: [
        {
          resourceId,
          required: true,
          estimatedTime: 30,
          difficultyAdjustment: 0,
        },
      ],
      targets: [
        {
          targetType: TargetType.CLASS,
          targetId: classId,
          metadata: {},
        },
      ],
      configuration: {
        allowLateSubmission: true,
        requireCompletion: false,
        enableNotifications: true,
        trackProgress: true,
      },
      ...overrides,
    };
  }

  // ========================================
  // TESTS DE CAMPAIGNS CRUD
  // ========================================

  describe('/assignments/campaigns (POST)', () => {
    it('should create campaign as admin', async () => {
      const campaignDto = createCampaignDto();

      const response = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(campaignDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        title: campaignDto.title,
        description: campaignDto.description,
        type: CampaignType.SINGLE,
        status: CampaignStatus.DRAFT,
      });

      campaignId = response.body.id;
    });

    it('should create campaign as teacher', async () => {
      const campaignDto = createCampaignDto();

      await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(campaignDto)
        .expect(201);
    });

    it('should deny campaign creation for student', async () => {
      const campaignDto = createCampaignDto();

      await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(campaignDto)
        .expect(403);
    });

    it('should deny campaign creation for family', async () => {
      const campaignDto = createCampaignDto();

      await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${familyToken}`)
        .send(campaignDto)
        .expect(403);
    });

    it('should validate campaign data', async () => {
      const invalidCampaignDto = {
        title: '', // Título vacío inválido
        description: 'A'.repeat(1001), // Descripción muy larga
        type: 'INVALID_TYPE',
        resources: [], // Sin recursos
      };

      await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCampaignDto)
        .expect(400);
    });
  });

  describe('/assignments/campaigns (GET)', () => {
    beforeEach(async () => {
      // Crear campaign para tests
      const campaignDto = createCampaignDto();
      const response = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(campaignDto);
      
      campaignId = response.body.id;
    });

    it('should list campaigns for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        pagination: {
          totalItems: expect.any(Number),
          totalPages: expect.any(Number),
          currentPage: expect.any(Number),
          itemsPerPage: expect.any(Number),
        },
      });

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter campaigns by status', async () => {
      await request(app.getHttpServer())
        .get('/assignments/campaigns?status=DRAFT')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should support pagination', async () => {
      await request(app.getHttpServer())
        .get('/assignments/campaigns?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('/assignments/campaigns/:id (GET)', () => {
    beforeEach(async () => {
      const campaignDto = createCampaignDto();
      const response = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(campaignDto);
      
      campaignId = response.body.id;
    });

    it('should get campaign details for owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assignments/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: campaignId,
        title: expect.any(String),
        description: expect.any(String),
        resources: expect.any(Array),
        targets: expect.any(Array),
      });
    });

    it('should deny access to non-owner', async () => {
      await request(app.getHttpServer())
        .get(`/assignments/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('/assignments/campaigns/:id (PATCH)', () => {
    beforeEach(async () => {
      const campaignDto = createCampaignDto();
      const response = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(campaignDto);
      
      campaignId = response.body.id;
    });

    it('should update campaign as owner', async () => {
      const updateDto = {
        title: 'Updated Campaign Title',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/assignments/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.title).toBe(updateDto.title);
      expect(response.body.description).toBe(updateDto.description);
    });

    it('should deny update to non-owner', async () => {
      const updateDto = { title: 'Unauthorized Update' };

      await request(app.getHttpServer())
        .patch(`/assignments/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('/assignments/campaigns/:id (DELETE)', () => {
    beforeEach(async () => {
      const campaignDto = createCampaignDto();
      const response = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(campaignDto);
      
      campaignId = response.body.id;
    });

    it('should delete campaign as owner', async () => {
      await request(app.getHttpServer())
        .delete(`/assignments/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verificar que fue eliminado
      await request(app.getHttpServer())
        .get(`/assignments/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should deny deletion to non-owner', async () => {
      await request(app.getHttpServer())
        .delete(`/assignments/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  // ========================================
  // TESTS DE PROGRESS TRACKING
  // ========================================

  describe('/assignments/progress', () => {
    beforeEach(async () => {
      // Crear campaign y activarla
      const campaignDto = createCampaignDto({
        status: CampaignStatus.ACTIVE,
      });
      
      const response = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(campaignDto);
      
      campaignId = response.body.id;
    });

    it('should record activity for student', async () => {
      const activityDto = {
        campaignId,
        resourceId,
        activityType: 'VIEW',
        timeSpent: 300, // 5 minutos
        metadata: {
          device: 'desktop',
          browser: 'chrome',
        },
      };

      await request(app.getHttpServer())
        .post('/assignments/progress/activity')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(activityDto)
        .expect(201);
    });

    it('should get progress dashboard for student', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assignments/progress/dashboard/${studentUserId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: studentUserId,
        activeCampaigns: expect.any(Number),
        completedCampaigns: expect.any(Number),
        totalProgress: expect.any(Number),
        recentActivities: expect.any(Array),
      });
    });

    it('should mark resource as complete', async () => {
      const completionDto = {
        campaignId,
        resourceId,
        timeSpent: 1800, // 30 minutos
        completedAt: new Date().toISOString(),
        feedback: 'Great resource!',
      };

      const response = await request(app.getHttpServer())
        .patch(`/assignments/progress/complete`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(completionDto)
        .expect(200);

      expect(response.body.status).toBe(ProgressStatus.COMPLETED);
    });
  });

  // ========================================
  // TESTS DE ANALYTICS Y REPORTES
  // ========================================

  describe('/assignments/analytics', () => {
    it('should get basic analytics for teacher', async () => {
      const response = await request(app.getHttpServer())
        .get('/assignments/analytics/overview')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalCampaigns: expect.any(Number),
        activeCampaigns: expect.any(Number),
        completionRate: expect.any(Number),
        averageProgress: expect.any(Number),
      });
    });

    it('should deny analytics access to student', async () => {
      await request(app.getHttpServer())
        .get('/assignments/analytics/overview')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should get detailed analytics for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/assignments/analytics/detailed')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('engagementMetrics');
      expect(response.body).toHaveProperty('performanceMetrics');
      expect(response.body).toHaveProperty('usageStatistics');
    });
  });

  // ========================================
  // TESTS DE RATE LIMITING
  // ========================================

  describe('Rate Limiting', () => {
    it('should apply rate limits to student endpoints', async () => {
      const activityDto = {
        campaignId: 'test-campaign-id',
        resourceId: 'test-resource-id',
        activityType: 'VIEW',
        timeSpent: 60,
      };

      // Hacer múltiples requests rápidamente
      const requests = Array(15).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/assignments/progress/activity')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(activityDto)
      );

      const responses = await Promise.allSettled(requests);
      
      // Algunos requests deberían ser bloqueados por rate limiting
      const rejectedRequests = responses.filter(
        result => result.status === 'fulfilled' && 
        (result.value as any).status === 429
      );

      expect(rejectedRequests.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/assignments/campaigns')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  // ========================================
  // TESTS DE OPERACIONES MASIVAS
  // ========================================

  describe('Bulk Operations', () => {
    let campaignIds: string[];

    beforeEach(async () => {
      // Crear múltiples campaigns para operaciones masivas
      const createPromises = Array(3).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(createCampaignDto())
      );

      const responses = await Promise.all(createPromises);
      campaignIds = responses.map(res => res.body.id);
    });

    it('should perform bulk status update as admin', async () => {
      const bulkUpdateDto = {
        ids: campaignIds,
        operation: 'updateStatus',
        params: { status: CampaignStatus.ACTIVE },
      };

      const response = await request(app.getHttpServer())
        .patch('/assignments/campaigns/bulk-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkUpdateDto)
        .expect(200);

      expect(response.body.updated).toBe(campaignIds.length);
    });

    it('should deny bulk operations to non-admin', async () => {
      const bulkUpdateDto = {
        ids: campaignIds,
        operation: 'updateStatus',
        params: { status: CampaignStatus.CANCELLED },
      };

      await request(app.getHttpServer())
        .patch('/assignments/campaigns/bulk-update')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(bulkUpdateDto)
        .expect(403);
    });
  });

  // ========================================
  // TESTS DE VALIDACIÓN Y ERRORES
  // ========================================

  describe('Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/assignments/campaigns')
        .expect(401);
    });

    it('should return 404 for non-existent campaigns', async () => {
      const fakeId = '99999999-9999-9999-9999-999999999999';
      
      await request(app.getHttpServer())
        .get(`/assignments/campaigns/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/assignments/campaigns/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should handle database constraint violations', async () => {
      const invalidCampaignDto = createCampaignDto({
        resources: [
          {
            resourceId: '99999999-9999-9999-9999-999999999999', // Non-existent resource
            required: true,
          },
        ],
      });

      await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCampaignDto)
        .expect(400);
    });
  });

  // ========================================
  // TESTS DE INTEGRACIÓN COMPLETA
  // ========================================

  describe('Complete Workflow Integration', () => {
    it('should complete full assignment workflow', async () => {
      // 1. Crear campaña como admin
      const createResponse = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createCampaignDto())
        .expect(201);

      const createdCampaignId = createResponse.body.id;

      // 2. Activar campaña
      await request(app.getHttpServer())
        .patch(`/assignments/campaigns/${createdCampaignId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 3. Estudiante ve la campaña
      const progressResponse = await request(app.getHttpServer())
        .get(`/assignments/progress/dashboard/${studentUserId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(progressResponse.body.activeCampaigns).toBeGreaterThan(0);

      // 4. Estudiante registra actividad
      await request(app.getHttpServer())
        .post('/assignments/progress/activity')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          campaignId: createdCampaignId,
          resourceId,
          activityType: 'VIEW',
          timeSpent: 600,
        })
        .expect(201);

      // 5. Estudiante completa recurso
      await request(app.getHttpServer())
        .patch('/assignments/progress/complete')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          campaignId: createdCampaignId,
          resourceId,
          timeSpent: 1800,
          completedAt: new Date().toISOString(),
        })
        .expect(200);

      // 6. Admin ve analytics actualizados
      const analyticsResponse = await request(app.getHttpServer())
        .get('/assignments/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(analyticsResponse.body.totalCampaigns).toBeGreaterThan(0);
      expect(analyticsResponse.body.completionRate).toBeGreaterThan(0);
    });
  });
});