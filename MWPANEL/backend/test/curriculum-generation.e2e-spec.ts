import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CurriculumGeneration (e2e) - guards', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('POST /api/curriculum-generation/generate sin token → 401', () => {
    return request(app.getHttpServer())
      .post('/api/curriculum-generation/generate')
      .send({ subjectName: 'Matemáticas', scopeType: 'cycle', scopeId: '00000000-0000-0000-0000-000000000000' })
      .expect(401);
  });

  it('POST /api/curriculum-generation/:id/apply sin token → 401', () => {
    return request(app.getHttpServer())
      .post('/api/curriculum-generation/00000000-0000-0000-0000-000000000000/apply')
      .expect(401);
  });
});
