# Apoyo con grupos flexibles (estilo Danza) — Diseño

> **Fecha**: 2026-06-23
> **Estado**: Diseño aprobado, pendiente de plan de implementación
> **Plataforma**: MW Secretaría (`/opt/mw-secretaria`) — NestJS (raw SQL) + React (App.tsx único) + Postgres schema `secretaria`

## 1. Objetivo

Reestructurar el módulo **Apoyo** para que funcione como **Danza**: los alumnos se apuntan a **grupos con nombre** (kanban: "Sin asignar" + una columna por grupo), en lugar de la rejilla actual de franjas horarias globales. Se conserva el modelo de **horas por alumno** y la **tarifa por nivel** (primaria/secundaria/bachillerato) **+ horas**, que ya existen.

## 2. Estado actual (verificado)

- **Apoyo ya tiene casi toda la estructura:**
  - Servicio `secretaria.services` code `APOYO`. Programas: `Apoyo Primaria`, `Apoyo Inglés`, `Apoyo ESO`, `Apoyo Bachillerato`.
  - **6 grupos con nombre** bajo APOYO (`Apoyo 1`–`Apoyo 5`, `Apoyo Inglés`), cada uno con **franjas** en `secretaria.schedule_slots` (group_id, weekday, start_time, end_time, room).
  - `secretaria.apoyo_assignments` (`migrations/012`, hours añadido en `036`): una fila por (enrollment × weekday × slot_time × room), columna `hours numeric(4,2)`. **NO tiene `group_id`** — hoy va por franja global, no por grupo.
  - `secretaria.enrollments.apoyo_level` enum (`primaria`/`secundaria`/`bachillerato`) por matrícula, manual.
  - `secretaria.apoyo_fee_tiers` (por `etapa` + `hours` + `concept`) y `fn_resolve_apoyo_fee(enrollment, concept)` (suma horas de las asignaciones, elige el tramo por nivel+horas). `fn_resolve_monthly_fee` ya delega en él para APOYO.
- **Datos:** 201 enrollments APOYO (44 preinscrito, 48 matriculado, 109 baja), **0 `apoyo_assignments`** (rejilla vacía → migración trivial), 7 `apoyo_slots` (globales, dejarán de usarse).
- **Modelo Danza de referencia** (a replicar): `danza_assignments` (enrollment_id, group_id, weekday, start_time, room), kanban `DanzaBoard` (App.tsx:4808-4932), modal de días `DanzaDaysModal` (App.tsx:4761-4806), endpoints `danza.controller.ts` (`GET /danza/board`, `POST /danza/assign`, `DELETE /danza/assignment/:id`, `DELETE /danza/assignments`).

## 3. Decisiones de diseño (aprobadas)

| Decisión | Elección |
|---|---|
| Pertenencia a grupo | Grupos con nombre (kanban) **+ detalle día/hora + horas** por asignación (máximo paralelismo con Danza). |
| Día/hora de la asignación | **Franjas fijas del grupo** (`schedule_slots`) + horas por franja (como Danza, pero con horas). |
| Nivel (etapa) | **Siempre manual** por alumno (como ahora), sin deducción automática. |
| Tarifa | Sin cambios: **nivel + horas totales** (`fn_resolve_apoyo_fee`). |
| Migración | Trivial (0 asignaciones). Conservar la vista de rejilla NO es necesario (se reemplaza por el kanban). |

## 4. Cambios de datos

- **`secretaria.apoyo_assignments`**: añadir `group_id uuid` (FK → `secretaria.groups(id)` ON DELETE CASCADE). Nueva unicidad `UNIQUE (enrollment_id, group_id, weekday, slot_time)`. Se conservan `weekday`, `slot_time`, `hours`, `room`. La franja (weekday/slot_time) referencia las `schedule_slots` del grupo.
- **`secretaria.enrollments.group_id`**: pasa a usarse como **grupo representativo** de Apoyo (uno de los grupos del alumno, NULL si ninguno), igual que en Danza, para que `fn_resolve_monthly_fee` y la ficha muestren un grupo.
- `secretaria.apoyo_slots` (franjas globales) queda **sin uso** (no se borra; el board ya no lo lee).
- **Realtime**: `apoyo_assignments` ya tiene trigger/topic ('apoyo'); confirmar y mantener (como `danza_assignments → 'danza'`). Migración numerada `037_apoyo_groups.sql` idempotente, aplicada a mano (`cat ... | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel`), backup previo.

## 5. Backend — `apoyo.controller.ts` (espejo de `danza.controller.ts`)

Reescribir el board y las asignaciones al modelo grupo (raw `ds.query`, guard `SecretariaAuthGuard`, mutaciones `@Roles('secretaria_admin','secretaria_staff','direccion')`):

- `GET /apoyo/board?academicYearId` → `{ groups, students }`:
  - `groups`: grupos del servicio APOYO con sus `schedule_slots` (franjas) ordenadas.
  - `students`: enrollments APOYO con status ∈ (matriculado/preinscrito/lista_espera/pendiente), cada uno con `status`, `comment` (=e.notes), `apoyoLevel`, `monthly` (`fn_resolve_apoyo_fee(...,'mensualidad')`), `assignments[]` (groupId, weekday, slotTime, hours), `totalHours` (suma).
- `POST /apoyo/assign { enrollmentId, groupId, weekday, startTime, hours, room? }`: valida que enrollment y group son de APOYO; inserta `apoyo_assignment` (ON CONFLICT DO NOTHING) con `hours`; fija `enrollments.group_id` si NULL.
- `PATCH /apoyo/assignment/:id { hours }`: editar horas (ya existe; mantener).
- `DELETE /apoyo/assignment/:id`: borra una franja; recomputa grupo representativo.
- `DELETE /apoyo/assignments?enrollmentId&groupId`: quita TODAS las franjas de (enrollment, group) ("quitar del grupo"); recomputa representativo.
- Nivel: `PATCH /enrollments/:id { apoyoLevel }` (ya existe). Tarifas: `/apoyo/fee-tiers` (ya existe).
- CRUD de grupos y franjas: reutiliza `catalog.controller` (`createGroup`/`updateGroup`/`deleteGroup` + `schedule_slots`), como Danza.

## 6. Frontend — `ApoyoBoard` (kanban, espejo de `DanzaBoard`)

Reescribir `ApoyoBoard()` (App.tsx ~4541) de rejilla a **kanban**:
- `useLiveQuery(['enrollments','groups','apoyo'], load)`, `GET /apoyo/board`.
- **Columnas**: "Sin asignar" (alumnos con `totalHours===0` / sin grupo) + una por grupo de Apoyo (con `overflowY:auto`, `maxHeight:70vh`).
- **Tarjeta de alumno** (reutiliza `ORG_STATUS`/`orgStat`): nombre, **estado** (chip), **selector de nivel** (primaria/secundaria/bachillerato) → `PATCH /enrollments/:id {apoyoLevel}`, **horas totales**, **tarifa/mes**; menú ⋯ (Matricular/Preinscribir/Lista de espera/Comentario/Editar franjas/Quitar del grupo).
- **Arrastrar** una tarjeta a un grupo abre `ApoyoSlotsModal` (nuevo, espejo de `DanzaDaysModal`): lista las `schedule_slots` del grupo como filas con **checkbox + input de horas**; al confirmar sincroniza (`POST /apoyo/assign` las marcadas con sus horas; `DELETE /apoyo/assignment/:id` las desmarcadas; si viene arrastrada desde otro grupo, `DELETE /apoyo/assignments?...&groupId=origen` para mover).
- **Tabla resumen**: alumno · grupos · horas totales · nivel · tarifa/mes.
- Modal de tarifas existente ("Tarifas de Apoyo por etapa y horas", App.tsx:1161) se conserva.

## 7. Ficha del alumno (`FichaAlumno`)

En la matrícula de Apoyo (hoy solo muestra grupo representativo + tarifa en la tarjeta "Matrículas", App.tsx:828), añadir un **detalle de Apoyo**: grupo(s), franjas (día/hora) con sus horas, **horas totales**, **nivel** y **tarifa/mes**. Endpoint auxiliar nuevo **`GET /apoyo/student/:enrollmentId`** (devuelve grupos + asignaciones + horas + nivel + tarifa del alumno de Apoyo), llamado desde `FichaAlumno` cuando el alumno tiene matrícula APOYO. Se mantiene compacto y no toca la query genérica de la ficha.

## 8. Tarifa (sin cambios)

`fn_resolve_apoyo_fee` suma `apoyo_assignments.hours` del enrollment y elige el `apoyo_fee_tiers` por `(etapa, concept, hours<=total)`. Al añadir `group_id` la suma sigue siendo sobre todas las asignaciones del enrollment (independiente del grupo), así que **la tarifa funciona sin tocar la función**. Si falta nivel → "revisar" (comportamiento actual).

## 9. Migración y despliegue

- Migración `037_apoyo_groups.sql` idempotente: `ALTER TABLE secretaria.apoyo_assignments ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES secretaria.groups(id) ON DELETE CASCADE`; ajustar índice/unicidad; (no hay filas que migrar). Backup `pg_dump -n secretaria` antes.
- Despliegue Secretaría estándar (ver [[project-secretaria-deploy]]): migración a mano → rebuild backend → build frontend a `frontend-dist`. Commit + push al repo propio en cada cambio.

## 10. Validación

1. Crear/usar grupos de Apoyo con franjas; arrastrar un alumno a un grupo y marcar franjas con horas → aparece en la columna del grupo con sus horas.
2. La tarifa/mes refleja nivel + horas totales; sin nivel → "revisar".
3. Mover un alumno de un grupo a otro (quita del origen, añade al destino).
4. "Quitar del grupo" lo devuelve a "Sin asignar".
5. La ficha muestra el detalle de Apoyo (grupos, franjas, horas, nivel, tarifa).
6. Estados (matricular/preinscribir/lista de espera) funcionan como en Danza.

## 11. Riesgos

- **Tablero grande (App.tsx)**: `ApoyoBoard` y los modales viven en el App.tsx único; seguir el patrón de `DanzaBoard` para minimizar divergencias.
- **`enrollments.group_id` compartido**: ya lo usa Danza como representativo; Apoyo lo usará igual (un alumno no está en Danza y Apoyo bajo el mismo enrollment — son servicios/enrollments distintos, sin colisión).
- **`apoyo_slots` global** queda huérfano: se deja sin uso (no se borra para no romper datos históricos), el board deja de leerlo.
