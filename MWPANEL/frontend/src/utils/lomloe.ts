/**
 * Conversión de una calificación numérica (escala 0-100, aprobado = 50) a la
 * calificación cualitativa oficial LOMLOE, según la etapa educativa.
 *
 * Es el ESPEJO EXACTO de `lomloeConversion` en el backend
 * (academic-records/services/report-generator.service.ts), para que el boletín
 * PDF y la web muestren siempre la misma conversión.
 *
 * Bandas (Primaria / Secundaria / por defecto):
 *   < 50  Insuficiente · < 60 Suficiente · < 70 Bien · < 90 Notable · Sobresaliente
 * Infantil: < 50 No conseguido · < 70 En proceso · Conseguido
 * Bachillerato: escala 0-10 con un decimal (p.ej. "7,6")
 */
export function lomloeConversion(
  value: number | string | null | undefined,
  etapa?: string | null,
): string {
  if (value === null || value === undefined || value === '') return '—';
  const v = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(v)) return '—';

  const e = (etapa || '').toLowerCase();
  if (e.includes('infantil')) {
    if (v < 50) return 'No conseguido';
    if (v < 70) return 'En proceso';
    return 'Conseguido';
  }
  if (e.includes('bachiller')) {
    return (v / 10).toFixed(1).replace('.', ',');
  }
  // Primaria / Secundaria (ESO) y por defecto
  if (v < 50) return 'Insuficiente';
  if (v < 60) return 'Suficiente';
  if (v < 70) return 'Bien';
  if (v < 90) return 'Notable';
  return 'Sobresaliente';
}

/**
 * Color de marca coherente para la calificación cualitativa LOMLOE (escala 0-100).
 * Independiente de la etapa (para bachillerato/infantil se usa el mismo criterio
 * de umbrales sobre el 0-100 subyacente).
 */
export function lomloeColor(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '#8c8c8c';
  const v = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(v)) return '#8c8c8c';
  if (v < 50) return '#ff4d4f'; // Insuficiente — rojo
  if (v < 60) return '#fa8c16'; // Suficiente — naranja
  if (v < 70) return '#faad14'; // Bien — ámbar
  if (v < 90) return '#1890ff'; // Notable — azul
  return '#52c41a'; // Sobresaliente — verde
}
