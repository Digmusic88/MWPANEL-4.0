import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDesiredState, GroupStudentRow } from './desired-state';

test('agrupa filas planas en grupos con sus alumnos', () => {
  const rows: GroupStudentRow[] = [
    { groupExternalId: 'g1', groupName: 'FCE (B2) A', examType: 'B2_FIRST', studentExternalId: 's1', firstName: 'Ana', lastName: 'López' },
    { groupExternalId: 'g1', groupName: 'FCE (B2) A', examType: 'B2_FIRST', studentExternalId: 's2', firstName: 'Beto', lastName: 'Ruiz' },
    { groupExternalId: 'g2', groupName: 'PET (B1) B', examType: 'B1_PET', studentExternalId: null, firstName: null, lastName: null },
  ];
  const out = buildDesiredState(rows);
  assert.equal(out.length, 2);
  const g1 = out.find((g) => g.externalId === 'g1')!;
  assert.equal(g1.name, 'FCE (B2) A');
  assert.equal(g1.examType, 'B2_FIRST');
  assert.deepEqual(g1.students.map((s) => s.fullName), ['Ana López', 'Beto Ruiz']);
  const g2 = out.find((g) => g.externalId === 'g2')!;
  assert.equal(g2.students.length, 0, 'grupo vacío sin alumnos');
});

test('no duplica alumnos repetidos en el mismo grupo', () => {
  const rows: GroupStudentRow[] = [
    { groupExternalId: 'g1', groupName: 'X', examType: 'A2_KEY', studentExternalId: 's1', firstName: 'A', lastName: 'B' },
    { groupExternalId: 'g1', groupName: 'X', examType: 'A2_KEY', studentExternalId: 's1', firstName: 'A', lastName: 'B' },
  ];
  assert.equal(buildDesiredState(rows)[0].students.length, 1);
});
