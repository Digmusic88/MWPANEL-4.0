import React, { useState, useEffect } from 'react';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import {
  Card,
  Row,
  Col,
  Typography,
  Avatar,
  Badge,
  Tag,
  Space,
  Button,
  Statistic,
  Progress,
  Alert,
  Tabs,
  List,
  Modal,
  Spin,
  message,
  Tooltip,
  Drawer,
} from 'antd';
import {
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  PlusOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  CarOutlined,
  FileTextOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { useResponsive } from '../../hooks/useResponsive';
import apiClient from '@services/apiClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  user: {
    id: string;
    email: string;
    profile: {
      avatar?: string;
      phone?: string;
    };
  };
  academicInfo: {
    currentAverage: number;
    attendanceRate: number;
    pendingTasks: number;
    totalTasks: number;
    alerts: Alert[];
  };
  medicalInfo?: {
    allergies: string[];
    medications: string[];
    emergencyContact: string;
  };
  transportInfo?: {
    busRoute?: string;
    hasLunch: boolean;
    pickupPerson: string;
  };
}

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  description: string;
  date: string;
  isRead: boolean;
}

interface Authorization {
  id: string;
  childId: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'signed' | 'expired';
  type: 'trip' | 'medical' | 'early_departure' | 'activity';
}

// Componente para Avatar de hijo con foto real
const ChildAvatar: React.FC<{ 
  avatarUrl?: string | null, 
  size?: number 
}> = ({ avatarUrl, size = 80 }) => {
  const { photoUrl, hasPhoto } = useProfilePhoto(avatarUrl)
  
  return (
    <Avatar 
      size={size} 
      src={photoUrl}
      icon={!hasPhoto ? <UserOutlined /> : undefined}
      style={{ 
        backgroundColor: hasPhoto ? undefined : '#fff', 
        color: hasPhoto ? undefined : '#667eea',
        marginBottom: 12 
      }} 
    />
  )
}

const MyChildrenPage: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('academic');
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  
  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    fetchChildren();
    fetchAuthorizations();
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      
      // Usar endpoint principal de dashboard familiar que incluye toda la información
      const response = await apiClient.get('/families/dashboard/my-family');
      const dashboardData = response.data;
      
      // Transformar datos de la API a la estructura esperada
      const apiStudents = dashboardData.students || [];
      const transformedChildren: Child[] = apiStudents.map((student: any) => {
        return {
          id: student.id,
          firstName: student.user.profile.firstName,
          lastName: student.user.profile.lastName,
          birthDate: student.user.profile.birthDate || dayjs().subtract(12, 'years').toISOString(),
          user: {
            id: student.user.id,
            email: student.user.email,
            profile: {
              avatar: student.user.profile.avatarUrl || '',
              phone: student.user.profile.phone || '',
            },
          },
          academicInfo: {
            currentAverage: student.stats.averageGrade || 0,
            attendanceRate: student.stats.attendance || 0,
            pendingTasks: student.stats.pendingEvaluations || 0,
            totalTasks: student.stats.totalEvaluations || 0,
            alerts: student.recentEvaluations?.slice(0, 3).map((evaluation: any, index: number) => ({
              id: `alert-${student.id}-${index}`,
              type: 'info' as const,
              title: `Evaluación: ${evaluation.period}`,
              description: `Última evaluación registrada`,
              date: evaluation.createdAt,
              isRead: false,
            })) || []
          },
          medicalInfo: student.medicalInfo || {
            allergies: [],
            medications: [],
            emergencyContact: '',
          },
          transportInfo: student.transportInfo || {
            busRoute: undefined,
            hasLunch: false,
            pickupPerson: 'Sin especificar',
          },
        };
      });

      setChildren(transformedChildren);
    } catch (error) {
      console.error('Error fetching children:', error);
      message.error('Error al cargar información de los hijos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthorizations = async () => {
    try {
      // El backend actualmente solo tiene sistema de autorizaciones de asistencia
      // Intentar obtener solicitudes de asistencia como autorizaciones
      const response = await apiClient.get('/attendance/requests/my-requests');
      const attendanceRequests = response.data || [];
      
      // Transformar solicitudes de asistencia a formato de autorizaciones
      const transformedAuthorizations: Authorization[] = attendanceRequests.map((request: any) => ({
        id: request.id,
        childId: request.studentId,
        title: request.type === 'EARLY_DEPARTURE' ? 'Salida Anticipada' : 
               request.type === 'LATE_ARRIVAL' ? 'Llegada Tardía' : 'Justificación de Ausencia',
        description: request.reason || 'Solicitud de autorización de asistencia',
        dueDate: request.requestDate,
        status: request.status.toLowerCase(), // PENDING -> pending, APPROVED -> approved
        type: request.type.toLowerCase().replace('_', '_') === 'early_departure' ? 'early_departure' : 'attendance',
      }));

      setAuthorizations(transformedAuthorizations);
    } catch (error) {
      console.error('Error fetching authorizations:', error);
      // Si no hay solicitudes de asistencia, mostrar lista vacía
      setAuthorizations([]);
    }
  };

  const getChildAge = (birthDate: string) => {
    return dayjs().diff(dayjs(birthDate), 'year');
  };


  const handleChildClick = (child: Child) => {
    setSelectedChild(child);
    setDetailVisible(true);
    setActiveTab('academic');
  };

  const handleSignAuthorization = async (authId: string) => {
    try {
      // Actualmente el sistema de autorizaciones está basado en solicitudes de asistencia
      // En el futuro se implementará un sistema completo de autorizaciones
      
      // Por ahora, mostrar mensaje informativo
      message.info('Sistema de autorizaciones en desarrollo. Las solicitudes de asistencia se gestionan en la sección de Asistencia.');
      
      /* Futuro endpoint cuando se implemente:
      await apiClient.post(`/families/authorizations/${authId}/sign`);
      
      setAuthorizations(prev => 
        prev.map(auth => 
          auth.id === authId ? { ...auth, status: 'signed' as const } : auth
        )
      );
      message.success('Autorización firmada exitosamente');
      */
    } catch (error) {
      console.error('Error signing authorization:', error);
      message.error('Error al procesar la autorización');
    }
  };

  const getChildAuthorizations = (childId: string) => {
    return authorizations.filter(auth => auth.childId === childId);
  };

  const getTotalPendingAuthorizations = () => {
    return authorizations.filter(auth => auth.status === 'pending').length;
  };

  const renderChildCard = (child: Child) => (
    <Card
      key={child.id}
      hoverable
      className="child-card"
      onClick={() => handleChildClick(child)}
      bodyStyle={{ padding: isMobile ? '12px' : '24px' }}
      cover={
        <div style={{
          padding: isMobile ? '12px' : '20px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <ChildAvatar
            avatarUrl={child.user?.profile?.avatar}
            size={isMobile ? 50 : 80}
          />
          <div>
            <Title level={isMobile ? 5 : 4} style={{ color: 'white', margin: 0 }}>
              {child.firstName}
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '12px' : '14px' }}>
              {getChildAge(child.birthDate)} años
            </Text>
          </div>
        </div>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size={isMobile ? 'small' : 'middle'}>
        <div>
          <Row gutter={isMobile ? 8 : 16}>
            <Col span={12}>
              <Statistic
                title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Progreso</span>}
                value={child.academicInfo.currentAverage}
                precision={1}
                suffix="/ 10"
                valueStyle={{
                  fontSize: isMobile ? '14px' : '16px',
                  color: '#1890ff'
                }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Asistencia</span>}
                value={child.academicInfo.attendanceRate}
                suffix="%"
                valueStyle={{
                  fontSize: isMobile ? '14px' : '16px',
                  color: '#52c41a'
                }}
              />
            </Col>
          </Row>
        </div>

        <div>
          {child.academicInfo.pendingTasks > 0 ? (
            <Badge
              status="processing"
              text={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>{`${child.academicInfo.pendingTasks} pendiente(s)`}</span>}
            />
          ) : (
            <Badge
              status="success"
              text={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Al día</span>}
            />
          )}
        </div>

        {child.academicInfo.alerts.length > 0 && (
          <Alert
            type={child.academicInfo.alerts[0].type}
            message={child.academicInfo.alerts[0].title}
            showIcon
            style={{ fontSize: isMobile ? '11px' : '14px' }}
          />
        )}

        <Button
          type="primary"
          icon={<EyeOutlined />}
          block
          size={isMobile ? 'middle' : 'large'}
          style={{
            height: isMobile ? '36px' : '44px',
            borderRadius: '8px',
            fontSize: isMobile ? '13px' : '15px',
            fontWeight: '500',
            marginTop: isMobile ? '4px' : '8px'
          }}
        >
          Ver Detalles
        </Button>
      </Space>
    </Card>
  );

  const renderAcademicTab = (child: Child) => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
        <Col xs={12} sm={8}>
          <Card size="small" bodyStyle={{ padding: isMobile ? '10px' : '16px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Promedio</span>}
              value={child.academicInfo.currentAverage}
              precision={1}
              suffix="/ 10"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: isMobile ? '16px' : '20px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small" bodyStyle={{ padding: isMobile ? '10px' : '16px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Asistencia</span>}
              value={child.academicInfo.attendanceRate}
              suffix="%"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: isMobile ? '16px' : '20px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" bodyStyle={{ padding: isMobile ? '10px' : '16px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Completadas</span>}
              value={child.academicInfo.totalTasks - child.academicInfo.pendingTasks}
              suffix={`/ ${child.academicInfo.totalTasks}`}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1', fontSize: isMobile ? '16px' : '20px' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title={<span style={{ fontSize: isMobile ? '13px' : '16px' }}>Progreso de Tareas</span>} size="small" bodyStyle={{ padding: isMobile ? '10px' : '16px' }}>
        <Progress
          percent={Math.round(((child.academicInfo.totalTasks - child.academicInfo.pendingTasks) / child.academicInfo.totalTasks) * 100)}
          status={child.academicInfo.pendingTasks === 0 ? 'success' : 'active'}
          strokeColor={child.academicInfo.pendingTasks === 0 ? '#52c41a' : '#1890ff'}
          size={isMobile ? 'small' : 'default'}
        />
        <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '14px' }}>
          {child.academicInfo.totalTasks - child.academicInfo.pendingTasks} de {child.academicInfo.totalTasks} tareas completadas
        </Text>
      </Card>

      {child.academicInfo.alerts.length > 0 && (
        <Card title={<span style={{ fontSize: isMobile ? '13px' : '16px' }}>Alertas Académicas</span>} size="small" bodyStyle={{ padding: isMobile ? '8px' : '16px' }}>
          <List
            dataSource={child.academicInfo.alerts}
            renderItem={(alert) => (
              <List.Item style={{ padding: isMobile ? '8px 0' : '12px 0' }}>
                <Alert
                  type={alert.type}
                  message={alert.title}
                  description={!isMobile ? alert.description : undefined}
                  showIcon
                  style={{ width: '100%', fontSize: isMobile ? '12px' : '14px' }}
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </Space>
  );

  const renderMedicalTab = (child: Child) => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card title="Información Médica" size="small">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Text strong>Alergias:</Text>
            <div style={{ marginTop: 8 }}>
              {child.medicalInfo?.allergies?.length ? (
                child.medicalInfo.allergies.map((allergy, index) => (
                  <Tag key={index} color="red">{allergy}</Tag>
                ))
              ) : (
                <Text type="secondary">Sin alergias conocidas</Text>
              )}
            </div>
          </Col>
          <Col span={24}>
            <Text strong>Medicación:</Text>
            <div style={{ marginTop: 8 }}>
              {child.medicalInfo?.medications?.length ? (
                child.medicalInfo.medications.map((medication, index) => (
                  <Tag key={index} color="blue">{medication}</Tag>
                ))
              ) : (
                <Text type="secondary">Sin medicación regular</Text>
              )}
            </div>
          </Col>
          <Col span={24}>
            <Text strong>Contacto de Emergencia:</Text>
            <div style={{ marginTop: 8 }}>
              <Text>{child.medicalInfo?.emergencyContact || 'No especificado'}</Text>
            </div>
          </Col>
        </Row>
      </Card>
    </Space>
  );

  const renderTransportTab = (child: Child) => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card title="Transporte y Comedor" size="small">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Space>
              <CarOutlined />
              <Text strong>Ruta de Autobús:</Text>
              <Text>{child.transportInfo?.busRoute || 'Transporte propio'}</Text>
            </Space>
          </Col>
          <Col span={24}>
            <Space>
              <HeartOutlined />
              <Text strong>Comedor:</Text>
              <Tag color={child.transportInfo?.hasLunch ? 'green' : 'red'}>
                {child.transportInfo?.hasLunch ? 'Sí' : 'No'}
              </Tag>
            </Space>
          </Col>
          <Col span={24}>
            <Space>
              <UserOutlined />
              <Text strong>Persona Autorizada para Recoger:</Text>
              <Text>{child.transportInfo?.pickupPerson || 'No especificado'}</Text>
            </Space>
          </Col>
        </Row>
      </Card>
    </Space>
  );

  const renderAuthorizationsTab = (child: Child) => {
    const childAuths = getChildAuthorizations(child.id);
    
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card title="Autorizaciones Pendientes" size="small">
          {childAuths.length > 0 ? (
            <List
              dataSource={childAuths}
              renderItem={(auth) => (
                <List.Item
                  actions={auth.status === 'pending' ? [
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={() => handleSignAuthorization(auth.id)}
                    >
                      Firmar
                    </Button>
                  ] : [
                    <Tag color="green">Firmada</Tag>
                  ]}
                >
                  <List.Item.Meta
                    title={auth.title}
                    description={
                      <Space direction="vertical" size="small">
                        <Text>{auth.description}</Text>
                        <Text type="secondary">
                          Vence: {dayjs(auth.dueDate).format('DD/MM/YYYY')}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary">No hay autorizaciones pendientes</Text>
          )}
        </Card>
      </Space>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '12px' : '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <Title level={isMobile ? 3 : 2} style={{ marginBottom: 4 }}>
          👨‍👩‍👧‍👦 Mis Hijos ({children.length})
        </Title>
        <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
          {isMobile ? 'Progreso de cada hijo' : 'Seguimiento respetuoso del progreso individual de cada hijo'}
        </Text>
      </div>

      {/* Resumen General de la Familia */}
      <Row gutter={[isMobile ? 8 : 12, isMobile ? 8 : 12]} style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
          >
            <Statistic
              title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Total Hijos</span>}
              value={children.length}
              valueStyle={{
                color: '#1890ff',
                fontSize: isMobile ? '18px' : '24px'
              }}
              prefix={<UserOutlined style={{ fontSize: isMobile ? '14px' : '16px' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
          >
            <Statistic
              title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>{isMobile ? 'Pendientes' : 'Tareas Pendientes'}</span>}
              value={children.reduce((acc, child) => acc + child.academicInfo.pendingTasks, 0)}
              valueStyle={{
                color: '#faad14',
                fontSize: isMobile ? '18px' : '24px'
              }}
              prefix={<FileTextOutlined style={{ fontSize: isMobile ? '14px' : '16px' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
          >
            <Statistic
              title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Alertas</span>}
              value={children.reduce((acc, child) => acc + child.academicInfo.alerts.length, 0)}
              valueStyle={{
                color: '#ff4d4f',
                fontSize: isMobile ? '18px' : '24px'
              }}
              prefix={<BellOutlined style={{ fontSize: isMobile ? '14px' : '16px' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
          >
            <Statistic
              title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>{isMobile ? 'Autoriz.' : 'Autorizaciones'}</span>}
              value={getTotalPendingAuthorizations()}
              valueStyle={{
                color: '#722ed1',
                fontSize: isMobile ? '18px' : '24px'
              }}
              prefix={<FormOutlined style={{ fontSize: isMobile ? '14px' : '16px' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Vista Individual de Cada Hijo */}
      <Title level={isMobile ? 5 : 4} style={{ marginBottom: isMobile ? '8px' : '16px' }}>
        👨‍👩‍👧‍👦 Seguimiento Individual
      </Title>
      {!isMobile && (
        <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
          Cada hijo tiene su propio ritmo y progreso único. Aquí puedes ver el desarrollo individual de cada uno.
        </Text>
      )}

      {/* Children Grid */}
      <Row gutter={[isMobile ? 8 : 12, isMobile ? 8 : 16]}>
        {children.map((child) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={child.id}>
            {renderChildCard(child)}
          </Col>
        ))}
      </Row>

      {/* Child Detail Modal/Drawer */}
      {isMobile || isTablet ? (
        <Drawer
          title={selectedChild ? `${selectedChild.firstName} ${selectedChild.lastName}` : ''}
          placement="right"
          onClose={() => setDetailVisible(false)}
          open={detailVisible}
          width="100%"
          styles={{ body: { padding: '12px' } }}
        >
          {selectedChild && (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="small"
              tabBarStyle={{ marginBottom: 12 }}
              items={[
                { key: 'academic', label: 'Académico', icon: <BookOutlined />, children: renderAcademicTab(selectedChild) },
                { key: 'medical', label: 'Médico', icon: <HeartOutlined />, children: renderMedicalTab(selectedChild) },
                { key: 'transport', label: 'Transp.', icon: <CarOutlined />, children: renderTransportTab(selectedChild) },
                { key: 'authorizations', label: 'Autoriz.', icon: <FileTextOutlined />, children: renderAuthorizationsTab(selectedChild) },
              ]}
            />
          )}
        </Drawer>
      ) : (
        <Modal
          title={selectedChild ? `${selectedChild.firstName} ${selectedChild.lastName}` : ''}
          open={detailVisible}
          onCancel={() => setDetailVisible(false)}
          width={800}
          footer={null}
        >
          {selectedChild && (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                { key: 'academic', label: 'Académico', icon: <BookOutlined />, children: renderAcademicTab(selectedChild) },
                { key: 'medical', label: 'Médico', icon: <HeartOutlined />, children: renderMedicalTab(selectedChild) },
                { key: 'transport', label: 'Transporte', icon: <CarOutlined />, children: renderTransportTab(selectedChild) },
                { key: 'authorizations', label: 'Autorizaciones', icon: <FileTextOutlined />, children: renderAuthorizationsTab(selectedChild) },
              ]}
            />
          )}
        </Modal>
      )}
    </div>
  );
};

export default MyChildrenPage;