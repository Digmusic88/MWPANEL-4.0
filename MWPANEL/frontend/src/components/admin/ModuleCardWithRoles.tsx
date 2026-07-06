/**
 * @archivo: ModuleCardWithRoles.tsx
 * @módulo: Admin Components (Sistema de Configuración de Módulos)
 * @función: Componente para configurar módulos con roles específicos
 * @crítico: SÍ - Configuración granular del sistema por roles
 * @dependencias: useModuleSettings, Ant Design
 * @relacionado_con: AdminSettingsPage, DashboardLayout
 */

import React, { useState, useEffect } from 'react';
import { Card, Switch, Typography, Tag, Space, Button, Checkbox, Collapse, message, Spin, Tooltip, Drawer } from 'antd';
import { 
  SettingOutlined, 
  EyeOutlined, 
  TeamOutlined, 
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  BookOutlined,
  HomeOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { useModuleSettings } from '../../hooks/useModuleSettings';
import ModuleSubcategoryConfig from './ModuleSubcategoryConfig';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface ModuleCardWithRolesProps {
  moduleKey: string;
  title: string;
  description: string;
  menuLocation: string;
  defaultRoles: string[];
  onUpdate?: (moduleKey: string, success: boolean) => void;
}

interface RoleConfig {
  admin: boolean;
  teacher: boolean;
  student: boolean;
  family: boolean;
}

const ModuleCardWithRoles: React.FC<ModuleCardWithRolesProps> = ({
  moduleKey,
  title,
  description,
  menuLocation,
  defaultRoles,
  onUpdate
}) => {
  const { 
    getModuleRoleSettings, 
    configureModuleForRoles, 
    isModuleEnabled,
    enableModule,
    disableModule,
    isLoading: moduleSettingsLoading 
  } = useModuleSettings();

  const [loading, setLoading] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [roleConfig, setRoleConfig] = useState<RoleConfig>({
    admin: false,
    teacher: false,
    student: false,
    family: false
  });
  const [subcategoryDrawerVisible, setSubcategoryDrawerVisible] = useState(false);

  // Configuración inicial
  useEffect(() => {
    loadModuleSettings();
  }, [moduleKey]);

  const loadModuleSettings = async () => {
    setLoading(true);
    try {
      // Cargar configuración global
      const globalState = isModuleEnabled(moduleKey);
      setGlobalEnabled(globalState);

      // Cargar configuración por roles
      const roleSettings = await getModuleRoleSettings(moduleKey);
      if (roleSettings) {
        setRoleConfig({
          admin: roleSettings.roleSettings.admin || false,
          teacher: roleSettings.roleSettings.teacher || false,
          student: roleSettings.roleSettings.student || false,
          family: roleSettings.roleSettings.family || false,
        });
      }
    } catch (error) {
      console.error('Error loading module settings:', error);
      message.error('Error cargando configuración del módulo');
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      if (enabled) {
        await enableModule(moduleKey);
      } else {
        await disableModule(moduleKey);
      }
      setGlobalEnabled(enabled);
      message.success(`Módulo ${enabled ? 'habilitado' : 'deshabilitado'} exitosamente`);
      onUpdate?.(moduleKey, true);
    } catch (error) {
      console.error('Error toggling module:', error);
      message.error('Error al actualizar el módulo');
      onUpdate?.(moduleKey, false);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: keyof RoleConfig, enabled: boolean) => {
    setRoleConfig(prev => ({
      ...prev,
      [role]: enabled
    }));
  };

  const handleSaveRoleConfig = async () => {
    setLoading(true);
    try {
      await configureModuleForRoles(moduleKey, roleConfig);
      message.success('Configuración por roles actualizada exitosamente');
      onUpdate?.(moduleKey, true);
    } catch (error) {
      console.error('Error saving role configuration:', error);
      
      // More specific error handling
      if (error.response?.status === 401) {
        message.error('No tienes permisos para realizar esta acción. Por favor, inicia sesión nuevamente.');
      } else if (error.response?.status === 404) {
        message.error('Endpoint no encontrado. Verifica que el backend esté actualizado.');
      } else {
        message.error('Error al guardar configuración por roles: ' + (error.message || 'Error desconocido'));
      }
      
      onUpdate?.(moduleKey, false);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    const icons = {
      admin: <SettingOutlined />,
      teacher: <UserOutlined />,
      student: <BookOutlined />,
      family: <HomeOutlined />
    };
    return icons[role] || <TeamOutlined />;
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: '#f5222d',
      teacher: '#1890ff',
      student: '#52c41a',
      family: '#fa8c16'
    };
    return colors[role] || '#666';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      teacher: 'Profesor',
      student: 'Estudiante',
      family: 'Familia'
    };
    return labels[role] || role;
  };

  const getModuleColor = (key: string) => {
    const colorMap: { [key: string]: string } = {
      'expedientes': '#1890ff',
      'calendario': '#722ed1',
      'recursos': '#13c2c2',
      'analytics': '#eb2f96',
      'chat': '#52c41a',
      'meetings': '#f5222d',
    };
    return colorMap[key] || '#666';
  };

  const moduleColor = getModuleColor(moduleKey);

  if (loading && moduleSettingsLoading) {
    return (
      <Card style={{ height: '100%', borderRadius: '12px' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '10px' }}>Cargando configuración...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      style={{
        height: '100%',
        borderRadius: '12px',
        boxShadow: globalEnabled 
          ? `0 4px 12px ${moduleColor}20, 0 2px 4px ${moduleColor}10`
          : '0 2px 8px rgba(0,0,0,0.08)',
        border: globalEnabled 
          ? `2px solid ${moduleColor}30`
          : '1px solid #e8e8e8',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      bodyStyle={{ padding: '20px' }}
    >
      {/* Status Badge */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60px',
          height: '20px',
          backgroundColor: globalEnabled ? moduleColor : '#d9d9d9',
          borderBottomLeftRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}
        >
          {globalEnabled ? 'ON' : 'OFF'}
        </Text>
      </div>

      {/* Module Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: `${moduleColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: moduleColor,
            }}
          >
            <SettingOutlined />
          </div>
          <div style={{ flex: 1 }}>
            <Title level={5} style={{ margin: 0, color: '#1f2937' }}>
              {title}
              <Tooltip title="Configuración por roles permite control granular">
                <InfoCircleOutlined style={{ marginLeft: '8px', color: '#1890ff' }} />
              </Tooltip>
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {description}
            </Text>
          </div>
        </div>
        <Text type="secondary" style={{ fontSize: '11px' }}>
          <strong>Ubicación:</strong> {menuLocation}
        </Text>
      </div>

      {/* Main Toggle */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text strong>Módulo Activo</Text>
          <Switch
            checked={globalEnabled}
            onChange={handleGlobalToggle}
            loading={loading}
            style={{
              backgroundColor: globalEnabled ? moduleColor : undefined,
            }}
          />
        </div>
      </div>

      {/* Roles Section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <TeamOutlined style={{ color: moduleColor }} />
          <Text strong style={{ fontSize: '14px' }}>Configuración por Roles:</Text>
        </div>
        
        <Space wrap style={{ marginBottom: '12px' }}>
          {Object.entries(roleConfig).map(([role, enabled]) => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Checkbox
                checked={enabled}
                onChange={(e) => handleRoleChange(role as keyof RoleConfig, e.target.checked)}
                disabled={loading}
                style={{ fontSize: '12px' }}
              />
              <div style={{ color: getRoleColor(role) }}>
                {getRoleIcon(role)}
              </div>
              <Tag
                color={enabled ? getRoleColor(role) : 'default'}
                style={{
                  borderRadius: '4px',
                  fontSize: '11px',
                  padding: '2px 6px',
                  opacity: enabled ? 1 : 0.5,
                }}
              >
                {getRoleLabel(role)}
              </Tag>
            </div>
          ))}
        </Space>
        
        <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
          {Object.entries(roleConfig).filter(([_, enabled]) => enabled).length} de 4 roles activos
        </Text>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          icon={<AppstoreOutlined />}
          onClick={() => setSubcategoryDrawerVisible(true)}
          disabled={loading}
        >
          Subcategorías
        </Button>
        <Button
          size="small"
          onClick={loadModuleSettings}
          disabled={loading}
        >
          Recargar
        </Button>
        <Button
          size="small"
          type="primary"
          onClick={handleSaveRoleConfig}
          loading={loading}
        >
          Guardar
        </Button>
      </div>

      {/* Module Status Summary */}
      <div style={{ 
        paddingTop: '12px', 
        borderTop: '1px solid #f0f0f0',
        fontSize: '11px',
        color: '#666'
      }}>
        <Text type="secondary">
          Estado: {globalEnabled ? 
            `Activo para ${Object.entries(roleConfig).filter(([_, enabled]) => enabled).length} rol${Object.entries(roleConfig).filter(([_, enabled]) => enabled).length !== 1 ? 'es' : ''}` : 
            'Inactivo'
          }
        </Text>
      </div>

      {/* Subcategories Drawer */}
      <Drawer
        title={`Subcategorías - ${title}`}
        width={720}
        open={subcategoryDrawerVisible}
        onClose={() => setSubcategoryDrawerVisible(false)}
        destroyOnClose
      >
        <ModuleSubcategoryConfig
          moduleName={moduleKey}
          moduleTitle={title}
          onUpdate={(success) => {
            if (success) {
              onUpdate?.(moduleKey, true);
            }
          }}
        />
      </Drawer>
    </Card>
  );
};

export default ModuleCardWithRoles;