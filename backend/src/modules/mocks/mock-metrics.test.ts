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
  // all-NP: last y trend también son null
  assert.equal(m.kpis.last, null);
  assert.equal(m.kpis.trend, null);
});

test('classifyPart NP es case-insensitive (not_presented, Absent)', () => {
  assert.equal(classifyPart({ part: 'Reading', score: null, status: 'not_presented' }), 'np');
  assert.equal(classifyPart({ part: 'Reading', score: null, status: 'Absent' }), 'np');
});

test('backward-scan: NP en la ultima call es el estado mas reciente (latestNp=true)', () => {
  // La destreza tiene nota en call-1 pero NP en call-2 (la mas reciente).
  // El backward-scan se detiene en el NP, por lo que latestNp=true y latest=null.
  const calls: RawCall[] = [
    {
      examName: 'Mock 1', examDate: '2026-01-10',
      parts: [{ part: 'Reading', score: 65, status: 'PRESENTED' }],
    },
    {
      examName: 'Mock 2', examDate: '2026-03-10',
      parts: [{ part: 'Reading', score: null, status: 'NOT_PRESENTED' }],
    },
  ];
  const m = computeMockMetrics(calls);
  const reading = m.skills.find(s => s.name === 'Reading')!;
  // El estado mas reciente es NP (call-2) — eso es lo que devuelve el backward-scan
  assert.equal(reading.latestNp, true);
  assert.equal(reading.latest, null);
});

test('backward-scan: NP en call-1, nota en call-2 devuelve la nota (scored wins over earlier NP)', () => {
  // La destreza tiene NP en call-1 pero nota en call-2 (la mas reciente).
  // El backward-scan encuentra primero la nota → latest=65, latestNp=false.
  const calls: RawCall[] = [
    {
      examName: 'Mock 1', examDate: '2026-01-10',
      parts: [{ part: 'Reading', score: null, status: 'NOT_PRESENTED' }],
    },
    {
      examName: 'Mock 2', examDate: '2026-03-10',
      parts: [{ part: 'Reading', score: 65, status: 'PRESENTED' }],
    },
  ];
  const m = computeMockMetrics(calls);
  const reading = m.skills.find(s => s.name === 'Reading')!;
  assert.equal(reading.latest, 65);
  assert.equal(reading.latestNp, false);
});

test('trend flat con dos convocatorias iguales; null con una sola convocatoria', () => {
  // Dos convocatorias con la misma nota → flat
  const callsFlat: RawCall[] = [
    { examName: 'M1', examDate: '2026-01-10', parts: [{ part: 'Reading', score: 70, status: 'PRESENTED' }] },
    { examName: 'M2', examDate: '2026-03-10', parts: [{ part: 'Reading', score: 70, status: 'PRESENTED' }] },
  ];
  const mFlat = computeMockMetrics(callsFlat);
  assert.equal(mFlat.kpis.trend, 'flat');

  // Una sola convocatoria con nota → trend null
  const callsSingle: RawCall[] = [
    { examName: 'M1', examDate: '2026-01-10', parts: [{ part: 'Reading', score: 70, status: 'PRESENTED' }] },
  ];
  const mSingle = computeMockMetrics(callsSingle);
  assert.equal(mSingle.kpis.trend, null);
  assert.equal(mSingle.kpis.count, 1);
});
