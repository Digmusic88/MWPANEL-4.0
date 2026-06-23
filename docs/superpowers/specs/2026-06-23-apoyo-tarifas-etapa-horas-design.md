# Apoyo: tarifa por etapa + horas y colocación con tarifas mixtas

> Fecha: 2026-06-23
> Ámbito: **solo el servicio Apoyo** (`services.code = 'APOYO'`). El resto de servicios no cambia.

## Problema

Hoy en Secretaría la tarifa se resuelve por la cadena `custom_fee → grupo → programa → servicio`,
y los grupos cuelgan de un programa. Apoyo, sin embargo, **no coloca con grupos**: usa **franjas**
(`apoyo_assignments`: día × hora × sala) y sus matrículas van **sin grupo ni programa**
(`group_id = NULL`). Consecuencia actual: la mensualidad de un alumno de Apoyo resuelve a `NULL`
salvo que se le ponga una tarifa manual (`custom_fee`), porque no existe mensualidad a nivel de
servicio para Apoyo (solo por programa: Apoyo Primaria 68 € / Apoyo ESO 75 € / Apoyo Bachillerato 95 €,
en `013_real_fees.sql`).

La necesidad: en una **misma franja/hora** conviven alumnos de **Primaria, Secundaria y Bachillerato**,
cada uno con **su propia tarifa**, que además depende de **cuántas horas/semana** asiste. La tarifa
debe calcularse sola en función de **etapa + horas**, sin depender del grupo/franja, y los **tramos**
(combinaciones etapa × horas → importe) deben ser **configurables desde la interfaz**.

## Enfoque

Replicar el patrón ya existente para **Danza** (`031_danza_model.sql`, `032_danza_fee_functions.sql`):
una tabla de tramos propia del servicio + una rama `IF servicio = APOYO` dentro de las funciones de
precio. Así no se altera la lógica de ningún otro servicio. Danza factura por **nº de días**; Apoyo
facturará por **etapa + nº de horas**.

Alternativas descartadas:
- Meter "etapa" y "horas" en la tabla genérica `fee_schedules`: contamina el precio de todos los servicios.
- Dejarlo todo a `custom_fee` manual: descartado por el usuario; quiere tramos configurables.

## 1. Modelo de datos (migración `036_apoyo_fees.sql`)

Todo en el esquema `secretaria`.

### 1.1 Etapa en la matrícula de Apoyo
```sql
CREATE TYPE secretaria.apoyo_level AS ENUM ('primaria','secundaria','bachillerato');
ALTER TABLE secretaria.enrollments
  ADD COLUMN IF NOT EXISTS apoyo_level secretaria.apoyo_level NULL;
```
- Nullable; **solo** se rellena en matrículas de Apoyo. Ningún otro servicio la lee.
- Una matrícula de Apoyo por (alumno, año) → una etapa por alumno/curso (suficiente).

### 1.2 Horas por franja
```sql
ALTER TABLE secretaria.apoyo_assignments
  ADD COLUMN IF NOT EXISTS hours numeric(4,2) NOT NULL DEFAULT 1;
```
- Cada franja vale 1 hora por defecto; editable (p. ej. 0,5).
- **Horas/semana del alumno = `SUM(hours)`** de sus `apoyo_assignments`.

### 1.3 Tabla de tramos configurable
```sql
CREATE TABLE secretaria.apoyo_fee_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES secretaria.academic_years(id) ON DELETE CASCADE,
  etapa   secretaria.apoyo_level NOT NULL,
  concept secretaria.fee_concept NOT NULL,   -- mensualidad | matricula | material
  hours   numeric(4,2) NULL,                 -- NULL = importe fijo por etapa (independiente de horas)
  amount  numeric(8,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (academic_year_id, etapa, concept, hours)
);
```
- **mensualidad**: una fila por (etapa, horas). Ej.: (primaria, mensualidad, 1, 68), (primaria, mensualidad, 2, 120)…
- **matrícula / material**: filas con `hours = NULL` → importe **fijo por etapa**. (Si en el futuro se quiere
  que varíen por horas, basta añadir filas con `hours` no nulo; el modelo ya lo soporta.)
- **Por año académico**: permite cambiar precios cada curso.
- `UNIQUE` con `hours` nullable: PostgreSQL trata `NULL` como distinto, así que las filas fijas
  (hours NULL) por (año, etapa, concepto) podrían duplicarse a nivel de constraint. Se añade además un
  índice único parcial para garantizar una sola fila fija por concepto/etapa/año:
  ```sql
  CREATE UNIQUE INDEX apoyo_fee_tiers_flat_uniq
    ON secretaria.apoyo_fee_tiers (academic_year_id, etapa, concept)
    WHERE hours IS NULL;
  ```

## 2. Cálculo de la tarifa (migración `036_apoyo_fees.sql`)

### 2.1 Función auxiliar: importe Apoyo por concepto
```sql
CREATE OR REPLACE FUNCTION secretaria.fn_resolve_apoyo_fee(p_enrollment_id uuid, p_concept text)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE v_year uuid; v_level secretaria.apoyo_level; v_hours numeric; v_amount numeric;
BEGIN
  SELECT e.academic_year_id, e.apoyo_level INTO v_year, v_level
  FROM secretaria.enrollments e WHERE e.id = p_enrollment_id;
  IF v_level IS NULL THEN RETURN NULL; END IF;  -- sin etapa no se puede tarifar → "revisar"

  IF p_concept = 'mensualidad' THEN
    SELECT COALESCE(SUM(hours),0) INTO v_hours
    FROM secretaria.apoyo_assignments WHERE enrollment_id = p_enrollment_id;
    -- Tramo: el mayor 'hours' que NO supere el total del alumno
    SELECT amount INTO v_amount FROM secretaria.apoyo_fee_tiers
    WHERE academic_year_id=v_year AND etapa=v_level AND concept='mensualidad'
      AND is_active AND hours IS NOT NULL AND hours <= v_hours
    ORDER BY hours DESC LIMIT 1;
    RETURN v_amount;   -- NULL si no hay tramo aplicable
  ELSE
    -- matrícula / material: importe fijo por etapa (hours IS NULL)
    SELECT amount INTO v_amount FROM secretaria.apoyo_fee_tiers
    WHERE academic_year_id=v_year AND etapa=v_level AND concept=p_concept::secretaria.fee_concept
      AND is_active AND hours IS NULL
    LIMIT 1;
    RETURN v_amount;
  END IF;
END; $$;
```

**Selección de tramo por horas**: se elige el tramo cuyo `hours` sea el **mayor que no supere** el
total del alumno (p. ej. total 1,5 h → tramo de 1 h si no existe uno de 1,5). Si el total queda por
debajo del menor tramo definido, devuelve `NULL` y la cuota se mostrará como "sin tarifa / revisar"
(no inventa importe).

### 2.2 Rama Apoyo en `fn_resolve_monthly_fee`
Se redefine la función (mantiene todo lo actual) añadiendo la rama Apoyo justo después de la de Danza,
respetando que **`custom_fee` sigue teniendo prioridad máxima**:
```sql
  IF v_custom IS NOT NULL THEN RETURN v_custom; END IF;
  IF v_service_code = 'DANZA' THEN RETURN secretaria.fn_resolve_danza_monthly(p_enrollment_id); END IF;
  IF v_service_code = 'APOYO' THEN RETURN secretaria.fn_resolve_apoyo_fee(p_enrollment_id,'mensualidad'); END IF;
  -- … (resto igual: grupo → programa → servicio)
```

### 2.3 Rama Apoyo en `fn_resolve_concept_fee` (matrícula / material)
```sql
  -- al principio, tras leer e.service_id/code:
  IF v_service_code = 'APOYO' THEN
    RETURN secretaria.fn_resolve_apoyo_fee(p_enrollment_id, p_concept);
  END IF;
  -- … (resto igual: grupo → programa → servicio)
```
> Nota: `fn_resolve_concept_fee` no lee hoy `service_code`; se añade ese campo al `SELECT` inicial.
> `custom_fee` se mantiene como hoy (no afecta a matrícula/material) — sin cambios en esa semántica.

### 2.4 Réplica en TypeScript (previsualizaciones)
Existe lógica de precio duplicada para previews en `fee-schedules.controller.ts:80-106` y
`catalog.controller.ts:97-105`. Donde se usen para Apoyo deben delegar/alinear con `fn_resolve_apoyo_fee`
o llamar a las funciones SQL para no mostrar importes incoherentes. (Detalle a concretar en el plan;
preferible llamar a la función SQL en vez de reimplementar el tramo.)

## 3. Interfaz (frontend `App.tsx`, `InscripcionDrawer.tsx`)

### 3.1 Tablero de Apoyo (`ApoyoBoard`, `App.tsx:4486-4612`)
- Cada alumno (pool y franjas) muestra **etapa** (selector Primaria/Secundaria/Bachillerato) y **horas totales**.
- Cada franja permite ajustar sus **horas** (0,5 / 1 / …) — `PATCH /apoyo/assignment/:id` extendido con `hours`.
- Se muestra la **mensualidad resuelta** por alumno (llamando a la resolución de precio existente).
- Cambiar etapa de la matrícula de Apoyo: `PATCH /enrollments/:id` extendido con `apoyoLevel`
  (solo válido si el servicio de la matrícula es Apoyo).

### 3.2 Configuración de tramos: "Tarifas de Apoyo" (dentro de `Tarifas`, `App.tsx:1080-1178`)
- Nuevo apartado/tabla editable: filas etapa × concepto × horas → importe, por año académico.
- Endpoints nuevos en un controlador Apoyo de tarifas (o el de fee-schedules):
  `GET/POST/PATCH/DELETE /apoyo/fee-tiers`.
- Validación: para `mensualidad`, `hours` obligatorio (> 0); para `matricula`/`material`, `hours` vacío (fijo).

### 3.3 Alta / edición de matrícula (`InscripcionDrawer.tsx`)
- Cuando el servicio de la matrícula es **Apoyo**, mostrar selector de **etapa** (Primaria/Secundaria/Bachillerato).
- En alta rápida / inscripción completa, persistir `apoyo_level` si hay servicio Apoyo.

## 4. Generación de recibos (sin cambios estructurales)
Los emisores de cargos ya llaman a `fn_resolve_concept_fee` / `fn_resolve_monthly_fee`
(`enrollments.controller.ts`, `payments.controller.ts`, `import.controller.ts`). Al añadir las ramas
Apoyo, esos flujos cogen automáticamente la nueva tarifa. **No se tocan** los emisores salvo que el
plan detecte un punto donde se asuma grupo/programa para Apoyo.

## 5. Migración de datos existente
- Matrículas de Apoyo actuales tienen `apoyo_level = NULL` → su mensualidad seguirá saliendo "revisar"
  hasta que se les asigne etapa. **No se auto-deduce** del texto libre `grade_label` (frágil); se deja
  para que Secretaría asigne etapa desde el tablero. (Si el usuario quiere un mejor-esfuerzo de
  pre-relleno desde `grade_label`, se decide en revisión del plan; por defecto **no**.)
- `apoyo_assignments.hours` existentes → `1` por defecto (DEFAULT de la columna).
- Sembrar `apoyo_fee_tiers` con los precios actuales como punto de partida (mensualidad 1 h:
  primaria 68 / secundaria 75 / bachillerato 95) **opcional**, a confirmar; lo natural es que el usuario
  los configure desde "Tarifas de Apoyo".

## 6. Despliegue (crítico)
1. **Aplicar la migración `036_apoyo_fees.sql` ANTES de reconstruir** el backend de Secretaría
   (lección del incidente con la 035: si el código nuevo usa objetos que aún no existen en BD, arranca roto).
2. Build imagen `mw-secretaria-api:latest` + recrear contenedor con el `docker run` COMPLETO
   (incluido `-v …/database.db:/mocks/database.db`).
3. Frontend: `npm run build` + copiar a `/opt/mw-secretaria/frontend-dist`.
4. Commit + push al repo `Digmusic88/MWPANEL-4.0` (obligatorio en cada cambio de Secretaría).

## 7. Verificación
- Función: para una matrícula Apoyo con etapa=primaria y 2 franjas de 1 h, con tramo (primaria,
  mensualidad, 2, X) → `fn_resolve_monthly_fee` devuelve X. Con una franja a 0,5 (total 1,5) y solo
  tramo de 1 h → devuelve el de 1 h. Sin etapa → NULL.
- `custom_fee` sigue ganando sobre el tramo.
- Otros servicios (Inglés, Danza, Escuela, Táper) **no cambian** de importe (no hay regresión):
  comprobar algún enrollment de cada uno antes/después.
- UI: alta de alumno Apoyo permite etapa; tablero permite cambiar etapa y horas y muestra la cuota;
  "Tarifas de Apoyo" permite CRUD de tramos.

## 8. Fuera de alcance (YAGNI)
- Etapas más granulares que las 3 pedidas.
- Tarifas por horas para matrícula/material (el modelo lo soporta, pero por defecto son fijas por etapa).
- Auto-deducción de etapa desde texto libre.
- Cambios en la lógica de precio de cualquier servicio que no sea Apoyo.
