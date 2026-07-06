import { AcademiaAccessService } from './academia-access.service';

function makeDs(responses: Record<string, any[]>) {
  const calls: string[] = [];
  const ds: any = {
    query: jest.fn(async (sql: string) => {
      calls.push(sql.replace(/\s+/g, ' ').trim());
      const key = Object.keys(responses).find(k => sql.replace(/\s+/g, ' ').includes(k));
      return key ? responses[key] : [];
    }),
    calls,
  };
  return ds;
}

describe('AcademiaAccessService.ensureTeacherAccess', () => {
  it('no otorga rol si el profesor no posee grupos de academia', async () => {
    const ds = makeDs({
      'FROM secretaria.teachers WHERE user_id': [{ id: 't1' }], // ya enlazado
      'FROM secretaria.groups g': [],                            // 0 grupos
    });
    const svc = new AcademiaAccessService(ds);
    await svc.ensureTeacherAccess('u1');
    const inserts = ds.calls.filter((c: string) => c.includes('INSERT INTO secretaria.staff_roles'));
    expect(inserts.length).toBe(0);
  });

  it('otorga secretaria_teacher (idempotente) si posee grupos', async () => {
    const ds = makeDs({
      'FROM secretaria.teachers WHERE user_id': [{ id: 't1' }],
      'FROM secretaria.groups g': [{ n: 2 }],
    });
    const svc = new AcademiaAccessService(ds);
    await svc.ensureTeacherAccess('u1');
    const inserts = ds.calls.filter((c: string) => c.includes('INSERT INTO secretaria.staff_roles'));
    expect(inserts.length).toBe(1);
  });

  it('es fail-soft: si una query lanza, no propaga', async () => {
    const ds: any = { query: jest.fn(async () => { throw new Error('db down'); }) };
    const svc = new AcademiaAccessService(ds);
    await expect(svc.ensureTeacherAccess('u1')).resolves.toBeUndefined();
  });
});
