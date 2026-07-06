import { Injectable, NotFoundException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurriculumGeneration, GenerationStatus } from '../entities/curriculum-generation.entity';
import { SpecificCompetency } from '../../competencies/entities/specific-competency.entity';
import { EvaluationCriterion } from '../../competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../../competencies/entities/basic-knowledge.entity';
import { Subject } from '../../students/entities/subject.entity';
import { Competency } from '../../competencies/entities/competency.entity';

const VALID_KEYS = new Set(['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC']);

@Injectable()
export class CurriculumApplyService {
  constructor(
    @InjectRepository(CurriculumGeneration) private readonly genRepo: Repository<CurriculumGeneration>,
    @InjectRepository(SpecificCompetency) private readonly specRepo: Repository<SpecificCompetency>,
    @InjectRepository(EvaluationCriterion) private readonly critRepo: Repository<EvaluationCriterion>,
    @InjectRepository(BasicKnowledge) private readonly knowRepo: Repository<BasicKnowledge>,
    @InjectRepository(Subject) private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(Competency) private readonly compRepo: Repository<Competency>,
  ) {}

  async apply(generationId: string, userId: string) {
    const gen = await this.genRepo.findOne({ where: { id: generationId } });
    if (!gen) throw new NotFoundException('Generación no encontrada');
    if (gen.status === GenerationStatus.APPLIED) throw new ConflictException('Esta generación ya fue aplicada');

    // Resolver el Subject del ámbito: la variante cuyo courseId corresponde al curso, o la 1ª del nombre.
    const subjects = await this.subjectRepo.find({ where: { name: gen.subjectName } });
    if (subjects.length === 0) throw new UnprocessableEntityException('No existe asignatura con ese nombre');
    const subject = (gen.scopeType === 'course' ? subjects.find((s) => s.courseId === gen.scopeId) : null) || subjects[0];

    const scopeCols = gen.scopeType === 'course'
      ? { courseId: gen.scopeId, cycleId: null }
      : { cycleId: gen.scopeId, courseId: null };
    const allKeys = await this.compRepo.find();
    const keyByCode = new Map(allKeys.map((k) => [k.code, k]));
    const invalidKeyCodes = new Set<string>();
    let specificsCreated = 0, criteriaCreated = 0, knowledgeCreated = 0, skippedExisting = 0;

    for (const sc of gen.payload.specificCompetencies || []) {
      let spec = await this.specRepo.findOne({ where: { code: sc.code, subjectId: subject.id } });
      if (!spec) {
        const keyComps = (sc.keyCompetencyCodes || []).map((c: string) => {
          if (!VALID_KEYS.has(c)) { invalidKeyCodes.add(c); return null; }
          return keyByCode.get(c) || null;
        }).filter(Boolean);
        spec = await this.specRepo.save(this.specRepo.create({
          code: sc.code, name: sc.name, description: sc.description, order: 0,
          subjectId: subject.id, educationalLevelId: gen.educationalLevelId, keyCompetencies: keyComps as any,
        }));
        specificsCreated++;
      } else { skippedExisting++; }
      let order = 0;
      for (const cr of sc.criteria || []) {
        const exists = await this.critRepo.findOne({ where: { code: cr.code, specificCompetencyId: spec.id, ...scopeCols } as any });
        if (exists) { skippedExisting++; continue; }
        await this.critRepo.save(this.critRepo.create({
          code: cr.code, description: cr.description, order: order++,
          specificCompetencyId: spec.id, ...scopeCols,
        } as any));
        criteriaCreated++;
      }
    }
    let korder = 0;
    for (const bk of gen.payload.basicKnowledge || []) {
      const exists = await this.knowRepo.findOne({ where: { code: bk.code, subjectId: subject.id, ...scopeCols } as any });
      if (exists) { skippedExisting++; continue; }
      await this.knowRepo.save(this.knowRepo.create({
        code: bk.code, block: bk.block, title: bk.title, description: bk.description,
        order: korder++, knowledgeType: ['KNOWLEDGE', 'SKILL', 'ATTITUDE'].includes(bk.knowledgeType) ? bk.knowledgeType : 'KNOWLEDGE',
        subjectId: subject.id, ...scopeCols,
      } as any));
      knowledgeCreated++;
    }

    gen.status = GenerationStatus.APPLIED;
    gen.appliedBy = userId;
    gen.appliedAt = new Date();
    await this.genRepo.save(gen);
    return { specificsCreated, criteriaCreated, knowledgeCreated, skippedExisting, invalidKeyCodes: [...invalidKeyCodes] };
  }
}
