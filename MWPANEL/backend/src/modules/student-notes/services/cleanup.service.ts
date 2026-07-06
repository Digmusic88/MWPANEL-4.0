import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedNote, SharedNoteStatus } from '../entities/shared-note.entity';

@Injectable()
export class SharedNotesCleanupService {
  private readonly logger = new Logger(SharedNotesCleanupService.name);

  constructor(
    @InjectRepository(SharedNote)
    private readonly sharedNoteRepository: Repository<SharedNote>,
  ) {}

  /**
   * CRON JOB: Limpieza automática de comparticiones expiradas
   * Se ejecuta todos los días a las 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async autoCleanupExpiredSharedNotes(): Promise<void> {
    this.logger.log('🧹 INICIANDO limpieza automática de comparticiones expiradas...');
    
    try {
      const cleanupResult = await this.cleanupExpiredSharedNotes();
      
      this.logger.log(`✅ LIMPIEZA COMPLETADA: ${cleanupResult.cleaned} comparticiones expiradas marcadas como REVOKED`);
      
      if (cleanupResult.cleaned > 0) {
        this.logger.log(`📊 DETALLES: ${cleanupResult.details.map(d => `${d.count} ${d.type}`).join(', ')}`);
      }
    } catch (error) {
      this.logger.error('❌ ERROR en limpieza automática:', error.message);
    }
  }

  /**
   * Limpieza manual de comparticiones expiradas
   */
  async cleanupExpiredSharedNotes(): Promise<{
    cleaned: number;
    details: Array<{ type: string; count: number }>;
  }> {
    const now = new Date();
    
    this.logger.log(`🔍 Buscando comparticiones expiradas antes de: ${now.toISOString()}`);

    // Buscar todas las comparticiones que están activas pero han expirado
    const expiredSharedNotes = await this.sharedNoteRepository
      .createQueryBuilder('sn')
      .where('sn.status = :status', { status: SharedNoteStatus.ACTIVE })
      .andWhere('sn.expiresAt IS NOT NULL')
      .andWhere('sn.expiresAt < :now', { now })
      .getMany();

    this.logger.log(`📋 Encontradas ${expiredSharedNotes.length} comparticiones expiradas`);

    if (expiredSharedNotes.length === 0) {
      return { cleaned: 0, details: [] };
    }

    // Agrupar por tipo para estadísticas
    const byType = expiredSharedNotes.reduce((acc, note) => {
      acc[note.sharedWithType] = (acc[note.sharedWithType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Marcar todas como REVOKED en una sola operación
    const updateResult = await this.sharedNoteRepository
      .createQueryBuilder()
      .update(SharedNote)
      .set({ 
        status: SharedNoteStatus.REVOKED,
        updatedAt: now
      })
      .where('id IN (:...ids)', { ids: expiredSharedNotes.map(sn => sn.id) })
      .execute();

    const details = Object.entries(byType).map(([type, count]) => ({
      type: `comparticiones con ${type}s`,
      count
    }));

    this.logger.log(`🧹 LIMPIEZA EXITOSA: ${updateResult.affected} registros actualizados`);
    
    return {
      cleaned: updateResult.affected || 0,
      details
    };
  }

  /**
   * Limpieza forzada - útil para testing o ejecución manual
   */
  async forceCleanupExpiredSharedNotes(): Promise<{
    success: boolean;
    message: string;
    cleaned: number;
    details: Array<{ type: string; count: number }>;
  }> {
    try {
      this.logger.log('🚨 LIMPIEZA FORZADA iniciada manualmente');
      
      const result = await this.cleanupExpiredSharedNotes();
      
      return {
        success: true,
        message: `Limpieza completada exitosamente. ${result.cleaned} comparticiones procesadas.`,
        cleaned: result.cleaned,
        details: result.details
      };
    } catch (error) {
      this.logger.error('❌ ERROR en limpieza forzada:', error);
      
      return {
        success: false,
        message: `Error durante la limpieza: ${error.message}`,
        cleaned: 0,
        details: []
      };
    }
  }

  /**
   * Obtener estadísticas de comparticiones por estado
   */
  async getCleanupStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
    needsCleanup: number;
  }> {
    const now = new Date();

    // Consulta con estadísticas agrupadas
    const stats = await this.sharedNoteRepository
      .createQueryBuilder('sn')
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN sn.status = :active THEN 1 END) as active',
        'COUNT(CASE WHEN sn.status = :revoked THEN 1 END) as revoked',
        'COUNT(CASE WHEN sn.status = :expired THEN 1 END) as expired',
        'COUNT(CASE WHEN sn.status = :active AND sn.expiresAt IS NOT NULL AND sn.expiresAt < :now THEN 1 END) as needsCleanup'
      ])
      .setParameters({
        active: SharedNoteStatus.ACTIVE,
        revoked: SharedNoteStatus.REVOKED,
        expired: SharedNoteStatus.EXPIRED,
        now
      })
      .getRawOne();

    return {
      total: parseInt(stats.total) || 0,
      active: parseInt(stats.active) || 0,
      expired: parseInt(stats.expired) || 0,
      revoked: parseInt(stats.revoked) || 0,
      needsCleanup: parseInt(stats.needsCleanup) || 0,
    };
  }
}