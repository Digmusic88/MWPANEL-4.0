import React, { useState, useEffect } from 'react';
import { useModuleSettings } from '../../hooks/useModuleSettings';
import { useQueryClient } from '@tanstack/react-query';
import ModuleCardWithRoles from '../../components/admin/ModuleCardWithRoles';
import ClosureModeCard from '../../components/admin/ClosureModeCard';
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
  InputNumber,
  Tabs,
  Row,
  Col,
  TimePicker,
  Checkbox,
  Slider,
  Transfer,
  Table,
  Tag,
  Modal,
  Progress,
} from 'antd';
import {
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  InfoCircleOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  DatabaseOutlined,
  BellOutlined,
  CloudServerOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  DeleteOutlined,
  DownloadOutlined,
  HistoryOutlined,
  BugOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  KeyOutlined,
  ApiOutlined,
  ControlOutlined,
  ExperimentOutlined as TestIcon,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';
import { pdfManagerService } from '@/services/pdfManagerService';
import { nightlyRestartService } from '@/services/nightlyRestartService';
import PdfManagerModal from '@/components/system/PdfManagerModal';
import NightlyRestartModal from '@/components/system/NightlyRestartModal';
import TimeMachinePanel from '@/components/system/TimeMachinePanel';
import TimezoneSettings from '@/components/admin/TimezoneSettings';
import AutoLogoutSettings from '@/components/admin/AutoLogoutSettings';
import dayjs from 'dayjs';
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  FileTextOutlined as FileIcon,
  MessageOutlined,
  CalendarOutlined,
  TrophyOutlined,
  UsergroupAddOutlined,
  MailOutlined,
  BarChartOutlined,
  ExperimentOutlined,
  SafetyCertificateOutlined as ShieldIcon,
  FileSearchOutlined,
  HomeFilled,
  AuditOutlined,
  ProfileOutlined,
  EyeOutlined,
  FormOutlined,
  ScheduleOutlined,
  DesktopOutlined,
  ClusterOutlined,
  HeartOutlined,
  ToolOutlined,
  BranchesOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface SystemConfiguration {
  allowRegistrations: boolean;
  defaultUserRole: string;
  sessionTimeout: number;
  maxFileUploadSize: number;
  enabledModules: string[];
  systemName: string;
  systemEmail: string;
  maxStudentsPerClass: number;
  academicYearStart: string;
  academicYearEnd: string;
}

interface SecuritySettings {
  requireTwoFactor: boolean;
  passwordExpiration: number;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireUppercase: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
  allowPasswordReset: boolean;
  ipWhitelist: string[];
}

interface BackupSettings {
  enableAutoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  retentionCount: number;
}

interface NotificationSettings {
  enableSystemAlerts: boolean;
  enableErrorNotifications: boolean;
  enableSecurityAlerts: boolean;
  adminEmails: string[];
  alertThresholds: {
    diskUsage: number;
    memoryUsage: number;
    errorRate: number;
    loginFailures: number;
  };
}

interface LogSettings {
  enableAuditLog: boolean;
  enableErrorLog: boolean;
  enableAccessLog: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logRetentionDays: number;
  enableLogRotation: boolean;
  maxLogSize: number;
}

// Helper functions for modules
const getModuleIcon = (moduleKey: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'expedientes': <ProfileOutlined />,
    'calendario': <CalendarOutlined />,
    'recursos': <FileIcon />,
    'analytics': <BarChartOutlined />,
    'chat': <MessageOutlined />,
    'educational_resources': <BookOutlined />,
    'meetings': <ClusterOutlined />,
  };
  return iconMap[moduleKey] || <ToolOutlined />;
};

const getModuleColor = (moduleKey: string) => {
  const colorMap: { [key: string]: string } = {
    'expedientes': '#faad14',
    'calendario': '#52c41a',
    'recursos': '#13c2c2',
    'analytics': '#2f54eb',
    'chat': '#722ed1',
    'educational_resources': '#fa8c16',
    'meetings': '#eb2f96',
  };
  return colorMap[moduleKey] || '#1890ff';
};

const getModuleRoles = (moduleKey: string) => {
  const roleMap: { [key: string]: string[] } = {
    'expedientes': ['admin', 'teacher', 'family'],
    'calendario': ['admin', 'teacher', 'student', 'family'],
    'recursos': ['admin', 'teacher', 'student'],
    'analytics': ['admin', 'teacher', 'family'],
    'chat': ['admin', 'teacher'],
    'educational_resources': ['admin', 'teacher', 'student'],
    'meetings': ['admin', 'teacher'],
  };
  return roleMap[moduleKey] || ['admin'];
};

const getRoleColor = (role: string) => {
  const colors: { [key: string]: string } = {
    'admin': '#f5222d',
    'teacher': '#52c41a',
    'student': '#1890ff',
    'family': '#722ed1',
  };
  return colors[role] || '#8c8c8c';
};

const getRoleLabel = (role: string) => {
  const labels: { [key: string]: string } = {
    'admin': 'Admin',
    'teacher': 'Profesor',
    'student': 'Estudiante',
    'family': 'Familia',
  };
  return labels[role] || role;
};

// ModuleCard component
interface ModuleCardProps {
  module: any;
  isEnabled: boolean;
  onToggle: (isEnabled: boolean) => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module, isEnabled, onToggle }) => {
  const moduleColor = getModuleColor(module.key);
  const moduleRoles = getModuleRoles(module.key);

  return (
    <Card
      style={{
        height: '100%',
        borderRadius: '12px',
        boxShadow: isEnabled 
          ? `0 4px 12px ${moduleColor}20, 0 2px 4px ${moduleColor}10`
          : '0 2px 8px rgba(0,0,0,0.08)',
        border: isEnabled 
          ? `2px solid ${moduleColor}30`
          : '1px solid #e8e8e8',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      hoverable
      bodyStyle={{ padding: '24px' }}
    >
      {/* Status Badge */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60px',
          height: '20px',
          backgroundColor: isEnabled ? moduleColor : '#d9d9d9',
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
          {isEnabled ? 'ON' : 'OFF'}
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
            {getModuleIcon(module.key)}
          </div>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0, color: '#1f2937' }}>
              {module.title}
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {module.key}
            </Text>
          </div>
        </div>
      </div>

      {/* Module Description */}
      <Paragraph
        style={{
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#4b5563',
          marginBottom: '16px',
          minHeight: '42px',
        }}
      >
        Gestión y configuración del módulo {module.title.toLowerCase()} del sistema educativo.
      </Paragraph>

      {/* Role Audience */}
      <div style={{ marginBottom: '20px' }}>
        <Text
          type="secondary"
          style={{
            fontSize: '12px',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: '8px',
          }}
        >
          Visible para roles:
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {moduleRoles.map(role => (
            <Tag
              key={role}
              color={getRoleColor(role)}
              style={{
                border: 'none',
                fontWeight: '500',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {getRoleLabel(role)}
            </Tag>
          ))}
        </div>
      </div>

      {/* Toggle Switch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: isEnabled ? moduleColor : '#8c8c8c',
          }}
        >
          {isEnabled ? 'Módulo Habilitado' : 'Módulo Deshabilitado'}
        </Text>
        <Switch
          checked={isEnabled}
          onChange={onToggle}
          style={{
            backgroundColor: isEnabled ? moduleColor : '#d9d9d9',
            borderColor: isEnabled ? moduleColor : '#d9d9d9',
          }}
          size="default"
        />
      </div>
    </Card>
  );
};

const AdminSettingsPage: React.FC = () => {
  const [passwordForm] = Form.useForm();
  const [systemForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [backupForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [logForm] = Form.useForm();
  
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [systemLoading, setSystemLoading] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [pdfManagerModalVisible, setPdfManagerModalVisible] = useState(false);
  const [nightlyRestartModalVisible, setNightlyRestartModalVisible] = useState(false);
  const [availableBackups, setAvailableBackups] = useState([]);

  // AI Assistant states
  const [aiForm] = Form.useForm();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    enabled: false,
    provider: 'anthropic',
    hasAnthropicKey: false,
    hasOpenAIKey: false,
    hasGeminiKey: false,
    hasOpenRouterKey: false,
    dailyLimitTeacher: 20,
    dailyLimitAdmin: 50,
    modelAnthropic: 'claude-opus-4-7',
    modelOpenAI: 'gpt-3.5-turbo',
    modelGemini: 'gemini-1.5-flash',
    modelOpenRouter: 'openai/gpt-3.5-turbo',
  });
  const [testingConnection, setTestingConnection] = useState(false);
  
  const [systemConfig, setSystemConfig] = useState<SystemConfiguration>({
    allowRegistrations: true,
    defaultUserRole: 'student',
    sessionTimeout: 60,
    maxFileUploadSize: 10,
    enabledModules: [],
    systemName: 'MW Panel',
    systemEmail: 'admin@mwpanel.com',
    maxStudentsPerClass: 30,
    academicYearStart: '2024-09-01',
    academicYearEnd: '2025-06-30',
  });

  // Use the module settings hook for real module management
  const { 
    isModuleEnabled, 
    enableModule, 
    disableModule, 
    getModulesStatus, 
    isLoading: moduleSettingsLoading,
    getEnabledRolesForModule,
    enableModuleForRole,
    disableModuleForRole,
    // New methods for role-based configuration
    getModuleRoleSettings,
    configureModuleForRoles,
    getAllModuleRoleSettings,
    initializeModuleRoleSettings
  } = useModuleSettings();
  
  // Get query client for cache invalidation
  const queryClient = useQueryClient();

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    requireTwoFactor: false,
    passwordExpiration: 90,
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    passwordRequireNumbers: true,
    passwordRequireUppercase: true,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    allowPasswordReset: true,
    ipWhitelist: [],
  });

  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    enableAutoBackup: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    retentionDays: 10,
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enableSystemAlerts: true,
    enableErrorNotifications: true,
    enableSecurityAlerts: true,
    adminEmails: ['admin@mwpanel.com'],
    alertThresholds: {
      diskUsage: 80,
      memoryUsage: 85,
      errorRate: 5,
      loginFailures: 10,
    },
  });

  const [logSettings, setLogSettings] = useState<LogSettings>({
    enableAuditLog: true,
    enableErrorLog: true,
    enableAccessLog: true,
    logLevel: 'info',
    logRetentionDays: 90,
    enableLogRotation: true,
    maxLogSize: 100,
  });

  const availableModules = [
    { 
      key: 'expedientes', 
      title: 'Sistema de Expedientes',
      roles: ['admin', 'teacher', 'student', 'family']
    },
    { 
      key: 'calendario', 
      title: 'Sistema de Calendario',
      roles: ['admin', 'teacher', 'student', 'family']
    },
    { 
      key: 'recursos', 
      title: 'Sistema de Recursos Educativos',
      roles: ['admin', 'teacher', 'student']
    },
    { 
      key: 'analytics', 
      title: 'Sistema de Informes y Analytics',
      roles: ['admin', 'teacher']
    },
    { 
      key: 'comunicaciones', 
      title: 'Sistema de Comunicaciones',
      roles: ['admin', 'teacher', 'student', 'family']
    },
    { 
      key: 'estudiantes', 
      title: 'Sistema de Estudiantes',
      roles: ['admin', 'teacher', 'student', 'family']
    },
    { 
      key: 'profesores', 
      title: 'Sistema de Profesores',
      roles: ['admin', 'teacher']
    },
    { 
      key: 'familias', 
      title: 'Sistema de Familias',
      roles: ['admin', 'teacher', 'family']
    },
    { 
      key: 'grupos', 
      title: 'Sistema de Grupos/Clases',
      roles: ['admin', 'teacher', 'student', 'family']
    },
    { 
      key: 'asignaturas', 
      title: 'Sistema de Asignaturas',
      roles: ['admin', 'teacher', 'student']
    },
    { 
      key: 'evaluaciones', 
      title: 'Sistema de Evaluaciones',
      roles: ['admin', 'teacher', 'student', 'family']
    },
    { 
      key: 'competencias', 
      title: 'Sistema de Competencias',
      roles: ['admin', 'teacher', 'student', 'family']
    },
    { 
      key: 'actividades', 
      title: 'Sistema de Actividades',
      roles: ['admin', 'teacher', 'student', 'family']
    },
    { 
      key: 'tareas', 
      title: 'Sistema de Tareas',
      roles: ['admin', 'teacher', 'student', 'family']
    },
    { 
      key: 'asistencia', 
      title: 'Sistema de Asistencia',
      roles: ['admin', 'teacher', 'family']
    },
    { 
      key: 'notas', 
      title: 'Sistema de Notas',
      roles: ['admin', 'teacher', 'student', 'family']
    },
    { 
      key: 'dua', 
      title: 'Sistema de Accesibilidad (DUA)',
      roles: ['admin', 'teacher', 'family']
    },
    { 
      key: 'meetings', 
      title: 'Sistema de Reuniones',
      roles: ['admin', 'teacher']
    },
  ];

  useEffect(() => {
    loadSettings();
    loadBackupConfig();
    loadAIConfig();
  }, []);

  const loadSettings = async () => {
    try {
      setSystemLoading(true);
      const response = await apiClient.get('/settings');
      const settingsArray = response.data;
      
      // Validate that we received an array
      if (!Array.isArray(settingsArray)) {
        console.error('Settings response is not an array:', settingsArray);
        return;
      }
      
      // Convert array of settings to grouped object
      const systemConfig: any = {};
      const securityConfig: any = {};
      const backupConfig: any = {};
      const notificationConfig: any = {};
      const logConfig: any = {};
      
      settingsArray.forEach((setting: any) => {
        if (!setting || typeof setting !== 'object') {
          console.warn('Invalid setting object:', setting);
          return;
        }
        
        const { key, value, type } = setting;
        
        if (!key || value === undefined) {
          console.warn('Setting missing key or value:', setting);
          return;
        }
        
        // Convert value based on type
        let convertedValue = value;
        if (type === 'boolean') {
          convertedValue = value === 'true' || value === true;
        } else if (type === 'number') {
          convertedValue = parseInt(value);
          if (isNaN(convertedValue)) {
            convertedValue = 0;
          }
        } else if (type === 'json') {
          try {
            convertedValue = JSON.parse(value);
          } catch (e) {
            console.warn('Failed to parse JSON setting:', key, value);
            convertedValue = value;
          }
        }
        
        // Group by category based on key prefix
        if (key.startsWith('system_')) {
          systemConfig[key.replace('system_', '')] = convertedValue;
        } else if (key.startsWith('security_')) {
          securityConfig[key.replace('security_', '')] = convertedValue;
        } else if (key.startsWith('backup_')) {
          // Skip backup settings - handled by dedicated loadBackupConfig function
          // backupConfig[key.replace('backup_', '')] = convertedValue;
        } else if (key.startsWith('notification_')) {
          notificationConfig[key.replace('notification_', '')] = convertedValue;
        } else if (key.startsWith('log_')) {
          logConfig[key.replace('log_', '')] = convertedValue;
        }
      });
      
      console.log('Loaded system config:', systemConfig);
      
      setSystemConfig(systemConfig);
      systemForm.setFieldsValue(systemConfig);
      
      setSecuritySettings(securityConfig);
      securityForm.setFieldsValue(securityConfig);
      
      // Backup settings are now handled by dedicated loadBackupConfig function
      
      setNotificationSettings(notificationConfig);
      notificationForm.setFieldsValue(notificationConfig);
      
      setLogSettings(logConfig);
      logForm.setFieldsValue(logConfig);
      
    } catch (error: any) {
      console.error('Error loading admin settings:', error);
      // Set default values on error
      setSystemConfig({
        allowRegistrations: true,
        defaultUserRole: 'student',
        sessionTimeout: 60,
        maxFileUploadSize: 10,
        enabledModules: [],
        systemName: 'MW Panel',
        systemEmail: 'admin@mwpanel.com',
        maxStudentsPerClass: 30,
        academicYearStart: '2024-09-01',
        academicYearEnd: '2025-06-30',
      });
      setSecuritySettings({
        requireTwoFactor: false,
        passwordExpiration: 90,
        passwordMinLength: 8,
        passwordRequireSpecialChars: true,
        passwordRequireNumbers: true,
        passwordRequireUppercase: true,
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        allowPasswordReset: true,
        ipWhitelist: [],
      });
      // Backup settings defaults are handled by loadBackupConfig function
      setNotificationSettings({
        enableSystemAlerts: true,
        enableErrorNotifications: true,
        enableSecurityAlerts: true,
        adminEmails: ['admin@mwpanel.com'],
        alertThresholds: {
          diskUsage: 80,
          memoryUsage: 85,
          errorRate: 5,
          loginFailures: 10,
        },
      });
      setLogSettings({
        logLevel: 'info',
        logRetentionDays: 90,
        enableLogRotation: true,
        maxLogSize: 100,
      });
    } finally {
      setSystemLoading(false);
    }
  };

  const loadBackupConfig = async () => {
    try {
      // Load backup configuration from the new unified endpoint
      const backupConfigResponse = await apiClient.get('/settings/backup/config');
      const backupConfig = backupConfigResponse.data;
      
      console.log('✅ Loaded backup config from new endpoint:', backupConfig);
      
      // Convert backupTime to dayjs object for the form
      const backupFormValues = { ...backupConfig };
      if (backupFormValues.backupTime && typeof backupFormValues.backupTime === 'string') {
        backupFormValues.backupTime = dayjs(backupFormValues.backupTime, 'HH:mm');
      }
      
      setBackupSettings(backupConfig);
      backupForm.setFieldsValue(backupFormValues);
      
    } catch (error: any) {
      console.error('Error loading backup config:', error);
      // Set default backup settings on error
      const defaultBackupSettings = {
        enableAutoBackup: true,
        backupFrequency: 'daily' as const,
        backupTime: '02:00',
        retentionCount: 10,
      };
      
      // Set form values with dayjs conversion for backupTime
      const backupFormValues = { ...defaultBackupSettings };
      if (backupFormValues.backupTime) {
        backupFormValues.backupTime = dayjs(backupFormValues.backupTime, 'HH:mm');
      }
      setBackupSettings(defaultBackupSettings);
      backupForm.setFieldsValue(backupFormValues);
    }
  };

  const loadAIConfig = async () => {
    try {
      const response = await apiClient.get('/settings/ai-assistant/status');
      const config = response.data;
      
      setAiConfig(config);
      aiForm.setFieldsValue({
        enabled: config.enabled,
        provider: config.provider,
        anthropicKey: config.hasAnthropicKey ? '••••••••••••••••' : '',
        openaiKey: config.hasOpenAIKey ? '••••••••••••••••' : '',
        geminiKey: config.hasGeminiKey ? '••••••••••••••••' : '',
        openrouterKey: config.hasOpenRouterKey ? '••••••••••••••••' : '',
        dailyLimitTeacher: config.dailyLimitTeacher,
        dailyLimitAdmin: config.dailyLimitAdmin,
        modelAnthropic: config.modelAnthropic,
        modelOpenAI: config.modelOpenAI,
        modelGemini: config.modelGemini,
        modelOpenRouter: config.modelOpenRouter,
      });
      
      console.log('✅ Loaded AI config:', config);
    } catch (error: any) {
      console.error('Error loading AI config:', error);
      // Set default values on error
      const defaultConfig = {
        enabled: false,
        provider: 'anthropic',
        hasAnthropicKey: false,
        hasOpenAIKey: false,
        hasGeminiKey: false,
        hasOpenRouterKey: false,
        dailyLimitTeacher: 20,
        dailyLimitAdmin: 50,
        modelAnthropic: 'claude-opus-4-7',
        modelOpenAI: 'gpt-3.5-turbo',
        modelGemini: 'gemini-1.5-flash',
        modelOpenRouter: 'openai/gpt-3.5-turbo',
      };
      setAiConfig(defaultConfig);
      aiForm.setFieldsValue({
        enabled: false,
        provider: 'anthropic',
        anthropicKey: '',
        openaiKey: '',
        geminiKey: '',
        openrouterKey: '',
        dailyLimitTeacher: 20,
        dailyLimitAdmin: 50,
        modelAnthropic: 'claude-opus-4-7',
        modelOpenAI: 'gpt-3.5-turbo',
        modelGemini: 'gemini-1.5-flash',
        modelOpenRouter: 'openai/gpt-3.5-turbo',
      });
    }
  };

  const handleToggleAI = async (enabled: boolean) => {
    try {
      setAiLoading(true);
      await apiClient.put('/settings/ai-assistant/enable', { enabled });
      setAiConfig(prev => ({ ...prev, enabled }));
      aiForm.setFieldValue('enabled', enabled);
      message.success(`Asistente de IA ${enabled ? 'habilitado' : 'deshabilitado'}`);
    } catch (error: any) {
      console.error('Error toggling AI:', error);
      message.error('Error al cambiar el estado del asistente de IA');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUpdateAIProvider = async (provider: 'anthropic' | 'openai' | 'gemini' | 'openrouter') => {
    try {
      await apiClient.put('/settings/ai-assistant/provider', { provider });
      setAiConfig(prev => ({ ...prev, provider }));
      message.success(`Proveedor actualizado a ${provider}`);
    } catch (error: any) {
      console.error('Error updating AI provider:', error);
      message.error('Error al actualizar el proveedor de IA');
    }
  };

  const handleUpdateAIKeys = async (values: any) => {
    try {
      setAiLoading(true);
      const updateData: any = {};
      
      if (values.anthropicKey && values.anthropicKey !== '••••••••••••••••') {
        updateData.anthropicKey = values.anthropicKey;
      }
      if (values.openaiKey && values.openaiKey !== '••••••••••••••••') {
        updateData.openaiKey = values.openaiKey;
      }
      if (values.geminiKey && values.geminiKey !== '••••••••••••••••') {
        updateData.geminiKey = values.geminiKey;
      }
      if (values.openrouterKey && values.openrouterKey !== '••••••••••••••••') {
        updateData.openrouterKey = values.openrouterKey;
      }
      
      if (Object.keys(updateData).length > 0) {
        const response = await apiClient.put('/settings/ai-assistant/api-keys', updateData);
        message.success(response.data.message);
        
        // Reload config to get updated key status
        await loadAIConfig();
      }
    } catch (error: any) {
      console.error('Error updating API keys:', error);
      message.error('Error al actualizar las claves API');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUpdateAILimits = async (teacherLimit: number, adminLimit: number) => {
    try {
      await apiClient.put('/settings/ai-assistant/limits', {
        teacherLimit,
        adminLimit
      });
      setAiConfig(prev => ({
        ...prev,
        dailyLimitTeacher: teacherLimit,
        dailyLimitAdmin: adminLimit
      }));
      message.success('Límites diarios actualizados');
    } catch (error: any) {
      console.error('Error updating AI limits:', error);
      message.error('Error al actualizar los límites diarios');
    }
  };

  const handleUpdateAIModels = async (anthropicModel: string, openaiModel: string, geminiModel: string, openrouterModel: string) => {
    try {
      await apiClient.put('/settings/ai-assistant/models', {
        anthropicModel,
        openaiModel,
        geminiModel,
        openrouterModel
      });
      setAiConfig(prev => ({
        ...prev,
        modelAnthropic: anthropicModel,
        modelOpenAI: openaiModel,
        modelGemini: geminiModel,
        modelOpenRouter: openrouterModel
      }));
      message.success('Modelos actualizados');
    } catch (error: any) {
      console.error('Error updating AI models:', error);
      message.error('Error al actualizar los modelos');
    }
  };

  const handleTestAIConnection = async (provider?: 'anthropic' | 'openai' | 'gemini' | 'openrouter') => {
    try {
      setTestingConnection(true);
      const response = await apiClient.post('/settings/ai-assistant/test-connection', {
        provider: provider || aiConfig.provider
      });
      
      if (response.data.success) {
        message.success(`✅ ${response.data.message}`);
      } else {
        message.error(`❌ ${response.data.message}`);
      }
    } catch (error: any) {
      console.error('Error testing AI connection:', error);
      message.error('Error al probar la conexión con el proveedor de IA');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleResetAIConfig = async () => {
    Modal.confirm({
      title: '¿Restablecer configuración de IA?',
      content: 'Esto restablecerá toda la configuración del asistente de IA a los valores por defecto.',
      okText: 'Restablecer',
      cancelText: 'Cancelar',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await apiClient.post('/settings/ai-assistant/reset-to-defaults');
          message.success(response.data.message);
          await loadAIConfig();
        } catch (error: any) {
          console.error('Error resetting AI config:', error);
          message.error('Error al restablecer la configuración de IA');
        }
      }
    });
  };

  const handleSaveAISettings = async (values: any) => {
    try {
      setAiLoading(true);
      
      // Update provider if changed
      if (values.provider !== aiConfig.provider) {
        await handleUpdateAIProvider(values.provider);
      }
      
      // Update API keys if provided
      await handleUpdateAIKeys(values);
      
      // Update limits if changed
      if (values.dailyLimitTeacher !== aiConfig.dailyLimitTeacher || 
          values.dailyLimitAdmin !== aiConfig.dailyLimitAdmin) {
        await handleUpdateAILimits(values.dailyLimitTeacher, values.dailyLimitAdmin);
      }
      
      // Update models if changed
      if (values.modelAnthropic !== aiConfig.modelAnthropic || 
          values.modelOpenAI !== aiConfig.modelOpenAI ||
          values.modelGemini !== aiConfig.modelGemini ||
          values.modelOpenRouter !== aiConfig.modelOpenRouter) {
        await handleUpdateAIModels(values.modelAnthropic, values.modelOpenAI, values.modelGemini, values.modelOpenRouter);
      }
      
      message.success('Configuración de IA guardada correctamente');
    } catch (error: any) {
      console.error('Error saving AI settings:', error);
      message.error('Error al guardar la configuración de IA');
    } finally {
      setAiLoading(false);
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

  const handleSaveSystemSettings = async (values: any) => {
    try {
      // Save settings individually using PUT /settings/:key
      const savePromises = Object.entries(values).map(([key, value]) => {
        // Handle different value types
        let serializedValue;
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          serializedValue = JSON.stringify(value);
        } else {
          serializedValue = String(value);
        }
        
        return apiClient.put(`/settings/system_${key}`, { value: serializedValue });
      });
      
      await Promise.all(savePromises);
      setSystemConfig(values);
      message.success('Configuración del sistema guardada correctamente');
    } catch (error: any) {
      console.error('Error saving system settings:', error);
      message.error('Error al guardar la configuración del sistema');
    }
  };

  const handleSaveSecuritySettings = async (values: any) => {
    try {
      // Save each setting individually using PUT /settings/:key
      const savePromises = Object.entries(values).map(([key, value]) => {
        let serializedValue;
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          serializedValue = JSON.stringify(value);
        } else {
          serializedValue = String(value);
        }
        
        return apiClient.put(`/settings/security_${key}`, { value: serializedValue });
      });
      
      await Promise.all(savePromises);
      setSecuritySettings(values);
      message.success('Configuración de seguridad guardada correctamente');
    } catch (error: any) {
      console.error('Error saving security settings:', error);
      message.error('Error al guardar la configuración de seguridad');
    }
  };

  const handleSaveBackupSettings = async (values: any) => {
    try {
      // Convert dayjs backupTime to string format for API
      const configData = { ...values };
      if (configData.backupTime && typeof configData.backupTime.format === 'function') {
        configData.backupTime = configData.backupTime.format('HH:mm');
      }
      
      console.log('💾 Saving backup config to new endpoint:', configData);
      
      // Use the new unified backup configuration endpoint
      await apiClient.put('/settings/backup/config', configData);
      
      setBackupSettings(configData);
      message.success('Configuración de backup guardada correctamente');
      
      console.log('✅ Backup configuration saved successfully');
    } catch (error: any) {
      console.error('Error saving backup settings:', error);
      message.error('Error al guardar la configuración de backup');
    }
  };

  const handleManualBackup = async () => {
    try {
      setBackupModalVisible(true);
      setBackupProgress(0);
      
      // Simulate backup progress
      const interval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);
      
      const response = await apiClient.post('/settings/backup/create', {});
      
      // Clear interval when backup is complete
      clearInterval(interval);
      setBackupProgress(100);
      
      // Show success message for local backup
      message.success(response.data.message || '🎯 Backup LOCAL creado exitosamente');
      if (response.data.filename) {
        message.info(`Archivo: ${response.data.filename} - Tamaño: ${response.data.size || 'calculando...'}`);
      }
      
      setTimeout(() => setBackupModalVisible(false), 2000);
      
      // Refresh backup list
      fetchAvailableBackups();
    } catch (error: any) {
      console.error('Error creating backup:', error);
      message.error('Error al crear el backup');
      setBackupModalVisible(false);
    }
  };

  const fetchAvailableBackups = async () => {
    try {
      // Fetch backups from local backup system
      const backupsResponse = await apiClient.get('/settings/backup/status');
      const backups = backupsResponse.data.recentBackups || [];

      // Format backups for the modals - adapt to local backup structure
      const allBackups = backups.map((backup: any, index: number) => ({
        id: backup.filename || `backup_${index}`,
        driveFileId: null, // Not used for local backups
        filename: backup.filename,
        size: backup.size, // Size is already formatted as string like "14.15 MB"
        formattedSize: backup.size,
        createdAt: backup.created,
        type: 'local',
        status: 'completed',
        hasLocalFile: true,
        hasDriveFile: false,
        localPath: backup.localPath
      }));

      setAvailableBackups(allBackups);
      console.log('✅ Loaded backups from local system:', allBackups.length, 'backups');
    } catch (error: any) {
      console.error('Error fetching backups from local system:', error);
      if (error?.response?.status === 401) {
        message.error('Sesión expirada. Por favor, cierre sesión y vuelva a iniciar sesión.');
      } else {
        message.error('Error al obtener lista de backups desde sistema local');
      }
    }
  };

  const handlePdfCleanup = async (options: any) => {
    try {
      const result = await pdfManagerService.cleanupPdfs(options);
      return result;
    } catch (error: any) {
      console.error('Error during PDF cleanup:', error);
      throw new Error(error.message || 'Error durante la limpieza de PDFs');
    }
  };

  const handlePdfOptimize = async () => {
    try {
      const result = await pdfManagerService.optimizeStorage();
      return result;
    } catch (error: any) {
      console.error('Error during PDF optimization:', error);
      throw new Error(error.message || 'Error durante la optimización de PDFs');
    }
  };

  const handlePdfDelete = async (fileId: string) => {
    try {
      const result = await pdfManagerService.deletePdf(fileId);
      return result.success;
    } catch (error: any) {
      console.error('Error deleting PDF:', error);
      throw new Error(error.message || 'Error al eliminar archivo PDF');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    if (!hasMinLength) return Promise.reject(new Error('La contraseña debe tener al menos 8 caracteres'));
    if (!hasLowerCase) return Promise.reject(new Error('La contraseña debe contener al menos una letra minúscula'));
    if (!hasUpperCase) return Promise.reject(new Error('La contraseña debe contener al menos una letra mayúscula'));
    if (!hasNumbers) return Promise.reject(new Error('La contraseña debe contener al menos un número'));
    if (!hasSpecialChar) return Promise.reject(new Error('La contraseña debe contener al menos un carácter especial (@$!%*?&)'));

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

  const tabItems = [
    {
      key: 'security',
      label: (
        <span>
          <LockOutlined />
          Seguridad
        </span>
      ),
      children: (
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="Cambiar Contraseña">
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
                    <Row gutter={16}>
                      <Col span={24}>
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
                      </Col>
                      <Col span={12}>
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
                      </Col>
                      <Col span={12}>
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
                      </Col>
                    </Row>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={passwordLoading}
                        size="large"
                      >
                        Cambiar Contraseña
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>

              <Col span={24}>
                <Card title="Configuración de Seguridad Global">
                  <Form
                    form={securityForm}
                    layout="vertical"
                    onFinish={handleSaveSecuritySettings}
                    initialValues={securitySettings}
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="passwordMinLength" label="Longitud mínima de contraseña">
                          <InputNumber min={6} max={20} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="passwordExpiration" label="Expiración de contraseña (días)">
                          <InputNumber min={0} max={365} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="maxLoginAttempts" label="Intentos máximos de login">
                          <InputNumber min={3} max={10} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="lockoutDuration" label="Duración de bloqueo (minutos)">
                          <InputNumber min={5} max={120} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="requireTwoFactor" valuePropName="checked">
                      <Checkbox>Requerir autenticación de dos factores</Checkbox>
                    </Form.Item>
                    <Form.Item name="passwordRequireSpecialChars" valuePropName="checked">
                      <Checkbox>Requerir caracteres especiales en contraseñas</Checkbox>
                    </Form.Item>
                    <Form.Item name="passwordRequireNumbers" valuePropName="checked">
                      <Checkbox>Requerir números en contraseñas</Checkbox>
                    </Form.Item>
                    <Form.Item name="passwordRequireUppercase" valuePropName="checked">
                      <Checkbox>Requerir mayúsculas en contraseñas</Checkbox>
                    </Form.Item>
                    <Form.Item name="allowPasswordReset" valuePropName="checked">
                      <Checkbox>Permitir restablecimiento de contraseña</Checkbox>
                    </Form.Item>

                    <Form.Item>
                      <Button type="primary" htmlType="submit" size="large">
                        Guardar Configuración de Seguridad
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>

              <Col span={24}>
                <AutoLogoutSettings />
              </Col>
            </Row>
      ),
    },
    {
      key: 'system',
      label: (
        <span>
          <SettingOutlined />
          Sistema
        </span>
      ),
      children: (
            <Card title="Configuración General del Sistema">
              <Form
                form={systemForm}
                layout="vertical"
                onFinish={handleSaveSystemSettings}
                initialValues={systemConfig}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="systemName" label="Nombre del Sistema">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="systemEmail" label="Email del Sistema">
                      <Input type="email" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="defaultUserRole" label="Rol por defecto">
                      <Select>
                        <Option value="student">Estudiante</Option>
                        <Option value="teacher">Profesor</Option>
                        <Option value="family">Familia</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="sessionTimeout" label="Timeout de sesión (minutos)">
                      <InputNumber min={15} max={480} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="maxFileUploadSize" label="Tamaño máximo de archivo (MB)">
                      <InputNumber min={1} max={100} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="maxStudentsPerClass" label="Estudiantes máximo por clase">
                      <InputNumber min={10} max={50} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="academicYearStart" label="Inicio año académico">
                      <Input type="date" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="academicYearEnd" label="Final año académico">
                      <Input type="date" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="allowRegistrations" valuePropName="checked">
                  <Checkbox>Permitir auto-registros</Checkbox>
                </Form.Item>

                <Divider orientation="left">Módulos del Sistema</Divider>
                <Form.Item name="enabledModules" label="Configuración de Módulos">
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: '20px',
                    marginTop: '16px'
                  }}>
                    {availableModules.map(module => (
                      <ModuleCardWithRoles 
                        key={module.key} 
                        moduleKey={module.key}
                        title={module.title}
                        description={`Gestión y configuración del módulo ${module.title.toLowerCase()} del sistema educativo.`}
                        menuLocation={`Panel de ${module.title}`}
                        defaultRoles={module.roles}
                        onUpdate={(moduleKey, success) => {
                          if (success) {
                            // Invalidate all moduleSettings queries globally to update menus
                            queryClient.invalidateQueries({ queryKey: ['moduleSettings'] });
                          }
                        }}
                      />
                    ))}
                  </div>
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" size="large">
                      Guardar Configuración del Sistema
                    </Button>
                    <Button 
                      icon={<FileTextOutlined />} 
                      onClick={() => setPdfManagerModalVisible(true)}
                      size="large"
                    >
                      Gestionar PDFs
                    </Button>
                    <Button 
                      icon={<ClockCircleOutlined />} 
                      onClick={() => setNightlyRestartModalVisible(true)}
                      size="large"
                    >
                      Reinicio Nocturno
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
      ),
    },
    {
      key: 'closure',
      label: (
        <span>
          <LockOutlined />
          Cierre de Curso
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <ClosureModeCard />
          </Col>
        </Row>
      ),
    },
    {
      key: 'backup',
      label: (
        <span>
          <DatabaseOutlined />
          Backup
        </span>
      ),
      children: <TimeMachinePanel />,
    },
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined />
          Notificaciones
        </span>
      ),
      children: (
            <Card title="Configuración de Alertas del Sistema">
              <Alert
                message="Configuración de Alertas"
                description="Estas configuraciones determinan cuándo y cómo recibirás notificaciones sobre el estado del sistema."
                type="info"
                style={{ marginBottom: 24 }}
              />
              
              <Text>Esta funcionalidad está en desarrollo y estará disponible próximamente.</Text>
            </Card>
      ),
    },
    {
      key: 'logs',
      label: (
        <span>
          <FileTextOutlined />
          Logs
        </span>
      ),
      children: (
            <Card title="Configuración de Logs y Auditoría">
              <Alert
                message="Configuración de Logs"
                description="Gestiona cómo se registran y almacenan los eventos del sistema para auditoría y debugging."
                type="info"
                style={{ marginBottom: 24 }}
              />
              
              <Text>Esta funcionalidad está en desarrollo y estará disponible próximamente.</Text>
            </Card>
      ),
    },
    {
      key: 'ai-assistant',
      label: (
        <span>
          <RobotOutlined />
          Asistente IA
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card
              title={
                <Space>
                  <RobotOutlined style={{ color: '#722ed1' }} />
                  <span>Configuración del Asistente de Inteligencia Artificial</span>
                  <Tag color={aiConfig.enabled ? 'green' : 'red'}>
                    {aiConfig.enabled ? 'HABILITADO' : 'DESHABILITADO'}
                  </Tag>
                </Space>
              }
              extra={
                <Space>
                  <Button
                    icon={<TestIcon />}
                    onClick={() => handleTestAIConnection()}
                    loading={testingConnection}
                    size="small"
                    disabled={!aiConfig.enabled}
                  >
                    Probar Conexión
                  </Button>
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={handleResetAIConfig}
                    size="small"
                    danger
                    type="text"
                  >
                    Restablecer
                  </Button>
                </Space>
              }
            >
              <Alert
                message="Sistema de Asistente de IA para Comunicaciones"
                description="Configura el sistema de respuestas inteligentes que ayuda a profesores y administradores a generar respuestas automáticas en el sistema de comunicaciones. Utiliza proveedores como Anthropic Claude y OpenAI GPT."
                type="info"
                icon={<RobotOutlined />}
                style={{ marginBottom: 24 }}
                showIcon
              />

              <Form
                form={aiForm}
                layout="vertical"
                onFinish={handleSaveAISettings}
                initialValues={aiConfig}
              >
                {/* Habilitar/Deshabilitar IA */}
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Row gutter={16} align="middle">
                    <Col span={18}>
                      <div>
                        <Text strong style={{ fontSize: '16px' }}>
                          <ThunderboltOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                          Habilitar Asistente de IA
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Permite a profesores y administradores generar respuestas automáticas con IA
                        </Text>
                      </div>
                    </Col>
                    <Col span={6} style={{ textAlign: 'right' }}>
                      <Switch
                        checked={aiConfig.enabled}
                        onChange={handleToggleAI}
                        loading={aiLoading}
                        size="default"
                        checkedChildren="ON"
                        unCheckedChildren="OFF"
                      />
                    </Col>
                  </Row>
                </Card>

                {/* Proveedor de IA */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      name="provider" 
                      label={
                        <Space>
                          <ApiOutlined />
                          <span>Proveedor de IA</span>
                        </Space>
                      }
                    >
                      <Select
                        onChange={handleUpdateAIProvider}
                        disabled={!aiConfig.enabled}
                      >
                        <Option value="anthropic">
                          <Space>
                            <span style={{ fontWeight: 'bold', color: '#722ed1' }}>Anthropic</span>
                            <span style={{ fontSize: '12px', color: '#999' }}>Claude</span>
                          </Space>
                        </Option>
                        <Option value="openai">
                          <Space>
                            <span style={{ fontWeight: 'bold', color: '#13c2c2' }}>OpenAI</span>
                            <span style={{ fontSize: '12px', color: '#999' }}>GPT</span>
                          </Space>
                        </Option>
                        <Option value="gemini">
                          <Space>
                            <span style={{ fontWeight: 'bold', color: '#ff7a00' }}>Google</span>
                            <span style={{ fontSize: '12px', color: '#999' }}>Gemini</span>
                          </Space>
                        </Option>
                        <Option value="openrouter">
                          <Space>
                            <span style={{ fontWeight: 'bold', color: '#1677ff' }}>OpenRouter</span>
                            <span style={{ fontSize: '12px', color: '#999' }}>Multiple Models</span>
                          </Space>
                        </Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <div style={{ paddingTop: '30px' }}>
                      <Alert
                        message={`Proveedor actual: ${
                          aiConfig.provider === 'anthropic' ? 'Anthropic Claude' : 
                          aiConfig.provider === 'openai' ? 'OpenAI GPT' : 
                          'Google Gemini'
                        }`}
                        type="info"
                        size="small"
                      />
                    </div>
                  </Col>
                </Row>

                {/* Claves API */}
                <Divider orientation="left">
                  <KeyOutlined /> Claves de API
                </Divider>
                
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="anthropicKey"
                      label={
                        <Space>
                          <span>Clave API Anthropic</span>
                          {aiConfig.hasAnthropicKey && (
                            <Tag color="green" size="small">Configurada</Tag>
                          )}
                        </Space>
                      }
                    >
                      <Input.Password
                        placeholder="sk-ant-api03-..."
                        disabled={!aiConfig.enabled}
                        addonAfter={
                          <Button
                            size="small"
                            type="text"
                            icon={<TestIcon />}
                            onClick={() => handleTestAIConnection('anthropic')}
                            loading={testingConnection}
                            disabled={!aiConfig.hasAnthropicKey}
                          />
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="openaiKey"
                      label={
                        <Space>
                          <span>Clave API OpenAI</span>
                          {aiConfig.hasOpenAIKey && (
                            <Tag color="green" size="small">Configurada</Tag>
                          )}
                        </Space>
                      }
                    >
                      <Input.Password
                        placeholder="sk-..."
                        disabled={!aiConfig.enabled}
                        addonAfter={
                          <Button
                            size="small"
                            type="text"
                            icon={<TestIcon />}
                            onClick={() => handleTestAIConnection('openai')}
                            loading={testingConnection}
                            disabled={!aiConfig.hasOpenAIKey}
                          />
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="geminiKey"
                      label={
                        <Space>
                          <span>Clave API Gemini</span>
                          {aiConfig.hasGeminiKey && (
                            <Tag color="green" size="small">Configurada</Tag>
                          )}
                        </Space>
                      }
                    >
                      <Input.Password
                        placeholder="AIza..."
                        disabled={!aiConfig.enabled}
                        addonAfter={
                          <Button
                            size="small"
                            type="text"
                            icon={<TestIcon />}
                            onClick={() => handleTestAIConnection('gemini')}
                            loading={testingConnection}
                            disabled={!aiConfig.hasGeminiKey}
                          />
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="openrouterKey"
                      label={
                        <Space>
                          <span>Clave API OpenRouter</span>
                          {aiConfig.hasOpenRouterKey && (
                            <Tag color="green" size="small">Configurada</Tag>
                          )}
                        </Space>
                      }
                    >
                      <Input.Password
                        placeholder="sk-or-v1-..."
                        disabled={!aiConfig.enabled}
                        addonAfter={
                          <Button
                            size="small"
                            type="text"
                            icon={<TestIcon />}
                            onClick={() => handleTestAIConnection('openrouter')}
                            loading={testingConnection}
                            disabled={!aiConfig.hasOpenRouterKey}
                          />
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    <Alert
                      message="OpenRouter te permite acceder a múltiples modelos de IA"
                      description="Con una sola clave API puedes usar modelos de OpenAI, Anthropic, Meta y otros proveedores."
                      type="info"
                      showIcon
                      style={{ marginTop: 30 }}
                    />
                  </Col>
                </Row>

                {/* Límites Diarios */}
                <Divider orientation="left">
                  <ControlOutlined /> Límites de Uso
                </Divider>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="dailyLimitTeacher"
                      label="Límite Diario - Profesores"
                    >
                      <InputNumber
                        min={1}
                        max={100}
                        style={{ width: '100%' }}
                        addonAfter="solicitudes/día"
                        disabled={!aiConfig.enabled}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="dailyLimitAdmin"
                      label="Límite Diario - Administradores"
                    >
                      <InputNumber
                        min={1}
                        max={200}
                        style={{ width: '100%' }}
                        addonAfter="solicitudes/día"
                        disabled={!aiConfig.enabled}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Modelos de IA */}
                <Divider orientation="left">
                  <ExperimentOutlined /> Modelos de IA
                </Divider>
                
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="modelAnthropic"
                      label="Modelo Anthropic Claude"
                    >
                      <Select disabled={!aiConfig.enabled}>
                        <Option value="claude-haiku-4-5">
                          <Space direction="vertical" size={0}>
                            <Text strong>Claude Haiku 4.5</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Rápido y económico
                            </Text>
                          </Space>
                        </Option>
                        <Option value="claude-sonnet-4-6">
                          <Space direction="vertical" size={0}>
                            <Text strong>Claude Sonnet 4.6</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Balance precio/rendimiento
                            </Text>
                          </Space>
                        </Option>
                        <Option value="claude-opus-4-7">
                          <Space direction="vertical" size={0}>
                            <Text strong>Claude Opus 4.7</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Máximo rendimiento
                            </Text>
                          </Space>
                        </Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="modelOpenAI"
                      label="Modelo OpenAI GPT"
                    >
                      <Select disabled={!aiConfig.enabled}>
                        <Option value="gpt-3.5-turbo">
                          <Space direction="vertical" size={0}>
                            <Text strong>GPT-3.5 Turbo</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Rápido y económico
                            </Text>
                          </Space>
                        </Option>
                        <Option value="gpt-4">
                          <Space direction="vertical" size={0}>
                            <Text strong>GPT-4</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Mayor precisión
                            </Text>
                          </Space>
                        </Option>
                        <Option value="gpt-4-turbo-preview">
                          <Space direction="vertical" size={0}>
                            <Text strong>GPT-4 Turbo</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Última versión
                            </Text>
                          </Space>
                        </Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="modelGemini"
                      label="Modelo Google Gemini"
                    >
                      <Select disabled={!aiConfig.enabled}>
                        <Option value="gemini-1.5-flash">
                          <Space direction="vertical" size={0}>
                            <Text strong>Gemini 1.5 Flash</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Rápido y eficiente
                            </Text>
                          </Space>
                        </Option>
                        <Option value="gemini-1.5-pro">
                          <Space direction="vertical" size={0}>
                            <Text strong>Gemini 1.5 Pro</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Máximo rendimiento
                            </Text>
                          </Space>
                        </Option>
                        <Option value="gemini-pro">
                          <Space direction="vertical" size={0}>
                            <Text strong>Gemini Pro</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Versión estable
                            </Text>
                          </Space>
                        </Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="modelOpenRouter"
                      label="Modelo OpenRouter"
                    >
                      <Select disabled={!aiConfig.enabled}>
                        <Option value="openai/gpt-3.5-turbo">
                          <Space direction="vertical" size={0}>
                            <Text strong>OpenAI GPT-3.5 Turbo</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Rápido y económico
                            </Text>
                          </Space>
                        </Option>
                        <Option value="openai/gpt-4-turbo-preview">
                          <Space direction="vertical" size={0}>
                            <Text strong>OpenAI GPT-4 Turbo</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Mayor precisión
                            </Text>
                          </Space>
                        </Option>
                        <Option value="anthropic/claude-3-haiku">
                          <Space direction="vertical" size={0}>
                            <Text strong>Anthropic Claude 3 Haiku</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Rápido y eficiente
                            </Text>
                          </Space>
                        </Option>
                        <Option value="meta-llama/llama-2-70b-chat">
                          <Space direction="vertical" size={0}>
                            <Text strong>Meta Llama 2 70B</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Modelo de código abierto
                            </Text>
                          </Space>
                        </Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    <Alert
                      message="OpenRouter ofrece acceso a múltiples modelos"
                      description="Puedes cambiar entre modelos de diferentes proveedores sin necesidad de configurar múltiples claves API."
                      type="info"
                      showIcon
                      style={{ marginTop: 30 }}
                    />
                  </Col>
                </Row>

                {/* Estado de Conexión */}
                <Card size="small" style={{ backgroundColor: '#fafafa', marginBottom: 16 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Estado del Sistema</Text>
                        <Text strong style={{ color: aiConfig.enabled ? '#52c41a' : '#ff4d4f' }}>
                          {aiConfig.enabled ? '🟢 Operativo' : '🔴 Deshabilitado'}
                        </Text>
                      </Space>
                    </Col>
                    <Col span={8}>
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Claves Configuradas</Text>
                        <Text>
                          <Tag color={aiConfig.hasAnthropicKey ? 'green' : 'default'} size="small">
                            Anthropic
                          </Tag>
                          <Tag color={aiConfig.hasOpenAIKey ? 'green' : 'default'} size="small">
                            OpenAI
                          </Tag>
                          <Tag color={aiConfig.hasGeminiKey ? 'green' : 'default'} size="small">
                            Gemini
                          </Tag>
                          <Tag color={aiConfig.hasOpenRouterKey ? 'green' : 'default'} size="small">
                            OpenRouter
                          </Tag>
                        </Text>
                      </Space>
                    </Col>
                    <Col span={8}>
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Proveedor Activo</Text>
                        <Text strong>
                          {aiConfig.provider === 'anthropic' ? '🤖 Anthropic Claude' : 
                           aiConfig.provider === 'openai' ? '🧠 OpenAI GPT' : 
                           aiConfig.provider === 'gemini' ? '🌟 Google Gemini' :
                           '🔗 OpenRouter'}
                        </Text>
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* Botones de Acción */}
                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={aiLoading}
                      size="large"
                      icon={<CheckCircleOutlined />}
                    >
                      Guardar Configuración de IA
                    </Button>
                    <Button
                      icon={<TestIcon />}
                      onClick={() => handleTestAIConnection()}
                      loading={testingConnection}
                      size="large"
                      disabled={!aiConfig.enabled}
                    >
                      Probar Conexión
                    </Button>
                    <Button
                      icon={<SyncOutlined />}
                      onClick={loadAIConfig}
                      size="large"
                    >
                      Recargar Config
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'timezone',
      label: (
        <span>
          <ClockCircleOutlined />
          Zona Horaria
        </span>
      ),
      children: <TimezoneSettings />,
    },
    {
      key: 'time-machine',
      label: (
        <span>
          <HistoryOutlined />
          Time Machine
        </span>
      ),
      children: <TimeMachinePanel />,
    },
  ];

  return (
    <div className="admin-settings-page">
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SettingOutlined style={{ fontSize: '48px', color: '#722ed1', marginBottom: 16 }} />
          <Title level={2}>Configuración del Administrador</Title>
          <Text type="secondary">
            Gestiona la configuración global del sistema y la seguridad
          </Text>
        </div>

        <Tabs defaultActiveKey="security" size="large" items={tabItems} />

        {/* Manual Backup Progress Modal */}
        <Modal
          title="Creando Backup Manual"
          open={backupModalVisible}
          footer={null}
          closable={false}
          centered
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Creando backup del sistema...</Text>
            <Progress percent={backupProgress} status={backupProgress === 100 ? 'success' : 'active'} />
            {backupProgress === 100 && (
              <Alert message="Backup completado exitosamente" type="success" showIcon />
            )}
          </Space>
        </Modal>

        {/* PDF Manager Modal */}
        <PdfManagerModal
          visible={pdfManagerModalVisible}
          onCancel={() => setPdfManagerModalVisible(false)}
          onCleanup={handlePdfCleanup}
          onOptimize={handlePdfOptimize}
          onDeleteFile={handlePdfDelete}
        />
        
        {/* Nightly Restart Modal */}
        <NightlyRestartModal
          visible={nightlyRestartModalVisible}
          onCancel={() => setNightlyRestartModalVisible(false)}
        />
      </div>
    </div>
  );
};

export default AdminSettingsPage;