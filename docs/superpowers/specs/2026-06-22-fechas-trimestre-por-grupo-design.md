# Fechas de trimestre por grupo (Secretaría)

> **Fecha**: 2026-06-22 · **Estado**: Diseño aprobado · **Ámbito**: `/opt/mw-secretaria`

## Objetivo
Permitir ajustar, **por grupo y por trimestre**, las fechas de inicio/fin, porque distintos grupos tienen días distintos en los trimestres. Si no se define override, el grupo usa las fechas globales del curso. El override **cambia qué días son lectivos para ese grupo** (conteo de sesiones y días del cuaderno), no es solo informativo.

## Contexto actual
- `secretaria.academic_terms(id, academic_year_id, name, start_date, end_date, sort_order)` — trimestres **globales** por curso.
- `CLASS_DAY_FILTER` (notebook.controller.ts:32) decide si un día es lectivo: `(no hay terms del año OR el día ∈ algún term) AND el día ∉ non_class_days`. Tiene el grupo `g` en contexto (usa `g.academic_year_id`).
- Se reutiliza en `sessionDates`, `/notebook/sessions`, `/notebook/week`, `/notebook/day` (conteo de sesiones + cuaderno).

## 1. Datos — migración 030
```sql
CREATE TABLE secretaria.group_term_dates (
  group_id uuid NOT NULL REFERENCES secretaria.groups(id) ON DELETE CASCADE,
  academic_term_id uuid NOT NULL REFERENCES secretaria.academic_terms(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  PRIMARY KEY (group_id, academic_term_id)
);
```
Una fila = override (ambas fechas) de ese grupo para ese trimestre. Sin fila = global.

## 2. Integración (núcleo) — `CLASS_DAY_FILTER`
En la parte "el día ∈ algún term", añadir `LEFT JOIN secretaria.group_term_dates gtd ON gtd.academic_term_id=at2.id AND gtd.group_id=g.id` y comparar con `COALESCE(gtd.start_date, at2.start_date)` / `COALESCE(gtd.end_date, at2.end_date)`:
```sql
OR EXISTS (
  SELECT 1 FROM secretaria.academic_terms at2
  LEFT JOIN secretaria.group_term_dates gtd
    ON gtd.academic_term_id = at2.id AND gtd.group_id = g.id
  WHERE at2.academic_year_id = g.academic_year_id
    AND {D} BETWEEN COALESCE(gtd.start_date, at2.start_date)
                AND COALESCE(gtd.end_date, at2.end_date))
```
Como `g` ya está en contexto en todos los usos, el override se aplica automáticamente a sesiones y cuaderno. **Revisar la agenda de eventos**: si duplica la lógica de term, aplicar el mismo override; si reusa este filtro, ya queda cubierto.

## 3. Backend — módulo `calendario`
- `GET /calendar-config/group-terms?groupId` → trimestres del curso del grupo (vía `groups.academic_year_id`), cada uno: `{ id (term), name, globalStart, globalEnd, start (efectiva), end (efectiva), overridden }`.
- `PUT /calendar-config/group-terms` `{ groupId, academicTermId, startDate, endDate }` → upsert en `group_term_dates`. Valida `startDate <= endDate` (si no, `{ ok:false, error }`). Verifica que el term pertenece al curso del grupo.
- `DELETE /calendar-config/group-terms?groupId&academicTermId` → borra el override (vuelve a global).
- Rol: `secretaria_admin, secretaria_staff, direccion` (igual que el CRUD de trimestres).

## 4. Frontend — listado de `Grupos`
- Botón **"Trimestres"** por fila (junto a Editar/Borrar), visible para admin/staff/dirección.
- Modal: `GET group-terms` del grupo; por cada trimestre: nombre, dos inputs `date` precargados con la fecha **efectiva**, la global como referencia ("Global: dd-mm-aaaa → dd-mm-aaaa"), enlace **"Restablecer"** (DELETE override → recarga) y botón **Guardar** (PUT por trimestre modificado; valida start ≤ end en cliente también).
- Tras guardar: `message.success` + cerrar. (Los `<Input type="date">` van en ISO; la visualización de referencia usa `fmtDate`.)

## 5. Fuera de alcance (YAGNI)
- Días sin clase por grupo (solo inicio/fin de trimestre).
- Refresco en vivo de estos overrides (config que casi nunca se edita en paralelo).

## Criterios de aceptación
- Poner un override que acorte el trimestre de un grupo → su conteo de sesiones (`/notebook/sessions`) baja; otros grupos no cambian.
- "Restablecer" un trimestre → el grupo vuelve al conteo global.
- `startDate > endDate` → rechazado con mensaje.
- Borrar el grupo (feature previa) → sus overrides desaparecen (cascada).
