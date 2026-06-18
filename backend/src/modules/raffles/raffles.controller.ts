import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsNumber, IsInt, IsIn, IsBoolean } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

const BOOK_STATUS = ['pendiente', 'entregado', 'devuelto_parcial', 'liquidado'];

class CampaignDto {
  @IsString() name: string;
  @IsOptional() @IsNumber() ticketPrice?: number;
  @IsOptional() @IsUUID() academicYearId?: string;
  @IsOptional() @IsBoolean() isOpen?: boolean;
}
class BookDto {
  @IsUUID() familyId: string;
  @IsOptional() @IsInt() rangeStart?: number;
  @IsOptional() @IsInt() rangeEnd?: number;
  @IsOptional() @IsNumber() amountExpected?: number;
  @IsOptional() @IsString() notes?: string;
}
class BookUpdateDto {
  @IsOptional() @IsNumber() amountReturned?: number;
  @IsOptional() @IsIn(BOOK_STATUS) status?: string;
  @IsOptional() @IsNumber() amountExpected?: number;
  @IsOptional() @IsString() notes?: string;
}

@Controller('secretaria/raffles')
@UseGuards(SecretariaAuthGuard)
export class RafflesController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async activeYearId(): Promise<string | undefined> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return y[0]?.id;
  }

  // ---- Campañas ----
  @Get('campaigns')
  async campaigns(@Query('academicYearId') yearId?: string) {
    const yid = yearId || (await this.activeYearId());
    return this.ds.query(`
      SELECT c.id, c.name, c.ticket_price AS "ticketPrice", c.is_open AS "isOpen",
             (SELECT count(*) FROM secretaria.raffle_books b WHERE b.campaign_id=c.id) AS "books",
             (SELECT COALESCE(sum(b.amount_returned),0) FROM secretaria.raffle_books b WHERE b.campaign_id=c.id) AS "returned",
             (SELECT COALESCE(sum(b.amount_expected),0) FROM secretaria.raffle_books b WHERE b.campaign_id=c.id) AS "expected"
      FROM secretaria.raffle_campaigns c WHERE c.academic_year_id=$1 ORDER BY c.name`, [yid]);
  }

  @Post('campaigns') @Roles('secretaria_admin','secretaria_staff')
  async createCampaign(@Body() b: CampaignDto) {
    const yid = b.academicYearId || (await this.activeYearId());
    const r = await this.ds.query(
      `INSERT INTO secretaria.raffle_campaigns(name, academic_year_id, ticket_price, is_open) VALUES ($1,$2,$3,true) RETURNING id`,
      [b.name, yid, b.ticketPrice ?? 0]);
    return { ok: true, id: r[0].id };
  }

  @Patch('campaigns/:id') @Roles('secretaria_admin','secretaria_staff')
  async updateCampaign(@Param('id') id: string, @Body() b: CampaignDto) {
    await this.ds.query(
      `UPDATE secretaria.raffle_campaigns SET name=COALESCE($2,name), ticket_price=COALESCE($3,ticket_price), is_open=COALESCE($4,is_open) WHERE id=$1`,
      [id, b.name ?? null, b.ticketPrice ?? null, b.isOpen ?? null]);
    return { ok: true };
  }

  @Delete('campaigns/:id') @Roles('secretaria_admin')
  async deleteCampaign(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.raffle_campaigns WHERE id=$1`, [id]); // borra sus talonarios en cascada
    return { ok: true };
  }

  // ---- Talonarios (books) por familia ----
  @Get('campaigns/:id/books')
  books(@Param('id') id: string) {
    return this.ds.query(`
      SELECT b.id, b.family_id AS "familyId", f.display_name AS "familyName",
             b.range_start AS "rangeStart", b.range_end AS "rangeEnd",
             b.amount_expected AS "amountExpected", b.amount_returned AS "amountReturned", b.status, b.notes
      FROM secretaria.raffle_books b
      JOIN secretaria.families f ON f.id=b.family_id
      WHERE b.campaign_id=$1 ORDER BY f.display_name`, [id]);
  }

  @Post('campaigns/:id/books') @Roles('secretaria_admin','secretaria_staff')
  async addBook(@Param('id') id: string, @Body() b: BookDto) {
    let expected = b.amountExpected;
    if (expected == null && b.rangeStart != null && b.rangeEnd != null) {
      const c = await this.ds.query(`SELECT ticket_price FROM secretaria.raffle_campaigns WHERE id=$1`, [id]);
      expected = (b.rangeEnd - b.rangeStart + 1) * Number(c[0]?.ticket_price || 0);
    }
    const r = await this.ds.query(
      `INSERT INTO secretaria.raffle_books(campaign_id, family_id, range_start, range_end, amount_expected, amount_returned, status, notes)
       VALUES ($1,$2,$3,$4,$5,0,'entregado',$6) RETURNING id`,
      [id, b.familyId, b.rangeStart ?? null, b.rangeEnd ?? null, expected ?? 0, b.notes ?? null]);
    return { ok: true, id: r[0].id };
  }

  @Patch('books/:id') @Roles('secretaria_admin','secretaria_staff')
  async updateBook(@Param('id') id: string, @Body() b: BookUpdateDto) {
    await this.ds.query(
      `UPDATE secretaria.raffle_books SET amount_returned=COALESCE($2,amount_returned), status=COALESCE($3,status),
              amount_expected=COALESCE($4,amount_expected), notes=COALESCE($5,notes) WHERE id=$1`,
      [id, b.amountReturned ?? null, b.status ?? null, b.amountExpected ?? null, b.notes ?? null]);
    return { ok: true };
  }

  @Delete('books/:id') @Roles('secretaria_admin','secretaria_staff')
  async deleteBook(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.raffle_books WHERE id=$1`, [id]);
    return { ok: true };
  }
}
