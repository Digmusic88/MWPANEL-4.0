import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DecreeLoaderService } from '../decree-loader.service';
import { Cycle } from '../../../students/entities/cycle.entity';
import { Course } from '../../../students/entities/course.entity';

describe('DecreeLoaderService', () => {
  const build = async (repos: any) => {
    const mod = await Test.createTestingModule({
      providers: [
        DecreeLoaderService,
        { provide: getRepositoryToken(Cycle), useValue: repos.cycle },
        { provide: getRepositoryToken(Course), useValue: repos.course },
      ],
    }).compile();
    return mod.get(DecreeLoaderService);
  };

  it('resuelve un ámbito de tipo course → Primaria via course→cycle→level', async () => {
    const repos = {
      course: { findOne: jest.fn().mockResolvedValue({ id: 'c1', name: '3º Primaria', cycle: { id: 'cy1', name: 'Segundo Ciclo', educationalLevelId: '22222222-2222-2222-2222-222222222222', educationalLevel: { id: '22222222-2222-2222-2222-222222222222', name: 'Educación Primaria' } } }) },
      cycle: { findOne: jest.fn() },
    };
    const svc = await build(repos);
    const r = await svc.resolveScope('course', 'c1');
    expect(r.decreeKey).toBe('primaria');
    expect(r.educationalLevelId).toBe('22222222-2222-2222-2222-222222222222');
    expect(r.scopeLabel).toBe('3º Primaria');
  });

  it('getDecreeText devuelve texto no vacío para cada clave', async () => {
    const svc = await build({ course: { findOne: jest.fn() }, cycle: { findOne: jest.fn() } });
    expect(svc.getDecreeText('primaria').length).toBeGreaterThan(1000);
  });
});
