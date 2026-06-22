// backend/src/realtime/presence.registry.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PresenceRegistry } from './presence.registry';

test('join y list', () => {
  const r = new PresenceRegistry();
  r.join('student:1', 'sockA', 'u1', 'Ana');
  r.join('student:1', 'sockB', 'u2', 'Beto');
  const present = r.list('student:1').map(p => p.displayName).sort();
  assert.deepEqual(present, ['Ana', 'Beto']);
});

test('leave devuelve los rooms afectados y limpia', () => {
  const r = new PresenceRegistry();
  r.join('student:1', 'sockA', 'u1', 'Ana');
  r.join('view:pagos', 'sockA', 'u1', 'Ana');
  const affected = r.leave('sockA').sort();
  assert.deepEqual(affected, ['student:1', 'view:pagos']);
  assert.deepEqual(r.list('student:1'), []);
});

test('setEditing marca el targetKey', () => {
  const r = new PresenceRegistry();
  r.join('student:1', 'sockA', 'u1', 'Ana');
  r.setEditing('sockA', 'student:1', 'nombre');
  assert.equal(r.list('student:1')[0].editing, 'nombre');
  r.setEditing('sockA', 'student:1', null);
  assert.equal(r.list('student:1')[0].editing, null);
});

test('un mismo usuario en dos pestanas se deduplica por userId', () => {
  const r = new PresenceRegistry();
  r.join('student:1', 'sockA', 'u1', 'Ana');
  r.join('student:1', 'sockB', 'u1', 'Ana');
  assert.equal(r.list('student:1').length, 1);
});
