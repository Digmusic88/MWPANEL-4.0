# Descuento por hermanos (Secretaría)

> **Fecha**: 2026-06-22 · **Estado**: Diseño aprobado · **Ámbito**: `/opt/mw-secretaria`

## Objetivo
Aplicar un descuento por hermanos a las mensualidades: **5€ por cada hermano adicional**, recurrente cada mes, con **tope de 5€ por hermano sin importar en cuántas actividades esté** (no se multiplica por programa). Acumulable por hermano: 2 hermanos → 5€/mes; 3 → 10€/mes; 1 → 0€.

## Reglas
- `hermanos_activos(familia)` = nº de **alumnos distintos** de la familia con al menos una matrícula en estado `matriculado` (cruza todos los servicios).
- `descuento_mensual(familia)` = `5 × max(0, hermanos_activos − 1)`. Constante **5€** (en código, fácil de cambiar).
- Es **uno por familia y mes**, nunca por actividad → cumple el tope automáticamente.

## Enfoque: dinámico (v1, sin almacenar)
No se almacenan recibos negativos ni se añade enum. El descuento se **calcula al vuelo** y se refleja en tres sitios. Ventaja: siempre correcto al cambiar matrículas/hermanos; cero datos que mantener; no toca el flujo de cobro por celda (pay-cell/pay-charge).

### 1. Morosidad (`GET /payments/overdue`) — sitio natural (por familia)
Por familia, además de `totalDue` (suma de `amount_due` pendientes), devolver:
- `siblingDiscountMonthly` = `5×(n−1)`.
- `pendingMonths` = nº de periodos distintos con mensualidad pendiente de la familia.
- `siblingDiscountTotal` = `siblingDiscountMonthly × pendingMonths`.
- `netDue` = `totalDue − siblingDiscountTotal` (no negativo).
UI Morosidad: mostrar el descuento y la deuda neta.

### 2. Matriz de Pagos (`GET /payments/matrix`) — línea propia
Devolver, además de `rows`, un array `discountRows`: por cada familia presente en la vista con `n≥2`, `{ familyId, familyName, monthly: 5×(n−1) }`. El frontend añade una **fila "Descuento hermanos"** por familia con `−monthly` en cada columna de mes. (El cálculo de hermanos cruza servicios aunque la matriz esté filtrada por uno.)

### 3. Informe de gestoría (`GET /reports/gestoria.xlsx`) — línea de reducción
En la hoja Resumen, añadir una línea/sección "Descuento hermanos" = suma, por familia con hermanos, de `5×(n−1) × (meses del rango del informe)`. Resta informativa del total.

## Fuera de alcance (v1)
- Integración en el cobro por celda (pay-cell/pay-charge marca el descuento). 
- Importe configurable (constante 5€).
- Campo legado `fee_schedules.siblings_discount_eur` (se deja como está; esta lógica lo sustituye).
- Escalado por factor de mes (medio mes sigue dando el descuento completo del mes).

## Criterios de aceptación
- Familia con 2 alumnos `matriculado` → `siblingDiscountMonthly=5`; con 3 → 10; con 1 → 0.
- Morosidad: `netDue = totalDue − 5×(n−1)×pendingMonths`, nunca negativo.
- Matriz: aparece la fila "Descuento hermanos" con −5×(n−1) por mes para esas familias.
- Pasar un hermano a `baja` recalcula (n baja) sin intervención.
- Familia sin hermanos: sin fila ni cambio.
