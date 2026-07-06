import React, { useState } from 'react';
import {
  Card,
  Form,
  Switch,
  InputNumber,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Tag,
  Row,
  Col,
} from 'antd';
import {
  ClockCircleOutlined,
  SettingOutlined,
  UserOutlined,
  SecurityScanOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const { Title, Text, Paragraph } = Typography;

/**
 * Componente para configurar el sistema de auto-logout
 * Permite a los administradores ajustar los tiempos y habilitar/deshabilitar la funcionalidad
 */
const AutoLogoutSettings: React.FC = () => {
  const {
    autoLogoutEnabled,
    autoLogoutTimeout,
    setAutoLogoutEnabled,
    setAutoLogoutTimeout,
  } = useAuthStore();

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Convertir milisegundos a minutos para la interfaz
  const timeoutInMinutes = Math.round(autoLogoutTimeout / (60 * 1000));

  // Opciones predefinidas de tiempo
  const timeoutOptions = [
    { value: 1, label: '1 minuto (test)', color: '#eb2f96' },
    { value: 2, label: '2 minutos (test)', color: '#f5222d' },
    { value: 5, label: '5 minutos', color: '#ff4d4f' },
    { value: 15, label: '15 minutos', color: '#faad14' },
    { value: 30, label: '30 minutos', color: '#52c41a' },
    { value: 60, label: '1 hora', color: '#1890ff' },
  ];

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      // Convertir minutos a milisegundos
      const timeoutMs = values.timeout * 60 * 1000;

      setAutoLogoutEnabled(values.enabled);
      setAutoLogoutTimeout(timeoutMs);

      console.log('⚙️ Auto-logout settings updated:', {
        enabled: values.enabled,
        timeout: values.timeout,
        timeoutMs
      });

      // Aquí podrías hacer una llamada a la API para guardar en el backend si es necesario
      // await apiClient.post('/admin/auto-logout-settings', values);

      // Simular delay para mostrar loading
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error('Error saving auto-logout settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSet = (minutes: number) => {
    form.setFieldsValue({ timeout: minutes });
  };

  const getStatusInfo = () => {
    if (!autoLogoutEnabled) {
      return {
        status: 'disabled',
        color: '#d9d9d9',
        text: 'Deshabilitado',
        description: 'El auto-logout está desactivado para todos los usuarios'
      };
    }

    if (timeoutInMinutes <= 15) {
      return {
        status: 'strict',
        color: '#ff4d4f',
        text: 'Muy Estricto',
        description: 'Sesiones muy cortas - máxima seguridad'
      };
    } else if (timeoutInMinutes <= 30) {
      return {
        status: 'recommended',
        color: '#faad14',
        text: 'Recomendado',
        description: 'Balance entre seguridad y usabilidad'
      };
    } else if (timeoutInMinutes <= 60) {
      return {
        status: 'relaxed',
        color: '#52c41a',
        text: 'Relajado',
        description: 'Sesiones más largas - mayor comodidad'
      };
    } else {
      return {
        status: 'lenient',
        color: '#1890ff',
        text: 'Muy Relajado',
        description: 'Sesiones largas - mínima interrupción'
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SecurityScanOutlined style={{ color: '#1890ff' }} />
          <span>Configuración de Auto-Logout</span>
        </div>
      }
      extra={
        <Tag color={statusInfo.color} icon={<ClockCircleOutlined />}>
          {statusInfo.text}
        </Tag>
      }
    >
      {/* Información general */}
      <Alert
        message="Sistema de Seguridad Automático"
        description="El auto-logout cierra automáticamente las sesiones de usuarios inactivos para proteger datos sensibles."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Estado actual */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>Estado Actual</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <UserOutlined style={{ fontSize: 24, color: statusInfo.color, marginBottom: 8 }} />
              <div>
                <Text strong>{autoLogoutEnabled ? 'Activo' : 'Inactivo'}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Sistema de Auto-logout
                </Text>
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <ClockCircleOutlined style={{ fontSize: 24, color: statusInfo.color, marginBottom: 8 }} />
              <div>
                <Text strong>{timeoutInMinutes} min</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Tiempo de inactividad
                </Text>
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <SettingOutlined style={{ fontSize: 24, color: statusInfo.color, marginBottom: 8 }} />
              <div>
                <Text strong>{statusInfo.text}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Nivel de seguridad
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {statusInfo.description}
          </Text>
        </div>
      </div>

      <Divider />

      {/* Formulario de configuración */}
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          enabled: autoLogoutEnabled,
          timeout: timeoutInMinutes,
        }}
        onFinish={handleSave}
      >
        <Form.Item
          label="Habilitar Auto-Logout"
          name="enabled"
          valuePropName="checked"
          extra="Cuando está habilitado, las sesiones se cerrarán automáticamente después del tiempo de inactividad especificado."
        >
          <Switch
            checkedChildren="Activo"
            unCheckedChildren="Inactivo"
            size="default"
          />
        </Form.Item>

        <Form.Item
          label="Tiempo de Inactividad (minutos)"
          name="timeout"
          rules={[
            { required: true, message: 'El tiempo es requerido' },
            { type: 'number', min: 1, max: 480, message: 'Debe estar entre 1 y 480 minutos' }
          ]}
          extra="Los usuarios recibirán una advertencia 30 segundos antes del cierre automático (o 5 minutos si el timeout es mayor a 10 min)."
        >
          <InputNumber
            min={1}
            max={480}
            style={{ width: '100%' }}
            placeholder="Ingrese el tiempo en minutos"
            addonAfter="minutos"
          />
        </Form.Item>

        {/* Opciones rápidas */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            Configuraciones Rápidas:
          </Text>
          <Space wrap>
            {timeoutOptions.map((option) => (
              <Button
                key={option.value}
                size="small"
                type={timeoutInMinutes === option.value ? "primary" : "default"}
                onClick={() => handleQuickSet(option.value)}
                style={{
                  borderColor: option.color,
                  color: timeoutInMinutes === option.value ? 'white' : option.color
                }}
              >
                {option.label}
              </Button>
            ))}
          </Space>
        </div>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
            size="large"
            style={{ width: '100%' }}
          >
            Guardar Configuración
          </Button>
        </Form.Item>
      </Form>

      {/* Información adicional */}
      <div style={{ marginTop: 24 }}>
        <Title level={5}>¿Cómo funciona?</Title>
        <Paragraph style={{ fontSize: 13, color: '#666' }}>
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
            <li>El sistema detecta automáticamente la inactividad del usuario (movimientos del mouse, clics, teclas).</li>
            <li>5 minutos antes del cierre, se muestra una advertencia con cuenta regresiva.</li>
            <li>El usuario puede elegir extender la sesión o cerrar sesión inmediatamente.</li>
            <li>Si no hay respuesta, la sesión se cierra automáticamente por seguridad.</li>
            <li>Los cambios se aplican inmediatamente a todos los usuarios conectados.</li>
          </ul>
        </Paragraph>
      </div>
    </Card>
  );
};

export default AutoLogoutSettings;