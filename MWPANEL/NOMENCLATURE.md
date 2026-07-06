# NOMENCLATURE - MW PANEL 2.0

## 📖 GUÍA DE NOMENCLATURA Y CONVENCIONES

Este documento establece las convenciones de nomenclatura utilizadas en MW Panel 2.0 para mantener consistencia en el código y facilitar el mantenimiento.

---

## 🎯 ROLES Y USUARIOS

### 👥 Roles del Sistema
```typescript
// Roles principales (NO MODIFICAR)
type UserRole = 'admin' | 'teacher' | 'student' | 'family'

// Español para UI
admin     → "Administrador"
teacher   → "Profesor"
student   → "Estudiante" 
family    → "Familia"
```

### 📧 Usuarios de Prueba
```
admin@mwpanel.com     / admin123     (Administrador)
profesor@mwpanel.com  / profesor123  (Profesor)
estudiante@mwpanel.com / estudiante123 (Estudiante)
familia@mwpanel.com   / familia123   (Familia)
```

---

## 🗄️ BASE DE DATOS

### 📊 Entidades Principales
```sql
-- Usuarios y autenticación
users                 → Usuarios base del sistema
user_profiles         → Perfiles extendidos de usuarios
students              → Datos específicos de estudiantes
teachers              → Datos específicos de profesores
families              → Datos específicos de familias

-- Estructura educativa
educational_levels    → Niveles educativos (Infantil, Primaria, Secundaria)
courses              → Cursos por nivel educativo
subjects             → Asignaturas del curriculum
class_groups         → Clases/grupos de estudiantes
subject_assignments  → Asignación profesor-asignatura-clase

-- Sistema académico
evaluations          → Evaluaciones competenciales
competency_evaluations → Evaluaciones por competencia
grades               → Calificaciones numéricas
activities           → Actividades de aula
tasks               → Tareas y entregas
academic_records    → Expedientes académicos

-- TypeQuest integration
typequest_profiles   → Perfiles de mecanografía
typequest_sessions   → Sesiones de práctica
typequest_daily_stats → Estadísticas diarias
typequest_daily_challenge → Desafíos diarios
typequest_practice_days → Días de práctica

-- Comunicación y recursos
messages            → Sistema de mensajería
notifications       → Notificaciones del sistema
calendar_events     → Eventos del calendario
educational_resources → Recursos educativos Google Drive
```

### 🔗 Relaciones Críticas
```sql
-- Jerarquía educativa
educational_levels (1) → (N) courses
courses (1) → (N) class_groups
subjects (1) → (N) subject_assignments
class_groups (1) → (N) subject_assignments

-- Usuarios y roles
users (1) → (1) user_profiles
users (1) → (0..1) students/teachers/families
students (N) → (N) class_groups (through students_class_groups)

-- Evaluaciones
students (1) → (N) evaluations
subject_assignments (1) → (N) evaluations
evaluations (1) → (N) competency_evaluations

-- TypeQuest
users (1) → (0..1) typequest_profiles
typequest_profiles (1) → (N) typequest_sessions
typequest_profiles (1) → (N) typequest_daily_stats
```

---

## 📁 ESTRUCTURA DE ARCHIVOS

### 🎯 Backend (NestJS)
```
src/
├── modules/                    # Módulos por dominio
│   ├── auth/                  # Autenticación y autorización
│   ├── users/                 # Gestión de usuarios
│   ├── students/              # Dominio estudiantes
│   ├── teachers/              # Dominio profesores
│   ├── families/              # Dominio familias
│   ├── subjects/              # Asignaturas
│   ├── evaluations/           # Sistema de evaluaciones
│   ├── typequest/             # Integración TypeQuest
│   └── educational-resources/ # Recursos Google Drive
├── database/
│   └── migrations/           # Migraciones ordenadas por timestamp
├── common/
│   ├── decorators/           # Decoradores custom
│   ├── guards/               # Guards de autenticación
│   ├── interceptors/         # Interceptors HTTP
│   └── filters/              # Exception filters
└── config/                   # Configuración del sistema
```

### 🎨 Frontend (React)
```
src/
├── components/               # Componentes reutilizables
│   ├── common/              # Componentes genéricos
│   ├── layout/              # Layouts principales
│   ├── calendar/            # Componentes de calendario
│   ├── animations/          # Componentes animados
│   └── rubrics/             # Sistema de rúbricas
├── pages/                   # Páginas por rol
│   ├── admin/               # Páginas administrativas
│   ├── teacher/             # Páginas de profesores
│   ├── student/             # Páginas de estudiantes
│   ├── family/              # Páginas de familias
│   └── communications/      # Mensajería y notificaciones
├── services/                # Servicios API
├── store/                   # Estado global (Zustand)
├── hooks/                   # Custom hooks
├── types/                   # Definiciones TypeScript
└── utils/                   # Utilidades generales
```

### 🎮 TypeQuest (React Gaming)
```
src/
├── components/
│   ├── games/               # Componentes de juegos
│   ├── typing/              # Motor de mecanografía
│   ├── lessons/             # Componentes de lecciones
│   ├── ui/                  # UI específica TypeQuest
│   └── layout/              # Layout gaming
├── data/                    # Datos del curriculum
│   ├── curriculum.ts        # Estructura 6 niveles
│   ├── lessonsContent.ts    # Nivel 1 (30 lecciones)
│   ├── level2Lessons.ts     # Nivel 2 (30 lecciones)
│   └── ...                  # Niveles 3-6
├── pages/                   # Páginas principales
├── services/                # Servicios gaming
└── types/                   # Tipos específicos
```

---

## 🏷️ CONVENCIONES DE CÓDIGO

### 📝 TypeScript/JavaScript
```typescript
// Variables y funciones: camelCase
const userName = 'estudiante';
const getCurrentUser = () => {};

// Clases y componentes: PascalCase
class UserService {}
const StudentDashboard = () => {};

// Constantes: UPPER_SNAKE_CASE
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 20;

// Interfaces y tipos: PascalCase
interface UserProfile {}
type UserRole = 'admin' | 'teacher';

// Enums: PascalCase
enum FileType {
  PDF = 'PDF',
  IMAGE = 'IMAGE'
}
```

### 🗄️ SQL y Base de Datos
```sql
-- Tablas: snake_case plural
users, student_profiles, class_groups

-- Columnas: snake_case
user_id, first_name, created_at, updated_at

-- Índices: idx_tabla_columna
idx_users_email, idx_students_class_group_id

-- Foreign keys: fk_tabla_referencia
fk_students_user_id, fk_evaluations_student_id

-- Constraints: uq_tabla_columna (unique)
uq_users_email, uq_students_enrollment_number
```

### 🌐 URLs y Rutas
```typescript
// API endpoints: kebab-case
/api/auth/login
/api/educational-resources/upload
/api/class-groups/:id/students

// Frontend routes: kebab-case
/admin/class-groups
/teacher/educational-resources
/student/tasks

// TypeQuest routes: camelCase para gaming
/typequest/lessonPlayer/:id
/typequest/dashboard
```

---

## 🎨 DISEÑO Y UI

### 🎨 Colores del Sistema
```css
/* MW Panel - Colores principales */
--primary-blue: #1890ff
--success-green: #52c41a
--warning-yellow: #faad14
--error-red: #f5222d
--text-primary: #262626
--text-secondary: #8c8c8c

/* TypeQuest - Gaming colors */
--purple-soft: #9CA3FF
--blue-soft: #7DD3FC
--yellow-soft: #F7D160
--gaming-dark: #1a1a2e
--gaming-accent: #16213e
```

### 📏 Espaciado y Layout
```css
/* Spacing system (Ant Design compatible) */
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px

/* Grid system */
--container-width: 1200px
--sidebar-width: 240px
--header-height: 64px
```

### 🔤 Tipografía
```css
/* MW Panel - Inter font */
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI'
--font-size-sm: 12px
--font-size-base: 14px
--font-size-lg: 16px
--font-size-xl: 20px

/* TypeQuest - Gaming typography */
--gaming-font: 'Inter', monospace
--gaming-title: 24px
--gaming-body: 16px
```

---

## 🔄 ESTADOS Y FLUJOS

### 📊 Estados de Evaluación
```typescript
// Estados de evaluación
type EvaluationStatus = 
  | 'draft'      // Borrador
  | 'submitted'  // Enviada
  | 'reviewed'   // Revisada
  | 'finalized'; // Finalizada
```

### 🎮 Estados TypeQuest
```typescript
// Estados de lección
type LessonStatus =
  | 'locked'     // Bloqueada
  | 'available'  // Disponible
  | 'in_progress' // En progreso
  | 'completed'; // Completada

// Niveles de dificultad
type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6;

// Sistema de estrellas
type StarRating = 0 | 1 | 2 | 3;
```

### 📝 Estados de Tareas
```typescript
// Estados de tarea
type TaskStatus =
  | 'assigned'   // Asignada
  | 'submitted'  // Entregada
  | 'graded'     // Calificada
  | 'late';      // Tarde
```

---

## 🔐 SEGURIDAD Y PERMISOS

### 🛡️ Guards y Decoradores
```typescript
// Guards de autenticación
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'teacher')

// Decoradores custom
@CurrentUser() user: User
@RequireRole('teacher')
@ValidateEducationalLevel()
```

### 🔑 JWT y Tokens
```typescript
// Estructura token payload
interface JwtPayload {
  sub: string;        // user.id
  email: string;      // user.email
  role: UserRole;     // user.role
  iat: number;        // issued at
  exp: number;        // expires
}
```

---

## 📊 MÉTRICAS Y ANALYTICS

### 📈 KPIs Educativos
```typescript
// Métricas estudiante
interface StudentMetrics {
  averageGrade: number;      // Nota media
  completedEvaluations: number; // Evaluaciones completadas
  attendanceRate: number;    // Porcentaje asistencia
  taskCompletionRate: number; // Tasa entrega tareas
}

// Métricas TypeQuest
interface TypingMetrics {
  wpm: number;              // Words per minute
  accuracy: number;         // Porcentaje precisión
  lessonProgress: number;   // Progreso lecciones (1-180)
  dailyStreak: number;      // Días consecutivos
}
```

---

## 🌍 INTERNACIONALIZACIÓN

### 🗣️ Idiomas y Locales
```typescript
// Locale principal: Español (España)
const DEFAULT_LOCALE = 'es-ES';

// Formatos de fecha
const DATE_FORMAT = 'DD/MM/YYYY';
const DATETIME_FORMAT = 'DD/MM/YYYY HH:mm';

// Formato números
const GRADE_FORMAT = '0.0'; // 8.5, 9.0
const PERCENTAGE_FORMAT = '0%'; // 85%, 92%
```

---

## 📞 APIS EXTERNAS

### 🔗 Google Drive Integration
```typescript
// Configuración Google Drive
const GOOGLE_CONFIG = {
  serviceAccount: 'mw-panel-drive-service@...iam.gserviceaccount.com',
  sharedDriveName: '12. Plataforma (Recursos dicácticos compartidos)',
  sharedDriveId: '0AECljEUrD7hRUk9PVA'
};
```

---

**📅 Última Actualización**: Julio 2025
**👤 Documentado por**: Sistema Claude Code
**🔄 Revisión Requerida**: Cada sprint de desarrollo