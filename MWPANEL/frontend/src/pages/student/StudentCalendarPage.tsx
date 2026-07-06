import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  List,
  Avatar,
  Badge,
  Tag,
  Space,
  Alert,
  Statistic,
  Progress,
  Button,
  Select,
  DatePicker,
  message,
  Tabs,
  Empty,
} from 'antd';
import {
  CalendarOutlined,
  BookOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  TeamOutlined,
  BellOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import CalendarWidget from '@components/calendar/CalendarWidget';
import apiClient from '@services/apiClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface StudentSchedule {
  id: string;
  dayOfWeek: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  subjectAssignment: {
    subject: {
      name: string;
      code: string;
    };
    teacher: {
      user: {
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    };
    classGroup: {
      name: string;
      section: string;
    };
  };
  classroom: {
    name: string;
    code: string;
  };
  timeSlot: {
    name: string;
    startTime: string;
    endTime: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded' | 'late';
  grade?: number;
  maxPoints?: number;
  type: 'task' | 'exam' | 'project';
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  date: string;
  duration: string;
  classroom: string;
  topics: string[];
}

interface StudentEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  description?: string;
  isOptional: boolean;
}

const StudentCalendarPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [studentSchedule, setStudentSchedule] = useState<StudentSchedule[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [studentEvents, setStudentEvents] = useState<StudentEvent[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [overallAverage, setOverallAverage] = useState<number>(0);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);

      // Get current user to obtain student ID
      const userResponse = await apiClient.get('/auth/me');
      const studentId = userResponse.data.studentId;

      const promises = [
        apiClient.get('/schedules/student/current'),
        apiClient.get('/tasks/student/my-tasks?limit=100&sortBy=dueDate&sortOrder=ASC'), // Fetch more tasks
        apiClient.get('/grades/my-grades'), // Endpoint de calificaciones
      ];

      // Add calendar endpoint - use general calendar for students
      promises.push(apiClient.get('/calendar'));

      const responses = await Promise.all(promises);

      // Ensure all data is properly formatted as arrays
      const scheduleData = Array.isArray(responses[0].data) ? responses[0].data : [];
      const tasksResponseData = responses[1].data;
      const rawTasks = Array.isArray(tasksResponseData.tasks) ? tasksResponseData.tasks : [];
      const gradesData = responses[2].data;
      const calendarData = Array.isArray(responses[3].data) ? responses[3].data : [];

      // Transform raw tasks to Assignment format with proper status calculation
      const transformedAssignments: Assignment[] = rawTasks.map((task: any) => {
        const submission = task.submissions?.[0];
        const isPastDue = dayjs(task.dueDate).isBefore(dayjs());

        // Determine status based on submission state
        let status: 'pending' | 'submitted' | 'graded' | 'late' = 'pending';
        if (submission) {
          if (submission.finalGrade !== null && submission.finalGrade !== undefined) {
            status = 'graded';
          } else {
            status = 'submitted';
          }
        } else if (isPastDue) {
          status = 'late';
        }

        return {
          id: task.id,
          title: task.title,
          subject: task.subjectAssignment?.subject?.name || 'Sin asignatura',
          dueDate: task.dueDate,
          status,
          grade: submission?.finalGrade || undefined,
          maxPoints: task.maxPoints || 100,
          type: task.taskType === 'exam' ? 'exam' : task.taskType === 'project' ? 'project' : 'task',
        };
      });

      setStudentSchedule(scheduleData);
      setAssignments(transformedAssignments);
      setOverallAverage(gradesData?.summary?.overallAverage || 0);
      setExams([]); // Remove evaluations endpoint as it doesn't exist
      setStudentEvents(calendarData);
    } catch (error: any) {
      console.error('Error fetching student data:', error);
      message.error('Error al cargar datos del estudiante');
    } finally {
      setLoading(false);
    }
  };

  // Transform tasks to the format expected by CalendarWidget
  const getTasksForCalendar = () => {
    return assignments.map((task: Assignment) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      taskType: task.type === 'exam' ? 'exam' : 'assignment',
      status: task.status === 'graded' ? 'graded' : 'not_submitted',
      finalGrade: task.grade || null,
      maxPoints: task.maxPoints || 100,
      subjectAssignment: {
        subject: {
          name: task.subject || 'Materia',
          code: task.subject?.substring(0, 3).toUpperCase() || 'MAT'
        }
      }
    }));
  };

  const getAssignmentStatus = (assignment: Assignment) => {
    switch (assignment.status) {
      case 'pending':
        return { color: 'orange', icon: <ClockCircleOutlined />, text: 'Pendiente' };
      case 'submitted':
        return { color: 'blue', icon: <CheckCircleOutlined />, text: 'Entregada' };
      case 'graded':
        return { color: 'green', icon: <TrophyOutlined />, text: 'Calificada' };
      case 'late':
        return { color: 'red', icon: <ExclamationCircleOutlined />, text: 'Tardía' };
      default:
        return { color: 'default', icon: <ClockCircleOutlined />, text: 'Pendiente' };
    }
  };

  const getAssignmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'task': 'Tarea',
      'exam': 'Test Yourself',
      'project': 'Proyecto',
    };
    return labels[type] || type;
  };

  const getPendingAssignments = () => {
    const safeAssignments = Array.isArray(assignments) ? assignments : []
    // Incluir tareas pendientes, tardías Y entregadas pero no calificadas
    // Una tarea solo está "completada" cuando está calificada
    return safeAssignments.filter(a =>
      a.status === 'pending' ||
      a.status === 'late' ||
      a.status === 'submitted' // Entregada pero pendiente de calificar
    );
  };

  const getUpcomingExams = () => {
    const safeExams = Array.isArray(exams) ? exams : []
    return safeExams.filter(e => dayjs(e.date).isAfter(dayjs()));
  };

  const getTodaysClasses = () => {
    const today = dayjs().day(); // 0 = Sunday, 1 = Monday, etc.
    const safeSchedule = Array.isArray(studentSchedule) ? studentSchedule : []
    return safeSchedule.filter(s => s.dayOfWeek === today);
  };

  const getGradeAverage = () => {
    // Usar el promedio del endpoint oficial de calificaciones
    return overallAverage || 0;
  };

  const getCompletionRate = () => {
    const safeAssignments = Array.isArray(assignments) ? assignments : []
    if (safeAssignments.length === 0) return 0;
    // Solo contar como completadas las tareas CALIFICADAS (no las solo entregadas)
    const completed = safeAssignments.filter(a => a.status === 'graded').length;
    return Math.round((completed / safeAssignments.length) * 100);
  };

  const safeAssignments = Array.isArray(assignments) ? assignments : []
  const filteredAssignments = selectedSubject === 'all' 
    ? safeAssignments 
    : safeAssignments.filter(a => a.subject === selectedSubject);

  const uniqueSubjects = Array.from(new Set(safeAssignments.map(a => a.subject)));

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div className="mb-6">
        <Title level={2}>
          <CalendarOutlined className="mr-2" />
          Mi Calendario Académico
        </Title>
        <Text type="secondary">
          Mantente al día con tus clases, tareas y evaluaciones
        </Text>
      </div>

      {/* Quick Stats */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Clases Hoy"
              value={getTodaysClasses().length}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Tareas Pendientes"
              value={getPendingAssignments().length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Próximos Exámenes"
              value={getUpcomingExams().length}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Promedio General"
              value={getGradeAverage()}
              precision={1}
              suffix="/100"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Progress Card */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col span={24}>
          <Alert
            message={`Tienes ${getPendingAssignments().length} tareas pendientes y ${getUpcomingExams().length} exámenes próximos`}
            description={(() => {
              const rate = getCompletionRate();
              if (rate === 0) {
                return 'Aún no tienes tareas calificadas. ¡Ánimo, puedes conseguirlo!';
              } else if (rate < 25) {
                return `Tu tasa de tareas calificadas es del ${rate}%. ¡Sigue trabajando!`;
              } else if (rate < 50) {
                return `Tu tasa de tareas calificadas es del ${rate}%. ¡Vas por buen camino!`;
              } else if (rate < 75) {
                return `Tu tasa de tareas calificadas es del ${rate}%. ¡Muy bien, sigue así!`;
              } else if (rate < 100) {
                return `Tu tasa de tareas calificadas es del ${rate}%. ¡Excelente trabajo!`;
              } else {
                return `¡Felicidades! Todas tus tareas están calificadas. ¡Excelente trabajo!`;
              }
            })()}
            type={getCompletionRate() >= 50 ? 'success' : (getCompletionRate() >= 25 ? 'info' : 'warning')}
            showIcon
            action={
              <Button onClick={() => message.info('Ve a la sección de tareas para más detalles')}>
                Ver Detalles
              </Button>
            }
          />
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Main Calendar */}
        <Col xs={24} lg={16}>
          <Card title="Calendario de Eventos y Tareas">
            <CalendarWidget
              userRole="student"
              height={600}
              showEventList={true}
              maxEvents={10}
              includeTasks={true}
              studentTasks={getTasksForCalendar()}
            />
          </Card>
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Today's Schedule */}
            <Card 
              title="Horario de Hoy" 
              size="small"
              extra={<Badge count={getTodaysClasses().length} />}
            >
              <List
                size="small"
                dataSource={getTodaysClasses()}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<BookOutlined />} />}
                      title={item.subjectAssignment?.subject?.name || 'Materia no disponible'}
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary">
                            {item.timeSlot?.startTime} - {item.timeSlot?.endTime} ({item.timeSlot?.name})
                          </Text>
                          <Text type="secondary">
                            {item.subjectAssignment?.teacher?.user?.profile?.firstName} {item.subjectAssignment?.teacher?.user?.profile?.lastName}
                          </Text>
                          <Text type="secondary">{item.classroom?.name}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'No hay clases hoy' }}
              />
            </Card>

            {/* Pending Assignments */}
            <Card 
              title="Tareas Pendientes" 
              size="small"
              extra={
                <Space>
                  <Select
                    size="small"
                    value={selectedSubject}
                    onChange={setSelectedSubject}
                    style={{ width: 120 }}
                  >
                    <Option value="all">Todas</Option>
                    {uniqueSubjects.map(subject => (
                      <Option key={subject} value={subject}>{subject}</Option>
                    ))}
                  </Select>
                  <Badge count={getPendingAssignments().length} />
                </Space>
              }
            >
              <List
                size="small"
                dataSource={filteredAssignments.filter(a => a.status === 'pending' || a.status === 'late' || a.status === 'submitted').slice(0, 5)}
                renderItem={(assignment) => {
                  const status = getAssignmentStatus(assignment);
                  const daysUntilDue = dayjs(assignment.dueDate).diff(dayjs(), 'days');
                  
                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            icon={status.icon} 
                            style={{ backgroundColor: status.color }}
                          />
                        }
                        title={assignment.title}
                        description={
                          <Space direction="vertical" size={0} style={{ width: '100%' }}>
                            <Tag color="blue">{assignment.subject}</Tag>
                            <Text type="secondary">
                              Vence: {dayjs(assignment.dueDate).format('DD/MM/YYYY')}
                            </Text>
                            <Text type={daysUntilDue <= 1 ? 'danger' : 'secondary'}>
                              {daysUntilDue <= 0 ? 'Vencida' : `${daysUntilDue} días restantes`}
                            </Text>
                            <Tag >{getAssignmentTypeLabel(assignment.type)}</Tag>
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
                locale={{ emptyText: 'No hay tareas pendientes' }}
              />
              {getPendingAssignments().length > 5 && (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Button type="link" size="small">
                    Ver todas las tareas ({getPendingAssignments().length})
                  </Button>
                </div>
              )}
            </Card>

            {/* Upcoming Exams */}
            <Card title="Próximos Exámenes" size="small">
              <List
                size="small"
                dataSource={getUpcomingExams().slice(0, 3)}
                renderItem={(exam) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<ExclamationCircleOutlined />} style={{ backgroundColor: '#f5222d' }} />}
                      title={exam.title}
                      description={
                        <Space direction="vertical" size={0}>
                          <Tag color="red">{exam.subject}</Tag>
                          <Text type="secondary">
                            {dayjs(exam.date).format('DD/MM/YYYY')} - {exam.duration}
                          </Text>
                          <Text type="secondary">{exam.classroom}</Text>
                          {exam.topics.length > 0 && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Temas: {exam.topics.join(', ')}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'No hay exámenes próximos' }}
              />
            </Card>

            {/* Recent Grades */}
            <Card title="Calificaciones Recientes" size="small">
              <List
                size="small"
                dataSource={(Array.isArray(assignments) ? assignments : [])
                  .filter(a => a.status === 'graded')
                  .sort((a, b) => dayjs(b.dueDate).diff(dayjs(a.dueDate)))
                  .slice(0, 3)
                }
                renderItem={(assignment) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<TrophyOutlined />} style={{ backgroundColor: '#52c41a' }} />}
                      title={assignment.title}
                      description={
                        <Space direction="vertical" size={0}>
                          <Tag color="blue">{assignment.subject}</Tag>
                          <Text strong style={{ color: '#52c41a' }}>
                            {assignment.grade}/{assignment.maxPoints} ({Math.round((assignment.grade! / assignment.maxPoints!) * 100 * 10) / 10}/100)
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'No hay calificaciones recientes' }}
              />
            </Card>

            {/* Completion Progress */}
            <Card title="Progreso del Periodo" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>Tareas Calificadas</Text>
                  <Progress
                    percent={getCompletionRate()}
                    strokeColor={getCompletionRate() === 100 ? '#52c41a' : '#faad14'}
                    trailColor="#f0f0f0"
                    format={(percent) => `${percent}%`}
                    status={getCompletionRate() === 100 ? 'success' : 'active'}
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {safeAssignments.filter(a => a.status === 'graded').length} de {safeAssignments.length} tareas calificadas
                  </Text>
                </div>
                <div>
                  <Text>Promedio Actual</Text>
                  <Progress
                    percent={getGradeAverage()}
                    strokeColor="#1890ff"
                    trailColor="#f0f0f0"
                    format={() => `${getGradeAverage()}/100`}
                    status="active"
                  />
                </div>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default StudentCalendarPage;