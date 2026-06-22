# Tablero de Danza estilo kanban: estados + colocación, y Pagos (Secretaría)

> **Fecha**: 2026-06-22 · **Estado**: Diseño aprobado · **Ámbito**: `/opt/mw-secretaria`

## Objetivo
Llevar al tablero de la sección **Danza** la misma lógica de la **Organización del centro**: estados de matrícula (preinscrito / matriculado / lista de espera / pendiente) con tarjetas coloreadas y menú ⋯, y la **colocación de alumnos en grupos** estilo kanban (arrastrar a una columna de grupo) — adaptado al modelo de Danza por **días** (`danza_assignments`). Además, que **Pagos** muestre la lógica de Danza (mensualidad por tramo + maillot de los matriculados) con un **indicador de días**.

## Contexto
- Danza ya se organiza por días (`danza_assignments`); la mensualidad sale por tramos (`danza_fee_tiers`) y hay maillot por grupo (Fase 1+2). Danza ya está fuera del kanban del centro y en el feed de tiempo real (topic `danza`).
- El kanban del centro (`Organizacion`) usa: `ORG_STATUS` (colores), menú ⋯ por tarjeta (matricular/preinscrito/lista_espera, comentario, mover/quitar grupo), columna "Sin grupo / Bolsa", y `PATCH /enrollments/:id {status|groupId|notes}` (ya existe y se refleja en toda la plataforma).
- Cada alumno tiene UNA matrícula de Danza → su **estado y comentario son de la matrícula** (iguales en todas sus tarjetas); los **días** son por grupo.

## 1. Backend
### `GET /danza/board?academicYearId` (modificar)
Devolver `{ groups, students }` (se elimina la separación `pool`; el frontend deriva la bolsa):
- `groups`: como ahora — `[{id,name,room,color,billsMaillot,schedule:[{weekday,startTime,room}]}]`.
- `students`: **todas** las matrículas Danza del año con status IN (matriculado, preinscrito, lista_espera, pendiente):
  `{ enrollmentId, studentName, status, comment, assignments:[{id,groupId,weekday,startTime,room}], totalDays, monthly, maillot }`.
  - `status` = `e.status`; `comment` = `e.notes`.
  - `totalDays` = nº de assignments; bolsa = los que tienen `totalDays === 0`.

### `DELETE /danza/assignments?enrollmentId&groupId` (nuevo) — "quitar del grupo"
Borra TODAS las `danza_assignments` de ese (enrollment, group) de un golpe; mantiene `enrollments.group_id` = un grupo representativo de los assignments restantes (NULL si no quedan). Rol admin/staff/dirección.

### Reutilizados (sin cambios)
- Estado/comentario: `PATCH /enrollments/:id { status }` y `{ notes }` (ya existen, los usa el kanban).
- Asignar un día: `POST /danza/assign` (ya existe; valida servicio Danza). Quitar un día: `DELETE /danza/assignment/:id`.

## 2. Frontend — `DanzaBoard` reescrito como kanban
- Layout: columna **"Bolsa / Sin asignar"** (alumnos con `totalDays===0`) + **una columna por grupo**.
- **Scroll interno por columna**: la bolsa y cada columna-grupo tienen **altura acotada con scroll vertical interno** (p.ej. `maxHeight: '70vh', overflowY: 'auto'`), para que con muchos alumnos (50+) la columna no se estire y se pueda arrastrar el último a un grupo de arriba sin recorrer toda la página. Las cabeceras de columna quedan visibles.
- Cada alumno = **tarjeta en cada grupo al que asiste** (los que sus assignments incluyen ese `groupId`); tarjeta coloreada por `ORG_STATUS[status]`, mostrando los **días en ese grupo** (`DOW[weekday] HH:MM`) y 💬 si hay comentario. En la bolsa, tarjeta sin días. **Todas las tarjetas son arrastrables** (bolsa y grupos), no solo las de la bolsa.
- **Colocación con selector de días**: arrastrar un alumno a una columna-grupo abre `DanzaDaysModal(group, student)` con las **franjas del grupo como casillas** (marcadas = días actuales del alumno en ese grupo). Al confirmar, **sincroniza**: por cada franja marcada sin assignment → `POST /danza/assign`; por cada assignment desmarcado → `DELETE /danza/assignment/:id`. El mismo modal se abre desde la tarjeta (clic) o ⋯ → "Editar días".
- **Arrastre = MOVER** (no copiar): si la alumna se arrastra desde OTRO grupo (la tarjeta venía de un grupo origen distinto al destino), tras confirmar los días del destino se **quitan sus días del grupo origen** (`DELETE /danza/assignments?enrollmentId&groupId=origen`). Resultado: pasa del grupo A al B. Para tenerla en dos grupos a la vez, se arrastra desde la **bolsa** (no quita de ningún grupo) o se usa ⋯ → "Editar días" en cada grupo. Arrastrar dentro del MISMO grupo o a la bolsa no aplica el borrado de origen (la bolsa no es un grupo).
- Menú **⋯** por tarjeta: **Matricular / Preinscribir / Lista de espera** (`PATCH /enrollments/:id {status}`), **Comentario** (`window.prompt` → `PATCH … {notes}`, igual que el kanban), **Quitar del grupo** (`DELETE /danza/assignments?enrollmentId&groupId`). Tras cada acción, recarga (y el topic `danza`/`enrollments` refresca en vivo).
- Mantener un **resumen** compacto (tabla o pie de tarjeta) con total de días + mensualidad resuelta (o "sin tramo") + maillot. La columna "Tramos de tarifa" sigue.
- `useLiveQuery(['enrollments','groups','danza'], load)` (ya está).
- Reusar `ORG_STATUS`/`orgStat` del módulo (ya existen para el kanban).

## 3. Frontend — Pagos
- `GET /payments/matrix` añade, por fila (matrícula), `danzaDays` = nº de `danza_assignments` (0 si no es Danza o sin días). 
- En la matriz, para filas de Danza, mostrar un **tag "N días"** junto al nombre o en la columna Tarifa, para que se entienda de dónde sale la mensualidad por tramo. La mensualidad ya sale por `fn_resolve_monthly_fee` (Danza-aware) y el maillot ya tiene columna (Fase 1).
- Los matriculados de Danza aparecen automáticamente (la matriz filtra `status='matriculado'`); con el nuevo flujo de matricular en el tablero, saldrán solos.

## Fuera de alcance (YAGNI)
- Mover por arrastre entre dos grupos en un gesto (se usa: arrastrar a un grupo abre su selector de días; quitar del otro vía ⋯/selector).
- Lista de espera con prioridad/orden (solo el estado, como en el kanban).
- Recordar comentarios por grupo (el comentario es de la matrícula, como en el kanban).

## Fases
1. **Backend**: board con `status`/`comment` + `students` unificado; endpoint `DELETE /danza/assignments` (quitar grupo); matrix `danzaDays`.
2. **Frontend tablero**: `DanzaBoard` kanban + `DanzaDaysModal` + estados/comentario/quitar-grupo.
3. **Frontend Pagos**: tag de días en filas Danza.

## Criterios de aceptación
- Arrastrar una alumna de la bolsa a un grupo → selector de días → al confirmar, aparece como tarjeta en ese grupo con esos días; su mensualidad por tramo se recalcula.
- Cambiar su estado a "Matriculado" desde ⋯ → tarjeta verde ✓; aparece en Pagos con su mensualidad por tramo, maillot (si el grupo lo cobra) y el tag "N días".
- Una alumna en 2 grupos aparece como tarjeta en ambos; "Quitar del grupo" en uno la deja solo en el otro; quitar de todos → vuelve a la bolsa.
- **Arrastrar una alumna YA asignada del grupo A al grupo B** (selector de días de B) → queda solo en B (se le quitan los días de A). Arrastrar desde la bolsa a un grupo NO la quita de otros grupos.
- La columna "Sin asignar" con 50 alumnos **no estira la página**: tiene scroll vertical interno; se puede arrastrar el último a un grupo de la parte alta.
- Comentario por ⋯ → 💬 en todas sus tarjetas.
- Lista de espera → tarjeta naranja; no genera recibos (Pagos solo matriculados).
- Refresco en vivo entre dos sesiones (topic `danza`).
