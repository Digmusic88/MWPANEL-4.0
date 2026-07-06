import { LomloeGradeModeService } from './lomloe-grade-mode.service';

const repo = (row: any = null) => ({
  findOne: jest.fn().mockResolvedValue(row),
  create: jest.fn((x) => x),
  save: jest.fn((x) => Promise.resolve(x)),
});

describe('LomloeGradeModeService', () => {
  it('default parallel si no hay fila', async () => {
    const svc = new LomloeGradeModeService(repo(null) as any);
    expect(await svc.getMode('sa1', 'first_trimester')).toBe('parallel');
  });
  it('devuelve el modo guardado', async () => {
    const svc = new LomloeGradeModeService(repo({ mode: 'replace' }) as any);
    expect(await svc.getMode('sa1', 'first_trimester')).toBe('replace');
  });
  it('setMode hace upsert', async () => {
    const r = repo(null);
    const svc = new LomloeGradeModeService(r as any);
    await svc.setMode('sa1', 'first_trimester', 'derive', 'u1');
    const saved = (r.save as jest.Mock).mock.calls[0][0];
    expect(saved.mode).toBe('derive');
    expect(saved.updatedById).toBe('u1');
  });
  it('getMode devuelve parallel y NO consulta cuando gradePeriod es vacio', async () => {
    const r = repo(null);
    const svc = new LomloeGradeModeService(r as any);
    const result = await svc.getMode('sa1', undefined as any);
    expect(result).toBe('parallel');
    expect(r.findOne).not.toHaveBeenCalled();
  });
});
