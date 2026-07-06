import { AreaData } from '../secundaria-curriculum.data';

export const AREA_MUS: AreaData = {
  subjectCode: 'MUS-1ESO',
  abbrev: 'MUS',
  areaName: 'Música',
  competencies: [
    // ── CURSOS 1.º A 3.º ─────────────────────────────────────────────────
    {
      code: '1',
      name: 'Análisis de obras musicales y dancísticas',
      description:
        'Analizar obras de diferentes épocas y culturas, identificando sus principales rasgos estilísticos y estableciendo relaciones con su contexto, para valorar el patrimonio musical y dancístico como fuente de disfrute y enriquecimiento personal.',
      keyCompetencyCodes: ['CCL', 'CP', 'CD', 'CPSAA', 'CC', 'CCEC'],
      criteria: [
        // CURSO 1.º
        {
          course: '1ESO',
          code: '1.1',
          description:
            'Mostrar una actitud de apertura, interés y respeto en la escucha o el visionado de obras musicales y dancísticas de diferentes épocas y culturas.',
        },
        {
          course: '1ESO',
          code: '1.2',
          description:
            'Identificar las funciones desempeñadas por determinadas producciones musicales y dancísticas, relacionándolas con las principales características de su contexto histórico, social y cultural.',
        },
        // CURSO 3.º
        {
          course: '3ESO',
          code: '1.1',
          description:
            'Identificar los principales rasgos estilísticos de obras musicales y dancísticas de diferentes épocas y culturas, evidenciando una actitud de apertura, interés y respeto en la escucha o el visionado de las mismas.',
        },
        {
          course: '3ESO',
          code: '1.2',
          description:
            'Explicar, con actitud abierta y respetuosa, las funciones desempeñadas por determinadas producciones musicales y dancísticas, relacionándolas con las principales características de su contexto histórico, social y cultural.',
        },
        {
          course: '3ESO',
          code: '1.3',
          description:
            'Establecer conexiones entre manifestaciones musicales y dancísticas de diferentes épocas y culturas, valorando su influencia sobre la música y la danza actuales.',
        },
        // CURSO 4.º
        {
          course: '4ESO',
          code: '1.1',
          description:
            'Analizar obras musicales y dancísticas de diferentes épocas y culturas, identificando sus rasgos estilísticos, explicando su relación con el contexto y evidenciando una actitud de apertura, interés y respeto en la escucha o el visionado de las mismas.',
        },
        {
          course: '4ESO',
          code: '1.2',
          description:
            'Valorar críticamente los hábitos, los gustos y los referentes musicales y dancísticos de diferentes épocas y culturas, reflexionando sobre su evolución y sobre su relación con los del presente.',
        },
      ],
    },
    {
      code: '2',
      name: 'Exploración de técnicas musicales y dancísticas',
      description:
        'Explorar las posibilidades expresivas de diferentes técnicas musicales y dancísticas, a través de actividades de improvisación, para incorporarlas al repertorio personal de recursos y desarrollar el criterio de selección de las técnicas más adecuadas a la intención expresiva.',
      keyCompetencyCodes: ['CCL', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'],
      criteria: [
        // CURSO 1.º
        {
          course: '1ESO',
          code: '2.1',
          description:
            'Participar, con iniciativa, confianza y creatividad, en la exploración de técnicas musicales y dancísticas básicas, por medio de improvisaciones pautadas, individuales o grupales, en las que se empleen la voz, el cuerpo, instrumentos musicales o herramientas tecnológicas.',
        },
        {
          course: '1ESO',
          code: '2.2',
          description:
            'Expresar ideas, sentimientos y emociones en actividades pautadas de improvisación.',
        },
        // CURSO 3.º
        {
          course: '3ESO',
          code: '2.1',
          description:
            'Participar, con iniciativa, confianza y creatividad, en la exploración de técnicas musicales y dancísticas básicas, por medio de improvisaciones pautadas, individuales o grupales, en las que se empleen la voz, el cuerpo, instrumentos musicales o herramientas tecnológicas.',
        },
        {
          course: '3ESO',
          code: '2.2',
          description:
            'Expresar ideas, sentimientos y emociones en actividades pautadas de improvisación, seleccionando las técnicas más adecuadas de entre las que conforman el repertorio personal de recursos.',
        },
        // CURSO 4.º
        {
          course: '4ESO',
          code: '2.1',
          description:
            'Participar, con iniciativa, confianza y creatividad, en la exploración de técnicas musicales y dancísticas de mayor complejidad, por medio de improvisaciones libres y pautadas, individuales o grupales, en las que se empleen la voz, el cuerpo, instrumentos musicales o herramientas tecnológicas.',
        },
        {
          course: '4ESO',
          code: '2.2',
          description:
            'Elaborar piezas musicales o dancísticas estructuradas, a partir de actividades de improvisación, seleccionando las técnicas del repertorio personal de recursos más adecuadas a la intención expresiva.',
        },
      ],
    },
    {
      code: '3',
      name: 'Interpretación de piezas musicales y dancísticas',
      description:
        'Interpretar piezas musicales y dancísticas, gestionando adecuadamente las emociones y empleando diversas estrategias y técnicas vocales, corporales o instrumentales, para ampliar las posibilidades de expresión personal.',
      keyCompetencyCodes: ['CCL', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'],
      criteria: [
        // CURSO 1.º
        {
          course: '1ESO',
          code: '3.1',
          description:
            'Leer partituras sencillas, identificando de forma guiada los elementos básicos del lenguaje musical, con o sin apoyo de la audición.',
        },
        {
          course: '1ESO',
          code: '3.2',
          description:
            'Emplear técnicas básicas de interpretación vocal, corporal o instrumental, aplicando estrategias de memorización y valorando los ensayos como espacios de escucha y aprendizaje.',
        },
        {
          course: '1ESO',
          code: '3.3',
          description:
            'Interpretar con corrección piezas musicales y dancísticas sencillas, individuales y grupales, dentro y fuera del aula, gestionando de forma guiada la ansiedad y el miedo escénico, y manteniendo la concentración.',
        },
        // CURSO 3.º
        {
          course: '3ESO',
          code: '3.1',
          description:
            'Leer partituras sencillas, identificando de forma guiada los elementos básicos del lenguaje musical, con o sin apoyo de la audición.',
        },
        {
          course: '3ESO',
          code: '3.2',
          description:
            'Emplear técnicas básicas de interpretación vocal, corporal o instrumental, aplicando estrategias de memorización y valorando los ensayos como espacios de escucha y aprendizaje.',
        },
        {
          course: '3ESO',
          code: '3.3',
          description:
            'Interpretar con corrección piezas musicales y dancísticas sencillas, individuales y grupales, dentro y fuera del aula, gestionando de forma guiada la ansiedad y el miedo escénico, y manteniendo la concentración.',
        },
        // CURSO 4.º
        {
          course: '4ESO',
          code: '3.1',
          description:
            'Leer partituras sencillas, identificando los elementos básicos del lenguaje musical y analizando de forma guiada las estructuras de las piezas, con o sin apoyo de la audición.',
        },
        {
          course: '4ESO',
          code: '3.2',
          description:
            'Emplear diferentes técnicas de interpretación vocal, corporal o instrumental, aplicando estrategias de memorización y valorando los ensayos como espacios de escucha y aprendizaje.',
        },
        {
          course: '4ESO',
          code: '3.3',
          description:
            'Interpretar con corrección y expresividad piezas musicales y dancísticas, individuales y grupales, dentro y fuera del aula, gestionando la ansiedad y el miedo escénico, y manteniendo la concentración.',
        },
      ],
    },
    {
      code: '4',
      name: 'Creación de propuestas artístico-musicales',
      description:
        'Crear propuestas artístico-musicales, empleando la voz, el cuerpo, instrumentos musicales y herramientas tecnológicas, para potenciar la creatividad e identificar oportunidades de desarrollo personal, social, académico y profesional.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'],
      criteria: [
        // CURSO 1.º
        {
          course: '1ESO',
          code: '4.1',
          description:
            'Desarrollar, de forma pautada y con creatividad, propuestas artístico-musicales, tanto individuales como colaborativas, empleando medios musicales y dancísticos, así como herramientas analógicas y digitales.',
        },
        {
          course: '1ESO',
          code: '4.2',
          description:
            'Participar activamente en la ejecución de propuestas artístico-musicales colaborativas, valorando las aportaciones del resto de integrantes del grupo y descubriendo oportunidades de desarrollo personal, social y académico.',
        },
        // CURSO 3.º
        {
          course: '3ESO',
          code: '4.1',
          description:
            'Planificar y desarrollar, con creatividad, propuestas artístico-musicales, tanto individuales como colaborativas, empleando medios musicales y dancísticos, así como herramientas analógicas y digitales.',
        },
        {
          course: '3ESO',
          code: '4.2',
          description:
            'Participar activamente en la planificación y en la ejecución de propuestas artístico-musicales colaborativas, valorando las aportaciones del resto de integrantes del grupo y descubriendo oportunidades de desarrollo personal, social, académico y profesional.',
        },
        // CURSO 4.º
        {
          course: '4ESO',
          code: '4.1',
          description:
            'Planificar y desarrollar, con creatividad, propuestas artístico-musicales, tanto individuales como colaborativas, seleccionando, de entre los disponibles, los medios musicales y dancísticos más oportunos, así como las herramientas analógicas o digitales más adecuadas.',
        },
        {
          course: '4ESO',
          code: '4.2',
          description:
            'Participar activamente en la planificación y en la ejecución de propuestas artístico-musicales colaborativas, asumiendo diferentes funciones, valorando las aportaciones del resto de integrantes del grupo e identificando diversas oportunidades de desarrollo personal, social, académico y profesional.',
        },
      ],
    },
  ],
  knowledgeBlocks: [
    // ──────────────────────────────────────────────────────────
    // A. Escucha y percepción  (1ESO + 3ESO + 4ESO)
    // ──────────────────────────────────────────────────────────
    {
      letter: 'A',
      title: 'Escucha y percepción',
      items: [
        // 1ESO
        { course: '1ESO', code: 'A.1', description: 'El silencio, el sonido, el ruido y la escucha activa. Sensibilidad ante la polución sonora y la creación de ambientes saludables de escucha.' },
        { course: '1ESO', code: 'A.3', description: 'Voces e instrumentos: clasificación general de los instrumentos por familias y características. Agrupaciones.' },
        { course: '1ESO', code: 'A.6', description: 'Estereotipos y roles de género transmitidos a través de la música y la danza' },
        { course: '1ESO', code: 'A.7', description: 'Herramientas digitales para la recepción musical.' },
        { course: '1ESO', code: 'A.9', description: 'Normas de comportamiento básicas en la recepción musical: respeto y valoración.' },
        // 3ESO
        { course: '3ESO', code: 'A.1', description: 'El silencio, el sonido, el ruido y la escucha activa. Sensibilidad ante la polución sonora y la creación de ambientes saludables de escucha.' },
        { course: '3ESO', code: 'A.2', description: 'Obras musicales y dancísticas: análisis, descripción y valoración de sus características básicas. Géneros de la música y la danza.' },
        { course: '3ESO', code: 'A.3', description: 'Voces e instrumentos: clasificación general de los instrumentos por familias y características. Agrupaciones.' },
        { course: '3ESO', code: 'A.4', description: 'Compositores y compositoras, artistas e intérpretes internacionales, nacionales, regionales y locales.' },
        { course: '3ESO', code: 'A.5', description: 'Conciertos, actuaciones musicales y otras manifestaciones artístico-musicales, en vivo y registradas.' },
        { course: '3ESO', code: 'A.6', description: 'Mitos, estereotipos y roles de género transmitidos a través de la música y la danza.' },
        { course: '3ESO', code: 'A.7', description: 'Herramientas digitales para la recepción musical.' },
        { course: '3ESO', code: 'A.8', description: 'Estrategias de búsqueda, selección y reelaboración de información fiable, pertinente y de calidad.' },
        { course: '3ESO', code: 'A.9', description: 'Normas de comportamiento básicas en la recepción musical: respeto y valoración.' },
        // 4ESO
        { course: '4ESO', code: 'A.1', description: 'El silencio, el sonido, el ruido y la escucha activa. Sensibilización y actitud crítica ante la polución sonora y el consumo indiscriminado de música.' },
        { course: '4ESO', code: 'A.2', description: 'Obras musicales y dancísticas: análisis descriptivo de sus características más relevantes. Principales géneros musicales y dancísticos.' },
        { course: '4ESO', code: 'A.3', description: 'Voces e instrumentos. Evolución y agrupaciones. Relevancia en las distintas etapas.' },
        { course: '4ESO', code: 'A.4', description: 'Compositoras y compositores, artistas e intérpretes internacionales, nacionales, regionales y locales.' },
        { course: '4ESO', code: 'A.5', description: 'Conciertos, actuaciones musicales y manifestaciones artístico-musicales en vivo y registradas.' },
        { course: '4ESO', code: 'A.6', description: 'Mitos, estereotipos y roles de género trasmitidos a través de la música y la danza.' },
        { course: '4ESO', code: 'A.7', description: 'Herramientas digitales para la recepción musical.' },
        { course: '4ESO', code: 'A.8', description: 'Estrategias de búsqueda, selección y reelaboración de información fiable, pertinente y de calidad.' },
        { course: '4ESO', code: 'A.9', description: 'Actitud de respeto y valoración en la recepción musical.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // B. Interpretación, improvisación y creación escénica  (1ESO + 3ESO + 4ESO)
    // ──────────────────────────────────────────────────────────
    {
      letter: 'B',
      title: 'Interpretación, improvisación y creación escénica',
      items: [
        // 1ESO
        { course: '1ESO', code: 'B.1', description: 'La partitura: identificación y aplicación de grafías, lectura y escritura musical.' },
        { course: '1ESO', code: 'B.2', description: 'Elementos básicos del lenguaje musical: parámetros del sonido. Texturas. Formas musicales.' },
        { course: '1ESO', code: 'B.3', description: 'Principales géneros musicales y escénicos del patrimonio cultural.' },
        { course: '1ESO', code: 'B.4', description: 'Repertorio vocal, instrumental o corporal individual o grupal de distintos tipos de música del patrimonio musical propio y de otras culturas.' },
        { course: '1ESO', code: 'B.5', description: 'Técnicas básicas para la interpretación: técnicas vocales, instrumentales y corporales, técnicas de estudio y de control de emociones.' },
        { course: '1ESO', code: 'B.6', description: 'Técnicas de improvisación guiada.' },
        { course: '1ESO', code: 'B.7', description: 'Proyectos musicales y audiovisuales: empleo de la voz, el cuerpo, los instrumentos musicales, los medios y las aplicaciones tecnológicas.' },
        { course: '1ESO', code: 'B.8', description: 'Hábitos de consumo musical responsable.' },
        { course: '1ESO', code: 'B.9', description: 'Herramientas digitales para la interpretación y/o creación musical.' },
        { course: '1ESO', code: 'B.10', description: 'Normas de comportamiento y participación en actividades musicales.' },
        // 3ESO
        { course: '3ESO', code: 'B.1', description: 'La partitura: identificación y aplicación de grafías, lectura y escritura musical.' },
        { course: '3ESO', code: 'B.2', description: 'Elementos básicos del lenguaje musical: parámetros del sonido, intervalos. Tonalidad: escalas musicales, la armadura y acordes básicos. Texturas. Formas musicales a lo largo de los periodos históricos y en la actualidad.' },
        { course: '3ESO', code: 'B.3', description: 'Principales géneros musicales y escénicos del patrimonio cultural.' },
        { course: '3ESO', code: 'B.4', description: 'Repertorio vocal, instrumental o corporal individual o grupal de distintos tipos de música del patrimonio musical propio y de otras culturas.' },
        { course: '3ESO', code: 'B.5', description: 'Técnicas básicas para la interpretación: técnicas vocales, instrumentales y corporales, técnicas de estudio y de control de emociones.' },
        { course: '3ESO', code: 'B.6', description: 'Técnicas de improvisación guiada y libre.' },
        { course: '3ESO', code: 'B.7', description: 'Proyectos musicales y audiovisuales: empleo de la voz, el cuerpo, los instrumentos musicales, los medios y las aplicaciones tecnológicas.' },
        { course: '3ESO', code: 'B.8', description: 'La propiedad intelectual y cultural: planteamientos éticos y responsables. Hábitos de consumo musical responsable.' },
        { course: '3ESO', code: 'B.9', description: 'Herramientas digitales para la creación musical. Secuenciadores y editores de partituras.' },
        { course: '3ESO', code: 'B.10', description: 'Normas de comportamiento y participación en actividades musicales.' },
        // 4ESO
        { course: '4ESO', code: 'B.1', description: 'La partitura: lectura y escritura musical.' },
        { course: '4ESO', code: 'B.2', description: 'Elementos del lenguaje musical. Tonalidad: modulación, funciones armónicas, progresiones armónicas. Formas musicales complejas.' },
        { course: '4ESO', code: 'B.3', description: 'Repertorio vocal, instrumental o corporal individual o grupal de distintos tipos de música del patrimonio musical histórico, actual y de otras culturas.' },
        { course: '4ESO', code: 'B.4', description: 'Técnicas para la interpretación: técnicas vocales, instrumentales y corporales, técnicas de estudio y de control de emociones.' },
        { course: '4ESO', code: 'B.5', description: 'Técnicas de improvisación guiada y libre: melódicas y rítmicas vocales, instrumentales o corporales.' },
        { course: '4ESO', code: 'B.6', description: 'Planificación y ejecución de proyectos musicales y audiovisuales: empleo de la voz, el cuerpo, los instrumentos musicales, los medios y las aplicaciones tecnológicas.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // C. Contextos y culturas  (1ESO + 3ESO)
    // ──────────────────────────────────────────────────────────
    {
      letter: 'C',
      title: 'Contextos y culturas',
      items: [
        // 1ESO
        { course: '1ESO', code: 'C.1', description: 'Música y danza de distintos contextos históricos o geográficos.' },
        // 3ESO
        { course: '3ESO', code: 'C.1', description: 'Historia de la música occidental: periodos, características, géneros musicales, instrumentos y agrupaciones.' },
        { course: '3ESO', code: 'C.2', description: 'Las músicas tradicionales en España y su diversidad cultural. Instrumentos, canciones, danzas y bailes.' },
        { course: '3ESO', code: 'C.3', description: 'Tradiciones musicales y dancísticas de otras culturas del mundo.' },
        { course: '3ESO', code: 'C.4', description: 'Músicas populares, urbanas y contemporáneas.' },
        { course: '3ESO', code: 'C.5', description: 'El sonido y la música en los medios audiovisuales y las tecnologías digitales.' },
      ],
    },
  ],
};
