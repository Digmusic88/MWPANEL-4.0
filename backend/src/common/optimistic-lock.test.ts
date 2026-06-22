// backend/src/common/optimistic-lock.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVersionedUpdate } from './optimistic-lock';

test('genera SQL con WHERE id y updated_at y RETURNING', () => {
  const { sql } = buildVersionedUpdate('students', ['first_name', 'last_name'], 'ID', '2026-06-22T10:00:00Z');
  assert.match(sql, /UPDATE secretaria\.students SET first_name = \$1, last_name = \$2/);
  assert.match(sql, /WHERE id = \$3 AND updated_at = \$4/);
  assert.match(sql, /RETURNING updated_at/);
});

test('coloca id y updated_at al final de params (tras los valores del set)', () => {
  const { sql } = buildVersionedUpdate('groups', ['name'], 'G', 'TS');
  assert.match(sql, /SET name = \$1 WHERE id = \$2 AND updated_at = \$3/);
});
