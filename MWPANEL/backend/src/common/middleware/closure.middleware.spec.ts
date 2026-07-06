// Use the real jsonwebtoken library so JWT sign/verify work correctly in tests.
jest.mock('jsonwebtoken', () => jest.requireActual('jsonwebtoken'));

import { ClosureMiddleware } from './closure.middleware';
import { ClosureService } from '../../modules/settings/closure/closure.service';
import * as jwt from 'jsonwebtoken';

function makeReq(path: string, role?: string, method = 'GET') {
  const headers: any = {};
  if (role) {
    const token = jwt.sign({ role }, process.env.JWT_SECRET || 'your-secret-key');
    headers.authorization = `Bearer ${token}`;
  }
  // originalUrl mirrors path so tests exercise the canonical field the middleware reads.
  return { path, originalUrl: path, url: path, method, headers } as any;
}

describe('ClosureMiddleware (read-open / write-freeze)', () => {
  let mw: ClosureMiddleware;
  let closure: jest.Mocked<Partial<ClosureService>>;
  let next: jest.Mock;

  beforeEach(() => {
    next = jest.fn();
    closure = {
      isEnabled: jest.fn(async () => true),
      getAllowedSections: jest.fn(async (_role: any) => ['blog', 'perfil', 'comunicaciones']),
      getMessage: jest.fn(async () => 'Cierre'),
    };
    mw = new ClosureMiddleware(closure as unknown as ClosureService);
  });

  it('passes everything when closure is disabled', async () => {
    (closure.isEnabled as jest.Mock).mockResolvedValue(false);
    await mw.use(makeReq('/api/tasks', 'student', 'POST'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('always lets admin through, even writes to a closed section', async () => {
    await mw.use(makeReq('/api/tasks', 'admin', 'POST'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('lets transversal always-open paths through for affected roles', async () => {
    await mw.use(makeReq('/api/auth/me', 'student'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('lets writes to an allowed section through', async () => {
    await mw.use(makeReq('/api/blog/post/x', 'student', 'POST'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('lets GET on a CLOSED section through (reads open)', async () => {
    await mw.use(makeReq('/api/tasks', 'student', 'GET'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('lets GET on an uncatalogued path through (reads open)', async () => {
    await mw.use(makeReq('/api/random-thing', 'family', 'GET'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks a WRITE to a closed catalogued section with 423', async () => {
    await expect(mw.use(makeReq('/api/tasks', 'student', 'POST'), {} as any, next))
      .rejects.toMatchObject({ getStatus: expect.any(Function) });
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks a WRITE to an uncatalogued path with 423', async () => {
    await expect(mw.use(makeReq('/api/random-thing', 'family', 'PUT'), {} as any, next))
      .rejects.toBeDefined();
    expect(next).not.toHaveBeenCalled();
  });

  it('does not interfere when there is no/invalid token', async () => {
    await mw.use(makeReq('/api/tasks', undefined, 'POST'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });
});
