/**
 * @archivo: CampaignCard.tsx
 * @módulo: Assignments - Frontend Components
 * @función: Tarjeta de campaña para visualizar información resumida
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Componente que muestra una tarjeta visual con información resumida
 * de una campaña de asignaciones, incluyendo estado, progreso y acciones.
 * 
 * FUNCIONALIDADES:
 * - Vista resumida de campaña
 * - Indicadores visuales de estado
 * - Barra de progreso
 * - Acciones rápidas
 * - Responsive design
 * - Hover effects
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 3.1
 */

import React from 'react';
import { Card, Badge, Progress, Button, Space, Typography, Tag, Avatar, Tooltip } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  EditOutlined, 
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
  UserOutlined,
  CloseCircleOutlined,
  InboxOutlined,
  BookOutlined,
  TrophyOutlined,
  GroupOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { AssignmentCampaign, CampaignStatus, CampaignType, TargetType } from '../../types/assignments';

const { Text, Paragraph } = Typography;

interface CampaignCardProps {
  campaign: AssignmentCampaign;
  onView?: (campaign: AssignmentCampaign) => void;
  onEdit?: (campaign: AssignmentCampaign) => void;
  onDelete?: (campaign: AssignmentCampaign) => void;
  onActivate?: (campaign: AssignmentCampaign) => void;
  onPause?: (campaign: AssignmentCampaign) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Mapeo de estados a colores y textos
 */
const statusConfig = {
  [CampaignStatus.DRAFT]: {
    color: 'default',
    text: 'Borrador',
    icon: <EditOutlined />,
    bgColor: '#f5f5f5'
  },
  [CampaignStatus.ACTIVE]: {
    color: 'success',
    text: 'Activa',
    icon: <PlayCircleOutlined />,
    bgColor: '#f6ffed'
  },
  [CampaignStatus.PAUSED]: {
    color: 'warning',
    text: 'Pausada',
    icon: <PauseCircleOutlined />,
    bgColor: '#fffbe6'
  },
  [CampaignStatus.COMPLETED]: {
    color: 'success',
    text: 'Completada',
    icon: <CheckCircleOutlined />,
    bgColor: '#f6ffed'
  },
  [CampaignStatus.CANCELLED]: {
    color: 'error',
    text: 'Cancelada',
    icon: <CloseCircleOutlined />,
    bgColor: '#fff2f0'
  },
  [CampaignStatus.ARCHIVED]: {
    color: 'default',
    text: 'Archivada',
    icon: <InboxOutlined />,
    bgColor: '#fafafa'
  }
};

/**
 * Mapeo de tipos de campaña
 */
const typeConfig = {
  [CampaignType.SINGLE]: { text: 'Individual', color: 'blue' },
  [CampaignType.BULK]: { text: 'Masiva', color: 'purple' },
  [CampaignType.RECURRING]: { text: 'Recurrente', color: 'cyan' },
  [CampaignType.CONDITIONAL]: { text: 'Condicional', color: 'orange' }
};

/**
 * Mapeo de tipos de target
 */
const targetTypeConfig = {
  [TargetType.INDIVIDUAL]: { icon: <UserOutlined />, color: 'blue' },
  [TargetType.CLASS]: { icon: <TeamOutlined />, color: 'green' },
  [TargetType.SUBJECT]: { icon: <BookOutlined />, color: 'purple' },
  [TargetType.GRADE_LEVEL]: { icon: <TrophyOutlined />, color: 'gold' },
  [TargetType.CUSTOM_GROUP]: { icon: <GroupOutlined />, color: 'orange' }
};

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onView,
  onEdit,
  onDelete,
  onActivate,
  onPause,
  showActions = true,
  compact = false,
  className = ''
}) => {
  const statusInfo = statusConfig[campaign.status];
  const typeInfo = typeConfig[campaign.type];

  // Calcular progreso general
  const calculateProgress = (): number => {
    if (!campaign.metadata?.analytics) return 0;
    const { totalTargets, completedTargets } = campaign.metadata.analytics;
    return totalTargets > 0 ? Math.round((completedTargets / totalTargets) * 100) : 0;
  };

  const progress = calculateProgress();

  // Acciones según el estado
  const getActions = () => {
    const actions = [];

    if (onView) {
      actions.push(
        <Tooltip title="Ver detalles" key="view">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => onView(campaign)}
            size="small"
          />
        </Tooltip>
      );
    }

    if (campaign.status === CampaignStatus.DRAFT && onActivate) {
      actions.push(
        <Tooltip title="Activar campaña" key="activate">
          <Button 
            type="text" 
            icon={<PlayCircleOutlined />} 
            onClick={() => onActivate(campaign)}
            size="small"
            style={{ color: '#52c41a' }}
          />
        </Tooltip>
      );
    }

    if (campaign.status === CampaignStatus.ACTIVE && onPause) {
      actions.push(
        <Tooltip title="Pausar campaña" key="pause">
          <Button 
            type="text" 
            icon={<PauseCircleOutlined />} 
            onClick={() => onPause(campaign)}
            size="small"
            style={{ color: '#faad14' }}
          />
        </Tooltip>
      );
    }

    if (onEdit && campaign.status !== CampaignStatus.COMPLETED) {
      actions.push(
        <Tooltip title="Editar campaña" key="edit">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => onEdit(campaign)}
            size="small"
          />
        </Tooltip>
      );
    }

    if (onDelete && [CampaignStatus.DRAFT, CampaignStatus.CANCELLED].includes(campaign.status)) {
      actions.push(
        <Tooltip title="Eliminar campaña" key="delete">
          <Button 
            type="text" 
            icon={<DeleteOutlined />} 
            onClick={() => onDelete(campaign)}
            size="small"
            danger
          />
        </Tooltip>
      );
    }

    return actions;
  };

  // Formatear fecha
  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card
        size={compact ? 'small' : 'default'}
        hoverable
        style={{
          borderRadius: 12,
          border: '1px solid #f0f0f0',
          backgroundColor: statusInfo.bgColor,
          position: 'relative',
          overflow: 'hidden'
        }}
        bodyStyle={{
          padding: compact ? 16 : 20
        }}
        actions={showActions ? getActions() : undefined}
      >
        {/* Header con estado y tipo */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Badge 
              status={statusInfo.color as any}
              text={
                <span className="flex items-center gap-1">
                  {statusInfo.icon}
                  {statusInfo.text}
                </span>
              }
            />
          </div>
          <Tag color={typeInfo.color} style={{ margin: 0 }}>
            {typeInfo.text}
          </Tag>
        </div>

        {/* Título y descripción */}
        <div className="mb-4">
          <Typography.Title 
            level={compact ? 5 : 4} 
            style={{ margin: 0, marginBottom: 8 }}
            ellipsis={{ tooltip: campaign.title }}
          >
            {campaign.title}
          </Typography.Title>
          
          {campaign.description && (
            <Paragraph 
              style={{ 
                margin: 0, 
                color: '#666',
                fontSize: compact ? '12px' : '14px'
              }}
              ellipsis={{ 
                rows: compact ? 1 : 2, 
                tooltip: campaign.description 
              }}
            >
              {campaign.description}
            </Paragraph>
          )}
        </div>

        {/* Información de recursos y targets */}
        <div className="flex justify-between items-center mb-4">
          <Space size="middle">
            <Tooltip title={`${campaign.resources?.length || 0} recursos`}>
              <Text type="secondary" className="flex items-center gap-1">
                <FileTextOutlined />
                {campaign.resources?.length || 0}
              </Text>
            </Tooltip>
            
            <Tooltip title={`${campaign.targets?.length || 0} objetivos`}>
              <Text type="secondary" className="flex items-center gap-1">
                <TeamOutlined />
                {campaign.targets?.length || 0}
              </Text>
            </Tooltip>
          </Space>

          {/* Fechas importantes */}
          {(campaign.startDate || campaign.endDate) && (
            <Space size="small">
              <CalendarOutlined style={{ color: '#999' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {campaign.startDate && formatDate(campaign.startDate)}
                {campaign.startDate && campaign.endDate && ' - '}
                {campaign.endDate && formatDate(campaign.endDate)}
              </Text>
            </Space>
          )}
        </div>

        {/* Barra de progreso */}
        {campaign.status === CampaignStatus.ACTIVE && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Progreso general
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {progress}%
              </Text>
            </div>
            <Progress 
              percent={progress} 
              size="small"
              showInfo={false}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>
        )}

        {/* Targets preview */}
        {campaign.targets && campaign.targets.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Dirigido a:
            </Text>
            <Space size="small">
              {campaign.targets.slice(0, 3).map((target, index) => {
                const targetConfig = targetTypeConfig[target.targetType];
                return (
                  <Tag 
                    key={index}
                    color={targetConfig?.color}
                    size="small"
                    icon={targetConfig?.icon}
                    style={{ margin: 0, fontSize: '11px' }}
                  >
                    {target.targetType}
                  </Tag>
                );
              })}
              {campaign.targets.length > 3 && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  +{campaign.targets.length - 3} más
                </Text>
              )}
            </Space>
          </div>
        )}

        {/* Información del creador */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Avatar size="small" icon={<UserOutlined />} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {campaign.createdBy?.name || 'Usuario'}
            </Text>
          </div>
          
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {formatDate(campaign.createdAt)}
          </Text>
        </div>

        {/* Indicador de urgencia si aplica */}
        {campaign.metadata?.urgencyLevel === 'high' && (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderLeft: '20px solid transparent',
              borderTop: '20px solid #ff4d4f',
            }}
          />
        )}
      </Card>
    </motion.div>
  );
};