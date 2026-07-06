/**
 * @archivo: TaskAttachmentViewer.tsx
 * @módulo: Components (Task Attachments)
 * @función: Visualizador de archivos adjuntos de tareas con Google Drive integration
 * @crítico: SÍ - Sistema de visualización y descarga de archivos adjuntos
 * @dependencias: taskAttachmentsService, Modal components, Ant Design
 * @relacionado_con: taskAttachmentsService.ts, ResourceViewer.tsx (patrón base)
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Button,
  Space,
  Spin,
  message,
  Typography,
  Divider,
  Tag,
  Row,
  Col,
  Statistic,
  Tabs,
  Empty,
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  LinkOutlined,
  SettingOutlined,
  FileOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import taskAttachmentsService, {
  TaskAttachment,
  TaskAttachmentInfo,
} from '../../services/taskAttachmentsService';
import { useAuth } from '../../hooks/useAuth';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface TaskAttachmentViewerProps {
  attachmentId: string;
  visible: boolean;
  onClose: () => void;
  taskId?: string;
}

const TaskAttachmentViewer: React.FC<TaskAttachmentViewerProps> = ({
  attachmentId,
  visible,
  onClose,
  taskId,
}) => {
  const { user } = useAuth();
  const [attachment, setAttachment] = useState<TaskAttachment | null>(null);
  const [attachmentInfo, setAttachmentInfo] = useState<TaskAttachmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);

  useEffect(() => {
    if (visible && attachmentId) {
      loadAttachment();
      if (taskId) {
        loadTaskAttachments();
      }
    }
  }, [visible, attachmentId, taskId]);

  // Suppress known Google Drive CSP console errors (same pattern as ResourceViewer)
  useEffect(() => {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    const filterCSPErrors = (originalFunction: any) => (...args: any[]) => {
      const message = args[0]?.toString() || '';
      
      // Filter out known Google Drive CSP errors that don't affect functionality
      if (
        message.includes('Refused to frame') && 
        (message.includes('drive.google.com') || message.includes('accounts.google.com')) &&
        message.includes('frame-ancestors')
      ) {
        // These are expected CSP errors from Google Drive - they don't break functionality
        return;
      }
      
      // Allow all other console messages through
      originalFunction.apply(console, args);
    };

    // Override console methods only when TaskAttachmentViewer is visible
    if (visible) {
      console.error = filterCSPErrors(originalConsoleError);
      console.warn = filterCSPErrors(originalConsoleWarn);
    }

    // Cleanup: restore original console methods when component unmounts or becomes invisible
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, [visible]);

  const loadAttachment = async () => {
    setLoading(true);
    try {
      // Load attachment info for visualization decisions
      const info = await taskAttachmentsService.getAttachmentInfo(attachmentId);
      setAttachmentInfo(info);
      
      // If we have taskId, load the full attachment data from the task's attachments
      if (taskId) {
        const attachments = await taskAttachmentsService.getTaskAttachments(taskId);
        const currentAttachment = attachments.find(att => att.id === attachmentId);
        if (currentAttachment) {
          setAttachment(currentAttachment);
        }
      }
      
      console.log('✅ Task attachment loaded successfully:', attachmentId);
    } catch (error) {
      console.error('❌ Error loading task attachment:', error);
      message.error('Error al cargar el archivo adjunto');
    } finally {
      setLoading(false);
    }
  };

  const loadTaskAttachments = async () => {
    if (!taskId) return;
    
    try {
      const attachments = await taskAttachmentsService.getTaskAttachments(taskId);
      setTaskAttachments(attachments);
    } catch (error) {
      console.error('❌ Error loading task attachments:', error);
      // Don't show error message for this secondary operation
    }
  };

  const handleView = async () => {
    if (!attachmentInfo) return;
    
    try {
      await taskAttachmentsService.handleAttachmentView(
        attachmentId,
        attachmentInfo.originalName
      );
      message.success('Archivo abierto');
    } catch (error) {
      console.error('❌ Error viewing attachment:', error);
      message.error('Error al abrir el archivo');
    }
  };

  const handleDownload = async () => {
    if (!attachmentInfo) return;
    
    setDownloading(true);
    try {
      await taskAttachmentsService.handleAttachmentView(
        attachmentId,
        attachmentInfo.originalName
      );
      message.success('Descarga iniciada');
    } catch (error) {
      console.error('❌ Error downloading attachment:', error);
      message.error('Error al descargar el archivo');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenInDrive = () => {
    if (!attachmentInfo?.driveWebViewLink) return;
    window.open(attachmentInfo.driveWebViewLink, '_blank');
  };

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  const renderPreview = () => {
    if (!attachment && !attachmentInfo) return null;

    // Use attachment data if available, fallback to info
    const displayData = attachment || attachmentInfo;
    const mimeType = attachment?.mimeType || 'application/octet-stream';
    const fileIcon = attachment ? taskAttachmentsService.getFileIcon(attachment) : '📎';

    // Google Drive file ID from attachmentInfo
    const fileId = attachmentInfo?.driveWebViewLink?.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];

    // Determine file type for preview logic
    const isPDF = mimeType.includes('pdf');
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    const isDocument = mimeType.includes('word') || mimeType.includes('document') || 
                     mimeType.includes('excel') || mimeType.includes('spreadsheet') ||
                     mimeType.includes('powerpoint') || mimeType.includes('presentation');

    if (attachmentInfo?.isGoogleDrive && fileId) {
      // Google Drive file preview
      if (isPDF || isDocument) {
        return (
          <div className="space-y-4">
            {/* Primary: Direct Google Drive Viewer */}
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={`https://drive.google.com/file/d/${fileId}/preview`}
                width="100%"
                height="600px"
                title={attachmentInfo.originalName}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onLoad={() => {
                  console.log(`📄 Task attachment loaded successfully: ${attachmentInfo.originalName}`);
                }}
                onError={(e) => {
                  console.log('📄 Task attachment preview fallback - this is normal behavior');
                }}
              />
            </div>
            
            {/* Fallback options */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <Text type="secondary" className="block mb-2">
                Si no puedes ver el documento arriba, prueba estas opciones:
              </Text>
              <Space wrap>
                <Button
                  icon={<LinkOutlined />}
                  onClick={() => window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank')}
                >
                  Abrir en Google Drive
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                  loading={downloading}
                >
                  Descargar Archivo
                </Button>
              </Space>
            </div>
          </div>
        );
      }
      
      if (isImage) {
        // Google Drive image preview
        return (
          <div className="text-center">
            <img
              src={`https://drive.google.com/uc?id=${fileId}&export=view`}
              alt={attachmentInfo.originalName}
              style={{ maxWidth: '100%', height: 'auto' }}
              onError={(e) => {
                console.warn('❌ Direct Google Drive image failed, using fallback');
                // Fallback to Google Drive viewer
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        );
      }
      
      if (isVideo) {
        return (
          <div className="space-y-4">
            <div className="bg-gray-100 p-6 rounded-lg text-center">
              <Text type="secondary" className="block mb-4">
                Vista previa de video no disponible. Use las opciones a continuación:
              </Text>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<LinkOutlined />}
                  onClick={() => window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank')}
                >
                  Ver en Google Drive
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                  loading={downloading}
                >
                  Descargar Video
                </Button>
              </Space>
            </div>
          </div>
        );
      }
    }

    // Default preview for non-Google Drive files or unsupported types
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-6xl mb-4">{fileIcon}</div>
        <Text type="secondary" className="block">
          Vista previa no disponible para este tipo de archivo
        </Text>
        
        <Space direction="vertical" size="middle">
          {attachmentInfo?.isGoogleDrive && attachmentInfo.driveWebViewLink && (
            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={handleOpenInDrive}
              size="large"
            >
              Abrir en Google Drive
            </Button>
          )}
          
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            loading={downloading}
          >
            Descargar Archivo
          </Button>
        </Space>
        
        <div className="mt-4 text-xs text-gray-500">
          <Text type="secondary">
            Tipo: {mimeType} {attachment?.size && `• Tamaño: ${taskAttachmentsService.formatFileSize(attachment.size)}`}
          </Text>
        </div>
      </div>
    );
  };

  const renderTaskAttachmentsList = () => {
    if (!taskAttachments || taskAttachments.length === 0) {
      return (
        <Empty 
          description="No hay archivos adjuntos en esta tarea"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <div className="space-y-3">
        {taskAttachments.map((att) => (
          <div 
            key={att.id} 
            className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
              att.id === attachmentId ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => {
              if (att.id !== attachmentId) {
                // Switch to viewing this attachment
                window.location.hash = `#attachment-${att.id}`;
                // Note: In a real implementation, you'd update the attachmentId prop
                // This is a simplified example
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{taskAttachmentsService.getFileIcon(att)}</span>
                <div>
                  <div className="font-medium text-sm">{att.originalName}</div>
                  <div className="text-xs text-gray-500">
                    <Tag 
                      size="small" 
                      color={taskAttachmentsService.getAttachmentTypeColor(att.type)}
                    >
                      {taskAttachmentsService.getAttachmentTypeLabel(att.type)}
                    </Tag>
                    {att.size && (
                      <span className="ml-2">
                        {taskAttachmentsService.formatFileSize(att.size)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {att.id === attachmentId && (
                <Tag color="blue" size="small">Viewing</Tag>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space split={<Divider type="vertical" />}>
          <span>{attachmentInfo?.originalName || 'Archivo Adjunto'}</span>
          {attachment && (
            <Tag color={taskAttachmentsService.getAttachmentTypeColor(attachment.type)}>
              {taskAttachmentsService.getAttachmentTypeLabel(attachment.type)}
            </Tag>
          )}
          {attachmentInfo?.isGoogleDrive && (
            <Tag color="green" icon={<LinkOutlined />}>
              Google Drive
            </Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>,
        attachmentInfo?.driveWebViewLink && (
          <Button
            key="drive"
            icon={<LinkOutlined />}
            onClick={handleOpenInDrive}
          >
            Abrir en Drive
          </Button>
        ),
        <Button
          key="view"
          icon={<EyeOutlined />}
          onClick={handleView}
        >
          Ver Archivo
        </Button>,
        <Button
          key="download"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          loading={downloading}
        >
          Descargar
        </Button>,
      ]}
    >
      {loading ? (
        <div className="text-center py-8">
          <Spin size="large" />
        </div>
      ) : (attachmentInfo || attachment) ? (
        <Tabs defaultActiveKey="preview">
          <TabPane tab="Vista Previa" key="preview">
            {attachment && (
              <Row gutter={16} className="mb-4">
                <Col span={6}>
                  <Statistic
                    title="Descargas"
                    value={attachment.downloadCount || 0}
                    prefix={<DownloadOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Tamaño"
                    value={attachment.size ? taskAttachmentsService.formatFileSize(attachment.size) : 'N/A'}
                    prefix={<FileOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Subido"
                    value={attachment.uploadedAt ? new Date(attachment.uploadedAt).toLocaleDateString() : 'N/A'}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Tipo"
                    value={taskAttachmentsService.getAttachmentTypeLabel(attachment.type)}
                    prefix={<UserOutlined />}
                  />
                </Col>
              </Row>
            )}

            {/* Embedding info notice */}
            <div className="bg-blue-50 p-3 rounded mb-4">
              <Text type="secondary">
                <strong>🔧 Visualización de Archivos Adjuntos:</strong> El sistema usa integración con Google Drive 
                para archivos almacenados en la nube. Los errores CSP en consola ("Refused to frame") son normales 
                y no afectan la funcionalidad. Para archivos locales, use el botón de descarga.
              </Text>
            </div>

            <Divider />

            {attachment?.description && (
              <div className="mb-4">
                <Text strong>Descripción: </Text>
                <Paragraph>{attachment.description}</Paragraph>
              </div>
            )}

            <div className="mb-4">
              <Space size="middle" wrap>
                <span>
                  <Text strong>Tipo: </Text>
                  <Tag color={attachment ? taskAttachmentsService.getAttachmentTypeColor(attachment.type) : 'default'}>
                    {attachment ? taskAttachmentsService.getAttachmentTypeLabel(attachment.type) : 'Archivo'}
                  </Tag>
                </span>
                {attachmentInfo?.isGoogleDrive && (
                  <span>
                    <Text strong>Almacenamiento: </Text>
                    <Tag color="green">Google Drive</Tag>
                  </span>
                )}
                <span>
                  <Text strong>Estado: </Text>
                  <Tag color={attachment?.isActive ? 'green' : 'red'}>
                    {attachment?.isActive ? 'Activo' : 'Inactivo'}
                  </Tag>
                </span>
              </Space>
            </div>

            <Divider />

            <div className="attachment-preview">
              {renderPreview()}
            </div>
          </TabPane>

          {taskAttachments.length > 0 && (
            <TabPane tab={`Todos los Archivos (${taskAttachments.length})`} key="all-attachments">
              {renderTaskAttachmentsList()}
            </TabPane>
          )}
        </Tabs>
      ) : (
        <div className="text-center py-8">
          <Text type="secondary">No se pudo cargar el archivo adjunto</Text>
        </div>
      )}
    </Modal>
  );
};

export default TaskAttachmentViewer;