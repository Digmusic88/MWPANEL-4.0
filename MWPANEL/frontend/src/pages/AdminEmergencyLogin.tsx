import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Alert,
  Typography,
  Space,
  Divider,
} from 'antd';
import {
  LockOutlined,
  UserOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '@services/apiClient';

const { Title, Text } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

const AdminEmergencyLogin: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === "function") {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn("Navigation error:", error, "Path:", path);
      }
    } else {
      console.warn("Navigate function not available:", path);
    }
  }, [navigate]);

  const handleSubmit = async (values: LoginForm) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/auth/admin-emergency', {
        email: values.email,
        password: values.password,
      });

      const { user, accessToken, refreshToken } = response.data;

      // Verificar que sea administrador
      if (user.role !== 'admin') {
        setError('Solo los administradores pueden acceder durante el modo mantenimiento');
        return;
      }

      // Guardar tokens
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Mostrar mensaje de éxito y redirigir a configuración
      safeNavigate('/admin/settings', { replace: true });

    } catch (error: any) {
      console.error('Error en login de emergencia:', error);
      
      if (error.response?.status === 401) {
        setError('Credenciales incorrectas');
      } else if (error.response?.status === 403) {
        setError('Solo administradores pueden usar el login de emergencia');
      } else {
        setError('Error al intentar acceder. Por favor intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card 
        className="w-full max-w-md shadow-2xl border-0"
        style={{ borderRadius: '16px' }}
      >
        <div className="text-center mb-6">
          <div className="mb-4">
            <WarningOutlined 
              style={{ 
                fontSize: '48px', 
                color: '#ff4d4f',
                marginBottom: '16px' 
              }} 
            />
          </div>
          <Title level={2} className="text-red-600 mb-2">
            Acceso de Emergencia
          </Title>
          <Text type="secondary" className="text-sm">
            Login exclusivo para administradores durante modo mantenimiento
          </Text>
        </div>

        <Alert
          message="Sistema en Modo Mantenimiento"
          description="Este sistema está actualmente en mantenimiento. Solo los administradores pueden acceder para gestionar la configuración del sistema."
          type="warning"
          icon={<SafetyCertificateOutlined />}
          showIcon
          className="mb-6"
        />

        {error && (
          <Alert
            message="Error de Acceso"
            description={error}
            type="error"
            showIcon
            className="mb-4"
          />
        )}

        <Form
          form={form}
          name="admin-emergency-login"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            label="Email de Administrador"
            rules={[
              { required: true, message: 'Por favor ingrese su email' },
              { type: 'email', message: 'Por favor ingrese un email válido' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="admin@mwpanel.com"
              autoComplete="email"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Contraseña"
            rules={[{ required: true, message: 'Por favor ingrese su contraseña' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Contraseña de administrador"
              autoComplete="current-password"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item className="mb-6">
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={loading}
              danger
              size="large"
            >
              {loading ? 'Verificando credenciales...' : 'Acceder al Sistema'}
            </Button>
          </Form.Item>
        </Form>

        <Divider />

        <div className="text-center">
          <Space direction="vertical" size="small">
            <Text type="secondary" className="text-xs">
              ⚠️ Solo para uso de administradores autorizados
            </Text>
            <Text type="secondary" className="text-xs">
              Si no eres administrador, espera a que el mantenimiento termine
            </Text>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default AdminEmergencyLogin;