import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CriterionAssessment } from '../entities/criterion-assessment.entity';
import { EvaluationCriterion } from '../../competencies/entities/evaluation-criterion.entity';
import { SpecificCompetency } from '../../competencies/entities/specific-competency.entity';

@Injectable()
export class CompetencyValuationService {
  constructor(
    @InjectRepository(CriterionAssessment) private readonly caRepo: Repository<CriterionAssessment>,
    @InjectRepository(EvaluationCriterion) private readonly critRepo: Repository<EvaluationCriterion>,
    @InjectRepository(SpecificCompetency) private readonly scRepo: Repository<SpecificCompetency>,
  ) {}

  async getValuation(studentId: string, subjectAssignmentId: string, evaluationPeriodId: string) {
    const assessments = await this.caRepo.find({ where: { studentId, subjectAssignmentId, evaluationPeriodId } });
    return this.aggregate(assessments);
  }

  // Agrega TODOS los CriterionAssessment del alumno (todas sus asignaturas). Si se pasa
  // evaluationPeriodId, filtra por ese periodo; si no, agrega across periodos (los datos
  // derivados de D3b viven en el periodo CONTINUOUS → agregar-todo los incluye).
  async getStudentValuation(studentId: string, evaluationPeriodId?: string) {
    const where: any = { studentId };
    if (evaluationPeriodId) where.evaluationPeriodId = evaluationPeriodId;
    const assessments = await this.caRepo.find({ where });
    return this.aggregate(assessments);
  }

  private async aggregate(assessments: CriterionAssessment[]) {
    if (assessments.length === 0) return { bySpecific: [], byKey: [], hasData: false };

    const critIds = [...new Set(assessments.map((a) => a.evaluationCriterionId))];
    const criteria = await this.critRepo.find({ where: { id: In(critIds) } });
    const critToSpec = new Map(criteria.map((c: any) => [c.id, c.specificCompetencyId]));

    const bySpecAcc = new Map<string, { sum: number; n: number }>();
    for (const a of assessments) {
      const sc = critToSpec.get(a.evaluationCriterionId);
      if (!sc) continue;
      const acc = bySpecAcc.get(sc) || { sum: 0, n: 0 };
      acc.sum += Number(a.normalizedScore); acc.n += 1; bySpecAcc.set(sc, acc);
    }
    const specIds = [...bySpecAcc.keys()];
    const specs = await this.scRepo.find({ where: { id: In(specIds) }, relations: ['keyCompetencies'] });

    const bySpecific = specs.map((sc: any) => {
      const acc = bySpecAcc.get(sc.id)!;
      return { id: sc.id, code: sc.code, name: sc.name, score: Math.round((acc.sum / acc.n) * 100) / 100 };
    });

    const byKeyAcc = new Map<string, { code: string; name: string; sum: number; n: number }>();
    for (const sc of specs as any[]) {
      const specScore = bySpecific.find((s) => s.id === sc.id)!.score;
      for (const k of sc.keyCompetencies || []) {
        const acc = byKeyAcc.get(k.code) || { code: k.code, name: k.name, sum: 0, n: 0 };
        acc.sum += specScore; acc.n += 1; byKeyAcc.set(k.code, acc);
      }
    }
    const byKey = [...byKeyAcc.values()].map((k) => ({ code: k.code, name: k.name, score: Math.round((k.sum / k.n) * 100) / 100 }));

    return { bySpecific, byKey, hasData: true };
  }
}
