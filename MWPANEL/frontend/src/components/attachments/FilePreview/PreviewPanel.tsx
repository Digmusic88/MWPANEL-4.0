import React, { useState } from 'react';
import { Card, Button, Typography, Space, Tag, Avatar, Divider, Collapse, Badge } from 'antd';
import { 
  CloseOutlined, 
  DownloadOutlined, 
  ShareAltOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TagOutlined,
  CommentOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';

import { AttachmentItem, formatFileSize, canPreview } from '../common/types';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface PreviewPanelProps {
  file: AttachmentItem;
  onClose: () => void;
  onDownload?: (file: AttachmentItem) => void;
  onShare?: (file: AttachmentItem) => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  file,
  onClose,
  onDownload,
  onShare,
}) => {
  const [previewError, setPreviewError] = useState(false);

  const renderFilePreview = () => {
    if (!canPreview(file.mimeType)) {
      return (
        <div className="text-center py-8">
          <FileTextOutlined className="text-4xl text-gray-300 mb-4" />
          <p className="text-gray-500">Vista previa no disponible</p>
          <p className="text-gray-400 text-sm">Descarga el archivo para verlo</p>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="text-center py-8">
          <FileTextOutlined className="text-4xl text-red-300 mb-4" />
          <p className="text-red-500">Error al cargar la vista previa</p>
          <Button type="link" onClick={() => setPreviewError(false)}>
            Reintentar
          </Button>
        </div>
      );
    }

    // Image preview
    if (file.mimeType.startsWith('image/')) {
      return (
        <div className="text-center">
          <img
            src={file.webViewLink || file.downloadLink}
            alt={file.originalFileName}
            className="max-w-full h-auto rounded-lg shadow-sm"
            onError={() => setPreviewError(true)}
          />
        </div>
      );
    }

    // PDF preview
    if (file.mimeType === 'application/pdf') {
      return (
        <div className="w-full h-96">
          <iframe
            src={`${file.webViewLink || file.downloadLink}#view=FitH`}
            className="w-full h-full border rounded-lg"
            title={file.originalFileName}
            onError={() => setPreviewError(true)}
          />
        </div>
      );
    }

    // Video preview
    if (file.mimeType.startsWith('video/')) {
      return (
        <video
          controls
          className="w-full h-auto max-h-96 rounded-lg"
          onError={() => setPreviewError(true)}
        >
          <source src={file.downloadLink} type={file.mimeType} />
          Tu navegador no soporta la reproducción de video.
        </video>
      );
    }

    // Audio preview
    if (file.mimeType.startsWith('audio/')) {
      return (
        <div className="text-center py-8">
          <audio
            controls
            className="w-full max-w-md"
            onError={() => setPreviewError(true)}
          >
            <source src={file.downloadLink} type={file.mimeType} />
            Tu navegador no soporta la reproducción de audio.
          </audio>
        </div>
      );
    }

    return null;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col bg-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Title level={5} className="mb-0 truncate flex-1 mr-4">
          {file.originalFileName}
        </Title>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          size="small"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* File preview */}
        <div className="p-4">
          <Card className="mb-4">
            {renderFilePreview()}
          </Card>

          {/* File info */}
          <Card title="Información del archivo" size="small" className="mb-4">
            <Space direction="vertical" className="w-full">
              <div className="flex justify-between">
                <Text strong>Tamaño:</Text>
                <Text>{formatFileSize(file.fileSize)}</Text>
              </div>
              
              <div className="flex justify-between">
                <Text strong>Tipo:</Text>
                <Text>{file.mimeType}</Text>
              </div>
              
              <div className="flex justify-between">
                <Text strong>Versión:</Text>
                <Text>v{file.currentVersion}</Text>
              </div>

              <div className="flex justify-between items-center">
                <Text strong>Subido por:</Text>
                <div className="flex items-center">
                  <Avatar size={20} icon={<UserOutlined />} className="mr-2" />
                  <Text>{file.uploadedBy?.name || 'Usuario desconocido'}</Text>
                </div>
              </div>

              <div className="flex justify-between">
                <Text strong>Fecha:</Text>
                <Text>{formatDate(file.createdAt)}</Text>
              </div>

              {/* File type badges */}
              <div className="pt-2">
                <Space wrap>
                  {file.metadata?.isStudentSubmission && (
                    <Tag color="blue" icon={<UserOutlined />}>Entrega de estudiante</Tag>
                  )}
                  {file.metadata?.isTeacherMaterial && (
                    <Tag color="green" icon={<FileTextOutlined />}>Material del profesor</Tag>
                  )}
                  {file.metadata?.isEvaluated && (
                    <Tag color="orange">Evaluado</Tag>
                  )}
                </Space>
              </div>
            </Space>
          </Card>

          {/* Description */}
          {file.metadata?.description && (
            <Card title="Descripción" size="small" className="mb-4">
              <Paragraph>{file.metadata.description}</Paragraph>
            </Card>
          )}

          {/* Tags */}
          {file.metadata?.tags && file.metadata.tags.length > 0 && (
            <Card title="Etiquetas" size="small" className="mb-4">
              <Space wrap>
                {file.metadata.tags.map((tag, index) => (
                  <Tag key={index} icon={<TagOutlined />}>
                    {tag}
                  </Tag>
                ))}
              </Space>
            </Card>
          )}

          {/* Advanced details */}
          <Collapse size="small" ghost>
            {/* Versions */}
            {file.versions && file.versions.length > 0 && (
              <Panel
                header={
                  <span>
                    <HistoryOutlined className="mr-2" />
                    Historial de versiones
                    <Badge count={file.versions.length} className="ml-2" />
                  </span>
                }
                key="versions"
              >
                <Space direction="vertical" className="w-full">
                  {file.versions.map((version, index) => (
                    <Card key={version.id} size="small">
                      <div className="flex justify-between items-start">
                        <div>
                          <Text strong>Versión {version.versionNumber}</Text>
                          {version.changeDescription && (
                            <div className="text-sm text-gray-600 mt-1">
                              {version.changeDescription}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDate(version.createdAt)} • {version.uploadedBy?.name}
                          </div>
                        </div>
                        <Text className="text-sm">{formatFileSize(version.fileSize)}</Text>
                      </div>
                    </Card>
                  ))}
                </Space>
              </Panel>
            )}

            {/* Comments */}
            {file.comments && file.comments.length > 0 && (
              <Panel
                header={
                  <span>
                    <CommentOutlined className="mr-2" />
                    Comentarios
                    <Badge count={file.comments.length} className="ml-2" />
                  </span>
                }
                key="comments"
              >
                <Space direction="vertical" className="w-full">
                  {file.comments.map((comment, index) => (
                    <Card key={comment.id} size="small">
                      <div className="flex items-start space-x-3">
                        <Avatar size={32} icon={<UserOutlined />} />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Text strong className="text-sm">
                              {comment.user?.name || 'Usuario'}
                            </Text>
                            <Text className="text-xs text-gray-400">
                              {formatDate(comment.createdAt)}
                            </Text>
                            {comment.isEdited && (
                              <Tag size="small">Editado</Tag>
                            )}
                          </div>
                          <Paragraph className="text-sm mb-0">
                            {comment.content}
                          </Paragraph>
                        </div>
                      </div>
                    </Card>
                  ))}
                </Space>
              </Panel>
            )}
          </Collapse>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t p-4">
        <Space className="w-full justify-center">
          {onDownload && (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => onDownload(file)}
            >
              Descargar
            </Button>
          )}
          {onShare && (
            <Button
              icon={<ShareAltOutlined />}
              onClick={() => onShare(file)}
            >
              Compartir
            </Button>
          )}
        </Space>
      </div>
    </motion.div>
  );
};

export default PreviewPanel;