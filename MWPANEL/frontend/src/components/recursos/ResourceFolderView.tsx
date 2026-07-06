import React, { useState, useMemo, useEffect } from 'react';
import {
  Collapse,
  List,
  Badge,
  Typography,
  Space,
  Tag,
  Avatar,
  Tooltip,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm
} from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  AudioOutlined,
  FilePptOutlined,
  FileExcelOutlined,
  Html5Outlined,
  FileOutlined,
  EyeOutlined,
  DownloadOutlined,
  HeartFilled,
  ClockCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  EditOutlined,
  FolderAddOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { EducationalResource, ResourceFolder } from '../../services/educationalResourcesService';
import educationalResourcesService from '../../services/educationalResourcesService';

const { Panel } = Collapse;
const { Text, Title } = Typography;

interface ResourceFolderViewProps {
  resources: EducationalResource[];
  loading?: boolean;
  onResourceClick: (resource: EducationalResource) => void;
  onToggleFavorite?: (resource: EducationalResource) => void;
  onDelete?: (resource: EducationalResource) => Promise<void>;
  onViewersClick?: (resourceId: string) => void;
  onResourcesUpdate?: () => void; // Callback para refrescar datos sin reload
  canDelete?: boolean;
  canManageFolders?: boolean;
  showAssignmentInfo?: boolean;
  showAuthorInfo?: boolean;
  pagination?: any;
  hideEmptyFolders?: boolean; // Para estudiantes: ocultar carpetas sin recursos asignados
}

interface GroupedData {
  [subjectId: string]: {
    subject: { id: string; name: string };
    folders: ResourceFolder[];
    resources: EducationalResource[];
  };
}

// Component for resource item with reorder buttons
interface ResourceItemProps {
  resource: EducationalResource;
  index: number;
  totalItems: number;
  onResourceClick: (resource: EducationalResource) => void;
  onToggleFavorite?: (resource: EducationalResource) => void;
  onDelete?: (resource: EducationalResource) => Promise<void>;
  canDelete?: boolean;
  canManageFolders?: boolean;
  showAssignmentInfo?: boolean;
  showAuthorInfo?: boolean;
  resourceIcons: { [key: string]: React.ReactNode };
  resourceColors: { [key: string]: string };
  formatFileSize: (bytes: string | number) => string;
  formatDate: (dateString: string) => string;
  handleMoveToFolder: (resource: EducationalResource) => void;
  onMoveUp?: (resource: EducationalResource, index: number) => void;
  onMoveDown?: (resource: EducationalResource, index: number) => void;
  onViewersClick?: (resourceId: string) => void;
}

const ResourceItem: React.FC<ResourceItemProps> = ({
  resource,
  index,
  totalItems,
  onResourceClick,
  onToggleFavorite,
  onDelete,
  canDelete,
  canManageFolders,
  showAssignmentInfo,
  showAuthorInfo,
  resourceIcons,
  resourceColors,
  formatFileSize,
  formatDate,
  handleMoveToFolder,
  onMoveUp,
  onMoveDown,
  onViewersClick,
}) => {
  const canMoveUp = index > 0;
  const canMoveDown = index < totalItems - 1;

  return (
    <div
      style={{
        userSelect: 'none',
        backgroundColor: 'transparent',
        borderRadius: '8px',
      }}
    >
      <List.Item
        actions={[
          // Reorder buttons (only if canManageFolders)
          canManageFolders && totalItems > 1 && (
            <Space key="reorder" size="small">
              <Tooltip title="Subir">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={!canMoveUp}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMoveUp) onMoveUp(resource, index);
                  }}
                />
              </Tooltip>
              <Tooltip title="Bajar">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={!canMoveDown}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMoveDown) onMoveDown(resource, index);
                  }}
                />
              </Tooltip>
            </Space>
          ),
          <Space key="stats">
            <span
              onClick={onViewersClick ? (e) => { e.stopPropagation(); onViewersClick(resource.id); } : undefined}
              style={onViewersClick ? { cursor: 'pointer', color: '#1890ff' } : undefined}
              title={onViewersClick ? 'Ver quién lo ha visto' : undefined}
            >
              <EyeOutlined />
              <Text style={onViewersClick ? { color: '#1890ff', marginLeft: 4 } : { marginLeft: 4 }}>{resource.views}</Text>
            </span>
            <DownloadOutlined />
            <Text>{resource.downloads}</Text>
          </Space>,
          onToggleFavorite && (
            <Tooltip key="favorite" title={resource.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}>
              <HeartFilled
                style={{
                  color: resource.isFavorite ? '#ff4d4f' : '#8c8c8c',
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(resource);
                }}
              />
            </Tooltip>
          ),
          <Button key="view" type="link" onClick={() => onResourceClick(resource)}>
            Ver
          </Button>,
          canManageFolders && (
            <Tooltip key="move" title="Mover a carpeta">
              <Button
                key="move"
                type="link"
                icon={<FolderOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveToFolder(resource);
                }}
              >
                Mover
              </Button>
            </Tooltip>
          ),
          canDelete && onDelete && (
            <Tooltip key="delete" title="Eliminar recurso">
              <Button
                key="delete"
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await onDelete(resource);
                  } catch (error) {
                    console.error('Error deleting resource:', error);
                  }
                }}
              />
            </Tooltip>
          ),
        ].filter(Boolean)}
      >
        <List.Item.Meta
          avatar={
            <Avatar
              size={48}
              style={{
                backgroundColor: resourceColors[resource.type] || '#1890ff',
              }}
              icon={resourceIcons[resource.type] || <FileOutlined />}
            />
          }
          title={
            <div>
              <Title
                level={5}
                style={{ marginBottom: 4, cursor: 'pointer' }}
                onClick={() => onResourceClick(resource)}
              >
                {resource.title}
              </Title>
              {resource.description && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {resource.description}
                </Text>
              )}
            </div>
          }
          description={
            <div>
              <Space size="small" wrap style={{ marginBottom: 8 }}>
                <Tag color="blue">{resource.educationalLevel?.name || 'Sin nivel'}</Tag>
                <Tag>{resource.gradeLevel}</Tag>
                {resource.isPublic && <Tag color="green">Público</Tag>}
              </Space>

              <div className="text-xs text-gray-500 space-x-4">
                <span>📁 {formatFileSize(resource.fileSize)}</span>
                <span><ClockCircleOutlined /> {formatDate(resource.createdAt)}</span>
                {showAuthorInfo && (
                  <span>👤 {
                    resource.author?.profile?.firstName && resource.author?.profile?.lastName
                      ? `${resource.author.profile.firstName} ${resource.author.profile.lastName}`
                      : resource.author?.email || 'Sin autor'
                  }</span>
                )}
              </div>

              {showAssignmentInfo && (resource.dueDate || resource.instructions) && (
                <div className="mt-2 space-y-1">
                  {resource.dueDate && (
                    <div className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-200 inline-block">
                      <strong>📅 Fecha límite:</strong> {new Date(resource.dueDate).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                  {resource.instructions && (
                    <div className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded border border-green-200 mt-1">
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
    </div>
  );
};

const ResourceFolderView: React.FC<ResourceFolderViewProps> = ({
  resources,
  loading = false,
  onResourceClick,
  onToggleFavorite,
  onDelete,
  onViewersClick,
  onResourcesUpdate, // Callback para refrescar
  canDelete = false,
  canManageFolders = false,
  showAssignmentInfo = true,
  showAuthorInfo = false,
  pagination,
  hideEmptyFolders = false, // Por defecto no ocultar (profesores/admin ven todo)
}) => {
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  // Estado para forzar re-render después de reordenar sin hacer refetch
  const [reorderVersion, setReorderVersion] = useState(0);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ResourceFolder | null>(null);
  const [parentFolderForNew, setParentFolderForNew] = useState<{ subjectId: string; parentFolderId?: string } | null>(null);
  const [moveFolderModalVisible, setMoveFolderModalVisible] = useState(false);
  const [resourceToMove, setResourceToMove] = useState<EducationalResource | null>(null);
  const [form] = Form.useForm();
  const [moveFolderForm] = Form.useForm();

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setFoldersLoading(true);
      const data = await educationalResourcesService.getFolders();
      setFolders(data);
    } catch (error) {
      console.error('Error loading folders:', error);
      message.error('Error al cargar las carpetas');
    } finally {
      setFoldersLoading(false);
    }
  };

  // Función auxiliar para contar recursos en una carpeta y todas sus subcarpetas
  const countResourcesInFolderRecursive = (
    folderId: string,
    allFolders: ResourceFolder[],
    allResources: EducationalResource[]
  ): number => {
    // Contar recursos directos en esta carpeta
    const directCount = allResources.filter(r => r.folderId === folderId).length;

    // Contar recursos en subcarpetas recursivamente
    const subfolders = allFolders.filter(f => f.parentFolderId === folderId);
    const subfolderCount = subfolders.reduce((acc, sf) => {
      return acc + countResourcesInFolderRecursive(sf.id, allFolders, allResources);
    }, 0);

    return directCount + subfolderCount;
  };

  const buildFolderHierarchy = (
    rootFolders: ResourceFolder[],
    allFolders: ResourceFolder[],
    allResources: EducationalResource[]
  ): ResourceFolder[] => {
    return rootFolders
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map(folder => {
        const subfolders = allFolders.filter(f => f.parentFolderId === folder.id);
        const builtSubfolders = subfolders.length > 0
          ? buildFolderHierarchy(subfolders, allFolders, allResources)
          : [];

        return {
          ...folder,
          resources: allResources
            .filter(r => r.folderId === folder.id)
            .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0)),
          subfolders: hideEmptyFolders
            ? builtSubfolders.filter(sf => {
                // Mantener subcarpeta solo si tiene recursos directos o en sus propias subcarpetas
                const totalResources = countResourcesInFolderRecursive(sf.id, allFolders, allResources);
                return totalResources > 0;
              })
            : builtSubfolders
        };
      })
      // Filtrar carpetas raíz vacías cuando hideEmptyFolders está activo
      .filter(folder => {
        if (!hideEmptyFolders) return true;
        const totalResources = countResourcesInFolderRecursive(folder.id, allFolders, allResources);
        return totalResources > 0;
      });
  };

  const groupedData = useMemo(() => {
    const groups: GroupedData = {};

    // Si hideEmptyFolders está activo, NO crear grupos de carpetas vacías
    // Solo crear grupos basados en los recursos disponibles
    if (hideEmptyFolders) {
      // Solo crear grupos para asignaturas que tengan recursos
      resources.forEach(resource => {
        const subjectKey = resource.subject?.id || 'no-subject';
        const subjectName = resource.subject?.name || 'Sin Asignatura';

        if (!groups[subjectKey]) {
          groups[subjectKey] = {
            subject: { id: subjectKey, name: subjectName },
            folders: [],
            resources: []
          };
        }

        if (!resource.folderId) {
          groups[subjectKey].resources.push(resource);
        }
      });

      // Asignar carpetas que tengan recursos a sus grupos
      folders.forEach(folder => {
        if (groups[folder.subjectId] && !folder.parentFolderId) {
          // Solo añadir carpetas raíz; buildFolderHierarchy filtrará las vacías
          groups[folder.subjectId].folders.push(folder);
        }
      });
    } else {
      // Comportamiento original: crear grupos para todas las carpetas (incluso vacías)
      folders.forEach(folder => {
        const subjectKey = folder.subjectId;
        const subjectName = folder.subject?.name ||
          resources.find(r => r.subject?.id === subjectKey)?.subject?.name ||
          'Sin Asignatura';

        if (!groups[subjectKey]) {
          groups[subjectKey] = {
            subject: { id: subjectKey, name: subjectName },
            folders: [],
            resources: []
          };
        }
      });

      // Añadir recursos a los grupos
      resources.forEach(resource => {
        const subjectKey = resource.subject?.id || 'no-subject';
        const subjectName = resource.subject?.name || 'Sin Asignatura';

        if (!groups[subjectKey]) {
          groups[subjectKey] = {
            subject: { id: subjectKey, name: subjectName },
            folders: [],
            resources: []
          };
        }

        if (!resource.folderId) {
          groups[subjectKey].resources.push(resource);
        }
      });

      // Asignar carpetas a sus grupos
      folders.forEach(folder => {
        if (groups[folder.subjectId]) {
          folder.resources = resources.filter(r => r.folderId === folder.id);
          if (!folder.parentFolderId) {
            groups[folder.subjectId].folders.push(folder);
          }
        }
      });
    }

    // Construir jerarquía de carpetas y ordenar recursos
    Object.keys(groups).forEach(subjectId => {
      groups[subjectId].folders = buildFolderHierarchy(groups[subjectId].folders, folders, resources);
      groups[subjectId].resources.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
    });

    // Filtrar grupos (asignaturas) completamente vacíos cuando hideEmptyFolders está activo
    if (hideEmptyFolders) {
      Object.keys(groups).forEach(subjectId => {
        const group = groups[subjectId];
        const hasRootResources = group.resources.length > 0;
        const hasFoldersWithContent = group.folders.length > 0;

        if (!hasRootResources && !hasFoldersWithContent) {
          delete groups[subjectId];
        }
      });
    }

    return groups;
  }, [resources, folders, hideEmptyFolders, reorderVersion]);

  const resourceIcons: { [key: string]: React.ReactNode } = {
    PDF: <FileTextOutlined />,
    VIDEO: <VideoCameraOutlined />,
    IMAGE: <PictureOutlined />,
    AUDIO: <AudioOutlined />,
    PRESENTATION: <FilePptOutlined />,
    SPREADSHEET: <FileExcelOutlined />,
    INTERACTIVE_HTML: <Html5Outlined />,
    DOCUMENT: <FileOutlined />,
  };

  const resourceColors: { [key: string]: string } = {
    PDF: '#ff4d4f',
    VIDEO: '#722ed1',
    IMAGE: '#13c2c2',
    AUDIO: '#faad14',
    PRESENTATION: '#eb2f96',
    SPREADSHEET: '#52c41a',
    INTERACTIVE_HTML: '#fa8c16',
    DOCUMENT: '#1890ff',
  };

  const formatFileSize = (bytes: string | number): string => {
    const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    if (numBytes < 1024) return numBytes + ' B';
    if (numBytes < 1024 * 1024) return (numBytes / 1024).toFixed(1) + ' KB';
    return (numBytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
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

  const handlePanelChange = (keys: string | string[]) => {
    setActiveKeys(Array.isArray(keys) ? keys : [keys]);
  };

  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleCreateFolder = (subjectId: string, parentFolderId?: string) => {
    setParentFolderForNew({ subjectId, parentFolderId });
    setEditingFolder(null);
    form.resetFields();
    setFolderModalVisible(true);
  };

  const handleEditFolder = (folder: ResourceFolder) => {
    setEditingFolder(folder);
    setParentFolderForNew(null);
    form.setFieldsValue({
      name: folder.name,
      color: folder.color,
    });
    setFolderModalVisible(true);
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await educationalResourcesService.deleteFolder(folderId);
      message.success('Carpeta eliminada correctamente');
      loadFolders();
    } catch (error: any) {
      console.error('Error deleting folder:', error);
      message.error(error.response?.data?.message || 'Error al eliminar la carpeta');
    }
  };

  const handleSaveFolder = async () => {
    try {
      const values = await form.validateFields();

      if (editingFolder) {
        await educationalResourcesService.updateFolder(editingFolder.id, values);
        message.success('Carpeta actualizada correctamente');
      } else if (parentFolderForNew) {
        await educationalResourcesService.createFolder({
          ...values,
          subjectId: parentFolderForNew.subjectId,
          parentFolderId: parentFolderForNew.parentFolderId,
        });
        message.success('Carpeta creada correctamente');
      }

      setFolderModalVisible(false);
      form.resetFields();
      loadFolders();
    } catch (error: any) {
      console.error('Error saving folder:', error);
      message.error(error.response?.data?.message || 'Error al guardar la carpeta');
    }
  };

  const handleMoveToFolder = (resource: EducationalResource) => {
    setResourceToMove(resource);
    moveFolderForm.setFieldsValue({ folderId: resource.folderId });
    setMoveFolderModalVisible(true);
  };

  const handleSaveMoveToFolder = async () => {
    try {
      const values = await moveFolderForm.validateFields();

      if (!resourceToMove) return;

      await educationalResourcesService.updateResource(resourceToMove.id, {
        folderId: values.folderId || null,
      });

      message.success('Recurso movido correctamente');
      setMoveFolderModalVisible(false);
      moveFolderForm.resetFields();
      setResourceToMove(null);

      // Refrescar datos sin reload completo
      if (onResourcesUpdate) {
        onResourcesUpdate();
      }
      loadFolders();
    } catch (error: any) {
      console.error('Error moving resource:', error);
      message.error(error.response?.data?.message || 'Error al mover el recurso');
    }
  };

  const getFoldersForSubject = (subjectId: string): ResourceFolder[] => {
    return folders.filter(f => f.subjectId === subjectId && !f.parentFolderId);
  };

  const flattenFoldersForSelect = (folders: ResourceFolder[], level: number = 0): any[] => {
    return folders.reduce((acc: any[], folder: any) => {
      acc.push({
        id: folder.id,
        name: '  '.repeat(level) + folder.name,
        level
      });
      if (folder.subfolders && folder.subfolders.length > 0) {
        acc.push(...flattenFoldersForSelect(folder.subfolders, level + 1));
      }
      return acc;
    }, []);
  };

  // Function to handle moving a resource up in the list
  // Actualización optimista sin recargar para mantener la posición del scroll
  const handleMoveUp = async (resourceList: EducationalResource[], resourceToMove: EducationalResource, currentIndex: number) => {
    if (currentIndex <= 0) return;

    try {
      const reordered = [...resourceList];
      // Swap with the previous item
      [reordered[currentIndex - 1], reordered[currentIndex]] = [reordered[currentIndex], reordered[currentIndex - 1]];

      // Actualizar displayOrder localmente
      reordered.forEach((resource, index) => {
        resource.displayOrder = index;
      });

      const updates = reordered.map((resource, index) => ({
        id: resource.id,
        displayOrder: index,
      }));

      // Guardar en el servidor (en background, sin esperar refetch)
      await educationalResourcesService.reorderResources(updates);
      message.success('Recurso movido hacia arriba');

      // Incrementar reorderVersion para forzar re-render sin scroll al top
      // Los datos locales ya tienen el nuevo orden (actualizado arriba)
      // y el servidor ya guardó el cambio
      setReorderVersion(v => v + 1);
    } catch (error) {
      console.error('Error moving resource up:', error);
      message.error('Error al mover el recurso.');
      // En caso de error, recargar para restaurar estado consistente
      loadFolders();
    }
  };

  // Function to handle moving a resource down in the list
  // Actualización optimista sin recargar para mantener la posición del scroll
  const handleMoveDown = async (resourceList: EducationalResource[], resourceToMove: EducationalResource, currentIndex: number) => {
    if (currentIndex >= resourceList.length - 1) return;

    try {
      const reordered = [...resourceList];
      // Swap with the next item
      [reordered[currentIndex], reordered[currentIndex + 1]] = [reordered[currentIndex + 1], reordered[currentIndex]];

      // Actualizar displayOrder localmente
      reordered.forEach((resource, index) => {
        resource.displayOrder = index;
      });

      const updates = reordered.map((resource, index) => ({
        id: resource.id,
        displayOrder: index,
      }));

      // Guardar en el servidor (en background, sin esperar refetch)
      await educationalResourcesService.reorderResources(updates);
      message.success('Recurso movido hacia abajo');

      // Incrementar reorderVersion para forzar re-render sin scroll al top
      // Los datos locales ya tienen el nuevo orden (actualizado arriba)
      // y el servidor ya guardó el cambio
      setReorderVersion(v => v + 1);
    } catch (error) {
      console.error('Error moving resource down:', error);
      message.error('Error al mover el recurso.');
      // En caso de error, recargar para restaurar estado consistente
      loadFolders();
    }
  };

  // Create a render function that includes the resource list context
  const createRenderResource = (resourceList: EducationalResource[]) => (resource: EducationalResource, index: number) => (
    <ResourceItem
      key={resource.id}
      resource={resource}
      index={index}
      totalItems={resourceList.length}
      onResourceClick={onResourceClick}
      onToggleFavorite={onToggleFavorite}
      onDelete={onDelete}
      canDelete={canDelete}
      canManageFolders={canManageFolders}
      showAssignmentInfo={showAssignmentInfo}
      showAuthorInfo={showAuthorInfo}
      resourceIcons={resourceIcons}
      resourceColors={resourceColors}
      formatFileSize={formatFileSize}
      formatDate={formatDate}
      handleMoveToFolder={handleMoveToFolder}
      onMoveUp={(res, idx) => handleMoveUp(resourceList, res, idx)}
      onMoveDown={(res, idx) => handleMoveDown(resourceList, res, idx)}
      onViewersClick={onViewersClick}
    />
  );

  const renderFolder = (folder: ResourceFolder, level: number = 0) => {
    const hasContent = (folder.resources && folder.resources.length > 0) || (folder.subfolders && folder.subfolders.length > 0);
    const isExpanded = expandedFolders.has(folder.id);
    const totalResources = (folder.resources?.length || 0) + (folder.subfolders?.reduce((acc, sf) => acc + (sf.resources?.length || 0), 0) || 0);

    return (
      <div key={folder.id} style={{ marginLeft: level * 20, marginBottom: 8 }}>
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: folder.color || '#f0f0f0',
            borderRadius: 6,
            marginBottom: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onClick={() => hasContent && toggleFolderExpansion(folder.id)}
        >
          <Space>
            {hasContent ? (
              isExpanded ? (
                <FolderOpenOutlined style={{ fontSize: 16, color: '#fff' }} />
              ) : (
                <FolderOutlined style={{ fontSize: 16, color: '#fff' }} />
              )
            ) : (
              <FolderOutlined style={{ fontSize: 16, color: '#fff' }} />
            )}
            <Text strong style={{ color: '#fff' }}>{folder.name}</Text>
            <Badge
              count={totalResources}
              style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
            />
          </Space>

          {canManageFolders && (
            <Space onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Agregar subcarpeta">
                <Button
                  size="small"
                  type="text"
                  icon={<FolderAddOutlined style={{ color: '#fff' }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateFolder(folder.subjectId, folder.id);
                  }}
                />
              </Tooltip>
              <Tooltip title="Editar carpeta">
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined style={{ color: '#fff' }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditFolder(folder);
                  }}
                />
              </Tooltip>
              <Popconfirm
                title="¿Eliminar esta carpeta?"
                description="Los recursos dentro se moverán a la carpeta padre o a la asignatura."
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDeleteFolder(folder.id);
                }}
                okText="Sí, eliminar"
                cancelText="Cancelar"
                onClick={(e) => e.stopPropagation()}
              >
                <Tooltip title="Eliminar carpeta">
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined style={{ color: '#fff' }} />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Tooltip>
              </Popconfirm>
            </Space>
          )}
        </div>

        {hasContent && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginLeft: 20 }}
          >
            {folder.resources && folder.resources.length > 0 && (
              <List
                dataSource={folder.resources}
                renderItem={createRenderResource(folder.resources)}
                className="resource-folder-list"
                style={{ marginBottom: 16 }}
              />
            )}

            {folder.subfolders && folder.subfolders.map(subfolder => renderFolder(subfolder, level + 1))}
          </motion.div>
        )}
      </div>
    );
  };

  if (loading || foldersLoading) {
    return <div className="text-center py-8">Cargando recursos...</div>;
  }

  if (Object.keys(groupedData).length === 0) {
    return (
      <div className="text-center py-16">
        <Text type="secondary">No hay recursos asignados</Text>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Collapse
          activeKey={activeKeys}
          onChange={handlePanelChange}
          ghost
          expandIcon={({ isActive }) =>
            isActive ? <FolderOpenOutlined /> : <FolderOutlined />
          }
        >
          {Object.entries(groupedData).map(([subjectId, { subject, folders: subjectFolders, resources: subjectResources }]) => (
            <Panel
              key={subjectId}
              header={
                <div className="flex justify-between items-center w-full">
                  <Space>
                    <Text strong style={{ fontSize: 16 }}>
                      {subject.name}
                    </Text>
                    <Badge
                      count={subjectResources.length + subjectFolders.reduce((acc, f) => acc + (f.resources?.length || 0), 0)}
                      showZero
                      style={{ backgroundColor: '#52c41a' }}
                    />
                  </Space>
                  {canManageFolders && (
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateFolder(subjectId);
                      }}
                    >
                      Nueva Carpeta
                    </Button>
                  )}
                </div>
              }
              style={{
                marginBottom: 8,
                backgroundColor: '#fafafa',
                borderRadius: 8,
                border: '1px solid #d9d9d9',
              }}
            >
              {subjectFolders.map(folder => renderFolder(folder))}

              {subjectResources.length > 0 && (
                <List
                  dataSource={subjectResources}
                  renderItem={createRenderResource(subjectResources)}
                  className="resource-folder-list"
                />
              )}
            </Panel>
          ))}
        </Collapse>
      </motion.div>

      <Modal
        title={editingFolder ? 'Editar Carpeta' : 'Nueva Carpeta'}
        open={folderModalVisible}
        onOk={handleSaveFolder}
        onCancel={() => {
          setFolderModalVisible(false);
          form.resetFields();
        }}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Nombre de la carpeta"
            rules={[{ required: true, message: 'Por favor ingrese un nombre' }]}
          >
            <Input placeholder="Ej: Unidad 1, Exámenes, Material de apoyo" />
          </Form.Item>

          <Form.Item
            name="color"
            label="Color de la carpeta"
          >
            <Input type="color" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Mover Recurso a Carpeta"
        open={moveFolderModalVisible}
        onOk={handleSaveMoveToFolder}
        onCancel={() => {
          setMoveFolderModalVisible(false);
          moveFolderForm.resetFields();
          setResourceToMove(null);
        }}
        okText="Mover"
        cancelText="Cancelar"
      >
        {resourceToMove && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Recurso: </Text>
              <Text>{resourceToMove.title}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Asignatura: </Text>
              <Text>{resourceToMove.subject?.name}</Text>
            </div>

            <Form form={moveFolderForm} layout="vertical">
              <Form.Item
                name="folderId"
                label="Seleccionar carpeta de destino"
                help="Deja vacío para mover a la raíz de la asignatura"
              >
                <Select
                  placeholder="Sin carpeta (raíz de asignatura)"
                  allowClear
                >
                  {resourceToMove.subject?.id &&
                    flattenFoldersForSelect(
                      buildFolderHierarchy(
                        getFoldersForSubject(resourceToMove.subject.id),
                        folders,
                        []
                      )
                    ).map((folder: any) => (
                      <Select.Option key={folder.id} value={folder.id}>
                        {folder.name}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </>
  );
};

export default ResourceFolderView;
