import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cellKey, dedupeCells, summarizeBulkOutcomes } from './payments.bulk';

test('cellKey distingue concepto y periodo, ignora indefinidos como vacío', () => {
  assert.equal(cellKey({ enrollmentId: 'e1', concept: 'mensualidad', period: '2026-09' }), 'e1|mensualidad|2026-09');
  assert.equal(cellKey({ enrollmentId: 'e1', concept: 'matricula' }), 'e1|matricula|');
  assert.equal(cellKey({ enrollmentId: 'e1', concept: 'matricula', period: null }), 'e1|matricula|');
});

test('dedupeCells elimina duplicados por clave conservando el orden', () => {
  const out = dedupeCells([
    { enrollmentId: 'e1', concept: 'mensualidad', period: '2026-09' },
    { enrollmentId: 'e2', concept: 'matricula' },
    { enrollmentId: 'e1', concept: 'mensualidad', period: '2026-09' },
  ]);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map(c => c.enrollmentId), ['e1', 'e2']);
});

test('summarizeBulkOutcomes cuenta por categoría y agrupa notfound en skipped', () => {
  const s = summarizeBulkOutcomes(['paid', 'paid', 'exempted', 'skipped', 'notfound']);
  assert.deepEqual(s, { paid: 2, exempted: 1, skipped: 2 });
});
