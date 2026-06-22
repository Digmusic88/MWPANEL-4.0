import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { StaffRole } from '../common/staff-role.entity';

export interface SocketUser {
  userId: string;
  email: string;
  secretariaRoles: string[];
  displayName: string;
}

export async function authenticateSocketToken(
  token: string | undefined,
  jwt: JwtService,
  staffRoles: Repository<StaffRole>,
): Promise<SocketUser> {
  if (!token) throw new Error('unauthorized');
  let payload: any;
  try {
    payload = jwt.verify(token, { secret: process.env.JWT_SECRET });
  } catch {
    throw new Error('unauthorized');
  }
  const userId = payload.sub || payload.id;
  const roles = await staffRoles.find({ where: { userId } });
  if (roles.length === 0) throw new Error('unauthorized');
  const displayName = payload.email || payload.name || 'Usuario';
  return { userId, email: payload.email, secretariaRoles: roles.map(r => r.role), displayName };
}
