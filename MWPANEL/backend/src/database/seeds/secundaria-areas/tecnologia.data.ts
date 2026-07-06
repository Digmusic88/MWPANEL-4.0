import { AreaData } from '../secundaria-curriculum.data';

export const AREA_TEC: AreaData = {
  subjectCode: 'TEC-1ESO',
  abbrev: 'TEC',
  areaName: 'Tecnología y Digitalización',
  competencies: [
    {
      code: '1',
      name: 'Búsqueda y selección de información tecnológica',
      description:
        'Buscar y seleccionar la información adecuada proveniente de diversas fuentes, de manera crítica y segura, aplicando procesos de investigación, métodos de análisis de productos y experimentando con herramientas de simulación, para definir problemas tecnológicos e iniciar procesos de creación de soluciones a partir de la información obtenida.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CPSAA', 'CE'],
      criteria: [
        {
          course: '1ESO',
          code: '1.1',
          description:
            'Definir problemas o necesidades planteadas, buscando y contrastando información procedente de diferentes fuentes de manera crítica, evaluando su fiabilidad y pertinencia.',
        },
        {
          course: '1ESO',
          code: '1.2',
          description:
            'Comprender y examinar productos tecnológicos de uso habitual a través del análisis de objetos y sistemas, empleando el método científico y utilizando herramientas de simulación en la construcción de conocimiento.',
        },
        {
          course: '1ESO',
          code: '1.3',
          description:
            'Adoptar medidas preventivas para la protección de los dispositivos, los datos y la salud personal, identificando problemas y riesgos relacionados con el uso de la tecnología y analizándolos de manera ética y crítica.',
        },
      ],
    },
    {
      code: '2',
      name: 'Diseño y desarrollo de soluciones tecnológicas',
      description:
        'Abordar problemas tecnológicos con autonomía y actitud creativa, aplicando conocimientos interdisciplinares y trabajando de forma ordenada y cooperativa, para diseñar, planificar y desarrollar soluciones a un problema o necesidad de forma eficaz, innovadora y sostenible.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CPSAA', 'CE'],
      criteria: [
        {
          course: '1ESO',
          code: '2.1',
          description:
            'Idear y diseñar soluciones eficaces, innovadoras y sostenibles a problemas definidos, aplicando conceptos, técnicas y procedimientos interdisciplinares, así como criterios de sostenibilidad, con actitud emprendedora, perseverante y creativa.',
        },
        {
          course: '1ESO',
          code: '2.2',
          description:
            'Seleccionar, planificar y organizar los materiales y herramientas, así como las tareas necesarias para la construcción de una solución a un problema planteado, trabajando individualmente o en grupo de manera cooperativa y colaborativa.',
        },
      ],
    },
    {
      code: '3',
      name: 'Fabricación de soluciones tecnológicas',
      description:
        'Aplicar de forma apropiada distintas técnicas y conocimientos interdisciplinares utilizando operadores, sistemas tecnológicos y herramientas, teniendo en cuenta la planificación y el diseño previo, para construir o fabricar soluciones tecnológicas y sostenibles que den respuesta a necesidades en diferentes contextos.',
      keyCompetencyCodes: ['STEM', 'CD', 'CPSAA', 'CE', 'CCEC'],
      criteria: [
        {
          course: '1ESO',
          code: '3.1',
          description:
            'Fabricar objetos o modelos mediante la manipulación y conformación de materiales, empleando herramientas y máquinas adecuadas, aplicando los fundamentos de estructuras, mecanismos, electricidad y electrónica y respetando las normas de seguridad y salud correspondientes.',
        },
      ],
    },
    {
      code: '4',
      name: 'Comunicación y difusión de soluciones tecnológicas',
      description:
        'Describir, representar e intercambiar ideas o soluciones a problemas tecnológicos o digitales, utilizando medios de representación, simbología y vocabulario adecuados, así como los instrumentos y recursos disponibles y valorando la utilidad de las herramientas digitales, para comunicar y difundir información y propuestas.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CCEC'],
      criteria: [
        {
          course: '1ESO',
          code: '4.1',
          description:
            'Representar y comunicar el proceso de creación de un producto desde su diseño hasta su difusión, elaborando documentación técnica y gráfica con la ayuda de herramientas digitales, empleando los formatos y el vocabulario técnico adecuados, de manera colaborativa, tanto presencialmente como en remoto.',
        },
      ],
    },
    {
      code: '5',
      name: 'Pensamiento computacional y programación',
      description:
        'Desarrollar algoritmos y aplicaciones informáticas en distintos entornos, aplicando los principios del pensamiento computacional e incorporando las tecnologías emergentes, para crear soluciones a problemas concretos, automatizar procesos y aplicarlos en sistemas de control o en robótica.',
      keyCompetencyCodes: ['CP', 'STEM', 'CD', 'CPSAA', 'CE'],
      criteria: [
        {
          course: '1ESO',
          code: '5.1',
          description:
            'Describir, interpretar y diseñar soluciones a problemas informáticos a través de algoritmos y diagramas de flujo, aplicando los elementos y técnicas de programación de manera creativa.',
        },
        {
          course: '1ESO',
          code: '5.2',
          description:
            'Programar aplicaciones sencillas para distintos dispositivos (ordenadores, dispositivos móviles y otros) empleando los elementos de programación de manera apropiada y aplicando herramientas de edición, así como módulos de inteligencia artificial que añadan funcionalidades a la solución.',
        },
        {
          course: '1ESO',
          code: '5.3',
          description:
            'Automatizar procesos, máquinas y objetos de manera autónoma, con conexión a internet, mediante el análisis, construcción y programación de robots y sistemas de control.',
        },
      ],
    },
    {
      code: '6',
      name: 'Uso eficiente del entorno digital de aprendizaje',
      description:
        'Comprender los fundamentos del funcionamiento de los dispositivos y aplicaciones habituales de su entorno digital de aprendizaje, analizando sus componentes y funciones y ajustándolos a sus necesidades, para hacer un uso más eficiente y seguro de los mismos y para detectar y resolver problemas técnicos sencillos.',
      keyCompetencyCodes: ['CP', 'CD', 'CPSAA'],
      criteria: [
        {
          course: '1ESO',
          code: '6.1',
          description:
            'Usar de manera eficiente y segura los dispositivos digitales de uso cotidiano en la resolución de problemas sencillos, analizando los componentes y los sistemas de comunicación, conociendo los riesgos y adoptando medidas de seguridad para la protección de datos y equipos.',
        },
        {
          course: '1ESO',
          code: '6.2',
          description:
            'Crear contenidos, elaborar materiales y difundirlos en distintas plataformas, configurando correctamente las herramientas digitales habituales del entorno de aprendizaje, ajustándolas a sus necesidades y respetando los derechos de autoría y la etiqueta digital.',
        },
        {
          course: '1ESO',
          code: '6.3',
          description:
            'Organizar la información de manera estructurada, aplicando técnicas de almacenamiento seguro.',
        },
      ],
    },
    {
      code: '7',
      name: 'Uso ético y sostenible de la tecnología',
      description:
        'Hacer un uso responsable y ético de la tecnología, mostrando interés por un desarrollo sostenible, identificando sus repercusiones y valorando la contribución de las tecnologías emergentes, para identificar las aportaciones y el impacto del desarrollo tecnológico en la sociedad y en el entorno.',
      keyCompetencyCodes: ['STEM', 'CD', 'CC'],
      criteria: [
        {
          course: '1ESO',
          code: '7.1',
          description:
            'Reconocer la influencia de la actividad tecnológica en la sociedad y en la sostenibilidad ambiental a lo largo de su historia, identificando sus aportaciones y repercusiones y valorando su importancia para el desarrollo sostenible.',
        },
        {
          course: '1ESO',
          code: '7.2',
          description:
            'Identificar las aportaciones de las tecnologías emergentes al bienestar, a la igualdad social y a la disminución del impacto ambiental, haciendo un uso responsable y ético de las mismas.',
        },
      ],
    },
  ],
  knowledgeBlocks: [
    {
      letter: 'A',
      title: 'Proceso de resolución de problemas',
      items: [
        {
          course: '1ESO',
          code: 'A.1',
          description:
            'Estrategias, técnicas y marcos de resolución de problemas en diferentes contextos y sus fases.',
        },
        {
          course: '1ESO',
          code: 'A.2',
          description:
            'Estrategias de búsqueda crítica de información para la investigación y definición de problemas planteados.',
        },
        {
          course: '1ESO',
          code: 'A.3',
          description:
            'Análisis de productos y de sistemas tecnológicos: construcción de conocimiento desde distintos enfoques y ámbitos.',
        },
        {
          course: '1ESO',
          code: 'A.4',
          description: 'Estructuras para la construcción de modelos.',
        },
        {
          course: '1ESO',
          code: 'A.5',
          description: 'Sistemas mecánicos básicos: montajes físicos o uso de simuladores.',
        },
        {
          course: '1ESO',
          code: 'A.6',
          description:
            'Electricidad y electrónica básica: montaje de esquemas y circuitos físicos o simulados. Interpretación, cálculo, diseño y aplicación en proyectos.',
        },
        {
          course: '1ESO',
          code: 'A.7',
          description: 'Materiales tecnológicos y su impacto ambiental.',
        },
        {
          course: '1ESO',
          code: 'A.8',
          description:
            'Herramientas y técnicas de manipulación y mecanizado de materiales en la construcción de objetos y prototipos. Introducción a la fabricación digital. Respeto de las normas de seguridad e higiene.',
        },
        {
          course: '1ESO',
          code: 'A.9',
          description:
            'Emprendimiento, resiliencia, perseverancia y creatividad para abordar problemas desde una perspectiva interdisciplinar.',
        },
      ],
    },
    {
      letter: 'B',
      title: 'Comunicación y difusión de ideas',
      items: [
        {
          course: '1ESO',
          code: 'B.1',
          description:
            'Habilidades básicas de comunicación interpersonal: vocabulario técnico apropiado y pautas de conducta propias del entorno virtual (etiqueta digital).',
        },
        {
          course: '1ESO',
          code: 'B.2',
          description: 'Técnicas de representación gráfica: acotación y escalas.',
        },
        {
          course: '1ESO',
          code: 'B.3',
          description:
            'Aplicaciones CAD en dos dimensiones y en tres dimensiones para la representación de esquemas, circuitos, planos y objetos.',
        },
        {
          course: '1ESO',
          code: 'B.4',
          description:
            'Herramientas digitales: para la elaboración, publicación y difusión de documentación técnica e información multimedia relativa a proyectos.',
        },
      ],
    },
    {
      letter: 'C',
      title: 'Pensamiento computacional, programación y robótica',
      items: [
        {
          course: '1ESO',
          code: 'C.1',
          description: 'Algoritmia y diagramas de flujo.',
        },
        {
          course: '1ESO',
          code: 'C.2',
          description:
            'Aplicaciones informáticas sencillas, para ordenador y dispositivos móviles, e introducción a la inteligencia artificial.',
        },
        {
          course: '1ESO',
          code: 'C.3',
          description:
            'Sistemas de control programado: montaje físico y uso de simuladores y programación sencilla de dispositivos. Internet de las cosas.',
        },
        {
          course: '1ESO',
          code: 'C.4',
          description:
            'Fundamentos de robótica: montaje y control programado de robots de manera física o por medio de simuladores.',
        },
        {
          course: '1ESO',
          code: 'C.5',
          description:
            'Autoconfianza e iniciativa: el error, la reevaluación y la depuración de errores como parte del proceso de aprendizaje.',
        },
      ],
    },
    {
      letter: 'D',
      title: 'Digitalización del entorno personal de aprendizaje',
      items: [
        {
          course: '1ESO',
          code: 'D.1',
          description:
            'Dispositivos digitales. Elementos del hardware y software. Identificación y resolución de problemas técnicos sencillos.',
        },
        {
          course: '1ESO',
          code: 'D.2',
          description:
            'Sistemas de comunicación digital de uso común. Transmisión de datos. Tecnologías inalámbricas para la comunicación.',
        },
        {
          course: '1ESO',
          code: 'D.3',
          description:
            'Herramientas y plataformas de aprendizaje: configuración, mantenimiento y uso crítico.',
        },
        {
          course: '1ESO',
          code: 'D.4',
          description:
            'Herramientas de edición y creación de contenidos: instalación, configuración y uso responsable. Propiedad intelectual.',
        },
        {
          course: '1ESO',
          code: 'D.5',
          description:
            'Técnicas de tratamiento, organización y almacenamiento seguro de la información. Copias de seguridad.',
        },
        {
          course: '1ESO',
          code: 'D.6',
          description:
            'Seguridad en la red: amenazas y ataques. Medidas de protección de datos y de información. Bienestar digital: prácticas seguras y riesgos (ciberacoso, sextorsión, vulneración de la propia imagen y de la intimidad, acceso a contenidos inadecuados, adicciones, etc.)',
        },
      ],
    },
    {
      letter: 'E',
      title: 'Tecnología sostenible',
      items: [
        {
          course: '1ESO',
          code: 'E.7',
          description:
            'Desarrollo tecnológico: creatividad, innovación, investigación, obsolescencia e impacto social y ambiental. Ética y aplicaciones de las tecnologías emergentes.',
        },
        {
          course: '1ESO',
          code: 'E.8',
          description:
            'Tecnología sostenible. Valoración crítica de la contribución a la consecución de los Objetivos de Desarrollo Sostenible.',
        },
      ],
    },
  ],
};
