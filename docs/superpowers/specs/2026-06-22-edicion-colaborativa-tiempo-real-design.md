# Edición colaborativa en tiempo real (Secretaría)

> **Fecha**: 2026-06-22
> **Estado**: Diseño aprobado — pendiente de plan de implementación
> **Ámbito**: Plataforma Secretaría (`secretaria.mundoworld.school`), proyecto `/opt/mw-secretaria`

## 1. Objetivo y motivación

Varios profesores y administradores van a trabajar a la vez en la plataforma de
Secretaría. Hoy no hay mecanismo de colaboración en tiempo real (el chat usa
*polling* cada 4 s; el resto de pantallas cargan datos bajo demanda y no se
refrescan cuando otro usuario cambia algo). Esto provoca dos riesgos:

1. **Datos obsoletos**: una persona ve una versión vieja porque otra ya la cambió.
2. **Sobrescritura silenciosa**: dos personas editan el mismo registro y la última
   en guardar pisa el trabajo de la otra sin avisar.

Se quieren cubrir cuatro necesidades, confirmadas con el usuario:

- **Ver cambios en vivo** — los cambios de otros aparecen al instante sin recargar.
- **No pisarse al editar lo mismo** — evitar sobrescrituras silenciosas.
- **Saber quién está editando** — presencia y aviso de "X está editando esto".
- **Texto colaborativo**: resuelto con **aviso + bloqueo suave** (NO co-escritura
  carácter a carácter / CRDT). Decisión explícita del usuario: no se usa Yjs/CRDT
  en ninguna parte de la plataforma.

### No-objetivos (YAGNI)

- **Sin CRDT / OT / Yjs**. No hay co-escritura simultánea del mismo texto.
- **Sin Redis** en esta fase: el backend corre como **un solo contenedor**, así que
  los rooms de Socket.io viven en memoria. Solo haría falta el adaptador Redis +
  *sticky sessions* si en el futuro hubiera varias réplicas del backend (anotado
  como mejora futura, fuera de alcance).
- **Sin rooms finos por registro para el refresco en vivo**: se usan **topics
  gruesos por entidad** (decisión del usuario). Los rooms finos sí se usan, pero
  solo para presencia/bloqueo (sección 5).

## 2. Contexto técnico actual (verificado 2026-06-22)

- **Backend**: NestJS 10, TypeORM, `pg`. Un contenedor `mw-secretaria-api` en
  `127.0.0.1:3010`. Prefijo global `/api`. No hay Socket.io todavía.
- **Auth**: `SecretariaAuthGuard` (`backend/src/common/secretaria-auth.guard.ts`)
  valida el JWT de MW Panel (`JWT_SECRET`) y exige un rol en
  `secretaria.staff_roles`. Roles: `secretaria_admin`, `secretaria_staff`,
  `direccion`, `secretaria_teacher`.
- **Auditoría**: `secretaria.fn_audit()` (migración `001_init_secretaria.sql`)
  escribe en `secretaria.audit_log(table_name, record_id, action, old_data,
  new_data, user_id, at)` en cada `INSERT/UPDATE/DELETE` de las tablas con trigger.
  **`user_id` NO se rellena en el trigger** (queda `NULL`).
- **Frontend**: React + Vite + AntD. Cliente HTTP **axios** en
  `frontend/src/api.ts` con token Bearer. Estado por componente con funciones de
  recarga manuales. Hay `SearchContext` global y autoguardado con *debounce* en
  varias pantallas.
- **nginx**: `/etc/nginx/sites-available/secretaria.conf` (symlink desde
  `sites-enabled`) sirve `frontend-dist` y hace proxy de `/api/` → `3010`. Le
  faltan las cabeceras de *upgrade* para WebSocket.
- **Cloudflare** delante (soporta WebSockets).

## 3. Arquitectura / transporte

### 3.1 Gateway Socket.io
- Añadir `@nestjs/platform-socket.io` + `@nestjs/websockets` + `socket.io`.
- Un `RealtimeGateway` en un **namespace `/rt`**.
- **Auth en el handshake**: el cliente envía el JWT en `socket.handshake.auth.token`.
  El gateway lo valida reutilizando la misma lógica del guard (JWT con
  `JWT_SECRET` + comprobación de `staff_roles`). Sin token válido o sin rol de
  Secretaría → se rechaza la conexión (`disconnect`). En `socket.data` se guarda
  `{ userId, email, secretariaRoles, displayName }`.

### 3.2 nginx
- En el `location` que sirve el namespace de socket (o en `/api/`) añadir:
  ```
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 3600s;
  ```
- Editar el fichero real `sites-available/secretaria.conf` (no el symlink),
  `nginx -t && systemctl reload nginx`.

### 3.3 Propiedad de seguridad (clave)
El WebSocket **nunca transporta datos de negocio**. Solo lleva:
- avisos de cambio: `{ topic, action }` (sin filas, sin campos sensibles), y
- presencia: `{ userId, displayName, targetKey? }`.

Los datos reales siguen viajando por los endpoints REST autorizados, por lo que el
**scoping RGPD por rol** (un profesor solo ve sus grupos) se mantiene intacto sin
trabajo adicional: el aviso solo dispara un re-fetch, y ese re-fetch ya devuelve
únicamente lo que el rol puede ver.

## 4. Feed de cambios ("ver en vivo") — reaprovechando la auditoría

### 4.1 Origen de los cambios: `LISTEN/NOTIFY`
- Migración que amplía `fn_audit()` (o añade un trigger gemelo) para emitir
  `pg_notify('secretaria_changes', payload)` tras la escritura. **Payload mínimo**:
  `{"t":"<table_name>","a":"<INSERT|UPDATE|DELETE>"}`. Sin `record_id` ni datos de
  fila → nunca supera el límite de ~8 KB de `NOTIFY` y no filtra existencia de
  registros a roles no autorizados.
- El backend abre **un cliente `pg` dedicado** que hace `LISTEN secretaria_changes`
  al arrancar (servicio `ChangeFeedService`). Reconexión automática si se cae la
  conexión. Cada notificación recibida se traduce a un **topic** y se reenvía por
  Socket.io.

### 4.2 Topics gruesos por entidad (decisión del usuario)
- Un topic por entidad/tabla relevante: `payments`, `charges`, `enrollments`,
  `students`, `families`, `guardians`, `groups`, `schedule_slots`, `attendance`,
  `task_records`, `apoyo_assignments`, etc.
- Cada pantalla del frontend **se suscribe** (entra en el room Socket.io del topic)
  a los topics que le afectan. Al recibir un aviso del topic:
  1. **debounce ~300 ms** (agrupa ráfagas),
  2. llama a la **función de recarga ya existente** de esa pantalla.
- A la escala real (una escuela, ~10–30 personas concurrentes) el coste de
  re-fetch es despreciable y se evita todo el mapeo registro→pantalla. Datos nunca
  obsoletos.

### 4.3 Eventos directos puntuales (opcional, mejora de UX)
- Para interacciones muy visuales como **arrastrar una tarjeta en el kanban de
  Organización**, se puede emitir además un evento app-level con el cambio concreto
  (`{ enrollmentId, fromGroup, toGroup }`) para un *patch* optimista más ágil en
  los demás clientes, sin esperar al re-fetch. Es una mejora opcional encima del
  baseline de la sección 4.2, no un sustituto.

## 5. Presencia + "quién está editando"

- Rooms efímeros en memoria (Socket.io), **por pantalla o por registro**:
  - de pantalla: `view:organizacion:<serviceId>`, `view:pagos:<serviceId>:<yearId>`…
  - de registro: `student:<id>`, `family:<id>`, `enrollment:<id>`.
- El gateway mantiene `Map<roomKey, Map<userId, { displayName, targetKey?, since }>>`.
- **Presencia**: al unirse/salir un usuario, el gateway difunde la lista de
  presentes del room → componente reutilizable **`<PresenceBar>`** (avatares de
  quién está en esa pantalla).
- **Quién edita**: al enfocar un registro/campo editable, el cliente emite
  `edit:start { roomKey, targetKey }`; el gateway lo difunde y los demás muestran
  **`<EditingBadge>`** ("Fulano está editando esto"). `edit:stop` al guardar,
  desenfocar o desconectar (limpieza en `handleDisconnect`).
- El "actor" (quién hace qué) sale **del socket autenticado**, no de `audit_log`,
  de modo que el `user_id` NULL del trigger no afecta.

## 6. No pisarse (anti-sobrescritura)

Dos capas complementarias:

### 6.1 Bloqueo suave (consultivo)
Lo de la sección 5: avisa y previene la mayoría de los choques, pero no garantiza
nada por sí solo (un usuario puede ignorar el aviso o llegar justo a la vez).

### 6.2 Control de versión optimista (garantía dura)
- Migración que añade `updated_at timestamptz NOT NULL DEFAULT now()` con
  **auto-bump en UPDATE** (trigger `BEFORE UPDATE`) a las tablas que se editan como
  **unidad** (registro entero): `students`, `families`, `guardians`, `enrollments`,
  `groups`. (Si alguna ya tuviera columna equivalente, se reutiliza.)
- El `GET` de detalle devuelve `updated_at`. Al guardar, el cliente lo reenvía y el
  backend hace `UPDATE … WHERE id = ? AND updated_at = ?`:
  - 1 fila afectada → OK.
  - 0 filas → **HTTP 409 Conflict** con el registro actual en el cuerpo.
- El frontend intercepta el 409 (interceptor de axios) y muestra "Otro usuario
  cambió esto" con opción de **recargar** (y reaplicar los cambios manualmente).

### 6.3 Rejillas (asistencia, tareas, pagos)
El guardado ya es **por celda / upsert** (radio de impacto mínimo: una celda por
alumno-fecha/concepto). Ahí **no se añade control de versión**: basta presencia +
refresco en vivo, porque dos personas tocando celdas distintas no se pisan y tocar
la misma celda es un upsert idempotente cuyo resultado se refleja al instante.

## 7. Frontend (piezas reutilizables)

- **`RealtimeProvider`**: abre **una única** conexión Socket.io (token del store de
  auth), la comparte por contexto, reconecta y reautentica al refrescar token.
- **`useLiveQuery(topics, reload)`**: se suscribe a los topics indicados y llama a
  `reload` con *debounce* cuando llega un aviso. Se desuscribe al desmontar.
- **`useRoomPresence(roomKey)`**: une/sale del room y devuelve `{ present[],
  editingBy }`; expone `startEditing(targetKey)` / `stopEditing()`.
- **`<PresenceBar>`** y **`<EditingBadge>`**: UI estándar de presencia/edición.
- **Interceptor de 409 en axios**: detecta el conflicto de versión y dispara el
  flujo de "recargar/combinar".

## 8. Fases de despliegue

Cada fase se despliega y se prueba por separado (flujo: `npm run build` frontend +
`docker build`/`run` API + push al repo GitHub de Secretaría). Producción intacta
entre fases.

- **Fase 0 — Infraestructura (invisible para el usuario)**
  Dependencias backend, `RealtimeGateway` con auth, `ChangeFeedService`
  (`LISTEN`), migración `pg_notify` en `fn_audit`, cabeceras nginx,
  `RealtimeProvider` en el frontend. Validación: conexión autenticada y presencia
  funcionando en **una** pantalla de prueba.

- **Fase 1 — Ver en vivo en lo más concurrido**
  `useLiveQuery` en Organización (kanban), **Horarios** (rejilla por aulas y
  semanal — refresco inmediato al mover/crear/borrar franjas o cambiar grupo/aula),
  Pagos (matriz) y Asistencia/Tareas.
  (Opcional: *patch* optimista del kanban, sección 4.3.)

- **Fase 2 — Presencia + bloqueo suave + versión en formularios largos**
  Migración `updated_at` + 409. Ficha de alumno, Familias/Tutores, Matrículas:
  `<PresenceBar>`, `<EditingBadge>` y manejo de conflicto.

- **Fase 3 — Resto de listados + presencia global**
  `useLiveQuery` en los listados restantes (Alumnos, Familias, Matrículas,
  Grupos, Documentación, etc. — un alta/baja/edición aparece en la lista de
  los demás sin recargar) y barra de presencia global en la cabecera.

## 9. Riesgos y mitigaciones

- **WebSocket a través de nginx + Cloudflare**: requiere cabeceras de *upgrade*
  (sección 3.2). Mitigación: Socket.io cae a *long-polling* automáticamente si el
  WebSocket falla; se prueba en Fase 0.
- **Escalado a varias réplicas del backend**: rompería los rooms en memoria.
  Mitigación: hoy es un solo contenedor; si se escala, añadir adaptador Redis +
  *sticky sessions* (fuera de alcance, anotado).
- **Tormenta de notificaciones** (p. ej. importador masivo escribiendo miles de
  filas): podría disparar muchos avisos. Mitigación: el *debounce* del cliente
  agrupa ráfagas; opción de *throttle* por topic en el `ChangeFeedService` si se
  observa carga.
- **Reconexión / pérdida de avisos**: si un cliente pierde la conexión un momento,
  podría perder un aviso. Mitigación: al reconectar, el `RealtimeProvider` dispara
  una recarga de las pantallas suscritas; además el control de versión (6.2) es la
  red de seguridad dura contra sobrescritura aunque se pierda un aviso.

## 10. Criterios de aceptación

- Dos sesiones (dos navegadores/usuarios) en la misma pantalla: un cambio de una se
  refleja en la otra en < 1 s sin recargar.
- En un formulario largo, si A guarda después de que B ya guardó sobre la misma
  versión, A recibe aviso de conflicto (409) y **no** pisa lo de B.
- En una pantalla se ve quién más está presente y, al editar un registro, los demás
  ven "X está editando".
- El scoping por rol se mantiene: un `secretaria_teacher` no recibe por el socket
  datos de grupos que no le corresponden (el socket solo lleva avisos/presencia; el
  re-fetch respeta el rol).
