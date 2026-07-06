import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntitySubscriberInterface, InsertEvent } from 'typeorm';
import { CurrentAcademicYearService } from './current-academic-year.service';

export const YEAR_STAMPED_TABLES = [
  'attendance_records',
  'centralized_grades',
  'exam_grades',
  'activities',
  'tasks',
  'evaluations',
  'educational_resources',
] as const;

const TARGET_TABLES = new Set<string>(YEAR_STAMPED_TABLES);

@Injectable()
export class AcademicYearStampSubscriber implements EntitySubscriberInterface {
  constructor(
    @InjectDataSource() dataSource: DataSource,
    private readonly current: CurrentAcademicYearService,
  ) {
    dataSource.subscribers.push(this);
  }

  async beforeInsert(event: InsertEvent<any>): Promise<void> {
    try {
      const table = event.metadata?.tableName;
      const entity = event.entity as any;
      if (!entity || !TARGET_TABLES.has(table)) return;
      if (entity.academicYearId != null) return;
      const id = await this.current.getCurrentId();
      if (id) entity.academicYearId = id;
    } catch {
      // Fail-safe: jamás romper un insert por el sello de año.
    }
  }
}
