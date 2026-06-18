import { Controller, Post, Body, UnauthorizedException, ForbiddenException, NotFoundException, Get, Param, UseGuards, Req } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { SecretariaAuthGuard } from '../../common/secretaria-auth.guard';

class LoginDto { @IsString() email: string; @IsString() password: string; }

@Controller('secretaria/auth')
export class AuthController {
  constructor(private jwt: JwtService, @InjectDataSource() private ds: DataSource) {}

  @Post('login')
  async login(@Body() b: LoginDto) {
    const rows = await this.ds.query(
      `SELECT u.id, u.email, u."passwordHash", u.role, p."firstName", p."lastName"
       FROM public.users u LEFT JOIN public.user_profiles p ON p."userId"=u.id
       WHERE lower(u.email)=lower($1) AND u."isActive"=true LIMIT 1`, [b.email]);
    const user = rows[0];
    if (!user || !user.passwordHash) throw new UnauthorizedException('Credenciales inválidas');
    const ok = await bcrypt.compare(b.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');
    const roles = await this.ds.query(`SELECT role FROM secretaria.staff_roles WHERE user_id=$1`, [user.id]);
    if (roles.length === 0) throw new ForbiddenException('No tienes acceso a Secretaría. Pide a un administrador que te dé acceso.');
    const token = this.jwt.sign({ sub: user.id, email: user.email }, { secret: process.env.JWT_SECRET, expiresIn: '12h' });
    return { access_token: token, user: { id: user.id, email: user.email, name: `${user.firstName||''} ${user.lastName||''}`.trim(), secretariaRoles: roles.map((r:any)=>r.role) } };
  }

  // ACCESO INTERNO: la administración inicia sesión como otro miembro (p. ej. un profesor)
  // para revisar/cambiar algo con su visualización. Devuelve un token del usuario destino.
  // El retorno al panel de administrador lo gestiona el frontend (conserva el token de admin).
  @Post('impersonate/:userId') @UseGuards(SecretariaAuthGuard)
  async impersonate(@Req() req: any, @Param('userId') userId: string) {
    if (!((req.user?.secretariaRoles) || []).includes('secretaria_admin')) {
      throw new ForbiddenException('Solo la administración puede usar el acceso interno');
    }
    const rows = await this.ds.query(
      `SELECT u.id, u.email, p."firstName", p."lastName"
       FROM public.users u LEFT JOIN public.user_profiles p ON p."userId"=u.id
       WHERE u.id=$1 AND u."isActive"=true LIMIT 1`, [userId]);
    const user = rows[0];
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const roles = await this.ds.query(`SELECT role FROM secretaria.staff_roles WHERE user_id=$1`, [userId]);
    if (roles.length === 0) throw new ForbiddenException('Ese usuario no tiene acceso a Secretaría');
    const token = this.jwt.sign({ sub: user.id, email: user.email, impBy: req.user.id }, { secret: process.env.JWT_SECRET, expiresIn: '4h' });
    return { access_token: token, user: { id: user.id, email: user.email, name: `${user.firstName||''} ${user.lastName||''}`.trim(), secretariaRoles: roles.map((r:any)=>r.role) } };
  }

  @Get('me') @UseGuards(SecretariaAuthGuard)
  me(@Req() req: any) { return req.user; }
}
