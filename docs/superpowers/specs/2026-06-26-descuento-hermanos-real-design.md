# Descuento por hermanos: aplicación real al cobro + totales en UI

> Fecha: 2026-06-26
> Proyecto: Secretaría (mw-secretaria) — schema `secretaria`
> Repo: Digmusic88/MWPANEL-4.0

## Contexto y problema

Hoy el descuento por hermanos en Secretaría:

1. **Es solo informativo / agregado.** Se calcula al vuelo en tres sitios (matriz de pagos,
   morosidad, informe de gestoría) como `5€ × (nº hermanos matriculados − 1)` por mes, pero
   **no reduce** ni `charges.amount_due` ni `payments.amount`. Los recibos y pagos se cobran
   siempre a tarifa completa. El descuento nunca queda registrado.
2. **Tiene doble fuente de verdad incoherente.** El cálculo usa la constante hardcodeada
   `SIBLING_DISCOUNT_EUR = 5` (`payments.controller.ts:12`), mientras que existe la columna
   editable `fee_schedules.siblings_discount_eur` (poblada con 60€) que **nunca se lee**. Editar
   ese campo en la UI no tiene efecto.

**Verificación previa (importante):** el descuento que se calcula HOY es correcto en su semántica
— se aplica **sobre el total de la familia** (`5 × (n−1)`, una sola vez: 2 hermanos → 5€, no 5€ a
cada uno). No hay cobros mal calculados que rehacer, porque el descuento nunca se grabó por-hermano.

## Objetivo

1. **Unificar la fuente del importe** en un único ajuste editable.
2. **Materializar el descuento** como un registro real, aplicable manualmente, que reduzca el neto
   a cobrar de la familia (manteniendo las cuotas individuales a tarifa completa).
3. **Mostrar en la UI** el total sin descuento (bruto) y el total final con descuento (neto).

## Decisiones de diseño (acordadas)

| Decisión | Elección |
|---|---|
| Fuente del importe | Ajuste editable `sibling_discount_eur` (5€/mes por hermano adicional), **global del centro** en `org_settings`. La columna `fee_schedules.siblings_discount_eur` queda en desuso. |
| Mecanismo | Una **línea de descuento (abono) por familia y mes** en la matriz. Las cuotas siguen a tarifa completa; el neto familiar = Σ cuotas − descuentos aplicados. |
| Meses con descuento | Solo meses con **≥2 hermanos facturados** ese mes. Importe del mes = `tarifa × (hermanos con cuota>0 ese mes − 1)`. |
| Aplicación | **Clic manual** en la celda de descuento (mismo gesto que el resto de la matriz). |
| Totales en UI | **Matriz de pagos + Morosidad + Informe gestoría** (sin ficha de familia). |

## Arquitectura

### 1. Ajuste del importe — `org_settings`

- Nueva clave `sibling_discount_eur` en `secretaria.org_settings` (KV global existente), default `'5'`.
- Helper cacheado en `payments.controller` (`getSiblingDiscountEur()`, caché en memoria con TTL
  corto, patrón ya usado) que lee la clave; fallback a `5` si no existe o no es numérica.
- Endpoints nuevos en `payments.controller`:
  - `GET /payments/discount-setting` → `{ siblingDiscountEur: number }`
  - `PUT /payments/discount-setting { siblingDiscountEur }` → upsert en `org_settings` (rol
    `secretaria_admin`). Invalida la caché.
- La constante `SIBLING_DISCOUNT_EUR = 5` se elimina; los 3 sitios de cálculo usan el helper.
- **Limpieza de la incoherencia de 60€:** quitar el campo "Descuento hermanos (€)" del formulario
  de tarifas (`App.tsx:1316`), del DTO/entidad de `fee-schedules` y del clonado en `catalog`. La
  columna física `fee_schedules.siblings_discount_eur` se deja en BD (no se borra en prod) pero
  deja de usarse y leerse en cualquier punto.

### 2. Registro del descuento — tabla `secretaria.sibling_discounts`

Migración SQL **idempotente** (aplicada con `docker exec mw-panel-db-prod psql ...` + `INSERT INTO
migrations`, según CLAUDE.md — NO `migration:run`).

```sql
CREATE TABLE IF NOT EXISTS secretaria.sibling_discounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        uuid NOT NULL REFERENCES secretaria.families(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL,
  period           text NOT NULL,                 -- 'YYYY-MM'
  amount           numeric(8,2) NOT NULL,         -- importe aplicado (snapshot)
  status           text NOT NULL DEFAULT 'aplicado', -- 'aplicado' | 'anulado'
  method           text NULL,                     -- método de cobro (efectivo, transferencia, ...)
  applied_at       date NOT NULL DEFAULT CURRENT_DATE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, period)
);
CREATE INDEX IF NOT EXISTS idx_sibling_discounts_year ON secretaria.sibling_discounts(academic_year_id);
```

Solo existen filas para meses **aplicados** (o anulados). Un mes sin fila = descuento pendiente.

### 3. Cálculo del descuento elegible por familia/mes

Función reutilizable (SQL o TS) que, para un año académico, devuelve por familia y mes:
`elegible(familia, mes) = tarifa_descuento × max(0, (nº hermanos con fn_resolve_month_amount > 0 ese mes) − 1)`.

Cuenta hermanos **con cuota real ese mes** (factor de programa aplicado), no solo matriculados.

### 4. Endpoints de aplicación

En `payments.controller`:

- `POST /payments/apply-discount { familyId, period, method?, paidAt? }`
  - Recalcula el importe elegible del mes (servidor, no confía en el cliente).
  - Si elegible ≤ 0 → no-op (no crea fila).
  - `INSERT ... ON CONFLICT (family_id, period) DO UPDATE` con `status='aplicado'`, `amount`,
    `method`, `applied_at`. Idempotente.
  - Roles: `secretaria_admin`, `secretaria_staff`.
- `POST /payments/unapply-discount { familyId, period }`
  - `UPDATE ... SET status='anulado'` (o DELETE). Idempotente.

### 5. Cambios en `GET /payments/matrix`

`discountRows` pasa de `{ familyId, familyName, monthly }` a:

```ts
{
  familyId, familyName,
  cells: {
    'YYYY-MM': { eligible: number, applied: boolean, amount: number | null }
    // solo meses con eligible > 0
  }
}
```

Y se devuelven dos totales del ámbito visible (servicio filtrado o todos):

```ts
totals: {
  bruto: number,   // Σ amount_due de todos los charges del ámbito (lo que se factura sin descuento)
  descuentoAplicado: number, // Σ amount de sibling_discounts status='aplicado' del año/ámbito
  neto: number     // bruto − descuentoAplicado
}
```

> Nota de ámbito: cuando la matriz se filtra por servicio, el conteo de hermanos sigue cruzando
> todos los servicios (regla actual). Los totales bruto/neto se calculan sobre el ámbito visible.

### 6. Cambios en `GET /payments/overdue` (Morosidad)

- Sustituir la constante por el ajuste configurable.
- Alinear el cálculo a la regla "solo meses con ≥2 hermanos facturados". El `netDue` por familia
  pasa a descontar el total elegible coherente con la matriz.

### 7. Cambios en el informe de gestoría (Excel, `reports.controller.ts:177-207`)

- La línea de descuento pasa de estimación informativa a la **suma de descuentos realmente
  aplicados** (`sibling_discounts` status='aplicado') en el rango del informe. Importe configurable.

## Frontend (`App.tsx`, componente `Pagos` y `Configuración`)

1. **Celda de descuento clicable** (`renderCell`, ~`App.tsx:2086`):
   - Mes con `eligible>0` no aplicado → tag rojo `−X€` borde punteado, `onClick` abre el modal de
     cobro (fecha+método) → `POST /payments/apply-discount`.
   - Mes aplicado → tag verde `✓ −X€`, `onClick` permite anular → `POST /payments/unapply-discount`.
   - Mes sin elegibilidad → vacío.
   - El `dataSource` (`App.tsx:2163`) mapea las nuevas `discountRows` con `cells` por periodo.
2. **Resumen de totales** en la pantalla de Pagos: tarjetas/footer con **Total bruto (sin
   descuento)** y **Total neto (con descuento)**, leídos de `data.totals`.
3. **Morosidad**: ya muestra bruto/neto (`App.tsx:2253-2254`); sin cambios de UI, solo realineado
   por el backend.
4. **Configuración** (componente de la pestaña "Curso y centro", junto a `CreditorSettings`):
   nuevo campo "Descuento por hermanos (€/mes por hermano adicional)" que lee/escribe
   `/payments/discount-setting`.
5. **Tarifas**: eliminar el campo muerto "Descuento hermanos (€)" (`App.tsx:1316`).

## Manejo de errores / casos límite

- `apply-discount` con elegible ≤ 0 → no crea fila, responde `{ ok: true, applied: false }`.
- Recalcular siempre en servidor el importe (no confiar en el cliente) para evitar manipulación.
- Idempotencia por `UNIQUE(family_id, period)` + `ON CONFLICT`.
- Anular un descuento ya anulado / inexistente → no-op.
- Familias con 1 solo hermano facturado un mes → sin descuento ese mes (correcto por diseño).

## Pruebas / verificación

- SQL: verificar creación de tabla y unicidad; insertar/recalcular un caso real de 2 y 3 hermanos.
- Backend: `apply-discount` idempotente; `matrix` devuelve `cells`+`totals` correctos; `overdue`
  alineado; recálculo servidor coincide con la matriz.
- Datos reales: familia de 2 hermanos → 5€/mes en meses con ambos facturados; familia de 3 → 10€.
- Frontend: clic aplica/anula y refleja el neto; Configuración guarda el importe y se propaga.
- Salud post-deploy: `curl https://secretaria.mundoworld.school/...` o el endpoint de salud.

## Despliegue

1. Aplicar SQL idempotente (tabla + clave `org_settings`) en `mw-panel-db-prod` + `INSERT INTO migrations`.
2. Backend: rebuild imagen `mw-secretaria-api` + recrear contenedor (`--env-file backend/.env`,
   red `mw-panel_mw-network`, `127.0.0.1:3010`).
3. Frontend: `npm run build` → copiar a `/opt/mw-secretaria/frontend-dist`.
4. **Commit + push a `Digmusic88/MWPANEL-4.0`** (origin vía alias SSH `github-secretaria`).
5. Verificar en https://secretaria.mundoworld.school.
6. Avisar por correo a diegomusica88@gmail.com.

## Fuera de alcance (YAGNI)

- Totales en la ficha de familia (requeriría endpoint nuevo en `/families/:id`).
- Descuento por año académico (el ajuste es global del centro).
- Borrado físico de la columna `fee_schedules.siblings_discount_eur`.
- Aplicación automática del descuento (se eligió clic manual).
