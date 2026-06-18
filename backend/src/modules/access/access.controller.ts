import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { IsString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import * as bcrypt from 'bcryptjs';

const ROLES = ['secretaria_admin', 'secretaria_staff', 'secretaria_teacher', 'direccion'];
function genPassword(): string {
  // alfanumérico sin caracteres especiales (evita problemas de JSON/login)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = ''; for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

class GrantDto { @IsUUID() userId: string; @IsIn(ROLES) role: string; }
class CreateAccountDto {
  @IsString() email: string;
  @IsIn(ROLES) role: string;
  @IsOptional() @IsUUID() teacherId?: string;
  @IsOptional() @IsString() password?: string; // si se indica, se usa; si no, se autogenera
}
class UpdateMemberDto {
  @IsUUID() userId: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() teacherFullName?: string; // nombre del profesor vinculado (lo crea/vincula si no existe)
  @IsOptional() @IsString() password?: string;        // si se indica, restablece la contraseña de acceso
}
// Contraseña alfanumérica (sin símbolos, para evitar problemas de JSON/login). Mín. 6.
function assertValidPassword(pw: string) {
  if (!/^[A-Za-z0-9]{6,}$/.test(pw)) {
    throw new BadRequestException('La contraseña debe tener al menos 6 caracteres alfanuméricos (sin símbolos)');
  }
}

@Controller('secretaria/access')
@UseGuards(SecretariaAuthGuard)
@Roles('secretaria_admin')
export class AccessController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  // Equipo con acceso a Secretaría
  @Get('team')
  team() {
    return this.ds.query(`
      SELECT u.id AS "userId", u.email,
             p."firstName" AS "firstName", p."lastName" AS "lastName",
             TRIM(COALESCE(p."firstName",'')||' '||COALESCE(p."lastName",'')) AS "name",
             json_agg(json_build_object('id', sr.id, 'role', sr.role) ORDER BY sr.role) AS roles,
             (SELECT t.full_name FROM secretaria.teachers t WHERE t.user_id=u.id LIMIT 1) AS "linkedTeacher",
             (SELECT t.id FROM secretaria.teachers t WHERE t.user_id=u.id LIMIT 1) AS "teacherId"
      FROM secretaria.staff_roles sr
      JOIN public.users u ON u.id=sr.user_id
      LEFT JOIN public.user_profiles p ON p."userId"=u.id
      GROUP BY u.id, u.email, p."firstName", p."lastName"
      ORDER BY u.email`);
  }

  // Buscar usuarios existentes de la plataforma por correo (para concederles acceso)
  @Get('search')
  search(@Query('q') q: string) {
    if (!q || q.length < 2) return [];
    return this.ds.query(`
      SELECT u.id, u.email, u.role::text AS "platformRole"
      FROM public.users u WHERE u."isActive"=true AND lower(u.email) LIKE '%'||lower($1)||'%'
      ORDER BY u.email LIMIT 20`, [q]);
  }

  // Conceder un rol de Secretaría a un usuario existente
  @Post('grant')
  async grant(@Body() b: GrantDto) {
    await this.ds.query(
      `INSERT INTO secretaria.staff_roles(user_id, role) VALUES ($1,$2::secretaria.staff_role)
       ON CONFLICT DO NOTHING`, [b.userId, b.role]);
    return { ok: true };
  }

  // Editar los datos de un miembro del equipo: nombre/apellidos (user_profiles) y correo (users).
  // El nombre se comparte con MW Panel (mismo perfil de usuario). Solo administrador.
  @Post('update-member')
  async updateMember(@Body() b: UpdateMemberDto) {
    const member = await this.ds.query(`SELECT 1 FROM secretaria.staff_roles WHERE user_id=$1 LIMIT 1`, [b.userId]);
    if (!member.length) throw new BadRequestException('No es un miembro del equipo');

    if (b.email !== undefined && b.email.trim() !== '') {
      const email = b.email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new BadRequestException('Correo no válido');
      const dup = await this.ds.query(`SELECT 1 FROM public.users WHERE lower(email)=lower($1) AND id<>$2`, [email, b.userId]);
      if (dup.length) throw new BadRequestException('Ya existe otra cuenta con ese correo');
      await this.ds.query(`UPDATE public.users SET email=$1, "updatedAt"=now() WHERE id=$2`, [email, b.userId]);
    }

    if (b.firstName !== undefined || b.lastName !== undefined) {
      const prof = await this.ds.query(`SELECT "firstName", "lastName" FROM public.user_profiles WHERE "userId"=$1 LIMIT 1`, [b.userId]);
      const fn = (b.firstName ?? prof[0]?.firstName ?? '').trim();
      const ln = (b.lastName ?? prof[0]?.lastName ?? '').trim();
      if (prof.length) {
        await this.ds.query(`UPDATE public.user_profiles SET "firstName"=$1, "lastName"=$2, "updatedAt"=now() WHERE "userId"=$3`, [fn, ln, b.userId]);
      } else {
        await this.ds.query(`INSERT INTO public.user_profiles("firstName","lastName","userId") VALUES ($1,$2,$3)`, [fn, ln, b.userId]);
      }
    }

    // Restablecer contraseña de acceso (la indica el administrador para entregarla).
    if (b.password !== undefined && b.password.trim() !== '') {
      const pw = b.password.trim();
      assertValidPassword(pw);
      const hash = await bcrypt.hash(pw, 10);
      await this.ds.query(`UPDATE public.users SET "passwordHash"=$1, "isPasswordTemporary"=true, "updatedAt"=now() WHERE id=$2`, [hash, b.userId]);
    }

    // Nombre como profesor/a: edita la ficha de profesor vinculada o la crea y vincula si no existe.
    if (b.teacherFullName !== undefined && b.teacherFullName.trim() !== '') {
      const name = b.teacherFullName.trim();
      const linked = await this.ds.query(`SELECT id FROM secretaria.teachers WHERE user_id=$1 LIMIT 1`, [b.userId]);
      if (linked.length) {
        await this.ds.query(`UPDATE secretaria.teachers SET full_name=$1 WHERE id=$2`, [name, linked[0].id]);
      } else {
        const em = await this.ds.query(`SELECT email FROM public.users WHERE id=$1`, [b.userId]);
        await this.ds.query(
          `INSERT INTO secretaria.teachers(full_name, email, user_id, is_active) VALUES ($1,$2,$3,true)`,
          [name, em[0]?.email || null, b.userId]);
      }
    }
    return { ok: true };
  }

  // Quitar un rol concreto (por id de staff_roles)
  @Delete('role/:id')
  async revoke(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.staff_roles WHERE id=$1`, [id]);
    return { ok: true };
  }

  // Crear una cuenta nueva de plataforma (p. ej. para un profesor) y darle acceso a Secretaría.
  // Devuelve la contraseña generada para entregarla a la persona.
  @Post('create-account')
  async createAccount(@Body() b: CreateAccountDto) {
    const email = b.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new BadRequestException('Correo no válido');
    const exists = await this.ds.query(`SELECT id FROM public.users WHERE lower(email)=lower($1)`, [email]);
    if (exists.length) throw new BadRequestException('Ya existe una cuenta con ese correo; usa "Conceder acceso" en su lugar');

    const password = (b.password && b.password.trim()) ? b.password.trim() : genPassword();
    if (b.password && b.password.trim()) assertValidPassword(password);
    const hash = await bcrypt.hash(password, 10);
    // role de plataforma: 'teacher' si es profesor, si no 'student' (mínimo). El acceso real lo da staff_roles.
    const platformRole = b.role === 'secretaria_teacher' ? 'teacher' : 'student';
    const u = await this.ds.query(
      `INSERT INTO public.users(email, "passwordHash", role, "isActive", "isPasswordTemporary")
       VALUES ($1,$2,$3::users_role_enum,true,true) RETURNING id`, [email, hash, platformRole]);
    const userId = u[0].id;
    await this.ds.query(`INSERT INTO secretaria.staff_roles(user_id, role) VALUES ($1,$2::secretaria.staff_role) ON CONFLICT DO NOTHING`, [userId, b.role]);
    if (b.teacherId) {
      await this.ds.query(`UPDATE secretaria.teachers SET user_id=$2, email=COALESCE(email,$3) WHERE id=$1`, [b.teacherId, userId, email]);
    }
    return { ok: true, userId, email, password };
  }

  // Profesores sin cuenta enlazada (para crearles acceso)
  @Get('teachers-without-account')
  teachersWithoutAccount() {
    return this.ds.query(`SELECT id, full_name AS "fullName", email FROM secretaria.teachers WHERE is_active AND user_id IS NULL ORDER BY full_name`);
  }
}
