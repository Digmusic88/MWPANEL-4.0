import React from 'react';
import { Card, Tag, Avatar, Button, Dropdown, Statistic, Space, Tooltip } from 'antd';
import {
  FolderOutlined,
  FileOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  GoogleOutlined,
  TeamOutlined,
  BookOutlined,
  EyeOutlined,
  InboxOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import type { MenuProps } from 'antd';
import type { LessonWorkspace, LessonsWorkspaceCardProps } from '../../types/lessons';

const { Meta } = Card;

// Add custom styles for text shadow
const textShadowStyle = {
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
};

const LessonsWorkspaceCard: React.FC<LessonsWorkspaceCardProps> = ({
  workspace,
  onSelect,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  onClone,
  selected = false
}) => {
  // Debug logging
  console.log('🎯 LessonsWorkspaceCard rendering with workspace:', workspace);
  console.log('🎯 Workspace subjectAssignment:', workspace?.subjectAssignment);
  console.log('🎯 Workspace subject:', workspace?.subjectAssignment?.subject);
  console.log('🎯 Workspace teacher:', workspace?.subjectAssignment?.teacher);
  console.log('🎯 Workspace classGroup:', workspace?.subjectAssignment?.classGroup);
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'edit':
        onEdit?.(workspace);
        break;
      case 'archive':
        onArchive?.(workspace);
        break;
      case 'unarchive':
        onUnarchive?.(workspace);
        break;
      case 'clone':
        onClone?.(workspace);
        break;
      case 'delete':
        onDelete?.(workspace);
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
      type: 'divider',
    },
    ...(workspace.isArchived ? [
      {
        key: 'unarchive',
        label: 'Restaurar',
        icon: <InboxOutlined />,
      }
    ] : [
      {
        key: 'archive',
        label: 'Archivar',
        icon: <InboxOutlined />,
      }
    ]),
    {
      key: 'clone',
      label: 'Clonar para nuevo curso',
      icon: <CopyOutlined />,
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

  const getSubjectColor = (subjectCode?: string): string => {
    const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068', '#108ee9'];
    if (!subjectCode) return colors[0];
    
    const hash = subjectCode.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const formatAcademicYear = (year?: string): string => {
    if (!year) return '';
    return `Curso ${year}`;
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
        onClick={() => onSelect?.(workspace)}
        bodyStyle={{ padding: '16px' }}
      >
        <div className="flex items-center space-x-4">
          {/* Left side - Icon and basic info */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center relative">
              <Avatar 
                style={{ backgroundColor: getSubjectColor(workspace.subjectAssignment?.subject?.code) }}
                icon={<BookOutlined />}
                size={40}
              >
                {workspace.subjectAssignment?.subject?.code?.charAt(0) || 'S'}
              </Avatar>
              
              {workspace.driveFolderId && (
                <Tooltip title="Sincronizado con Google Drive">
                  <GoogleOutlined className="absolute -top-1 -right-1 text-white text-xs bg-green-500 rounded-full p-1" />
                </Tooltip>
              )}
            </div>
          </div>

          {/* Center - Title and description */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 truncate pr-2">
                  {workspace.subjectAssignment?.subject?.name || 'Asignatura'}
                </h3>
                <div className="text-sm text-gray-600">
                  {workspace.subjectAssignment?.teacher?.user?.profile 
                    ? `${workspace.subjectAssignment.teacher.user.profile.firstName} ${workspace.subjectAssignment.teacher.user.profile.lastName}`
                    : 'Profesor'} · {workspace.subjectAssignment?.classGroup?.name || 'Clase'}
                </div>
              </div>
              <Tag color={workspace.isActive ? 'green' : 'red'} size="small">
                {workspace.isActive ? 'Activo' : 'Inactivo'}
              </Tag>
            </div>
            
            <div className="flex items-center space-x-1 text-xs text-gray-600 mb-2">
              <BookOutlined />
              <span className="truncate">
                {formatAcademicYear(workspace.subjectAssignment?.academicYear?.name) || 'Curso académico'}
              </span>
            </div>

            {/* Resource types */}
            {workspace.stats?.resourcesByType && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(workspace.stats.resourcesByType).map(([type, count]) => (
                  <Tag key={type} size="small" color="blue">
                    {type}: {count}
                  </Tag>
                ))}
              </div>
            )}
          </div>

          {/* Right side - Statistics and actions */}
          <div className="flex-shrink-0 text-right">
            {workspace.stats && (
              <div className="grid grid-cols-1 gap-2 mb-3">
                <Statistic
                  title="Lecciones"
                  value={workspace.stats.totalFolders}
                  prefix={<FolderOutlined />}
                  valueStyle={{ fontSize: '14px', color: '#1890ff' }}
                  className="text-center"
                />
                <Statistic
                  title="Recursos"
                  value={workspace.stats.totalResources}
                  prefix={<FileOutlined />}
                  valueStyle={{ fontSize: '14px', color: '#52c41a' }}
                  className="text-center"
                />
              </div>
            )}
            
            {/* Actions */}
            <div className="flex space-x-2">
              <Tooltip title="Ver contenido">
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
          </div>
        </div>

        {!workspace.isActive && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <Tag color="red">Inactivo</Tag>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default LessonsWorkspaceCard;