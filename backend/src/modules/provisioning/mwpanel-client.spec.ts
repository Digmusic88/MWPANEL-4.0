import * as jwt from 'jsonwebtoken';
import { signAdminToken } from './mwpanel-client';

describe('signAdminToken', () => {
  const OLD = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = 'test-secret'; });
  afterAll(() => { process.env.JWT_SECRET = OLD; });
  it('firma un JWT con sub=adminUserId verificable con el secreto', () => {
    const token = signAdminToken('admin-123');
    const decoded: any = jwt.verify(token, 'test-secret');
    expect(decoded.sub).toBe('admin-123');
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });
});
