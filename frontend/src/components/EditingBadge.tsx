import { Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { Presence } from '../realtime/useRoomPresence';
import { getUserId } from '../api';

export function EditingBadge({ present, targetKey }: { present: Presence[]; targetKey: string }) {
  const self = getUserId();
  const others = present.filter(p => p.editing === targetKey && p.userId !== self);
  if (!others.length) return null;
  return <Tag icon={<EditOutlined />} color="warning">{others.map(o => o.displayName).join(', ')} editando</Tag>;
}
