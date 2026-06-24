// Helpers puros (sin React) para la selección y el cobro masivo de celdas. TS erasable.
export interface SelectedCell {
  enrollmentId: string;
  concept: string;
  period?: string;
  mm?: string;
  studentName: string;
  label: string;
}
// Clave única de una celda en la matriz: alumno + clave de columna (period o concepto).
export function cellKey(enrollmentId: string, colKey: string): string {
  return `${enrollmentId}:${colKey}`;
}

// Sólo se pueden seleccionar celdas que aplican al alumno y están sin cobrar (sin recibo o pendiente).
export function isCellSelectable(applies: boolean, status: string | undefined): boolean {
  if (!applies) return false;
  return status === undefined || status === 'pendiente';
}

// Payload para el endpoint: sólo los campos que el backend necesita.
export function buildBulkCells(
  selected: Map<string, SelectedCell>,
): Array<{ enrollmentId: string; concept: string; period?: string; mm?: string }> {
  return Array.from(selected.values()).map(c => ({
    enrollmentId: c.enrollmentId, concept: c.concept, period: c.period, mm: c.mm,
  }));
}

// Nº de alumnos distintos en la selección (para el contador "N celdas · M alumnos").
export function countSelectedStudents(selected: Map<string, SelectedCell>): number {
  return new Set(Array.from(selected.values()).map(c => c.enrollmentId)).size;
}
