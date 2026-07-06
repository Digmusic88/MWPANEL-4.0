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
  TimePicker,
  Row,
  Col,
  Tabs,
  InputNumber,
  Checkbox,
} from 'antd';
import {
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  InfoCircleOutlined,
  SettingOutlined,
  BellOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  BookOutlined,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  newStudentAssignment: boolean;
  taskSubmissions: boolean;
  parentMessages: boolean;
  systemAnnouncements: boolean;
  scheduleChanges: boolean;
  emergencyAlerts: boolean;
}

interface CalendarPreferences {
  defaultView: 'month' | 'week' | 'day';
  weekStartsOn: number; // 0 = Sunday, 1 = Monday
  showWeekends: boolean;
  timeFormat: '12h' | '24h';
  defaultReminderTime: number; // minutes before event
}

interface OfficeHours {
  enabled: boolean;
  monday?: { start: string; end: string };
  tuesday?: { start: string; end: string };
  wednesday?: { start: string; end: string };
  thursday?: { start: string; end: string };
  friday?: { start: string; end: string };
  saturday?: { start: string; end: string };
  sunday?: { start: string; end: string };
}

interface EvaluationPreferences {
  defaultMaxPoints: number;
  allowLateSubmissions: boolean;
  latePenaltyPercentage: number;
  autoGradeOnSubmission: boolean;
  sendGradeNotifications: boolean;
  requireComments: boolean;
}

const TeacherSettingsPage: React.FC = () => {
  const [passwordForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [calendarForm] = Form.useForm();
  const [officeHoursForm] = Form.useForm();
  const [evaluationForm] = Form.useForm();
  
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    newStudentAssignment: true,
    taskSubmissions: true,
    parentMessages: true,
    systemAnnouncements: true,
    scheduleChanges: true,
    emergencyAlerts: true,
  });
  const [calendarPrefs, setCalendarPrefs] = useState<CalendarPreferences>({
    defaultView: 'week',
    weekStartsOn: 1,
    showWeekends: false,
    timeFormat: '24h',
    defaultReminderTime: 15,
  });
  const [officeHours, setOfficeHours] = useState<OfficeHours>({
    enabled: false,
  });
  const [evaluationPrefs, setEvaluationPrefs] = useState<EvaluationPreferences>({
    defaultMaxPoints: 10,
    allowLateSubmissions: true,
    latePenaltyPercentage: 10,
    autoGradeOnSubmission: false,
    sendGradeNotifications: true,
    requireComments: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await apiClient.get('/teachers/me/settings');
      const settings = response.data;
      
      if (settings.notifications) {
        setNotifications(settings.notifications);
        notificationForm.setFieldsValue(settings.notifications);
      }
      if (settings.calendar) {
        setCalendarPrefs(settings.calendar);
        calendarForm.setFieldsValue(settings.calendar);
      }
      if (settings.officeHours) {
        setOfficeHours(settings.officeHours);
        officeHoursForm.setFieldsValue(settings.officeHours);
      }
      if (settings.evaluation) {
        setEvaluationPrefs(settings.evaluation);
        evaluationForm.setFieldsValue(settings.evaluation);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      // Use default values if endpoint doesn't exist
    } finally {
      setSettingsLoading(false);
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
      await apiClient.patch('/teachers/me/settings', { notifications: values });
      setNotifications(values);
      message.success('Preferencias de notificaciones guardadas');
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      message.error('Error al guardar las preferencias de notificaciones');
    }
  };

  const handleSaveCalendarPreferences = async (values: any) => {
    try {
      await apiClient.patch('/teachers/me/settings', { calendar: values });
      setCalendarPrefs(values);
      message.success('Preferencias de calendario guardadas');
    } catch (error: any) {
      console.error('Error saving calendar preferences:', error);
      message.error('Error al guardar las preferencias de calendario');
    }
  };

  const handleSaveOfficeHours = async (values: any) => {
    try {
      await apiClient.patch('/teachers/me/settings', { officeHours: values });
      setOfficeHours(values);
      message.success('Horarios de oficina guardados');
    } catch (error: any) {
      console.error('Error saving office hours:', error);
      message.error('Error al guardar los horarios de oficina');
    }
  };

  const handleSaveEvaluationPreferences = async (values: any) => {
    try {
      await apiClient.patch('/teachers/me/settings', { evaluation: values });
      setEvaluationPrefs(values);
      message.success('Preferencias de evaluación guardadas');
    } catch (error: any) {
      console.error('Error saving evaluation preferences:', error);
      message.error('Error al guardar las preferencias de evaluación');
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

    if (!hasMinLength) {
      return Promise.reject(new Error('La contraseña debe tener al menos 8 caracteres'));
    }
    if (!hasLowerCase) {
      return Promise.reject(new Error('La contraseña debe contener al menos una letra minúscula'));
    }
    if (!hasUpperCase) {
      return Promise.reject(new Error('La contraseña debe contener al menos una letra mayúscula'));
    }
    if (!hasNumbers) {
      return Promise.reject(new Error('La contraseña debe contener al menos un número'));
    }
    if (!hasSpecialChar) {
      return Promise.reject(new Error('La contraseña debe contener al menos un carácter especial (@$!%*?&)'));
    }

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

  return (
    <div className="teacher-settings-page">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SettingOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: 16 }} />
          <Title level={2}>Configuración del Profesor</Title>
          <Text type="secondary">
            Personaliza tu experiencia y configuración de enseñanza
          </Text>
        </div>

        <Tabs defaultActiveKey="security" size="large">
          <TabPane tab={<span><LockOutlined />Seguridad</span>} key="security">
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

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={passwordLoading}
                    size="large"
                    style={{ width: '100%' }}
                  >
                    Cambiar Contraseña
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane tab={<span><BellOutlined />Notificaciones</span>} key="notifications">
            <Card>
              <Title level={4}>Preferencias de Notificaciones</Title>
              <Form
                form={notificationForm}
                layout="vertical"
                onFinish={handleSaveNotifications}
                initialValues={notifications}
              >
                <Row gutter={16}>
                  <Col span={24}>
                    <Divider orientation="left">Métodos de Notificación</Divider>
                    <Form.Item name="emailNotifications" valuePropName="checked">
                      <Checkbox>Notificaciones por email</Checkbox>
                    </Form.Item>
                    <Form.Item name="smsNotifications" valuePropName="checked">
                      <Checkbox>Notificaciones por SMS</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={24}>
                    <Divider orientation="left">Tipos de Notificaciones</Divider>
                    <Form.Item name="newStudentAssignment" valuePropName="checked">
                      <Checkbox>Nuevas asignaciones de estudiantes</Checkbox>
                    </Form.Item>
                    <Form.Item name="taskSubmissions" valuePropName="checked">
                      <Checkbox>Entregas de tareas</Checkbox>
                    </Form.Item>
                    <Form.Item name="parentMessages" valuePropName="checked">
                      <Checkbox>Mensajes de padres</Checkbox>
                    </Form.Item>
                    <Form.Item name="systemAnnouncements" valuePropName="checked">
                      <Checkbox>Anuncios del sistema</Checkbox>
                    </Form.Item>
                    <Form.Item name="scheduleChanges" valuePropName="checked">
                      <Checkbox>Cambios de horario</Checkbox>
                    </Form.Item>
                    <Form.Item name="emergencyAlerts" valuePropName="checked">
                      <Checkbox>Alertas de emergencia</Checkbox>
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
          </TabPane>

          <TabPane tab={<span><CalendarOutlined />Calendario</span>} key="calendar">
            <Card>
              <Title level={4}>Preferencias de Calendario</Title>
              <Form
                form={calendarForm}
                layout="vertical"
                onFinish={handleSaveCalendarPreferences}
                initialValues={calendarPrefs}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="defaultView" label="Vista por defecto">
                      <Select>
                        <Option value="month">Mensual</Option>
                        <Option value="week">Semanal</Option>
                        <Option value="day">Diaria</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="weekStartsOn" label="La semana comienza en">
                      <Select>
                        <Option value={0}>Domingo</Option>
                        <Option value={1}>Lunes</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="timeFormat" label="Formato de hora">
                      <Select>
                        <Option value="12h">12 horas (AM/PM)</Option>
                        <Option value="24h">24 horas</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="defaultReminderTime" label="Recordatorio por defecto (minutos)">
                      <InputNumber min={0} max={1440} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="showWeekends" valuePropName="checked">
                  <Checkbox>Mostrar fines de semana en el calendario</Checkbox>
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" size="large">
                    Guardar Preferencias de Calendario
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane tab={<span><ClockCircleOutlined />Horarios de Oficina</span>} key="office-hours">
            <Card>
              <Title level={4}>Horarios de Atención</Title>
              <Text type="secondary">
                Configura tus horarios de oficina para que estudiantes y padres sepan cuándo pueden contactarte.
              </Text>
              <Divider />
              
              <Form
                form={officeHoursForm}
                layout="vertical"
                onFinish={handleSaveOfficeHours}
                initialValues={officeHours}
              >
                <Form.Item name="enabled" valuePropName="checked">
                  <Checkbox>Habilitar horarios de oficina</Checkbox>
                </Form.Item>

                {/* Office hours for each day would go here - simplified for space */}
                <Alert
                  message="Funcionalidad en desarrollo"
                  description="La configuración detallada de horarios por día estará disponible pronto."
                  type="info"
                  style={{ marginBottom: 16 }}
                />

                <Form.Item>
                  <Button type="primary" htmlType="submit" size="large">
                    Guardar Horarios de Oficina
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane tab={<span><BookOutlined />Evaluaciones</span>} key="evaluation">
            <Card>
              <Title level={4}>Preferencias de Evaluación</Title>
              <Form
                form={evaluationForm}
                layout="vertical"
                onFinish={handleSaveEvaluationPreferences}
                initialValues={evaluationPrefs}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="defaultMaxPoints" label="Puntuación máxima por defecto">
                      <InputNumber min={1} max={100} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="latePenaltyPercentage" label="Penalización por entrega tardía (%)">
                      <InputNumber min={0} max={100} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="allowLateSubmissions" valuePropName="checked">
                  <Checkbox>Permitir entregas tardías</Checkbox>
                </Form.Item>

                <Form.Item name="autoGradeOnSubmission" valuePropName="checked">
                  <Checkbox>Calificar automáticamente al entregar (cuando sea posible)</Checkbox>
                </Form.Item>

                <Form.Item name="sendGradeNotifications" valuePropName="checked">
                  <Checkbox>Enviar notificaciones cuando se publiquen calificaciones</Checkbox>
                </Form.Item>

                <Form.Item name="requireComments" valuePropName="checked">
                  <Checkbox>Requerir comentarios en todas las evaluaciones</Checkbox>
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" size="large">
                    Guardar Preferencias de Evaluación
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default TeacherSettingsPage;