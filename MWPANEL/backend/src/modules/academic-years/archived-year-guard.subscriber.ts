import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { CurrentAcademicYearService } from './current-academic-year.service';
import { YEAR_STAMPED_TABLES } from './academic-year-stamp.subscriber';

const GUARD_TABLES: readonly string[] = [...YEAR_STAMPED_TABLES, 'academic_records'];

/** Decisión pura y testeable: lanza si `yearId` es un año archivado conocido. */
export function assertNotArchived(
  yearId: string | null | undefined,
  archivedIds: Set<string>,
): void {
  if (yearId && archivedIds.has(yearId)) {
    throw new ForbiddenException(
      'Este año académico está archivado y es de solo lectura.',
    );
  }
}

@Injectable()
export class ArchivedYearGuardSubscriber implements EntitySubscriberInterface {
  constructor(
    @InjectDataSource() dataSource: DataSource,
    private readonly current: CurrentAcademicYearService,
  ) {
    dataSource.subscribers.push(this);
  }

  private isGuarded(tableName?: string): boolean {
    return !!tableName && GUARD_TABLES.includes(tableName);
  }

  private yearIdOf(entity: any, databaseEntity?: any): string | null {
    return (
      databaseEntity?.academicYearId ?? entity?.academicYearId ?? null
    );
  }

  private async check(yearId: string | null): Promise<void> {
    if (!yearId) return; // fail-open ante fallo de resolución
    try {
      const archived = await this.current.getArchivedIds();
      assertNotArchived(yearId, archived);
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      // fallo de infra: NO bloquear
    }
  }

  async beforeUpdate(event: UpdateEvent<any>): Promise<void> {
    if (!this.isGuarded(event.metadata?.tableName)) return;
    await this.check(this.yearIdOf(event.entity, event.databaseEntity));
  }

  async beforeRemove(event: RemoveEvent<any>): Promise<void> {
    if (!this.isGuarded(event.metadata?.tableName)) return;
    await this.check(this.yearIdOf(event.entity, event.databaseEntity));
  }

  async beforeInsert(event: InsertEvent<any>): Promise<void> {
    if (!this.isGuarded(event.metadata?.tableName)) return;
    await this.check(this.yearIdOf(event.entity));
  }
}
