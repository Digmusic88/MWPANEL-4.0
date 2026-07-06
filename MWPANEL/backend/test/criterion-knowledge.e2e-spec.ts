import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CriterionKnowledge (e2e) - guards', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('GET /api/criterion-knowledge/map sin token → 401', () => {
    return request(app.getHttpServer())
      .get('/api/criterion-knowledge/map?subjectName=X&scopeType=cycle&scopeId=00000000-0000-0000-0000-000000000000')
      .expect(401);
  });

  it('POST /api/criterion-knowledge sin token → 401', () => {
    return request(app.getHttpServer())
      .post('/api/criterion-knowledge')
      .send({ evaluationCriterionId: '00000000-0000-0000-0000-000000000000', basicKnowledgeId: '00000000-0000-0000-0000-000000000000' })
      .expect(401);
  });
});
