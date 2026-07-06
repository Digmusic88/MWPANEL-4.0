/**
 * @archivo: StaffArchivedTaskCard.tsx
 * @modulo: Staff (Claustro)
 * @funcion: Card para tarea archivada (completada) con opcion de reactivar
 */

import React from 'react';
import { Card, Avatar, Tag, Tooltip, Space, Typography, Button, Popconfirm } from 'antd';
import {
  CheckCircleOutlined,
  ReloadOutlined,
  UserOutlined,
  CalendarOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { StaffTask } from '@/types/staff';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface StaffArchivedTaskCardProps {
  task: StaffTask;
  onReactivate?: (id: string) => void;
  onViewDetail?: (task: StaffTask) => void;
  isReactivating?: boolean;
}

export const StaffArchivedTaskCard: React.FC<StaffArchivedTaskCardProps> = ({
  task,
  onReactivate,
  onViewDetail,
  isReactivating = false,
}) => {
  const getUserName = (user?: { profile?: { firstName?: string; lastName?: string }; email?: string }) => {
    if (!user) return 'Desconocido';
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'Desconocido';
  };

  return (
    <Card
      size="small"
      className="mb-3"
      style={{
        backgroundColor: '#f6ffed',
        borderColor: '#b7eb8f',
        borderLeft: '4px solid #52c41a',
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Header: Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text
            strong
            style={{
              fontSize: '15px',
              flex: 1,
              textDecoration: 'line-through',
              color: '#8c8c8c',
            }}
          >
            {task.title}
          </Text>
        </div>

        {/* Completion info */}
        <Space size="small" wrap>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <Text type="secondary" style={{ fontSize: '13px' }}>
            Completada el {task.completedAt ? dayjs(task.completedAt).format('DD/MM/YYYY HH:mm') : 'N/A'}
          </Text>
          {task.completedBy && (
            <>
              <Text type="secondary" style={{ fontSize: '13px' }}>por</Text>
              <Text strong style={{ fontSize: '13px' }}>{getUserName(task.completedBy)}</Text>
            </>
          )}
        </Space>

        {/* Tags and Creator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size={4} wrap>
            {task.tags?.map(tag => (
              <Tag key={tag.id} color={tag.color || 'default'} style={{ fontSize: '11px' }}>
                {tag.name}
              </Tag>
            ))}
          </Space>

          <Text type="secondary" style={{ fontSize: '12px' }}>
            Creada por {getUserName(task.createdBy)}
          </Text>
        </div>

        {/* Created/Due dates */}
        <Space size="small" style={{ fontSize: '11px' }}>
          <CalendarOutlined />
          <Text type="secondary">
            Creada: {dayjs(task.createdAt).format('DD/MM/YYYY')}
          </Text>
          {task.dueDate && (
            <>
              <Text type="secondary">|</Text>
              <Text type="secondary">
                Limite: {dayjs(task.dueDate).format('DD/MM/YYYY')}
              </Text>
            </>
          )}
        </Space>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <Popconfirm
            title="Reactivar tarea"
            description="Esta tarea volverá al estado 'Pendiente'. ¿Continuar?"
            onConfirm={() => onReactivate?.(task.id)}
            okText="Sí, reactivar"
            cancelText="Cancelar"
          >
            <Button
              type="link"
              icon={<ReloadOutlined />}
              loading={isReactivating}
              style={{ padding: 0 }}
            >
              Reactivar
            </Button>
          </Popconfirm>

          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => onViewDetail?.(task)}
            style={{ padding: 0 }}
          >
            Ver detalle
          </Button>
        </div>
      </Space>
    </Card>
  );
};

export default StaffArchivedTaskCard;
