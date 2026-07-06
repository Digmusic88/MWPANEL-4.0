import { AreaData } from '../secundaria-curriculum.data';

export const AREA_MAT: AreaData = {
  subjectCode: 'MAT-1ESO',
  abbrev: 'MAT',
  areaName: 'Matemáticas',
  competencies: [
    {
      code: '1',
      name: 'Resolución de problemas matemáticos',
      description:
        'Interpretar, modelizar y resolver problemas de la vida cotidiana y propios de las matemáticas, aplicando diferentes estrategias y formas de razonamiento, para explorar distintas maneras de proceder y obtener posibles soluciones.',
      keyCompetencyCodes: ['STEM', 'CD', 'CPSAA', 'CE', 'CCEC'],
      criteria: [
        {
          course: '1ESO',
          code: '1.1',
          description:
            'Organizar los datos de un problema matemático, buscando información sobre aquellas partes que no entiende.',
        },
        {
          course: '2ESO',
          code: '1.1',
          description:
            'Interpretar problemas matemáticos organizando los datos y comprendiendo las preguntas formuladas.',
        },
        {
          course: '3ESO',
          code: '1.1',
          description:
            'Interpretar problemas matemáticos organizando los datos, estableciendo las relaciones entre ellos y comprendiendo las preguntas formuladas.',
        },
        {
          course: '1ESO',
          code: '1.2',
          description:
            'Utilizar herramientas y estrategias dadas que contribuyan a la resolución de problemas.',
        },
        {
          course: '2ESO',
          code: '1.2',
          description:
            'Elegir herramientas y estrategias apropiadas que contribuyan a la resolución de problemas.',
        },
        {
          course: '3ESO',
          code: '1.2',
          description:
            'Aplicar herramientas y estrategias apropiadas que contribuyan a la resolución de problemas.',
        },
        {
          course: '1ESO',
          code: '1.3',
          description:
            'Calcular las soluciones de un problema utilizando las fórmulas y aplicaciones dadas.',
        },
        {
          course: '2ESO',
          code: '1.3',
          description:
            'Calcular las soluciones de un problema seleccionando las fórmulas y aplicaciones adecuadas.',
        },
        {
          course: '3ESO',
          code: '1.3',
          description:
            'Obtener soluciones matemáticas de un problema, activando los conocimientos y utilizando las herramientas tecnológicas necesarias.',
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
          course: '1ESO',
          code: '2.1',
          description:
            'Comprobar la corrección matemática de las soluciones de un problema.',
        },
        {
          course: '2ESO',
          code: '2.1',
          description:
            'Comprobar la corrección matemática de las soluciones de un problema.',
        },
        {
          course: '3ESO',
          code: '2.1',
          description:
            'Comprobar la corrección matemática de las soluciones de un problema.',
        },
        {
          course: '1ESO',
          code: '2.2',
          description:
            'Comprobar la validez de las soluciones de un problema y su coherencia en el contexto planteado interpretando su alcance y repercusión de forma guiada desde una perspectiva (de género o de sostenibilidad o consumo responsable, etc...).',
        },
        {
          course: '2ESO',
          code: '2.2',
          description:
            'Comprobar la validez de las soluciones de un problema y su coherencia en el contexto planteado interpretando su alcance y repercusión de forma guiada, desde diferentes perspectivas (de género, de sostenibilidad, de consumo responsable, etc.).',
        },
        {
          course: '3ESO',
          code: '2.2',
          description:
            'Comprobar la validez de las soluciones de un problema y su coherencia en el contexto planteado, evaluando el alcance y repercusión de estas desde diferentes perspectivas (de género, de sostenibilidad, de consumo responsable, etc.).',
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
          course: '1ESO',
          code: '3.1',
          description:
            'Comprobar conjeturas sencillas de forma guiada.',
        },
        {
          course: '2ESO',
          code: '3.1',
          description:
            'Formular y comprobar conjeturas sencillas de forma guiada analizando patrones y propiedades.',
        },
        {
          course: '3ESO',
          code: '3.1',
          description:
            'Formular y comprobar conjeturas sencillas de forma guiada analizando patrones, propiedades y relaciones.',
        },
        {
          course: '1ESO',
          code: '3.2',
          description:
            'Realizar de forma guiada variantes de un problema dado modificando alguno de sus datos o alguna condición del problema.',
        },
        {
          course: '2ESO',
          code: '3.2',
          description:
            'Realizar de forma guiada variantes de un problema dado modificando alguno de sus datos o alguna condición del problema.',
        },
        {
          course: '3ESO',
          code: '3.2',
          description:
            'Plantear variantes de un problema dado modificando alguno de sus datos o alguna condición del problema.',
        },
        {
          course: '1ESO',
          code: '3.3',
          description:
            'Emplear de forma guiada herramientas tecnológicas dadas en la comprobación de problemas.',
        },
        {
          course: '2ESO',
          code: '3.3',
          description:
            'Emplear de forma guiada herramientas tecnológicas dadas en la investigación y comprobación de conjeturas o problemas',
        },
        {
          course: '3ESO',
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
          course: '1ESO',
          code: '4.1',
          description:
            'Observar patrones, organizar datos y descomponer un problema en partes más simples facilitando su interpretación computacional de forma guiada.',
        },
        {
          course: '2ESO',
          code: '4.1',
          description:
            'Reconocer patrones, organizar datos y descomponer un problema en partes más simples facilitando su interpretación computacional de forma guiada.',
        },
        {
          course: '3ESO',
          code: '4.1',
          description:
            'Reconocer patrones, organizar datos y descomponer un problema en partes más simples facilitando su interpretación computacional.',
        },
        {
          course: '1ESO',
          code: '4.2',
          description:
            'y Observar situaciones que se pueden modelizar, y resolver problemas de forma eficaz utilizando los algoritmos propuestos.',
        },
        {
          course: '2ESO',
          code: '4.2',
          description:
            'Reconocer situaciones que se pueden modelizar, y resolver problemas de forma eficaz interpretando y modificando algoritmos.',
        },
        {
          course: '3ESO',
          code: '4.2',
          description:
            'Modelizar situaciones y resolver problemas de forma eficaz interpretando y modificando algoritmos.',
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
          course: '1ESO',
          code: '5.1',
          description:
            'Reconocer las relaciones entre los conocimientos y experiencias matemáticas de forma guiada.',
        },
        {
          course: '2ESO',
          code: '5.1',
          description:
            'Reconocer las relaciones entre los conocimientos y experiencias matemáticas, de forma guiada.',
        },
        {
          course: '3ESO',
          code: '5.1',
          description:
            'Reconocer las relaciones entre los conocimientos y experiencias matemáticas, formando un todo coherente.',
        },
        {
          course: '1ESO',
          code: '5.2',
          description:
            'Reconocer de forma guiada las conexiones entre diferentes procesos matemáticos sencillos o cotidianos.',
        },
        {
          course: '2ESO',
          code: '5.2',
          description:
            'Reconocer las conexiones entre diferentes procesos matemáticos sencillos o cotidianos aplicando experiencias propias.',
        },
        {
          course: '3ESO',
          code: '5.2',
          description:
            'Realizar conexiones entre diferentes procesos matemáticos aplicando conocimientos y experiencias previas.',
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
          course: '1ESO',
          code: '6.1',
          description:
            'Reconocer de forma guiada situaciones formuladas y resueltas mediante herramientas y estrategias matemáticas, con conexiones con el mundo real.',
        },
        {
          course: '2ESO',
          code: '6.1',
          description:
            'Reconocer situaciones formuladas y resueltas mediante herramientas y estrategias matemáticas, que tienen conexiones con el mundo real, y que usan procesos inherentes a la investigación: inferir, medir, comunicar, clasificar y predecir.',
        },
        {
          course: '3ESO',
          code: '6.1',
          description:
            'Reconocer situaciones susceptibles de ser formuladas y resueltas mediante herramientas y estrategias matemáticas, estableciendo conexiones entre el mundo real y las matemáticas y usando los procesos inherentes a la investigación: inferir, medir, comunicar, clasificar y predecir.',
        },
        {
          course: '1ESO',
          code: '6.2',
          description:
            'Identificar de forma guiada conexiones coherentes entre las matemáticas y otras materias resolviendo problemas sencillos y cotidianos.',
        },
        {
          course: '2ESO',
          code: '6.2',
          description:
            'Identificar de forma guiada conexiones coherentes entre las matemáticas y otras materias resolviendo problemas contextualizados.',
        },
        {
          course: '3ESO',
          code: '6.2',
          description:
            'Identificar conexiones coherentes entre las matemáticas y otras materias resolviendo problemas contextualizados.',
        },
        {
          course: '1ESO',
          code: '6.3',
          description:
            'Reconocer de forma guiada la aportación de las matemáticas al progreso de la humanidad.',
        },
        {
          course: '2ESO',
          code: '6.3',
          description:
            'Reconocer la aportación de las matemáticas al progreso de la humanidad en diferentes contextos.',
        },
        {
          course: '3ESO',
          code: '6.3',
          description:
            'Reconocer la aportación de las matemáticas al progreso de la humanidad y su contribución a la superación de los retos que demanda la sociedad actual.',
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
          course: '1ESO',
          code: '7.1',
          description:
            'Representar conceptos, procedimientos, información y resultados matemáticos usando herramientas digitales y no digitales, visualizando ideas y estructurando procesos matemáticos.',
        },
        {
          course: '2ESO',
          code: '7.1',
          description:
            'Representar conceptos, procedimientos, información y resultados matemáticos usando herramientas digitales y no digitales, visualizando ideas, estructurando procesos matemáticos y valorando su utilidad para compartir información.',
        },
        {
          course: '3ESO',
          code: '7.1',
          description:
            'Representar conceptos, procedimientos, información y resultados matemáticos de modos distintos y con diferentes herramientas, incluidas las digitales, visualizando ideas, estructurando procesos matemáticos y valorando su utilidad para compartir información.',
        },
        {
          course: '1ESO',
          code: '7.2',
          description:
            'Utilizar representaciones matemáticas que ayuden en la búsqueda de estrategias de resolución de una situación problematizada.',
        },
        {
          course: '2ESO',
          code: '7.2',
          description:
            'Elaborar de forma guiada representaciones matemáticas que ayuden en la búsqueda de estrategias de resolución de una situación problematizada.',
        },
        {
          course: '3ESO',
          code: '7.2',
          description:
            'Elaborar representaciones matemáticas que ayuden en la búsqueda de estrategias de resolución de una situación problematizada.',
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
          course: '1ESO',
          code: '8.1',
          description:
            'Comunicar información utilizando un lenguaje matemático sencillo, utilizando diferentes medios, incluidos los digitales, oralmente y por escrito, al describir, explicar y justificar razonamientos, procedimientos y conclusiones.',
        },
        {
          course: '2ESO',
          code: '8.1',
          description:
            'Comunicar información utilizando el lenguaje matemático apropiado, utilizando diferentes medios, incluidos los digitales, oralmente y por escrito, al describir, explicar y justificar razonamientos, procedimientos y conclusiones.',
        },
        {
          course: '3ESO',
          code: '8.1',
          description:
            'Comunicar información utilizando el lenguaje matemático apropiado, utilizando diferentes medios, incluidos los digitales, oralmente y por escrito, al describir, explicar y justificar razonamientos, procedimientos y conclusiones.',
        },
        {
          course: '1ESO',
          code: '8.2',
          description:
            'Reconocer y emplear el lenguaje matemático presente en la vida cotidiana comunicando mensajes con contenido matemático con precisión y rigor',
        },
        {
          course: '2ESO',
          code: '8.2',
          description:
            'Reconocer y emplear el lenguaje matemático presente en la vida cotidiana comunicando mensajes con contenido matemático con precisión y rigor',
        },
        {
          course: '3ESO',
          code: '8.2',
          description:
            'Reconocer y emplear el lenguaje matemático presente en la vida cotidiana comunicando mensajes con contenido matemático con precisión y rigor.',
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
          course: '1ESO',
          code: '9.1',
          description:
            'Reconocer las emociones propias y generar expectativas positivas ante nuevos retos matemáticos.',
        },
        {
          course: '2ESO',
          code: '9.1',
          description:
            'Reconocer las emociones propias y utilizar el autoconcepto matemático como herramienta generando expectativas positivas ante nuevos retos matemáticos.',
        },
        {
          course: '3ESO',
          code: '9.1',
          description:
            'Gestionar las emociones propias, desarrollar el autoconcepto matemático como herramienta, generando expectativas positivas ante nuevos retos matemáticos.',
        },
        {
          course: '1ESO',
          code: '9.2',
          description:
            'Mostrar una actitud positiva y perseverante, aceptando la crítica razonada al hacer frente a las diferentes situaciones de aprendizaje de las matemáticas.',
        },
        {
          course: '2ESO',
          code: '9.2',
          description:
            'Mostrar una actitud positiva y perseverante, aceptando la crítica razonada al hacer frente a las diferentes situaciones de aprendizaje de las matemáticas.',
        },
        {
          course: '3ESO',
          code: '9.2',
          description:
            'Mostrar una actitud positiva y perseverante, aceptando la crítica razonada al hacer frente a las diferentes situaciones de aprendizaje de las matemáticas.',
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
          course: '1ESO',
          code: '10.1',
          description:
            'Colaborar activamente y construir relaciones trabajando con las matemáticas en equipos heterogéneos, respetando diferentes opiniones, comunicándose de manera efectiva, pensando de forma crítica y creativa.',
        },
        {
          course: '2ESO',
          code: '10.1',
          description:
            'Colaborar activamente y construir relaciones trabajando con las matemáticas en equipos heterogéneos, respetando diferentes opiniones, comunicándose de manera efectiva, pensando de forma crítica y creativa.',
        },
        {
          course: '3ESO',
          code: '10.1',
          description:
            'Colaborar activamente y construir relaciones trabajando con las matemáticas en equipos heterogéneos, respetando diferentes opiniones, comunicándose de manera efectiva, pensando de forma crítica y creativa y tomando decisiones y realizando juicios informados.',
        },
        {
          course: '1ESO',
          code: '10.2',
          description:
            'Aceptar el reparto de tareas que deban desarrollarse en equipo, aportando valor, favoreciendo la inclusión, la escucha activa, asumiendo el rol asignado y responsabilizándose de la propia contribución al grupo.',
        },
        {
          course: '2ESO',
          code: '10.2',
          description:
            'Participar en el reparto de tareas que deban desarrollarse en equipo, aportando valor, favoreciendo la inclusión, la escucha activa, asumiendo el rol asignado y responsabilizándose de la propia contribución al grupo.',
        },
        {
          course: '3ESO',
          code: '10.2',
          description:
            'Participar en el reparto de tareas que deban desarrollarse en equipo, aportando valor, favoreciendo la inclusión, la escucha activa, asumiendo el rol asignado y responsabilizándose de la propia contribución al equipo.',
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
        { course: '1ESO', code: 'A1.1', description: 'Estrategias sencillas de recuento sistemático en situaciones de la vida cotidiana' },
        { course: '2ESO', code: 'A1.1', description: 'Estrategias sencillas de recuento sistemático en situaciones de la vida cotidiana' },
        { course: '3ESO', code: 'A1.1', description: 'Estrategias variadas de recuento sistemático en situaciones de la vida cotidiana.' },
        { course: '1ESO', code: 'A1.2', description: 'Adaptación del conteo al tamaño de los números en problemas de la vida cotidiana.' },
        // A2. Cantidad
        { course: '1ESO', code: 'A2.1', description: 'Números grandes y pequeños: uso de la calculadora.' },
        { course: '2ESO', code: 'A2.1', description: 'Números grandes y pequeños: notación exponencial y científica y uso de la calculadora.' },
        { course: '1ESO', code: 'A2.2', description: 'Realización de estimaciones con la precisión requerida.' },
        { course: '2ESO', code: 'A2.2', description: 'Realización de estimaciones con la precisión requerida.' },
        { course: '1ESO', code: 'A2.3', description: 'Números enteros, fraccionarios, decimales y raíces cuadradas para expresar cantidades en contextos de la vida cotidiana.' },
        { course: '2ESO', code: 'A2.3', description: 'Números enteros, fraccionarios, decimales y raíces cúbicas para expresar cantidades en contextos de la vida cotidiana.' },
        { course: '3ESO', code: 'A2.3', description: 'Números enteros, fraccionarios, decimales y raíces en la expresión de cantidades en contextos de la vida cotidiana.' },
        { course: '1ESO', code: 'A2.4', description: 'Representación de números enteros, fraccionarios sencillos y decimales, y ordenación en la recta numérica de números enteros y decimales.' },
        { course: '2ESO', code: 'A2.4', description: 'Representación de números enteros, fraccionarios y decimales, y ordenación en la recta numérica de números enteros, fraccionarios sencillos y decimales' },
        { course: '3ESO', code: 'A2.4', description: 'Diferentes formas de representación de números enteros, fraccionarios y decimales, incluida la recta numérica.' },
        { course: '1ESO', code: 'A2.5', description: 'Porcentajes mayores que 100 y menores que 1: interpretación.' },
        { course: '2ESO', code: 'A2.5', description: 'Porcentajes mayores que 100 y menores que 1: interpretación.' },
        // A3. Sentido de las operaciones
        { course: '1ESO', code: 'A3.1', description: 'Estrategias de cálculo mental con números naturales y decimales.' },
        { course: '2ESO', code: 'A3.1', description: 'Estrategias de cálculo mental con números naturales, fracciones y decimales.' },
        { course: '1ESO', code: 'A3.2', description: 'Operaciones con números enteros, fraccionarios sencillos o decimales en situaciones contextualizadas.' },
        { course: '2ESO', code: 'A3.2', description: 'Operaciones con números enteros, fraccionarios o decimales en situaciones contextualizadas.' },
        { course: '3ESO', code: 'A3.2', description: 'Operaciones con números enteros, fraccionarios o decimales en situaciones contextualizadas.' },
        { course: '1ESO', code: 'A3.3', description: 'Relaciones inversas entre las operaciones (adición y sustracción; multiplicación y división;): comprensión y utilización en la simplificación y resolución de problemas.' },
        { course: '2ESO', code: 'A3.3', description: 'Relaciones inversas entre las operaciones (adición y sustracción; multiplicación y división; elevar al cuadrado y extraer la raíz cuadrada): comprensión y utilización en la simplificación y resolución de problemas.' },
        { course: '3ESO', code: 'A3.3', description: 'Relaciones inversas entre las operaciones (adición y sustracción; multiplicación y división; elevar al cuadrado y extraer la raíz cuadrada): comprensión y utilización en la simplificación y resolución de problemas.' },
        { course: '1ESO', code: 'A3.4', description: 'Efectos de las operaciones aritméticas con números enteros, fracciones y expresiones decimales.' },
        { course: '2ESO', code: 'A3.4', description: 'Efecto de las operaciones aritméticas con números enteros, fracciones y expresiones decimales.' },
        { course: '3ESO', code: 'A3.4', description: 'Efecto de las operaciones aritméticas con números enteros, fracciones y expresiones decimales.' },
        { course: '1ESO', code: 'A3.5', description: 'Propiedades de las operaciones (suma, resta, multiplicación, división): cálculos de manera eficiente con números naturales, enteros, fraccionarios sencillos y decimales tanto mentalmente como de forma manual, con calculadora.' },
        { course: '2ESO', code: 'A3.5', description: 'Propiedades de las operaciones (suma, resta, multiplicación, división y potenciación): cálculos de manera eficiente con números naturales, enteros, fraccionarios y decimales tanto mentalmente como de forma manual, con calculadora u hoja de cálculo.' },
        { course: '3ESO', code: 'A3.5', description: 'Propiedades de las operaciones (suma, resta, multiplicación, división y potenciación): cálculos de manera eficiente con números naturales, enteros, fraccionarios y decimales tanto mentalmente como de forma manual, con calculadora u hoja de cálculo.' },
        // A4. Relaciones
        { course: '1ESO', code: 'A4.1', description: 'Factores, múltiplos y divisores. Factorización en números primos.' },
        { course: '2ESO', code: 'A4.1', description: 'Factores, múltiplos y divisores. Factorización en números primos para resolver problemas: estrategias y herramientas.' },
        { course: '1ESO', code: 'A4.2', description: 'Comparación y ordenación de decimales, situación exacta o aproximada en la recta numérica.' },
        { course: '2ESO', code: 'A4.2', description: 'Comparación y ordenación de fracciones, decimales y porcentajes: situación exacta o aproximada en la recta numérica.' },
        { course: '3ESO', code: 'A4.2', description: 'Comparación y ordenación de fracciones, decimales y porcentajes: situación exacta o aproximada en la recta numérica.' },
        { course: '1ESO', code: 'A4.3', description: 'Representación de una cantidad en una situación o problema.' },
        { course: '2ESO', code: 'A4.3', description: 'Selección de la representación adecuada para una misma cantidad en cada situación o problema.' },
        { course: '3ESO', code: 'A4.3', description: 'Selección de la representación adecuada para una misma cantidad en cada situación o problema.' },
        { course: '1ESO', code: 'A4.4', description: 'Patrones y regularidades numéricas sencillas..' },
        { course: '2ESO', code: 'A4.4', description: 'Patrones y regularidades numéricas.' },
        { course: '3ESO', code: 'A4.4', description: 'Patrones y regularidades numéricas.' },
        { course: '1ESO', code: 'A4.5', description: 'Múltiplos y divisores comunes a varios números. Cálculo del mínimo común múltiplo y máximo común divisor a varios números.' },
        { course: '2ESO', code: 'A4.5', description: 'Múltiplos y divisores comunes a varios números. Cálculo del mínimo común múltiplo y máximo común divisor a varios números.' },
        { course: '1ESO', code: 'A4.6', description: 'Relación entre fracción, decimal y porcentaje. Conversión y operaciones.' },
        { course: '2ESO', code: 'A4.6', description: 'Relación entre fracción, decimal y porcentaje. Conversión y operaciones.' },
        // A5. Razonamiento proporcional
        { course: '1ESO', code: 'A5.1', description: 'Razones y proporciones: comprensión y representación de relaciones cuantitativas.' },
        { course: '2ESO', code: 'A5.1', description: 'Razones y proporciones: comprensión y representación de relaciones cuantitativas.' },
        { course: '1ESO', code: 'A5.2', description: 'Porcentajes: comprensión y resolución de problemas.' },
        { course: '2ESO', code: 'A5.2', description: 'Porcentajes: comprensión y resolución de problemas.' },
        { course: '1ESO', code: 'A5.3', description: 'Situaciones de proporcionalidad directa en diferentes contextos: resolución de problemas contextualizados.' },
        { course: '2ESO', code: 'A5.3', description: 'Situaciones de proporcionalidad en diferentes contextos: análisis y desarrollo de métodos para la resolución de problemas (aumentos y disminuciones porcentuales, rebajas y subidas de precios, impuestos, escalas, cambio de divisas, velocidad y tiempo, etc.).' },
        { course: '3ESO', code: 'A5.3', description: 'Situaciones de proporcionalidad en diferentes contextos: análisis y desarrollo de métodos para la resolución de problemas (aumentos y disminuciones porcentuales, rebajas y subidas de precios, impuestos, escalas, cambio de divisas, velocidad y tiempo, etc.).' },
        // A6. Educación financiera
        { course: '3ESO', code: 'A6.1', description: 'Información numérica en contextos financieros sencillos: interpretación.' },
        { course: '1ESO', code: 'A6.2', description: 'Consumo responsable: relaciones calidad-precio y valor-precio en contextos cotidianos.' },
        { course: '2ESO', code: 'A6.2', description: 'Métodos para la toma de decisiones de consumo responsable: relaciones calidad-precio y valor-precio en contextos cotidianos.' },
        { course: '3ESO', code: 'A6.2', description: 'Métodos para la toma de decisiones de consumo responsable: relaciones calidad-precio y valor-precio en contextos cotidianos.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // B. Sentido de la medida
    // ──────────────────────────────────────────────────────────
    {
      letter: 'B',
      title: 'Sentido de la medida',
      items: [
        // B1. Magnitud
        { course: '1ESO', code: 'B1.1', description: 'Atributos mensurables de los objetos físicos y matemáticos.' },
        { course: '2ESO', code: 'B1.1', description: 'Atributos mensurables de los objetos físicos y matemáticos: investigación y relación entre los mismos.' },
        { course: '3ESO', code: 'B1.1', description: 'Atributos mensurables de los objetos físicos y matemáticos: investigación y relación entre los mismos.' },
        { course: '1ESO', code: 'B1.2', description: 'Utilización de las unidades y operaciones dadas en problemas que impliquen medida.' },
        { course: '2ESO', code: 'B1.2', description: 'Estrategias de elección de las unidades y operaciones adecuadas en problemas que impliquen medida.' },
        { course: '3ESO', code: 'B1.2', description: 'Estrategias de elección de las unidades y operaciones adecuadas en problemas que impliquen medida.' },
        // B2. Medición
        { course: '1ESO', code: 'B2.1', description: 'Longitudes y áreas en figuras planas: aplicación.' },
        { course: '2ESO', code: 'B2.1', description: 'Longitudes, áreas y volúmenes en figuras planas y tridimensionales: interpretación y aplicación.' },
        { course: '3ESO', code: 'B2.1', description: 'Longitudes, áreas y volúmenes en figuras planas y tridimensionales: deducción, interpretación y aplicación.' },
        { course: '2ESO', code: 'B2.2', description: 'Representaciones planas de objetos tridimensionales en la visualización y resolución de problemas de áreas.' },
        { course: '3ESO', code: 'B2.2', description: 'Representaciones planas de objetos tridimensionales en la visualización y resolución de problemas de áreas.' },
        { course: '1ESO', code: 'B2.3', description: 'Representaciones de objetos geométricos bidimensionales con propiedades fijadas, como las longitudes de los lados o las medidas de los ángulos.' },
        { course: '2ESO', code: 'B2.3', description: 'Representaciones de objetos geométricos con propiedades fijadas, como las longitudes de los lados o las medidas de los ángulos.' },
        { course: '2ESO', code: 'B2.4', description: 'La probabilidad como medida asociada a la incertidumbre de experimentos aleatorios.' },
        { course: '3ESO', code: 'B2.4', description: 'La probabilidad como medida asociada a la incertidumbre de experimentos aleatorios.' },
        // B3. Estimaciones y relaciones
        { course: '1ESO', code: 'B3.1', description: 'Formulación guiada de conjeturas sobre medidas o relaciones entre las mismas basadas en estimaciones.' },
        { course: '2ESO', code: 'B3.1', description: 'Formulación guiada de conjeturas sobre medidas o relaciones entre las mismas basadas en estimaciones.' },
        { course: '3ESO', code: 'B3.1', description: 'Formulación de conjeturas sobre medidas o relaciones entre las mismas basadas en estimaciones.' },
        { course: '1ESO', code: 'B3.2', description: 'Diferentes grados de precisión en situaciones de medida.' },
        { course: '2ESO', code: 'B3.2', description: 'Toma de decisión justificada del grado de precisión requerida en situaciones de medida.' },
        { course: '3ESO', code: 'B3.2', description: 'Estrategias para la toma de decisión justificada del grado de precisión requerida en situaciones de medida.' },
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
        { course: '1ESO', code: 'C1.1', description: 'Formas geométricas planas: descripción y clasificación de en función de sus propiedades o características.' },
        { course: '2ESO', code: 'C1.1', description: 'Formas geométricas planas y tridimensionales: descripción y clasificación de en función de sus propiedades o características.' },
        { course: '3ESO', code: 'C1.1', description: 'Figuras geométricas planas y tridimensionales: descripción y clasificación en función de sus propiedades o características.' },
        { course: '2ESO', code: 'C1.2', description: 'Relaciones geométricas como la congruencia, la semejanza y la relación pitagórica en figuras planas: identificación y aplicación.' },
        { course: '3ESO', code: 'C1.2', description: 'Relaciones geométricas como la congruencia, la semejanza y la relación pitagórica en figuras planas y tridimensionales: identificación y aplicación.' },
        { course: '1ESO', code: 'C1.3', description: 'Construcción de figuras geométricas planas con herramientas manipulativas y digitales (programas de geometría dinámica, realidad aumentada...).' },
        { course: '2ESO', code: 'C1.3', description: 'Construcción de figuras geométricas con herramientas manipulativas y digitales (programas de geometría dinámica, realidad aumentada...).' },
        { course: '3ESO', code: 'C1.3', description: 'Construcción de figuras geométricas con herramientas manipulativas y digitales (programas de geometría dinámica, realidad aumentada...).' },
        { course: '1ESO', code: 'C1.4', description: 'Elementos básicos de la geometría del plano. Relaciones y propiedades de figuras en el plano. Paralelismo y perpendicularidad' },
        { course: '2ESO', code: 'C1.4', description: 'Elementos básicos de la geometría del espacio. Relaciones y propiedades de figuras en el espacio.' },
        // C2. Localización y sistemas de representación
        { course: '1ESO', code: 'C2.1', description: 'Relaciones espaciales en el plano: localización y descripción mediante coordenadas geométricas.' },
        { course: '2ESO', code: 'C2.1', description: 'Relaciones espaciales en el plano: localización y descripción mediante coordenadas geométricas.' },
        { course: '3ESO', code: 'C2.1', description: 'Relaciones espaciales: localización y descripción mediante coordenadas geométricas y otros sistemas de representación.' },
        // C3. Movimientos y transformaciones
        { course: '1ESO', code: 'C3.1', description: 'Simetrías en figuras planas.' },
        { course: '3ESO', code: 'C3.1', description: 'Transformaciones elementales como giros, traslaciones y simetrías en situaciones diversas utilizando herramientas tecnológicas o manipulativas.' },
        // C4. Visualización, razonamiento y modelización geométrica
        { course: '1ESO', code: 'C4.1', description: 'Modelización geométrica para representar relaciones numéricas en la resolución de problemas.' },
        { course: '2ESO', code: 'C4.1', description: 'Modelización geométrica para representar y explicar relaciones numéricas en la resolución de problemas.' },
        { course: '3ESO', code: 'C4.1', description: 'Modelización geométrica: relaciones numéricas y algebraicas en la resolución de problemas.' },
        { course: '2ESO', code: 'C4.2', description: 'Relaciones geométricas en contextos matemáticos y no matemáticos (arte, ciencia, vida diaria...).' },
        { course: '3ESO', code: 'C4.2', description: 'Relaciones geométricas en contextos matemáticos y no matemáticos (arte, ciencia, vida diaria...).' },
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
        { course: '2ESO', code: 'D1.1', description: 'Patrones, pautas y regularidades: observación y determinación de la regla de formación en casos sencillos.' },
        { course: '3ESO', code: 'D1.1', description: 'Patrones, pautas y regularidades: observación y determinación de la regla de formación en casos sencillos.' },
        // D2. Modelo matemático
        { course: '2ESO', code: 'D2.1', description: 'Modelización de situaciones de la vida cotidiana usando representaciones matemáticas y el lenguaje algebraico.' },
        { course: '3ESO', code: 'D2.1', description: 'Modelización de situaciones de la vida cotidiana usando representaciones matemáticas y el lenguaje algebraico.' },
        { course: '2ESO', code: 'D2.2', description: 'Estrategias de deducción de conclusiones razonables a partir de un modelo matemático.' },
        { course: '3ESO', code: 'D2.2', description: 'Estrategias de deducción de conclusiones razonables a partir de un modelo matemático.' },
        // D3. Variable
        { course: '2ESO', code: 'D3.1', description: 'Variable: comprensión del concepto en sus diferentes naturalezas.' },
        { course: '3ESO', code: 'D3.1', description: 'Variable: comprensión del concepto en sus diferentes naturalezas.' },
        // D4. Igualdad y desigualdad
        { course: '2ESO', code: 'D4.1', description: 'Relaciones lineales en situaciones de la vida cotidiana o matemáticamente relevantes: expresión mediante álgebra simbólica.' },
        { course: '3ESO', code: 'D4.1', description: 'Relaciones lineales y cuadráticas en situaciones de la vida cotidiana o matemáticamente relevantes: expresión mediante álgebra simbólica.' },
        { course: '2ESO', code: 'D4.2', description: 'Equivalencia de expresiones algebraicas en la resolución de problemas basados en relaciones lineales.' },
        { course: '3ESO', code: 'D4.2', description: 'Equivalencia de expresiones algebraicas en la resolución de problemas basados en relaciones lineales y cuadráticas.' },
        { course: '2ESO', code: 'D4.3', description: 'Estrategias de búsqueda de soluciones en ecuaciones y sistemas lineales en situaciones de la vida cotidiana.' },
        { course: '3ESO', code: 'D4.3', description: 'Estrategias de búsqueda de soluciones en ecuaciones y sistemas lineales y ecuaciones cuadráticas en situaciones de la vida cotidiana.' },
        { course: '2ESO', code: 'D4.4', description: 'Ecuaciones: resolución mediante el uso de la tecnología.' },
        { course: '3ESO', code: 'D4.4', description: 'Ecuaciones: resolución mediante el uso de la tecnología.' },
        // D5. Relaciones y funciones
        { course: '2ESO', code: 'D5.1', description: 'Relaciones lineales y cuadráticas: identificación y comparación de diferentes modos de representación, tablas, gráficas o expresiones algebraicas, y sus propiedades a partir de ellas.' },
        { course: '3ESO', code: 'D5.1', description: 'Relaciones lineales y cuadráticas: identificación y comparación de diferentes modos de representación, tablas, gráficas o expresiones algebraicas, y sus propiedades a partir de ellas.' },
        { course: '2ESO', code: 'D5.2', description: 'Relaciones cuantitativas en situaciones de la vida cotidiana y clases de funciones que las modelizan.' },
        { course: '3ESO', code: 'D5.2', description: 'Relaciones cuantitativas en situaciones de la vida cotidiana y clases de funciones que las modelizan.' },
        { course: '1ESO', code: 'D5.3', description: 'Deducción de la información relevante de una función mediante su representación gráfica.' },
        { course: '2ESO', code: 'D5.3', description: 'Deducción de la información relevante de una función mediante su representación gráfica.' },
        { course: '3ESO', code: 'D5.3', description: 'Estrategias de deducción de la información relevante de una función mediante el uso de diferentes representaciones simbólicas.' },
        // D6. Pensamiento computacional
        { course: '1ESO', code: 'D6.1', description: 'Generalización y transferencia de procesos de resolución de problemas a otras situaciones.' },
        { course: '2ESO', code: 'D6.1', description: 'Generalización y transferencia de procesos de resolución de problemas a otras situaciones.' },
        { course: '3ESO', code: 'D6.1', description: 'Generalización y transferencia de procesos de resolución de problemas a otras situaciones.' },
        { course: '2ESO', code: 'D6.2', description: 'Estrategias útiles en la interpretación de algoritmos.' },
        { course: '3ESO', code: 'D6.2', description: 'Estrategias útiles en la interpretación y modificación de algoritmos.' },
        { course: '2ESO', code: 'D6.3', description: 'Estrategias de formulación de cuestiones susceptibles de ser analizadas mediante programas y otras herramientas.' },
        { course: '3ESO', code: 'D6.3', description: 'Estrategias de formulación de cuestiones susceptibles de ser analizadas mediante programas y otras herramientas.' },
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
        { course: '1ESO', code: 'E1.1', description: 'Recogida y organización de datos de situaciones de la vida cotidiana que involucran una sola variable.' },
        { course: '2ESO', code: 'E1.1', description: 'Estrategias de recogida y organización de datos de situaciones de la vida cotidiana que involucran una sola variable.' },
        { course: '3ESO', code: 'E1.1', description: 'Estrategias de recogida y organización de datos de situaciones de la vida cotidiana que involucran una sola variable. Diferencia entre variable y valores individuales.' },
        { course: '1ESO', code: 'E1.2', description: 'Interpretación de tablas y gráficos estadísticos de variables cualitativas y cuantitativas discretas en contextos reales.' },
        { course: '2ESO', code: 'E1.2', description: 'Interpretación de tablas y gráficos estadísticos de variables cualitativas y cuantitativas discretas en contextos reales.' },
        { course: '3ESO', code: 'E1.2', description: 'Análisis e interpretación de tablas y gráficos estadísticos de variables cualitativas, cuantitativas discretas y cuantitativas continuas en contextos reales.' },
        { course: '1ESO', code: 'E1.3', description: 'Gráficos estadísticos de variables cualitativas: representación mediante diferentes tecnologías.' },
        { course: '2ESO', code: 'E1.3', description: 'Gráficos estadísticos de variables cualitativas y cuantitativas discretas: representación mediante diferentes tecnologías.' },
        { course: '3ESO', code: 'E1.3', description: 'Gráficos estadísticos: representación mediante diferentes tecnologías (calculadora, hoja de cálculo, aplicaciones...) y elección del más adecuado.' },
        { course: '1ESO', code: 'E1.4', description: 'Medidas de centralización: interpretación y cálculo con apoyo tecnológico en situaciones reales.' },
        { course: '2ESO', code: 'E1.4', description: 'Medidas de centralización: interpretación y cálculo con apoyo tecnológico en situaciones reales.' },
        { course: '3ESO', code: 'E1.4', description: 'Medidas de localización: interpretación y cálculo con apoyo tecnológico en situaciones reales.' },
        { course: '2ESO', code: 'E1.5', description: 'Variabilidad: interpretación de medidas de dispersión en situaciones reales.' },
        { course: '3ESO', code: 'E1.5', description: 'Variabilidad: interpretación y cálculo, con apoyo tecnológico, de medidas de dispersión en situaciones reales.' },
        { course: '2ESO', code: 'E1.6', description: 'Comparación de dos conjuntos de datos atendiendo a las medidas de centralización y dispersión.' },
        { course: '3ESO', code: 'E1.6', description: 'Comparación de dos conjuntos de datos atendiendo a las medidas de localización y dispersión.' },
        // E2. Incertidumbre
        { course: '2ESO', code: 'E2.1', description: 'Fenómenos deterministas y aleatorios: identificación.' },
        { course: '3ESO', code: 'E2.1', description: 'Fenómenos deterministas y aleatorios: identificación.' },
        { course: '2ESO', code: 'E2.2', description: 'Experimentos simples: análisis de la incertidumbre asociada.' },
        { course: '3ESO', code: 'E2.2', description: 'Experimentos simples: planificación, realización y análisis de la incertidumbre asociada.' },
        { course: '2ESO', code: 'E2.3', description: 'Asignación de probabilidades mediante la regla de Laplace.' },
        { course: '3ESO', code: 'E2.3', description: 'Asignación de probabilidades mediante experimentación, el concepto de frecuencia relativa y la regla de Laplace.' },
        // E3. Inferencia
        { course: '2ESO', code: 'E3.1', description: 'Características de interés de una población.' },
        { course: '3ESO', code: 'E3.1', description: 'Formulación de preguntas adecuadas que permitan conocer las características de interés de una población.' },
        { course: '2ESO', code: 'E3.2', description: 'Presentación de la información procedente de una muestra mediante herramientas digitales.' },
        { course: '3ESO', code: 'E3.2', description: 'Datos relevantes para dar respuesta a cuestiones planteadas en investigaciones estadísticas: presentación de la información procedente de una muestra mediante herramientas digitales.' },
        { course: '3ESO', code: 'E3.3', description: 'Estrategias de deducción de conclusiones a partir de una muestra con el fin de emitir juicios y tomar decisiones adecuadas.' },
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
        { course: '1ESO', code: 'F1.1', description: 'Estrategias de fomento de la curiosidad, la iniciativa, la perseverancia y la resiliencia en el aprendizaje de las matemáticas.' },
        { course: '2ESO', code: 'F1.1', description: 'Estrategias de fomento de la curiosidad, la iniciativa, la perseverancia y la resiliencia en el aprendizaje de las matemáticas.' },
        { course: '3ESO', code: 'F1.1', description: 'Estrategias de fomento de la curiosidad, la iniciativa, la perseverancia y la resiliencia en el aprendizaje de las matemáticas.' },
        { course: '1ESO', code: 'F1.2', description: 'Gestión emocional: emociones que intervienen en el aprendizaje de las matemáticas. Autoconciencia y autorregulación.' },
        { course: '2ESO', code: 'F1.2', description: 'Gestión emocional: emociones que intervienen en el aprendizaje de las matemáticas. Autoconciencia y autorregulación.' },
        { course: '3ESO', code: 'F1.2', description: 'Gestión emocional: emociones que intervienen en el aprendizaje de las matemáticas. Autoconciencia y autorregulación.' },
        { course: '1ESO', code: 'F1.3', description: 'Estrategias de fomento de la flexibilidad cognitiva: apertura a cambios de estrategia y transformación del error en oportunidad de aprendizaje.' },
        { course: '2ESO', code: 'F1.3', description: 'Estrategias de fomento de la flexibilidad cognitiva: apertura a cambios de estrategia y transformación del error en oportunidad de aprendizaje.' },
        { course: '3ESO', code: 'F1.3', description: 'Estrategias de fomento de la flexibilidad cognitiva: apertura a cambios de estrategia y transformación del error en oportunidad de aprendizaje.' },
        // F2. Trabajo en equipo y toma de decisiones
        { course: '1ESO', code: 'F2.1', description: 'Técnicas cooperativas para optimizar el trabajo en equipo y compartir y construir conocimiento matemático.' },
        { course: '2ESO', code: 'F2.1', description: 'Técnicas cooperativas para optimizar el trabajo en equipo y compartir y construir conocimiento matemático.' },
        { course: '3ESO', code: 'F2.1', description: 'Técnicas cooperativas para optimizar el trabajo en equipo y compartir y construir conocimiento matemático.' },
        { course: '1ESO', code: 'F2.2', description: 'Conductas empáticas y estrategias de gestión de conflictos.' },
        { course: '2ESO', code: 'F2.2', description: 'Conductas empáticas y estrategias de gestión de conflictos.' },
        { course: '3ESO', code: 'F2.2', description: 'Conductas empáticas y estrategias de gestión de conflictos.' },
        // F3. Inclusión, respeto y diversidad
        { course: '1ESO', code: 'F3.1', description: 'Actitudes inclusivas y aceptación de la diversidad presente en el aula y en la sociedad.' },
        { course: '2ESO', code: 'F3.1', description: 'Actitudes inclusivas y aceptación de la diversidad presente en el aula y en la sociedad.' },
        { course: '3ESO', code: 'F3.1', description: 'Actitudes inclusivas y aceptación de la diversidad presente en el aula y en la sociedad.' },
        { course: '1ESO', code: 'F3.2', description: 'La contribución de las matemáticas al desarrollo de los distintos ámbitos del conocimiento humano desde una perspectiva de género.' },
        { course: '2ESO', code: 'F3.2', description: 'La contribución de las matemáticas al desarrollo de los distintos ámbitos del conocimiento humano desde una perspectiva de género.' },
        { course: '3ESO', code: 'F3.2', description: 'La contribución de las matemáticas al desarrollo de los distintos ámbitos del conocimiento humano desde una perspectiva de género.' },
      ],
    },
  ],
};
