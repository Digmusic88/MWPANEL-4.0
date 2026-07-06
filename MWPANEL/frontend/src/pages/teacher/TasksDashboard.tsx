import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Typography,
  Space,
  Button,
  Tag,
  Progress,
  Alert,
  message,
  Modal,
  Input,
} from 'antd';
import {
  BarChartOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  SendOutlined,
  TrophyOutlined,
  UserOutlined,
  BookOutlined,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import Loading from '../../components/common/Loading';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AdvancedStatistics {
  overview: {
    totalTasks: number;
    totalSubmissions: number;
    pendingGrading: number;
    completionRate: number;
  };
  subjectStats: Array<{
    name: string;
    taskCount: number;
    submissionCount: number;
    gradedCount: number;
    averageGrade: number;
  }>;
  studentPerformance: Array<{
    studentId: string;
    studentName: string;
    submissionCount: number;
    averageGrade: number;
    grades: number[];
  }>;
  timeAnalytics: {
    tasksCreatedLast30Days: number;
    submissionsLast30Days: number;
    averageSubmissionsPerTask: number;
  };
  engagementMetrics: {
    submissionRate: number;
    onTimeRate: number;
    averageAttachmentsPerSubmission: number;
  };
  pendingGrading: Array<{
    id: string;
    taskTitle: string;
    taskId: string;
    studentName: string;
    submittedAt: string;
    daysPending: number;
    hasAttachments: boolean;
    isLate: boolean;
  }>;
}

interface PendingGradingItem {
  id: string;
  taskTitle: string;
  taskId: string;
  studentName: string;
  studentId: string;
  submittedAt: string;
  daysPending: number;
  hasAttachments: boolean;
  isLate: boolean;
}

interface OverdueTask {
  id: string;
  title: string;
  dueDate: string;
  subjectName: string;
  totalStudents: number;
  submittedCount: number;
  missingSubmissions: number;
  completionRate: number;
  daysOverdue: number;
}

const TasksDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === "function") {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn("Navigation error:", error, "Path:", path);
      }
    } else {
      console.warn("Navigate function not available:", path);
    }
  }, [navigate]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<AdvancedStatistics | null>(null);
  const [pendingGrading, setPendingGrading] = useState<PendingGradingItem[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [reminderMessage, setReminderMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsResponse, pendingResponse, overdueResponse] = await Promise.all([
        apiClient.get('/tasks/teacher/advanced-statistics'),
        apiClient.get('/tasks/teacher/pending-grading'),
        apiClient.get('/tasks/teacher/overdue-tasks'),
      ]);

      setStatistics(statsResponse.data);
      setPendingGrading(pendingResponse.data);
      setOverdueTasks(overdueResponse.data);
    } catch (error: any) {
      console.error('Error fetching tasks dashboard data:', error);
      message.error('Error al cargar el dashboard de tareas');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReminder = async () => {
    if (selectedTasks.length === 0) {
      message.warning('Selecciona al menos una tarea para enviar recordatorios');
      return;
    }

    try {
      await apiClient.post('/tasks/teacher/bulk-reminder', {
        taskIds: selectedTasks,
        message: reminderMessage,
      });
      
      message.success('Recordatorios enviados exitosamente');
      setReminderModalVisible(false);
      setSelectedTasks([]);
      setReminderMessage('');
    } catch (error: any) {
      console.error('Error sending bulk reminders:', error);
      message.error('Error al enviar recordatorios');
    }
  };

  const renderSubjectStats = () => {
    if (!statistics) return null;
    
    return statistics.subjectStats.map((subject, index) => (
      <div key={index} style={{ marginBottom: 16 }}>
        <Text strong>{subject.name}</Text>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <Text type="secondary">Tareas: {subject.taskCount}</Text>
          <Text type="secondary">Entregas: {subject.submissionCount}</Text>
          <Text type="secondary">Calificadas: {subject.gradedCount}</Text>
        </div>
        <Progress
          percent={Math.round((subject.gradedCount / Math.max(subject.submissionCount, 1)) * 100)}
          size="small"
          strokeColor="#52c41a"
        />
      </div>
    ));
  };

  const renderStudentPerformance = () => {
    if (!statistics) return null;
    
    return statistics.studentPerformance.slice(0, 5).map((student, index) => (
      <div key={index} style={{ marginBottom: 16 }}>
        <Text strong>{student.studentName.split(' ').slice(0, 2).join(' ')}</Text>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <Text type="secondary">Promedio: {typeof student.averageGrade === 'number' ? student.averageGrade.toFixed(1) : student.averageGrade}</Text>
          <Text type="secondary">Entregas: {student.submissionCount}</Text>
        </div>
        <Progress
          percent={Math.min(Math.round(student.averageGrade * 10), 100)}
          size="small"
          strokeColor="#1890ff"
        />
      </div>
    ));
  };

  const pendingColumns = [
    {
      title: 'Estudiante',
      dataIndex: 'studentName',
      key: 'studentName',
      render: (name: string) => (
        <Space>
          <UserOutlined />
          {name}
        </Space>
      ),
    },
    {
      title: 'Tarea',
      dataIndex: 'taskTitle',
      key: 'taskTitle',
      render: (title: string) => (
        <Text strong>{title}</Text>
      ),
    },
    {
      title: 'Entregado',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Días pendiente',
      dataIndex: 'daysPending',
      key: 'daysPending',
      render: (days: number) => (
        <Tag color={days > 7 ? 'red' : days > 3 ? 'orange' : 'blue'}>
          {days} días
        </Tag>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      render: (record: PendingGradingItem) => (
        <Space>
          {record.isLate && <Tag color="red">Tardía</Tag>}
          {record.hasAttachments && <Tag color="green">Con archivos</Tag>}
        </Space>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: PendingGradingItem) => (
        <Button 
          
          type="primary"
          onClick={() => safeNavigate(`/teacher/tasks/${record.taskId}/submissions/${record.id}/grade`)}
        >
          Calificar
        </Button>
      ),
    },
  ];

  const overdueColumns = [
    {
      title: 'Tarea',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Asignatura',
      dataIndex: 'subjectName',
      key: 'subjectName',
      render: (name: string) => (
        <Tag color="blue">{name}</Tag>
      ),
    },
    {
      title: 'Vencimiento',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Progreso',
      key: 'progress',
      render: (record: OverdueTask) => (
        <div>
          <Progress
            percent={record.completionRate}
            size="small"
            status={record.completionRate < 50 ? 'exception' : 'normal'}
          />
          <Text type="secondary">
            {record.submittedCount}/{record.totalStudents} entregas
          </Text>
        </div>
      ),
    },
    {
      title: 'Días vencida',
      dataIndex: 'daysOverdue',
      key: 'daysOverdue',
      render: (days: number) => (
        <Tag color="red">{days} días</Tag>
      ),
    },
  ];

  if (loading) {
    return <Loading size="large" text="Cargando dashboard de tareas..." />;
  }

  if (!statistics) {
    return (
      <Alert
        message="Error"
        description="No se pudieron cargar las estadísticas"
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="tasks-dashboard">
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div className="mb-6">
          <Title level={2}>
            <BarChartOutlined className="mr-2" />
            Dashboard de Tareas
          </Title>
          <Text type="secondary">
            Estadísticas avanzadas y seguimiento detallado de tareas
          </Text>
        </div>

        {/* Overview Cards */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Tareas"
                value={statistics.overview.totalTasks}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Entregas"
                value={statistics.overview.totalSubmissions}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Pendientes Calificar"
                value={statistics.overview.pendingGrading}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tasa Finalización"
                value={statistics.overview.completionRate}
                suffix="%"
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Charts Row */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={12}>
            <Card title="Estadísticas por Asignatura" extra={<BookOutlined />}>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {renderSubjectStats()}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Rendimiento de Estudiantes (Top 5)" extra={<TrophyOutlined />}>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {renderStudentPerformance()}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Engagement Metrics */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={8}>
            <Card title="Métricas de Engagement">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>Tasa de Entrega</Text>
                  <Progress
                    percent={statistics.engagementMetrics.submissionRate}
                    strokeColor="#52c41a"
                  />
                </div>
                <div>
                  <Text>Entregas a Tiempo</Text>
                  <Progress
                    percent={statistics.engagementMetrics.onTimeRate}
                    strokeColor="#1890ff"
                  />
                </div>
                <Statistic
                  title="Promedio Archivos por Entrega"
                  value={statistics.engagementMetrics.averageAttachmentsPerSubmission}
                  precision={1}
                  suffix="archivos"
                />
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Distribución de Entregas">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>Entregas a Tiempo</Text>
                  <Progress
                    percent={statistics?.engagementMetrics.onTimeRate || 0}
                    strokeColor="#52c41a"
                    showInfo={true}
                    format={(percent) => `${percent}%`}
                  />
                </div>
                <div>
                  <Text>Entregas Tardías</Text>
                  <Progress
                    percent={100 - (statistics?.engagementMetrics.onTimeRate || 0)}
                    strokeColor="#ff4d4f"
                    showInfo={true}
                    format={(percent) => `${percent}%`}
                  />
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Actividad Reciente (30 días)">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Statistic
                  title="Tareas Creadas"
                  value={statistics.timeAnalytics.tasksCreatedLast30Days}
                  prefix={<FileTextOutlined />}
                />
                <Statistic
                  title="Entregas Recibidas"
                  value={statistics.timeAnalytics.submissionsLast30Days}
                  prefix={<CheckCircleOutlined />}
                />
                <Statistic
                  title="Promedio Entregas/Tarea"
                  value={statistics.timeAnalytics.averageSubmissionsPerTask}
                  precision={1}
                />
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Action Tables */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card
              title="Entregas Pendientes de Calificar"
              extra={
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => setReminderModalVisible(true)}
                  disabled={pendingGrading.length === 0}
                >
                  Enviar Recordatorios
                </Button>
              }
            >
              <Table
                dataSource={pendingGrading}
                columns={pendingColumns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ y: 300 }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="Tareas Vencidas" extra={<ExclamationCircleOutlined />}>
              <Table
                dataSource={overdueTasks}
                columns={overdueColumns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ y: 300 }}
                rowSelection={{
                  selectedRowKeys: selectedTasks,
                  onChange: (keys) => setSelectedTasks(keys as string[]),
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Bulk Reminder Modal */}
        <Modal
          title="Enviar Recordatorios Masivos"
          open={reminderModalVisible}
          onOk={handleBulkReminder}
          onCancel={() => setReminderModalVisible(false)}
          okText="Enviar Recordatorios"
          cancelText="Cancelar"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>
              Se enviará un recordatorio a los estudiantes que no han entregado las tareas seleccionadas.
            </Text>
            <Text strong>Tareas seleccionadas: {selectedTasks.length}</Text>
            <TextArea
              placeholder="Mensaje personalizado (opcional)"
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              rows={4}
            />
          </Space>
        </Modal>
      </div>
    </div>
  );
};

export default TasksDashboard;