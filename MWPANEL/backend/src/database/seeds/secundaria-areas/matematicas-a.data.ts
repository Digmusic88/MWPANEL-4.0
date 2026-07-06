import { AreaData } from '../secundaria-curriculum.data';

export const AREA_MATA: AreaData = {
  subjectCode: 'MATA-4ESO',
  abbrev: 'MATA',
  areaName: 'Matemáticas A',
  competencies: [
    {
      code: '1',
      name: 'Resolución de problemas matemáticos',
      description:
        'Interpretar, modelizar y resolver problemas de la vida cotidiana y propios de las matemáticas, aplicando diferentes estrategias y formas de razonamiento, para explorar distintas maneras de proceder y obtener posibles soluciones.',
      keyCompetencyCodes: ['STEM', 'CD', 'CPSAA', 'CE', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '1.1',
          description:
            'Reformular problemas matemáticos de forma verbal y gráfica, interpretando los datos, las relaciones entre ellos y las preguntas planteadas.',
        },
        {
          course: '4ESO',
          code: '1.2',
          description:
            'Seleccionar herramientas y estrategias elaboradas valorando su eficacia e idoneidad en la resolución de problemas.',
        },
        {
          course: '4ESO',
          code: '1.3',
          description:
            'Obtener todas las posibles soluciones matemáticas de un problema activando los conocimientos y utilizando las herramientas tecnológicas necesarias.',
        },
      ],
    },
    {
      code: '2',
      name: 'Análisis y validación de soluciones',
      description:
        'Analizar las soluciones de un problema usando diferentes técnicas y herramientas, evaluando las respuestas obtenidas, para verificar su validez e idoneidad desde un punto de vista matemático y su repercusión global.',
      keyCompetencyCodes: ['STEM', 'CD', 'CPSAA', 'CC', 'CE'],
      criteria: [
        {
          course: '4ESO',
          code: '2.1',
          description:
            'Comprobar la corrección matemática de las soluciones de un problema.',
        },
        {
          course: '4ESO',
          code: '2.2',
          description:
            'Seleccionar las soluciones óptimas de un problema valorando tanto la corrección matemática como sus implicaciones desde diferentes perspectivas (de género, de sostenibilidad, de consumo responsable...).',
        },
      ],
    },
    {
      code: '3',
      name: 'Conjeturas y planteamiento de problemas',
      description:
        'Formular y comprobar conjeturas sencillas o plantear problemas de forma autónoma, reconociendo el valor del razonamiento y la argumentación, para generar nuevo conocimiento.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CE'],
      criteria: [
        {
          course: '4ESO',
          code: '3.1',
          description:
            'Formular, comprobar e investigar conjeturas de forma guiada estudiando patrones, propiedades y relaciones.',
        },
        {
          course: '4ESO',
          code: '3.2',
          description:
            'Crear variantes de un problema dado, modificando alguno de sus datos y observando la relación entre los diferentes resultados obtenidos.',
        },
        {
          course: '4ESO',
          code: '3.3',
          description:
            'Emplear herramientas tecnológicas adecuadas en la investigación y comprobación de conjeturas o problemas.',
        },
      ],
    },
    {
      code: '4',
      name: 'Pensamiento computacional',
      description:
        'Utilizar los principios del pensamiento computacional organizando datos, descomponiendo en partes, reconociendo patrones, interpretando, modificando y creando algoritmos, para modelizar situaciones y resolver problemas de forma eficaz.',
      keyCompetencyCodes: ['STEM', 'CD', 'CE'],
      criteria: [
        {
          course: '4ESO',
          code: '4.1',
          description:
            'Reconocer e investigar patrones, organizar datos y descomponer un problema en partes más simples facilitando su interpretación y su tratamiento computacional.',
        },
        {
          course: '4ESO',
          code: '4.2',
          description:
            'Modelizar situaciones y resolver problemas de forma eficaz interpretando, modificando y creando algoritmos sencillos.',
        },
      ],
    },
    {
      code: '5',
      name: 'Conexiones entre elementos matemáticos',
      description:
        'Reconocer y utilizar conexiones entre los diferentes elementos matemáticos, interconectando conceptos y procedimientos, para desarrollar una visión de las matemáticas como un todo integrado.',
      keyCompetencyCodes: ['STEM', 'CD', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '5.1',
          description:
            'Deducir relaciones entre los conocimientos y experiencias matemáticas, formando un todo coherente.',
        },
        {
          course: '4ESO',
          code: '5.2',
          description:
            'Analizar y poner en práctica conexiones entre diferentes procesos matemáticos aplicando conocimientos y experiencias previas.',
        },
      ],
    },
    {
      code: '6',
      name: 'Matemáticas en otras materias y situaciones reales',
      description:
        'Identificar las matemáticas implicadas en otras materias y en situaciones reales susceptibles de ser abordadas en términos matemáticos, interrelacionando conceptos y procedimientos, para aplicarlos en situaciones diversas.',
      keyCompetencyCodes: ['STEM', 'CD', 'CC', 'CE', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '6.1',
          description:
            'Proponer situaciones susceptibles de ser formuladas y resueltas mediante herramientas y estrategias matemáticas, estableciendo y aplicando conexiones entre el mundo real y las matemáticas, y usando los procesos inherentes a la investigación científica y matemática: inferir, medir, comunicar, clasificar y predecir.',
        },
        {
          course: '4ESO',
          code: '6.2',
          description:
            'Identificar y aplicar conexiones coherentes entre las matemáticas y otras materias realizando un análisis crítico.',
        },
        {
          course: '4ESO',
          code: '6.3',
          description:
            'Valorar la aportación de las matemáticas al progreso de la humanidad y su contribución en la superación de los retos que demanda la sociedad actual.',
        },
      ],
    },
    {
      code: '7',
      name: 'Representación matemática',
      description:
        'Representar, de forma individual y colectiva, conceptos, procedimientos, información y resultados matemáticos, usando diferentes tecnologías, para visualizar ideas y estructurar procesos matemáticos.',
      keyCompetencyCodes: ['STEM', 'CD', 'CE', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '7.1',
          description:
            'Representar matemáticamente la información más relevante de un problema, conceptos, procedimientos y resultados matemáticos visualizando ideas y estructurando procesos matemáticos.',
        },
        {
          course: '4ESO',
          code: '7.2',
          description:
            'Seleccionar entre diferentes herramientas, incluidas las digitales, y formas de representación (pictórica, gráfica, verbal o simbólica) valorando su utilidad para compartir información.',
        },
      ],
    },
    {
      code: '8',
      name: 'Comunicación matemática',
      description:
        'Comunicar de forma individual y colectiva conceptos, procedimientos y argumentos matemáticos, usando lenguaje oral, escrito o gráfico, utilizando la terminología matemática apropiada, para dar significado y coherencia a las ideas matemáticas.',
      keyCompetencyCodes: ['CCL', 'CP', 'STEM', 'CD', 'CE', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '8.1',
          description:
            'Comunicar ideas, conclusiones, conjeturas y razonamientos matemáticos, utilizando diferentes medios, incluidos los digitales, con coherencia, claridad y terminología apropiada.',
        },
        {
          course: '4ESO',
          code: '8.2',
          description:
            'Reconocer y emplear el lenguaje matemático presente en la vida cotidiana y en diversos contextos comunicando mensajes con contenido matemático con precisión y rigor.',
        },
      ],
    },
    {
      code: '9',
      name: 'Destrezas personales en el aprendizaje matemático',
      description:
        'Desarrollar destrezas personales, identificando y gestionando emociones, poniendo en práctica estrategias de aceptación del error como parte del proceso de aprendizaje y adaptándose ante situaciones de incertidumbre, para mejorar la perseverancia en la consecución de objetivos y el disfrute en el aprendizaje de las matemáticas.',
      keyCompetencyCodes: ['STEM', 'CPSAA', 'CE'],
      criteria: [
        {
          course: '4ESO',
          code: '9.1',
          description:
            'Identificar y gestionar las emociones propias y desarrollar el autoconcepto matemático generando expectativas positivas ante nuevos retos matemáticos.',
        },
        {
          course: '4ESO',
          code: '9.2',
          description:
            'Mostrar una actitud positiva y perseverante al hacer frente a las diferentes situaciones de aprendizaje de las matemáticas aceptando la crítica razonada.',
        },
      ],
    },
    {
      code: '10',
      name: 'Destrezas sociales en el aprendizaje matemático',
      description:
        'Desarrollar destrezas sociales reconociendo y respetando las emociones y experiencias de las demás personas, participando activa y reflexivamente en proyectos en equipos heterogéneos con roles asignados, para construir una identidad positiva como estudiante de matemáticas, fomentar el bienestar personal y grupal y crear relaciones saludables.',
      keyCompetencyCodes: ['CCL', 'CP', 'STEM', 'CPSAA', 'CC'],
      criteria: [
        {
          course: '4ESO',
          code: '10.1',
          description:
            'Colaborar activamente y construir relaciones trabajando con las matemáticas en equipos heterogéneos, respetando diferentes opiniones, comunicándose de manera efectiva, pensando de forma crítica y creativa, tomando decisiones y realizando juicios informados.',
        },
        {
          course: '4ESO',
          code: '10.2',
          description:
            'Gestionar el reparto de tareas en el trabajo en equipo, aportando valor, favoreciendo la inclusión, la escucha activa, responsabilizándose del rol asignado y de la propia contribución al equipo.',
        },
      ],
    },
  ],
  knowledgeBlocks: [
    // ──────────────────────────────────────────────────────────
    // A. Sentido numérico
    // ──────────────────────────────────────────────────────────
    {
      letter: 'A',
      title: 'Sentido numérico',
      items: [
        // A1. Conteo
        { course: '4ESO', code: 'A1.1', description: 'Resolución de situaciones y problemas de la vida cotidiana: estrategias para el recuento sistemático.' },
        // A2. Cantidad
        { course: '4ESO', code: 'A2.1', description: 'Realización de estimaciones en diversos contextos analizando y acotando el error cometido.' },
        { course: '4ESO', code: 'A2.2', description: 'Expresión de cantidades mediante números reales con la precisión requerida.' },
        { course: '4ESO', code: 'A2.3', description: 'Los conjuntos numéricos como forma de responder a diferentes necesidades: contar, medir, comparar, etc.' },
        // A3. Sentido de las operaciones
        { course: '4ESO', code: 'A3.1', description: 'Operaciones con números reales en la resolución de situaciones contextualizadas.' },
        { course: '4ESO', code: 'A3.2', description: 'Propiedades de las operaciones aritméticas: cálculos con números reales, incluyendo con herramientas digitales.' },
        { course: '4ESO', code: 'A3.3', description: 'Algunos números irracionales en situaciones de la vida cotidiana.' },
        // A4. Relaciones
        { course: '4ESO', code: 'A4.1', description: 'Patrones y regularidades numéricas en las que intervengan números reales.' },
        { course: '4ESO', code: 'A4.2', description: 'Orden en la recta numérica. Intervalos.' },
        // A5. Razonamiento proporcional
        { course: '4ESO', code: 'A5.1', description: 'Situaciones de proporcionalidad directa e inversa en diferentes contextos: desarrollo y análisis de métodos para la resolución de problemas.' },
        // A6. Educación financiera
        { course: '4ESO', code: 'A6.1', description: 'Métodos de resolución de problemas relacionados con aumentos y disminuciones porcentuales, intereses y tasas en contextos financieros.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // B. Sentido de la medida
    // ──────────────────────────────────────────────────────────
    {
      letter: 'B',
      title: 'Sentido de la medida',
      items: [
        // B1. Medición
        { course: '4ESO', code: 'B1.1', description: 'La pendiente y su relación con un ángulo en situaciones sencillas: deducción y aplicación.' },
        // B2. Cambio
        { course: '4ESO', code: 'B2.1', description: 'Estudio gráfico del crecimiento y decrecimiento de funciones en contextos de la vida cotidiana con el apoyo de herramientas tecnológicas: tasas de variación absoluta, relativa y media.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // C. Sentido espacial
    // ──────────────────────────────────────────────────────────
    {
      letter: 'C',
      title: 'Sentido espacial',
      items: [
        // C1. Figuras geométricas de dos y tres dimensiones
        { course: '4ESO', code: 'C1.1', description: 'Propiedades geométricas de objetos de la vida cotidiana: investigación con programas de geometría dinámica.' },
        // C2. Movimientos y transformaciones
        { course: '4ESO', code: 'C2.1', description: 'Transformaciones elementales en la vida cotidiana: investigación con herramientas tecnológicas como programas de geometría dinámica, realidad aumentada, etc.' },
        // C3. Visualización, razonamiento y modelización geométrica
        { course: '4ESO', code: 'C3.1', description: 'Modelos geométricos: representación y explicación de relaciones numéricas y algebraicas en situaciones diversas.' },
        { course: '4ESO', code: 'C3.2', description: 'Modelización de elementos geométricos de la vida cotidiana con herramientas tecnológicas como programas de geometría dinámica, realidad aumentada...' },
        { course: '4ESO', code: 'C3.3', description: 'Elaboración y comprobación de conjeturas sobre propiedades geométricas mediante programas de geometría dinámica u otras herramientas.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // D. Sentido algebraico
    // ──────────────────────────────────────────────────────────
    {
      letter: 'D',
      title: 'Sentido algebraico',
      items: [
        // D1. Patrones
        { course: '4ESO', code: 'D1.1', description: 'Patrones, pautas y regularidades: observación, generalización y término general en casos sencillos.' },
        // D2. Modelo matemático
        { course: '4ESO', code: 'D2.1', description: 'Modelización y resolución de problemas de la vida cotidiana mediante representaciones matemáticas y lenguaje algebraico, haciendo uso de distintos tipos de funciones.' },
        { course: '4ESO', code: 'D2.2', description: 'Estrategias de deducción y análisis de conclusiones razonables de una situación de la vida cotidiana a partir de un modelo.' },
        // D3. Variable
        { course: '4ESO', code: 'D3.1', description: 'Variables: asociación de expresiones simbólicas al contexto del problema y diferentes usos.' },
        { course: '4ESO', code: 'D3.2', description: 'Características del cambio en la representación gráfica de relaciones lineales y cuadráticas.' },
        // D4. Igualdad y desigualdad
        { course: '4ESO', code: 'D4.1', description: 'Relaciones lineales, cuadráticas y de proporcionalidad inversa en situaciones de la vida cotidiana o matemáticamente relevantes: expresión mediante álgebra simbólica.' },
        { course: '4ESO', code: 'D4.2', description: 'Formas equivalentes de expresiones algebraicas en la resolución de ecuaciones lineales y cuadráticas, y sistemas de ecuaciones e inecuaciones lineales.' },
        { course: '4ESO', code: 'D4.3', description: 'Estrategias de discusión y búsqueda de soluciones en ecuaciones lineales y cuadráticas en situaciones de la vida cotidiana.' },
        { course: '4ESO', code: 'D4.4', description: 'Ecuaciones, sistemas de ecuaciones e inecuaciones: resolución mediante el uso de la tecnología.' },
        // D5. Relaciones y funciones
        { course: '4ESO', code: 'D5.1', description: 'Relaciones cuantitativas en situaciones de la vida cotidiana y clases de funciones que las modelizan.' },
        { course: '4ESO', code: 'D5.2', description: 'Relaciones lineales y no lineales: identificación y comparación de diferentes modos de representación, tablas, gráficas o expresiones algebraicas, y sus propiedades a partir de ellas.' },
        { course: '4ESO', code: 'D5.3', description: 'Representación de funciones: interpretación de sus propiedades en situaciones de la vida cotidiana.' },
        // D6. Pensamiento computacional
        { course: '4ESO', code: 'D6.1', description: 'Resolución de problemas mediante la descomposición en partes, la automatización y el pensamiento algorítmico.' },
        { course: '4ESO', code: 'D6.2', description: 'Estrategias en la interpretación, modificación y creación de algoritmos.' },
        { course: '4ESO', code: 'D6.3', description: 'Formulación y análisis de problemas de la vida cotidiana mediante programas y otras herramientas.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // E. Sentido estocástico
    // ──────────────────────────────────────────────────────────
    {
      letter: 'E',
      title: 'Sentido estocástico',
      items: [
        // E1. Organización y análisis de datos
        { course: '4ESO', code: 'E1.1', description: 'Estrategias de recogida y organización de datos de situaciones de la vida cotidiana que involucren una variable bidimensional. Tablas de contingencia.' },
        { course: '4ESO', code: 'E1.2', description: 'Análisis e interpretación de tablas y gráficos estadísticos de una y dos variables cualitativas, cuantitativas discretas y cuantitativas continuas en contextos reales.' },
        { course: '4ESO', code: 'E1.3', description: 'Medidas de localización y dispersión: interpretación y análisis de la variabilidad.' },
        { course: '4ESO', code: 'E1.4', description: 'Gráficos estadísticos de una y dos variables: representación mediante diferentes tecnologías (calculadora, hoja de cálculo, aplicaciones..), análisis, interpretación y obtención de conclusiones razonadas.' },
        { course: '4ESO', code: 'E1.5', description: 'Interpretación de la relación entre dos variables, valorando gráficamente con herramientas tecnológicas la pertinencia de realizar una regresión lineal. Ajuste lineal con herramientas tecnológicas.' },
        // E2. Incertidumbre
        { course: '4ESO', code: 'E2.1', description: 'Experimentos compuestos: planificación, realización y análisis de la incertidumbre asociada.' },
        { course: '4ESO', code: 'E2.2', description: 'Probabilidad: cálculo aplicando la regla de Laplace y técnicas de recuento en experimentos simples y compuestos (mediante diagramas de árbol, tablas...) y aplicación a la toma de decisiones fundamentadas.' },
        // E3. Inferencia
        { course: '4ESO', code: 'E3.1', description: 'Diferentes etapas del diseño de estudios estadísticos.' },
        { course: '4ESO', code: 'E3.2', description: 'Estrategias y herramientas de presentación e interpretación de datos relevantes en investigaciones estadísticas mediante herramientas digitales adecuadas.' },
        { course: '4ESO', code: 'E3.3', description: 'Análisis del alcance de las conclusiones de un estudio estadístico valorando la representatividad de la muestra.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // F. Sentido socioafectivo
    // ──────────────────────────────────────────────────────────
    {
      letter: 'F',
      title: 'Sentido socioafectivo',
      items: [
        // F1. Creencias, actitudes y emociones
        { course: '4ESO', code: 'F1.1', description: 'Gestión emocional: emociones que intervienen en el aprendizaje de las matemáticas. Autoconciencia y autorregulación. Superación de bloqueos emocionales en el aprendizaje de las matemáticas.' },
        { course: '4ESO', code: 'F1.2', description: 'Estrategias de fomento de la curiosidad, la iniciativa, la perseverancia y la resiliencia en el aprendizaje de las matemáticas.' },
        { course: '4ESO', code: 'F1.3', description: 'Estrategias de fomento de la flexibilidad cognitiva: apertura a cambios de estrategia y transformación del error en oportunidad de aprendizaje.' },
        // F2. Trabajo en equipo y toma de decisiones
        { course: '4ESO', code: 'F2.1', description: 'Asunción de responsabilidades y participación activa, optimizando el trabajo en equipo. Estrategias de gestión de conflictos: pedir, dar y gestionar ayuda.' },
        { course: '4ESO', code: 'F2.2', description: 'Métodos para la gestión y la toma de decisiones adecuadas en la resolución de situaciones propias del quehacer matemático en el trabajo en equipo.' },
        // F3. Inclusión, respeto y diversidad
        { course: '4ESO', code: 'F3.1', description: 'Actitudes inclusivas y aceptación de la diversidad presente en el aula y en la sociedad.' },
        { course: '4ESO', code: 'F3.2', description: 'La contribución de las matemáticas al desarrollo de los distintos ámbitos del conocimiento humano desde una perspectiva de género.' },
      ],
    },
  ],
};
