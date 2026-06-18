# Diseño: Tarifas personalizadas por grupo

**Fecha**: 2026-06-17  
**Estado**: Aprobado  
**Contexto**: Secretaría MW Panel — gestión de servicios extraescolares

## Problema

Dentro de un servicio (ej. Danza) puede haber grupos con precios distintos al resto. Actualmente el modelo de datos soporta esto mediante `fee_schedules.group_id`, pero la UI no expone esta capacidad de forma clara: el secretario tiene que ir a la sección "Tarifas", entender el modelo de prioridades y crear manualmente una tarifa vinculada a un grupo concreto.

## Solución

Integrar la configuración de tarifas propias directamente en la página de **Grupos**, donde ya vive el resto de información del grupo. Sin nueva sección de menú ni cambio de modelo de datos.

## Alcance

- Solo afecta a los importes (mensualidad y matrícula). Las reglas de facturación (qué meses cobrar, si se cobra material) son iguales para todos los grupos del mismo programa y no cambian.
- No hay migración de base de datos. La tabla `fee_schedules` con `group_id` ya existe (migración 002).

---

## Sección 1: UI — Página de Grupos

### Tabla de grupos

Se añaden dos columnas al final de la tabla existente:

| Columna | Valor si tarifa propia | Valor si hereda |
|---|---|---|
| **Tarifa/mes** | Importe en verde + badge "Personalizada" | Importe en gris + texto "Heredada" |
| **Matrícula** | Importe en verde + badge "Personalizada" | Importe en gris + texto "Heredada" |

Si no hay tarifa en ningún nivel (servicio/programa/grupo), se muestra "Sin tarifa".

### Modal de creación/edición del grupo

Se añade un bloque "Tarifas del grupo (opcional)" debajo de los campos actuales (nombre, programa, aula, aforo, profesor, notas):

```
┌─ Tarifas del grupo (opcional) ──────────────────────────────┐
│  Si se dejan vacías, se aplica la tarifa del programa/       │
│  servicio. Solo rellena si este grupo tiene precio propio.   │
│                                                              │
│  Mensualidad propia:  [ _____€ ]  ← heredada: 65€           │
│  Matrícula propia:    [ _____€ ]  ← heredada: 65€           │
└──────────────────────────────────────────────────────────────┘
```

- El placeholder muestra la tarifa heredada del programa o servicio como referencia.
- Si el usuario introduce un valor y guarda → se crea/actualiza una `fee_schedule` con `group_id`.
- Si el usuario borra el valor y guarda → se elimina la `fee_schedule` propia del grupo (vuelve a heredar).
- Si no toca el campo → sin cambios en tarifas.

---

## Sección 2: Backend

No se crea ningún endpoint nuevo. Se extienden los existentes del módulo `catalog`.

### GET /catalog/groups

Enriquecer la respuesta de cada grupo con:

```ts
{
  // campos actuales...
  feeMonthly: {
    amount: number | null,   // importe resuelto (propio o heredado)
    isCustom: boolean        // true si el grupo tiene fee_schedule propio
  },
  feeMatricula: {
    amount: number | null,
    isCustom: boolean
  }
}
```

La resolución usa las funciones SQL existentes (`fn_resolve_monthly_fee` / `fn_resolve_concept_fee`) o una consulta directa a `fee_schedules` filtrando por `group_id`.

### POST /catalog/groups y PATCH /catalog/groups/:id

Aceptan dos campos opcionales nuevos en el body:

| Campo | Tipo | Comportamiento |
|---|---|---|
| `customFeeMonthly` | `number \| null` | número → upsert fee_schedule grupo+mensualidad; `null` → DELETE |
| `customFeeMatricula` | `number \| null` | número → upsert fee_schedule grupo+matricula; `null` → DELETE |

Si el campo no viene en el body → no se modifica la tarifa del grupo.

El upsert busca `fee_schedules` donde `group_id = :groupId AND concept = :concept AND academic_year_id = :yearId`. Si existe, actualiza `amount`; si no, inserta con `service_id` del grupo (vía `groups → programs → service_id`), `is_active = true`.

---

## Sección 3: Casos límite

| Caso | Comportamiento |
|---|---|
| Grupo sin programa asignado | El placeholder muestra tarifa del servicio. La resolución sigue funcionando (salta directamente a nivel servicio). |
| Sin tarifa en ningún nivel | Muestra "Sin tarifa" en la tabla y placeholder vacío en el modal. |
| Rollover de curso | `POST /catalog/years/:id/rollover` ya copia `fee_schedules` con `group_id` — los grupos con tarifa propia mantienen su precio especial. Sin cambios. |
| Eliminar un grupo | Las `fee_schedules` con ese `group_id` se borran en cascada (`ON DELETE CASCADE` ya definido en migración 002). |
| Sección "Tarifas" existente | Sigue funcionando para gestión avanzada. Los cambios en Grupos son un atajo sobre el mismo modelo subyacente. |

---

## Lo que NO cambia

- Modelo de datos (`fee_schedules`, `groups`, funciones SQL) — sin migración.
- Reglas de facturación por programa (`month_billing`, `bills_matricula`, `bills_material`).
- Sección "Tarifas" del menú — sigue disponible para casos avanzados.
- Lógica de resolución de tarifas (`fn_resolve_monthly_fee`, `fn_resolve_concept_fee`).
