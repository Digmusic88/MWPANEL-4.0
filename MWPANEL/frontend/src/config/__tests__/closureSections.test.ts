import { describe, it, expect } from 'vitest';
import { getAllowedMenuKeys, filterMenuByAllowedSections, isPathClosed, CLOSURE_SECTIONS_FE } from '../closureSections';

describe('closureSections', () => {
  it('getAllowedMenuKeys = menuKeys of ALLOWED sections only', () => {
    const keys = getAllowedMenuKeys(['blog', 'calendario']);
    expect(keys.has('blog')).toBe(true);        // blog permitida
    expect(keys.has('calendar')).toBe(true);    // calendario permitida
    expect(keys.has('tasks')).toBe(false);      // tareas no permitida
    expect(keys.has('grades')).toBe(false);     // notas no permitida
  });

  it('comunicaciones expone los mensajes privados y chats de grupo en el menú', () => {
    // teacher/student/family usan ítems top-level con key 'messages' y 'group-chats'.
    const keys = getAllowedMenuKeys(['comunicaciones']);
    expect(keys.has('messages')).toBe(true);
    expect(keys.has('group-chats')).toBe(true);
    const menu = [
      { key: 'dashboard', label: 'Inicio' },
      { key: 'messages', label: 'Mensajes' },
      { key: 'group-chats', label: 'Chats de grupo' },
      { key: 'tasks', label: 'Tareas' },
    ];
    const out = filterMenuByAllowedSections(menu, ['comunicaciones']).map((i: any) => i.key);
    expect(out).toEqual(['dashboard', 'messages', 'group-chats']); // tareas podada
  });

  it('filterMenuByAllowedSections keeps dashboard + allowed items, prunes the rest', () => {
    const menu = [
      { key: 'dashboard', label: 'Inicio' },
      { key: 'tasks', label: 'Tareas' },
      { key: 'communications', label: 'Comunicaciones' },
      {
        key: 'academic', label: 'Académico',
        children: [
          { key: 'subjects', label: 'Asignaturas' },
          { key: 'calendar', label: 'Calendario' },
        ],
      },
      {
        key: 'evaluation-system', label: 'Evaluación',
        children: [{ key: 'grades', label: 'Notas' }],
      },
    ];
    const out = filterMenuByAllowedSections(menu, ['comunicaciones', 'calendario']);
    const keys = out.map((i: any) => i.key);
    expect(keys).toContain('dashboard');          // siempre visible
    expect(keys).toContain('communications');     // sección permitida
    expect(keys).toContain('academic');           // grupo padre conservado por hijo permitido
    expect(keys).not.toContain('tasks');          // sección cerrada -> fuera
    expect(keys).not.toContain('evaluation-system'); // grupo sin hijos permitidos -> podado
    const academic = out.find((i: any) => i.key === 'academic');
    expect(academic.children.map((c: any) => c.key)).toEqual(['calendar']); // solo el hijo permitido
  });

  it('isPathClosed: blocks a closed route, allows an open one', () => {
    const allowed = ['blog', 'comunicaciones', 'perfil'];
    expect(isPathClosed('/teacher/tasks', allowed)).toBe(true);
    expect(isPathClosed('/teacher/blog', allowed)).toBe(false);
    expect(isPathClosed('/teacher/communications', allowed)).toBe(false);
  });

  it('uncatalogued route is treated as closed (default-deny parity)', () => {
    expect(isPathClosed('/teacher/some-random-page', ['blog'])).toBe(true);
  });

  it('catalog is non-empty and has unique keys', () => {
    const keys = CLOSURE_SECTIONS_FE.map((s) => s.key);
    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
