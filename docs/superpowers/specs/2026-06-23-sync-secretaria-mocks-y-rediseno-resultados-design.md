# Sincronización Secretaría → Mocks + rediseño de resultados en la ficha

> **Fecha**: 2026-06-23
> **Estado**: Diseño aprobado, pendiente de plan de implementación
> **Plataformas**: `secretaria.mundoworld.school` (`/opt/mw-secretaria`) · `mocks.mundoworld.school` (`/opt/cambridge-mocks-prod`)

## 1. Objetivo

Dos entregables independientes pero relacionados:

1. **Sincronización automática y permanente** Secretaría → Mocks. Secretaría es la **fuente de verdad**: toda la gestión de alumnos y grupos se hace en Secretaría y Mocks refleja los cambios sin intervención manual (altas, bajas, cambios de grupo, renombrados, curso académico).
2. **Rediseño de la visualización** de resultados de simulacros dentro de la ficha del alumno en Secretaría: tarjetas/barras por destreza, evolución histórica, KPIs resumidos y tratamiento correcto de "No presentado" (NP).

## 2. Contexto del código actual (hallazgos verificados)

### Secretaría (NestJS + React, schema `secretaria` en Postgres compartido)
- Cadena de datos: `Student` —(`enrollments.student_id`)→ `Enrollment` —(`group_id`)→ `Group` —(`program_id`)→ `Program` —(`service_id`)→ `Service` (código `INGLES`), todo dentro de un `AcademicYear`.
- El **"nivel" es el `Program`** (`secretaria.programs`, ordenado por `level_order`). Los niveles Cambridge son nombres de programa bajo el servicio `INGLES`: `KEY (A2)`, `PET (B1)`, `FCE (B2)`, `CAE (C1)`. **C2/Proficiency no está sembrado.** No hay campo estructurado que distinga niveles Cambridge de los inferiores (Starters/Movers/Flyers); hoy solo se distingue por heurística de nombre en el frontend (`App.tsx:2601` `levelColor()`).
- `AcademicYear` → `secretaria.academic_years`, año en columna `label` de texto único, formato `'2026-2027'`. Exactamente una fila con `is_active=true`.
- **No hay bus de eventos de aplicación.** El mecanismo de cambios es **Postgres `LISTEN/NOTIFY`** vía triggers (`fn_audit`/`fn_notify_change`) sobre canal `secretaria_changes`, retransmitido por WebSocket en `RealtimeGateway.broadcastChange()`. Los topics `students`, `enrollments`, `groups` ya emiten (`realtime.topics.ts`). **Esta es la superficie de enganche para el sync en tiempo casi real.**
- **Integración Mocks actual = solo lectura.** `mocks.controller.ts` abre el fichero SQLite de Mocks con `sql.js` en **modo solo lectura** (`MOCKS_DB_PATH`, comentario *"nunca modificar Mocks"*). Link por alumno: `secretaria.students.mock_user_id` (int) ↔ Mocks `User.id`. Endpoints existentes: `GET mocks/students`, `GET mocks/results/:mockUserId`, `POST mocks/link`, `POST mocks/auto-link`, `DELETE mocks/link/:studentId`.
- CRUD de grupos: `CatalogController.createGroup/updateGroup/deleteGroup`. Mover alumno de grupo: `EnrollmentsController.update()` con `{ groupId }` (`group_id` nullable, `ON DELETE SET NULL`).

### Mocks (Next.js 15 + Prisma + SQLite)
- `AcademicYear` (`name` UNIQUE, p.ej. "2024-2025"), `Group` (`academicYearId`), `User` (`role` STUDENT, password bcrypt + `pdfPassword` plano), pivote `GroupUser` (`@@unique([groupId, userId])`, cascade-delete).
- **Resultados** = `StudentResult`, una fila **por alumno, por convocatoria, por destreza** (`@@unique([studentId, examCallId, partId])`). `partScore` (Float, **nullable**). `submissionStatus` enum `{PRESENTED, NOT_PRESENTED, ABSENT}` (default PRESENTED). El global se **calcula en lectura** (`lib/scoringService.ts`), no se persiste; NP/ABSENT se excluyen del ponderado.
- El **nivel Cambridge** vive solo en `ExamType` (PET/FCE/CAE + `passingScore`), vía el template del `ExamCall`. No hay nivel objetivo por grupo ni por alumno.
- **Auth: solo sesión NextAuth (cookies), no hay auth máquina-a-máquina.** Existe CRUD admin completo (`/api/admin/academic-years`, `/api/admin/groups`, `/api/admin/groups/[id]/students` POST/DELETE, `/api/admin/students`) pero gateado por sesión admin.

### Ficha del alumno (frontend)
- Todo en un único `App.tsx` (~5.267 líneas), **solo Ant Design, sin Tailwind, sin librería de gráficas**.
- Bloque mock actual: `App.tsx:869-879` — `Table` AntD con columnas Parte/Nota; **descarta el campo `status`**; nota nula → `—`. La respuesta del backend ya incluye `parts[].status` (= `submissionStatus`) pero la ficha lo ignora.
- Colores de marca por destreza ya definidos en `App.tsx:591`. Tokens de diseño (CSS custom props) en `index.css:5-17` (`--mw-primary:#579172`, fuentes Lora/Plus Jakarta Sans).

## 3. Decisiones de diseño (aprobadas)

| Decisión | Elección | Motivo |
|---|---|---|
| Mecanismo de escritura en Mocks | **API de servicio HTTP en Mocks** (API key) | Mocks sigue siendo único escritor de su SQLite (sin contención de bloqueo/corrupción), reutiliza CRUD existente, contrato estable. Escribir el fichero directo se descarta por riesgo de lock/corrupción y lógica duplicada. |
| Modelo de disparo del sync | **Reconciliador idempotente declarativo** + 3 disparadores: change-feed (debounce ~5s), cron diario 03:00, botón admin | Un solo camino de código para alta/baja/cambio/rename; imposible duplicar; autocorrige; la "resincronización" (sección 7 del spec) es la operación normal. |
| Detección de nivel | **Campo estructurado `mock_exam_type` en `Program`** | Determinista (no depende de strings), editable, soporta C2, y da el "nivel objetivo" para la ficha. |
| Librería de gráficas | **Recharts** | Ligera, estándar en React, cubre líneas (evolución) y barras (destrezas). |

Decisiones menores: cron 03:00 (backups son 02:00); debounce 5s; v1 en **porcentajes** (la escala Cambridge 140-190 se deja como mejora futura por requerir boundaries del template); nombre del grupo en Mocks = nombre en Secretaría tal cual (ya lleva el nivel).

## 4. Arquitectura de la sincronización

El cerebro vive en **Secretaría**. Mocks expone **un endpoint declarativo** y Secretaría le manda el "estado deseado" del curso activo.

```
SECRETARÍA (backend)                          MOCKS (Next.js)
┌─────────────────────────────┐               ┌──────────────────────────┐
│ módulo mocks-sync           │               │ POST /api/sync/reconcile │
│  • SyncService.reconcile()  │──HTTP+APIKey─▶│  (header x-sync-key)     │
│  • MocksApiClient           │  estado        │  → Prisma (transacción)  │
│                             │  deseado       │  → aplica diff           │
│ disparadores:               │◀──reporte──────│  → devuelve reporte JSON │
│  1. change-feed (debounce)  │                └──────────────────────────┘
│  2. cron diario 03:00       │                         │ único escritor
│  3. botón admin manual      │                         ▼ del SQLite
└─────────────────────────────┘
```

**Estado deseado** = para cada `Group` del año activo cuyo `Program.mock_exam_type ≠ NULL`, la lista de sus alumnos (vía `enrollments.group_id`). Secretaría lo manda entero; Mocks compara y aplica solo las diferencias en una transacción. Como es un colegio (cientos de alumnos), enviar el estado completo en cada cambio es barato y maximamente robusto.

## 5. Cambios de modelo de datos

### Secretaría (migración Postgres, schema `secretaria`)
- `programs.mock_exam_type` (nullable) — enum textual `A2_KEY | B1_PET | B2_FIRST | C1_CAE | C2_CPE | NULL`. **NULL = no sincroniza.** Autorrelleno inicial por nombre en la propia migración (mapeo `KEY→A2_KEY`, `PET→B1_PET`, `FCE→B2_FIRST`, `CAE→C1_CAE`); editable en admin.
- `groups.mock_group_id` (nullable int) — id del grupo equivalente en Mocks. Evita duplicados y detecta renombrados.
- `mock_sync_log` (tabla nueva) — `id`, `ran_at`, `trigger` (`change-feed|cron|manual`), `created`, `renamed`, `enrolled`, `unenrolled`, `adopted`, `incidencias` (jsonb), `ok` (bool), `duration_ms`. Auditoría de cada reconciliación (sección 7: "registrar en logs cualquier incidencia").

### Mocks (Prisma, `prisma db push`)
- `Group.externalId` (nullable, **unique**) — UUID del grupo de Secretaría. Dedupe determinista + detección de rename.
- `User.externalId` (nullable, **unique**) — UUID del alumno de Secretaría. Dedupe determinista.
- El reconcile **solo gestiona grupos y membresías cuyo `Group.externalId` no es NULL**; los grupos creados a mano en Mocks quedan intactos.

## 6. API de sincronización en Mocks

Endpoint nuevo, protegido por header `x-sync-key` (comparado con env `SYNC_API_KEY`). El middleware ya deja pasar `/api/*`, así que la ruta hace su propia validación de la API key (independiente de NextAuth). Reutiliza la lógica de los handlers admin existentes.

```
POST /api/sync/reconcile
headers: { x-sync-key: <SYNC_API_KEY> }
body: {
  academicYear: "2026-2027",
  groups: [
    { externalId, name, examType: "B2_FIRST",
      students: [ { externalId, fullName }, ... ] }
  ]
}
```

Lógica (en una transacción Prisma):
1. **Asegura `AcademicYear`** con `name = academicYear` (crea si falta, reutiliza si existe) — sección 1 del spec.
2. **Por cada grupo** (match por `externalId`): no existe → crear (asociado al año); existe pero `name` cambió → renombrar — sección 3.
3. **Por cada alumno**: match por `externalId`; si no, match por **nombre normalizado** entre usuarios STUDENT sin `externalId` (adopta preexistentes y les fija `externalId`); si no, **crear** (reutiliza generación de password de Mocks) — sección 4. Devuelve el `id` para que Secretaría lo guarde en `mock_user_id`.
4. **Ajusta membresías** (`GroupUser`) de cada grupo sincronizado al conjunto deseado: añade los que faltan, quita los que sobran — secciones 4, 5, 6.
5. **Regla de baja (servidor):** quitar de un grupo borra **solo la fila `GroupUser`**. **Nunca** borra `User` ni `StudentResult` — sección 5. Un alumno que desaparece de todos los grupos sincronizados conserva su `User` (con `externalId`) y su histórico.
6. Devuelve reporte: `{ academicYearId, groups:[{externalId, mockGroupId}], students:[{externalId, mockUserId}], created, renamed, enrolled, unenrolled, adopted, incidencias[] }`.

> El reconcile es la operación de resincronización (sección 7): comparar, detectar discrepancias, corregir, recuperar relaciones perdidas — todo en el mismo endpoint.

## 7. El reconciliador en Secretaría

Nuevo módulo `mocks-sync` en el backend de Secretaría:
- **`MocksApiClient`** — cliente HTTP a `POST {MOCKS_SYNC_URL}/api/sync/reconcile` con `x-sync-key` (env `MOCKS_SYNC_KEY`). Timeout y reintento simple.
- **`SyncService.reconcile(trigger)`** — construye el estado deseado del año activo, llama a Mocks, persiste `groups.mock_group_id` y `students.mock_user_id` devueltos, y escribe una fila en `mock_sync_log`. Idempotente; un solo `reconcile()` sirve para los tres disparadores.
- **Disparadores:**
  1. **Change-feed** — se suscribe a `ChangeFeedService` (topics `students`, `enrollments`, `groups`); ante cambio, agenda `reconcile('change-feed')` con **debounce ~5s** para agrupar ráfagas.
  2. **Cron diario** `@Cron('0 3 * * *')` (`@nestjs/schedule`) — `reconcile('cron')` completo de red de seguridad.
  3. **Endpoint admin** `POST /api/secretaria/mocks-sync/reconcile` → `reconcile('manual')` (botón "Resincronizar ahora").
- **Endpoint de estado** `GET /api/secretaria/mocks-sync/status` — última sync + filas recientes de `mock_sync_log`.

## 8. Panel admin de sincronización (Secretaría)

Sección pequeña en el admin: botón **"Resincronizar ahora"**, estado/fecha de la última sync, y tabla del `mock_sync_log` con las **incidencias resaltadas**. Además, el selector `mock_exam_type` se añade al formulario de edición de programas (admin Catálogo).

## 9. Rediseño de la visualización en la ficha

Se reescribe el bloque `App.tsx:869-879`. Se **extiende el endpoint** `GET mocks/results/:id` (que ya lee el SQLite read-only) para devolver métricas calculadas en el backend (coherencia garantizada). Frontend con AntD + **Recharts**, paleta de `index.css` y colores por destreza de `App.tsx:591`.

### Datos que añade el backend
Por convocatoria y por destreza, clasifica cada parte:
- **Con nota**: `submissionStatus = PRESENTED` y `partScore != null` → score numérico.
- **Pendiente**: `PRESENTED` pero `partScore = null` → "pendiente".
- **NP**: `submissionStatus ∈ {NOT_PRESENTED, ABSENT}` → "NP".

Y agrega métricas: último global, mejor global histórico, media global (solo notas reales), nº de simulacros con al menos una nota, tendencia (comparando las dos últimas convocatorias con nota), serie temporal por destreza y global.

### Componentes (orden visual)
1. **Cabecera de KPIs** (sección 11): Último resultado · Mejor histórico · Media global · Nº simulacros · Tendencia (▲/▼/▬) · **Nivel Cambridge objetivo** (de `mock_exam_type` del grupo Cambridge actual del alumno).
2. **Tarjetas/barras por destreza** (sección 9): Reading, Writing, Listening, Speaking, Use of English + Global — barras de progreso con color por destreza, en lugar de tabla numérica.
3. **Evolución histórica** (sección 10): `LineChart` Recharts con la global, togglable por destreza, fecha de convocatoria en eje X; tendencias de mejora/empeoramiento.

### NP / No presentado (secciones 12-13)
- Mostrar **"NP"** (chip gris) o "pendiente"; **nunca 0**.
- NP y pendientes **se excluyen** de medias, tendencias y gráficas. Las medias se calculan **solo con notas reales**. Nunca aparecen como suspenso ni distorsionan gráficas. Todo el cálculo en backend.

### UX (sección 14)
Responsive (las tarjetas se apilan en móvil; el Drawer ya es full-width en móvil), coherencia con tokens MW, legibilidad para administración/profesorado/dirección, lo importante de un vistazo.

> **Fuera de v1 (anotado):** la escala Cambridge icónica (140-190) requiere los `gradeBoundaries`/`passingScore` del template de Mocks; v1 trabaja en porcentajes. Mejora futura: leer `ExamType`/template y replicar `convertToCambridgeScale`.

## 10. Validación final obligatoria (sección 15 del spec)

Se verifica en un **año académico de prueba primero** (sin tocar datos reales) y luego en el real:
1. Creación automática de grupos en Mocks.
2. Sincronización (alta) de alumnos.
3. Bajas automáticas (solo membresía; histórico intacto).
4. Cambios de grupo (sale del anterior, entra en el nuevo, histórico intacto).
5. Ausencia de duplicados (grupos y alumnos) — verificable por `externalId` único.
6. Creación automática del curso académico 2026-2027.
7. NP correctos (nunca 0) en la ficha.
8. Cálculo de medias solo con notas reales.
9. Gráficas históricas correctas.
10. Sincronización completa coherente entre ambas plataformas.

## 11. Despliegue

- **Mocks (una vez):** `prisma db push` (columnas `externalId`), nueva ruta `/api/sync/reconcile`, env `SYNC_API_KEY`; rebuild imagen `cambridge-mocks-app` + recrear contenedor (cuidado con el monitor que recrea con imagen vieja: stop+rm+run rápido tras el build).
- **Secretaría:** migración Postgres (`mock_exam_type`, `mock_group_id`, `mock_sync_log`), módulo `mocks-sync`, env `MOCKS_SYNC_URL`/`MOCKS_SYNC_KEY`; rebuild imagen `mw-secretaria-api` + recrear contenedor; frontend (Recharts) build a `/opt/mw-secretaria/frontend-dist`.
- **Repo:** commit + push al repo propio de Secretaría (`Digmusic88/MWPANEL-4.0`, git-dir `/root/secretaria-repo.git`, work-tree `/opt/mw-secretaria`, alias SSH `github-secretaria`) en **cada cambio**.

## 12. Riesgos y mitigaciones

- **Doble escritor en SQLite** → evitado: Mocks es el único escritor; Secretaría sigue leyendo read-only para la ficha.
- **Borrado accidental de histórico** → la regla "baja = solo `GroupUser`" se aplica en el servidor de Mocks; nunca se borra `User`/`StudentResult`.
- **Duplicados** → claves `externalId` únicas en `Group` y `User` + adopción por nombre normalizado de preexistentes.
- **Reconcile pisa grupos manuales de Mocks** → el reconcile solo toca grupos con `externalId`.
- **Ráfagas de cambios** → debounce 5s en el disparador change-feed.
- **Mocks caído durante un cambio** → la fila `mock_sync_log` registra la incidencia; el cron diario y el botón manual reconcilian después (idempotente).
