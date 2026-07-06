/**
 * @archivo: EmailAutomationPage.tsx
 * @módulo: Admin - Email Automation System
 * @función: Página de administración para configurar eventos automáticos de email
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Switch,
  Modal,
  Form,
  Input,
  Select,
  Divider,
  Typography,
  Statistic,
  Row,
  Col,
  TimePicker,
  InputNumber,
  message,
  Popconfirm,
  Tooltip,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SettingOutlined,
  MailOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
  GiftOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
// import { Pie } from '@ant-design/plots'; // Removed to fix shape.outer errors
import dayjs from 'dayjs';

import { emailAutomationService } from '../../services/emailAutomationService';
import emailNotificationsService from '../../services/emailNotificationsService';

const { Title, Text } = Typography;
const { Option } = Select;

interface EmailAutomation {
  id: string;
  name: string;
  eventType: string;
  isActive: boolean;
  recipientType: string;
  templateId: string;
  template?: {
    id: string;
    name: string;
    subject: string;
  };
  reminderDaysBefore?: number;
  reminderTime?: string;
  conditions?: string;
  sendOnlyOnce: boolean;
  maxEmailsPerDay?: number;
  totalEmailsSent: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    name: string;
    email: string;
  };
}

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  isActive: boolean;
}

interface AutomationStats {
  total: number;
  active: number;
  inactive: number;
  totalEmailsSent: number;
  byEventType: Record<string, number>;
}

interface EventType {
  value: string;
  label: string;
  description: string;
}

interface RecipientType {
  value: string;
  label: string;
  description: string;
}

const EmailAutomationPage: React.FC = () => {
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [recipientTypes, setRecipientTypes] = useState<RecipientType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<EmailAutomation | null>(null);
  const [form] = Form.useForm();

  // Cargar datos iniciales
  useEffect(() => {
    loadAutomations();
    loadTemplates();
    loadStats();
    loadEventTypes();
    loadRecipientTypes();
  }, []);

  const loadAutomations = async () => {
    try {
      setLoading(true);
      const data = await emailAutomationService.getAllAutomations();
      setAutomations(data);
    } catch (error) {
      message.error('Error al cargar automatizaciones');
      console.error('Error loading automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await emailNotificationsService.getAllTemplates();
      // Filtrar solo las plantillas activas
      const activeTemplates = data.filter(template => template.isActive);
      setTemplates(activeTemplates);
    } catch (error) {
      message.error('Error al cargar plantillas');
      console.error('Error loading templates:', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await emailAutomationService.getAutomationStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadEventTypes = async () => {
    try {
      const data = await emailAutomationService.getEventTypes();
      setEventTypes(data);
    } catch (error) {
      console.error('Error loading event types:', error);
    }
  };

  const loadRecipientTypes = async () => {
    try {
      const data = await emailAutomationService.getRecipientTypes();
      setRecipientTypes(data);
    } catch (error) {
      console.error('Error loading recipient types:', error);
    }
  };

  const handleCreateAutomation = () => {
    setEditingAutomation(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditAutomation = (automation: EmailAutomation) => {
    setEditingAutomation(automation);
    form.setFieldsValue({
      ...automation,
      reminderTime: automation.reminderTime ? dayjs(automation.reminderTime, 'HH:mm') : undefined,
    });
    setModalVisible(true);
  };

  const handleSaveAutomation = async (values: any) => {
    try {
      const formData = {
        ...values,
        reminderTime: values.reminderTime ? values.reminderTime.format('HH:mm') : undefined,
      };

      if (editingAutomation) {
        await emailAutomationService.updateAutomation(editingAutomation.id, formData);
        message.success('Automatización actualizada correctamente');
      } else {
        await emailAutomationService.createAutomation(formData);
        message.success('Automatización creada correctamente');
      }

      setModalVisible(false);
      loadAutomations();
      loadStats();
    } catch (error) {
      message.error('Error al guardar automatización');
      console.error('Error saving automation:', error);
    }
  };

  const handleToggleActive = async (automation: EmailAutomation) => {
    try {
      await emailAutomationService.toggleAutomationActive(automation.id);
      message.success(`Automatización ${automation.isActive ? 'desactivada' : 'activada'} correctamente`);
      loadAutomations();
      loadStats();
    } catch (error) {
      message.error('Error al cambiar estado de automatización');
      console.error('Error toggling automation:', error);
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    try {
      await emailAutomationService.deleteAutomation(id);
      message.success('Automatización eliminada correctamente');
      loadAutomations();
      loadStats();
    } catch (error) {
      message.error('Error al eliminar automatización');
      console.error('Error deleting automation:', error);
    }
  };

  const getEventTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'grade_created': 'green',
      'assignment_created': 'blue',
      'assignment_due_reminder': 'orange',
      'task_overdue': 'red',
      'event_reminder': 'purple',
      'user_created': 'cyan',
      'password_reset_requested': 'red',
      'user_birthday': 'pink',
      'system_maintenance': 'gold',
      'backup_completed': 'lime',
      'absence_recorded': 'volcano',
      'attendance_summary': 'geekblue',
    };
    return colors[type] || 'default';
  };

  const getRecipientTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'student': 'blue',
      'teacher': 'green',
      'family': 'orange',
      'admin': 'red',
      'all_users': 'purple',
      'specific_role': 'cyan',
    };
    return colors[type] || 'default';
  };

  const columns: ColumnsType<EmailAutomation> = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.template?.name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Evento',
      dataIndex: 'eventType',
      key: 'eventType',
      render: (eventType) => (
        <Tag color={getEventTypeColor(eventType)}>
          {eventTypes.find(et => et.value === eventType)?.label || eventType}
        </Tag>
      ),
    },
    {
      title: 'Destinatarios',
      dataIndex: 'recipientType',
      key: 'recipientType',
      render: (recipientType) => (
        <Tag color={getRecipientTypeColor(recipientType)}>
          {recipientTypes.find(rt => rt.value === recipientType)?.label || recipientType}
        </Tag>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record)}
          checkedChildren={<PlayCircleOutlined />}
          unCheckedChildren={<PauseCircleOutlined />}
        />
      ),
    },
    {
      title: 'Emails Enviados',
      dataIndex: 'totalEmailsSent',
      key: 'totalEmailsSent',
      render: (count) => (
        <Statistic value={count} />
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditAutomation(record)}
            />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar automatización?"
            description="Esta acción no se puede deshacer"
            onConfirm={() => handleDeleteAutomation(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Eliminar">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const chartData = stats?.byEventType
    ? Object.entries(stats.byEventType).map(([type, value]) => ({
        type: eventTypes.find(et => et.value === type)?.label || type,
        value,
      }))
    : [];

  const chartConfig = {
    appendPadding: 10,
    data: chartData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: false, // Disabled to avoid shape.outer error
    legend: {
      position: 'bottom' as const,
    },
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <SettingOutlined style={{ marginRight: '8px' }} />
          Automatización de Emails
        </Title>
        <Text type="secondary">
          Configura cuándo y a quién enviar emails automáticamente basado en eventos del sistema
        </Text>
      </div>

      {/* Estadísticas */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Automatizaciones"
                value={stats.total}
                prefix={<SettingOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Activas"
                value={stats.active}
                prefix={<PlayCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Inactivas"
                value={stats.inactive}
                prefix={<PauseCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Emails Enviados"
                value={stats.totalEmailsSent}
                prefix={<MailOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Sección especial de configuración de cumpleaños */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GiftOutlined style={{ color: '#ff69b4', fontSize: '20px' }} />
                <span style={{ color: '#722ed1' }}>Sistema de Cumpleaños</span>
                <HeartOutlined style={{ color: '#ff1744', fontSize: '16px' }} />
              </div>
            }
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #fef7ff 100%)',
              border: '2px solid #d1c4e9',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(114, 46, 209, 0.15)',
            }}
          >
            <Alert
              message={
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🎂</span>
                  <div>
                    <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                      ¡Sistema de Cumpleaños Completo Implementado!
                    </Text>
                    <div style={{ marginTop: '4px' }}>
                      <Text type="secondary" style={{ fontSize: '14px' }}>
                        El sistema de cumpleaños incluye tanto notificaciones automáticas por email 
                        como una experiencia visual especial en la plataforma.
                      </Text>
                    </div>
                  </div>
                </div>
              }
              type="success"
              showIcon={false}
              style={{
                marginBottom: '16px',
                border: '1px solid #b7eb8f',
                background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)',
              }}
            />
            
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ 
                  padding: '16px', 
                  background: 'rgba(255, 105, 180, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 105, 180, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <MailOutlined style={{ color: '#722ed1' }} />
                    <Text strong style={{ color: '#722ed1' }}>Automatización de Emails</Text>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    <li>✅ Evento "USER_BIRTHDAY" configurado</li>
                    <li>✅ Plantilla de cumpleaños creada</li>
                    <li>✅ Envío automático el día del cumpleaños</li>
                    <li>✅ Destinatarios personalizados por rol</li>
                  </ul>
                </div>
              </Col>
              
              <Col span={12}>
                <div style={{ 
                  padding: '16px', 
                  background: 'rgba(24, 144, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(24, 144, 255, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <GiftOutlined style={{ color: '#1890ff' }} />
                    <Text strong style={{ color: '#1890ff' }}>Experiencia Visual</Text>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    <li>🎂 Iconos de cumpleaños en listados</li>
                    <li>🎉 Banner superior personalizado</li>
                    <li>🎈 Mensaje de felicitación con edad</li>
                    <li>⚡ Botón "cerrar" hasta mañana</li>
                  </ul>
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ textAlign: 'center' }}>
              <Space>
                <Button
                  type="primary"
                  icon={<SettingOutlined />}
                  onClick={() => {
                    // Buscar automatización de cumpleaños existente
                    const birthdayAutomation = automations.find(a => a.eventType === 'user_birthday');
                    if (birthdayAutomation) {
                      handleEditAutomation(birthdayAutomation);
                    } else {
                      // Crear nueva automatización de cumpleaños
                      setEditingAutomation(null);
                      form.resetFields();
                      form.setFieldsValue({
                        name: 'Felicitación de Cumpleaños',
                        eventType: 'user_birthday',
                        recipientType: 'specific_user',
                        isActive: true
                      });
                      setModalVisible(true);
                    }
                  }}
                  style={{ background: '#722ed1', borderColor: '#722ed1' }}
                >
                  Configurar Emails de Cumpleaños
                </Button>
                
                <Button
                  icon={<InfoCircleOutlined />}
                  onClick={() => {
                    Modal.info({
                      title: 'Sistema de Cumpleaños MW Panel 2.0',
                      width: 600,
                      content: (
                        <div>
                          <p><strong>Componentes Implementados:</strong></p>
                          <ul>
                            <li><strong>birthdayService.ts:</strong> Detecta cumpleaños y gestiona persistencia</li>
                            <li><strong>BirthdayIcon.tsx:</strong> Iconos 🎂 en listados de usuarios</li>
                            <li><strong>BirthdayBanner.tsx:</strong> Banner superior con mensaje personalizado</li>
                            <li><strong>EmailAutomation:</strong> Sistema automático de envío de felicitaciones</li>
                          </ul>
                          <p><strong>Integrado en:</strong></p>
                          <ul>
                            <li>📋 Listados de estudiantes y profesores</li>
                            <li>🎯 Layout principal con banner superior</li>
                            <li>📧 Sistema de automatización de emails existente</li>
                          </ul>
                          <p style={{ color: '#722ed1' }}>
                            <strong>IMPORTANTE:</strong> No modifica el sistema de plantillas existente, 
                            complementa la experiencia con elementos visuales.
                          </p>
                        </div>
                      ),
                    });
                  }}
                >
                  Información Técnica
                </Button>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Tabla de automatizaciones */}
        <Col span={16}>
          <Card
            title="Automatizaciones Configuradas"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateAutomation}
              >
                Nueva Automatización
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={automations}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} de ${total} automatizaciones`,
              }}
            />
          </Card>
        </Col>

        {/* Gráfico de distribución */}
        <Col span={8}>
          <Card title="Distribución por Tipo de Evento">
            {chartData.length > 0 ? (
              <div className="w-full h-64 flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border border-gray-200">
                <div className="text-center">
                  <div className="text-4xl mb-3">📊</div>
                  <div className="text-gray-700 font-semibold text-lg mb-2">Distribución por Tipo</div>
                  <div className="text-gray-600 text-sm">
                    {chartData.length > 0 ? `${chartData.length} tipos de eventos` : 'Sin datos disponibles'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <BarChartOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <br />
                <Text type="secondary">No hay datos para mostrar</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Modal para crear/editar automatización */}
      <Modal
        title={editingAutomation ? 'Editar Automatización' : 'Nueva Automatización'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveAutomation}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nombre de la Automatización"
                rules={[{ required: true, message: 'Por favor ingrese un nombre' }]}
              >
                <Input placeholder="Ej: Notificar nueva calificación" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="eventType"
                label="Tipo de Evento"
                rules={[{ required: true, message: 'Por favor seleccione un evento' }]}
              >
                <Select placeholder="Seleccione el evento que disparará el email">
                  {eventTypes.map(eventType => (
                    <Option key={eventType.value} value={eventType.value}>
                      <div>
                        <div>{eventType.label}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {eventType.description}
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="templateId"
                label="Plantilla de Email"
                rules={[{ required: true, message: 'Por favor seleccione una plantilla' }]}
              >
                <Select placeholder="Seleccione la plantilla a usar">
                  {templates.map(template => (
                    <Option key={template.id} value={template.id}>
                      <div>
                        <div>{template.name}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {template.subject}
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="recipientType"
                label="Tipo de Destinatario"
                rules={[{ required: true, message: 'Por favor seleccione los destinatarios' }]}
              >
                <Select placeholder="¿A quién enviar el email?">
                  {recipientTypes.map(recipientType => (
                    <Option key={recipientType.value} value={recipientType.value}>
                      <div>
                        <div>{recipientType.label}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {recipientType.description}
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Configuración de Timing</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="reminderDaysBefore"
                label="Días de Anticipación"
                tooltip="Para recordatorios, cuántos días antes enviar el email"
              >
                <InputNumber
                  min={0}
                  max={30}
                  placeholder="0"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="reminderTime"
                label="Hora de Envío"
                tooltip="Hora específica del día para enviar el email"
              >
                <TimePicker
                  format="HH:mm"
                  placeholder="Seleccionar hora"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maxEmailsPerDay"
                label="Límite por Día"
                tooltip="Máximo número de emails a enviar por día"
              >
                <InputNumber
                  min={1}
                  max={1000}
                  placeholder="Sin límite"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sendOnlyOnce"
                label="Enviar Solo Una Vez"
                valuePropName="checked"
                tooltip="Si está activado, solo enviará un email por evento"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="Automatización Activa"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="conditions"
            label="Condiciones Adicionales (JSON)"
            tooltip="Condiciones específicas en formato JSON para filtrar cuándo enviar"
          >
            <Input.TextArea
              rows={3}
              placeholder='{"grade": {"min": 5}, "subject": "mathematics"}'
            />
          </Form.Item>

          <Alert
            message="Configuración de Automatización"
            description="Las automatizaciones se ejecutarán cuando ocurran los eventos especificados. Asegúrate de que las plantillas tengan las variables necesarias para el tipo de evento seleccionado."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default EmailAutomationPage;