import * as jwt from 'jsonwebtoken';

export const MWPANEL_API = process.env.MWPANEL_API_URL || 'http://mw-panel-backend-prod:3000/api';

export function signAdminToken(adminUserId: string): string {
  const secret = process.env.JWT_SECRET || '';
  return jwt.sign({ sub: adminUserId }, secret, { expiresIn: '5m' });
}

export interface EnrollmentHttpResult { status: number; body: any }

export async function postEnrollment(dto: any, token: string): Promise<EnrollmentHttpResult> {
  const res = await fetch(`${MWPANEL_API}/enrollment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  let body: any = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}
