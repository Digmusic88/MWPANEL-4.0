import { describe, it, expect } from 'vitest';
import { toWorkItems } from '../workItems';

const TASK = {
  id: 't1', title: 'Ficha de fracciones', isTestYourself: false,
  valuationType: 'score', dueDate: '2026-06-20T10:00:00.000Z', status: 'published',
  subjectAssignment: { subject: { name: 'Matemáticas' }, classGroup: { name: '3º A' } },
};
const TEST = {
  id: 't2', title: 'Self-check Unit 4', isTestYourself: true,
  valuationType: 'score', dueDate: '2026-06-25T10:00:00.000Z', status: 'published',
  subjectAssignment: { subject: { name: 'Inglés' }, classGroup: { name: '3º A' } },
};
const ACTIVITY = {
  id: 'a1', name: 'Participación oral', valuationType: 'emoji',
  assignedDate: '2026-06-22', isArchived: false, classGroup: { name: '3º B' },
};

describe('toWorkItems', () => {
  it('normaliza una tarea normal', () => {
    const [w] = toWorkItems([TASK], []);
    expect(w).toMatchObject({
      id: 't1', kind: 'tarea', title: 'Ficha de fracciones',
      context: 'Matemáticas · 3º A', valuationType: 'score',
      date: '2026-06-20T10:00:00.000Z', status: 'published', href: '/teacher/tasks',
    });
  });

  it('una task isTestYourself es kind "test" y enlaza a /teacher/test-yourself', () => {
    const [w] = toWorkItems([TEST], []);
    expect(w.kind).toBe('test');
    expect(w.href).toBe('/teacher/test-yourself');
  });

  it('normaliza una actividad (name, grupo, sin asignatura, estado active)', () => {
    const [w] = toWorkItems([], [ACTIVITY]);
    expect(w).toMatchObject({
      id: 'a1', kind: 'actividad', title: 'Participación oral',
      context: '3º B', valuationType: 'emoji', date: '2026-06-22',
      status: 'active', href: '/teacher/activities',
    });
  });

  it('una actividad con asignatura muestra "Asignatura · Grupo"', () => {
    const [w] = toWorkItems([], [{
      id: 'a2', name: 'Debate', valuationType: 'emoji', assignedDate: '2026-06-22',
      isArchived: false, classGroup: { name: '3º B' },
      subjectAssignment: { subject: { name: 'Lengua' } },
    }]);
    expect(w.context).toBe('Lengua · 3º B');
  });

  it('una actividad archivada tiene estado "archived"', () => {
    const [w] = toWorkItems([], [{ ...ACTIVITY, isArchived: true }]);
    expect(w.status).toBe('archived');
  });

  it('combina y ordena por fecha desc (los más recientes primero)', () => {
    const list = toWorkItems([TASK, TEST], [ACTIVITY]);
    expect(list.map((w) => w.id)).toEqual(['t2', 'a1', 't1']); // 06-25, 06-22, 06-20
  });

  it('tolera arrays nulos/indefinidos', () => {
    expect(toWorkItems(undefined as any, undefined as any)).toEqual([]);
  });
});
