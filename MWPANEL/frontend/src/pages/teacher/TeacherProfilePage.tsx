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
  List,
  Progress,
  Divider,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
} from 'antd';
import ProfilePhotoUploader from '../../components/profile/ProfilePhotoUploader';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BookOutlined,
  TeamOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  BarChartOutlined,
  HomeOutlined,
  IdcardOutlined,
  EditOutlined,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';
import dayjs from 'dayjs';
import SafeBadge from '@components/common/SafeBadge';

const { Title, Text } = Typography;

interface TeacherProfile {
  id: string;
  employeeNumber: string;
  department?: string;
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
    };
  };
  subjectAssignments?: Array<{
    id: string;
    subject: {
      id: string;
      name: string;
      code: string;
    };
    classGroup: {
      id: string;
      name: string;
    };
  }>;
}

interface TeacherStats {
  totalStudents: number;
  totalSubjects: number;
  totalClassGroups: number;
  averageClassGrade: number;
  completedActivities: number;
  pendingActivities: number;
  attendanceRate: number;
  totalActivitiesCreated: number;
}

interface Schedule {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: {
    name: string;
    code: string;
  };
  classGroup: {
    name: string;
  };
  classroom?: {
    name: string;
  };
}

const TeacherProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
    // Las estadísticas y horarios ahora vienen incluidos en fetchProfile
    // Solo llamar a los otros métodos si fetchProfile no los incluye
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/teachers/me');
      setProfile(response.data);
      
      // Si el endpoint incluye estadísticas, usarlas
      if (response.data.statistics) {
        setStats(response.data.statistics);
      } else {
        // No hay estadísticas - mostrar datos vacíos o reales
        setStats({
          totalStudents: 0,
          totalSubjects: 0,
          totalClassGroups: 0,
          averageClassGrade: 0,
          completedActivities: 0,
          pendingActivities: 0,
          attendanceRate: 0,
          totalActivitiesCreated: 0,
        });
      }
      
      if (response.data.schedules) {
        setSchedules(response.data.schedules);
      } else {
        // Fallback con array vacío si no vienen horarios
        setSchedules([]);
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching teacher profile:', error);
      // If teachers/me fails, try getting data from auth/me as fallback
      try {
        const authResponse = await apiClient.get('/auth/me');
        if (authResponse.data && authResponse.data.role === 'teacher') {
          const userData = authResponse.data;
          setProfile({
            id: userData.id,
            employeeNumber: 'PROF001',
            department: 'Departamento',
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
              }
            },
            subjectAssignments: []
          });
        }
      } catch (authError) {
        console.error('Error fetching auth profile:', authError);
      }
      
      // Asegurar que se cargan datos básicos y se termina el loading
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    // Ya no hacer llamada separada - los datos vienen de fetchProfile
    console.log('fetchStats: datos ya incluidos en fetchProfile');
  };

  const fetchSchedules = async () => {
    // Ya no hacer llamada separada - los datos vienen de fetchProfile
    console.log('fetchSchedules: datos ya incluidos en fetchProfile');
    setLoading(false);
  };

  const getDayName = (dayNumber: string) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[parseInt(dayNumber)] || dayNumber;
  };

  const getUniqueSubjects = () => {
    if (!profile?.subjectAssignments) return [];
    const subjects = profile.subjectAssignments.map(sa => sa.subject);
    return subjects.filter((subject, index, self) => 
      index === self.findIndex(s => s.id === subject.id)
    );
  };

  const getUniqueClassGroups = () => {
    if (!profile?.subjectAssignments) return [];
    const groups = profile.subjectAssignments.map(sa => sa.classGroup);
    return groups.filter((group, index, self) => 
      index === self.findIndex(g => g.id === group.id)
    );
  };

  const handleEditProfile = () => {
    if (profile) {
      editForm.setFieldsValue({
        firstName: profile.user.profile.firstName,
        lastName: profile.user.profile.lastName,
        email: profile.user.email,
        phone: profile.user.profile.phone,
        address: profile.user.profile.address,
        documentNumber: profile.user.profile.documentNumber,
        dateOfBirth: profile.user.profile.dateOfBirth ? dayjs(profile.user.profile.dateOfBirth) : null,
      });
      setEditModalVisible(true);
    }
  };

  const handleSaveProfile = async (values: any) => {
    try {
      setSaving(true);
      
      // Prepare data for API
      const profileData = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        address: values.address,
        documentNumber: values.documentNumber,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : null,
      };

      // Update profile via API
      await apiClient.patch('/users/profile/me', profileData);

      // Re-fetch profile data from server to ensure sync
      try {
        const response = await apiClient.get('/teachers/me');
        if (response.data) {
          setProfile(response.data);
        }
      } catch (fetchError) {
        console.warn('Could not re-fetch from teachers/me, trying auth/me:', fetchError);
        // Try auth/me as fallback
        try {
          const authResponse = await apiClient.get('/auth/me');
          if (authResponse.data) {
            const userData = authResponse.data;
            setProfile({
              ...profile!,
              user: {
                ...profile!.user,
                email: userData.email,
                profile: {
                  firstName: userData.profile.firstName,
                  lastName: userData.profile.lastName,
                  dateOfBirth: userData.profile.dateOfBirth,
                  documentNumber: userData.profile.documentNumber,
                  phone: userData.profile.phone,
                  address: userData.profile.address,
                }
              }
            });
          }
        } catch (authError) {
          console.warn('Could not re-fetch from auth/me either, using local update:', authError);
          // Final fallback: Update local state manually
          setProfile({
            ...profile!,
            user: {
              ...profile!.user,
              email: values.email,
              profile: {
                ...profile!.user.profile,
                firstName: values.firstName,
                lastName: values.lastName,
                phone: values.phone || null,
                address: values.address || null,
                documentNumber: values.documentNumber || null,
                dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : profile!.user.profile.dateOfBirth,
              }
            }
          });
        }
      }

      message.success('Perfil actualizado correctamente');
      setEditModalVisible(false);
      editForm.resetFields();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      message.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditModalVisible(false);
    editForm.resetFields();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large">
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            Cargando perfil del profesor...
          </div>
        </Spin>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text>Error al cargar el perfil del profesor</Text>
      </div>
    );
  }

  return (
    <div className="teacher-profile-page">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[16, 16]}>
          {/* Profile Header */}
          <Col span={24}>
            <Card>
              <Space size="large">
                <ProfilePhotoUploader
                  currentPhotoUrl={profile.user.profile.avatarUrl}
                  size={100}
                  showUploadButton={true}
                  showPreviewButton={true}
                  onPhotoUpdated={(newPhotoUrl) => {
                    // Update local state to reflect the new photo
                    setProfile(prev => ({
                      ...prev,
                      user: {
                        ...prev.user,
                        profile: {
                          ...prev.user.profile,
                          avatarUrl: newPhotoUrl
                        }
                      }
                    }));
                  }}
                />
                <div>
                  <Title level={2} style={{ margin: 0 }}>
                    {profile.user.profile.firstName} {profile.user.profile.lastName}
                  </Title>
                  <Text type="secondary" style={{ fontSize: '16px' }}>
                    Profesor {profile.department && `- ${profile.department}`}
                  </Text>
                  <br />
                  <Tag color="green" style={{ marginTop: 8 }}>
                    <IdcardOutlined /> {profile.employeeNumber}
                  </Tag>
                  <Tag color={profile.user.isActive ? 'blue' : 'red'}>
                    {profile.user.isActive ? 'Activo' : 'Inactivo'}
                  </Tag>
                  <Tag color="orange">
                    {getUniqueSubjects().length} Asignatura{getUniqueSubjects().length !== 1 ? 's' : ''}
                  </Tag>
                  <Tag color="purple">
                    {getUniqueClassGroups().length} Grupo{getUniqueClassGroups().length !== 1 ? 's' : ''}
                  </Tag>
                </div>
              </Space>
            </Card>
          </Col>

          {/* Teaching Statistics */}
          {stats && (
            <Col span={24}>
              <Card title="Estadísticas de Enseñanza">
                <Row gutter={16}>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Total Estudiantes"
                      value={stats.totalStudents}
                      prefix={<TeamOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Promedio de Clase"
                      value={stats.averageClassGrade}
                      precision={1}
                      prefix={<TrophyOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                      suffix="/10"
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Asistencia Media"
                      value={stats.attendanceRate}
                      suffix="%"
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Actividades Creadas"
                      value={stats.totalActivitiesCreated}
                      prefix={<BarChartOutlined />}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Col>
                </Row>
                <Divider />
                <Row gutter={16}>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Text strong>Actividades Completadas</Text>
                      <Progress 
                        type="dashboard" 
                        percent={Math.round((stats.completedActivities / (stats.completedActivities + stats.pendingActivities)) * 100)}
                        format={() => `${stats.completedActivities}/${stats.completedActivities + stats.pendingActivities}`}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Text strong>Asignaturas</Text>
                      <div style={{ fontSize: '24px', color: '#1890ff', marginTop: '10px' }}>
                        {stats.totalSubjects}
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Text strong>Grupos de Clase</Text>
                      <div style={{ fontSize: '24px', color: '#52c41a', marginTop: '10px' }}>
                        {stats.totalClassGroups}
                      </div>
                    </Card>
                  </Col>
                </Row>
              </Card>
            </Col>
          )}

          {/* Personal Information */}
          <Col xs={24} lg={12}>
            <Card 
              title="Información Personal"
              extra={
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  onClick={handleEditProfile}
                  size="small"
                >
                  Editar Perfil
                </Button>
              }
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Nombre Completo">
                  {profile.user.profile.firstName} {profile.user.profile.lastName}
                </Descriptions.Item>
                <Descriptions.Item label="Número de Empleado">
                  {profile.employeeNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Departamento">
                  {profile.department || 'No especificado'}
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

          {/* Subject Assignments */}
          <Col xs={24} lg={12}>
            <Card title="Asignaturas Asignadas" extra={<SafeBadge count={getUniqueSubjects().length} />}>
              <List
                size="small"
                dataSource={getUniqueSubjects()}
                renderItem={(subject) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<BookOutlined />} style={{ backgroundColor: '#1890ff' }} />}
                      title={subject.name}
                      description={`Código: ${subject.code}`}
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'No hay asignaturas asignadas' }}
              />
            </Card>
          </Col>

          {/* Class Groups */}
          <Col xs={24} lg={12}>
            <Card title="Grupos de Clase" extra={<SafeBadge count={getUniqueClassGroups().length} />}>
              <List
                size="small"
                dataSource={getUniqueClassGroups()}
                renderItem={(group) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<TeamOutlined />} style={{ backgroundColor: '#52c41a' }} />}
                      title={group.name}
                      description={`Estudiantes en este grupo`}
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'No hay grupos asignados' }}
              />
            </Card>
          </Col>

          {/* Weekly Schedule */}
          <Col span={24}>
            <Card title="Horario Semanal" extra={<SafeBadge count={schedules.length} />}>
              <List
                size="small"
                dataSource={schedules}
                renderItem={(schedule) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<CalendarOutlined />} style={{ backgroundColor: '#faad14' }} />}
                      title={`${getDayName(schedule.dayOfWeek)} ${schedule.startTime} - ${schedule.endTime}`}
                      description={
                        <Space wrap>
                          <Tag color="blue">{schedule.subject.name}</Tag>
                          <Tag color="green">{schedule.classGroup.name}</Tag>
                          {schedule.classroom && <Tag color="orange">{schedule.classroom.name}</Tag>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'No hay horarios programados' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        title="Editar Perfil"
        open={editModalVisible}
        onCancel={handleCancelEdit}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleSaveProfile}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="Nombre"
                rules={[
                  { required: true, message: 'Por favor ingrese el nombre' },
                  { min: 2, message: 'El nombre debe tener al menos 2 caracteres' }
                ]}
              >
                <Input placeholder="Ingrese el nombre" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Apellidos"
                rules={[
                  { required: true, message: 'Por favor ingrese los apellidos' },
                  { min: 2, message: 'Los apellidos deben tener al menos 2 caracteres' }
                ]}
              >
                <Input placeholder="Ingrese los apellidos" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label="Correo Electrónico"
            rules={[
              { required: true, message: 'Por favor ingrese el correo electrónico' },
              { type: 'email', message: 'Por favor ingrese un correo electrónico válido' }
            ]}
          >
            <Input placeholder="Ingrese el correo electrónico" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Teléfono"
                rules={[
                  { pattern: /^[+]?[\d\s\-()]+$/, message: 'Por favor ingrese un teléfono válido' }
                ]}
              >
                <Input placeholder="Ingrese el teléfono" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="documentNumber"
                label="Documento de Identidad"
              >
                <Input placeholder="Ingrese el documento de identidad" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="Dirección"
          >
            <Input placeholder="Ingrese la dirección" />
          </Form.Item>

          <Form.Item
            name="dateOfBirth"
            label="Fecha de Nacimiento"
          >
            <DatePicker 
              style={{ width: '100%' }}
              placeholder="Seleccione fecha de nacimiento"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={handleCancelEdit}>
                Cancelar
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={saving}
                icon={<EditOutlined />}
              >
                Guardar Cambios
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeacherProfilePage;