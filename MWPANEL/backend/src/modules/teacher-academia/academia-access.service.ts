import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AcademiaAccessService {
  private readonly logger = new Logger(AcademiaAccessService.name);
  /** userIds ya enlazados Y con rol concedido (cache por proceso; se re-verifica tras reinicio). */
  private readonly ensured = new Set<string>();

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** id de secretaria.teachers para un public.users.id (o null). */
  async resolveTeacherId(userId: string): Promise<string | null> {
    const r = await this.ds.query(
      `SELECT id FROM secretaria.teachers WHERE user_id=$1 AND is_active=true LIMIT 1`,
      [userId],
    );
    return r[0]?.id || null;
  }

  /** ¿es titular de ≥1 grupo de academia? (por user_id o por su public.teachers.id enlazado). */
  async ownsAcademiaGroups(userId: string): Promise<boolean> {
    const r = await this.ds.query(
      `SELECT count(*)::int AS n
       FROM secretaria.groups g
       JOIN secretaria.teachers t ON t.id=g.teacher_id
       WHERE t.user_id=$1`,
      [userId],
    );
    return (r[0]?.n || 0) > 0;
  }

  /**
   * Idempotente y fail-soft. (1) Si existe secretaria.teachers enlazado por
   * mwpanel_teacher_id pero sin user_id, lo fija. (2) Si el profesor posee grupos
   * de academia y no tiene el rol secretaria_teacher, lo concede. Nunca lanza.
   */
  async ensureTeacherAccess(userId: string): Promise<void> {
    if (this.ensured.has(userId)) return; // ya enlazado+concedido en este proceso
    try {
      // (1) Enlazar user_id si falta (match por public.teachers.id ↔ secretaria.teachers.mwpanel_teacher_id)
      let teacherId = await this.resolveTeacherId(userId);
      if (!teacherId) {
        const pt = await this.ds.query(`SELECT id FROM public.teachers WHERE "userId"=$1 LIMIT 1`, [userId]);
        const mwTeacherId = pt[0]?.id;
        if (mwTeacherId) {
          await this.ds.query(
            `UPDATE secretaria.teachers SET user_id=$1 WHERE mwpanel_teacher_id=$2 AND (user_id IS NULL OR user_id=$1)`,
            [userId, mwTeacherId],
          );
          teacherId = await this.resolveTeacherId(userId);
        }
      }
      if (!teacherId) return; // no es profesor de academia

      // (2) Conceder rol si posee grupos y no lo tiene ya
      if (await this.ownsAcademiaGroups(userId)) {
        await this.ds.query(
          `INSERT INTO secretaria.staff_roles(user_id, role)
           VALUES ($1, 'secretaria_teacher')
           ON CONFLICT DO NOTHING`,
          [userId],
        );
        // Cachear SOLO cuando está totalmente concedido; los profesores sin grupos
        // se re-verifican en cada request para recibir acceso al obtener un grupo.
        this.ensured.add(userId);
      }
    } catch (e: any) {
      this.logger.warn(`ensureTeacherAccess fail-soft para ${userId}: ${e?.message}`);
    }
  }
}
