import { AreaData } from '../secundaria-curriculum.data';

export const AREA_FQ: AreaData = {
  subjectCode: 'FQ-1ESO',
  abbrev: 'FQ',
  areaName: 'Física y Química',
  competencies: [
    // ──────────────────────────────────────────────────────────
    // Competencia específica 1
    // ──────────────────────────────────────────────────────────
    {
      code: '1',
      name: 'Comprensión y relación de fenómenos fisicoquímicos',
      description:
        'Comprender y relacionar los motivos por los que ocurren los principales fenómenos fisicoquímicos del entorno, explicándolos en términos de las leyes y teorías científicas adecuadas, para resolver problemas con el fin de aplicarlas para mejorar la realidad cercana y la calidad de vida humana.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CPSAA'],
      criteria: [
        {
          course: '2ESO',
          code: '1.1',
          description:
            'Comprender algunos fenómenos fisicoquímicos cotidianos más relevantes, explicarlos en términos de relacionarlos con los principios, teorías y leyes científicas adecuadas y expresarlos empleando la argumentación, utilizando diversidad de soportes y medios de comunicación.',
        },
        {
          course: '3ESO',
          code: '1.1',
          description:
            'Identificar, comprender y explicar los fenómenos fisicoquímicos cotidianos más relevantes a partir de los principios, teorías y leyes científicas adecuadas, expresándolos, de manera argumentada, utilizando diversidad de soportes y medios de comunicación.',
        },
        {
          course: '4ESO',
          code: '1.1',
          description:
            'Comprender y explicar con rigor los fenómenos fisicoquímicos cotidianos a partir de los principios, teorías y leyes científicas adecuadas, expresándolos de manera argumentada, utilizando diversidad de soportes y medios de comunicación.',
        },
        {
          course: '2ESO',
          code: '1.2',
          description:
            'Resolver los problemas físico-químicos sencillos que se le plantean, utilizando las leyes y teorías científicas adecuadas, razonando los procedimientos utilizados para encontrar la(s) solución(es) y expresando adecuadamente los resultados.',
        },
        {
          course: '3ESO',
          code: '1.2',
          description:
            'Resolver los problemas fisicoquímicos planteados utilizando las leyes y teorías científicas adecuadas, razonando los procedimientos utilizados para encontrar las soluciones y expresando adecuadamente los resultados.',
        },
        {
          course: '4ESO',
          code: '1.2',
          description:
            'Resolver los problemas fisicoquímicos planteados mediante las leyes y teorías científicas adecuadas, razonando los procedimientos utilizados para encontrar las soluciones y expresando los resultados con corrección y precisión.',
        },
        {
          course: '2ESO',
          code: '1.3',
          description:
            'Reconocer y describir en el entorno inmediato situaciones problemáticas de índole científica en las que la ciencia, y en particular la física y la química, pueden contribuir a su solución, analizando su impacto en la sociedad.',
        },
        {
          course: '3ESO',
          code: '1.3',
          description:
            'Reconocer y describir en el entorno inmediato situaciones problemáticas reales de índole científica y emprender iniciativas en las que la ciencia, y en particular la física y la química, pueden contribuir a su solución, analizando críticamente su impacto en la sociedad.',
        },
        {
          course: '4ESO',
          code: '1.3',
          description:
            'Reconocer y describir situaciones problemáticas reales de índole científica y emprender iniciativas colaborativas en las que la ciencia, y en particular la física y la química, pueden contribuir a su solución, analizando críticamente su impacto en la sociedad y en el medio ambiente.',
        },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // Competencia específica 2
    // ──────────────────────────────────────────────────────────
    {
      code: '2',
      name: 'Experimentación y metodologías científicas',
      description:
        'Expresar las observaciones realizadas por el alumnado en forma de preguntas, formulando hipótesis para explicarlas y demostrando dichas hipótesis a través de la experimentación científica, la indagación y la búsqueda de evidencias, para desarrollar los razonamientos propios del pensamiento científico y mejorar las destrezas en el uso de las metodologías científicas.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CPSAA', 'CE', 'CCEC'],
      criteria: [
        {
          course: '2ESO',
          code: '2.1',
          description:
            'Emplear las metodologías propias de la ciencia en la identificación y descripción de fenómenos a partir de cuestiones a las que se pueda dar respuesta a través de la indagación, la deducción, el trabajo experimental y el razonamiento lógico-matemático, diferenciándolas de aquellas pseudocientíficas que no admiten comprobación experimental.',
        },
        {
          course: '3ESO',
          code: '2.1',
          description:
            'Emplear las metodologías propias de la ciencia en la identificación y descripción de fenómenos a partir de cuestiones a las que se pueda dar respuesta a través de la indagación, la deducción, el trabajo experimental y el razonamiento lógico-matemático, diferenciándolas de aquellas pseudocientíficas que no admiten comprobación experimental.',
        },
        {
          course: '4ESO',
          code: '2.1',
          description:
            'Emplear las metodologías propias de la ciencia en la identificación y descripción de fenómenos científicos a partir de situaciones tanto observadas en el mundo natural como planteadas a través de enunciados con información textual, gráfica o numérica.',
        },
        {
          course: '2ESO',
          code: '2.2',
          description:
            'Seleccionar, de acuerdo con la naturaleza de las cuestiones que se traten, la mejor manera de comprobar o refutar las hipótesis formuladas, para diseñar estrategias de indagación y búsqueda de evidencias que permitan obtener conclusiones y respuestas ajustadas a la naturaleza de la pregunta formulada.',
        },
        {
          course: '3ESO',
          code: '2.2',
          description:
            'Seleccionar, de acuerdo con la naturaleza de las cuestiones que se traten, la mejor manera de comprobar o refutar las hipótesis formuladas, diseñando estrategias de indagación y búsqueda de evidencias que permitan obtener conclusiones y respuestas ajustadas a la naturaleza de la pregunta formulada.',
        },
        {
          course: '4ESO',
          code: '2.2',
          description:
            'Predecir, para las cuestiones planteadas, respuestas que se puedan comprobar con las herramientas y conocimientos adquiridos, tanto de forma experimental como deductiva, aplicando el razonamiento lógico-matemático en su proceso de validación.',
        },
        {
          course: '2ESO',
          code: '2.3',
          description:
            'Aplicar las leyes y teorías científicas conocidas al formular cuestiones e hipótesis de manera informada y coherente con el conocimiento científico existente y diseñar seguir los procedimientos experimentales o deductivos necesarios para resolverlas.',
        },
        {
          course: '3ESO',
          code: '2.3',
          description:
            'Aplicar las leyes y teorías científicas conocidas al formular cuestiones e hipótesis, siendo coherente con el conocimiento científico existente y diseñando los procedimientos experimentales o deductivos necesarios para resolverlas o comprobarlas.',
        },
        {
          course: '4ESO',
          code: '2.3',
          description:
            'Aplicar las leyes y teorías científicas más importantes para validar hipótesis de manera informada y coherente con el conocimiento científico existente, diseñando los procedimientos experimentales o deductivos necesarios para resolverlas y analizando los resultados críticamente.',
        },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // Competencia específica 3
    // ──────────────────────────────────────────────────────────
    {
      code: '3',
      name: 'Lenguaje científico y comunicación',
      description:
        'Manejar con soltura las reglas y normas básicas de la física y la química en lo referente al lenguaje de la IUPAC, al lenguaje matemático, al empleo de unidades de medida correctas, al uso seguro del laboratorio y a la interpretación y producción de datos e información en diferentes formatos y fuentes, para reconocer el carácter universal y transversal del lenguaje científico y la necesidad de una comunicación fiable en investigación y ciencia entre diferentes países y culturas.',
      keyCompetencyCodes: ['STEM', 'CD', 'CPSAA', 'CC', 'CCEC'],
      criteria: [
        {
          course: '2ESO',
          code: '3.1',
          description:
            'Emplear datos en diferentes formatos para interpretar y comunicar información relativa a un proceso fisicoquímico concreto, extrayendo en cada caso lo más relevante para la resolución de un problema.',
        },
        {
          course: '3ESO',
          code: '3.1',
          description:
            'Emplear datos en diferentes formatos para interpretar y comunicar información relativa a un proceso fisicoquímico concreto, relacionando entre sí lo que cada uno de ellos contiene, y extrayendo en cada caso lo más relevante para la resolución de un problema.',
        },
        {
          course: '4ESO',
          code: '3.1',
          description:
            'Emplear fuentes variadas fiables y seguras para seleccionar, interpretar, organizar y comunicar información relativa a un proceso fisicoquímico concreto, relacionando entre sí lo que cada una de ellas contiene, extrayendo en cada caso lo más relevante para la resolución de un problema y desechando todo lo que sea irrelevante.',
        },
        {
          course: '2ESO',
          code: '3.2',
          description:
            'Utilizar adecuadamente las reglas básicas de la física y la química, incluyendo el uso de unidades de medida y las herramientas matemáticas, para facilitar una comunicación efectiva con toda la comunidad científica.',
        },
        {
          course: '3ESO',
          code: '3.2',
          description:
            'Utilizar adecuadamente las reglas básicas de la física y la química, incluyendo el uso de unidades de medida, las herramientas matemáticas y las reglas de nomenclatura, consiguiendo una comunicación efectiva con toda la comunidad científica.',
        },
        {
          course: '4ESO',
          code: '3.2',
          description:
            'Utilizar adecuadamente las reglas básicas de la física y la química, incluyendo el uso correcto de varios sistemas de unidades, las herramientas matemáticas necesarias y las reglas de nomenclatura avanzadas, consiguiendo una comunicación efectiva con toda la comunidad científica.',
        },
        {
          course: '2ESO',
          code: '3.3',
          description:
            'Conocer las normas de uso de los espacios específicos de la ciencia, como el laboratorio de física y química, como medio de asegurar la salud propia y colectiva, la conservación sostenible del medio ambiente y el respeto por las instalaciones.',
        },
        {
          course: '3ESO',
          code: '3.3',
          description:
            'Poner en práctica las normas de uso de los espacios específicos de la ciencia, como el laboratorio de física y química, asegurando la salud propia y colectiva, la conservación sostenible del medio ambiente y el cuidado de las instalaciones.',
        },
        {
          course: '4ESO',
          code: '3.3',
          description:
            'Aplicar con rigor las normas de uso de los espacios específicos de la ciencia, como el laboratorio de física y química, asegurando la salud propia y colectiva, la conservación sostenible del medio ambiente y el cuidado por las instalaciones',
        },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // Competencia específica 4
    // ──────────────────────────────────────────────────────────
    {
      code: '4',
      name: 'Uso crítico de recursos digitales y variados',
      description:
        'Utilizar de forma crítica, eficiente y segura plataformas digitales y recursos variados, tanto para el trabajo individual como en equipo, para fomentar la creatividad, el desarrollo personal y el aprendizaje individual y social, mediante la consulta de información, la creación de materiales y la comunicación efectiva en los diferentes entornos de aprendizaje.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CPSAA', 'CE', 'CCEC'],
      criteria: [
        {
          course: '2ESO',
          code: '4.1',
          description:
            'Utilizar recursos variados, tradicionales y digitales, para el aprendizaje autónomo y para mejorar la interacción con otros miembros de la comunidad educativa, con respeto hacia las personas docentes y estudiantes.',
        },
        {
          course: '3ESO',
          code: '4.1',
          description:
            'Utilizar recursos variados, tradicionales y digitales, mejorando el aprendizaje autónomo y la interacción con otros miembros de la comunidad educativa, con respeto hacia las personas docentes y estudiantes y analizando críticamente las aportaciones de cada participante.',
        },
        {
          course: '4ESO',
          code: '4.1',
          description:
            'Utilizar de forma eficiente recursos variados, tradicionales y digitales, mejorando el aprendizaje autónomo y la interacción con otros miembros de la comunidad educativa, de forma rigurosa y respetuosa y analizando críticamente las aportaciones de cada participante.',
        },
        {
          course: '2ESO',
          code: '4.2',
          description:
            'Trabajar con medios variados, tradicionales y digitales, en la consulta de información seleccionando con ayuda las fuentes más fiables y desechando las menos adecuadas para la mejora del aprendizaje propio y colectivo.',
        },
        {
          course: '3ESO',
          code: '4.2',
          description:
            'Trabajar de forma adecuada con medios variados, tradicionales y digitales, en la consulta de información y la creación de contenidos, seleccionando con criterio las fuentes más fiables y desechando las menos adecuadas y mejorando el aprendizaje propio y colectivo.',
        },
        {
          course: '4ESO',
          code: '4.2',
          description:
            'Trabajar de forma versátil con medios variados, tradicionales y digitales, en la consulta de información y la creación de contenidos, seleccionando y empleando con criterio las fuentes y herramientas más fiables, desechando las menos adecuadas y mejorando el aprendizaje propio y colectivo.',
        },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // Competencia específica 5
    // ──────────────────────────────────────────────────────────
    {
      code: '5',
      name: 'Trabajo colaborativo y emprendimiento científico',
      description:
        'Utilizar las estrategias propias del trabajo colaborativo, potenciando el crecimiento entre iguales como base emprendedora de una comunidad científica crítica, ética y eficiente, para comprender la importancia de la ciencia en la mejora de la sociedad, las aplicaciones y repercusiones de los avances científicos, la preservación de la salud y la conservación sostenible del medio ambiente.',
      keyCompetencyCodes: ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE'],
      criteria: [
        {
          course: '2ESO',
          code: '5.1',
          description:
            'Establecer interacciones constructivas y coeducativas a través de actividades guiadas de cooperación y del uso de las estrategias propias del trabajo colaborativo, como forma de construir un medio de trabajo eficiente en la ciencia.',
        },
        {
          course: '3ESO',
          code: '5.1',
          description:
            'Establecer interacciones constructivas y coeducativas, emprendiendo actividades de cooperación como forma de construir un medio de trabajo eficiente en la ciencia.',
        },
        {
          course: '4ESO',
          code: '5.1',
          description:
            'Establecer interacciones constructivas y coeducativas, emprendiendo actividades de cooperación e iniciando el uso de las estrategias propias del trabajo colaborativo, como forma de construir un medio de trabajo eficiente en la ciencia.',
        },
        {
          course: '2ESO',
          code: '5.2',
          description:
            'Emprender, de forma guiada y de acuerdo a la metodología adecuada, proyectos científicos sencillos.',
        },
        {
          course: '3ESO',
          code: '5.2',
          description:
            'Emprender, de forma guiada y de acuerdo a la metodología adecuada, proyectos científicos que involucren al alumnado en la mejora de la sociedad y que creen valor para el individuo y para la comunidad.',
        },
        {
          course: '4ESO',
          code: '5.2',
          description:
            'Emprender, de forma autónoma y de acuerdo a la metodología adecuada, proyectos científicos que involucren al alumnado en la mejora de la sociedad y que creen valor para la persona y para la comunidad.',
        },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // Competencia específica 6
    // ──────────────────────────────────────────────────────────
    {
      code: '6',
      name: 'Ciencia como construcción colectiva',
      description:
        'Comprender y valorar la ciencia como una construcción colectiva en continuo cambio y evolución, en la que no solo participan las personas dedicadas a ella, sino que también requiere de una interacción con el resto de la sociedad, para obtener resultados que repercutan en el avance tecnológico, económico, ambiental y social.',
      keyCompetencyCodes: ['STEM', 'CD', 'CPSAA', 'CC', 'CCEC'],
      criteria: [
        {
          course: '2ESO',
          code: '6.1',
          description:
            'Ver a través del papel histórico de las mujeres y hombres de ciencia y los avances científicos, que la ciencia es un proceso en permanente construcción y que las repercusiones mutuas de la ciencia actual con la tecnología, la sociedad y el medio ambiente.',
        },
        {
          course: '3ESO',
          code: '6.1',
          description:
            'Reconocer y valorar, a través del análisis histórico de los avances científicos logrados por mujeres y hombres de ciencia, que la ciencia es un proceso en permanente construcción y que existen repercusiones mutuas de la ciencia actual con la tecnología, la sociedad y el medio ambiente.',
        },
        {
          course: '4ESO',
          code: '6.1',
          description:
            'Reconocer y valorar, a través del análisis histórico de los avances científicos logrados por mujeres y hombres de ciencia, así como de situaciones y contextos actuales (líneas de investigación, instituciones científicas, etc.), que la ciencia es un proceso en permanente construcción y que esta tiene repercusiones e implicaciones importantes sobre la sociedad actual.',
        },
        {
          course: '2ESO',
          code: '6.2',
          description:
            'Reconocer de manera guiada las necesidades tecnológicas, ambientales, económicas y sociales más importantes, para entender la capacidad de la ciencia para darles solución sostenible a través de la implicación de todas las ciudadanas y ciudadanos.',
        },
        {
          course: '3ESO',
          code: '6.2',
          description:
            'Detectar en el entorno las necesidades tecnológicas, ambientales, económicas y sociales más importantes que demanda la sociedad, entendiendo la capacidad de la ciencia para darles solución sostenible a través de la implicación de la ciudadanía.',
        },
        {
          course: '4ESO',
          code: '6.2',
          description:
            'Detectar las necesidades tecnológicas, ambientales, económicas y sociales más importantes que demanda la sociedad, entendiendo la capacidad de la ciencia para darles solución sostenible a través de la implicación de la ciudadanía.',
        },
      ],
    },
  ],
  knowledgeBlocks: [
    // ──────────────────────────────────────────────────────────
    // A. Las destrezas científicas básicas
    // ──────────────────────────────────────────────────────────
    {
      letter: 'A',
      title: 'Las destrezas científicas básicas',
      items: [
        { course: '2ESO', code: 'A.1', description: 'Metodologías de la investigación científica: identificación y formulación de cuestiones, elaboración de hipótesis y comprobación experimental de las mismas.' },
        { course: '3ESO', code: 'A.1', description: 'Metodologías de la investigación científica: identificación y formulación de cuestiones, elaboración de hipótesis y comprobación experimental de las mismas.' },
        { course: '4ESO', code: 'A.1', description: 'Trabajo experimental y proyectos de investigación: estrategias en la resolución de problemas y el tratamiento del error mediante la indagación, la deducción, la búsqueda de evidencias y el razonamiento lógico-matemático, haciendo inferencias válidas de las observaciones y obteniendo conclusiones que vayan más allá de las condiciones experimentales para aplicarlas a nuevos escenarios.' },
        { course: '2ESO', code: 'A.2', description: 'Trabajo experimental y proyectos de investigación: estrategias en la resolución de problemas y en el desarrollo de investigaciones mediante la indagación, la deducción, la búsqueda de evidencias y el razonamiento lógico-matemático, haciendo inferencias válidas de las observaciones y obteniendo conclusiones.' },
        { course: '3ESO', code: 'A.2', description: 'Trabajo experimental y proyectos de investigación: estrategias en la resolución de problemas y en el desarrollo de investigaciones mediante la indagación, la deducción, la búsqueda de evidencias y el razonamiento lógico-matemático, haciendo inferencias válidas de las observaciones y obteniendo conclusiones.' },
        { course: '4ESO', code: 'A.2', description: 'Diversos entornos y recursos de aprendizaje científico como el laboratorio o los entornos virtuales: materiales, sustancias y herramientas tecnológicas.' },
        { course: '2ESO', code: 'A.3', description: 'Diversos entornos y recursos de aprendizaje científico como el laboratorio o los entornos virtuales: materiales, sustancias y herramientas tecnológicas.' },
        { course: '3ESO', code: 'A.3', description: 'Diversos entornos y recursos de aprendizaje científico como el laboratorio o los entornos virtuales: materiales, sustancias y herramientas tecnológicas.' },
        { course: '4ESO', code: 'A.3', description: 'Normas de uso de cada espacio, asegurando y protegiendo así la salud propia y comunitaria, la seguridad en las redes y el respeto hacia el medio ambiente.' },
        { course: '2ESO', code: 'A.4', description: 'Normas de uso de cada espacio, asegurando y protegiendo así la salud propia y comunitaria, la seguridad en las redes y el respeto hacia el medio ambiente.' },
        { course: '3ESO', code: 'A.4', description: 'Normas de uso de cada espacio, asegurando y protegiendo así la salud propia y comunitaria, la seguridad en las redes y el respeto hacia el medio ambiente.' },
        { course: '4ESO', code: 'A.4', description: 'El lenguaje científico: manejo adecuado de distintos sistemas de unidades y sus símbolos. Herramientas matemáticas adecuadas en diferentes escenarios científicos y de aprendizaje.' },
        { course: '2ESO', code: 'A.5', description: 'El lenguaje científico: unidades del Sistema Internacional y sus símbolos. Herramientas matemáticas básicas en diferentes escenarios científicos y de aprendizaje.' },
        { course: '3ESO', code: 'A.5', description: 'El lenguaje científico: unidades del Sistema Internacional y sus símbolos. Herramientas matemáticas básicas en diferentes escenarios científicos y de aprendizaje.' },
        { course: '4ESO', code: 'A.5', description: 'Estrategias de interpretación y producción de información científica en diferentes formatos y a partir de diferentes medios: desarrollo del criterio propio basado en lo que el pensamiento científico aporta a la mejora de la sociedad para hacerla más justa, equitativa e igualitaria.' },
        { course: '2ESO', code: 'A.6', description: 'Estrategias de interpretación y producción de información científica utilizando diferentes formatos y diferentes medios: desarrollo del criterio propio basado en lo que el pensamiento científico aporta a la mejora de la sociedad para hacerla más justa, equitativa e igualitaria.' },
        { course: '3ESO', code: 'A.6', description: 'Estrategias de interpretación y producción de información científica utilizando diferentes formatos y diferentes medios: desarrollo del criterio propio basado en lo que el pensamiento científico aporta a la mejora de la sociedad para hacerla más justa, equitativa e igualitaria.' },
        { course: '4ESO', code: 'A.6', description: 'Valoración de la cultura científica y del papel de científicos y científicas en los principales hitos históricos y actuales de la física y la química para el avance y la mejora de la sociedad.' },
        { course: '2ESO', code: 'A.7', description: 'Valoración de la cultura científica y del papel de científicos y científicas en los principales hitos históricos y actuales de la física y la química en el avance y la mejora de la sociedad.' },
        { course: '3ESO', code: 'A.7', description: 'Valoración de la cultura científica y del papel de científicos y científicas en los principales hitos históricos y actuales de la física y la química en el avance y la mejora de la sociedad.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // B. La materia
    // ──────────────────────────────────────────────────────────
    {
      letter: 'B',
      title: 'La materia',
      items: [
        { course: '2ESO', code: 'B.1', description: 'Teoría cinético-molecular: aplicación a observaciones sobre la materia explicando sus propiedades, los estados de agregación, los cambios de estado y la formación de mezclas y disoluciones.' },
        { course: '2ESO', code: 'B.2', description: 'Experimentos relacionados con los sistemas materiales: conocimiento y descripción de sus propiedades, su composición y su clasificación.' },
        { course: '3ESO', code: 'B.3', description: 'Estructura atómica: desarrollo histórico de los modelos atómicos, existencia, formación y propiedades de los isótopos y ordenación de los elementos en la tabla periódica.' },
        { course: '3ESO', code: 'B.4', description: 'Principales compuestos químicos: su formación y sus propiedades físicas y químicas, valoración de sus aplicaciones. Masa atómica y masa molecular.' },
        { course: '3ESO', code: 'B.5', description: 'Nomenclatura: participación de un lenguaje científico común y universal formulando y nombrando sustancias simples, iones monoatómicos y compuestos binarios mediante las reglas de nomenclatura de la IUPAC.' },
        { course: '3ESO', code: 'B.6', description: 'Radiactividad: aplicaciones de los isótopos radiactivos, impacto sobre la salud y el medio ambiente e implicaciones geopolíticas.' },
        { course: '4ESO', code: 'B.1', description: 'Sistemas materiales: resolución de problemas y situaciones de aprendizaje diversas sobre las disoluciones y los gases, entre otros sistemas materiales significativos.' },
        { course: '4ESO', code: 'B.2', description: 'Modelos atómicos: desarrollo histórico de los principales modelos atómicos clásicos y cuánticos y descripción de las partículas subatómicas, estableciendo su relación con los avances de la física y la química.' },
        { course: '4ESO', code: 'B.3', description: 'Estructura electrónica de los átomos: configuración electrónica de un átomo y su relación con la posición del mismo en la tabla periódica y con sus propiedades fisicoquímicas.' },
        { course: '4ESO', code: 'B.4', description: 'Compuestos químicos: su formación, propiedades físicas y químicas y valoración de su utilidad e importancia en otros campos como la ingeniería o el deporte.' },
        { course: '4ESO', code: 'B.5', description: 'Cuantificación de la cantidad de materia: cálculo del número de moles de sistemas materiales de diferente naturaleza, manejando con soltura las diferentes formas de medida y expresión de la misma en el entorno científico.' },
        { course: '4ESO', code: 'B.6', description: 'Nomenclatura inorgánica: denominación de sustancias simples, iones y compuestos químicos binarios y ternarios mediante las normas de la IUPAC.' },
        { course: '4ESO', code: 'B.7', description: 'Introducción a la nomenclatura orgánica: denominación de compuestos orgánicos monofuncionales a partir de las normas de la IUPAC como base para entender la gran variedad de compuestos del entorno basados en el carbono.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // C. La energía
    // ──────────────────────────────────────────────────────────
    {
      letter: 'C',
      title: 'La energía',
      items: [
        { course: '2ESO', code: 'C.1', description: 'La energía: formulación de cuestiones e hipótesis sobre la energía, propiedades y manifestaciones que la describan como la causa de todos los procesos de cambio.' },
        { course: '3ESO', code: 'C.1', description: 'La energía: formulación de cuestiones e hipótesis sobre la energía, propiedades y manifestaciones que la describan como la causa de todos los procesos de cambio.' },
        { course: '4ESO', code: 'C.1', description: 'La energía: formulación y comprobación de hipótesis sobre las distintas formas y aplicaciones de la energía, a partir de sus propiedades y del principio de conservación, como base para la experimentación y la resolución de problemas relacionados con la energía mecánica en situaciones cotidianas.' },
        { course: '2ESO', code: 'C.2', description: 'Diseño y comprobación experimental de hipótesis relacionadas con el uso doméstico e industrial de la energía en sus distintas formas y las transformaciones entre ellas.' },
        { course: '3ESO', code: 'C.2', description: 'Diseño y comprobación experimental de hipótesis relacionadas con el uso doméstico e industrial de la energía en sus distintas formas y las transformaciones entre ellas.' },
        { course: '4ESO', code: 'C.2', description: 'Transferencias de energía: el trabajo y el calor como formas de transferencia de energía entre sistemas relacionados con las fuerzas o la diferencia de temperatura. La luz y el sonido como ondas que transfieren energía.' },
        { course: '2ESO', code: 'C.3', description: 'Elaboración fundamentada de hipótesis sobre el medio ambiente y la sostenibilidad a partir de las diferencias entre fuentes de energía renovables y no renovables.' },
        { course: '4ESO', code: 'C.3', description: 'La energía en nuestro mundo: estimación de la energía consumida en la vida cotidiana mediante la búsqueda de información contrastada, la experimentación y el razonamiento científico, comprendiendo la importancia de la energía en la sociedad, su producción y su uso responsable.' },
        { course: '2ESO', code: 'C.4', description: 'Efectos del calor sobre la materia: análisis de los efectos y aplicación en situaciones cotidianas.' },
        { course: '3ESO', code: 'C.5', description: 'Naturaleza eléctrica de la materia: electrización de los cuerpos, circuitos eléctricos y la obtención de energía eléctrica. Concienciación sobre la necesidad del ahorro energético y la conservación sostenible del medio ambiente.' },
        { course: '2ESO', code: 'C.6', description: 'Luz y Sonido: fenomenología básica; modelo y propiedades ondulatorias. Óptica geométrica y acústica cualitativas.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // D. La interacción
    // ──────────────────────────────────────────────────────────
    {
      letter: 'D',
      title: 'La interacción',
      items: [
        { course: '3ESO', code: 'D.1', description: 'Predicción de movimientos sencillos a partir de los conceptos de la cinemática, formulando hipótesis comprobables sobre valores futuros de estas magnitudes, validándolas a través del cálculo numérico, la interpretación de gráficas o el trabajo experimental.' },
        { course: '3ESO', code: 'D.2', description: 'Las fuerzas como agentes de cambio: relación de los efectos de las fuerzas, tanto en el estado de movimiento o de reposo de un cuerpo como produciendo deformaciones en los sistemas sobre los que actúan.' },
        { course: '3ESO', code: 'D.3', description: 'Aplicación de las leyes de Newton: observación de situaciones cotidianas o de laboratorio que permiten entender cómo se comportan los sistemas materiales ante la acción de las fuerzas y predecir los efectos de estas en situaciones cotidianas y de seguridad vial.' },
        { course: '3ESO', code: 'D.4', description: 'Fenómenos gravitatorios, eléctricos y magnéticos: experimentos sencillos que evidencian la relación con las fuerzas de la naturaleza.' },
      ],
    },
    // ──────────────────────────────────────────────────────────
    // E. El cambio
    // ──────────────────────────────────────────────────────────
    {
      letter: 'E',
      title: 'El cambio',
      items: [
        { course: '2ESO', code: 'E.1', description: 'Los sistemas materiales: análisis de los diferentes tipos de cambios que experimentan, relacionando las causas que los producen con las consecuencias que tienen.' },
        { course: '3ESO', code: 'E.1', description: 'Los sistemas materiales: análisis de los diferentes tipos de cambios que experimentan, relacionando las causas que los producen con las consecuencias que tienen.' },
        { course: '2ESO', code: 'E.2', description: 'Interpretación macroscópica y microscópica de las reacciones químicas: explicación de las relaciones de la química con el medio ambiente, la tecnología y la sociedad.' },
        { course: '3ESO', code: 'E.3', description: 'Ley de conservación de la masa y de la ley de las proporciones definidas: aplicación de estas leyes como evidencias experimentales que permiten validar el modelo atómico-molecular de la materia.' },
        { course: '2ESO', code: 'E.4', description: 'Factores que afectan a las reacciones químicas: predicción cualitativa de la evolución de las reacciones, entendiendo su importancia en la resolución de problemas actuales por parte de la ciencia.' },
      ],
    },
  ],
};
