/**
 * @archivo: StaffMeetingDetail.tsx
 * @modulo: Staff (Claustro)
 * @funcion: Drawer de detalle de reunion del claustro con gestion de agenda y tareas
 */

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Avatar,
  Space,
  Button,
  Divider,
  List,
  Input,
  Typography,
  Popconfirm,
  Select,
  Tooltip,
  Empty,
  Checkbox,
  message,
  Alert,
  Card,
  Progress,
  Form,
  Modal,
  DatePicker,
  InputNumber,
  Badge,
  Steps,
} from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  TeamOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  SaveOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  CloseOutlined,
  SendOutlined,
  FlagOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import type { StaffMeeting, StaffMeetingStatus, StaffMeetingAgendaItem, CreateStaffTaskDto, StaffTaskPriority } from '@/types/staff';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';
import {
  useStaffMeeting,
  useUpdateStaffMeetingStatus,
  useUpdateStaffMeetingNotes,
  useDeleteStaffMeeting,
  useUpdateAgendaItem,
  useDeleteAgendaItem,
  useAddAgendaItem,
  useReorderAgendaItems,
} from '@/hooks/useStaffMeetings';
import { useCreateStaffTask } from '@/hooks/useStaffTasks';
import { useStaffUsers } from '@/hooks/useStaffDashboard';
import { StaffTaskCard } from './StaffTaskCard';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/es';
import { getMeetingLiveState, getLiveStatePresentation, getMeetingCountdownText, allAgendaItemsCompleted } from '@/utils/staffMeetingUtils';
import { useNow } from '@/hooks/useNow';
import { AgendaTimeline } from './AgendaTimeline';
import { useAuth } from '@/hooks/useAuth';

dayjs.extend(utc);
dayjs.locale('es');

// Helper para parsear fechas del servidor (vienen en UTC sin indicador de timezone)
const parseServerDate = (date: string | Date) => {
  return dayjs.utc(date).local();
};

const { Text, Paragraph, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface StaffMeetingDetailProps {
  meetingId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (meeting: StaffMeeting) => void;
  currentUserId: string;
}

// La presentación del estado ahora se deriva del estado en vivo (getLiveStatePresentation).

const priorityConfig: Record<StaffTaskPriority, { color: string; label: string }> = {
  low: { color: 'green', label: 'Baja' },
  medium: { color: 'orange', label: 'Media' },
  high: { color: 'red', label: 'Alta' },
};

const SortableAgendaItem: React.FC<{ id: string; disabled?: boolean; children: React.ReactNode }> = ({
  id,
  disabled,
  children,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', paddingTop: 12, color: '#bfbfbf', touchAction: 'none' }}
          title="Arrastrar para reordenar"
        >
          <HolderOutlined />
        </div>
      )}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};

export const StaffMeetingDetail: React.FC<StaffMeetingDetailProps> = ({
  meetingId,
  open,
  onClose,
  onEdit,
  currentUserId,
}) => {
  const { data: meeting, isLoading, refetch } = useStaffMeeting(meetingId || undefined);
  const updateStatus = useUpdateStaffMeetingStatus();
  const updateNotes = useUpdateStaffMeetingNotes();
  const deleteMeeting = useDeleteStaffMeeting();
  const updateAgendaItem = useUpdateAgendaItem();
  const deleteAgendaItem = useDeleteAgendaItem();
  const addAgendaItem = useAddAgendaItem();
  const reorderAgenda = useReorderAgendaItems();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleAgendaDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !meetingId || !meeting?.agendaItems) return;
    const items = [...meeting.agendaItems].sort((a, b) => a.orderIndex - b.orderIndex);
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const orderedIds = arrayMove(items, oldIndex, newIndex).map((i) => i.id);
    reorderAgenda.mutate({ meetingId, orderedIds }, { onSuccess: () => refetch() });
  };

  const createTask = useCreateStaffTask();
  const { data: staffUsers } = useStaffUsers();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Estado para añadir nuevo punto
  const [isAddingAgendaItem, setIsAddingAgendaItem] = useState(false);
  const [newAgendaForm] = Form.useForm();

  // Estado para editar punto existente
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [editAgendaForm] = Form.useForm();

  // Estado para modal de crear tarea
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [selectedAgendaForTask, setSelectedAgendaForTask] = useState<StaffMeetingAgendaItem | null>(null);
  const [taskForm] = Form.useForm();

  useEffect(() => {
    if (meeting?.notes) {
      setNotes(meeting.notes);
    }
  }, [meeting?.notes]);

  const getUserName = (user: { profile?: { firstName?: string; lastName?: string }; email: string }) => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  const isCreator = meeting?.createdById === currentUserId;
  const isAttendee = meeting?.attendees?.some(a => a.id === currentUserId);
  const canEditAgenda = isCreator || isAttendee;
  const isActiveStatus = meeting?.status === 'scheduled' || meeting?.status === 'in_progress';
  const isArchivedStatus = meeting?.status === 'completed' || meeting?.status === 'cancelled';
  const canClose = isActiveStatus && (isCreator || isAdmin);
  const readyToClose = isActiveStatus && allAgendaItemsCompleted(meeting?.agendaItems);
  const now = useNow();
  const liveState = meeting ? getMeetingLiveState(meeting, now) : 'scheduled';
  const presentation = getLiveStatePresentation(liveState);
  const countdownText = meeting ? getMeetingCountdownText(meeting, now) : '';
  const lifecycleStep = liveState === 'scheduled' ? 0
    : liveState === 'in_progress' ? 1
    : liveState === 'pending_close' ? 1
    : 2; // completed / cancelled

  const handleCloseMeeting = () => {
    if (!meetingId) return;
    updateStatus.mutate(
      { id: meetingId, status: 'completed' },
      { onSuccess: () => { message.success('Reunión cerrada y archivada'); refetch(); } },
    );
  };

  const handleReopenMeeting = () => {
    if (!meetingId) return;
    updateStatus.mutate(
      { id: meetingId, status: 'scheduled' },
      { onSuccess: () => { message.success('Reunión reabierta'); refetch(); } },
    );
  };

  const handleCancelMeeting = () => {
    if (!meetingId) return;
    updateStatus.mutate(
      { id: meetingId, status: 'cancelled' },
      { onSuccess: () => { message.success('Reunión cancelada'); refetch(); } },
    );
  };

  const handleSaveNotes = () => {
    if (!meetingId) return;
    updateNotes.mutate(
      { id: meetingId, notes },
      {
        onSuccess: () => {
          message.success('Actas guardadas');
          setIsEditingNotes(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!meetingId) return;
    deleteMeeting.mutate(meetingId, {
      onSuccess: () => onClose(),
    });
  };

  const handleToggleAgendaItem = (agendaId: string, currentCompleted: boolean) => {
    if (!meetingId) return;
    updateAgendaItem.mutate(
      {
        meetingId,
        agendaId,
        data: { isCompleted: !currentCompleted },
      },
      {
        onSuccess: () => refetch(),
      }
    );
  };

  const handleDeleteAgendaItem = (agendaId: string) => {
    if (!meetingId) return;
    deleteAgendaItem.mutate(
      { meetingId, agendaId },
      {
        onSuccess: () => refetch(),
      }
    );
  };

  // Añadir nuevo punto de agenda
  const handleAddAgendaItem = async (values: any) => {
    if (!meetingId) return;
    try {
      await addAgendaItem.mutateAsync({
        meetingId,
        data: {
          title: values.title,
          description: values.description,
          durationMinutes: values.durationMinutes,
        },
      });
      newAgendaForm.resetFields();
      setIsAddingAgendaItem(false);
      refetch();
    } catch (error) {
      // Error handled by hook
    }
  };

  // Editar punto de agenda existente
  const handleStartEditAgenda = (item: StaffMeetingAgendaItem) => {
    setEditingAgendaId(item.id);
    editAgendaForm.setFieldsValue({
      title: item.title,
      description: item.description,
      durationMinutes: item.durationMinutes,
    });
  };

  const handleSaveEditAgenda = async (agendaId: string) => {
    if (!meetingId) return;
    try {
      const values = await editAgendaForm.validateFields();
      await updateAgendaItem.mutateAsync({
        meetingId,
        agendaId,
        data: {
          title: values.title,
          description: values.description,
          durationMinutes: values.durationMinutes,
        },
      });
      setEditingAgendaId(null);
      editAgendaForm.resetFields();
      refetch();
      message.success('Punto actualizado');
    } catch (error) {
      // Validation error or API error
    }
  };

  const handleCancelEditAgenda = () => {
    setEditingAgendaId(null);
    editAgendaForm.resetFields();
  };

  // Abrir modal para crear tarea desde un punto de agenda
  const handleOpenTaskModal = (agendaItem: StaffMeetingAgendaItem) => {
    setSelectedAgendaForTask(agendaItem);
    taskForm.setFieldsValue({
      title: '', // Titulo vacio para que el usuario escriba su propio titulo
      description: '', // Descripcion vacia, la referencia se añade automaticamente
      priority: 'medium',
      dueDate: null,
      assignedToIds: [],
    });
    setIsTaskModalVisible(true);
  };

  // Crear tarea desde punto de agenda
  const handleCreateTask = async (values: any) => {
    if (!meetingId || !selectedAgendaForTask) return;
    try {
      // Construir descripcion con referencia al punto de agenda
      const agendaReference = `📌 Origen: Punto de agenda "${selectedAgendaForTask.title}"${selectedAgendaForTask.description ? `\n   ${selectedAgendaForTask.description}` : ''}`;
      const meetingReference = `📅 Reunion: ${meeting?.title || 'Sin titulo'}`;
      const fullDescription = values.description
        ? `${values.description}\n\n---\n${agendaReference}\n${meetingReference}`
        : `${agendaReference}\n${meetingReference}`;

      const taskData: CreateStaffTaskDto = {
        title: values.title,
        description: fullDescription,
        priority: values.priority,
        dueDate: values.dueDate?.toISOString(),
        meetingId: meetingId,
        assignedToIds: values.assignedToIds,
      };
      await createTask.mutateAsync(taskData);
      setIsTaskModalVisible(false);
      setSelectedAgendaForTask(null);
      taskForm.resetFields();
      refetch();
    } catch (error) {
      // Error handled by hook
    }
  };

  const completedAgendaItems = meeting?.agendaItems?.filter(item => item.isCompleted).length || 0;
  const totalAgendaItems = meeting?.agendaItems?.length || 0;
  const agendaProgress = totalAgendaItems > 0 ? Math.round((completedAgendaItems / totalAgendaItems) * 100) : 0;

  const totalDuration = meeting?.agendaItems?.reduce((acc, item) => acc + (item.durationMinutes || 0), 0) || 0;

  if (!meeting && !isLoading) {
    return null;
  }

  return (
    <>
      <Drawer
        title={
          <Space>
            <span>Detalle de Reunion</span>
            {meeting && <Tag color={presentation.tagColor}>{presentation.label}</Tag>}
          </Space>
        }
        placement="right"
        width={750}
        open={open}
        onClose={onClose}
        loading={isLoading}
        extra={
          meeting && (
            <Space>
              {onEdit && isCreator && (
                <Button icon={<EditOutlined />} onClick={() => onEdit(meeting)}>
                  Editar
                </Button>
              )}
              {isCreator && (
                <Popconfirm
                  title="Eliminar reunion"
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
        {meeting && (
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: '#fff',
              padding: '8px 0 12px',
              borderBottom: '1px solid #f0f0f0',
              marginBottom: 12,
            }}
          >
            <Space align="center" wrap>
              <Badge status={presentation.badgeStatus} />
              <Text strong style={{ color: presentation.accentColor }}>{presentation.label}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>· {countdownText}</Text>
            </Space>
            <Steps
              size="small"
              current={lifecycleStep}
              status={liveState === 'cancelled' ? 'error' : 'process'}
              style={{ marginTop: 8 }}
              items={[
                { title: 'Programada' },
                { title: liveState === 'pending_close' ? 'Pendiente de cierre' : 'En curso' },
                { title: liveState === 'cancelled' ? 'Cancelada' : 'Cerrada' },
              ]}
            />
          </div>
        )}
        {meeting && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Title and Description */}
            <div>
              <Title level={4} style={{ marginBottom: 8 }}>
                {meeting.title}
              </Title>
              {meeting.description && (
                <Paragraph type="secondary">{meeting.description}</Paragraph>
              )}
            </div>

            {/* Banner: lista para cerrar */}
            {readyToClose && (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message="Todos los puntos del orden del día están completados"
                description="Puedes cerrar la reunión para archivarla."
                action={
                  canClose && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={handleCloseMeeting}
                      loading={updateStatus.isPending}
                    >
                      Cerrar reunión
                    </Button>
                  )
                }
              />
            )}

            {/* Acciones de ciclo de vida */}
            <Space wrap>
              {canClose && !readyToClose && (
                <Button
                  icon={<CheckCircleOutlined />}
                  onClick={handleCloseMeeting}
                  loading={updateStatus.isPending}
                >
                  Cerrar reunión
                </Button>
              )}
              {isArchivedStatus && isAdmin && (
                <Button
                  icon={<RollbackOutlined />}
                  onClick={handleReopenMeeting}
                  loading={updateStatus.isPending}
                >
                  Reabrir
                </Button>
              )}
            </Space>

            {/* Cancelar la reunión (programada/en curso ahora son automáticos) */}
            {canClose && (
              <Popconfirm
                title="Cancelar reunión"
                description="Se marcará como cancelada y se archivará."
                onConfirm={handleCancelMeeting}
                okText="Cancelar reunión"
                cancelText="Volver"
              >
                <Button danger icon={<CloseOutlined />} loading={updateStatus.isPending}>
                  Cancelar reunión
                </Button>
              </Popconfirm>
            )}

            <Divider style={{ margin: '12px 0' }} />

            {/* Details */}
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Fecha y hora">
                <Space>
                  <CalendarOutlined />
                  {dayjs(meeting.scheduledDate).format('dddd, DD [de] MMMM [de] YYYY [a las] HH:mm')}
                </Space>
              </Descriptions.Item>
              {meeting.location && (
                <Descriptions.Item label="Ubicacion">
                  <Space>
                    <EnvironmentOutlined />
                    {meeting.location}
                  </Space>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Creado por">
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  {getUserName(meeting.createdBy)}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Creado">
                {parseServerDate(meeting.createdAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
              {totalDuration > 0 && (
                <Descriptions.Item label="Duracion estimada">
                  <Space>
                    <ClockCircleOutlined />
                    {totalDuration} minutos
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Attendees */}
            <div>
              <Text strong>
                <TeamOutlined /> Asistentes ({meeting.attendees?.length || 0}):
              </Text>
              {meeting.attendees && meeting.attendees.length > 0 ? (
                <div style={{ marginTop: 8 }}>
                  <Avatar.Group maxCount={8} size="small">
                    {meeting.attendees.map((attendee) => (
                      <Tooltip key={attendee.id} title={getUserName(attendee)}>
                        <Avatar icon={<UserOutlined />} src={attendee.profile?.avatarUrl} />
                      </Tooltip>
                    ))}
                  </Avatar.Group>
                </div>
              ) : (
                <Text type="secondary"> Sin asistentes definidos</Text>
              )}
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Agenda */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text strong>
                  <UnorderedListOutlined /> Agenda ({totalAgendaItems} puntos):
                </Text>
                <Space>
                  {totalAgendaItems > 0 && (
                    <Progress
                      percent={agendaProgress}
                      size="small"
                      style={{ width: 100 }}
                      format={percent => `${completedAgendaItems}/${totalAgendaItems}`}
                    />
                  )}
                  {canEditAgenda && !isAddingAgendaItem && (
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setIsAddingAgendaItem(true)}
                    >
                      Agregar punto
                    </Button>
                  )}
                </Space>
              </div>

              {/* Mini-timeline en vivo del orden del día (solo lectura) */}
              <AgendaTimeline meeting={meeting} now={now} />

              {/* Formulario para añadir nuevo punto */}
              {isAddingAgendaItem && (
                <Card size="small" style={{ marginBottom: 12, backgroundColor: '#f0f5ff' }}>
                  <Form form={newAgendaForm} layout="vertical" onFinish={handleAddAgendaItem}>
                    <Form.Item
                      name="title"
                      label="Titulo del punto"
                      rules={[{ required: true, message: 'El titulo es requerido' }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input placeholder="Titulo del punto del dia" />
                    </Form.Item>
                    <Form.Item name="description" label="Descripcion" style={{ marginBottom: 8 }}>
                      <Input placeholder="Descripcion (opcional)" />
                    </Form.Item>
                    <Form.Item name="durationMinutes" label="Duracion (minutos)" style={{ marginBottom: 8 }}>
                      <InputNumber min={1} max={480} placeholder="Ej: 30" style={{ width: '100%' }} />
                    </Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="small"
                        icon={<CheckOutlined />}
                        loading={addAgendaItem.isPending}
                      >
                        Agregar
                      </Button>
                      <Button
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => {
                          setIsAddingAgendaItem(false);
                          newAgendaForm.resetFields();
                        }}
                      >
                        Cancelar
                      </Button>
                    </Space>
                  </Form>
                </Card>
              )}

              {/* Lista de puntos de agenda */}
              {meeting.agendaItems && meeting.agendaItems.length > 0 ? (() => {
                const renderAgendaCard = (item: StaffMeetingAgendaItem, index: number) => (
                  <Card
                    size="small"
                    style={{
                      marginBottom: 8,
                      backgroundColor: item.isCompleted ? '#f6ffed' : undefined,
                    }}
                  >
                    {editingAgendaId === item.id ? (
                      // Modo edicion
                      <Form form={editAgendaForm} layout="vertical">
                        <Form.Item
                          name="title"
                          rules={[{ required: true, message: 'Titulo requerido' }]}
                          style={{ marginBottom: 8 }}
                        >
                          <Input placeholder="Titulo" />
                        </Form.Item>
                        <Form.Item name="description" style={{ marginBottom: 8 }}>
                          <Input placeholder="Descripcion (opcional)" />
                        </Form.Item>
                        <Form.Item name="durationMinutes" style={{ marginBottom: 8 }}>
                          <InputNumber min={1} max={480} placeholder="Minutos" style={{ width: '100%' }} />
                        </Form.Item>
                        <Space>
                          <Button
                            type="primary"
                            size="small"
                            icon={<SaveOutlined />}
                            onClick={() => handleSaveEditAgenda(item.id)}
                            loading={updateAgendaItem.isPending}
                          >
                            Guardar
                          </Button>
                          <Button size="small" icon={<CloseOutlined />} onClick={handleCancelEditAgenda}>
                            Cancelar
                          </Button>
                        </Space>
                      </Form>
                    ) : (
                      // Modo visualizacion
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Space align="start">
                            <Tooltip title={item.isCompleted ? 'Marcar como pendiente' : 'Marcar como completado'}>
                              <Checkbox
                                checked={item.isCompleted}
                                onChange={() => handleToggleAgendaItem(item.id, item.isCompleted)}
                                disabled={updateAgendaItem.isPending}
                              />
                            </Tooltip>
                            <div>
                              <Text
                                strong
                                style={{
                                  textDecoration: item.isCompleted ? 'line-through' : 'none',
                                  color: item.isCompleted ? '#8c8c8c' : undefined,
                                }}
                              >
                                {index + 1}. {item.title}
                              </Text>
                              {item.description && (
                                <div>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {item.description}
                                  </Text>
                                </div>
                              )}
                            </div>
                          </Space>
                          <Space size="small">
                            {item.durationMinutes && (
                              <Tag icon={<ClockCircleOutlined />}>{item.durationMinutes} min</Tag>
                            )}
                            {item.isCompleted && (
                              <Tag color="green" icon={<CheckOutlined />}>
                                Completado
                              </Tag>
                            )}
                          </Space>
                        </div>

                        {/* Botones de acciones */}
                        {canEditAgenda && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                            <Tooltip title="Crear tarea desde este punto">
                              <Button
                                type="text"
                                size="small"
                                icon={<SendOutlined />}
                                onClick={() => handleOpenTaskModal(item)}
                                style={{ color: '#1890ff' }}
                              >
                                Crear Tarea
                              </Button>
                            </Tooltip>
                            <Tooltip title="Editar punto">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleStartEditAgenda(item)}
                              />
                            </Tooltip>
                            <Popconfirm
                              title="Eliminar punto"
                              description="Esta accion no se puede deshacer"
                              onConfirm={() => handleDeleteAgendaItem(item.id)}
                              okText="Eliminar"
                              cancelText="Cancelar"
                              okButtonProps={{ danger: true }}
                            >
                              <Tooltip title="Eliminar punto">
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  loading={deleteAgendaItem.isPending}
                                />
                              </Tooltip>
                            </Popconfirm>
                          </div>
                        )}

                        {item.notes && (
                          <div style={{ backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px', marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              <FileTextOutlined /> Notas: {item.notes}
                            </Text>
                          </div>
                        )}
                      </Space>
                    )}
                  </Card>
                );

                return (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleAgendaDragEnd}
                  >
                    <SortableContext
                      items={[...meeting.agendaItems].sort((a, b) => a.orderIndex - b.orderIndex).map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {[...meeting.agendaItems]
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((item, index) => (
                          <SortableAgendaItem
                            key={item.id}
                            id={item.id}
                            disabled={!canEditAgenda || editingAgendaId === item.id}
                          >
                            {renderAgendaCard(item, index)}
                          </SortableAgendaItem>
                        ))}
                    </SortableContext>
                  </DndContext>
                );
              })() : (
                <Empty description="Sin puntos del dia" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                  {canEditAgenda && (
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => setIsAddingAgendaItem(true)}
                    >
                      Agregar primer punto
                    </Button>
                  )}
                </Empty>
              )}
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Notes/Actas */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong>
                  <FileTextOutlined /> Actas de la Reunion:
                </Text>
                {(isCreator || isAttendee) && !isEditingNotes && (
                  <Button size="small" icon={<EditOutlined />} onClick={() => setIsEditingNotes(true)}>
                    Editar
                  </Button>
                )}
              </div>
              {isEditingNotes ? (
                <div>
                  <TextArea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Escribe las actas de la reunion..."
                    rows={6}
                    maxLength={10000}
                  />
                  <Space style={{ marginTop: 8 }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSaveNotes}
                      loading={updateNotes.isPending}
                    >
                      Guardar
                    </Button>
                    <Button onClick={() => setIsEditingNotes(false)}>Cancelar</Button>
                  </Space>
                </div>
              ) : meeting.notes ? (
                <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                  <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                    {meeting.notes}
                  </Paragraph>
                </Card>
              ) : (
                <Empty description="Sin actas" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>

            {/* Associated Tasks */}
            {meeting.tasks && meeting.tasks.length > 0 && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <Text strong>
                    <UnorderedListOutlined /> Tareas Asociadas ({meeting.tasks.length}):
                  </Text>
                  <div style={{ marginTop: 12 }}>
                    {meeting.tasks.map(task => (
                      <div key={task.id} style={{ marginBottom: 8 }}>
                        <StaffTaskCard task={task} showCreator={false} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Space>
        )}
      </Drawer>

      {/* Modal para crear tarea desde punto de agenda */}
      <Modal
        title={
          <Space>
            <SendOutlined />
            <span>Crear Tarea desde Punto de Agenda</span>
          </Space>
        }
        open={isTaskModalVisible}
        onCancel={() => {
          setIsTaskModalVisible(false);
          setSelectedAgendaForTask(null);
          taskForm.resetFields();
        }}
        footer={null}
        width={520}
        destroyOnClose
      >
        {/* Referencia al punto de agenda origen */}
        {selectedAgendaForTask && (
          <Card
            size="small"
            style={{
              marginBottom: 16,
              backgroundColor: '#e6f4ff',
              border: '1px solid #91caff',
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UnorderedListOutlined style={{ color: '#1890ff' }} />
                <Text strong style={{ color: '#1890ff' }}>Punto de origen:</Text>
              </div>
              <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                {selectedAgendaForTask.title}
              </Text>
              {selectedAgendaForTask.description && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {selectedAgendaForTask.description}
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: '11px' }}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                Reunion: {meeting?.title}
              </Text>
            </Space>
          </Card>
        )}

        <Form form={taskForm} layout="vertical" onFinish={handleCreateTask}>
          <Form.Item
            name="title"
            label="Titulo de la tarea"
            rules={[{ required: true, message: 'El titulo es requerido' }]}
            extra="Escribe un titulo descriptivo para esta tarea"
          >
            <Input placeholder="Ej: Preparar material para actividad del 15 de marzo" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Descripcion adicional"
            extra="La referencia al punto de agenda se incluira automaticamente"
          >
            <TextArea rows={3} placeholder="Detalles adicionales sobre la tarea (opcional)" />
          </Form.Item>

          <Form.Item
            name="assignedToIds"
            label="Asignar a"
            rules={[{ required: true, message: 'Selecciona al menos un asignado' }]}
          >
            <Select
              mode="multiple"
              placeholder="Seleccionar asignados"
              optionFilterProp="children"
              showSearch
              allowClear
            >
              {staffUsers?.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.profile?.firstName
                    ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
                    : user.email}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="priority" label="Prioridad" style={{ flex: 1 }}>
              <Select placeholder="Seleccionar prioridad">
                <Option value="low">
                  <Tag color="green">Baja</Tag>
                </Option>
                <Option value="medium">
                  <Tag color="orange">Media</Tag>
                </Option>
                <Option value="high">
                  <Tag color="red">Alta</Tag>
                </Option>
              </Select>
            </Form.Item>

            <Form.Item name="dueDate" label="Fecha limite" style={{ flex: 1 }}>
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                placeholder="Fecha limite"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Space>

          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <CheckOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              Esta tarea aparecera en la seccion de <Text strong>Tareas del Claustro</Text> de los asignados,
              con referencia automatica al punto de agenda de origen.
            </Text>
          </Card>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createTask.isPending} icon={<SendOutlined />}>
                Crear Tarea
              </Button>
              <Button
                onClick={() => {
                  setIsTaskModalVisible(false);
                  setSelectedAgendaForTask(null);
                  taskForm.resetFields();
                }}
              >
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default StaffMeetingDetail;
