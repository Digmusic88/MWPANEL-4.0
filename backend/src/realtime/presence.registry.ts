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
