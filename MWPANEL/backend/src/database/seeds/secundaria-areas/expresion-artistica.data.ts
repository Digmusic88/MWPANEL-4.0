import { AreaData } from '../secundaria-curriculum.data';

export const AREA_EXART: AreaData = {
  subjectCode: 'EXART-4ESO',
  abbrev: 'EXART',
  areaName: 'Expresión Artística',
  competencies: [
    {
      code: '1',
      name: 'Análisis y valoración de manifestaciones artísticas',
      description:
        'Analizar manifestaciones artísticas, contextualizándolas, describiendo sus aspectos esenciales y valorando el proceso de creación y el resultado final, para educar la mirada, alimentar el imaginario, reforzar la confianza y ampliar las posibilidades de disfrute del patrimonio cultural y artístico.',
      keyCompetencyCodes: ['CCL', 'CP', 'CD', 'CPSAA', 'CC', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '1.1',
          description:
            'Analizar manifestaciones artísticas de diferentes épocas y culturas, contextualizándolas, describiendo sus aspectos esenciales, valorando el proceso de creación y el resultado final, y evidenciando una actitud de apertura, interés y respeto en su recepción.',
        },
        {
          course: '4ESO',
          code: '1.2',
          description:
            'Valorar críticamente los hábitos, los gustos y los referentes artísticos de diferentes épocas y culturas, reflexionando sobre su evolución y sobre su relación con los del presente.',
        },
      ],
    },
    {
      code: '2',
      name: 'Exploración de técnicas gráfico-plásticas',
      description:
        'Explorar las posibilidades expresivas de diferentes técnicas gráfico-plásticas, empleando distintos medios, soportes, herramientas y lenguajes, para incorporarlas al repertorio personal de recursos y desarrollar el criterio de selección de las más adecuadas a cada necesidad o intención.',
      keyCompetencyCodes: ['CD', 'CPSAA', 'CC', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '2.1',
          description:
            'Participar, con iniciativa, confianza y creatividad, en la exploración de diferentes técnicas gráfico-plásticas, empleando herramientas, medios, soportes y lenguajes.',
        },
        {
          course: '4ESO',
          code: '2.2',
          description:
            'Elaborar producciones gráfico-plásticas de forma creativa, determinando las intenciones expresivas y seleccionando con corrección las herramientas, medios, soportes y lenguajes más adecuados de entre los que conforman el repertorio personal de recursos.',
        },
        {
          course: '4ESO',
          code: '2.3',
          description:
            'Realizar producciones elementales en el entorno del diseño, empleando herramientas propias del Dibujo Técnico y un lenguaje básico basado en la normalización y sus convencionalismos.',
        },
      ],
    },
    {
      code: '3',
      name: 'Exploración de medios, técnicas y formatos audiovisuales',
      description:
        'Explorar las posibilidades expresivas de diferentes medios, técnicas y formatos audiovisuales, decodificando sus lenguajes, identificando las herramientas y distinguiendo sus fines, para incorporarlos al repertorio personal de recursos y desarrollar el criterio de selección de los más adecuados a cada necesidad o intención.',
      keyCompetencyCodes: ['CD', 'CPSAA', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '3.1',
          description:
            'Participar, con iniciativa, confianza y creatividad, en la exploración de diferentes medios, técnicas y formatos audiovisuales, decodificando sus lenguajes, identificando las herramientas y distinguiendo sus fines.',
        },
        {
          course: '4ESO',
          code: '3.2',
          description:
            'Realizar producciones audiovisuales, individuales o colaborativas, asumiendo diferentes funciones; incorporando el uso de las tecnologías digitales con una intención expresiva; buscando un resultado final ajustado al proyecto preparado previamente; y seleccionando y empleando, con corrección y de forma creativa, las herramientas y medios disponibles más adecuados.',
        },
      ],
    },
    {
      code: '4',
      name: 'Creación de producciones artísticas',
      description:
        'Crear producciones artísticas, individuales o grupales, realizadas con diferentes técnicas y herramientas, incluido el propio cuerpo, a partir de un motivo o intención previos, adaptando el diseño y el proceso a las necesidades e indicaciones de realización y teniendo en cuenta las características del público destinatario, para compartirlas y valorar las oportunidades de desarrollo personal, social, académico o profesional que pueden derivarse de esta actividad.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CPSAA', 'CE', 'CCEC'],
      criteria: [
        {
          course: '4ESO',
          code: '4.1',
          description:
            'Crear un producto artístico individual o grupal, de forma colaborativa y abierta, diseñando las fases del proceso y seleccionando las técnicas y herramientas más adecuadas para conseguir un resultado adaptado a una intención y a un público determinados.',
        },
        {
          course: '4ESO',
          code: '4.2',
          description:
            'Exponer el resultado final de la creación de un producto artístico, individual o grupal, poniendo en común y valorando críticamente el desarrollo de su elaboración, las dificultades encontradas, los progresos realizados y los logros alcanzados.',
        },
        {
          course: '4ESO',
          code: '4.3',
          description:
            'Identificar oportunidades de desarrollo personal, social, académico o profesional relacionadas con el ámbito artístico, comprendiendo su valor añadido y expresando la opinión personal de forma razonada y respetuosa.',
        },
      ],
    },
  ],
  knowledgeBlocks: [
    // ──────────────────────────────────────────────────────────
    // A. Técnicas gráfico-plásticas
    // ──────────────────────────────────────────────────────────
    {
      letter: 'A',
      title: 'Técnicas gráfico-plásticas',
      items: [
        { course: '4ESO', code: 'A.1', description: 'Los efectos del gesto y del instrumento: herramientas, medios y soportes. Cualidades plásticas y efectos visuales.' },
        { course: '4ESO', code: 'A.2', description: 'Técnicas de dibujo y pintura: técnicas secas y húmedas.' },
        { course: '4ESO', code: 'A.3', description: 'Técnicas mixtas y alternativas de las vanguardias artísticas. Posibilidades expresivas y contexto histórico.' },
        { course: '4ESO', code: 'A.4', description: 'Técnicas de estampación. Procedimientos directos, aditivos, sustractivos y mixtos.' },
        { course: '4ESO', code: 'A.5', description: 'Grafiti y pintura mural.' },
        { course: '4ESO', code: 'A.6', description: 'Técnicas básicas de creación de volúmenes.' },
        { course: '4ESO', code: 'A.7', description: 'El arte del reciclaje. Consumo responsable. Productos ecológicos, sostenibles e innovadores en la práctica artística. Arte y naturaleza.' },
        { course: '4ESO', code: 'A.8', description: 'Seguridad, toxicidad e impacto medioambiental de los diferentes materiales artísticos. Prevención y gestión responsable de los residuos.' },
        { course: '4ESO', code: 'A.9', description: 'Ejemplos de aplicación de técnicas gráfico-plásticas en diferentes manifestaciones artísticas y en el ámbito del diseño.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // B. Fotografía, lenguaje visual, audiovisual y multimedia
    // ──────────────────────────────────────────────────────────
    {
      letter: 'B',
      title: 'Fotografía, lenguaje visual, audiovisual y multimedia',
      items: [
        { course: '4ESO', code: 'B.1', description: 'Elementos y principios básicos del lenguaje visual y de la percepción. Color y composición.' },
        { course: '4ESO', code: 'B.2', description: 'Narrativa de la imagen fija: encuadre y planificación, puntos de vista y angulación. La imagen secuenciada.' },
        { course: '4ESO', code: 'B.3', description: 'Fotografía analógica: cámara oscura. Fotografía sin cámara (fotogramas). Técnicas fotográficas experimentales: cianotipia o antotipia.' },
        { course: '4ESO', code: 'B.4', description: 'Fotografía digital. El fotomontaje digital y tradicional.' },
        { course: '4ESO', code: 'B.5', description: 'Seguridad, toxicidad e impacto medioambiental de los diferentes materiales artísticos. Prevención y gestión responsable de los residuos.' },
        { course: '4ESO', code: 'B.6', description: 'Narrativa audiovisual: fotograma, secuencia, escena, toma, plano y montaje. El guion y el storyboard.' },
        { course: '4ESO', code: 'B.7', description: 'El proceso de creación. Realización y seguimiento: guion o proyecto, presentación final y evaluación (autorreflexión, autoevaluación y evaluación colectiva).' },
        { course: '4ESO', code: 'B.8', description: 'Publicidad: recursos formales, lingüísticos y persuasivos. Estereotipos y sociedad de consumo. El sexismo y los cánones corporales y sexuales en los medios de comunicación.' },
        { course: '4ESO', code: 'B.9', description: 'Campos y ramas del diseño: gráfico, de producto, de moda, de interiores, escenografía.' },
        { course: '4ESO', code: 'B.10', description: 'Técnicas básicas de animación.' },
        { course: '4ESO', code: 'B.11', description: 'Recursos digitales para la creación de proyectos de vídeo-arte.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // C. Dibujo Técnico
    // ──────────────────────────────────────────────────────────
    {
      letter: 'C',
      title: 'Dibujo Técnico',
      items: [
        { course: '4ESO', code: 'C.1', description: 'Introducción a la normalización. Formatos.' },
        { course: '4ESO', code: 'C.2', description: 'Planificación de proyectos.' },
        { course: '4ESO', code: 'C.3', description: 'Vistas en Sistema Diédrico.' },
        { course: '4ESO', code: 'C.4', description: 'Normas básicas sobre acotación.' },
        { course: '4ESO', code: 'C.5', description: 'Croquis Acotado y Plano de Taller.' },
        { course: '4ESO', code: 'C.6', description: 'Introducción al Sistema Axonométrico. Dibujos en Isométrico.' },
        { course: '4ESO', code: 'C.7', description: 'Escalas.' },
      ],
    },
  ],
};
