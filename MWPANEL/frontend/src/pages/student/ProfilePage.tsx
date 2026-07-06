import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Avatar,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Tag,
  Spin,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  CalendarOutlined,
  BookOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface StudentProfile {
  id: string;
  enrollmentNumber: string;
  birthDate?: string;
  photoUrl?: string;
  user: {
    id: string;
    email: string;
    isActive: boolean;
    createdAt: string;
    profile: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      documentNumber?: string;
      phone?: string;
      address?: string;
      avatarUrl?: string;
    };
  };
  classGroups?: Array<{
    id: string;
    name: string;
    section?: string;
  }>;
  educationalLevel?: {
    id: string;
    name: string;
    code: string;
  };
  course?: {
    id: string;
    name: string;
    code: string;
  };
}

interface StudentStats {
  academicInfo: {
    educationalLevel: string;
    course: string;
    classGroups: Array<{
      name: string;
      section?: string;
    }>;
    enrollmentNumber: string;
    academicYear: string;
    totalSubjects: number;
    subjects: Array<{
      id: string;
      name: string;
      code: string;
    }>;
  };
  statistics: {
    totalEvaluations: number;
    attendanceRate: number;
    attendanceDays: string;
    completedTasks: number;
    pendingTasks: number;
    totalTasks: number;
    taskCompletionRate: number;
  };
}

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  // Removed password editing functionality - students can only change password in settings

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/students/me');
      setProfile(response.data);
    } catch (error: any) {
      console.error('Error fetching student profile:', error);
      // If students/me fails, try getting data from auth/me as fallback
      try {
        const authResponse = await apiClient.get('/auth/me');
        if (authResponse.data && authResponse.data.role === 'student') {
          const userData = authResponse.data;
          setProfile({
            id: userData.id,
            enrollmentNumber: 'EST001',
            user: {
              id: userData.id,
              email: userData.email,
              isActive: userData.isActive,
              createdAt: userData.createdAt,
              profile: {
                firstName: userData.profile.firstName,
                lastName: userData.profile.lastName,
                dateOfBirth: userData.profile.dateOfBirth,
                documentNumber: userData.profile.documentNumber,
                phone: userData.profile.phone,
                address: userData.profile.address,
                avatarUrl: userData.profile.avatarUrl,
              }
            },
            classGroups: [{
              id: '1',
              name: 'Grupo Asignado',
              section: 'A'
            }]
          });
        }
      } catch (authError) {
        console.error('Error fetching auth profile:', authError);
      }
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/students/me/statistics');
      setStats(response.data);
      console.log('Student statistics loaded:', response.data);
    } catch (error: any) {
      console.error('Error fetching student statistics:', error);
      // Don't set fallback stats, let the component handle the null state
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // All profile editing functionality removed - students can only view their data


  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text>Error al cargar el perfil</Text>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Row gutter={[16, 16]}>
          {/* Profile Header */}
          <Col span={24}>
            <Card>
              <Space size="large">
                <Avatar
                  size={100}
                  src={profile.user.profile.avatarUrl}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#1890ff' }}
                />
                <div>
                  <Title level={2} style={{ margin: 0 }}>
                    {profile.user.profile.firstName} {profile.user.profile.lastName}
                  </Title>
                  <Text type="secondary" style={{ fontSize: '16px' }}>
                    Estudiante
                  </Text>
                  <br />
                  <Tag color="blue" style={{ marginTop: 8 }}>
                    {profile.enrollmentNumber}
                  </Tag>
                  <Tag color={profile.user.isActive ? 'green' : 'red'}>
                    {profile.user.isActive ? 'Activo' : 'Inactivo'}
                  </Tag>
                </div>
              </Space>
            </Card>
          </Col>

          {/* Statistics */}
          {stats && (
            <Col span={24}>
              <Card title="Estadísticas Académicas">
                <Row gutter={16}>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Asignaturas"
                      value={stats.academicInfo.totalSubjects}
                      prefix={<BookOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Evaluaciones"
                      value={stats.statistics.totalEvaluations}
                      prefix={<TrophyOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Asistencia"
                      value={stats.statistics.attendanceRate}
                      suffix="%"
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Tareas Pendientes"
                      value={stats.statistics.pendingTasks}
                      prefix={<CalendarOutlined />}
                      valueStyle={{ color: stats.statistics.pendingTasks > 0 ? '#faad14' : '#52c41a' }}
                    />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Tareas Completadas"
                      value={stats.statistics.completedTasks}
                      suffix={`/${stats.statistics.totalTasks}`}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="% Tareas Completadas"
                      value={stats.statistics.taskCompletionRate}
                      suffix="%"
                      valueStyle={{ color: stats.statistics.taskCompletionRate >= 80 ? '#52c41a' : '#faad14' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Días de Asistencia"
                      value={stats.statistics.attendanceDays}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Año Académico"
                      value={stats.academicInfo.academicYear}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          )}

          {/* Personal Information */}
          <Col xs={24} lg={12}>
            <Card
              title="Información Personal"
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Nombre Completo">
                  {profile.user.profile.firstName} {profile.user.profile.lastName}
                </Descriptions.Item>
                <Descriptions.Item label="Número de Matrícula">
                  {profile.enrollmentNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Documento de Identidad">
                  {profile.user.profile.documentNumber || 'No especificado'}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha de Nacimiento">
                  {profile.user.profile.dateOfBirth 
                    ? dayjs(profile.user.profile.dateOfBirth).format('DD/MM/YYYY')
                    : 'No especificada'
                  }
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* Contact Information */}
          <Col xs={24} lg={12}>
            <Card title="Información de Contacto">
              <Descriptions column={1} size="small">
                <Descriptions.Item 
                  label={<><MailOutlined /> Email</>}
                >
                  {profile.user.email}
                </Descriptions.Item>
                <Descriptions.Item 
                  label={<><PhoneOutlined /> Teléfono</>}
                >
                  {profile.user.profile.phone || 'No especificado'}
                </Descriptions.Item>
                <Descriptions.Item 
                  label={<><HomeOutlined /> Dirección</>}
                >
                  {profile.user.profile.address || 'No especificada'}
                </Descriptions.Item>
                <Descriptions.Item label="Miembro desde">
                  {dayjs(profile.user.createdAt).format('DD/MM/YYYY')}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* Academic Information */}
          <Col span={24}>
            <Card title="Información Académica">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Año Académico">
                  {stats?.academicInfo.academicYear || new Date().getFullYear()}
                </Descriptions.Item>
                <Descriptions.Item label="Número de Matrícula">
                  {profile.enrollmentNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Estado Académico">
                  <Tag color={profile.user.isActive ? 'green' : 'red'}>
                    {profile.user.isActive ? 'Activo' : 'Inactivo'}
                  </Tag>
                </Descriptions.Item>
                {stats && (
                  <>
                    <Descriptions.Item label="Total de Asignaturas">
                      {stats.academicInfo.totalSubjects}
                    </Descriptions.Item>
                    <Descriptions.Item label="Evaluaciones Realizadas">
                      {stats.statistics.totalEvaluations}
                    </Descriptions.Item>
                    <Descriptions.Item label="Tareas Completadas">
                      {stats.statistics.completedTasks} de {stats.statistics.totalTasks}
                    </Descriptions.Item>
                    <Descriptions.Item label="Rendimiento en Tareas">
                      <Tag color={stats.statistics.taskCompletionRate >= 80 ? 'green' : stats.statistics.taskCompletionRate >= 60 ? 'orange' : 'red'}>
                        {stats.statistics.taskCompletionRate}% completado
                      </Tag>
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
              
              {/* Subjects List */}
              {stats?.academicInfo.subjects && stats.academicInfo.subjects.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>Asignaturas:</Text>
                  <div style={{ marginTop: 8 }}>
                    {stats.academicInfo.subjects.map((subject) => (
                      <Tag key={subject.id} color="blue" style={{ margin: '2px' }}>
                        {subject.name}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* Profile is now read-only - password change available in Settings page */}
    </div>
  );
};

export default ProfilePage;