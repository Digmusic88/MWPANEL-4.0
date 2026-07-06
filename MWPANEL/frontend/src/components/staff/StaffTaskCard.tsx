/**
 * @archivo: StaffTaskCard.tsx
 * @modulo: Staff (Claustro)
 * @funcion: Card de tarea del claustro
 */

import React from 'react';
import { Card, Avatar, Tag, Tooltip, Space, Typography, Badge } from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { StaffTaskStatusBadge, StaffTaskPriorityBadge } from './StaffTaskStatusBadge';
import type { StaffTask } from '@/types/staff';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface StaffTaskCardProps {
  task: StaffTask;
  onClick?: () => void;
  showCreator?: boolean;
}

export const StaffTaskCard: React.FC<StaffTaskCardProps> = ({
  task,
  onClick,
  showCreator = true,
}) => {
  const isOverdue =
    task.dueDate &&
    task.status !== 'completed' &&
    dayjs(task.dueDate).isBefore(dayjs(), 'day');

  const getUserName = (user: { profile?: { firstName?: string; lastName?: string }; email: string }) => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  return (
    <Card
      hoverable
      onClick={onClick}
      className="staff-task-card"
      style={{
        borderLeft: isOverdue ? '4px solid #ff4d4f' : undefined,
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Header: Title and Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text strong style={{ fontSize: '16px', flex: 1 }}>
            {task.title}
          </Text>
          <Space size="small">
            <StaffTaskStatusBadge status={task.status} size="small" />
            <StaffTaskPriorityBadge priority={task.priority} size="small" />
          </Space>
        </div>

        {/* Description */}
        {task.description && (
          <Paragraph
            type="secondary"
            ellipsis={{ rows: 2 }}
            style={{ marginBottom: 0, fontSize: '13px' }}
          >
            {task.description}
          </Paragraph>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <Space size={4} wrap>
            {task.tags.map(tag => (
              <Tag key={tag.id} color={tag.color || 'default'} style={{ fontSize: '11px' }}>
                {tag.name}
              </Tag>
            ))}
          </Space>
        )}

        {/* Footer: Due date, Assignees, Creator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
          }}
        >
          {/* Due Date */}
          <Space size="small">
            {task.dueDate && (
              <Tooltip title="Fecha limite">
                <Space size={4}>
                  {isOverdue && <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                  <CalendarOutlined style={{ color: isOverdue ? '#ff4d4f' : undefined }} />
                  <Text
                    type={isOverdue ? 'danger' : 'secondary'}
                    style={{ fontSize: '12px' }}
                  >
                    {dayjs(task.dueDate).format('DD/MM/YYYY')}
                  </Text>
                </Space>
              </Tooltip>
            )}
          </Space>

          {/* Assignees */}
          <Space size="small">
            {task.assignments && task.assignments.length > 0 && (
              <Tooltip
                title={task.assignments
                  .map(a => getUserName(a.assignedTo))
                  .join(', ')}
              >
                <Avatar.Group
                  maxCount={3}
                  size="small"
                  maxStyle={{ backgroundColor: '#1890ff' }}
                >
                  {task.assignments.map(assignment => (
                    <Tooltip key={assignment.id} title={getUserName(assignment.assignedTo)}>
                      <Avatar
                        size="small"
                        icon={<UserOutlined />}
                        src={assignment.assignedTo.profile?.avatarUrl}
                        style={{
                          backgroundColor: assignment.accepted ? '#52c41a' : '#faad14',
                        }}
                      />
                    </Tooltip>
                  ))}
                </Avatar.Group>
              </Tooltip>
            )}

            {/* Creator */}
            {showCreator && task.createdBy && (
              <Tooltip title={`Creado por: ${getUserName(task.createdBy)}`}>
                <Badge dot color="blue" offset={[-2, 2]}>
                  <Avatar
                    size="small"
                    icon={<UserOutlined />}
                    src={task.createdBy.profile?.avatarUrl}
                    style={{ backgroundColor: '#1890ff' }}
                  />
                </Badge>
              </Tooltip>
            )}
          </Space>
        </div>

        {/* Comments count if any */}
        {task.comments && task.comments.length > 0 && (
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {task.comments.length} comentario{task.comments.length !== 1 ? 's' : ''}
          </Text>
        )}
      </Space>
    </Card>
  );
};

export default StaffTaskCard;
