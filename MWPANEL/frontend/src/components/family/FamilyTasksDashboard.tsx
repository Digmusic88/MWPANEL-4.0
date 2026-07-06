/**
 * @archivo: FamilyTasksDashboard.tsx
 * @módulo: Family Components (Widget de Tareas Pendientes para Familias)
 * @función: Widget para mostrar tareas pendientes de los hijos con selector de hijo
 * @crítico: SÍ - Widget principal para seguimiento familiar de tareas
 * @basado_en: StudentDashboard.tsx PendingTasksWidget pattern
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
  Select,
  Divider,
} from 'antd';
import {
  FileTextOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  BookOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { safeNavigate } from '@utils/navigationUtils';
import dayjs from 'dayjs';
import apiClient from '@services/apiClient';
import { useAuthStore } from '@store/authStore';

const { Text, Title } = Typography;
const { Option } = Select;

interface FamilyChild {
  id: string;
  enrollmentNumber: string;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  educationalLevel: {
    name: string;
    code: string;
  };
  course: {
    name: string;
  };
  classGroups: Array<{
    id: string;
    name: string;
  }>;
}

interface FamilyPendingTask {
  id: string;
  title: string;
  dueDate: string;
  taskType: 'assignment' | 'exam' | 'project' | 'presentation';
  status: 'not_submitted' | 'submitted' | 'graded' | 'late';
  maxPoints?: number;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  studentId: string;
  studentName: string;
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

interface FamilyTasksDashboardProps {
  className?: string;
  maxItems?: number;
  showHeader?: boolean;
  height?: number;
  style?: React.CSSProperties;
}

const FamilyTasksDashboard: React.FC<FamilyTasksDashboardProps> = ({
  className = '',
  maxItems = 10,
  showHeader = true,
  height = 400,
  style = {},
}) => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore();
  const [children, setChildren] = useState<FamilyChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | 'all'>('all');
  const [pendingTasks, setPendingTasks] = useState<FamilyPendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch data if user is authenticated and is a family
    if (isAuthenticated && user && user.role === 'family' && !authLoading) {
      fetchFamilyData();
    } else if (isAuthenticated && user && user.role !== 'family') {
      setError('Acceso denegado: Solo familias pueden acceder a este panel');
      setLoading(false);
    } else if (!authLoading && !isAuthenticated) {
      setError('Usuario no autenticado');
      setLoading(false);
    }
  }, [isAuthenticated, user, authLoading]);

  useEffect(() => {
    if (children.length > 0 && isAuthenticated) {
      fetchPendingTasks();
    }
  }, [selectedChildId, children, isAuthenticated]);

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get family dashboard data (includes family info and children)
      const familyDashboardResponse = await apiClient.get('/families/dashboard/my-family');
      const dashboardData = familyDashboardResponse.data;

      if (!dashboardData || !dashboardData.family) {
        setError('No se encontró el perfil de familia para este usuario');
        return;
      }

      setFamilyId(dashboardData.family.id);

      // Get children from dashboard data
      const familyChildren = dashboardData.students || [];

      setChildren(familyChildren);

      // If only one child, auto-select them
      if (familyChildren.length === 1) {
        setSelectedChildId(familyChildren[0].id);
      }

    } catch (error: any) {
      console.error('Error fetching family data:', error);
      setError(error.response?.data?.message || 'Error al cargar los datos de la familia');
      message.error('Error al cargar el dashboard de familia');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingTasks = async () => {
    if (children.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const allFamilyTasks: FamilyPendingTask[] = [];

      // Use the family tasks endpoint which is designed for families
      const tasksResponse = await apiClient.get('/tasks/family/tasks', {
        params: {
          limit: 50,
          sortBy: 'dueDate',
          sortOrder: 'ASC',
          ...(selectedChildId !== 'all' && { studentId: selectedChildId })
        }
      });
      
      const allTasksData = tasksResponse.data?.tasks || [];
      
      // Filter and process tasks from family endpoint
      const now = dayjs();
      const thirtyDaysAgo = now.subtract(30, 'day');

      const filtered = allTasksData.filter((task: any) => {
        // Filter only pending tasks (not submitted and not too old)
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

      // Map and add student info
      const mappedTasks: FamilyPendingTask[] = filtered.map((task: any) => {
        const dueDate = dayjs(task.dueDate);
        const isOverdue = dueDate.isBefore(now);
        const isTestYourself = task.taskType === 'exam';
        const daysUntilDue = dueDate.diff(now, 'day');

        // Determine priority based on type and proximity
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

        // Find student name from children array
        const student = children.find(child => child.id === task.studentId);
        const studentName = student 
          ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
          : 'Estudiante';

        return {
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          taskType: task.taskType,
          status: isOverdue ? 'late' : 'not_submitted',
          maxPoints: task.maxPoints,
          description: task.description,
          priority,
          studentId: task.studentId || '',
          studentName,
          subjectAssignment: {
            subject: {
              name: task.subjectAssignment?.subject?.name || 'Materia',
              code: task.subjectAssignment?.subject?.code || 'MAT',
            },
          },
          submissions: task.submissions,
        };
      });

      allFamilyTasks.push(...mappedTasks);

      // Sort tasks: Test Yourself first, then by priority, then by date
      allFamilyTasks.sort((a, b) => {
        // Test Yourself have priority
        const aIsTest = a.taskType === 'exam';
        const bIsTest = b.taskType === 'exam';
        
        if (aIsTest && !bIsTest) return -1;
        if (!aIsTest && bIsTest) return 1;
        
        // Then by priority
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Finally by due date
        return dayjs(a.dueDate).diff(dayjs(b.dueDate));
      });

      setPendingTasks(allFamilyTasks.slice(0, maxItems));
    } catch (error: any) {
      console.error('Error fetching family pending tasks:', error);
      setError('Error al cargar las tareas pendientes');
      message.error('Error al cargar las tareas pendientes de la familia');
    } finally {
      setLoading(false);
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

  const getStatusTag = (task: FamilyPendingTask) => {
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

  const handleTaskClick = (task: FamilyPendingTask) => {
    // Navigate to family view of tasks (could be implemented in future)
    message.info(`Tarea "${task.title}" de ${task.studentName} - ${task.subjectAssignment.subject.name}`);
  };

  const testYourselfTasks = pendingTasks.filter(task => task.taskType === 'exam');
  const otherTasks = pendingTasks.filter(task => task.taskType !== 'exam');

  // Show loading state while auth is loading or data is loading
  if (authLoading || loading) {
    return (
      <Card className={className} style={{ height, ...style }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">
              {authLoading ? 'Verificando autenticación...' : 'Cargando tareas pendientes de la familia...'}
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  if (error || children.length === 0) {
    return (
      <Card className={className} style={{ height, ...style }}>
        <Alert
          message="Error al cargar tareas familiares"
          description={error || 'No se encontraron hijos para esta familia'}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchFamilyData}>
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
            <TeamOutlined />
            <span>Tareas Pendientes de la Familia</span>
            <Badge count={pendingTasks.length} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        ) : null
      }
      extra={
        showHeader ? (
          <Progress
            type="circle"
            size={32}
            percent={getTaskProgress()}
            strokeColor={getTaskProgress() > 80 ? '#52c41a' : getTaskProgress() > 50 ? '#faad14' : '#ff4d4f'}
            format={() => ''}
          />
        ) : undefined
      }
    >
      {/* Child Selector */}
      {children.length > 1 && (
        <div style={{ marginBottom: '16px' }}>
          <Space align="center">
            <UserOutlined />
            <Text strong>Ver tareas de:</Text>
            <Select
              value={selectedChildId}
              onChange={(value) => setSelectedChildId(value)}
              style={{ minWidth: 200 }}
            >
              <Option value="all">
                <Space>
                  <TeamOutlined />
                  <span>Todos los hijos ({children.length})</span>
                </Space>
              </Option>
              {children.map(child => (
                <Option key={child.id} value={child.id}>
                  <Space>
                    <UserOutlined />
                    <span>{child.user.profile.firstName} {child.user.profile.lastName}</span>
                    <Text type="secondary">({child.educationalLevel.name})</Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Space>
        </div>
      )}

      {/* Single child info */}
      {children.length === 1 && (
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <UserOutlined />
            <Text strong>
              {children[0].user.profile.firstName} {children[0].user.profile.lastName}
            </Text>
            <Text type="secondary">
              {children[0].educationalLevel.name} - {children[0].course.name}
            </Text>
          </Space>
          <Divider style={{ margin: '8px 0' }} />
        </div>
      )}

      {pendingTasks.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Text>¡Excelente trabajo!</Text>
              <br />
              <Text type="secondary">
                {selectedChildId === 'all' 
                  ? 'Ninguno de sus hijos tiene tareas pendientes'
                  : `${children.find(c => c.id === selectedChildId)?.user.profile.firstName || 'El estudiante'} no tiene tareas pendientes`
                }
              </Text>
            </div>
          }
        />
      ) : (
        <div style={{ maxHeight: height - 180, overflowY: 'auto' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                      {/* Task type icon */}
                      <Avatar
                        icon={getTaskIcon(task.taskType)}
                        style={{ backgroundColor: '#722ed1' }}
                        size="small"
                      />
                      
                      {/* Student avatar for multi-child families */}
                      {selectedChildId === 'all' && (
                        <Avatar
                          style={{ backgroundColor: '#1890ff' }}
                          size="small"
                        >
                          {task.studentName.charAt(0)}
                        </Avatar>
                      )}
                      
                      {/* Task information */}
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '4px' }}>
                          <Space wrap>
                            <Text strong style={{ color: '#722ed1' }}>{task.title}</Text>
                            {selectedChildId === 'all' && (
                              <Tag color="blue">{task.studentName}</Tag>
                            )}
                            <Tag color={getPriorityColor(task.priority)}>{task.priority}</Tag>
                          </Space>
                        </div>
                        <Space direction="vertical" size={4}>
                          <Space wrap>
                            <Tag color="purple">{task.subjectAssignment.subject.code}</Tag>
                            <Tag color="purple">{getTaskTypeLabel(task.taskType)}</Tag>
                            {getStatusTag(task) || <></>}
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
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                      {/* Task type icon */}
                      <Avatar
                        icon={getTaskIcon(task.taskType)}
                        size="small"
                        style={{ backgroundColor: getPriorityColor(task.priority) }}
                      />
                      
                      {/* Student avatar for multi-child families */}
                      {selectedChildId === 'all' && (
                        <Avatar
                          style={{ backgroundColor: '#1890ff' }}
                          size="small"
                        >
                          {task.studentName.charAt(0)}
                        </Avatar>
                      )}
                      
                      {/* Task information */}
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '4px' }}>
                          <Space wrap>
                            <Text>{task.title}</Text>
                            {selectedChildId === 'all' && (
                              <Tag color="blue">{task.studentName}</Tag>
                            )}
                            <Tag color={getPriorityColor(task.priority)}>{task.priority}</Tag>
                          </Space>
                        </div>
                        <Space wrap>
                          <Tag color="blue">{task.subjectAssignment.subject.code}</Tag>
                          <Tag>{getTaskTypeLabel(task.taskType)}</Tag>
                          {getStatusTag(task) || <></>}
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

export default FamilyTasksDashboard;