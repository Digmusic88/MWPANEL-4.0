/**
 * @archivo: ResourceCard.tsx
 * @módulo: Recursos Educativos (Card Individual de Recurso)
 * @función: Card visual completo para mostrar recursos educativos con acciones
 * @crítico: SÍ - Interfaz principal para visualización de recursos educativos
 * @dependencias: Ant Design Card, Framer Motion, educationalResourcesService
 * @no_modificar: Parsing de tags JSON sin validar estructura del objeto
 * @relacionado_con: ResourceGrid.tsx, ResourceList.tsx, educationalResourcesService.ts
 */

/**
 * COMPONENTE: ResourceCard
 * UBICACIÓN: /frontend/src/components/recursos/ResourceCard.tsx
 * FUNCIÓN: Card visual individual para recursos educativos con acciones CRUD
 * NO USAR PARA: Listados simples sin interacción (usar ResourceList.tsx)
 * PROPS CRÍTICAS:
 *   - resource: EducationalResource - Datos completos del recurso
 *   - onClick: Callback para abrir/visualizar recurso
 *   - onToggleFavorite: Callback para marcar/desmarcar favorito
 *   - onDelete: Callback para eliminar recurso (opcional)
 *   - canDelete: boolean - Permiso para mostrar acción eliminar
 * 
 * SISTEMA DE TIPOS Y COLORES:
 * - PDF: Rojo #ff4d4f con FilePdfOutlined
 * - VIDEO: Morado #722ed1 con VideoCameraOutlined
 * - IMAGE: Cyan #13c2c2 con PictureOutlined
 * - INTERACTIVE_HTML: Naranja #fa8c16 con Html5Outlined
 * - DOCUMENT: Azul #1890ff con FileOutlined
 * - PRESENTATION: Rosa #eb2f96 con FilePptOutlined
 * - SPREADSHEET: Verde #52c41a con FileExcelOutlined
 * - AUDIO: Amarillo #faad14 con AudioOutlined
 * 
 * ESTRUCTURA VISUAL:
 * - Badge.Ribbon superior con tipo de recurso
 * - Cover image/thumbnail cuando disponible
 * - Avatar con icono si no hay thumbnail
 * - Meta con título, asignatura, nivel educativo
 * - Tags para nivel, visibilidad, etiquetas personalizadas
 * - Información de autor, tamaño archivo, fecha
 * - Actions bar: vistas, descargas, favorito, eliminar
 * 
 * FUNCIONALIDADES INTERACTIVAS:
 * - Hover animation con Framer Motion (elevación -4px)
 * - Click en card para abrir/visualizar
 * - Toggle favorito con HeartFilled animado
 * - Popconfirm para eliminación segura
 * - Tooltips informativos en todas las acciones
 * 
 * FORMATEO DE DATOS:
 * - formatFileSize(): B → KB → MB con decimales
 * - formatDate(): Hoy/Ayer/Hace X días/Fecha completa
 * - Tags parsing seguro: JSON string → Array con fallback
 * - Truncado de texto con ellipsis en título/descripción
 * 
 * INFORMACIÓN MOSTRADA:
 * - Metadatos: título, descripción, asignatura, nivel
 * - Estadísticas: vistas, descargas, favoritos
 * - Detalles técnicos: tamaño archivo, autor, fecha
 * - Tags educativos: nivel, público/privado, etiquetas
 * - Asignaciones: fecha límite, instrucciones (opcional)
 * 
 * MODO ASSIGNMENT INFO:
 * - showAssignmentInfo: true - Muestra datos de asignación
 * - Fecha límite con Tag naranja
 * - Instrucciones del profesor
 * - Oculta Badge.Ribbon superior
 * 
 * PERMISOS Y ACCIONES:
 * - canDelete: Controla visibilidad botón eliminar
 * - onToggleFavorite: Solo si usuario puede marcar favoritos
 * - onClick: Siempre disponible para visualización
 * - Estados loading durante operaciones async
 * 
 * RESPONSIVE DESIGN:
 * - Card adaptativo con cover/avatar intercambiables
 * - Tags limitados a 2 + contador resto
 * - Texto ellipsis para evitar overflow
 * - Actions bar organizada espacialmente
 * 
 * INTEGRACIÓN CON GOOGLE DRIVE:
 * - thumbnailLink para preview de archivos
 * - fileSize del archivo real en Drive
 * - Eliminación sincronizada panel + Drive
 * 
 * ESTADO ACTUAL: ✅ COMPONENTE POLISHED
 * - Cards visuales completamente funcionales
 * - Todas las acciones implementadas y validadas
 * - Manejo seguro de datos inconsistentes
 * - UI responsive y accesible
 * - Integración completa con sistema de recursos
 */

import React, { useState } from 'react';
import { Card, Tag, Space, Typography, Avatar, Tooltip, Badge, Popconfirm, message } from 'antd';
import {
  EyeOutlined,
  DownloadOutlined,
  HeartFilled,
  ClockCircleOutlined,
  FileOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  Html5Outlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  AudioOutlined,
  DeleteOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { EducationalResource, ResourceType } from '../../services/educationalResourcesService';

const { Text, Title } = Typography;

interface ResourceCardProps {
  resource: EducationalResource;
  onClick: (resource: EducationalResource) => void;
  onToggleFavorite?: (resource: EducationalResource) => void;
  onDelete?: (resource: EducationalResource) => void;
  onViewersClick?: (resourceId: string) => void;
  showAssignmentInfo?: boolean;
  canDelete?: boolean;
}

const resourceIcons: Record<keyof ResourceType, React.ReactNode> = {
  PDF: <FilePdfOutlined />,
  VIDEO: <VideoCameraOutlined />,
  IMAGE: <PictureOutlined />,
  INTERACTIVE_HTML: <Html5Outlined />,
  DOCUMENT: <FileOutlined />,
  PRESENTATION: <FilePptOutlined />,
  SPREADSHEET: <FileExcelOutlined />,
  AUDIO: <AudioOutlined />,
  LINK: <LinkOutlined />,
};

const resourceColors: Record<keyof ResourceType, string> = {
  PDF: '#ff4d4f',
  VIDEO: '#722ed1',
  IMAGE: '#13c2c2',
  INTERACTIVE_HTML: '#fa8c16',
  DOCUMENT: '#1890ff',
  PRESENTATION: '#eb2f96',
  SPREADSHEET: '#52c41a',
  AUDIO: '#faad14',
  LINK: '#096dd9',
};

const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onClick,
  onToggleFavorite,
  onDelete,
  onViewersClick,
  showAssignmentInfo = false,
  canDelete = false,
}) => {
  const [deleting, setDeleting] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(resource);
    }
  };

  const handleDeleteClick = async () => {
    if (!onDelete) return;
    
    setDeleting(true);
    try {
      await onDelete(resource);
      message.success('Recurso eliminado correctamente');
      // Don't open the file after deletion - just show success message
    } catch (error) {
      console.error('Error deleting resource:', error);
      message.error('Error al eliminar el recurso');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCardClick = () => {
    // Prevent opening the resource if it's being deleted
    if (deleting) {
      return;
    }
    onClick(resource);
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Hoy';
    if (diffInDays === 1) return 'Ayer';
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Badge.Ribbon
        text={resource.type}
        color={resourceColors[resource.type]}
        style={{ display: showAssignmentInfo ? 'none' : 'block' }}
      >
        <Card
          hoverable
          onClick={handleCardClick}
          cover={
            (() => {
              const coverSrc = resource.type === 'LINK'
                ? resource.previewImage
                : resource.thumbnailLink;
              return coverSrc ? (
                <div
                  style={{
                    height: 160,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f0f2f5',
                  }}
                >
                  <img
                    alt={resource.title}
                    src={coverSrc}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ) : null;
            })()
          }
          actions={[
            <Tooltip key="views" title={onViewersClick ? 'Ver quién lo ha visto' : undefined}>
              <Space
                onClick={onViewersClick ? (e) => { e.stopPropagation(); onViewersClick(resource.id); } : undefined}
                style={onViewersClick ? { cursor: 'pointer', color: '#1890ff' } : undefined}
              >
                <EyeOutlined />
                <Text style={onViewersClick ? { color: '#1890ff' } : undefined}>{resource.views}</Text>
              </Space>
            </Tooltip>,
            <Space key="downloads">
              <DownloadOutlined />
              <Text>{resource.downloads}</Text>
            </Space>,
            <Tooltip title={resource.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}>
              <HeartFilled
                key="favorite"
                style={{
                  color: resource.isFavorite ? '#ff4d4f' : '#8c8c8c',
                }}
                onClick={handleFavoriteClick}
              />
            </Tooltip>,
            ...(canDelete ? [
              <Popconfirm
                key="delete"
                title="¿Eliminar recurso?"
                description="Esta acción eliminará el recurso del panel y de Google Drive. ¿Estás seguro?"
                onConfirm={handleDeleteClick}
                okText="Sí, eliminar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true, loading: deleting }}
                disabled={deleting}
              >
                <Tooltip title="Eliminar recurso">
                  <DeleteOutlined
                    style={{
                      color: '#ff4d4f',
                      cursor: deleting ? 'not-allowed' : 'pointer',
                      opacity: deleting ? 0.5 : 1,
                    }}
                    onClick={handleDeleteIconClick}
                  />
                </Tooltip>
              </Popconfirm>
            ] : []),
          ]}
        >
          <Card.Meta
            avatar={
              !(resource.type === 'LINK' ? resource.previewImage : resource.thumbnailLink) && (
                <Avatar
                  size={48}
                  style={{
                    backgroundColor: resourceColors[resource.type],
                  }}
                  icon={resourceIcons[resource.type]}
                />
              )
            }
            title={
              <Tooltip title={resource.title}>
                <Title
                  level={5}
                  ellipsis={{ rows: 2 }}
                  style={{ marginBottom: 0 }}
                >
                  {resource.title}
                </Title>
              </Tooltip>
            }
            description={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text type="secondary" ellipsis>
                  {String(resource.subject?.name || 'Sin asignatura')} • {String(resource.gradeLevel || 'Sin nivel')}
                </Text>
                
                {resource.description && (
                  <Text ellipsis={{ rows: 2 }}>
                    {resource.description}
                  </Text>
                )}
                
                <Space size="small" wrap>
                  <Tag color="blue">{String(resource.educationalLevel?.name || 'Sin nivel')}</Tag>
                  {resource.isPublic && <Tag color="green">Público</Tag>}
                  {(() => {
                    // FIXED: Safe tags parsing - handle comma-separated string from backend
                    let tags = [];
                    try {
                      if (typeof resource.tags === 'string' && resource.tags.trim()) {
                        // Backend sends comma-separated string, split it
                        tags = resource.tags.split(',').map(tag => tag.trim()).filter(Boolean);
                      } else if (Array.isArray(resource.tags)) {
                        tags = resource.tags;
                      }
                    } catch (e) {
                      console.warn('Error parsing tags:', e);
                      tags = [];
                    }
                    
                    return (
                      <>
                        {Array.isArray(tags) && tags.slice(0, 2).map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                        {Array.isArray(tags) && tags.length > 2 && (
                          <Tag>+{tags.length - 2}</Tag>
                        )}
                      </>
                    );
                  })()}
                </Space>
                
                <Space split="•" size="small">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {resource.author?.profile?.firstName && resource.author?.profile?.lastName
                      ? `${resource.author.profile.firstName} ${resource.author.profile.lastName}`
                      : resource.author?.email || 'Sin autor'}
                  </Text>
                  {resource.type !== 'LINK' && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatFileSize(resource.fileSize)}
                    </Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <ClockCircleOutlined /> {formatDate(resource.createdAt)}
                  </Text>
                </Space>
                {resource.type === 'LINK' && (
                  <Tag color="blue" icon={<LinkOutlined />} style={{ marginTop: 4 }}>
                    Enlace externo
                  </Tag>
                )}

                {showAssignmentInfo && (resource.dueDate || resource.instructions) && (
                  <Space direction="vertical" size="small" style={{ marginTop: 8 }}>
                    {resource.dueDate && (
                      <Tag color="orange">
                        Fecha límite: {new Date(resource.dueDate).toLocaleDateString('es-ES')}
                      </Tag>
                    )}
                    {resource.instructions && (
                      <div style={{ 
                        padding: '8px 12px', 
                        backgroundColor: '#f6ffed', 
                        border: '1px solid #b7eb8f', 
                        borderRadius: '6px',
                        marginTop: '4px'
                      }}>
                        <Text strong style={{ fontSize: 12, color: '#389e0d' }}>
                          Instrucciones del profesor:
                        </Text>
                        <br />
                        <Text style={{ fontSize: 12, color: '#595959' }}>
                          {resource.instructions}
                        </Text>
                      </div>
                    )}
                  </Space>
                )}
              </Space>
            }
          />
        </Card>
      </Badge.Ribbon>
    </motion.div>
  );
};

export default ResourceCard;