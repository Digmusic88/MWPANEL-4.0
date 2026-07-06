/**
 * @archivo: StaffTaskStatusBadge.tsx
 * @modulo: Staff (Claustro)
 * @funcion: Badge de estado para tareas del claustro
 */

import React from 'react';
import { Tag } from 'antd';
import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { StaffTaskStatus, StaffTaskPriority } from '@/types/staff';

interface StaffTaskStatusBadgeProps {
  status: StaffTaskStatus;
  size?: 'small' | 'default';
}

const statusConfig: Record<StaffTaskStatus, { color: string; icon: React.ReactNode; label: string }> = {
  pending: {
    color: 'gold',
    icon: <ClockCircleOutlined />,
    label: 'Pendiente',
  },
  in_progress: {
    color: 'blue',
    icon: <SyncOutlined spin />,
    label: 'En progreso',
  },
  completed: {
    color: 'green',
    icon: <CheckCircleOutlined />,
    label: 'Completada',
  },
};

export const StaffTaskStatusBadge: React.FC<StaffTaskStatusBadgeProps> = ({
  status,
  size = 'default',
}) => {
  const config = statusConfig[status];
  if (!config) return null;

  return (
    <Tag
      color={config.color}
      icon={config.icon}
      style={size === 'small' ? { fontSize: '12px' } : {}}
    >
      {config.label}
    </Tag>
  );
};

interface StaffTaskPriorityBadgeProps {
  priority?: StaffTaskPriority;
  size?: 'small' | 'default';
}

const priorityConfig: Record<StaffTaskPriority, { color: string; label: string }> = {
  low: { color: 'default', label: 'Baja' },
  medium: { color: 'orange', label: 'Media' },
  high: { color: 'red', label: 'Alta' },
};

export const StaffTaskPriorityBadge: React.FC<StaffTaskPriorityBadgeProps> = ({
  priority,
  size = 'default',
}) => {
  if (!priority) return null;

  const config = priorityConfig[priority];
  if (!config) return null;

  return (
    <Tag color={config.color} style={size === 'small' ? { fontSize: '12px' } : {}}>
      {config.label}
    </Tag>
  );
};

export default StaffTaskStatusBadge;
