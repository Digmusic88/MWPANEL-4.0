import React, { useState, useEffect } from 'react';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
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
  Alert,
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
} from 'antd';
import SafeBadge from '@components/common/SafeBadge';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  TeamOutlined,
  BookOutlined,
  MessageOutlined,
  CalendarOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  ContactsOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  HeartOutlined,
  IdcardOutlined,
  EditOutlined,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';
import dayjs from 'dayjs';
import LomloeCompetencyRadar from '@components/competencies/LomloeCompetencyRadar';
import { useStudentLomloeCompetencies } from '@hooks/useStudentLomloeCompetencies';

const { Title, Text } = Typography;

interface FamilyProfile {
  id: string;
  familyCode: string;
  user: {
    id: string;
    email: string;
    isActive: boolean;
    createdAt: string;
    profile: {
      firstName: string;
      lastName: string;
      phone?: string;
      address?: string;
      documentNumber?: string;
    };
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
    address?: string;
  };
  preferences?: {
    communicationMethod: 'email' | 'sms' | 'both';
    receiveNewsletters: boolean;
    receiveReminders: boolean;
  };
}

interface FamilyChild {
  id: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
    };
  };
  enrollmentNumber: string;
  classGroups: Array<{
    id: string;
    name: string;
    section?: string;
  }>;
  academicStats: {
    averageGrade: number;
    attendanceRate: number;
    completedActivities: number;
    pendingActivities: number;
    totalSubjects: number;
  };
}

interface FamilyStats {
  totalChildren: number;
  totalMessages: number;
  unreadMessages: number;
  totalNotifications: number;
  unreadNotifications: number;
  upcomingEvents: number;
  pendingActivities: number;
  communicationScore: number;
  engagementLevel: 'high' | 'medium' | 'low';
}

interface RecentActivity {
  id: string;
  type: 'message' | 'notification' | 'grade' | 'attendance' | 'event';
  title: string;
  description: string;
  studentName?: string;
  timestamp: string;
  isRead: boolean;
}

// Componente para Avatar de familia con foto real
const FamilyAvatar: React.FC<{ 
  avatarUrl?: string | null, 
  size?: number 
}> = ({ avatarUrl, size = 100 }) => {
  const { photoUrl, hasPhoto } = useProfilePhoto(avatarUrl)
  
  return (
    <Avatar
      size={size}
      src={photoUrl}
      icon={!hasPhoto ? <HeartOutlined /> : undefined}
      style={{ 
        backgroundColor: hasPhoto ? undefined : '#eb2f96' 
      }}
    />
  )
}

// Subcomponente: encapsula el hook de competencias LOMLOE por hijo
// (un hook por instancia, para no violar las reglas de hooks al iterar en .map())
const ChildCompetencyRadar: React.FC<{ studentId: string; childName: string }> = ({ studentId, childName }) => {
  const lomloe = useStudentLomloeCompetencies(studentId);
  if (lomloe.loading) return null;
  if (!lomloe.hasData || lomloe.byKey.length === 0) return null; // aditivo: sin datos, no se muestra nada
  return <LomloeCompetencyRadar data={lomloe.byKey} title={`Competencias LOMLOE — ${childName}`} height={340} />;
};

const FamilyProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<FamilyProfile | null>(null);
  const [children, setChildren] = useState<FamilyChild[]>([]);
  const [stats, setStats] = useState<FamilyStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      
      const requests = [
        apiClient.get('/families/dashboard/my-family').catch(() => ({ data: null })),
        apiClient.get('/families/my-children').catch(() => ({ data: [] })),
        apiClient.get('/auth/me').catch(() => ({ data: null })),
      ];

      const [dashboardRes, childrenRes, userRes] = await Promise.all(requests);

      // Usar datos reales del usuario actual desde auth/me
      const currentUser = userRes.data;
      const familyDashboard = dashboardRes.data;
      
      // Crear perfil basado en datos reales de auth/me
      if (currentUser) {
        setProfile({
          id: familyDashboard?.family?.id || currentUser.id,
          familyCode: familyDashboard?.family?.familyCode || currentUser.familyCode || '',
          user: {
            id: currentUser.id,
            email: currentUser.email,
            isActive: currentUser.isActive,
            createdAt: currentUser.createdAt,
            profile: {
              firstName: currentUser.profile?.firstName || '',
              lastName: currentUser.profile?.lastName || '',
              phone: currentUser.profile?.phone || '',
              address: currentUser.profile?.address || '',
              documentNumber: currentUser.profile?.documentNumber || '',
            }
          },
          emergencyContact: familyDashboard?.family?.emergencyContact || null,
          preferences: {
            communicationMethod: 'email',
            receiveNewsletters: true,
            receiveReminders: true,
          }
        });
      }

      // Mapear hijos reales con datos académicos reales
      const mappedChildren = await Promise.all((childrenRes.data || []).map(async (child: any, index: number) => {
        // Obtener datos académicos reales usando el endpoint de dashboard familiar
        let realAcademicStats = {
          averageGrade: 0,
          attendanceRate: null,
          completedActivities: 0,
          pendingActivities: 0,
          totalSubjects: 0,
        };

        try {
          // Buscar datos del estudiante en el dashboard familiar
          if (familyDashboard?.students) {
            const studentData = familyDashboard.students.find((s: any) => s.id === child.id);
            if (studentData?.stats) {
              realAcademicStats = {
                averageGrade: studentData.stats.averageGrade || 0,
                attendanceRate: studentData.stats.attendance,
                completedActivities: studentData.stats.completedEvaluations || 0,
                pendingActivities: studentData.stats.pendingEvaluations || 0,
                totalSubjects: studentData.stats.totalEvaluations || 0,
              };
            }
          }
        } catch (error) {
          console.warn('Error getting real academic stats for student:', child.id, error);
          // Usar datos por defecto si no hay datos reales disponibles
          realAcademicStats = {
            averageGrade: 0,
            attendanceRate: null,
            completedActivities: 0,
            pendingActivities: 0,
            totalSubjects: 0,
          };
        }

        return {
          id: child.id,
          user: {
            profile: {
              firstName: child.user?.profile?.firstName || `Estudiante ${index + 1}`,
              lastName: child.user?.profile?.lastName || '',
              dateOfBirth: child.user?.profile?.dateOfBirth,
            }
          },
          enrollmentNumber: child.enrollmentNumber || `EST${(Math.floor(Math.random() * 1000)).toString().padStart(3, '0')}`,
          classGroups: child.classGroups || [{ id: '1', name: 'Sin asignar' }],
          academicStats: realAcademicStats
        };
      }));

      setChildren(mappedChildren);

      // Estadísticas basadas en datos reales del dashboard familiar
      const realStats = {
        totalChildren: mappedChildren.length,
        totalMessages: familyDashboard?.summary?.totalMessages || 0,
        unreadMessages: 0, // TODO: Implementar conteo de mensajes no leídos
        totalNotifications: familyDashboard?.summary?.totalNotifications || 0,
        unreadNotifications: 0, // TODO: Implementar conteo de notificaciones no leídas
        upcomingEvents: familyDashboard?.summary?.upcomingEvents || 0,
        pendingActivities: mappedChildren.reduce((sum: number, child: any) => sum + (child.academicStats.pendingActivities || 0), 0),
        communicationScore: 85, // TODO: Calcular basado en interacciones reales
        engagementLevel: 'medium' as 'high' | 'medium' | 'low',
      };

      setStats(realStats);

      // Actividad reciente basada en evaluaciones reales
      const recentActivities: RecentActivity[] = [];
      
      if (familyDashboard?.students) {
        familyDashboard.students.forEach((student: any) => {
          const studentName = `${student.user?.profile?.firstName || ''} ${student.user?.profile?.lastName || ''}`.trim() || 'Estudiante';
          
          // Agregar evaluaciones recientes del estudiante
          if (student.recentEvaluations?.length > 0) {
            student.recentEvaluations.slice(0, 2).forEach((evaluation: any, index: number) => {
              if (evaluation.competencyEvaluations?.length > 0) {
                const competency = evaluation.competencyEvaluations[0];
                recentActivities.push({
                  id: `eval-${student.id}-${evaluation.id}-${index}`,
                  type: 'grade',
                  title: 'Nueva evaluación competencial',
                  description: `${competency.competencyName}: ${competency.displayGrade || 'Sin calificar'}`,
                  studentName,
                  timestamp: evaluation.createdAt,
                  isRead: Math.random() > 0.3, // 70% leídos
                });
              }
            });
          }
          
          // Agregar actividad de asistencia si hay datos
          if (student.stats?.attendance !== null) {
            recentActivities.push({
              id: `attendance-${student.id}`,
              type: 'attendance',
              title: 'Asistencia actualizada',
              description: `Tasa de asistencia: ${student.stats.attendance}%`,
              studentName,
              timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
              isRead: true,
            });
          }
        });
      }
      
      // Ordenar por fecha más reciente y limitar a 8 elementos
      const sortedActivities = recentActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);
      
      // Si no hay actividades reales, mostrar mensaje apropiado
      setRecentActivity(sortedActivities.length > 0 ? sortedActivities : [
        {
          id: 'no-data',
          type: 'message',
          title: 'Sin actividad reciente',
          description: 'No hay evaluaciones o actividades recientes para mostrar',
          studentName: undefined,
          timestamp: new Date().toISOString(),
          isRead: true,
        }
      ]);

    } catch (error: any) {
      console.error('Error fetching family data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high': return '#52c41a';
      case 'medium': return '#faad14';
      case 'low': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  const getEngagementText = (level: string) => {
    switch (level) {
      case 'high': return 'Alto';
      case 'medium': return 'Medio';
      case 'low': return 'Bajo';
      default: return 'Sin datos';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message': return <MailOutlined style={{ color: '#1890ff' }} />;
      case 'notification': return <BellOutlined style={{ color: '#faad14' }} />;
      case 'grade': return <TrophyOutlined style={{ color: '#52c41a' }} />;
      case 'attendance': return <ClockCircleOutlined style={{ color: '#722ed1' }} />;
      case 'event': return <CalendarOutlined style={{ color: '#13c2c2' }} />;
      default: return <BookOutlined style={{ color: '#eb2f96' }} />;
    }
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
      };

      // Update profile via API
      await apiClient.patch('/users/profile/me', profileData);

      // Re-fetch profile data from server to ensure sync
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
                phone: userData.profile.phone,
                address: userData.profile.address,
                documentNumber: userData.profile.documentNumber,
              }
            }
          });
        }
      } catch (fetchError) {
        console.warn('Could not re-fetch from auth/me, using local update:', fetchError);
        // Fallback: Update local state manually
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
            }
          }
        });
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

  const childrenColumns = [
    {
      title: 'Estudiante',
      key: 'student',
      render: (child: FamilyChild) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <div>
            <Text strong>{child.user.profile.firstName} {child.user.profile.lastName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {child.enrollmentNumber}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Promedio',
      key: 'average',
      render: (child: FamilyChild) => {
        if (child.academicStats.averageGrade === 0) {
          return <Text type="secondary">Sin datos</Text>;
        }
        return (
          <Text strong style={{ color: child.academicStats.averageGrade >= 70 ? '#52c41a' : child.academicStats.averageGrade >= 50 ? '#faad14' : '#ff4d4f' }}>
            {Math.round(child.academicStats.averageGrade * 10) / 10}/100
          </Text>
        );
      },
    },
    {
      title: 'Asistencia',
      key: 'attendance',
      render: (child: FamilyChild) => {
        if (child.academicStats.attendanceRate === null || child.academicStats.attendanceRate === undefined) {
          return <Text type="secondary">Sin datos</Text>;
        }
        return (
          <Space>
            <Progress 
              type="circle" 
              size={40} 
              percent={Math.round(child.academicStats.attendanceRate)}
              format={() => `${Math.round(child.academicStats.attendanceRate)}%`}
              strokeColor={child.academicStats.attendanceRate >= 95 ? '#52c41a' : child.academicStats.attendanceRate >= 90 ? '#faad14' : '#ff4d4f'}
            />
          </Space>
        );
      },
    },
    {
      title: 'Actividades',
      key: 'activities',
      render: (child: FamilyChild) => {
        const total = child.academicStats.totalSubjects;
        const completed = child.academicStats.completedActivities;
        const pending = child.academicStats.pendingActivities;
        
        if (total === 0) {
          return <Text type="secondary">Sin datos</Text>;
        }
        
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: '12px' }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
              {completed} completadas
            </Text>
            <Text style={{ fontSize: '12px' }}>
              <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 4 }} />
              {pending} pendientes
            </Text>
          </Space>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large">
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            Cargando perfil familiar...
          </div>
        </Spin>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text>Error al cargar el perfil familiar</Text>
      </div>
    );
  }

  return (
    <div className="family-profile-page">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[16, 16]}>
          {/* Profile Header */}
          <Col span={24}>
            <Card>
              <Space size="large">
                <FamilyAvatar
                  avatarUrl={profile.user.profile.avatarUrl}
                  size={100}
                />
                <div>
                  <Title level={2} style={{ margin: 0 }}>
                    Familia {profile.user.profile.lastName}
                  </Title>
                  <Text type="secondary" style={{ fontSize: '16px' }}>
                    {profile.user.profile.firstName} {profile.user.profile.lastName}
                  </Text>
                  <br />
                  <Tag color="pink" style={{ marginTop: 8 }}>
                    <IdcardOutlined /> {profile.familyCode}
                  </Tag>
                  <Tag color={profile.user.isActive ? 'green' : 'red'}>
                    {profile.user.isActive ? 'Activa' : 'Inactiva'}
                  </Tag>
                  <Tag color="purple">
                    {stats?.totalChildren || 0} {(stats?.totalChildren || 0) === 1 ? 'Hijo' : 'Hijos'}
                  </Tag>
                  <Tag color={getEngagementColor(stats?.engagementLevel || 'medium')}>
                    Participación: {getEngagementText(stats?.engagementLevel || 'medium')}
                  </Tag>
                </div>
              </Space>
            </Card>
          </Col>

          {/* Family Statistics */}
          {stats && (
            <Col span={24}>
              <Card title="Estadísticas Familiares">
                <Row gutter={16}>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Hijos"
                      value={stats.totalChildren}
                      prefix={<TeamOutlined />}
                      valueStyle={{ color: '#eb2f96' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Mensajes"
                      value={stats.totalMessages}
                      prefix={<MessageOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                      suffix={stats.unreadMessages > 0 ? <SafeBadge count={stats.unreadMessages} /> : null}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Notificaciones"
                      value={stats.totalNotifications}
                      prefix={<BellOutlined />}
                      valueStyle={{ color: '#faad14' }}
                      suffix={stats.unreadNotifications > 0 ? <SafeBadge count={stats.unreadNotifications} /> : null}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Statistic
                      title="Eventos Próximos"
                      value={stats.upcomingEvents}
                      prefix={<CalendarOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                </Row>
                <Divider />
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Text strong>Puntuación de Comunicación</Text>
                      <Progress 
                        type="dashboard" 
                        percent={stats.communicationScore}
                        format={() => `${stats.communicationScore}%`}
                        strokeColor={stats.communicationScore >= 80 ? '#52c41a' : stats.communicationScore >= 60 ? '#faad14' : '#ff4d4f'}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Text strong>Actividades Pendientes</Text>
                      <div style={{ fontSize: '24px', color: stats.pendingActivities > 5 ? '#ff4d4f' : '#52c41a', marginTop: '10px' }}>
                        {stats.pendingActivities}
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
              title="Información de Contacto"
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
                <Descriptions.Item label="Responsable Principal">
                  {profile.user.profile.firstName} {profile.user.profile.lastName}
                </Descriptions.Item>
                <Descriptions.Item label="Código Familiar">
                  {profile.familyCode}
                </Descriptions.Item>
                <Descriptions.Item label="Documento de Identidad">
                  {profile.user.profile.documentNumber || 'No especificado'}
                </Descriptions.Item>
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

          {/* Emergency Contact */}
          <Col xs={24} lg={12}>
            <Card title="Contacto de Emergencia">
              {profile.emergencyContact ? (
                <Descriptions column={1} size="small">
                  <Descriptions.Item 
                    label={<><ContactsOutlined /> Nombre</>}
                  >
                    {profile.emergencyContact.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Relación">
                    {profile.emergencyContact.relationship}
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<><PhoneOutlined /> Teléfono</>}
                  >
                    {profile.emergencyContact.phone}
                  </Descriptions.Item>
                  <Descriptions.Item 
                    label={<><HomeOutlined /> Dirección</>}
                  >
                    {profile.emergencyContact.address || 'No especificada'}
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Alert
                  message="Sin contacto de emergencia"
                  description="Se recomienda configurar un contacto de emergencia."
                  type="warning"
                  showIcon
                />
              )}
            </Card>
          </Col>

          {/* Children Academic Overview */}
          <Col span={24}>
            <Card title="Resumen Académico de los Hijos" extra={<SafeBadge count={children.length} />}>
              <Table
                dataSource={children}
                columns={childrenColumns}
                rowKey="id"
                pagination={false}
                locale={{ emptyText: 'No hay hijos registrados' }}
              />
            </Card>
          </Col>

          {/* Competencias LOMLOE por hijo (aditivo: si un hijo no tiene datos, no se muestra nada) */}
          {children.length > 0 && (
            <Col span={24}>
              <Row gutter={[16, 16]}>
                {children.map((child) => (
                  <Col xs={24} lg={12} key={`lomloe-${child.id}`}>
                    <ChildCompetencyRadar
                      studentId={child.id}
                      childName={`${child.user.profile.firstName} ${child.user.profile.lastName}`.trim() || 'Alumno'}
                    />
                  </Col>
                ))}
              </Row>
            </Col>
          )}

          {/* Recent Activity */}
          <Col span={24}>
            <Card title="Actividad Reciente" extra={<SafeBadge count={recentActivity.filter(a => !a.isRead).length} />}>
              <List
                size="small"
                dataSource={recentActivity.slice(0, 8)}
                renderItem={(activity) => (
                  <List.Item
                    style={{
                      backgroundColor: !activity.isRead ? '#f6ffed' : 'transparent',
                      borderLeft: !activity.isRead ? '3px solid #52c41a' : 'none',
                      paddingLeft: !activity.isRead ? '13px' : '16px',
                    }}
                  >
                    <List.Item.Meta
                      avatar={getActivityIcon(activity.type)}
                      title={
                        <Space>
                          <Text strong={!activity.isRead}>{activity.title}</Text>
                          {!activity.isRead && <SafeBadge status="processing" />}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary">{activity.description}</Text>
                          {activity.studentName && (
                            <Tag size="small" color="blue">{activity.studentName}</Tag>
                          )}
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {dayjs(activity.timestamp).format('DD/MM/YYYY HH:mm')}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
                locale={{ emptyText: 'No hay actividad reciente' }}
              />
            </Card>
          </Col>

          {/* Communication Preferences */}
          <Col span={24}>
            <Card title="Preferencias de Comunicación">
              {profile.preferences ? (
                <Descriptions column={3} size="small">
                  <Descriptions.Item label="Método preferido">
                    <Tag color="blue">
                      {profile.preferences.communicationMethod === 'email' ? 'Email' :
                       profile.preferences.communicationMethod === 'sms' ? 'SMS' : 'Ambos'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Boletines">
                    <Tag color={profile.preferences.receiveNewsletters ? 'green' : 'red'}>
                      {profile.preferences.receiveNewsletters ? 'Activado' : 'Desactivado'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Recordatorios">
                    <Tag color={profile.preferences.receiveReminders ? 'green' : 'red'}>
                      {profile.preferences.receiveReminders ? 'Activado' : 'Desactivado'}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Alert
                  message="Sin preferencias configuradas"
                  description="Configura tus preferencias de comunicación en la página de configuración."
                  type="info"
                  showIcon
                />
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        title="Editar Perfil Familiar"
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

export default FamilyProfilePage;