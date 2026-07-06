/**
 * @archivo: ModuleSubcategoryConfig.tsx
 * @función: Componente para configurar subcategorías específicas por módulo y rol
 * @descripción: Configuración granular de subcategorías dentro de cada módulo
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Checkbox, 
  Typography, 
  Space, 
  Button, 
  Spin, 
  message, 
  Collapse, 
  Tag, 
  Badge, 
  Divider,
  Tooltip
} from 'antd';
import { 
  SettingOutlined,
  UserOutlined,
  BookOutlined,
  HomeOutlined,
  MessageOutlined,
  BellOutlined,
  MailOutlined,
  RobotOutlined,
  EditOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  FormOutlined,
  HistoryOutlined,
  LineChartOutlined,
  CalendarOutlined,
  TrophyOutlined,
  ReadOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  NodeIndexOutlined,
  ScheduleOutlined,
  BarChartOutlined,
  NumberOutlined,
  TableOutlined,
  BulbOutlined,
  UserSwitchOutlined,
  StarOutlined,
  FolderOutlined,
  PlusOutlined,
  UploadOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  ShareAltOutlined,
  FileProtectOutlined
} from '@ant-design/icons';

import { useModuleSubcategories } from '../../hooks/useModuleSubcategories';
import { MODULE_SUBCATEGORIES, ModuleSubcategory } from '../../config/moduleSubcategories';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface ModuleSubcategoryConfigProps {
  moduleName: string;
  moduleTitle: string;
  onUpdate?: (updated: boolean) => void;
}

interface SubcategoryState {
  [role: string]: {
    [subcategoryKey: string]: boolean;
  };
}

const ModuleSubcategoryConfig: React.FC<ModuleSubcategoryConfigProps> = ({
  moduleName,
  moduleTitle,
  onUpdate
}) => {
  const { 
    getModuleSubcategorySettings, 
    configureModuleSubcategories, 
    isLoading 
  } = useModuleSubcategories();

  const [subcategoryState, setSubcategoryState] = useState<SubcategoryState>({});
  const [loadingState, setLoadingState] = useState(false);
  
  const roles = [
    { key: 'admin', label: 'Administrador', icon: <SettingOutlined />, color: '#f5222d' },
    { key: 'teacher', label: 'Profesor', icon: <UserOutlined />, color: '#1890ff' },
    { key: 'student', label: 'Estudiante', icon: <BookOutlined />, color: '#52c41a' },
    { key: 'family', label: 'Familia', icon: <HomeOutlined />, color: '#fa8c16' }
  ];

  const subcategories = MODULE_SUBCATEGORIES[moduleName] || [];

  // Iconos dinámicos por nombre
  const getIconByName = (iconName: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'MessageOutlined': <MessageOutlined />,
      'BellOutlined': <BellOutlined />,
      'MailOutlined': <MailOutlined />,
      'RobotOutlined': <RobotOutlined />,
      'UserOutlined': <UserOutlined />,
      'FormOutlined': <FormOutlined />,
      'HistoryOutlined': <HistoryOutlined />,
      'LineChartOutlined': <LineChartOutlined />,
      'ClockCircleOutlined': <ClockCircleOutlined />,
      'EditOutlined': <EditOutlined />,
      'TeamOutlined': <TeamOutlined />,
      'HomeOutlined': <HomeOutlined />,
      'EyeOutlined': <EyeOutlined />,
      'PhoneOutlined': <PhoneOutlined />,
      'SafetyCertificateOutlined': <SafetyCertificateOutlined />,
      'NodeIndexOutlined': <NodeIndexOutlined />,
      'ScheduleOutlined': <ScheduleOutlined />,
      'BarChartOutlined': <BarChartOutlined />,
      'BookOutlined': <BookOutlined />,
      'TrophyOutlined': <TrophyOutlined />,
      'ReadOutlined': <ReadOutlined />,
      'CalendarOutlined': <CalendarOutlined />,
      'NumberOutlined': <NumberOutlined />,
      'TableOutlined': <TableOutlined />,
      'FileTextOutlined': <FileTextOutlined />,
      'BulbOutlined': <BulbOutlined />,
      'CheckCircleOutlined': <CheckCircleOutlined />,
      'UserSwitchOutlined': <UserSwitchOutlined />,
      'StarOutlined': <StarOutlined />,
      'FolderOutlined': <FolderOutlined />,
      'PlusOutlined': <PlusOutlined />,
      'UploadOutlined': <UploadOutlined />,
      'CheckOutlined': <CheckOutlined />,
      'ExclamationCircleOutlined': <ExclamationCircleOutlined />,
      'PlayCircleOutlined': <PlayCircleOutlined />,
      'ShareAltOutlined': <ShareAltOutlined />,
      'FileProtectOutlined': <FileProtectOutlined />,
      'SettingOutlined': <SettingOutlined />
    };
    return iconMap[iconName] || <SettingOutlined />;
  };

  // Cargar configuraciones iniciales
  useEffect(() => {
    loadAllRoleSettings();
  }, [moduleName]);

  const loadAllRoleSettings = async () => {
    setLoadingState(true);
    const newState: SubcategoryState = {};

    try {
      for (const role of roles) {
        const settings = await getModuleSubcategorySettings(moduleName, role.key);
        if (settings) {
          newState[role.key] = settings;
        }
      }
      setSubcategoryState(newState);
    } catch (error) {
      console.error('Error loading role settings:', error);
    } finally {
      setLoadingState(false);
    }
  };

  const handleSubcategoryChange = (role: string, subcategoryKey: string, enabled: boolean) => {
    setSubcategoryState(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [subcategoryKey]: enabled
      }
    }));
  };

  const handleSaveRoleConfig = async (role: string) => {
    const roleSettings = subcategoryState[role] || {};
    const success = await configureModuleSubcategories(moduleName, role, roleSettings);
    
    if (success) {
      onUpdate?.(true);
    }
  };

  const getSubcategoryCount = (role: string) => {
    const availableSubcategories = subcategories.filter(sub => 
      sub.availableForRoles.includes(role)
    );
    const enabledCount = availableSubcategories.filter(sub => 
      subcategoryState[role]?.[sub.key]
    ).length;
    
    return { enabled: enabledCount, total: availableSubcategories.length };
  };

  if (subcategories.length === 0) {
    return (
      <Card>
        <Text type="secondary">No hay subcategorías configurables para este módulo</Text>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingOutlined />
          <span>Configuración de Subcategorías - {moduleTitle}</span>
        </div>
      }
      loading={loadingState || isLoading}
      style={{ marginTop: '16px' }}
    >
      <Collapse defaultActiveKey={['admin']}>
        {roles.map(role => {
          const availableSubcategories = subcategories.filter(sub => 
            sub.availableForRoles.includes(role.key)
          );
          
          if (availableSubcategories.length === 0) {
            return null;
          }

          const counts = getSubcategoryCount(role.key);
          
          return (
            <Panel
              key={role.key}
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: role.color }}>
                    {role.icon}
                  </div>
                  <span>{role.label}</span>
                  <Badge 
                    count={`${counts.enabled}/${counts.total}`}
                    style={{ 
                      backgroundColor: counts.enabled === counts.total ? '#52c41a' : '#fa8c16'
                    }}
                  />
                </div>
              }
            >
              <div style={{ padding: '16px 0' }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {availableSubcategories.map(subcategory => (
                    <div key={subcategory.key} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      padding: '8px 12px',
                      border: '1px solid #f0f0f0',
                      borderRadius: '6px',
                      backgroundColor: subcategoryState[role.key]?.[subcategory.key] ? '#f6ffed' : '#fafafa'
                    }}>
                      <Checkbox
                        checked={subcategoryState[role.key]?.[subcategory.key] || false}
                        onChange={(e) => handleSubcategoryChange(role.key, subcategory.key, e.target.checked)}
                      />
                      
                      <div style={{ color: role.color, fontSize: '16px' }}>
                        {getIconByName(subcategory.icon)}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Text strong>{subcategory.name}</Text>
                          {subcategory.defaultEnabled && (
                            <Tag color="blue" size="small">Por defecto</Tag>
                          )}
                        </div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {subcategory.description}
                        </Text>
                      </div>
                    </div>
                  ))}
                </Space>
                
                <Divider />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {counts.enabled} de {counts.total} subcategorías activas
                  </Text>
                  
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={() => handleSaveRoleConfig(role.key)}
                    loading={isLoading}
                  >
                    Guardar {role.label}
                  </Button>
                </div>
              </div>
            </Panel>
          );
        })}
      </Collapse>
      
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <Button 
          type="default" 
          onClick={loadAllRoleSettings}
          loading={loadingState}
        >
          Recargar Configuraciones
        </Button>
      </div>
    </Card>
  );
};

export default ModuleSubcategoryConfig;