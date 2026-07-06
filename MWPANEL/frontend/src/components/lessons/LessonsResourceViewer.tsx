import React, { useState } from 'react';
import {
  Modal,
  Button,
  Space,
  Typography,
  Divider,
  Tag,
  Row,
  Col,
  Statistic,
  Tabs,
  Alert,
  Card,
  message
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  ShareAltOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  YoutubeOutlined,
  CodeOutlined,
  BarChartOutlined,
  FileOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import TsxArtifactViewer from './TsxArtifactViewer';
import type { LessonResource, LessonsResourcePreviewProps } from '../../types/lessons';
import { lessonsUtils } from '../../services/lessonsApi';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const LessonsResourceViewer: React.FC<LessonsResourcePreviewProps> = ({
  resource,
  visible,
  onClose,
  onEdit,
  onShare
}) => {
  const [activeTab, setActiveTab] = useState('preview');

  const getResourceIcon = (type: string) => {
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

  const getResourceColor = (type: string) => {
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/lessons/resource/${resource.id}`;
    navigator.clipboard.writeText(shareUrl);
    message.success('Enlace copiado al portapapeles');
    onShare?.(resource);
  };

  const handleOpenExternal = () => {
    switch (resource.type) {
      case 'YOUTUBE_LINK':
        if (resource.youtubeUrl) {
          window.open(resource.youtubeUrl, '_blank');
        }
        break;
      case 'WEB_LINK':
        if (resource.webUrl) {
          window.open(resource.webUrl, '_blank');
        }
        break;
      case 'FILE':
        if (resource.driveFileId) {
          window.open(`https://drive.google.com/file/d/${resource.driveFileId}/view`, '_blank');
        }
        break;
      case 'PRESENTATION':
        if (resource.driveFileId) {
          window.open(`https://drive.google.com/file/d/${resource.driveFileId}/view`, '_blank');
        }
        break;
    }
  };

  const renderPreview = () => {
    switch (resource.type) {
      case 'TSX_ARTIFACT':
        return (
          <div className="h-full">
            <TsxArtifactViewer
              resource={resource}
              editing={false}
            />
          </div>
        );

      case 'YOUTUBE_LINK':
        if (resource.youtubeVideoId) {
          return (
            <div className="space-y-4">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${resource.youtubeVideoId}`}
                  title={resource.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              {resource.youtubeTitle && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <Text strong className="text-red-700">
                    📺 {resource.youtubeTitle}
                  </Text>
                  {resource.youtubeDuration && (
                    <Text className="text-gray-500 ml-2">
                      • Duración: {lessonsUtils.formatDuration(resource.youtubeDuration)}
                    </Text>
                  )}
                </div>
              )}
            </div>
          );
        }
        break;

      case 'WEB_LINK':
        return (
          <div className="space-y-4">
            <Alert
              type="info"
              showIcon
              message="Enlace Web"
              description={
                <div>
                  <Text>Haz clic en el botón para abrir el enlace en una nueva ventana</Text>
                  {resource.webTitle && (
                    <div className="mt-2">
                      <Text strong>Título: </Text>
                      <Text>{resource.webTitle}</Text>
                    </div>
                  )}
                  {resource.webDescription && (
                    <div className="mt-1">
                      <Text strong>Descripción: </Text>
                      <Text>{resource.webDescription}</Text>
                    </div>
                  )}
                </div>
              }
            />
            
            <Card className="text-center p-8">
              <LinkOutlined className="text-4xl text-blue-500 mb-4" />
              <Title level={4}>Enlace Web</Title>
              <Text type="secondary" className="block mb-4">
                {resource.webUrl}
              </Text>
              <Button 
                type="primary" 
                size="large"
                icon={<LinkOutlined />}
                onClick={handleOpenExternal}
              >
                Abrir Enlace
              </Button>
            </Card>
          </div>
        );

      case 'FILE':
        if (resource.driveFileId) {
          return (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={`https://drive.google.com/file/d/${resource.driveFileId}/preview`}
                  width="100%"
                  height="600px"
                  title={resource.name}
                  className="border-0"
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <Text type="secondary" className="block mb-2">
                  Si no puedes ver el archivo arriba, prueba estas opciones:
                </Text>
                <Space wrap>
                  <Button
                    icon={<LinkOutlined />}
                    onClick={handleOpenExternal}
                  >
                    Abrir en Google Drive
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => message.info('Función de descarga pendiente de implementar')}
                  >
                    Descargar
                  </Button>
                </Space>
              </div>
            </div>
          );
        }
        break;

      case 'PRESENTATION':
        if (resource.driveFileId) {
          return (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={`https://docs.google.com/presentation/d/${resource.driveFileId}/embed?start=false&loop=false&delayms=3000`}
                  width="100%"
                  height="600px"
                  title={resource.name}
                  className="border-0"
                  allowFullScreen
                />
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <Space wrap>
                  <Button
                    icon={<LinkOutlined />}
                    onClick={handleOpenExternal}
                  >
                    Abrir en Google Slides
                  </Button>
                  {resource.slideCount && (
                    <Tag color="orange">
                      {resource.slideCount} diapositivas
                    </Tag>
                  )}
                </Space>
              </div>
            </div>
          );
        }
        break;

      case 'INTERNAL_DOC':
        return (
          <div className="space-y-4">
            <Card>
              <div
                dangerouslySetInnerHTML={{ __html: resource.htmlContent || '' }}
                className="prose max-w-none"
              />
            </Card>
            
            {resource.plainTextContent && (
              <details className="bg-gray-50 p-4 rounded-lg">
                <summary className="cursor-pointer font-medium mb-2">
                  Ver contenido como texto plano
                </summary>
                <pre className="whitespace-pre-wrap text-sm">
                  {resource.plainTextContent}
                </pre>
              </details>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <div style={{ color: getResourceColor(resource.type), fontSize: '64px' }}>
              {getResourceIcon(resource.type)}
            </div>
            <Title level={4} className="mt-4">
              {lessonsUtils.getResourceTypeDisplayName(resource.type)}
            </Title>
            <Text type="secondary">
              Vista previa no disponible para este tipo de recurso
            </Text>
            <div className="mt-4">
              <Button 
                type="primary"
                icon={<LinkOutlined />}
                onClick={handleOpenExternal}
              >
                Abrir Recurso
              </Button>
            </div>
          </div>
        );
    }

    return (
      <div className="text-center py-12">
        <Text type="secondary">No se puede mostrar vista previa</Text>
      </div>
    );
  };

  return (
    <Modal
      title={
        <div className="flex items-center space-x-3">
          <div style={{ color: getResourceColor(resource.type), fontSize: '24px' }}>
            {getResourceIcon(resource.type)}
          </div>
          <div>
            <Title level={4} className="mb-0">
              {resource.name}
            </Title>
            <div className="flex items-center space-x-2">
              <Tag color={getResourceColor(resource.type)}>
                {lessonsUtils.getResourceTypeDisplayName(resource.type)}
              </Tag>
              <Tag color={lessonsUtils.getVisibilityColor(resource.visibility)}>
                {lessonsUtils.getVisibilityDisplayName(resource.visibility)}
              </Tag>
              {!resource.isActive && (
                <Tag color="red">Inactivo</Tag>
              )}
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={resource.type === 'TSX_ARTIFACT' ? 1200 : 900}
      footer={[
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>,
        <Button
          key="share"
          icon={<ShareAltOutlined />}
          onClick={handleShare}
        >
          Compartir
        </Button>,
        resource.type !== 'TSX_ARTIFACT' && resource.type !== 'INTERNAL_DOC' && (
          <Button
            key="external"
            icon={<LinkOutlined />}
            onClick={handleOpenExternal}
          >
            Abrir Externo
          </Button>
        ),
        onEdit && (
          <Button
            key="edit"
            type="primary"
            onClick={() => onEdit(resource)}
          >
            Editar
          </Button>
        ),
      ].filter(Boolean)}
      className="lessons-resource-viewer"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Vista Previa" key="preview">
            {/* Resource Stats */}
            <Row gutter={16} className="mb-4">
              <Col span={6}>
                <Statistic
                  title="Vistas"
                  value={resource.stats?.viewCount || 0}
                  prefix={<EyeOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Descargas"
                  value={resource.stats?.downloadCount || 0}
                  prefix={<DownloadOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Orden"
                  value={resource.orderIndex}
                  prefix={<Text>#</Text>}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Creado"
                  value={formatDate(resource.createdAt)}
                  valueStyle={{ fontSize: '12px' }}
                />
              </Col>
            </Row>

            <Divider />

            {/* Resource Details */}
            <div className="mb-4">
              {resource.description && (
                <div className="mb-3">
                  <Text strong>Descripción: </Text>
                  <Paragraph>{resource.description}</Paragraph>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                {resource.originalFileName && (
                  <div>
                    <Text strong>Archivo original: </Text>
                    <Text code>{resource.originalFileName}</Text>
                  </div>
                )}
                
                {resource.fileSize && (
                  <div>
                    <Text strong>Tamaño: </Text>
                    <Text>{formatFileSize(resource.fileSize)}</Text>
                  </div>
                )}

                {resource.mimeType && (
                  <div>
                    <Text strong>Tipo MIME: </Text>
                    <Text code>{resource.mimeType}</Text>
                  </div>
                )}

                {resource.createdBy && (
                  <div>
                    <Text strong>Creado por: </Text>
                    <Text>{resource.createdBy.name}</Text>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {resource.tags && resource.tags.length > 0 && (
              <div className="mb-4">
                <Text strong>Etiquetas: </Text>
                <Space wrap>
                  {resource.tags.map((tag, index) => (
                    <Tag key={index} color="blue">
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            <Divider />

            {/* Preview Content */}
            <div className="resource-preview">
              {renderPreview()}
            </div>
          </TabPane>

          <TabPane tab="Detalles Técnicos" key="details">
            <div className="space-y-4">
              <Card title="Información del Recurso" size="small">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text strong>ID: </Text>
                    <Text code>{resource.id}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Tipo: </Text>
                    <Tag color={getResourceColor(resource.type)}>
                      {resource.type}
                    </Tag>
                  </Col>
                  <Col span={12}>
                    <Text strong>Visibilidad: </Text>
                    <Tag color={lessonsUtils.getVisibilityColor(resource.visibility)}>
                      {resource.visibility}
                    </Tag>
                  </Col>
                  <Col span={12}>
                    <Text strong>Estado: </Text>
                    <Tag color={resource.isActive ? 'green' : 'red'}>
                      {resource.isActive ? 'Activo' : 'Inactivo'}
                    </Tag>
                  </Col>
                </Row>
              </Card>

              {/* Type-specific details */}
              {resource.type === 'TSX_ARTIFACT' && (
                <Card title="Configuración TSX" size="small">
                  <div className="space-y-2">
                    {resource.dependencies && resource.dependencies.length > 0 && (
                      <div>
                        <Text strong>Dependencias: </Text>
                        <Space wrap>
                          {resource.dependencies.map((dep, index) => (
                            <Tag key={index} color="purple">{dep}</Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                    
                    {resource.sandboxConfig && (
                      <div>
                        <Text strong>Configuración del Sandbox: </Text>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(resource.sandboxConfig, null, 2)}
                        </pre>
                      </div>
                    )}

                    {resource.componentProps && (
                      <div>
                        <Text strong>Props del Componente: </Text>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(resource.componentProps, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Timestamps */}
              <Card title="Fechas" size="small">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text strong>Creado: </Text>
                    <Text>{formatDate(resource.createdAt)}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Actualizado: </Text>
                    <Text>{formatDate(resource.updatedAt)}</Text>
                  </Col>
                </Row>
              </Card>
            </div>
          </TabPane>
        </Tabs>
      </motion.div>
    </Modal>
  );
};

export default LessonsResourceViewer;