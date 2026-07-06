import React from 'react';
import { Card, Checkbox, Tooltip, Dropdown, Button, Tag, Avatar, MenuProps } from 'antd';
import { 
  FileImageOutlined, 
  FileTextOutlined, 
  FilePdfOutlined, 
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileZipOutlined,
  PlayCircleOutlined,
  CustomerServiceOutlined,
  MoreOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';

import { AttachmentItem, getFileTypeIcon, formatFileSize } from '../common/types';

interface FileGridProps {
  files: AttachmentItem[];
  selectedFiles: string[];
  onFileSelect: (fileId: string, isMultiSelect?: boolean) => void;
  onDelete?: (fileIds: string[]) => void;
  onPreview?: (file: AttachmentItem) => void;
  onDownload?: (file: AttachmentItem) => void;
  compact?: boolean;
}

export const FileGrid: React.FC<FileGridProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onDelete,
  onPreview,
  onDownload,
  compact = false,
}) => {
  const getFileIcon = (mimeType: string, size: number = 24) => {
    const iconProps = { style: { fontSize: size } };
    
    if (mimeType.startsWith('image/')) return <FileImageOutlined {...iconProps} className="text-green-500" />;
    if (mimeType.startsWith('video/')) return <PlayCircleOutlined {...iconProps} className="text-red-500" />;
    if (mimeType.startsWith('audio/')) return <CustomerServiceOutlined {...iconProps} className="text-purple-500" />;
    if (mimeType === 'application/pdf') return <FilePdfOutlined {...iconProps} className="text-red-600" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileWordOutlined {...iconProps} className="text-blue-600" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileExcelOutlined {...iconProps} className="text-green-600" />;
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return <FilePptOutlined {...iconProps} className="text-orange-600" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <FileZipOutlined {...iconProps} className="text-yellow-600" />;
    
    return <FileTextOutlined {...iconProps} className="text-gray-500" />;
  };

  const getFileActions = (file: AttachmentItem): MenuProps => ({
    items: [
      {
        key: 'preview',
        label: 'Vista previa',
        icon: <EyeOutlined />,
        onClick: () => onPreview?.(file),
        disabled: !onPreview,
      },
      {
        key: 'download',
        label: 'Descargar',
        icon: <DownloadOutlined />,
        onClick: () => onDownload?.(file),
        disabled: !onDownload,
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        label: 'Eliminar',
        icon: <DeleteOutlined />,
        onClick: () => onDelete?.([file.id]),
        disabled: !onDelete,
        danger: true,
      },
    ],
  });

  const handleFileClick = (fileId: string, event: React.MouseEvent) => {
    const isMultiSelect = event.ctrlKey || event.metaKey;
    onFileSelect(fileId, isMultiSelect);
  };

  const cardSize = compact ? 'small' : 'default';
  const gridCols = compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FileTextOutlined className="text-6xl text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">No hay archivos en esta carpeta</p>
        <p className="text-gray-400 text-sm">Arrastra archivos aquí para subirlos</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {files.map((file, index) => {
        const isSelected = selectedFiles.includes(file.id);
        const uploadedBy = file.uploadedBy || { name: 'Usuario desconocido', email: '' };
        
        return (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -2 }}
          >
            <Card
              size={cardSize}
              className={`
                cursor-pointer transition-all duration-200 hover:shadow-lg border
                ${isSelected ? 'border-blue-500 shadow-md bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                ${compact ? 'p-2' : ''}
              `}
              bodyStyle={{ padding: compact ? '8px' : '16px' }}
              onClick={(e) => handleFileClick(file.id, e)}
            >
              {/* Selection checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileSelect(file.id, true);
                  }}
                />
              </div>

              {/* Actions menu */}
              <div className="absolute top-2 right-2 z-10">
                <Dropdown
                  menu={getFileActions(file)}
                  trigger={['click']}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    type="text"
                    icon={<MoreOutlined />}
                    size="small"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </Dropdown>
              </div>

              {/* File content */}
              <div className="group">
                {/* File preview/icon */}
                <div className="flex justify-center mb-3">
                  {file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt={file.originalFileName}
                      className={`object-cover rounded ${compact ? 'w-16 h-16' : 'w-20 h-20'}`}
                    />
                  ) : (
                    <div className={`flex items-center justify-center rounded bg-gray-50 ${compact ? 'w-16 h-16' : 'w-20 h-20'}`}>
                      {getFileIcon(file.mimeType, compact ? 32 : 40)}
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="text-center">
                  <Tooltip title={file.originalFileName}>
                    <h4 className={`font-medium text-gray-900 truncate ${compact ? 'text-xs' : 'text-sm'} mb-1`}>
                      {file.originalFileName}
                    </h4>
                  </Tooltip>
                  
                  <p className={`text-gray-500 ${compact ? 'text-xs' : 'text-xs'} mb-2`}>
                    {formatFileSize(file.fileSize)}
                  </p>

                  {/* Tags */}
                  {file.metadata?.tags && file.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mb-2">
                      {file.metadata.tags.slice(0, compact ? 1 : 2).map((tag, idx) => (
                        <Tag key={idx} size="small" className={compact ? 'text-xs' : ''}>
                          {tag}
                        </Tag>
                      ))}
                      {file.metadata.tags.length > (compact ? 1 : 2) && (
                        <Tag size="small" className={`${compact ? 'text-xs' : ''} text-gray-400`}>
                          +{file.metadata.tags.length - (compact ? 1 : 2)}
                        </Tag>
                      )}
                    </div>
                  )}

                  {/* File type badge */}
                  <div className="flex justify-center mb-2">
                    {file.metadata?.isStudentSubmission && (
                      <Tag color="blue" size="small">Entrega</Tag>
                    )}
                    {file.metadata?.isTeacherMaterial && (
                      <Tag color="green" size="small">Material</Tag>
                    )}
                    {file.metadata?.isEvaluated && (
                      <Tag color="orange" size="small">Evaluado</Tag>
                    )}
                  </div>

                  {/* Upload info */}
                  {!compact && (
                    <div className="flex items-center justify-center text-xs text-gray-400">
                      <Avatar 
                        size={16} 
                        icon={<UserOutlined />}
                        className="mr-1"
                      />
                      <span className="truncate">
                        {uploadedBy.name}
                      </span>
                    </div>
                  )}

                  {/* Version info */}
                  {file.currentVersion > 1 && (
                    <div className="text-xs text-gray-400 mt-1">
                      v{file.currentVersion}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default FileGrid;