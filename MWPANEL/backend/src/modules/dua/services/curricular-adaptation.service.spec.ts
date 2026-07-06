import { CurricularAdaptationService } from './curricular-adaptation.service';
import { CurricularAdaptationType } from '../entities/curricular-adaptation.entity';

describe('CurricularAdaptationService', () => {
  it('getAdaptationMap devuelve subjectId→{type} y vacío sin filas', async () => {
    const repo: any = { find: jest.fn().mockResolvedValue([
      { subjectId: 'su1', type: 'SIGNIFICANT', notes: null },
      { subjectId: 'su2', type: 'ACCESS', notes: 'rampa' },
    ]) };
    const ayRepo: any = { findOne: jest.fn() };
    const svc = new CurricularAdaptationService(repo, ayRepo);
    const map = await svc.getAdaptationMap('s1', 'ay1');
    expect(map.get('su1')?.type).toBe('SIGNIFICANT');
    expect(map.get('su2')?.notes).toBe('rampa');
    expect(map.size).toBe(2);

    repo.find.mockResolvedValue([]);
    expect((await svc.getAdaptationMap('s1', 'ay1')).size).toBe(0);
  });

  it('getAdaptationMapByYearName resuelve nombre→id; año inexistente → vacío', async () => {
    const repo: any = { find: jest.fn().mockResolvedValue([{ subjectId: 'su1', type: 'ACCESS', notes: null }]) };
    const ayRepo: any = { findOne: jest.fn().mockResolvedValue({ id: 'ay1' }) };
    const svc = new CurricularAdaptationService(repo, ayRepo);
    expect((await svc.getAdaptationMapByYearName('s1', '2025-2026')).get('su1')?.type).toBe('ACCESS');
    ayRepo.findOne.mockResolvedValue(null);
    expect((await svc.getAdaptationMapByYearName('s1', 'X')).size).toBe(0);
  });

  it('upsert inserta si no existe y actualiza si existe (por clave única)', async () => {
    const existing = { id: 'a1', studentId: 's1', subjectId: 'su1', academicYearId: 'ay1', type: 'ACCESS' };
    const repo: any = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'new', ...x })),
    };
    const svc = new CurricularAdaptationService(repo, {} as any);
    const r = await svc.upsert({ studentId: 's1', subjectId: 'su1', academicYearId: 'ay1', type: CurricularAdaptationType.SIGNIFICANT }, 'admin1');
    expect(repo.save).toHaveBeenCalled();
    expect(r.type).toBe('SIGNIFICANT');

    repo.findOne.mockResolvedValue(existing);
    await svc.upsert({ studentId: 's1', subjectId: 'su1', academicYearId: 'ay1', type: CurricularAdaptationType.ACCESS }, 'admin1');
    // actualiza la existente
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1', type: 'ACCESS' }));
  });
});
