# Ficha: año académico en matrículas + ocultar página global de Estadísticas

> Fecha: 2026-06-23
> Ámbito: dos cambios independientes y pequeños en el frontend (uno con un ajuste menor de SQL en backend). Sin migración ni cambios de esquema. Solo Secretaría.

## Parte A — Mostrar el año académico de cada matrícula en la ficha

**Problema**: la tabla "Matrículas" de la ficha del alumno (`FichaAlumno`) ya lista las matrículas de **todos los cursos** (el endpoint `:id/ficha` no filtra por año), pero no indica de qué curso es cada fila, así que estados de cursos distintos se mezclan sin distinción.

**Cambio backend** (`backend/src/modules/students/students.controller.ts`, consulta `enrollments` del endpoint `@Get(':id/ficha')`, líneas ~177-186):
- Añadir `JOIN secretaria.academic_years ay ON ay.id = e.academic_year_id`.
- Seleccionar `ay.label AS "yearLabel"` y `ay.is_active AS "yearActive"`.
- Ordenar curso actual primero y luego el más reciente: `ORDER BY ay.is_active DESC, ay.label DESC, sv.name`.

**Cambio frontend** (`frontend/src/App.tsx`, tabla de `card('Matrículas', ...)` en `FichaAlumno`, líneas ~828-837):
- Añadir como **primera columna** `{ title: 'Curso', dataIndex: 'yearLabel', render: (y, r) => <Tag color={r.yearActive ? 'blue' : 'default'}>{y || '—'}</Tag> }` (Tag azul si es el curso activo, neutro si no; muestra el `yearLabel`).
- El resto de columnas (Servicio, Grupo, Estado, Tarifa/mes, Pendiente) sin cambios.

**Resultado**: cada matrícula/estado queda etiquetado por su curso, con el curso activo arriba y resaltado.

## Parte B — Ocultar la página global "Estadísticas" (dejándola para el futuro)

**Qué es**: la entrada de menú `dashboard` con label "Estadísticas" (`App.tsx:5302`), del grupo "Resumen" (`GROUPS` `g_resumen`, `App.tsx:5331`), que renderiza `<Dashboard user={user} />` (`App.tsx:5403`, alimentado por `/stats/overview`). NO se tocan las sub-pestañas "Estadísticas" de Asistencia/Tareas (líneas 3723, 5009), que son otra cosa.

**Cambios frontend** (`frontend/src/App.tsx`), sin borrar ruta ni componente:
1. Quitar `'dashboard'` de los `children` de `g_resumen` (`App.tsx:5331`) → desaparece del menú para todos los roles (el menú se construye desde `GROUPS`). Dejar un comentario marcando cómo reactivarla.
2. Quitar `'dashboard'` de `TEACHER_VIEWS` (`App.tsx:5297`) para que tampoco sea accesible al rol docente.
3. Cambiar el fallback de vista para no aterrizar en la página oculta: hoy `const safeView = allowedKeys.has(view) ? view : 'dashboard'` (`App.tsx:5347`). Pasar a usar la **primera vista visible del menú** del usuario como fallback (calculado tras construir `groupItems`), de modo que ningún rol caiga en `dashboard`.
4. **No** tocar `{safeView === 'dashboard' && <Dashboard user={user} />}` (`App.tsx:5403`) ni el componente `Dashboard` ni el endpoint `/stats/*`: quedan intactos, inertes, listos para reactivar (basta revertir los puntos 1-3).

**Reactivación futura**: volver a añadir `'dashboard'` a `g_resumen.children` (y a `TEACHER_VIEWS` si se quiere para docentes); el resto sigue en su sitio.

## No-objetivos / alcance
- No se borra el componente `Dashboard` ni el endpoint `/stats/overview`.
- No se tocan las pestañas "Estadísticas" internas de Asistencia/Tareas.
- No hay migración ni cambios de BD.
- La ficha sigue mostrando **todas** las matrículas de todos los cursos (no se filtra por año); solo se añade la identificación del curso.

## Verificación
- Backend: `npx tsc --noEmit` limpio; el endpoint `:id/ficha` devuelve `yearLabel`/`yearActive` por matrícula.
- Frontend: `npm run build` limpio; en la ficha aparece la columna "Curso" (con "actual" resaltado) ordenada por curso; la entrada de menú "Estadísticas" ya no aparece y ningún rol aterriza en ella; el resto del menú y vistas intactos.

## Despliegue (gated)
Aislamiento en worktree + rama `feat/ficha-curso-stats`. El merge a `main` y el deploy (rebuild backend + copia de frontend) quedan **gated** al OK del usuario, por el otro servicio concurrente. Sin migración esta vez.
