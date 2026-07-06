/**
 * @archivo: EmailNotificationsPage.tsx
 * @función: Página de administración del sistema de notificaciones por email
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 * @propósito: Gestión completa de plantillas, historial y estadísticas de email
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Typography,
  Spin,
  message,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  DatePicker,
  Space,
  Popconfirm,
  Tooltip,
  Badge,
  Progress,
  Alert,
} from 'antd';
import {
  MailOutlined,
  SendOutlined,
  HistoryOutlined,
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import emailNotificationsService, {
  EmailTemplate,
  EmailNotification,
  EmailStats,
  SendTestEmailDto,
} from '../../services/emailNotificationsService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const EmailNotificationsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modales
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [testEmailModalVisible, setTestEmailModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewContent, setPreviewContent] = useState<{ html: string; text: string } | null>(null);
  
  // Forms
  const [templateForm] = Form.useForm();
  const [testEmailForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, templatesData, notificationsData] = await Promise.all([
        emailNotificationsService.getStats(),
        emailNotificationsService.getTemplates(),
        emailNotificationsService.getAllEmailHistory({ limit: 100 }),
      ]);

      setStats(statsData);
      setTemplates(templatesData);
      setNotifications(notificationsData.notifications);
    } catch (error) {
      message.error('Error al cargar los datos del sistema de email');
      console.error('Error loading email data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async (values: SendTestEmailDto) => {
    try {
      await emailNotificationsService.sendTestEmail(values);
      message.success('Email de prueba enviado exitosamente');
      setTestEmailModalVisible(false);
      testEmailForm.resetFields();
      loadData(); // Recargar estadísticas
    } catch (error) {
      message.error('Error al enviar email de prueba');
      console.error('Error sending test email:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await emailNotificationsService.deleteTemplate(templateId);
      message.success('Plantilla eliminada exitosamente');
      loadData();
    } catch (error) {
      message.error('Error al eliminar la plantilla');
      console.error('Error deleting template:', error);
    }
  };

  const handlePreviewTemplate = async (template: EmailTemplate) => {
    try {
      const preview = await emailNotificationsService.previewTemplate(template.id, {
        userName: 'Usuario de Ejemplo',
        userEmail: 'usuario@ejemplo.com',
        schoolName: 'Mundo World School',
        currentDate: new Date().toLocaleDateString('es-ES'),
      });
      setPreviewContent(preview);
      setSelectedTemplate(template);
      setPreviewModalVisible(true);
    } catch (error) {
      message.error('Error al generar la vista previa');
      console.error('Error previewing template:', error);
    }
  };

  const handleSaveTemplate = async (values: any) => {
    try {
      setLoading(true);
      if (selectedTemplate) {
        // Editar plantilla existente
        await emailNotificationsService.updateTemplate(selectedTemplate.id, values);
        message.success('Plantilla actualizada exitosamente');
      } else {
        // Crear nueva plantilla
        await emailNotificationsService.createTemplate(values);
        message.success('Plantilla creada exitosamente');
      }
      setTemplateModalVisible(false);
      templateForm.resetFields();
      setSelectedTemplate(null);
      loadData();
    } catch (error) {
      message.error(selectedTemplate ? 'Error al actualizar la plantilla' : 'Error al crear la plantilla');
      console.error('Error saving template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    templateForm.setFieldsValue({
      name: template.name,
      type: template.type,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      isActive: template.isActive,
    });
    setTemplateModalVisible(true);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    templateForm.resetFields();
    templateForm.setFieldsValue({
      isActive: true,
      type: 'custom',
    });
    setTemplateModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      sent: 'green',
      delivered: 'blue',
      pending: 'orange',
      sending: 'cyan',
      failed: 'red',
      bounced: 'red',
      complained: 'purple',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'red',
      high: 'orange',
      normal: 'blue',
      low: 'green',
    };
    return colors[priority] || 'default';
  };

  const templateColumns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: EmailTemplate) => (
        <Space>
          <Text strong>{name}</Text>
          {record.isSystem && <Tag color="blue">Sistema</Tag>}
        </Space>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Asunto',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Activa' : 'Inactiva'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record: EmailTemplate) => (
        <Space>
          <Tooltip title="Vista previa">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handlePreviewTemplate(record)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditTemplate(record)}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Estás seguro de eliminar esta plantilla?"
              onConfirm={() => handleDeleteTemplate(record.id)}
            >
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const notificationColumns = [
    {
      title: 'Destinatario',
      dataIndex: 'recipientEmail',
      key: 'recipientEmail',
    },
    {
      title: 'Asunto',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Prioridad',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {priority.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Enviado',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Text>{new Date(date).toLocaleString('es-ES')}</Text>
      ),
    },
    {
      title: 'Prueba',
      dataIndex: 'isTest',
      key: 'isTest',
      render: (isTest: boolean) => isTest && <Tag color="orange">PRUEBA</Tag>,
    },
  ];

  const pieData = stats ? [
    { name: 'Enviados', value: stats.sent, color: '#52c41a' },
    { name: 'Fallidos', value: stats.failed, color: '#ff4d4f' },
    { name: 'Pendientes', value: stats.pending, color: '#faad14' },
  ] : [];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Title level={2}>
            <MailOutlined style={{ marginRight: 8 }} />
            Sistema de Notificaciones por Email
          </Title>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* Dashboard */}
        <TabPane 
          tab={
            <span>
              <ThunderboltOutlined />
              Dashboard
            </span>
          } 
          key="dashboard"
        >
          <Spin spinning={loading}>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Emails"
                    value={stats?.total || 0}
                    prefix={<MailOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Enviados"
                    value={stats?.sent || 0}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Fallidos"
                    value={stats?.failed || 0}
                    prefix={<ExclamationCircleOutlined />}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Pendientes"
                    value={stats?.pending || 0}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Card title="Estadísticas de Envío" style={{ height: '400px' }}>
                  {stats && (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title="Acciones Rápidas">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      block
                      onClick={() => setTestEmailModalVisible(true)}
                    >
                      Enviar Email de Prueba
                    </Button>
                    <Button
                      icon={<PlusOutlined />}
                      block
                      onClick={handleCreateTemplate}
                    >
                      Nueva Plantilla
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      block
                      onClick={loadData}
                    >
                      Actualizar Datos
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Spin>
        </TabPane>

        {/* Plantillas */}
        <TabPane 
          tab={
            <span>
              <EditOutlined />
              Plantillas ({templates.length})
            </span>
          } 
          key="templates"
        >
          <Card
            title="Gestión de Plantillas"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateTemplate}
              >
                Nueva Plantilla
              </Button>
            }
          >
            <Table
              columns={templateColumns}
              dataSource={templates}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        {/* Historial */}
        <TabPane 
          tab={
            <span>
              <HistoryOutlined />
              Historial ({notifications.length})
            </span>
          } 
          key="history"
        >
          <Card title="Historial de Notificaciones">
            <Table
              columns={notificationColumns}
              dataSource={notifications}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Modal para Email de Prueba */}
      <Modal
        title="Enviar Email de Prueba"
        visible={testEmailModalVisible}
        onCancel={() => setTestEmailModalVisible(false)}
        footer={null}
      >
        <Form
          form={testEmailForm}
          layout="vertical"
          onFinish={handleSendTestEmail}
        >
          <Form.Item
            name="to"
            label="Destinatario"
            rules={[
              { required: true, message: 'Ingrese el email destinatario' },
              { type: 'email', message: 'Ingrese un email válido' },
            ]}
          >
            <Input placeholder="usuario@ejemplo.com" />
          </Form.Item>

          <Form.Item
            name="templateType"
            label="Tipo de Plantilla"
            rules={[{ required: true, message: 'Seleccione un tipo de plantilla' }]}
          >
            <Select placeholder="Seleccionar plantilla">
              <Select.Option value="welcome">Bienvenida</Select.Option>
              <Select.Option value="grade_notification">Notificación de Calificación</Select.Option>
              <Select.Option value="assignment_reminder">Recordatorio de Tarea</Select.Option>
              <Select.Option value="event_reminder">Recordatorio de Evento</Select.Option>
              <Select.Option value="password_reset">Recuperación de Contraseña</Select.Option>
              <Select.Option value="birthday_greeting">Felicitación de Cumpleaños</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="subject"
            label="Asunto (Opcional)"
          >
            <Input placeholder="Asunto personalizado" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Enviar Email
              </Button>
              <Button onClick={() => setTestEmailModalVisible(false)}>
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de Vista Previa */}
      <Modal
        title={`Vista Previa: ${selectedTemplate?.name}`}
        visible={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            Cerrar
          </Button>
        ]}
      >
        {previewContent && (
          <div>
            <Tabs defaultActiveKey="html">
              <TabPane tab="Vista HTML" key="html">
                <div
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    padding: '16px',
                    maxHeight: '500px',
                    overflow: 'auto',
                  }}
                  dangerouslySetInnerHTML={{ __html: previewContent.html }}
                />
              </TabPane>
              <TabPane tab="Texto Plano" key="text">
                <TextArea
                  value={previewContent.text}
                  rows={15}
                  readOnly
                  style={{ fontFamily: 'monospace' }}
                />
              </TabPane>
            </Tabs>
          </div>
        )}
      </Modal>

      {/* Modal de Creación/Edición de Plantillas */}
      <Modal
        title={selectedTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
        visible={templateModalVisible}
        onCancel={() => {
          setTemplateModalVisible(false);
          templateForm.resetFields();
          setSelectedTemplate(null);
        }}
        width={800}
        footer={null}
      >
        <Form
          form={templateForm}
          layout="vertical"
          onFinish={handleSaveTemplate}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nombre de la Plantilla"
                rules={[{ required: true, message: 'Ingrese el nombre de la plantilla' }]}
              >
                <Input placeholder="Ej: Notificación de Bienvenida" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Tipo de Plantilla"
                rules={[{ required: true, message: 'Seleccione el tipo de plantilla' }]}
              >
                <Select placeholder="Seleccionar tipo">
                  <Select.Option value="welcome">Bienvenida</Select.Option>
                  <Select.Option value="grade_notification">Notificación de Calificación</Select.Option>
                  <Select.Option value="assignment_reminder">Recordatorio de Tarea</Select.Option>
                  <Select.Option value="event_reminder">Recordatorio de Evento</Select.Option>
                  <Select.Option value="password_reset">Recuperación de Contraseña</Select.Option>
                  <Select.Option value="birthday_greeting">Felicitación de Cumpleaños</Select.Option>
                  <Select.Option value="custom">Personalizada</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="subject"
            label="Asunto del Email"
            rules={[{ required: true, message: 'Ingrese el asunto del email' }]}
          >
            <Input placeholder="Ej: Bienvenido a {{schoolName}}" />
          </Form.Item>

          <Form.Item
            name="htmlContent"
            label="Contenido HTML"
            rules={[{ required: true, message: 'Ingrese el contenido HTML de la plantilla' }]}
          >
            <TextArea
              rows={12}
              placeholder="<!DOCTYPE html>
<html>
<head><meta charset='UTF-8'><title>{{schoolName}}</title></head>
<body>
  <h1>Hola {{userName}}</h1>
  <p>Tu contenido aquí...</p>
</body>
</html>"
            />
          </Form.Item>

          <Form.Item
            name="textContent"
            label="Contenido en Texto Plano"
            rules={[{ required: true, message: 'Ingrese el contenido en texto plano' }]}
          >
            <TextArea
              rows={6}
              placeholder="Hola {{userName}},

Tu contenido en texto plano aquí...

Saludos,
{{schoolName}}"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="Estado"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="Activa" 
                  unCheckedChildren="Inactiva"
                />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 16 }}>
            <Alert
              message="Variables Disponibles"
              description="Puedes usar estas variables en tu plantilla: {{userName}}, {{userEmail}}, {{schoolName}}, {{currentDate}}, {{gradeName}}, {{gradeValue}}, {{subjectName}}, {{teacherName}}, {{assignmentTitle}}, {{dueDate}}"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </div>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button 
                onClick={() => {
                  setTemplateModalVisible(false);
                  templateForm.resetFields();
                  setSelectedTemplate(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {selectedTemplate ? 'Actualizar Plantilla' : 'Crear Plantilla'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EmailNotificationsPage;