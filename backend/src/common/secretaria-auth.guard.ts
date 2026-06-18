import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, SetMetadata } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffRole } from './staff-role.entity';

export type SecretariaRole = 'secretaria_admin' | 'secretaria_staff' | 'direccion' | 'secretaria_teacher';
export const SECRETARIA_ROLES = 'secretaria_roles';
export const Roles = (...roles: SecretariaRole[]) => SetMetadata(SECRETARIA_ROLES, roles);

@Injectable()
export class SecretariaAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
    @InjectRepository(StaffRole) private staffRoles: Repository<StaffRole>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) throw new UnauthorizedException('Falta token');
    let payload: any;
    try {
      payload = this.jwt.verify(token, { secret: process.env.JWT_SECRET });
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
    const userId = payload.sub || payload.id;
    // El usuario debe tener un rol de Secretaría asignado
    const roles = await this.staffRoles.find({ where: { userId } });
    if (roles.length === 0) throw new ForbiddenException('No tienes acceso a Secretaría');
    req.user = { id: userId, email: payload.email, secretariaRoles: roles.map(r => r.role) };

    const required = this.reflector.getAllAndOverride<SecretariaRole[]>(SECRETARIA_ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (!required || required.length === 0) return true;
    const ok = req.user.secretariaRoles.some((r: string) => required.includes(r as SecretariaRole));
    if (!ok) throw new ForbiddenException('Rol de Secretaría insuficiente');
    return true;
  }
}
