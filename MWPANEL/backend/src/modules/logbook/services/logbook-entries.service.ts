import { Injectable, NotFoundException, ForbiddenException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { LogbookEntry } from '../entities/logbook-entry.entity';
import { LogbookTag } from '../entities/logbook-tag.entity';
import { LogbookSeries } from '../entities/logbook-series.entity';
import { CreateLogbookEntryDto, UpdateLogbookEntryDto, LogbookEntryQueryDto } from '../dto/logbook-entry.dto';

@Injectable()
export class LogbookEntriesService {
  constructor(
    @InjectRepository(LogbookEntry)
    private readonly entriesRepository: Repository<LogbookEntry>,
    @InjectRepository(LogbookTag)
    private readonly tagsRepository: Repository<LogbookTag>,
    @InjectRepository(LogbookSeries)
    private readonly seriesRepository: Repository<LogbookSeries>,
    private readonly dataSource: DataSource,
  ) {}

  async createEntry(ownerUserId: string, createEntryDto: CreateLogbookEntryDto): Promise<LogbookEntry> {
    console.error('🔥🔥🔥 ENTRIES SERVICE createEntry called');
    console.error('🔥🔥🔥 repeatUntilCourseEnd:', createEntryDto.repeatUntilCourseEnd);

    // NUEVO: Si es una entrada recurrente, crear la serie
    if (createEntryDto.repeatUntilCourseEnd === true) {
      console.error('🔥🔥🔥 CREATING RECURRING SERIES FROM SERVICE!');
      return this.createRecurringSeries(ownerUserId, createEntryDto);
    }

    // Validar que la etiqueta pertenece al usuario si se especifica
    if (createEntryDto.tagId) {
      const tag = await this.tagsRepository.findOne({
        where: { id: createEntryDto.tagId, ownerUserId },
      });

      if (!tag) {
        throw new BadRequestException('La etiqueta especificada no existe o no te pertenece');
      }
    }

    // Validar horarios si se especifican
    if (createEntryDto.startedAtLocal && createEntryDto.endedAtLocal) {
      if (createEntryDto.startedAtLocal >= createEntryDto.endedAtLocal) {
        throw new BadRequestException('La hora de inicio debe ser anterior a la hora de fin');
      }
    }

    const entry = this.entriesRepository.create({
      ownerUserId,
      ...createEntryDto,
    });

    return this.entriesRepository.save(entry);
  }

  async getEntries(ownerUserId: string, query: LogbookEntryQueryDto): Promise<{ entries: LogbookEntry[]; total: number }> {
    const queryBuilder = this.entriesRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.tag', 'tag')
      .leftJoinAndSelect('entry.attachments', 'attachments')
      .where('entry.ownerUserId = :ownerUserId', { ownerUserId });

    // Filtro por rango de fechas
    if (query.startDate || query.endDate) {
      const startDate = query.startDate || '1900-01-01';
      const endDate = query.endDate || '2099-12-31';
      queryBuilder.andWhere('entry.dateLocal BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    // Filtro por etiqueta
    if (query.tagId) {
      queryBuilder.andWhere('entry.tagId = :tagId', { tagId: query.tagId });
    }

    // Búsqueda de texto
    if (query.search) {
      queryBuilder.andWhere(
        '(to_tsvector(\'spanish\', entry.title || \' \' || COALESCE(entry.contentPlain, \'\')) @@ plainto_tsquery(\'spanish\', :search))',
        { search: query.search }
      );
    }

    // Solo entradas fijadas
    if (query.pinnedOnly) {
      queryBuilder.andWhere('entry.pinned = true');
    }

    // Filtro de visibilidad
    if (query.visibility) {
      queryBuilder.andWhere('entry.visibility = :visibility', { visibility: query.visibility });
    }

    // Filtro por tipo de entrada (plantillas vs rellenadas)
    if (query.entryType && query.entryType !== 'all') {
      if (query.entryType === 'placeholders') {
        queryBuilder.andWhere('entry.isPlaceholder = true');
      } else if (query.entryType === 'filled') {
        queryBuilder.andWhere('entry.isPlaceholder = false');
      }
    }

    // Filtro por serie
    if (query.seriesId) {
      queryBuilder.andWhere('entry.seriesId = :seriesId', { seriesId: query.seriesId });
    }

    // Ordenamiento - SIEMPRE más reciente primero por defecto
    const orderField = query.sortBy || 'dateLocal';
    const orderDirection = query.sortOrder || 'DESC'; // Por defecto DESC para mostrar más reciente primero

    // Debug log para verificar ordenamiento
    console.log('🔍 Logbook getEntries - Ordenamiento:', {
      receivedSortBy: query.sortBy,
      receivedSortOrder: query.sortOrder,
      finalOrderField: orderField,
      finalOrderDirection: orderDirection,
      fullQuery: query
    });

    console.log('🔍 Query SQL generada:', queryBuilder.getSql());

    queryBuilder.orderBy(`entry.${orderField}`, orderDirection);

    // Paginación
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Máximo 100 por página
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    const [entries, total] = await queryBuilder.getManyAndCount();

    return { entries, total };
  }

  async getEntryById(id: string, ownerUserId: string): Promise<LogbookEntry> {
    const entry = await this.entriesRepository.findOne({
      where: { id },
      relations: ['tag', 'attachments', 'ownerUser'],
    });

    if (!entry) {
      throw new NotFoundException('Entrada de bitácora no encontrada');
    }

    if (entry.ownerUserId !== ownerUserId) {
      throw new ForbiddenException('No tienes permisos para acceder a esta entrada');
    }

    return entry;
  }

  async updateEntry(id: string, ownerUserId: string, updateEntryDto: UpdateLogbookEntryDto): Promise<LogbookEntry> {
    const entry = await this.getEntryById(id, ownerUserId);

    // Validar nueva etiqueta si se especifica
    if (updateEntryDto.tagId) {
      const tag = await this.tagsRepository.findOne({
        where: { id: updateEntryDto.tagId, ownerUserId },
      });

      if (!tag) {
        throw new BadRequestException('La etiqueta especificada no existe o no te pertenece');
      }
    }

    // Validar horarios si se actualizan
    const startTime = updateEntryDto.startedAtLocal || entry.startedAtLocal;
    const endTime = updateEntryDto.endedAtLocal || entry.endedAtLocal;

    if (startTime && endTime && startTime >= endTime) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la hora de fin');
    }

    Object.assign(entry, updateEntryDto);

    // Si era una plantilla y ahora tiene contenido, cambiar a no-placeholder
    if (entry.isPlaceholder && (updateEntryDto.title?.trim() || updateEntryDto.contentRich)) {
      entry.isPlaceholder = false;
    }

    return this.entriesRepository.save(entry);
  }

  async deleteEntry(id: string, ownerUserId: string): Promise<void> {
    const entry = await this.getEntryById(id, ownerUserId);
    await this.entriesRepository.remove(entry);
  }

  async checkSeriesDeletionInfo(entryId: string, ownerUserId: string): Promise<any> {
    const entry = await this.entriesRepository.findOne({
      where: { id: entryId, ownerUserId },
      relations: ['series'],
    });

    if (!entry) {
      throw new HttpException('Entrada no encontrada', HttpStatus.NOT_FOUND);
    }

    // Si no pertenece a una serie, se puede eliminar directamente
    if (!entry.seriesId) {
      return { requiresConfirmation: false };
    }

    // Obtener información de la serie
    const seriesId = entry.seriesId;
    const [seriesInfo, seriesEntryCount] = await Promise.all([
      this.seriesRepository.findOne({ where: { id: seriesId, ownerUserId } }),
      this.entriesRepository.count({ where: { seriesId, ownerUserId } })
    ]);

    if (!seriesInfo) {
      throw new HttpException('Serie no encontrada', HttpStatus.NOT_FOUND);
    }

    const remainingEntries = seriesEntryCount - 1; // Excluyendo la que se va a eliminar

    return {
      requiresConfirmation: true,
      series: {
        id: seriesInfo.id,
        ownerUserId: seriesInfo.ownerUserId,
        ruleRrule: seriesInfo.ruleRrule,
        startDate: seriesInfo.startDate,
        endDate: seriesInfo.endDate,
        startedAtLocal: seriesInfo.startedAtLocal,
        endedAtLocal: seriesInfo.endedAtLocal,
        tagId: seriesInfo.tagId,
        visibility: seriesInfo.visibility,
        createdAt: seriesInfo.createdAt,
        updatedAt: seriesInfo.updatedAt,
      },
      seriesEntryCount,
      remainingEntries,
      message: `Esta entrada forma parte de una serie con ${seriesEntryCount} entradas. ¿Deseas eliminar solo esta entrada o toda la serie?`
    };
  }

  async deleteEntryWithConfirmation(
    entryId: string,
    ownerUserId: string,
    deletionType: 'single' | 'all'
  ): Promise<{ deletedCount: number }> {
    const entry = await this.getEntryById(entryId, ownerUserId);

    if (deletionType === 'single') {
      // Eliminar solo la entrada específica
      await this.entriesRepository.remove(entry);
      return { deletedCount: 1 };
    } else if (deletionType === 'all' && entry.seriesId) {
      // Eliminar toda la serie
      const deletedEntries = await this.entriesRepository.find({
        where: { seriesId: entry.seriesId, ownerUserId }
      });

      await this.entriesRepository.remove(deletedEntries);

      // También eliminar el registro de la serie
      await this.seriesRepository.delete({
        id: entry.seriesId,
        ownerUserId
      });

      return { deletedCount: deletedEntries.length };
    } else {
      throw new HttpException('Tipo de eliminación inválido', HttpStatus.BAD_REQUEST);
    }
  }

  async togglePin(id: string, ownerUserId: string): Promise<LogbookEntry> {
    const entry = await this.getEntryById(id, ownerUserId);
    entry.pinned = !entry.pinned;
    return this.entriesRepository.save(entry);
  }

  async getWeekEntries(ownerUserId: string, weekStart: string): Promise<LogbookEntry[]> {
    // Calcular el domingo de la semana
    const startDate = new Date(weekStart);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Ir al domingo

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // Sábado de la misma semana

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    return this.entriesRepository.find({
      where: {
        ownerUserId,
        dateLocal: Between(startDateStr, endDateStr),
      },
      relations: ['tag', 'attachments'],
      order: { dateLocal: 'DESC', startedAtLocal: 'DESC' },
    });
  }

  async getMonthEntries(ownerUserId: string, year: number, month: number): Promise<LogbookEntry[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Último día del mes

    return this.entriesRepository.find({
      where: {
        ownerUserId,
        dateLocal: Between(startDate, endDate),
      },
      relations: ['tag', 'attachments'],
      order: { dateLocal: 'DESC', startedAtLocal: 'DESC' },
    });
  }

  async getEntryStats(ownerUserId: string): Promise<{
    totalEntries: number;
    totalDuration: number;
    avgEntriesPerDay: number;
    mostUsedTags: Array<{ tagName: string; count: number }>;
    recentActivity: Array<{ date: string; count: number }>;
  }> {
    // Total de entradas
    const totalEntries = await this.entriesRepository.count({ where: { ownerUserId } });

    // Duración total en minutos
    const durationResult = await this.entriesRepository
      .createQueryBuilder('entry')
      .select('SUM(entry.durationMin)', 'total')
      .where('entry.ownerUserId = :ownerUserId', { ownerUserId })
      .andWhere('entry.durationMin IS NOT NULL')
      .getRawOne();

    const totalDuration = parseInt(durationResult?.total || '0', 10);

    // Promedio de entradas por día (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const recentEntries = await this.entriesRepository.count({
      where: {
        ownerUserId,
        dateLocal: Between(thirtyDaysAgoStr, new Date().toISOString().split('T')[0]),
      },
    });

    const avgEntriesPerDay = recentEntries / 30;

    // Etiquetas más usadas - Fixed query to ensure tag name is included
    console.log('🟢 Starting mostUsedTags query for user:', ownerUserId);

    const mostUsedTags = await this.entriesRepository
      .createQueryBuilder('entry')
      .leftJoin('entry.tag', 'tag') // Use LEFT JOIN to include all entries
      .select([
        'COALESCE(tag.name, \'Sin etiqueta\') as "tagName"', // Use COALESCE to handle null tag names
        'COUNT(entry.id) as count'
      ])
      .where('entry.ownerUserId = :ownerUserId', { ownerUserId })
      .groupBy('tag.id, tag.name') // Group by tag fields
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    console.log('🟢 Raw mostUsedTags result:', JSON.stringify(mostUsedTags, null, 2));

    // Actividad reciente (últimos 7 días)
    const recentActivity = await this.entriesRepository
      .createQueryBuilder('entry')
      .select(['entry.dateLocal as date', 'COUNT(*) as count'])
      .where('entry.ownerUserId = :ownerUserId', { ownerUserId })
      .andWhere('entry.dateLocal >= :sevenDaysAgo', {
        sevenDaysAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      .groupBy('entry.dateLocal')
      .orderBy('entry.dateLocal', 'DESC')
      .getRawMany();

    return {
      totalEntries,
      totalDuration,
      avgEntriesPerDay: Math.round(avgEntriesPerDay * 100) / 100,
      mostUsedTags: mostUsedTags.map(tag => ({
        tagName: tag.tagName, // Now guaranteed to have a value from COALESCE
        count: parseInt(tag.count, 10),
      })),
      recentActivity: recentActivity.map(activity => ({
        date: activity.date,
        count: parseInt(activity.count, 10),
      })),
    };
  }

  async searchEntries(ownerUserId: string, searchTerm: string, limit = 10): Promise<LogbookEntry[]> {
    return this.entriesRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.tag', 'tag')
      .where('entry.ownerUserId = :ownerUserId', { ownerUserId })
      .andWhere(
        '(to_tsvector(\'spanish\', entry.title || \' \' || COALESCE(entry.contentPlain, \'\')) @@ plainto_tsquery(\'spanish\', :search))',
        { search: searchTerm }
      )
      .orderBy('entry.dateLocal', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Crea una serie de entradas recurrentes hasta fin de curso
   * MÉTODO TEMPORAL - La lógica debería estar en LogbookSeriesService
   */
  private async createRecurringSeries(ownerUserId: string, dto: CreateLogbookEntryDto): Promise<LogbookEntry> {
    console.error('🔥🔥🔥 STARTING createRecurringSeries!');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener fecha fin de curso (hardcoded por ahora)
      const courseEndDate = this.getCourseEndDate();
      console.error('🔥 Course end date:', courseEndDate);

      // 2. Generar fechas de ocurrencias
      const dates = this.generateOccurrenceDates(dto.dateLocal, courseEndDate);
      console.error('🔥 Generated', dates.length, 'dates');

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
      console.error('🔥 Series created with ID:', savedSeries.id);

      // 4. Crear entradas
      const entries = dates.map((date, index) => {
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
          isPlaceholder: true,
          pinned: false,
          durationMin: this.calculateDuration(dto.startedAtLocal, dto.endedAtLocal),
        });
      });

      console.error('🔥 About to save', entries.length, 'entries');
      await this.insertEntriesInBatches(queryRunner, entries);

      await queryRunner.commitTransaction();

      console.error('🔥 SUCCESS! Series created with', dates.length, 'entries');
      // Retornar la primera entrada
      return entries[0];

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('🔥 ERROR creating series:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private getCourseEndDate(): string {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const endYear = currentMonth >= 9 || currentMonth <= 2 ? currentYear + 1 : currentYear;
    return `${endYear}-06-30`;
  }

  private generateOccurrenceDates(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let current = new Date(start);
    let counter = 0;

    while (current <= end && counter < 100) {
      const dateStr = current.toISOString().split('T')[0];
      dates.push(dateStr);
      current.setDate(current.getDate() + 7); // Una semana
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

  private async insertEntriesInBatches(queryRunner: any, entries: LogbookEntry[], batchSize = 50): Promise<void> {
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      await queryRunner.manager.save(batch);
      console.error(`🔥 Saved batch ${Math.floor(i / batchSize) + 1}: entries ${i + 1} to ${Math.min(i + batchSize, entries.length)}`);
    }
  }
}