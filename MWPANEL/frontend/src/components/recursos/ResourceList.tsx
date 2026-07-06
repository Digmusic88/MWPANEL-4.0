/**
 * @archivo: ResourceList.tsx
 * @módulo: Educational Resources (Lista de Recursos Educativos)
 * @función: Componente lista para mostrar recursos educativos con paginación y acciones
 * @crítico: SÍ - Lista principal de recursos integrada con Google Drive
 * @dependencias: educationalResourcesService, Ant Design List, Framer Motion
 * @no_modificar: Iconos por tipo de recurso sin verificar backend types
 * @relacionado_con: educationalResourcesService.ts, ResourceUploader.tsx, ResourceViewer.tsx
 */

/**
 * COMPONENTE: ResourceList
 * UBICACIÓN: /frontend/src/components/recursos/ResourceList.tsx
 * FUNCIÓN: Lista principal de recursos educativos con acciones y metadatos
 * NO USAR PARA: Grids de recursos o vistas de tarjetas (usar ResourceGrid.tsx)
 * PROPS CRÍTICAS:
 *   - resources: EducationalResource[] - Array de recursos educativos
 *   - onResourceClick: Callback para ver/abrir recurso
 *   - pagination: Control de paginación opcional
 *   - canDelete: Permisos para eliminar recursos
 * 
 * TIPOS DE RECURSOS SOPORTADOS:
 * - PDF: Documentos académicos con icono rojo
 * - VIDEO: Videos educativos con icono morado  
 * - IMAGE: Imágenes educativas con icono cyan
 * - AUDIO: Audios educativos con icono naranja
 * - PRESENTATION: Presentaciones con icono verde
 * - SPREADSHEET: Hojas de cálculo con icono azul
 * - INTERACTIVE_HTML: HTML interactivo con icono magenta
 * - DOCUMENT: Documentos generales con icono gris
 * 
 * ACCIONES DISPONIBLES:
 * - Ver recurso: onResourceClick para abrir ResourceViewer
 * - Descargar: Link directo desde Google Drive
 * - Favoritos: Toggle estado favorito del usuario
 * - Eliminar: Solo con permisos (canDelete=true)
 * 
 * INFORMACIÓN MOSTRADA:
 * - Metadatos: Título, descripción, autor, fecha, tamaño
 * - Clasificación: Tipo, nivel educativo, curso, asignatura
 * - Estadísticas: Vistas, descargas, popularidad
 * - Tags: Etiquetas personalizadas para búsqueda
 * - Asignación: Info de tareas si showAssignmentInfo=true
 * 
 * FUNCIONALIDADES:
 * - Paginación integrada con totales informativos
 * - Animaciones Framer Motion para transiciones suaves
 * - Responsive design con acciones adaptables
 * - Estados loading y empty con feedback visual
 * - Truncado inteligente de descripciones largas
 * 
 * INTEGRACIÓN GOOGLE DRIVE:
 * - downloadLink: Enlaces directos de descarga
 * - fileSize: Tamaño real del archivo en Drive
 * - views/downloads: Tracking de interacciones
 * 
 * ESTADO ACTUAL: ✅ FUNCIONAL Y INTEGRADO
 * - Conectado con Google Drive API
 * - Sistema de favoritos operativo
 * - Paginación y filtros funcionando
 * - Animaciones y UX pulidas
 */

import React from 'react';
import { List, Typography, Button, Space, Tag, Avatar, Tooltip, Pagination, Empty, Spin, Popconfirm } from 'antd';
import {
  EyeOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  FileTextOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  FileOutlined,
  PlayCircleOutlined,
  SoundOutlined,
  TableOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { EducationalResource } from '../../services/educationalResourcesService';

const { Text, Title } = Typography;

interface ResourceListProps {
  resources: EducationalResource[];
  loading?: boolean;
  onResourceClick: (resource: EducationalResource) => void;
  onToggleFavorite?: (resource: EducationalResource) => void;
  onDelete?: (resource: EducationalResource) => void;
  onViewersClick?: (resourceId: string) => void;
  showAssignmentInfo?: boolean;
  canDelete?: boolean;
  pagination?: {
    current: number;
    total: number;
    pageSize: number;
    onChange: (page: number, pageSize?: number) => void;
  };
}

const ResourceList: React.FC<ResourceListProps> = ({
  resources,
  loading = false,
  onResourceClick,
  onToggleFavorite,
  onDelete,
  onViewersClick,
  showAssignmentInfo = false,
  canDelete = false,
  pagination,
}) => {
  if (loading) {
    return (
      <div className="text-center py-16">
        <Spin size="large" tip="Cargando recursos..." />
      </div>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <Empty
        description="No se encontraron recursos"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="py-16"
      />
    );
  }

  const getResourceIcon = (type: string) => {
    const iconProps = { style: { fontSize: '20px' } };
    
    switch (type) {
      case 'PDF':
        return <FileTextOutlined {...iconProps} style={{ ...iconProps.style, color: '#ff4d4f' }} />;
      case 'VIDEO':
        return <VideoCameraOutlined {...iconProps} style={{ ...iconProps.style, color: '#722ed1' }} />;
      case 'IMAGE':
        return <PictureOutlined {...iconProps} style={{ ...iconProps.style, color: '#13c2c2' }} />;
      case 'AUDIO':
        return <SoundOutlined {...iconProps} style={{ ...iconProps.style, color: '#fa8c16' }} />;
      case 'PRESENTATION':
        return <PlayCircleOutlined {...iconProps} style={{ ...iconProps.style, color: '#52c41a' }} />;
      case 'SPREADSHEET':
        return <TableOutlined {...iconProps} style={{ ...iconProps.style, color: '#1890ff' }} />;
      case 'INTERACTIVE_HTML':
        return <CodeOutlined {...iconProps} style={{ ...iconProps.style, color: '#eb2f96' }} />;
      default:
        return <FileOutlined {...iconProps} style={{ ...iconProps.style, color: '#666' }} />;
    }
  };

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'PDF': return 'red';
      case 'VIDEO': return 'purple';
      case 'IMAGE': return 'cyan';
      case 'AUDIO': return 'orange';
      case 'PRESENTATION': return 'green';
      case 'SPREADSHEET': return 'blue';
      case 'INTERACTIVE_HTML': return 'magenta';
      default: return 'default';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDelete = async (resource: EducationalResource, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      try {
        await onDelete(resource);
      } catch (error) {
        console.error('Error al eliminar recurso:', error);
      }
    }
  };

  const handleToggleFavorite = (resource: EducationalResource, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(resource);
    }
  };

  const handleResourceClick = (resource: EducationalResource) => {
    onResourceClick(resource);
  };

  return (
    <>
      <List
        itemLayout="horizontal"
        dataSource={resources}
        renderItem={(resource, index) => (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, delay: index * 0.02 }}
          >
            <List.Item
              className="hover:bg-gray-50 cursor-pointer transition-all duration-200 px-4 py-3 border-b border-gray-100"
              onClick={() => handleResourceClick(resource)}
              actions={[
                <Space key="actions" size="small">
                  {onToggleFavorite && (
                    <Tooltip title={resource.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}>
                      <Button
                        type="text"
                        size="small"
                        icon={resource.isFavorite ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined />}
                        onClick={(e) => handleToggleFavorite(resource, e)}
                      />
                    </Tooltip>
                  )}
                  <Tooltip title="Ver recurso">
                    <Button
                      type="text"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleResourceClick(resource)}
                    />
                  </Tooltip>
                  {resource.downloadLink && (
                    <Tooltip title="Descargar">
                      <Button
                        type="text"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(resource.downloadLink, '_blank');
                        }}
                      />
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Popconfirm
                      title="¿Eliminar recurso?"
                      description="Esta acción eliminará el recurso del panel y de Google Drive. ¿Estás seguro?"
                      onConfirm={(e) => handleDelete(resource, e as any)}
                      okText="Sí, eliminar"
                      cancelText="Cancelar"
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="Eliminar">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
                </Space>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    size="large"
                    icon={getResourceIcon(resource.type)}
                    style={{ backgroundColor: 'transparent' }}
                  />
                }
                title={
                  <div className="flex items-center gap-3">
                    <Title level={5} className="mb-0 text-gray-800 hover:text-blue-600 transition-colors">
                      {resource.title}
                    </Title>
                    <Tag color={getResourceTypeColor(resource.type)} className="text-xs">
                      {resource.type}
                    </Tag>
                    {resource.gradeLevel && (
                      <Tag color="blue" className="text-xs">
                        {String(resource.gradeLevel || 'Sin nivel')}
                      </Tag>
                    )}
                  </div>
                }
                description={
                  <div className="space-y-2">
                    {resource.description && (
                      <Text className="text-gray-600 text-sm block">
                        {resource.description.length > 150 
                          ? `${resource.description.substring(0, 150)}...` 
                          : resource.description}
                      </Text>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        <strong>Autor:</strong> {resource.author?.profile?.firstName} {resource.author?.profile?.lastName}
                      </span>
                      <span>
                        <strong>Fecha:</strong> {formatDate(resource.createdAt)}
                      </span>
                      {resource.fileSize && (
                        <span>
                          <strong>Tamaño:</strong> {formatFileSize(resource.fileSize)}
                        </span>
                      )}
                      <span
                        onClick={onViewersClick ? (e) => { e.stopPropagation(); onViewersClick(resource.id); } : undefined}
                        style={onViewersClick ? { cursor: 'pointer', color: '#1890ff' } : undefined}
                        title={onViewersClick ? 'Ver quién lo ha visto' : undefined}
                      >
                        <strong>Vistas:</strong> {resource.views || 0}
                      </span>
                      <span>
                        <strong>Descargas:</strong> {resource.downloads || 0}
                      </span>
                    </div>
                    {resource.subject && (
                      <div className="text-xs text-gray-500">
                        <strong>Asignatura:</strong> {String(resource.subject?.name || 'Sin asignatura')}
                        {resource.educationalLevel && (
                          <span className="ml-2">
                            <strong>Nivel:</strong> {String(resource.educationalLevel?.name || 'Sin nivel')}
                          </span>
                        )}
                      </div>
                    )}
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
                        console.warn('Error parsing tags in ResourceList:', e);
                        tags = [];
                      }
                      
                      return tags && tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag, index) => (
                            <Tag key={index} size="small" color="geekblue">
                              {tag}
                            </Tag>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    {showAssignmentInfo && (resource.dueDate || resource.instructions) && (
                      <div className="mt-2 space-y-2">
                        {resource.dueDate && (
                          <div className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-200">
                            <strong>📅 Fecha límite:</strong> {new Date(resource.dueDate).toLocaleDateString('es-ES', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                        )}
                        {resource.instructions && (
                          <div className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded border border-green-200">
                            <strong>👨‍🏫 Instrucciones del profesor:</strong>
                            <div className="mt-1 text-gray-600">
                              {resource.instructions}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          </motion.div>
        )}
      />

      {pagination && pagination.total > pagination.pageSize && (
        <div className="text-center mt-6">
          <Pagination
            current={pagination.current}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onChange={pagination.onChange}
            showSizeChanger={false}
            showTotal={(total, range) =>
              `${range[0]}-${range[1]} de ${total} recursos`
            }
          />
        </div>
      )}
    </>
  );
};

export default ResourceList;