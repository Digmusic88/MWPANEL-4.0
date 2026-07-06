/**
 * @archivo: StudentProgressCard.tsx
 * @módulo: Assignments - Frontend Components
 * @función: Card individual de progreso de estudiante
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Card que muestra el progreso individual de un estudiante en una
 * campaña específica con métricas detalladas y visualizaciones.
 * 
 * FUNCIONALIDADES:
 * - Progreso visual con barras y porcentajes
 * - Métricas de engagement y tiempo
 * - Estados de progreso con colores
 * - Vista compacta y expandida
 * - Acciones rápidas
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 3.2
 */

import React, { useMemo } from 'react';
import {
  Card,
  Avatar,
  Progress,
  Space,
  Typography,
  Tag,
  Button,
  Tooltip,
  Row,
  Col,
  Statistic,
  Divider,
  Badge
} from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  EyeOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  CalendarOutlined,
  RiseOutlined,
  FireOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

import { AssignmentProgress } from '../../types/assignments';

const { Text, Title } = Typography;

interface StudentProgressCardProps {
  progress: AssignmentProgress;
  onView?: (progress: AssignmentProgress) => void;
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

/**
 * Configuración de colores y estados
 */
const statusConfig = {
  'NOT_STARTED': {
    color: '#d9d9d9',
    text: 'No iniciado',
    icon: <ExclamationCircleOutlined />
  },
  'IN_PROGRESS': {
    color: '#1890ff',
    text: 'En progreso',
    icon: <PlayCircleOutlined />
  },
  'COMPLETED': {
    color: '#52c41a',
    text: 'Completado',
    icon: <CheckCircleOutlined />
  },
  'OVERDUE': {
    color: '#ff4d4f',
    text: 'Vencido',
    icon: <ExclamationCircleOutlined />
  }
};

const priorityConfig = {
  'LOW': { color: '#52c41a', text: 'Baja' },
  'MEDIUM': { color: '#faad14', text: 'Media' },
  'HIGH': { color: '#ff4d4f', text: 'Alta' },
  'URGENT': { color: '#722ed1', text: 'Urgente' }
};

export const StudentProgressCard: React.FC<StudentProgressCardProps> = ({
  progress,
  onView,
  compact = false,
  showDetails = false,
  className = ''
}) => {
  // Calcular métricas derivadas
  const metrics = useMemo(() => {
    const completionPercentage = progress.completionPercentage || 0;
    const timeSpent = progress.timeSpent || 0;
    const engagementScore = progress.engagementScore || 0;
    const resourcesCompleted = progress.resourcesCompleted || 0;
    const totalResources = progress.totalResources || 1;
    
    // Calcular tiempo formateado
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    };

    // Determinar estado de urgencia
    const getUrgencyLevel = () => {
      if (progress.status === 'OVERDUE') return 'urgent';
      if (progress.status === 'COMPLETED') return 'success';
      if (completionPercentage < 25 && progress.dueDate) {
        const daysUntilDue = dayjs(progress.dueDate).diff(dayjs(), 'days');
        if (daysUntilDue <= 1) return 'urgent';
        if (daysUntilDue <= 3) return 'warning';
      }
      return 'normal';
    };

    return {
      completionPercentage,
      timeSpent: formatTime(timeSpent),
      engagementScore: Math.round(engagementScore * 100),
      resourcesRatio: `${resourcesCompleted}/${totalResources}`,
      urgencyLevel: getUrgencyLevel(),
      isOverdue: progress.status === 'OVERDUE',
      daysRemaining: progress.dueDate ? dayjs(progress.dueDate).diff(dayjs(), 'days') : null
    };
  }, [progress]);

  // Configuración del estado actual
  const currentStatus = statusConfig[progress.status] || statusConfig['NOT_STARTED'];

  // Vista compacta
  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={className}
      >
        <Card size="small" hoverable>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Avatar 
                size={40} 
                icon={<UserOutlined />}
                src={progress.userAvatar}
              />
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Text strong className="text-sm">
                    {progress.userName || 'Usuario'}
                  </Text>
                  <Tag 
                    color={currentStatus.color}
                    icon={currentStatus.icon}
                    size="small"
                  >
                    {currentStatus.text}
                  </Tag>
                </div>
                
                <Progress
                  percent={metrics.completionPercentage}
                  size="small"
                  strokeColor={currentStatus.color}
                  showInfo={false}
                />
                
                <div className="flex items-center gap-4 mt-1">
                  <Text type="secondary" className="text-xs">
                    <ClockCircleOutlined className="mr-1" />
                    {metrics.timeSpent}
                  </Text>
                  <Text type="secondary" className="text-xs">
                    <BookOutlined className="mr-1" />
                    {metrics.resourcesRatio}
                  </Text>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: currentStatus.color }}>
                  {metrics.completionPercentage}%
                </div>
                {metrics.engagementScore > 0 && (
                  <div className="text-xs text-gray-500">
                    <FireOutlined /> {metrics.engagementScore}%
                  </div>
                )}
              </div>

              {onView && (
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => onView(progress)}
                  size="small"
                />
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Vista expandida
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card
        hoverable
        className={`student-progress-card ${metrics.urgencyLevel === 'urgent' ? 'border-red-400' : ''}`}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <Badge 
              status={metrics.isOverdue ? 'error' : progress.status === 'COMPLETED' ? 'success' : 'processing'}
              dot
            >
              <Avatar 
                size={50} 
                icon={<UserOutlined />}
                src={progress.userAvatar}
              />
            </Badge>
            
            <div>
              <Title level={5} className="mb-0">
                {progress.userName || 'Usuario'}
              </Title>
              <Text type="secondary">
                {progress.campaignTitle || 'Campaña'}
              </Text>
              <div className="flex items-center gap-2 mt-1">
                <Tag 
                  color={currentStatus.color}
                  icon={currentStatus.icon}
                >
                  {currentStatus.text}
                </Tag>
                {progress.priority && (
                  <Tag color={priorityConfig[progress.priority]?.color}>
                    {priorityConfig[progress.priority]?.text}
                  </Tag>
                )}
              </div>
            </div>
          </div>

          <Space>
            {metrics.daysRemaining !== null && (
              <Tooltip title={`Vence: ${dayjs(progress.dueDate).format('DD/MM/YYYY')}`}>
                <div className="text-center">
                  <div className={`text-sm ${metrics.isOverdue ? 'text-red-500' : 'text-gray-600'}`}>
                    <CalendarOutlined />
                  </div>
                  <div className={`text-xs ${metrics.isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                    {metrics.isOverdue ? 'Vencido' : `${metrics.daysRemaining}d`}
                  </div>
                </div>
              </Tooltip>
            )}
            
            {onView && (
              <Button
                type="primary"
                icon={<EyeOutlined />}
                onClick={() => onView(progress)}
              >
                Ver Detalles
              </Button>
            )}
          </Space>
        </div>

        {/* Progreso Principal */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <Text strong>Progreso General</Text>
            <Text strong style={{ color: currentStatus.color }}>
              {metrics.completionPercentage}%
            </Text>
          </div>
          
          <Progress
            percent={metrics.completionPercentage}
            strokeColor={{
              '0%': '#ff4d4f',
              '50%': '#faad14',
              '100%': '#52c41a'
            }}
            strokeWidth={8}
          />
        </div>

        {/* Métricas */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} sm={6}>
            <Statistic
              title="Tiempo Dedicado"
              value={metrics.timeSpent}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>

          <Col xs={12} sm={6}>
            <Statistic
              title="Recursos"
              value={metrics.resourcesRatio}
              prefix={<BookOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>

          <Col xs={12} sm={6}>
            <Statistic
              title="Engagement"
              value={`${metrics.engagementScore}%`}
              prefix={<FireOutlined />}
              valueStyle={{ 
                fontSize: '16px',
                color: metrics.engagementScore >= 70 ? '#52c41a' : 
                       metrics.engagementScore >= 40 ? '#faad14' : '#ff4d4f'
              }}
            />
          </Col>

          <Col xs={12} sm={6}>
            <Statistic
              title="Puntuación"
              value={progress.score || '-'}
              prefix={<TrophyOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
        </Row>

        {/* Detalles adicionales si se solicita */}
        {showDetails && (
          <>
            <Divider />
            
            {/* Actividad reciente */}
            {progress.lastActivity && (
              <div className="mb-3">
                <Text type="secondary" className="text-sm">
                  <RiseOutlined className="mr-1" />
                  Última actividad: {dayjs(progress.lastActivity).fromNow()}
                </Text>
              </div>
            )}

            {/* Comentarios/Notas */}
            {(progress.teacherFeedback || progress.studentNotes) && (
              <div className="bg-gray-50 p-3 rounded">
                {progress.teacherFeedback && (
                  <div className="mb-2">
                    <Text strong className="text-sm">Comentario del profesor:</Text>
                    <div className="text-sm text-gray-600 mt-1">
                      {progress.teacherFeedback}
                    </div>
                  </div>
                )}
                
                {progress.studentNotes && (
                  <div>
                    <Text strong className="text-sm">Notas del estudiante:</Text>
                    <div className="text-sm text-gray-600 mt-1">
                      {progress.studentNotes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </motion.div>
  );
};