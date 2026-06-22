# Diseño: columna y filtro "Categoría" en el listado de alumnos

> Fecha: 2026-06-22
> Proyecto: Secretaría (MWPANEL-4.0)

## Objetivo

Añadir al listado principal de alumnos (`Alumnos`, en `frontend/src/App.tsx`) una columna
**Categoría** que muestre el estado global del alumno y un selector para **filtrar** el listado
por esa categoría. Se mantienen las demás columnas existentes (Origen, Servicios y grupos,
Pendientes).

## Contexto

El estado no vive en el alumno, sino en cada inscripción (`secretaria.enrollments.status`),
con el enum `('preinscrito','matriculado','pendiente','lista_espera','baja')`. Un alumno puede
tener varios servicios, cada uno con su estado. El listado principal
(`GET /secretaria/students`) ya devuelve un array `enrollments` por alumno y ya excluye a los
alumnos cuyas matrículas están **todas** en baja (esos aparecen en la sección "Bajas").

## Decisiones (acordadas en brainstorming)

1. **Categoría global del alumno**: una sola etiqueta por alumno, calculada por prioridad.
2. **Filtro por categoría**: selector Todas / Matriculado / Pendiente / Lista de espera /
   Preinscrito.
3. **Bajas**: se dejan como están (sección separada). El listado principal y su filtro cubren
   solo categorías activas; **no** se añade opción "Baja" al filtro del listado principal.

## Cálculo de la categoría global

Prioridad (gana el de mayor prioridad entre las inscripciones del alumno, **ignorando** las de
estado `baja`):

```
matriculado > pendiente > lista_espera > preinscrito
```

- Si tiene ≥1 servicio `matriculado` → **Matriculado**.
- Si no, el estado de mayor prioridad que tenga.
- Si no tuviera ninguna inscripción (no-baja) → `sin_inscripcion` ("Sin inscripción").

## Backend

Fichero: `backend/src/modules/students/students.controller.ts`, método `list` del endpoint
`GET /secretaria/students`.

- Convertir `list` en `async` y `await` el resultado de la query (hoy se hace sin modificar el
  SQL pesado).
- Calcular en JS el campo `category` por alumno a partir del array `enrollments` ya construido,
  aplicando la prioridad anterior.
- Añadir parámetro opcional de query `category`. Si llega y no es vacío, filtrar las filas por
  `row.category === category` (filtrado en servidor, mismo patrón que `pending`).
- No se toca el SQL ni la cláusula que excluye las bajas.

## Frontend

Fichero: `frontend/src/App.tsx`, componente `Alumnos` (≈línea 856).

- Nuevo estado `category` (`''` = Todas) y su inclusión en `load()` (param `category`) y en el
  array de dependencias del `useEffect` que recarga (junto a `onlyPending`).
- Nuevo `Select` en la barra de acciones, con opciones Todas / Matriculado / Pendiente /
  Lista de espera / Preinscrito, que actualiza el estado y recarga.
- Nueva columna **Categoría** entre "Origen" y "Servicios y grupos", con una etiqueta de color
  reutilizando el mapa existente `STATUS_META` (color + label). Para `sin_inscripcion` se
  muestra una etiqueta neutra "Sin inscripción".

## Sin cambios en BD

La categoría es derivada; no se persiste. No hay migración.

## Verificación

- Backend compila (`npm run build` en `backend`).
- Frontend compila (`npm run build` en `frontend`).
- El listado muestra la nueva columna; el selector filtra correctamente y "Todas" devuelve el
  comportamiento actual; las bajas siguen sin aparecer.
