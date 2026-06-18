import { Controller, Get, Post, Body, Param, Query, Req, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { IsString, IsArray, IsUUID, IsOptional } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard } from '../../common/secretaria-auth.guard';

class GroupDto {
  @IsString() name: string;
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) memberUserIds?: string[];
}
class MsgDto { @IsString() body: string; }
class AddMembersDto { @IsArray() @IsUUID('all', { each: true }) userIds: string[]; }

@Controller('secretaria/chat')
@UseGuards(SecretariaAuthGuard)
export class ChatController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private uid(req: any): string { return req.user?.id; }
  private async isMember(groupId: string, userId: string): Promise<boolean> {
    const r = await this.ds.query(`SELECT 1 FROM secretaria.chat_members WHERE group_id=$1 AND user_id=$2`, [groupId, userId]);
    return r.length > 0;
  }

  // Usuarios de Secretaría disponibles para añadir a un grupo (los que tienen acceso)
  @Get('users')
  users() {
    return this.ds.query(`
      SELECT DISTINCT u.id, u.email, string_agg(DISTINCT sr.role::text, ', ') AS roles
      FROM secretaria.staff_roles sr JOIN public.users u ON u.id=sr.user_id
      GROUP BY u.id, u.email ORDER BY u.email`);
  }

  // Grupos del usuario actual con último mensaje
  @Get('groups')
  async groups(@Req() req: any) {
    const me = this.uid(req);
    return this.ds.query(`
      SELECT g.id, g.name,
             (SELECT count(*) FROM secretaria.chat_members m WHERE m.group_id=g.id) AS "memberCount",
             (SELECT body FROM secretaria.chat_messages msg WHERE msg.group_id=g.id ORDER BY created_at DESC LIMIT 1) AS "lastMessage",
             (SELECT max(created_at) FROM secretaria.chat_messages msg WHERE msg.group_id=g.id) AS "lastAt"
      FROM secretaria.chat_groups g
      JOIN secretaria.chat_members cm ON cm.group_id=g.id AND cm.user_id=$1
      ORDER BY COALESCE((SELECT max(created_at) FROM secretaria.chat_messages msg WHERE msg.group_id=g.id), g.created_at) DESC`, [me]);
  }

  @Post('groups')
  async createGroup(@Req() req: any, @Body() b: GroupDto) {
    const me = this.uid(req);
    const g = await this.ds.query(`INSERT INTO secretaria.chat_groups(name, created_by) VALUES ($1,$2) RETURNING id`, [b.name, me]);
    const gid = g[0].id;
    const ids = new Set([me, ...(b.memberUserIds || [])]);
    for (const uid of ids) {
      await this.ds.query(`INSERT INTO secretaria.chat_members(group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [gid, uid]);
    }
    return { ok: true, id: gid };
  }

  @Post('groups/:id/members')
  async addMembers(@Req() req: any, @Param('id') id: string, @Body() b: AddMembersDto) {
    if (!(await this.isMember(id, this.uid(req)))) throw new ForbiddenException();
    for (const uid of b.userIds) await this.ds.query(`INSERT INTO secretaria.chat_members(group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, uid]);
    return { ok: true };
  }

  // Mensajes de un grupo (polling con ?after=ISO opcional). Devuelve también miembros.
  @Get('groups/:id/messages')
  async messages(@Req() req: any, @Param('id') id: string, @Query('after') after?: string) {
    const me = this.uid(req);
    if (!(await this.isMember(id, me))) throw new ForbiddenException();
    const msgs = await this.ds.query(`
      SELECT msg.id, msg.body, msg.sender_user_id AS "senderId", u.email AS "senderEmail", msg.created_at AS "createdAt",
             (msg.sender_user_id=$2) AS "mine"
      FROM secretaria.chat_messages msg LEFT JOIN public.users u ON u.id=msg.sender_user_id
      WHERE msg.group_id=$1 ${after ? 'AND msg.created_at > $3' : ''}
      ORDER BY msg.created_at ASC`, after ? [id, me, after] : [id, me]);
    return msgs;
  }

  @Post('groups/:id/messages')
  async send(@Req() req: any, @Param('id') id: string, @Body() b: MsgDto) {
    const me = this.uid(req);
    if (!(await this.isMember(id, me))) throw new ForbiddenException();
    if (!b.body?.trim()) throw new BadRequestException('Mensaje vacío');
    const r = await this.ds.query(`INSERT INTO secretaria.chat_messages(group_id, sender_user_id, body) VALUES ($1,$2,$3) RETURNING id, created_at AS "createdAt"`, [id, me, b.body.trim()]);
    return { ok: true, id: r[0].id, createdAt: r[0].createdAt };
  }

  // Miembros de un grupo
  @Get('groups/:id/members')
  async members(@Req() req: any, @Param('id') id: string) {
    if (!(await this.isMember(id, this.uid(req)))) throw new ForbiddenException();
    return this.ds.query(`
      SELECT u.id, u.email FROM secretaria.chat_members cm JOIN public.users u ON u.id=cm.user_id
      WHERE cm.group_id=$1 ORDER BY u.email`, [id]);
  }
}
