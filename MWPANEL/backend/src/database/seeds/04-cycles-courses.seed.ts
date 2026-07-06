import { DataSource } from 'typeorm';
import { EducationalLevel, EducationalLevelCode } from '../../modules/students/entities/educational-level.entity';
import { Cycle } from '../../modules/students/entities/cycle.entity';
import { Course } from '../../modules/students/entities/course.entity';

export const seedCyclesAndCourses = async (dataSource: DataSource): Promise<void> => {
  const educationalLevelRepository = dataSource.getRepository(EducationalLevel);
  const cycleRepository = dataSource.getRepository(Cycle);
  const courseRepository = dataSource.getRepository(Course);

  // Obtener niveles educativos
  const infantil = await educationalLevelRepository.findOne({
    where: { code: EducationalLevelCode.INFANTIL },
  });
  const primaria = await educationalLevelRepository.findOne({
    where: { code: EducationalLevelCode.PRIMARIA },
  });
  const secundaria = await educationalLevelRepository.findOne({
    where: { code: EducationalLevelCode.SECUNDARIA },
  });

  if (!infantil || !primaria || !secundaria) {
    throw new Error('Los niveles educativos deben existir primero');
  }

  // EDUCACIÓN INFANTIL - 2 ciclos
  const primerCicloInfantil = await cycleRepository.save({
    name: 'Primer Ciclo de Educación Infantil',
    order: 1,
    educationalLevel: infantil,
  });

  const segundoCicloInfantil = await cycleRepository.save({
    name: 'Segundo Ciclo de Educación Infantil',
    order: 2,
    educationalLevel: infantil,
  });

  // Cursos de Educación Infantil
  const cursosInfantil = [
    // Primer ciclo (0-3 años)
    { name: '0-1 años', code: '0EI', order: 1, ageReference: 0, cycle: primerCicloInfantil },
    { name: '1-2 años', code: '1EI', order: 2, ageReference: 1, cycle: primerCicloInfantil },
    { name: '2-3 años', code: '2EI', order: 3, ageReference: 2, cycle: primerCicloInfantil },
    // Segundo ciclo (3-6 años)
    { name: '3 años', code: '3EI', order: 4, ageReference: 3, cycle: segundoCicloInfantil },
    { name: '4 años', code: '4EI', order: 5, ageReference: 4, cycle: segundoCicloInfantil },
    { name: '5 años', code: '5EI', order: 6, ageReference: 5, cycle: segundoCicloInfantil },
  ];

  for (const curso of cursosInfantil) {
    await courseRepository.save(curso);
  }

  // EDUCACIÓN PRIMARIA - 3 ciclos
  const primerCicloPrimaria = await cycleRepository.save({
    name: 'Primer Ciclo de Educación Primaria',
    order: 1,
    educationalLevel: primaria,
  });

  const segundoCicloPrimaria = await cycleRepository.save({
    name: 'Segundo Ciclo de Educación Primaria',
    order: 2,
    educationalLevel: primaria,
  });

  const tercerCicloPrimaria = await cycleRepository.save({
    name: 'Tercer Ciclo de Educación Primaria',
    order: 3,
    educationalLevel: primaria,
  });

  // Cursos de Educación Primaria
  const cursosPrimaria = [
    // Primer ciclo
    { name: '1º Primaria', code: '1EP', order: 1, ageReference: 6, cycle: primerCicloPrimaria },
    { name: '2º Primaria', code: '2EP', order: 2, ageReference: 7, cycle: primerCicloPrimaria },
    // Segundo ciclo
    { name: '3º Primaria', code: '3EP', order: 3, ageReference: 8, cycle: segundoCicloPrimaria },
    { name: '4º Primaria', code: '4EP', order: 4, ageReference: 9, cycle: segundoCicloPrimaria },
    // Tercer ciclo
    { name: '5º Primaria', code: '5EP', order: 5, ageReference: 10, cycle: tercerCicloPrimaria },
    { name: '6º Primaria', code: '6EP', order: 6, ageReference: 11, cycle: tercerCicloPrimaria },
  ];

  for (const curso of cursosPrimaria) {
    await courseRepository.save(curso);
  }

  // EDUCACIÓN SECUNDARIA - Sin ciclos formales, pero 4 cursos
  // Crear un ciclo único para ESO (para mantener la estructura)
  const cicloESO = await cycleRepository.save({
    name: 'Educación Secundaria Obligatoria',
    order: 1,
    educationalLevel: secundaria,
  });

  // Cursos de ESO
  const cursosESO = [
    { name: '1º ESO', code: '1ESO', order: 1, ageReference: 12, cycle: cicloESO },
    { name: '2º ESO', code: '2ESO', order: 2, ageReference: 13, cycle: cicloESO },
    { name: '3º ESO', code: '3ESO', order: 3, ageReference: 14, cycle: cicloESO },
    { name: '4º ESO', code: '4ESO', order: 4, ageReference: 15, cycle: cicloESO },
  ];

  for (const curso of cursosESO) {
    await courseRepository.save(curso);
  }

  console.log('✅ Ciclos y cursos creados exitosamente:');
  console.log('  - Educación Infantil: 2 ciclos, 6 cursos');
  console.log('  - Educación Primaria: 3 ciclos, 6 cursos');
  console.log('  - ESO: 1 ciclo general, 4 cursos');
};