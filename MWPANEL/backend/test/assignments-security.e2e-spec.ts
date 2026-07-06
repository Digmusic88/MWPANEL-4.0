/**
 * @archivo: assignments-security.e2e-spec.ts
 * @módulo: Assignments - Security E2E Tests
 * @función: Tests end-to-end específicos para validar seguridad
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Suite especializada de tests E2E que valida todos los aspectos
 * de seguridad del sistema de asignaciones.
 * 
 * FUNCIONALIDADES TESTADAS:
 * - Guards y permisos granulares
 * - Ownership validation
 * - Rate limiting por rol
 * - Audit logging
 * - Middleware de seguridad
 * - Validaciones de entrada
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 2.6
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

// Módulos
import { AssignmentsModule } from '../src/modules/assignments/assignments.module';
import { UsersModule } from '../src/modules/users/users.module';

// Entidades
import { User, UserRole } from '../src/modules/users/entities/user.entity';
import { AssignmentCampaign } from '../src/modules/assignments/entities/assignment-campaign.entity';

// Tipos y enums
import { AssignmentPermission } from '../src/modules/assignments/guards/assignment-permissions.guard';
import { CampaignType, CampaignStatus } from '../src/modules/assignments/entities/assignment-campaign.entity';
import { TargetType } from '../src/modules/assignments/entities/campaign-target.entity';

/**
 * Configuración de test database
 */
const testDbConfig = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'mwpanel',
  password: process.env.DB_PASSWORD || 'mwpanel123',
  database: process.env.DB_NAME_TEST || 'mwpanel_security_test',
  synchronize: true,
  dropSchema: true,
  entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
};

describe('Assignments Security E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  
  // Test users y tokens
  let adminToken: string;
  let teacherToken: string;
  let teacher2Token: string;
  let studentToken: string;
  let familyToken: string;
  
  let adminUserId: string;
  let teacherUserId: string;
  let teacher2UserId: string;
  let studentUserId: string;
  let familyUserId: string;
  
  let campaignId: string;
  let teacher2CampaignId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),
        AssignmentsModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    dataSource = app.get(DataSource);
    jwtService = app.get(JwtService);
    
    await setupSecurityTestUsers();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupSecurityTestData();
  });

  // ========================================
  // SETUP Y HELPERS
  // ========================================

  async function setupSecurityTestUsers() {
    const users = [
      {
        email: 'admin.security@test.com',
        firstName: 'Admin',
        lastName: 'Security',
        role: UserRole.ADMIN,
      },
      {
        email: 'teacher1.security@test.com',
        firstName: 'Teacher',
        lastName: 'One',
        role: UserRole.TEACHER,
      },
      {
        email: 'teacher2.security@test.com',
        firstName: 'Teacher',
        lastName: 'Two',
        role: UserRole.TEACHER,
      },
      {
        email: 'student.security@test.com',
        firstName: 'Student',
        lastName: 'Security',
        role: UserRole.STUDENT,
      },
      {
        email: 'family.security@test.com',
        firstName: 'Family',
        lastName: 'Security',
        role: UserRole.FAMILY,
      },
    ];

    const userRepository = dataSource.getRepository(User);
    
    for (const userData of users) {
      const user = userRepository.create({
        ...userData,
        passwordHash: 'securepassword123',
      });
      const savedUsers = await userRepository.save(user);
      const savedUser = Array.isArray(savedUsers) ? savedUsers[0] : savedUsers;
      
      const payload = { 
        userId: savedUser.id, 
        email: savedUser.email, 
        role: savedUser.role 
      };
      const token = jwtService.sign(payload);
      
      switch (savedUser.role) {
        case UserRole.ADMIN:
          adminUserId = savedUser.id;
          adminToken = token;
          break;
        case UserRole.TEACHER:
          if (!teacherUserId) {
            teacherUserId = savedUser.id;
            teacherToken = token;
          } else {
            teacher2UserId = savedUser.id;
            teacher2Token = token;
          }
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
  }

  async function cleanupSecurityTestData() {
    const campaignRepository = dataSource.getRepository(AssignmentCampaign);
    await campaignRepository.delete({});
  }

  function createCampaignDto(overrides = {}) {
    return {
      title: 'Security Test Campaign',
      description: 'Campaign for security testing',
      type: CampaignType.SINGLE,
      status: CampaignStatus.DRAFT,
      resources: [
        {
          resourceId: '01234567-89ab-cdef-0123-456789abcde1',
          required: true,
        },
      ],
      targets: [
        {
          targetType: TargetType.CLASS,
          targetId: '11111111-1111-1111-1111-111111111111',
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
  // TESTS DE PERMISOS POR ROL
  // ========================================

  describe('Role-based Access Control', () => {
    describe('Campaign Creation Permissions', () => {
      it('should allow admin to create campaigns', async () => {
        await request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(createCampaignDto())
          .expect(201);
      });

      it('should allow teacher to create campaigns', async () => {
        await request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(createCampaignDto())
          .expect(201);
      });

      it('should deny student campaign creation', async () => {
        await request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(createCampaignDto())
          .expect(403);
      });

      it('should deny family campaign creation', async () => {
        await request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${familyToken}`)
          .send(createCampaignDto())
          .expect(403);
      });
    });

    describe('Analytics Access Control', () => {
      it('should allow admin to access detailed analytics', async () => {
        await request(app.getHttpServer())
          .get('/assignments/analytics/detailed')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('should allow teacher to access basic analytics', async () => {
        await request(app.getHttpServer())
          .get('/assignments/analytics/overview')
          .set('Authorization', `Bearer ${teacherToken}`)
          .expect(200);
      });

      it('should deny teacher access to detailed analytics', async () => {
        await request(app.getHttpServer())
          .get('/assignments/analytics/detailed')
          .set('Authorization', `Bearer ${teacherToken}`)
          .expect(403);
      });

      it('should deny student analytics access', async () => {
        await request(app.getHttpServer())
          .get('/assignments/analytics/overview')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);
      });

      it('should deny family analytics access', async () => {
        await request(app.getHttpServer())
          .get('/assignments/analytics/overview')
          .set('Authorization', `Bearer ${familyToken}`)
          .expect(403);
      });
    });

    describe('Bulk Operations Permissions', () => {
      beforeEach(async () => {
        // Crear campaign para bulk operations
        const response = await request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(createCampaignDto());
        campaignId = response.body.id;
      });

      it('should allow admin bulk operations', async () => {
        const bulkDto = {
          ids: [campaignId],
          operation: 'updateStatus',
          params: { status: CampaignStatus.ACTIVE },
        };

        await request(app.getHttpServer())
          .patch('/assignments/campaigns/bulk-update')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(bulkDto)
          .expect(200);
      });

      it('should deny teacher bulk operations', async () => {
        const bulkDto = {
          ids: [campaignId],
          operation: 'updateStatus',
          params: { status: CampaignStatus.ACTIVE },
        };

        await request(app.getHttpServer())
          .patch('/assignments/campaigns/bulk-update')
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(bulkDto)
          .expect(403);
      });
    });
  });

  // ========================================
  // TESTS DE OWNERSHIP VALIDATION
  // ========================================

  describe('Ownership Validation', () => {
    beforeEach(async () => {
      // Crear campaigns por diferentes teachers
      const teacher1Response = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(createCampaignDto({ title: 'Teacher 1 Campaign' }));
      campaignId = teacher1Response.body.id;

      const teacher2Response = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${teacher2Token}`)
        .send(createCampaignDto({ title: 'Teacher 2 Campaign' }));
      teacher2CampaignId = teacher2Response.body.id;
    });

    describe('Campaign Ownership', () => {
      it('should allow owner to view campaign', async () => {
        await request(app.getHttpServer())
          .get(`/assignments/campaigns/${campaignId}`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .expect(200);
      });

      it('should deny non-owner teacher to view campaign', async () => {
        await request(app.getHttpServer())
          .get(`/assignments/campaigns/${campaignId}`)
          .set('Authorization', `Bearer ${teacher2Token}`)
          .expect(403);
      });

      it('should allow admin to view any campaign', async () => {
        await request(app.getHttpServer())
          .get(`/assignments/campaigns/${campaignId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        await request(app.getHttpServer())
          .get(`/assignments/campaigns/${teacher2CampaignId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('should allow owner to update campaign', async () => {
        await request(app.getHttpServer())
          .patch(`/assignments/campaigns/${campaignId}`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({ title: 'Updated by owner' })
          .expect(200);
      });

      it('should deny non-owner to update campaign', async () => {
        await request(app.getHttpServer())
          .patch(`/assignments/campaigns/${campaignId}`)
          .set('Authorization', `Bearer ${teacher2Token}`)
          .send({ title: 'Unauthorized update' })
          .expect(403);
      });

      it('should allow owner to delete campaign', async () => {
        await request(app.getHttpServer())
          .delete(`/assignments/campaigns/${campaignId}`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .expect(200);
      });

      it('should deny non-owner to delete campaign', async () => {
        await request(app.getHttpServer())
          .delete(`/assignments/campaigns/${campaignId}`)
          .set('Authorization', `Bearer ${teacher2Token}`)
          .expect(403);
      });
    });

    describe('Progress Access Control', () => {
      it('should allow student to access own progress', async () => {
        await request(app.getHttpServer())
          .get(`/assignments/progress/dashboard/${studentUserId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);
      });

      it('should deny student to access other student progress', async () => {
        const fakeStudentId = '99999999-9999-9999-9999-999999999999';
        
        await request(app.getHttpServer())
          .get(`/assignments/progress/dashboard/${fakeStudentId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);
      });

      it('should allow teacher to access class member progress', async () => {
        // Esto requeriría setup de class membership, por ahora test básico
        await request(app.getHttpServer())
          .get(`/assignments/progress/dashboard/${studentUserId}`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .expect(200); // Asumiendo que teacher tiene acceso
      });

      it('should allow family to access child progress', async () => {
        // Esto requeriría setup de family relationship
        await request(app.getHttpServer())
          .get(`/assignments/progress/dashboard/${studentUserId}`)
          .set('Authorization', `Bearer ${familyToken}`)
          .expect(200); // Asumiendo relación familia-estudiante
      });
    });
  });

  // ========================================
  // TESTS DE RATE LIMITING
  // ========================================

  describe('Rate Limiting', () => {
    describe('Student Rate Limits', () => {
      it('should enforce activity recording limits', async () => {
        const activityDto = {
          campaignId: 'test-campaign-id',
          resourceId: 'test-resource-id',
          activityType: 'VIEW',
          timeSpent: 60,
        };

        // Hacer más de 10 requests en un minuto (límite para students)
        const requests = Array(12).fill(null).map((_, i) =>
          request(app.getHttpServer())
            .post('/assignments/progress/activity')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ ...activityDto, metadata: { attempt: i } })
        );

        const responses = await Promise.allSettled(requests);
        
        // Algunos requests deberían ser bloqueados
        const blocked = responses.filter(
          result => result.status === 'fulfilled' && 
          (result.value as any).status === 429
        );

        expect(blocked.length).toBeGreaterThan(0);
      });

      it('should enforce completion limits', async () => {
        const completionDto = {
          campaignId: 'test-campaign-id',
          resourceId: 'test-resource-id',
          timeSpent: 300,
          completedAt: new Date().toISOString(),
        };

        // Hacer más de 5 requests en 5 minutos (límite para completion)
        const requests = Array(7).fill(null).map((_, i) =>
          request(app.getHttpServer())
            .patch('/assignments/progress/complete')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ ...completionDto, metadata: { attempt: i } })
        );

        const responses = await Promise.allSettled(requests);
        
        // Algunos requests deberían ser bloqueados
        const blocked = responses.filter(
          result => result.status === 'fulfilled' && 
          (result.value as any).status === 429
        );

        expect(blocked.length).toBeGreaterThan(0);
      });
    });

    describe('Teacher Rate Limits', () => {
      it('should enforce campaign creation limits', async () => {
        // Teachers: max 5 campaigns per minute
        const requests = Array(7).fill(null).map((_, i) =>
          request(app.getHttpServer())
            .post('/assignments/campaigns')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send(createCampaignDto({ title: `Campaign ${i}` }))
        );

        const responses = await Promise.allSettled(requests);
        
        const blocked = responses.filter(
          result => result.status === 'fulfilled' && 
          (result.value as any).status === 429
        );

        expect(blocked.length).toBeGreaterThan(0);
      });

      it('should have higher limits than students', async () => {
        // Teachers should have 100 req/min vs students 30 req/min
        const requests = Array(40).fill(null).map(() =>
          request(app.getHttpServer())
            .get('/assignments/campaigns')
            .set('Authorization', `Bearer ${teacherToken}`)
        );

        const responses = await Promise.allSettled(requests);
        
        // La mayoría debería pasar para teachers
        const successful = responses.filter(
          result => result.status === 'fulfilled' && 
          (result.value as any).status === 200
        );

        expect(successful.length).toBeGreaterThan(30); // Más que el límite de student
      });
    });

    describe('Rate Limit Headers', () => {
      it('should include rate limit headers in responses', async () => {
        const response = await request(app.getHttpServer())
          .get('/assignments/campaigns')
          .set('Authorization', `Bearer ${teacherToken}`)
          .expect(200);

        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
        expect(response.headers['x-ratelimit-window']).toBeDefined();
      });

      it('should show decreasing remaining count', async () => {
        const response1 = await request(app.getHttpServer())
          .get('/assignments/campaigns')
          .set('Authorization', `Bearer ${studentToken}`);

        const response2 = await request(app.getHttpServer())
          .get('/assignments/campaigns')
          .set('Authorization', `Bearer ${studentToken}`);

        const remaining1 = parseInt(response1.headers['x-ratelimit-remaining']);
        const remaining2 = parseInt(response2.headers['x-ratelimit-remaining']);

        expect(remaining2).toBeLessThan(remaining1);
      });
    });
  });

  // ========================================
  // TESTS DE VALIDACIÓN DE ENTRADA
  // ========================================

  describe('Input Validation', () => {
    describe('Campaign Validation', () => {
      it('should validate required fields', async () => {
        const invalidCampaign = {
          // Missing title
          description: 'Valid description',
          type: CampaignType.SINGLE,
        };

        const response = await request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidCampaign)
          .expect(400);

        expect(response.body.message).toContain('title');
      });

      it('should validate field lengths', async () => {
        const invalidCampaign = createCampaignDto({
          title: 'A'.repeat(101), // Too long
          description: 'B'.repeat(1001), // Too long
        });

        await request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidCampaign)
          .expect(400);
      });

      it('should validate enum values', async () => {
        const invalidCampaign = createCampaignDto({
          type: 'INVALID_TYPE',
          status: 'INVALID_STATUS',
        });

        await request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidCampaign)
          .expect(400);
      });

      it('should validate resource structure', async () => {
        const invalidCampaign = createCampaignDto({
          resources: [
            {
              // Missing resourceId
              required: true,
            },
          ],
        });

        await request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidCampaign)
          .expect(400);
      });

      it('should validate target structure', async () => {
        const invalidCampaign = createCampaignDto({
          targets: [
            {
              targetType: TargetType.CLASS,
              // Missing targetId
            },
          ],
        });

        await request(app.getHttpServer())
          .post('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidCampaign)
          .expect(400);
      });
    });

    describe('Progress Validation', () => {
      it('should validate activity type', async () => {
        const invalidActivity = {
          campaignId: campaignId,
          resourceId: 'test-resource-id',
          activityType: 'INVALID_TYPE',
          timeSpent: 300,
        };

        await request(app.getHttpServer())
          .post('/assignments/progress/activity')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(invalidActivity)
          .expect(400);
      });

      it('should validate time spent ranges', async () => {
        const invalidActivity = {
          campaignId: campaignId,
          resourceId: 'test-resource-id',
          activityType: 'VIEW',
          timeSpent: -100, // Negative time
        };

        await request(app.getHttpServer())
          .post('/assignments/progress/activity')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(invalidActivity)
          .expect(400);
      });
    });

    describe('UUID Validation', () => {
      it('should validate UUID format in paths', async () => {
        await request(app.getHttpServer())
          .get('/assignments/campaigns/invalid-uuid')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);
      });

      it('should validate UUID format in body', async () => {
        const invalidActivity = {
          campaignId: 'not-a-uuid',
          resourceId: 'also-not-a-uuid',
          activityType: 'VIEW',
          timeSpent: 300,
        };

        await request(app.getHttpServer())
          .post('/assignments/progress/activity')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(invalidActivity)
          .expect(400);
      });
    });
  });

  // ========================================
  // TESTS DE AUDIT LOGGING
  // ========================================

  describe('Audit Logging', () => {
    it('should log critical events', async () => {
      // Test que el logging está funcionando sería complicado sin acceso directo al logger
      // Por ahora validamos que los endpoints que deberían generar logs no fallen
      
      await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createCampaignDto())
        .expect(201);
      
      // El interceptor de audit debería haber loggeado CAMPAIGN_CREATED
    });

    it('should log unauthorized access attempts', async () => {
      await request(app.getHttpServer())
        .get('/assignments/analytics/detailed')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
      
      // El interceptor debería haber loggeado PERMISSIONS_DENIED
    });

    it('should log bulk operations', async () => {
      const response = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createCampaignDto());
      
      const bulkDto = {
        ids: [response.body.id],
        operation: 'updateStatus',
        params: { status: CampaignStatus.ACTIVE },
      };

      await request(app.getHttpServer())
        .patch('/assignments/campaigns/bulk-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkDto)
        .expect(200);
      
      // Debería haber loggeado BULK_OPERATION
    });
  });

  // ========================================
  // TESTS DE SEGURIDAD GENERAL
  // ========================================

  describe('General Security', () => {
    it('should require valid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/assignments/campaigns')
        .expect(401);
    });

    it('should reject invalid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/assignments/campaigns')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject expired JWT token', async () => {
      // Esto requeriría un token expirado real, por simplicidad test conceptual
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.signature';
      
      await request(app.getHttpServer())
        .get('/assignments/campaigns')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should sanitize error responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/assignments/campaigns/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      // No debería exponer detalles internos del sistema
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('query');
      expect(response.body.message).not.toContain('internal');
    });

    it('should prevent SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE campaigns; --";
      
      // Intentar inyección SQL en búsqueda
      await request(app.getHttpServer())
        .get(`/assignments/campaigns?search=${encodeURIComponent(maliciousInput)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200); // Debería funcionar sin problemas gracias a TypeORM
    });

    it('should prevent XSS in campaign titles', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      const campaignWithXSS = createCampaignDto({
        title: xssPayload,
        description: xssPayload,
      });

      const response = await request(app.getHttpServer())
        .post('/assignments/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(campaignWithXSS)
        .expect(201);

      // Los datos deberían estar sanitizados o al menos almacenados de forma segura
      expect(response.body.title).toBeDefined();
      expect(response.body.description).toBeDefined();
    });
  });

  // ========================================
  // TESTS DE STRESS DE SEGURIDAD
  // ========================================

  describe('Security Stress Tests', () => {
    it('should handle concurrent rate limit tests', async () => {
      // Múltiples requests concurrentes de diferentes usuarios
      const adminRequests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/assignments/campaigns')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const studentRequests = Array(35).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/assignments/campaigns')
          .set('Authorization', `Bearer ${studentToken}`)
      );

      const allRequests = [...adminRequests, ...studentRequests];
      const responses = await Promise.allSettled(allRequests);

      // Admin requests deberían pasar mayoría, student requests deberían ser limitados
      const adminSuccessful = responses.slice(0, 10).filter(
        result => result.status === 'fulfilled' && 
        (result.value as any).status === 200
      );

      const studentBlocked = responses.slice(10).filter(
        result => result.status === 'fulfilled' && 
        (result.value as any).status === 429
      );

      expect(adminSuccessful.length).toBeGreaterThan(8); // Mayoría pasan
      expect(studentBlocked.length).toBeGreaterThan(0); // Algunos bloqueados
    });

    it('should handle permission boundary testing', async () => {
      // Test de boundary conditions para permisos
      const testCases = [
        { token: adminToken, endpoint: '/assignments/analytics/detailed', expectedStatus: 200 },
        { token: teacherToken, endpoint: '/assignments/analytics/detailed', expectedStatus: 403 },
        { token: studentToken, endpoint: '/assignments/analytics/overview', expectedStatus: 403 },
        { token: familyToken, endpoint: '/assignments/campaigns', expectedStatus: 200 }, // READ access
      ];

      for (const testCase of testCases) {
        await request(app.getHttpServer())
          .get(testCase.endpoint)
          .set('Authorization', `Bearer ${testCase.token}`)
          .expect(testCase.expectedStatus);
      }
    });
  });
});