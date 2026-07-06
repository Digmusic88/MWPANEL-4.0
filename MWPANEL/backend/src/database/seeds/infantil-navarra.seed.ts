import { DataSource } from 'typeorm';
import { SpecificCompetency } from '../../modules/competencies/entities/specific-competency.entity';
import { EvaluationCriterion } from '../../modules/competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../../modules/competencies/entities/basic-knowledge.entity';
import { Competency } from '../../modules/competencies/entities/competency.entity';
import { Subject } from '../../modules/students/entities/subject.entity';
import { Cycle } from '../../modules/students/entities/cycle.entity';
import {
  EducationalLevel,
  EducationalLevelCode,
} from '../../modules/students/entities/educational-level.entity';
import { INFANTIL_AREAS, validateInfantilCurriculum } from './infantil-curriculum.data';

export const seedInfantilNavarra = async (dataSource: DataSource): Promise<void> => {
  const errors = validateInfantilCurriculum(INFANTIL_AREAS);
  if (errors.length) {
    throw new Error('Datos del currículo de Infantil inválidos:\n' + errors.join('\n'));
  }

  const levelRepo = dataSource.getRepository(EducationalLevel);
  const subjectRepo = dataSource.getRepository(Subject);
  const cycleRepo = dataSource.getRepository(Cycle);
  const competencyRepo = dataSource.getRepository(Competency);
  const scRepo = dataSource.getRepository(SpecificCompetency);
  const criterionRepo = dataSource.getRepository(EvaluationCriterion);
  const knowledgeRepo = dataSource.getRepository(BasicKnowledge);

  const infantil = await levelRepo.findOne({ where: { code: EducationalLevelCode.INFANTIL } });
  if (!infantil) throw new Error('Nivel educativo INFANTIL no encontrado');

  const cycles = await cycleRepo.find({
    where: { educationalLevel: { id: infantil.id } },
    relations: ['educationalLevel'],
    order: { order: 'ASC' },
  });
  const segundoCiclo = cycles.find((c) => c.name.includes('Segundo')) ?? cycles[cycles.length - 1];
  if (!segundoCiclo) throw new Error('Segundo Ciclo de Infantil no encontrado');

  const keyByCode = new Map<string, Competency>();
  for (const k of await competencyRepo.find()) keyByCode.set(k.code, k);

  let created = { ce: 0, crit: 0, know: 0 };

  for (const area of INFANTIL_AREAS) {
    const subject = await subjectRepo.findOne({ where: { code: area.subjectCode } });
    if (!subject) throw new Error(`Subject ${area.subjectCode} (${area.areaName}) no encontrado`);

    // Saberes básicos (anclados al ÁREA + ciclo, sin CE)
    for (const block of area.knowledgeBlocks) {
      let order = 0;
      for (const item of block.items) {
        order += 1;
        const existing = await knowledgeRepo.findOne({
          where: { code: item.code, subject: { id: subject.id }, cycle: { id: segundoCiclo.id } },
        });
        if (!existing) {
          await knowledgeRepo.save(
            knowledgeRepo.create({
              code: item.code,
              block: block.letter,
              title: block.title,
              description: item.description,
              order,
              knowledgeType: 'KNOWLEDGE',
              subject,
              cycle: segundoCiclo,
              // specificCompetency se omite: saber anclado al ÁREA (columna nullable en BD).
            }),
          );
          created.know += 1;
        }
      }
    }

    // Competencias específicas + criterios (Segundo Ciclo).
    // Códigos persistidos según el esquema del usuario: CE -> "CE<n>"; criterio -> "<ABREV>-<n>.<m>".
    for (const ce of area.competencies) {
      const ceCode = `CE${ce.code}`; // p.ej. "CE1"
      let specific = await scRepo.findOne({
        where: { code: ceCode, subject: { id: subject.id } },
        relations: ['keyCompetencies'],
      });
      const keyComps = ce.keyCompetencyCodes
        .map((c) => keyByCode.get(c))
        .filter((k): k is Competency => !!k);

      if (!specific) {
        specific = await scRepo.save(
          scRepo.create({
            code: ceCode,
            name: ce.name,
            description: ce.description,
            order: Number(ce.code),
            subject,
            educationalLevel: infantil,
            keyCompetencies: keyComps,
          }),
        );
        created.ce += 1;
      } else if (!specific.keyCompetencies || specific.keyCompetencies.length === 0) {
        specific.keyCompetencies = keyComps;
        await scRepo.save(specific);
      }

      let order = 0;
      for (const crit of ce.criteria) {
        order += 1;
        const critCode = `${area.abbrev}-${crit.code}`; // p.ej. "CA-1.1"
        const existing = await criterionRepo.findOne({
          where: {
            code: critCode,
            specificCompetency: { id: specific.id },
            cycle: { id: segundoCiclo.id },
          },
        });
        if (!existing) {
          await criterionRepo.save(
            criterionRepo.create({
              code: critCode,
              description: crit.description,
              order,
              specificCompetency: specific,
              cycle: segundoCiclo,
            }),
          );
          created.crit += 1;
        }
      }
    }
  }

  console.log(
    `✓ Seed Infantil Navarra: +${created.ce} CE, +${created.crit} criterios, +${created.know} saberes (nuevos).`,
  );
};
