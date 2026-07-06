import { CurrentAcademicYearService } from '../current-academic-year.service';
import { AcademicYearStampSubscriber } from '../academic-year-stamp.subscriber';

describe('CurrentAcademicYearService', () => {
  it('devuelve el id del año isCurrent y cachea (1 query en 2 llamadas)', async () => {
    const repo: any = { findOne: jest.fn().mockResolvedValue({ id: 'yr1' }) };
    const svc = new CurrentAcademicYearService(repo);
    expect(await svc.getCurrentId()).toBe('yr1');
    expect(await svc.getCurrentId()).toBe('yr1');
    expect(repo.findOne).toHaveBeenCalledTimes(1); // cacheado dentro del TTL
  });
  it('devuelve null si no hay año actual', async () => {
    const repo: any = { findOne: jest.fn().mockResolvedValue(null) };
    const svc = new CurrentAcademicYearService(repo);
    expect(await svc.getCurrentId()).toBeNull();
  });
});

describe('AcademicYearStampSubscriber', () => {
  const make = (currentId: string | null) => {
    const ds: any = { subscribers: [] };
    const current: any = { getCurrentId: jest.fn().mockResolvedValue(currentId) };
    const sub = new AcademicYearStampSubscriber(ds, current);
    return { ds, current, sub };
  };

  it('se auto-registra en el dataSource', () => {
    const { ds, sub } = make('yr1');
    expect(ds.subscribers).toContain(sub);
  });
  it('beforeInsert rellena academicYearId si viene null y la tabla es objetivo', async () => {
    const { sub } = make('yr1');
    const entity: any = { academicYearId: null };
    await sub.beforeInsert({ metadata: { tableName: 'activities' }, entity } as any);
    expect(entity.academicYearId).toBe('yr1');
  });
  it('NO pisa un academicYearId ya presente', async () => {
    const { sub } = make('yr1');
    const entity: any = { academicYearId: 'manual' };
    await sub.beforeInsert({ metadata: { tableName: 'tasks' }, entity } as any);
    expect(entity.academicYearId).toBe('manual');
  });
  it('NO toca tablas que no son objetivo', async () => {
    const { sub } = make('yr1');
    const entity: any = { academicYearId: null };
    await sub.beforeInsert({ metadata: { tableName: 'users' }, entity } as any);
    expect(entity.academicYearId).toBeNull();
  });
  it('si el servicio lanza, NO lanza y deja null', async () => {
    const ds: any = { subscribers: [] };
    const current: any = { getCurrentId: jest.fn().mockRejectedValue(new Error('boom')) };
    const sub = new AcademicYearStampSubscriber(ds, current);
    const entity: any = { academicYearId: null };
    await expect(sub.beforeInsert({ metadata: { tableName: 'activities' }, entity } as any)).resolves.toBeUndefined();
    expect(entity.academicYearId).toBeNull();
  });
});
