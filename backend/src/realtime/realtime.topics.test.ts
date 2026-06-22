// backend/src/realtime/realtime.topics.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topicForTable, isValidTopic, ALL_TOPICS } from './realtime.topics';

test('mapea tablas conocidas a su topic', () => {
  assert.equal(topicForTable('students'), 'students');
  assert.equal(topicForTable('schedule_slots'), 'schedule_slots');
  assert.equal(topicForTable('payments'), 'payments');
  assert.equal(topicForTable('charges'), 'payments'); // charges refresca la matriz de pagos
});

test('devuelve null para tablas sin interes de UI', () => {
  assert.equal(topicForTable('audit_log'), null);
  assert.equal(topicForTable('tabla_inexistente'), null);
});

test('isValidTopic acepta solo la lista blanca', () => {
  assert.equal(isValidTopic('students'), true);
  assert.equal(isValidTopic('__proto__'), false);
  assert.equal(isValidTopic('cualquier_cosa'), false);
});

test('ALL_TOPICS no tiene duplicados', () => {
  assert.equal(new Set(ALL_TOPICS).size, ALL_TOPICS.length);
});
