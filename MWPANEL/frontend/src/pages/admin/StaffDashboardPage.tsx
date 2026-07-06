/**
 * @archivo: StaffDashboardPage.tsx
 * @modulo: Staff (Claustro) - Admin
 * @funcion: Dashboard principal del modulo Claustro
 */

import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Typography,
  Spin,
  Empty,
  Tag,
  List,
  Avatar,
  Progress,
  Timeline,
  Space,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  TeamOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  UserOutlined,
  RightOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStaffDashboardStats, useStaffUserProgress } from '@/hooks/useStaffDashboard';
import { useUpcomingStaffMeetings } from '@/hooks/useStaffMeetings';
import { useMyStaffTasks } from '@/hooks/useStaffTasks';
import { StaffProgressCard, StaffUserProgressCard, StaffTaskCard, StaffMeetingCard } from '@/components/staff';
import type { StaffTaskStats } from '@/types/staff';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const StaffDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Queries
  const { data: stats, isLoading: statsLoading } = useStaffDashboardStats();
  const { data: userProgress, isLoading: userProgressLoading } = useStaffUserProgress();
  const { data: upcomingMeetings, isLoading: upcomingLoading } = useUpcomingStaffMeetings();
  // "Próximas" = solo reuniones futuras (findUpcoming incluye también las vencidas activas).
  const futureMeetings = (upcomingMeetings || []).filter(m => new Date(m.scheduledDate).getTime() > Date.now());
  const { data: recentTasks, isLoading: tasksLoading } = useMyStaffTasks({ limit: 5 });

  const taskStats: StaffTaskStats | null = stats ? {
    total: stats.tasks.total,
    completed: stats.tasks.completed,
    inProgress: stats.tasks.inProgress,
    pending: stats.tasks.pending,
    overdue: stats.tasks.overdue,
    completionRate: stats.tasks.completionRate,
  } : null;

  if (statsLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Title level={2} className="mb-2">
          <TeamOutlined className="mr-2" />
          Dashboard del Claustro
        </Title>
        <Text type="secondary">
          Resumen de tareas, reuniones y progreso del equipo docente
        </Text>
      </div>

      {/* Quick Actions */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card
            hoverable
            className="text-center"
            onClick={() => navigate('/admin/staff/tasks')}
          >
            <UnorderedListOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
            <div>Gestionar Tareas</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            className="text-center"
            onClick={() => navigate('/admin/staff/meetings')}
          >
            <CalendarOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
            <div>Ver Reuniones</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            className="text-center"
            onClick={() => navigate('/admin/staff/tasks', { state: { openNew: true } })}
          >
            <PlusOutlined style={{ fontSize: 32, color: '#faad14', marginBottom: 8 }} />
            <div>Nueva Tarea</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            className="text-center"
            onClick={() => navigate('/admin/staff/meetings', { state: { openNew: true } })}
          >
            <PlusOutlined style={{ fontSize: 32, color: '#722ed1', marginBottom: 8 }} />
            <div>Nueva Reunion</div>
          </Card>
        </Col>
      </Row>

      {/* Main Statistics */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          {taskStats && (
            <StaffProgressCard
              stats={taskStats}
              title="Progreso de Tareas"
              loading={statsLoading}
            />
          )}
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Reuniones" loading={statsLoading}>
            <Row gutter={[16, 16]}>
              <Col xs={12}>
                <Statistic
                  title="Total"
                  value={stats?.meetings.total || 0}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={12}>
                <Statistic
                  title="Completadas"
                  value={stats?.meetings.completed || 0}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={12}>
                <Statistic
                  title="Programadas"
                  value={stats?.meetings.scheduled || 0}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col xs={12}>
                <Statistic
                  title="En Curso"
                  value={stats?.meetings.inProgress || 0}
                  prefix={<SyncOutlined spin />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Upcoming Meetings & Overdue Tasks */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CalendarOutlined />
                <span>Proximas Reuniones</span>
              </Space>
            }
            loading={upcomingLoading}
            extra={
              <Button type="link" onClick={() => navigate('/admin/staff/meetings')}>
                Ver Todas <RightOutlined />
              </Button>
            }
          >
            {futureMeetings.length > 0 ? (
              <List
                dataSource={futureMeetings.slice(0, 4)}
                renderItem={meeting => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/admin/staff/meetings', { state: { viewMeeting: meeting.id } })}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          style={{
                            backgroundColor: dayjs(meeting.scheduledDate).isSame(dayjs(), 'day')
                              ? '#1890ff'
                              : '#f0f0f0',
                          }}
                          icon={<CalendarOutlined />}
                        />
                      }
                      title={meeting.title}
                      description={
                        <Space>
                          <Text type="secondary">
                            {dayjs(meeting.scheduledDate).format('DD/MM/YYYY HH:mm')}
                          </Text>
                          {dayjs(meeting.scheduledDate).isSame(dayjs(), 'day') && (
                            <Tag color="blue">Hoy</Tag>
                          )}
                        </Space>
                      }
                    />
                    {meeting.attendees && (
                      <Avatar.Group maxCount={3} size="small">
                        {meeting.attendees.map(a => (
                          <Avatar key={a.id} size="small" icon={<UserOutlined />} />
                        ))}
                      </Avatar.Group>
                    )}
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No hay reuniones programadas" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                <span>Tareas Vencidas</span>
              </Space>
            }
            loading={tasksLoading}
            extra={
              <Button type="link" onClick={() => navigate('/admin/staff/tasks')}>
                Ver Todas <RightOutlined />
              </Button>
            }
          >
            {recentTasks?.data && recentTasks.data.filter(t =>
              t.dueDate && t.status !== 'completed' && dayjs(t.dueDate).isBefore(dayjs(), 'day')
            ).length > 0 ? (
              <List
                dataSource={recentTasks.data.filter(t =>
                  t.dueDate && t.status !== 'completed' && dayjs(t.dueDate).isBefore(dayjs(), 'day')
                ).slice(0, 4)}
                renderItem={task => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/admin/staff/tasks', { state: { viewTask: task.id } })}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar style={{ backgroundColor: '#ff4d4f' }} icon={<ExclamationCircleOutlined />} />
                      }
                      title={task.title}
                      description={
                        <Space>
                          <Text type="danger">
                            Vencio: {dayjs(task.dueDate).format('DD/MM/YYYY')}
                          </Text>
                          <Text type="secondary">
                            ({dayjs(task.dueDate).fromNow()})
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No hay tareas vencidas" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      {/* User Progress */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          {userProgress && (
            <StaffUserProgressCard
              userStats={userProgress}
              loading={userProgressLoading}
            />
          )}
        </Col>
      </Row>
    </div>
  );
};

export default StaffDashboardPage;
