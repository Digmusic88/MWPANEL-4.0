import { DataSource } from 'typeorm';
import { SpecificCompetency } from '../../modules/competencies/entities/specific-competency.entity';
import { EvaluationCriterion } from '../../modules/competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../../modules/competencies/entities/basic-knowledge.entity';
import { Competency } from '../../modules/competencies/entities/competency.entity';
import { Subject } from '../../modules/students/entities/subject.entity';
import { Course } from '../../modules/students/entities/course.entity';
import { EducationalLevel, EducationalLevelCode } from '../../modules/students/entities/educational-level.entity';
import { SECUNDARIA_AREAS, validateSecundariaCurriculum, Course as CourseKey } from './secundaria-curriculum.data';

export const seedSecundariaNavarra = async (dataSource: DataSource): Promise<void> => {
  const errors = validateSecundariaCurriculum(SECUNDARIA_AREAS);
  if (errors.length) throw new Error('Datos del currículo de Secundaria inválidos:\n' + errors.join('\n'));

  const levelRepo = dataSource.getRepository(EducationalLevel);
  const subjectRepo = dataSource.getRepository(Subject);
  const courseRepo = dataSource.getRepository(Course);
  const competencyRepo = dataSource.getRepository(Competency);
  const scRepo = dataSource.getRepository(SpecificCompetency);
  const criterionRepo = dataSource.getRepository(EvaluationCriterion);
  const knowledgeRepo = dataSource.getRepository(BasicKnowledge);

  const secundaria = await levelRepo.findOne({ where: { code: EducationalLevelCode.SECUNDARIA } });
  if (!secundaria) throw new Error('Nivel educativo SECUNDARIA no encontrado');

  const allCourses = await courseRepo.find({ relations: ['cycle', 'cycle.educationalLevel'] });
  const findCourse = (name: string) => allCourses.find((c) => c.name === name);
  const courseByKey: Record<CourseKey, Course> = {
    '1ESO': findCourse('1º ESO')!,
    '2ESO': findCourse('2º ESO')!,
    '3ESO': findCourse('3º ESO')!,
    '4ESO': findCourse('4º ESO')!,
  };
  if (!courseByKey['1ESO'] || !courseByKey['2ESO'] || !courseByKey['3ESO'] || !courseByKey['4ESO']) {
    throw new Error(
      'Faltan cursos de Secundaria (se esperan "1º ESO", "2º ESO", "3º ESO", "4º ESO" en la tabla courses)',
    );
  }

  const keyByCode = new Map<string, Competency>();
  for (const k of await competencyRepo.find()) keyByCode.set(k.code, k);

  const created = { ce: 0, crit: 0, know: 0 };

  for (const area of SECUNDARIA_AREAS) {
    const subject = await subjectRepo.findOne({ where: { code: area.subjectCode } });
    if (!subject) throw new Error(`Subject ${area.subjectCode} (${area.areaName}) no encontrado`);

    // Saberes (anclados al ÁREA + curso)
    for (const block of area.knowledgeBlocks) {
      const orderByCourse: Record<string, number> = {};
      for (const item of block.items) {
        const course = courseByKey[item.course];
        orderByCourse[item.course] = (orderByCourse[item.course] || 0) + 1;
        const existing = await knowledgeRepo.findOne({
          where: { code: item.code, subject: { id: subject.id }, course: { id: course.id } },
        });
        if (!existing) {
          await knowledgeRepo.save(
            knowledgeRepo.create({
              code: item.code,
              block: block.letter,
              title: block.title,
              description: item.description,
              order: orderByCourse[item.course],
              knowledgeType: 'KNOWLEDGE',
              subject,
              course,
              // specificCompetency omitido: saber anclado al ÁREA
            }),
          );
          created.know += 1;
        }
      }
    }

    // Competencias específicas + criterios (por curso)
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
            educationalLevel: secundaria,
            keyCompetencies: keyComps,
          }),
        );
        created.ce += 1;
      } else if (!specific.keyCompetencies || specific.keyCompetencies.length === 0) {
        specific.keyCompetencies = keyComps;
        await scRepo.save(specific);
      }

      const orderByCourse: Record<string, number> = {};
      for (const crit of ce.criteria) {
        const course = courseByKey[crit.course];
        orderByCourse[crit.course] = (orderByCourse[crit.course] || 0) + 1;
        const critCode = `${area.abbrev}-${crit.code}`; // "MAT-1.1"
        const existing = await criterionRepo.findOne({
          where: { code: critCode, specificCompetency: { id: specific.id }, course: { id: course.id } },
        });
        if (!existing) {
          await criterionRepo.save(
            criterionRepo.create({
              code: critCode,
              description: crit.description,
              order: orderByCourse[crit.course],
              specificCompetency: specific,
              course,
            }),
          );
          created.crit += 1;
        }
      }
    }
  }

  console.log(`✓ Seed Secundaria Navarra: +${created.ce} CE, +${created.crit} criterios, +${created.know} saberes (nuevos).`);
};
