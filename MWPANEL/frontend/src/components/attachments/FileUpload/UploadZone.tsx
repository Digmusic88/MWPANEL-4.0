import React, { useState, useCallback } from 'react';
import { Upload, Button, Progress, Card, Typography, Space, Tag, Alert } from 'antd';
import { InboxOutlined, UploadOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import type { UploadProps, UploadFile } from 'antd/es/upload/interface';

import { formatFileSize } from '../common/types';

const { Dragger } = Upload;
const { Text } = Typography;

interface UploadZoneProps {
  onUpload: (files: File[]) => Promise<void>;
  isUploading?: boolean;
  multiple?: boolean;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  compact?: boolean;
  className?: string;
  disabled?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onUpload,
  isUploading = false,
  multiple = true,
  maxSize = 100, // 100MB default
  acceptedTypes = [],
  compact = false,
  className = '',
  disabled = false,
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Default accepted types if none provided
  const defaultAcceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
  ];

  const finalAcceptedTypes = acceptedTypes.length > 0 ? acceptedTypes : defaultAcceptedTypes;

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `El archivo "${file.name}" excede el tamaño máximo de ${maxSize}MB`;
    }

    // Check file type
    if (finalAcceptedTypes.length > 0 && !finalAcceptedTypes.includes(file.type)) {
      return `El tipo de archivo "${file.type}" no está permitido`;
    }

    return null;
  };

  const handleFileUpload = useCallback(async (files: File[]) => {
    // Validate files
    const errors: string[] = [];
    const validFiles: File[] = [];

    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      // Show errors but don't block valid files
      console.error('File validation errors:', errors);
    }

    if (validFiles.length === 0) {
      return;
    }

    // Initialize uploading files state
    const uploadingItems: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading',
    }));

    setUploadingFiles(uploadingItems);

    try {
      // Simulate progress for demonstration
      // In real implementation, this would be handled by the upload service
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => 
          prev.map(item => ({
            ...item,
            progress: Math.min(item.progress + Math.random() * 20, 95),
          }))
        );
      }, 200);

      // Call the actual upload function
      await onUpload(validFiles);

      // Complete the upload
      clearInterval(progressInterval);
      setUploadingFiles(prev =>
        prev.map(item => ({
          ...item,
          progress: 100,
          status: 'completed',
        }))
      );

      // Clear completed uploads after delay
      setTimeout(() => {
        setUploadingFiles([]);
      }, 2000);

    } catch (error) {
      setUploadingFiles(prev =>
        prev.map(item => ({
          ...item,
          status: 'error',
          error: error instanceof Error ? error.message : 'Error al subir archivo',
        }))
      );
    }
  }, [onUpload, maxSize, finalAcceptedTypes]);

  const uploadProps: UploadProps = {
    multiple,
    accept: finalAcceptedTypes.join(','),
    beforeUpload: () => false, // Prevent automatic upload
    onChange: (info) => {
      const files = info.fileList
        .filter(file => file.originFileObj)
        .map(file => file.originFileObj as File);
      
      if (files.length > 0) {
        handleFileUpload(files);
      }
    },
    onDrop: (e) => {
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files);
      }
    },
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
    disabled: disabled || isUploading,
    showUploadList: false,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'error': return 'red';
      default: return 'blue';
    }
  };

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Upload {...uploadProps}>
          <Button
            icon={<UploadOutlined />}
            loading={isUploading}
            disabled={disabled}
            block
          >
            {isUploading ? 'Subiendo...' : 'Subir archivos'}
          </Button>
        </Upload>

        {/* Upload progress (compact) */}
        <AnimatePresence>
          {uploadingFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1"
            >
              {uploadingFiles.map((uploadFile, index) => (
                <div key={index} className="text-xs">
                  <div className="flex items-center justify-between">
                    <Text className="truncate flex-1" style={{ fontSize: '11px' }}>
                      {uploadFile.file.name}
                    </Text>
                    <Tag color={getStatusColor(uploadFile.status)} size="small">
                      {uploadFile.status === 'completed' ? '✓' : 
                       uploadFile.status === 'error' ? '✗' : 
                       `${Math.round(uploadFile.progress)}%`}
                    </Tag>
                  </div>
                  {uploadFile.status === 'uploading' && (
                    <Progress
                      percent={uploadFile.progress}
                      size="small"
                      showInfo={false}
                    />
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <motion.div
        animate={dragOver ? { scale: 1.02 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Dragger
          {...uploadProps}
          className={`
            transition-all duration-200
            ${dragOver ? 'border-blue-500 bg-blue-50' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{ 
            padding: compact ? '16px' : '24px',
            minHeight: compact ? 'auto' : '120px',
          }}
        >
          <div className="text-center">
            <InboxOutlined 
              className={`text-4xl mb-2 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} 
            />
            <p className="text-lg font-medium text-gray-700 mb-1">
              {dragOver ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí'}
            </p>
            <p className="text-sm text-gray-500 mb-3">
              o haz clic para seleccionar archivos
            </p>
            
            {/* File type and size info */}
            <div className="text-xs text-gray-400">
              <p>Máximo {maxSize}MB por archivo</p>
              {finalAcceptedTypes.length > 0 && (
                <p className="mt-1">
                  Tipos: PDF, Word, Excel, PowerPoint, Imágenes, Videos, etc.
                </p>
              )}
              {multiple && <p>Múltiples archivos permitidos</p>}
            </div>
          </div>
        </Dragger>
      </motion.div>

      {/* Upload progress display */}
      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            <h4 className="text-sm font-medium text-gray-700">
              Subiendo archivos ({uploadingFiles.length})
            </h4>
            
            {uploadingFiles.map((uploadFile, index) => (
              <Card
                key={index}
                size="small"
                className="upload-progress-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <Text strong className="text-sm truncate block">
                      {uploadFile.file.name}
                    </Text>
                    <Text type="secondary" className="text-xs">
                      {formatFileSize(uploadFile.file.size)}
                    </Text>
                  </div>
                  
                  <div className="ml-2 flex items-center space-x-2">
                    {uploadFile.status === 'completed' && (
                      <CheckCircleOutlined className="text-green-500" />
                    )}
                    {uploadFile.status === 'error' && (
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setUploadingFiles(prev => 
                            prev.filter((_, i) => i !== index)
                          );
                        }}
                      />
                    )}
                    <Tag color={getStatusColor(uploadFile.status)} size="small">
                      {uploadFile.status === 'completed' ? 'Completado' :
                       uploadFile.status === 'error' ? 'Error' :
                       `${Math.round(uploadFile.progress)}%`}
                    </Tag>
                  </div>
                </div>

                {uploadFile.status === 'uploading' && (
                  <Progress
                    percent={uploadFile.progress}
                    size="small"
                    status="active"
                  />
                )}

                {uploadFile.status === 'error' && uploadFile.error && (
                  <Alert
                    type="error"
                    message={uploadFile.error}
                    size="small"
                    showIcon
                  />
                )}
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadZone;