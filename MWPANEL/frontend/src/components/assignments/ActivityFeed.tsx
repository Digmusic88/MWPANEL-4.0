/**
 * @archivo: ActivityFeed.tsx
 * @módulo: Assignments - Frontend Components
 * @función: Feed de actividades recientes de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Componente que muestra un feed de actividades recientes relacionadas
 * con las asignaciones, incluyendo inicio, progreso, completado, etc.
 * 
 * FUNCIONALIDADES:
 * - Feed tiempo real de actividades
 * - Filtros por tipo de actividad
 * - Vista compacta y expandida
 * - Paginación y carga incremental
 * - Avatares y timestamps
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 3.2
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  List,
  Avatar,
  Typography,
  Space,
  Tag,
  Button,
  Select,
  DatePicker,
  Empty,
  Spin,
  message,
  Tooltip,
  Badge,
  Row,
  Col
} from 'antd';
import {
  UserOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BookOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  CalendarOutlined,
  RiseOutlined,
  FireOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { assignmentsService } from '../../services/assignmentsService';

// Configurar dayjs
dayjs.extend(relativeTime);

const { Text, Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  campaignId?: string;
  campaignTitle?: string;
  resourceId?: string;
  resourceTitle?: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

interface ActivityFeedProps {
  userId?: string;
  campaignId?: string;
  limit?: number;
  compact?: boolean;
  showFilters?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // en segundos
  className?: string;
}

/**
 * Configuración de tipos de actividad
 */
const activityConfig = {
  'assignment_started': {
    icon: <PlayCircleOutlined />,
    color: '#1890ff',
    text: 'Asignación iniciada'
  },
  'resource_completed': {
    icon: <CheckCircleOutlined />,
    color: '#52c41a',
    text: 'Recurso completado'
  },
  'progress_updated': {
    icon: <RiseOutlined />,
    color: '#722ed1',
    text: 'Progreso actualizado'
  },
  'assignment_completed': {
    icon: <TrophyOutlined />,
    color: '#52c41a',
    text: 'Asignación completada'
  },
  'deadline_reminder': {
    icon: <ClockCircleOutlined />,
    color: '#faad14',
    text: 'Recordatorio de fecha límite'
  },
  'overdue_notification': {
    icon: <ExclamationCircleOutlined />,
    color: '#ff4d4f',
    text: 'Notificación de vencimiento'
  },
  'comment_added': {
    icon: <MessageOutlined />,
    color: '#13c2c2',
    text: 'Comentario añadido'
  },
  'engagement_milestone': {
    icon: <FireOutlined />,
    color: '#fa8c16',
    text: 'Hito de engagement'
  }
};

const priorityConfig = {
  'LOW': { color: '#52c41a', text: 'Baja' },
  'MEDIUM': { color: '#faad14', text: 'Media' },
  'HIGH': { color: '#ff4d4f', text: 'Alta' },
  'URGENT': { color: '#722ed1', text: 'Urgente' }
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  userId,
  campaignId,
  limit = 10,
  compact = false,
  showFilters = false,
  autoRefresh = false,
  refreshInterval = 30,
  className = ''
}) => {
  // Estados principales
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Estados de filtros
  const [filters, setFilters] = useState({
    types: [] as string[],
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
    priority: undefined as string | undefined
  });

  // Estados de paginación
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadActivities(false);
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, userId, campaignId, filters]);

  // Cargar actividades iniciales
  useEffect(() => {
    loadActivities(true);
  }, [userId, campaignId, filters]);

  // Función para cargar actividades
  const loadActivities = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError('');
      }

      const activitiesData = await assignmentsService.progress.getRecentActivities(
        userId, 
        limit
      );
      
      // Filtrar según criterios locales
      const filteredActivities = activitiesData.filter((activity: any) => {
        // Filtro por tipos
        if (filters.types.length > 0 && !filters.types.includes(activity.type)) {
          return false;
        }
        
        // Filtro por fecha
        if (filters.dateRange) {
          const activityDate = dayjs(activity.createdAt);
          if (!activityDate.isBetween(filters.dateRange[0], filters.dateRange[1], 'day', '[]')) {
            return false;
          }
        }
        
        // Filtro por prioridad
        if (filters.priority && activity.priority !== filters.priority) {
          return false;
        }
        
        return true;
      });

      if (reset) {
        setActivities(filteredActivities);
      } else {
        // Auto-refresh: solo agregar nuevas actividades
        const newActivities = filteredActivities.filter(
          newActivity => !activities.some(existing => existing.id === newActivity.id)
        );
        
        if (newActivities.length > 0) {
          setActivities(prev => [...newActivities, ...prev].slice(0, limit));
        }
      }
      
      setHasMore(filteredActivities.length === limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar actividades';
      setError(errorMessage);
      if (reset) {
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, campaignId, limit, filters, activities]);

  // Función para cargar más actividades
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      
      // TODO: Implementar paginación real en el backend
      const moreActivities = await assignmentsService.progress.getRecentActivities(
        userId,
        limit,
        activities.length // offset
      );
      
      setActivities(prev => [...prev, ...moreActivities]);
      setHasMore(moreActivities.length === limit);
    } catch (err) {
      message.error('Error al cargar más actividades');
    } finally {
      setLoadingMore(false);
    }
  }, [userId, limit, activities.length, hasMore, loadingMore]);

  // Función para formatear descripción de actividad
  const formatActivityDescription = (activity: Activity) => {
    const config = activityConfig[activity.type as keyof typeof activityConfig];
    
    let description = activity.description;
    
    // Personalizar descripción según metadata
    if (activity.metadata) {
      if (activity.type === 'progress_updated' && activity.metadata.percentage) {
        description += ` (${activity.metadata.percentage}%)`;
      }
      
      if (activity.type === 'engagement_milestone' && activity.metadata.score) {
        description += ` - Puntuación: ${activity.metadata.score}`;
      }
    }
    
    return description || config?.text || 'Actividad';
  };

  // Renderizar filtros
  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <div className="mb-4">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Select
              mode="multiple"
              placeholder="Tipos de actividad"
              style={{ width: '100%' }}
              value={filters.types}
              onChange={(types) => setFilters(prev => ({ ...prev, types }))}
              allowClear
            >
              {Object.entries(activityConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.icon} {config.text}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={8}>
            <RangePicker
              style={{ width: '100%' }}
              value={filters.dateRange}
              onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
              placeholder={['Fecha inicio', 'Fecha fin']}
            />
          </Col>

          <Col xs={24} sm={8}>
            <Select
              placeholder="Prioridad"
              style={{ width: '100%' }}
              value={filters.priority}
              onChange={(priority) => setFilters(prev => ({ ...prev, priority }))}
              allowClear
            >
              {Object.entries(priorityConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.text}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </div>
    );
  };

  // Renderizar item de actividad
  const renderActivityItem = (activity: Activity, index: number) => {
    const config = activityConfig[activity.type as keyof typeof activityConfig] || {
      icon: <UserOutlined />,
      color: '#1890ff',
      text: 'Actividad'
    };

    if (compact) {
      return (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          key={activity.id}
        >
          <List.Item className="py-2">
            <div className="flex items-center gap-2 w-full">
              <Badge dot color={config.color}>
                <Avatar size={32} src={activity.userAvatar} icon={<UserOutlined />} />
              </Badge>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {config.icon}
                  <Text strong className="text-sm truncate">
                    {activity.userName}
                  </Text>
                  {activity.priority && (
                    <Tag size="small" color={priorityConfig[activity.priority].color}>
                      {priorityConfig[activity.priority].text}
                    </Tag>
                  )}
                </div>
                
                <Text className="text-xs text-gray-600 block truncate">
                  {formatActivityDescription(activity)}
                </Text>
              </div>
              
              <div className="text-xs text-gray-400">
                {dayjs(activity.createdAt).fromNow()}
              </div>
            </div>
          </List.Item>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        key={activity.id}
      >
        <List.Item>
          <List.Item.Meta
            avatar={
              <Badge dot color={config.color}>
                <Avatar src={activity.userAvatar} icon={<UserOutlined />} />
              </Badge>
            }
            title={
              <div className="flex items-center gap-2">
                {config.icon}
                <Text strong>{activity.userName}</Text>
                {activity.priority && (
                  <Tag color={priorityConfig[activity.priority].color}>
                    {priorityConfig[activity.priority].text}
                  </Tag>
                )}
              </div>
            }
            description={
              <div>
                <div className="mb-1">
                  {formatActivityDescription(activity)}
                </div>
                
                {(activity.campaignTitle || activity.resourceTitle) && (
                  <div className="text-xs text-gray-500">
                    {activity.campaignTitle && (
                      <span>
                        <BookOutlined className="mr-1" />
                        {activity.campaignTitle}
                      </span>
                    )}
                    {activity.resourceTitle && (
                      <span className="ml-2">
                        • {activity.resourceTitle}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="text-xs text-gray-400 mt-1">
                  <CalendarOutlined className="mr-1" />
                  {dayjs(activity.createdAt).format('DD/MM/YYYY HH:mm')}
                  <span className="ml-2">
                    ({dayjs(activity.createdAt).fromNow()})
                  </span>
                </div>
              </div>
            }
          />
        </List.Item>
      </motion.div>
    );
  };

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiseOutlined />
            <span>Actividad Reciente</span>
            {autoRefresh && (
              <Badge status="processing" text="Auto-refresh" />
            )}
          </div>
          
          <Space>
            {showFilters && (
              <Button
                type="text"
                icon={<FilterOutlined />}
                size="small"
              >
                Filtros
              </Button>
            )}
            
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => loadActivities(true)}
              loading={loading}
              size="small"
            />
          </Space>
        </div>
      }
      className={className}
    >
      {renderFilters()}
      
      <Spin spinning={loading}>
        {error && !loading && (
          <div className="text-center py-4 text-red-500">
            <ExclamationCircleOutlined className="mr-2" />
            {error}
          </div>
        )}

        {activities.length === 0 && !loading ? (
          <Empty 
            description="No hay actividades recientes"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={activities}
            renderItem={renderActivityItem}
            className={compact ? 'compact-activity-list' : ''}
          />
        )}

        {hasMore && !compact && (
          <div className="text-center mt-4">
            <Button
              type="link"
              onClick={loadMore}
              loading={loadingMore}
            >
              Cargar más actividades
            </Button>
          </div>
        )}
      </Spin>
    </Card>
  );
};