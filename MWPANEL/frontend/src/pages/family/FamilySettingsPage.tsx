import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Typography,
  Space,
  Divider,
  Alert,
  Switch,
  Select,
  Tabs,
  Row,
  Col,
  Checkbox,
  List,
  Avatar,
  Tag,
  Table,
} from 'antd';
import {
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  InfoCircleOutlined,
  SettingOutlined,
  BellOutlined,
  MessageOutlined,
  UserOutlined,
  ContactsOutlined,
  SafetyCertificateOutlined,
  HeartOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  grades: boolean;
  attendance: boolean;
  assignments: boolean;
  teacherMessages: boolean;
  schoolAnnouncements: boolean;
  events: boolean;
  emergencyAlerts: boolean;
  reminderTime: string;
  digestFrequency: 'immediate' | 'daily' | 'weekly';
}

interface CommunicationPreferences {
  preferredMethod: 'email' | 'sms' | 'app' | 'phone';
  allowTeacherDirectContact: boolean;
  allowAdminContact: boolean;
  receiveNewsletters: boolean;
  receiveEventInvitations: boolean;
  language: 'es' | 'en' | 'ca';
}

interface ChildPermissions {
  studentId: string;
  studentName: string;
  permissions: {
    viewGrades: boolean;
    viewAttendance: boolean;
    viewAssignments: boolean;
    receiveNotifications: boolean;
    allowTeacherContact: boolean;
    shareAcademicInfo: boolean;
  };
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  alternativePhone?: string;
  email?: string;
  address?: string;
  isAuthorizedPickup: boolean;
  notes?: string;
}

interface PrivacySettings {
  shareContactWithOtherParents: boolean;
  allowPhotoSharing: boolean;
  allowDataForResearch: boolean;
  marketingCommunications: boolean;
  thirdPartySharing: boolean;
}

const FamilySettingsPage: React.FC = () => {
  const [passwordForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [communicationForm] = Form.useForm();
  const [emergencyForm] = Form.useForm();
  const [privacyForm] = Form.useForm();
  
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [children, setChildren] = useState<ChildPermissions[]>([]);
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    enableEmailNotifications: true,
    enableSmsNotifications: false,
    grades: true,
    attendance: true,
    assignments: true,
    teacherMessages: true,
    schoolAnnouncements: true,
    events: true,
    emergencyAlerts: true,
    reminderTime: '15',
    digestFrequency: 'daily',
  });

  const [communication, setCommunication] = useState<CommunicationPreferences>({
    preferredMethod: 'email',
    allowTeacherDirectContact: true,
    allowAdminContact: true,
    receiveNewsletters: true,
    receiveEventInvitations: true,
    language: 'es',
  });

  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    name: '',
    relationship: '',
    phone: '',
    isAuthorizedPickup: false,
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    shareContactWithOtherParents: false,
    allowPhotoSharing: true,
    allowDataForResearch: false,
    marketingCommunications: false,
    thirdPartySharing: false,
  });

  useEffect(() => {
    loadSettings();
    loadChildren();
  }, []);

  const loadSettings = async () => {
    try {
      // Usar valores por defecto - en implementación real estos vendrían de la BD
      notificationForm.setFieldsValue(notifications);
      communicationForm.setFieldsValue(communication);
      emergencyForm.setFieldsValue(emergencyContact);
      privacyForm.setFieldsValue(privacy);
    } catch (error: any) {
      console.error('Error loading family settings:', error);
    }
  };

  const loadChildren = async () => {
    try {
      const response = await apiClient.get('/families/my-children');
      const childrenData = response.data || [];
      
      const mappedChildren: ChildPermissions[] = childrenData.map((child: any) => ({
        studentId: child.id,
        studentName: `${child.user?.profile?.firstName || ''} ${child.user?.profile?.lastName || ''}`.trim(),
        permissions: {
          viewGrades: true,
          viewAttendance: true,
          viewAssignments: true,
          receiveNotifications: true,
          allowTeacherContact: true,
          shareAcademicInfo: true,
        }
      }));
      
      setChildren(mappedChildren);
    } catch (error: any) {
      console.error('Error loading children:', error);
      setChildren([]);
    }
  };

  const handleChangePassword = async (values: ChangePasswordForm) => {
    try {
      setPasswordLoading(true);
      
      await apiClient.patch('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      
      message.success('Contraseña cambiada exitosamente');
      passwordForm.resetFields();
    } catch (error: any) {
      console.error('Error changing password:', error);
      message.error(error.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveNotifications = async (values: any) => {
    try {
      setNotifications(values);
      message.success('Preferencias de notificaciones guardadas');
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      message.error('Error al guardar las preferencias de notificaciones');
    }
  };

  const handleSaveCommunication = async (values: any) => {
    try {
      setCommunication(values);
      message.success('Preferencias de comunicación guardadas');
    } catch (error: any) {
      console.error('Error saving communication preferences:', error);
      message.error('Error al guardar las preferencias de comunicación');
    }
  };

  const handleSaveEmergencyContact = async (values: any) => {
    try {
      setEmergencyContact(values);
      message.success('Contacto de emergencia guardado');
    } catch (error: any) {
      console.error('Error saving emergency contact:', error);
      message.error('Error al guardar el contacto de emergencia');
    }
  };

  const handleSavePrivacy = async (values: any) => {
    try {
      setPrivacy(values);
      message.success('Configuración de privacidad guardada');
    } catch (error: any) {
      console.error('Error saving privacy settings:', error);
      message.error('Error al guardar la configuración de privacidad');
    }
  };

  const handleChildPermissionsChange = async (studentId: string, permissions: any) => {
    try {
      setChildren(prev => prev.map(child => 
        child.studentId === studentId 
          ? { ...child, permissions }
          : child
      ));
      
      message.success('Permisos del estudiante actualizados');
    } catch (error: any) {
      console.error('Error updating child permissions:', error);
      message.error('Error al actualizar los permisos del estudiante');
    }
  };

  const validatePassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('La nueva contraseña es obligatoria'));
    }

    const hasLowerCase = /[a-z]/.test(value);
    const hasUpperCase = /[A-Z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[@$!%*?&]/.test(value);
    const hasMinLength = value.length >= 8;

    if (!hasMinLength) return Promise.reject(new Error('La contraseña debe tener al menos 8 caracteres'));
    if (!hasLowerCase) return Promise.reject(new Error('La contraseña debe contener al menos una letra minúscula'));
    if (!hasUpperCase) return Promise.reject(new Error('La contraseña debe contener al menos una letra mayúscula'));
    if (!hasNumbers) return Promise.reject(new Error('La contraseña debe contener al menos un número'));
    if (!hasSpecialChar) return Promise.reject(new Error('La contraseña debe contener al menos un carácter especial (@$!%*?&)'));

    return Promise.resolve();
  };

  const validateConfirmPassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Confirma tu nueva contraseña'));
    }
    const newPassword = passwordForm.getFieldValue('newPassword');
    if (value !== newPassword) {
      return Promise.reject(new Error('Las contraseñas no coinciden'));
    }
    return Promise.resolve();
  };

  const childPermissionsColumns = [
    {
      title: 'Estudiante',
      key: 'student',
      render: (child: ChildPermissions) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <Text strong>{child.studentName}</Text>
        </Space>
      ),
    },
    {
      title: 'Ver Calificaciones',
      key: 'viewGrades',
      render: (child: ChildPermissions) => (
        <Switch
          checked={child.permissions.viewGrades}
          onChange={(checked) => handleChildPermissionsChange(child.studentId, { ...child.permissions, viewGrades: checked })}
        />
      ),
    },
    {
      title: 'Ver Asistencia',
      key: 'viewAttendance',
      render: (child: ChildPermissions) => (
        <Switch
          checked={child.permissions.viewAttendance}
          onChange={(checked) => handleChildPermissionsChange(child.studentId, { ...child.permissions, viewAttendance: checked })}
        />
      ),
    },
    {
      title: 'Ver Tareas',
      key: 'viewAssignments',
      render: (child: ChildPermissions) => (
        <Switch
          checked={child.permissions.viewAssignments}
          onChange={(checked) => handleChildPermissionsChange(child.studentId, { ...child.permissions, viewAssignments: checked })}
        />
      ),
    },
    {
      title: 'Notificaciones',
      key: 'receiveNotifications',
      render: (child: ChildPermissions) => (
        <Switch
          checked={child.permissions.receiveNotifications}
          onChange={(checked) => handleChildPermissionsChange(child.studentId, { ...child.permissions, receiveNotifications: checked })}
        />
      ),
    },
  ];

  const tabItems = [
    {
      key: 'security',
      label: (
        <span>
          <LockOutlined />
          Seguridad
        </span>
      ),
      children: (
        <Card>
          <Title level={4}>Cambiar Contraseña</Title>
          <Alert
            message="Requisitos de contraseña"
            description={
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Al menos 8 caracteres</li>
                <li>Al menos una letra minúscula</li>
                <li>Al menos una letra mayúscula</li>
                <li>Al menos un número</li>
                <li>Al menos un carácter especial (@$!%*?&)</li>
              </ul>
            }
            type="info"
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 24 }}
          />

          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
            autoComplete="off"
          >
            <Form.Item
              name="currentPassword"
              label="Contraseña Actual"
              rules={[{ required: true, message: 'Por favor ingresa tu contraseña actual' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Ingresa tu contraseña actual"
                iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="newPassword"
                  label="Nueva Contraseña"
                  rules={[{ validator: validatePassword }]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Ingresa tu nueva contraseña"
                    iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="confirmPassword"
                  label="Confirmar Nueva Contraseña"
                  rules={[{ validator: validateConfirmPassword }]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Confirma tu nueva contraseña"
                    iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={passwordLoading}
                size="large"
              >
                Cambiar Contraseña
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined />
          Notificaciones
        </span>
      ),
      children: (
        <Card title="Configuración de Notificaciones">
          <Form
            form={notificationForm}
            layout="vertical"
            onFinish={handleSaveNotifications}
            initialValues={notifications}
          >
            <Row gutter={16}>
              <Col span={24}>
                <Divider orientation="left">Métodos de Notificación</Divider>
                <Form.Item name="enableEmailNotifications" valuePropName="checked">
                  <Checkbox>Notificaciones por email</Checkbox>
                </Form.Item>
                <Form.Item name="enableSmsNotifications" valuePropName="checked">
                  <Checkbox>Notificaciones por SMS</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Divider orientation="left">Tipos de Notificaciones</Divider>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="grades" valuePropName="checked">
                      <Checkbox>Nuevas calificaciones</Checkbox>
                    </Form.Item>
                    <Form.Item name="attendance" valuePropName="checked">
                      <Checkbox>Asistencia y faltas</Checkbox>
                    </Form.Item>
                    <Form.Item name="assignments" valuePropName="checked">
                      <Checkbox>Tareas y deberes</Checkbox>
                    </Form.Item>
                    <Form.Item name="teacherMessages" valuePropName="checked">
                      <Checkbox>Mensajes de profesores</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="schoolAnnouncements" valuePropName="checked">
                      <Checkbox>Comunicados del centro</Checkbox>
                    </Form.Item>
                    <Form.Item name="events" valuePropName="checked">
                      <Checkbox>Eventos y actividades</Checkbox>
                    </Form.Item>
                    <Form.Item name="emergencyAlerts" valuePropName="checked">
                      <Checkbox>Alertas de emergencia</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="reminderTime" label="Recordatorio antes de eventos (minutos)">
                  <Select>
                    <Option value="5">5 minutos</Option>
                    <Option value="15">15 minutos</Option>
                    <Option value="30">30 minutos</Option>
                    <Option value="60">1 hora</Option>
                    <Option value="120">2 horas</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="digestFrequency" label="Frecuencia de resumen">
                  <Select>
                    <Option value="immediate">Inmediato</Option>
                    <Option value="daily">Resumen diario</Option>
                    <Option value="weekly">Resumen semanal</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Button type="primary" htmlType="submit" size="large">
                Guardar Preferencias de Notificación
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'communication',
      label: (
        <span>
          <MessageOutlined />
          Comunicación
        </span>
      ),
      children: (
        <Card title="Preferencias de Comunicación">
          <Form
            form={communicationForm}
            layout="vertical"
            onFinish={handleSaveCommunication}
            initialValues={communication}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="preferredMethod" label="Método preferido de comunicación">
                  <Select>
                    <Option value="email">Email</Option>
                    <Option value="sms">SMS</Option>
                    <Option value="app">Aplicación</Option>
                    <Option value="phone">Teléfono</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="language" label="Idioma">
                  <Select>
                    <Option value="es">Español</Option>
                    <Option value="en">English</Option>
                    <Option value="ca">Català</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Permisos de Contacto</Divider>
            <Form.Item name="allowTeacherDirectContact" valuePropName="checked">
              <Checkbox>Permitir contacto directo de profesores</Checkbox>
            </Form.Item>
            <Form.Item name="allowAdminContact" valuePropName="checked">
              <Checkbox>Permitir contacto de administración</Checkbox>
            </Form.Item>
            <Form.Item name="receiveNewsletters" valuePropName="checked">
              <Checkbox>Recibir boletines informativos</Checkbox>
            </Form.Item>
            <Form.Item name="receiveEventInvitations" valuePropName="checked">
              <Checkbox>Recibir invitaciones a eventos</Checkbox>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" size="large">
                Guardar Preferencias de Comunicación
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'children',
      label: (
        <span>
          <UserOutlined />
          Permisos por Hijo
        </span>
      ),
      children: (
        <Card title="Configuración de Permisos por Estudiante">
          <Alert
            message="Gestión de Permisos"
            description="Configura qué información puedes ver de cada uno de tus hijos y qué notificaciones recibir."
            type="info"
            style={{ marginBottom: 24 }}
          />
          
          <Table
            dataSource={children}
            columns={childPermissionsColumns}
            rowKey="studentId"
            pagination={false}
            locale={{ emptyText: 'No hay estudiantes vinculados' }}
          />
        </Card>
      ),
    },
    {
      key: 'emergency',
      label: (
        <span>
          <ContactsOutlined />
          Contacto Emergencia
        </span>
      ),
      children: (
        <Card title="Contacto de Emergencia">
          <Form
            form={emergencyForm}
            layout="vertical"
            onFinish={handleSaveEmergencyContact}
            initialValues={emergencyContact}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="Nombre completo"
                  rules={[{ required: true, message: 'El nombre es obligatorio' }]}
                >
                  <Input prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="relationship"
                  label="Relación"
                  rules={[{ required: true, message: 'La relación es obligatoria' }]}
                >
                  <Select>
                    <Option value="padre">Padre</Option>
                    <Option value="madre">Madre</Option>
                    <Option value="abuelo">Abuelo/a</Option>
                    <Option value="tio">Tío/a</Option>
                    <Option value="hermano">Hermano/a mayor</Option>
                    <Option value="tutor">Tutor legal</Option>
                    <Option value="otro">Otro</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="Teléfono principal"
                  rules={[{ required: true, message: 'El teléfono es obligatorio' }]}
                >
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="alternativePhone" label="Teléfono alternativo">
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="email" label="Email">
                  <Input prefix={<MailOutlined />} type="email" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="isAuthorizedPickup" valuePropName="checked">
                  <Checkbox>Autorizado para recoger estudiante</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="address" label="Dirección">
              <Input prefix={<HomeOutlined />} />
            </Form.Item>

            <Form.Item name="notes" label="Notas adicionales">
              <TextArea rows={3} placeholder="Información adicional importante..." />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" size="large">
                Guardar Contacto de Emergencia
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'privacy',
      label: (
        <span>
          <SafetyCertificateOutlined />
          Privacidad
        </span>
      ),
      children: (
        <Card title="Configuración de Privacidad">
          <Form
            form={privacyForm}
            layout="vertical"
            onFinish={handleSavePrivacy}
            initialValues={privacy}
          >
            <Alert
              message="Política de Privacidad"
              description="Estas configuraciones determinan cómo se comparte tu información con terceros y otros padres."
              type="info"
              style={{ marginBottom: 24 }}
            />

            <Divider orientation="left">Compartir Información</Divider>
            <Form.Item name="shareContactWithOtherParents" valuePropName="checked">
              <Checkbox>Compartir información de contacto con otros padres del centro</Checkbox>
            </Form.Item>
            <Form.Item name="allowPhotoSharing" valuePropName="checked">
              <Checkbox>Permitir que el centro comparta fotos de actividades</Checkbox>
            </Form.Item>

            <Divider orientation="left">Uso de Datos</Divider>
            <Form.Item name="allowDataForResearch" valuePropName="checked">
              <Checkbox>Permitir el uso de datos anónimos para investigación educativa</Checkbox>
            </Form.Item>
            <Form.Item name="marketingCommunications" valuePropName="checked">
              <Checkbox>Recibir comunicaciones de marketing de partners educativos</Checkbox>
            </Form.Item>
            <Form.Item name="thirdPartySharing" valuePropName="checked">
              <Checkbox>Permitir compartir datos con proveedores de servicios educativos</Checkbox>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" size="large">
                Guardar Configuración de Privacidad
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <div className="family-settings-page">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <HeartOutlined style={{ fontSize: '48px', color: '#eb2f96', marginBottom: 16 }} />
          <Title level={2}>Configuración Familiar</Title>
          <Text type="secondary">
            Gestiona las preferencias de comunicación y privacidad de tu familia
          </Text>
        </div>

        <Tabs 
          defaultActiveKey="security" 
          size="large"
          items={tabItems}
        />
      </div>
    </div>
  );
};

export default FamilySettingsPage;