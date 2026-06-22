# Borrar grupos (Secretaría)

> **Fecha**: 2026-06-22 · **Estado**: Diseño aprobado · **Ámbito**: `/opt/mw-secretaria`

## Objetivo
Permitir **borrar grupos** desde el listado de Grupos, **bloqueando** el borrado si el grupo tiene alumnos matriculados (consistente con cómo Programas bloquea si tiene grupos).

## Contexto / claves foráneas a `secretaria.groups`
- `enrollments.group_id` → **SET NULL** (los alumnos quedarían "sin grupo", no se borran).
- `schedule_slots`, `fee_schedules`, `notebook_sections`, `notebook_entries` → **CASCADE** (se borran con el grupo).
- `events.group_id`, `exam_candidates.group_id` → SET NULL.

Como `enrollments` es SET NULL, un `DELETE` crudo **no** fallaría aunque haya alumnos → la protección debe ser una **comprobación explícita** del número de matrículas.

## Backend (`catalog.controller.ts`)
- `@Delete('groups/:id') @Roles('secretaria_admin')` (admin-only, igual que `deleteProgram`).
- Lógica:
  1. `SELECT count(*) FROM secretaria.enrollments WHERE group_id = :id` → `n`.
  2. Si `n > 0` → `return { ok: false, error: 'No se puede borrar: el grupo tiene N alumno(s). Quítalos del grupo primero.' }` (con N real).
  3. Si `n === 0` → `await this.groups.delete(id)` (la cascada elimina franjas/tarifas/cuaderno del grupo, irrelevantes en un grupo vacío) → `return { ok: true }`.

## Frontend (componente `Grupos`)
- `function Grupos({ user }: { user?: any })` (hoy no recibe `user`); en App, render `<Grupos user={user} />`.
- `const isAdmin = user?.secretariaRoles?.includes('secretaria_admin')`.
- En la columna de acciones (junto a "Editar"), si `isAdmin`, añadir botón **borrar** (icono papelera, `danger`) con `Popconfirm` ("¿Borrar grupo? Si no tiene alumnos, se elimina junto con sus franjas de horario y apartados de cuaderno.").
- `onConfirm` → `api.delete('/catalog/groups/:id')`; si `data.ok === false` → `message.warning(data.error)`; si OK → `message.success('Grupo eliminado')` + `load()`.
- Refresco en vivo: ya cubierto (topic `groups` con trigger).

## Fuera de alcance
- Borrado de **Familias** (más cascada: tutores/alumnos/recibos) — pendiente de decisión del usuario.
- **Ajuste de fechas de trimestre por grupo** — funcionalidad aparte y mayor; se diseña a continuación.

## Criterios de aceptación
- Borrar un grupo con alumnos → mensaje de bloqueo, el grupo NO se borra.
- Borrar un grupo vacío → se elimina; desaparece del listado (y del tablero) en vivo.
- El botón de borrar solo lo ve un `secretaria_admin`.
