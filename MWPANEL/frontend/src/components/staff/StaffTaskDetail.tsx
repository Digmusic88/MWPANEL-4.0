/**
 * @archivo: StaffTaskDetail.tsx
 * @modulo: Staff (Claustro)
 * @funcion: Drawer de detalle de tarea del claustro
 */

import React, { useState } from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Avatar,
  Space,
  Button,
  Divider,
  Timeline,
  List,
  Input,
  Typography,
  Popconfirm,
  Select,
  Tooltip,
  Empty,
} from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  TagsOutlined,
  HistoryOutlined,
  CommentOutlined,
  PaperClipOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { StaffTaskStatusBadge, StaffTaskPriorityBadge } from './StaffTaskStatusBadge';
import {
  useStaffTask,
  useUpdateStaffTaskStatus,
  useAcceptStaffTask,
  useDeleteStaffTask,
  useAddStaffTaskComment,
} from '@/hooks/useStaffTasks';
import type { StaffTask, StaffTaskStatus, StaffTaskHistoryAction } from '@/types/staff';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.locale('es');

// Helper para parsear fechas del servidor (vienen en UTC sin indicador de timezone)
const parseServerDate = (date: string | Date) => {
  return dayjs.utc(date).local();
};

const { Text, Paragraph, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface StaffTaskDetailProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (task: StaffTask) => void;
  currentUserId: string;
}

const historyActionLabels: Record<StaffTaskHistoryAction, string> = {
  created: 'creó la tarea',
  status_changed: 'cambió el estado',
  assigned: 'asignó a un usuario',
  unassigned: 'eliminó la asignación',
  accepted: 'aceptó la tarea',
  priority_changed: 'cambió la prioridad',
  due_date_changed: 'cambió la fecha límite',
  comment_added: 'agregó un comentario',
  attachment_added: 'agregó un archivo',
  attachment_removed: 'eliminó un archivo',
  title_changed: 'cambió el título',
  description_changed: 'cambió la descripción',
  tags_changed: 'cambió las etiquetas',
  meeting_linked: 'vinculó a una reunión',
  meeting_unlinked: 'desvinculó de la reunión',
};

export const StaffTaskDetail: React.FC<StaffTaskDetailProps> = ({
  taskId,
  open,
  onClose,
  onEdit,
  currentUserId,
}) => {
  const { data: task, isLoading } = useStaffTask(taskId || undefined);
  const updateStatus = useUpdateStaffTaskStatus();
  const acceptTask = useAcceptStaffTask();
  const deleteTask = useDeleteStaffTask();
  const addComment = useAddStaffTaskComment();

  const [comment, setComment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StaffTaskStatus | undefined>();

  const getUserName = (user: { profile?: { firstName?: string; lastName?: string }; email: string }) => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  const isAssigned = task?.assignments?.some(a => a.assignedToId === currentUserId);
  const isCreator = task?.createdById === currentUserId;
  const myAssignment = task?.assignments?.find(a => a.assignedToId === currentUserId);

  const handleStatusChange = (status: StaffTaskStatus) => {
    if (!taskId) return;
    updateStatus.mutate({ id: taskId, status });
  };

  const handleAccept = () => {
    if (!taskId) return;
    acceptTask.mutate(taskId);
  };

  const handleDelete = () => {
    if (!taskId) return;
    deleteTask.mutate(taskId, {
      onSuccess: () => onClose(),
    });
  };

  const handleAddComment = () => {
    if (!taskId || !comment.trim()) return;
    addComment.mutate(
      { taskId, data: { content: comment } },
      { onSuccess: () => setComment('') }
    );
  };

  if (!task && !isLoading) {
    return null;
  }

  return (
    <Drawer
      title={
        <Space>
          <span>Detalle de Tarea</span>
          {task && <StaffTaskStatusBadge status={task.status} />}
        </Space>
      }
      placement="right"
      width={600}
      open={open}
      onClose={onClose}
      loading={isLoading}
      extra={
        task && (
          <Space>
            {onEdit && (isCreator || isAssigned) && (
              <Button icon={<EditOutlined />} onClick={() => onEdit(task)}>
                Editar
              </Button>
            )}
            {isCreator && (
              <Popconfirm
                title="Eliminar tarea"
                description="Esta accion no se puede deshacer"
                onConfirm={handleDelete}
                okText="Eliminar"
                cancelText="Cancelar"
              >
                <Button danger icon={<DeleteOutlined />}>
                  Eliminar
                </Button>
              </Popconfirm>
            )}
          </Space>
        )
      }
    >
      {task && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Title and Description */}
          <div>
            <Title level={4} style={{ marginBottom: 8 }}>
              {task.title}
            </Title>
            {task.description && (
              <Paragraph type="secondary">{task.description}</Paragraph>
            )}
          </div>

          {/* Status Change */}
          {(isAssigned || isCreator) && (
            <div>
              <Text strong>Cambiar estado:</Text>
              <Select
                value={task.status}
                onChange={handleStatusChange}
                style={{ width: 200, marginLeft: 12 }}
                loading={updateStatus.isPending}
              >
                <Option value="pending">Pendiente</Option>
                <Option value="in_progress">En progreso</Option>
                <Option value="completed">Completada</Option>
              </Select>
            </div>
          )}

          {/* Accept Task Button */}
          {isAssigned && myAssignment && !myAssignment.accepted && (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleAccept}
              loading={acceptTask.isPending}
            >
              Aceptar tarea
            </Button>
          )}

          <Divider style={{ margin: '12px 0' }} />

          {/* Details */}
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Prioridad">
              <StaffTaskPriorityBadge priority={task.priority} />
            </Descriptions.Item>
            {task.dueDate && (
              <Descriptions.Item label="Fecha limite">
                <Space>
                  <CalendarOutlined />
                  {dayjs(task.dueDate).format('DD/MM/YYYY')}
                </Space>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Creado por">
              <Space>
                <Avatar size="small" icon={<UserOutlined />} />
                {getUserName(task.createdBy)}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Creado">
              {parseServerDate(task.createdAt).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            {task.meeting && (
              <Descriptions.Item label="Reunion">
                {task.meeting.title}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <Text strong>
                <TagsOutlined /> Etiquetas:
              </Text>
              <div style={{ marginTop: 8 }}>
                {task.tags.map(tag => (
                  <Tag key={tag.id} color={tag.color || 'default'}>
                    {tag.name}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* Assignees */}
          <div>
            <Text strong>
              <UserOutlined /> Asignados:
            </Text>
            {task.assignments && task.assignments.length > 0 ? (
              <List
                size="small"
                dataSource={task.assignments}
                renderItem={assignment => (
                  <List.Item>
                    <Space>
                      <Avatar size="small" icon={<UserOutlined />} />
                      <Text>{getUserName(assignment.assignedTo)}</Text>
                      {assignment.accepted ? (
                        <Tag color="green" icon={<CheckOutlined />}>
                          Aceptada
                        </Tag>
                      ) : (
                        <Tag color="gold">Pendiente</Tag>
                      )}
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary"> Sin asignar</Text>
            )}
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* Comments */}
          <div>
            <Text strong>
              <CommentOutlined /> Comentarios ({task.comments?.length || 0}):
            </Text>
            {task.comments && task.comments.length > 0 ? (
              <List
                size="small"
                dataSource={task.comments}
                renderItem={comment => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar size="small" icon={<UserOutlined />} />}
                      title={
                        <Space>
                          <Text strong>{getUserName(comment.author)}</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {parseServerDate(comment.createdAt).fromNow()}
                          </Text>
                        </Space>
                      }
                      description={comment.content}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Sin comentarios" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}

            {/* Add Comment */}
            {(isAssigned || isCreator) && (
              <div style={{ marginTop: 12 }}>
                <TextArea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Escribe un comentario..."
                  rows={2}
                  maxLength={5000}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleAddComment}
                  loading={addComment.isPending}
                  disabled={!comment.trim()}
                  style={{ marginTop: 8 }}
                >
                  Enviar
                </Button>
              </div>
            )}
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* History */}
          <div>
            <Text strong>
              <HistoryOutlined /> Historial:
            </Text>
            {task.history && task.history.length > 0 ? (
              <Timeline
                style={{ marginTop: 12 }}
                items={task.history.map(entry => ({
                  children: (
                    <div>
                      <Text strong>{getUserName(entry.changedBy)}</Text>{' '}
                      <Text>{historyActionLabels[entry.action]}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {parseServerDate(entry.createdAt).format('DD/MM/YYYY HH:mm')}
                      </Text>
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description="Sin historial" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </Space>
      )}
    </Drawer>
  );
};

export default StaffTaskDetail;
