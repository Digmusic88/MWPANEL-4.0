import { AreaData } from '../primaria-curriculum.data';

export const AREA_CMN: AreaData = {
  subjectCode: 'CMN-1P',
  abbrev: 'CMN',
  areaName: 'Conocimiento del Medio Natural, Social y Cultural',
  competencies: [
    {
      code: '1',
      name: 'Uso seguro y eficiente de dispositivos digitales',
      description:
        'Utilizar dispositivos y recursos digitales de forma segura, responsable y eficiente, para buscar información, comunicarse y trabajar de manera individual, en equipo y en red, y para reelaborar y crear contenido digital de acuerdo con las necesidades digitales del contexto educativo.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CCEC'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '1.1',
          description:
            'Utilizar dispositivos y recursos digitales de forma segura y de acuerdo con las necesidades del contexto educativo.',
        },
        {
          cycle: 'SEGUNDO',
          code: '1.1',
          description:
            'Utilizar dispositivos y recursos digitales, de acuerdo con las necesidades del contexto educativo de forma segura, buscando información, comunicándose y trabajando de forma individual y en equipo, reelaborando y creando contenidos digitales sencillos.',
        },
        {
          cycle: 'TERCER',
          code: '1.1',
          description:
            'Utilizar recursos digitales de acuerdo con las necesidades del contexto educativo de forma segura y eficiente, buscando información, comunicándose y trabajando de forma individual, en equipo y en red, reelaborando y creando contenidos digitales sencillos.',
        },
      ],
    },
    {
      code: '2',
      name: 'Planteamiento y respuesta a cuestiones científicas',
      description:
        'Plantear y dar respuesta a cuestiones científicas sencillas, utilizando diferentes técnicas, instrumentos y modelos propios del pensamiento científico, para interpretar y explicar hechos y fenómenos que ocurren en el medio natural, social y cultural.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CC'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '2.1',
          description:
            'Mostrar curiosidad por objetos, hechos y fenómenos cercanos, formulando preguntas y realizando predicciones.',
        },
        {
          cycle: 'SEGUNDO',
          code: '2.1',
          description:
            'Formular preguntas y realizar predicciones razonadas, demostrando curiosidad por el medio natural, social y cultural cercano.',
        },
        {
          cycle: 'TERCER',
          code: '2.1',
          description:
            'Formular preguntas y realizar predicciones razonadas sobre el medio natural, social o cultural mostrando y manteniendo la curiosidad.',
        },
        {
          cycle: 'PRIMER',
          code: '2.2',
          description:
            'Buscar información sencilla de diferentes fuentes seguras y fiables de forma guiada, utilizándola en investigaciones relacionadas con el medio natural, social y cultural.',
        },
        {
          cycle: 'SEGUNDO',
          code: '2.2',
          description:
            'Buscar y seleccionar información de diferentes fuentes seguras y fiables, utilizándola en investigaciones relacionadas con el medio natural, social y cultural y adquiriendo léxico científico básico.',
        },
        {
          cycle: 'TERCER',
          code: '2.2',
          description:
            'Buscar, seleccionar y contrastar información, de diferentes fuentes seguras y fiables, usando los criterios de fiabilidad de fuentes, adquiriendo léxico científico básico, y utilizándola en investigaciones relacionadas con el medio natural, social y cultural.',
        },
        {
          cycle: 'PRIMER',
          code: '2.3',
          description:
            'Participar en experimentos pautados o guiados, cuando la investigación lo requiera, utilizando diferentes técnicas sencillas de indagación, empleando de forma segura los instrumentos y registrando las observaciones de forma clara.',
        },
        {
          cycle: 'SEGUNDO',
          code: '2.3',
          description:
            'Realizar experimentos guiados, cuando la investigación lo requiera, utilizando diferentes técnicas de indagación y modelos, empleando de forma segura instrumentos y dispositivos, realizando observaciones y mediciones precisas y registrándolas correctamente.',
        },
        {
          cycle: 'TERCER',
          code: '2.3',
          description:
            'Diseñar y realizar experimentos guiados, cuando la investigación lo requiera, utilizando diferentes técnicas de indagación y modelos, empleando de forma segura los instrumentos y dispositivos apropiados, realizando observaciones y mediciones precisas y registrándolas correctamente.',
        },
        {
          cycle: 'PRIMER',
          code: '2.4',
          description:
            'Proponer respuestas a las preguntas planteadas, comparando la información y resultados obtenidos con las predicciones realizadas.',
        },
        {
          cycle: 'SEGUNDO',
          code: '2.4',
          description:
            'Proponer posibles respuestas a las preguntas planteadas, a través de la interpretación de la información y los resultados obtenidos, comparándolos con las predicciones realizadas.',
        },
        {
          cycle: 'TERCER',
          code: '2.4',
          description:
            'Proponer posibles respuestas a las preguntas planteadas, a través del análisis y la interpretación de la información y los resultados obtenidos, valorando la coherencia de las posibles soluciones y comparándolas con las predicciones realizadas.',
        },
        {
          cycle: 'PRIMER',
          code: '2.5',
          description:
            'Comunicar de forma oral o gráfica el resultado de las investigaciones, explicando los pasos seguidos con ayuda de un guion.',
        },
        {
          cycle: 'SEGUNDO',
          code: '2.5',
          description:
            'Presentar los resultados de las investigaciones en diferentes formatos, utilizando lenguaje científico básico y explicando los pasos seguidos.',
        },
        {
          cycle: 'TERCER',
          code: '2.5',
          description:
            'Comunicar los resultados de las investigaciones adecuando el mensaje y el formato a la audiencia a la que va dirigido, utilizando el lenguaje científico y explicando los pasos seguidos.',
        },
      ],
    },
    {
      code: '3',
      name: 'Resolución de problemas mediante proyectos de diseño',
      description:
        'Resolver problemas a través de proyectos de diseño y de la aplicación del pensamiento computacional, para generar cooperativamente un producto creativo e innovador que responda a necesidades concretas.',
      keyCompetencyCodes: ['STEM', 'CD', 'CPSAA', 'CE', 'CCEC'],
      criteria: [
        {
          cycle: 'TERCER',
          code: '3.0',
          description:
            'Plantear problemas de diseño que se resuelvan con la creación de un prototipo o solución digital, evaluando necesidades del entorno y estableciendo objetivos concretos.',
        },
        {
          cycle: 'PRIMER',
          code: '3.1',
          description:
            'Mostrar interés por el pensamiento computacional, participando en la resolución guiada de problemas sencillos de programación.',
        },
        {
          cycle: 'SEGUNDO',
          code: '3.1',
          description:
            'Resolver, de forma guiada, problemas sencillos de programación, modificando algoritmos de acuerdo con los principios básicos del pensamiento computacional.',
        },
        {
          cycle: 'TERCER',
          code: '3.1',
          description:
            'Diseñar posibles soluciones a los problemas planteados de acuerdo con técnicas sencillas de los proyectos de diseño y pensamiento computacional, mediante estrategias básicas de gestión de proyectos cooperativos, teniendo en cuenta los recursos necesarios y estableciendo criterios concretos para evaluar el proyecto.',
        },
        {
          cycle: 'PRIMER',
          code: '3.2',
          description:
            'Realizar, de forma guiada, un producto final sencillo que dé solución a un problema de diseño, probando en equipo diferentes prototipos y utilizando de forma segura los materiales adecuados.',
        },
        {
          cycle: 'SEGUNDO',
          code: '3.2',
          description:
            'Construir en equipo un producto final sencillo que dé solución a un problema de diseño, proponiendo posibles soluciones, probando diferentes prototipos y utilizando de forma segura las herramientas, técnicas y materiales adecuados.',
        },
        {
          cycle: 'TERCER',
          code: '3.2',
          description:
            'Desarrollar un producto final que dé solución a un problema de diseño, probando en equipo diferentes prototipos o soluciones digitales y utilizando de forma segura las herramientas, dispositivos, técnicas y materiales adecuados.',
        },
        {
          cycle: 'PRIMER',
          code: '3.3',
          description:
            'Presentar de forma oral o gráfica el producto final de los proyectos de diseño, explicando los pasos seguidos con ayuda de un guion.',
        },
        {
          cycle: 'SEGUNDO',
          code: '3.3',
          description:
            'Presentar el producto final de los proyectos de diseño en diferentes formatos y explicando los pasos seguidos.',
        },
        {
          cycle: 'TERCER',
          code: '3.3',
          description:
            'Comunicar el diseño de un producto final, adaptando el mensaje y el formato a la audiencia, explicando los pasos seguidos, justificando por qué ese prototipo o solución digital cumple con los requisitos del proyecto y proponiendo posibles retos para futuros proyectos.',
        },
      ],
    },
    {
      code: '4',
      name: 'Conocimiento del propio cuerpo y hábitos saludables',
      description:
        'Conocer y tomar conciencia del propio cuerpo, así como de las emociones y sentimientos propios y ajenos, aplicando el conocimiento científico, para desarrollar hábitos saludables y para conseguir el bienestar físico, emocional y social.',
      keyCompetencyCodes: ['STEM', 'CPSAA', 'CC'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '4.1',
          description:
            'Identificar las emociones propias y las ajenas, entendiendo las relaciones familiares y escolares a las que pertenecen y reconociendo las acciones que favorezcan el bienestar emocional y social.',
        },
        {
          cycle: 'SEGUNDO',
          code: '4.1',
          description:
            'Mostrar actitudes que fomenten el bienestar emocional y social, identificando las emociones propias y ajenas, mostrando empatía y estableciendo relaciones afectivas saludables.',
        },
        {
          cycle: 'TERCER',
          code: '4.1',
          description:
            'Promover actitudes que fomenten el bienestar emocional y social, gestionando las emociones propias y respetando las ajenas, fomentando relaciones afectivas saludables y reflexionando ante los usos de la tecnología y la gestión del tiempo libre.',
        },
        {
          cycle: 'PRIMER',
          code: '4.2',
          description:
            'Reconocer estilos de vida saludable valorando la importancia de una alimentación variada, equilibrada y sostenible, la higiene, el ejercicio físico, el contacto con la naturaleza, el descanso y el uso adecuado de las tecnologías.',
        },
        {
          cycle: 'SEGUNDO',
          code: '4.2',
          description:
            'Explicar y dar ejemplos de estilos de vida saludable valorando la importancia de una alimentación variada, equilibrada y sostenible, la higiene, el ejercicio físico, el contacto con la naturaleza, el descanso y el uso adecuado de las tecnologías.',
        },
        {
          cycle: 'TERCER',
          code: '4.2',
          description:
            'Adoptar estilos de vida saludable valorando la importancia de una alimentación variada, equilibrada y sostenible, el ejercicio físico, el contacto con la naturaleza, el descanso, la higiene, la prevención de enfermedades y el uso adecuado de nuevas tecnologías.',
        },
      ],
    },
    {
      code: '5',
      name: 'Identificación y relación de elementos del medio',
      description:
        'Identificar las características de los diferentes elementos o sistemas del medio natural, social y cultural, analizando su organización y propiedades y estableciendo relaciones entre los mismos, para reconocer el valor del patrimonio cultural y natural, conservarlo, mejorarlo y emprender acciones para su uso responsable.',
      keyCompetencyCodes: ['STEM', 'CD', 'CC', 'CE', 'CCEC'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '5.1',
          description:
            'Reconocer las características, la organización y las propiedades de los elementos del medio natural, social y cultural a través de la indagación, utilizando las herramientas y procesos adecuados de forma pautada.',
        },
        {
          cycle: 'SEGUNDO',
          code: '5.1',
          description:
            'Identificar las características, la organización y las propiedades de los elementos del medio natural, social y cultural a través de la indagación y utilizando las herramientas y procesos adecuados.',
        },
        {
          cycle: 'TERCER',
          code: '5.1',
          description:
            'Identificar y analizar las características, la organización y las propiedades de los elementos del medio natural, social y cultural a través de la indagación utilizando las herramientas y procesos adecuados.',
        },
        {
          cycle: 'PRIMER',
          code: '5.2',
          description:
            'Reconocer conexiones sencillas y directas entre diferentes elementos del medio natural, social y cultural por medio de la observación, la manipulación y la experimentación.',
        },
        {
          cycle: 'SEGUNDO',
          code: '5.2',
          description:
            'Identificar conexiones sencillas entre diferentes elementos del medio natural social y cultural mostrando comprensión de las relaciones que se establecen.',
        },
        {
          cycle: 'TERCER',
          code: '5.2',
          description:
            'Establecer conexiones sencillas entre diferentes elementos del medio natural, social y cultural mostrando comprensión de las relaciones que se establecen.',
        },
        {
          cycle: 'PRIMER',
          code: '5.3',
          description:
            'Mostrar actitudes de respeto ante el patrimonio natural y cultural, reconociéndolo como un bien común.',
        },
        {
          cycle: 'SEGUNDO',
          code: '5.3',
          description:
            'Proteger el patrimonio natural y cultural, y valorarlo como un bien común, adoptando conductas respetuosas para su disfrute y proponiendo acciones para su conservación y mejora.',
        },
        {
          cycle: 'TERCER',
          code: '5.3',
          description:
            'Valorar, proteger y mostrar actitudes de conservación y mejora del patrimonio natural y cultural a través de propuestas y acciones que reflejen compromisos y conductas en favor de la sostenibilidad.',
        },
      ],
    },
    {
      code: '6',
      name: 'Causas y consecuencias de la intervención humana en el entorno',
      description:
        'Identificar las causas y consecuencias de la intervención humana en el entorno, desde los puntos de vista social, económico, cultural, tecnológico y ambiental, para mejorar la capacidad de afrontar problemas, buscar soluciones y actuar de manera individual y cooperativa en su resolución, y para poner en práctica estilos de vida sostenibles y consecuentes con el respeto, el cuidado y la protección de las personas y del planeta.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CPSAA', 'CC', 'CE'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '6.1',
          description:
            'Mostrar estilos de vida sostenible y valorar la importancia del respeto, los cuidados, la corresponsabilidad y la protección de los elementos y seres del planeta, partiendo del entorno más próximo, identificando la relación de la vida de las personas con sus acciones sobre los elementos y recursos del medio como el suelo o el agua.',
        },
        {
          cycle: 'SEGUNDO',
          code: '6.1',
          description:
            'Identificar problemas ecosociales, proponer posibles soluciones y poner en práctica estilos de vida sostenible, reconociendo comportamientos respetuosos de cuidado, corresponsabilidad y protección del entorno y uso sostenible de los recursos naturales, y expresando los cambios positivos y negativos causados en el medio por la acción humana.',
        },
        {
          cycle: 'TERCER',
          code: '6.1',
          description:
            'Promover estilos de vida sostenible y consecuentes con el respeto, los cuidados, la corresponsabilidad y la protección de las personas y del planeta, a partir del análisis de la intervención humana en el entorno.',
        },
        {
          cycle: 'TERCER',
          code: '6.2',
          description:
            'Participar con actitud emprendedora en la búsqueda, contraste y evaluación de propuestas para afrontar problemas ecosociales, buscar soluciones y actuar para su resolución, a partir del análisis de las causas y consecuencias de la intervención humana en el entorno.',
        },
      ],
    },
    {
      code: '7',
      name: 'Continuidades y cambios del medio social y cultural',
      description:
        'Observar, comprender e interpretar continuidades y cambios del medio social y cultural, analizando relaciones de causalidad, simultaneidad y sucesión, para explicar y valorar las relaciones entre diferentes elementos y acontecimientos.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CPSAA', 'CC', 'CE', 'CCEC'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '7.1',
          description:
            'Ordenar temporalmente hechos del entorno social y cultural cercano, empleando nociones básicas de medida y sucesión.',
        },
        {
          cycle: 'SEGUNDO',
          code: '7.1',
          description:
            'Identificar hechos del entorno social y cultural desde la Prehistoria hasta la Edad Antigua, empleando las nociones de causalidad, simultaneidad y sucesión.',
        },
        {
          cycle: 'TERCER',
          code: '7.1',
          description:
            'Analizar relaciones de causalidad, simultaneidad y sucesión entre diferentes elementos del medio social y cultural desde la Edad Media hasta la actualidad, situando cronológicamente los hechos.',
        },
        {
          cycle: 'PRIMER',
          code: '7.2',
          description:
            'Conocer personas y grupos sociales relevantes de la historia, así como formas de vida del pasado, incorporando la perspectiva de género.',
        },
        {
          cycle: 'SEGUNDO',
          code: '7.2',
          description:
            'Conocer personas, grupos sociales relevantes y formas de vida de las sociedades desde la Prehistoria hasta la Edad Antigua, incorporando la perspectiva de género.',
        },
        {
          cycle: 'TERCER',
          code: '7.2',
          description:
            'Conocer personas, grupos sociales relevantes y formas de vida de las sociedades desde la Edad Media hasta la actualidad, incorporando la perspectiva de género, situándolas cronológicamente e identificando rasgos significativos sociales en distintas épocas de la historia.',
        },
      ],
    },
    {
      code: '8',
      name: 'Diversidad, igualdad de género y valores democráticos',
      description:
        'Reconocer y valorar la diversidad y la igualdad de género, mostrando empatía y respeto por otras culturas y reflexionando sobre cuestiones éticas, para contribuir al bienestar individual y colectivo de una sociedad en continua transformación y al logro de los valores de integración europea.',
      keyCompetencyCodes: ['CP', 'CPSAA', 'CC', 'CCEC'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '8.1',
          description:
            'Recoger información acerca de manifestaciones culturales del propio entorno, mostrando respeto, valorando su diversidad y riqueza, y apreciándose como fuente de aprendizaje.',
        },
        {
          cycle: 'SEGUNDO',
          code: '8.1',
          description:
            'Analizar la importancia demográfica, cultural y económica de las migraciones en la actualidad, valorando con respeto y empatía el aporte de la diversidad etnocultural y afectivo-sexual al bienestar individual y colectivo.',
        },
        {
          cycle: 'TERCER',
          code: '8.1',
          description:
            'Analizar los procesos geográficos, históricos y culturales que han conformado la sociedad actual, valorando la diversidad etnocultural o afectivo-sexual y la cohesión social y mostrando empatía y respeto.',
        },
        {
          cycle: 'PRIMER',
          code: '8.2',
          description:
            'Mostrar actitudes que fomenten la igualdad de género y las conductas no sexistas reconociendo modelos positivos en el entorno cercano.',
        },
        {
          cycle: 'SEGUNDO',
          code: '8.2',
          description:
            'Valorar positivamente las acciones que fomentan la igualdad de género y las conductas no sexistas reconociendo modelos positivos a lo largo de la historia.',
        },
        {
          cycle: 'TERCER',
          code: '8.2',
          description:
            'Promover actitudes de igualdad de género y conductas no sexistas, analizando y contrastando diferentes modelos en nuestra sociedad.',
        },
      ],
    },
    {
      code: '9',
      name: 'Participación en la vida social desde valores democráticos',
      description:
        'Participar en el entorno y la vida social de forma eficaz y constructiva desde el respeto a los valores democráticos, los derechos humanos y de la infancia y los principios y valores de la Constitución española y la Unión Europea, valorando la función del Estado y sus instituciones en el mantenimiento de la paz y la seguridad integral ciudadana, para generar interacciones respetuosas y equitativas y promover la resolución pacífica y dialogada de los conflictos.',
      keyCompetencyCodes: ['CCL', 'CPSAA', 'CC', 'CCEC'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '9.1',
          description:
            'Establecer acuerdos de forma dialógica y democrática como parte de grupos próximos a su entorno, identificando las responsabilidades individuales y empleando un lenguaje inclusivo y no violento.',
        },
        {
          cycle: 'SEGUNDO',
          code: '9.1',
          description:
            'Realizar actividades dentro del contexto de la comunidad escolar, asumiendo responsabilidades y estableciendo acuerdos de forma dialogada y democrática y empleando un lenguaje inclusivo y no violento.',
        },
        {
          cycle: 'TERCER',
          code: '9.1',
          description:
            'Resolver de forma pacífica y dialogada los conflictos, promoviendo una interacción respetuosa y equitativa a partir del lenguaje inclusivo y no violento, conociendo y ejercitando las principales normas, derechos, deberes y libertades que forman parte de la Constitución española, y de la de Unión Europea, y conociendo la función que el Estado y sus instituciones desempeñan en el mantenimiento de la paz, la seguridad integral ciudadana y el reconocimiento de las víctimas de violencia.',
        },
        {
          cycle: 'PRIMER',
          code: '9.2',
          description:
            'Identificar instituciones cercanas, señalando y valorando las funciones que realizan en pro de una buena convivencia.',
        },
        {
          cycle: 'SEGUNDO',
          code: '9.2',
          description:
            'Conocer los principales órganos de gobierno y funciones de diversas administraciones y servicios públicos, valorando la importancia de su gestión para la seguridad integral ciudadana y la participación democrática.',
        },
        {
          cycle: 'TERCER',
          code: '9.2',
          description:
            'Explicar el funcionamiento general de los órganos de gobierno del municipio, de la Comunidad Foral de Navarra, de las demás comunidades autónomas, del Estado español y de la Unión Europea, valorando sus funciones y la gestión de los servicios públicos para la ciudadanía.',
        },
        {
          cycle: 'PRIMER',
          code: '9.3',
          description:
            'Conocer e interiorizar normas básicas para la convivencia en el uso de los espacios públicos, especialmente como peatones o como usuarios de los medios de locomoción, tomando conciencia de la importancia de la movilidad segura, saludable y sostenible tanto para las personas como para el planeta.',
        },
        {
          cycle: 'SEGUNDO',
          code: '9.3',
          description:
            'Interiorizar normas básicas para la convivencia en el uso de los espacios públicos, especialmente como usuarios de los medios de locomoción, identificando las señales de tráfico y tomando conciencia de la importancia de una movilidad segura, saludable y sostenible tanto para las personas como para el planeta.',
        },
        {
          cycle: 'TERCER',
          code: '9.3',
          description:
            'Valorar la importancia de la movilidad sostenible de las personas, conociendo y promoviendo el uso de medios de locomoción como la bicicleta.',
        },
      ],
    },
  ],
  knowledgeBlocks: [
    {
      letter: 'A',
      title: 'Cultura Científica',
      items: [
        // A1. Iniciación a la actividad científica
        {
          cycle: 'PRIMER',
          code: 'A1.1',
          description:
            'Procedimientos de indagación adecuados a las necesidades de la investigación (observación en el tiempo, identificación y clasificación, búsqueda de patrones...).',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A1.1',
          description:
            'Procedimientos de indagación adecuados a las necesidades de la investigación (observación en el tiempo, identificación y clasificación, búsqueda de patrones, creación de modelos, investigación a través de búsqueda de información, experimentos con control de variables...).',
        },
        {
          cycle: 'TERCER',
          code: 'A1.1',
          description:
            'Fases de la investigación científica (observación, formulación de preguntas y predicciones, planificación y realización de experimentos, recogida y análisis de información y datos, comunicación de resultados...).',
        },
        {
          cycle: 'PRIMER',
          code: 'A1.2',
          description:
            'Instrumentos y dispositivos apropiados para realizar observaciones y mediciones de acuerdo a las necesidades de las diferentes investigaciones.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A1.2',
          description:
            'Instrumentos y dispositivos apropiados para realizar observaciones y mediciones precisas de acuerdo a las necesidades de la investigación.',
        },
        {
          cycle: 'TERCER',
          code: 'A1.2',
          description:
            'Instrumentos y dispositivos apropiados para realizar observaciones y mediciones precisas de acuerdo con las necesidades de la investigación.',
        },
        {
          cycle: 'PRIMER',
          code: 'A1.3',
          description: 'Vocabulario científico básico relacionado con las diferentes investigaciones.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A1.3',
          description: 'Vocabulario científico básico relacionado con las diferentes investigaciones.',
        },
        {
          cycle: 'TERCER',
          code: 'A1.3',
          description: 'Vocabulario científico básico relacionado con las diferentes investigaciones.',
        },
        {
          cycle: 'PRIMER',
          code: 'A1.4',
          description: 'La curiosidad y la iniciativa en la realización de las diferentes investigaciones.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A1.4',
          description:
            'La importancia de la curiosidad, la iniciativa y la constancia en la realización de las diferentes investigaciones.',
        },
        {
          cycle: 'TERCER',
          code: 'A1.4',
          description:
            'La importancia de la curiosidad, la iniciativa, la constancia y el sentido de la responsabilidad en la realización de las diferentes investigaciones.',
        },
        {
          cycle: 'PRIMER',
          code: 'A1.5',
          description: 'Las profesiones relacionadas con la ciencia y la tecnología desde una perspectiva de género.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A1.5',
          description:
            'Avances en el pasado relacionados con la ciencia y la tecnología que han contribuido a transformar nuestra sociedad mostrando modelos que incorporen una perspectiva de género.',
        },
        {
          cycle: 'TERCER',
          code: 'A1.5',
          description:
            'La ciencia, la tecnología y la ingeniería como actividades humanas. Las profesiones STEM en la actualidad desde una perspectiva de género.',
        },
        {
          cycle: 'PRIMER',
          code: 'A1.6',
          description:
            'Estilos de vida sostenible e importancia del cuidado del planeta a través del conocimiento científico presente en la vida cotidiana.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A1.6',
          description:
            'La importancia del uso de la ciencia y la tecnología para ayudar a comprender las causas de las propias acciones, tomar decisiones razonadas y realizar tareas de forma más eficiente.',
        },
        {
          cycle: 'TERCER',
          code: 'A1.6',
          description:
            'La relación entre los avances en matemáticas, ciencia, ingeniería y tecnología para comprender la evolución de la sociedad en el ámbito científico-tecnológico.',
        },
        // A2. Nuestro planeta y la vida
        {
          cycle: 'PRIMER',
          code: 'A2.1',
          description:
            'Características observables y funcionamiento básico del cuerpo humano en relación al autocuidado.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.1',
          description:
            'Características del cuerpo humano y funcionamiento básico en relación a la obtención de energía, relación con el entorno y perpetuación de la especie.',
        },
        {
          cycle: 'TERCER',
          code: 'A2.1',
          description:
            'Aspectos básicos de las funciones vitales del ser humano desde una perspectiva integrada: obtención de energía, relación con el entorno y perpetuación de la especie.',
        },
        {
          cycle: 'PRIMER',
          code: 'A2.2',
          description: 'Cambios del ser humano a lo largo de la vida, del nacimiento a la muerte.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.2',
          description: 'Los principales cambios físicos, emocionales y sociales en las distintas etapas de la vida.',
        },
        {
          cycle: 'TERCER',
          code: 'A2.2',
          description:
            'Los cambios físicos, emocionales y sociales que conllevan la pubertad y la adolescencia para aceptarlos de forma positiva tanto en una misma o un mismo como en las demás personas. Educación afectivo-sexual.',
        },
        {
          cycle: 'PRIMER',
          code: 'A2.3',
          description:
            'Necesidades básicas de los seres vivos, incluido el ser humano, y la diferencia con los objetos inertes.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.3',
          description:
            'Los reinos de la naturaleza desde una perspectiva general e integrada a partir del estudio y análisis de las características de los principales ecosistemas del planeta.',
        },
        {
          cycle: 'TERCER',
          code: 'A2.3',
          description:
            'Los reinos de la naturaleza desde una perspectiva general e integrada a partir del estudio y análisis de las características de los principales ecosistemas de Navarra.',
        },
        {
          cycle: 'PRIMER',
          code: 'A2.4',
          description:
            'Las adaptaciones de los seres vivos, incluido el ser humano, a su hábitat, concebido como el lugar en el que cubren sus necesidades.',
        },
        {
          cycle: 'PRIMER',
          code: 'A2.5',
          description:
            'Clasificación e identificación de los seres vivos, incluido el ser humano, de acuerdo con sus características observables.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.5',
          description:
            'Características propias de los animales que permiten su clasificación y diferenciación en subgrupos relacionados con su capacidad adaptativa al medio: obtención de energía, relación con el entorno y perpetuación de la especie.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.6',
          description:
            'Características propias de las plantas que permiten su clasificación en relación con su capacidad adaptativa al medio: obtención de energía, relación con el entorno y perpetuación de la especie.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.7',
          description:
            'Los ecosistemas como lugar donde intervienen factores bióticos y abióticos, manteniéndose en equilibrio entre los diferentes elementos y recursos. Importancia de la biodiversidad.',
        },
        {
          cycle: 'TERCER',
          code: 'A2.7',
          description:
            'La explotación de los recursos naturales y su repercusión, desde una perspectiva de desarrollo sostenible y de ciudadanía global.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.8',
          description: 'Las funciones y servicios de los ecosistemas.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.9',
          description: 'Clasificación elemental de las rocas.',
        },
        {
          cycle: 'TERCER',
          code: 'A2.9',
          description:
            'Clasificación básica de rocas y minerales. Usos y explotación sostenible de los recursos geológicos.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.10',
          description: 'Las formas de relieve más relevantes.',
        },
        {
          cycle: 'TERCER',
          code: 'A2.10',
          description: 'Procesos geológicos básicos de formación y modelado del relieve.',
        },
        {
          cycle: 'PRIMER',
          code: 'A2.11',
          description:
            'El agua como elemento indispensable para la vida. Estados del agua en la naturaleza. Usos cotidianos y responsables del agua. El agua en la localidad.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.11',
          description:
            'El ciclo del agua. Los recursos hídricos y su uso en Navarra. Aguas superficiales y aguas subterráneas. Los principales ríos de Navarra.',
        },
        {
          cycle: 'TERCER',
          code: 'A2.11',
          description:
            'La hidrosfera. Aguas continentales y marinas. Los mares y principales ríos de España. Los océanos.',
        },
        {
          cycle: 'PRIMER',
          code: 'A2.12',
          description:
            'Las relaciones entre los seres humanos, los animales y las plantas. Cuidado y respeto a los seres vivos y al entorno en el que viven, evitando la degradación del suelo, el aire o el agua.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.12',
          description:
            'Relación del ser humano con los ecosistemas para cubrir las necesidades de la sociedad. Ejemplos de buenos y malos usos de los recursos naturales de nuestro planeta y sus consecuencias.',
        },
        {
          cycle: 'PRIMER',
          code: 'A2.13',
          description:
            'Hábitos saludables relacionados con el bienestar físico del ser humano: higiene, alimentación variada, equilibrada y sostenible, ejercicio físico, contacto con la naturaleza, descanso y cuidado del cuerpo como medio para prevenir posibles enfermedades.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.13',
          description: 'Conocer los hábitos saludables o nocivos y la salud.',
        },
        {
          cycle: 'TERCER',
          code: 'A2.13',
          description:
            'Pautas para una alimentación saludable y sostenible: menús saludables y equilibrados. La importancia de la cesta de la compra y del etiquetado de los productos alimenticios para conocer sus nutrientes y su aporte energético.',
        },
        {
          cycle: 'PRIMER',
          code: 'A2.14',
          description:
            'Hábitos saludables relacionados con el bienestar emocional y social: estrategias de identificación de las propias emociones y respeto a las de las demás personas. Sensibilidad y aceptación de la diversidad presente en el aula y en la sociedad. Educación afectivo-sexual.',
        },
        {
          cycle: 'TERCER',
          code: 'A2.14',
          description:
            'Pautas que fomenten una salud emocional y social adecuadas: higiene del sueño, prevención y consecuencias del consumo de drogas (legales e ilegales), gestión saludable del ocio y del tiempo libre, contacto con la naturaleza, uso adecuado de dispositivos digitales, estrategias para el fomento de relaciones sociales saludables y fomento de los cuidados de las personas.',
        },
        {
          cycle: 'PRIMER',
          code: 'A2.15',
          description: 'Pautas para la prevención de riesgos y accidentes en situaciones de la vida cotidiana.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A2.15',
          description:
            'Prevención de accidentes y elementos de seguridad pasiva para reducir daños como casco, cinturón de seguridad, etc. Pautas para solicitar ayuda en caso de accidente o emergencia.',
        },
        {
          cycle: 'TERCER',
          code: 'A2.15',
          description:
            'Pautas para la prevención de riesgos y accidentes. Conocimiento de actuaciones básicas de primeros auxilios.',
        },
        // A3. Materia, fuerzas y energía
        {
          cycle: 'PRIMER',
          code: 'A3.1',
          description: 'La luz y el sonido como formas de energía. Fuentes y uso en la vida cotidiana.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A3.1',
          description:
            'El calor. Cambios de estado. Materiales conductores y aislantes, instrumentos de medición y aplicaciones en la vida cotidiana.',
        },
        {
          cycle: 'TERCER',
          code: 'A3.1',
          description:
            'La energía eléctrica: Fuentes, transformaciones, transferencia y uso en la vida cotidiana. Los circuitos eléctricos y las estructuras robotizadas.',
        },
        {
          cycle: 'TERCER',
          code: 'A3.2',
          description:
            'Las formas de energía, las fuentes y las transformaciones. Las fuentes de energías renovables y no renovables y su influencia en la contribución al desarrollo sostenible de la sociedad.',
        },
        {
          cycle: 'PRIMER',
          code: 'A3.3',
          description:
            'Propiedades observables de los materiales, su procedencia y su uso en objetos de la vida cotidiana de acuerdo a las necesidades de diseño para los que fueron fabricados.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A3.3',
          description:
            'Los cambios reversibles e irreversibles que experimenta la materia desde un estado inicial a uno final identificando los procesos y transformaciones que experimenta en situaciones de la vida cotidiana.',
        },
        {
          cycle: 'TERCER',
          code: 'A3.3',
          description:
            'Masa y volumen. Instrumentos para calcular la masa y la capacidad de un objeto. Concepto de densidad y su relación con la flotabilidad de un objeto en un líquido.',
        },
        {
          cycle: 'PRIMER',
          code: 'A3.4',
          description:
            'Las sustancias puras y las mezclas. Identificación de mezclas homogéneas y heterogéneas. Separación de mezclas heterogéneas mediante distintos métodos.',
        },
        {
          cycle: 'TERCER',
          code: 'A3.4',
          description:
            'Las sustancias puras y las mezclas. Separación de mezclas homogéneas mediante distintos métodos.',
        },
        {
          cycle: 'PRIMER',
          code: 'A3.5',
          description: 'Estructuras resistentes, estables y útiles.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A3.6',
          description: 'Fuerzas de contacto y a distancia. Las fuerzas y sus efectos.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'A3.7',
          description:
            'Propiedades de las máquinas simples y su efecto sobre las fuerzas. Aplicaciones y usos en la vida cotidiana.',
        },
        {
          cycle: 'TERCER',
          code: 'A3.8',
          description: 'Artefactos voladores. Principios básicos del vuelo.',
        },
      ],
    },
    {
      letter: 'B',
      title: 'Tecnología y digitalización',
      items: [
        // B1. Digitalización del entorno personal de aprendizaje
        {
          cycle: 'PRIMER',
          code: 'B1.1',
          description:
            'Dispositivos y recursos digitales de acuerdo a las necesidades del contexto educativo.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'B1.1',
          description:
            'Dispositivos y recursos digitales de acuerdo con las necesidades del contexto educativo.',
        },
        {
          cycle: 'TERCER',
          code: 'B1.1',
          description:
            'Dispositivos y recursos digitales de acuerdo a las necesidades del contexto educativo.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'B1.2',
          description:
            'Estrategias de búsquedas guiadas de información seguras y eficientes en internet (valoración, discriminación, selección y organización).',
        },
        {
          cycle: 'TERCER',
          code: 'B1.2',
          description:
            'Estrategias de búsquedas de información seguras y eficientes en Internet (valoración, discriminación, selección, organización y propiedad intelectual). Criterios de fiabilidad de fuentes (autoría, objetividad, referencias...).',
        },
        {
          cycle: 'TERCER',
          code: 'B1.3',
          description:
            'Estrategias de recogida, almacenamiento y representación de datos para facilitar su comprensión y análisis.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'B1.4',
          description:
            'Reglas básicas de seguridad y privacidad para navegar por internet y para proteger el entorno digital personal de aprendizaje.',
        },
        {
          cycle: 'TERCER',
          code: 'B1.4',
          description:
            'Reglas básicas de seguridad y privacidad para navegar por Internet y para proteger el entorno digital personal de aprendizaje.',
        },
        {
          cycle: 'PRIMER',
          code: 'B1.5',
          description:
            'Recursos digitales para comunicarse con personas conocidas en entornos conocidos y seguros.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'B1.5',
          description:
            'Recursos y plataformas digitales restringidas y seguras para comunicarse con otras personas. Etiqueta digital, reglas básicas de cortesía y respeto y estrategias para resolver problemas en la comunicación digital.',
        },
        {
          cycle: 'TERCER',
          code: 'B1.5',
          description:
            'Recursos y plataformas digitales restringidas y seguras para comunicarse con otras personas. Etiqueta digital, reglas básicas de cortesía y respeto y estrategias para resolver problemas en la comunicación digital.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'B1.6',
          description:
            'Estrategias para fomentar el bienestar digital físico y mental. Reconocimiento de los riesgos asociados a un uso inadecuado y poco seguro de las tecnologías digitales (tiempo excesivo de uso, ciberacoso, acceso a contenidos inadecuados, publicidad y correos no deseados, etc.), y estrategias de actuación.',
        },
        {
          cycle: 'TERCER',
          code: 'B1.6',
          description:
            'Estrategias para fomentar el bienestar digital físico y mental. Reconocimiento de los riesgos asociados a un uso inadecuado y poco seguro de las tecnologías digitales (tiempo excesivo de uso, ciberacoso, dependencia tecnológica, acceso a contenidos inadecuados, etc.), y estrategias de actuación.',
        },
        // B2. Proyectos de diseño y pensamiento computacional
        {
          cycle: 'PRIMER',
          code: 'B2.1',
          description: 'Fases de los proyectos de diseño: prototipado, prueba y comunicación.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'B2.1',
          description: 'Fases de los proyectos de diseño: prototipado, prueba y comunicación.',
        },
        {
          cycle: 'TERCER',
          code: 'B2.1',
          description:
            'Fases de los proyectos de diseño: identificación de necesidades, diseño, prototipado, prueba, evaluación y comunicación.',
        },
        {
          cycle: 'PRIMER',
          code: 'B2.2',
          description: 'Materiales adecuados a la consecución de un proyecto de diseño.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'B2.2',
          description: 'Materiales, herramientas y objetos adecuados a la consecución del proyecto de diseño.',
        },
        {
          cycle: 'TERCER',
          code: 'B2.2',
          description:
            'Materiales, herramientas, objetos, dispositivos y recursos digitales (programación por bloques, sensores, motores, simuladores, impresoras 3D...) seguros y adecuados a la consecución del proyecto.',
        },
        {
          cycle: 'PRIMER',
          code: 'B2.3',
          description:
            'Iniciación en la programación a través de recursos analógicos o digitales adaptados al nivel lector del alumnado (actividades desenchufadas, plataformas digitales de iniciación a la programación, robótica educativa...).',
        },
        {
          cycle: 'SEGUNDO',
          code: 'B2.3',
          description:
            'Iniciación en la programación a través de recursos analógicos (actividades desenchufadas) o digitales (plataformas digitales de iniciación a la programación, aplicaciones de programación por bloques, robótica educativa...).',
        },
        {
          cycle: 'TERCER',
          code: 'B2.3',
          description:
            'Fases del pensamiento computacional (descomposición de una tarea en partes más sencillas, reconocimiento de patrones y creación de algoritmos sencillos para la resolución del problema...).',
        },
        {
          cycle: 'PRIMER',
          code: 'B2.4',
          description: 'Estrategias básicas de trabajo en equipo, partiendo del trabajo en pareja.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'B2.4',
          description:
            'Técnicas cooperativas sencillas para el trabajo en equipo y estrategias para la gestión de conflictos y promoción de conductas empáticas e inclusivas.',
        },
        {
          cycle: 'TERCER',
          code: 'B2.4',
          description:
            'Estrategias en situaciones de incertidumbre: adaptación y cambio de estrategia cuando sea necesario, valoración del error propio y el de las demás personas como oportunidad de aprendizaje.',
        },
      ],
    },
    {
      letter: 'C',
      title: 'Sociedades y territorios',
      items: [
        // C1. Retos del mundo actual
        {
          cycle: 'PRIMER',
          code: 'C1.1',
          description:
            'La Tierra en el universo. Elementos, movimientos y dinámicas relacionados con la Tierra y el universo y sus consecuencias en la vida diaria y en el entorno. Secuencias temporales y cambios estacionales.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C1.1',
          description:
            'La Tierra y las catástrofes naturales. Elementos, movimientos, dinámicas que ocurren en el universo y su relación con fenómenos físicos que afectan a la Tierra y repercuten en la vida diaria y en el entorno.',
        },
        {
          cycle: 'TERCER',
          code: 'C1.1',
          description:
            'El futuro de la Tierra y del universo. Los fenómenos físicos relacionados con la Tierra y el universo y su repercusión en la vida diaria y en el entorno. La exploración espacial y la observación del cielo; la contaminación lumínica.',
        },
        {
          cycle: 'PRIMER',
          code: 'C1.2',
          description:
            'La vida en la Tierra. Fenómenos atmosféricos y su repercusión en los ciclos biológicos y en la vida diaria. Observación y registro de datos atmosféricos.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C1.2',
          description:
            'Conocimiento del espacio. Representación del espacio. Representación de la Tierra a través del globo terráqueo, los mapas y otros recursos digitales. Mapas y planos en distintas escalas. Técnicas de orientación mediante la observación de los elementos del medio físico y otros medios de localización espacial.',
        },
        {
          cycle: 'TERCER',
          code: 'C1.2',
          description:
            'El entorno natural. La diversidad geográfica de España y de Europa. Representación gráfica, visual y cartográfica a través de medios y recursos analógicos y digitales usando las Tecnologías de la Información Geográfica (TIG).',
        },
        {
          cycle: 'PRIMER',
          code: 'C1.3',
          description:
            'Retos sobre situaciones cotidianas. Funciones básicas del pensamiento espacial y temporal para la interacción con el medio y la resolución de situaciones de la vida cotidiana. Itinerarios y trayectos, desplazamientos y viajes.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C1.3',
          description:
            'El clima y el paisaje. Los fenómenos atmosféricos. Toma y registro de datos meteorológicos y su representación gráfica y visual. Las Tecnologías de la Información Geográfica (TIG). Relación entre las zonas climáticas y la diversidad de paisajes.',
        },
        {
          cycle: 'TERCER',
          code: 'C1.3',
          description:
            'El clima y el planeta. Introducción a la dinámica atmosférica y a las grandes áreas climáticas del mundo. Los principales ecosistemas y sus paisajes.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C1.4',
          description:
            'Ocupación y distribución de la población en el espacio y análisis de los principales problemas y retos demográficos. Representación gráfica y cartográfica de la población. La organización del territorio en España y en Europa.',
        },
        {
          cycle: 'TERCER',
          code: 'C1.4',
          description:
            'Las principales variables demográficas y su representación gráfica. Los comportamientos de la población y su evolución. Los movimientos migratorios y la apreciación de la diversidad cultural. Contraste entre zonas urbanas y despoblación rural.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C1.5',
          description:
            'Desigualdad social y acceso a los recursos. Usos del espacio por el ser humano y evolución de las actividades productivas. El valor, el control del dinero y los medios de pago. De la supervivencia a la sobreproducción.',
        },
        {
          cycle: 'TERCER',
          code: 'C1.5',
          description:
            'Ciudadanía activa. Fundamentos y principios para la organización política y gestión del territorio en España. Participación social y ciudadana.',
        },
        {
          cycle: 'PRIMER',
          code: 'C1.6',
          description:
            'Igualdad de género y conductas no sexistas. Crítica de los estereotipos y roles en los distintos ámbitos: académico, profesional, social y cultural. Acciones para la igualdad efectiva de mujeres y hombres.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C1.6',
          description:
            'Igualdad de género y conductas no sexistas. Crítica de los estereotipos y roles en los distintos ámbitos: académico, profesional, social y cultural. Acciones para la igualdad efectiva entre mujeres y hombres.',
        },
        {
          cycle: 'TERCER',
          code: 'C1.6',
          description:
            'Igualdad de género y conductas no sexistas. Crítica de los estereotipos y roles en los distintos ámbitos: académico, profesional, social y cultural. Acciones para la igualdad efectiva entre mujeres y hombres.',
        },
        // C2. Sociedades en el tiempo
        {
          cycle: 'PRIMER',
          code: 'C2.1',
          description: 'La percepción del tiempo. Medida del tiempo en la vida cotidiana. El ciclo vital y las relaciones intergeneracionales.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C2.1',
          description:
            'El tiempo histórico. Nociones temporales y cronología. Ubicación temporal de las grandes etapas históricas.',
        },
        {
          cycle: 'PRIMER',
          code: 'C2.2',
          description:
            'Uso de objetos y artefactos de la vida cotidiana como fuentes para reflexionar sobre el cambio y la continuidad, las causas y las consecuencias.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C2.2',
          description:
            'Las fuentes históricas: clasificación y utilización de las distintas fuentes (orales, escritas, patrimoniales) como vía para el análisis de los cambios y permanencias en la localidad a lo largo de la historia. Las huellas de la historia en lugares, edificios, objetos, oficios o tradiciones de la localidad.',
        },
        {
          cycle: 'TERCER',
          code: 'C2.2',
          description:
            'Las fuentes históricas: clasificación y utilización de las distintas fuentes (orales, escritas, patrimoniales). Temas de relevancia en la historia (Edad Media, Edad Moderna y Edad Contemporánea), el papel representado por los sujetos históricos (individuales y colectivos), acontecimientos y procesos.',
        },
        {
          cycle: 'PRIMER',
          code: 'C2.3',
          description:
            'Recursos y medios analógicos y digitales. Las fuentes orales y la memoria colectiva. La historia local y la biografía familiar; como sujetos de la historia.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C2.3',
          description:
            'Iniciación en la investigación y en los métodos de trabajo para la realización de proyectos, que analicen hechos, asuntos y temas de relevancia actual con perspectiva histórica, contextualizándolos en la época correspondiente (Prehistoria y Edad Antigua), como la supervivencia y la alimentación, la vivienda, los intercambios comerciales (de dónde viene el dinero, los trabajos no remunerados), la explotación de bienes comunes y recursos o los avances técnicos.',
        },
        {
          cycle: 'TERCER',
          code: 'C2.3',
          description:
            'Las fuentes históricas: clasificación y utilización de las distintas fuentes (orales, escritas, patrimoniales). Iniciación a la investigación y a los métodos de trabajo para la realización de proyectos, que analicen hechos, asuntos y temas de relevancia en la historia (Edad Media, Edad Moderna y Edad Contemporánea), el papel representado por los sujetos históricos (individuales y colectivos), acontecimientos y procesos.',
        },
        {
          cycle: 'TERCER',
          code: 'C2.4',
          description:
            'La memoria democrática. Análisis multicausal del proceso de construcción de la democracia en España. La Constitución de 1978. Fórmulas para la participación de la ciudadanía en la vida pública.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C2.5',
          description:
            'La acción de mujeres y hombres como sujetos en la historia. Interpretación del papel de las personas y de los distintos grupos sociales: relaciones, conflictos, creencias y condicionantes en cada época histórica.',
        },
        {
          cycle: 'TERCER',
          code: 'C2.5',
          description:
            'El papel de la mujer en la historia y los principales movimientos en defensa de sus derechos. Situación actual y retos de futuro en la igualdad de género.',
        },
        {
          cycle: 'PRIMER',
          code: 'C2.6',
          description:
            'Las expresiones y producciones artísticas a través del tiempo. El patrimonio material e inmaterial local.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C2.6',
          description:
            'Las expresiones artísticas y culturales prehistóricas y de la Antigüedad y su contextualización histórica desde una perspectiva de género. La función del arte y la cultura en el mundo de la Prehistoria y la Edad Antigua.',
        },
        {
          cycle: 'TERCER',
          code: 'C2.6',
          description:
            'Las expresiones artísticas y culturales medievales, modernas y contemporáneas y su contextualización histórica desde una perspectiva de género. La función del arte y la cultura en el mundo medieval, moderno y contemporáneo.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C2.7',
          description:
            'El patrimonio natural y cultural. Los espacios protegidos, culturales y naturales. Su uso, cuidado y conservación.',
        },
        {
          cycle: 'TERCER',
          code: 'C2.7',
          description: 'El patrimonio natural y cultural como bien y recurso: su uso, cuidado y conservación.',
        },
        // C3. Alfabetización cívica
        {
          cycle: 'PRIMER',
          code: 'C3.1',
          description:
            'La vida en colectividad. La familia. Diversidad familiar. Compromisos, corresponsabilidad, participación y normas en el entorno familiar, vecinal y escolar. Los derechos de la infancia.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C3.1',
          description: 'Diversidad familiar. Compromisos, contribución y normas para la vida en sociedad.',
        },
        {
          cycle: 'TERCER',
          code: 'C3.1',
          description:
            'Los principios y valores de los derechos humanos y de la infancia y la Constitución española, derechos y deberes de la ciudadanía. La contribución del Estado y sus instituciones a la paz, la seguridad integral y la cooperación internacional para el desarrollo.',
        },
        {
          cycle: 'PRIMER',
          code: 'C3.2',
          description:
            'Identidad y diversidad cultural: existencia de realidades diferentes y aproximación a las distintas etnocultures presentes en el entorno. La convivencia con las demás personas y el rechazo a las actitudes discriminatorias.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C3.2',
          description:
            'Las costumbres, tradiciones y manifestaciones etnoculturales del entorno. Respeto por la diversidad cultural que convive en el entorno. La cohesión social.',
        },
        {
          cycle: 'TERCER',
          code: 'C3.2',
          description:
            'Historia y cultura de las minorías étnicas presentes en nuestro país, particularmente del pueblo gitano. Reconocimiento de la diversidad cultural y lingüística de España. Valoración del castellano y el euskera como lenguas propias de Navarra.',
        },
        {
          cycle: 'PRIMER',
          code: 'C3.3',
          description: 'La cultura de paz y no violencia. Prevención, gestión y resolución dialogada de conflictos.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C3.3',
          description: 'La cultura de paz y no violencia. Prevención, gestión y resolución dialogada de conflictos.',
        },
        {
          cycle: 'TERCER',
          code: 'C3.3',
          description:
            'La cultura de paz y no violencia. El pensamiento crítico como herramienta para el análisis de los conflictos de intereses. El reconocimiento de las víctimas de la violencia.',
        },
        {
          cycle: 'PRIMER',
          code: 'C3.4',
          description:
            'La vida en sociedad. Espacios, recursos y servicios del entorno. Formas y modos de interacción social en espacios públicos desde una perspectiva de género.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C3.4',
          description:
            'Organización y funcionamiento de la sociedad. Las principales instituciones y entidades del entorno local, regional y nacional y los servicios públicos que prestan. Estructura administrativa de España.',
        },
        {
          cycle: 'TERCER',
          code: 'C3.4',
          description:
            'España y Europa. Las principales instituciones de España y de la Unión Europea, de sus valores y de sus funciones. Los ámbitos de acción de las instituciones europeas y su repercusión en el entorno.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C3.5',
          description: 'La organización política y territorial de España.',
        },
        {
          cycle: 'TERCER',
          code: 'C3.5',
          description:
            'La organización política. Principales entidades políticas y administrativas del entorno local, autonómico y nacional en España. Sistemas de representación y de participación política.',
        },
        {
          cycle: 'PRIMER',
          code: 'C3.6',
          description:
            'Ocupación y trabajo. Identificación de las principales actividades profesionales y laborales de mujeres y hombres en el entorno.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C3.6',
          description:
            'Ocupación y trabajo, con perspectiva de género. Las principales actividades profesionales y laborales de las mujeres y hombres en el entorno.',
        },
        {
          cycle: 'TERCER',
          code: 'C3.6',
          description:
            'Ocupación y trabajo. Las principales actividades profesionales y laborales de mujeres y hombres en el entorno y su análisis crítico.',
        },
        {
          cycle: 'PRIMER',
          code: 'C3.7',
          description: 'Igualdad de género y conducta no sexista.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C3.7',
          description: 'Igualdad de género y conducta no sexista.',
        },
        {
          cycle: 'TERCER',
          code: 'C3.7',
          description: 'Igualdad de género y conducta no sexista.',
        },
        {
          cycle: 'PRIMER',
          code: 'C3.8',
          description:
            'Seguridad vial. La ciudad como espacio de convivencia. Normas básicas en los desplazamientos como peatones o como usuarios de los medios de locomoción.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C3.8',
          description:
            'Seguridad vial. La ciudad como espacio de convivencia. Normas de circulación, señales y marcas viales. Movilidad segura, saludable y sostenible como peatones o como usuarios de los medios de locomoción.',
        },
        {
          cycle: 'TERCER',
          code: 'C3.8',
          description: 'Movilidad segura y sostenible.',
        },
        // C4. Conciencia ecosocial
        {
          cycle: 'PRIMER',
          code: 'C4.1',
          description:
            'Conocimiento de nuestro entorno. Paisajes naturales y paisajes humanizados, y sus elementos. La acción humana sobre el medio y sus consecuencias.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C4.1',
          description:
            'El cambio climático. Introducción a las causas y consecuencias del cambio climático, y su impacto en los paisajes de la Tierra. Medidas de mitigación y de adaptación.',
        },
        {
          cycle: 'TERCER',
          code: 'C4.1',
          description:
            'El cambio climático de lo local a lo global: causas y consecuencias. Medidas de mitigación y adaptación.',
        },
        {
          cycle: 'PRIMER',
          code: 'C4.2',
          description:
            'Responsabilidad ecosocial. Acciones para la conservación, mejora y uso sostenible de los bienes comunes. El maltrato animal y su prevención.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C4.2',
          description:
            'Responsabilidad ecosocial. Ecodependencia e interdependencia entre personas, sociedades y medio natural.',
        },
        {
          cycle: 'TERCER',
          code: 'C4.2',
          description:
            'Responsabilidad ecosocial. Ecodependencia e interdependencia entre personas, sociedades y medio natural.',
        },
        {
          cycle: 'SEGUNDO',
          code: 'C4.3',
          description:
            'La transformación y la degradación de los ecosistemas naturales por la acción humana. Conservación y protección de la naturaleza. El maltrato animal y su prevención.',
        },
        {
          cycle: 'TERCER',
          code: 'C4.3',
          description:
            'El desarrollo sostenible. La actividad humana sobre el espacio y la explotación de los recursos. La actividad económica y la distribución de la riqueza: desigualdad social y regional en el mundo y en España. Los Objetivos de Desarrollo Sostenible.',
        },
        {
          cycle: 'TERCER',
          code: 'C4.4',
          description:
            'Agenda Urbana. El desarrollo urbano sostenible. La ciudad como espacio de convivencia.',
        },
      ],
    },
  ],
};
