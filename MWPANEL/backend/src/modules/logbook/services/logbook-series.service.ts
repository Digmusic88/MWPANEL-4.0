import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LogbookSeries } from '../entities/logbook-series.entity';
import { LogbookEntry } from '../entities/logbook-entry.entity';
import { CreateLogbookEntryDto, CreateEntryWithSeriesResponseDto } from '../dto/logbook-entry.dto';

interface RepeatOptions {
  frequency?: 'WEEKLY';
  byDayFromDate?: boolean;
  onlySchoolDays?: boolean;
}

@Injectable()
export class LogbookSeriesService {
  constructor(
    @InjectRepository(LogbookSeries)
    private readonly seriesRepository: Repository<LogbookSeries>,
    @InjectRepository(LogbookEntry)
    private readonly entriesRepository: Repository<LogbookEntry>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Crea una serie de entradas recurrentes hasta fin de curso
   */
  async createRecurringSeries(
    ownerUserId: string,
    dto: CreateLogbookEntryDto,
  ): Promise<CreateEntryWithSeriesResponseDto> {
    console.log('🚀 Starting createRecurringSeries for user:', ownerUserId);
    console.log('🚀 DTO received:', JSON.stringify(dto, null, 2));

    if (!dto.repeatUntilCourseEnd) {
      throw new BadRequestException('Esta función requiere repeatUntilCourseEnd = true');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener fecha fin de curso
      const courseEndDate = await this.getCourseEndDate(ownerUserId);
      console.log('🏫 Course end date:', courseEndDate);

      // 2. Generar fechas de ocurrencias
      const dates = this.generateOccurrenceDates(
        dto.dateLocal,
        courseEndDate,
        dto.repeatOptions || {}
      );
      console.log('📅 Generated dates:', dates.length, 'dates from', dto.dateLocal, 'to', courseEndDate);
      console.log('📅 First 5 dates:', dates.slice(0, 5));

      if (dates.length > 200) {
        throw new BadRequestException('Demasiadas ocurrencias generadas (máximo 200)');
      }

      // 3. Crear serie
      const dayOfWeek = this.getDayOfWeek(dto.dateLocal);
      const series = queryRunner.manager.create(LogbookSeries, {
        ownerUserId,
        ruleRrule: `FREQ=WEEKLY;BYDAY=${dayOfWeek}`,
        startDate: dto.dateLocal,
        endDate: courseEndDate,
        startedAtLocal: dto.startedAtLocal || null,
        endedAtLocal: dto.endedAtLocal || null,
        tagId: dto.tagId || null,
        visibility: dto.visibility || 'private',
      });

      const savedSeries = await queryRunner.manager.save(series);

      // 4. Crear entradas
      console.log('🔧 Creating entries for', dates.length, 'dates');
      const entries = dates.map((date, index) => {
        // Para series recurrentes, todas las entradas son plantillas que el profesor rellenará
        const isPlaceholder = true;

        console.log(`🔧 Creating entry ${index + 1}/${dates.length} for date:`, date);

        return queryRunner.manager.create(LogbookEntry, {
          ownerUserId,
          seriesId: savedSeries.id,
          tagId: dto.tagId || null,
          dateLocal: date,
          startedAtLocal: dto.startedAtLocal || null,
          endedAtLocal: dto.endedAtLocal || null,
          visibility: dto.visibility || 'private',
          title: dto.title ? `${dto.title} - Plantilla` : 'Entrada - Plantilla',
          contentRich: { type: 'doc', content: [] },
          contentPlain: '',
          isPlaceholder,
          pinned: false,
          durationMin: this.calculateDuration(dto.startedAtLocal, dto.endedAtLocal),
        });
      });

      console.log('🔧 About to insert', entries.length, 'entries in batches');

      // Insertar en lotes para mejor rendimiento
      await this.insertEntriesInBatches(queryRunner, entries);

      console.log('✅ All entries inserted successfully');

      await queryRunner.commitTransaction();

      // 5. Retornar la primera entrada con información de la serie
      const firstEntry = entries[0];
      return {
        entry: {
          id: firstEntry.id,
          ownerUserId: firstEntry.ownerUserId,
          tagId: firstEntry.tagId,
          title: firstEntry.title,
          contentRich: firstEntry.contentRich,
          contentPlain: firstEntry.contentPlain,
          dateLocal: firstEntry.dateLocal,
          startedAtLocal: firstEntry.startedAtLocal,
          endedAtLocal: firstEntry.endedAtLocal,
          durationMin: firstEntry.durationMin,
          pinned: firstEntry.pinned,
          visibility: firstEntry.visibility,
          attachmentsCnt: 0,
          seriesId: savedSeries.id,
          isPlaceholder: firstEntry.isPlaceholder,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        series: {
          id: savedSeries.id,
          createdOccurrences: dates.length,
          endDate: courseEndDate,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Elimina entradas futuras de una serie desde una fecha específica
   */
  async deleteFutureEntries(entryId: string, ownerUserId: string, inclusive: boolean = false): Promise<number> {
    // 1. Obtener la entrada de referencia
    const entry = await this.entriesRepository.findOne({
      where: { id: entryId, ownerUserId },
    });

    if (!entry) {
      throw new NotFoundException('Entrada no encontrada');
    }

    if (!entry.seriesId) {
      throw new BadRequestException('Esta entrada no pertenece a una serie');
    }

    // 2. Construir query para entradas futuras
    const deleteQuery = this.entriesRepository.createQueryBuilder()
      .delete()
      .where('owner_user_id = :ownerUserId', { ownerUserId })
      .andWhere('series_id = :seriesId', { seriesId: entry.seriesId });

    if (inclusive) {
      deleteQuery.andWhere('date_local >= :dateLocal', { dateLocal: entry.dateLocal });
    } else {
      deleteQuery.andWhere('date_local > :dateLocal', { dateLocal: entry.dateLocal });
    }

    const result = await deleteQuery.execute();
    return result.affected || 0;
  }

  /**
   * Obtiene todas las entradas de una serie
   */
  async getSeriesEntries(seriesId: string, ownerUserId: string): Promise<LogbookEntry[]> {
    return this.entriesRepository.find({
      where: { seriesId, ownerUserId },
      relations: ['tag'],
      order: { dateLocal: 'ASC' },
    });
  }

  /**
   * Actualiza una serie (solo afecta a entradas placeholder futuras)
   */
  async updateSeries(
    seriesId: string,
    ownerUserId: string,
    updates: Partial<{
      endDate: string;
      tagId: string;
      visibility: string;
      startedAtLocal: string;
      endedAtLocal: string;
    }>
  ): Promise<LogbookSeries> {
    const series = await this.seriesRepository.findOne({
      where: { id: seriesId, ownerUserId },
    });

    if (!series) {
      throw new NotFoundException('Serie no encontrada');
    }

    // Actualizar la serie
    Object.assign(series, updates);
    const updatedSeries = await this.seriesRepository.save(series);

    // Actualizar solo entradas placeholder futuras
    if (updates.tagId !== undefined || updates.visibility !== undefined ||
        updates.startedAtLocal !== undefined || updates.endedAtLocal !== undefined) {
      const updateData: any = {};
      if (updates.tagId !== undefined) updateData.tagId = updates.tagId;
      if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
      if (updates.startedAtLocal !== undefined) updateData.startedAtLocal = updates.startedAtLocal;
      if (updates.endedAtLocal !== undefined) updateData.endedAtLocal = updates.endedAtLocal;

      await this.entriesRepository
        .createQueryBuilder()
        .update()
        .set(updateData)
        .where('series_id = :seriesId', { seriesId })
        .andWhere('owner_user_id = :ownerUserId', { ownerUserId })
        .andWhere('is_placeholder = true')
        .andWhere('date_local >= CURRENT_DATE')
        .execute();
    }

    return updatedSeries;
  }

  /**
   * Elimina una serie completa (solo entradas placeholder)
   */
  async deleteSeries(seriesId: string, ownerUserId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Eliminar solo entradas placeholder
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from(LogbookEntry)
        .where('series_id = :seriesId', { seriesId })
        .andWhere('owner_user_id = :ownerUserId', { ownerUserId })
        .andWhere('is_placeholder = true')
        .execute();

      // 2. Desanclar entradas no-placeholder (quitar series_id)
      await queryRunner.manager
        .createQueryBuilder()
        .update(LogbookEntry)
        .set({ seriesId: null })
        .where('series_id = :seriesId', { seriesId })
        .andWhere('owner_user_id = :ownerUserId', { ownerUserId })
        .execute();

      // 3. Eliminar la serie
      await queryRunner.manager.delete(LogbookSeries, { id: seriesId, ownerUserId });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Métodos privados de utilidad

  private async getCourseEndDate(ownerUserId: string): Promise<string> {
    // TODO: Integrar con sistema de cursos académicos
    // Por ahora, usar una fecha por defecto (fin del curso escolar típico)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Si estamos en el primer semestre (sep-feb), usar junio del año actual
    // Si estamos en el segundo semestre (mar-ago), usar junio del año siguiente
    const endYear = currentMonth >= 9 || currentMonth <= 2 ? currentYear + 1 : currentYear;
    return `${endYear}-06-30`; // Fin típico de curso
  }

  private generateOccurrenceDates(
    startDate: string,
    endDate: string,
    options: RepeatOptions
  ): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log('🔢 generateOccurrenceDates:', { startDate, endDate, start: start.toISOString(), end: end.toISOString() });

    let current = new Date(start);
    let counter = 0;

    while (current <= end && counter < 100) { // safety limit
      const dateStr = current.toISOString().split('T')[0];

      // TODO: Integrar con calendario lectivo si options.onlySchoolDays = true
      dates.push(dateStr);
      console.log(`📆 Added date ${counter + 1}:`, dateStr);

      // Avanzar una semana
      current.setDate(current.getDate() + 7);
      counter++;
    }

    return dates;
  }

  private getDayOfWeek(dateStr: string): string {
    const date = new Date(dateStr);
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    return days[date.getDay()];
  }

  private calculateDuration(startTime?: string, endTime?: string): number | null {
    if (!startTime || !endTime) return null;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes - startMinutes;
  }

  private extractPlainText(contentRich: any): string {
    // Extraer texto plano del contenido TipTap/ProseMirror
    if (!contentRich || !contentRich.content) return '';

    const extractText = (node: any): string => {
      if (node.type === 'text') return node.text || '';
      if (node.content) {
        return node.content.map((child: any) => extractText(child)).join(' ');
      }
      return '';
    };

    return contentRich.content.map((node: any) => extractText(node)).join('\n').trim();
  }

  private async insertEntriesInBatches(queryRunner: any, entries: LogbookEntry[], batchSize = 50): Promise<void> {
    console.log(`💾 insertEntriesInBatches: Processing ${entries.length} entries in batches of ${batchSize}`);

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      console.log(`💾 Saving batch ${Math.floor(i / batchSize) + 1}: entries ${i + 1} to ${Math.min(i + batchSize, entries.length)}`);

      const savedBatch = await queryRunner.manager.save(batch);
      console.log(`💾 Batch ${Math.floor(i / batchSize) + 1} saved successfully:`, savedBatch.length, 'entries saved');
    }

    console.log('💾 All batches processed successfully');
  }
}