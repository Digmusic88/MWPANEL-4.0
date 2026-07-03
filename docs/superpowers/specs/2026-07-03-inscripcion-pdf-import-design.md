# Importador de inscripción PDF — Feature 1a (design)

> Iniciativa "inscripciones" ([[project_pdf_inscription_import]]), tras completarse el roadmap del año académico (SP-0..SP-8). Pieza **1a** de 3: importador de inscripción PDF en **Secretaría**. Siguientes: 1b (backfill MW Panel→Secretaría), 2 (visualización en MW Panel).

**Fecha:** 2026-07-03
**Estado:** aprobado por Diego (2026-07-03) — sistema destino = Secretaría; matrícula = ESCUELA 'preinscrito'; extracción determinista AcroForm v1 (visión posterior); orden 1a→1b→2.

## Objetivo

Que el personal suba una **inscripción rellenada** (plantilla PDF de Mundo World School) y la plataforma **extraiga automáticamente** los campos, los muestre en una **previsualización editable**, y al confirmar cree el alta completa en Secretaría (family + guardians + student + matrícula ESCUELA 'preinscrito' + datos médicos cifrados + banca si viene), atada al **curso académico** elegido.

## Contexto medido (verificado 2026-07-03)

- **Los PDFs son AcroForm** (formulario con 67 campos de texto + 1 radio), 4 páginas A4, no escaneados, no cifrados. Extracción **determinista** vía `pdf-lib` (probado: la plantilla expone 67 campos; el PDF real de Asier tiene 40/66 campos de texto poblados y el radio con selección). **No hace falta OCR/visión** para PDFs rellenados digitalmente.
- **Modelo destino de Secretaría** (schema `secretaria`): `students`(first_name, last_name, birth_date, address, postal_code, city, **medical_notes_encrypted** bytea, **photo_consent** bool, **exit_consent** bool, notes, family_id, mwpanel_student_id…), `guardians`(full_name, relationship enum madre/padre/tutor/otro, nif, phone, phone_alt, email, is_primary_contact, family_id), `families`(display_name, notes), `enrollments`(student_id, academic_year_id, service_id, group_id, status, notes…), `bank_accounts` (IBAN cifrado + mandato SEPA).
- **Servicio ESCUELA**: id `f01c8615-e6f1-4c61-adc7-058f75bff6ed` ("Escuela Alternativa"). Enum de estado de `enrollments` incluye **`preinscrito`** ✓.
- **Cifrado médico**: `medical_notes_encrypted` (bytea, pgcrypto `pgp_sym_encrypt(texto, SECRETARIA_CRYPTO_KEY)` server-side, mismo patrón que el IBAN del módulo `sepa`). Hoy 0 filas pobladas.
- **Radio `Group4`** (opciones genéricas Opción1/Opción2): cubre la sección combinada "AUTORIZACIÓN DE SALIDAS Y USO DE IMAGEN". `students` tiene DOS booleanos (`photo_consent`, `exit_consent`) → el radio mapea a ambos (best-effort); la **preview editable** deja al personal confirmarlos.
- **Reutilizables** de Secretaría: módulos `families`/`students`/`enrollments`/`sepa`; `gender.ts` (`guessGender` para inferir madre/padre); `quick-enroll` y el importador Excel `import` (patrón dry-run→commit); componente frontend `InscripcionDrawer` (estilo del formulario de alta).
- **`pdf-lib`** NO está en el backend (solo `xlsx`) → añadir como dependencia runtime.

## Arquitectura

### Backend — nuevo módulo `inscription` (`/opt/mw-secretaria/backend/src/modules/inscription/`)

- **`inscription-pdf.parser.ts`** (extracción, aislado): recibe el buffer del PDF, usa `pdf-lib` `getForm().getFields()`; devuelve un `Record<fieldName, value>` (texto) + el estado del radio `Group4`. Si `getFields().length === 0` → lanza error de dominio "PDF sin campos de formulario (¿escaneado? use la plantilla digital)".
- **`inscription-field-map.ts`** (mapa PURO, testeable): función `mapFieldsToInscription(rawFields): InscriptionPreview`. Convierte los 67 nombres de campo a un objeto estructurado (ver "Mapa de campos"). Sin efectos, sin BD → test unit directo.
- **`inscription.service.ts`**:
  - `preview(buffer): InscriptionPreview` — parser + map, **dry-run** (no escribe). Añade `warnings[]` (p.ej. posible duplicado por nombre+fecha nac., campos obligatorios vacíos) y `duplicateCandidateId?` (si existe un `students` con mismo first+last+birth_date).
  - `commit(payload: InscriptionPreview, academicYearId): { studentId }` — recibe el objeto **ya revisado/editado** por el personal (no re-parsea el PDF), en una **transacción**: crea `families` → `guardians[]` (relationship por `guessGender` o el campo RELACIÓN; primer contacto `is_primary_contact=true`) → `students` (con `medical_notes_encrypted = pgp_sym_encrypt(texto_salud, key)`, `photo_consent`, `exit_consent`, `family_id`) → `enrollments` (service ESCUELA, `academic_year_id`, `status='preinscrito'`) → `bank_accounts` si hay IBAN. Idempotencia: si `duplicateCandidateId` viene marcado por el personal como "es el mismo", NO crear (devolver ese id); si no, crear.
- **`inscription.controller.ts`** (`/api/secretaria/inscription`): `POST /preview` (FileInterceptor, multipart) y `POST /commit` (body = InscriptionPreview + academicYearId). Roles: `secretaria_admin` + `direccion` (alta administrativa). Como el Dockerfile usa `npm install --omit=dev`, `@Res()`/tipos de express se evitan (patrón del repo).
- **`inscription.module.ts`**: registra controller + service, importa lo necesario (DataSource, entidades students/guardians/families/enrollments/bank).

### Frontend — sección "Importar inscripción (PDF)"

Nueva vista en la app de Secretaría (menú, junto a "Importar Excel"): 
1. **Subir** el PDF → `POST /inscription/preview` → recibe el objeto estructurado.
2. **Previsualización EDITABLE**: un formulario pre-rellenado con lo extraído (alumno, tutores[], salud, consentimientos, banca, notas), estilo `InscripcionDrawer`, con los `warnings` visibles (duplicado, campos vacíos). El personal corrige lo que haga falta (incl. los consentimientos del radio y la relación de los tutores).
3. **Selector de curso académico** (+ servicio fijo ESCUELA) y, si hay `duplicateCandidateId`, un aviso con opción "es el mismo alumno / crear nuevo".
4. **Confirmar** → `POST /inscription/commit` con el objeto revisado → `message.success` con el alta creada → refrescar Alumnos.

## Mapa de campos (los 67 → entidades)

**Alumno (`students`):** `NOMBRERow1`→first_name; `PRIMER APELLIDORow1`+`SEGUNDO APELLIDORow1`→last_name; `DÍA/MES/AÑO...NACIMIENTO`→birth_date (componer ISO); `CALLEDIRECCIÓN...`+`NDIRECCIÓN...`→address; `CIUDAD...NACIMIENTO` (lugar nacimiento), `EDAD`, `EMAIL DEL ALUMNOA...`, `TELÉFONODIRECCIÓN...` (sin columna propia) → `notes`. Consentimientos: `Group4`→`photo_consent`+`exit_consent`.

**Salud → `medical_notes_encrypted`** (texto consolidado, cifrado): `DIFICULTADES DE APRENDIZAJE...`, `PEDIATRA`, `ALERGIAS CONOCIDAS...`, `TRATAMIENTO en caso de reacción` (x2), `INTOLERANCIAS ALIMENTICIAS...`, `CONTACTO EN CASO DE EMERGENCIA`+`TELÉFONORow1_4`, `CENTRO MEDICO`+`NUMEROTELEFONO_2`.

**Tutores (`guardians`):**
- Contacto 1: `NOMBRERow1_2`+`PRIMER/SEGUNDO APELLIDORow1_2`→full_name; `TELÉFONORow1`→phone; `EMAILRow1`→email; relationship por `guessGender`; `is_primary_contact=true`; `PROFESIÓNRow1`→notes de familia/tutor.
- Contacto 2: `...Row1_3`→full_name; `TELÉFONORow1_2`; `EMAILRow1_2`; `PROFESIÓNRow1_2`; relationship por `guessGender`.
- Contacto 3: `...Row1_4`→full_name; `RELACIÓN CON EL ALUMNORow1`→relationship; `TELÉFONORow1_3`; `EMAILRow1_3`.
Solo se crean los contactos con nombre no vacío.

**Familia (`families`):** display_name = last_name del alumno (o "Familia {apellido}"); `HERMANOSAS...`, intereses (`ASIGNATURA FAVORITA`, `ASIGNATURA QUE LE GUSTA MENOS`, `DEPORTE`, `MÚSICADANZA`, `OTROS`) → `notes`.

**Matrícula (`enrollments`):** service_id=ESCUELA (`f01c8615-…`), academic_year_id=elegido, status='preinscrito', group_id=null (`GRUPO a rellenar por el centro` lo pone el centro).

**Banca (`bank_accounts`), solo si el IBAN viene:** `ES`+`Cuenta bancaria 2..6`→IBAN (componer + validar mod-97, cifrar como el módulo `sepa`); `TITULAR DE LA CUENTARow1`→titular; `NIFNIERow1`→nif; `ENTIDAD BANCARIARow1`→entidad. En el sample de Asier estos van vacíos → tolerar ausencia.

## Flujo de datos

1. Personal sube PDF → `preview` → parser (pdf-lib) → field-map → objeto estructurado + warnings (NO escribe).
2. Personal revisa/edita en la preview, elige curso, resuelve duplicado si lo hay.
3. `commit` con el objeto revisado → transacción crea family+guardians+student+matrícula 'preinscrito'+médico cifrado+banca → devuelve studentId.
4. El alumno queda **preinscrito** en ESCUELA para el curso, visible en Alumnos/Organización de Secretaría; el centro lo pasa a 'matriculado' cuando confirme.

## Manejo de errores / bordes

- **PDF sin campos AcroForm** (escaneado/aplanado) → `preview` devuelve error claro; no se intenta OCR en v1.
- **Datos parciales** (bancos vacíos, un solo tutor, apellido único) → se toleran; los campos vacíos no se insertan; la preview marca los obligatorios que falten.
- **Duplicado** (mismo first+last+birth_date ya en `students`) → warning + `duplicateCandidateId`; el personal decide crear o no (v1: no fusiona automáticamente — eso es 1b).
- **Radio/consentimientos inciertos** → la preview editable es la red de seguridad; el personal fija `photo_consent`/`exit_consent`.
- **Transacción**: todo-o-nada; si falla a mitad, revierte.
- **RGPD**: datos de un menor real (Asier) → tratar con cuidado, NO exponer valores en artefactos compartibles; médico e IBAN cifrados; endpoints solo `secretaria_admin`/`direccion`.

## Pruebas

- **Test unit del field-map** (`inscription-field-map.ts`): dado un `Record` de campos de ejemplo (SIN datos reales — nombres genéricos de prueba), el objeto resultante mapea alumno/tutores/salud/consentimientos a los campos correctos; contactos vacíos se omiten; fecha se compone bien.
- **Test del parser** contra la **plantilla vacía** (sin datos personales): extrae 67 campos, todos vacíos, radio sin selección → objeto vacío coherente.
- **Prueba end-to-end con el PDF real de Asier** (autorizada por Diego): `preview` → verificar (en local, sin volcar los valores a ningún artefacto) que el objeto extraído es correcto → `commit` para el curso indicado → el alumno queda **preinscrito** en ESCUELA. Si algo del mapeo sale mal, se corrige antes de commitear (la preview es editable). Verificar Secretaría 200 tras deploy.
- **Backend**: build/compila; el módulo bootea. **Frontend**: build limpio.

## Fuera de alcance (v1 / otras piezas)

- **OCR / Claude-visión** para PDFs escaneados o aplanados — mejora posterior (la plantilla real es AcroForm).
- **Extracción de la foto embebida** del PDF → foto del alumno — opcional/posterior.
- **Feature 1b** (backfill MW Panel→Secretaría, rellenar huecos, marcar pendientes, poblar `mwpanel_student_id`) — spec aparte, después.
- **Feature 2** (visualización en MW Panel de los datos de ficha) — spec aparte, la última.
- **Fusión automática de duplicados** — 1a solo avisa; la reconciliación es 1b.

## Riesgos

- **Nombres de campo del PDF frágiles** (dependen de la plantilla): si Mundo World School cambia la plantilla, el field-map se desalinea. Mitigado: el map está centralizado y testeado; la preview editable permite corregir; un campo no mapeado no rompe (cae a notes o se ignora). Documentar que el map está atado a esta versión de plantilla.
- **Datos reales de un menor** → disciplina RGPD (cifrado, roles, no exponer).
- **Semántica del radio** Opción1/Opción2 → resolver por posición del widget en la plantilla; si dudoso, la preview lo deja en manos del personal.
- **Repo propio de Secretaría**: commit+push obligatorio a Digmusic88/MWPANEL-4.0 en cada cambio; deploy = build frontend + rebuild imagen `mw-secretaria-api` + recrear contenedor.
