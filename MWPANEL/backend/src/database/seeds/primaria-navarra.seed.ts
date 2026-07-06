import { DataSource } from 'typeorm';
import { SpecificCompetency } from '../../modules/competencies/entities/specific-competency.entity';
import { EvaluationCriterion } from '../../modules/competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../../modules/competencies/entities/basic-knowledge.entity';
import { Competency } from '../../modules/competencies/entities/competency.entity';
import { Subject } from '../../modules/students/entities/subject.entity';
import { Cycle } from '../../modules/students/entities/cycle.entity';
import { EducationalLevel, EducationalLevelCode } from '../../modules/students/entities/educational-level.entity';
import { PRIMARIA_AREAS, validatePrimariaCurriculum, Cycle as CycleKey } from './primaria-curriculum.data';

export const seedPrimariaNavarra = async (dataSource: DataSource): Promise<void> => {
  const errors = validatePrimariaCurriculum(PRIMARIA_AREAS);
  if (errors.length) throw new Error('Datos del currículo de Primaria inválidos:\n' + errors.join('\n'));

  const levelRepo = dataSource.getRepository(EducationalLevel);
  const subjectRepo = dataSource.getRepository(Subject);
  const cycleRepo = dataSource.getRepository(Cycle);
  const competencyRepo = dataSource.getRepository(Competency);
  const scRepo = dataSource.getRepository(SpecificCompetency);
  const criterionRepo = dataSource.getRepository(EvaluationCriterion);
  const knowledgeRepo = dataSource.getRepository(BasicKnowledge);

  const primaria = await levelRepo.findOne({ where: { code: EducationalLevelCode.PRIMARIA } });
  if (!primaria) throw new Error('Nivel educativo PRIMARIA no encontrado');

  const cycles = await cycleRepo.find({
    where: { educationalLevel: { id: primaria.id } },
    relations: ['educationalLevel'],
    order: { order: 'ASC' },
  });
  const cycleByKey: Record<CycleKey, Cycle | undefined> = {
    PRIMER: cycles.find((c) => c.order === 1),
    SEGUNDO: cycles.find((c) => c.order === 2),
    TERCER: cycles.find((c) => c.order === 3),
  };
  if (!cycleByKey.PRIMER || !cycleByKey.SEGUNDO || !cycleByKey.TERCER) {
    throw new Error('Faltan ciclos de Primaria (se esperan order 1/2/3)');
  }

  const keyByCode = new Map<string, Competency>();
  for (const k of await competencyRepo.find()) keyByCode.set(k.code, k);

  const created = { ce: 0, crit: 0, know: 0 };

  for (const area of PRIMARIA_AREAS) {
    const subject = await subjectRepo.findOne({ where: { code: area.subjectCode } });
    if (!subject) throw new Error(`Subject ${area.subjectCode} (${area.areaName}) no encontrado`);

    // Saberes (anclados al ÁREA + ciclo)
    for (const block of area.knowledgeBlocks) {
      const orderByCycle: Record<string, number> = {};
      for (const item of block.items) {
        const cyc = cycleByKey[item.cycle]!;
        orderByCycle[item.cycle] = (orderByCycle[item.cycle] || 0) + 1;
        const existing = await knowledgeRepo.findOne({
          where: { code: item.code, subject: { id: subject.id }, cycle: { id: cyc.id } },
        });
        if (!existing) {
          await knowledgeRepo.save(
            knowledgeRepo.create({
              code: item.code,
              block: block.letter,
              title: block.title,
              description: item.description,
              order: orderByCycle[item.cycle],
              knowledgeType: 'KNOWLEDGE',
              subject,
              cycle: cyc,
              // specificCompetency omitido: saber anclado al ÁREA
            }),
          );
          created.know += 1;
        }
      }
    }

    // Competencias específicas + criterios (por ciclo)
    for (const ce of area.competencies) {
      const ceCode = `CE${ce.code}`;
      let specific = await scRepo.findOne({
        where: { code: ceCode, subject: { id: subject.id } },
        relations: ['keyCompetencies'],
      });
      const keyComps = ce.keyCompetencyCodes.map((c) => keyByCode.get(c)).filter((k): k is Competency => !!k);

      if (!specific) {
        specific = await scRepo.save(
          scRepo.create({
            code: ceCode,
            name: ce.name,
            description: ce.description,
            order: Number(ce.code),
            subject,
            educationalLevel: primaria,
            keyCompetencies: keyComps,
          }),
        );
        created.ce += 1;
      } else if (!specific.keyCompetencies || specific.keyCompetencies.length === 0) {
        specific.keyCompetencies = keyComps;
        await scRepo.save(specific);
      }

      const orderByCycle: Record<string, number> = {};
      for (const crit of ce.criteria) {
        const cyc = cycleByKey[crit.cycle]!;
        orderByCycle[crit.cycle] = (orderByCycle[crit.cycle] || 0) + 1;
        const critCode = `${area.abbrev}-${crit.code}`; // "MAT-1.1"
        const existing = await criterionRepo.findOne({
          where: { code: critCode, specificCompetency: { id: specific.id }, cycle: { id: cyc.id } },
        });
        if (!existing) {
          await criterionRepo.save(
            criterionRepo.create({
              code: critCode,
              description: crit.description,
              order: orderByCycle[crit.cycle],
              specificCompetency: specific,
              cycle: cyc,
            }),
          );
          created.crit += 1;
        }
      }
    }
  }

  console.log(`✓ Seed Primaria Navarra: +${created.ce} CE, +${created.crit} criterios, +${created.know} saberes (nuevos).`);
};
