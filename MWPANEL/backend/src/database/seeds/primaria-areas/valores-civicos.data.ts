import { AreaData } from '../primaria-curriculum.data';

// Currículo Educación en Valores Cívicos y Éticos — Primaria Navarra (Anexo II, pp. 32–37).
// Área impartida SOLO en el 3er ciclo (5º–6º). Código de materia: VCE-5P.
// Tabla de saberes básicos: columna ÚNICA (sin división por ciclos) → todos cycle: 'TERCER'.
// Criterios de evaluación: columna ÚNICA (sin división por ciclos) → todos cycle: 'TERCER'.

export const AREA_VCE: AreaData = {
  subjectCode: 'VCE-5P',
  abbrev: 'VCE',
  areaName: 'Educación en Valores Cívicos y Éticos',
  competencies: [
    {
      code: '1',
      name: 'Autoconocimiento y autonomía moral',
      description:
        'Deliberar y argumentar sobre problemas de carácter ético referidos a sí mismo y su entorno, buscando y analizando información fiable y generando una actitud reflexiva al respecto, para promover el autoconocimiento y la autonomía moral.',
      keyCompetencyCodes: ['CCL', 'CD', 'CPSAA', 'CC'],
      criteria: [
        {
          cycle: 'TERCER',
          code: '1.1',
          description:
            'Construir un adecuado autoconcepto en relación con las demás personas y con la naturaleza, organizando y generando, de forma segura y crítica, información  analógica y digital acerca de los rasgos relativos a la identidad, diferencia y dignidad de las personas.',
        },
        {
          cycle: 'TERCER',
          code: '1.2',
          description:
            'Identificar y expresar emociones, afectos y deseos, mostrando confianza en las propias capacidades al servicio de la consecución motivada de fines personales colectivos.',
        },
        {
          cycle: 'TERCER',
          code: '1.3',
          description:
            'Generar una posición moral autónoma mediante el ejercicio de la deliberación racional, el uso de conceptos éticos y el diálogo respetuoso, en torno a distintos valores y modos de vida, así  como a problemas relacionados con el uso responsable, seguro y crítico de las redes y medios de comunicación, las conductas adictivas, la prevención del abuso, el ciberacoso y el acoso escolar, y el respeto a la intimidad personal.',
        },
      ],
    },
    {
      code: '2',
      name: 'Convivencia democrática y valores cívicos',
      description:
        'Actuar e interactuar de acuerdo con normas y valores cívicos y éticos, reconociendo su importancia para la vida individual y colectiva y aplicándolos de manera efectiva y argumentada en distintos contextos, para promover una convivencia democrática, justa, inclusiva, respetuosa y pacífica.',
      keyCompetencyCodes: ['CCL', 'CP', 'CPSAA', 'CC', 'CCEC'],
      criteria: [
        {
          cycle: 'TERCER',
          code: '2.1',
          description:
            'Promover y actuar de manera acorde a una convivencia democrática, justa, inclusiva, respetuosa y pacífica a partir de la investigación y comprensión de la naturaleza social y política del ser humano y mediante el uso crítico de los conceptos de ley, ética, civismo, democracia, justicia y paz.',
        },
        {
          cycle: 'TERCER',
          code: '2.2',
          description:
            'Interactuar con otras personas adoptando, de forma motivada y autónoma, conductas cívicas y éticas orientadas por valores comunes, a partir del conocimiento de los derechos humanos, los principios constitucionales fundamentales y la consideración crítica y dialogada acerca de cómo debemos relacionarnos con las demás personas, tanto en relación con contextos como con problemas concretos.',
        },
        {
          cycle: 'TERCER',
          code: '2.3',
          description:
            'Reflexionar y asumir un compromiso activo y crítico con valores relativos a la solidaridad y el respeto a las minorías y las identidades etnoculturales y de género, analizando desde un punto de vista ético cuestiones relacionadas con la desigualdad y la pobreza, el hecho multicultural, la diversidad humana y los fenómenos migratorios.',
        },
        {
          cycle: 'TERCER',
          code: '2.4',
          description:
            'Contribuir a generar una convivencia respetuosa, no sexista y comprometida con el logro de la igualdad y la corresponsabilidad efectivas, y con la erradicación de la violencia de género, a partir del conocimiento y análisis crítico de desigualdad entre mujeres y hombres a lo largo de la historia.',
        },
        {
          cycle: 'TERCER',
          code: '2.5',
          description:
            'Comprender y valorar los principios de justicia, solidaridad, seguridad y paz, a la vez que el respeto a las libertades básicas, a partir del análisis y la ponderación de las políticas y acciones de ayuda y cooperación internacional, de defensa para la paz y de seguridad integral ciudadana, ejercidas por el Estado y sus instituciones, los organismos internacionales, las ONG y ONGD y la propia ciudadanía.',
        },
      ],
    },
    {
      code: '3',
      name: 'Sostenibilidad y responsabilidad ecosocial',
      description:
        'Comprender las relaciones sistémicas entre el individuo, la sociedad y la naturaleza, a través del conocimiento y la reflexión sobre los problemas ecosociales, para comprometerse activamente con valores y prácticas consecuentes con el respeto, cuidado y protección de las personas y el planeta.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CPSAA', 'CC', 'CE'],
      criteria: [
        {
          cycle: 'TERCER',
          code: '3.1',
          description:
            'Evaluar diferentes alternativas con que frenar el cambio climático y lograr los Objetivos de Desarrollo Sostenible, identificando causas y problemas ecosociales, y justificando argumentalmente, y de modo crítico, el deber ético de proteger y cuidar de la naturaleza.',
        },
        {
          cycle: 'TERCER',
          code: '3.2',
          description:
            'Comprometerse activamente con valores, prácticas y actitudes afectivas consecuentes con el respeto, cuidado y protección de las personas, los animales y el planeta, a través de la participación en actividades que promuevan un consumo responsable y un uso sostenible del suelo, el aire, el agua, la energía, la movilidad segura, saludable y sostenible, y la prevención y gestión de residuos, reconociendo el papel de las personas, colectivos y entidades comprometidas con la protección del entorno.',
        },
      ],
    },
    {
      code: '4',
      name: 'Educación emocional y gestión de afectos',
      description:
        'Desarrollar la autoestima y la empatía con el entorno, identificando, gestionando y expresando emociones y sentimientos propios, y reconociendo y valorando los de los otros, para adoptar una actitud fundada en el cuidado y aprecio de sí mismo, de las demás personas y del resto de la naturaleza.',
      keyCompetencyCodes: ['CCL', 'CPSAA', 'CC', 'CE'],
      criteria: [
        {
          cycle: 'TERCER',
          code: '4.1',
          description:
            'Gestionar equilibradamente pensamientos, sentimientos y emociones, y desarrollar una actitud de estima y cuidado personal, de las demás personas y del entorno, identificando, analizando y expresando de manera asertiva las propias emociones y afectos, y reconociendo y valorando los de otras personas, en distintos contextos y en relación con actividades creativas y de reflexión individual o dialogada sobre cuestiones éticas y cívicas.',
        },
      ],
    },
  ],
  knowledgeBlocks: [
    {
      letter: 'A',
      title: 'Autoconocimiento y autonomía moral',
      items: [
        { cycle: 'TERCER', code: 'A.1', description: 'El pensamiento crítico y ético.' },
        { cycle: 'TERCER', code: 'A.2', description: 'La naturaleza humana y la identidad personal. Igualdad y diferencia entre las personas.' },
        { cycle: 'TERCER', code: 'A.3', description: 'La gestión de las emociones y los sentimientos. La autoestima.' },
        { cycle: 'TERCER', code: 'A.4', description: 'La educación afectivo-sexual.' },
        { cycle: 'TERCER', code: 'A.5', description: 'Deseos y razones. La voluntad y el juicio moral. Autonomía y responsabilidad.' },
        { cycle: 'TERCER', code: 'A.6', description: 'La ética como guía de nuestras acciones. El debate en torno a los valores. Las normas, las virtudes y los sentimientos morales.' },
        { cycle: 'TERCER', code: 'A.7', description: 'El propio proyecto personal: la diversidad de valores, fines y modelos de vida.' },
        { cycle: 'TERCER', code: 'A.8', description: 'La influencia y el uso crítico y responsable de los medios y las redes de comunicación. La prevención del abuso y el ciberacoso. El respeto a la intimidad. Los límites a la libertad de expresión. Las conductas adictivas.' },
        { cycle: 'TERCER', code: 'A.9', description: 'El acoso escolar.' },
      ],
    },
    {
      letter: 'B',
      title: 'Sociedad, justicia y democracia',
      items: [
        { cycle: 'TERCER', code: 'B.1', description: 'Las virtudes del diálogo y las normas de la argumentación. La toma democrática de decisiones.' },
        { cycle: 'TERCER', code: 'B.2', description: 'Fundamentos de la vida en sociedad. La empatía con las demás personas. Los afectos. La familia. La amistad y el amor.' },
        { cycle: 'TERCER', code: 'B.3', description: 'Las reglas de convivencia. Moralidad, legalidad y conducta cívica.' },
        { cycle: 'TERCER', code: 'B.4', description: 'Principios y valores constitucionales y democráticos. El problema de la justicia.' },
        { cycle: 'TERCER', code: 'B.5', description: 'Los derechos humanos y de la infancia y su relevancia cívica.' },
        { cycle: 'TERCER', code: 'B.6', description: 'La desigualdad económica. La pobreza y la explotación laboral e infantil: análisis de sus causas y búsqueda de soluciones locales y globales.' },
        { cycle: 'TERCER', code: 'B.7', description: 'La igualdad y la corresponsabilidad entre mujeres y hombres. La prevención de los abusos y la violencia de género. La conducta no sexista.' },
        { cycle: 'TERCER', code: 'B.8', description: 'El respeto por las minorías y las identidades étnicoculturales. Interculturalidad y migraciones.' },
        { cycle: 'TERCER', code: 'B.9', description: 'La cultura de paz y no violencia. La contribución del Estado y sus instituciones a la paz, la seguridad y la cooperación internacional. La seguridad integral del ciudadano. Valoración de la defensa como un compromiso cívico y solidario al servicio de la paz. La protección civil y la colaboración ciudadana frente a los desastres. El papel de las ONG y ONGD. La resolución pacífica de los conflictos.' },
      ],
    },
    {
      letter: 'C',
      title: 'Sostenibilidad y ética ambiental',
      items: [
        { cycle: 'TERCER', code: 'C.1', description: 'La empatía, el cuidado y el aprecio hacia los seres vivos y el medio natural. El maltrato animal y su prevención.' },
        { cycle: 'TERCER', code: 'C.2', description: 'La acción humana en la naturaleza. Ecosistemas y sociedades: interdependencia, ecodependencia e interrelación.' },
        { cycle: 'TERCER', code: 'C.3', description: 'Los límites del planeta y el cambio climático.' },
        { cycle: 'TERCER', code: 'C.4', description: 'El deber ético y la obligación legal de proteger y cuidar el planeta.' },
        { cycle: 'TERCER', code: 'C.5', description: 'Hábitos y actividades para el logro de los Objetivos de Desarrollo Sostenible. El consumo responsable. El uso sostenible del suelo, del aire, del agua y de la energía. La movilidad segura, saludable y sostenible. La prevención y la gestión de los residuos.' },
      ],
    },
  ],
};
