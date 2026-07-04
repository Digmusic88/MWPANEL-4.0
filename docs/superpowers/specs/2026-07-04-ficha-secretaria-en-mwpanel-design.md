# Feature 2 — Visualización de la ficha de Secretaría dentro de MW Panel

> **Spec de diseño.** Última pieza del roadmap de inscripciones PDF
> (1a importador PDF ✅, 1b backfill MW Panel→Secretaría ✅, 1c aprovisionamiento
> Secretaría→MW Panel ✅). Esta feature toca **dos repos**: Secretaría
> (`Digmusic88/MWPANEL-4.0`) y MW Panel (repo principal, producción).

**Objetivo:** que administración vea la ficha completa de un alumno (la que
gestiona Secretaría) desde la pantalla de gestión de alumnos de MW Panel, sin
cambiar de plataforma y sin duplicar ni descifrar datos en MW Panel.

**Audiencia:** solo el rol `admin` de MW Panel.

**Alcance de datos:** ficha completa **incluyendo notas médicas descifradas**.

## Arquitectura

MW Panel no replica ni descifra nada: le pide a Secretaría la ficha ya montada.
Secretaría es la dueña de la ficha y la única con la clave del médico. Es
simétrico a 1c, en sentido inverso.

```
Admin MW Panel abre el Drawer de detalle de un alumno
        │
        ▼
[MW Panel frontend]  GET /api/students/:id/secretaria-ficha   (guard admin)
        │
        ▼
[MW Panel backend]  firma JWT de servicio (JWT_SECRET compartido,
        │            sub = SECRETARIA_SERVICE_USER_ID)
        │            → GET http://mw-secretaria-api:3010/api/secretaria/ficha/by-mwpanel/:mwStudentId
        ▼
[Secretaría backend]  SecretariaAuthGuard (secretaria_admin/direccion)
        │             → monta ficha (alumno + dirección + tutores +
        │               consentimientos + matrícula activa/historial +
        │               MÉDICO DESCIFRADO pgp_sym_decrypt)
        ▼
   JSON ficha ──▶ MW Panel backend ──▶ frontend (solo lectura)
```

- Llamada **backend-a-backend por red interna** `mw-panel_mw-network`, sin nginx.
- El control de acceso real (**admin-only**) se hace en el endpoint de MW Panel.
  La llamada a Secretaría es de confianza servidor-a-servidor con token de servicio.
- **Lectura en vivo**, sin caché.
- Si el alumno de MW Panel no tiene ficha en Secretaría (ningún
  `secretaria.students` apunta a su id) → Secretaría 404 → MW Panel muestra
  "Sin ficha en Secretaría".

## Global Constraints

- **Sistema en producción.** Solo cambios pedidos. No romper nada existente.
- **RGPD / PII:** en verificación/E2E nunca volcar datos reales de menores en
  artefactos ni logs — calcular booleanos/recuentos y redactar.
- **Secreto compartido:** `JWT_SECRET` ya es común a ambos backends; NO se
  introduce ningún secreto nuevo. La clave `SECRETARIA_CRYPTO_KEY` **nunca**
  sale del entorno de Secretaría; solo viaja el texto médico ya descifrado por
  la red interna.
- **Aislamiento:** MW Panel depende de un **contrato REST** de Secretaría, no de
  su schema. Cero SQL cross-schema nuevo desde MW Panel hacia `secretaria.*`.
- **Solo lectura:** ninguna escritura en `secretaria.*` ni en `public.*` en toda
  la feature.
- **Contrato SP-7:** documentar la nueva dependencia saliente MW Panel→Secretaría
  en `/opt/mw-secretaria/docs/CONTRATO_MWPANEL.md` (el acoplamiento pasa a ser
  bidireccional a nivel REST).
- **Commits:** cada cambio de Secretaría se commitea+pushea a su repo propio
  (`git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria`,
  `origin` = alias SSH github-secretaria). Los cambios de MW Panel se commitean
  en el repo de MW Panel (working tree = producción; `git add` por fichero,
  nunca `git add -A`).

## Componente 1 — Endpoint de ficha en Secretaría (módulo `ficha/`)

Nuevo módulo `backend/src/modules/ficha/` en Secretaría, una sola responsabilidad
(leer y montar la ficha). Registrado en `app.module.ts`.

### `ficha.controller.ts`
- `GET /api/secretaria/ficha/by-mwpanel/:mwStudentId`
- Guard: `SecretariaAuthGuard` + `@Roles('secretaria_admin','direccion')`
  (importados de `common/secretaria-auth.guard.ts`).
- Módulo importa `TypeOrmModule.forFeature([StaffRole])`
  (`common/staff-role.entity.ts`) y `JwtModule.register({})` — igual que
  `provisioning.module.ts`.
- Devuelve `200` con el JSON de la ficha, o `404`
  `{ message: 'Sin ficha en Secretaría' }` si no hay `secretaria.students` con
  ese `mwpanel_student_id`.

### `ficha.service.ts`
`buildFicha(mwStudentId: string): Promise<FichaDto | null>`

1. `SELECT ... FROM secretaria.students WHERE mwpanel_student_id = $1` — si no hay
   fila → devuelve `null` (el controller lo traduce a 404). Descifra el médico en
   la misma consulta:
   `CASE WHEN medical_notes_encrypted IS NOT NULL AND $2 <> ''
         THEN pgp_sym_decrypt(medical_notes_encrypted, $2) ELSE NULL END AS medical`
   con `$2 = process.env.SECRETARIA_CRYPTO_KEY || ''`. (La clave está presente en
   el entorno de Secretaría; si faltara, `medical` sale `null` en vez de fallar.)
2. `SELECT display_name, notes FROM secretaria.families WHERE id = $familyId`.
3. `SELECT full_name, relationship, nif, phone, phone_alt, email, is_primary_contact
   FROM secretaria.guardians WHERE family_id = $familyId
   ORDER BY is_primary_contact DESC, created_at ASC`.
4. Matrícula con nombres legibles:
   ```sql
   SELECT ay.label AS academic_year, s.name AS service, g.name AS "group",
          e.status::text AS status, e.apoyo_level::text AS apoyo_level,
          e.custom_fee, e.enrolled_at
   FROM secretaria.enrollments e
   LEFT JOIN secretaria.academic_years ay ON ay.id = e.academic_year_id
   LEFT JOIN secretaria.services       s  ON s.id  = e.service_id
   LEFT JOIN secretaria.groups         g  ON g.id  = e.group_id
   WHERE e.student_id = $studentId
   ORDER BY e.enrolled_at DESC NULLS LAST, e.created_at DESC
   ```
   En JS se parte en `active` (status ∈ {`matriculado`,`preinscrito`}) y
   `history` (resto: `pendiente`,`lista_espera`,`baja`).

### Contrato JSON (`FichaDto`)
```jsonc
{
  "student": {
    "firstName": string, "lastName": string, "birthDate": string|null,  // YYYY-MM-DD
    "schoolOrigin": string|null, "gradeLabel": string|null,
    "address": string|null, "postalCode": string|null, "city": string|null,
    "photoConsent": boolean, "exitConsent": boolean,
    "notes": string|null,
    "isActive": boolean,
    "importPending": boolean, "importPendingFields": string|null
  },
  "medical": string|null,
  "family": { "displayName": string|null, "notes": string|null },
  "guardians": [
    { "fullName": string, "relationship": string|null, "nif": string|null,
      "phone": string|null, "phoneAlt": string|null, "email": string|null,
      "isPrimaryContact": boolean }
  ],
  "enrollments": {
    "active":  [ { "academicYear": string|null, "service": string|null,
                   "group": string|null, "status": string, "apoyoLevel": string|null,
                   "customFee": number|null, "enrolledAt": string|null } ],
    "history": [ /* misma forma que active */ ]
  }
}
```

**Cero escrituras** (verificable con grep de verbos de escritura en el módulo).

## Componente 2 — Proxy en el backend de MW Panel (módulo `students`)

### Cliente `secretaria-ficha.client.ts`
(espejo de `provisioning/mwpanel-client.ts` de 1c, dirección inversa)
- `signServiceToken(): string` → `jwt.sign({ sub: SECRETARIA_SERVICE_USER_ID }, JWT_SECRET, { expiresIn: '5m' })`.
- `getFicha(mwStudentId, token): Promise<{ status, body }>` → `fetch` GET a
  `${SECRETARIA_API}/secretaria/ficha/by-mwpanel/${mwStudentId}` con
  `Authorization: Bearer`, timeout 15s (AbortController), parseo fail-soft.
- `SECRETARIA_API = process.env.SECRETARIA_API_URL || 'http://mw-secretaria-api:3010/api'`.
- `SECRETARIA_SERVICE_USER_ID = process.env.SECRETARIA_SERVICE_USER_ID` (id del
  `secretaria_admin` existente; sin default — si falta, el endpoint devuelve 500
  con mensaje claro).

### Endpoint en `students.controller.ts`
- `GET /api/students/:id/secretaria-ficha`
- Guards existentes de MW Panel: `JwtAuthGuard` + `RolesGuard` con
  `@Roles(UserRole.ADMIN)` (`common/decorators/roles.decorator.ts`,
  `common/guards/*`).
- Lógica en `students.service.ts` (o un `secretaria-ficha.service.ts` dedicado
  dentro del módulo):
  - Firma token de servicio, llama `getFicha(id, token)`.
  - Secretaría 200 → responde el JSON de la ficha.
  - Secretaría 404 → responde `204 No Content` (frontend: "Sin ficha en Secretaría").
  - Error de red / timeout / 5xx / body no parseable → `502`
    `{ message: 'No se pudo cargar la ficha desde Secretaría' }`.
  - `SECRETARIA_SERVICE_USER_ID` ausente → `500`
    `{ message: 'Falta SECRETARIA_SERVICE_USER_ID en el servidor' }`.

### Config nueva (entorno MW Panel `/opt/mw-panel/backend/.env`, bind-mount)
```
SECRETARIA_API_URL=http://mw-secretaria-api:3010/api
SECRETARIA_SERVICE_USER_ID=<id del secretaria_admin existente>
```
`JWT_SECRET` ya existe y es el compartido. `.env.example` documenta ambas.

## Componente 3 — Frontend de MW Panel

### Componente aislado `SecretariaFichaPanel.tsx`
Nuevo componente (p. ej. `frontend/src/components/admin/SecretariaFichaPanel.tsx`),
prop `studentId: string`. Autocontenido y testeable; evita engordar
`StudentManagementPage.tsx` (ya 1473 líneas).

- Al montar (o al abrirse el Drawer), hace `GET /api/students/${studentId}/secretaria-ficha`
  con el cliente HTTP autenticado existente de MW Panel (el mismo `apiClient`/axios
  que ya usa la página).
- **Estados:**
  - Cargando → `Spin`.
  - `204`/cuerpo vacío → texto atenuado "Sin ficha en Secretaría".
  - Error (`502`/red) → `Alert` "No se pudo cargar la ficha" + botón *Reintentar*.
  - Cargada → render agrupado con el estilo del Drawer (`Row`/`Col`, `Text`,
    `Tag`, `h3`):
    - **Datos de ficha:** dirección, CP, ciudad, origen escolar, curso
      (`gradeLabel`), notas.
    - **Consentimientos:** foto y salida como `Tag` verde (Sí) / rojo (No).
    - **Médico:** panel destacado (fondo distinto). Si `medical` es `null` →
      "Sin notas médicas".
    - **Tutores:** tarjetas con nombre, relación, NIF, teléfono(s), email;
      contacto principal marcado con `Tag`.
    - **Matrícula:** la(s) `active` (año, servicio, grupo, estado como `Tag`,
      cuota si `customFee`); si `history.length > 0`, botón
      **"Ver matrículas anteriores (N)"** que despliega el historial.
    - **Estado de importación:** si `importPending` → `Tag` amarillo con
      `importPendingFields`.
- Nota al pie: *"Estos datos se gestionan en Secretaría."* + enlace
  **"Abrir en Secretaría"** → `https://secretaria.mundoworld.school`
  (target `_blank`, `rel="noopener noreferrer"`; abre la app, sin deep-link).

### Integración en `StudentManagementPage.tsx`
Dentro del Drawer de detalle (`isDetailDrawerVisible`, ~línea 1116), como una
sección más al final del `div.space-y-6`:
```tsx
<div>
  <h3 className="text-lg font-semibold mb-4">Ficha de Secretaría</h3>
  <SecretariaFichaPanel studentId={viewingStudent.id} />
</div>
```
Único cambio en ese archivo: el import + este bloque.

## Actualización del contrato SP-7

En `/opt/mw-secretaria/docs/CONTRATO_MWPANEL.md`:
- Sección "Dirección del acoplamiento": añadir que desde Feature 2 MW Panel hace
  una **llamada REST saliente hacia Secretaría** (`GET /api/secretaria/ficha/by-mwpanel/:mwStudentId`),
  de solo lectura, para mostrar la ficha en su gestión de alumnos. El
  acoplamiento REST pasa a ser bidireccional (1c: Secretaría→MW Panel escritura;
  2: MW Panel→Secretaría lectura), pero el acoplamiento **por schema** sigue
  siendo unidireccional (Secretaría lee `public.*`; MW Panel NO lee `secretaria.*`).
- Sección al final documentando la llamada entrante: endpoint, guard, campos que
  expone, y que descifra el médico con `SECRETARIA_CRYPTO_KEY`.

## Testing

- **Secretaría — `ficha.service`:** el armado activo/historial es lógica pura sobre
  el resultado de la matrícula → test unitario (Jest) del split
  `active`/`history` por status y del orden. El SQL + descifrado se validan en el
  E2E (riesgo de red/BD).
- **MW Panel — cliente/proxy:** el mapeo de status (200→ficha, 404→204, error→502)
  es lógica testeable → test unitario del handler con un `getFicha` simulado.
- **Frontend:** sin test unitario nuevo obligatorio (render antd); se valida en
  E2E manual.

## Deploy y E2E (GATED, datos reales redactados)

1. **Secretaría:** commit+push repo propio; backup schema `secretaria`; build
   frontend (sin cambios de front en Secretaría, se omite si no aplica) + rebuild
   imagen `mw-secretaria-api` + recrear contenedor (config viva: red
   `mw-panel_mw-network`, `127.0.0.1:3010`, mount mocks RW, restart unless-stopped).
   Verificar ruta `ficha/by-mwpanel/:id` mapeada; secretaria=200, mocks=200
   (INTACTO); endpoint sin auth = 401.
2. **MW Panel:** añadir las 2 variables al `.env`; commit por fichero en repo MW
   Panel; deploy backend con `/opt/mw-panel/ultra-fast-rebuild.sh` (~3 min; maneja
   build, recreación, aliases de red, nginx IP fix); deploy frontend
   (`npm run build` en `frontend/` + `sudo cp -r dist/* /opt/mw-panel/frontend-dist/`).
   Verificar salud `curl -s https://plataforma.mundoworld.school/api/health/status`.
3. **E2E redactado:** con un alumno de MW Panel que **sí** tenga ficha en
   Secretaría — candidato ideal **Asier José** (ya enlazado en 1c, tiene médico
   cifrado y 2 tutores). Firmar JWT admin de MW Panel dentro del contenedor y:
   - `GET /api/students/:asierMwId/secretaria-ficha` → 200; verificar (booleanos,
     sin PII) que llegan: student con dirección, `medical` **no nulo** (descifrado
     OK), 2 guardians con principal marcado, `enrollments.active` con el año/servicio.
   - Un alumno MW Panel **sin** ficha en Secretaría → 204 → "Sin ficha".
   - Verificar en logs que **no hubo escrituras** y que la clave no viaja (solo el
     texto).
   Confirmar el candidato con Diego antes del E2E si implica exponer algo real.

## Fuera de alcance (YAGNI)

- Edición de la ficha desde MW Panel (la edición vive en Secretaría, la dueña).
- Caché / sincronización de datos (lectura en vivo).
- Deep-link a la ficha concreta en Secretaría (solo enlace a la app).
- Mostrar la ficha a profesores/tutores (solo admin en esta feature).
- Histórico de cambios de la ficha.
