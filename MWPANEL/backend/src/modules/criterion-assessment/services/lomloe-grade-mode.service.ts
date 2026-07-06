import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubjectLomloeGradeMode, LomloeGradeMode } from '../entities/subject-lomloe-grade-mode.entity';

@Injectable()
export class LomloeGradeModeService {
  constructor(
    @InjectRepository(SubjectLomloeGradeMode) private readonly repo: Repository<SubjectLomloeGradeMode>,
  ) {}

  async getMode(subjectAssignmentId: string, gradePeriod: string): Promise<LomloeGradeMode> {
    // Defensa: un gradePeriod vacío haría where:{gradePeriod:undefined}, que TypeORM
    // descarta → devolvería una fila arbitraria de la asignatura. Default seguro.
    if (!gradePeriod) return 'parallel';
    const row = await this.repo.findOne({ where: { subjectAssignmentId, gradePeriod } });
    return (row?.mode as LomloeGradeMode) ?? 'parallel';
  }

  async setMode(subjectAssignmentId: string, gradePeriod: string, mode: LomloeGradeMode, userId: string): Promise<void> {
    let row = await this.repo.findOne({ where: { subjectAssignmentId, gradePeriod } });
    if (!row) row = this.repo.create({ subjectAssignmentId, gradePeriod });
    row.mode = mode;
    row.updatedById = userId ?? null;
    await this.repo.save(row);
  }
}
