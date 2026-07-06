// Datos del currículo de Educación Infantil de Navarra (Decreto Foral 61/2022, Anexo II).
// Extraído leyendo el PDF: /opt/docs/Curriculum-Navarra/Curriculum Infantil Navarra - Anexo II.pdf
// SOLO Segundo Ciclo (3-6 años): criterios y saberes de la columna SEGUNDO CICLO.

// ── MAPEO INFERIDO competencia específica → competencias clave (revisable) ──
// El Anexo II de Infantil no tabula este mapeo; se infiere del Anexo I (contribución de
// cada competencia clave a la etapa) y de la introducción de cada área. Pendiente de
// validación del usuario. Competencias clave: CCL, CP, STEM, CD, CPSAA, CC, CE, CCEC.
//   Área 1 (Crecimiento en Armonía):
//     CE1 control corporal/autoimagen → CPSAA, STEM (motricidad/percepción)
//     CE2 emociones                   → CPSAA, CC
//     CE3 hábitos saludables/ecosocial→ CPSAA, CC, CE
//     CE4 interacciones/valores       → CC, CPSAA, CCL
//   Área 2 (Descubrimiento y Exploración del Entorno):
//     CE1 materiales/lógico-matemática→ STEM
//     CE2 método científico/computac. → STEM, CE  (CD retirada: validado usuario 2026-06-25)
//     CE3 naturaleza/sostenibilidad   → STEM, CC
//   Área 3 (Comunicación y Representación de la Realidad):
//     CE1 interacción comunicativa    → CCL, CP, CPSAA
//     CE2 comprensión de mensajes     → CCL, CCEC
//     CE3 producción/lenguajes        → CCL, CCEC
//     CE4 lenguaje escrito            → CCL
//     CE5 diversidad lingüística      → CP, CCL, CCEC

export interface CriterionData {
  code: string; // "1.1", "1.2"... (con sufijo de letra opcional para anomalías de fuente)
  description: string;
}

export interface KnowledgeData {
  code: string; // "A.1", "B.3"...
  description: string;
}

export interface KnowledgeBlock {
  letter: string; // "A", "B"...
  title: string; // título del bloque, p.ej. "El cuerpo y el control progresivo del mismo."
  items: KnowledgeData[]; // saberes del Segundo Ciclo de este bloque
}

export interface SpecificCompetencyData {
  code: string; // "1".."5"
  name: string; // título breve de la competencia específica
  description: string; // descripción oficial de la competencia específica
  keyCompetencyCodes: string[]; // mapeo inferido a competencias clave (Task 6)
  criteria: CriterionData[]; // criterios de evaluación del Segundo Ciclo
}

export interface AreaData {
  subjectCode: string; // subject canónico del área (1º de Infantil): ARMO-1I | DENT-1I | COMR-1I
  abbrev: string; // abreviatura del área para el código de criterio: CA | DEE | CRR
  areaName: string;
  competencies: SpecificCompetencyData[];
  knowledgeBlocks: KnowledgeBlock[]; // saberes del Segundo Ciclo, anclados al área
}

// Esquema de códigos persistidos (decisión del usuario): la competencia específica se
// almacena como "CE<n>" (p.ej. CE1) y el criterio como "<ABREV>-<n>.<m>" (p.ej. CA-1.1).
// En este data file los códigos van CRUDOS ("1", "1.1") para una transcripción limpia; el
// seed (Task 7) compone los códigos finales. Los saberes conservan el código del decreto ("A.1").
export const VALID_KEY_COMPETENCY_CODES = ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'] as const;
export const VALID_SUBJECT_CODES = ['ARMO-1I', 'DENT-1I', 'COMR-1I'] as const;
export const VALID_AREA_ABBREVS = ['CA', 'DEE', 'CRR'] as const;

const CRITERION_CODE_RE = /^\d+\.\d+[a-z]?$/; // permite sufijo de letra para anomalías de fuente
const KNOWLEDGE_CODE_RE = /^[A-Z]\.\d+$/;

export function validateInfantilCurriculum(areas: AreaData[]): string[] {
  const errors: string[] = [];
  for (const area of areas) {
    const a = `[${area.areaName}]`;
    if (!(VALID_SUBJECT_CODES as readonly string[]).includes(area.subjectCode)) {
      errors.push(`${a} subjectCode desconocido: ${area.subjectCode}`);
    }
    if (!(VALID_AREA_ABBREVS as readonly string[]).includes(area.abbrev)) {
      errors.push(`${a} abreviatura de área desconocida: ${area.abbrev}`);
    }
    const ceCodes = new Set<string>();
    for (const ce of area.competencies) {
      const c = `${a} CE${ce.code}`;
      if (ceCodes.has(ce.code)) errors.push(`${c}: código de CE duplicado`);
      ceCodes.add(ce.code);
      if (!/^\d+$/.test(ce.code)) errors.push(`${c}: código de CE no numérico`);
      if (!ce.keyCompetencyCodes || ce.keyCompetencyCodes.length === 0) {
        errors.push(`${c}: sin competencias clave mapeadas`);
      }
      for (const k of ce.keyCompetencyCodes || []) {
        if (!(VALID_KEY_COMPETENCY_CODES as readonly string[]).includes(k)) {
          errors.push(`${c}: competencia clave inválida: ${k}`);
        }
      }
      if (!ce.criteria || ce.criteria.length === 0) errors.push(`${c}: sin criterios`);
      const critCodes = new Set<string>();
      for (const crit of ce.criteria || []) {
        if (!CRITERION_CODE_RE.test(crit.code)) errors.push(`${c}: código de criterio malformado: ${crit.code}`);
        if (critCodes.has(crit.code)) errors.push(`${c}: criterio duplicado: ${crit.code}`);
        critCodes.add(crit.code);
        if (!crit.description || !crit.description.trim()) errors.push(`${c} ${crit.code}: descripción vacía`);
      }
    }
    const blockLetters = new Set<string>();
    for (const block of area.knowledgeBlocks) {
      const b = `${a} bloque ${block.letter}`;
      if (blockLetters.has(block.letter)) errors.push(`${b}: bloque duplicado`);
      blockLetters.add(block.letter);
      if (!block.title || !block.title.trim()) errors.push(`${b}: título vacío`);
      if (!block.items || block.items.length === 0) errors.push(`${b}: sin saberes`);
      const itemCodes = new Set<string>();
      for (const item of block.items || []) {
        if (!KNOWLEDGE_CODE_RE.test(item.code)) errors.push(`${b}: código de saber malformado: ${item.code}`);
        if (item.code[0] !== block.letter) errors.push(`${b}: el saber ${item.code} no pertenece al bloque ${block.letter}`);
        if (itemCodes.has(item.code)) errors.push(`${b}: saber duplicado: ${item.code}`);
        itemCodes.add(item.code);
        if (!item.description || !item.description.trim()) errors.push(`${b} ${item.code}: descripción vacía`);
      }
    }
  }
  return errors;
}

export const INFANTIL_AREAS: AreaData[] = [
  {
    subjectCode: 'ARMO-1I',
    abbrev: 'CA',
    areaName: 'Crecimiento en Armonía',
    competencies: [
      {
        code: '1',
        name: 'Control del cuerpo y autoimagen',
        description:
          'Progresar en el control de su cuerpo y en la adquisición de distintas estrategias, adecuando sus acciones a la realidad del entorno de una manera segura, para construir una autoimagen ajustada y positiva.',
        keyCompetencyCodes: ['CPSAA', 'STEM'],
        criteria: [
          { code: '1.1', description: 'Progresar en el conocimiento de su cuerpo ajustando acciones y reacciones y desarrollando el equilibrio, la percepción sensorial y la coordinación en el movimiento.' },
          { code: '1.2', description: 'Manifestar sentimientos de seguridad personal en la participación en juegos y en las diversas situaciones de la vida cotidiana confiando en las propias posibilidades y mostrando iniciativa.' },
          { code: '1.3', description: 'Manejar diferentes objetos, útiles y herramientas en situaciones de juego y en la realización de tareas cotidianas, mostrando un control progresivo y coordinación de movimientos de carácter fino.' },
          { code: '1.4', description: 'Participar en contextos de juego dirigido y espontáneo ajustándose a sus posibilidades personales.' },
        ],
      },
      {
        code: '2',
        name: 'Reconocimiento y regulación de emociones',
        description:
          'Reconocer, manifestar y regular progresivamente sus emociones expresando necesidades y sentimientos para lograr bienestar emocional y seguridad afectiva.',
        keyCompetencyCodes: ['CPSAA', 'CC'],
        criteria: [
          { code: '2.1', description: 'Identificar y expresar sus necesidades y sentimientos ajustando progresivamente el control de sus emociones.' },
          { code: '2.2', description: 'Ofrecer y pedir ayuda en situaciones cotidianas, valorando los beneficios de la cooperación y la ayuda entre iguales.' },
          { code: '2.3', description: 'Expresar inquietudes, gustos y preferencias, mostrando satisfacción y seguridad sobre los logros conseguidos.' },
        ],
      },
      {
        code: '3',
        name: 'Hábitos saludables y ecosociales',
        description:
          'Adoptar modelos, normas y hábitos, desarrollando la confianza en sus posibilidades y sentimientos de logro, para promover un estilo de vida saludable y ecosocialmente responsable.',
        keyCompetencyCodes: ['CPSAA', 'CC', 'CE'],
        criteria: [
          { code: '3.1', description: 'Realizar actividades relacionadas con el autocuidado y el cuidado del entorno con actitud respetuosa mostrando autoconfianza e iniciativa.' },
          { code: '3.2', description: 'Respetar la secuencia temporal asociada a los acontecimientos y actividades cotidianas, adaptándose a las rutinas establecidas para el grupo y desarrollando comportamientos respetuosos hacia las demás personas.' },
        ],
      },
      {
        code: '4',
        name: 'Interacciones sociales y valores',
        description:
          'Establecer interacciones sociales en condiciones de igualdad, valorando la importancia de la amistad, el respeto y la empatía, para construir su propia identidad basada en valores democráticos y de respeto a los derechos humanos.',
        keyCompetencyCodes: ['CC', 'CPSAA', 'CCL'],
        criteria: [
          { code: '4.1', description: 'Participar con iniciativa en juegos y actividades colectivas relacionándose con otras personas con actitudes de afecto y empatía, respetando los distintos ritmos individuales y evitando todo tipo de estereotipos.' },
          { code: '4.2', description: 'Reproducir conductas, acciones o situaciones a través del juego simbólico en interacción con sus iguales, identificando y rechazando todo tipo de estereotipos.' },
          { code: '4.3', description: 'Participar activamente en actividades relacionadas con la reflexión sobre las normas sociales que regulan la convivencia y promueven valores como el respeto a la diversidad, el trato no discriminatorio hacia las personas con discapacidad y la igualdad de género.' },
          { code: '4.4', description: 'Desarrollar destrezas y habilidades para la gestión de conflictos de forma positiva, proponiendo alternativas creativas y teniendo en cuenta el criterio de otras personas.' },
          { code: '4.5', description: 'Participar, desde una actitud de respeto, en actividades relacionadas con costumbres y tradiciones étnicas y culturales presentes en su entorno, mostrando interés por conocerlas.' },
        ],
      },
    ],
    knowledgeBlocks: [
      {
        letter: 'A',
        title: 'El cuerpo y el control progresivo del mismo.',
        items: [
          { code: 'A.1', description: 'Reconocimiento y aceptación de la imagen global y segmentaria del cuerpo: características individuales y percepción de los cambios físicos.' },
          { code: 'A.2', description: 'Construcción de una imagen positiva y ajustada ante los y las demás.' },
          { code: 'A.3', description: 'Identificación y respeto de las diferencias teniendo en cuenta la diversidad de niñas y niños y personas adultas.' },
          { code: 'A.4', description: 'Identificación y exploración de los elementos del entorno a través de los sentidos.' },
          { code: 'A.5', description: 'El movimiento: control de la coordinación, tono, equilibrio y desplazamientos en situaciones de juego libre.' },
          { code: 'A.6', description: 'Implicaciones de la discapacidad en la vida cotidiana.' },
          { code: 'A.7', description: 'Adaptación del tono y la postura a las acciones y situaciones.' },
          { code: 'A.8', description: 'Utilización del juego como actividad placentera y fuente de aprendizaje fomentando propuestas de juego cooperativo.' },
          { code: 'A.9', description: 'Relaciones vinculares complementarias de autonomía, iniciativa y dependencia en la vida diaria del aula.' },
        ],
      },
      {
        letter: 'B',
        title: 'Desarrollo y equilibrio afectivos.',
        items: [
          { code: 'B.1', description: 'Conciencia emocional de las propias emociones, sentimientos, vivencias, preferencias e intereses respetando las diferentes manifestaciones.' },
          { code: 'B.2', description: 'Estrategias de ayuda y colaboración en contextos de juego y rutinas. Trabajo cooperativo.' },
          { code: 'B.3', description: 'Comunicación, asertividad y escucha activa respetuosa hacia las demás.' },
          { code: 'B.4', description: 'Reconocimiento de sus posibilidades, aceptación de sus limitaciones y superación de las mismas.' },
          { code: 'B.5', description: 'Desarrollo de hábitos y actitudes de esfuerzo, constancia, organización, atención e iniciativa en función de sus ritmos.' },
        ],
      },
      {
        letter: 'C',
        title: 'Hábitos de vida saludable para el autocuidado y el cuidado del entorno.',
        items: [
          { code: 'C.1', description: 'Satisfacción de necesidades básicas: manifestación, regulación y dominio en relación con el bienestar personal garantizando espacios y tiempos adecuados para ello.' },
          { code: 'C.2', description: 'Hábitos y prácticas sostenibles y ecosocialmente responsables relacionadas con la alimentación, la higiene, el descanso, el autocuidado y el cuidado del entorno.' },
          { code: 'C.3', description: 'Actividad física estructurada con diferentes grados de intensidad.' },
          { code: 'C.4', description: 'Rituales. Planificación secuenciada de las acciones fomentando un ambiente agradable, armonioso, tranquilo en los diferentes momentos del centro escolar: en la comida, el descanso, la higiene, los desplazamientos.' },
          { code: 'C.5', description: 'Creación de entornos que promuevan retos y riesgos en un entorno de cuidado.' },
        ],
      },
      {
        letter: 'D',
        title: 'Interacción socioemocional en el entorno. La vida junto a los demás.',
        items: [
          { code: 'D.1', description: 'La diversidad familiar.' },
          { code: 'D.2', description: 'Reconocimiento y acogida de la diversidad familiar y las distintas formas de crianza.' },
          { code: 'D.3', description: 'Habilidades sociales y de convivencia. Pautas básicas de convivencia que incluyan el respeto a la igualdad de género.' },
          { code: 'D.4', description: 'Estrategias de autorregulación de la conducta. Empatía y respeto.' },
          { code: 'D.5', description: 'Resolución de conflictos surgidos en interacciones con los otros. El conflicto como oportunidad de pensamiento en la interacción y en la búsqueda de soluciones.' },
          { code: 'D.6', description: 'La amistad, el sentimiento de pertenencia al grupo, como elemento protector, de prevención de la violencia y de desarrollo de la cultura de la paz.' },
          { code: 'D.7', description: 'Actitud de ayuda y colaboración necesaria en la interacción social para el desarrollo de procesos del aula.' },
          { code: 'D.8', description: 'Respuesta empática a la diversidad debida a las distintas formas de discapacidad y a sus implicaciones en la vida cotidiana.' },
          { code: 'D.9', description: 'Juego simbólico como estrategia para cuestionar estereotipos y prejuicios ante personas, personajes y situaciones.' },
          { code: 'D.10', description: 'Reconocimiento y valoración de otros grupos sociales de pertenencia: características, funciones y servicios, para la vida en sociedad.' },
          { code: 'D.15', description: 'Conocimiento de los derechos de la infancia para asegurar la igualdad y dignidad de las niñas y niños con respecto a la alimentación, bienestar, salud, educación, cuidado y protección.' },
        ],
      },
    ],
  },
  {
    subjectCode: 'DENT-1I',
    abbrev: 'DEE',
    areaName: 'Descubrimiento y Exploración del Entorno',
    competencies: [
      {
        code: '1',
        name: 'Características y relaciones de materiales y objetos',
        description:
          'Identificar las características de materiales, objetos y colecciones y establecer relaciones entre ellos, mediante la exploración, la manipulación sensorial, el manejo de herramientas sencillas y el desarrollo de destrezas lógico-matemáticas para descubrir y crear una idea cada vez más compleja del mundo.',
        keyCompetencyCodes: ['STEM'],
        criteria: [
          { code: '1.1', description: 'Establecer distintas relaciones entre los objetos a partir de sus cualidades o atributos, mostrando curiosidad e interés.' },
          { code: '1.2', description: 'Emplear los cuantificadores básicos más significativos en el contexto del juego y en la interacción con los demás.' },
          { code: '1.3', description: 'Ubicarse adecuadamente en los espacios habituales, tanto en reposo como en movimiento, aplicando sus conocimientos acerca de las nociones espaciales básicas y jugando con el propio cuerpo y con objetos.' },
          { code: '1.4', description: 'Identificar las situaciones cotidianas en las que es preciso medir, utilizando el cuerpo u otros materiales y herramientas para efectuar las medidas.' },
          { code: '1.5', description: 'Organizar su actividad, ordenando las secuencias y utilizando las nociones temporales básicas.' },
        ],
      },
      {
        code: '2',
        name: 'Método científico y pensamiento computacional',
        description:
          'Desarrollar de manera progresiva los procedimientos del método científico y las destrezas del pensamiento computacional, a través de procesos de observación y manipulación de objetos, para iniciarse en la interpretación del entorno y responder de forma creativa a las situaciones y retos que se plantean.',
        keyCompetencyCodes: ['STEM', 'CE'],
        criteria: [
          { code: '2.1', description: 'Gestionar situaciones, dificultades, retos o problemas mediante la planificación de secuencias de actividades, la manifestación de interés e iniciativa y la cooperación con sus iguales.' },
          { code: '2.2', description: 'Canalizar progresivamente la frustración ante las dificultades o problemas mediante la aplicación de diferentes estrategias.' },
          // SOURCE-ANOMALY: impreso como "3." en el PDF
          { code: '2.2b', description: 'Afrontar pequeñas adversidades, manifestando actitudes de superación, y solicitando y prestando ayuda.' },
          { code: '2.3', description: 'Plantear hipótesis acerca del comportamiento de ciertos elementos o materiales, verificándolas a través de la manipulación y la actuación sobre ellos.' },
          { code: '2.4', description: 'Utilizar diferentes estrategias para la toma de decisiones con progresiva autonomía, afrontando el proceso de creación de soluciones originales en respuesta a los retos que se le planteen.' },
          { code: '2.5', description: 'Programar secuencias de acciones o instrucciones para la resolución de tareas analógicas y digitales, desarrollando habilidades básicas de pensamiento computacional.' },
          { code: '2.6', description: 'Participar en proyectos utilizando dinámicas cooperativas, compartiendo y valorando opiniones propias y ajenas, expresando conclusiones personales a partir de ellas.' },
        ],
      },
      {
        code: '3',
        name: 'Naturaleza, sostenibilidad y conservación',
        description:
          'Reconocer elementos y fenómenos de la naturaleza, mostrando interés por los hábitos que inciden sobre ella, para apreciar la importancia del uso sostenible, el cuidado y la conservación del entorno en la vida de las personas.',
        keyCompetencyCodes: ['STEM', 'CC'],
        criteria: [
          { code: '3.1', description: 'Mostrar una actitud de respeto, cuidado y protección hacia el medio natural y los animales, identificando el impacto positivo o negativo que algunas acciones humanas ejercen sobre ellos.' },
          { code: '3.2', description: 'Identificar rasgos comunes y diferentes entre seres vivos e inertes.' },
          { code: '3.3', description: 'Establecer relaciones entre el medio natural y social a partir de conocimiento y la observación de algunos fenómenos naturales y de los elementos patrimoniales presentes en el medio físico.' },
        ],
      },
    ],
    knowledgeBlocks: [
      {
        letter: 'A',
        title: 'Diálogo corporal con el entorno. Exploración creativa de objetos, materiales y espacios.',
        items: [
          { code: 'A.1', description: 'Cualidades o atributos de los objetos. Relaciones de orden, correspondencia, clasificación y comparación propuestas por el alumnado.' },
          { code: 'A.2', description: 'Cuantificadores básicos contextualizados en situaciones de la vida cotidiana.' },
          { code: 'A.3', description: 'Toma de conciencia de la funcionalidad de los números en la vida cotidiana.' },
          { code: 'A.4', description: 'Situaciones en que se hace necesario medir, desde unidades de medida no arbitrarias a arbitrarias.' },
          { code: 'A.5', description: 'Uso de las nociones espaciales en relación con el propio cuerpo, los objetos y las acciones, tanto en reposo como en movimiento.' },
          { code: 'A.6', description: 'Secuenciación temporal en los tiempos vividos dentro y fuera del aula.' },
          { code: 'A.7', description: 'Resolución de situaciones problemáticas de la vida cotidiana.' },
        ],
      },
      {
        letter: 'B',
        title: 'Experimentación en el entorno. Curiosidad, pensamiento científico, razonamiento lógico y creatividad.',
        items: [
          { code: 'B.1', description: 'Indagación en el entorno, el asombro, el deseo de conocer para iniciar cuestionamientos e investigaciones.' },
          { code: 'B.2', description: 'Estrategias de construcción y andamiaje de nuevos conocimientos: relaciones y conexiones entre lo conocido y lo novedoso, y entre experiencias previas y nuevas con el entorno.' },
          { code: 'B.3', description: 'Enfoque de control de variables. Estrategias y técnicas de investigación: ensayo, error, observación, experimentación, formulación, y comprobación de hipótesis, realización de preguntas, manejo y búsqueda en distintas fuentes de información.' },
          { code: 'B.4', description: 'Secuencia de acciones y estrategias en la planificación, organización o autorregulación de tareas. Iniciativa en la búsqueda de acuerdos o consensos en la toma de decisiones. Respeto por los disensos.' },
          { code: 'B.5', description: 'Estrategia para proponer soluciones factibles de realizar por el alumnado creativas y acordadas.' },
          { code: 'B.6', description: 'Coevaluación del proceso y de los resultados. Hallazgos y conclusiones.' },
        ],
      },
      {
        letter: 'C',
        title: 'Indagación en el medio físico y natural. Cuidado, valoración y respeto.',
        items: [
          { code: 'C.1', description: 'Elementos naturales (agua, tierra, aire). Características y comportamiento (peso, capacidad, volumen, mezclas o trasvases).' },
          { code: 'C.2', description: 'Acciones y estrategias saludables, responsables y sostenibles encaminadas hacia un uso respetuoso y cuidadoso en el entorno natural cercano minimizando las consecuencias del cambio climático.' },
          { code: 'C.3', description: 'Uso de energías limpias y naturales no contaminantes.' },
          { code: 'C.4', description: 'Fenómenos naturales: identificación y repercusión en la vida de las personas. Implicación en situaciones de catástrofe.' },
          { code: 'C.5', description: 'Respeto y empatía por los seres vivos y por los recursos naturales. Implicación en el cuidado tanto de seres vivos como de entornos.' },
          { code: 'C.6', description: 'Empatía, cuidado y protección de los animales. Respeto de sus derechos.' },
          { code: 'C.7', description: 'Respeto por el patrimonio cultural presente en el medio físico.' },
        ],
      },
    ],
  },
  {
    subjectCode: 'COMR-1I',
    abbrev: 'CRR',
    areaName: 'Comunicación y Representación de la Realidad',
    competencies: [
      {
        code: '1',
        name: 'Interacción comunicativa',
        description:
          'Manifestar interés por interactuar en situaciones cotidianas a través de la exploración y el uso de su repertorio comunicativo, para expresar sus necesidades e intenciones y para responder a las exigencias del entorno.',
        keyCompetencyCodes: ['CCL', 'CP', 'CPSAA'],
        criteria: [
          { code: '1.1', description: 'Participar de manera activa, espontánea y respetuosa con las diferencias individuales en situaciones comunicativas de progresiva complejidad en función de su desarrollo individual.' },
          { code: '1.2', description: 'Ajustar su repertorio comunicativo a las propuestas, a los interlocutores y el contexto, indagando en las posibilidades expresivas de los diferentes lenguajes.' },
          { code: '1.3', description: 'Participar en situaciones de uso de diferentes lenguas, mostrando interés, curiosidad y respeto por la diversidad de perfiles lingüísticos.' },
          { code: '1.4', description: 'Interactuar con distintos recursos digitales, familiarizándose diferentes medios y herramientas digitales.' },
        ],
      },
      {
        code: '2',
        name: 'Interpretación y comprensión de mensajes',
        description:
          'Interpretar y comprender mensajes y representaciones apoyándose en conocimientos y recursos de su propia experiencia para responder a las demandas del entorno y construir nuevos aprendizajes.',
        keyCompetencyCodes: ['CCL', 'CCEC'],
        criteria: [
          { code: '2.1', description: 'Interpretar de forma eficaz los mensajes e intenciones comunicativas de los demás.' },
          { code: '2.2', description: 'Interpretar los mensajes transmitidos mediante representaciones o manifestaciones artísticas, también en formato digital, reconociendo la intencionalidad del emisor y mostrando una actitud curiosa y responsable.' },
        ],
      },
      {
        code: '3',
        name: 'Producción de mensajes con distintos lenguajes',
        description:
          'Producir mensajes de manera eficaz, personal y creativa, utilizando diferentes lenguajes, descubriendo los códigos de cada uno de ellos y explorando sus posibilidades expresivas, para responder a diferentes necesidades comunicativas.',
        keyCompetencyCodes: ['CCL', 'CCEC'],
        criteria: [
          { code: '3.1', description: 'Hacer un uso funcional del lenguaje oral, aumentando su repertorio lingüístico y construyendo progresivamente un discurso más eficaz, organizado y coherente en contextos formales e informales.' },
          { code: '3.2', description: 'Utilizar el lenguaje oral como instrumento regulador de la acción en las interacciones con los demás con seguridad y confianza.' },
          { code: '3.3', description: 'Evocar y expresar espontáneamente ideas a través del relato oral.' },
          { code: '3.4', description: 'Elaborar creaciones plásticas explorando y utilizando diferentes materiales y técnicas, y participando activamente en el trabajo en grupo cuando se precise.' },
          { code: '3.5', description: 'Interpretar propuestas dramáticas y musicales utilizando y explorando diferentes instrumentos, recursos o técnicas.' },
          { code: '3.6', description: 'Ajustar armónicamente su movimiento al de los demás y al espacio como forma de expresión corporal libre, manifestando interés e iniciativa.' },
          { code: '3.7', description: 'Expresarse de manera creativa, utilizando diversas herramientas o aplicaciones digitales intuitivas y visuales.' },
        ],
      },
      {
        code: '4',
        name: 'Aproximación al lenguaje escrito',
        description:
          'Participar por iniciativa propia en actividades relacionadas con textos escritos, mostrando interés y curiosidad, para comprender su funcionalidad y algunas de sus características.',
        keyCompetencyCodes: ['CCL'],
        criteria: [
          { code: '4.1', description: 'Mostrar interés por comunicarse a través de códigos escritos, convencionales o no, valorando su función comunicativa.' },
          { code: '4.2', description: 'Identificar de manera acompañada alguna de las características textuales y paratextuales mediante la indagación en textos de uso social libres de prejuicios y estereotipos sexistas.' },
          { code: '4.3', description: 'Recurrir a la biblioteca como fuente de información y disfrute, respetando sus normas de uso.' },
        ],
      },
      {
        code: '5',
        name: 'Diversidad lingüística y cultural',
        description:
          'Valorar la diversidad lingüística presente en su entorno, así como otras manifestaciones culturales, para enriquecer sus estrategias comunicativas y su bagaje cultural.',
        keyCompetencyCodes: ['CP', 'CCL', 'CCEC'],
        criteria: [
          { code: '5.1', description: 'Relacionarse de forma respetuosa en la pluralidad lingüística y cultural de su entorno, manifestando interés por otras lenguas, etnias y culturas.' },
          { code: '5.2', description: 'Participar en interacciones comunicativas en lengua extranjera relacionadas con rutinas y situaciones cotidianas.' },
          { code: '5.3', description: 'Participar en actividades de aproximación a la literatura infantil, tanto de carácter individual, como en contextos dialógicos y participativos, descubriendo, explorando y apreciando la belleza del lenguaje literario.' },
          { code: '5.4', description: 'Expresar emociones, ideas y pensamientos a través de manifestaciones artísticas y culturales, disfrutando del proceso creativo.' },
          { code: '5.5', description: 'Expresar gustos, preferencias y opiniones sobre distintas manifestaciones artísticas, explicando las emociones que produce su disfrute.' },
        ],
      },
    ],
    knowledgeBlocks: [
      {
        letter: 'A',
        title: 'Intención y elementos de la interacción comunicativa.',
        items: [
          { code: 'A.1', description: 'El deseo de comunicarse. Repertorio comunicativo y elementos de comunicación no verbal. Respetando periodos de silencio y provocando situaciones en contextos orales variados.' },
          { code: 'A.2', description: 'Comunicación interpersonal: empatía y asertividad en conversaciones contextualizadas.' },
          { code: 'A.3', description: 'Convenciones sociales del lenguaje en situaciones comunicativas: atención, escucha activa, turnos de diálogo y alternancia que potencien el respeto, la igualdad y la equidad.' },
        ],
      },
      {
        letter: 'B',
        title: 'Las lenguas y sus hablantes.',
        items: [
          { code: 'B.1', description: 'Repertorio lingüístico individual. Acogida de las diferentes lenguas de la comunidad educativa.' },
          { code: 'B.2', description: 'La realidad lingüística de la comunidad educativa. Fórmulas o expresiones que responden a sus necesidades o intereses.' },
          { code: 'B.3', description: 'Usos comunicativos y funcionales de las lenguas en los diferentes momentos de la vida cotidiana.' },
        ],
      },
      {
        letter: 'C',
        title: 'Comunicación verbal oral. Expresión, comprensión, diálogo.',
        items: [
          { code: 'C.1', description: 'El lenguaje oral en situaciones cotidianas: conversaciones, juegos de interacción social y expresión de vivencias.' },
          { code: 'C.2', description: 'Utilización de géneros orales formales e informales en situaciones contextualizadas del aula.' },
          { code: 'C.3', description: 'Intención comunicativa de los mensajes. Creación de situaciones comunicativas reales.' },
          { code: 'C.4', description: 'Verbalización de la secuencia de acciones en una acción planificada.' },
          { code: 'C.5', description: 'Discriminación auditiva y conciencia fonológica.' },
          { code: 'C.6', description: 'Situaciones relacionadas con los rituales del aula. Estructuras para llevar una comunicación funcional.' },
          { code: 'C.7', description: 'Comprensión de mensajes a través de la reformulación de ideas, preguntas e imágenes.' },
        ],
      },
      {
        letter: 'D',
        title: 'Aproximación al lenguaje escrito.',
        items: [
          { code: 'D.1', description: 'Los usos sociales y culturales de la lectura y la escritura. Funcionalidad y significatividad en situaciones comunicativas.' },
          { code: 'D.2', description: 'Pluralidad de tipologías textuales. Textos escritos en diferentes soportes.' },
          { code: 'D.3', description: 'Intención comunicativa y acercamiento a las principales características textuales y paratextuales. Primeras hipótesis para la interpretación y comprensión.' },
          { code: 'D.4', description: 'Las propiedades del sistema de escritura: hipótesis cuantitativas y cualitativas.' },
          { code: 'D.5', description: 'Aproximación al código escrito, evolucionando desde las escrituras indeterminadas y respetando el proceso evolutivo.' },
          { code: 'D.6', description: 'Otros códigos de representación gráfica: imágenes, símbolos, números...' },
          { code: 'D.7', description: 'Iniciación a estrategias de búsqueda de información, reelaboración y comunicación.' },
          { code: 'D.8', description: 'Situaciones de lectura individual o a través de lectores modelos de referencia.' },
          { code: 'D.9', description: 'Acercamiento a obras literarias de escritores y escritoras de calidad, no únicamente a textos adaptados a la infancia.' },
        ],
      },
      {
        letter: 'E',
        title: 'Aproximación a la educación literaria.',
        items: [
          { code: 'E.1', description: 'Textos relacionados con la literatura infantil, oral y escrita, libres de estereotipos sexistas y que recojan los retos del siglo XXI, desarrollando valores sobre cultura de paz, derechos del niño, igualdad de género y diversidad étnico-cultural.' },
          { code: 'E.2', description: 'Vínculos afectivos y lúdicos con los textos literarios incluyendo variedad de tipologías textuales en las bibliotecas de aula.' },
          { code: 'E.3', description: 'Interacciones dialógicas en torno a textos literarios libres de prejuicios y estereotipos sexistas.' },
          { code: 'E.4', description: 'Aproximación a la lectura respetando las fases de adquisición de la misma según el momento evolutivo individual.' },
          { code: 'E.5', description: 'Utilización de la biblioteca tanto del aula, de centro como del barrio como fuente de información y disfrute.' },
        ],
      },
      {
        letter: 'F',
        title: 'El lenguaje y expresión musicales.',
        items: [
          { code: 'F.1', description: 'Posibilidades sonoras, expresivas y creativas de la voz, el cuerpo, los objetos cotidianos de su entorno y los instrumentos.' },
          { code: 'F.2', description: 'Propuestas musicales en distintos formatos.' },
          { code: 'F.3', description: 'El sonido, el silencio y sus cualidades. El código musical.' },
          { code: 'F.4', description: 'Intención expresiva en las producciones musicales.' },
          { code: 'F.5', description: 'La escucha musical como disfrute.' },
          { code: 'F.6', description: 'Escucha de diferentes géneros musicales. Acercamiento a músicos destacados en la historia musical, sin reducir la escucha a obras creadas para la infancia.' },
        ],
      },
      {
        letter: 'G',
        title: 'El Lenguaje y la expresión plásticos y visuales.',
        items: [
          { code: 'G.1', description: 'Materiales específicos e inespecíficos, elementos, técnicas y procedimientos artísticos.' },
          { code: 'G.2', description: 'Intención expresiva de producciones a través de la pintura, escultura, arquitectura, fotografía y cine.' },
          { code: 'G.3', description: 'Manifestaciones plásticas variadas. Diferentes corrientes y géneros artísticos. Acercamiento a diferentes artistas locales o reconocidos mundialmente potenciando la igualdad de género.' },
        ],
      },
      {
        letter: 'H',
        title: 'El lenguaje y la expresión corporales.',
        items: [
          { code: 'H.1', description: 'Posibilidades expresivas y comunicativas del propio cuerpo en actividades individuales y grupales libres de prejuicios y estereotipos sexistas.' },
          { code: 'H.2', description: 'Juegos de expresión corporal y dramática.' },
          { code: 'H.3', description: 'Acercamiento a los tipos y géneros de danzas.' },
          { code: 'H.4', description: 'La representación teatral y sus recursos teatrales.' },
        ],
      },
      {
        letter: 'I',
        title: 'Alfabetización digital.',
        items: [
          { code: 'I.1', description: 'Uso contextualizado de aplicaciones y herramientas digitales con distintos fines: creación, comunicación y aprendizaje.' },
          { code: 'I.2', description: 'Uso saludable y responsable por parte del docente de las tecnologías digitales. Frenar la hiperestimulación tecnológica.' },
          { code: 'I.3', description: 'Lectura e interpretación crítica de imágenes e información recibida a través de medios digitales.' },
          { code: 'I.4', description: 'Función educativa de los dispositivos y elementos tecnológicos de su entorno.' },
        ],
      },
    ],
  },
];
