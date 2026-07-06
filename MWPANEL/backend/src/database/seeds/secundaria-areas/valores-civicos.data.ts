import { AreaData } from '../secundaria-curriculum.data';

export const AREA_VCE: AreaData = {
  subjectCode: 'VCE-3ESO',
  abbrev: 'VCE',
  areaName: 'Educación en Valores Cívicos y Éticos',
  competencies: [
    {
      code: '1',
      name: 'Autoconocimiento e identidad humana',
      description:
        'Inquirir e investigar cuanto se refiere a la identidad humana y a cuestiones éticas relativas al propio proyecto vital, analizando críticamente información fiable y generando una actitud reflexiva al respecto, para promover el autonocimiento y la elaboración de planteamientos y juicios morales de manera autónoma y razonada.',
      keyCompetencyCodes: ['CCL', 'CPSAA', 'CC'],
      criteria: [
        {
          course: '3ESO',
          code: '1.1',
          description:
            'Construir y expresar un concepto ajustado de la propia persona reconociendo las múltiples dimensiones de su naturaleza y personalidad, así como de la dimensión cívica y moral de la misma, a partir de la investigación y el diálogo en torno a diversas concepciones sobre la naturaleza humana.',
        },
        {
          course: '3ESO',
          code: '1.2',
          description:
            'Identificar, gestionar y comunicar ideas, emociones, afectos y deseos con comprensión y empatía hacia las demás personas, demostrando autoestima y compartiendo un concepto adecuado de lo que deben ser las relaciones con otras personas, incluyendo el ámbito afectivo-sexual.',
        },
        {
          course: '3ESO',
          code: '1.3',
          description:
            'Desarrollar y demostrar autonomía moral a través de la práctica de la deliberación racional, el uso de conceptos éticos, y el diálogo respetuoso con las demás personas en torno a distintos valores y modos de vida, así como de problemas relacionados con el ejercicio de los derechos individuales, el uso responsable y seguro de las redes, las conductas adictivas y el acoso escolar.',
        },
      ],
    },
    {
      code: '2',
      name: 'Convivencia cívica y democrática',
      description:
        'Actuar e interactuar de acuerdo con normas y valores cívicos y éticos, a partir del reconocimiento fundado de su importancia para regular la vida comunitaria y su aplicación efectiva y justificada en distintos contextos, para promover una convivencia pacífica, respetuosa, democrática y comprometida con el bien común.',
      keyCompetencyCodes: ['CCL', 'CD', 'CC', 'CCEC'],
      criteria: [
        {
          course: '3ESO',
          code: '2.1',
          description:
            'Promover y demostrar una convivencia pacífica, respetuosa, democrática y comprometida con el bien común, a partir de la investigación sobre la naturaleza social y política del ser humano y el uso y comprensión crítica de los conceptos de ley, poder, soberanía, justicia, Estado, democracia, memoria democrática, dignidad y derechos humanos.',
        },
        {
          course: '3ESO',
          code: '2.2',
          description:
            'Fomentar el ejercicio de la ciudadanía activa y democrática a través del conocimiento del movimiento asociativo y la participación respetuosa, dialogante y constructiva en actividades de grupo que impliquen tomar decisiones colectivas, planificar acciones coordinadas y resolver problemas aplicando procedimientos y principios cívicos, éticos y democráticos explícitos.',
        },
        {
          course: '3ESO',
          code: '2.3',
          description:
            'Contribuir a generar un compromiso activo con el bien común a través del análisis y la toma razonada y dialogante de posición en torno a cuestiones éticas de actualidad como la lucha contra la desigualdad y la pobreza, el derecho al trabajo, la salud, la educación y la justicia, así como sobre los fines y límites éticos de la investigación científica.',
        },
        {
          course: '3ESO',
          code: '2.4',
          description:
            'Tomar consciencia de la lucha por una efectiva igualdad de género, y del problema de la violencia y explotación sobre las mujeres, a través del análisis de las diversas olas y corrientes del feminismo y de las medidas de prevención de la desigualdad, la violencia y la discriminación por razón de género y orientación sexual, mostrando igualmente conocimiento de los derechos LGTBI+ y reconociendo la necesidad de respetarlos.',
        },
        {
          course: '3ESO',
          code: '2.5',
          description:
            'Contribuir activamente al bienestar social adoptando una posición propia, explícita, informada y éticamente fundamentada sobre el valor y pertinencia de los derechos humanos, el respeto por la diversidad etnocultural, la consideración de los bienes públicos globales y la percepción del valor social de los impuestos.',
        },
        {
          course: '3ESO',
          code: '2.6',
          description:
            'Contribuir a la consecución de un mundo más justo y pacífico a través del análisis y reconocimiento de la historia democrática de nuestro país y de las funciones del Estado de derecho y sus instituciones, los organismos internacionales, las asociaciones civiles y los cuerpos y fuerzas de seguridad del Estado, en su empeño por lograr la paz y la seguridad integral, atender a las víctimas de la violencia y promover la solidaridad y cooperación entre las personas y los pueblos.',
        },
      ],
    },
    {
      code: '3',
      name: 'Sostenibilidad y ética ambiental',
      description:
        'Entender la naturaleza interconectada e inter y ecodependiente de las actividades humanas, mediante la identificación y análisis de problemas ecosociales de relevancia, para promover hábitos y actitudes éticamente comprometidos con el logro de formas de vida sostenibles.',
      keyCompetencyCodes: ['STEM', 'CPSAA', 'CC', 'CE'],
      criteria: [
        {
          course: '3ESO',
          code: '3.1',
          description:
            'Describir las relaciones históricas de interconexión, interdependencia y ecodependencia entre nuestras vidas y el entorno a partir del análisis de las causas y consecuencias de los más graves problemas ecosociales que nos afectan.',
        },
        {
          course: '3ESO',
          code: '3.2',
          description:
            'Valorar distintos planteamientos científicos, políticos y éticos con los que afrontar la emergencia climática y la crisis medioambiental a través de la exposición y el debate argumental en torno a los mismos.',
        },
        {
          course: '3ESO',
          code: '3.3',
          description:
            'Promover estilos de vida éticamente comprometidos con el logro de un desarrollo sostenible, contribuyendo por la propia persona y en su entorno a la prevención de los residuos, la gestión sostenible de los recursos, la movilidad segura, sostenible y saludable, el comercio justo, el consumo responsable, el cuidado del patrimonio natural, el respeto por la diversidad etnocultural, y el cuidado y protección de los animales.',
        },
      ],
    },
    {
      code: '4',
      name: 'Educación emocional y afectiva',
      description:
        'Mostrar una adecuada estima personal y del entorno, reconociendo y valorando las emociones y los sentimientos propios y ajenos, para el logro de una actitud empática y cuidadosa con respecto a las demás personas y a la naturaleza.',
      keyCompetencyCodes: ['CCL', 'CPSAA', 'CC', 'CCEC'],
      criteria: [
        {
          course: '3ESO',
          code: '4.1',
          description:
            'Desarrollar una actitud de gestión equilibrada de las emociones, de estima y cuidado de su propia persona y de las demás, identificando, analizando y expresando de manera asertiva las propias emociones y sentimientos, y reconociendo y valorando los del resto en distintos contextos y en torno a actividades creativas y de reflexión individual o dialogada sobre cuestiones éticas y cívicas.',
        },
      ],
    },
  ],
  knowledgeBlocks: [
    // ──────────────────────────────────────────────────────────
    // A. Autoconocimiento y autonomía moral
    // ──────────────────────────────────────────────────────────
    {
      letter: 'A',
      title: 'Autoconocimiento y autonomía moral',
      items: [
        { course: '3ESO', code: 'A.1', description: 'La investigación ética y la resolución de problemas complejos. El pensamiento crítico y filosófico.' },
        { course: '3ESO', code: 'A.2', description: 'Principales escuelas y corrientes éticas a lo largo de la historia de la filosofía.' },
        { course: '3ESO', code: 'A.3', description: 'La naturaleza humana y la identidad personal. Dignidad, libertad y moralidad.' },
        { course: '3ESO', code: 'A.4', description: 'La educación de las emociones y los sentimientos. La autoestima personal. La igualdad y el respeto mutuo en las relaciones con otras personas.' },
        { course: '3ESO', code: 'A.5', description: 'La educación afectivo-sexual.' },
        { course: '3ESO', code: 'A.6', description: 'Deseos y razones. La voluntad y el juicio moral. Autonomía y responsabilidad.' },
        { course: '3ESO', code: 'A.7', description: 'La ética como guía de nuestras acciones. La reflexión en torno a lo valioso y los valores: universalismo y pluralismo moral. Normas, virtudes y sentimientos morales. Éticas de la felicidad, éticas del deber y éticas de la virtud.' },
        { course: '3ESO', code: 'A.8', description: 'El conflicto entre legitimidad y legalidad. La objeción de conciencia. Los derechos individuales y el debate en torno a la libertad de expresión.' },
        { course: '3ESO', code: 'A.9', description: 'El problema de la desinformación. La protección de datos y el derecho a la intimidad. El ciberacoso y las situaciones de violencia en las redes. Las conductas adictivas.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // B. Sociedad, justicia y democracia
    // ──────────────────────────────────────────────────────────
    {
      letter: 'B',
      title: 'Sociedad, justicia y democracia',
      items: [
        { course: '3ESO', code: 'B.1', description: 'Las virtudes del diálogo y las normas de argumentación. La resolución pacífica de conflictos. La empatía con las demás personas.' },
        { course: '3ESO', code: 'B.2', description: 'La naturaleza y origen de la sociedad: competencia y cooperación, egoísmo y altruismo. Las estructuras sociales y los grupos de pertenencia.' },
        { course: '3ESO', code: 'B.3', description: 'La política: ley, poder, soberanía y justicia. Formas de Estado y tipos de gobierno. El Estado de derecho y los valores constitucionales. La democracia: principios, procedimientos e instituciones. La memoria democrática. La guerra, el terrorismo y otras formas de violencia política.' },
        { course: '3ESO', code: 'B.4', description: 'Las distintas generaciones de derechos humanos. Su constitución histórica y relevancia ética. Los derechos de la infancia.' },
        { course: '3ESO', code: 'B.5', description: 'Asociacionismo y voluntariado. La ciudadanía y la participación democrática. Los códigos deontológicos. Las éticas aplicadas.' },
        { course: '3ESO', code: 'B.6', description: 'La desigualdad económica y la lucha contra la pobreza. Globalización económica y bienes públicos globales. El comercio justo. El derecho al trabajo, la salud, la educación y la justicia. El valor social de los impuestos.' },
        { course: '3ESO', code: 'B.7', description: 'La igualdad de género y las diversas olas y corrientes del feminismo. La prevención de la explotación y la violencia contra niñas y mujeres. La corresponsabilidad en las tareas domésticas y de cuidados.' },
        { course: '3ESO', code: 'B.8', description: 'El interculturalismo. La inclusión social y el respeto por la diversidad y las identidades etnocultural y de género. Los derechos LGTBI+.' },
        { course: '3ESO', code: 'B.9', description: 'Fines y límites éticos de la investigación científica. La bioética. El desafío de la inteligencia artificial. Las propuestas transhumanistas.' },
        { course: '3ESO', code: 'B.10', description: 'Acciones individuales y colectivas en favor de la paz. La contribución del Estado y los organismos internacionales a la paz, la seguridad integral y la cooperación. La atención a las víctimas de la violencia. El derecho internacional y la ciudadanía global. Las fuerzas armadas y la defensa al servicio de la paz. El papel de las ONG y de las ONGD.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // C. Sostenibilidad y ética ambiental
    // ──────────────────────────────────────────────────────────
    {
      letter: 'C',
      title: 'Sostenibilidad y ética ambiental',
      items: [
        { course: '3ESO', code: 'C.1', description: 'Interdependencia, interconexión y ecodependencia entre nuestras formas de vida y el entorno. Lo local y lo global. Consideración crítica de las diversas cosmovisiones sobre la relación humana con la naturaleza.' },
        { course: '3ESO', code: 'C.2', description: 'Los límites del planeta y el agotamiento de los recursos. La huella ecológica de las acciones humanas. La emergencia climática.' },
        { course: '3ESO', code: 'C.3', description: 'Diversos planteamientos éticos, científicos y políticos en torno a los problemas ecosociales. La ética ambiental. La ética de los cuidados y el ecofeminismo. Los Objetivos de Desarrollo Sostenible. El decrecimiento. La economía circular.' },
        { course: '3ESO', code: 'C.4', description: 'El compromiso activo con la protección de los animales y el medio ambiente. Los derechos de los animales y de la naturaleza. La perspectiva biocéntrica.' },
        { course: '3ESO', code: 'C.5', description: 'Estilos de vida sostenible: la prevención de los residuos y la gestión sostenible de los recursos. La movilidad segura, saludable y sostenible. El consumo responsable. Alimentación y soberanía alimentaria. Comunidades resilientes y en transición.' },
      ],
    },
  ],
};
