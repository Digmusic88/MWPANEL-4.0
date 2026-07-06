import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  Upload,
  message,
  Tooltip,
  Badge,
  Empty,
  Spin,
  Alert,
  notification,
} from 'antd';
import {
  BookOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  SendOutlined,
  PaperClipOutlined,
  CloseOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  BellOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import apiClient from '@services/apiClient';
import { Task, SubmitTaskDto } from '@/types/tasks';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface PendingTask extends Task {
  isViewed?: boolean;
  daysUntilDue: number;
  isOverdue: boolean;
}

interface PendingTasksWidgetProps {
  className?: string;
  maxItems?: number;
}

const PendingTasksWidget: React.FC<PendingTasksWidgetProps> = ({ 
  className = '',
  maxItems = 5 
}) => {
  const queryClient = useQueryClient();
  const [submissionModal, setSubmissionModal] = useState<{
    visible: boolean;
    task: PendingTask | null;
  }>({ visible: false, task: null });
  const [form] = Form.useForm();
  const [lastTaskCount, setLastTaskCount] = useState(0);

  // React Query para obtener tareas pendientes con auto-refresh
  const { 
    data: rawTasks = [], 
    isLoading, 
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['pendingTasks'],
    queryFn: async () => {
      console.log('🔵 FRONTEND - Making API call to pending widget endpoint');
      console.log('🔵 FRONTEND - Current URL: /tasks/student/pending-widget');
      const response = await apiClient.get('/tasks/student/pending-widget');
      console.log('🔵 FRONTEND - Response received:', response.data);
      console.log('🔵 FRONTEND - Response length:', response.data?.length || 0);
      return response.data || [];
    },
    refetchInterval: 5 * 60 * 1000, // Auto-refresh cada 5 minutos
    refetchIntervalInBackground: true,
    staleTime: 2 * 60 * 1000, // Considerar datos stale después de 2 minutos
    cacheTime: 10 * 60 * 1000, // Mantener en cache por 10 minutos
  });

  // Procesar tareas para agregar información de estado
  const tasks = React.useMemo(() => {
    const processedTasks = rawTasks.map((task: Task) => {
      const now = dayjs();
      const dueDate = dayjs(task.dueDate);
      const daysUntilDue = dueDate.diff(now, 'days');
      const isOverdue = now.isAfter(dueDate);
      
      return {
        ...task,
        daysUntilDue,
        isOverdue,
        isViewed: localStorage.getItem(`task-viewed-${task.id}`) === 'true',
      };
    });

    // Filtrar tareas no vistas y limitar cantidad
    return processedTasks
      .filter((task: PendingTask) => !task.isViewed)
      .slice(0, maxItems);
  }, [rawTasks, maxItems]);

  // Detectar nuevas tareas y mostrar notificación
  useEffect(() => {
    if (tasks.length > lastTaskCount && lastTaskCount > 0) {
      const newTasksCount = tasks.length - lastTaskCount;
      notification.info({
        message: '¡Nuevas tareas pendientes!',
        description: `Tienes ${newTasksCount} nueva${newTasksCount > 1 ? 's' : ''} tarea${newTasksCount > 1 ? 's' : ''} por entregar`,
        icon: <BellOutlined style={{ color: '#1890ff' }} />,
        placement: 'topRight',
        duration: 4,
      });
    }
    setLastTaskCount(tasks.length);
  }, [tasks.length, lastTaskCount]);

  // Mutation para entregar tarea
  const submitTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: SubmitTaskDto }) => {
      return await apiClient.post(`/tasks/${taskId}/submit`, data);
    },
    onSuccess: () => {
      message.success('Tarea entregada exitosamente');
      closeSubmissionModal();
      // Invalidar cache para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['pendingTasks'] });
    },
    onError: (error: any) => {
      console.error('Error submitting task:', error);
      message.error('Error al entregar la tarea: ' + (error.response?.data?.message || 'Error desconocido'));
    },
  });

  const markAsViewed = (taskId: string) => {
    localStorage.setItem(`task-viewed-${taskId}`, 'true');
    // Invalidar cache para actualizar la vista
    queryClient.invalidateQueries({ queryKey: ['pendingTasks'] });
    message.success('Tarea marcada como vista');
  };

  const openSubmissionModal = (task: PendingTask) => {
    setSubmissionModal({ visible: true, task });
    form.resetFields();
  };

  const closeSubmissionModal = () => {
    setSubmissionModal({ visible: false, task: null });
    form.resetFields();
  };

  const handleSubmitTask = async (values: any) => {
    if (!submissionModal.task) return;
      
    const submitData: SubmitTaskDto = {
      content: values.content || '',
      comments: values.comments || '',
    };

    submitTaskMutation.mutate({ 
      taskId: submissionModal.task.id, 
      data: submitData 
    });
  };

  const handleRefresh = () => {
    refetch();
    message.info('Actualizando tareas...');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '#ff4d4f';
      case 'MEDIUM': return '#faad14';
      case 'LOW': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  const getUrgencyColor = (task: PendingTask) => {
    if (task.isOverdue) return '#ff4d4f';
    if (task.daysUntilDue <= 1) return '#faad14';
    if (task.daysUntilDue <= 3) return '#1890ff';
    return '#52c41a';
  };

  const getUrgencyText = (task: PendingTask) => {
    if (task.isOverdue) return 'Atrasada';
    if (task.daysUntilDue === 0) return 'Vence hoy';
    if (task.daysUntilDue === 1) return 'Vence mañana';
    return `${task.daysUntilDue} días`;
  };

  // Estados de error y carga
  if (error) {
    return (
      <Card className={className}>
        <Alert
          message="Error al cargar tareas"
          description="No se pudieron cargar las tareas pendientes. Intenta nuevamente."
          type="error"
          showIcon
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={className}>
          <div className="text-center py-4">
            <Spin size="large" />
            <div className="mt-2">Cargando tareas pendientes...</div>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className={className}
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOutlined style={{ color: '#52c41a' }} />
                <span>Tareas Pendientes</span>
                <Badge count={0} style={{ backgroundColor: '#52c41a' }} />
              </div>
              <div className="flex items-center gap-2">
                {isFetching && <Spin size="small" />}
                <Tooltip title="Actualizar">
                  <Button 
                    type="text" 
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    loading={isFetching}
                  />
                </Tooltip>
              </div>
            </div>
          }
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="¡Excelente! No tienes tareas pendientes"
          />
        </Card>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
      >
        <Card 
          className={className}
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOutlined style={{ color: '#1890ff' }} />
                <span>Tareas Pendientes</span>
                <Badge 
                  count={tasks.length} 
                  style={{ backgroundColor: tasks.some(t => t.isOverdue) ? '#ff4d4f' : '#1890ff' }} 
                />
              </div>
              <div className="flex items-center gap-2">
                {isFetching && <Spin size="small" />}
                <Tooltip title="Auto-actualización cada 5 min">
                  <Text className="text-xs text-gray-500">
                    🔄 Auto
                  </Text>
                </Tooltip>
                <Tooltip title="Actualizar ahora">
                  <Button 
                    type="text" 
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    loading={isFetching}
                  />
                </Tooltip>
              </div>
            </div>
          }
          size="small"
        >
          <List
            dataSource={tasks}
            renderItem={(task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <List.Item
                  className="border-b border-gray-100 last:border-b-0 py-3 hover:bg-gray-50 transition-colors"
                  actions={[
                    <Tooltip title="Marcar como vista">
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => markAsViewed(task.id)}
                        className="text-gray-500 hover:text-blue-500"
                      />
                    </Tooltip>,
                    // Solo mostrar botón de entregar si NO es Test Yourself (exam)
                    task.taskType !== 'exam' ? (
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        size="small"
                        onClick={() => openSubmissionModal(task)}
                        className={task.isOverdue ? 'bg-red-500 border-red-500' : ''}
                      >
                        Entregar
                      </Button>
                    ) : (
                      <Button
                        type="default"
                        icon={<CalendarOutlined />}
                        size="small"
                        disabled
                        className="text-blue-600 border-blue-300"
                      >
                        Recordatorio
                      </Button>
                    ),
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div className="flex items-center gap-2 flex-wrap">
                        <Text strong className="text-sm">{task.title}</Text>
                        <Tag color={getPriorityColor(task.priority)} className="text-xs">
                          {task.priority}
                        </Tag>
                        <Tag 
                          color={getUrgencyColor(task)} 
                          icon={<ClockCircleOutlined />}
                          className="text-xs"
                        >
                          {getUrgencyText(task)}
                        </Tag>
                      </div>
                    }
                    description={
                      <div className="space-y-1">
                        <div className="text-xs text-gray-600">
                          {task.subjectAssignment?.subject?.name || 'Asignatura'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {task.taskType === 'exam' ? 'Fecha del Test Yourself' : 'Entrega'}: {dayjs(task.dueDate).format('DD/MM/YYYY HH:mm')}
                        </div>
                        {task.taskType === 'exam' && (
                          <Alert
                            message="📝 Recordatorio de Test Yourself"
                            description="Este es un recordatorio. No requiere entrega digital."
                            type="info"
                            showIcon
                            className="text-xs mt-2"
                          />
                        )}
                        {task.isOverdue && task.taskType !== 'exam' && (
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Alert
                              message="Tarea atrasada"
                              type="error"
                              showIcon
                              className="text-xs"
                            />
                          </motion.div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              </motion.div>
            )}
          />
        </Card>
      </motion.div>

      {/* Modal de entrega de tarea */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <SendOutlined />
            <span>Entregar Tarea: {submissionModal.task?.title}</span>
          </div>
        }
        open={submissionModal.visible}
        onCancel={closeSubmissionModal}
        footer={[
          <Button key="cancel" onClick={closeSubmissionModal} disabled={submitTaskMutation.isPending}>
            Cancelar
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<CheckOutlined />}
            loading={submitTaskMutation.isPending}
            onClick={() => form.submit()}
          >
            Entregar Tarea
          </Button>,
        ]}
        width={600}
      >
        {submissionModal.task && (
          <div className="space-y-4">
            {/* Información de la tarea */}
            <div className="bg-gray-50 p-3 rounded">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <Text strong>Asignatura:</Text>
                  <div>{submissionModal.task.subjectAssignment?.subject?.name}</div>
                </div>
                <div>
                  <Text strong>Fecha límite:</Text>
                  <div className={submissionModal.task.isOverdue ? 'text-red-500' : ''}>
                    {dayjs(submissionModal.task.dueDate).format('DD/MM/YYYY HH:mm')}
                  </div>
                </div>
                <div className="col-span-2">
                  <Text strong>Descripción:</Text>
                  <div>{submissionModal.task.description || 'Sin descripción'}</div>
                </div>
              </div>
            </div>

            {/* Formulario de entrega */}
            <Form
              form={form}
              onFinish={handleSubmitTask}
              layout="vertical"
            >
              <Form.Item
                name="content"
                label="Contenido de la entrega"
                rules={[
                  { required: true, message: 'Por favor, escribe el contenido de tu entrega' }
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="Escribe aquí tu respuesta o entrega..."
                />
              </Form.Item>

              <Form.Item
                name="comments"
                label="Comentarios adicionales (opcional)"
              >
                <TextArea
                  rows={2}
                  placeholder="Comentarios o notas adicionales..."
                />
              </Form.Item>

              {submissionModal.task.isOverdue && (
                <Alert
                  message="Entrega tardía"
                  description="Esta tarea está fuera de plazo. Puede aplicarse una penalización en la calificación."
                  type="warning"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                />
              )}
            </Form>
          </div>
        )}
      </Modal>
    </AnimatePresence>
  );
};

export default PendingTasksWidget;