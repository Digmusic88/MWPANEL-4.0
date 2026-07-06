/**
 * @archivo: AlertsPanel.tsx
 * @módulo: Assignments - Frontend Components
 * @función: Panel de alertas y notificaciones de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Panel que muestra alertas críticas relacionadas con asignaciones:
 * vencimientos, bajo rendimiento, falta de engagement, etc.
 * 
 * FUNCIONALIDADES:
 * - Alertas críticas priorizadas
 * - Categorización por tipo y urgencia
 * - Acciones rápidas por alerta
 * - Marcar como leídas
 * - Filtros y agrupación
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 3.2
 */

import React, { useMemo } from 'react';
import {
  Alert,
  Card,
  List,
  Avatar,
  Typography,
  Space,
  Button,
  Badge,
  Tag,
  Tooltip,
  Divider,
  Collapse,
  Progress,
  Statistic
} from 'antd';
import {
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  BookOutlined,
  TrophyOutlined,
  FireOutlined,
  CheckOutlined,
  EyeOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  BellOutlined,
  CloseOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Panel } = Collapse;

export interface ProgressAlert {
  id: string;
  type: 'OVERDUE' | 'LOW_ENGAGEMENT' | 'STUCK_PROGRESS' | 'DEADLINE_WARNING' | 'HIGH_PERFORMANCE' | 'COMPLETION_MILESTONE' | 'SYSTEM_NOTIFICATION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  campaignId?: string;
  campaignTitle?: string;
  resourceId?: string;
  resourceTitle?: string;
  metadata?: {
    completionPercentage?: number;
    engagementScore?: number;
    daysOverdue?: number;
    timeRemaining?: number;
    [key: string]: any;
  };
  actionRequired?: boolean;
  actionUrl?: string;
  createdAt: string;
  isRead?: boolean;
}

interface AlertsPanelProps {
  alerts: ProgressAlert[];
  onMarkAsRead?: (alertId: string) => Promise<void>;
  onTakeAction?: (alert: ProgressAlert) => void;
  maxItems?: number;
  showFilters?: boolean;
  groupByType?: boolean;
  className?: string;
}

/**
 * Configuración de tipos de alerta
 */
const alertTypeConfig = {
  'OVERDUE': {
    icon: <ExclamationCircleOutlined />,
    color: '#ff4d4f',
    bgColor: '#fff2f0',
    borderColor: '#ffccc7',
    title: 'Vencida',
    description: 'Asignación vencida'
  },
  'LOW_ENGAGEMENT': {
    icon: <FireOutlined />,
    color: '#faad14',
    bgColor: '#fffbe6',
    borderColor: '#ffe58f',
    title: 'Bajo Engagement',
    description: 'Engagement por debajo del umbral'
  },
  'STUCK_PROGRESS': {
    icon: <ClockCircleOutlined />,
    color: '#722ed1',
    bgColor: '#f9f0ff',
    borderColor: '#d3adf7',
    title: 'Progreso Estancado',
    description: 'Sin progreso por varios días'
  },
  'DEADLINE_WARNING': {
    icon: <WarningOutlined />,
    color: '#fa8c16',
    bgColor: '#fff7e6',
    borderColor: '#ffd591',
    title: 'Fecha Límite',
    description: 'Próximo a vencer'
  },
  'HIGH_PERFORMANCE': {
    icon: <TrophyOutlined />,
    color: '#52c41a',
    bgColor: '#f6ffed',
    borderColor: '#b7eb8f',
    title: 'Alto Rendimiento',
    description: 'Rendimiento excepcional'
  },
  'COMPLETION_MILESTONE': {
    icon: <CheckOutlined />,
    color: '#1890ff',
    bgColor: '#e6f7ff',
    borderColor: '#91d5ff',
    title: 'Hito Completado',
    description: 'Milestone alcanzado'
  },
  'SYSTEM_NOTIFICATION': {
    icon: <InfoCircleOutlined />,
    color: '#13c2c2',
    bgColor: '#e6fffb',
    borderColor: '#87e8de',
    title: 'Notificación Sistema',
    description: 'Información del sistema'
  }
};

const priorityConfig = {
  'LOW': { color: '#52c41a', text: 'Baja', weight: 1 },
  'MEDIUM': { color: '#faad14', text: 'Media', weight: 2 },
  'HIGH': { color: '#ff4d4f', text: 'Alta', weight: 3 },
  'CRITICAL': { color: '#722ed1', text: 'Crítica', weight: 4 }
};

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onMarkAsRead,
  onTakeAction,
  maxItems = 10,
  showFilters = false,
  groupByType = false,
  className = ''
}) => {
  // Filtrar y ordenar alertas
  const processedAlerts = useMemo(() => {
    // Filtrar alertas no leídas y ordenar por prioridad y fecha
    const filteredAlerts = alerts
      .filter(alert => !alert.isRead)
      .sort((a, b) => {
        const priorityDiff = priorityConfig[b.priority].weight - priorityConfig[a.priority].weight;
        if (priorityDiff !== 0) return priorityDiff;
        return dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix();
      })
      .slice(0, maxItems);

    if (!groupByType) {
      return filteredAlerts;
    }

    // Agrupar por tipo
    const grouped = filteredAlerts.reduce((acc, alert) => {
      const type = alert.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(alert);
      return acc;
    }, {} as Record<string, ProgressAlert[]>);

    return grouped;
  }, [alerts, maxItems, groupByType]);

  // Estadísticas de alertas
  const alertStats = useMemo(() => {
    const unreadAlerts = alerts.filter(a => !a.isRead);
    const criticalAlerts = unreadAlerts.filter(a => a.priority === 'CRITICAL');
    const actionRequiredAlerts = unreadAlerts.filter(a => a.actionRequired);

    return {
      total: unreadAlerts.length,
      critical: criticalAlerts.length,
      actionRequired: actionRequiredAlerts.length,
      byType: unreadAlerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [alerts]);

  // Función para manejar marcar como leída
  const handleMarkAsRead = async (alertId: string) => {
    if (onMarkAsRead) {
      await onMarkAsRead(alertId);
    }
  };

  // Función para renderizar alert action
  const renderAlertActions = (alert: ProgressAlert) => (
    <Space>
      {alert.actionRequired && onTakeAction && (
        <Button
          type="primary"
          size="small"
          onClick={() => onTakeAction(alert)}
        >
          Acción
        </Button>
      )}
      
      {alert.actionUrl && (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => window.open(alert.actionUrl, '_blank')}
        >
          Ver
        </Button>
      )}
      
      {onMarkAsRead && (
        <Button
          type="text"
          size="small"
          icon={<CheckOutlined />}
          onClick={() => handleMarkAsRead(alert.id)}
        >
          Marcar leída
        </Button>
      )}
    </Space>
  );

  // Función para renderizar metadata de alerta
  const renderAlertMetadata = (alert: ProgressAlert) => {
    if (!alert.metadata) return null;

    return (
      <div className="mt-2 text-xs text-gray-500">
        {alert.metadata.completionPercentage !== undefined && (
          <div className="flex items-center gap-2 mb-1">
            <Text>Progreso:</Text>
            <Progress 
              percent={alert.metadata.completionPercentage} 
              size="small" 
              className="flex-1 max-w-24"
            />
            <Text>{alert.metadata.completionPercentage}%</Text>
          </div>
        )}
        
        {alert.metadata.engagementScore !== undefined && (
          <div className="mb-1">
            <FireOutlined className="mr-1" />
            Engagement: {Math.round(alert.metadata.engagementScore * 100)}%
          </div>
        )}
        
        {alert.metadata.daysOverdue !== undefined && (
          <div className="mb-1">
            <ExclamationCircleOutlined className="mr-1" />
            Vencida hace {alert.metadata.daysOverdue} día{alert.metadata.daysOverdue !== 1 ? 's' : ''}
          </div>
        )}
        
        {alert.metadata.timeRemaining !== undefined && (
          <div className="mb-1">
            <ClockCircleOutlined className="mr-1" />
            Tiempo restante: {Math.ceil(alert.metadata.timeRemaining / 24)} día{Math.ceil(alert.metadata.timeRemaining / 24) !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  };

  // Función para renderizar item de alerta individual
  const renderAlertItem = (alert: ProgressAlert, index: number) => {
    const config = alertTypeConfig[alert.type];
    
    return (
      <motion.div
        key={alert.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ delay: index * 0.05 }}
      >
        <Alert
          type={alert.priority === 'CRITICAL' ? 'error' : alert.priority === 'HIGH' ? 'warning' : 'info'}
          showIcon
          className="mb-3"
          style={{
            backgroundColor: config.bgColor,
            borderColor: config.borderColor
          }}
          message={
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {alert.userAvatar && (
                  <Avatar size={32} src={alert.userAvatar} icon={<UserOutlined />} />
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Text strong>{alert.title}</Text>
                    <Tag 
                      color={priorityConfig[alert.priority].color}
                      size="small"
                    >
                      {priorityConfig[alert.priority].text}
                    </Tag>
                    
                    {alert.actionRequired && (
                      <Badge status="error" text="Acción requerida" />
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {alert.description}
                  </div>
                  
                  {(alert.userName || alert.campaignTitle) && (
                    <div className="text-xs text-gray-500 mb-2">
                      {alert.userName && (
                        <span>
                          <UserOutlined className="mr-1" />
                          {alert.userName}
                        </span>
                      )}
                      {alert.campaignTitle && (
                        <span className={alert.userName ? 'ml-3' : ''}>
                          <BookOutlined className="mr-1" />
                          {alert.campaignTitle}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {renderAlertMetadata(alert)}
                  
                  <div className="text-xs text-gray-400">
                    {dayjs(alert.createdAt).fromNow()}
                  </div>
                </div>
              </div>
              
              <div className="ml-3">
                {renderAlertActions(alert)}
              </div>
            </div>
          }
        />
      </motion.div>
    );
  };

  // Renderizar vista agrupada
  const renderGroupedAlerts = () => {
    const groupedAlerts = processedAlerts as Record<string, ProgressAlert[]>;
    
    return (
      <Collapse defaultActiveKey={Object.keys(groupedAlerts)} ghost>
        {Object.entries(groupedAlerts).map(([type, typeAlerts]) => {
          const config = alertTypeConfig[type as keyof typeof alertTypeConfig];
          
          return (
            <Panel
              key={type}
              header={
                <div className="flex items-center gap-2">
                  {config.icon}
                  <span>{config.title}</span>
                  <Badge count={typeAlerts.length} size="small" />
                </div>
              }
            >
              <AnimatePresence>
                {typeAlerts.map((alert, index) => renderAlertItem(alert, index))}
              </AnimatePresence>
            </Panel>
          );
        })}
      </Collapse>
    );
  };

  // Renderizar vista simple
  const renderSimpleAlerts = () => {
    const simpleAlerts = processedAlerts as ProgressAlert[];
    
    return (
      <AnimatePresence>
        {simpleAlerts.map((alert, index) => renderAlertItem(alert, index))}
      </AnimatePresence>
    );
  };

  // Si no hay alertas
  if (alerts.filter(a => !a.isRead).length === 0) {
    return null;
  }

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellOutlined />
            <span>Alertas</span>
            <Badge count={alertStats.total} size="small" />
          </div>
          
          {alertStats.critical > 0 && (
            <Tag color="red" icon={<ExclamationCircleOutlined />}>
              {alertStats.critical} críticas
            </Tag>
          )}
        </div>
      }
      className={`alerts-panel ${className}`}
    >
      {/* Estadísticas rápidas */}
      {alertStats.actionRequired > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${alertStats.actionRequired} alerta${alertStats.actionRequired !== 1 ? 's' : ''} requiere${alertStats.actionRequired === 1 ? '' : 'n'} acción inmediata`}
          className="mb-4"
        />
      )}

      {/* Contenido de alertas */}
      <div className="max-h-96 overflow-y-auto">
        {groupByType ? renderGroupedAlerts() : renderSimpleAlerts()}
      </div>
      
      {/* Footer con acción para ver todas */}
      {alerts.filter(a => !a.isRead).length > maxItems && (
        <Divider>
          <Button type="link">
            Ver todas las alertas ({alerts.filter(a => !a.isRead).length})
          </Button>
        </Divider>
      )}
    </Card>
  );
};