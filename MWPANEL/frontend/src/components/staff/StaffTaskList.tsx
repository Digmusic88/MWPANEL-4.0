/**
 * @archivo: StaffTaskList.tsx
 * @modulo: Staff (Claustro)
 * @funcion: Lista de tareas del claustro en formato lista visual
 */

import React from 'react';
import { List, Avatar, Tag, Tooltip, Space, Typography, Badge, Button } from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  RightOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  LinkOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import type { StaffTask, StaffTaskStatus, StaffTaskPriority } from '@/types/staff';
import dayjs from 'dayjs';

const { Text } = Typography;

interface StaffTaskListProps {
  tasks: StaffTask[];
  onTaskClick: (task: StaffTask) => void;
  showCreator?: boolean;
  loading?: boolean;
}

const statusConfig: Record<StaffTaskStatus, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: 'gold', icon: <ClockCircleOutlined />, label: 'Pendiente' },
  in_progress: { color: 'blue', icon: <SyncOutlined spin />, label: 'En progreso' },
  completed: { color: 'green', icon: <CheckCircleOutlined />, label: 'Completada' },
};

const priorityConfig: Record<StaffTaskPriority, { color: string; label: string }> = {
  low: { color: 'default', label: 'Baja' },
  medium: { color: 'orange', label: 'Media' },
  high: { color: 'red', label: 'Alta' },
};

const getUserName = (user: { profile?: { firstName?: string; lastName?: string }; email: string }) => {
  if (user.profile?.firstName || user.profile?.lastName) {
    return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
  }
  return user.email.split('@')[0];
};

const getInitials = (user: { profile?: { firstName?: string; lastName?: string }; email: string }) => {
  if (user.profile?.firstName) {
    const first = user.profile.firstName.charAt(0).toUpperCase();
    const last = user.profile.lastName?.charAt(0).toUpperCase() || '';
    return first + last;
  }
  return user.email.charAt(0).toUpperCase();
};

export const StaffTaskList: React.FC<StaffTaskListProps> = ({
  tasks,
  onTaskClick,
  showCreator = true,
  loading = false,
}) => {
  return (
    <List
      className="staff-task-list"
      loading={loading}
      itemLayout="horizontal"
      dataSource={tasks}
      renderItem={(task) => {
        const isOverdue =
          task.dueDate &&
          task.status !== 'completed' &&
          dayjs(task.dueDate).isBefore(dayjs(), 'day');

        const status = statusConfig[task.status] || statusConfig.pending;
        const priority = priorityConfig[task.priority as StaffTaskPriority] || priorityConfig.medium;
        const hasMeetingOrigin = task.meetingId || task.description?.includes('📌 Origen:');

        return (
          <List.Item
            onClick={() => onTaskClick(task)}
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            style={{
              padding: '16px 20px',
              borderLeft: isOverdue ? '4px solid #ff4d4f' : '4px solid transparent',
              backgroundColor: task.status === 'completed' ? '#fafff7' : undefined,
              marginBottom: 8,
              borderRadius: 8,
              border: '1px solid #f0f0f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
            actions={[
              <Button
                key="view"
                type="text"
                icon={<RightOutlined />}
                style={{ color: '#1890ff' }}
              />,
            ]}
          >
            <List.Item.Meta
              avatar={
                <div style={{ position: 'relative' }}>
                  <Avatar
                    size={44}
                    style={{
                      backgroundColor: status.color === 'gold' ? '#faad14' :
                                       status.color === 'blue' ? '#1890ff' :
                                       status.color === 'green' ? '#52c41a' : '#d9d9d9',
                    }}
                    icon={status.icon}
                  />
                  {isOverdue && (
                    <Badge
                      count={<ExclamationCircleOutlined style={{ color: '#fff', fontSize: 10 }} />}
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        backgroundColor: '#ff4d4f',
                        borderRadius: '50%',
                        padding: 2,
                      }}
                    />
                  )}
                </div>
              }
              title={
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <Text
                    strong
                    style={{
                      fontSize: 15,
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      color: task.status === 'completed' ? '#8c8c8c' : undefined,
                    }}
                  >
                    {task.title}
                  </Text>
                  <Tag color={priority.color} style={{ marginLeft: 0 }}>
                    {priority.label}
                  </Tag>
                  {hasMeetingOrigin && (
                    <Tooltip title="Tarea originada de reunion">
                      <Tag color="purple" icon={<LinkOutlined />}>
                        Reunion
                      </Tag>
                    </Tooltip>
                  )}
                </div>
              }
              description={
                <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 4 }}>
                  {/* Description preview */}
                  {task.description && !task.description.startsWith('📌') && (
                    <Text
                      type="secondary"
                      style={{ fontSize: 13 }}
                      ellipsis={{ tooltip: task.description.split('---')[0] }}
                    >
                      {task.description.split('---')[0].substring(0, 120)}
                      {task.description.split('---')[0].length > 120 ? '...' : ''}
                    </Text>
                  )}

                  {/* Meta info row */}
                  <Space size={16} wrap style={{ marginTop: 4 }}>
                    {/* Due date */}
                    {task.dueDate && (
                      <Tooltip title={isOverdue ? 'Tarea vencida' : 'Fecha limite'}>
                        <Space size={4}>
                          <CalendarOutlined style={{ color: isOverdue ? '#ff4d4f' : '#8c8c8c' }} />
                          <Text
                            type={isOverdue ? 'danger' : 'secondary'}
                            style={{ fontSize: 12 }}
                            strong={isOverdue}
                          >
                            {isOverdue && '⚠ '}
                            {dayjs(task.dueDate).format('DD MMM YYYY')}
                          </Text>
                        </Space>
                      </Tooltip>
                    )}

                    {/* Assignees */}
                    {task.assignments && task.assignments.length > 0 && (
                      <Tooltip
                        title={
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Asignados:</div>
                            {task.assignments.map(a => (
                              <div key={a.id}>
                                {getUserName(a.assignedTo)}
                                {a.accepted ? ' ✓' : ' (pendiente)'}
                              </div>
                            ))}
                          </div>
                        }
                      >
                        <Space size={4}>
                          <Avatar.Group
                            maxCount={4}
                            size="small"
                            maxStyle={{ backgroundColor: '#1890ff', fontSize: 10 }}
                          >
                            {task.assignments.map(assignment => (
                              <Avatar
                                key={assignment.id}
                                size="small"
                                src={assignment.assignedTo.profile?.avatarUrl}
                                style={{
                                  backgroundColor: assignment.accepted ? '#52c41a' : '#faad14',
                                  fontSize: 10,
                                }}
                              >
                                {getInitials(assignment.assignedTo)}
                              </Avatar>
                            ))}
                          </Avatar.Group>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {task.assignments.length} asignado{task.assignments.length !== 1 ? 's' : ''}
                          </Text>
                        </Space>
                      </Tooltip>
                    )}

                    {/* Creator */}
                    {showCreator && task.createdBy && (
                      <Tooltip title={`Creado por ${getUserName(task.createdBy)}`}>
                        <Space size={4}>
                          <Avatar
                            size="small"
                            src={task.createdBy.profile?.avatarUrl}
                            style={{ backgroundColor: '#1890ff', fontSize: 10 }}
                          >
                            {getInitials(task.createdBy)}
                          </Avatar>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {getUserName(task.createdBy)}
                          </Text>
                        </Space>
                      </Tooltip>
                    )}

                    {/* Comments */}
                    {task.comments && task.comments.length > 0 && (
                      <Space size={4}>
                        <MessageOutlined style={{ color: '#8c8c8c' }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {task.comments.length}
                        </Text>
                      </Space>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <Space size={4} wrap>
                        {task.tags.slice(0, 3).map(tag => (
                          <Tag key={tag.id} color={tag.color || 'default'} style={{ fontSize: 11, margin: 0 }}>
                            {tag.name}
                          </Tag>
                        ))}
                        {task.tags.length > 3 && (
                          <Tag style={{ fontSize: 11, margin: 0 }}>+{task.tags.length - 3}</Tag>
                        )}
                      </Space>
                    )}
                  </Space>
                </Space>
              }
            />
          </List.Item>
        );
      }}
    />
  );
};

export default StaffTaskList;
