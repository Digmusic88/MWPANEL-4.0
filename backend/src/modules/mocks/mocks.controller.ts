import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { IsUUID, IsInt } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import * as fs from 'fs';

// Lectura SOLO LECTURA de la BD SQLite de Cambridge Mocks (regla: nunca modificar Mocks).
const MOCKS_DB = process.env.MOCKS_DB_PATH || '/mocks/database.db';
let sqlPromise: Promise<any> | null = null;
async function openMocks(): Promise<any> {
  if (!fs.existsSync(MOCKS_DB)) throw new BadRequestException('No se encuentra la base de datos de Cambridge Mocks');
  if (!sqlPromise) {
    const initSqlJs = require('sql.js');
    sqlPromise = initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
  }
  const SQL = await sqlPromise;
  return new SQL.Database(fs.readFileSync(MOCKS_DB)); // snapshot fresco en cada consulta
}
function queryAll(db: any, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql); stmt.bind(params);
  const out: any[] = []; while (stmt.step()) out.push(stmt.getAsObject()); stmt.free();
  return out;
}
const norm = (s: any) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

class LinkDto { @IsUUID() studentId: string; @IsInt() mockUserId: number; }

@Controller('secretaria/mocks')
@UseGuards(SecretariaAuthGuard)
export class MocksController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  // Lista de alumnos de Cambridge Mocks (con nº de resultados) + a qué alumno de secretaría están enlazados
  @Get('students') @Roles('secretaria_admin','secretaria_staff','direccion')
  async students(@Query('q') q?: string) {
    const db = await openMocks();
    try {
      const users = queryAll(db,
        `SELECT u.id, u.fullName, u.username,
                (SELECT count(*) FROM StudentResult r WHERE r.studentId=u.id) AS results
         FROM User u WHERE u.role='STUDENT' ${q ? "AND lower(u.fullName) LIKE '%'||lower(?)||'%'" : ''}
         ORDER BY u.fullName`, q ? [q] : []);
      // enlaces existentes en secretaría
      const links = await this.ds.query(`SELECT id, mock_user_id AS "mockUserId", first_name AS "firstName", last_name AS "lastName" FROM secretaria.students WHERE mock_user_id IS NOT NULL`);
      const linkByMock: any = {}; for (const l of links) linkByMock[l.mockUserId] = `${l.firstName || ''} ${l.lastName || ''}`.trim();
      return users.map((u: any) => ({ ...u, linkedTo: linkByMock[u.id] || null }));
    } finally { db.close(); }
  }

  // Resultados de un alumno de Mocks, agrupados por convocatoria de examen
  @Get('results/:mockUserId') @Roles('secretaria_admin','secretaria_staff','direccion')
  async results(@Param('mockUserId') mockUserId: string) {
    const id = parseInt(mockUserId, 10);
    if (isNaN(id)) throw new BadRequestException('Id no válido');
    const db = await openMocks();
    try {
      const u = queryAll(db, `SELECT fullName FROM User WHERE id=?`, [id])[0];
      const rows = queryAll(db, `
        SELECT ec.id AS examCallId, ec.name AS examName, ec.date AS examDate,
               ep.name AS part, sr.partScore AS score, sr.submissionStatus AS status
        FROM StudentResult sr
        JOIN ExamCall ec ON ec.id=sr.examCallId
        JOIN ExamPart ep ON ep.id=sr.partId
        WHERE sr.studentId=? ORDER BY ec.date DESC, ep.name`, [id]);
      const byCall: any = {};
      for (const r of rows) {
        byCall[r.examCallId] = byCall[r.examCallId] || { examName: r.examName, examDate: r.examDate, parts: [] };
        byCall[r.examCallId].parts.push({ part: r.part, score: r.score, status: r.status });
      }
      const calls = Object.values(byCall).map((c: any) => {
        const scored = c.parts.filter((p: any) => typeof p.score === 'number');
        const overall = scored.length ? Math.round((scored.reduce((a: number, p: any) => a + p.score, 0) / scored.length) * 10) / 10 : null;
        return { ...c, overall };
      });
      return { fullName: u?.fullName || '', calls };
    } finally { db.close(); }
  }

  // Sugerencias de emparejamiento por nombre entre alumnos de secretaría y usuarios de Mocks
  @Get('suggestions') @Roles('secretaria_admin','secretaria_staff','direccion')
  async suggestions() {
    const db = await openMocks();
    try {
      const mockUsers = queryAll(db, `SELECT id, fullName FROM User WHERE role='STUDENT'`);
      const byNorm: any = {}; for (const u of mockUsers) byNorm[norm(u.fullName)] = u.id;
      const secStudents = await this.ds.query(`
        SELECT id, COALESCE(NULLIF(TRIM(COALESCE(first_name,'')||' '||COALESCE(last_name,'')),''),'') AS name, mock_user_id AS "mockUserId"
        FROM secretaria.students WHERE is_active=true`);
      return secStudents
        .filter((s: any) => !s.mockUserId && byNorm[norm(s.name)])
        .map((s: any) => ({ studentId: s.id, name: s.name, mockUserId: byNorm[norm(s.name)] }));
    } finally { db.close(); }
  }

  @Post('link') @Roles('secretaria_admin','secretaria_staff')
  async link(@Body() b: LinkDto) {
    await this.ds.query(`UPDATE secretaria.students SET mock_user_id=$2 WHERE id=$1`, [b.studentId, b.mockUserId]);
    return { ok: true };
  }

  // Emparejamiento automático: enlaza por coincidencia exacta de nombre (normalizado)
  // todos los alumnos aún sin enlazar con su usuario de Cambridge Mocks.
  @Post('auto-link') @Roles('secretaria_admin','secretaria_staff')
  async autoLink() {
    const db = await openMocks();
    let linked = 0;
    try {
      const mockUsers = queryAll(db, `SELECT id, fullName FROM User WHERE role='STUDENT'`);
      const byNorm: any = {}; for (const u of mockUsers) byNorm[norm(u.fullName)] = u.id;
      const secStudents = await this.ds.query(`
        SELECT id, COALESCE(NULLIF(TRIM(COALESCE(first_name,'')||' '||COALESCE(last_name,'')),''),'') AS name, mock_user_id AS "mockUserId"
        FROM secretaria.students WHERE is_active=true`);
      const matches = secStudents.filter((s: any) => !s.mockUserId && byNorm[norm(s.name)]);
      for (const s of matches) {
        await this.ds.query(`UPDATE secretaria.students SET mock_user_id=$2 WHERE id=$1`, [s.id, byNorm[norm(s.name)]]);
        linked++;
      }
    } finally { db.close(); }
    return { ok: true, linked };
  }

  @Delete('link/:studentId') @Roles('secretaria_admin','secretaria_staff')
  async unlink(@Param('studentId') studentId: string) {
    await this.ds.query(`UPDATE secretaria.students SET mock_user_id=NULL WHERE id=$1`, [studentId]);
    return { ok: true };
  }
}
