import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { IsString, IsOptional, IsDateString, IsIn, IsUUID, IsBoolean } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

const PRIORITIES = ['low', 'medium', 'high'];

class SheetDto {
  @IsString() title: string;
  @IsDateString() meetingDate: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class ItemDto {
  @IsString() itemTitle: string;
  @IsOptional() @IsString() itemDescription?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsIn(PRIORITIES) priority?: string;
  @IsOptional() @IsUUID() assigneeTeacherId?: string;
  @IsOptional() @IsBoolean() isCompleted?: boolean;
}

// Reuniones de profesores (hojas de coordinación): reunión con orden del día marcable y % de progreso.
@Controller('secretaria/meetings')
@UseGuards(SecretariaAuthGuard)
export class MeetingsController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  // Lista de reuniones con recuento de ítems y progreso
  @Get()
  list() {
    return this.ds.query(`
      SELECT s.id, s.title, to_char(s.meeting_date,'YYYY-MM-DD') AS "meetingDate", s.description, s.is_active AS "isActive",
             COUNT(i.id)::int AS "totalItems",
             COUNT(i.id) FILTER (WHERE i.is_completed)::int AS "doneItems",
             CASE WHEN COUNT(i.id)=0 THEN 0 ELSE ROUND(COUNT(i.id) FILTER (WHERE i.is_completed)::numeric / COUNT(i.id) * 100)::int END AS "progress"
      FROM secretaria.meeting_sheets s
      LEFT JOIN secretaria.meeting_items i ON i.sheet_id=s.id
      GROUP BY s.id ORDER BY s.meeting_date DESC, s.created_at DESC`);
  }

  // Detalle: reunión + ítems del orden del día
  @Get(':id')
  async detail(@Param('id') id: string) {
    const sheet = (await this.ds.query(`
      SELECT id, title, to_char(meeting_date,'YYYY-MM-DD') AS "meetingDate", description, is_active AS "isActive"
      FROM secretaria.meeting_sheets WHERE id=$1`, [id]))[0];
    const items = await this.ds.query(`
      SELECT i.id, i.item_title AS "itemTitle", i.item_description AS "itemDescription",
             to_char(i.due_date,'YYYY-MM-DD') AS "dueDate", i.is_completed AS "isCompleted",
             i.priority, i.order_index AS "orderIndex", i.assignee_teacher_id AS "assigneeTeacherId",
             t.full_name AS "assigneeName"
      FROM secretaria.meeting_items i
      LEFT JOIN secretaria.teachers t ON t.id=i.assignee_teacher_id
      WHERE i.sheet_id=$1 ORDER BY i.order_index, i.created_at`, [id]);
    return { sheet, items };
  }

  @Post() @Roles('secretaria_admin', 'secretaria_staff', 'direccion')
  async create(@Req() req: any, @Body() b: SheetDto) {
    const r = await this.ds.query(
      `INSERT INTO secretaria.meeting_sheets(title, meeting_date, description, created_by) VALUES ($1,$2,$3,$4) RETURNING id`,
      [b.title, b.meetingDate, b.description || null, req.user?.id || null]);
    return { ok: true, id: r[0].id };
  }

  @Patch(':id') @Roles('secretaria_admin', 'secretaria_staff', 'direccion')
  async update(@Param('id') id: string, @Body() b: SheetDto) {
    await this.ds.query(
      `UPDATE secretaria.meeting_sheets SET title=COALESCE($2,title), meeting_date=COALESCE($3,meeting_date),
         description=$4, is_active=COALESCE($5,is_active), updated_at=now() WHERE id=$1`,
      [id, b.title, b.meetingDate, b.description ?? null, b.isActive ?? null]);
    return { ok: true };
  }

  @Delete(':id') @Roles('secretaria_admin', 'secretaria_staff', 'direccion')
  async remove(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.meeting_sheets WHERE id=$1`, [id]);
    return { ok: true };
  }

  // Ítems del orden del día (los profesores también participan: pueden añadir y marcar)
  @Post(':id/items') @Roles('secretaria_admin', 'secretaria_staff', 'direccion', 'secretaria_teacher')
  async addItem(@Param('id') sheetId: string, @Body() b: ItemDto) {
    const ord = (await this.ds.query(`SELECT COALESCE(MAX(order_index),-1)+1 AS n FROM secretaria.meeting_items WHERE sheet_id=$1`, [sheetId]))[0].n;
    const r = await this.ds.query(
      `INSERT INTO secretaria.meeting_items(sheet_id, item_title, item_description, due_date, priority, assignee_teacher_id, order_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [sheetId, b.itemTitle, b.itemDescription || null, b.dueDate || null, b.priority || 'medium', b.assigneeTeacherId || null, ord]);
    return { ok: true, id: r[0].id };
  }

  @Patch('items/:itemId') @Roles('secretaria_admin', 'secretaria_staff', 'direccion', 'secretaria_teacher')
  async updateItem(@Param('itemId') itemId: string, @Body() b: ItemDto) {
    const completedExpr = b.isCompleted === undefined ? 'is_completed' : '$6';
    const completedAtExpr = b.isCompleted === undefined ? 'completed_at' : (b.isCompleted ? 'now()' : 'NULL');
    await this.ds.query(
      `UPDATE secretaria.meeting_items SET item_title=COALESCE($2,item_title), item_description=$3,
         due_date=$4, priority=COALESCE($5,priority), is_completed=${completedExpr}, completed_at=${completedAtExpr},
         assignee_teacher_id=$7 WHERE id=$1`,
      [itemId, b.itemTitle ?? null, b.itemDescription ?? null, b.dueDate ?? null, b.priority ?? null, b.isCompleted ?? false, b.assigneeTeacherId ?? null]);
    return { ok: true };
  }

  // Marcar/desmarcar un ítem (atajo para el check)
  @Patch('items/:itemId/toggle') @Roles('secretaria_admin', 'secretaria_staff', 'direccion', 'secretaria_teacher')
  async toggleItem(@Param('itemId') itemId: string, @Query('done') done: string) {
    const d = done === 'true';
    await this.ds.query(
      `UPDATE secretaria.meeting_items SET is_completed=$2, completed_at=${d ? 'now()' : 'NULL'} WHERE id=$1`, [itemId, d]);
    return { ok: true };
  }

  @Delete('items/:itemId') @Roles('secretaria_admin', 'secretaria_staff', 'direccion', 'secretaria_teacher')
  async removeItem(@Param('itemId') itemId: string) {
    await this.ds.query(`DELETE FROM secretaria.meeting_items WHERE id=$1`, [itemId]);
    return { ok: true };
  }
}
