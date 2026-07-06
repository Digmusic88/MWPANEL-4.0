export interface ClosureSectionFE {
  key: string;
  label: string;
  menuKeys: string[];
  routePrefixes: string[];
}

export const CLOSURE_SECTIONS_FE: ClosureSectionFE[] = [
  { key: 'comunicaciones', label: 'Comunicaciones', menuKeys: ['communications', 'resources-communication', 'messages', 'group-chats'], routePrefixes: ['/communications', '/messages'] },
  { key: 'blog', label: 'Blog', menuKeys: ['blog', 'blog-view'], routePrefixes: ['/blog'] },
  { key: 'calendario', label: 'Calendario', menuKeys: ['calendar'], routePrefixes: ['/calendar'] },
  { key: 'perfil', label: 'Perfil', menuKeys: ['profile'], routePrefixes: ['/profile'] },
  { key: 'evaluaciones', label: 'Evaluaciones', menuKeys: ['evaluation-system', 'evaluations'], routePrefixes: ['/evaluations'] },
  { key: 'competencias', label: 'Competencias', menuKeys: ['competencies'], routePrefixes: ['/competencies'] },
  { key: 'tareas', label: 'Tareas', menuKeys: ['tasks'], routePrefixes: ['/tasks'] },
  { key: 'notas', label: 'Notas / Calificaciones', menuKeys: ['grades'], routePrefixes: ['/grades'] },
  { key: 'asistencia', label: 'Asistencia', menuKeys: ['attendance'], routePrefixes: ['/attendance'] },
  { key: 'actividades', label: 'Actividades', menuKeys: ['activities'], routePrefixes: ['/activities'] },
  { key: 'recursos', label: 'Recursos educativos', menuKeys: ['educational-resources', 'resources'], routePrefixes: ['/educational-resources', '/resources'] },
  { key: 'dua', label: 'DUA', menuKeys: ['dua-system', 'dua-support'], routePrefixes: ['/dua'] },
  { key: 'meetings', label: 'Reuniones', menuKeys: ['meetings'], routePrefixes: ['/meetings', '/staff'] },
  { key: 'student_notes', label: 'Apuntes', menuKeys: ['mis-apuntes', 'apuntes-compartidos', 'student-notes'], routePrefixes: ['/mis-apuntes', '/apuntes'] },
  { key: 'expedientes', label: 'Expedientes', menuKeys: ['expedientes'], routePrefixes: ['/expedientes'] },
];

// Rutas de frontend transversales que nunca se consideran cerradas (shell/landing).
const ALWAYS_OPEN_ROUTE_PREFIXES = ['/dashboard', '/profile', '/notifications'];

/** menuKeys de las secciones PERMITIDAS (lista blanca). */
export function getAllowedMenuKeys(allowed: string[]): Set<string> {
  const keys = new Set<string>();
  for (const section of CLOSURE_SECTIONS_FE) {
    if (allowed.includes(section.key)) {
      section.menuKeys.forEach((k) => keys.add(k));
    }
  }
  return keys;
}

/**
 * Filtro de menú por lista blanca: conserva un ítem si su key es siempre-visible,
 * si pertenece a una sección permitida, o si es un grupo con algún hijo permitido.
 * Todo lo demás se elimina (el menú muestra solo las secciones activas).
 */
export function filterMenuByAllowedSections(
  items: any[],
  allowedSections: string[],
  alwaysVisible: string[] = ['dashboard'],
): any[] {
  const allowedKeys = getAllowedMenuKeys(allowedSections);
  const always = new Set(alwaysVisible);
  const keep = (list: any[]): any[] =>
    list
      .map((item) => {
        if (always.has(item.key) || allowedKeys.has(item.key)) return item;
        if (item.children) {
          const kids = keep(item.children);
          return kids.length ? { ...item, children: kids } : null;
        }
        return null;
      })
      .filter(Boolean);
  return keep(items);
}

/** ¿La ruta actual pertenece a una sección cerrada? (default-deny para no catalogadas). */
export function isPathClosed(pathname: string, allowed: string[]): boolean {
  // Quitar el prefijo de rol: /teacher/tasks -> /tasks
  const stripped = pathname.replace(/^\/(teacher|student|family|admin)/, '');

  if (ALWAYS_OPEN_ROUTE_PREFIXES.some((p) => stripped.startsWith(p)) || stripped === '' || stripped === '/') {
    return false;
  }

  for (const section of CLOSURE_SECTIONS_FE) {
    if (section.routePrefixes.some((p) => stripped.startsWith(p))) {
      return !allowed.includes(section.key); // catalogada: cerrada si no permitida
    }
  }
  return true; // no catalogada -> cerrada (paridad con backend default-deny)
}
