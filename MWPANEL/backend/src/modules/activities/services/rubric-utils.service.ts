import { Injectable } from '@nestjs/common';
import { CreateRubricDto, CreateRubricCriterionDto, CreateRubricLevelDto, CreateRubricCellDto } from '../dto/create-rubric.dto';

@Injectable()
export class RubricUtilsService {
  
  /**
   * Genera colores automáticamente para los niveles de la rúbrica
   * Gradiente de rojo (#FF4C4C) a verde (#4CAF50)
   */
  generateLevelColors(levelCount: number): string[] {
    if (levelCount === 1) {
      return ['#4CAF50']; // Verde para un solo nivel
    }

    const colors: string[] = [];
    const startColor = { r: 255, g: 76, b: 76 }; // Rojo #FF4C4C
    const endColor = { r: 76, g: 175, b: 80 };   // Verde #4CAF50

    for (let i = 0; i < levelCount; i++) {
      const ratio = i / (levelCount - 1);
      
      const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
      const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
      const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
      
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      colors.push(hex.toUpperCase());
    }

    return colors;
  }

  /**
   * Parsea una tabla en formato Markdown con competencias asociadas
   */
  parseMarkdownTableWithCompetencies(markdownData: string): { criteria: CreateRubricCriterionDto[], levels: CreateRubricLevelDto[], cells: CreateRubricCellDto[] } {
    console.log('🚨🚨🚨 COMPETENCIES PARSING METHOD CALLED - VERSION 3.0 🚨🚨🚨');
    console.log('🚨🚨🚨 RAW MARKDOWN DATA:', markdownData);
    const lines = markdownData.trim().split('\n').map(line => line.trim());
    
    // Filtrar líneas vacías y separadores
    const dataLines = lines.filter(line => {
      if (line.length === 0) return false;
      const cleanLine = line.replace(/\|/g, '').trim();
      const isSeparatorLine = /^[\s\-:]+$/.test(cleanLine);
      return !isSeparatorLine;
    });

    if (dataLines.length < 2) {
      throw new Error('Formato de tabla inválido. Se requiere al menos una fila de encabezados y una fila de datos.');
    }

    // Parsear encabezados - estructura con competencias: 
    // | Competencia | Criterios | Peso (%) | Nivel1 | Nivel2 | ... |
    const headerCells = this.parseTableRow(dataLines[0]);
    
    console.log('🔥 CRITICAL DEBUG - headerCells:', headerCells);
    console.log('🔥 CRITICAL DEBUG - headerCells.length:', headerCells.length);
    
    // FORCE COMPETENCIES FORMAT: Always skip first 3 columns
    // Expected: ["Competencia", "Criterios", "Peso (%)", "Nulo (0)", "Mejorable (2.5)", ...]
    if (headerCells.length < 4) {
      throw new Error(`Formato inválido: se esperan al menos 4 columnas (Competencia, Criterios, Peso, Niveles...), pero se encontraron ${headerCells.length}`);
    }
    
    // FORCE: Extract only levels, skip headers
    const levelNames = headerCells.slice(3); // ALWAYS skip first 3 columns for competencies
    
    console.log('🔥 CRITICAL DEBUG - extracted levelNames (after slice(3)):', levelNames);
    console.log('🔥 CRITICAL DEBUG - levelNames.length:', levelNames.length);

    if (levelNames.length === 0) {
      throw new Error('Se requiere al menos un nivel de desempeño. Formato esperado: | Competencia | Criterios | Peso (%) | Nivel1 | Nivel2 | ... |');
    }

    console.log('🔥 CREATING LEVELS FOR COMPETENCIES with enhanced score extraction...');
    
    // Crear niveles
    const colors = this.generateLevelColors(levelNames.length);
    const levels: CreateRubricLevelDto[] = levelNames.map((name, index) => {
      const trimmedName = name.trim();
      
      console.log(`🔥 PROCESSING LEVEL ${index}: "${trimmedName}"`);
      
      // Extract score from parentheses - MORE AGGRESSIVE REGEX
      let scoreValue = index; // Start from 0 for "Nulo (0)"
      
      // Try multiple regex patterns to extract score
      const patterns = [
        /\(([0-9]+\.?[0-9]*)\)/, // Standard: (10), (2.5)
        /\((\d+(?:\.\d+)?)\)/,   // Alternative: more specific
        /\(([\d.]+)\)/,          // Broad: any digits and dots
      ];
      
      let found = false;
      for (const pattern of patterns) {
        const scoreMatch = trimmedName.match(pattern);
        if (scoreMatch) {
          const extractedScore = parseFloat(scoreMatch[1]);
          console.log(`🔥 FOUND SCORE with pattern ${pattern.source}: "${scoreMatch[1]}" -> ${extractedScore}`);
          if (!isNaN(extractedScore)) {
            scoreValue = extractedScore;
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        console.log(`🔥 NO SCORE FOUND in "${trimmedName}", using index: ${scoreValue}`);
      } else {
        console.log(`🔥 FINAL SCORE for "${trimmedName}": ${scoreValue}`);
      }

      return {
        name: trimmedName,
        description: `Nivel ${index + 1}: ${trimmedName}`,
        order: index,
        scoreValue: scoreValue, // Usar valor extraído o incremental
        color: colors[index],
      };
    });

    // Parsear filas de datos
    const criteria: CreateRubricCriterionDto[] = [];
    const cells: CreateRubricCellDto[] = [];
    const defaultWeight = 1 / (dataLines.length - 1);

    for (let i = 1; i < dataLines.length; i++) {
      const row = this.parseTableRow(dataLines[i]);
      
      if (row.length < 3) {
        continue; // Saltar filas incompletas
      }

      const rawCompetency = row[0].trim(); // Primera columna según header
      const rawCriterionName = row[1].trim(); // Segunda columna según header
      
      // DEBUG: Log para verificar la interpretación de columnas
      console.log(`[DEBUG] Markdown Row ${i}: rawCompetency="${rawCompetency}", rawCriterionName="${rawCriterionName}"`);
      
      // SMART FIX: Auto-detectar si los datos están intercambiados
      // Si la "competencia" es muy larga y el "criterio" es muy corto (siglas), intercambiar
      const isDataSwapped = rawCriterionName.length <= 10 && rawCompetency.length > 20;
      const competency = isDataSwapped ? rawCriterionName : rawCompetency;
      const criterionName = isDataSwapped ? rawCompetency : rawCriterionName;
      
      console.log(`[DEBUG] Final interpretation: competency="${competency}", criterionName="${criterionName}"`);

      // Extraer peso de la columna "Peso (%)" (columna índice 2)
      let weight = defaultWeight;
      if (row.length > 2) {
        const weightStr = row[2].replace('%', '').trim();
        const parsedWeight = parseFloat(weightStr);
        if (!isNaN(parsedWeight)) {
          weight = parsedWeight / 100; // Convertir porcentaje a decimal
          console.log(`[DEBUG] Extracted weight from column 2: "${row[2]}" -> ${weight} (${parsedWeight}%)`);
        } else {
          console.log(`[DEBUG] Could not parse weight "${row[2]}", using default: ${weight}`);
        }
      }

      // Extraer contenido de celdas - comenzar desde índice 3 (después de Competencia, Criterios, Peso)
      const cellStartIndex = 3;
      const cellContents = row.slice(cellStartIndex);

      // Crear criterio con el nombre real (no la competencia)
      const criterion: CreateRubricCriterionDto = {
        name: criterionName, // Usar el criterio real corregido
        description: `${criterionName} (${competency})`, // Incluir la competencia en la descripción
        order: i - 1,
        weight: weight,
      };
      criteria.push(criterion);

      // Crear celdas para este criterio
      for (let j = 0; j < Math.min(cellContents.length, levels.length); j++) {
        const cell: CreateRubricCellDto = {
          criterionId: `criterion_${i - 1}`,
          levelId: `level_${j}`,
          content: cellContents[j].trim(),
        };
        cells.push(cell);
      }
    }

    return { criteria, levels, cells };
  }

  /**
   * Parsea una tabla en formato Markdown y la convierte en datos de rúbrica
   */
  parseMarkdownTable(markdownData: string): { criteria: CreateRubricCriterionDto[], levels: CreateRubricLevelDto[], cells: CreateRubricCellDto[] } {
    console.log('⚠️⚠️⚠️ REGULAR PARSING METHOD CALLED - This should NOT be called for competencies ⚠️⚠️⚠️');
    const lines = markdownData.trim().split('\n').map(line => line.trim());
    
    // Filtrar líneas vacías y separadores
    const dataLines = lines.filter(line => {
      if (line.length === 0) return false;
      
      // Excluir líneas que contienen solo guiones, espacios, dos puntos y pipes
      // Ejemplos a excluir: |---|---|, |:--:|:--:|, | --- | --- |
      const cleanLine = line.replace(/\|/g, '').trim();
      const isSeparatorLine = /^[\s\-:]+$/.test(cleanLine);
      
      return !isSeparatorLine;
    });

    if (dataLines.length < 2) {
      throw new Error('Formato de tabla inválido. Se requiere al menos una fila de encabezados y una fila de datos.');
    }

    // Parsear encabezados (primera línea)
    const headerCells = this.parseTableRow(dataLines[0]);
    const criterionHeader = headerCells[0]; // Primera columna es para criterios
    
    // Detectar si hay columna de peso
    const hasWeightColumn = headerCells.length > 2 && 
      (headerCells[1].toLowerCase().includes('peso') || headerCells[1].includes('%'));
    
    let levelNames: string[];
    let weightColumnIndex = -1;
    
    if (hasWeightColumn) {
      weightColumnIndex = 1;
      levelNames = headerCells.slice(2); // Saltar "Criterio" y "Peso (%)"
    } else {
      levelNames = headerCells.slice(1); // Solo saltar "Criterio"
    }

    if (levelNames.length === 0) {
      throw new Error('Se requiere al menos un nivel de desempeño.');
    }

    // Crear niveles
    const colors = this.generateLevelColors(levelNames.length);
    const levels: CreateRubricLevelDto[] = levelNames.map((name, index) => {
      const trimmedName = name.trim();
      
      // Extraer valor de puntuación si está entre paréntesis (ej: "Excelente (10)" -> 10)
      let scoreValue = index + 1; // Valor por defecto incremental
      
      console.log(`[DEBUG] Processing level: "${trimmedName}", index: ${index}, default scoreValue: ${scoreValue}`);
      
      const scoreMatch = trimmedName.match(/\(([0-9]+\.?[0-9]*)\)/);
      if (scoreMatch) {
        const extractedScore = parseFloat(scoreMatch[1]);
        console.log(`[DEBUG] Found score in parentheses: "${scoreMatch[1]}" -> ${extractedScore}`);
        if (!isNaN(extractedScore)) {
          scoreValue = extractedScore;
          console.log(`[DEBUG] Using extracted scoreValue: ${scoreValue}`);
        }
      } else {
        console.log(`[DEBUG] No score found in parentheses, using default: ${scoreValue}`);
      }

      return {
        name: trimmedName,
        description: `Nivel ${index + 1}: ${trimmedName}`,
        order: index,
        scoreValue: scoreValue, // Usar valor extraído o incremental
        color: colors[index],
      };
    });

    // Parsear filas de datos
    const criteria: CreateRubricCriterionDto[] = [];
    const cells: CreateRubricCellDto[] = [];
    const defaultWeight = 1 / (dataLines.length - 1); // Peso uniforme por defecto

    for (let i = 1; i < dataLines.length; i++) {
      const row = this.parseTableRow(dataLines[i]);
      
      if (row.length < 2) {
        continue; // Saltar filas incompletas
      }

      const criterionName = row[0].trim();
      
      // Extraer peso si existe columna de peso
      let weight = defaultWeight;
      if (hasWeightColumn && row.length > weightColumnIndex) {
        const weightStr = row[weightColumnIndex].replace('%', '').trim();
        const parsedWeight = parseFloat(weightStr);
        if (!isNaN(parsedWeight)) {
          weight = parsedWeight / 100; // Convertir porcentaje a decimal
        }
      }
      
      // Extraer contenido de celdas
      const cellStartIndex = hasWeightColumn ? 2 : 1;
      const cellContents = row.slice(cellStartIndex);

      // Crear criterio
      const criterion: CreateRubricCriterionDto = {
        name: criterionName,
        description: `Criterio: ${criterionName}`,
        order: i - 1,
        weight: weight,
      };
      criteria.push(criterion);

      // Crear celdas para este criterio
      for (let j = 0; j < Math.min(cellContents.length, levels.length); j++) {
        const cell: CreateRubricCellDto = {
          criterionId: `criterion_${i - 1}`, // Placeholder que se resolverá en el servicio
          levelId: `level_${j}`, // Placeholder que se resolverá en el servicio
          content: cellContents[j].trim(),
        };
        cells.push(cell);
      }
    }

    return { criteria, levels, cells };
  }

  /**
   * Parsea una tabla en formato CSV con competencias asociadas
   */
  parseCSVTableWithCompetencies(csvData: string): { criteria: CreateRubricCriterionDto[], levels: CreateRubricLevelDto[], cells: CreateRubricCellDto[] } {
    const lines = csvData.trim().split('\n').map(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('Formato CSV inválido. Se requiere al menos una fila de encabezados y una fila de datos.');
    }

    // Parsear encabezados - estructura con competencias:
    // Competencia,Criterios,Peso (%),Nivel1,Nivel2,...
    const headers = this.parseCSVRow(lines[0]);
    
    // Detectar columna de peso (siempre debería estar en posición 2 para competencias)
    const hasWeightColumn = headers.length > 3 && 
      (headers[2].toLowerCase().includes('peso') || headers[2].includes('%'));
    
    let levelNames: string[];
    
    if (hasWeightColumn) {
      levelNames = headers.slice(3); // Saltar "Competencia", "Criterios", "Peso (%)"
    } else {
      levelNames = headers.slice(2); // Saltar "Competencia", "Criterios"
    }

    if (levelNames.length === 0) {
      throw new Error('Se requiere al menos un nivel de desempeño.');
    }

    // Crear niveles
    const colors = this.generateLevelColors(levelNames.length);
    const levels: CreateRubricLevelDto[] = levelNames.map((name, index) => {
      const trimmedName = name.trim();
      
      // Extraer valor de puntuación si está entre paréntesis (ej: "Excelente (10)" -> 10)
      let scoreValue = index + 1; // Valor por defecto incremental
      
      console.log(`[DEBUG] Processing level: "${trimmedName}", index: ${index}, default scoreValue: ${scoreValue}`);
      
      const scoreMatch = trimmedName.match(/\(([0-9]+\.?[0-9]*)\)/);
      if (scoreMatch) {
        const extractedScore = parseFloat(scoreMatch[1]);
        console.log(`[DEBUG] Found score in parentheses: "${scoreMatch[1]}" -> ${extractedScore}`);
        if (!isNaN(extractedScore)) {
          scoreValue = extractedScore;
          console.log(`[DEBUG] Using extracted scoreValue: ${scoreValue}`);
        }
      } else {
        console.log(`[DEBUG] No score found in parentheses, using default: ${scoreValue}`);
      }

      return {
        name: trimmedName,
        description: `Nivel ${index + 1}: ${trimmedName}`,
        order: index,
        scoreValue: scoreValue, // Usar valor extraído o incremental
        color: colors[index],
      };
    });

    // Parsear filas de datos
    const criteria: CreateRubricCriterionDto[] = [];
    const cells: CreateRubricCellDto[] = [];
    const defaultWeight = 1 / (lines.length - 1);

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVRow(lines[i]);
      
      if (row.length < 3) {
        continue; // Saltar filas incompletas
      }

      const rawCompetency = row[0].trim(); // Primera columna según header
      const rawCriterionName = row[1].trim(); // Segunda columna según header
      
      // DEBUG: Log para verificar la interpretación de columnas
      console.log(`[DEBUG] CSV Row ${i}: rawCompetency="${rawCompetency}", rawCriterionName="${rawCriterionName}"`);
      
      // SMART FIX: Auto-detectar si los datos están intercambiados
      // Si la "competencia" es muy larga y el "criterio" es muy corto (siglas), intercambiar
      const isDataSwapped = rawCriterionName.length <= 10 && rawCompetency.length > 20;
      const competency = isDataSwapped ? rawCriterionName : rawCompetency;
      const criterionName = isDataSwapped ? rawCompetency : rawCriterionName;
      
      console.log(`[DEBUG] CSV Final interpretation: competency="${competency}", criterionName="${criterionName}"`);
      
      // Extraer peso
      let weight = defaultWeight;
      if (hasWeightColumn && row.length > 2) {
        const weightStr = row[2].replace('%', '').trim();
        const parsedWeight = parseFloat(weightStr);
        if (!isNaN(parsedWeight)) {
          weight = parsedWeight / 100;
        }
      }
      
      // Extraer contenido de celdas
      const cellStartIndex = hasWeightColumn ? 3 : 2;
      const cellContents = row.slice(cellStartIndex);

      // Crear criterio con el nombre real (no la competencia)
      const criterion: CreateRubricCriterionDto = {
        name: criterionName, // Usar el criterio real corregido
        description: `${criterionName} (${competency})`, // Incluir la competencia en la descripción
        order: i - 1,
        weight: weight,
      };
      criteria.push(criterion);

      // Crear celdas para este criterio
      for (let j = 0; j < Math.min(cellContents.length, levels.length); j++) {
        const cell: CreateRubricCellDto = {
          criterionId: `criterion_${i - 1}`,
          levelId: `level_${j}`,
          content: cellContents[j].trim(),
        };
        cells.push(cell);
      }
    }

    return { criteria, levels, cells };
  }

  /**
   * Parsea una tabla en formato CSV
   */
  parseCSVTable(csvData: string): { criteria: CreateRubricCriterionDto[], levels: CreateRubricLevelDto[], cells: CreateRubricCellDto[] } {
    const lines = csvData.trim().split('\n').map(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('Formato CSV inválido. Se requiere al menos una fila de encabezados y una fila de datos.');
    }

    // Parsear encabezados
    const headers = this.parseCSVRow(lines[0]);
    
    // Detectar si hay columna de peso
    const hasWeightColumn = headers.length > 2 && 
      (headers[1].toLowerCase().includes('peso') || headers[1].includes('%'));
    
    let levelNames: string[];
    let weightColumnIndex = -1;
    
    if (hasWeightColumn) {
      weightColumnIndex = 1;
      levelNames = headers.slice(2); // Saltar "Criterio" y "Peso (%)"
    } else {
      levelNames = headers.slice(1); // Solo saltar "Criterio"
    }

    if (levelNames.length === 0) {
      throw new Error('Se requiere al menos un nivel de desempeño.');
    }

    // Crear niveles
    const colors = this.generateLevelColors(levelNames.length);
    const levels: CreateRubricLevelDto[] = levelNames.map((name, index) => {
      const trimmedName = name.trim();
      
      // Extraer valor de puntuación si está entre paréntesis (ej: "Excelente (10)" -> 10)
      let scoreValue = index + 1; // Valor por defecto incremental
      
      console.log(`[DEBUG] Processing level: "${trimmedName}", index: ${index}, default scoreValue: ${scoreValue}`);
      
      const scoreMatch = trimmedName.match(/\(([0-9]+\.?[0-9]*)\)/);
      if (scoreMatch) {
        const extractedScore = parseFloat(scoreMatch[1]);
        console.log(`[DEBUG] Found score in parentheses: "${scoreMatch[1]}" -> ${extractedScore}`);
        if (!isNaN(extractedScore)) {
          scoreValue = extractedScore;
          console.log(`[DEBUG] Using extracted scoreValue: ${scoreValue}`);
        }
      } else {
        console.log(`[DEBUG] No score found in parentheses, using default: ${scoreValue}`);
      }

      return {
        name: trimmedName,
        description: `Nivel ${index + 1}: ${trimmedName}`,
        order: index,
        scoreValue: scoreValue, // Usar valor extraído o incremental
        color: colors[index],
      };
    });

    // Parsear filas de datos
    const criteria: CreateRubricCriterionDto[] = [];
    const cells: CreateRubricCellDto[] = [];
    const defaultWeight = 1 / (lines.length - 1);

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVRow(lines[i]);
      
      if (row.length < 2) {
        continue;
      }

      const criterionName = row[0].trim();
      
      // Extraer peso si existe columna de peso
      let weight = defaultWeight;
      if (hasWeightColumn && row.length > weightColumnIndex) {
        const weightStr = row[weightColumnIndex].replace('%', '').trim();
        const parsedWeight = parseFloat(weightStr);
        if (!isNaN(parsedWeight)) {
          weight = parsedWeight / 100; // Convertir porcentaje a decimal
        }
      }
      
      // Extraer contenido de celdas
      const cellStartIndex = hasWeightColumn ? 2 : 1;
      const cellContents = row.slice(cellStartIndex);

      const criterion: CreateRubricCriterionDto = {
        name: criterionName,
        description: `Criterio: ${criterionName}`,
        order: i - 1,
        weight: weight,
      };
      criteria.push(criterion);

      for (let j = 0; j < Math.min(cellContents.length, levels.length); j++) {
        const cell: CreateRubricCellDto = {
          criterionId: `criterion_${i - 1}`,
          levelId: `level_${j}`,
          content: cellContents[j].trim(),
        };
        cells.push(cell);
      }
    }

    return { criteria, levels, cells };
  }

  /**
   * Parsea una fila de tabla Markdown
   */
  private parseTableRow(row: string): string[] {
    // Remover | del inicio y final, luego dividir por |
    const cleanRow = row.replace(/^\|/, '').replace(/\|$/, '');
    return cleanRow.split('|').map(cell => cell.trim());
  }

  /**
   * Parsea una fila CSV teniendo en cuenta comillas y comas dentro de campos
   */
  private parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Calcula la puntuación total de una evaluación con rúbrica
   */
  calculateRubricScore(
    criterionAssessments: Array<{
      criterion: { weight: number };
      selectedLevel: { scoreValue: number };
    }>,
    maxScore: number = 100,
    allLevels?: Array<{ scoreValue: number }>
  ): { totalScore: number; maxPossibleScore: number; percentage: number } {
    let weightedSum = 0;
    let maxPossibleWeightedSum = 0;
    
    // FIXED: Use the maximum possible level value from all rubric levels, not just selected ones
    let maxPossibleLevelValue: number;
    if (allLevels && allLevels.length > 0) {
      maxPossibleLevelValue = Math.max(...allLevels.map(level => level.scoreValue));
    } else {
      // Fallback: if allLevels not provided, assume traditional 4-level scale
      maxPossibleLevelValue = Math.max(...criterionAssessments.map(ca => ca.selectedLevel.scoreValue));
      console.warn('[RUBRIC CALC] allLevels parameter not provided, using fallback calculation');
    }
    
    for (const assessment of criterionAssessments) {
      const weight = assessment.criterion.weight;
      const selectedLevelValue = assessment.selectedLevel.scoreValue;
      
      weightedSum += weight * selectedLevelValue;
      maxPossibleWeightedSum += weight * maxPossibleLevelValue;
    }
    
    const percentage = maxPossibleWeightedSum > 0 ? (weightedSum / maxPossibleWeightedSum) * 100 : 0;
    const totalScore = (percentage / 100) * maxScore;
    const maxPossibleScore = maxScore;
    
    return {
      totalScore: Math.round(totalScore * 100) / 100,
      maxPossibleScore,
      percentage: Math.round(percentage * 10) / 10,
    };
  }

  /**
   * Calcula la puntuación máxima posible de una rúbrica
   * En el sistema de MW Panel, las rúbricas siempre tienen un máximo de 100 puntos
   */
  calculateMaxScore(
    criteria: Array<{ weight: number }>,
    levels: Array<{ scoreValue: number }>
  ): number {
    // Las rúbricas siempre tienen un máximo de 100 puntos
    // Los niveles (1,2,3,4) representan porcentajes de este máximo
    // Nivel 4 en todos los criterios = 100 puntos (100%)
    return 100;
  }

  /**
   * Valida que los pesos de los criterios sumen 1 (100%)
   */
  validateCriteriaWeights(criteria: CreateRubricCriterionDto[]): boolean {
    const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
    return Math.abs(totalWeight - 1) < 0.01; // Tolerancia de 1%
  }

  /**
   * Normaliza los pesos para que sumen exactamente 1
   */
  normalizeCriteriaWeights(criteria: CreateRubricCriterionDto[]): CreateRubricCriterionDto[] {
    const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
    
    if (totalWeight === 0) {
      // Si todos los pesos son 0, asignar peso uniforme
      const uniformWeight = 1 / criteria.length;
      return criteria.map(criterion => ({ ...criterion, weight: uniformWeight }));
    }
    
    // Normalizar para que sumen 1
    return criteria.map(criterion => ({
      ...criterion,
      weight: criterion.weight / totalWeight,
    }));
  }
}