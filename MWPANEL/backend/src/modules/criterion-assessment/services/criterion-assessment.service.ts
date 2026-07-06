import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CriterionAssessment, CriterionScaleType } from '../entities/criterion-assessment.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { ApplicableCriteriaService } from './applicable-criteria.service';
import { CriterionScaleConfigService } from './criterion-scale-config.service';
import { CriterionNormalizationService } from './criterion-normalization.service';
import { BulkAssessmentDto } from '../dto/bulk-assessment.dto';
import { EvaluationPeriod, PeriodType } from '../../evaluations/entities/evaluation-period.entity';

@Injectable()
export class CriterionAssessmentService {
  constructor(
    @InjectRepository(CriterionAssessment) private readonly caRepo: Repository<CriterionAssessment>,
    @InjectRepository(SubjectAssignment) private readonly saRepo: Repository<SubjectAssignment>,
    @InjectRepository(EvaluationPeriod) private readonly epRepo: Repository<EvaluationPeriod>,
    private readonly applicable: ApplicableCriteriaService,
    private readonly scaleCfg: CriterionScaleConfigService,
    private readonly norm: CriterionNormalizationService,
  ) {}

  // SP-D3b: la capa de criterios usa el periodo CONTINUOUS del año de la asignatura
  async resolveContinuousPeriodId(subjectAssignmentId: string): Promise<string | null> {
    const assignment = await this.saRepo.findOne({ where: { id: subjectAssignmentId }, relations: ['academicYear'] });
    const academicYearId = (assignment as any)?.academicYear?.id;
    if (!academicYearId) return null;
    const period = await this.epRepo.createQueryBuilder('ep')
      .leftJoin('ep.academicYear', 'ay')
      .where('ep.type = :t', { t: PeriodType.CONTINUOUS })
      .andWhere('ay.id = :ay', { ay: academicYearId })
      .getOne();
    return period?.id ?? null;
  }

  /** Valida que evaluationPeriodId exista y pertenezca al año académico de la asignatura. Devuelve el id. */
  async validatePeriodForAssignment(subjectAssignmentId: string, evaluationPeriodId: string): Promise<string> {
    if (!evaluationPeriodId) throw new BadRequestException('evaluationPeriodId (trimestre) requerido');
    const assignment = await this.saRepo.findOne({ where: { id: subjectAssignmentId }, relations: ['academicYear'] });
    const academicYearId = (assignment as any)?.academicYear?.id;
    const period = await this.epRepo.findOne({ where: { id: evaluationPeriodId }, relations: ['academicYear'] });
    if (!academicYearId || !period || (period as any).academicYear?.id !== academicYearId) {
      throw new BadRequestException('El periodo no pertenece al año académico de la asignatura');
    }
    return evaluationPeriodId;
  }

  async assertTeacherAssignment(userId: string, role: string, subjectAssignmentId: string): Promise<SubjectAssignment> {
    const assignment = await this.saRepo.findOne({
      where: { id: subjectAssignmentId },
      relations: ['teacher', 'teacher.user'],
    });
    if (!assignment) throw new NotFoundException('Asignación no encontrada');
    if (role === 'admin') return assignment;
    if ((assignment as any).teacher?.user?.id !== userId) {
      throw new ForbiddenException('No tienes acceso a esta asignación');
    }
    return assignment;
  }

  async getGrid(userId: string, role: string, subjectAssignmentId: string, evaluationPeriodId: string) {
    await this.assertTeacherAssignment(userId, role, subjectAssignmentId);
    const { students, groups } = await this.applicable.getForAssignment(subjectAssignmentId);
    const scaleConfig = await this.scaleCfg.getEffectiveConfig(subjectAssignmentId);
    const periodId = await this.validatePeriodForAssignment(subjectAssignmentId, evaluationPeriodId);
    const assessments = await this.caRepo.find({ where: { subjectAssignmentId, evaluationPeriodId: periodId } });
    return { students, groups, scaleConfig, assessments };
  }

  async bulkUpsert(userId: string, role: string, dto: BulkAssessmentDto): Promise<{ saved: number }> {
    const assignment = await this.assertTeacherAssignment(userId, role, dto.subjectAssignmentId);
    const scale = await this.scaleCfg.getEffectiveConfig(dto.subjectAssignmentId);
    const periodId = await this.validatePeriodForAssignment(dto.subjectAssignmentId, dto.evaluationPeriodId);
    let saved = 0;
    for (const item of dto.items) {
      const normalizedScore = this.norm.normalize({
        scaleType: scale.scaleType,
        levelValue: item.levelValue ?? null,
        numericValue: item.numericValue ?? null,
        numericMax: scale.numericMax,
        levelMapping: scale.levelMapping,
      });
      let row = await this.caRepo.findOne({
        where: { studentId: item.studentId, evaluationCriterionId: item.evaluationCriterionId, evaluationPeriodId: periodId },
      });
      if (!row) {
        row = this.caRepo.create({
          studentId: item.studentId,
          evaluationCriterionId: item.evaluationCriterionId,
          evaluationPeriodId: periodId,
          subjectAssignmentId: dto.subjectAssignmentId,
        });
      }
      row.teacherId = (assignment as any).teacherId;
      row.scaleType = scale.scaleType;
      row.levelValue = scale.scaleType !== CriterionScaleType.NUMERIC ? (item.levelValue ?? null) : null;
      row.numericValue = scale.scaleType === CriterionScaleType.NUMERIC ? (item.numericValue ?? null) : null;
      row.normalizedScore = normalizedScore;
      row.observations = item.observations ?? null;
      row.assessedAt = new Date();
      row.source = 'manual'; // SP-D3b: lo que el profesor toca a mano manda sobre la derivación
      await this.caRepo.save(row);
      saved++;
    }
    return { saved };
  }

  async getStudentMarks(studentId: string, subjectAssignmentId: string, evaluationPeriodId: string): Promise<CriterionAssessment[]> {
    const periodId = await this.validatePeriodForAssignment(subjectAssignmentId, evaluationPeriodId);
    return this.caRepo.find({ where: { studentId, subjectAssignmentId, evaluationPeriodId: periodId } });
  }
}
