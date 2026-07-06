import { DataSource } from 'typeorm';
import { ExitProfile, ExitProfileType } from '../../modules/competencies/entities/exit-profile.entity';
import { OperativeDescriptor } from '../../modules/competencies/entities/operative-descriptor.entity';
import { Competency } from '../../modules/competencies/entities/competency.entity';

export const seedExitProfiles = async (dataSource: DataSource): Promise<void> => {
  const exitProfileRepository = dataSource.getRepository(ExitProfile);
  const operativeDescriptorRepository = dataSource.getRepository(OperativeDescriptor);
  const competencyRepository = dataSource.getRepository(Competency);

  // Crear perfiles de salida
  const primaryProfile = await exitProfileRepository.save({
    type: ExitProfileType.PRIMARY,
    name: 'Perfil de Salida de Educación Primaria',
    description: 'Define el nivel de desarrollo competencial esperado al finalizar la Educación Primaria',
    legalReference: 'Decreto Foral 67/2022 de Navarra',
  });

  const basicEducationProfile = await exitProfileRepository.save({
    type: ExitProfileType.BASIC_EDUCATION,
    name: 'Perfil de Salida de la Enseñanza Básica',
    description: 'Define el nivel de desarrollo competencial esperado al término de la Enseñanza Básica (ESO)',
    legalReference: 'Decreto Foral 71/2022 de Navarra',
  });

  // Obtener competencias clave
  const competencies = await competencyRepository.find();
  const competencyMap = new Map(competencies.map(c => [c.code, c]));

  // Descriptores operativos para cada competencia clave
  const descriptorsData = {
    // Competencia en Comunicación Lingüística (CCL)
    CCL: {
      PRIMARY: [
        {
          code: 'CCL1',
          description: 'Expresa hechos, conceptos, pensamientos, opiniones o sentimientos de forma oral, escrita o signada, con claridad y adecuación a diferentes contextos cotidianos de su entorno personal, social y educativo.',
        },
        {
          code: 'CCL2',
          description: 'Comprende, interpreta y valora textos orales, escritos o signados sencillos de los ámbitos personal, social y educativo, con acompañamiento puntual, para participar activamente en contextos cotidianos y para construir conocimiento.',
        },
        {
          code: 'CCL3',
          description: 'Localiza, selecciona y contrasta, con el debido acompañamiento, información sencilla procedente de dos o más fuentes, evaluando su fiabilidad y utilidad en función de los objetivos de lectura, y la integra y transforma en conocimiento para comunicarla.',
        },
        {
          code: 'CCL4',
          description: 'Lee obras diversas adecuadas a su progreso madurativo, seleccionando aquellas que mejor se ajustan a sus gustos e intereses; reconoce el patrimonio literario como fuente de disfrute y aprendizaje individual y colectivo.',
        },
        {
          code: 'CCL5',
          description: 'Pone sus prácticas comunicativas al servicio de la convivencia democrática, la gestión dialogada de los conflictos y la igualdad de derechos de todas las personas.',
        },
      ],
      BASIC_EDUCATION: [
        {
          code: 'CCL1',
          description: 'Se expresa de forma oral, escrita, signada o multimodal con coherencia, corrección y adecuación a los diferentes contextos sociales, y participa en interacciones comunicativas con actitud cooperativa y respetuosa.',
        },
        {
          code: 'CCL2',
          description: 'Comprende, interpreta y valora con actitud crítica textos orales, escritos, signados o multimodales de los ámbitos personal, social, educativo y profesional para participar en diferentes contextos de manera activa e informada.',
        },
        {
          code: 'CCL3',
          description: 'Localiza, selecciona y contrasta de manera progresivamente autónoma información procedente de diferentes fuentes, evaluando su fiabilidad y pertinencia y evitando los riesgos de manipulación y desinformación.',
        },
        {
          code: 'CCL4',
          description: 'Lee con autonomía obras diversas adecuadas a su edad, seleccionando las que mejor se ajustan a sus gustos e intereses; aprecia el patrimonio literario como cauce privilegiado de la experiencia individual y colectiva.',
        },
        {
          code: 'CCL5',
          description: 'Pone sus prácticas comunicativas al servicio de la convivencia democrática, la resolución dialogada de los conflictos y la igualdad de derechos de todas las personas.',
        },
      ],
    },
    // Competencia Plurilingüe (CP)
    CP: {
      PRIMARY: [
        {
          code: 'CP1',
          description: 'Usa, al menos, una lengua, además de la lengua o lenguas familiares, para responder a necesidades comunicativas sencillas y predecibles, de manera adecuada tanto a su desarrollo e intereses como a situaciones y contextos cotidianos.',
        },
        {
          code: 'CP2',
          description: 'A partir de sus experiencias, reconoce la diversidad de perfiles lingüísticos y experimenta estrategias que, de manera guiada, le permiten realizar transferencias sencillas entre distintas lenguas.',
        },
        {
          code: 'CP3',
          description: 'Conoce y respeta la diversidad lingüística y cultural presente en su entorno, reconociendo y comprendiendo su valor como factor de diálogo y cohesión social.',
        },
      ],
      BASIC_EDUCATION: [
        {
          code: 'CP1',
          description: 'Usa eficazmente una o más lenguas, además de la lengua o lenguas familiares, para responder a sus necesidades comunicativas, de manera apropiada y adecuada.',
        },
        {
          code: 'CP2',
          description: 'A partir de sus experiencias, realiza transferencias entre distintas lenguas como estrategia para comunicarse y ampliar su repertorio lingüístico individual.',
        },
        {
          code: 'CP3',
          description: 'Conoce, valora y respeta la diversidad lingüística y cultural presente en la sociedad, integrándola en su desarrollo personal como factor de diálogo.',
        },
      ],
    },
    // Competencia Matemática y Competencia en Ciencia, Tecnología e Ingeniería (STEM)
    STEM: {
      PRIMARY: [
        {
          code: 'STEM1',
          description: 'Utiliza, de manera guiada, algunos métodos inductivos, deductivos y lógicos propios del razonamiento matemático en situaciones conocidas, y selecciona y emplea algunas estrategias para resolver problemas.',
        },
        {
          code: 'STEM2',
          description: 'Utiliza el pensamiento científico para entender y explicar algunos de los fenómenos que ocurren a su alrededor, confiando en el conocimiento como motor de desarrollo.',
        },
        {
          code: 'STEM3',
          description: 'Realiza, de forma guiada, proyectos, diseñando, fabricando y evaluando diferentes prototipos o modelos, adaptándose ante la incertidumbre.',
        },
        {
          code: 'STEM4',
          description: 'Interpreta y transmite los elementos más relevantes de algunos métodos y resultados científicos, matemáticos y tecnológicos de forma clara y veraz.',
        },
        {
          code: 'STEM5',
          description: 'Participa en acciones fundamentadas científicamente para promover la salud y preservar el medio ambiente y los seres vivos.',
        },
      ],
      BASIC_EDUCATION: [
        {
          code: 'STEM1',
          description: 'Utiliza métodos inductivos y deductivos propios del razonamiento matemático en situaciones conocidas, y selecciona y emplea diferentes estrategias para resolver problemas.',
        },
        {
          code: 'STEM2',
          description: 'Utiliza el pensamiento científico para entender y explicar los fenómenos que ocurren a su alrededor, confiando en el conocimiento como motor de desarrollo.',
        },
        {
          code: 'STEM3',
          description: 'Plantea y desarrolla proyectos diseñando, fabricando y evaluando diferentes prototipos o modelos para generar o utilizar productos que den solución a una necesidad.',
        },
        {
          code: 'STEM4',
          description: 'Interpreta y transmite los elementos más relevantes de procesos, razonamientos, demostraciones, métodos y resultados científicos, matemáticos y tecnológicos.',
        },
        {
          code: 'STEM5',
          description: 'Emprende acciones fundamentadas científicamente para promover la salud física, mental y social, y preservar el medio ambiente.',
        },
      ],
    },
    // Competencia Digital (CD)
    CD: {
      PRIMARY: [
        {
          code: 'CD1',
          description: 'Realiza búsquedas guiadas en internet y hace uso de estrategias sencillas para el tratamiento digital de la información con una actitud crítica sobre los contenidos obtenidos.',
        },
        {
          code: 'CD2',
          description: 'Crea, integra y reelabora contenidos digitales en distintos formatos mediante el uso de diferentes herramientas digitales para expresar ideas, sentimientos y conocimientos.',
        },
        {
          code: 'CD3',
          description: 'Participa en actividades o proyectos escolares mediante el uso de herramientas o plataformas virtuales para construir nuevo conocimiento.',
        },
        {
          code: 'CD4',
          description: 'Conoce los riesgos y adopta, con la orientación del docente, medidas preventivas al usar las tecnologías digitales para proteger los dispositivos, los datos personales, la salud y el medioambiente.',
        },
        {
          code: 'CD5',
          description: 'Se inicia en el desarrollo de soluciones digitales sencillas y sostenibles para resolver problemas concretos o retos propuestos de manera creativa.',
        },
      ],
      BASIC_EDUCATION: [
        {
          code: 'CD1',
          description: 'Realiza búsquedas en internet atendiendo a criterios de validez, calidad, actualidad y fiabilidad, seleccionando los resultados de manera crítica.',
        },
        {
          code: 'CD2',
          description: 'Gestiona y utiliza su entorno personal digital de aprendizaje para construir conocimiento y crear contenidos digitales.',
        },
        {
          code: 'CD3',
          description: 'Se comunica, participa, colabora e interactúa compartiendo contenidos, datos e información mediante herramientas o plataformas virtuales.',
        },
        {
          code: 'CD4',
          description: 'Identifica riesgos y adopta medidas preventivas al usar las tecnologías digitales para proteger los dispositivos, los datos personales, la salud y el medioambiente.',
        },
        {
          code: 'CD5',
          description: 'Desarrolla aplicaciones informáticas sencillas y soluciones tecnológicas creativas y sostenibles para resolver problemas concretos.',
        },
      ],
    },
    // Competencia Personal, Social y de Aprender a Aprender (CPSAA)
    CPSAA: {
      PRIMARY: [
        {
          code: 'CPSAA1',
          description: 'Es consciente de las propias emociones, ideas y comportamientos personales y emplea estrategias sencillas para gestionarlas en situaciones de tensión o conflicto.',
        },
        {
          code: 'CPSAA2',
          description: 'Conoce los riesgos más relevantes y los principales activos para la salud, adopta estilos de vida saludables para su bienestar físico y mental.',
        },
        {
          code: 'CPSAA3',
          description: 'Reconoce y respeta las emociones y experiencias de las demás personas, participa activamente en el trabajo en grupo, asume las responsabilidades individuales asignadas.',
        },
        {
          code: 'CPSAA4',
          description: 'Reconoce el valor del esfuerzo y la dedicación personal para la mejora de su aprendizaje y adopta posturas críticas cuando se producen procesos de reflexión guiados.',
        },
        {
          code: 'CPSAA5',
          description: 'Planea objetivos a corto plazo, utiliza estrategias de aprendizaje autorregulado y participa en procesos de auto y coevaluación.',
        },
      ],
      BASIC_EDUCATION: [
        {
          code: 'CPSAA1',
          description: 'Regula y expresa sus emociones, fortaleciendo el optimismo, la resiliencia, la autoeficacia y la búsqueda de propósito y motivación hacia el aprendizaje.',
        },
        {
          code: 'CPSAA2',
          description: 'Comprende los riesgos para la salud relacionados con factores sociales, consolida estilos de vida saludable a nivel físico y mental.',
        },
        {
          code: 'CPSAA3',
          description: 'Comprende proactivamente las perspectivas y las experiencias de las demás personas y las incorpora a su aprendizaje.',
        },
        {
          code: 'CPSAA4',
          description: 'Realiza autoevaluaciones sobre su proceso de aprendizaje, buscando fuentes fiables para validar, sustentar y contrastar la información.',
        },
        {
          code: 'CPSAA5',
          description: 'Planea objetivos a medio plazo y desarrolla procesos metacognitivos de retroalimentación para aprender de sus errores.',
        },
      ],
    },
    // Competencia Ciudadana (CC)
    CC: {
      PRIMARY: [
        {
          code: 'CC1',
          description: 'Entiende los procesos históricos y sociales más relevantes relativos a su propia identidad y cultura, reflexiona sobre las normas de convivencia.',
        },
        {
          code: 'CC2',
          description: 'Participa en actividades comunitarias, en la toma de decisiones y en la resolución de conflictos de forma dialogada y respetuosa.',
        },
        {
          code: 'CC3',
          description: 'Reflexiona y dialoga sobre valores y problemas éticos de actualidad, comprendiendo la necesidad de respetar diferentes culturas y creencias.',
        },
        {
          code: 'CC4',
          description: 'Comprende las relaciones sistémicas entre las acciones humanas y el entorno, y se inicia en la adopción de estilos de vida sostenibles.',
        },
      ],
      BASIC_EDUCATION: [
        {
          code: 'CC1',
          description: 'Analiza y comprende ideas relativas a la dimensión social y ciudadana de su propia identidad, así como a los hechos culturales, históricos y normativos.',
        },
        {
          code: 'CC2',
          description: 'Analiza y asume fundadamente los principios y valores que emanan del proceso de integración europea, la Constitución Española y los derechos humanos.',
        },
        {
          code: 'CC3',
          description: 'Comprende y analiza problemas éticos fundamentales y de actualidad, considerando críticamente los valores propios y ajenos.',
        },
        {
          code: 'CC4',
          description: 'Comprende las relaciones sistémicas de interdependencia, ecodependencia e interconexión entre actuaciones locales y globales.',
        },
      ],
    },
    // Competencia Emprendedora (CE)
    CE: {
      PRIMARY: [
        {
          code: 'CE1',
          description: 'Reconoce necesidades y retos que afrontar y elabora ideas originales, utilizando destrezas creativas y tomando conciencia de las consecuencias y efectos.',
        },
        {
          code: 'CE2',
          description: 'Identifica fortalezas y debilidades propias utilizando estrategias de autoconocimiento y se inicia en el conocimiento de elementos económicos y financieros básicos.',
        },
        {
          code: 'CE3',
          description: 'Crea ideas y soluciones originales, planifica tareas, coopera con otros en equipo, valorando el proceso realizado y el resultado obtenido.',
        },
      ],
      BASIC_EDUCATION: [
        {
          code: 'CE1',
          description: 'Analiza necesidades y oportunidades y afronta retos con sentido crítico, haciendo balance de su sostenibilidad.',
        },
        {
          code: 'CE2',
          description: 'Evalúa las fortalezas y debilidades propias, haciendo uso de estrategias de autoconocimiento y autoeficacia.',
        },
        {
          code: 'CE3',
          description: 'Desarrolla el proceso de creación de ideas y soluciones valiosas y toma decisiones, de manera razonada.',
        },
      ],
    },
    // Competencia en Conciencia y Expresiones Culturales (CCEC)
    CCEC: {
      PRIMARY: [
        {
          code: 'CCEC1',
          description: 'Reconoce y aprecia los aspectos fundamentales del patrimonio cultural y artístico, comprendiendo las diferencias entre distintas culturas.',
        },
        {
          code: 'CCEC2',
          description: 'Reconoce y se interesa por las especificidades e intencionalidades de las manifestaciones artísticas y culturales más destacadas del patrimonio.',
        },
        {
          code: 'CCEC3',
          description: 'Expresa ideas, opiniones, sentimientos y emociones de forma creativa y con una actitud abierta e inclusiva.',
        },
        {
          code: 'CCEC4',
          description: 'Experimenta de forma creativa con diferentes medios y soportes, y diversas técnicas plásticas, visuales, audiovisuales, sonoras o corporales.',
        },
      ],
      BASIC_EDUCATION: [
        {
          code: 'CCEC1',
          description: 'Conoce, aprecia críticamente y respeta el patrimonio cultural y artístico, implicándose en su conservación.',
        },
        {
          code: 'CCEC2',
          description: 'Disfruta, reconoce y analiza con autonomía las especificidades e intencionalidades de las manifestaciones artísticas y culturales.',
        },
        {
          code: 'CCEC3',
          description: 'Expresa ideas, opiniones, sentimientos y emociones por medio de producciones culturales y artísticas.',
        },
        {
          code: 'CCEC4',
          description: 'Conoce, selecciona y utiliza con creatividad diversos medios y soportes, así como técnicas plásticas, visuales, audiovisuales, sonoras o corporales.',
        },
      ],
    },
  };

  // Crear descriptores operativos
  for (const [competencyCode, profiles] of Object.entries(descriptorsData)) {
    const competency = competencyMap.get(competencyCode);
    if (!competency) {
      console.warn(`Competencia ${competencyCode} no encontrada`);
      continue;
    }

    // Descriptores para Primaria
    if (profiles.PRIMARY) {
      for (let i = 0; i < profiles.PRIMARY.length; i++) {
        const descriptor = profiles.PRIMARY[i];
        await operativeDescriptorRepository.save({
          code: descriptor.code,
          description: descriptor.description,
          order: i + 1,
          exitProfile: primaryProfile,
          competency: competency,
        });
      }
    }

    // Descriptores para ESO
    if (profiles.BASIC_EDUCATION) {
      for (let i = 0; i < profiles.BASIC_EDUCATION.length; i++) {
        const descriptor = profiles.BASIC_EDUCATION[i];
        await operativeDescriptorRepository.save({
          code: descriptor.code,
          description: descriptor.description,
          order: i + 1,
          exitProfile: basicEducationProfile,
          competency: competency,
        });
      }
    }
  }

  console.log('✅ Perfiles de salida y descriptores operativos creados exitosamente');
};