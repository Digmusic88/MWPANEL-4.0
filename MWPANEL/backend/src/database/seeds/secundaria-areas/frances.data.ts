import { AreaData } from '../secundaria-curriculum.data';

export const AREA_FRA: AreaData = {
  subjectCode: 'FRA-4ESO',
  abbrev: 'FRA',
  areaName: 'Segunda Lengua Extranjera (Francés)',
  competencies: [
    // ──────────────────────────────────────────────────────────
    // CE 1 – Comprensión
    // ──────────────────────────────────────────────────────────
    {
      code: '1',
      name: 'Comprensión de textos orales, escritos y multimodales',
      description:
        'Comprender e interpretar el sentido general y los detalles más relevantes de textos expresados de forma clara y en la lengua estándar, buscando fuentes fiables y haciendo uso de estrategias como la inferencia de significados, para responder a necesidades comunicativas concretas.',
      keyCompetencyCodes: ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '1.1',
          description:
            'Extraer y analizar el sentido global y las ideas principales, y seleccionar información pertinente de textos orales, escritos y multimodales sobre temas cotidianos, de relevancia personal o de interés público próximos a la experiencia del alumnado, expresados de forma clara y en la lengua estándar a través de diversos soportes.',
        },
        {
          course: '4ESO',
          code: '1.2',
          description:
            'Seleccionar, organizar y aplicar las estrategias y conocimientos más adecuados en cada situación comunicativa para comprender el sentido general, la información esencial y los detalles más relevantes de los textos; inferir significados e interpretar elementos no verbales; y buscar, seleccionar y gestionar información veraz.',
        },
        {
          course: '4ESO',
          code: '1.3',
          description:
            'Interpretar y valorar el contenido y los rasgos discursivos de textos progresivamente más complejos propios de los ámbitos de las relaciones interpersonales, de los medios de comunicación social y del aprendizaje, así como de textos literarios adecuados al nivel de madurez del alumnado.',
        },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // CE 2 – Producción
    // ──────────────────────────────────────────────────────────
    {
      code: '2',
      name: 'Producción de textos orales, escritos y multimodales',
      description:
        'Producir textos originales, de extensión media, sencillos y con una organización clara, usando estrategias tales como la planificación, la compensación o la autorreparación, para expresar de forma creativa, adecuada y coherente mensajes relevantes y responder a propósitos comunicativos concretos.',
      keyCompetencyCodes: ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CE', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '2.1',
          description:
            'Expresar oralmente textos sencillos, estructurados, comprensibles, coherentes y adecuados a la situación comunicativa sobre asuntos cotidianos, de relevancia personal o de interés público próximo a la experiencia del alumnado, con el fin de describir, narrar, argumentar e informar, en diferentes soportes, utilizando recursos verbales y no verbales, así como estrategias de planificación, control, compensación y cooperación.',
        },
        {
          course: '4ESO',
          code: '2.2',
          description:
            'Redactar y difundir textos de extensión media con aceptable claridad, coherencia, cohesión, corrección y adecuación a la situación comunicativa propuesta, a la tipología textual y a las herramientas analógicas y digitales utilizadas sobre asuntos cotidianos, de relevancia personal o de interés público próximos a la experiencia del alumnado, respetando la propiedad intelectual y evitando el plagio.',
        },
        {
          course: '4ESO',
          code: '2.3',
          description:
            'Seleccionar, organizar y aplicar conocimientos y estrategias para planificar, producir, revisar y cooperar en la elaboración de textos coherentes, cohesionados y adecuados a las intenciones comunicativas, las características contextuales, los aspectos socioculturales y la tipología textual, usando los recursos físicos o digitales más adecuados en función de la tarea y de las necesidades del interlocutor o la interlocutora potencial a quien se dirige el texto.',
        },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // CE 3 – Interacción
    // ──────────────────────────────────────────────────────────
    {
      code: '3',
      name: 'Interacción comunicativa oral, escrita y multimodal',
      description:
        'Interactuar con otras personas con creciente autonomía, usando estrategias de cooperación y empleando recursos analógicos y digitales, para responder a propósitos comunicativos concretos en intercambios respetuosos con las normas de cortesía.',
      keyCompetencyCodes: ['CCL', 'CP', 'STEM', 'CPSAA', 'CC'],
      criteria: [
        {
          course: '4ESO',
          code: '3.1',
          description:
            'Ianificar, participar y colaborar activamente, a través de diversos soportes, en situaciones interactivas sobre temas cotidianos, de relevancia personal o de interés público cercanos a la experiencia del alumnado, mostrando iniciativa, empatía y respeto por la cortesía lingüística y la etiqueta digital, así como por las diferentes necesidades, ideas, inquietudes, iniciativas y motivaciones de las interlocutoras y los interlocutores.',
        },
        {
          course: '4ESO',
          code: '3.2',
          description:
            'Seleccionar, organizar y utilizar estrategias adecuadas para iniciar, mantener y terminar la comunicación, tomar y ceder la palabra, solicitar y formular aclaraciones y explicaciones, reformular, comparar y contrastar, resumir, colaborar, debatir, resolver problemas y gestionar situaciones comprometidas.',
        },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // CE 4 – Mediación
    // ──────────────────────────────────────────────────────────
    {
      code: '4',
      name: 'Mediación lingüística y cultural',
      description:
        'Mediar en situaciones cotidianas entre distintas lenguas, usando estrategias y conocimientos sencillos orientados a explicar conceptos o simplificar mensajes, para transmitir información de manera eficaz, clara y responsable.',
      keyCompetencyCodes: ['CCL', 'CP', 'STEM', 'CPSAA', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '4.1',
          description:
            'Inferir y explicar textos, conceptos y comunicaciones breves y sencillas en situaciones en las que atender a la diversidad, mostrando respeto y empatía por las interlocutoras y los interlocutores y por la lengua empleada y participando en la solución de problemas de intercomprensión y de entendimiento en el entorno, apoyándose en diversos recursos y soportes.',
        },
        {
          course: '4ESO',
          code: '4.2',
          description:
            'Aplicar estrategias que ayuden a crear puentes, faciliten la comunicación y sirvan para explicar y simplificar textos, conceptos y mensajes, y que sean adecuadas a las intenciones comunicativas, las características contextuales y la tipología textual, usando recursos y apoyos físicos o digitales en función de las necesidades de cada momento.',
        },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // CE 5 – Plurilingüismo
    // ──────────────────────────────────────────────────────────
    {
      code: '5',
      name: 'Plurilingüismo y reflexión interlingüística',
      description:
        'Ampliar y usar los repertorios lingüísticos personales entre distintas lenguas, reflexionando de forma crítica sobre su funcionamiento y tomando conciencia de las estrategias y conocimientos propios, para mejorar la respuesta a necesidades comunicativas concretas.',
      keyCompetencyCodes: ['CP', 'STEM', 'CPSAA', 'CD'],
      criteria: [
        {
          course: '4ESO',
          code: '5.1',
          description:
            'Comparar y argumentar las semejanzas y diferencias entre distintas lenguas reflexionando de manera progresivamente autónoma sobre su funcionamiento.',
        },
        {
          course: '4ESO',
          code: '5.2',
          description:
            'Utilizar de forma creativa estrategias y conocimientos de mejora de la capacidad de comunicar y de aprender la lengua extranjera con apoyo de otras y otros participantes y de soportes analógicos y digitales.',
        },
        {
          course: '4ESO',
          code: '5.3',
          description:
            'Registrar y analizar los progresos y dificultades de aprendizaje de la lengua extranjera seleccionando las estrategias más eficaces para superar esas dificultades y consolidar el aprendizaje, realizando actividades de planificación del propio aprendizaje, autoevaluación y coevaluación, como las propuestas en el Portfolio Europeo de las Lenguas (PEL) o en un diario de aprendizaje, haciendo esos progresos y dificultades explícitos y compartiéndolos.',
        },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // CE 6 – Interculturalidad
    // ──────────────────────────────────────────────────────────
    {
      code: '6',
      name: 'Interculturalidad y diversidad lingüística',
      description:
        'Valorar críticamente y adecuarse a la diversidad lingüística, cultural y artística a partir de la lengua extranjera, identificando y compartiendo las semejanzas y las diferencias entre lenguas y culturas, para actuar de forma empática y respetuosa en situaciones interculturales.',
      keyCompetencyCodes: ['CCL', 'CP', 'CPSAA', 'CC', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '6.1',
          description:
            'Actuar de forma adecuada, empática y respetuosa en situaciones interculturales construyendo vínculos entre las diferentes lenguas y culturas, rechazando cualquier tipo de discriminación, prejuicio y estereotipo en contextos comunicativos cotidianos y proponiendo vías de solución a aquellos factores socioculturales que dificulten la comunicación.',
        },
        {
          course: '4ESO',
          code: '6.2',
          description:
            'Valorar críticamente en relación con los derechos humanos y adecuarse a la diversidad lingüística, cultural y artística propia de países donde se habla la lengua extranjera, favoreciendo el desarrollo de una cultura compartida y una ciudadanía comprometida con la sostenibilidad y los valores democráticos.',
        },
        {
          course: '4ESO',
          code: '6.3',
          description:
            'Aplicar estrategias para defender y apreciar la diversidad lingüística, cultural y artística atendiendo a valores ecosociales y democráticos y respetando los principios de justicia, equidad e igualdad.',
        },
      ],
    },
  ],
  knowledgeBlocks: [
    // ──────────────────────────────────────────────────────────
    // A. Comunicación
    // ──────────────────────────────────────────────────────────
    {
      letter: 'A',
      title: 'Comunicación',
      items: [
        // A1
        { course: '4ESO', code: 'A.1', description: 'Autoconfianza e iniciativa. El error como parte integrante del proceso de aprendizaje.' },
        // A2
        { course: '4ESO', code: 'A.2', description: 'Estrategias de uso común para la planificación, ejecución, control y reparación de la comprensión, la producción y la coproducción de textos orales, escritos y multimodales.' },
        // A3
        { course: '4ESO', code: 'A.3', description: 'Conocimientos, destrezas y actitudes que permiten llevar a cabo actividades de mediación en situaciones cotidianas.' },
        // A4
        { course: '4ESO', code: 'A.4', description: 'Funciones comunicativas de uso común adecuadas al ámbito y al contexto comunicativo: saludar y despedirse, presentar y presentarse; describir personas, objetos, lugares, fenómenos y acontecimientos; situar eventos en el tiempo; situar objetos, personas y lugares en el espacio; pedir e intercambiar información sobre cuestiones cotidianas; dar y pedir instrucciones, consejos y órdenes; ofrecer, aceptar y rechazar ayuda, proposiciones o sugerencias; expresar parcialmente el gusto o el interés y las emociones; narrar acontecimientos pasados, describir situaciones presentes, y enunciar sucesos futuros; expresar la opinión, la posibilidad, la capacidad, la obligación y la prohibición; expresar argumentaciones sencillas; realizar hipótesis y suposiciones; expresar la incertidumbre y la duda; reformular y resumir.' },
        // A5
        { course: '4ESO', code: 'A.5', description: 'Modelos contextuales y géneros discursivos de uso común en la comprensión, producción y coproducción de textos orales, escritos y multimodales, breves y sencillos, literarios y no literarios: características y reconocimiento del contexto (participantes y situación), expectativas generadas por el contexto; organización y estructuración según el género y la función textual.' },
        // A6
        { course: '4ESO', code: 'A.6', description: 'Unidades lingüísticas de uso común y significados asociados a dichas unidades tales como la expresión de la entidad y sus propiedades, cantidad y cualidad, el espacio y las relaciones espaciales, el tiempo y las relaciones temporales, la afirmación, la negación, la interrogación y la exclamación, relaciones lógicas habituales.' },
        // A7
        { course: '4ESO', code: 'A.7', description: 'Léxico de uso común y de interés para el alumnado relativo a identificación personal, relaciones interpersonales, lugares y entornos, ocio y tiempo libre, salud y actividad física, vida cotidiana, vivienda y hogar, clima y entorno natural, tecnologías de la información y la comunicación, sistema escolar y formación.' },
        // A8
        { course: '4ESO', code: 'A.8', description: 'Patrones sonoros, acentuales, rítmicos y de entonación básicos, y significados e intenciones comunicativas generales asociadas a dichos patrones.' },
        // A9
        { course: '4ESO', code: 'A.9', description: 'Convenciones ortográficas de uso común y significados e intenciones comunicativas asociadas a los formatos, patrones y elementos gráficos.' },
        // A10
        { course: '4ESO', code: 'A.10', description: 'Convenciones y estrategias conversacionales de uso común, en formato síncrono o asíncrono, para iniciar, mantener y terminar la comunicación, tomar y ceder la palabra, pedir y dar aclaraciones y explicaciones, reformular, comparar y contrastar, resumir, colaborar, debatir, etc.' },
        // A11
        { course: '4ESO', code: 'A.11', description: 'Recursos para el aprendizaje y estrategias de uso común de búsqueda y selección de información: diccionarios, libros de consulta, bibliotecas, recursos digitales e informáticos, etc.' },
        // A12
        { course: '4ESO', code: 'A.12', description: 'Respeto de la propiedad intelectual y derechos de autoría sobre las fuentes consultadas y contenidos utilizados.' },
        // A13
        { course: '4ESO', code: 'A.13', description: 'Herramientas analógicas y digitales de uso común para la comprensión, producción y coproducción oral, escrita y multimodal; y plataformas virtuales de interacción, cooperación y colaboración educativa (aulas virtuales, videoconferencias, herramientas digitales colaborativas, etc.) para el aprendizaje, la comunicación y el desarrollo de proyectos con hablantes o estudiantes de la lengua extranjera.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // B. Plurilingüismo
    // ──────────────────────────────────────────────────────────
    {
      letter: 'B',
      title: 'Plurilingüismo',
      items: [
        // B1
        { course: '4ESO', code: 'B.1', description: 'Estrategias y técnicas para responder eficazmente y con niveles crecientes de fluidez, adecuación y corrección a una necesidad comunicativa concreta a pesar de las limitaciones derivadas del nivel de competencia en la lengua extranjera y en las demás lenguas del repertorio lingüístico propio.' },
        // B2
        { course: '4ESO', code: 'B.2', description: 'Estrategias de uso común para identificar, organizar, retener, recuperar y utilizar creativamente unidades lingüísticas (léxico, morfosintaxis, patrones sonoros, etc.) a partir de la comparación de las lenguas y variedades que conforman el repertorio lingüístico personal.' },
        // B3
        { course: '4ESO', code: 'B.3', description: 'Estrategias y herramientas de uso común para la autoevaluación, la coevaluación y la autorreparación, analógicas y digitales, individuales y cooperativas.' },
        // B4
        { course: '4ESO', code: 'B.4', description: 'Expresiones y léxico específico de uso común para intercambiar ideas sobre la comunicación, la lengua, el aprendizaje y las herramientas de comunicación y aprendizaje (metalenguaje).' },
        // B5
        { course: '4ESO', code: 'B.5', description: 'Comparación entre lenguas a partir de elementos de la lengua extranjera y otras lenguas: origen y parentescos.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // C. Interculturalidad
    // ──────────────────────────────────────────────────────────
    {
      letter: 'C',
      title: 'Interculturalidad',
      items: [
        // C1
        { course: '4ESO', code: 'C.1', description: 'La lengua extranjera como medio de comunicación interpersonal e internacional, como fuente de información y como herramienta de participación social y de enriquecimiento personal.' },
        // C2
        { course: '4ESO', code: 'C.2', description: 'Interés e iniciativa en la realización de intercambios comunicativos a través de diferentes medios con hablantes o estudiantes de la lengua extranjera.' },
        // C3
        { course: '4ESO', code: 'C.3', description: 'Aspectos socioculturales y sociolingüísticos de uso común relativos a la vida cotidiana, las condiciones de vida y las relaciones interpersonales; convenciones sociales de uso común; lenguaje no verbal, cortesía lingüística y etiqueta digital; cultura, normas, actitudes, costumbres y valores propios de países donde se habla la lengua extranjera.' },
        // C4
        { course: '4ESO', code: 'C.4', description: 'Estrategias de uso común para entender y apreciar la diversidad lingüística, cultural y artística, atendiendo a valores ecosociales y democráticos.' },
        // C5
        { course: '4ESO', code: 'C.5', description: 'Estrategias de uso común de detección y actuación ante usos discriminatorios del lenguaje verbal y no verbal.' },
      ],
    },
  ],
};
