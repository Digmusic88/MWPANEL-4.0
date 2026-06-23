import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMockMetrics, classifyPart, RawCall } from './mock-metrics';

test('classifyPart distingue scored/pending/np', () => {
  assert.equal(classifyPart({ part: 'Reading', score: 80, status: 'PRESENTED' }), 'scored');
  assert.equal(classifyPart({ part: 'Reading', score: null, status: 'PRESENTED' }), 'pending');
  assert.equal(classifyPart({ part: 'Reading', score: null, status: 'NOT_PRESENTED' }), 'np');
  assert.equal(classifyPart({ part: 'Reading', score: null, status: 'ABSENT' }), 'np');
});

test('overall por convocatoria = media solo de partes con nota; NP no cuenta', () => {
  const calls: RawCall[] = [{
    examName: 'Mock 1', examDate: '2026-01-10',
    parts: [
      { part: 'Reading', score: 80, status: 'PRESENTED' },
      { part: 'Writing', score: 60, status: 'PRESENTED' },
      { part: 'Listening', score: null, status: 'NOT_PRESENTED' }, // NP, no cuenta
    ],
  }];
  const m = computeMockMetrics(calls);
  assert.equal(m.evolution[0].overall, 70); // (80+60)/2, no (80+60+0)/3
});

test('KPIs: last, best, average, count y trend excluyen convocatorias sin nota', () => {
  const calls: RawCall[] = [
    { examName: 'M1', examDate: '2026-01-10', parts: [{ part: 'Reading', score: 50, status: 'PRESENTED' }] },
    { examName: 'M2', examDate: '2026-03-10', parts: [{ part: 'Reading', score: 70, status: 'PRESENTED' }] },
    { examName: 'M3', examDate: '2026-05-10', parts: [{ part: 'Reading', score: null, status: 'ABSENT' }] }, // NP entero
  ];
  const m = computeMockMetrics(calls);
  assert.equal(m.kpis.count, 2);          // M3 no realizado
  assert.equal(m.kpis.best, 70);
  assert.equal(m.kpis.average, 60);       // (50+70)/2, M3 excluido
  assert.equal(m.kpis.last, 70);          // último CON nota
  assert.equal(m.kpis.trend, 'up');       // 50 -> 70
});

test('un alumno sin ninguna nota da KPIs nulos, no ceros', () => {
  const calls: RawCall[] = [
    { examName: 'M1', examDate: '2026-01-10', parts: [{ part: 'Reading', score: null, status: 'NOT_PRESENTED' }] },
  ];
  const m = computeMockMetrics(calls);
  assert.equal(m.kpis.average, null);
  assert.equal(m.kpis.best, null);
  assert.equal(m.kpis.count, 0);
  assert.equal(m.skills.find(s => s.name === 'Reading')?.latestNp, true);
});
