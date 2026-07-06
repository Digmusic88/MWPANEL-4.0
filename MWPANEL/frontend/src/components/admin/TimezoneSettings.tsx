import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Switch,
  Button,
  message,
  Typography,
  Space,
  Alert,
  Row,
  Col,
  Divider,
  Tag,
  TimePicker,
} from 'antd';
import {
  ClockCircleOutlined,
  GlobalOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import apiClient from '@/services/apiClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;
const { Option } = Select;

interface TimezoneConfig {
  timezone: string;
  displayFormat: string;
  autoDST: boolean;
}

interface TimezoneInfo {
  value: string;
  label: string;
  offset: string;
}

const TimezoneSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testingTime, setTestingTime] = useState(false);
  const [config, setConfig] = useState<TimezoneConfig>({
    timezone: 'Europe/Madrid',
    displayFormat: 'DD/MM/YYYY HH:mm',
    autoDST: true,
  });
  const [availableTimezones, setAvailableTimezones] = useState<TimezoneInfo[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    loadTimezoneConfig();
    loadAvailableTimezones();
  }, []);

  const loadTimezoneConfig = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/settings/timezone/config');
      const timezoneConfig = response.data.data;

      setConfig(timezoneConfig);
      form.setFieldsValue(timezoneConfig);

      console.log('✅ Loaded timezone config:', timezoneConfig);
    } catch (error: any) {
      console.error('Error loading timezone config:', error);
      if (error?.response?.status !== 401) {
        message.error('Error al cargar la configuración de timezone');
      }

      // Set default values on error
      const defaultConfig = {
        timezone: 'Europe/Madrid',
        displayFormat: 'DD/MM/YYYY HH:mm',
        autoDST: true,
      };
      setConfig(defaultConfig);
      form.setFieldsValue(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTimezones = async () => {
    try {
      const response = await apiClient.get('/settings/timezone/available');
      setAvailableTimezones(response.data.data);
    } catch (error: any) {
      console.error('Error loading available timezones:', error);
      if (error?.response?.status !== 401) {
        message.error('Error al cargar zonas horarias disponibles');
      }
    }
  };

  const getCurrentTime = async () => {
    try {
      setTestingTime(true);
      const response = await apiClient.get('/settings/timezone/current-time');
      const timeData = response.data.data;

      setCurrentTime(timeData.formatted);
      message.success(`Hora actual: ${timeData.formatted} (${timeData.timezone})`);
    } catch (error: any) {
      console.error('Error getting current time:', error);
      if (error?.response?.status !== 401) {
        message.error('Error al obtener la hora actual');
      }
    } finally {
      setTestingTime(false);
    }
  };

  const handleSaveTimezoneSettings = async (values: TimezoneConfig) => {
    try {
      setLoading(true);

      // Guardar la configuración
      await apiClient.post('/settings/timezone/config', values);

      // Invalidar cache del backend
      try {
        await apiClient.post('/settings/timezone/invalidate-cache');
        console.log('✅ Cache del backend invalidado');
      } catch (cacheError) {
        console.warn('⚠️ No se pudo invalidar cache del backend:', cacheError);
      }

      // Invalidar cache del frontend usando función importada de dateUtils
      // Crear una implementación local temporal
      try {
        // @ts-ignore - Acceso directo al módulo global si está disponible
        if (window.__invalidateTimezoneCache) {
          window.__invalidateTimezoneCache();
        }
      } catch (frontendCacheError) {
        console.warn('⚠️ No se pudo invalidar cache del frontend:', frontendCacheError);
      }

      setConfig(values);
      message.success('Configuración de timezone guardada correctamente. Los cambios se aplicarán en unos momentos.');

      // Refresh current time with new timezone
      await getCurrentTime();

      // Recomendar reload de página para cambios completos
      message.info('Se recomienda recargar la página para ver todos los cambios de timezone aplicados.', 5);

    } catch (error: any) {
      console.error('Error saving timezone settings:', error);
      if (error?.response?.status === 401) {
        message.error('No tienes permisos para cambiar la configuración de timezone');
      } else {
        message.error('Error al guardar la configuración de timezone');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatOptions = [
    { value: 'DD/MM/YYYY HH:mm', label: '17/09/2025 21:35 (Formato español)' },
    { value: 'MM/DD/YYYY HH:mm', label: '09/17/2025 21:35 (Formato americano)' },
    { value: 'YYYY-MM-DD HH:mm', label: '2025-09-17 21:35 (Formato ISO)' },
    { value: 'DD-MM-YYYY HH:mm', label: '17-09-2025 21:35 (Con guiones)' },
    { value: 'DD/MM/YYYY hh:mm A', label: '17/09/2025 09:35 PM (12 horas)' },
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card
          title={
            <Space>
              <ClockCircleOutlined style={{ color: '#1890ff' }} />
              <span>Configuración de Zona Horaria del Sistema</span>
              <Tag color="blue">
                {config.timezone}
              </Tag>
            </Space>
          }
          extra={
            <Space>
              <Button
                icon={<ClockCircleOutlined />}
                onClick={getCurrentTime}
                loading={testingTime}
                size="small"
              >
                Ver Hora Actual
              </Button>
              <Button
                icon={<SyncOutlined />}
                onClick={loadTimezoneConfig}
                size="small"
              >
                Recargar
              </Button>
            </Space>
          }
        >
          <Alert
            message="Configuración de Zona Horaria Global"
            description="Esta configuración afecta a todas las fechas y horas mostradas en el sistema, incluyendo mensajes, eventos, y reportes. Los usuarios verán las fechas en la zona horaria configurada aquí."
            type="info"
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 24 }}
            showIcon
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveTimezoneSettings}
            initialValues={config}
          >
            {/* Zona Horaria Principal */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="timezone"
                  label={
                    <Space>
                      <GlobalOutlined />
                      <span>Zona Horaria Principal</span>
                    </Space>
                  }
                  rules={[{ required: true, message: 'Selecciona una zona horaria' }]}
                >
                  <Select
                    placeholder="Selecciona la zona horaria del sistema"
                    showSearch
                    optionFilterProp="children"
                    loading={loading}
                  >
                    {availableTimezones.map(tz => (
                      <Option key={tz.value} value={tz.value}>
                        <Space direction="vertical" size={0}>
                          <Text strong>{tz.label}</Text>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {tz.offset} • {tz.value}
                          </Text>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="displayFormat"
                  label={
                    <Space>
                      <SettingOutlined />
                      <span>Formato de Fecha y Hora</span>
                    </Space>
                  }
                  rules={[{ required: true, message: 'Selecciona un formato' }]}
                >
                  <Select placeholder="Selecciona el formato de fecha">
                    {formatOptions.map(format => (
                      <Option key={format.value} value={format.value}>
                        {format.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Ajuste Automático de Horario de Verano */}
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
              <Row gutter={16} align="middle">
                <Col span={18}>
                  <div>
                    <Text strong style={{ fontSize: '16px' }}>
                      <ClockCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                      Ajuste Automático de Horario de Verano (DST)
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Permite el cambio automático entre horario de invierno y verano según la zona horaria seleccionada
                    </Text>
                  </div>
                </Col>
                <Col span={6} style={{ textAlign: 'right' }}>
                  <Form.Item name="autoDST" valuePropName="checked" style={{ margin: 0 }}>
                    <Switch
                      checkedChildren="Automático"
                      unCheckedChildren="Fijo"
                      size="default"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Vista Previa */}
            {currentTime && (
              <Card size="small" style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Hora Actual del Sistema</Text>
                      <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                        {currentTime}
                      </Text>
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Zona Horaria</Text>
                      <Text strong>
                        {config.timezone}
                      </Text>
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Formato</Text>
                      <Text strong>
                        {config.displayFormat}
                      </Text>
                    </Space>
                  </Col>
                </Row>
              </Card>
            )}

            <Divider />

            {/* Botones de Acción */}
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  icon={<CheckCircleOutlined />}
                >
                  Guardar Configuración de Timezone
                </Button>
                <Button
                  icon={<ClockCircleOutlined />}
                  onClick={getCurrentTime}
                  loading={testingTime}
                  size="large"
                >
                  Probar Timezone
                </Button>
                <Button
                  icon={<SyncOutlined />}
                  onClick={loadTimezoneConfig}
                  size="large"
                >
                  Recargar Configuración
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default TimezoneSettings;