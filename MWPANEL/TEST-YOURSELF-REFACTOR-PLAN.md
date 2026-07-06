# 📋 PLAN DE REFACTORIZACIÓN: TEST YOURSELF

## 🎯 PROBLEMA ACTUAL

Los **Test Yourself** están implementados como tareas regulares (tipo `exam` dentro de la tabla `tasks`), lo que causa los siguientes problemas:

### ❌ Problemas Identificados:

1. **Aparecen en el sistema de tareas**: Los Test Yourself se mezclan con homework, assignments, etc.
2. **Notificaciones incorrectas**: Aunque hay un filtro para excluirlos de notificaciones de tareas vencidas, siguen apareciendo en vistas de familias como "tareas pendientes"
3. **Conceptualmente incorrectos**: No son tareas con entrega, son evaluaciones presenciales
4. **Visibilidad inflexible**: No hay control individual de qué Test Yourself mostrar a familias
5. **UX confusa**: Las familias ven "tareas sin entregar" cuando son realmente pruebas en clase

---

## 🔍 AUDITORÍA TÉCNICA COMPLETADA

### Backend - Implementación Actual

#### **Entidades Identificadas:**
```
✅ /backend/src/modules/tasks/entities/
   ├── task.entity.ts              # CRÍTICO: Test Yourself usa TaskType.EXAM
   ├── exam-grade.entity.ts         # Sistema de calificaciones de Test Yourself
   ├── exam-grade-history.entity.ts # Historial de cambios en calificaciones
   ├── test-yourself-section.entity.ts           # Secciones personalizadas
   └── test-yourself-section-assignment.entity.ts # Asignación de tests a secciones
```

#### **Campos Críticos en task.entity.ts:**
- `taskType: TaskType.EXAM` - Identifica Test Yourself
- `valuationType: TaskValuationType` - Tipo de evaluación (emoji/score/rubric)
- `notifyFamilies: boolean` - Control de notificaciones (⚠️ no granular)
- `requiresFile: boolean` - Siempre `false` para Test Yourself
- `allowLateSubmission: boolean` - Siempre `false` para Test Yourself

#### **Servicios que Procesan Test Yourself:**

1. **TasksService** (`/backend/src/modules/tasks/tasks.service.ts`)
   - Método `create()` - Crea Test Yourself como tarea tipo EXAM
   - Método `update()` - Actualiza Test Yourself
   - Método `findAll()` - Lista todas las tareas (incluye Test Yourself)

2. **OverdueTasksService** (`/backend/src/modules/communications/services/overdue-tasks.service.ts`)
   - ✅ **YA FILTRADO** en línea 88: `.andWhere('task.taskType != :examType', { examType: 'exam' })`
   - No envía notificaciones de "tarea vencida" para Test Yourself

3. **FamilyAlertsService** (`/backend/src/modules/families/services/family-alerts.service.ts`)
   - ⚠️ **REVISAR**: Puede estar mostrando Test Yourself como tareas pendientes

### Frontend - Vistas que Muestran Test Yourself

#### **Vistas de Profesores:**
- ✅ `/frontend/src/pages/teacher/TestYourselfPage.tsx` - Vista dedicada (correcto)

#### **Vistas de Familias:**
- ⚠️ `/frontend/src/pages/family/FamilyDashboard.tsx` - Puede mostrar Test Yourself
- ⚠️ `/frontend/src/pages/family/TasksView.tsx` - Lista de tareas (incluye EXAM?)

#### **Vistas de Estudiantes:**
- ⚠️ `/frontend/src/pages/student/TasksPage.tsx` - Lista de tareas
- ⚠️ `/frontend/src/pages/student/TestYourselfGradesPage.tsx` - Vista de calificaciones

---

## 💡 SOLUCIÓN PROPUESTA

### Opción 1: **Separación Mínima con Flags** (⭐ RECOMENDADA)

**Ventajas:**
- Cambios mínimos
- Migración simple
- Mantiene estructura actual

**Implementación:**

1. **Agregar campos a `tasks` table:**
```sql
ALTER TABLE tasks
ADD COLUMN is_test_yourself BOOLEAN DEFAULT FALSE,
ADD COLUMN visible_to_families BOOLEAN DEFAULT TRUE;
```

2. **Actualizar registros existentes:**
```sql
UPDATE tasks
SET is_test_yourself = TRUE,
    visible_to_families = FALSE
WHERE task_type = 'exam';
```

3. **Filtros en servicios:**
```typescript
// En queries para familias
.andWhere('task.is_test_yourself = :isTest', { isTest: false })

// En TestYourselfPage
.andWhere('task.is_test_yourself = :isTest', { isTest: true })
```

4. **Toggle de visibilidad en frontend:**
```tsx
<Form.Item
  name="visibleToFamilies"
  label="Compartir con familias"
  valuePropName="checked"
>
  <Switch />
</Form.Item>
```

---

### Opción 2: **Separación Completa con Nueva Tabla** (Más robusta)

**Ventajas:**
- Separación conceptual clara
- Escalabilidad futura
- No contamina tabla `tasks`

**Desventajas:**
- Más trabajo de migración
- Duplicación de lógica

**Implementación:**

1. **Crear nueva tabla `test_yourself`:**
```sql
CREATE TABLE test_yourself (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,

  teacher_id UUID NOT NULL REFERENCES teachers(id),
  subject_assignment_id UUID NOT NULL REFERENCES subject_assignments(id),

  evaluation_type VARCHAR(20) NOT NULL, -- emoji, score, rubric
  rubric_id UUID REFERENCES rubrics(id),
  max_points DECIMAL(5,2),

  test_date TIMESTAMP NOT NULL,
  due_date TIMESTAMP,

  visible_to_families BOOLEAN DEFAULT FALSE,
  notify_families_on_create BOOLEAN DEFAULT FALSE,

  status VARCHAR(20) DEFAULT 'draft', -- draft, published, closed
  priority VARCHAR(20) DEFAULT 'medium',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

2. **Migrar datos:**
```sql
INSERT INTO test_yourself (
  id, title, description, instructions,
  teacher_id, subject_assignment_id,
  evaluation_type, rubric_id, max_points,
  test_date, due_date,
  visible_to_families, notify_families_on_create,
  status, created_at, updated_at
)
SELECT
  id, title, description, instructions,
  teacher_id, subject_assignment_id,
  value_type, rubric_id, max_points,
  assigned_date, due_date,
  FALSE as visible_to_families,
  notify_families,
  status, created_at, updated_at
FROM tasks
WHERE task_type = 'exam';
```

3. **Mantener `exam_grades` table** (ya separada correctamente)

---

## 🛠️ PLAN DE IMPLEMENTACIÓN

### FASE 1: Análisis y Preparación (COMPLETADA ✅)

- ✅ Auditar backend entities y servicios
- ✅ Auditar sistema de notificaciones
- ✅ Identificar vistas de familia afectadas
- ✅ Documentar arquitectura actual

### 📊 HALLAZGOS CRÍTICOS DE LA AUDITORÍA

#### **✅ SISTEMA DE NOTIFICACIONES - YA CORREGIDO PARCIALMENTE**

**Archivo Auditado**: `/opt/mw-panel/backend/src/modules/communications/services/overdue-tasks.service.ts`
- **✅ LÍNEA 88**: Test Yourself **YA ESTÁN FILTRADOS** de notificaciones de tareas vencidas
  ```typescript
  .andWhere('task.taskType != :examType', { examType: 'exam' })
  ```
- **Estado**: Notificaciones de "tarea sin entregar" **NO SE ENVÍAN** para Test Yourself

#### **⚠️ SISTEMA DE ALERTAS FAMILIARES - MUESTRA TEST YOURSELF COMO TAREAS**

**Archivo Auditado**: `/opt/mw-panel/backend/src/modules/families/services/family-alerts.service.ts`
- **❌ LÍNEA 204-213**: Método `checkPendingTasks()` **NO FILTRA Test Yourself**
  ```typescript
  // Query SQL que NO excluye taskType = 'exam'
  SELECT COUNT(*) as pending_count
  FROM task_submissions ts
  JOIN tasks t ON ts."taskId" = t.id
  WHERE ts."studentId" = $1
  AND ts."submittedAt" IS NULL
  AND ts."isActive" = true
  AND t."isActive" = true
  AND t."dueDate" < NOW()
  // ⚠️ FALTA: AND t."taskType" != 'exam'
  ```

- **❌ LÍNEA 531-614**: Método `checkUpcomingExams()` crea alertas de "Test Yourself próximo"
  - Crea alerta tipo `AlertType.UPCOMING_EXAM` para exámenes próximos
  - **Problema conceptual**: Trata Test Yourself como "examen próximo" cuando es evaluación presencial

#### **⚠️ VISTAS DE FAMILIA FRONTEND - MUESTRAN TEST YOURSELF**

**Archivos Auditados**:

1. **`/opt/mw-panel/frontend/src/pages/family/TasksPage.tsx`**
   - **✅ LÍNEA 132**: Obtiene tareas usando `/tasks/family/tasks` (backend devuelve Test Yourself mezclados)
   - **❌ SIN FILTRO**: No excluye `taskType === 'exam'` en frontend
   - **Resultado**: Familias ven Test Yourself en lista de tareas

2. **`/opt/mw-panel/frontend/src/components/family/FamilyTasksDashboard.tsx`**
   - **⚠️ LÍNEA 200**: **FILTRO IMPLEMENTADO PARCIALMENTE** para Test Yourself en dashboard
   ```typescript
   const isTestYourself = task.taskType === 'exam';

   // Hide Test Yourself once due date has passed (exam already taken)
   if (isTestYourself && dueDate.isBefore(now, 'day')) {
     return false; // Hide Test Yourself that are overdue
   }
   ```
   - **Problema**: Solo oculta Test Yourself **vencidos**, pero **muestra Test Yourself próximos** (línea 259-289)
   - **Sección especial**: Test Yourself mostrados en sección separada "Test Yourself Próximos" (líneas 514-583)

3. **`/opt/mw-panel/frontend/src/pages/family/FamilyDashboard.tsx`**
   - **✅ SIN PROBLEMAS**: No muestra tareas directamente, solo usa componente `FamilyTasksDashboard`

#### **📋 ENDPOINT API PARA FAMILIAS**

**Archivo**: `/opt/mw-panel/backend/src/modules/families/families.controller.ts`
- **✅ LÍNEA 63-70**: Endpoint `/families/dashboard/my-family` solo devuelve datos de estudiantes
- **✅ SIN INCLUSIÓN DE TAREAS**: No devuelve tareas directamente en este endpoint
- **Nota**: Tareas se obtienen vía `/tasks/family/tasks` que **SÍ INCLUYE Test Yourself**

---

## 🎯 RESUMEN EJECUTIVO DE LA AUDITORÍA

### ✅ **LO QUE YA FUNCIONA CORRECTAMENTE**
1. **Notificaciones de tareas vencidas**: Test Yourself **NO generan** emails de "tarea sin entregar"
2. **Sistema de calificaciones**: Exam grades funcionan independientemente del sistema de tareas
3. **Vista de profesores**: Test Yourself tienen vista dedicada correctamente

### ❌ **PROBLEMAS IDENTIFICADOS**

| Problema | Ubicación | Impacto | Prioridad |
|----------|-----------|---------|-----------|
| **Test Yourself aparecen en lista de tareas de familias** | `TasksPage.tsx` línea 132 | Confusión para familias | 🔴 ALTA |
| **Alertas familiares cuentan Test Yourself como tareas pendientes** | `family-alerts.service.ts` línea 204 | Notificaciones incorrectas | 🔴 ALTA |
| **Dashboard familiar muestra Test Yourself próximos** | `FamilyTasksDashboard.tsx` línea 514-583 | Conceptualmente incorrecto | 🟡 MEDIA |
| **No hay control de visibilidad individual** | Todos los Test Yourself | Falta de flexibilidad | 🟡 MEDIA |

### 📊 **ALCANCE DE LA REFACTORIZACIÓN**

#### **Backend - Archivos a Modificar**
- ✅ `task.entity.ts` - Agregar flags `is_test_yourself` y `visible_to_families`
- ✅ `family-alerts.service.ts` - Filtrar Test Yourself de alertas de tareas pendientes
- ✅ `tasks.service.ts` - Queries con filtros para familias
- ✅ `tasks.controller.ts` - Endpoint `/tasks/family/tasks` debe excluir Test Yourself

#### **Frontend - Archivos a Modificar**
- ✅ `TasksPage.tsx` - Excluir Test Yourself de lista de tareas
- ✅ `FamilyTasksDashboard.tsx` - Eliminar sección "Test Yourself Próximos"
- ✅ `TestYourselfPage.tsx` (profesor) - Agregar toggle "Visible para familias"

#### **Database - Migraciones Necesarias**
```sql
-- Migración propuesta
ALTER TABLE tasks
ADD COLUMN is_test_yourself BOOLEAN DEFAULT FALSE,
ADD COLUMN visible_to_families BOOLEAN DEFAULT FALSE;

-- Índices para rendimiento
CREATE INDEX idx_tasks_is_test_yourself ON tasks(is_test_yourself);
CREATE INDEX idx_tasks_visible_families ON tasks(visible_to_families) WHERE is_test_yourself = TRUE;
```

---

### FASE 2: Decisión de Arquitectura (PENDIENTE)

**✅ RECOMENDACIÓN FINAL: Opción 1 (Flags en tabla `tasks`)**

**Justificación basada en auditoría:**
1. **Cambios mínimos necesarios**: Solo 2 flags adicionales en `tasks` table
2. **Sistema de calificaciones intacto**: `exam_grades` ya funciona correctamente
3. **Filtros simples**: Fácil de implementar en queries existentes
4. **Migración rápida**: Solo 1 migración SQL para agregar flags
5. **Compatibilidad completa**: No rompe funcionalidad existente

**Decidir entre:**
- [x] **Opción 1: Flags en tabla `tasks`** (⭐ RECOMENDADA)
  - Tiempo estimado: 1-2 días
  - Riesgo: Bajo
  - Mantenibilidad: Alta
- [ ] Opción 2: Nueva tabla `test_yourself` (más trabajo)
  - Tiempo estimado: 1 semana
  - Riesgo: Medio
  - Mantenibilidad: Alta (pero excesiva para el caso de uso)

### FASE 3: Implementación Backend (PENDIENTE)

1. [ ] Crear migración de base de datos
2. [ ] Actualizar `task.entity.ts` o crear `test-yourself.entity.ts`
3. [ ] Actualizar `tasks.service.ts` para filtrar Test Yourself
4. [ ] Crear/actualizar `test-yourself.service.ts`
5. [ ] Filtrar Test Yourself en `family-alerts.service.ts`
6. [ ] Actualizar queries en `overdue-tasks.service.ts` (ya tiene filtro)

### FASE 4: Implementación Frontend (PENDIENTE)

1. [ ] Agregar toggle "Visible para familias" en TestYourselfPage
2. [ ] Actualizar `FamilyDashboard` para filtrar Test Yourself
3. [ ] Actualizar `TasksView` (familia) para excluir Test Yourself
4. [ ] Crear vista opcional `TestYourselfView` para familias
5. [ ] Actualizar `TasksPage` (estudiante) para separar Test Yourself

### FASE 5: Migración de Datos (PENDIENTE)

1. [ ] Script de migración para datos existentes
2. [ ] Testing en sandbox antes de producción
3. [ ] Backup completo de base de datos

### FASE 6: Testing (PENDIENTE)

1. [ ] Test creación de Test Yourself con visibilidad controlada
2. [ ] Test que familias NO ven Test Yourself en tareas
3. [ ] Test que notificaciones NO se envían para Test Yourself
4. [ ] Test que toggle de visibilidad funciona correctamente
5. [ ] Test vistas de profesores no afectadas

---

## 📊 IMPACTO Y RIESGOS

### Tablas Afectadas:
- ✅ `tasks` - Agregar flags o migrar datos
- ✅ `exam_grades` - Sin cambios (ya separada)
- ✅ `exam_grade_history` - Sin cambios
- ✅ `test_yourself_sections` - Sin cambios
- ✅ `test_yourself_section_assignments` - Sin cambios

### Servicios Afectados:
- ✅ `TasksService` - Filtrar Test Yourself en queries
- ✅ `FamilyAlertsService` - Excluir Test Yourself
- ⚠️ `OverdueTasksService` - Ya tiene filtro (verificar)
- ✅ `TestYourselfSectionsService` - Posibles ajustes

### Componentes Frontend Afectados:
- ✅ `TestYourselfPage` - Agregar toggle visibilidad
- ✅ `FamilyDashboard` - Filtrar Test Yourself
- ✅ `TasksView` (familia) - Excluir Test Yourself
- ⚠️ `TasksPage` (estudiante) - Decidir si mostrar o no

---

## 🎯 CRITERIOS DE ÉXITO

1. ✅ Test Yourself NO aparecen en lista de tareas de familias
2. ✅ Test Yourself NO generan notificaciones de "tarea vencida"
3. ✅ Profesores pueden controlar visibilidad individual por test
4. ✅ Familias solo ven Test Yourself si profesor lo activa
5. ✅ Sistema de calificaciones funciona sin cambios
6. ✅ Datos existentes migrados correctamente

---

## 📝 RECOMENDACIÓN FINAL

**Implementar Opción 1** (Flags en tabla `tasks`) por:

1. **Rapidez**: 1-2 días de implementación vs 1 semana
2. **Menor riesgo**: Cambios mínimos en código existente
3. **Compatibilidad**: Sistema de calificaciones sin cambios
4. **Reversibilidad**: Fácil rollback si hay problemas
5. **Datos preservados**: No hay migración masiva

**Pasos siguientes:**
1. Confirmar con usuario la opción elegida
2. Crear migración de base de datos
3. Implementar filtros en backend
4. Agregar toggle en frontend
5. Testing exhaustivo
6. Deploy a producción

---

**Fecha de análisis**: 21 Octubre 2025
**Status**: ✅ AUDITORÍA COMPLETADA - ESPERANDO APROBACIÓN DE USUARIO
