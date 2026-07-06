import { DataSource } from 'typeorm';
import { EducationalLevel, EducationalLevelCode } from '../../modules/students/entities/educational-level.entity';
import { Cycle } from '../../modules/students/entities/cycle.entity';
import { Course } from '../../modules/students/entities/course.entity';
import { Subject } from '../../modules/students/entities/subject.entity';
import { AcademicYear } from '../../modules/students/entities/academic-year.entity';

export const seedAcademicStructure = async (dataSource: DataSource): Promise<void> => {
  const educationalLevelRepository = dataSource.getRepository(EducationalLevel);
  const cycleRepository = dataSource.getRepository(Cycle);
  const courseRepository = dataSource.getRepository(Course);
  const subjectRepository = dataSource.getRepository(Subject);
  const academicYearRepository = dataSource.getRepository(AcademicYear);

  // Get educational levels
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
    throw new Error('Educational levels must be created first');
  }

  // Create Academic Year
  let currentAcademicYear = await academicYearRepository.findOne({
    where: { isCurrent: true },
  });

  if (!currentAcademicYear) {
    currentAcademicYear = academicYearRepository.create({
      name: '2023-2024',
      startDate: new Date('2023-09-01'),
      endDate: new Date('2024-06-30'),
      isCurrent: true,
    });
    await academicYearRepository.save(currentAcademicYear);
    console.log('✓ Año académico creado: 2023-2024');
  }

  // Create Cycles and Courses for Infantil
  const cyclesInfantil = [
    { name: 'Primer Ciclo', order: 1, courses: ['0-1 años', '1-2 años', '2-3 años'] },
    { name: 'Segundo Ciclo', order: 2, courses: ['3 años', '4 años', '5 años'] },
  ];

  for (const cycleData of cyclesInfantil) {
    let cycle = await cycleRepository.findOne({
      where: { name: cycleData.name, educationalLevel: { id: infantil.id } },
    });

    if (!cycle) {
      cycle = cycleRepository.create({
        name: cycleData.name,
        order: cycleData.order,
        educationalLevel: infantil,
      });
      await cycleRepository.save(cycle);
      console.log(`✓ Ciclo Infantil creado: ${cycleData.name}`);
    }

    // Create courses for this cycle
    for (let i = 0; i < cycleData.courses.length; i++) {
      const courseName = cycleData.courses[i];
      const existingCourse = await courseRepository.findOne({
        where: { name: courseName, cycle: { id: cycle.id } },
      });

      if (!existingCourse) {
        const course = courseRepository.create({
          name: courseName,
          order: i + 1,
          academicYear: currentAcademicYear.name,
          cycle,
        });
        await courseRepository.save(course);
        console.log(`✓ Curso Infantil creado: ${courseName}`);

        // Create subjects for Infantil courses
        const subjectsInfantil = [
          { name: 'Crecimiento en Armonía', code: 'CARM', weeklyHours: 8 },
          { name: 'Descubrimiento y Exploración del Entorno', code: 'DENT', weeklyHours: 6 },
          { name: 'Comunicación y Representación', code: 'CREP', weeklyHours: 8 },
          { name: 'Iniciación a la Lengua Extranjera (Inglés)', code: 'ING', weeklyHours: 2 },
          { name: 'Religión/Valores', code: 'REL', weeklyHours: 1 },
        ];

        for (const subjectData of subjectsInfantil) {
          const existingSubject = await subjectRepository.findOne({
            where: { code: `${subjectData.code}_${courseName}`, course: { id: course.id } },
          });

          if (!existingSubject) {
            const subject = subjectRepository.create({
              name: subjectData.name,
              code: `${subjectData.code}_${courseName}`,
              weeklyHours: subjectData.weeklyHours,
              course,
            });
            await subjectRepository.save(subject);
          }
        }
      }
    }
  }

  // Create Cycles and Courses for Primaria
  const cyclesPrimaria = [
    { name: 'Primer Ciclo', order: 1, courses: ['1º Primaria', '2º Primaria'] },
    { name: 'Segundo Ciclo', order: 2, courses: ['3º Primaria', '4º Primaria'] },
    { name: 'Tercer Ciclo', order: 3, courses: ['5º Primaria', '6º Primaria'] },
  ];

  for (const cycleData of cyclesPrimaria) {
    let cycle = await cycleRepository.findOne({
      where: { name: cycleData.name, educationalLevel: { id: primaria.id } },
    });

    if (!cycle) {
      cycle = cycleRepository.create({
        name: cycleData.name,
        order: cycleData.order,
        educationalLevel: primaria,
      });
      await cycleRepository.save(cycle);
      console.log(`✓ Ciclo Primaria creado: ${cycleData.name}`);
    }

    // Create courses for this cycle
    for (let i = 0; i < cycleData.courses.length; i++) {
      const courseName = cycleData.courses[i];
      let course = await courseRepository.findOne({
        where: { name: courseName, cycle: { id: cycle.id } },
      });

      if (!course) {
        course = courseRepository.create({
          name: courseName,
          order: i + 1,
          academicYear: currentAcademicYear.name,
          cycle,
        });
        await courseRepository.save(course);
        console.log(`✓ Curso Primaria creado: ${courseName}`);
      }

      // Create subjects for Primaria courses
      const subjectsPrimaria = [
        { name: 'Lengua Castellana y Literatura', code: 'LCL', weeklyHours: 5 },
        { name: 'Matemáticas', code: 'MAT', weeklyHours: 4 },
        { name: 'Conocimiento del Medio', code: 'CMNSC', weeklyHours: 3 },
        { name: 'Inglés', code: 'ING', weeklyHours: 3 },
        { name: 'Educación Artística', code: 'EAR', weeklyHours: 2 },
        { name: 'Educación Física', code: 'EF', weeklyHours: 2 },
        { name: 'Religión/Valores', code: 'REL', weeklyHours: 1 },
      ];

      for (const subjectData of subjectsPrimaria) {
        const existingSubject = await subjectRepository.findOne({
          where: { code: `${subjectData.code}_${course.name}`, course: { id: course.id } },
        });

        if (!existingSubject) {
          const subject = subjectRepository.create({
            name: subjectData.name,
            code: `${subjectData.code}_${course.name}`,
            weeklyHours: subjectData.weeklyHours,
            course,
          });
          await subjectRepository.save(subject);
        }
      }
    }
  }

  // Create Cycles and Courses for Secundaria
  const cyclesSecundaria = [
    { name: 'Primer Ciclo', order: 1, courses: ['1º ESO', '2º ESO', '3º ESO'] },
    { name: 'Segundo Ciclo', order: 2, courses: ['4º ESO'] },
  ];

  for (const cycleData of cyclesSecundaria) {
    let cycle = await cycleRepository.findOne({
      where: { name: cycleData.name, educationalLevel: { id: secundaria.id } },
    });

    if (!cycle) {
      cycle = cycleRepository.create({
        name: cycleData.name,
        order: cycleData.order,
        educationalLevel: secundaria,
      });
      await cycleRepository.save(cycle);
      console.log(`✓ Ciclo Secundaria creado: ${cycleData.name}`);
    }

    // Create courses for this cycle
    for (let i = 0; i < cycleData.courses.length; i++) {
      const courseName = cycleData.courses[i];
      let course = await courseRepository.findOne({
        where: { name: courseName, cycle: { id: cycle.id } },
      });

      if (!course) {
        course = courseRepository.create({
          name: courseName,
          order: i + 1,
          academicYear: currentAcademicYear.name,
          cycle,
        });
        await courseRepository.save(course);
        console.log(`✓ Curso Secundaria creado: ${courseName}`);
      }

      // Create subjects for Secundaria courses
      const subjectsSecundaria = [
        { name: 'Lengua Castellana y Literatura', code: 'LCL', weeklyHours: 4 },
        { name: 'Matemáticas', code: 'MAT', weeklyHours: 4 },
        { name: 'Inglés', code: 'ING', weeklyHours: 3 },
        { name: 'Geografía e Historia', code: 'GH', weeklyHours: 3 },
        { name: 'Biología y Geología', code: 'BG', weeklyHours: 3 },
        { name: 'Física y Química', code: 'FQ', weeklyHours: 3 },
        { name: 'Educación Física', code: 'EF', weeklyHours: 2 },
        { name: 'Religión/Valores Éticos', code: 'REL', weeklyHours: 1 },
        { name: 'Tecnología', code: 'TD', weeklyHours: 2 },
        { name: 'Educación Plástica', code: 'EPVA', weeklyHours: 2 },
        { name: 'Música', code: 'MUS', weeklyHours: 2 },
      ];

      for (const subjectData of subjectsSecundaria) {
        const existingSubject = await subjectRepository.findOne({
          where: { code: `${subjectData.code}_${course.name}`, course: { id: course.id } },
        });

        if (!existingSubject) {
          const subject = subjectRepository.create({
            name: subjectData.name,
            code: `${subjectData.code}_${course.name}`,
            weeklyHours: subjectData.weeklyHours,
            course,
          });
          await subjectRepository.save(subject);
        }
      }
    }
  }

  console.log('✓ Estructura académica creada exitosamente');
};