import { buildUrl } from './academia-proxy.client';

describe('buildUrl', () => {
  const BASE = 'http://mw-secretaria-api:3010/api';
  it('junta base y path', () => {
    expect(buildUrl(BASE, 'secretaria/attendance/grid', {})).toBe(`${BASE}/secretaria/attendance/grid`);
  });
  it('añade query params definidos y omite undefined', () => {
    const u = buildUrl(BASE, 'secretaria/attendance/grid', { groupId: 'g1', date: undefined, from: '2026-01-01' });
    expect(u).toContain('groupId=g1');
    expect(u).toContain('from=2026-01-01');
    expect(u).not.toContain('date=');
  });
});
