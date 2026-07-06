/**
 * @archivo: PendingTasksWidget.tsx
 * @módulo: Student Components (Widget de Tareas Pendientes)
 * @función: Widget completo de tareas pendientes con Test Yourself destacados
 * @crítico: SÍ - Widget principal para seguimiento de tareas estudiantiles
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Avatar,
  Tag,
  Typography,
  Badge,
  Space,
  Alert,
  Empty,
  Button,
  Spin,
  message,
  Progress,
} from 'antd';
import {
  FileTextOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  BookOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { safeNavigate } from '@utils/navigationUtils';
import dayjs from 'dayjs';
import apiClient from '@services/apiClient';

const { Text, Title } = Typography;

interface PendingTask {
  id: string;
  title: string;
  dueDate: string;
  taskType: 'assignment' | 'exam' | 'project' | 'presentation';
  status: 'not_submitted' | 'submitted' | 'graded' | 'late';
  maxPoints?: number;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  subjectAssignment: {
    subject: {
      name: string;
      code: string;
    };
  };
  submissions?: Array<{
    submittedAt?: string;
    finalGrade?: number;
    status: string;
  }>;
}

interface PendingTasksWidgetProps {
  className?: string;
  maxItems?: number;
  showHeader?: boolean;
  height?: number;
  style?: React.CSSProperties;
}

const PendingTasksWidget: React.FC<PendingTasksWidgetProps> = ({
  className = '',
  maxItems = 10,
  showHeader = true,
  height = 400,
  style = {},
}) => {
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleaningExpired, setCleaningExpired] = useState(false);
  // Using robust navigation utility - now uses window.location for reliable navigation

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  const fetchPendingTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener todas las tareas del estudiante
      const response = await apiClient.get('/tasks/student/my-tasks?limit=50&sortBy=dueDate&sortOrder=ASC');
      const allTasks = response.data?.tasks || [];

      // Filtrar solo tareas pendientes (no entregadas y no vencidas hace más de 30 días)
      const now = dayjs();
      const thirtyDaysAgo = now.subtract(30, 'day');

      const filtered = allTasks.filter((task: any) => {
        const dueDate = dayjs(task.dueDate);
        const isNotSubmitted = !task.submissions?.[0]?.submittedAt;
        const isNotTooOld = dueDate.isAfter(thirtyDaysAgo);
        const isTestYourself = task.taskType === 'exam';
        
        // Special logic for Test Yourself (exams): 
        // Hide them once the due date has passed (exam is considered completed)
        if (isTestYourself && dueDate.isBefore(now, 'day')) {
          return false; // Hide Test Yourself that are overdue (exam already taken)
        }
        
        return isNotSubmitted && isNotTooOld;
      });

      // Mapear y ordenar por prioridad y fecha
      const mappedTasks: PendingTask[] = filtered.map((task: any) => {
        const dueDate = dayjs(task.dueDate);
        const isOverdue = dueDate.isBefore(now);
        const isTestYourself = task.taskType === 'exam';
        const daysUntilDue = dueDate.diff(now, 'day');

        // Determinar prioridad basada en tipo y proximidad
        let priority: 'low' | 'medium' | 'high' = 'medium';
        if (isTestYourself) {
          priority = daysUntilDue <= 1 ? 'high' : 'medium';
        } else if (isOverdue) {
          priority = 'high';
        } else if (daysUntilDue <= 2) {
          priority = 'medium';
        } else {
          priority = 'low';
        }

        return {
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          taskType: task.taskType,
          status: isOverdue ? 'late' : 'not_submitted',
          maxPoints: task.maxPoints,
          description: task.description,
          priority,
          subjectAssignment: {
            subject: {
              name: task.subjectAssignment?.subject?.name || 'Materia',
              code: task.subjectAssignment?.subject?.code || 'MAT',
            },
          },
          submissions: task.submissions,
        };
      });

      // Ordenar: Test Yourself primero, luego por prioridad, luego por fecha
      mappedTasks.sort((a, b) => {
        // Test Yourself tienen prioridad
        const aIsTest = a.taskType === 'exam';
        const bIsTest = b.taskType === 'exam';
        
        if (aIsTest && !bIsTest) return -1;
        if (!aIsTest && bIsTest) return 1;
        
        // Luego por prioridad
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Finalmente por fecha de vencimiento
        return dayjs(a.dueDate).diff(dayjs(b.dueDate));
      });

      setPendingTasks(mappedTasks.slice(0, maxItems));
    } catch (error: any) {
      console.error('Error fetching pending tasks:', error);
      setError('Error al cargar las tareas pendientes');
      message.error('Error al cargar las tareas pendientes');
    } finally {
      setLoading(false);
    }
  };

  const cleanExpiredTestYourself = async () => {
    try {
      setCleaningExpired(true);
      
      const response = await apiClient.post('/tasks/student/clean-expired-tests');
      const { cleaned, message: responseMessage } = response.data;
      
      if (cleaned > 0) {
        message.success(`${responseMessage} (${cleaned} elementos limpiados)`);
        // Refrescar la lista de tareas después de limpiar
        await fetchPendingTasks();
      } else {
        message.info(responseMessage);
      }
    } catch (error: any) {
      console.error('Error cleaning expired Test Yourself:', error);
      message.error('Error al limpiar Test Yourself vencidos');
    } finally {
      setCleaningExpired(false);
    }
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'exam':
        return <ExclamationCircleOutlined style={{ color: '#fff' }} />;
      case 'project':
        return <BookOutlined style={{ color: '#fff' }} />;
      case 'presentation':
        return <FileTextOutlined style={{ color: '#fff' }} />;
      default:
        return <FileTextOutlined style={{ color: '#fff' }} />;
    }
  };

  const getTaskTypeLabel = (taskType: string) => {
    switch (taskType) {
      case 'exam':
        return 'Test Yourself';
      case 'project':
        return 'Proyecto';
      case 'presentation':
        return 'Presentación';
      default:
        return 'Tarea';
    }
  };

  // Componente de calendario estilo Apple
  const AppleCalendarIcon: React.FC<{ date: string }> = ({ date }) => {
    const momentDate = dayjs(date);
    const dayOfWeek = momentDate.format('ddd').toUpperCase(); // LUN, MAR, etc.
    const dayOfMonth = momentDate.format('D'); // 24
    const month = momentDate.format('MMM').toUpperCase(); // JUL
    
    return (
      <div
        style={{
          width: '48px',
          height: '48px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e8e8e8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Header rojo estilo Apple */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '12px',
            backgroundColor: '#ff3b30',
          }}
        />
        
        {/* Día de la semana */}
        <div
          style={{
            fontSize: '8px',
            fontWeight: '600',
            color: '#666666',
            lineHeight: '10px',
            marginTop: '12px',
          }}
        >
          {dayOfWeek}
        </div>
        
        {/* Día del mes */}
        <div
          style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#000000',
            lineHeight: '18px',
          }}
        >
          {dayOfMonth}
        </div>
        
        {/* Mes */}
        <div
          style={{
            fontSize: '7px',
            fontWeight: '600',
            color: '#666666',
            lineHeight: '8px',
            marginBottom: '2px',
          }}
        >
          {month}
        </div>
      </div>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ff4d4f';
      case 'medium':
        return '#faad14';
      case 'low':
        return '#52c41a';
      default:
        return '#d9d9d9';
    }
  };

  const getStatusTag = (task: PendingTask) => {
    const dueDate = dayjs(task.dueDate);
    const now = dayjs();
    const daysUntilDue = dueDate.diff(now, 'day');
    const isOverdue = dueDate.isBefore(now);

    if (isOverdue) {
      const daysOverdue = Math.abs(daysUntilDue);
      return (
        <Tag color="red" icon={<ExclamationCircleOutlined />}>
          Atrasada {daysOverdue} día{daysOverdue !== 1 ? 's' : ''}
        </Tag>
      );
    }

    if (daysUntilDue === 0) {
      return (
        <Tag color="orange" icon={<ClockCircleOutlined />}>
          Vence HOY
        </Tag>
      );
    }

    if (daysUntilDue === 1) {
      return (
        <Tag color="gold" icon={<ClockCircleOutlined />}>
          Vence MAÑANA
        </Tag>
      );
    }

    if (daysUntilDue <= 7) {
      return (
        <Tag color="blue" icon={<ClockCircleOutlined />}>
          {daysUntilDue} día{daysUntilDue !== 1 ? 's' : ''}
        </Tag>
      );
    }

    return (
      <Tag color="green">
        {daysUntilDue} día{daysUntilDue !== 1 ? 's' : ''}
      </Tag>
    );
  };

  const getTaskProgress = () => {
    if (pendingTasks.length === 0) return 100;
    
    const totalTasks = pendingTasks.length;
    const urgentTasks = pendingTasks.filter(task => task.priority === 'high').length;
    const completionRate = Math.max(0, ((totalTasks - urgentTasks) / totalTasks) * 100);
    
    return Math.round(completionRate);
  };

  const handleTaskClick = (task: PendingTask) => {
    safeNavigate('/student/tasks', { 
      state: { 
        highlightTaskId: task.id,
        filterType: task.taskType 
      } 
    });
  };

  const testYourselfTasks = pendingTasks.filter(task => task.taskType === 'exam');
  const otherTasks = pendingTasks.filter(task => task.taskType !== 'exam');

  if (loading) {
    return (
      <Card className={className} style={{ height, ...style }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">Cargando tareas pendientes...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className} style={{ height, ...style }}>
        <Alert
          message="Error al cargar tareas"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchPendingTasks}>
              Reintentar
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      className={className}
      style={{ height, ...style }}
      title={
        showHeader ? (
          <Space>
            <FileTextOutlined />
            <span>Tareas Pendientes</span>
            <Badge count={pendingTasks.length} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        ) : null
      }
      extra={
        showHeader ? (
          <Space>
            <Progress
              type="circle"
              size={32}
              percent={getTaskProgress()}
              strokeColor={getTaskProgress() > 80 ? '#52c41a' : getTaskProgress() > 50 ? '#faad14' : '#ff4d4f'}
              format={() => ''}
            />
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => safeNavigate('/student/tasks')}
            >
              Ver Todas
            </Button>
            <Button
              type="link"
              icon={<ClearOutlined />}
              loading={cleaningExpired}
              onClick={cleanExpiredTestYourself}
              title="Limpiar Test Yourself vencidos"
              style={{ color: '#ff7875' }}
            >
              Limpiar
            </Button>
          </Space>
        ) : null
      }
    >
      {pendingTasks.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Text>¡Excelente trabajo!</Text>
              <br />
              <Text type="secondary">No tienes tareas pendientes</Text>
            </div>
          }
        />
      ) : (
        <div style={{ maxHeight: height - 120, overflowY: 'auto' }}>
          {/* Test Yourself Section */}
          {testYourselfTasks.length > 0 && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <Title level={5} style={{ margin: 0, color: '#722ed1' }}>
                  <ExclamationCircleOutlined style={{ marginRight: '8px' }} />
                  Test Yourself Próximos ({testYourselfTasks.length})
                </Title>
              </div>
              <List
                size="small"
                dataSource={testYourselfTasks}
                renderItem={(task) => (
                  <List.Item
                    style={{
                      cursor: 'pointer',
                      backgroundColor: '#f9f0ff',
                      margin: '4px 0',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #d3adf7',
                    }}
                    onClick={() => handleTaskClick(task)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px' }}>
                      {/* Icono tipo tarea */}
                      <Avatar
                        icon={getTaskIcon(task.taskType)}
                        style={{ backgroundColor: '#722ed1' }}
                        size="small"
                      />
                      
                      {/* Icono calendario estilo Apple */}
                      <AppleCalendarIcon date={task.dueDate} />
                      
                      {/* Información de la tarea */}
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '4px' }}>
                          <Space>
                            <Text strong style={{ color: '#722ed1' }}>{task.title}</Text>
                            <Badge color={getPriorityColor(task.priority)} />
                          </Space>
                        </div>
                        <Space direction="vertical" size={4}>
                          <Space>
                            <Tag color="purple">{task.subjectAssignment.subject.code}</Tag>
                            <Tag color="purple">{getTaskTypeLabel(task.taskType)}</Tag>
                            {getStatusTag(task)}
                          </Space>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Vence: {dayjs(task.dueDate).format('DD/MM/YYYY HH:mm')}
                          </Text>
                        </Space>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </>
          )}

          {/* Other Tasks Section */}
          {otherTasks.length > 0 && (
            <>
              {testYourselfTasks.length > 0 && <div style={{ margin: '16px 0', borderTop: '1px solid #f0f0f0' }} />}
              {testYourselfTasks.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Title level={5} style={{ margin: 0, color: '#1890ff' }}>
                    <FileTextOutlined style={{ marginRight: '8px' }} />
                    Otras Tareas ({otherTasks.length})
                  </Title>
                </div>
              )}
              <List
                size="small"
                dataSource={otherTasks}
                renderItem={(task) => (
                  <List.Item
                    style={{
                      cursor: 'pointer',
                      margin: '4px 0',
                      padding: '8px',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s',
                    }}
                    className="hover:bg-gray-50"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px' }}>
                      {/* Icono tipo tarea */}
                      <Avatar
                        icon={getTaskIcon(task.taskType)}
                        size="small"
                        style={{ backgroundColor: getPriorityColor(task.priority) }}
                      />
                      
                      {/* Icono calendario estilo Apple */}
                      <AppleCalendarIcon date={task.dueDate} />
                      
                      {/* Información de la tarea */}
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '4px' }}>
                          <Space>
                            <Text>{task.title}</Text>
                            <Badge color={getPriorityColor(task.priority)} />
                          </Space>
                        </div>
                        <Space>
                          <Tag color="blue">{task.subjectAssignment.subject.code}</Tag>
                          <Tag>{getTaskTypeLabel(task.taskType)}</Tag>
                          {getStatusTag(task)}
                        </Space>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </>
          )}
        </div>
      )}
    </Card>
  );
};

export default PendingTasksWidget;