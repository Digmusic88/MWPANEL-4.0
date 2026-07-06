import React from 'react';
import { Card, Button, Dropdown, Statistic, Space, Tag, Tooltip, Badge } from 'antd';
import {
  FolderOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  GoogleOutlined,
  FileOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  LinkOutlined,
  CodeOutlined,
  BarChartOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import type { MenuProps } from 'antd';
import type { LessonFolder, LessonsFolderCardProps } from '../../types/lessons';
import { lessonsUtils } from '../../services/lessonsApi';

const { Meta } = Card;

const LessonsFolderCard: React.FC<LessonsFolderCardProps> = ({
  folder,
  onSelect,
  onEdit,
  onDelete,
  selected = false
}) => {
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'edit':
        onEdit?.(folder);
        break;
      case 'delete':
        onDelete?.(folder);
        break;
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: 'Editar',
      icon: <EditOutlined />,
    },
    {
      key: 'delete',
      label: 'Eliminar',
      icon: <DeleteOutlined />,
      danger: true,
    },
  ];

  const getResourceTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'FILE': <FileOutlined />,
      'YOUTUBE_LINK': <PlayCircleOutlined />,
      'WEB_LINK': <LinkOutlined />,
      'INTERNAL_DOC': <FileTextOutlined />,
      'PRESENTATION': <BarChartOutlined />,
      'TSX_ARTIFACT': <CodeOutlined />
    };
    return iconMap[type] || <FileOutlined />;
  };

  const getResourceTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'FILE': '#1890ff',
      'YOUTUBE_LINK': '#ff4d4f',
      'WEB_LINK': '#52c41a',
      'INTERNAL_DOC': '#722ed1',
      'PRESENTATION': '#fa8c16',
      'TSX_ARTIFACT': '#13c2c2'
    };
    return colorMap[type] || '#1890ff';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getLastAccessed = (): string => {
    if (!folder.stats?.lastAccessedAt) return 'Nunca';
    return `Último acceso: ${formatDate(folder.stats.lastAccessedAt)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="w-full"
    >
      <Card
        className={`w-full cursor-pointer transition-all duration-300 ${
          selected 
            ? 'border-blue-500 shadow-lg bg-blue-50' 
            : 'hover:shadow-md hover:border-gray-400'
        }`}
        onClick={() => onSelect?.(folder)}
        bodyStyle={{ padding: '16px' }}
      >
        <div className="flex items-center space-x-4">
          {/* Left side - Icon and basic info */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center relative">
              <Badge count={folder.stats?.totalResources || 0} color="#f56a00">
                <FolderOutlined className="text-white text-2xl" />
              </Badge>
              
              {folder.driveFolderId && (
                <Tooltip title="Sincronizado con Google Drive">
                  <GoogleOutlined className="absolute -top-1 -right-1 text-white text-xs bg-green-500 rounded-full p-1" />
                </Tooltip>
              )}
              
              {/* Índice de orden */}
              <div className="absolute -top-2 -left-2 bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{folder.orderIndex}</span>
              </div>
            </div>
          </div>

          {/* Center - Title and description */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between mb-2">
              <Tooltip title={folder.name}>
                <h3 className="text-base font-semibold text-gray-800 truncate pr-2">
                  {folder.name}
                </h3>
              </Tooltip>
              <Tag color={folder.isActive ? 'green' : 'red'} size="small">
                {folder.isActive ? 'Activo' : 'Inactivo'}
              </Tag>
            </div>
            
            {folder.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {folder.description}
              </p>
            )}
            
            {/* Resource types */}
            {folder.stats?.resourcesByType && Object.keys(folder.stats.resourcesByType).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(folder.stats.resourcesByType).map(([type, count]) => (
                  <Tooltip 
                    key={type} 
                    title={`${lessonsUtils.getResourceTypeDisplayName(type)}: ${count} recursos`}
                  >
                    <Tag 
                      icon={getResourceTypeIcon(type)}
                      color={getResourceTypeColor(type)}
                      size="small"
                    >
                      {count}
                    </Tag>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>

          {/* Right side - Statistics and actions */}
          <div className="flex-shrink-0 text-right">
            {folder.stats && (
              <div className="grid grid-cols-1 gap-2 mb-3">
                <Statistic
                  title="Recursos"
                  value={folder.stats.totalResources}
                  prefix={<FileOutlined />}
                  valueStyle={{ fontSize: '14px', color: '#1890ff' }}
                  className="text-center"
                />
                <Statistic
                  title="Vistas"
                  value={folder.stats.totalViews}
                  prefix={<EyeOutlined />}
                  valueStyle={{ fontSize: '14px', color: '#52c41a' }}
                  className="text-center"
                />
              </div>
            )}
            
            {/* Actions */}
            <div className="flex space-x-2">
              <Tooltip title="Abrir carpeta">
                <Button type="text" icon={<EyeOutlined />} size="small" />
              </Tooltip>
              <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']}>
                <Button 
                  type="text" 
                  icon={<MoreOutlined />} 
                  size="small"
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            </div>
            
            {/* Date info */}
            <div className="text-xs text-gray-400 mt-2">
              <div>Creado: {formatDate(folder.createdAt)}</div>
              {folder.stats?.lastAccessedAt && (
                <div className="mt-1">
                  <Tooltip title={getLastAccessed()}>
                    <span>🕒 Acceso reciente</span>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        </div>

        {!folder.isActive && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <Tag color="red">Inactivo</Tag>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default LessonsFolderCard;