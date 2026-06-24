import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cellKey, isCellSelectable, buildBulkCells, countSelectedStudents, SelectedCell } from './payments-bulk.ts';

test('cellKey combina enrollmentId y colKey', () => {
  assert.equal(cellKey('e1', '2026-09'), 'e1:2026-09');
  assert.equal(cellKey('e1', 'matricula'), 'e1:matricula');
});

test('isCellSelectable: sólo pendiente o sin recibo, y debe aplicar', () => {
  assert.equal(isCellSelectable(true, undefined), true);   // sin recibo (+)
  assert.equal(isCellSelectable(true, 'pendiente'), true);  // €
  assert.equal(isCellSelectable(true, 'pagado'), false);    // ✓
  assert.equal(isCellSelectable(true, 'exento'), false);    // x
  assert.equal(isCellSelectable(true, 'anulado'), false);   // ∅
  assert.equal(isCellSelectable(false, undefined), false);  // no aplica (—)
});

test('buildBulkCells extrae sólo los campos del payload', () => {
  const m = new Map<string, SelectedCell>([
    ['e1:2026-09', { enrollmentId: 'e1', concept: 'mensualidad', period: '2026-09', mm: '09', studentName: 'Ana', label: 'Sep' }],
    ['e2:matricula', { enrollmentId: 'e2', concept: 'matricula', studentName: 'Luis', label: 'Matrícula' }],
  ]);
  assert.deepEqual(buildBulkCells(m), [
    { enrollmentId: 'e1', concept: 'mensualidad', period: '2026-09', mm: '09' },
    { enrollmentId: 'e2', concept: 'matricula', period: undefined, mm: undefined },
  ]);
});

test('countSelectedStudents cuenta alumnos distintos', () => {
  const m = new Map<string, SelectedCell>([
    ['e1:2026-09', { enrollmentId: 'e1', concept: 'mensualidad', period: '2026-09', studentName: 'Ana', label: 'Sep' }],
    ['e1:2026-10', { enrollmentId: 'e1', concept: 'mensualidad', period: '2026-10', studentName: 'Ana', label: 'Oct' }],
    ['e2:matricula', { enrollmentId: 'e2', concept: 'matricula', studentName: 'Luis', label: 'Matrícula' }],
  ]);
  assert.equal(countSelectedStudents(m), 2);
});
