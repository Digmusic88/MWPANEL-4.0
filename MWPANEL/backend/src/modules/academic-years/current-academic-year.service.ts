import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicYear } from '../students/entities/academic-year.entity';

const TTL_MS = 60_000;

@Injectable()
export class CurrentAcademicYearService {
  private cachedId: string | null = null;
  private cachedAt = 0;
  private cachedArchived: Set<string> | null = null;
  private cachedArchivedAt = 0;

  constructor(
    @InjectRepository(AcademicYear) private readonly repo: Repository<AcademicYear>,
  ) {}

  async getCurrentId(): Promise<string | null> {
    const now = Date.now();
    if (this.cachedId !== null && now - this.cachedAt < TTL_MS) return this.cachedId;
    const year = await this.repo.findOne({ where: { isCurrent: true } });
    this.cachedId = year?.id ?? null;
    this.cachedAt = now;
    return this.cachedId;
  }

  async getArchivedIds(): Promise<Set<string>> {
    const now = Date.now();
    if (this.cachedArchived && now - this.cachedArchivedAt < TTL_MS) {
      return this.cachedArchived;
    }
    const rows = await this.repo.find({ where: { isArchived: true } });
    this.cachedArchived = new Set(rows.map((r) => r.id));
    this.cachedArchivedAt = now;
    return this.cachedArchived;
  }

  invalidate(): void {
    this.cachedId = null;
    this.cachedAt = 0;
    this.cachedArchived = null;
    this.cachedArchivedAt = 0;
  }
}
