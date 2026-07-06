import { AreaData } from '../primaria-curriculum.data';

export const AREA_MATEMATICAS: AreaData = {
  subjectCode: 'MAT-1P',
  abbrev: 'MAT',
  areaName: 'Matemáticas',
  knowledgeBlocks: [
    {
      letter: 'A',
      title: 'Sentido numérico',
      items: [
        // A1. Conteo
        { cycle: 'PRIMER', code: 'A1.1', description: 'Estrategias variadas de conteo y recuento sistemático en situaciones de la vida cotidiana en cantidades hasta el 999.' },
        { cycle: 'SEGUNDO', code: 'A1.1', description: 'Estrategias de conteo, recuento sistemático y adaptación del conteo al tamaño de los números en situaciones de la vida cotidiana en cantidades hasta el 9999.' },
        { cycle: 'TERCER', code: 'A1.1', description: 'Estrategias variadas de conteo, recuento sistemático y adaptación del conteo al tamaño de los números en situaciones de la vida cotidiana.' },
        // A2. Cantidad
        { cycle: 'PRIMER', code: 'A2.1', description: 'Estrategias y técnicas de interpretación y manipulación del orden de magnitud de los números (unidades, decenas y centenas).' },
        { cycle: 'SEGUNDO', code: 'A2.1', description: 'Estrategias y técnicas de interpretación y manipulación del orden de magnitud de los números (unidades, decenas, centenas y millares).' },
        { cycle: 'TERCER', code: 'A2.1', description: 'Estrategias y técnicas de interpretación y manipulación del orden de magnitud de los números.' },
        { cycle: 'PRIMER', code: 'A2.2', description: 'Estimaciones razonadas de cantidades en contextos de resolución de problemas.' },
        { cycle: 'SEGUNDO', code: 'A2.2', description: 'Estimaciones y aproximaciones razonadas de cantidades en contextos de resolución de problemas.' },
        { cycle: 'TERCER', code: 'A2.2', description: 'Estimaciones y aproximaciones razonadas de cantidades en contextos de resolución de problemas.' },
        { cycle: 'PRIMER', code: 'A2.3', description: 'Lectura, representación (incluida la recta numérica y con materiales manipulativos), composición, descomposición y recomposición de números naturales hasta 999.' },
        { cycle: 'SEGUNDO', code: 'A2.3', description: 'Lectura, representación (incluida la recta numérica y con materiales manipulativos), composición, descomposición y recomposición de números naturales hasta 9999.' },
        { cycle: 'TERCER', code: 'A2.3', description: 'Lectura, representación (incluida la recta numérica y con materiales manipulativos), composición, descomposición y recomposición de números naturales y decimales hasta las milésimas.' },
        { cycle: 'PRIMER', code: 'A2.4', description: 'Representación de una misma cantidad de distintas formas (manipulativa, gráfica o numérica) y estrategias de elección de la representación adecuada para cada situación o problema.' },
        { cycle: 'SEGUNDO', code: 'A2.4', description: 'Fracciones propias con denominador hasta 12 en contextos de la vida cotidiana, partiendo de la manipulación y de la representación gráfica.' },
        { cycle: 'TERCER', code: 'A2.4', description: 'Fracciones y decimales para expresar cantidades en contextos de la vida cotidiana y elección de la mejor representación para cada situación o problema.' },
        // A3. Sentido de las operaciones
        { cycle: 'PRIMER', code: 'A3.1', description: 'Estrategias de cálculo mental con números naturales hasta 999.' },
        { cycle: 'SEGUNDO', code: 'A3.1', description: 'Estrategias de cálculo mental con números naturales y fracciones.' },
        { cycle: 'TERCER', code: 'A3.1', description: 'Estrategias de cálculo mental con números naturales, fracciones y decimales.' },
        { cycle: 'PRIMER', code: 'A3.2', description: 'Suma y resta de números naturales resueltas con flexibilidad y sentido: utilidad en situaciones contextualizadas, estrategias y herramientas de resolución y propiedades.' },
        { cycle: 'SEGUNDO', code: 'A3.2', description: 'Estrategias de reconocimiento de qué operaciones simples (suma, resta, multiplicación, división como reparto y partición) son útiles para resolver situaciones contextualizadas.' },
        { cycle: 'TERCER', code: 'A3.2', description: 'Estrategias de reconocimiento de qué operaciones simples o combinadas (suma, resta, multiplicación, división) son útiles para resolver situaciones contextualizadas.' },
        { cycle: 'SEGUNDO', code: 'A3.3', description: 'Construcción de las tablas de multiplicar apoyándose en número de veces, suma repetida o disposición en cuadrículas.' },
        { cycle: 'TERCER', code: 'A3.3', description: 'Potencia como producto de factores iguales. Cuadrados y cubos.' },
        { cycle: 'SEGUNDO', code: 'A3.4', description: 'Suma, resta, multiplicación y división de números naturales resueltas con flexibilidad y sentido en situaciones contextualizadas; estrategias y herramientas de resolución y propiedades.' },
        { cycle: 'TERCER', code: 'A3.4', description: 'Estrategias de resolución de operaciones aritméticas con flexibilidad y sentido: mentalmente, de manera escrita o con calculadora; utilidad en situaciones contextualizadas y propiedades.' },
        // A4. Relaciones
        { cycle: 'PRIMER', code: 'A4.1', description: 'Sistema de numeración de base diez (hasta el 999): aplicación de las relaciones que genera en las operaciones.' },
        { cycle: 'SEGUNDO', code: 'A4.1', description: 'Sistema de numeración de base diez (hasta el 9999): aplicación de las relaciones que genera en las operaciones.' },
        { cycle: 'TERCER', code: 'A4.1', description: 'Sistema de numeración de base diez (números naturales y decimales hasta las milésimas): aplicación de las relaciones que genera en las operaciones.' },
        { cycle: 'PRIMER', code: 'A4.2', description: 'Números naturales en contextos de la vida cotidiana: comparación y ordenación.' },
        { cycle: 'SEGUNDO', code: 'A4.2', description: 'Números naturales y fracciones en contextos de la vida cotidiana: comparación y ordenación.' },
        { cycle: 'TERCER', code: 'A4.2', description: 'Números naturales, fracciones y decimales hasta las milésimas en contextos de la vida cotidiana: comparación y ordenación.' },
        { cycle: 'PRIMER', code: 'A4.3', description: 'Relaciones entre la suma y la resta: aplicación en contextos cotidianos.' },
        { cycle: 'SEGUNDO', code: 'A4.3', description: 'Relaciones entre la suma y la resta, y la multiplicación y la división: aplicación en contextos cotidianos.' },
        { cycle: 'TERCER', code: 'A4.3', description: 'Relaciones entre las operaciones aritméticas: aplicación en contextos cotidianos.' },
        { cycle: 'TERCER', code: 'A4.4', description: 'Relación de divisibilidad: múltiplos y divisores.' },
        { cycle: 'TERCER', code: 'A4.5', description: 'Relación entre fracciones sencillas, decimales y porcentajes.' },
        // A5. Educación financiera
        { cycle: 'PRIMER', code: 'A5.1', description: 'Sistema monetario europeo: monedas (1, 2, 5, 10, 20 y 50 céntimos y 1, 2 euros) y billetes de euro (5, 10, 20, 50 y 100), valor y equivalencia.' },
        { cycle: 'SEGUNDO', code: 'A5.1', description: 'Cálculo y estimación de cantidades y cambios (euros y céntimos de euro) en problemas de la vida cotidiana: ingresos, gastos y ahorro. Decisiones de compra responsable.' },
        { cycle: 'TERCER', code: 'A5.1', description: 'Resolución de problemas relacionados con el consumo responsable (valor/precio, calidad/precio y mejor precio) y con el dinero: precios, intereses y rebajas.' },
        // A6. Razonamiento proporcional
        { cycle: 'TERCER', code: 'A6.1', description: 'Situaciones proporcionales y no proporcionales en problemas de la vida cotidiana: identificación como comparación multiplicativa entre magnitudes.' },
        { cycle: 'TERCER', code: 'A6.2', description: 'Resolución de problemas de proporcionalidad, porcentajes y escalas de la vida cotidiana, mediante la igualdad entre razones, la reducción a la unidad o el uso de coeficientes de proporcionalidad.' },
      ],
    },
    {
      letter: 'B',
      title: 'Sentido de la medida',
      items: [
        // B1. Magnitud
        { cycle: 'PRIMER', code: 'B1.1', description: 'Atributos mensurables de los objetos (longitud, masa, capacidad), distancias y tiempos.' },
        { cycle: 'SEGUNDO', code: 'B1.1', description: 'Atributos mensurables de los objetos (longitud, masa, capacidad, superficie, volumen y amplitud del ángulo).' },
        { cycle: 'PRIMER', code: 'B1.2', description: 'Unidades convencionales (metro, kilo y litro) y no convencionales en situaciones de la vida cotidiana.' },
        { cycle: 'SEGUNDO', code: 'B1.2', description: 'Unidades convencionales (km, m, cm, mm; kg, g; l y ml) y no convencionales en situaciones de la vida cotidiana.' },
        { cycle: 'TERCER', code: 'B1.2', description: 'Unidades convencionales del Sistema Métrico Decimal (longitud, masa, capacidad, volumen y superficie), de tiempo y grado (ángulos) contextos de la vida cotidiana: selección y uso de las unidades adecuadas.' },
        { cycle: 'PRIMER', code: 'B1.3', description: 'Unidades de medida del tiempo (año, mes, semana, día y hora) en situaciones de la vida cotidiana.' },
        { cycle: 'SEGUNDO', code: 'B1.3', description: 'Medida del tiempo (siglo, año, mes, semana, día, hora y minutos) y determinación de la duración de períodos de tiempo.' },
        // B2. Medición
        { cycle: 'PRIMER', code: 'B2.1', description: 'Procesos para medir mediante repetición de una unidad y mediante la utilización de instrumentos convencionales (reglas, cintas métricas, balanzas, calendarios, relojes...) y no convencionales en contextos familiares.' },
        { cycle: 'SEGUNDO', code: 'B2.1', description: 'Estrategias para realizar mediciones con instrumentos y unidades no convencionales (repetición de una unidad, uso de cuadrículas y materiales manipulativos) y convencionales.' },
        { cycle: 'TERCER', code: 'B2.1', description: 'Instrumentos (analógicos o digitales) y unidades adecuadas para medir longitudes, objetos, ángulos y tiempos: selección y uso.' },
        { cycle: 'SEGUNDO', code: 'B2.2', description: 'Procesos de medición mediante instrumentos convencionales (regla, cinta métrica, balanzas, reloj analógico y digital).' },
        // B3. Estimación y relaciones
        { cycle: 'PRIMER', code: 'B3.1', description: 'Estrategias de comparación directa y ordenación de medidas de la misma magnitud.' },
        { cycle: 'SEGUNDO', code: 'B3.1', description: 'Estrategias de comparación y ordenación de medidas de la misma magnitud (km, m, cm, mm; kg, g; l y ml): aplicación de equivalencias entre unidades en problemas de la vida cotidiana que impliquen convertir en unidades más pequeñas.' },
        { cycle: 'TERCER', code: 'B3.1', description: 'Estrategias de comparación y ordenación de medidas de la misma magnitud, aplicando las equivalencias entre unidades (sistema métrico decimal) en problemas de la vida cotidiana.' },
        { cycle: 'TERCER', code: 'B3.2', description: 'Relación entre el sistema métrico decimal y el sistema de numeración decimal.' },
        { cycle: 'PRIMER', code: 'B3.3', description: 'Estimación de medidas (distancias, tamaños, masas, capacidades...) por comparación directa con otras medidas.' },
        { cycle: 'SEGUNDO', code: 'B3.3', description: 'Estimación de medidas de longitud, masa y capacidad por comparación.' },
        { cycle: 'TERCER', code: 'B3.3', description: 'Estimación de medidas de ángulos y superficies por comparación.' },
        { cycle: 'SEGUNDO', code: 'B3.4', description: 'Evaluación de resultados de mediciones y estimaciones o cálculos de medidas.' },
        { cycle: 'TERCER', code: 'B3.4', description: 'Evaluación de resultados de mediciones y estimaciones o cálculos de medidas, razonando si son o no posibles.' },
      ],
    },
    {
      letter: 'C',
      title: 'Sentido espacial',
      items: [
        // C1. Figuras geométricas de dos y tres dimensiones
        { cycle: 'PRIMER', code: 'C1.1', description: 'Figuras geométricas sencillas de dos dimensiones en objetos de la vida cotidiana: identificación y clasificación atendiendo a sus elementos.' },
        { cycle: 'SEGUNDO', code: 'C1.1', description: 'Figuras geométricas de dos o tres dimensiones en objetos de la vida cotidiana: identificación y clasificación atendiendo a sus elementos y a las relaciones entre ellos.' },
        { cycle: 'TERCER', code: 'C1.1', description: 'Figuras geométricas en objetos de la vida cotidiana: identificación y clasificación atendiendo a sus elementos y a las relaciones entre ellos.' },
        { cycle: 'PRIMER', code: 'C1.2', description: 'Estrategias y técnicas de construcción de figuras geométricas sencillas de una, dos o tres dimensiones de forma manipulativa.' },
        { cycle: 'SEGUNDO', code: 'C1.2', description: 'Estrategias y técnicas de construcción de figuras geométricas de dos dimensiones por composición y descomposición, mediante materiales manipulables, instrumentos de dibujo (regla y escuadra) y aplicaciones informáticas.' },
        { cycle: 'TERCER', code: 'C1.2', description: 'Técnicas de construcción de figuras geométricas por composición y descomposición, mediante materiales manipulables, instrumentos de dibujo y aplicaciones informáticas.' },
        { cycle: 'PRIMER', code: 'C1.3', description: 'Vocabulario geométrico básico: descripción verbal de los elementos y las propiedades de figuras geométricas sencillas.' },
        { cycle: 'SEGUNDO', code: 'C1.3', description: 'Vocabulario: descripción verbal de los elementos y las propiedades de figuras geométricas sencillas.' },
        { cycle: 'TERCER', code: 'C1.3', description: 'Vocabulario geométrico: descripción verbal de los elementos y las propiedades de figuras geométricas.' },
        { cycle: 'PRIMER', code: 'C1.4', description: 'Propiedades de figuras geométricas de dos dimensiones: exploración mediante materiales manipulables y herramientas digitales.' },
        { cycle: 'SEGUNDO', code: 'C1.4', description: 'Propiedades de figuras geométricas de dos y tres dimensiones: exploración mediante materiales manipulables (cuadrículas, geoplanos, policubos, etc.) y el manejo de herramientas digitales (programas de geometría dinámica, realidad aumentada, robótica educativa, etc.).' },
        { cycle: 'TERCER', code: 'C1.4', description: 'Propiedades de figuras geométricas: exploración mediante materiales manipulables (cuadrículas, geoplanos, policubos, etc.) y herramientas digitales (programas de geometría dinámica, realidad aumentada, robótica educativa, etc.).' },
        // C2. Localización y sistemas de representación
        { cycle: 'PRIMER', code: 'C2.1', description: 'Posición relativa de objetos en el espacio e interpretación de movimientos: descripción en referencia a uno mismo o a una misma a través de vocabulario adecuado (arriba, abajo, delante, detrás, entre, más cerca que, menos cerca que, más lejos que, menos lejos que...).' },
        { cycle: 'SEGUNDO', code: 'C2.1', description: 'Descripción de la posición relativa de objetos en el espacio o de sus representaciones, utilizando vocabulario geométrico adecuado (paralelo, perpendicular, oblicuo, derecha, izquierda, etc.).' },
        { cycle: 'TERCER', code: 'C2.1', description: 'Localización y desplazamientos en planos y mapas a partir de puntos de referencia (incluidos los puntos cardinales), direcciones y cálculo de distancias (escalas): descripción e interpretación con el vocabulario adecuado en soportes físicos y virtuales.' },
        { cycle: 'SEGUNDO', code: 'C2.2', description: 'Descripción verbal e interpretación de movimientos, en relación a uno mismo o a otros puntos de referencia, utilizando vocabulario geométrico adecuado.' },
        { cycle: 'TERCER', code: 'C2.2', description: 'Descripción de posiciones y movimientos en el primer cuadrante del sistema de coordenadas cartesiano.' },
        { cycle: 'PRIMER', code: 'C2.3', description: 'Reconocimiento del plano como instrumento de representación.' },
        { cycle: 'SEGUNDO', code: 'C2.3', description: 'Interpretación de itinerarios en planos, utilizando soportes físicos y virtuales.' },
        // C3. Movimientos y transformaciones
        { cycle: 'PRIMER', code: 'C3.1', description: 'Experimentación de la simetría en situaciones de la vida cotidiana.' },
        { cycle: 'SEGUNDO', code: 'C3.1', description: 'Identificación de figuras transformadas mediante traslaciones y simetrías en situaciones de la vida cotidiana.' },
        { cycle: 'TERCER', code: 'C3.1', description: 'Transformaciones mediante giros, traslaciones y simetrías en situaciones de la vida cotidiana: identificación de figuras transformadas, generación a partir de patrones iniciales y predicción del resultado.' },
        { cycle: 'SEGUNDO', code: 'C3.2', description: 'Generación de figuras transformadas a partir de simetrías y traslaciones de un patrón inicial y predicción del resultado con material manipulativo y gráfico.' },
        { cycle: 'TERCER', code: 'C3.2', description: 'Semejanza en situaciones de la vida cotidiana: identificación de figuras semejantes, generación a partir de patrones iniciales y predicción del resultado.' },
        // C4. Visualización, razonamiento y modelización geométrica
        { cycle: 'SEGUNDO', code: 'C4.1', description: 'Estrategias para el cálculo de perímetros de figuras planas y utilización en la resolución de problemas de la vida cotidiana.' },
        { cycle: 'TERCER', code: 'C4.1', description: 'Estrategias para el cálculo de áreas y perímetros de figuras planas en situaciones de la vida cotidiana.' },
        { cycle: 'PRIMER', code: 'C4.2', description: 'Representaciones, con material manipulativo y/o gráfico, de modelos geométricos en la resolución de problemas relacionados con los otros sentidos.' },
        { cycle: 'SEGUNDO', code: 'C4.2', description: 'Representaciones, con material manipulativo y/o gráfico, de modelos geométricos en la resolución de problemas relacionados con los otros sentidos.' },
        { cycle: 'TERCER', code: 'C4.2', description: 'Representaciones, con material manipulativo y/o gráfico, de modelos geométricos en la resolución de problemas relacionados con los otros sentidos.' },
        { cycle: 'TERCER', code: 'C4.3', description: 'Elaboración de conjeturas sobre propiedades geométricas, utilizando instrumentos de dibujo (compás y transportador de ángulos) y programas de geometría dinámica.' },
        { cycle: 'PRIMER', code: 'C4.4', description: 'Relaciones geométricas: reconocimiento en el entorno.' },
        { cycle: 'SEGUNDO', code: 'C4.4', description: 'Reconocimiento de relaciones geométricas en el arte, las ciencias y la vida cotidiana.' },
        { cycle: 'TERCER', code: 'C4.4', description: 'Las ideas y las relaciones geométricas en el arte, las ciencias y la vida cotidiana.' },
      ],
    },
    {
      letter: 'D',
      title: 'Sentido algebraico',
      items: [
        // D1. Patrones
        { cycle: 'PRIMER', code: 'D1.1', description: 'Estrategias para la identificación, descripción oral, descubrimiento de elementos ocultos y extensión de secuencias a partir de las regularidades en una colección de números, figuras o imágenes.' },
        { cycle: 'SEGUNDO', code: 'D1.1', description: 'Estrategias para la identificación, descripción verbal, representación y predicción razonada de términos a partir de las regularidades en una colección de números, figuras o imágenes.' },
        { cycle: 'TERCER', code: 'D1.1', description: 'Estrategias de identificación, representación (verbal o mediante tablas, gráficos y notaciones inventadas) y predicción razonada de términos a partir de las regularidades en una colección de números, figuras o imágenes.' },
        { cycle: 'TERCER', code: 'D1.2', description: 'Creación de patrones recurrentes a partir de regularidades o de otros patrones utilizando números, figuras o imágenes.' },
        // D2. Modelo matemático
        { cycle: 'PRIMER', code: 'D2.1', description: 'Proceso de modelización de forma guiada (dibujos, esquemas, diagramas, objetos manipulables, dramatizaciones...) en la comprensión y resolución de problemas de la vida cotidiana.' },
        { cycle: 'SEGUNDO', code: 'D2.1', description: 'Proceso pautado de modelización usando representaciones matemáticas (gráficas, tablas...) para facilitar la comprensión y la resolución de problemas de la vida cotidiana.' },
        { cycle: 'TERCER', code: 'D2.1', description: 'Proceso de modelización a partir de problemas de la vida cotidiana, usando representaciones matemáticas.' },
        // D3. Relaciones y funciones
        { cycle: 'PRIMER', code: 'D3.1', description: 'Expresión de relaciones de igualdad y desigualdad mediante los signos = y ≠ entre expresiones que incluyan operaciones.' },
        { cycle: 'SEGUNDO', code: 'D3.1', description: 'Relaciones de igualdad y desigualdad, y uso de los signos = y ≠ entre expresiones que incluyan operaciones y sus propiedades.' },
        { cycle: 'TERCER', code: 'D3.1', description: 'Relaciones de igualdad y desigualdad y uso de los signos < y >. Determinación de datos desconocidos (representados por medio de una letra o un símbolo) en expresiones sencillas relacionadas mediante estos signos y los signos = y ≠.' },
        { cycle: 'PRIMER', code: 'D3.2', description: 'Representación de la igualdad como expresión de una relación de equivalencia entre dos elementos y obtención de datos sencillos desconocidos (representados por medio de un símbolo) en cualquiera de los dos elementos.' },
        { cycle: 'SEGUNDO', code: 'D3.2', description: 'La igualdad como expresión de una relación de equivalencia entre dos elementos y obtención de datos sencillos desconocidos (representados por medio de un símbolo) en cualquiera de los dos elementos.' },
        { cycle: 'SEGUNDO', code: 'D3.3', description: 'Representación de la relación "mayor que" y "menor que", y uso de los signos < y >.' },
        // D4. Pensamiento computacional
        { cycle: 'PRIMER', code: 'D4.1', description: 'Estrategias para la interpretación de algoritmos sencillos (rutinas, instrucciones con pasos ordenados...).' },
        { cycle: 'SEGUNDO', code: 'D4.1', description: 'Estrategias para la interpretación y modificación de algoritmos sencillos (reglas de juegos, instrucciones secuenciales, bucles, patrones repetitivos, programación por bloques, robótica educativa...).' },
        { cycle: 'TERCER', code: 'D4.1', description: 'Estrategias para la interpretación, modificación y creación de algoritmos sencillos (secuencias de pasos ordenados, esquemas, simulaciones, patrones repetitivos, bucles, instrucciones anidadas y condicionales, representaciones computacionales, programación por bloques, robótica educativa...).' },
      ],
    },
    {
      letter: 'E',
      title: 'Sentido estocástico',
      items: [
        // E1. Organización y análisis de datos
        { cycle: 'PRIMER', code: 'E1.1', description: 'Estrategias de reconocimiento de los principales elementos y extracción de la información relevante de gráficos estadísticos muy sencillos de la vida cotidiana (pictogramas, gráficas de barras...).' },
        { cycle: 'SEGUNDO', code: 'E1.1', description: 'Gráficos estadísticos de la vida cotidiana (pictogramas, gráficas de barras, histogramas...): lectura e interpretación.' },
        { cycle: 'TERCER', code: 'E1.1', description: 'Conjuntos de datos y gráficos estadísticos de la vida cotidiana: descripción, interpretación y análisis crítico.' },
        { cycle: 'PRIMER', code: 'E1.2', description: 'Estrategias sencillas para la recogida, clasificación y recuento de datos cualitativos y cuantitativos en muestras pequeñas.' },
        { cycle: 'SEGUNDO', code: 'E1.2', description: 'Estrategias sencillas para la recogida, clasificación y organización de datos cualitativos o cuantitativos discretos en muestras pequeñas mediante calculadora y aplicaciones informáticas sencillas. Frecuencia absoluta: interpretación.' },
        { cycle: 'TERCER', code: 'E1.2', description: 'Estrategias para la realización de un estudio estadístico sencillo: formulación de preguntas, y recogida, registro y organización de datos cualitativos y cuantitativos procedentes de diferentes experimentos (encuestas, mediciones, observaciones...). Tablas de frecuencias absolutas y relativas: interpretación.' },
        { cycle: 'PRIMER', code: 'E1.3', description: 'Representación de datos obtenidos a través de recuentos mediante gráficos estadísticos sencillos y recursos manipulables y tecnológicos.' },
        { cycle: 'SEGUNDO', code: 'E1.3', description: 'Gráficos estadísticos sencillos (diagrama de barras y pictogramas) para representar datos, seleccionando el más conveniente, mediante recursos tradicionales y aplicaciones informáticas sencillas.' },
        { cycle: 'TERCER', code: 'E1.3', description: 'Gráficos estadísticos sencillos (diagrama de barras, diagrama de sectores, histograma, etc.): representación de datos mediante recursos tradicionales y tecnológicos y selección del más conveniente.' },
        { cycle: 'SEGUNDO', code: 'E1.4', description: 'La moda: interpretación como el dato más frecuente.' },
        { cycle: 'TERCER', code: 'E1.4', description: 'Medidas de centralización (media y moda): interpretación, cálculo y aplicación.' },
        { cycle: 'TERCER', code: 'E1.5', description: 'Medidas de dispersión (rango): cálculo e interpretación.' },
        { cycle: 'TERCER', code: 'E1.6', description: 'Calculadora y otros recursos digitales, como la hoja de cálculo, para organizar la información estadística y realizar diferentes visualizaciones de los datos.' },
        { cycle: 'SEGUNDO', code: 'E1.7', description: 'Comparación gráfica de dos conjuntos de datos para establecer relaciones y extraer conclusiones.' },
        { cycle: 'TERCER', code: 'E1.7', description: 'Relación y comparación de dos conjuntos de datos a partir de su representación gráfica: formulación de conjeturas, análisis de la dispersión y obtención de conclusiones.' },
        // E2. Incertidumbre
        { cycle: 'SEGUNDO', code: 'E2.1', description: 'La probabilidad como medida subjetiva de la incertidumbre. Reconocimiento de la incertidumbre en situaciones de la vida cotidiana y mediante la realización de experimentos.' },
        { cycle: 'TERCER', code: 'E2.1', description: 'La incertidumbre en situaciones de la vida cotidiana: cuantificación y estimación mediante experimentos aleatorios repetitivos.' },
        { cycle: 'SEGUNDO', code: 'E2.2', description: 'Identificación de suceso seguro, suceso posible y suceso imposible.' },
        { cycle: 'SEGUNDO', code: 'E2.3', description: 'Comparación de la probabilidad de dos sucesos de forma intuitiva.' },
        { cycle: 'TERCER', code: 'E2.3', description: 'Cálculo de probabilidades en experimentos, comparaciones o investigaciones en los que sea aplicable la regla de Laplace: aplicación de técnicas básicas del conteo.' },
        // E3. Inferencia
        { cycle: 'SEGUNDO', code: 'E3.1', description: 'Formulación de conjeturas a partir de los datos recogidos y analizados, dándoles sentido en el contexto de estudio.' },
        { cycle: 'TERCER', code: 'E3.1', description: 'Identificación de un conjunto de datos como muestra de un conjunto más grande y reflexión sobre la población a la que es posible aplicar las conclusiones de investigaciones estadísticas sencillas.' },
      ],
    },
    {
      letter: 'F',
      title: 'Sentido socioemocional',
      items: [
        // F1. Creencias, actitudes y emociones
        { cycle: 'PRIMER', code: 'F1.1', description: 'Gestión emocional: estrategias de identificación y expresión de las propias emociones ante las matemáticas. Curiosidad e iniciativa en el aprendizaje de las matemáticas.' },
        { cycle: 'SEGUNDO', code: 'F1.1', description: 'Gestión emocional: estrategias de identificación y manifestación de las propias emociones ante las matemáticas. Iniciativa y tolerancia ante la frustración en el aprendizaje de las matemáticas.' },
        { cycle: 'TERCER', code: 'F1.1', description: 'Autorregulación emocional: autoconcepto y aprendizaje de las matemáticas desde una perspectiva de género. Estrategias de mejora de la perseverancia y el sentido de la responsabilidad de mejora hacia el aprendizaje de las matemáticas.' },
        { cycle: 'PRIMER', code: 'F1.2', description: 'Percepción del error como oportunidad de aprendizaje.' },
        { cycle: 'SEGUNDO', code: 'F1.2', description: 'Fomento de la autonomía y estrategias para la toma de decisiones en situaciones de resolución de problemas. Reconocimiento del error como oportunidad de aprendizaje.' },
        { cycle: 'TERCER', code: 'F1.2', description: 'Flexibilidad cognitiva, adaptación y cambio de estrategia en caso necesario. Valoración del error como oportunidad de aprendizaje.' },
        // F2. Trabajo en equipo, inclusión, respeto y diversidad
        { cycle: 'PRIMER', code: 'F2.1', description: 'Identificación y rechazo de actitudes discriminatorias ante las diferencias individuales presentes en el aula. Actitudes inclusivas y aceptación de la diversidad del grupo.' },
        { cycle: 'SEGUNDO', code: 'F2.1', description: 'Sensibilidad y respeto ante las diferencias individuales presentes en el aula: identificación y rechazo de actitudes discriminatorias. Actitudes inclusivas y aceptación de la diversidad del grupo.' },
        { cycle: 'TERCER', code: 'F2.1', description: 'Valoración de las diferencias individuales presentes en el aula. Actitudes inclusivas y aceptación de la diversidad del grupo.' },
        { cycle: 'SEGUNDO', code: 'F2.2', description: 'Reconocimiento y comprensión de las emociones y experiencias de las demás personas ante las matemáticas.' },
        { cycle: 'TERCER', code: 'F2.2', description: 'Respeto por las emociones y experiencias de las demás personas ante las matemáticas.' },
        { cycle: 'PRIMER', code: 'F2.3', description: 'Participación activa en el trabajo en equipo: interacción positiva y respeto por el trabajo de los y las demás.' },
        { cycle: 'SEGUNDO', code: 'F2.3', description: 'Participación activa en el trabajo en equipo, escucha activa y respeto por el trabajo de los y las demás.' },
        { cycle: 'TERCER', code: 'F2.3', description: 'Aplicación de técnicas simples para el trabajo en equipo en matemáticas, y estrategias para la gestión de conflictos, promoción de conductas empáticas e inclusivas y aceptación de la diversidad presente en el aula y en la sociedad.' },
        { cycle: 'PRIMER', code: 'F2.4', description: 'Contribución de las matemáticas a los distintos ámbitos del conocimiento humano desde una perspectiva de género.' },
        { cycle: 'SEGUNDO', code: 'F2.4', description: 'Valoración de la contribución de las matemáticas a los distintos ámbitos del conocimiento humano desde una perspectiva de género.' },
        { cycle: 'TERCER', code: 'F2.4', description: 'Valoración de la contribución de las matemáticas a los distintos ámbitos del conocimiento humano y desarrollo humano desde una perspectiva de género.' },
      ],
    },
  ],
  competencies: [
    {
      code: '1',
      name: 'Interpretación matemática de situaciones cotidianas',
      description:
        'Interpretar situaciones de la vida cotidiana, proporcionando una representación matemática de las mismas mediante conceptos, herramientas y estrategias, para analizar la información más relevante.',
      keyCompetencyCodes: ['STEM', 'CD', 'CPSAA', 'CE', 'CCEC'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '1.1',
          description:
            'Comprender las preguntas planteadas a través de diferentes estrategias o herramientas, reconociendo la información contenida en problemas de la vida cotidiana.',
        },
        {
          cycle: 'SEGUNDO',
          code: '1.1',
          description:
            'Interpretar, de forma verbal o gráfica, problemas de la vida cotidiana, comprendiendo las preguntas planteadas a través de diferentes estrategias o herramientas, incluidas las tecnológicas.',
        },
        {
          cycle: 'TERCER',
          code: '1.1',
          description:
            'Comprender problemas de la vida cotidiana a través de la reformulación de la pregunta, de forma verbal y gráfica.',
        },
        {
          cycle: 'PRIMER',
          code: '1.2',
          description:
            'Proporcionar ejemplos de representaciones problematizadas sencillas con recursos manipulativos y gráficos que ayuden en la resolución de un problema de la vida cotidiana.',
        },
        {
          cycle: 'SEGUNDO',
          code: '1.2',
          description:
            'Producir representaciones matemáticas a través de esquemas o diagramas que ayuden en la resolución de una situación problematizada.',
        },
        {
          cycle: 'TERCER',
          code: '1.2',
          description:
            'Elaborar representaciones matemáticas que ayuden en la búsqueda y elección de estrategias y herramientas, incluidas las tecnológicas, para la resolución de una situación problematizada.',
        },
      ],
    },
    {
      code: '2',
      name: 'Resolución de situaciones problematizadas',
      description:
        'Resolver situaciones problematizadas, aplicando diferentes técnicas, estrategias y formas de razonamiento, para explorar distintas maneras de proceder, obtener soluciones y asegurar su validez desde un punto de vista formal y en relación con el contexto planteado.',
      keyCompetencyCodes: ['STEM', 'CPSAA', 'CE'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '2.1',
          description: 'Emplear algunas estrategias adecuadas en la resolución de problemas.',
        },
        {
          cycle: 'SEGUNDO',
          code: '2.1',
          description: 'Comparar diferentes estrategias para resolver un problema de forma pautada.',
        },
        {
          cycle: 'TERCER',
          code: '2.1',
          description: 'Seleccionar entre diferentes estrategias para resolver un problema, justificando la elección.',
        },
        {
          cycle: 'PRIMER',
          code: '2.2',
          description:
            'Obtener posibles soluciones a problemas, de forma guiada, aplicando estrategias básicas de resolución.',
        },
        {
          cycle: 'SEGUNDO',
          code: '2.2',
          description: 'Obtener posibles soluciones de un problema siguiendo alguna estrategia conocida.',
        },
        {
          cycle: 'TERCER',
          code: '2.2',
          description:
            'Obtener posibles soluciones de un problema, seleccionando entre varias estrategias conocidas de forma autónoma.',
        },
        {
          cycle: 'PRIMER',
          code: '2.3',
          description:
            'Describir verbalmente la idoneidad de las soluciones de un problema a partir de las preguntas previamente planteadas.',
        },
        {
          cycle: 'SEGUNDO',
          code: '2.3',
          description:
            'Demostrar la corrección matemática de las soluciones de un problema y su coherencia en el contexto planteado.',
        },
        {
          cycle: 'TERCER',
          code: '2.3',
          description:
            'Comprobar la corrección matemática de las soluciones de un problema y su coherencia en el contexto planteado.',
        },
      ],
    },
    {
      code: '3',
      name: 'Conjeturas y problemas matemáticos',
      description:
        'Explorar, formular y comprobar conjeturas sencillas o plantear problemas de tipo matemático en situaciones basadas en la vida cotidiana, de forma guiada, reconociendo el valor del razonamiento y la argumentación, para contrastar su validez, adquirir e integrar nuevo conocimiento.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CE'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '3.1',
          description:
            'Realizar conjeturas matemáticas sencillas, investigando patrones, propiedades y relaciones de forma guiada.',
        },
        {
          cycle: 'SEGUNDO',
          code: '3.1',
          description:
            'Analizar y realizar conjeturas matemáticas sencillas investigando patrones, propiedades y relaciones de forma guiada.',
        },
        {
          cycle: 'TERCER',
          code: '3.1',
          description:
            'Analizar y formular conjeturas matemáticas sencillas investigando patrones, propiedades y relaciones de forma guiada.',
        },
        {
          cycle: 'PRIMER',
          code: '3.2',
          description:
            'Dar ejemplos de problemas a partir de situaciones cotidianas que se resuelven matemáticamente de forma guiada.',
        },
        {
          cycle: 'SEGUNDO',
          code: '3.2',
          description:
            'Dar ejemplos de problemas sobre situaciones cotidianas que se resuelven matemáticamente.',
        },
        {
          cycle: 'TERCER',
          code: '3.2',
          description: 'Plantear nuevos problemas sobre situaciones cotidianas que se resuelvan matemáticamente.',
        },
      ],
    },
    {
      code: '4',
      name: 'Pensamiento computacional',
      description:
        'Utilizar el pensamiento computacional, organizando datos, descomponiendo en partes, reconociendo patrones, generalizando e interpretando, modificando y creando algoritmos de forma guiada, para modelizar y automatizar situaciones de la vida cotidiana.',
      keyCompetencyCodes: ['STEM', 'CD', 'CE'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '4.1',
          description:
            'Describir rutinas y actividades sencillas de la vida cotidiana que se realicen paso a paso, utilizando principios básicos del pensamiento computacional de forma guiada.',
        },
        {
          cycle: 'SEGUNDO',
          code: '4.1',
          description:
            'Automatizar situaciones sencillas de la vida cotidiana que se realicen paso a paso o sigan una rutina, utilizando de forma pautada principios básicos del pensamiento computacional.',
        },
        {
          cycle: 'TERCER',
          code: '4.1',
          description:
            'Modelizar situaciones de la vida cotidiana utilizando, de forma pautada, principios básicos del pensamiento computacional.',
        },
        {
          cycle: 'PRIMER',
          code: '4.2',
          description:
            'Emplear herramientas tecnológicas adecuadas, de forma guiada, en el proceso de resolución de problemas.',
        },
        {
          cycle: 'SEGUNDO',
          code: '4.2',
          description:
            'Emplear herramientas tecnológicas adecuadas en el proceso de resolución de problemas.',
        },
        {
          cycle: 'TERCER',
          code: '4.2',
          description:
            'Emplear herramientas tecnológicas adecuadas en la investigación y resolución de problemas.',
        },
      ],
    },
    {
      code: '5',
      name: 'Conexiones matemáticas',
      description:
        'Reconocer y utilizar conexiones entre las diferentes ideas matemáticas, así como identificar las matemáticas implicadas en otras áreas o en la vida cotidiana, interrelacionando conceptos y procedimientos, para interpretar situaciones y contextos diversos.',
      keyCompetencyCodes: ['STEM', 'CD', 'CC', 'CCEC'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '5.1',
          description:
            'Reconocer conexiones entre los diferentes elementos matemáticos, aplicando conocimientos y experiencias propias.',
        },
        {
          cycle: 'SEGUNDO',
          code: '5.1',
          description:
            'Utilizar conexiones entre los diferentes elementos matemáticos, aplicando conocimientos y experiencias propias.',
        },
        {
          cycle: 'TERCER',
          code: '5.1',
          description:
            'Realizar conexiones entre diferentes elementos matemáticos aplicando conocimientos y experiencias propias.',
        },
        {
          cycle: 'PRIMER',
          code: '5.2',
          description:
            'Reconocer las matemáticas presentes en la vida cotidiana y en otras áreas, estableciendo conexiones sencillas entre ellas.',
        },
        {
          cycle: 'SEGUNDO',
          code: '5.2',
          description:
            'Interpretar situaciones en contextos diversos, reconociendo las conexiones entre las matemáticas y la vida cotidiana.',
        },
        {
          cycle: 'TERCER',
          code: '5.2',
          description:
            'Utilizar las conexiones entre las matemáticas, otras áreas y la vida cotidiana en contextos no matemáticos.',
        },
      ],
    },
    {
      code: '6',
      name: 'Comunicación y representación matemática',
      description:
        'Comunicar y representar, de forma individual y colectiva, conceptos, procedimientos y resultados matemáticos, utilizando el lenguaje oral, escrito, gráfico, multimodal y la terminología apropiados, para dar significado y permanencia a las ideas matemáticas.',
      keyCompetencyCodes: ['CCL', 'STEM', 'CD', 'CE', 'CCEC'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '6.1',
          description:
            'Reconocer lenguaje matemático sencillo presente en la vida cotidiana, adquiriendo vocabulario específico básico.',
        },
        {
          cycle: 'SEGUNDO',
          code: '6.1',
          description:
            'Reconocer el lenguaje matemático sencillo presente en la vida cotidiana en diferentes formatos, adquiriendo vocabulario específico básico y mostrando la comprensión del mensaje.',
        },
        {
          cycle: 'TERCER',
          code: '6.1',
          description:
            'Interpretar el lenguaje matemático sencillo presente en la vida cotidiana en diferentes formatos, adquiriendo vocabulario apropiado y mostrando la comprensión del mensaje.',
        },
        {
          cycle: 'PRIMER',
          code: '6.2',
          description:
            'Explicar ideas y procesos matemáticos sencillos, los pasos seguidos en la resolución de un problema o los resultados matemáticos, de forma verbal o gráfica.',
        },
        {
          cycle: 'SEGUNDO',
          code: '6.2',
          description:
            'Explicar los procesos e ideas matemáticas, los pasos seguidos en la resolución de un problema o los resultados obtenidos, utilizando un lenguaje matemático sencillo en diferentes formatos.',
        },
        {
          cycle: 'TERCER',
          code: '6.2',
          description:
            'Comunicar en diferentes formatos las conjeturas y procesos matemáticos, utilizando lenguaje matemático adecuado.',
        },
      ],
    },
    {
      code: '7',
      name: 'Destrezas socioemocionales individuales',
      description:
        'Desarrollar destrezas personales que ayuden a identificar y gestionar emociones al enfrentarse a retos matemáticos, fomentando la confianza en las propias posibilidades, aceptando el error como parte del proceso de aprendizaje y adaptándose a las situaciones de incertidumbre, para mejorar la perseverancia y disfrutar en el aprendizaje de las matemáticas.',
      keyCompetencyCodes: ['STEM', 'CPSAA', 'CE'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '7.1',
          description:
            'Reconocer las emociones básicas propias al abordar retos matemáticos, pidiendo ayuda solo cuando sea necesario y desarrollando así la autoconfianza.',
        },
        {
          cycle: 'SEGUNDO',
          code: '7.1',
          description:
            'Identificar las emociones propias al abordar retos matemáticos, pidiendo ayuda solo cuando sea necesario y desarrollando la autonomía.',
        },
        {
          cycle: 'TERCER',
          code: '7.1',
          description:
            'Autorregular las emociones propias y reconocer algunas fortalezas y debilidades, desarrollando así la automotivación al abordar retos matemáticos.',
        },
        {
          cycle: 'PRIMER',
          code: '7.2',
          description:
            'Mostrar actitudes positivas ante retos matemáticos, reconociendo el error como una oportunidad de aprendizaje.',
        },
        {
          cycle: 'SEGUNDO',
          code: '7.2',
          description:
            'Expresar actitudes positivas ante retos matemáticos tales como el esfuerzo y la flexibilidad, haciendo uso del error como una oportunidad de aprendizaje.',
        },
        {
          cycle: 'TERCER',
          code: '7.2',
          description:
            'Elegir actitudes positivas ante retos matemáticos, tales como la perseverancia y la responsabilidad, valorando el error como una oportunidad de aprendizaje.',
        },
      ],
    },
    {
      code: '8',
      name: 'Destrezas sociales y trabajo en equipo',
      description:
        'Desarrollar destrezas sociales, reconociendo y respetando las emociones, las experiencias de las demás personas y el valor de la diversidad y participando activamente en equipos de trabajo heterogéneos con roles asignados, para construir una identidad positiva como estudiante de matemáticas, fomentar el bienestar personal y crear relaciones saludables.',
      keyCompetencyCodes: ['CCL', 'CP', 'STEM', 'CPSAA', 'CC'],
      criteria: [
        {
          cycle: 'PRIMER',
          code: '8.1',
          description:
            'Participar respetuosamente en el trabajo en equipo, partiendo del trabajo en pareja, practicando relaciones saludables basadas en la tolerancia, la igualdad y la resolución pacífica de conflictos.',
        },
        {
          cycle: 'SEGUNDO',
          code: '8.1',
          description:
            'Trabajar en equipo activa y respetuosamente, comunicándose de forma clara, reconociendo la diversidad del grupo y estableciendo relaciones saludables basadas en la igualdad y la resolución pacífica de conflictos.',
        },
        {
          cycle: 'TERCER',
          code: '8.1',
          description:
            'Trabajar en equipo activa, respetuosa y responsablemente, mostrando iniciativa, comunicándose de forma efectiva, valorando la diversidad, mostrando empatía y estableciendo relaciones saludables basadas en el respeto, la igualdad y la resolución pacífica de conflictos.',
        },
        {
          cycle: 'PRIMER',
          code: '8.2',
          description:
            'Asumir la tarea y rol asignado en el trabajo y en equipo, cumpliendo con las responsabilidades individuales y contribuyendo a la consecución de los objetivos comunes.',
        },
        {
          cycle: 'SEGUNDO',
          code: '8.2',
          description:
            'Participar en el reparto de tareas, asumiendo y respetando las responsabilidades individuales asignadas y empleando estrategias sencillas de trabajo en equipo dirigidas a la consecución de objetivos compartidos.',
        },
        {
          cycle: 'TERCER',
          code: '8.2',
          description:
            'Colaborar en el reparto de tareas, asumiendo y respetando las responsabilidades individuales asignadas y empleando estrategias de trabajo en equipo dirigidas a la consecución de objetivos compartidos.',
        },
      ],
    },
  ],
};
