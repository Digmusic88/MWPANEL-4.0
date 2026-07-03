# Contrato de integración Secretaría ↔ MW Panel

> **Qué es esto:** la lista exacta de tablas/columnas de MW Panel (`public.*`) de
> las que depende Secretaría, y cómo verificarlo. Si cambias alguna de estas
> columnas en MW Panel, la integración de Secretaría se rompe. Antes de
> renombrar/borrar cualquiera, corre `scripts/contract-check.sh` y actualiza
> este documento.

## Dirección del acoplamiento

- **Unidireccional, vía base de datos compartida** (mismo Postgres `mw-panel-db-prod`).
  Secretaría (schema `secretaria`) **consume** datos de MW Panel (schema `public`).
- **MW Panel NO depende de Secretaría** (0 referencias en su backend). No existe
  cliente REST en ninguna dirección; toda la integración es SQL cross-schema.

## Superficie del contrato (lo que Secretaría lee de `public.*`)

### Vía la vista puente `secretaria.v_alumnos_escuela`
Fallback de nombre de alumno (`COALESCE(nombre local, va.first_name||' '||va.last_name)`)
cuando un alumno de Secretaría está enlazado por `mwpanel_student_id`.
Lee de MW Panel:

| Tabla `public.*` | Columnas |
|---|---|
| `students` | id, enrollmentNumber, birthDate, photoUrl, userId, educationalLevelId, courseId |
| `educational_levels` | id, name |
| `courses` | id, name |
| `users` | id, email, isActive |
| `user_profiles` | userId, firstName, lastName |

Columnas de salida de la vista: `mwpanel_student_id, enrollment_number, birth_date,
photo_url, first_name, last_name, etapa, curso, email`.

### Vía la vista puente `secretaria.v_docentes_mwpanel`
Pantalla "importar profesor de MW Panel". Lee de MW Panel:

| Tabla `public.*` | Columnas |
|---|---|
| `teachers` | id, userId, employeeNumber, specialties |
| `users` | id, email |
| `user_profiles` | userId, firstName, lastName |

Columnas de salida de la vista: `mwpanel_teacher_id, user_id, email, full_name,
employee_number, specialties`.

### Lecturas y ESCRITURAS directas a la identidad compartida
Además de las vistas, Secretaría trata `public.users` / `public.user_profiles`
como store de identidad común:

- **Lee** `public.users` (+ `user_profiles`) para autenticación (`auth.controller.ts`)
  y chat (`chat.controller.ts`).
- **Escribe** `public.users` / `public.user_profiles` para provisión de cuentas
  (`access.controller.ts`): crear cuenta de plataforma (INSERT), cambiar email,
  resetear contraseña (UPDATE `passwordHash`), insertar perfil.

Columnas del contrato en identidad:

| Tabla `public.*` | Columnas | Uso |
|---|---|---|
| `users` | id, email, passwordHash, role, isActive | lectura auth/chat + escritura provisión |
| `user_profiles` | id, userId, firstName, lastName | lectura + escritura provisión |

## Acoplamientos de seguridad

- **`JWT_SECRET` compartido** entre MW Panel y Secretaría (Secretaría valida los
  tokens emitidos por MW Panel).
- **`public.users` como identidad común**: un mismo usuario/contraseña sirve en
  ambos sistemas.

## Fuera del contrato (no lo verifica el check)

- `secretaria.students.mwpanel_student_id` — enlace de alumnos, hoy **dormido**
  (NULL en todos; ningún código lo escribe). Si se activa en el futuro, la vista
  `v_alumnos_escuela` empezará a entregar datos y este contrato gana valor.
- `secretaria.academic_years.mwpanel_academic_year_id` — sembrado una vez, nadie
  lo lee/escribe.

## Cómo verificar el contrato

```bash
/opt/mw-secretaria/scripts/contract-check.sh
# exit 0 = OK · exit 1 = roto (ver detalle) · exit 2 = BD no disponible
```

El deploy de MW Panel (`/opt/mw-panel/ultra-fast-rebuild.sh`) corre esta
verificación automáticamente al final y muestra un aviso ⚠️ **no bloqueante**
si el contrato se rompió (el deploy se completa igual).

## Regla operativa

1. ¿Vas a renombrar/borrar una columna `public.*` de la tabla de arriba en MW Panel?
   Corre `contract-check.sh` antes y después; si se rompe, arregla la vista o el
   consumidor y actualiza este documento.
2. ¿Añades en Secretaría un consumidor nuevo de datos de MW Panel? Amplía la
   superficie aquí y en `scripts/contract-check.sql`.
