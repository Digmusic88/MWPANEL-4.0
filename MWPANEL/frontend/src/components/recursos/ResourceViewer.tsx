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
  Form,
  Input,
  Select,
  Switch,
  Alert,
} from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  HeartOutlined,
  HeartFilled,
  ShareAltOutlined,
  LinkOutlined,
  GlobalOutlined,
  UserAddOutlined,
  SettingOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import educationalResourcesService, {
  EducationalResource,
} from '../../services/educationalResourcesService';
import { SimpleAssignmentModal } from './SimpleAssignmentModal';
import ResourceAssignments from './ResourceAssignments';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/apiClient';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface ResourceViewerProps {
  resourceId: string;
  visible: boolean;
  onClose: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
  onResourceUpdated?: () => void; // Callback cuando se actualiza el recurso
}

const ResourceViewer: React.FC<ResourceViewerProps> = ({
  resourceId,
  visible,
  onClose,
  onEdit,
  canEdit = false,
  onResourceUpdated,
}) => {
  const { user } = useAuth();
  const [resource, setResource] = useState<EducationalResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showSimpleAssignmentModal, setShowSimpleAssignmentModal] = useState(false);
  const [settingPublic, setSettingPublic] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();

  useEffect(() => {
    if (visible && resourceId) {
      loadResource();
    }
  }, [visible, resourceId]);

  // Suppress known Google Drive CSP console errors
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

    // Override console methods only when ResourceViewer is visible
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

  const loadResource = async () => {
    setLoading(true);
    setIframeBlocked(false);
    try {
      const data = await educationalResourcesService.getResource(resourceId);
      setResource(data);
      setIsFavorite(data.isFavorite || false);
      
      // Record view
      await educationalResourcesService.recordView(resourceId);
    } catch (error) {
      console.error('Error loading resource:', error);
      message.error('Error al cargar el recurso');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resource) return;
    
    setDownloading(true);
    try {
      const blob = await educationalResourcesService.downloadResource(resource.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resource.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Descarga iniciada');
    } catch (error) {
      console.error('Error downloading resource:', error);
      message.error('Error al descargar el recurso');
    } finally {
      setDownloading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!resource) return;
    
    try {
      const result = await educationalResourcesService.toggleFavorite(resource.id);
      setIsFavorite(result.isFavorite);
      message.success(
        result.isFavorite
          ? 'Añadido a favoritos'
          : 'Eliminado de favoritos'
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      message.error('Error al actualizar favoritos');
    }
  };

  const handleShare = () => {
    if (!resource?.webViewLink) return;
    
    navigator.clipboard.writeText(resource.webViewLink);
    message.success('Enlace copiado al portapapeles');
  };

  const handleOpenInDrive = () => {
    if (!resource?.webViewLink) return;
    window.open(resource.webViewLink, '_blank');
  };

  const handleAssignmentSuccess = () => {
    loadResource(); // Reload to get updated assignments
  };

  const handleSimpleAssignment = async (assignmentData: any) => {
    try {
      // Use the existing assign endpoint
      const payload = {
        classGroupId: assignmentData.assignmentType === 'class' ? assignmentData.targetIds?.[0] || assignmentData.targetId : undefined,
        classGroupIds: assignmentData.assignmentType === 'class' ? assignmentData.targetIds : undefined,
        studentId: assignmentData.assignmentType === 'individual' ? assignmentData.targetIds?.[0] || assignmentData.targetId : undefined,
        studentIds: assignmentData.assignmentType === 'individual' ? assignmentData.targetIds : undefined,
        instructions: assignmentData.instructions,
        dueDate: assignmentData.dueDate
      };
      
      const response = await api.post(`/recursos/${assignmentData.resourceId}/assign`, payload);
      if (response.data) {
        message.success('Recurso asignado correctamente');
        handleAssignmentSuccess();
        setShowSimpleAssignmentModal(false);
      }
    } catch (error) {
      console.error('Error assigning resource:', error);
      throw error; // Let the modal handle the error
    }
  };

  const handleSetPublicPermissions = async () => {
    if (!resource || !isTeacherOrAdmin) return;
    
    setSettingPublic(true);
    try {
      const response = await api.post(`/recursos/resource/${resource.id}/set-public`);
      if (response.data.data.success) {
        message.success('Permisos públicos configurados. El archivo debería ser visible ahora.');
        // Reload resource to get updated status
        loadResource();
      } else {
        message.warning('No se pudieron configurar los permisos públicos automáticamente.');
      }
    } catch (error) {
      console.error('Error setting public permissions:', error);
      message.error('Error al configurar permisos públicos');
    } finally {
      setSettingPublic(false);
    }
  };

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  // Helper para obtener el nombre completo del autor
  const getAuthorName = (resource: EducationalResource | null): string => {
    if (!resource?.author) return 'Sin autor';

    // Intentar obtener nombre del perfil
    const profile = resource.author.profile;
    if (profile?.firstName || profile?.lastName) {
      return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    }

    // Fallback al email sin el dominio
    if (resource.author.email) {
      return resource.author.email.split('@')[0];
    }

    return 'Sin autor';
  };

  // Función para abrir el modo de edición
  const handleStartEdit = () => {
    if (!resource) return;

    // Convert tags to string for form input (handles both array and string formats)
    let tagsString = '';
    if (resource.tags) {
      if (Array.isArray(resource.tags)) {
        tagsString = resource.tags.join(', ');
      } else if (typeof resource.tags === 'string') {
        tagsString = resource.tags;
      }
    }

    // Preparar los valores del formulario
    editForm.setFieldsValue({
      title: resource.title,
      description: resource.description || '',
      gradeLevel: resource.gradeLevel,
      tags: tagsString,
      isPublic: resource.isPublic,
    });

    setIsEditing(true);
  };

  // Función para cancelar edición
  const handleCancelEdit = () => {
    setIsEditing(false);
    editForm.resetFields();
  };

  // Función para guardar los cambios
  const handleSaveEdit = async () => {
    if (!resource) return;

    try {
      const values = await editForm.validateFields();
      setEditLoading(true);

      // Convert tags string to array (backend expects string[])
      const tagsArray = values.tags
        ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [];

      await educationalResourcesService.updateResource(resource.id, {
        title: values.title,
        description: values.description,
        gradeLevel: values.gradeLevel,
        tags: tagsArray,
        isPublic: values.isPublic,
      });

      message.success('Recurso actualizado correctamente');
      setIsEditing(false);

      // Recargar el recurso para mostrar los cambios
      await loadResource();

      // Notificar al padre si hay callback
      if (onResourceUpdated) {
        onResourceUpdated();
      }
    } catch (error: any) {
      console.error('Error updating resource:', error);
      message.error(error?.response?.data?.message || 'Error al actualizar el recurso');
    } finally {
      setEditLoading(false);
    }
  };

  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const renderPreview = () => {
    if (!resource) return null;

    // Google Drive file ID from webViewLink or downloadLink
    const fileId = resource.driveFileId || resource.webViewLink?.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];

    switch (resource.type) {
      case 'PDF':
        return (
          <div className="space-y-4">
            {/* Primary: Direct Google Drive Viewer */}
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={`https://drive.google.com/file/d/${fileId}/preview`}
                width="100%"
                height="600px"
                title={resource.title}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onLoad={() => {
                  // Suppress CSP console errors - they are expected with Google Drive embedding
                  console.log(`PDF loaded successfully: ${resource.title}`);
                }}
                onError={(e) => {
                  console.log('PDF preview fallback - this is normal behavior');
                  // CSP errors are expected and don't affect functionality
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
                  Descargar PDF
                </Button>
                {isTeacherOrAdmin && (
                  <Button
                    icon={<SettingOutlined />}
                    onClick={handleSetPublicPermissions}
                    loading={settingPublic}
                    type="dashed"
                  >
                    Reparar Permisos
                  </Button>
                )}
              </Space>
            </div>
          </div>
        );
      
      case 'IMAGE':
        // Use MW Panel API endpoint for reliable image preview
        return (
          <div className="text-center">
            <img
              src={resource.downloadLink || resource.driveLink}
              alt={resource.title}
              style={{ maxWidth: '100%', height: 'auto' }}
              onError={(e) => {
                // Show placeholder if image fails to load
                e.currentTarget.style.display = 'none';
                const placeholder = e.currentTarget.parentNode?.querySelector('.image-placeholder');
                if (placeholder) {
                  placeholder.style.display = 'block';
                }
              }}
            />
            <div className="image-placeholder bg-gray-100 p-6 rounded-lg" style={{ display: 'none' }}>
              <div className="text-6xl mb-4">🖼️</div>
              <Text type="secondary">Imagen no disponible</Text>
              <div className="mt-4">
                <Button 
                  type="primary" 
                  href={resource.downloadLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Descargar Imagen
                </Button>
              </div>
            </div>
          </div>
        );
      
      case 'VIDEO':
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
      
      case 'INTERACTIVE_HTML':
        return (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={`https://drive.google.com/file/d/${fileId}/preview`}
                width="100%"
                height="600px"
                title={resource.title}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onLoad={() => {
                  console.log(`HTML content loaded: ${resource.title}`);
                }}
                onError={() => {
                  console.log('HTML preview using fallback - normal behavior');
                }}
              />
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <Text type="secondary">
                <strong>Nota:</strong> Los archivos HTML interactivos se muestran en modo seguro. 
                Los errores CSP en consola son normales. Para funcionalidad completa, descarga el archivo.
              </Text>
            </div>
          </div>
        );
      
      case 'LINK':
        return resource.externalUrl ? (
          <div>
            {/* Preview panel */}
            <div style={{ marginBottom: 16 }}>
              {resource.previewImage && (
                <img
                  src={resource.previewImage}
                  alt="preview"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <Space direction="vertical" style={{ width: '100%' }}>
                {resource.previewDescription && (
                  <Text type="secondary">{resource.previewDescription}</Text>
                )}
                <Space>
                  <GlobalOutlined style={{ color: '#888' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>{getDomain(resource.externalUrl)}</Text>
                </Space>
                <Button
                  type="primary"
                  icon={<LinkOutlined />}
                  onClick={() => window.open(resource.externalUrl, '_blank', 'noopener,noreferrer')}
                >
                  Abrir en nueva pestaña
                </Button>
              </Space>
            </div>

            <Divider />

            {/* Embedded iframe or blocked notice */}
            {iframeBlocked ? (
              <Alert
                type="warning"
                message="Este sitio no permite mostrarse en la plataforma"
                description="Haz clic en 'Abrir en nueva pestaña' para ver el contenido."
                showIcon
              />
            ) : (
              <iframe
                src={resource.externalUrl}
                title={resource.title}
                style={{ width: '100%', height: 500, border: 'none', borderRadius: 8 }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onError={() => setIframeBlocked(true)}
              />
            )}
          </div>
        ) : null;

      default:
        return (
          <div className="text-center py-8 space-y-4">
            <Text type="secondary" className="block">
              Vista previa no disponible para este tipo de archivo
            </Text>
            
            <Space direction="vertical" size="middle">
              <Button
                type="primary"
                icon={<LinkOutlined />}
                onClick={() => window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank')}
                size="large"
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
            
            <div className="mt-4 text-xs text-gray-500">
              <Text type="secondary">
                Tipo: {resource.type} • Tamaño: {(parseInt(resource.fileSize) / 1024 / 1024).toFixed(2)} MB
              </Text>
            </div>
          </div>
        );
    }
  };

  return (
    <Modal
      title={
        <Space split={<Divider type="vertical" />}>
          <span>{resource?.title}</span>
          {resource && (
            <Tag color="blue">{resource.type}</Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={
        isEditing ? [
          <Button key="cancel" icon={<CloseOutlined />} onClick={handleCancelEdit}>
            Cancelar
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveEdit}
            loading={editLoading}
          >
            Guardar Cambios
          </Button>,
        ] : [
          <Button key="close" onClick={onClose}>
            Cerrar
          </Button>,
          canEdit && (
            <Button key="edit" icon={<EditOutlined />} onClick={handleStartEdit}>
              Editar
            </Button>
          ),
          isTeacherOrAdmin && (
            <Button
              key="assign"
              icon={<UserAddOutlined />}
              onClick={() => setShowSimpleAssignmentModal(true)}
            >
              Asignar
            </Button>
          ),
          <Button
            key="favorite"
            icon={isFavorite ? <HeartFilled /> : <HeartOutlined />}
            onClick={handleToggleFavorite}
          >
            {isFavorite ? 'En Favoritos' : 'Añadir a Favoritos'}
          </Button>,
          <Button
            key="share"
            icon={<ShareAltOutlined />}
            onClick={handleShare}
          >
            Compartir
          </Button>,
          <Button
            key="drive"
            icon={<LinkOutlined />}
            onClick={handleOpenInDrive}
          >
            Abrir en Drive
          </Button>,
          resource?.type !== 'LINK' && (
            <Button
              key="download"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              loading={downloading}
            >
              Descargar
            </Button>
          ),
        ]
      }
    >
      {loading ? (
        <div className="text-center py-8">
          <Spin size="large" />
        </div>
      ) : resource ? (
        isEditing ? (
          // ========== MODO EDICIÓN ==========
          <div className="p-4">
            <div className="bg-blue-50 p-3 rounded mb-4">
              <Text>
                <EditOutlined className="mr-2" />
                <strong>Modo Edición:</strong> Modifica la información del recurso y haz clic en "Guardar Cambios".
              </Text>
            </div>

            <Form form={editForm} layout="vertical">
              <Form.Item
                name="title"
                label="Título"
                rules={[{ required: true, message: 'El título es obligatorio' }]}
              >
                <Input placeholder="Título del recurso" />
              </Form.Item>

              <Form.Item
                name="description"
                label="Descripción"
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Descripción del recurso"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="gradeLevel"
                    label="Curso/Nivel"
                  >
                    <Input placeholder="Ej: 1º Primaria, 2º ESO" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="isPublic"
                    label="Recurso Público"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="Público" unCheckedChildren="Privado" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="tags"
                label="Etiquetas"
                help="Separa las etiquetas con comas"
              >
                <Input placeholder="Ej: matemáticas, fracciones, ejercicios" />
              </Form.Item>

              <Divider />

              <div className="bg-gray-50 p-3 rounded">
                <Text type="secondary">
                  <strong>Información no editable:</strong>
                </Text>
                <div className="mt-2 space-y-1">
                  <div><Text type="secondary">Tipo de archivo:</Text> <Tag>{resource.type}</Tag></div>
                  <div><Text type="secondary">Asignatura:</Text> <Tag>{resource.subject?.name || 'Sin asignatura'}</Tag></div>
                  <div><Text type="secondary">Nivel educativo:</Text> <Tag>{resource.educationalLevel?.name || 'Sin nivel'}</Tag></div>
                  <div><Text type="secondary">Autor:</Text> <Tag>{getAuthorName(resource)}</Tag></div>
                  <div><Text type="secondary">Tamaño:</Text> {(parseInt(resource.fileSize.toString()) / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
            </Form>
          </div>
        ) : (
        // ========== MODO VISTA NORMAL ==========
        <Tabs defaultActiveKey="preview">
          <TabPane tab="Vista Previa" key="preview">
            <Row gutter={16} className="mb-4">
              <Col span={6}>
                <Statistic
                  title="Vistas"
                  value={resource.views}
                  prefix={<EyeOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Descargas"
                  value={resource.downloads}
                  prefix={<DownloadOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Tamaño"
                  value={(parseInt(resource.fileSize) / 1024 / 1024).toFixed(2)}
                  suffix="MB"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Creado"
                  value={new Date(resource.createdAt).toLocaleDateString()}
                />
              </Col>
            </Row>

            {/* Embedding info notice */}
            <div className="bg-blue-50 p-3 rounded mb-4">
              <Text type="secondary">
                <strong>🔧 Visualización Mejorada:</strong> El sistema usa enlaces directos de Google Drive. 
                Los errores CSP en consola ("Refused to frame") son normales y no afectan la funcionalidad - 
                son políticas de seguridad de Google Drive. Si hay problemas de visualización, usa "Reparar Permisos" 
                o abre el archivo directamente en Google Drive.
              </Text>
            </div>

            <Divider />

            <div className="mb-4">
              <Text strong>Descripción: </Text>
              <Paragraph>{resource.description || 'Sin descripción'}</Paragraph>
            </div>

            <div className="mb-4">
              <Space size="middle" wrap>
                <span>
                  <Text strong>Asignatura: </Text>
                  <Tag>{String(resource.subject?.name || 'Sin asignatura')}</Tag>
                </span>
                <span>
                  <Text strong>Nivel: </Text>
                  <Tag>{String(resource.educationalLevel?.name || 'Sin nivel')}</Tag>
                </span>
                <span>
                  <Text strong>Curso: </Text>
                  <Tag>{String(resource.gradeLevel || 'Sin curso')}</Tag>
                </span>
                <span>
                  <Text strong>Autor: </Text>
                  <Tag>{getAuthorName(resource)}</Tag>
                </span>
              </Space>
            </div>

            {(() => {
              // FIXED: Parse tags from comma-separated string to array
              let tags = [];
              try {
                if (typeof resource.tags === 'string' && resource.tags.trim()) {
                  tags = resource.tags.split(',').map(tag => tag.trim()).filter(Boolean);
                } else if (Array.isArray(resource.tags)) {
                  tags = resource.tags;
                }
              } catch (e) {
                console.warn('Error parsing tags in ResourceViewer:', e);
                tags = [];
              }
              
              return tags && tags.length > 0 ? (
                <div className="mb-4">
                  <Text strong>Etiquetas: </Text>
                  <Space wrap>
                    {tags.map((tag) => (
                      <Tag key={tag} color="geekblue">
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                </div>
              ) : null;
            })()}

            <Divider />

            <div className="resource-preview">
              {renderPreview()}
            </div>
          </TabPane>

          {isTeacherOrAdmin && (
            <TabPane tab="Asignaciones" key="assignments">
              <ResourceAssignments
                resource={resource}
                onAssignmentsChange={handleAssignmentSuccess}
              />
            </TabPane>
          )}
        </Tabs>
        )
      ) : (
        <div className="text-center py-8">
          <Text type="secondary">No se pudo cargar el recurso</Text>
        </div>
      )}

      {/* Simple Assignment Modal */}
      {resource && (
        <SimpleAssignmentModal
          visible={showSimpleAssignmentModal}
          resource={resource}
          onAssign={handleSimpleAssignment}
          onCancel={() => setShowSimpleAssignmentModal(false)}
        />
      )}
    </Modal>
  );
};

export default ResourceViewer;