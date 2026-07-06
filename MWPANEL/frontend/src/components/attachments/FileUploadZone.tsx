import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  Button,
  Card,
  Row,
  Col,
  Progress,
  Typography,
  Space,
  Tag,
  Alert,
  Input,
  Select,
  Switch,
  Form,
  notification,
} from 'antd';
import {
  InboxOutlined,
  UploadOutlined,
  DeleteOutlined,
  FileOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskAttachmentsApiService } from '../../services/taskAttachmentsApiService';
import { CreateAttachmentDto, UploadProgress } from '../../types/attachments';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { TextArea } = Input;
const { Option } = Select;

interface FileUploadZoneProps {
  taskId: string;
  isTeacher?: boolean;
  onUploadComplete?: (attachments: any[]) => void;
  maxFiles?: number;
  className?: string;
}

interface FileWithProgress {
  file: File;
  progress: UploadProgress;
  metadata: CreateAttachmentDto;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  taskId,
  isTeacher = false,
  onUploadComplete,
  maxFiles = 10,
  className,
}) => {
  const queryClient = useQueryClient();
  const formRef = useRef<any>();

  // State
  const [fileQueue, setFileQueue] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [globalMetadata, setGlobalMetadata] = useState<Partial<CreateAttachmentDto>>({
    isStudentSubmission: !isTeacher,
    isTeacherMaterial: isTeacher,
    academicYear: '2024-2025',
    tags: [],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata: CreateAttachmentDto }) =>
      taskAttachmentsApiService.uploadTaskAttachments(taskId, [file], metadata.isTeacherMaterial ? 'resource' : 'instruction'),
    onSuccess: (data, { file }) => {
      setFileQueue((prev) =>
        prev.map((item) =>
          item.file.name === file.name
            ? {
                ...item,
                progress: {
                  ...item.progress,
                  progress: 100,
                  status: 'success',
                },
              }
            : item
        )
      );
      notification.success({
        message: 'Archivo subido',
        description: `${file.name} se ha subido correctamente`,
      });
    },
    onError: (error, { file }) => {
      setFileQueue((prev) =>
        prev.map((item) =>
          item.file.name === file.name
            ? {
                ...item,
                progress: {
                  ...item.progress,
                  status: 'error',
                  error: error.message,
                },
              }
            : item
        )
      );
      notification.error({
        message: 'Error al subir archivo',
        description: `${file.name}: ${error.message}`,
      });
    },
  });

  // Handle file selection
  const handleFileSelect = useCallback(
    (fileList: File[]) => {
      if (fileQueue.length + fileList.length > maxFiles) {
        notification.warning({
          message: 'Límite de archivos',
          description: `Solo puedes subir hasta ${maxFiles} archivos a la vez`,
        });
        return;
      }

      const validFiles: FileWithProgress[] = [];

      fileList.forEach((file) => {
        const validation = { valid: file.size <= 10 * 1024 * 1024, error: file.size > 10 * 1024 * 1024 ? 'File too large' : undefined };
        if (validation.valid) {
          const metadata: CreateAttachmentDto = {
            taskId,
            ...globalMetadata,
            description: globalMetadata.description || `Archivo: ${file.name}`,
          };

          validFiles.push({
            file,
            metadata,
            progress: {
              fileName: file.name,
              progress: 0,
              status: 'pending',
            },
          });
        } else {
          notification.error({
            message: 'Archivo no válido',
            description: `${file.name}: ${validation.error}`,
          });
        }
      });

      setFileQueue((prev) => [...prev, ...validFiles]);
    },
    [fileQueue.length, maxFiles, taskId, globalMetadata]
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      handleFileSelect(files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Remove file from queue
  const removeFile = useCallback((fileName: string) => {
    setFileQueue((prev) => prev.filter((item) => item.file.name !== fileName));
  }, []);

  // Update file metadata
  const updateFileMetadata = useCallback(
    (fileName: string, newMetadata: Partial<CreateAttachmentDto>) => {
      setFileQueue((prev) =>
        prev.map((item) =>
          item.file.name === fileName
            ? {
                ...item,
                metadata: { ...item.metadata, ...newMetadata },
              }
            : item
        )
      );
    },
    []
  );

  // Start upload
  const startUpload = useCallback(async () => {
    if (fileQueue.length === 0) return;

    setUploading(true);
    const uploadedFiles: any[] = [];

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const item of fileQueue) {
        if (item.progress.status === 'pending') {
          const result = await uploadMutation.mutateAsync({
            file: item.file,
            metadata: item.metadata,
          });
          uploadedFiles.push(result);
        }
      }

      // Clear completed uploads after a delay
      setTimeout(() => {
        setFileQueue((prev) => prev.filter((item) => item.progress.status !== 'success'));
      }, 3000);

      // Refresh attachments data
      queryClient.invalidateQueries({ queryKey: ['attachments', taskId] });

      // Callback with uploaded files
      if (onUploadComplete && uploadedFiles.length > 0) {
        onUploadComplete(uploadedFiles);
      }
    } finally {
      setUploading(false);
    }
  }, [fileQueue, uploadMutation, taskId, queryClient, onUploadComplete]);

  // Clear all files
  const clearAll = useCallback(() => {
    setFileQueue([]);
  }, []);

  // Update global metadata
  const handleGlobalMetadataChange = useCallback((field: string, value: any) => {
    setGlobalMetadata((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Apply to all pending files
    setFileQueue((prev) =>
      prev.map((item) => ({
        ...item,
        metadata: {
          ...item.metadata,
          [field]: value,
        },
      }))
    );
  }, []);

  const pendingFiles = fileQueue.filter((item) => item.progress.status === 'pending');
  const uploadingFiles = fileQueue.filter((item) => item.progress.status === 'uploading');
  const completedFiles = fileQueue.filter((item) => item.progress.status === 'success');
  const errorFiles = fileQueue.filter((item) => item.progress.status === 'error');

  return (
    <div className={className}>
      <Card title="📤 Subir Archivos" className="mb-4">
        {/* Global Settings */}
        <Form layout="vertical" className="mb-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Descripción general">
                <TextArea
                  placeholder="Descripción para todos los archivos..."
                  value={globalMetadata.description}
                  onChange={(e) => handleGlobalMetadataChange('description', e.target.value)}
                  rows={2}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Etiquetas">
                <Select
                  mode="tags"
                  placeholder="Añadir etiquetas..."
                  value={globalMetadata.tags}
                  onChange={(value) => handleGlobalMetadataChange('tags', value)}
                >
                  <Option value="importante">Importante</Option>
                  <Option value="tarea">Tarea</Option>
                  <Option value="material">Material</Option>
                  <Option value="examen">Test Yourself</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Configuración">
                <Space direction="vertical" size="small">
                  <div>
                    <Switch
                      checked={globalMetadata.isStudentSubmission}
                      onChange={(value) => {
                        handleGlobalMetadataChange('isStudentSubmission', value);
                        handleGlobalMetadataChange('isTeacherMaterial', !value);
                      }}
                      disabled={!isTeacher}
                    />
                    <Text className="ml-2">Es entrega de estudiante</Text>
                  </div>
                  <div>
                    <Switch
                      checked={globalMetadata.isTeacherMaterial}
                      onChange={(value) => {
                        handleGlobalMetadataChange('isTeacherMaterial', value);
                        handleGlobalMetadataChange('isStudentSubmission', !value);
                      }}
                      disabled={!isTeacher}
                    />
                    <Text className="ml-2">Es material del profesor</Text>
                  </div>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
        >
          <Dragger
            multiple
            beforeUpload={(file, fileList) => {
              handleFileSelect([file]);
              return false; // Prevent auto upload
            }}
            showUploadList={false}
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">
              Haz clic o arrastra archivos aquí para subirlos
            </p>
            <p className="ant-upload-hint">
              Máximo {maxFiles} archivos • 10MB por archivo • Formatos compatibles: PDF, Word,
              Excel, imágenes, videos, etc.
            </p>
          </Dragger>
        </div>

        {/* Upload Controls */}
        {fileQueue.length > 0 && (
          <Row justify="space-between" align="middle" className="mt-4">
            <Col>
              <Space>
                <Text strong>
                  {fileQueue.length} archivo{fileQueue.length !== 1 ? 's' : ''} en cola
                </Text>
                {uploadingFiles.length > 0 && (
                  <Tag color="processing">Subiendo {uploadingFiles.length}</Tag>
                )}
                {completedFiles.length > 0 && (
                  <Tag color="success">Completado {completedFiles.length}</Tag>
                )}
                {errorFiles.length > 0 && (
                  <Tag color="error">Error {errorFiles.length}</Tag>
                )}
              </Space>
            </Col>
            <Col>
              <Space>
                <Button onClick={clearAll} disabled={uploading}>
                  Limpiar todo
                </Button>
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={startUpload}
                  loading={uploading}
                  disabled={pendingFiles.length === 0}
                >
                  Subir {pendingFiles.length} archivo{pendingFiles.length !== 1 ? 's' : ''}
                </Button>
              </Space>
            </Col>
          </Row>
        )}
      </Card>

      {/* File Queue */}
      <AnimatePresence>
        {fileQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card title="📁 Archivos en cola" size="small">
              <div className="space-y-3">
                {fileQueue.map((item) => (
                  <motion.div
                    key={item.file.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Card size="small" className="border border-gray-200">
                      <Row align="middle" gutter={16}>
                        <Col span={1}>
                          {item.progress.status === 'success' ? (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          ) : item.progress.status === 'error' ? (
                            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                          ) : (
                            <FileOutlined style={{ color: '#1890ff' }} />
                          )}
                        </Col>
                        <Col span={8}>
                          <Text strong ellipsis>
                            {item.file.name}
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {taskAttachmentsApiService.formatFileSize(item.file.size)} •{' '}
                            {taskAttachmentsApiService.getFileType(item.file.type)}
                          </Text>
                        </Col>
                        <Col span={8}>
                          <Input
                            placeholder="Descripción específica..."
                            value={item.metadata.description}
                            onChange={(e) =>
                              updateFileMetadata(item.file.name, { description: e.target.value })
                            }
                            disabled={item.progress.status !== 'pending'}
                            size="small"
                          />
                        </Col>
                        <Col span={5}>
                          {item.progress.status === 'uploading' ? (
                            <Progress
                              percent={item.progress.progress}
                              size="small"
                              status="active"
                            />
                          ) : item.progress.status === 'success' ? (
                            <Progress percent={100} size="small" status="success" />
                          ) : item.progress.status === 'error' ? (
                            <Progress percent={0} size="small" status="exception" />
                          ) : (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Pendiente
                            </Text>
                          )}
                        </Col>
                        <Col span={2}>
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeFile(item.file.name)}
                            disabled={item.progress.status === 'uploading'}
                            danger
                          />
                        </Col>
                      </Row>
                      {item.progress.error && (
                        <Alert
                          message={item.progress.error}
                          type="error"
                          size="small"
                          className="mt-2"
                        />
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {fileQueue.length === 0 && (
        <Alert
          message="💡 Consejos para subir archivos"
          description={
            <ul className="list-disc list-inside text-sm mt-2">
              <li>Puedes arrastrar múltiples archivos a la vez</li>
              <li>Los archivos se organizarán automáticamente por año académico y materia</li>
              <li>Añade etiquetas para facilitar la búsqueda posterior</li>
              <li>Las descripciones ayudan a identificar el contenido rápidamente</li>
            </ul>
          }
          type="info"
          showIcon
          className="mt-4"
        />
      )}
    </div>
  );
};

export default FileUploadZone;