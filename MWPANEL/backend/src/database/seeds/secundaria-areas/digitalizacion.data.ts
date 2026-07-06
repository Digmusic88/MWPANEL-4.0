import { AreaData } from '../secundaria-curriculum.data';

export const AREA_DIG: AreaData = {
  subjectCode: 'DIG-4ESO',
  abbrev: 'DIG',
  areaName: 'Digitalización',
  competencies: [
    {
      code: '1',
      name: 'Identificar y resolver problemas técnicos sencillos',
      description:
        'Identificar y resolver problemas técnicos sencillos, conectar y configurar dispositivos a redes domésticas, aplicando los conocimientos de hardware y sistemas operativos, para gestionar las herramientas e instalaciones informáticas y de comunicación de uso cotidiano.',
      keyCompetencyCodes: ['STEM', 'CD', 'CPSAA', 'CE'],
      criteria: [
        {
          course: '4ESO',
          code: '1.1',
          description:
            'Conectar dispositivos y gestionar redes locales aplicando los conocimientos y procesos asociados a sistemas de comunicación alámbrica e inalámbrica con una actitud proactiva.',
        },
        {
          course: '4ESO',
          code: '1.2',
          description:
            'Instalar y mantener sistemas operativos configurando sus características en función de sus necesidades personales.',
        },
        {
          course: '4ESO',
          code: '1.3',
          description:
            'Identificar y resolver problemas técnicos sencillos analizando componentes y funciones de los dispositivos digitales, evaluando las soluciones de manera crítica y reformulando el procedimiento, en caso necesario.',
        },
      ],
    },
    {
      code: '2',
      name: 'Configurar el entorno personal de aprendizaje',
      description:
        'Configurar el entorno personal de aprendizaje, interactuando y aprovechando los recursos del ámbito digital, para optimizar y gestionar el aprendizaje permanente.',
      keyCompetencyCodes: ['CD', 'CPSAA', 'CE'],
      criteria: [
        {
          course: '4ESO',
          code: '2.1',
          description:
            'Gestionar el aprendizaje en el ámbito digital, configurando el entorno personal de aprendizaje mediante la integración de recursos digitales de manera autónoma.',
        },
        {
          course: '4ESO',
          code: '2.2',
          description:
            'Buscar, seleccionar y archivar información en función de sus necesidades haciendo uso de las herramientas del entorno personal de aprendizaje con sentido crítico y siguiendo normas básicas de seguridad en la red.',
        },
        {
          course: '4ESO',
          code: '2.3',
          description:
            'Crear, programar, integrar y reelaborar contenidos digitales de forma individual o colectiva, seleccionando las herramientas más apropiadas para generar nuevo conocimiento y contenidos digitales de manera creativa, respetando los derechos de autor y licencias de uso.',
        },
        {
          course: '4ESO',
          code: '2.4',
          description:
            'Interactuar en espacios virtuales de comunicación y plataformas de aprendizaje colaborativo, compartiendo y publicando información y datos, adaptándose a diferentes audiencias con una actitud participativa y respetuosa.',
        },
      ],
    },
    {
      code: '3',
      name: 'Desarrollar hábitos que fomenten el bienestar digital',
      description:
        'Desarrollar hábitos que fomenten el bienestar digital, aplicando medidas preventivas y correctivas, para proteger dispositivos, datos personales y la propia salud.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CPSAA', 'CC'],
      criteria: [
        {
          course: '4ESO',
          code: '3.1',
          description:
            'Proteger los datos personales y la huella digital generada en internet, configurando las condiciones de privacidad de las redes sociales y espacios virtuales de trabajo.',
        },
        {
          course: '4ESO',
          code: '3.2',
          description:
            'Configurar y actualizar contraseñas, sistemas operativos y antivirus de forma periódica en los distintos dispositivos digitales de uso habitual.',
        },
        {
          course: '4ESO',
          code: '3.3',
          description:
            'Identificar y saber reaccionar ante situaciones que representan una amenaza en la red, escogiendo la mejor solución entre diversas opciones, desarrollando prácticas saludables y seguras, y valorando el bienestar físico y mental, tanto personal como colectivo.',
        },
      ],
    },
    {
      code: '4',
      name: 'Ejercer una ciudadanía digital crítica',
      description:
        'Ejercer una ciudadanía digital crítica, conociendo las posibles acciones que realizar en la red, e identificando sus repercusiones, para hacer un uso activo, responsable y ético de la tecnología.',
      keyCompetencyCodes: ['CD', 'CPSAA', 'CC', 'CE'],
      criteria: [
        {
          course: '4ESO',
          code: '4.1',
          description:
            'Hacer un uso ético de los datos y las herramientas digitales, aplicando las normas de etiqueta digital y respetando la privacidad y las licencias de uso y propiedad intelectual en la comunicación, colaboración y participación activa en la red.',
        },
        {
          course: '4ESO',
          code: '4.2',
          description:
            'Reconocer las aportaciones de las tecnologías digitales en las gestiones administrativas y el comercio electrónico, siendo consciente de la brecha social de acceso, uso y aprovechamiento de dichas tecnologías para diversos colectivos.',
        },
        {
          course: '4ESO',
          code: '4.3',
          description:
            'Valorar la importancia de la oportunidad, facilidad y libertad de expresión que suponen los medios digitales conectados, analizando de forma crítica los mensajes que se reciben y transmiten teniendo en cuenta su objetividad, ideología, intencionalidad, sesgos y caducidad.',
        },
        {
          course: '4ESO',
          code: '4.4',
          description:
            'Analizar la necesidad y los beneficios globales de un uso y desarrollo ecosocialmente responsable de las tecnologías digitales, teniendo en cuenta criterios de accesibilidad, sostenibilidad e impacto.',
        },
      ],
    },
  ],
  knowledgeBlocks: [
    // ──────────────────────────────────────────────────────────
    // A. Dispositivos digitales, sistemas operativos y de comunicación
    // ──────────────────────────────────────────────────────────
    {
      letter: 'A',
      title: 'Dispositivos digitales, sistemas operativos y de comunicación',
      items: [
        { course: '4ESO', code: 'A.1', description: 'Arquitectura de ordenadores: elementos, montaje, configuración y resolución de problemas.' },
        { course: '4ESO', code: 'A.2', description: 'Sistemas operativos: instalación y configuración de usuario.' },
        { course: '4ESO', code: 'A.3', description: 'Sistemas de comunicación e internet. dispositivos de red y funcionamiento. Procedimiento de configuración de una red doméstica y conexión de dispositivos.' },
        { course: '4ESO', code: 'A.4', description: 'Dispositivos conectados (IoT+Wearables): configuración y conexión de dispositivos.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // B. Digitalización del entorno personal de aprendizaje
    // ──────────────────────────────────────────────────────────
    {
      letter: 'B',
      title: 'Digitalización del entorno personal de aprendizaje',
      items: [
        { course: '4ESO', code: 'B.1', description: 'Búsqueda, selección y archivo de información.' },
        { course: '4ESO', code: 'B.2', description: 'Edición y creación de contenidos: aplicaciones de productividad, desarrollo de aplicaciones sencillas para dispositivos móviles y web, realidad virtual, aumentada y mixta.' },
        { course: '4ESO', code: 'B.3', description: 'Comunicación y colaboración en red.' },
        { course: '4ESO', code: 'B.4', description: 'Publicación y difusión responsable en redes.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // C. Seguridad y bienestar digital
    // ──────────────────────────────────────────────────────────
    {
      letter: 'C',
      title: 'Seguridad y bienestar digital',
      items: [
        { course: '4ESO', code: 'C.1', description: 'Seguridad de dispositivos: medidas preventivas y correctivas para hacer frente a riesgos, amenazas y ataques a dispositivos.' },
        { course: '4ESO', code: 'C.2', description: 'Seguridad y protección de datos: identidad, reputación digital, privacidad y huella digital. Medidas preventivas en la configuración de redes sociales y la gestión de identidades virtuales.' },
        { course: '4ESO', code: 'C.3', description: 'Seguridad en la salud física y mental. Riesgos y amenazas al bienestar personal. Opciones de respuesta y prácticas de uso saludable. Situaciones de violencia y de riesgo en la red (ciberacoso, sextorsión, acceso a contenidos inadecuados, dependencia tecnológica, etc.).' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // D. Ciudadanía digital crítica
    // ──────────────────────────────────────────────────────────
    {
      letter: 'D',
      title: 'Ciudadanía digital crítica',
      items: [
        { course: '4ESO', code: 'D.1', description: 'Interactividad en la red: libertad de expresión, etiqueta digital, propiedad intelectual y licencias de uso.' },
        { course: '4ESO', code: 'D.2', description: 'Educación mediática: periodismo digital, blogosfera, estrategias comunicativas y uso crítico de la red. Herramientas para detectar noticias falsas y fraudes.' },
        { course: '4ESO', code: 'D.3', description: 'Gestiones administrativas: servicios públicos en línea, registros digitales y certificados oficiales.' },
        { course: '4ESO', code: 'D.4', description: 'Comercio electrónico: facturas digitales, formas de pago y criptomonedas.' },
        { course: '4ESO', code: 'D.5', description: 'Ética en el uso de datos y herramientas digitales: inteligencia artificial, sesgos algorítmicos e ideológicos, obsolescencia programada, soberanía tecnológica y digitalización sostenible.' },
      ],
    },
  ],
};
