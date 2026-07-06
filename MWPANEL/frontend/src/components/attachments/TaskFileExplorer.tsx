import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Dropdown,
  Modal,
  Breadcrumb,
  Row,
  Col,
  Typography,
  Tag,
  Avatar,
  Tooltip,
  Select,
  Upload,
  Progress,
  notification,
  Spin,
  Empty,
} from 'antd';
import {
  FileOutlined,
  FolderOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  RestoreOutlined,
  CommentOutlined,
  HistoryOutlined,
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  MoreOutlined,
  InboxOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  FileZipOutlined,
  CodeOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { taskAttachmentsApiService } from '../../services/taskAttachmentsApiService';
import {
  TaskAttachment,
  AttachmentQueryDto,
  CreateAttachmentDto,
  FolderStructureDto,
  AttachmentFilters,
  SortConfig,
  UploadProgress,
} from '../../types/attachments';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { Dragger } = Upload;

interface TaskFileExplorerProps {
  taskId: string;
  taskTitle?: string;
  isTeacher?: boolean;
  readOnly?: boolean;
  className?: string;
}

export const TaskFileExplorer: React.FC<TaskFileExplorerProps> = ({
  taskId,
  taskTitle,
  isTeacher = false,
  readOnly = false,
  className,
}) => {
  const queryClient = useQueryClient();
  
  // State
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [filters, setFilters] = useState<AttachmentFilters>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'createdAt',
    direction: 'desc',
  });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<TaskAttachment | null>(null);

  // Queries
  const {
    data: attachmentsData,
    isLoading: loadingAttachments,
    error: attachmentsError,
    refetch: refetchAttachments,
  } = useQuery({
    queryKey: ['attachments', taskId, filters, sortConfig],
    queryFn: async () => {
      console.log('🔍 TaskFileExplorer: Loading attachments for taskId:', taskId);
      try {
        const attachments = await taskAttachmentsApiService.getTaskAttachments(taskId);
        console.log('✅ TaskFileExplorer: Attachments loaded:', attachments);
        return {
          attachments,
          total: attachments.length,
          page: 1,
          totalPages: 1
        };
      } catch (error) {
        console.error('❌ TaskFileExplorer: Error loading attachments:', error);
        throw error;
      }
    },
    enabled: !!taskId,
  });

  const {
    data: folderStructure,
    isLoading: loadingStructure,
  } = useQuery({
    queryKey: ['folderStructure', taskId, currentPath],
    queryFn: () => Promise.resolve({ breadcrumb: [{ id: 'root', name: 'Raíz', path: '' }] }),
    enabled: !!taskId,
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: ({
      file,
      metadata,
    }: {
      file: File;
      metadata: CreateAttachmentDto;
    }) =>
      taskAttachmentsApiService.uploadTaskAttachments(taskId, [file], metadata.isTeacherMaterial ? 'resource' : 'instruction').then(result => {
        return result;
      }),
    onSuccess: (data, { file }) => {
      setUploadProgress((prev) => ({
        ...prev,
        [file.name]: {
          fileName: file.name,
          progress: 100,
          status: 'success',
        },
      }));
      notification.success({
        message: 'Archivo subido',
        description: `${file.name} se ha subido correctamente`,
      });
      queryClient.invalidateQueries({ queryKey: ['attachments', taskId] });
      setTimeout(() => {
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }, 2000);
    },
    onError: (error, { file }) => {
      setUploadProgress((prev) => ({
        ...prev,
        [file.name]: {
          fileName: file.name,
          progress: 0,
          status: 'error',
          error: error.message,
        },
      }));
      notification.error({
        message: 'Error al subir archivo',
        description: `No se pudo subir ${file.name}: ${error.message}`,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent: boolean }) =>
      taskAttachmentsApiService.deleteTaskAttachment(id),
    onSuccess: () => {
      notification.success({
        message: 'Archivo eliminado',
        description: 'El archivo se ha eliminado correctamente',
      });
      queryClient.invalidateQueries({ queryKey: ['attachments', taskId] });
      setSelectedFiles([]);
      setShowDeleteModal(false);
    },
    onError: (error) => {
      notification.error({
        message: 'Error al eliminar',
        description: error.message,
      });
    },
  });

  // File icon helper
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImageOutlined style={{ color: '#52c41a' }} />;
    if (mimeType.includes('pdf')) return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    if (mimeType.includes('word')) return <FileWordOutlined style={{ color: '#1890ff' }} />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
      return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    if (mimeType.startsWith('video/')) return <VideoCameraOutlined style={{ color: '#722ed1' }} />;
    if (mimeType.startsWith('audio/')) return <SoundOutlined style={{ color: '#fa8c16' }} />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z'))
      return <FileZipOutlined style={{ color: '#faad14' }} />;
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('css'))
      return <CodeOutlined style={{ color: '#13c2c2' }} />;
    return <FileOutlined style={{ color: '#8c8c8c' }} />;
  };

  // Handle file upload
  const handleFileUpload = useCallback(
    (file: File) => {
      const validation = { valid: true }; // Basic validation
      if (!validation.valid) {
        notification.error({
          message: 'Archivo no válido',
          description: validation.error,
        });
        return false;
      }

      const metadata: CreateAttachmentDto = {
        taskId,
        isStudentSubmission: !isTeacher,
        isTeacherMaterial: isTeacher,
        description: `Archivo subido: ${file.name}`,
        academicYear: '2024-2025',
      };

      setUploadProgress((prev) => ({
        ...prev,
        [file.name]: {
          fileName: file.name,
          progress: 0,
          status: 'pending',
        },
      }));

      uploadMutation.mutate({ file, metadata });
      return false; // Prevent default upload
    },
    [taskId, isTeacher, uploadMutation]
  );

  // Handle file download
  const handleDownload = useCallback(async (attachment: TaskAttachment) => {
    try {
      await taskAttachmentsApiService.downloadTaskAttachment(
        attachment.id, 
        attachment, 
        taskTitle
      );
      // Download handled by service
    } catch (error) {
      notification.error({
        message: 'Error al descargar',
        description: 'No se pudo descargar el archivo',
      });
    }
  }, [taskTitle]);

  // Handle multiple file download as ZIP
  const handleMultipleDownload = useCallback(async (attachmentIds: string[]) => {
    try {
      // Get current attachments data at the time of download
      const currentAttachments = attachmentsData?.attachments || [];
      
      await taskAttachmentsApiService.downloadMultipleAttachments(
        attachmentIds, 
        taskTitle || 'archivos',
        currentAttachments // Pass the current attachments array for naming
      );
      notification.success({
        message: 'Descarga completada',
        description: `Se han descargado ${attachmentIds.length} archivos en formato ZIP`,
      });
    } catch (error) {
      notification.error({
        message: 'Error al descargar',
        description: 'No se pudieron descargar los archivos como ZIP',
      });
    }
  }, [taskTitle, attachmentsData]);

  // Handle file preview
  const handlePreview = useCallback((attachment: TaskAttachment) => {
    setPreviewFile(attachment);
    setShowPreviewModal(true);
  }, []);

  // Render attachment preview (similar to ResourceViewer)
  const renderAttachmentPreview = (attachment: TaskAttachment) => {
    // Extract Google Drive file ID from metadata if available
    const fileId = attachment.metadata?.driveFileId || 
                  attachment.metadata?.webViewLink?.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];

    if (attachment.mimeType.includes('pdf')) {
      return (
        <div className="space-y-4">
          {fileId ? (
            // Google Drive PDF viewer
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={`https://drive.google.com/file/d/${fileId}/preview`}
                width="100%"
                height="600px"
                title={attachment.originalFileName}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onLoad={() => console.log(`PDF loaded: ${attachment.originalFileName}`)}
                onError={() => console.log('PDF preview fallback')}
              />
            </div>
          ) : (
            // Fallback for non-Google Drive PDFs
            <div className="bg-gray-100 p-6 rounded-lg text-center">
              <div className="text-6xl mb-4">📄</div>
              <Title level={4}>{attachment.originalFileName}</Title>
              <Text type="secondary">Vista previa de PDF no disponible</Text>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <Text type="secondary" className="block mb-2">
              Opciones de descarga:
            </Text>
            <Space wrap>
              {fileId && (
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank')}
                >
                  Abrir en Google Drive
                </Button>
              )}
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(attachment)}
                type="primary"
              >
                Descargar
              </Button>
            </Space>
          </div>
        </div>
      );
    }
    
    if (attachment.mimeType.startsWith('image/')) {
      return (
        <div className="text-center space-y-4">
          {fileId ? (
            // Google Drive image viewer
            <img
              src={`https://drive.google.com/uc?id=${fileId}&export=view`}
              alt={attachment.originalFileName}
              style={{ maxWidth: '100%', height: 'auto', maxHeight: '500px' }}
              onError={(e) => {
                // If Google Drive direct link fails, hide image and show download button
                console.error('Image preview failed');
                e.currentTarget.style.display = 'none';
                // Show fallback UI
                const container = e.currentTarget.parentElement;
                if (container) {
                  container.innerHTML = `
                    <div class="bg-gray-100 p-6 rounded-lg text-center">
                      <div class="text-6xl mb-4">🖼️</div>
                      <h4>${attachment.originalFileName}</h4>
                      <p class="text-gray-500">Vista previa no disponible - usar descarga</p>
                    </div>
                  `;
                }
              }}
            />
          ) : (
            // Fallback for non-Google Drive images - show placeholder instead of direct download
            <div className="bg-gray-100 p-6 rounded-lg text-center">
              <div className="text-6xl mb-4">🖼️</div>
              <Title level={4}>{attachment.originalFileName}</Title>
              <Text type="secondary">Vista previa de imagen no disponible</Text>
              <div className="mt-4">
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(attachment)}
                >
                  Descargar Imagen
                </Button>
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 p-3 rounded">
            <Text type="secondary">
              {taskAttachmentsApiService.getFileType(attachment.mimeType)} • {' '}
              {taskAttachmentsApiService.formatFileSize(attachment.fileSize)}
            </Text>
          </div>
        </div>
      );
    }

    // For other file types (videos, documents, etc.)
    return (
      <div className="space-y-4">
        <div className="bg-gray-100 p-8 rounded-lg text-center">
          <div className="text-6xl mb-4">
            {getFileIcon(attachment.mimeType)}
          </div>
          <Title level={4}>{attachment.originalFileName}</Title>
          <Text type="secondary" className="block mb-4">
            {taskAttachmentsApiService.getFileType(attachment.mimeType)} • {' '}
            {taskAttachmentsApiService.formatFileSize(attachment.fileSize)}
          </Text>
          <Text type="secondary">
            Vista previa no disponible para este tipo de archivo.
          </Text>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <Space wrap>
            {fileId && (
              <Button
                icon={<EyeOutlined />}
                onClick={() => window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank')}
              >
                Abrir en Google Drive
              </Button>
            )}
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(attachment)}
            >
              Descargar Archivo
            </Button>
          </Space>
        </div>
      </div>
    );
  };

  // File actions dropdown
  const getFileActions = (attachment: TaskAttachment) => [
    {
      key: 'download',
      label: 'Descargar',
      icon: <DownloadOutlined />,
      onClick: () => handleDownload(attachment),
    },
    {
      key: 'preview',
      label: 'Vista previa',
      icon: <FileOutlined />,
      onClick: () => handlePreview(attachment),
      disabled: false,
    },
    {
      key: 'comments',
      label: `Comentarios (${attachment.commentsCount})`,
      icon: <CommentOutlined />,
      onClick: () => {
        // TODO: Open comments panel
      },
    },
    {
      key: 'versions',
      label: `Versiones (${attachment.versionsCount})`,
      icon: <HistoryOutlined />,
      onClick: () => {
        // TODO: Open versions panel
      },
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      label: 'Eliminar',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        setSelectedFiles([attachment.id]);
        setShowDeleteModal(true);
      },
      disabled: readOnly,
    },
  ];

  // Table columns
  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'originalFileName',
      key: 'name',
      width: 300, // Increased width for better file name display
      sorter: true,
      render: (text: string, record: TaskAttachment) => (
        <Space>
          {getFileIcon(record.mimeType)}
          <Text
            onClick={() => handlePreview(record)}
            style={{ cursor: 'pointer' }}
            className="hover:text-blue-600"
          >
            {text}
          </Text>
          {record.isStudentSubmission && (
            <Tag color="blue" size="small">
              Entrega
            </Tag>
          )}
          {record.isTeacherMaterial && (
            <Tag color="green" size="small">
              Material
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Tamaño',
      dataIndex: 'fileSize',
      key: 'size',
      width: 120, // Increased width for better size display
      sorter: true,
      render: (size: number) => taskAttachmentsApiService.formatFileSize(size),
    },
    {
      title: 'Tipo',
      dataIndex: 'mimeType',
      key: 'type',
      width: 130, // Increased width for better type display
      render: (mimeType: string) => taskAttachmentsApiService.getFileType(mimeType),
    },
    {
      title: 'Subido por',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy',
      width: 180, // Increased width for better name display
      render: (uploadedBy: string, record: TaskAttachment) => (
        <Space>
          <Avatar size="small">
            {typeof uploadedBy === 'string' ? uploadedBy.charAt(0).toUpperCase() : 'U'}
          </Avatar>
          <Text>
            {typeof uploadedBy === 'string' ? uploadedBy : 'Usuario'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      width: 180, // Increased width for better date display
      sorter: true,
      render: (date: string) => date ? new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Sin fecha',
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 100, // Increased width for better action buttons
      render: (_: any, record: TaskAttachment) => (
        <Dropdown
          menu={{
            items: getFileActions(record),
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const attachments = attachmentsData?.attachments || [];

  return (
    <div className={className}>
      <Card
        title={
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                📎 Archivos Adjuntos
                {taskTitle && <Text type="secondary"> - {taskTitle}</Text>}
              </Title>
            </Col>
            <Col>
              <Space>
                {selectedFiles.length > 0 && (
                  <>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleMultipleDownload(selectedFiles)}
                    >
                      Descargar ZIP ({selectedFiles.length})
                    </Button>
                    {!readOnly && (
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => setShowDeleteModal(true)}
                      >
                        Eliminar ({selectedFiles.length})
                      </Button>
                    )}
                  </>
                )}
                {!readOnly && (
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    onClick={() => setShowUploadModal(true)}
                  >
                    Subir Archivos
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        }
        extra={
          <Space>
            <Search
              placeholder="Buscar archivos..."
              allowClear
              onSearch={(value) =>
                setFilters((prev) => ({ ...prev, search: value || undefined }))
              }
              style={{ width: 200 }}
            />
            <Button icon={<FilterOutlined />} />
            <Button icon={<SortAscendingOutlined />} />
          </Space>
        }
      >
        {/* Upload Progress */}
        <AnimatePresence>
          {Object.values(uploadProgress).length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Card size="small" title="Subiendo archivos...">
                {Object.values(uploadProgress).map((progress) => (
                  <div key={progress.fileName} className="mb-2">
                    <Row justify="space-between" align="middle">
                      <Col span={16}>
                        <Text ellipsis>{progress.fileName}</Text>
                      </Col>
                      <Col span={8}>
                        <Progress
                          percent={progress.progress}
                          size="small"
                          status={
                            progress.status === 'error'
                              ? 'exception'
                              : progress.status === 'success'
                              ? 'success'
                              : 'active'
                          }
                        />
                      </Col>
                    </Row>
                    {progress.error && (
                      <Text type="danger" style={{ fontSize: '12px' }}>
                        {progress.error}
                      </Text>
                    )}
                  </div>
                ))}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Breadcrumb */}
        {folderStructure?.breadcrumb && (
          <Breadcrumb className="mb-4">
            {folderStructure.breadcrumb.map((item) => (
              <Breadcrumb.Item
                key={item.id}
                onClick={() => setCurrentPath(item.path || '')}
                style={{ cursor: 'pointer' }}
              >
                <FolderOutlined /> {item.name}
              </Breadcrumb.Item>
            ))}
          </Breadcrumb>
        )}

        {/* Files Table */}
        <Spin spinning={loadingAttachments}>
          {attachments.length > 0 ? (
            <Table
              columns={columns}
              dataSource={attachments}
              rowKey="id"
              pagination={{
                total: attachmentsData?.total,
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} de ${total} archivos`,
              }}
              rowSelection={{
                selectedRowKeys: selectedFiles,
                onChange: setSelectedFiles,
                disabled: readOnly,
              }}
              onChange={(pagination, filters, sorter) => {
                if (sorter && !Array.isArray(sorter)) {
                  setSortConfig({
                    field: sorter.field as keyof TaskAttachment,
                    direction: sorter.order === 'ascend' ? 'asc' : 'desc',
                  });
                }
              }}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No hay archivos adjuntos"
            >
              {!readOnly && (
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => setShowUploadModal(true)}
                >
                  Subir primer archivo
                </Button>
              )}
            </Empty>
          )}
        </Spin>
      </Card>

      {/* Upload Modal */}
      <Modal
        title="Subir Archivos"
        open={showUploadModal}
        onCancel={() => setShowUploadModal(false)}
        footer={null}
        width={600}
      >
        <Dragger
          multiple
          beforeUpload={handleFileUpload}
          showUploadList={false}
          className="mb-4"
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Haz clic o arrastra archivos a esta área para subirlos
          </p>
          <p className="ant-upload-hint">
            Soporta archivos individuales o múltiples. Máximo 10MB por archivo.
          </p>
        </Dragger>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Confirmar eliminación"
        open={showDeleteModal}
        onOk={() => {
          selectedFiles.forEach((id) => {
            deleteMutation.mutate({ id, permanent: false });
          });
        }}
        onCancel={() => setShowDeleteModal(false)}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p>
          ¿Estás seguro de que quieres eliminar{' '}
          {selectedFiles.length === 1 ? 'este archivo' : `estos ${selectedFiles.length} archivos`}?
        </p>
        <p>
          <Text type="secondary">
            Esta acción no se puede deshacer. Los archivos se eliminarán permanentemente.
          </Text>
        </p>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title={previewFile?.originalFileName}
        open={showPreviewModal}
        onCancel={() => {
          setShowPreviewModal(false);
          setPreviewFile(null);
        }}
        footer={[
          <Button key="download" onClick={() => previewFile && handleDownload(previewFile)}>
            Descargar
          </Button>,
          <Button key="close" onClick={() => setShowPreviewModal(false)}>
            Cerrar
          </Button>,
        ]}
        width={800}
      >
        {previewFile && (
          <div>
            {renderAttachmentPreview(previewFile)}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TaskFileExplorer;