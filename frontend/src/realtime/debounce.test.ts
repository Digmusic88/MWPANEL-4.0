import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDebouncer } from './debounce';

test('agrupa llamadas en una sola tras el intervalo', async () => {
  let n = 0;
  const d = makeDebouncer(() => { n++; }, 50);
  d(); d(); d();
  assert.equal(n, 0);
  await new Promise(r => setTimeout(r, 80));
  assert.equal(n, 1);
});
