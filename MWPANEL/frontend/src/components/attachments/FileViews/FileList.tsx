import React from 'react';
import { Table, Checkbox, Tag, Avatar, Tooltip, Dropdown, Button, MenuProps } from 'antd';
import { ColumnsType } from 'antd/es/table';
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

import { AttachmentItem, formatFileSize } from '../common/types';

interface FileListProps {
  files: AttachmentItem[];
  selectedFiles: string[];
  onFileSelect: (fileId: string, isMultiSelect?: boolean) => void;
  onDelete?: (fileIds: string[]) => void;
  onPreview?: (file: AttachmentItem) => void;
  onDownload?: (file: AttachmentItem) => void;
  compact?: boolean;
  loading?: boolean;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onDelete,
  onPreview,
  onDownload,
  compact = false,
  loading = false,
}) => {
  const getFileIcon = (mimeType: string) => {
    const iconProps = { style: { fontSize: 16 } };
    
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

  const handleRowClick = (file: AttachmentItem, event: React.MouseEvent) => {
    const isMultiSelect = event.ctrlKey || event.metaKey;
    onFileSelect(file.id, isMultiSelect);
  };

  const columns: ColumnsType<AttachmentItem> = [
    {
      title: '',
      key: 'select',
      width: 50,
      render: (_, file) => (
        <Checkbox
          checked={selectedFiles.includes(file.id)}
          onChange={(e) => {
            e.stopPropagation();
            onFileSelect(file.id, true);
          }}
        />
      ),
    },
    {
      title: 'Archivo',
      key: 'file',
      render: (_, file) => (
        <div className="flex items-center space-x-3">
          {file.thumbnailUrl ? (
            <img
              src={file.thumbnailUrl}
              alt={file.originalFileName}
              className="w-8 h-8 object-cover rounded"
            />
          ) : (
            <div className="w-8 h-8 flex items-center justify-center">
              {getFileIcon(file.mimeType)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <Tooltip title={file.originalFileName}>
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.originalFileName}
              </p>
            </Tooltip>
            {file.metadata?.description && (
              <Tooltip title={file.metadata.description}>
                <p className="text-xs text-gray-500 truncate">
                  {file.metadata.description}
                </p>
              </Tooltip>
            )}
          </div>
        </div>
      ),
    },
    ...(compact ? [] : [
      {
        title: 'Tipo',
        key: 'type',
        width: 120,
        render: (_, file) => (
          <div className="space-y-1">
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
        ),
      } as any,
    ]),
    {
      title: 'Tamaño',
      key: 'size',
      width: 100,
      render: (_, file) => (
        <span className="text-sm text-gray-600">
          {formatFileSize(file.fileSize)}
        </span>
      ),
    },
    ...(compact ? [] : [
      {
        title: 'Subido por',
        key: 'uploadedBy',
        width: 150,
        render: (_, file) => (
          <div className="flex items-center space-x-2">
            <Avatar size={24} icon={<UserOutlined />} />
            <span className="text-sm text-gray-600 truncate">
              {file.uploadedBy?.name || 'Usuario desconocido'}
            </span>
          </div>
        ),
      } as any,
      {
        title: 'Fecha',
        key: 'date',
        width: 120,
        render: (_, file) => (
          <span className="text-sm text-gray-600">
            {new Date(file.createdAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })}
          </span>
        ),
      } as any,
    ]),
    ...(file.metadata?.tags && file.metadata.tags.length > 0 && !compact ? [
      {
        title: 'Etiquetas',
        key: 'tags',
        width: 150,
        render: (_, file) => (
          <div className="flex flex-wrap gap-1">
            {file.metadata?.tags?.slice(0, 2).map((tag, idx) => (
              <Tag key={idx} size="small">
                {tag}
              </Tag>
            ))}
            {file.metadata?.tags && file.metadata.tags.length > 2 && (
              <Tag size="small" className="text-gray-400">
                +{file.metadata.tags.length - 2}
              </Tag>
            )}
          </div>
        ),
      } as any,
    ] : []),
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, file) => (
        <Dropdown
          menu={getFileActions(file)}
          trigger={['click']}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            size="small"
          />
        </Dropdown>
      ),
    },
  ];

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Table
        dataSource={files}
        columns={columns}
        rowKey="id"
        size={compact ? 'small' : 'middle'}
        loading={loading}
        pagination={compact ? false : {
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} de ${total} archivos`,
          pageSizeOptions: ['10', '20', '50', '100'],
          defaultPageSize: 20,
        }}
        scroll={{ x: compact ? undefined : 800 }}
        rowSelection={undefined}
        onRow={(file) => ({
          onClick: (event) => handleRowClick(file, event),
          className: `
            cursor-pointer hover:bg-gray-50 transition-colors
            ${selectedFiles.includes(file.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
          `,
        })}
        className="file-list-table"
      />

      {/* Custom styles for the table */}
      <style jsx>{`
        .file-list-table .ant-table-tbody > tr.ant-table-row:hover > td {
          background: #f8fafc !important;
        }
        
        .file-list-table .ant-table-tbody > tr.ant-table-row.ant-table-row-selected > td {
          background: #eff6ff !important;
        }
      `}</style>
    </motion.div>
  );
};

export default FileList;