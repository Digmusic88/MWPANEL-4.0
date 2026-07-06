/**
 * Componente de árbol jerárquico de carpetas de rúbricas
 * Con drag & drop y operaciones CRUD integradas
 */

import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Tree,
  Card,
  Space,
  Button,
  Dropdown,
  Tooltip,
  Typography,
  Badge,
  Spin,
  Empty,
  message
} from 'antd';
import type { MenuProps } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  MoreOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  DragOutlined,
  FolderAddOutlined,
  InboxOutlined
} from '@ant-design/icons';
import {
  RubricFolder,
  FolderTreeDto,
  RubricFoldersApiService
} from '../../services/rubricFoldersApi';

const { Title, Text } = Typography;

// Tipos para drag & drop
const ItemTypes = {
  FOLDER: 'folder',
  RUBRIC: 'rubric',
};

interface DragItem {
  type: string;
  id: string;
  folder?: RubricFolder;
  rubricId?: string;
}

interface FolderTreeProps {
  folders: RubricFolder[];
  onFolderSelect: (folder: RubricFolder | null) => void;
  onCreateFolder: (parentFolder?: RubricFolder) => void;
  onEditFolder: (folder: RubricFolder) => void;
  onDeleteFolder: (folder: RubricFolder) => void;
  onMoveFolder?: (folderId: string, targetFolderId: string | null) => void;
  onMoveRubric?: (rubricId: string, targetFolderId: string | null) => void;
  selectedFolderId?: string;
  loading?: boolean;
  allowDragDrop?: boolean;
}

interface TreeNodeData {
  key: string;
  title: React.ReactNode;
  children?: TreeNodeData[];
  folder: RubricFolder;
  isLeaf?: boolean;
}

// Componente interior que contiene la lógica de drag/drop
const FolderTreeInner: React.FC<FolderTreeProps> = ({
  folders,
  onFolderSelect,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onMoveFolder,
  onMoveRubric,
  selectedFolderId,
  loading = false,
  allowDragDrop = true
}) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [folderStats, setFolderStats] = useState<Record<string, any>>({});

  // Componente de carpeta draggable y droppable (ahora dentro del DndProvider)
  const DraggableFolder: React.FC<{ 
    folder: RubricFolder; 
    rubricsCount: number;
    onFolderSelect: (folder: RubricFolder) => void;
  }> = ({ folder, rubricsCount, onFolderSelect }) => {
    const [{ isDragging }, drag] = useDrag({
      type: ItemTypes.FOLDER,
      item: { type: ItemTypes.FOLDER, id: folder.id, folder },
      canDrag: !folder.isSystemFolder && allowDragDrop,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    const [{ isOver, canDrop }, drop] = useDrop({
      accept: [ItemTypes.FOLDER, ItemTypes.RUBRIC],
      drop: (item: DragItem) => {
        if (item.type === ItemTypes.FOLDER && onMoveFolder) {
          if (item.id !== folder.id) {
            onMoveFolder(item.id, folder.id);
          }
        } else if (item.type === ItemTypes.RUBRIC && onMoveRubric) {
          onMoveRubric(item.rubricId!, folder.id);
        }
      },
      canDrop: (item: DragItem) => {
        if (item.type === ItemTypes.FOLDER) {
          return item.id !== folder.id && !folder.isSystemFolder;
        }
        return true;
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    });

    const ref = allowDragDrop ? (node: HTMLDivElement) => drag(drop(node)) : undefined;

    return (
      <div
        ref={ref}
        style={{
          opacity: isDragging ? 0.5 : 1,
          backgroundColor: isOver && canDrop ? '#f0f8ff' : 'transparent',
          border: isOver && canDrop ? '2px dashed #1890ff' : '2px solid transparent',
          borderRadius: 6,
          transition: 'all 0.2s ease',
        }}
      >
        {renderFolderContent(folder, rubricsCount, onFolderSelect)}
      </div>
    );
  };

  useEffect(() => {
    if (folders) {
      const data = buildTreeData(folders);
      setTreeData(data);
      
      // Auto-expandir carpetas del sistema
      const systemFolders = folders
        .filter(f => f && f.id && f.isSystemFolder)
        .map(f => f.id);
      console.log('🌳 FOLDER TREE: Setting expanded keys for', systemFolders.length, 'system folders');
      setExpandedKeys(systemFolders);
    }
  }, [folders]);

  const buildTreeData = (folderList: RubricFolder[]): TreeNodeData[] => {
    // Filter out invalid folders first to prevent undefined errors
    const validFolders = folderList.filter(folder => 
      folder && folder.id && folder.name
    );
    
    const rootFolders = validFolders.filter(folder => !folder.parentFolderId);
    
    const buildNode = (folder: RubricFolder): TreeNodeData => {
      const childFolders = validFolders.filter(f => f.parentFolderId === folder.id);
      const rubricsCount = folder.rubrics?.length || 0;
      
      return {
        key: folder.id,
        folder,
        title: renderFolderTitle(folder, rubricsCount),
        children: childFolders.map(buildNode),
        isLeaf: childFolders.length === 0
      };
    };

    return rootFolders.map(buildNode);
  };

  const renderFolderContent = (folder: RubricFolder, rubricsCount: number, onSelect: (folder: RubricFolder) => void) => {
    const iconStyle = { 
      color: folder.color || '#4CAF50', 
      fontSize: 16,
      marginRight: 8 
    };

    const isSelected = selectedFolderId === folder.id;
    const isSystemFolder = folder.isSystemFolder;

    return (
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '4px 8px',
          borderRadius: 6,
          backgroundColor: isSelected ? folder.color + '20' : 'transparent',
          border: isSelected ? `2px solid ${folder.color}` : '2px solid transparent',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          width: '100%'
        }}
        onClick={(e) => {
          e.stopPropagation();
          console.log('🌳 FOLDER TREE CLICK:', folder);
          
          // Add validation before selection
          if (!folder || !folder.id) {
            console.error('⚠️ Invalid folder clicked in tree:', folder);
            return;
          }
          
          onSelect(folder);
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <Space size={8}>
          {/* Icono de la carpeta */}
          {isSystemFolder ? (
            <InboxOutlined style={iconStyle} />
          ) : expandedKeys.includes(folder.id) ? (
            <FolderOpenOutlined style={iconStyle} />
          ) : (
            <FolderOutlined style={iconStyle} />
          )}
          
          {/* Nombre de la carpeta */}
          <Text 
            style={{ 
              fontWeight: isSelected ? 'bold' : 'normal',
              color: isSelected ? folder.color : 'inherit'
            }}
          >
            {folder.name}
          </Text>

          {/* Badge con contador de rúbricas */}
          {rubricsCount > 0 && (
            <Badge 
              count={rubricsCount} 
              size="small"
              style={{ backgroundColor: folder.color || '#4CAF50' }}
            />
          )}

          {/* Indicador de carpeta compartida */}
          {folder.isShared && (
            <Tooltip title="Carpeta compartida">
              <ShareAltOutlined style={{ color: '#1890ff', fontSize: 12 }} />
            </Tooltip>
          )}
        </Space>

        {/* Menú de acciones */}
        {!isSystemFolder && (
          <Dropdown
            menu={{
              items: getFolderMenuItems(folder),
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                handleFolderAction(key, folder);
              }
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                opacity: 0.6,
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.6';
              }}
            />
          </Dropdown>
        )}
      </div>
    );
  };

  const renderFolderTitle = (folder: RubricFolder, rubricsCount: number) => {
    if (allowDragDrop) {
      return (
        <DraggableFolder 
          folder={folder} 
          rubricsCount={rubricsCount} 
          onFolderSelect={onFolderSelect} 
        />
      );
    } else {
      return renderFolderContent(folder, rubricsCount, onFolderSelect);
    }
  };

  const getFolderMenuItems = (folder: RubricFolder): MenuProps['items'] => [
    {
      key: 'add-subfolder',
      label: 'Crear subcarpeta',
      icon: <FolderAddOutlined />
    },
    {
      key: 'edit',
      label: 'Editar carpeta',
      icon: <EditOutlined />
    },
    {
      key: 'move',
      label: 'Mover carpeta',
      icon: <DragOutlined />
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: 'Eliminar carpeta',
      icon: <DeleteOutlined />,
      danger: true
    }
  ];

  const handleFolderAction = (action: string, folder: RubricFolder) => {
    switch (action) {
      case 'add-subfolder':
        onCreateFolder(folder);
        break;
      case 'edit':
        onEditFolder(folder);
        break;
      case 'move':
        if (onMoveFolder) {
          message.info('Arrastra la carpeta a otra carpeta para moverla, o usa el modal de mover');
        } else {
          message.info('Funcionalidad de mover carpeta no disponible');
        }
        break;
      case 'delete':
        onDeleteFolder(folder);
        break;
    }
  };

  const handleTreeExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys as string[]);
  };

  const handleTreeSelect = (selectedKeys: React.Key[], { node }: any) => {
    if (selectedKeys.length > 0) {
      const folder = node.folder as RubricFolder;
      onFolderSelect(folder);
    } else {
      onFolderSelect(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Cargando carpetas...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!folders || folders.length === 0) {
    return (
      <Card>
        <Empty 
          description="No hay carpetas"
          image={<FolderOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
        >
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => onCreateFolder()}
          >
            Crear primera carpeta
          </Button>
        </Empty>
      </Card>
    );
  }

  const treeContent = (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ margin: 0 }}>
            <FolderOutlined style={{ marginRight: 8 }} />
            Carpetas de Rúbricas
            {allowDragDrop && (
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal', marginLeft: 8 }}>
                (Arrastra para mover)
              </Text>
            )}
          </Title>
          <Button 
            type="primary" 
            size="small"
            icon={<PlusOutlined />}
            onClick={() => onCreateFolder()}
          >
            Nueva Carpeta
          </Button>
        </div>
      }
      bodyStyle={{ padding: '16px 0' }}
    >
      <div style={{ padding: '0 16px' }}>
        <Tree
          treeData={treeData}
          expandedKeys={expandedKeys}
          selectedKeys={selectedFolderId ? [selectedFolderId] : []}
          onExpand={handleTreeExpand}
          onSelect={handleTreeSelect}
          showLine={false}
          showIcon={false}
          blockNode
          style={{
            backgroundColor: 'transparent'
          }}
        />
      </div>
      
      {/* Footer con estadísticas */}
      <div style={{ 
        padding: '12px 16px', 
        borderTop: '1px solid #f0f0f0',
        backgroundColor: '#fafafa'
      }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Total: {folders.length} carpetas • 
          {folders.filter(f => f).reduce((sum, f) => sum + (f.rubrics?.length || 0), 0)} rúbricas
        </Text>
      </div>
    </Card>
  );

  return treeContent;
};

// Componente principal que maneja el DndProvider
export const FolderTree: React.FC<FolderTreeProps> = (props) => {
  const { allowDragDrop = true } = props;

  if (allowDragDrop) {
    return (
      <DndProvider backend={HTML5Backend}>
        <FolderTreeInner {...props} />
      </DndProvider>
    );
  }

  return <FolderTreeInner {...props} />;
};

export default FolderTree;