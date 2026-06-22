# Edición colaborativa en tiempo real (Secretaría) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que varios profesores/administradores trabajen a la vez en Secretaría viendo los cambios de los demás al instante, sabiendo quién edita qué, y sin sobrescribirse silenciosamente.

**Architecture:** WebSocket (Socket.io) dentro del NestJS existente, en namespace `/rt`, autenticado con el JWT de MW Panel. Un servicio `ChangeFeedService` escucha `LISTEN secretaria_changes` de Postgres (alimentado por el trigger de auditoría `fn_audit` ya existente, ampliado con `pg_notify`) y reenvía avisos de cambio por topics gruesos por entidad; cada pantalla del frontend recarga sus datos al recibir el aviso. Presencia y "quién edita" son rooms efímeros en memoria. La garantía dura contra sobrescritura es control de versión optimista (`updated_at` → HTTP 409).

**Tech Stack:** NestJS 10, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `pg` (cliente LISTEN dedicado), TypeORM, PostgreSQL (schema `secretaria`); React 18 + Vite + AntD, `socket.io-client`, axios. Tests de funciones puras con `node:test` (sin dependencias nuevas pesadas).

## Global Constraints

- **Sistema en PRODUCCIÓN**: cada fase se despliega y verifica por separado; no romper MW Panel ni Secretaría entre fases.
- **Un solo contenedor backend** (`mw-secretaria-api`, `127.0.0.1:3010`): rooms Socket.io en memoria, **sin Redis**. No introducir dependencia de Redis.
- **Sin CRDT/Yjs** en ninguna parte.
- **Topics gruesos por entidad** para el refresco en vivo (no rooms finos por registro).
- **El WebSocket nunca transporta datos de negocio**: solo `{ topic, action }` y presencia `{ userId, displayName, targetKey? }`. Los datos reales van por REST autorizado (scoping RGPD intacto).
- **Auth socket = misma regla que `SecretariaAuthGuard`**: JWT con `process.env.JWT_SECRET` + el usuario debe tener fila en `secretaria.staff_roles`.
- **Frontend**: token en `localStorage['secretaria_token']` (`getToken()` en `frontend/src/api.ts`); axios con `baseURL: '/api/secretaria'`.
- **Migraciones**: ficheros SQL en `backend`/`/opt/mw-secretaria/migrations/NNN_*.sql`, aplicadas a mano en prod contra `mw-panel-db-prod` (schema `secretaria`); `synchronize:false`.
- **Despliegue por cambio**: tras cada fase, build + redeploy + commit **y push** al repo GitHub de Secretaría (`GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria`, rama `main`).
- **Texto sin tildes en mensajes de commit** (norma del repo).

---

## Estructura de ficheros

**Backend (nuevos):**
- `backend/src/realtime/realtime.topics.ts` — funciones puras: mapeo `table_name → topic`, validación de topics/rooms. (Sin dependencias Nest → testeable en aislamiento.)
- `backend/src/realtime/realtime.topics.test.ts` — tests `node:test` del mapeo.
- `backend/src/realtime/realtime.auth.ts` — función pura/aislada `authenticateSocketToken(token, jwt, staffRolesRepo)` reutilizada por el gateway.
- `backend/src/realtime/realtime.gateway.ts` — `RealtimeGateway` (Socket.io, namespace `/rt`): conexión autenticada, suscripción a topics, presencia y edit-locks.
- `backend/src/realtime/presence.registry.ts` — estado en memoria de presencia/locks + tests `presence.registry.test.ts`.
- `backend/src/realtime/change-feed.service.ts` — cliente `pg` dedicado con `LISTEN secretaria_changes`, reconexión, reenvío al gateway.
- `backend/src/realtime/realtime.module.ts` — módulo que agrupa lo anterior (importa `JwtModule`, `TypeOrmModule.forFeature([StaffRole])`).
- `backend/src/common/optimistic-lock.ts` — helper puro `buildVersionedUpdate(...)` + `VersionConflictException` + tests.
- `migrations/026_realtime_notify.sql` — añade `pg_notify` al trigger de auditoría.
- `migrations/027_updated_at.sql` — añade `updated_at` + trigger bump a tablas editadas como unidad.

**Backend (modificados):**
- `backend/src/app.module.ts` — registrar `RealtimeModule`.
- `backend/package.json` — deps socket.io + script de test.
- Servicios de Fase 2 (students/families/enrollments) — usar `optimistic-lock`.

**Frontend (nuevos):**
- `frontend/src/realtime/RealtimeProvider.tsx` — contexto + única conexión Socket.io.
- `frontend/src/realtime/useLiveQuery.ts` — hook suscripción a topics + recarga con debounce.
- `frontend/src/realtime/useRoomPresence.ts` — hook presencia/lock por room.
- `frontend/src/realtime/debounce.ts` — helper puro `makeDebouncer` + test `debounce.test.ts`.
- `frontend/src/components/PresenceBar.tsx` — avatares de presentes.
- `frontend/src/components/EditingBadge.tsx` — aviso "X esta editando".

**Frontend (modificados):**
- `frontend/src/main.tsx` — envolver `<App/>` con `<RealtimeProvider>`.
- `frontend/src/api.ts` — interceptor de respuesta para HTTP 409 (conflicto de version).
- `frontend/src/App.tsx` — `useLiveQuery`/presencia por pantalla (Fases 1-3).
- `frontend/package.json` — dep `socket.io-client`.

**nginx:**
- `/etc/nginx/sites-available/secretaria.conf` — cabeceras de upgrade WebSocket en `location /api/`.

---

# FASE 0 — Infraestructura (invisible para el usuario)

Objetivo de la fase: conexión WebSocket autenticada, feed de cambios funcionando y presencia validable en una pantalla de prueba. Sin cambios visibles de producto.

## Task 0.1: Dependencias backend + runner de tests

**Files:**
- Modify: `backend/package.json`

**Interfaces:**
- Produces: deps `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` disponibles; script `npm test` que ejecuta `node:test` sobre los `.test.ts` compilados.

- [ ] **Step 1: Añadir dependencias y script de test**

En `backend/package.json`, dentro de `"dependencies"` añadir:
```json
"@nestjs/websockets": "^10.3.0",
"@nestjs/platform-socket.io": "^10.3.0",
"socket.io": "^4.7.5"
```
En `"scripts"` añadir (compila a `dist` y corre los tests nativos de Node sobre los ficheros `.test.js`):
```json
"test": "tsc -p tsconfig.json && node --test \"dist/**/*.test.js\""
```

- [ ] **Step 2: Instalar**

Run: `cd /opt/mw-secretaria/backend && npm install`
Expected: instala sin errores; `node_modules/socket.io` presente.

- [ ] **Step 3: Commit**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/package.json backend/package-lock.json
git commit -m "chore(secretaria): deps socket.io y script de test para tiempo real"
```

## Task 0.2: Mapeo de topics (funcion pura + TDD)

**Files:**
- Create: `backend/src/realtime/realtime.topics.ts`
- Test: `backend/src/realtime/realtime.topics.test.ts`

**Interfaces:**
- Produces:
  - `type ChangeTopic = string`
  - `const ALL_TOPICS: readonly string[]` — lista blanca de topics validos.
  - `function topicForTable(tableName: string): ChangeTopic | null` — mapea nombre de tabla de `audit_log`/`NOTIFY` a su topic; `null` si la tabla no interesa al frontend.
  - `function isValidTopic(topic: string): boolean` — valida que un topic pedido por un cliente esta en la lista blanca.

- [ ] **Step 1: Escribir el test que falla**

```typescript
// backend/src/realtime/realtime.topics.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topicForTable, isValidTopic, ALL_TOPICS } from './realtime.topics';

test('mapea tablas conocidas a su topic', () => {
  assert.equal(topicForTable('students'), 'students');
  assert.equal(topicForTable('schedule_slots'), 'schedule_slots');
  assert.equal(topicForTable('payments'), 'payments');
  assert.equal(topicForTable('charges'), 'payments'); // charges refresca la matriz de pagos
});

test('devuelve null para tablas sin interes de UI', () => {
  assert.equal(topicForTable('audit_log'), null);
  assert.equal(topicForTable('tabla_inexistente'), null);
});

test('isValidTopic acepta solo la lista blanca', () => {
  assert.equal(isValidTopic('students'), true);
  assert.equal(isValidTopic('__proto__'), false);
  assert.equal(isValidTopic('cualquier_cosa'), false);
});

test('ALL_TOPICS no tiene duplicados', () => {
  assert.equal(new Set(ALL_TOPICS).size, ALL_TOPICS.length);
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd /opt/mw-secretaria/backend && npm test`
Expected: FAIL (`Cannot find module './realtime.topics'`).

- [ ] **Step 3: Implementar el minimo**

```typescript
// backend/src/realtime/realtime.topics.ts
export type ChangeTopic = string;

// Topics gruesos por entidad. Varias tablas pueden compartir topic
// (p.ej. charges/payments -> 'payments' porque refrescan la misma matriz).
const TABLE_TO_TOPIC: Record<string, ChangeTopic> = {
  students: 'students',
  families: 'families',
  guardians: 'families',
  enrollments: 'enrollments',
  groups: 'groups',
  schedule_slots: 'schedule_slots',
  rooms: 'schedule_slots',
  apoyo_assignments: 'apoyo',
  apoyo_slots: 'apoyo',
  attendance: 'attendance',
  task_records: 'tareas',
  payments: 'payments',
  charges: 'payments',
  payment_allocations: 'payments',
  sepa_batches: 'sepa',
  bank_accounts: 'sepa',
  student_documents: 'documents',
  document_types: 'documents',
  level_tests: 'level_tests',
  exam_sessions: 'examenes',
  exam_candidates: 'examenes',
  events: 'eventos',
  meeting_sheets: 'meetings',
  meeting_items: 'meetings',
  notebook_entries: 'notebook',
  notebook_sections: 'notebook',
  raffle_campaigns: 'raffles',
  raffle_books: 'raffles',
  taper_usage: 'taper',
};

export const ALL_TOPICS: readonly string[] = Array.from(new Set(Object.values(TABLE_TO_TOPIC)));

export function topicForTable(tableName: string): ChangeTopic | null {
  return Object.prototype.hasOwnProperty.call(TABLE_TO_TOPIC, tableName)
    ? TABLE_TO_TOPIC[tableName]
    : null;
}

export function isValidTopic(topic: string): boolean {
  return ALL_TOPICS.includes(topic);
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `cd /opt/mw-secretaria/backend && npm test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/realtime/realtime.topics.ts backend/src/realtime/realtime.topics.test.ts
git commit -m "feat(secretaria): mapeo de tablas a topics de tiempo real (TDD)"
```

## Task 0.3: Registro de presencia y locks (estado en memoria + TDD)

**Files:**
- Create: `backend/src/realtime/presence.registry.ts`
- Test: `backend/src/realtime/presence.registry.test.ts`

**Interfaces:**
- Produces:
  - `interface Presence { userId: string; displayName: string; editing: string | null }`
  - `class PresenceRegistry`:
    - `join(roomKey: string, socketId: string, userId: string, displayName: string): void`
    - `leave(socketId: string): string[]` — quita el socket de todos los rooms; devuelve los `roomKey` afectados (para re-difundir).
    - `setEditing(socketId: string, roomKey: string, targetKey: string | null): void`
    - `list(roomKey: string): Presence[]` — presentes del room (dedup por userId, conserva editing no nulo).

- [ ] **Step 1: Escribir el test que falla**

```typescript
// backend/src/realtime/presence.registry.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PresenceRegistry } from './presence.registry';

test('join y list', () => {
  const r = new PresenceRegistry();
  r.join('student:1', 'sockA', 'u1', 'Ana');
  r.join('student:1', 'sockB', 'u2', 'Beto');
  const present = r.list('student:1').map(p => p.displayName).sort();
  assert.deepEqual(present, ['Ana', 'Beto']);
});

test('leave devuelve los rooms afectados y limpia', () => {
  const r = new PresenceRegistry();
  r.join('student:1', 'sockA', 'u1', 'Ana');
  r.join('view:pagos', 'sockA', 'u1', 'Ana');
  const affected = r.leave('sockA').sort();
  assert.deepEqual(affected, ['student:1', 'view:pagos']);
  assert.deepEqual(r.list('student:1'), []);
});

test('setEditing marca el targetKey', () => {
  const r = new PresenceRegistry();
  r.join('student:1', 'sockA', 'u1', 'Ana');
  r.setEditing('sockA', 'student:1', 'nombre');
  assert.equal(r.list('student:1')[0].editing, 'nombre');
  r.setEditing('sockA', 'student:1', null);
  assert.equal(r.list('student:1')[0].editing, null);
});

test('un mismo usuario en dos pestanas se deduplica por userId', () => {
  const r = new PresenceRegistry();
  r.join('student:1', 'sockA', 'u1', 'Ana');
  r.join('student:1', 'sockB', 'u1', 'Ana');
  assert.equal(r.list('student:1').length, 1);
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd /opt/mw-secretaria/backend && npm test`
Expected: FAIL (`Cannot find module './presence.registry'`).

- [ ] **Step 3: Implementar el minimo**

```typescript
// backend/src/realtime/presence.registry.ts
export interface Presence { userId: string; displayName: string; editing: string | null }

interface Entry { roomKey: string; userId: string; displayName: string; editing: string | null }

export class PresenceRegistry {
  // socketId -> entradas (un socket puede estar en varios rooms)
  private bySocket = new Map<string, Entry[]>();

  join(roomKey: string, socketId: string, userId: string, displayName: string): void {
    const entries = this.bySocket.get(socketId) ?? [];
    if (!entries.some(e => e.roomKey === roomKey)) {
      entries.push({ roomKey, userId, displayName, editing: null });
    }
    this.bySocket.set(socketId, entries);
  }

  leave(socketId: string): string[] {
    const entries = this.bySocket.get(socketId) ?? [];
    const affected = entries.map(e => e.roomKey);
    this.bySocket.delete(socketId);
    return Array.from(new Set(affected));
  }

  setEditing(socketId: string, roomKey: string, targetKey: string | null): void {
    const entry = (this.bySocket.get(socketId) ?? []).find(e => e.roomKey === roomKey);
    if (entry) entry.editing = targetKey;
  }

  list(roomKey: string): Presence[] {
    const byUser = new Map<string, Presence>();
    for (const entries of this.bySocket.values()) {
      for (const e of entries) {
        if (e.roomKey !== roomKey) continue;
        const prev = byUser.get(e.userId);
        // conserva el editing no nulo si alguna pestana del usuario edita
        const editing = e.editing ?? prev?.editing ?? null;
        byUser.set(e.userId, { userId: e.userId, displayName: e.displayName, editing });
      }
    }
    return Array.from(byUser.values());
  }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd /opt/mw-secretaria/backend && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/realtime/presence.registry.ts backend/src/realtime/presence.registry.test.ts
git commit -m "feat(secretaria): registro en memoria de presencia y locks (TDD)"
```

## Task 0.4: Autenticacion del socket (aislada)

**Files:**
- Create: `backend/src/realtime/realtime.auth.ts`

**Interfaces:**
- Consumes: `JwtService` (de `@nestjs/jwt`), `Repository<StaffRole>` (de `backend/src/common/staff-role.entity.ts`).
- Produces:
  - `interface SocketUser { userId: string; email: string; secretariaRoles: string[]; displayName: string }`
  - `async function authenticateSocketToken(token: string | undefined, jwt: JwtService, staffRoles: Repository<StaffRole>): Promise<SocketUser>` — lanza `Error('unauthorized')` si falta/invalida el token o el usuario no tiene rol en `staff_roles`. Replica la regla de `SecretariaAuthGuard`.

- [ ] **Step 1: Implementar (sin test unitario: depende de JWT/DB; se verifica en Task 0.8 con dos sesiones reales)**

```typescript
// backend/src/realtime/realtime.auth.ts
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { StaffRole } from '../common/staff-role.entity';

export interface SocketUser {
  userId: string;
  email: string;
  secretariaRoles: string[];
  displayName: string;
}

export async function authenticateSocketToken(
  token: string | undefined,
  jwt: JwtService,
  staffRoles: Repository<StaffRole>,
): Promise<SocketUser> {
  if (!token) throw new Error('unauthorized');
  let payload: any;
  try {
    payload = jwt.verify(token, { secret: process.env.JWT_SECRET });
  } catch {
    throw new Error('unauthorized');
  }
  const userId = payload.sub || payload.id;
  const roles = await staffRoles.find({ where: { userId } });
  if (roles.length === 0) throw new Error('unauthorized');
  const displayName = payload.email || payload.name || 'Usuario';
  return { userId, email: payload.email, secretariaRoles: roles.map(r => r.role), displayName };
}
```

- [ ] **Step 2: Compilar**

Run: `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/realtime/realtime.auth.ts
git commit -m "feat(secretaria): autenticacion de socket reutilizando regla del guard"
```

## Task 0.5: RealtimeGateway (Socket.io)

**Files:**
- Create: `backend/src/realtime/realtime.gateway.ts`

**Interfaces:**
- Consumes: `authenticateSocketToken`, `PresenceRegistry`, `isValidTopic`.
- Produces:
  - `class RealtimeGateway` con metodo publico `broadcastChange(topic: string, action: string): void` (lo llama `ChangeFeedService`).
  - Eventos socket que escucha del cliente: `subscribe {topics:string[]}`, `unsubscribe {topics:string[]}`, `presence:join {roomKey}`, `presence:leave {roomKey}`, `edit:start {roomKey, targetKey}`, `edit:stop {roomKey}`.
  - Eventos que emite al cliente: `change {topic, action}`, `presence {roomKey, present: Presence[]}`.
- Detalle de transporte: Socket.io con `path: '/api/secretaria/socket.io'`, namespace `/rt` (asi reutiliza el proxy `location /api/` de nginx).

- [ ] **Step 1: Implementar el gateway**

```typescript
// backend/src/realtime/realtime.gateway.ts
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffRole } from '../common/staff-role.entity';
import { authenticateSocketToken, SocketUser } from './realtime.auth';
import { PresenceRegistry, Presence } from './presence.registry';
import { isValidTopic } from './realtime.topics';

@WebSocketGateway({
  namespace: '/rt',
  path: '/api/secretaria/socket.io',
  cors: { origin: [/mundoworld\.school$/, /localhost/], credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private registry = new PresenceRegistry();

  constructor(
    private jwt: JwtService,
    @InjectRepository(StaffRole) private staffRoles: Repository<StaffRole>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      const user = await authenticateSocketToken(token, this.jwt, this.staffRoles);
      client.data.user = user;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const affected = this.registry.leave(client.id);
    for (const roomKey of affected) {
      this.server.to(roomKey).emit('presence', { roomKey, present: this.registry.list(roomKey) });
    }
  }

  @SubscribeMessage('subscribe')
  onSubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { topics: string[] }) {
    for (const t of body?.topics ?? []) {
      if (isValidTopic(t)) client.join(`topic:${t}`);
    }
  }

  @SubscribeMessage('unsubscribe')
  onUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { topics: string[] }) {
    for (const t of body?.topics ?? []) client.leave(`topic:${t}`);
  }

  @SubscribeMessage('presence:join')
  onPresenceJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { roomKey: string }) {
    const user = client.data.user as SocketUser;
    if (!user || !body?.roomKey) return;
    client.join(body.roomKey);
    this.registry.join(body.roomKey, client.id, user.userId, user.displayName);
    this.server.to(body.roomKey).emit('presence', { roomKey: body.roomKey, present: this.registry.list(body.roomKey) });
  }

  @SubscribeMessage('presence:leave')
  onPresenceLeave(@ConnectedSocket() client: Socket, @MessageBody() body: { roomKey: string }) {
    if (!body?.roomKey) return;
    client.leave(body.roomKey);
    this.registry.leave(client.id); // simplificacion: re-join al cambiar de pantalla
    this.server.to(body.roomKey).emit('presence', { roomKey: body.roomKey, present: this.registry.list(body.roomKey) });
  }

  @SubscribeMessage('edit:start')
  onEditStart(@ConnectedSocket() client: Socket, @MessageBody() body: { roomKey: string; targetKey: string }) {
    if (!body?.roomKey) return;
    this.registry.setEditing(client.id, body.roomKey, body.targetKey ?? null);
    this.server.to(body.roomKey).emit('presence', { roomKey: body.roomKey, present: this.registry.list(body.roomKey) });
  }

  @SubscribeMessage('edit:stop')
  onEditStop(@ConnectedSocket() client: Socket, @MessageBody() body: { roomKey: string }) {
    if (!body?.roomKey) return;
    this.registry.setEditing(client.id, body.roomKey, null);
    this.server.to(body.roomKey).emit('presence', { roomKey: body.roomKey, present: this.registry.list(body.roomKey) });
  }

  // Llamado por ChangeFeedService al recibir un NOTIFY.
  broadcastChange(topic: string, action: string) {
    this.server.to(`topic:${topic}`).emit('change', { topic, action });
  }
}
```

- [ ] **Step 2: Compilar**

Run: `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/realtime/realtime.gateway.ts
git commit -m "feat(secretaria): RealtimeGateway socket.io (subscribe/presence/edit-lock)"
```

## Task 0.6: Migracion NOTIFY en el trigger de auditoria

**Files:**
- Create: `migrations/026_realtime_notify.sql`

**Interfaces:**
- Produces: cada INSERT/UPDATE/DELETE auditado emite `pg_notify('secretaria_changes', '{"t":"<tabla>","a":"<op>"}')`.

- [ ] **Step 1: Escribir la migracion (amplia `fn_audit`, conservando su comportamiento actual)**

```sql
-- migrations/026_realtime_notify.sql
-- Amplia el trigger de auditoria para emitir un NOTIFY con payload minimo
-- (solo tabla + accion). No cambia lo que ya escribe en audit_log.
CREATE OR REPLACE FUNCTION secretaria.fn_audit() RETURNS trigger AS $$
BEGIN
  INSERT INTO secretaria.audit_log(table_name, record_id, action, old_data, new_data)
  VALUES (TG_TABLE_NAME,
          COALESCE(NEW.id::text, OLD.id::text),
          TG_OP,
          CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) END);

  -- Aviso de tiempo real: payload minimo (sin datos sensibles, < 8KB).
  PERFORM pg_notify('secretaria_changes',
    json_build_object('t', TG_TABLE_NAME, 'a', TG_OP)::text);

  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;
```

- [ ] **Step 2: Aplicar en prod y verificar el NOTIFY**

Run (aplica la migracion):
```bash
cat /opt/mw-secretaria/migrations/026_realtime_notify.sql | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel
```
Expected: `CREATE FUNCTION`.

Run (verifica que llega el aviso: en una terminal escucha, en otra provoca un cambio):
```bash
# Terminal A (escucha 5s)
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c "LISTEN secretaria_changes;" -c "SELECT pg_sleep(5);" &
# Terminal B (provoca un UPDATE inocuo sobre una fila existente)
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c "UPDATE secretaria.students SET first_name = first_name WHERE id IN (SELECT id FROM secretaria.students LIMIT 1);"
wait
```
Expected: la terminal A imprime `Asynchronous notification "secretaria_changes" ... received` con payload `{"t":"students","a":"UPDATE"}`.

- [ ] **Step 3: Commit**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add migrations/026_realtime_notify.sql
git commit -m "feat(secretaria): NOTIFY de cambios en el trigger de auditoria"
```

## Task 0.7: ChangeFeedService (LISTEN dedicado) + RealtimeModule + wiring

**Files:**
- Create: `backend/src/realtime/change-feed.service.ts`
- Create: `backend/src/realtime/realtime.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `RealtimeGateway.broadcastChange`, `topicForTable`.
- Produces: al arrancar el modulo, un cliente `pg` dedicado hace `LISTEN secretaria_changes`; cada aviso se traduce con `topicForTable` y se reenvia con `broadcastChange`. Reconecta si la conexion cae.

- [ ] **Step 1: Implementar el servicio LISTEN**

```typescript
// backend/src/realtime/change-feed.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Client } from 'pg';
import { RealtimeGateway } from './realtime.gateway';
import { topicForTable } from './realtime.topics';

@Injectable()
export class ChangeFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('ChangeFeed');
  private client: Client | null = null;
  private stopped = false;

  constructor(private gateway: RealtimeGateway) {}

  async onModuleInit() { await this.connect(); }
  async onModuleDestroy() { this.stopped = true; await this.client?.end().catch(() => {}); }

  private async connect() {
    if (this.stopped) return;
    this.client = new Client({
      host: process.env.DB_HOST || 'mw-panel-db-prod',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'mwpanel',
      password: process.env.DB_PASS,
      database: process.env.DB_NAME || 'mwpanel',
    });
    this.client.on('notification', (msg) => {
      try {
        const { t, a } = JSON.parse(msg.payload || '{}');
        const topic = topicForTable(t);
        if (topic) this.gateway.broadcastChange(topic, a);
      } catch (e) { this.log.warn(`payload invalido: ${msg.payload}`); }
    });
    this.client.on('error', (e) => { this.log.error(`pg LISTEN error: ${e.message}`); this.reconnect(); });
    try {
      await this.client.connect();
      await this.client.query('LISTEN secretaria_changes');
      this.log.log('Escuchando secretaria_changes');
    } catch (e: any) {
      this.log.error(`No se pudo conectar LISTEN: ${e.message}`);
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.stopped) return;
    this.client?.removeAllListeners();
    this.client = null;
    setTimeout(() => this.connect(), 3000);
  }
}
```

- [ ] **Step 2: Crear el modulo**

```typescript
// backend/src/realtime/realtime.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffRole } from '../common/staff-role.entity';
import { RealtimeGateway } from './realtime.gateway';
import { ChangeFeedService } from './change-feed.service';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([StaffRole])],
  providers: [RealtimeGateway, ChangeFeedService],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
```

- [ ] **Step 3: Registrar el modulo en app.module.ts**

En `backend/src/app.module.ts`, añadir el import arriba:
```typescript
import { RealtimeModule } from './realtime/realtime.module';
```
y añadir `RealtimeModule` al final del array `imports` (tras `NotebookModule,`):
```typescript
    ... NotebookModule, RealtimeModule,
```

- [ ] **Step 4: Compilar y correr todos los tests**

Run: `cd /opt/mw-secretaria/backend && npm test`
Expected: compila sin errores y PASS de todos los tests previos.

- [ ] **Step 5: Commit**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/realtime/change-feed.service.ts backend/src/realtime/realtime.module.ts backend/src/app.module.ts
git commit -m "feat(secretaria): ChangeFeedService LISTEN + RealtimeModule integrado"
```

## Task 0.8: nginx upgrade + deploy + verificacion de conexion

**Files:**
- Modify: `/etc/nginx/sites-available/secretaria.conf`

- [ ] **Step 1: Añadir cabeceras de upgrade WebSocket**

En `/etc/nginx/sites-available/secretaria.conf`, dentro de `location /api/ {`, añadir estas tres lineas (junto a las `proxy_set_header` existentes):
```nginx
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
```
(`proxy_http_version 1.1;` ya esta presente.)

- [ ] **Step 2: Probar y recargar nginx**

Run: `sudo nginx -t && sudo systemctl reload nginx`
Expected: `syntax is ok` / `test is successful`; recarga sin error.

- [ ] **Step 3: Construir y desplegar la API**

Run:
```bash
cd /opt/mw-secretaria
docker build -t mw-secretaria-api:latest backend && \
docker rm -f mw-secretaria-api && \
docker run -d --name mw-secretaria-api --network mw-panel_mw-network \
  -p 127.0.0.1:3010:3010 --env-file backend/.env \
  -v /opt/mw-panel/cambridge-mocks-data/data/database.db:/mocks/database.db:ro \
  --restart unless-stopped mw-secretaria-api:latest
```
Expected: contenedor arriba. Verificar log:
Run: `docker logs mw-secretaria-api --tail 20`
Expected: aparece `Escuchando secretaria_changes` y `Secretaría API en puerto 3010`.

- [ ] **Step 4: Verificar el handshake autenticado (rechazo sin token, acepta con token)**

Run (sin token → debe rechazar; con token valido de un usuario con rol → conecta). Usar `socket.io-client` via node one-off. Primero obtener un JWT real: hacer login en la UI, abrir la consola del navegador y copiar `localStorage.getItem('secretaria_token')`, y exportarlo en la terminal:
```bash
export TOKEN='<pega aqui el jwt copiado del navegador>'
node -e '
const { io } = require("/opt/mw-secretaria/frontend/node_modules/socket.io-client");
const ok = io("https://secretaria.mundoworld.school/rt", { path:"/api/secretaria/socket.io", transports:["websocket"], auth:{ token: process.env.TOKEN } });
ok.on("connect", () => { console.log("CONECTADO (con token) OK", ok.id); process.exit(0); });
ok.on("connect_error", e => { console.log("connect_error:", e.message); });
const bad = io("https://secretaria.mundoworld.school/rt", { path:"/api/secretaria/socket.io", transports:["websocket"], auth:{} });
bad.on("disconnect", r => console.log("SIN TOKEN -> desconectado (esperado):", r));
setTimeout(()=>process.exit(1), 8000);
'
```
Expected: `CONECTADO (con token) OK` y el socket sin token termina desconectado.

- [ ] **Step 5: Commit y push de la Fase 0**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add -A
git commit -m "chore(secretaria): despliegue Fase 0 tiempo real (gateway + change feed + nginx ws)"
git push
```
(La config de nginx vive fuera del repo; anotar el cambio en CLAUDE/notas.)

## Task 0.9: Frontend RealtimeProvider + hooks + helper debounce (TDD del helper)

**Files:**
- Modify: `frontend/package.json` (dep `socket.io-client`)
- Create: `frontend/src/realtime/debounce.ts`
- Test: `frontend/src/realtime/debounce.test.ts`
- Create: `frontend/src/realtime/RealtimeProvider.tsx`
- Create: `frontend/src/realtime/useLiveQuery.ts`
- Create: `frontend/src/realtime/useRoomPresence.ts`
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Produces:
  - `makeDebouncer(fn: () => void, ms: number): () => void`
  - `<RealtimeProvider>` (contexto con el socket compartido) + `useRealtimeSocket(): Socket | null`
  - `useLiveQuery(topics: string[], reload: () => void): void`
  - `useRoomPresence(roomKey: string | null): { present: Presence[]; startEditing: (t: string) => void; stopEditing: () => void }`
  - `type Presence = { userId: string; displayName: string; editing: string | null }`

- [ ] **Step 1: Añadir dep y escribir el test del debouncer**

En `frontend/package.json` `"dependencies"` añadir: `"socket.io-client": "^4.7.5"`. Luego:
Run: `cd /opt/mw-secretaria/frontend && npm install`

```typescript
// frontend/src/realtime/debounce.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDebouncer } from './debounce';

test('agrupa llamadas en una sola tras el intervalo', async () => {
  let n = 0;
  const d = makeDebouncer(() => { n++; }, 50);
  d(); d(); d();
  assert.equal(n, 0);
  await new Promise(r => setTimeout(r, 80));
  assert.equal(n, 1);
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd /opt/mw-secretaria/frontend && node --test --experimental-strip-types src/realtime/debounce.test.ts`
Expected: FAIL (modulo no encontrado).

- [ ] **Step 3: Implementar el debouncer**

```typescript
// frontend/src/realtime/debounce.ts
export function makeDebouncer(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(); }, ms);
  };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd /opt/mw-secretaria/frontend && node --test --experimental-strip-types src/realtime/debounce.test.ts`
Expected: PASS.

- [ ] **Step 5: Implementar RealtimeProvider**

```tsx
// frontend/src/realtime/RealtimeProvider.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../api';

const Ctx = createContext<Socket | null>(null);
export const useRealtimeSocket = () => useContext(Ctx);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return; // sin sesion no conectamos
    const s = io('/rt', {
      path: '/api/secretaria/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
    });
    ref.current = s;
    setSocket(s);
    return () => { s.disconnect(); ref.current = null; };
  }, []);

  return <Ctx.Provider value={socket}>{children}</Ctx.Provider>;
}
```

- [ ] **Step 6: Implementar useLiveQuery**

```typescript
// frontend/src/realtime/useLiveQuery.ts
import { useEffect, useRef } from 'react';
import { useRealtimeSocket } from './RealtimeProvider';
import { makeDebouncer } from './debounce';

// Se suscribe a los topics y llama a reload (con debounce) cuando llega un cambio.
export function useLiveQuery(topics: string[], reload: () => void) {
  const socket = useRealtimeSocket();
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const key = topics.join(',');

  useEffect(() => {
    if (!socket) return;
    const debounced = makeDebouncer(() => reloadRef.current(), 300);
    const onChange = (msg: { topic: string }) => { if (topics.includes(msg.topic)) debounced(); };
    socket.emit('subscribe', { topics });
    socket.on('change', onChange);
    return () => {
      socket.emit('unsubscribe', { topics });
      socket.off('change', onChange);
    };
  }, [socket, key]); // eslint-disable-line react-hooks/exhaustive-deps
}
```

- [ ] **Step 7: Implementar useRoomPresence**

```typescript
// frontend/src/realtime/useRoomPresence.ts
import { useEffect, useState, useCallback } from 'react';
import { useRealtimeSocket } from './RealtimeProvider';

export type Presence = { userId: string; displayName: string; editing: string | null };

export function useRoomPresence(roomKey: string | null) {
  const socket = useRealtimeSocket();
  const [present, setPresent] = useState<Presence[]>([]);

  useEffect(() => {
    if (!socket || !roomKey) return;
    const onPresence = (msg: { roomKey: string; present: Presence[] }) => {
      if (msg.roomKey === roomKey) setPresent(msg.present);
    };
    socket.on('presence', onPresence);
    socket.emit('presence:join', { roomKey });
    return () => {
      socket.emit('presence:leave', { roomKey });
      socket.off('presence', onPresence);
      setPresent([]);
    };
  }, [socket, roomKey]);

  const startEditing = useCallback((targetKey: string) => {
    if (socket && roomKey) socket.emit('edit:start', { roomKey, targetKey });
  }, [socket, roomKey]);
  const stopEditing = useCallback(() => {
    if (socket && roomKey) socket.emit('edit:stop', { roomKey });
  }, [socket, roomKey]);

  return { present, startEditing, stopEditing };
}
```

- [ ] **Step 8: Montar el provider en main.tsx**

En `frontend/src/main.tsx`, importar `import { RealtimeProvider } from './realtime/RealtimeProvider';` y envolver `<App/>` dentro de `<ConfigProvider>`:
```tsx
    <ConfigProvider locale={esES} theme={theme}>
      <RealtimeProvider>
        <App />
      </RealtimeProvider>
    </ConfigProvider>
```

- [ ] **Step 9: Build + deploy frontend**

Run:
```bash
cd /opt/mw-secretaria/frontend && npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/
```
Expected: build OK.

- [ ] **Step 10: Verificacion manual (dos sesiones) de presencia**

Verificacion: abrir la plataforma en dos navegadores/usuarios distintos en la misma URL. En la consola del navegador comprobar que el socket conecta (`Network → WS` muestra la conexion `101 Switching Protocols`). (La presencia visible llega en Fase 1+; aqui basta confirmar la conexion WS estable y sin errores en consola.)

- [ ] **Step 11: Commit y push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/package.json frontend/package-lock.json frontend/src/realtime frontend/src/main.tsx
git commit -m "feat(secretaria): RealtimeProvider + hooks useLiveQuery/useRoomPresence (frontend)"
git push
```

---

# FASE 1 — Ver en vivo en lo mas concurrido

Objetivo: que en Organizacion (kanban), Horarios, Pagos y Asistencia/Tareas, un cambio de un usuario se refleje en los demas en < 1 s sin recargar. Patron uniforme: localizar la funcion de recarga existente de cada pantalla y conectarla con `useLiveQuery`.

> **Nota para el implementador:** cada pantalla vive como una seccion dentro de `frontend/src/App.tsx` (fichero grande, ~6k lineas). Cada tarea indica el topic y la funcion de recarga a localizar (busca por el nombre del endpoint que ya llama, p.ej. `/enrollments/board`, `/schedule/grid`, `/payments/matrix`). El cambio es de 2-3 lineas por pantalla.

## Task 1.1: Organizacion (kanban) en vivo

**Files:**
- Modify: `frontend/src/App.tsx` (componente `Organizacion`)

**Interfaces:**
- Consumes: `useLiveQuery` (Task 0.9).
- Topics: `['enrollments','groups','students']` (mover alumno, crear/reordenar grupo, alta/baja).

- [ ] **Step 1: Conectar useLiveQuery a la recarga del tablero**

En el componente `Organizacion` de `App.tsx`, localizar la funcion que carga `/enrollments/board` (p.ej. `loadBoard`). Importar el hook (`import { useLiveQuery } from './realtime/useLiveQuery';`, una sola vez al inicio del fichero) y añadir dentro del componente:
```tsx
useLiveQuery(['enrollments', 'groups', 'students'], loadBoard);
```
(Sustituir `loadBoard` por el nombre real de la funcion de recarga del tablero.)

- [ ] **Step 2: Build + deploy**

Run: `cd /opt/mw-secretaria/frontend && npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/`
Expected: build OK.

- [ ] **Step 3: Verificacion manual (dos sesiones)**

Abrir Organizacion del mismo servicio en dos navegadores. En el navegador A mover un alumno de grupo. Expected: en el navegador B la tarjeta cambia de columna en < 1 s sin recargar.

- [ ] **Step 4: Commit y push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(secretaria): tablero Organizacion en vivo (useLiveQuery)"
git push
```

## Task 1.2: Horarios en vivo

**Files:**
- Modify: `frontend/src/App.tsx` (componentes de Horarios: `HorarioAulas` y rejilla semanal)

**Interfaces:**
- Topics: `['schedule_slots','groups']`.

- [ ] **Step 1: Conectar useLiveQuery a la recarga del horario**

En el/los componentes que cargan `/schedule/grid` y `/schedule`, localizar su funcion de recarga (p.ej. `loadGrid`/`loadSchedule`) y añadir:
```tsx
useLiveQuery(['schedule_slots', 'groups'], loadGrid);
```

- [ ] **Step 2: Build + deploy**

Run: `cd /opt/mw-secretaria/frontend && npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/`

- [ ] **Step 3: Verificacion manual (dos sesiones)**

En dos navegadores en Horarios: A mueve/crea/borra una franja o cambia aula/profesor. Expected: B ve el cambio en la rejilla en < 1 s sin recargar.

- [ ] **Step 4: Commit y push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(secretaria): horarios en vivo (useLiveQuery)"
git push
```

## Task 1.3: Pagos (matriz) en vivo

**Files:**
- Modify: `frontend/src/App.tsx` (componente Pagos)

**Interfaces:**
- Topics: `['payments','enrollments']` (`payments` cubre charges/payments/allocations por el mapeo de Task 0.2).

- [ ] **Step 1: Conectar useLiveQuery a la recarga de la matriz**

En el componente de Pagos, localizar la funcion que carga `/payments/matrix` (p.ej. `loadMatrix`) y añadir:
```tsx
useLiveQuery(['payments', 'enrollments'], loadMatrix);
```

- [ ] **Step 2: Build + deploy**

Run: `cd /opt/mw-secretaria/frontend && npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/`

- [ ] **Step 3: Verificacion manual (dos sesiones)**

Dos navegadores en Pagos del mismo servicio/curso: A cobra un recibo (celda → verde). Expected: B ve la celda en verde en < 1 s sin recargar.

- [ ] **Step 4: Commit y push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(secretaria): matriz de pagos en vivo (useLiveQuery)"
git push
```

## Task 1.4: Asistencia y Tareas en vivo

**Files:**
- Modify: `frontend/src/App.tsx` (componentes Asistencia y Registro de tareas)

**Interfaces:**
- Topics Asistencia: `['attendance']`; Tareas: `['tareas']`.

- [ ] **Step 1: Conectar useLiveQuery en ambas pantallas**

En Asistencia (carga `/attendance`...), añadir:
```tsx
useLiveQuery(['attendance'], loadAttendanceSheet);
```
En Registro de tareas (carga `/tareas/grid`...), añadir:
```tsx
useLiveQuery(['tareas'], loadTareasGrid);
```
(Sustituir por los nombres reales de recarga.)

- [ ] **Step 2: Build + deploy**

Run: `cd /opt/mw-secretaria/frontend && npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/`

- [ ] **Step 3: Verificacion manual (dos sesiones)**

Dos navegadores en el mismo grupo+fecha de Asistencia: A marca a un alumno ausente y guarda. Expected: B ve el cambio en < 1 s. Repetir en Tareas con una carita.

- [ ] **Step 4: Commit y push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(secretaria): asistencia y tareas en vivo (useLiveQuery)"
git push
```

---

# FASE 2 — Presencia + bloqueo suave + control de version en formularios largos

Objetivo: en Ficha de alumno, Familias/Tutores y Matriculas, ver quien esta presente/editando y evitar sobrescrituras silenciosas con HTTP 409.

## Task 2.1: Migracion `updated_at` + bump automatico

**Files:**
- Create: `migrations/027_updated_at.sql`

**Interfaces:**
- Produces: columna `updated_at timestamptz NOT NULL DEFAULT now()` en `students`, `families`, `guardians`, `enrollments`, `groups`, con trigger `BEFORE UPDATE` que la pone a `now()`.

- [ ] **Step 1: Escribir la migracion**

```sql
-- migrations/027_updated_at.sql
-- Control de version optimista: updated_at con bump automatico en UPDATE.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['students','families','guardians','enrollments','groups'] LOOP
    EXECUTE format('ALTER TABLE secretaria.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION secretaria.fn_bump_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['students','families','guardians','enrollments','groups'] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_bump_updated_at ON secretaria.%I; '
      'CREATE TRIGGER trg_bump_updated_at BEFORE UPDATE ON secretaria.%I '
      'FOR EACH ROW EXECUTE FUNCTION secretaria.fn_bump_updated_at()', t, t);
  END LOOP;
END $$;
```

- [ ] **Step 2: Aplicar en prod y verificar**

Run:
```bash
cat /opt/mw-secretaria/migrations/027_updated_at.sql | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c "\d secretaria.students" | grep updated_at
```
Expected: la columna `updated_at` aparece en `students` (y demas).

- [ ] **Step 3: Commit**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add migrations/027_updated_at.sql
git commit -m "feat(secretaria): updated_at + bump para control de version optimista"
```

## Task 2.2: Helper de update versionado (funcion pura + TDD)

**Files:**
- Create: `backend/src/common/optimistic-lock.ts`
- Test: `backend/src/common/optimistic-lock.test.ts`

**Interfaces:**
- Produces:
  - `class VersionConflictException extends HttpException` (status 409).
  - `function buildVersionedUpdate(table: string, setCols: string[], id: string, expectedUpdatedAt: string): { sql: string; params: any[] }` — genera `UPDATE secretaria.<table> SET <cols=$n> WHERE id=$k AND updated_at=$k+1 RETURNING updated_at`. Los valores de `setCols` se pasan como params en orden por el llamador.

- [ ] **Step 1: Escribir el test**

```typescript
// backend/src/common/optimistic-lock.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVersionedUpdate } from './optimistic-lock';

test('genera SQL con WHERE id y updated_at y RETURNING', () => {
  const { sql } = buildVersionedUpdate('students', ['first_name', 'last_name'], 'ID', '2026-06-22T10:00:00Z');
  assert.match(sql, /UPDATE secretaria\.students SET first_name = \$1, last_name = \$2/);
  assert.match(sql, /WHERE id = \$3 AND updated_at = \$4/);
  assert.match(sql, /RETURNING updated_at/);
});

test('coloca id y updated_at al final de params (tras los valores del set)', () => {
  const { sql } = buildVersionedUpdate('groups', ['name'], 'G', 'TS');
  assert.match(sql, /SET name = \$1 WHERE id = \$2 AND updated_at = \$3/);
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd /opt/mw-secretaria/backend && npm test`
Expected: FAIL (modulo no encontrado).

- [ ] **Step 3: Implementar**

```typescript
// backend/src/common/optimistic-lock.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class VersionConflictException extends HttpException {
  constructor(current?: any) {
    super({ message: 'Otro usuario cambio este registro', code: 'VERSION_CONFLICT', current }, HttpStatus.CONFLICT);
  }
}

// Construye un UPDATE optimista. El llamador pasa los valores de setCols como
// params $1..$n en el mismo orden; este helper añade id y updated_at al final.
export function buildVersionedUpdate(
  table: string, setCols: string[], id: string, expectedUpdatedAt: string,
): { sql: string; params: any[] } {
  const setClause = setCols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const idParam = setCols.length + 1;
  const verParam = setCols.length + 2;
  const sql = `UPDATE secretaria.${table} SET ${setClause} `
    + `WHERE id = $${idParam} AND updated_at = $${verParam} RETURNING updated_at`;
  // params de setCols los aporta el llamador; aqui solo devolvemos id+version
  return { sql, params: [id, expectedUpdatedAt] };
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd /opt/mw-secretaria/backend && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/common/optimistic-lock.ts backend/src/common/optimistic-lock.test.ts
git commit -m "feat(secretaria): helper de update versionado + VersionConflictException (TDD)"
```

## Task 2.3: Aplicar control de version al guardado de Ficha de alumno

**Files:**
- Modify: `backend/src/modules/students/students.controller.ts` y/o `students.service.ts` (metodo `updateFull` / `PATCH :id/full`)

**Interfaces:**
- Consumes: `buildVersionedUpdate`, `VersionConflictException`.
- Contrato API: el `GET /students/:id/full` devuelve `updatedAt`; el `PATCH` acepta `expectedUpdatedAt` en el body y devuelve 409 (`VersionConflictException`) si no coincide.

- [ ] **Step 1: Añadir `updated_at` al GET de detalle**

En el `SELECT` que arma la ficha del alumno (`GET /students/:id/full`), incluir `s.updated_at AS "updatedAt"` y devolverlo en el JSON.

- [ ] **Step 2: Comprobar version en el UPDATE**

En el metodo de actualizacion del alumno, antes de aplicar, leer `expectedUpdatedAt` del body. Ejecutar el UPDATE de la tabla `students` con condicion de version (usar `buildVersionedUpdate('students', [...cols], id, expectedUpdatedAt)` y pasar los valores de columnas + `params`). Si `rowCount === 0`:
```typescript
// recupera el estado actual para devolverlo al cliente
const cur = await this.ds.query('SELECT * FROM secretaria.students WHERE id = $1', [id]);
throw new VersionConflictException(cur[0] ?? null);
```
(Si la actualizacion abarca tablas relacionadas como tutores, basta con versionar la fila `students` como ancla del formulario.)

- [ ] **Step 3: Compilar**

Run: `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit`
Expected: sin errores.

- [ ] **Step 4: Deploy API + verificacion de conflicto**

Run (build/deploy API igual que Task 0.8 Step 3). Verificacion manual: abrir la misma ficha en dos navegadores; A guarda un cambio; B (con la version vieja) guarda otro. Expected: B recibe 409 y un aviso "Otro usuario cambio este registro"; el cambio de A no se pierde.

- [ ] **Step 5: Commit y push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/modules/students
git commit -m "feat(secretaria): control de version optimista al guardar ficha de alumno"
git push
```

## Task 2.4: Interceptor 409 en el frontend + aviso de recarga

**Files:**
- Modify: `frontend/src/api.ts`

**Interfaces:**
- Produces: interceptor de respuesta que detecta `error.response.status === 409` con `code === 'VERSION_CONFLICT'` y muestra un `message`/`Modal` de AntD invitando a recargar; reexpone el error para que el formulario no cierre.

- [ ] **Step 1: Añadir interceptor de respuesta**

Al final de `frontend/src/api.ts`:
```typescript
import { message } from 'antd';
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 409 && error.response.data?.code === 'VERSION_CONFLICT') {
      message.warning('Otro usuario cambio este registro mientras lo editabas. Recarga para ver la version actual antes de guardar.');
    }
    return Promise.reject(error);
  },
);
```

- [ ] **Step 2: Asegurar que la Ficha reenvia `expectedUpdatedAt`**

En el componente `FichaAlumno`/edicion de alumno, al cargar guardar el `updatedAt` recibido y enviarlo como `expectedUpdatedAt` en el `PATCH`.

- [ ] **Step 3: Build + deploy + verificacion (dos sesiones)**

Run: `cd /opt/mw-secretaria/frontend && npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/`
Verificacion: repetir el escenario de conflicto de Task 2.3 Step 4 desde la UI real. Expected: B ve el aviso amarillo y no pisa a A.

- [ ] **Step 4: Commit y push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/api.ts frontend/src/App.tsx frontend/src/components/InscripcionDrawer.tsx
git commit -m "feat(secretaria): aviso de conflicto de version (409) y envio de expectedUpdatedAt"
git push
```

## Task 2.5: Presencia + bloqueo suave en Ficha/Familias/Matriculas

**Files:**
- Create: `frontend/src/components/PresenceBar.tsx`
- Create: `frontend/src/components/EditingBadge.tsx`
- Modify: `frontend/src/App.tsx` (Ficha de alumno, Familias, Matriculas) y `frontend/src/components/InscripcionDrawer.tsx`

**Interfaces:**
- Consumes: `useRoomPresence` (Task 0.9), `Presence`.
- Produces: `<PresenceBar present={Presence[]} />`, `<EditingBadge present={Presence[]} targetKey={string} />`.

- [ ] **Step 1: Implementar PresenceBar**

```tsx
// frontend/src/components/PresenceBar.tsx
import { Avatar, Tooltip } from 'antd';
import type { Presence } from '../realtime/useRoomPresence';

export function PresenceBar({ present }: { present: Presence[] }) {
  if (!present.length) return null;
  return (
    <Avatar.Group maxCount={5} size="small">
      {present.map(p => (
        <Tooltip key={p.userId} title={p.editing ? `${p.displayName} (editando)` : p.displayName}>
          <Avatar style={{ background: p.editing ? '#B45309' : '#579172' }}>
            {(p.displayName[0] || '?').toUpperCase()}
          </Avatar>
        </Tooltip>
      ))}
    </Avatar.Group>
  );
}
```

- [ ] **Step 2: Implementar EditingBadge**

```tsx
// frontend/src/components/EditingBadge.tsx
import { Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { Presence } from '../realtime/useRoomPresence';

// Muestra quien (otro) esta editando este targetKey.
export function EditingBadge({ present, targetKey, selfUserId }: { present: Presence[]; targetKey: string; selfUserId?: string }) {
  const others = present.filter(p => p.editing === targetKey && p.userId !== selfUserId);
  if (!others.length) return null;
  return <Tag icon={<EditOutlined />} color="warning">{others.map(o => o.displayName).join(', ')} editando</Tag>;
}
```

- [ ] **Step 3: Conectar en la Ficha de alumno**

En el Drawer de Ficha/edicion de alumno (`roomKey = 'student:' + id`):
```tsx
const { present, startEditing, stopEditing } = useRoomPresence(open ? `student:${id}` : null);
// en la cabecera del Drawer:
<PresenceBar present={present} />
// al enfocar/desenfocar el formulario completo:
onFocus={() => startEditing('ficha')} onBlur={() => stopEditing()}
// junto al titulo del formulario:
<EditingBadge present={present} targetKey="ficha" selfUserId={/* id del usuario actual */} />
```
Repetir el mismo patron en el modal de Familias (`family:<id>`) y en Matriculas (`enrollment:<id>` o `view:matriculas`).

- [ ] **Step 4: Build + deploy + verificacion (dos sesiones)**

Run: `cd /opt/mw-secretaria/frontend && npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/`
Verificacion: dos navegadores abren la misma ficha. Expected: cada uno ve el avatar del otro en `PresenceBar`; cuando A pone el foco en el formulario, B ve el `EditingBadge` "A editando".

- [ ] **Step 5: Commit y push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/components/PresenceBar.tsx frontend/src/components/EditingBadge.tsx frontend/src/App.tsx frontend/src/components/InscripcionDrawer.tsx
git commit -m "feat(secretaria): presencia y aviso de edicion en ficha/familias/matriculas"
git push
```

---

# FASE 3 — Resto de listados + presencia global

Objetivo: extender el refresco en vivo a los listados restantes y mostrar una barra de presencia global en la cabecera.

## Task 3.1: useLiveQuery en los listados restantes

**Files:**
- Modify: `frontend/src/App.tsx` (Alumnos, Familias, Matriculas, Grupos, Documentacion, Programas, Profesores, Apoyo, Pruebas de nivel, Simulacros, Rifas, Taper, Reuniones, Calendario/Eventos)

**Interfaces:**
- Topics por pantalla (segun Task 0.2): Alumnos→`['students','enrollments']`; Familias→`['families']`; Matriculas→`['enrollments','groups']`; Grupos→`['groups']`; Documentacion→`['documents']`; Apoyo→`['apoyo','enrollments']`; Pruebas de nivel→`['level_tests']`; Simulacros→`['examenes']`; Rifas→`['raffles']`; Taper→`['taper']`; Reuniones→`['meetings']`; Calendario/Eventos→`['eventos']`.

- [ ] **Step 1: Añadir useLiveQuery en cada listado**

En cada componente de listado, localizar su funcion de recarga y añadir el hook con sus topics. Ejemplo Alumnos:
```tsx
useLiveQuery(['students', 'enrollments'], loadStudents);
```
Repetir para cada pantalla de la lista de arriba con sus topics correspondientes.

- [ ] **Step 2: Build + deploy**

Run: `cd /opt/mw-secretaria/frontend && npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/`

- [ ] **Step 3: Verificacion manual (muestreo, dos sesiones)**

Comprobar al menos Alumnos y Familias: A da de alta un alumno/familia. Expected: aparece en la lista de B sin recargar. Comprobar que ninguna pantalla entra en bucle de recarga (vigilar peticiones en Network: deben dispararse solo ante cambios).

- [ ] **Step 4: Commit y push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(secretaria): refresco en vivo en el resto de listados"
git push
```

## Task 3.2: Barra de presencia global en la cabecera

**Files:**
- Modify: `frontend/src/App.tsx` (cabecera/Header del layout)

**Interfaces:**
- Consumes: `useRoomPresence('global')`.

- [ ] **Step 1: Unir a un room global y mostrar presencia**

En el componente del layout principal, añadir:
```tsx
const { present } = useRoomPresence('global');
// en el Header, junto al buscador/email:
<PresenceBar present={present} />
```

- [ ] **Step 2: Build + deploy + verificacion**

Run: `cd /opt/mw-secretaria/frontend && npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/`
Verificacion: con dos usuarios conectados, cada cabecera muestra el avatar del otro. Al cerrar uno, su avatar desaparece de la cabecera del otro en pocos segundos.

- [ ] **Step 3: Commit y push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(secretaria): barra de presencia global en la cabecera"
git push
```

---

## Verificacion final (criterios de aceptacion del spec)

- [ ] Dos sesiones en la misma pantalla: un cambio de una se refleja en la otra en < 1 s sin recargar (Organizacion, Horarios, Pagos, Asistencia/Tareas, listados).
- [ ] En un formulario largo, si A guarda tras B sobre la misma version, A recibe 409 y no pisa a B.
- [ ] Se ve quien esta presente y "X esta editando" al enfocar un registro.
- [ ] Un `secretaria_teacher` no recibe por el socket datos de grupos ajenos (el socket solo lleva avisos/presencia; el re-fetch respeta el rol). Verificar conectando como profesor y comprobando que el trafico WS no contiene datos de negocio.
- [ ] MW Panel sigue OK: `curl -s https://plataforma.mundoworld.school/api/health/status`.

## Notas / mejoras futuras (fuera de alcance)

- Adaptador Redis + sticky sessions si el backend pasa a varias replicas.
- Patch optimista del kanban (evento app-level directo) para arrastre mas agil (spec 4.3).
- Throttle por topic en `ChangeFeedService` si el importador masivo genera tormentas de NOTIFY.
