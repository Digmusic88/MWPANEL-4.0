import React, { useState } from 'react';
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
} from 'antd';
import {
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  InfoCircleOutlined,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';

const { Title, Text } = Typography;

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (values: ChangePasswordForm) => {
    try {
      setLoading(true);
      
      await apiClient.patch('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      
      message.success('Contraseña cambiada exitosamente');
      form.resetFields();
    } catch (error: any) {
      console.error('Error changing password:', error);
      message.error(error.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
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

    const newPassword = form.getFieldValue('newPassword');
    if (value !== newPassword) {
      return Promise.reject(new Error('Las contraseñas no coinciden'));
    }

    return Promise.resolve();
  };

  return (
    <div className="settings-page">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <LockOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: 16 }} />
              <Title level={3}>Configuración de Cuenta</Title>
              <Text type="secondary">
                Gestiona la configuración de tu cuenta y seguridad
              </Text>
            </div>

            <Divider />

            <div>
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
                form={form}
                layout="vertical"
                onFinish={handleChangePassword}
                autoComplete="off"
              >
                <Form.Item
                  name="currentPassword"
                  label="Contraseña Actual"
                  rules={[
                    {
                      required: true,
                      message: 'Por favor ingresa tu contraseña actual',
                    },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Ingresa tu contraseña actual"
                    iconRender={(visible) =>
                      visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                    }
                  />
                </Form.Item>

                <Form.Item
                  name="newPassword"
                  label="Nueva Contraseña"
                  rules={[
                    {
                      validator: validatePassword,
                    },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Ingresa tu nueva contraseña"
                    iconRender={(visible) =>
                      visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                    }
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label="Confirmar Nueva Contraseña"
                  rules={[
                    {
                      validator: validateConfirmPassword,
                    },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Confirma tu nueva contraseña"
                    iconRender={(visible) =>
                      visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                    }
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    style={{ width: '100%' }}
                  >
                    Cambiar Contraseña
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;