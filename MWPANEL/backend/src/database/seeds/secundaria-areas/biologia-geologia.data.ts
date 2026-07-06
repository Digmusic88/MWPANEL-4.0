import { AreaData } from '../secundaria-curriculum.data';

// Fuente: BON 155, 4 agosto 2022 – Anexo II, BIOLOGÍA Y GEOLOGÍA (págs. 31-42)
// Cursos 1.º a 3.º ESO (primer tramo) y 4.º ESO (cuarto curso) – 6 competencias específicas.
// Nota: los bloques D y E tienen títulos distintos en 1.º-3.º ESO y en 4.º ESO; se mantienen
// bajo la misma letra para respetar los códigos de los saberes (D.x y E.x de 4.º ESO).

export const AREA_BG: AreaData = {
  subjectCode: 'BG-1ESO',
  abbrev: 'BG',
  areaName: 'Biología y Geología',
  competencies: [
    // ─────────────────────────────────────────────────────────────
    // Competencia específica 1
    // ─────────────────────────────────────────────────────────────
    {
      code: '1',
      name: 'Interpretación y transmisión de información científica',
      description:
        'Interpretar y transmitir información y datos científicos, argumentando sobre ellos y utilizando diferentes formatos, para analizar conceptos y procesos de las ciencias biológicas y geológicas.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CCEC'],
      criteria: [
        // 1.º ESO
        {
          course: '1ESO',
          code: '1.1',
          description:
            'Analizar conceptos y procesos relacionados con los saberes de la Biología y Geología interpretando información en diferentes formatos (modelos, gráficos, tablas, diagramas, fórmulas, esquemas, símbolos, páginas web...), y obteniendo conclusiones fundamentadas.',
        },
        {
          course: '1ESO',
          code: '1.2',
          description:
            'Facilitar la comprensión y análisis de información relacionada con los saberes de la materia de Biología y Geología transmitiéndola de forma clara utilizando la terminología y el formato adecuados (modelos, gráficos, tablas, vídeos, informes, diagramas, fórmulas, esquemas, símbolos, contenidos digitales...).',
        },
        {
          course: '1ESO',
          code: '1.3',
          description:
            'Reconocer fenómenos biológicos y geológicos representándolos mediante modelos y diagramas.',
        },
        // 3.º ESO
        {
          course: '3ESO',
          code: '1.1',
          description:
            'Analizar conceptos y procesos biológicos y geológicos interpretando información en diferentes formatos (modelos, gráficos, tablas, diagramas, fórmulas, esquemas, símbolos, páginas web, etc.), manteniendo una actitud crítica y obteniendo conclusiones fundamentadas.',
        },
        {
          course: '3ESO',
          code: '1.2',
          description:
            'Facilitar la comprensión y análisis de información sobre procesos biológicos y geológicos o trabajos científicos transmitiéndola de forma clara y utilizando la terminología y los formatos adecuados (modelos, gráficos, tablas, vídeos, informes, diagramas, fórmulas, esquemas, símbolos, contenidos digitales, etc.).',
        },
        {
          course: '3ESO',
          code: '1.3',
          description:
            'Analizar y explicar fenómenos biológicos y geológicos representándolos mediante modelos y diagramas, utilizando, cuando sea necesario, los pasos del diseño de ingeniería (identificación del problema, exploración, diseño, creación, evaluación y mejora).',
        },
        // 4.º ESO
        {
          course: '4ESO',
          code: '1.1',
          description:
            'Analizar conceptos y procesos biológicos y geológicos interpretando información en diferentes formatos (modelos, gráficos, tablas, diagramas, fórmulas, esquemas, símbolos, páginas web, etc.), manteniendo una actitud crítica, obteniendo conclusiones y formando opiniones propias fundamentadas.',
        },
        {
          course: '4ESO',
          code: '1.2',
          description:
            'Transmitir opiniones propias fundamentadas e información sobre Biología y Geología de forma clara y rigurosa, facilitando su comprensión y análisis mediante el uso de la terminología y el formato adecuados (modelos, gráficos, tablas, vídeos, informes, diagramas, fórmulas, esquemas, símbolos, contenidos digitales, etc.).',
        },
        {
          course: '4ESO',
          code: '1.3',
          description:
            'Analizar y explicar fenómenos biológicos y geológicos representándolos mediante el diseño y la realización de modelos y diagramas y utilizando, cuando sea necesario, los pasos del diseño de ingeniería (identificación del problema, exploración, diseño, creación, evaluación y mejora).',
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Competencia específica 2
    // ─────────────────────────────────────────────────────────────
    {
      code: '2',
      name: 'Localización y evaluación de información científica',
      description:
        'Identificar, localizar y seleccionar información, contrastando su veracidad, organizándola y evaluándola críticamente, para resolver preguntas relacionadas con las ciencias biológicas y geológicas.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CPSAA'],
      criteria: [
        // 1.º ESO
        {
          course: '1ESO',
          code: '2.1',
          description:
            'Resolver cuestiones relacionadas con los saberes de la materia de Biología y Geología, de forma guiada, localizando, seleccionando y organizando información mediante el uso y citación correctos de distintas fuentes.',
        },
        // 3.º ESO
        {
          course: '3ESO',
          code: '2.1',
          description:
            'Resolver cuestiones sobre Biología y Geología localizando, seleccionando y organizando información de distintas fuentes y citándolas correctamente.',
        },
        {
          course: '3ESO',
          code: '2.2',
          description:
            'Reconocer la información sobre temas biológicos y geológicos con base científica, distinguiéndola de pseudociencias, bulos, teorías conspiratorias y creencias infundadas y manteniendo una actitud escéptica ante estos.',
        },
        {
          course: '3ESO',
          code: '2.3',
          description:
            'Valorar la contribución de la ciencia a la sociedad y la labor de las personas dedicadas a ella con independencia de su etnia, sexo o cultura, destacando y reconociendo el papel de las mujeres científicas y entendiendo la investigación como una labor colectiva e interdisciplinar en constante evolución.',
        },
        // 4.º ESO
        {
          course: '4ESO',
          code: '2.1',
          description:
            'Resolver cuestiones y profundizar en aspectos biológicos y geológicos localizando, seleccionando, organizando y analizando críticamente la información de distintas fuentes y citándolas con respeto por la propiedad intelectual.',
        },
        {
          course: '4ESO',
          code: '2.2',
          description:
            'Contrastar la veracidad de la información sobre temas biológicos y geológicos o trabajos científicos, utilizando fuentes fiables y adoptando una actitud crítica y escéptica hacia informaciones sin una base científica como pseudociencias, teorías conspiratorias, creencias infundadas, bulos, etc.',
        },
        {
          course: '4ESO',
          code: '2.3',
          description:
            'Valorar la contribución de la ciencia a la sociedad y la labor de las personas dedicadas a ella, destacando el papel de la mujer y entendiendo la investigación como una labor colectiva e interdisciplinar en constante evolución influida por el contexto político y los recursos económicos.',
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Competencia específica 3
    // ─────────────────────────────────────────────────────────────
    {
      code: '3',
      name: 'Proyectos de investigación científica',
      description:
        'Planificar y desarrollar proyectos de investigación, siguiendo los pasos de las metodologías científicas y cooperando cuando sea necesario, para indagar en aspectos relacionados con las ciencias geológicas y biológicas.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CPSAA', 'CE'],
      criteria: [
        // 1.º ESO
        {
          course: '1ESO',
          code: '3.1',
          description:
            'Plantear preguntas e hipótesis, de forma guiada, que puedan ser respondidas o contrastadas utilizando métodos científicos intentando explicar fenómenos biológicos y/o geológicos.',
        },
        {
          course: '1ESO',
          code: '3.2',
          description:
            'Diseñar, de forma guiada, la experimentación, la toma de datos y el análisis de fenómenos biológicos y geológicos de modo que permitan responder a preguntas concretas y contrastar una hipótesis planteada.',
        },
        {
          course: '1ESO',
          code: '3.3',
          description:
            'Realizar de forma guiada experimentos y tomar datos cuantitativos o cualitativos sobre fenómenos biológicos y geológicos utilizando los instrumentos, herramientas o técnicas adecuadas con corrección.',
        },
        {
          course: '1ESO',
          code: '3.4',
          description:
            'Interpretar los resultados obtenidos en el proyecto de investigación utilizando, cuando sea necesario, herramientas matemáticas y tecnológicas.',
        },
        {
          course: '1ESO',
          code: '3.5',
          description:
            'Cooperar dentro de un proyecto científico asumiendo responsablemente una función concreta, utilizando espacios virtuales cuando sea necesario, respetando la diversidad y la igualdad de género, y favoreciendo la inclusión.',
        },
        // 3.º ESO
        {
          course: '3ESO',
          code: '3.1',
          description:
            'Plantear preguntas e hipótesis e intentar realizar predicciones sobre fenómenos biológicos o geológicos que puedan ser respondidas o contrastadas utilizando métodos científicos.',
        },
        {
          course: '3ESO',
          code: '3.2',
          description:
            'Diseñar la experimentación, la toma de datos y el análisis de fenómenos biológicos y geológicos de modo que permitan responder a preguntas concretas y contrastar una hipótesis planteada.',
        },
        {
          course: '3ESO',
          code: '3.3',
          description:
            'Realizar experimentos y tomar datos cuantitativos o cualitativos sobre fenómenos biológicos y geológicos utilizando los instrumentos, herramientas o técnicas adecuadas con corrección.',
        },
        {
          course: '3ESO',
          code: '3.4',
          description:
            'Interpretar los resultados obtenidos en un proyecto de investigación utilizando, cuando sea necesario, herramientas matemáticas y tecnológicas.',
        },
        {
          course: '3ESO',
          code: '3.5',
          description:
            'Cooperar dentro de un proyecto científico asumiendo responsablemente una función concreta, utilizando espacios virtuales cuando sea necesario, respetando la diversidad y la igualdad de género, y favoreciendo la inclusión.',
        },
        // 4.º ESO
        {
          course: '4ESO',
          code: '3.1',
          description:
            'Plantear preguntas e hipótesis que puedan ser respondidas o contrastadas utilizando métodos científicos, en la explicación de fenómenos biológicos y geológicos y la realización de predicciones sobre estos.',
        },
        {
          course: '4ESO',
          code: '3.2',
          description:
            'Diseñar la experimentación, la toma de datos y el análisis de fenómenos biológicos y geológicos de modo que permitan responder a preguntas concretas y contrastar una hipótesis planteada evitando sesgos.',
        },
        {
          course: '4ESO',
          code: '3.3',
          description:
            'Realizar experimentos y tomar datos cuantitativos o cualitativos sobre fenómenos biológicos y geológicos utilizando los instrumentos, herramientas o técnicas adecuadas con corrección y precisión.',
        },
        {
          course: '4ESO',
          code: '3.4',
          description:
            'Interpretar y analizar los resultados obtenidos en un proyecto de investigación utilizando, cuando sea necesario, herramientas matemáticas y tecnológicas y obteniendo conclusiones razonadas y fundamentadas o a valorar la imposibilidad de hacerlo.',
        },
        {
          course: '4ESO',
          code: '3.5',
          description:
            'Cooperar y colaborar en las distintas fases de un proyecto científico para trabajar con mayor eficiencia, valorando la importancia de la cooperación en la investigación, respetando la diversidad y la igualdad de género, y favoreciendo la inclusión.',
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Competencia específica 4
    // ─────────────────────────────────────────────────────────────
    {
      code: '4',
      name: 'Razonamiento y pensamiento computacional en biología y geología',
      description:
        'Utilizar el razonamiento y el pensamiento computacional, analizando críticamente las respuestas y soluciones y reformulando el procedimiento, si fuera necesario, para resolver problemas o dar explicación a procesos de la vida cotidiana relacionados con la biología y la geología.',
      keyCompetencyCodes: ['STEM', 'CD', 'CPSAA', 'CE', 'CCEC'],
      criteria: [
        // 1.º ESO
        {
          course: '1ESO',
          code: '4.1',
          description:
            'Resolver problemas o dar explicación a procesos biológicos o geológicos, de forma guiada, utilizando conocimientos, datos e información proporcionados por la persona docente, el razonamiento lógico, el pensamiento computacional o recursos digitales.',
        },
        {
          course: '1ESO',
          code: '4.2',
          description:
            'Analizar la solución a un problema sobre fenómenos biológicos y geológicos.',
        },
        // 3.º ESO
        {
          course: '3ESO',
          code: '4.1',
          description:
            'Resolver problemas o dar explicación a procesos biológicos o geológicos utilizando conocimientos, datos e información proporcionados por la persona docente, el razonamiento lógico, el pensamiento computacional o recursos digitales.',
        },
        {
          course: '3ESO',
          code: '4.2',
          description:
            'Analizar críticamente la solución a un problema sobre fenómenos biológicos y geológicos.',
        },
        // 4.º ESO
        {
          course: '4ESO',
          code: '4.1',
          description:
            'Resolver problemas o dar explicación a procesos biológicos o geológicos utilizando conocimientos, datos e información proporcionados por la persona docente, el razonamiento lógico, el pensamiento computacional o recursos digitales.',
        },
        {
          course: '4ESO',
          code: '4.2',
          description:
            'Analizar críticamente la solución a un problema sobre fenómenos biológicos y geológicos, cambiando los procedimientos utilizados o las conclusiones si dicha solución no fuese viable o ante nuevos datos aportados con posterioridad.',
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Competencia específica 5
    // ─────────────────────────────────────────────────────────────
    {
      code: '5',
      name: 'Hábitos saludables y sostenibles',
      description:
        'Analizar los efectos de determinadas acciones sobre el medio ambiente y la salud, basándose en los fundamentos de las ciencias biológicas y de la Tierra, para promover y adoptar hábitos que eviten o minimicen los impactos medioambientales negativos, sean compatibles con un desarrollo sostenible y permitan mantener y mejorar la salud individual y colectiva.',
      keyCompetencyCodes: ['STEM', 'CD', 'CPSAA', 'CC', 'CE'],
      criteria: [
        // 1.º ESO
        {
          course: '1ESO',
          code: '5.1',
          description:
            'Relacionar con fundamentos científicos la preservación de la biodiversidad, la conservación del medio ambiente, la protección de los seres vivos del entorno, el desarrollo sostenible y la calidad de vida.',
        },
        {
          course: '1ESO',
          code: '5.2',
          description:
            'Proponer y adoptar hábitos sostenibles, analizando de una manera crítica las actividades propias y ajenas a partir de los propios razonamientos, de los conocimientos adquiridos e información disponible.',
        },
        // 3.º ESO
        {
          course: '3ESO',
          code: '5.1',
          description:
            'Relacionar, con fundamentos científicos, la preservación de la biodiversidad, la conservación del medio ambiente, la protección de los seres vivos del entorno, el desarrollo sostenible y la calidad de vida.',
        },
        {
          course: '3ESO',
          code: '5.2',
          description:
            'Proponer y adoptar hábitos sostenibles, analizando de una manera crítica las actividades propias y ajenas a partir de los propios razonamientos, de los conocimientos adquiridos y de la información disponible.',
        },
        {
          course: '3ESO',
          code: '5.3',
          description:
            'Proponer y adoptar hábitos saludables, analizando las acciones propias y ajenas con actitud crítica y a partir de fundamentos fisiológicos.',
        },
        // 4.º ESO
        {
          course: '4ESO',
          code: '5.1',
          description:
            'Identificar los posibles riesgos naturales potenciados por determinadas acciones humanas sobre una zona geográfica, teniendo en cuenta sus características litológicas, relieve, vegetación y factores socioeconómicos.',
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Competencia específica 6
    // ─────────────────────────────────────────────────────────────
    {
      code: '6',
      name: 'Interpretación geológica del relieve',
      description:
        'Analizar los elementos de un paisaje concreto valorándolo como patrimonio natural y utilizando conocimientos sobre geología y ciencias de la Tierra para explicar su historia geológica, proponer acciones encaminadas a su protección e identificar posibles riesgos naturales.',
      keyCompetencyCodes: ['STEM', 'CD', 'CC', 'CE', 'CCEC'],
      criteria: [
        // 1.º ESO
        {
          course: '1ESO',
          code: '6.1',
          description:
            'Valorar la importancia del paisaje como patrimonio natural analizando la fragilidad de los elementos que lo componen.',
        },
        {
          course: '1ESO',
          code: '6.2',
          description:
            'Interpretar el paisaje analizando sus elementos y reflexionando sobre el impacto ambiental y los riesgos naturales derivados de determinadas acciones humanas.',
        },
        {
          course: '1ESO',
          code: '6.3',
          description:
            'Reflexionar sobre los riesgos naturales mediante el análisis de los elementos de un paisaje.',
        },
        // 4.º ESO
        {
          course: '4ESO',
          code: '6.1',
          description:
            'Deducir y explicar la historia geológica de un relieve identificando sus elementos más relevantes a partir de cortes, mapas u otros sistemas de información geológica y utilizando el razonamiento, los principios geológicos básicos (horizontalidad, superposición, actualismo, etc.) y las teorías geológicas más relevantes.',
        },
      ],
    },
  ],

  knowledgeBlocks: [
    // ─────────────────────────────────────────────────────────────
    // A. Proyecto científico
    // ─────────────────────────────────────────────────────────────
    {
      letter: 'A',
      title: 'Proyecto científico',
      items: [
        // 1.º-3.º ESO
        { course: '1ESO', code: 'A.1', description: 'Hipótesis, preguntas y conjeturas: planteamiento con perspectiva científica.' },
        { course: '1ESO', code: 'A.2', description: 'Estrategias para la búsqueda de información, la colaboración y la comunicación de procesos, resultados o ideas científicas: herramientas digitales y formatos de uso frecuente en ciencia (presentación, gráfica, vídeo, póster, informe, etc.).' },
        { course: '1ESO', code: 'A.3', description: 'Fuentes fidedignas de información científica: reconocimiento y utilización.' },
        { course: '1ESO', code: 'A.4', description: 'La respuesta a cuestiones científicas mediante la experimentación y el trabajo de campo: utilización de los instrumentos y espacios necesarios (laboratorio, aulas, entorno, etc.) de forma adecuada.' },
        { course: '1ESO', code: 'A.5', description: 'Modelado como método de representación y comprensión de procesos o elementos de la naturaleza.' },
        { course: '1ESO', code: 'A.6', description: 'Métodos de observación y de toma de datos de fenómenos naturales.' },
        { course: '1ESO', code: 'A.7', description: 'Métodos de análisis de resultados. Diferenciación entre correlación y causalidad.' },
        { course: '1ESO', code: 'A.8', description: 'La labor científica y las personas dedicadas a la ciencia: contribución a las ciencias biológicas y geológicas e importancia social. El papel de la mujer en la ciencia.' },
        { course: '3ESO', code: 'A.1', description: 'Hipótesis, preguntas y conjeturas: planteamiento con perspectiva científica.' },
        { course: '3ESO', code: 'A.2', description: 'Estrategias para la búsqueda de información, la colaboración y la comunicación de procesos, resultados o ideas científicas: herramientas digitales y formatos de uso frecuente en ciencia (presentación, gráfica, vídeo, póster, informe, etc.).' },
        { course: '3ESO', code: 'A.3', description: 'Fuentes fidedignas de información científica: reconocimiento y utilización.' },
        { course: '3ESO', code: 'A.4', description: 'La respuesta a cuestiones científicas mediante la experimentación y el trabajo de campo: utilización de los instrumentos y espacios necesarios (laboratorio, aulas, entorno, etc.) de forma adecuada.' },
        { course: '3ESO', code: 'A.5', description: 'Modelado como método de representación y comprensión de procesos o elementos de la naturaleza.' },
        { course: '3ESO', code: 'A.6', description: 'Métodos de observación y de toma de datos de fenómenos naturales.' },
        { course: '3ESO', code: 'A.7', description: 'Métodos de análisis de resultados. Diferenciación entre correlación y causalidad.' },
        { course: '3ESO', code: 'A.8', description: 'La labor científica y las personas dedicadas a la ciencia: contribución a las ciencias biológicas y geológicas e importancia social. El papel de la mujer en la ciencia.' },
        // 4.º ESO
        { course: '4ESO', code: 'A.1', description: 'Hipótesis, preguntas y conjeturas: planteamiento con perspectiva científica.' },
        { course: '4ESO', code: 'A.2', description: 'Estrategias para la búsqueda de información, la colaboración y la comunicación de procesos, resultados o ideas científicas: herramientas digitales y formatos de uso frecuente en ciencia (presentación, gráfica, vídeo, póster, informe, etc.).' },
        { course: '4ESO', code: 'A.3', description: 'Fuentes fidedignas de información científica: reconocimiento y utilización.' },
        { course: '4ESO', code: 'A.4', description: 'Controles experimentales (positivos y negativos): diseño e importancia para la obtención de resultados científicos objetivos y fiables.' },
        { course: '4ESO', code: 'A.5', description: 'Respuesta a cuestiones científicas mediante la experimentación y el trabajo de campo: utilización de los instrumentos y espacios necesarios (laboratorio, aulas, entorno, etc.) de forma adecuada y precisa.' },
        { course: '4ESO', code: 'A.6', description: 'Modelado para la representación y comprensión de procesos o elementos de la naturaleza.' },
        { course: '4ESO', code: 'A.7', description: 'Métodos de observación y de toma de datos de fenómenos naturales.' },
        { course: '4ESO', code: 'A.8', description: 'Métodos de análisis de resultados. Diferenciación entre correlación y causalidad.' },
        { course: '4ESO', code: 'A.9', description: 'La labor científica y las personas dedicadas a la ciencia: contribución a las ciencias biológicas y geológicas e importancia social. El papel de la mujer en la ciencia.' },
        { course: '4ESO', code: 'A.10', description: 'La evolución histórica del saber científico: la ciencia como labor colectiva, interdisciplinar y en continua construcción.' },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // B. Geología
    // ─────────────────────────────────────────────────────────────
    {
      letter: 'B',
      title: 'Geología',
      items: [
        // 1.º ESO
        { course: '1ESO', code: 'B.1', description: 'Conceptos de roca y mineral: características y propiedades.' },
        { course: '1ESO', code: 'B.2', description: 'Estrategias de clasificación de las rocas: sedimentarias, metamórficas e ígneas. El ciclo de las rocas.' },
        { course: '1ESO', code: 'B.3', description: 'Rocas y minerales relevantes o del entorno: identificación.' },
        { course: '1ESO', code: 'B.4', description: 'Usos de los minerales y las rocas: su utilización en la fabricación de materiales y objetos cotidianos.' },
        { course: '1ESO', code: 'B.5', description: 'La estructura básica de la geosfera.' },
        { course: '1ESO', code: 'B.6', description: 'Los elementos del paisaje: relación con los agentes geológicos.' },
        // 4.º ESO
        { course: '4ESO', code: 'B.1', description: 'Relieve y paisaje: diferencias, su importancia como recursos y factores que intervienen en su formación y modelado.' },
        { course: '4ESO', code: 'B.2', description: 'Estructura y dinámica de la geosfera. Métodos de estudio.' },
        { course: '4ESO', code: 'B.3', description: 'Los efectos globales de la dinámica de la geosfera desde la perspectiva de la tectónica de placas.' },
        { course: '4ESO', code: 'B.4', description: 'Procesos geológicos externos e internos: diferencias y relación con los riesgos naturales. Medidas de prevención y mapas de riesgos.' },
        { course: '4ESO', code: 'B.5', description: 'Los cortes geológicos: interpretación y trazado de la historia geológica que reflejan mediante la aplicación de los principios de estudio de la historia de la Tierra (horizontalidad, superposición, intersección, sucesión faunística, etc.).' },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // C. La célula
    // ─────────────────────────────────────────────────────────────
    {
      letter: 'C',
      title: 'La célula',
      items: [
        // 1.º ESO
        { course: '1ESO', code: 'C.1', description: 'La célula como unidad estructural y funcional de los seres vivos.' },
        { course: '1ESO', code: 'C.2', description: 'La célula procariota, la célula eucariota animal y la célula eucariota vegetal, y sus partes.' },
        { course: '1ESO', code: 'C.3', description: 'Observación y comparación de muestras microscópicas.' },
        // 3.º ESO
        { course: '3ESO', code: 'C.1', description: 'La célula como unidad estructural y funcional de los seres vivos.' },
        { course: '3ESO', code: 'C.2', description: 'La célula procariota, la célula eucariota animal y la célula eucariota vegetal, y sus partes.' },
        { course: '3ESO', code: 'C.3', description: 'Observación y comparación de muestras microscópicas.' },
        // 4.º ESO
        { course: '4ESO', code: 'C.1', description: 'Las fases del ciclo celular.' },
        { course: '4ESO', code: 'C.2', description: 'La función biológica de la mitosis, la meiosis y sus fases.' },
        { course: '4ESO', code: 'C.3', description: 'Destrezas de observación de las distintas fases de la mitosis al microscopio.' },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // D. Seres vivos / Genética y evolución
    // Nota: letras D.x corresponden a "Seres vivos" (1.º ESO) y
    // "Genética y evolución" (4.º ESO); se agrupan bajo la misma
    // letra para mantener la coherencia de códigos de saberes.
    // ─────────────────────────────────────────────────────────────
    {
      letter: 'D',
      title: 'Seres vivos',
      items: [
        // 1.º ESO – Seres vivos
        { course: '1ESO', code: 'D.1', description: 'Los seres vivos: diferenciación y clasificación en los principales reinos.' },
        { course: '1ESO', code: 'D.2', description: 'Los principales grupos taxonómicos: observación de especies del entorno y clasificación a partir de sus características distintivas.' },
        { course: '1ESO', code: 'D.3', description: 'Las especies del entorno: estrategias de identificación (guías, claves dicotómicas, herramientas digitales, visu, etc.).' },
        { course: '1ESO', code: 'D.4', description: 'Los animales como seres sintientes: semejanzas y diferencias con los seres vivos no sintientes.' },
        // 4.º ESO – Genética y evolución
        { course: '4ESO', code: 'D.1', description: 'Modelo simplificado de la estructura del ADN y del ARN y relación con su función y síntesis.' },
        { course: '4ESO', code: 'D.2', description: 'Estrategias de extracción de ADN de una célula eucariota.' },
        { course: '4ESO', code: 'D.3', description: 'Etapas de la expresión génica, características del código genético y resolución de problemas relacionados con estas.' },
        { course: '4ESO', code: 'D.4', description: 'Relación entre las mutaciones, la replicación del ADN, el cáncer, la evolución y la biodiversidad.' },
        { course: '4ESO', code: 'D.5', description: 'El proceso evolutivo de las características de una especie determinada a la luz de la teoría neodarwinista y de otras teorías con relevancia histórica (lamarckismo y darwinismo).' },
        { course: '4ESO', code: 'D.6', description: 'Fenotipo y genotipo: definición y diferencias.' },
        { course: '4ESO', code: 'D.7', description: 'Estrategias de resolución de problemas sencillos de herencia genética de caracteres con relación de dominancia y recesividad con uno o dos genes.' },
        { course: '4ESO', code: 'D.8', description: 'Estrategias de resolución de problemas sencillos de herencia del sexo y de herencia genética de caracteres con relación de codominancia, dominancia incompleta, alelismo múltiple y ligada al sexo con uno o dos genes.' },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // E. Ecología y sostenibilidad / La Tierra en el Universo
    // Nota: letras E.x corresponden a "Ecología y sostenibilidad"
    // (1.º ESO) y "La Tierra en el Universo" (4.º ESO).
    // ─────────────────────────────────────────────────────────────
    {
      letter: 'E',
      title: 'Ecología y sostenibilidad',
      items: [
        // 1.º ESO – Ecología y sostenibilidad
        { course: '1ESO', code: 'E.1', description: 'Los ecosistemas del entorno, sus componentes bióticos y abióticos y los tipos de relaciones intraespecíficas e interespecíficas.' },
        { course: '1ESO', code: 'E.2', description: 'La importancia de la conservación de los ecosistemas, la biodiversidad y la implantación de un modelo de desarrollo sostenible.' },
        { course: '1ESO', code: 'E.3', description: 'Las funciones de la atmósfera y la hidrosfera y su papel esencial para la vida en la Tierra.' },
        { course: '1ESO', code: 'E.4', description: 'Las interacciones entre atmósfera, hidrosfera, geosfera y biosfera, su papel en la edafogénesis y en el modelado del relieve y su importancia para la vida. Las funciones del suelo.' },
        { course: '1ESO', code: 'E.5', description: 'Las causas del cambio climático y sus consecuencias sobre los ecosistemas.' },
        { course: '1ESO', code: 'E.6', description: 'La importancia de los hábitos sostenibles (consumo responsable, prevención y gestión de residuos, respeto al medio ambiente, etc.).' },
        { course: '1ESO', code: 'E.7', description: 'La relación entre la salud medioambiental, humana y de otros seres vivos: one health (una sola salud).' },
        // 4.º ESO – La Tierra en el Universo
        { course: '4ESO', code: 'E.1', description: 'El origen del universo y del sistema solar.' },
        { course: '4ESO', code: 'E.2', description: 'Componentes del sistema solar: estructura y características.' },
        { course: '4ESO', code: 'E.3', description: 'Hipótesis sobre el origen de la vida en la Tierra.' },
        { course: '4ESO', code: 'E.4', description: 'Principales investigaciones en el campo de la astrobiología.' },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // F. Cuerpo humano
    // ─────────────────────────────────────────────────────────────
    {
      letter: 'F',
      title: 'Cuerpo humano',
      items: [
        // 3.º ESO
        { course: '3ESO', code: 'F.1', description: 'Importancia de la función de nutrición. Los aparatos que participan en ella.' },
        { course: '3ESO', code: 'F.2', description: 'Anatomía y fisiología básicas de los aparatos digestivo, respiratorio, circulatorio, excretor y reproductor.' },
        { course: '3ESO', code: 'F.3', description: 'Visión general de la función de relación: receptores sensoriales, centros de coordinación y órganos efectores.' },
        { course: '3ESO', code: 'F.4', description: 'Relación entre los principales sistemas y aparatos del organismo implicados en las funciones de nutrición, relación y reproducción mediante la aplicación de conocimientos de fisiología y anatomía.' },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // G. Hábitos saludables
    // ─────────────────────────────────────────────────────────────
    {
      letter: 'G',
      title: 'Hábitos saludables',
      items: [
        // 3.º ESO
        { course: '3ESO', code: 'G.1', description: 'Características y elementos propios de una dieta saludable y su importancia.' },
        { course: '3ESO', code: 'G.2', description: 'Conceptos de sexo y sexualidad: importancia del respeto hacia la libertad y la diversidad sexual y hacia la igualdad de género, dentro de una educación sexual integral como parte de un desarrollo armónico.' },
        { course: '3ESO', code: 'G.3', description: 'Educación afectivo-sexual desde la perspectiva de la igualdad entre personas y el respeto a la diversidad sexual. La importancia de las prácticas sexuales responsables. La asertividad y el autocuidado. La prevención de infecciones de transmisión sexual (ITS) y de embarazos no deseados. El uso adecuado de métodos anticonceptivos y de métodos de prevención de ITS.' },
        { course: '3ESO', code: 'G.4', description: 'Las drogas legales e ilegales: sus efectos perjudiciales sobre la salud de las personas consumidoras y de quienes están en su entorno próximo.' },
        { course: '3ESO', code: 'G.5', description: 'Los hábitos saludables: su importancia en la conservación de la salud física, mental y social (higiene del sueño, hábitos posturales, uso responsable de las nuevas tecnologías, actividad física, autorregulación emocional, cuidado y corresponsabilidad, etc.).' },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // H. Salud y enfermedad
    // ─────────────────────────────────────────────────────────────
    {
      letter: 'H',
      title: 'Salud y enfermedad',
      items: [
        // 3.º ESO
        { course: '3ESO', code: 'H.1', description: 'Concepto de enfermedades infecciosas y no infecciosas: diferenciación según su etiología.' },
        { course: '3ESO', code: 'H.2', description: 'Medidas de prevención y tratamientos de las enfermedades infecciosas en función de su agente causal y la importancia del uso adecuado de los antibióticos.' },
        { course: '3ESO', code: 'H.3', description: 'Las barreras del organismo frente a los patógenos (mecánicas, estructurales, bioquímicas y biológicas).' },
        { course: '3ESO', code: 'H.4', description: 'Mecanismos de defensa del organismo frente a agentes patógenos (barreras externas y sistema inmunitario): su papel en la prevención y superación de enfermedades infecciosas.' },
        { course: '3ESO', code: 'H.5', description: 'La importancia de la vacunación en la prevención de enfermedades y en la mejora de la calidad de vida humana.' },
        { course: '3ESO', code: 'H.6', description: 'Los trasplantes y la importancia de la donación de órganos.' },
      ],
    },
  ],
};
