import React from 'react';
import { Card, Button, Dropdown, Space, Tag, Tooltip, Avatar, Badge } from 'antd';
import {
  MoreOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  FileOutlined,
  PlayCircleOutlined,
  LinkOutlined,
  CodeOutlined,
  BarChartOutlined,
  FileTextOutlined,
  YoutubeOutlined,
  GoogleOutlined,
  LockOutlined,
  TeamOutlined,
  GlobalOutlined,
  HomeOutlined,
  StarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import type { MenuProps } from 'antd';
import type { LessonResource, LessonsResourceCardProps } from '../../types/lessons';
import { lessonsUtils } from '../../services/lessonsApi';

const { Meta } = Card;

const LessonsResourceCard: React.FC<LessonsResourceCardProps> = ({
  resource,
  onPreview,
  onEdit,
  onDelete,
  onShare,
  selected = false,
  viewMode = 'grid'
}) => {
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    console.log('🔧 LessonsResourceCard handleMenuClick called with key:', key);
    console.log('🔧 Resource:', resource);
    console.log('🔧 onEdit function available:', typeof onEdit);
    
    switch (key) {
      case 'preview':
        console.log('🔧 Calling onPreview');
        onPreview?.(resource);
        break;
      case 'edit':
        console.log('🔧 Calling onEdit');
        onEdit?.(resource);
        break;
      case 'share':
        console.log('🔧 Calling onShare');
        onShare?.(resource);
        break;
      case 'delete':
        console.log('🔧 Calling onDelete');
        onDelete?.(resource);
        break;
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'preview',
      label: 'Vista previa',
      icon: <EyeOutlined />,
    },
    {
      key: 'edit',
      label: 'Editar',
      icon: <EditOutlined />,
    },
    {
      key: 'share',
      label: 'Compartir',
      icon: <ShareAltOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Eliminar',
      icon: <DeleteOutlined />,
      danger: true,
    },
  ];

  const getResourceIcon = (type: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      'FILE': <FileOutlined />,
      'YOUTUBE_LINK': <YoutubeOutlined />,
      'WEB_LINK': <LinkOutlined />,
      'INTERNAL_DOC': <FileTextOutlined />,
      'PRESENTATION': <BarChartOutlined />,
      'TSX_ARTIFACT': <CodeOutlined />
    };
    return iconMap[type] || <FileOutlined />;
  };

  const getResourceColor = (type: string): string => {
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

  const getVisibilityIcon = (visibility: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      'PRIVATE': <LockOutlined />,
      'CLASS': <TeamOutlined />,
      'SCHOOL': <HomeOutlined />,
      'PUBLIC': <GlobalOutlined />
    };
    return iconMap[visibility] || <LockOutlined />;
  };

  const getThumbnail = (): React.ReactNode => {
    switch (resource.type) {
      case 'YOUTUBE_LINK':
        if (resource.youtubeVideoId) {
          return (
            <div className="relative">
              <img
                src={lessonsUtils.getYouTubeThumbnail(resource.youtubeVideoId)}
                alt={resource.name}
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <PlayCircleOutlined className="text-white text-3xl" />
              </div>
              {resource.youtubeDuration && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                  {lessonsUtils.formatDuration(resource.youtubeDuration)}
                </div>
              )}
            </div>
          );
        }
        break;
      
      case 'FILE':
        if (resource.mimeType?.startsWith('image/')) {
          return (
            <div className="h-32 bg-gray-100 flex items-center justify-center">
              <FileOutlined className="text-4xl text-gray-400" />
              <div className="absolute top-2 right-2">
                <Tag size="small">{resource.mimeType?.split('/')[1]?.toUpperCase()}</Tag>
              </div>
            </div>
          );
        }
        break;
      
      case 'TSX_ARTIFACT':
        console.log('🎨 Rendering TSX card with resource.name:', resource.name);
        return (
          <div className="h-32 bg-gradient-to-br from-blue-400 to-purple-600 flex flex-col items-center justify-center relative">
            <CodeOutlined className="text-white text-3xl mb-2" />
            <div className="text-white text-xs font-bold text-center px-2 truncate max-w-full">
              {resource.name || 'Sin título'}
            </div>
            <div className="absolute top-2 right-2">
              <Tag color="purple" size="small">TSX</Tag>
            </div>
          </div>
        );
      
      default:
        return (
          <div 
            className="h-32 flex items-center justify-center"
            style={{ backgroundColor: `${getResourceColor(resource.type)}20` }}
          >
            <div style={{ color: getResourceColor(resource.type), fontSize: '48px' }}>
              {getResourceIcon(resource.type)}
            </div>
          </div>
        );
    }

    return (
      <div className="h-32 bg-gray-100 flex items-center justify-center">
        <div style={{ color: getResourceColor(resource.type), fontSize: '48px' }}>
          {getResourceIcon(resource.type)}
        </div>
      </div>
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    });
  };

  const getFileSize = (): string => {
    if (resource.fileSize) {
      return lessonsUtils.formatFileSize(resource.fileSize);
    }
    return '';
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className={`border rounded-lg p-4 cursor-pointer transition-all duration-300 ${
          selected 
            ? 'border-blue-500 bg-blue-50' 
            : 'hover:border-gray-400 hover:shadow-sm'
        }`}
        onClick={() => onPreview?.(resource)}
      >
        <div className="flex items-center space-x-4">
          {/* Icon */}
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${getResourceColor(resource.type)}20` }}
          >
            <div style={{ color: getResourceColor(resource.type), fontSize: '24px' }}>
              {getResourceIcon(resource.type)}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-gray-900 truncate">{resource.name}</h4>
              <Tag 
                icon={getVisibilityIcon(resource.visibility)}
                color={lessonsUtils.getVisibilityColor(resource.visibility)}
                size="small"
              >
                {lessonsUtils.getVisibilityDisplayName(resource.visibility)}
              </Tag>
            </div>
            <p className="text-xs text-gray-500 truncate mt-1">
              {resource.description || 'Sin descripción'}
            </p>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
              <span>{lessonsUtils.getResourceTypeDisplayName(resource.type)}</span>
              {getFileSize() && <span>{getFileSize()}</span>}
              <span>{formatDate(resource.createdAt)}</span>
            </div>
          </div>

          {/* Stats */}
          {resource.stats && (
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <EyeOutlined />
                <span>{resource.stats.viewCount}</span>
              </div>
              {resource.stats.avgRating && (
                <div className="flex items-center space-x-1">
                  <StarOutlined />
                  <span>{resource.stats.avgRating.toFixed(1)}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']}>
            <Button 
              type="text" 
              icon={<MoreOutlined />} 
              size="small"
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card
        className={`h-full cursor-pointer transition-all duration-300 ${
          selected 
            ? 'border-blue-500 shadow-lg bg-blue-50' 
            : 'hover:shadow-md hover:border-gray-400'
        }`}
        onClick={() => onPreview?.(resource)}
        actions={[
          <Tooltip title="Vista previa">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onPreview?.(resource);
              }}
            />
          </Tooltip>,
          <Tooltip title="Compartir">
            <Button 
              type="text" 
              icon={<ShareAltOutlined />} 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onShare?.(resource);
              }}
            />
          </Tooltip>,
          <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']}>
            <Button 
              type="text" 
              icon={<MoreOutlined />} 
              size="small"
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        ]}
        cover={
          <div className="relative">
            {getThumbnail()}
            
            {/* Badges overlay */}
            <div className="absolute top-2 left-2 space-y-1">
              <Tag 
                icon={getVisibilityIcon(resource.visibility)}
                color={lessonsUtils.getVisibilityColor(resource.visibility)}
                size="small"
              >
                {lessonsUtils.getVisibilityDisplayName(resource.visibility)}
              </Tag>
              
              {!resource.isActive && (
                <Tag color="red" size="small">Inactivo</Tag>
              )}
            </div>

            {/* Drive indicator */}
            {resource.driveFileId && (
              <Tooltip title="Archivo en Google Drive">
                <GoogleOutlined className="absolute top-2 right-2 text-white bg-black bg-opacity-50 p-1 rounded" />
              </Tooltip>
            )}

            {/* Order index */}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
              #{resource.orderIndex}
            </div>
          </div>
        }
      >
        <Meta
          avatar={
            <Avatar 
              style={{ backgroundColor: getResourceColor(resource.type) }}
              icon={getResourceIcon(resource.type)}
              size="small"
            />
          }
          title={
            <Tooltip title={resource.name}>
              <span className="text-sm font-medium text-gray-800 truncate block">
                {resource.name}
              </span>
            </Tooltip>
          }
          description={
            <div className="space-y-2">
              {/* Description */}
              {resource.description && (
                <p className="text-xs text-gray-600 line-clamp-2">
                  {resource.description}
                </p>
              )}

              {/* Type-specific info */}
              <div className="text-xs text-gray-500">
                {resource.type === 'YOUTUBE_LINK' && resource.youtubeTitle && (
                  <div className="truncate">▶ {resource.youtubeTitle}</div>
                )}
                {resource.type === 'FILE' && resource.originalFileName && (
                  <div className="truncate">📁 {resource.originalFileName}</div>
                )}
                {resource.type === 'WEB_LINK' && resource.webUrl && (
                  <div className="truncate">🔗 {resource.webUrl}</div>
                )}
                {getFileSize() && (
                  <div>📊 {getFileSize()}</div>
                )}
              </div>

              {/* Tags */}
              {resource.tags && resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {resource.tags.slice(0, 3).map((tag, index) => (
                    <Tag key={index} size="small" color="blue">
                      {tag}
                    </Tag>
                  ))}
                  {resource.tags.length > 3 && (
                    <Tag size="small" color="default">
                      +{resource.tags.length - 3}
                    </Tag>
                  )}
                </div>
              )}

              {/* Stats and date */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                {resource.stats && (
                  <Space size="small">
                    <Tooltip title="Vistas">
                      <span className="text-xs text-gray-400">
                        <EyeOutlined /> {resource.stats.viewCount}
                      </span>
                    </Tooltip>
                    {resource.stats.avgRating && (
                      <Tooltip title="Calificación promedio">
                        <span className="text-xs text-gray-400">
                          <StarOutlined /> {resource.stats.avgRating.toFixed(1)}
                        </span>
                      </Tooltip>
                    )}
                  </Space>
                )}
                
                <Tooltip title={`Creado: ${new Date(resource.createdAt).toLocaleString('es-ES')}`}>
                  <span className="text-xs text-gray-400">
                    <ClockCircleOutlined /> {formatDate(resource.createdAt)}
                  </span>
                </Tooltip>
              </div>

              {/* Creator info */}
              {resource.createdBy && (
                <div className="text-xs text-gray-500 pt-1">
                  Por: {resource.createdBy.name}
                </div>
              )}
            </div>
          }
        />
      </Card>
    </motion.div>
  );
};

export default LessonsResourceCard;