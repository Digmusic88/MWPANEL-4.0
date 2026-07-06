/**
 * @page: DuaConfigPage
 * @module: DUA (Diseño Universal para el Aprendizaje)
 * @description: Página de configuración DUA para personalizar el sistema
 * @role: Teacher, Admin
 * @features: Configuración dashboard, notificaciones, display, evaluación
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Typography,
  Card,
  Form,
  Switch,
  Select,
  InputNumber,
  Button,
  message,
  Divider,
  Space,
  Alert,
  Tabs,
  Radio,
  Badge,
  Tooltip,
} from 'antd';
import {
  SettingOutlined,
  DashboardOutlined,
  BellOutlined,
  EyeOutlined,
  FileTextOutlined,
  SaveOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/apiClient';
import { DuaPageHeader } from '../../components/dua/DuaPageHeader';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface DuaConfigData {
  dashboard: {
    showStatistics: boolean;
    showCharts: boolean;
    showRecentActivity: boolean;
    refreshInterval: number;
    autoExport: boolean;
    defaultExportFormat: 'excel' | 'pdf';
  };
  notifications: {
    enableEmailNotifications: boolean;
    newProfileNotifications: boolean;
    accommodationUpdates: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
  };
  display: {
    theme: 'light' | 'dark';
    compactMode: boolean;
    showTooltips: boolean;
    animationsEnabled: boolean;
    dateFormat: string;
    language: string;
  };
  evaluation: {
    defaultAssessmentPeriod: number;
    requireNotes: boolean;
    autoSaveEnabled: boolean;
    reminderDays: number;
    showGuidance: boolean;
  };
  permissions?: {
    canExportData: boolean;
    canCreateProfiles: boolean;
    canEditProfiles: boolean;
    canDeleteProfiles: boolean;
    canManageAccommodations: boolean;
    canViewReports: boolean;
  };
}

interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  config: Partial<DuaConfigData>;
}

const DuaConfigPage: React.FC = () => {
  const navigate = useNavigate();

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === 'function') {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn('Navigation error:', error, 'Path:', path);
      }
    } else {
      console.warn('Navigate function not available:', path);
    }
  }, [navigate]);
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<DuaConfigData | null>(null);
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    loadConfiguration();
    loadTemplates();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/dua/config');
      setConfig(response.data.data);
      form.setFieldsValue(response.data.data);
    } catch (error) {
      console.error('Error al cargar la configuración:', error);
      message.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await apiClient.get('/dua/config/templates');
      setTemplates(response.data.data.templates);
    } catch (error) {
      console.error('Error al cargar plantillas:', error);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const response = await apiClient.post('/dua/config', values);
      setConfig(response.data.data);
      setHasChanges(false);
      message.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      message.error('Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfiguration = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/dua/config/reset');
      setConfig(response.data.data);
      form.setFieldsValue(response.data.data);
      setHasChanges(false);
      message.success('Configuración restablecida a valores por defecto');
    } catch (error) {
      console.error('Error al restablecer la configuración:', error);
      message.error('Error al restablecer la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = (template: ConfigTemplate) => {
    form.setFieldsValue(template.config);
    setSelectedTemplate(template.id);
    setHasChanges(true);
    message.success(`Plantilla "${template.name}" aplicada`);
  };

  const handleFormChange = () => {
    setHasChanges(true);
  };

  if (!config) {
    return <div>Cargando configuración...</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <DuaPageHeader
        title="Configuración DUA"
        subtitle="Personaliza el sistema DUA según tus preferencias y necesidades"
        icon={<SettingOutlined />}
        actions={
          <>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetConfiguration}
              loading={loading}
            >
              Restablecer
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveConfiguration}
              loading={loading}
              disabled={!hasChanges}
            >
              Guardar Cambios
              {hasChanges && <Badge dot style={{ marginLeft: 8 }} />}
            </Button>
          </>
        }
      />

      {/* Alert de cambios pendientes */}
        {hasChanges && (
          <Alert
            message="Tienes cambios sin guardar"
            description="No olvides guardar los cambios antes de salir de esta página"
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Plantillas predefinidas */}
        <Card size="small" style={{ marginBottom: 24 }}>
          <Title level={4}>
            <ExperimentOutlined style={{ marginRight: 8 }} />
            Plantillas Predefinidas
          </Title>
          <Row gutter={16}>
            {templates.map((template) => (
              <Col xs={24} sm={8} key={template.id}>
                <Card
                  size="small"
                  hoverable
                  className={selectedTemplate === template.id ? 'selected-template' : ''}
                  style={{
                    border: selectedTemplate === template.id ? '2px solid #579172' : '1px solid #d9d9d9',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleApplyTemplate(template)}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Text strong>{template.name}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {template.description}
                    </Text>
                    {selectedTemplate === template.id && (
                      <Badge 
                        count={<CheckCircleOutlined style={{ color: '#2E7D52' }} />}
                        style={{ position: 'absolute', top: 8, right: 8 }}
                      />
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* Formulario de configuración */}
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
          initialValues={config}
        >
          <Tabs defaultActiveKey="dashboard">
            {/* Dashboard */}
            <TabPane
              tab={
                <span>
                  <DashboardOutlined />
                  Dashboard
                </span>
              }
              key="dashboard"
            >
              <Card>
                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name={['dashboard', 'showStatistics']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Mostrar Estadísticas</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Mostrar tarjetas de estadísticas principales
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name={['dashboard', 'showCharts']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Mostrar Gráficos</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Mostrar gráficos y visualizaciones de datos
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name={['dashboard', 'showRecentActivity']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Mostrar Actividad Reciente</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Mostrar timeline de actividades recientes
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name={['dashboard', 'refreshInterval']}
                      label="Intervalo de Actualización (segundos)"
                    >
                      <InputNumber min={15} max={300} step={15} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                      name={['dashboard', 'defaultExportFormat']}
                      label="Formato de Exportación por Defecto"
                    >
                      <Select>
                        <Option value="excel">Excel (.xlsx)</Option>
                        <Option value="pdf">PDF (.pdf)</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name={['dashboard', 'autoExport']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Auto-exportación</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Exportar automáticamente reportes mensuales
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </TabPane>

            {/* Notificaciones */}
            <TabPane
              tab={
                <span>
                  <BellOutlined />
                  Notificaciones
                </span>
              }
              key="notifications"
            >
              <Card>
                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name={['notifications', 'enableEmailNotifications']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Notificaciones por Email</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Recibir notificaciones por correo electrónico
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name={['notifications', 'newProfileNotifications']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Nuevos Perfiles DUA</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Notificar cuando se creen nuevos perfiles
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name={['notifications', 'accommodationUpdates']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Actualizaciones de Acomodaciones</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Notificar cambios en acomodaciones
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name={['notifications', 'weeklyReports']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Reportes Semanales</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Recibir resumen semanal de actividad
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name={['notifications', 'monthlyReports']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Reportes Mensuales</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Recibir resumen mensual completo
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </TabPane>

            {/* Display */}
            <TabPane
              tab={
                <span>
                  <EyeOutlined />
                  Apariencia
                </span>
              }
              key="display"
            >
              <Card>
                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name={['display', 'theme']}
                      label="Tema"
                    >
                      <Radio.Group>
                        <Radio.Button value="light">Claro</Radio.Button>
                        <Radio.Button value="dark">Oscuro</Radio.Button>
                      </Radio.Group>
                    </Form.Item>

                    <Form.Item
                      name={['display', 'compactMode']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Modo Compacto</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Reducir espaciado y mostrar más información
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name={['display', 'showTooltips']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Mostrar Tooltips</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Mostrar ayudas contextuales al pasar el ratón
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name={['display', 'animationsEnabled']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Animaciones</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Habilitar transiciones y animaciones
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name={['display', 'dateFormat']}
                      label="Formato de Fecha"
                    >
                      <Select>
                        <Option value="DD/MM/YYYY">DD/MM/YYYY (Español)</Option>
                        <Option value="MM/DD/YYYY">MM/DD/YYYY (Inglés)</Option>
                        <Option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name={['display', 'language']}
                      label="Idioma"
                    >
                      <Select>
                        <Option value="es">Español</Option>
                        <Option value="en">English</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </TabPane>

            {/* Evaluación */}
            <TabPane
              tab={
                <span>
                  <FileTextOutlined />
                  Evaluación
                </span>
              }
              key="evaluation"
            >
              <Card>
                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name={['evaluation', 'defaultAssessmentPeriod']}
                      label="Período de Evaluación por Defecto (días)"
                    >
                      <InputNumber min={30} max={365} step={30} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                      name={['evaluation', 'reminderDays']}
                      label="Recordatorio de Revisión (días antes)"
                    >
                      <InputNumber min={1} max={30} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                      name={['evaluation', 'requireNotes']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Notas Obligatorias</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Requerir notas en todas las evaluaciones
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name={['evaluation', 'autoSaveEnabled']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Guardado Automático</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Guardar automáticamente cambios en formularios
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>

                    <Form.Item
                      name={['evaluation', 'showGuidance']}
                      valuePropName="checked"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text strong>Mostrar Guías</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Mostrar guías y ayudas durante evaluaciones
                          </Text>
                        </span>
                        <Switch />
                      </div>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </TabPane>
          </Tabs>
        </Form>

        {/* Información de permisos */}
        {config.permissions && (
          <Card style={{ marginTop: 24 }}>
            <Title level={4}>Permisos del Usuario</Title>
            <Row gutter={16}>
              <Col xs={12} sm={8} md={4}>
                <Tooltip title="Exportar datos del sistema">
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <CheckCircleOutlined 
                      style={{ 
                        fontSize: '24px', 
                        color: config.permissions.canExportData ? '#2E7D52' : '#d9d9d9'
                      }} 
                    />
                    <br />
                    <Text style={{ fontSize: '12px' }}>Exportar</Text>
                  </div>
                </Tooltip>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Tooltip title="Crear nuevos perfiles DUA">
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <CheckCircleOutlined 
                      style={{ 
                        fontSize: '24px', 
                        color: config.permissions.canCreateProfiles ? '#2E7D52' : '#d9d9d9'
                      }} 
                    />
                    <br />
                    <Text style={{ fontSize: '12px' }}>Crear</Text>
                  </div>
                </Tooltip>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Tooltip title="Editar perfiles existentes">
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <CheckCircleOutlined 
                      style={{ 
                        fontSize: '24px', 
                        color: config.permissions.canEditProfiles ? '#2E7D52' : '#d9d9d9'
                      }} 
                    />
                    <br />
                    <Text style={{ fontSize: '12px' }}>Editar</Text>
                  </div>
                </Tooltip>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Tooltip title="Eliminar perfiles">
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <CheckCircleOutlined 
                      style={{ 
                        fontSize: '24px', 
                        color: config.permissions.canDeleteProfiles ? '#2E7D52' : '#d9d9d9'
                      }} 
                    />
                    <br />
                    <Text style={{ fontSize: '12px' }}>Eliminar</Text>
                  </div>
                </Tooltip>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Tooltip title="Gestionar acomodaciones">
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <CheckCircleOutlined 
                      style={{ 
                        fontSize: '24px', 
                        color: config.permissions.canManageAccommodations ? '#2E7D52' : '#d9d9d9'
                      }} 
                    />
                    <br />
                    <Text style={{ fontSize: '12px' }}>Acomodaciones</Text>
                  </div>
                </Tooltip>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Tooltip title="Ver reportes y análisis">
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <CheckCircleOutlined 
                      style={{ 
                        fontSize: '24px', 
                        color: config.permissions.canViewReports ? '#2E7D52' : '#d9d9d9'
                      }} 
                    />
                    <br />
                    <Text style={{ fontSize: '12px' }}>Reportes</Text>
                  </div>
                </Tooltip>
              </Col>
            </Row>
          </Card>
        )}
    </div>
  );
};

export default DuaConfigPage;