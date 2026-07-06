import { DataSource } from 'typeorm';
import { EducationalLevel, EducationalLevelCode } from '../../modules/students/entities/educational-level.entity';

export const seedEducationalLevels = async (dataSource: DataSource): Promise<void> => {
  const educationalLevelRepository = dataSource.getRepository(EducationalLevel);

  const levels = [
    {
      name: 'Educación Infantil',
      code: EducationalLevelCode.INFANTIL,
      description: 'Etapa educativa de 0 a 6 años que atiende a niñas y niños desde el nacimiento hasta los seis años con la finalidad de contribuir a su desarrollo físico, afectivo, social, cognitivo y artístico.',
    },
    {
      name: 'Educación Primaria',
      code: EducationalLevelCode.PRIMARIA,
      description: 'Etapa educativa obligatoria de 6 a 12 años que comprende seis cursos académicos organizados en tres ciclos de dos años cada uno.',
    },
    {
      name: 'Educación Secundaria Obligatoria',
      code: EducationalLevelCode.SECUNDARIA,
      description: 'Etapa educativa obligatoria de 12 a 16 años que comprende cuatro cursos académicos organizados en dos ciclos.',
    },
  ];

  for (const levelData of levels) {
    const existingLevel = await educationalLevelRepository.findOne({
      where: { code: levelData.code },
    });

    if (!existingLevel) {
      const level = educationalLevelRepository.create(levelData);
      await educationalLevelRepository.save(level);
      console.log(`✓ Nivel educativo creado: ${levelData.name}`);
    } else {
      console.log(`→ Nivel educativo ya existe: ${levelData.name}`);
    }
  }
};