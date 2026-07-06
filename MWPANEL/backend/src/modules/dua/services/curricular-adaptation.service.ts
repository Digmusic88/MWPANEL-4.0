import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurricularAdaptation, CurricularAdaptationType } from '../entities/curricular-adaptation.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';

export interface UpsertAdaptationInput {
  studentId: string; subjectId: string; academicYearId: string;
  type: CurricularAdaptationType; notes?: string | null; startDate?: Date | null; endDate?: Date | null;
}

@Injectable()
export class CurricularAdaptationService {
  constructor(
    @InjectRepository(CurricularAdaptation) private readonly repo: Repository<CurricularAdaptation>,
    @InjectRepository(AcademicYear) private readonly ayRepo: Repository<AcademicYear>,
  ) {}

  async upsert(input: UpsertAdaptationInput, adminUserId: string): Promise<CurricularAdaptation> {
    const existing = await this.repo.findOne({ where: { studentId: input.studentId, subjectId: input.subjectId, academicYearId: input.academicYearId } });
    if (existing) {
      existing.type = input.type;
      existing.notes = input.notes ?? existing.notes ?? null;
      existing.startDate = input.startDate ?? existing.startDate ?? null;
      existing.endDate = input.endDate ?? existing.endDate ?? null;
      return this.repo.save(existing);
    }
    const row = this.repo.create({ ...input, notes: input.notes ?? null, startDate: input.startDate ?? null, endDate: input.endDate ?? null, createdBy: adminUserId });
    return this.repo.save(row);
  }

  async update(id: string, patch: Partial<UpsertAdaptationInput>): Promise<CurricularAdaptation> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Adaptación no encontrada');
    Object.assign(row, patch);
    return this.repo.save(row);
  }

  async remove(id: string): Promise<void> { await this.repo.delete(id); }

  listForStudent(studentId: string, academicYearId?: string): Promise<CurricularAdaptation[]> {
    const where: any = { studentId };
    if (academicYearId) where.academicYearId = academicYearId;
    return this.repo.find({ where, relations: ['subject', 'academicYear'] });
  }

  async getAdaptationMap(studentId: string, academicYearId: string): Promise<Map<string, { type: CurricularAdaptationType; notes: string | null }>> {
    const rows = await this.repo.find({ where: { studentId, academicYearId } });
    const map = new Map<string, { type: CurricularAdaptationType; notes: string | null }>();
    for (const r of rows) map.set((r as any).subjectId, { type: (r as any).type, notes: (r as any).notes ?? null });
    return map;
  }

  async getAdaptationMapByYearName(studentId: string, academicYearName: string) {
    const ay = await this.ayRepo.findOne({ where: { name: academicYearName } as any });
    if (!ay) return new Map();
    return this.getAdaptationMap(studentId, (ay as any).id);
  }
}
