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
  Button,
  Select,
  message,
  Divider,
  Progress,
  Calendar,
} from 'antd';
import {
  CalendarOutlined,
  BookOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  BellOutlined,
  HomeOutlined,
  MailOutlined,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';
import dayjs from 'dayjs';
import { familyMeetingsService, meetingsService } from '../../services/meetingsService';
import { MeetingBooking, BookingStatus } from '../../types/meetings';

const { Title, Text } = Typography;
const { Option } = Select;

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  classGroup: string;
  academicYear: string;
}

interface FamilyEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  studentName?: string;
  description?: string;
  requiresResponse?: boolean;
  hasResponded?: boolean;
}

interface StudentAssignment {
  studentId: string;
  studentName: string;
  assignments: Array<{
    id: string;
    title: string;
    subject: string;
    dueDate: string;
    status: 'pending' | 'submitted' | 'graded' | 'late';
    grade?: number;
    maxPoints?: number;
  }>;
}

interface FamilyNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  studentName?: string;
  date: string;
  isRead: boolean;
}

const FamilyCalendarPageSimple: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([]);
  const [notifications, setNotifications] = useState<FamilyNotification[]>([]);
  const [calendarFilterStudentId, setCalendarFilterStudentId] = useState<string>('all');
  const [meetings, setMeetings] = useState<MeetingBooking[]>([]);

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      
      const requests = [
        apiClient.get('/families/my-children').catch(() => ({ data: [] })),
        apiClient.get('/calendar').catch(() => ({ data: [] })),
        apiClient.get('/tasks/family/tasks?limit=50').catch(() => ({ data: { tasks: [] } })),
        apiClient.get('/families/alerts').catch(() => ({ data: { alerts: [] } })),
        familyMeetingsService.getMyBookings().catch(() => ({ bookings: [] })),
      ];

      const [studentsResponse, eventsResponse, tasksResponse, notificationsResponse, meetingsResponse] = await Promise.all(requests);

      const mappedStudents = (studentsResponse.data || []).map((student: any) => ({
        id: student.id,
        firstName: student.user?.profile?.firstName || '',
        lastName: student.user?.profile?.lastName || '',
        classGroup: student.classGroups?.[0]?.name || 'Sin grupo',
        academicYear: new Date().getFullYear().toString(),
      }));

      const mappedAssignments = mappedStudents.map((student: any) => ({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        assignments: (tasksResponse.data?.tasks || [])
          .filter((task: any) => task.submissions?.some((s: any) => s.student?.id === student.id))
          .map((task: any) => ({
            id: task.id,
            title: task.title,
            subject: task.subjectAssignment?.subject?.name || '',
            dueDate: task.dueDate,
            status: task.submissions?.find((s: any) => s.student?.id === student.id)?.status || 'pending',
            grade: task.submissions?.find((s: any) => s.student?.id === student.id)?.finalGrade,
            maxPoints: task.maxPoints,
          })),
      }));

      const mappedNotifications = (notificationsResponse.data?.alerts || []).map((alert: any) => ({
        id: alert.id,
        title: alert.title,
        message: alert.description,
        type: alert.priority === 'critical' ? 'error' : alert.priority === 'high' ? 'warning' : 'info',
        studentName: alert.student?.firstName + ' ' + alert.student?.lastName,
        date: alert.createdAt,
        isRead: alert.isViewed,
      }));

      setStudents(mappedStudents);
      setFamilyEvents(eventsResponse.data || []);
      setStudentAssignments(mappedAssignments);
      setNotifications(mappedNotifications);
      setMeetings(meetingsResponse.bookings || []);
    } catch (error: any) {
      console.error('Error fetching family data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funciones helper simples
  const getUnreadNotifications = () => {
    return notifications.filter(notif => !notif.isRead);
  };

  const getStudentProgress = (studentId: string) => {
    const studentData = studentAssignments.find(sa => sa.studentId === studentId);
    if (!studentData || studentData.assignments.length === 0) return 0;
    
    const completed = studentData.assignments.filter(a => a.status === 'submitted' || a.status === 'graded').length;
    return Math.round((completed / studentData.assignments.length) * 100);
  };

  const getStudentAverage = (studentId: string) => {
    const studentData = studentAssignments.find(sa => sa.studentId === studentId);
    if (!studentData) return 0;
    
    const graded = studentData.assignments.filter(a => a.status === 'graded' && a.grade && a.maxPoints);
    if (graded.length === 0) return 0;
    
    const total = graded.reduce((sum, a) => sum + (a.grade! / a.maxPoints!) * 100, 0);
    return Math.round((total / graded.length) * 10) / 10;
  };

  const getPendingTasksCount = () => {
    return studentAssignments.reduce((total, sa) => 
      total + sa.assignments.filter(a => a.status === 'pending' || a.status === 'late').length, 0
    );
  };

  const getUpcomingEventsCount = () => {
    const now = dayjs();
    return familyEvents.filter(event => {
      if (!event.date) return false;
      return dayjs(event.date).isAfter(now) && dayjs(event.date).diff(now, 'days') <= 7;
    }).length;
  };

  // Función para renderizar celdas del calendario con reuniones
  const renderCalendarCell = (value: any) => {
    const dateStr = value.format('YYYY-MM-DD');
    
    // Filtrar reuniones para esta fecha
    const dayMeetings = meetings.filter(meeting => 
      meeting.slot.startDatetime.startsWith(dateStr)
    );

    if (dayMeetings.length === 0) {
      return null;
    }

    return (
      <div style={{ padding: '2px' }}>
        {dayMeetings.map(meeting => {
          const statusConfig = {
            [BookingStatus.CONFIRMED]: { color: 'success', text: 'Confirmada' },
            [BookingStatus.CANCELLED]: { color: 'default', text: 'Cancelada' },
            [BookingStatus.PENDING]: { color: 'processing', text: 'Pendiente' },
          };

          const status = statusConfig[meeting.status];
          const teacherName = meeting.slot.teacher.user.profile
            ? `${meeting.slot.teacher.user.profile.firstName} ${meeting.slot.teacher.user.profile.lastName}`
            : 'Profesor'; // RGPD: no mostrar email del profesor

          return (
            <Badge
              key={meeting.id}
              status={status.color as any}
              text={`${meetingsService.formatTime(meeting.slot.startDatetime)} - ${teacherName.split(' ')[0]}`}
              style={{ 
                fontSize: '10px',
                display: 'block',
                marginBottom: '2px',
                cursor: 'pointer'
              }}
              onClick={() => {
                message.info(`Reunión con ${teacherName} - ${status.text}`);
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div className="mb-6">
        <Title level={2}>
          <HomeOutlined className="mr-2" />
          Calendario Familiar
        </Title>
        <Text type="secondary">
          Mantente informado sobre las actividades y progreso académico de tus hijos
        </Text>
        
        <div style={{ marginTop: 16 }}>
          <Space align="center">
            <Text strong>Mostrar eventos de:</Text>
            <Select
              value={calendarFilterStudentId}
              onChange={setCalendarFilterStudentId}
              style={{ width: 200 }}
              size="large"
            >
              <Option value="all">Todos los hijos</Option>
              {students.map(student => (
                <Option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </Option>
              ))}
            </Select>
          </Space>
        </div>
      </div>

      {/* Quick Stats */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Tareas Pendientes"
              value={getPendingTasksCount()}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Próximos Eventos"
              value={getUpcomingEventsCount()}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Notificaciones"
              value={getUnreadNotifications().length}
              prefix={<BellOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Mis Hijos"
              value={students.length}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Calendar - Full Width */}
      <Row gutter={[24, 24]} className="mb-6">
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <CalendarOutlined />
                Calendario de Eventos Familiares
                {calendarFilterStudentId !== 'all' && (
                  <Tag color="blue">
                    {students.find(s => s.id === calendarFilterStudentId)?.firstName || 'Filtrado'}
                  </Tag>
                )}
              </Space>
            }
          >
            <div style={{ minHeight: '500px' }}>
              <Calendar
                fullscreen={true}
                cellRender={renderCalendarCell}
                onSelect={(date) => {
                  console.log('Fecha seleccionada:', date.format('DD/MM/YYYY'));
                }}
              />
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <CalendarOutlined />
                Próximas Reuniones
                {meetings.length > 0 && (
                  <Tag color="blue">{meetings.length} reunión(es)</Tag>
                )}
              </Space>
            }
            style={{ height: '500px' }}
          >
            {meetings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <CalendarOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <div style={{ marginTop: '12px' }}>
                  <Text type="secondary">No tienes reuniones programadas</Text>
                </div>
              </div>
            ) : (
              <List
                size="small"
                dataSource={meetings
                  .filter(m => dayjs(m.slot.startDatetime).isAfter(dayjs()))
                  .sort((a, b) => dayjs(a.slot.startDatetime).diff(dayjs(b.slot.startDatetime)))
                  .slice(0, 5)
                }
                renderItem={(meeting) => {
                  const teacherName = meeting.slot.teacher.user.profile
                    ? `${meeting.slot.teacher.user.profile.firstName} ${meeting.slot.teacher.user.profile.lastName}`
                    : 'Profesor'; // RGPD: no mostrar email del profesor
                  
                  const statusConfig = {
                    [BookingStatus.CONFIRMED]: { color: 'success', text: 'Confirmada' },
                    [BookingStatus.CANCELLED]: { color: 'default', text: 'Cancelada' },
                    [BookingStatus.PENDING]: { color: 'processing', text: 'Pendiente' },
                  };

                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<UserOutlined style={{ color: '#1890ff' }} />}
                        title={teacherName}
                        description={
                          <Space direction="vertical" size={0}>
                            <Text style={{ fontSize: '12px' }}>
                              {meetingsService.formatDateTime(meeting.slot.startDatetime)}
                            </Text>
                            <Tag size="small" color={statusConfig[meeting.status].color}>
                              {statusConfig[meeting.status].text}
                            </Tag>
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Widgets en 3 columnas abajo */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card title="Progreso de Estudiantes" size="small">
            <List
              size="small"
              dataSource={students}
              renderItem={(student) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={`${student.firstName} ${student.lastName}`}
                    description={
                      <Space direction="vertical" size={0}>
                        <Tag color="blue">{student.classGroup}</Tag>
                        <Progress
                          percent={getStudentProgress(student.id)}
                          size="small"
                          format={(percent) => `${percent}%`}
                        />
                        <Text style={{ fontSize: '12px' }}>
                          Promedio: {getStudentAverage(student.id)}/10
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card 
            title="Notificaciones" 
            size="small"
            extra={<Badge count={getUnreadNotifications().length} />}
          >
            <List
              size="small"
              dataSource={notifications.slice(0, 5)}
              renderItem={(notification) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={<BellOutlined />} 
                        style={{ 
                          backgroundColor: notification.isRead ? '#d9d9d9' : '#1890ff'
                        }}
                      />
                    }
                    title={notification.title}
                    description={
                      <Space direction="vertical" size={0}>
                        {notification.studentName && (
                          <Tag size="small">{notification.studentName}</Tag>
                        )}
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {notification.message}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No hay notificaciones' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Resumen de Actividades" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Total estudiantes:</Text>
                <Tag color="green">{students.length}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Tareas pendientes:</Text>
                <Tag color="orange">{getPendingTasksCount()}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Próximos eventos:</Text>
                <Tag color="blue">{getUpcomingEventsCount()}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Notificaciones:</Text>
                <Tag color="red">{getUnreadNotifications().length}</Tag>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FamilyCalendarPageSimple;