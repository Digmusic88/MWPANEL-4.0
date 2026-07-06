/**
 * @archivo: grade-scheduler.service.ts
 * @módulo: Grades (Centralización de Valoraciones)
 * @función: Servicio de tareas programadas para el sistema de calificaciones
 * @crítico: SÍ - Automatización de procesos críticos
 * @actualizado: Julio 2025 - Sistema de tareas automatizadas
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CentralizedGrade } from '../entities/centralized-grade.entity';
import { GradeConfiguration } from '../entities/grade-configuration.entity';
import { CentralizedGradesService } from './centralized-grades.service';
import { CurrentAcademicYearService } from '../../academic-years/current-academic-year.service';

@Injectable()
export class GradeSchedulerService {
  private readonly logger = new Logger(GradeSchedulerService.name);

  constructor(
    @InjectRepository(CentralizedGrade)
    private centralizedGradeRepository: Repository<CentralizedGrade>,
    
    @InjectRepository(GradeConfiguration)
    private gradeConfigurationRepository: Repository<GradeConfiguration>,
    
    private centralizedGradesService: CentralizedGradesService,

    private readonly currentAcademicYearService: CurrentAcademicYearService,
  ) {}

  /**
   * Recálculo automático nocturno - 2:00 AM todos los días
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performNightlyRecalculation(): Promise<void> {
    this.logger.log('🌙 Iniciando recálculo nocturno de calificaciones centralizadas');

    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;

    try {
      // Buscar calificaciones que necesitan recálculo
      const gradesToRecalculate = await this.centralizedGradeRepository.find({
        where: { needsRecalculation: true },
        relations: ['gradeConfiguration'],
        take: 200, // Procesar en lotes de 200
      });

      this.logger.log(`📊 Encontradas ${gradesToRecalculate.length} calificaciones para recalcular`);

      // Procesar en lotes para evitar sobrecarga
      const batchSize = 10;
      for (let i = 0; i < gradesToRecalculate.length; i += batchSize) {
        const batch = gradesToRecalculate.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (grade) => {
            try {
              await this.centralizedGradesService.calculateCentralizedGrade({
                studentId: grade.studentId,
                subjectAssignmentId: grade.subjectAssignmentId,
                period: grade.period,
                forceRecalculation: true,
                includeAI: grade.gradeConfiguration?.enableAIAssessments || false,
              });

              processedCount++;
            } catch (error) {
              this.logger.error(`❌ Error recalculando ${grade.id}: ${error.message}`);
              errorCount++;
            }
          })
        );

        // Pequeña pausa entre lotes para no sobrecargar el sistema
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Recálculo nocturno completado en ${duration}ms`);
      this.logger.log(`📈 Estadísticas: ${processedCount} procesadas, ${errorCount} errores`);

    } catch (error) {
      this.logger.error(`❌ Error crítico en recálculo nocturno: ${error.message}`);
    }
  }

  /**
   * Limpieza de datos obsoletos - Domingos a las 3:00 AM
   */
  @Cron('0 3 * * 0') // Domingos a las 3:00 AM
  async performWeeklyCleanup(): Promise<void> {
    this.logger.log('🧹 Iniciando limpieza semanal de datos obsoletos');

    try {
      // Limpiar calificaciones marcadas como archivadas por más de 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const archivedYearIds = [...(await this.currentAcademicYearService.getArchivedIds())];
      const weeklyCleanupQb = this.centralizedGradeRepository
        .createQueryBuilder()
        .delete()
        .where('status = :status', { status: 'archived' })
        .andWhere('"updated_at" < :date', { date: thirtyDaysAgo });
      if (archivedYearIds.length > 0) {
        // NUNCA borrar notas que pertenecen a un año académico archivado (son el archivo inmutable)
        weeklyCleanupQb.andWhere(
          '("academicYearId" IS NULL OR "academicYearId" NOT IN (:...archivedYearIds))',
          { archivedYearIds },
        );
      }
      const archivedGradesCount = await weeklyCleanupQb.execute();

      this.logger.log(`🗑️ Eliminadas ${archivedGradesCount.affected} calificaciones archivadas`);

      // Limpiar configuraciones inactivas sin calificaciones asociadas
      const inactiveConfigs = await this.gradeConfigurationRepository.find({
        where: { isActive: false },
      });

      let deletedConfigsCount = 0;
      for (const config of inactiveConfigs) {
        const associatedGrades = await this.centralizedGradeRepository.count({
          where: { gradeConfigurationId: config.id },
        });

        if (associatedGrades === 0) {
          await this.gradeConfigurationRepository.remove(config);
          deletedConfigsCount++;
        }
      }

      this.logger.log(`🗑️ Eliminadas ${deletedConfigsCount} configuraciones inactivas sin uso`);

    } catch (error) {
      this.logger.error(`❌ Error en limpieza semanal: ${error.message}`);
    }
  }

  /**
   * Optimización de índices de base de datos - Primer día del mes a las 4:00 AM
   */
  @Cron('0 4 1 * *') // Primer día del mes a las 4:00 AM
  async performMonthlyOptimization(): Promise<void> {
    this.logger.log('⚡ Iniciando optimización mensual de base de datos');

    try {
      // Actualizar estadísticas de tablas (PostgreSQL)
      await this.centralizedGradeRepository.query('ANALYZE centralized_grades');
      await this.gradeConfigurationRepository.query('ANALYZE grade_configurations');

      // Limpiar datos temporales antiguos (más de 90 días)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const archivedYearIdsMonthly = [...(await this.currentAcademicYearService.getArchivedIds())];
      const monthlyOptimizationQb = this.centralizedGradeRepository
        .createQueryBuilder()
        .delete()
        .where('status = :status', { status: 'draft' })
        .andWhere('"created_at" < :date', { date: ninetyDaysAgo })
        .andWhere('"final_grade" = 0'); // Solo borradores sin calificación
      if (archivedYearIdsMonthly.length > 0) {
        // NUNCA borrar notas que pertenecen a un año académico archivado (son el archivo inmutable)
        monthlyOptimizationQb.andWhere(
          '("academicYearId" IS NULL OR "academicYearId" NOT IN (:...archivedYearIds))',
          { archivedYearIds: archivedYearIdsMonthly },
        );
      }
      const oldTemporaryGrades = await monthlyOptimizationQb.execute();

      this.logger.log(`🗑️ Eliminados ${oldTemporaryGrades.affected} borradores antiguos`);

      // Generar reporte de salud del sistema
      await this.generateSystemHealthReport();

      this.logger.log('✅ Optimización mensual completada');

    } catch (error) {
      this.logger.error(`❌ Error en optimización mensual: ${error.message}`);
    }
  }

  /**
   * Verificación de integridad de datos - Todos los días a las 1:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async performDailyIntegrityCheck(): Promise<void> {
    this.logger.log('🔍 Iniciando verificación diaria de integridad');

    try {
      // Verificar calificaciones sin configuración asociada
      const gradesWithoutConfig = await this.centralizedGradeRepository
        .createQueryBuilder('grade')
        .leftJoin('grade.gradeConfiguration', 'config')
        .where('config.id IS NULL')
        .getCount();

      if (gradesWithoutConfig > 0) {
        this.logger.warn(`⚠️ Encontradas ${gradesWithoutConfig} calificaciones sin configuración`);
      }

      // Verificar calificaciones con datos inconsistentes
      const gradesWithInconsistentData = await this.centralizedGradeRepository
        .createQueryBuilder('grade')
        .where('grade.finalGrade < 0 OR grade.finalGrade > 10')
        .getCount();

      if (gradesWithInconsistentData > 0) {
        this.logger.warn(`⚠️ Encontradas ${gradesWithInconsistentData} calificaciones con datos inconsistentes`);
      }

      // Verificar configuraciones con pesos inválidos
      const configs = await this.gradeConfigurationRepository.find();
      let invalidConfigs = 0;

      for (const config of configs) {
        if (!config.isWeightConfigurationValid()) {
          invalidConfigs++;
          this.logger.warn(`⚠️ Configuración ${config.id} tiene pesos inválidos (total: ${config.getTotalWeight()}%)`);
        }
      }

      if (invalidConfigs === 0 && gradesWithoutConfig === 0 && gradesWithInconsistentData === 0) {
        this.logger.log('✅ Verificación de integridad completada - Sin problemas detectados');
      } else {
        this.logger.log(`⚠️ Verificación completada - Problemas detectados: ${invalidConfigs + gradesWithoutConfig + gradesWithInconsistentData}`);
      }

    } catch (error) {
      this.logger.error(`❌ Error en verificación de integridad: ${error.message}`);
    }
  }

  /**
   * Sincronización de datos externos - Cada 6 horas
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async performDataSynchronization(): Promise<void> {
    this.logger.log('🔄 Iniciando sincronización de datos externos');

    try {
      // Marcar calificaciones que pueden necesitar recálculo basado en nuevos datos
      const recentlyUpdatedSources = await this.findRecentlyUpdatedSources();
      
      if (recentlyUpdatedSources.length > 0) {
        await this.centralizedGradeRepository
          .createQueryBuilder()
          .update()
          .set({ needsRecalculation: true })
          .where('studentId IN (:...studentIds)', { 
            studentIds: recentlyUpdatedSources.map(s => s.studentId) 
          })
          .execute();

        this.logger.log(`🔄 Marcadas ${recentlyUpdatedSources.length} calificaciones para recálculo por nuevos datos`);
      }

    } catch (error) {
      this.logger.error(`❌ Error en sincronización de datos: ${error.message}`);
    }
  }

  /**
   * Genera reporte de salud del sistema
   */
  private async generateSystemHealthReport(): Promise<void> {
    try {
      const totalGrades = await this.centralizedGradeRepository.count();
      const activeConfigs = await this.gradeConfigurationRepository.count({ 
        where: { isActive: true } 
      });
      const pendingRecalculations = await this.centralizedGradeRepository.count({
        where: { needsRecalculation: true }
      });

      this.logger.log('📊 REPORTE DE SALUD DEL SISTEMA:');
      this.logger.log(`   Total de calificaciones centralizadas: ${totalGrades}`);
      this.logger.log(`   Configuraciones activas: ${activeConfigs}`);
      this.logger.log(`   Recálculos pendientes: ${pendingRecalculations}`);
      
      // Calcular estadísticas de rendimiento
      const avgGrade = await this.centralizedGradeRepository
        .createQueryBuilder('grade')
        .select('AVG(grade.finalGrade)', 'average')
        .where('grade.status != :status', { status: 'archived' })
        .getRawOne();

      if (avgGrade?.average) {
        this.logger.log(`   Promedio general del sistema: ${parseFloat(avgGrade.average).toFixed(2)}`);
      }

    } catch (error) {
      this.logger.error(`❌ Error generando reporte de salud: ${error.message}`);
    }
  }

  /**
   * Busca fuentes de datos actualizadas recientemente
   */
  private async findRecentlyUpdatedSources(): Promise<any[]> {
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    // Este método debería consultar las tablas de tasks, activities, etc.
    // Por ahora retornamos un array vacío como placeholder
    return [];
  }

  /**
   * Fuerza un recálculo manual de todas las calificaciones
   */
  async forceFullRecalculation(): Promise<{ processed: number; errors: number }> {
    this.logger.log('🔄 Iniciando recálculo forzado de todas las calificaciones');

    let processed = 0;
    let errors = 0;

    try {
      const allGrades = await this.centralizedGradeRepository.find({
        relations: ['gradeConfiguration'],
      });

      for (const grade of allGrades) {
        try {
          await this.centralizedGradesService.calculateCentralizedGrade({
            studentId: grade.studentId,
            subjectAssignmentId: grade.subjectAssignmentId,
            period: grade.period,
            forceRecalculation: true,
            includeAI: grade.gradeConfiguration?.enableAIAssessments || false,
          });
          processed++;
        } catch (error) {
          errors++;
          this.logger.error(`Error recalculando ${grade.id}: ${error.message}`);
        }
      }

    } catch (error) {
      this.logger.error(`Error en recálculo forzado: ${error.message}`);
    }

    this.logger.log(`✅ Recálculo forzado completado: ${processed} procesadas, ${errors} errores`);
    return { processed, errors };
  }
}