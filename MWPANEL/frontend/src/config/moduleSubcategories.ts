/**
 * @archivo: moduleSubcategories.ts
 * @función: Definición de subcategorías para cada módulo del sistema
 * @descripción: Configuración granular de subcategorías por módulo y rol
 */

export interface ModuleSubcategory {
  key: string;
  name: string;
  description: string;
  icon: string;
  availableForRoles: string[];
  defaultEnabled: boolean;
}

export interface ModuleSubcategoryConfig {
  [moduleKey: string]: ModuleSubcategory[];
}

export const MODULE_SUBCATEGORIES: ModuleSubcategoryConfig = {
  // Módulo de Comunicaciones
  comunicaciones: [
    {
      key: 'mensajes',
      name: 'Sistema de Mensajes',
      description: 'Chat interno entre usuarios del sistema',
      icon: 'MessageOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    },
    {
      key: 'notificaciones',
      name: 'Notificaciones',
      description: 'Sistema de notificaciones push y en tiempo real',
      icon: 'BellOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    },
    {
      key: 'email',
      name: 'Sistema de Email',
      description: 'Envío de emails automáticos y manuales',
      icon: 'MailOutlined',
      availableForRoles: ['admin', 'teacher', 'family'],
      defaultEnabled: true
    },
    {
      key: 'automatizacion',
      name: 'Automatización',
      description: 'Reglas automáticas de comunicación',
      icon: 'RobotOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: false
    }
  ],

  // Módulo de Estudiantes
  estudiantes: [
    {
      key: 'perfiles',
      name: 'Perfiles de Estudiantes',
      description: 'Gestión de datos personales y académicos',
      icon: 'UserOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    },
    {
      key: 'matriculacion',
      name: 'Matriculación',
      description: 'Proceso de inscripción y gestión de matrículas',
      icon: 'FormOutlined',
      availableForRoles: ['admin', 'teacher', 'family'],
      defaultEnabled: true
    },
    {
      key: 'historial',
      name: 'Historial Académico',
      description: 'Registro histórico de notas y evaluaciones',
      icon: 'HistoryOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    },
    {
      key: 'seguimiento',
      name: 'Seguimiento Personalizado',
      description: 'Monitoreo individual del progreso estudiantil',
      icon: 'LineChartOutlined',
      availableForRoles: ['admin', 'teacher', 'family'],
      defaultEnabled: true
    }
  ],

  // Módulo de Profesores
  profesores: [
    {
      key: 'perfiles',
      name: 'Perfiles de Profesores',
      description: 'Gestión de datos profesionales y académicos',
      icon: 'UserOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'horarios',
      name: 'Gestión de Horarios',
      description: 'Configuración de horarios y disponibilidad',
      icon: 'ClockCircleOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'evaluaciones',
      name: 'Herramientas de Evaluación',
      description: 'Creación y gestión de evaluaciones',
      icon: 'EditOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'coordinacion',
      name: 'Coordinación Docente',
      description: 'Herramientas de coordinación entre profesores',
      icon: 'TeamOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    }
  ],

  // Módulo de Familias
  familias: [
    {
      key: 'perfiles',
      name: 'Perfiles de Familias',
      description: 'Gestión de datos familiares y contactos',
      icon: 'HomeOutlined',
      availableForRoles: ['admin', 'teacher', 'family'],
      defaultEnabled: true
    },
    {
      key: 'seguimiento',
      name: 'Seguimiento Académico',
      description: 'Monitoreo del progreso de los hijos',
      icon: 'EyeOutlined',
      availableForRoles: ['admin', 'teacher', 'family'],
      defaultEnabled: true
    },
    {
      key: 'comunicacion',
      name: 'Comunicación Escolar',
      description: 'Canal directo con profesores y administración',
      icon: 'PhoneOutlined',
      availableForRoles: ['admin', 'teacher', 'family'],
      defaultEnabled: true
    },
    {
      key: 'autorizaciones',
      name: 'Autorizaciones y Permisos',
      description: 'Gestión de permisos y autorizaciones',
      icon: 'SafetyCertificateOutlined',
      availableForRoles: ['admin', 'teacher', 'family'],
      defaultEnabled: true
    }
  ],

  // Módulo de Grupos/Clases
  grupos: [
    {
      key: 'gestion',
      name: 'Gestión de Grupos',
      description: 'Creación y organización de grupos/clases',
      icon: 'TeamOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'asignaciones',
      name: 'Asignaciones',
      description: 'Asignación de estudiantes y profesores a grupos',
      icon: 'NodeIndexOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'horarios',
      name: 'Horarios de Clase',
      description: 'Configuración de horarios por grupo',
      icon: 'ScheduleOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    },
    {
      key: 'estadisticas',
      name: 'Estadísticas de Grupo',
      description: 'Analytics y métricas por grupo',
      icon: 'BarChartOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    }
  ],

  // Módulo de Asignaturas
  asignaturas: [
    {
      key: 'gestion',
      name: 'Gestión de Asignaturas',
      description: 'Creación y configuración de asignaturas',
      icon: 'BookOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'competencias',
      name: 'Competencias',
      description: 'Definición de competencias por asignatura',
      icon: 'TrophyOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'curriculum',
      name: 'Currículum',
      description: 'Gestión del currículum académico',
      icon: 'ReadOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'programacion',
      name: 'Programación Didáctica',
      description: 'Planificación de contenidos y evaluaciones',
      icon: 'CalendarOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    }
  ],

  // Módulo de Evaluaciones
  evaluaciones: [
    {
      key: 'creacion',
      name: 'Creación de Evaluaciones',
      description: 'Herramientas para crear evaluaciones',
      icon: 'EditOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'calificacion',
      name: 'Sistema de Calificación',
      description: 'Gestión de notas y calificaciones',
      icon: 'NumberOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'rubricas',
      name: 'Rúbricas',
      description: 'Creación y gestión de rúbricas de evaluación',
      icon: 'TableOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'informes',
      name: 'Informes de Evaluación',
      description: 'Generación de informes y reportes',
      icon: 'FileTextOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    }
  ],

  // Módulo de Competencias
  competencias: [
    {
      key: 'definicion',
      name: 'Definición de Competencias',
      description: 'Creación y gestión de competencias educativas',
      icon: 'BulbOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'evaluacion',
      name: 'Evaluación por Competencias',
      description: 'Sistema de evaluación basado en competencias',
      icon: 'CheckCircleOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'seguimiento',
      name: 'Seguimiento de Competencias',
      description: 'Monitoreo del desarrollo de competencias',
      icon: 'LineChartOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    },
    {
      key: 'certificacion',
      name: 'Certificación de Competencias',
      description: 'Emisión de certificados de competencias',
      icon: 'SafetyCertificateOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    }
  ],

  // Módulo de Actividades
  actividades: [
    {
      key: 'gestion',
      name: 'Gestión de Actividades',
      description: 'Creación y organización de actividades',
      icon: 'CalendarOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'participacion',
      name: 'Participación',
      description: 'Seguimiento de participación en actividades',
      icon: 'UserSwitchOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    },
    {
      key: 'evaluacion',
      name: 'Evaluación de Actividades',
      description: 'Sistema de evaluación para actividades',
      icon: 'StarOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'recursos',
      name: 'Recursos de Actividades',
      description: 'Gestión de materiales y recursos',
      icon: 'FolderOutlined',
      availableForRoles: ['admin', 'teacher', 'student'],
      defaultEnabled: true
    }
  ],

  // Módulo de Tareas
  tareas: [
    {
      key: 'asignacion',
      name: 'Asignación de Tareas',
      description: 'Creación y asignación de tareas',
      icon: 'PlusOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'seguimiento',
      name: 'Seguimiento de Tareas',
      description: 'Monitoreo del progreso de tareas',
      icon: 'EyeOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    },
    {
      key: 'entrega',
      name: 'Sistema de Entrega',
      description: 'Plataforma para entregar tareas',
      icon: 'UploadOutlined',
      availableForRoles: ['admin', 'teacher', 'student'],
      defaultEnabled: true
    },
    {
      key: 'correccion',
      name: 'Corrección Automática',
      description: 'Herramientas de corrección automática',
      icon: 'RobotOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: false
    }
  ],

  // Módulo de Asistencia
  asistencia: [
    {
      key: 'registro',
      name: 'Registro de Asistencia',
      description: 'Toma de asistencia diaria',
      icon: 'CheckOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'reportes',
      name: 'Reportes de Asistencia',
      description: 'Informes y estadísticas de asistencia',
      icon: 'FileTextOutlined',
      availableForRoles: ['admin', 'teacher', 'family'],
      defaultEnabled: true
    },
    {
      key: 'justificaciones',
      name: 'Justificaciones',
      description: 'Gestión de faltas justificadas',
      icon: 'ExclamationCircleOutlined',
      availableForRoles: ['admin', 'teacher', 'family'],
      defaultEnabled: true
    },
    {
      key: 'automatizacion',
      name: 'Automatización',
      description: 'Recordatorios y alertas automáticas',
      icon: 'BellOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    }
  ],

  // Módulo de Calendario
  calendario: [
    {
      key: 'eventos',
      name: 'Gestión de Eventos',
      description: 'Creación y organización de eventos',
      icon: 'CalendarOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'horarios',
      name: 'Horarios Académicos',
      description: 'Configuración de horarios del centro',
      icon: 'ClockCircleOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    },
    {
      key: 'recordatorios',
      name: 'Recordatorios',
      description: 'Sistema de notificaciones de eventos',
      icon: 'BellOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    },
    {
      key: 'reservas',
      name: 'Reservas de Espacios',
      description: 'Gestión de reservas de aulas y espacios',
      icon: 'HomeOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    }
  ],

  // Módulo de Notas
  notas: [
    {
      key: 'gestion',
      name: 'Gestión de Notas',
      description: 'Registro y gestión de calificaciones',
      icon: 'EditOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'boletines',
      name: 'Boletines de Notas',
      description: 'Generación de boletines académicos',
      icon: 'FileTextOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    },
    {
      key: 'estadisticas',
      name: 'Estadísticas de Notas',
      description: 'Analytics y métricas de calificaciones',
      icon: 'BarChartOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'historico',
      name: 'Histórico de Notas',
      description: 'Registro histórico de calificaciones',
      icon: 'HistoryOutlined',
      availableForRoles: ['admin', 'teacher', 'student', 'family'],
      defaultEnabled: true
    }
  ],

  // Módulo de Expedientes
  expedientes: [
    {
      key: 'gestion',
      name: 'Gestión de Expedientes',
      description: 'Creación y mantenimiento de expedientes',
      icon: 'FolderOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'documentos',
      name: 'Documentos Oficiales',
      description: 'Gestión de documentos académicos oficiales',
      icon: 'FileProtectOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'historico',
      name: 'Histórico Académico',
      description: 'Registro histórico completo del estudiante',
      icon: 'HistoryOutlined',
      availableForRoles: ['admin', 'teacher', 'family'],
      defaultEnabled: true
    },
    {
      key: 'certificados',
      name: 'Certificados',
      description: 'Emisión de certificados académicos',
      icon: 'SafetyCertificateOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    }
  ],

  // Módulo de Recursos Educativos
  recursos: [
    {
      key: 'biblioteca',
      name: 'Biblioteca Digital',
      description: 'Gestión de recursos digitales',
      icon: 'BookOutlined',
      availableForRoles: ['admin', 'teacher', 'student'],
      defaultEnabled: true
    },
    {
      key: 'multimedia',
      name: 'Contenido Multimedia',
      description: 'Gestión de videos, audios e imágenes',
      icon: 'PlayCircleOutlined',
      availableForRoles: ['admin', 'teacher', 'student'],
      defaultEnabled: true
    },
    {
      key: 'compartir',
      name: 'Compartir Recursos',
      description: 'Plataforma para compartir entre profesores',
      icon: 'ShareAltOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'evaluacion',
      name: 'Evaluación de Recursos',
      description: 'Sistema de valoración y comentarios',
      icon: 'StarOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    }
  ],

  // Módulo DUA (Accesibilidad) - NUEVO
  dua: [
    {
      key: 'perfiles',
      name: 'Perfiles de Accesibilidad',
      description: 'Gestión de perfiles DUA personalizados',
      icon: 'UserOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'adaptaciones',
      name: 'Adaptaciones Curriculares',
      description: 'Configuración de adaptaciones por estudiante',
      icon: 'SettingOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'seguimiento',
      name: 'Seguimiento DUA',
      description: 'Monitoreo de efectividad de adaptaciones',
      icon: 'LineChartOutlined',
      availableForRoles: ['admin', 'teacher'],
      defaultEnabled: true
    },
    {
      key: 'reportes',
      name: 'Reportes de Accesibilidad',
      description: 'Informes sobre implementación DUA',
      icon: 'FileTextOutlined',
      availableForRoles: ['admin', 'teacher', 'family'],
      defaultEnabled: true
    }
  ]
};

export const getModuleSubcategories = (moduleKey: string): ModuleSubcategory[] => {
  return MODULE_SUBCATEGORIES[moduleKey] || [];
};

export const getSubcategoryForRole = (moduleKey: string, role: string): ModuleSubcategory[] => {
  const subcategories = getModuleSubcategories(moduleKey);
  return subcategories.filter(sub => sub.availableForRoles.includes(role));
};