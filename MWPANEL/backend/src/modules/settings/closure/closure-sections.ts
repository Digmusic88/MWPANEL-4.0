export type ClosureRole = 'teacher' | 'student' | 'family';

export interface ClosureSection {
  key: string;
  label: string;
  apiPrefixes: string[];   // prefijos de ruta de API (matched contra req.path)
  menuKeys: string[];      // keys de los items de menú en DashboardLayout
  routePrefixes: string[]; // fragmentos de ruta de frontend
}

// Secciones que el admin puede dejar abiertas durante el cierre.
export const CLOSURE_SECTIONS: ClosureSection[] = [
  { key: 'comunicaciones', label: 'Comunicaciones', apiPrefixes: ['/api/communications', '/api/messages'], menuKeys: ['communications', 'resources-communication', 'messages', 'group-chats'], routePrefixes: ['/communications', '/messages'] },
  { key: 'blog', label: 'Blog', apiPrefixes: ['/api/blog'], menuKeys: ['blog', 'blog-view'], routePrefixes: ['/blog'] },
  { key: 'calendario', label: 'Calendario', apiPrefixes: ['/api/calendar'], menuKeys: ['calendar'], routePrefixes: ['/calendar'] },
  { key: 'perfil', label: 'Perfil', apiPrefixes: ['/api/profile'], menuKeys: ['profile'], routePrefixes: ['/profile'] },
  { key: 'evaluaciones', label: 'Evaluaciones', apiPrefixes: ['/api/evaluations'], menuKeys: ['evaluation-system', 'evaluations'], routePrefixes: ['/evaluations'] },
  { key: 'competencias', label: 'Competencias', apiPrefixes: ['/api/competencies'], menuKeys: ['competencies'], routePrefixes: ['/competencies'] },
  { key: 'tareas', label: 'Tareas', apiPrefixes: ['/api/tasks'], menuKeys: ['tasks'], routePrefixes: ['/tasks'] },
  { key: 'notas', label: 'Notas / Calificaciones', apiPrefixes: ['/api/grades'], menuKeys: ['grades'], routePrefixes: ['/grades'] },
  { key: 'asistencia', label: 'Asistencia', apiPrefixes: ['/api/attendance'], menuKeys: ['attendance'], routePrefixes: ['/attendance'] },
  { key: 'actividades', label: 'Actividades', apiPrefixes: ['/api/activities'], menuKeys: ['activities'], routePrefixes: ['/activities'] },
  { key: 'recursos', label: 'Recursos educativos', apiPrefixes: ['/api/educational-resources'], menuKeys: ['educational-resources', 'resources'], routePrefixes: ['/educational-resources', '/resources'] },
  { key: 'dua', label: 'DUA', apiPrefixes: ['/api/dua'], menuKeys: ['dua-system', 'dua-support'], routePrefixes: ['/dua'] },
  { key: 'meetings', label: 'Reuniones', apiPrefixes: ['/api/meetings', '/api/staff'], menuKeys: ['meetings'], routePrefixes: ['/meetings', '/staff'] },
  { key: 'student_notes', label: 'Apuntes', apiPrefixes: ['/api/student-notes'], menuKeys: ['mis-apuntes', 'apuntes-compartidos', 'student-notes'], routePrefixes: ['/mis-apuntes', '/apuntes'] },
  { key: 'expedientes', label: 'Expedientes', apiPrefixes: ['/api/academic-records'], menuKeys: ['expedientes'], routePrefixes: ['/expedientes'] },
];

// Prefijos de API transversales: NUNCA se bloquean para usuarios autenticados,
// para que el shell, auth, perfil, notificaciones y el contexto del año académico
// sigan funcionando durante el cierre. (Se amplía en la verificación E2E si falta alguno.)
export const CLOSURE_ALWAYS_OPEN_API_PREFIXES: string[] = [
  '/api/auth',
  '/api/health',
  '/api/settings/closure/status',
  '/api/users/me',
  '/api/users/profile',
  '/api/profile',
  '/api/notifications',
  '/api/communications/notifications',
  '/api/dashboard',
  '/api/academic-years',
];

// Secciones forzadas a abierto aunque no estén en la lista almacenada.
export const CLOSURE_SAFETY_FLOOR_SECTIONS: string[] = ['perfil', 'comunicaciones'];

export const CLOSURE_ROLES: ClosureRole[] = ['teacher', 'student', 'family'];

export const DEFAULT_ALLOWED_SECTIONS: string[] = ['comunicaciones', 'blog', 'calendario', 'perfil'];

export function resolveSectionForApiPath(path: string): ClosureSection | null {
  for (const section of CLOSURE_SECTIONS) {
    if (section.apiPrefixes.some((p) => path.startsWith(p))) {
      return section;
    }
  }
  return null;
}

export function isAlwaysOpenApiPath(path: string): boolean {
  return CLOSURE_ALWAYS_OPEN_API_PREFIXES.some((p) => path.startsWith(p));
}
