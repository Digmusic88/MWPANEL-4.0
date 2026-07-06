/**
 * @archivo: numberFormat.ts
 * @función: Utilidades para formateo consistente de números en toda la aplicación
 * @regla: Máximo 1 decimal para evitar números periódicos
 * @fecha: 2025-07-18
 */

/**
 * Formatea un número limitando a máximo 1 decimal
 * @param value - Número a formatear
 * @param maxDecimals - Máximo número de decimales (por defecto 1)
 * @returns String formateado
 */
export const formatNumber = (value: number | string | null | undefined, maxDecimals: number = 1): string => {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue) || numValue === null) {
    return '0';
  }
  
  return numValue.toFixed(maxDecimals);
};

/**
 * Formatea un porcentaje limitando a máximo 1 decimal
 * @param value - Valor numérico del porcentaje (0-100)
 * @param maxDecimals - Máximo número de decimales (por defecto 1)
 * @returns String formateado con símbolo %
 */
export const formatPercentage = (value: number | string, maxDecimals: number = 1): string => {
  const formatted = formatNumber(value, maxDecimals);
  return `${formatted}%`;
};

/**
 * Formatea una calificación con su escala (ej: 8.5/10)
 * @param grade - Calificación obtenida
 * @param maxGrade - Calificación máxima
 * @param maxDecimals - Máximo número de decimales (por defecto 1)
 * @returns String formateado
 */
export const formatGrade = (
  grade: number | string, 
  maxGrade: number | string, 
  maxDecimals: number = 1
): string => {
  const formattedGrade = formatNumber(grade, maxDecimals);
  const formattedMax = formatNumber(maxGrade, maxDecimals);
  return `${formattedGrade}/${formattedMax}`;
};

/**
 * Formatea un porcentaje a partir de una fracción
 * @param numerator - Numerador
 * @param denominator - Denominador
 * @param maxDecimals - Máximo número de decimales (por defecto 1)
 * @returns String formateado con símbolo %
 */
export const formatPercentageFromFraction = (
  numerator: number | string,
  denominator: number | string,
  maxDecimals: number = 1
): string => {
  const num = typeof numerator === 'string' ? parseFloat(numerator) : numerator;
  const den = typeof denominator === 'string' ? parseFloat(denominator) : denominator;
  
  if (isNaN(num) || isNaN(den) || den === 0) {
    return '0.0%';
  }
  
  const percentage = (num / den) * 100;
  return formatPercentage(percentage, maxDecimals);
};

/**
 * Formatea duración en minutos a formato legible
 * @param minutes - Minutos
 * @param maxDecimals - Máximo número de decimales (por defecto 1)
 * @returns String formateado
 */
export const formatDuration = (minutes: number | string, maxDecimals: number = 1): string => {
  const mins = typeof minutes === 'string' ? parseFloat(minutes) : minutes;
  
  if (isNaN(mins)) {
    return '0.0 min';
  }
  
  if (mins >= 60) {
    const hours = mins / 60;
    return `${formatNumber(hours, maxDecimals)} h`;
  }
  
  return `${formatNumber(mins, maxDecimals)} min`;
};

/**
 * Formatea números grandes con separadores de miles
 * @param value - Número a formatear
 * @param maxDecimals - Máximo número de decimales (por defecto 1)
 * @returns String formateado con separadores
 */
export const formatNumberWithSeparators = (value: number | string, maxDecimals: number = 1): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }
  
  return numValue.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  });
};

/**
 * Formats a rubric grade safely, handling null, undefined, and NaN values
 * @param grade - The grade value to format  
 * @param isRubric - Whether this is a rubric-based grade (uses /100)
 * @param maxPoints - Maximum points for non-rubric grades
 * @returns Formatted grade string or fallback text
 */
export const formatTaskGrade = (
  grade: number | string | null | undefined, 
  isRubric: boolean = false,
  maxPoints: number = 10
): string => {
  // Handle null, undefined values first
  if (grade === null || grade === undefined) {
    return isRubric ? 'Pendiente de calificación' : 'Sin calificación';
  }
  
  // Convert to number if it's a string (API might return strings)
  const numericGrade = typeof grade === 'string' ? parseFloat(grade) : grade;
  
  // Handle NaN values after conversion
  if (isNaN(numericGrade)) {
    return isRubric ? 'Pendiente de calificación' : 'Sin calificación';
  }
  
  // Format the number with 2 decimal places max
  const formattedGrade = Math.round(numericGrade * 100) / 100;
  
  return isRubric ? `${formattedGrade}/100` : `${formattedGrade}/${maxPoints}`;
};

/**
 * Funciones de conveniencia para casos comunes
 */
export const formatGPA = (value: number | string): string => formatNumber(value, 1);
export const formatScore = (value: number | string): string => formatNumber(value, 1);
export const formatAverage = (value: number | string): string => formatNumber(value, 1);
export const formatWeight = (value: number | string): string => formatPercentage(value, 1);

/**
 * Validador de números para entrada de usuario
 * @param value - Valor a validar
 * @param maxDecimals - Máximo número de decimales permitidos
 * @returns true si es válido, false si no
 */
export const isValidNumber = (value: string, maxDecimals: number = 1): boolean => {
  const decimalPattern = new RegExp(`^\\d+(\\.\\d{1,${maxDecimals}})?$`);
  return decimalPattern.test(value);
};