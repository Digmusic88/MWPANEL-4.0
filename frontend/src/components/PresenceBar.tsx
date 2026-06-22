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
