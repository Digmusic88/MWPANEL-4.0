# Organización y facturación de Danza (Secretaría)

> **Fecha**: 2026-06-22 · **Estado**: Diseño aprobado · **Ámbito**: `/opt/mw-secretaria`

## Objetivo
Danza no funciona como Inglés (grupos estancos). Un grupo ofrece varios días y cada alumno asiste a **días concretos** (1 o 2 de un grupo, o días de varios grupos). La **mensualidad depende del total de días/semana** que suma el alumno (no del grupo en sí), con tabla de tramos por nº de días **definible por defecto y por grupo**. Además, el **maillot** debe ser cobrable de forma seleccionable por grupo. Y una **sección propia "Danza"** en el menú para organizarlo.

## Decisiones (confirmadas con el usuario)
1. **Unidad** = días/semana.
2. **Tarifa** = tramos por nº de días; tabla **por defecto** de Danza + **overrides por grupo** "en caso de necesidad".
3. **Mezcla de grupos**: si todos los días del alumno son de UN grupo (con override) → su tabla; si reparte entre varios grupos → **tabla por defecto** para el total de días.
4. **Maillot**: toggle **por grupo**; si el alumno tiene algún día en un grupo que lo cobra → **10€ UNA vez/año** (aunque esté en varios grupos con maillot).
5. **Alcance**: construir el modelo nuevo para el **curso activo en adelante**; **consolidar** los grupos "X 1 día / 2 días" en grupos únicos. NO migrar 2025-2026 (cerrado).

## Estado actual relevante
- Programas Danza hoy: "Grupo Negro A – 1/2 días" (35/55€), "Resto grupos – 1/2 días" (30/50€). Grupos activos: "Grupo Negro A 1 día/2 días", "Morado 1 día/2 días".
- Maillot: tarifa `fee_schedules` concept `maillot` 10€ (servicio DANZA) — **existe pero no se cobra**. Enum `fee_concept` ya incluye `maillot`.
- Curso activo 2026-2027: 52 preinscritos Danza, 0 matriculados, 0 recibos. 2025-2026: 53 matriculados (cerrado, intacto).

## Modelo de datos (migraciones)

### `secretaria.danza_assignments` (asignación por días, estilo Apoyo)
```sql
CREATE TABLE secretaria.danza_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id uuid NOT NULL REFERENCES secretaria.enrollments(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES secretaria.groups(id) ON DELETE CASCADE,
  weekday int NOT NULL,            -- 1..7
  start_time time NOT NULL,
  room varchar,
  UNIQUE (enrollment_id, group_id, weekday, start_time)
);
```
El alumno tiene UNA matrícula de Danza (constraint student+year+service); sus días reales viven aquí (varias filas). **Total días = count(danza_assignments)** de su matrícula. **Grupos = distinct group_id**.

### `secretaria.danza_fee_tiers` (tramos por nº de días)
```sql
CREATE TABLE secretaria.danza_fee_tiers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES secretaria.groups(id) ON DELETE CASCADE,  -- NULL = por defecto
  days int NOT NULL,
  amount numeric(8,2) NOT NULL
);
CREATE UNIQUE INDEX danza_tier_default ON secretaria.danza_fee_tiers(days) WHERE group_id IS NULL;
CREATE UNIQUE INDEX danza_tier_group   ON secretaria.danza_fee_tiers(group_id, days) WHERE group_id IS NOT NULL;
```
Seed inicial: default `1→30, 2→50`; override grupo "Negro A" `1→35, 2→55`. Tramos 3/4… se añaden por UI cuando se necesiten (sin fila = no facturable ese tramo → NULL).

### `secretaria.groups.bills_maillot boolean DEFAULT false`
Toggle por grupo.

## Resolución de tarifa
- **`fn_resolve_danza_monthly(enrollment_id)`**: `d` = total días (count assignments). `gset` = distinct group_ids. Si `d=0` → NULL. Si `count(distinct gset)=1` y existe tier override `(group_id=ese, days=d)` → su amount; si no → tier default `(group_id NULL, days=d)` (NULL si no existe).
- **`fn_resolve_monthly_fee(enrollment_id)`** se hace **Danza-aware**: si el servicio de la matrícula es DANZA → devuelve `fn_resolve_danza_monthly`; si no, la lógica actual (override→grupo→programa→servicio). Así la matriz, `generate-charges` y `fn_resolve_month_amount` (×factor mes, sept=½) usan la tarifa por tramos sin cambios adicionales.
- **Maillot**: `fn_resolve_danza_maillot(enrollment_id)` = importe `maillot` de `fee_schedules` (servicio DANZA) si EXISTS algún assignment cuyo grupo tiene `bills_maillot`; si no, NULL/0.
- **Factor de mes (sept=½)**: `fn_resolve_month_amount` = base × `fn_resolve_month_factor(programa_de_e.group_id, mm)`. Para que el factor de Danza se resuelva, al asignar/quitar días se mantiene `enrollments.group_id` = un **grupo representativo** (el de alguno de sus assignments; NULL si no tiene ninguno). Todos los programas Danza comparten el mismo `month_billing`, así que el grupo concreto no altera el factor.

## Integración en Pagos
- `generate-course-charges`: para matrículas DANZA, además de la mensualidad por tramos (ya vía fn_resolve_month_amount), generar **una** vez el recibo `maillot` (sin periodo) si `fn_resolve_danza_maillot > 0` y no existe ya. (Matrícula Danza sigue por `bills_matricula` del programa.)
- **Matriz de Pagos**: añadir columna/concepto **Maillot** (junto a Matrícula/Material). La mensualidad ya saldrá por tramos.

## Backend (endpoints nuevos, módulo `catalog` o `danza`)
- Tarifas tramos: `GET /danza/tiers?groupId?` (default + overrides), `POST /danza/tiers {groupId?, days, amount}` (upsert), `DELETE /danza/tiers/:id`.
- Asignaciones: `GET /danza/board?academicYearId` (grupos + alumnos con sus días + total + tarifa resuelta + sin asignar), `POST /danza/assign {enrollmentId, groupId, weekday, startTime, room}`, `DELETE /danza/assignment/:id`.
- Maillot toggle: vía `PATCH /catalog/groups/:id {billsMaillot}` (ampliar updateGroup) + entidad Group.

## Frontend
- **Sección "Danza"** en el menú (clave `danza`, icono propio), como Apoyo: tablero de grupos donde se asignan alumnos a **días concretos** (arrastrar / añadir día), mostrando por alumno sus días, total y **mensualidad resuelta**; columna "Sin asignar". + **Horario por aulas** de Danza (una sola aula) con las franjas de los grupos.
- **Editor de grupo** (Grupos): switch **"Cobra maillot"** (para Danza).
- **Editor de tramos**: en el grupo o en Tarifas, tabla de precios por nº de días (default + override por grupo).
- **Pagos**: la mensualidad de Danza sale por tramos; nueva columna Maillot.

## Consolidación (one-off, solo curso activo en adelante)
- Fusionar programas "Negro A – 1/2 días" → "Grupo Negro A"; "Resto grupos – 1/2 días" → "Resto grupos" (conservar month_billing). Fusionar grupos "X 1 día/2 días" → grupo único. Re-apuntar las matrículas/preinscritos del curso activo al grupo único. Borrar programas/grupos redundantes. Seed de tiers desde los precios actuales (default 30/50; Negro A 35/55). Backup previo. NO tocar 2025-2026.

## Fases
1. **Backend**: migraciones (tablas + bills_maillot) + consolidación + seed tiers + funciones de resolución (Danza-aware) + integración pagos (mensualidad por tramos + maillot) + endpoints (tiers, assignments, toggle maillot).
2. **Frontend**: sección "Danza" (tablero por días + horario), switch maillot en grupo, editor de tramos, columna Maillot en Pagos.

## Fuera de alcance (v1)
- Migrar/re-modelar 2025-2026 (cerrado).
- Facturación por horas reales distintas por sesión (se usa nº de días).
- Integrar maillot/mensualidad-por-tramos en el cobro celda-a-celda más allá de mostrar y generar el recibo correcto.

## Criterios de aceptación
- Alumno con 1 día de "Negro A" → mensualidad 35€; con 2 días de Negro A → 55€; 1 día Negro A + 1 día Resto (2 días, mezcla) → tarifa **default** de 2 días (50€).
- Sin tramo definido para ese nº de días → mensualidad NULL (no factura hasta definirlo).
- Maillot: alumno en grupo con `bills_maillot` → recibo maillot 10€ una sola vez; en dos grupos con maillot → sigue 10€ (no 20€).
- Sección Danza: asignar días a un alumno actualiza su total y su tarifa; horario muestra las franjas de Danza.
- 2025-2026 intacto.
