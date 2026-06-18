# Diseño: Inscripción completa + Pendientes

**Fecha**: 2026-06-17  
**Estado**: Aprobado  
**Contexto**: Secretaría MW Panel — flujo de inscripción presencial con el padre delante

## Problema

El alta rápida actual (`quick-enroll`) solo captura nombre, teléfono y servicio. No hay forma de registrar todos los datos del alumno y familia en el momento de la inscripción, ni de asignar grupo, ni de cobrar la matrícula en el acto. Los datos incompletos quedan sin seguimiento y no hay ningún lugar que muestre qué falta por completar.

## Solución

Un **Drawer** (panel lateral, 700px) de inscripción completa que convive con el alta rápida existente. Cuatro secciones scrollables, guardado parcial siempre permitido, detección automática de pendientes. El mismo Drawer sirve para crear y editar alumnos.

## Alcance

- Sin migración de BD — todos los campos ya existen en `students`, `guardians`, `families`, `enrollments`, `charges`, `payments`.
- El alta rápida (`quick-enroll`) se mantiene sin cambios.
- Pieza 2 (dashboard con calendario) es un spec separado y no está incluida aquí.

---

## Sección 1: UI — Drawer de inscripción

### Punto de entrada

En la sección **Alumnos**, el header pasa de tener un botón a tener dos:
- `Alta rápida` (existente, sin cambios)
- `Inscripción completa` (nuevo, botón primario)

La tabla de Alumnos gana un botón **"Editar"** por fila que abre el Drawer en **modo edición** del alumno existente.

### Estructura del Drawer

Drawer de Ant Design, `width={700}`, `title` dinámico ("Nueva inscripción" / "Editar — [Nombre]"), botón "Guardar" en el footer siempre activo.

#### ① Alumno

| Campo | Obligatorio | Notas |
|---|---|---|
| Nombre | ✅ | `firstName` |
| Apellidos | — | `lastName`; ausencia → pendiente |
| Fecha de nacimiento | — | `birthDate`; ausencia → pendiente |
| Curso / nivel | — | `gradeLabel` (ej. "3º Primaria") |
| Centro escolar de origen | — | `schoolOrigin` |
| Notas internas | — | `notes` |

#### ② Familia y tutores

**Tutor principal** (siempre visible):

| Campo | Obligatorio | Notas |
|---|---|---|
| Nombre completo | ✅ | `guardian1.fullName` |
| Relación | — | Select: madre/padre/tutor/otro |
| Teléfono | ✅ | `guardian1.phone` |
| Teléfono alternativo | — | `guardian1.phoneAlt` |
| Email | — | `guardian1.email`; ausencia → pendiente |
| NIF | — | `guardian1.nif`; opcional, no genera pendiente |

**Tutor secundario** (colapsado por defecto, expandible con botón "+ Añadir segundo tutor"):

Mismos campos que el principal, todos opcionales. No genera pendientes.

#### ③ Inscripción

- **Servicios**: Select múltiple (`serviceIds[]`). Obligatorio al menos uno. ✅
- Por cada servicio seleccionado aparece una fila con:
  - Nombre del servicio
  - Select de **Grupo** (filtra grupos del servicio + curso activo)
  - Al seleccionar grupo: se muestra el horario del grupo (días y horas) en una línea pequeña debajo
  - **Estado**: preinscrito / matriculado (default: preinscrito)
  - **Tarifa mensual**: calculada automáticamente (`fn_resolve_monthly_fee`), editable (override manual)
- Si se selecciona `matriculado` sin grupo → pendiente automático "Grupo sin asignar — [Servicio]"

#### ④ Pago de matrícula

- **Switch "Cobrar matrícula ahora"** (default: off)
- Si ON:
  - Método: efectivo / bizum / transferencia / TPV
  - Importe: calculado desde `fn_resolve_concept_fee(matricula)`, editable
  - Fecha: hoy por defecto
- Si OFF: el cargo de matrícula queda en `pendiente` → aparece en pendientes del alumno

### Guardado

- Solo `firstName` + al menos un `serviceId` son obligatorios para guardar.
- Campos vacíos generan pendientes automáticos, no errores de validación.
- Botón "Guardar" en footer del Drawer, siempre habilitado salvo que falten los campos obligatorios.

---

## Sección 2: Seguimiento de pendientes

### Qué se detecta

| Condición | Mensaje pendiente |
|---|---|
| `students.last_name IS NULL` | "Apellidos" |
| `students.birth_date IS NULL` | "Fecha nacimiento" |
| Guardian principal sin email | "Email tutor" |
| Enrollment `status='matriculado'` con `group_id IS NULL` | "Grupo sin asignar — [Servicio]" |
| Charge `concept='matricula'` en `status='pendiente'` | "Matrícula pendiente — [Servicio]" |

Los pendientes se calculan **dinámicamente en SQL** — no hay columna nueva en BD.

### Cómo se muestra

**Tabla de Alumnos — nueva columna "Pendientes":**
- `pendingCount === 0` → `<Tag color="green">✓ Completo</Tag>`
- `pendingCount > 0` → `<Tag color="orange">⚠ N pendientes</Tag>` con Tooltip listando los items

**Filtro rápido** encima de la tabla: botón `Solo con pendientes` (toggle).

**Clic en badge/fila** → abre Drawer en modo edición con Alert naranja en la cabecera: *"Faltan por completar: apellidos, fecha nacimiento, email tutor"*.

**Dashboard** (Pieza 2, spec separado): recibirá un widget con total de alumnos con pendientes usando el endpoint `GET /students?pending=true`.

---

## Sección 3: Backend

### Sin migración de BD

Todos los campos necesarios ya existen en el esquema `secretaria`. No hay ALTER TABLE.

### Endpoint nuevo: POST /students/full-enroll

Crea familia + guardian(es) + alumno + matrículas + cargo matrícula en una sola transacción.

**Body:**
```ts
{
  student: {
    firstName: string;          // requerido
    lastName?: string;
    birthDate?: string;         // ISO date
    gradeLabel?: string;
    schoolOrigin?: string;
    notes?: string;
  };
  guardian1: {
    fullName: string;           // requerido
    relationship?: string;      // madre|padre|tutor|otro
    phone: string;              // requerido
    phoneAlt?: string;
    email?: string;
    nif?: string;
  };
  guardian2?: {                 // mismo shape, todo opcional
    fullName?: string;
    relationship?: string;
    phone?: string;
    phoneAlt?: string;
    email?: string;
    nif?: string;
  };
  enrollments: Array<{
    serviceId: string;          // requerido
    groupId?: string;
    status?: string;            // default 'preinscrito'
    customFee?: number;
  }>;
  matriculaPaid?: {
    method: string;             // efectivo|bizum|transferencia|tpv
    amount: number;
    date?: string;              // ISO date, default today
  };
}
```

**Respuesta:** `{ family, student, enrollments, charges }`

### Endpoint nuevo: GET /students/:id/full

Devuelve alumno + familia + guardians + matrículas del curso activo + `pendingItems[]`.

Usado para cargar el Drawer en modo edición.

### Endpoint nuevo: PATCH /students/:id/full

Actualiza student + guardians + matrículas en una sola llamada. Acepta el mismo shape que `full-enroll` (sin el campo `matriculaPaid`). Opera con UPSERT en guardians (si ya existen, actualiza; si no, crea).

### GET /students — extensión

Se añaden dos campos por alumno:
```ts
pendingCount: number;
pendingItems: string[];   // ["Apellidos", "Email tutor", ...]
```

Calculados en el SELECT con subqueries o CTE. No requiere JOIN adicional costoso.

### Lógica de pendientes (SQL)

```sql
-- pendingItems por alumno (se integra en el SELECT de GET /students)
-- Devuelve array de strings con los pendientes; array vacío si todo ok.
SELECT
  s.id,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN s.last_name IS NULL OR s.last_name = '' THEN 'Apellidos' END,
    CASE WHEN s.birth_date IS NULL THEN 'Fecha nacimiento' END,
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM secretaria.guardians g
      WHERE g.family_id = s.family_id AND g.is_primary_contact AND g.email IS NOT NULL
    ) THEN 'Email tutor' END
  ]
  -- Pendientes por matrícula (uno por servicio con grupo/matrícula sin resolver)
  || ARRAY(
    SELECT 'Grupo sin asignar — ' || sv.name
    FROM secretaria.enrollments e
    JOIN secretaria.services sv ON sv.id = e.service_id
    JOIN secretaria.academic_years ay ON ay.id = e.academic_year_id AND ay.is_active
    WHERE e.student_id = s.id AND e.status = 'matriculado' AND e.group_id IS NULL
  )
  || ARRAY(
    SELECT 'Matrícula pendiente — ' || sv.name
    FROM secretaria.charges ch
    JOIN secretaria.enrollments e ON e.id = ch.enrollment_id
    JOIN secretaria.services sv ON sv.id = e.service_id
    JOIN secretaria.academic_years ay ON ay.id = e.academic_year_id AND ay.is_active
    WHERE e.student_id = s.id AND ch.concept = 'matricula' AND ch.status = 'pendiente'
  )
  , NULL) AS "pendingItems"
FROM secretaria.students s
```

---

## Sección 4: Casos límite

| Caso | Comportamiento |
|---|---|
| Alta rápida existente | Se mantiene sin cambios. Los alumnos creados por alta rápida aparecen con pendientes (apellidos, fecha nacimiento, email tutor). |
| Alumno ya en otro servicio | El drawer en modo edición muestra las matrículas existentes. Se pueden añadir nuevos servicios desde el mismo drawer. |
| Matrícula cobrada en el acto | `charge` con `status='pagado'` + `payment` creados en la misma transacción que el `full-enroll`. |
| Grupo sin horarios configurados | El grupo se puede asignar igualmente; el área de horario simplemente no muestra nada. |
| Guardar sin apellidos | OK — se guarda y aparece en pendientes. No hay validación bloqueante. |
| Segundo tutor sin nombre | Si se expande el bloque del tutor secundario pero se deja vacío, no se crea el guardian. |
| Alumno MW Panel (mwpanel_student_id) | No se puede editar nombre/apellidos (vienen de MW Panel). El drawer los muestra en modo solo lectura. Los campos familia/tutores sí son editables. |

---

## Lo que NO cambia

- `quick-enroll` endpoint y botón "Alta rápida" — sin modificaciones.
- Sección Matrículas — sigue mostrando el listado con filtros y cambio de estado inline.
- Sección Familias — sigue disponible para gestión avanzada de datos de familia.
- Ninguna tabla de BD nueva ni alterada.
