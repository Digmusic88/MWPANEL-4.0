import React, { useState, useEffect } from 'react';
import { Tree, Spin, Button, Tooltip } from 'antd';
import { 
  FolderOutlined, 
  FolderOpenOutlined, 
  FileOutlined,
  PlusOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';

import { FolderItem } from '../common/types';

interface FolderTreeProps {
  taskId: string;
  selectedFolder?: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder?: (parentId: string | null, name: string) => void;
  allowCreateFolders?: boolean;
  compact?: boolean;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  taskId,
  selectedFolder,
  onFolderSelect,
  onCreateFolder,
  allowCreateFolders = false,
  compact = false,
}) => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['root']);
  const [loading, setLoading] = useState(false);

  // Mock folder data - replace with actual API call
  const mockFolders: FolderItem[] = [
    {
      id: 'root',
      name: 'Archivos de la tarea',
      type: 'folder',
      childCount: 3,
    },
    {
      id: 'submissions',
      name: 'Entregas de estudiantes',
      type: 'folder',
      parentId: 'root',
      childCount: 5,
    },
    {
      id: 'materials',
      name: 'Material del profesor',
      type: 'folder',
      parentId: 'root',
      childCount: 2,
    },
    {
      id: 'resources',
      name: 'Recursos adicionales',
      type: 'folder',
      parentId: 'root',
      childCount: 1,
    },
    {
      id: 'student-1',
      name: 'Juan Pérez',
      type: 'folder',
      parentId: 'submissions',
      childCount: 3,
    },
    {
      id: 'student-2',
      name: 'María García',
      type: 'folder',
      parentId: 'submissions',
      childCount: 2,
    },
    {
      id: 'images',
      name: 'Imágenes',
      type: 'folder',
      parentId: 'resources',
      childCount: 4,
    },
  ];

  const buildTreeData = (folders: FolderItem[], parentId: string | null = null): DataNode[] => {
    return folders
      .filter(folder => folder.parentId === parentId)
      .map(folder => ({
        key: folder.id,
        title: (
          <div className="flex items-center justify-between group">
            <span className={`truncate ${compact ? 'text-sm' : ''}`}>
              {folder.name}
            </span>
            {folder.childCount !== undefined && (
              <span className={`text-xs text-gray-400 ml-2 ${compact ? 'hidden' : ''}`}>
                ({folder.childCount})
              </span>
            )}
          </div>
        ),
        icon: ({ expanded }: { expanded: boolean }) => 
          expanded ? <FolderOpenOutlined /> : <FolderOutlined />,
        children: buildTreeData(folders, folder.id),
        isLeaf: folder.childCount === 0,
      }));
  };

  const loadFolderData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      const treeNodes = buildTreeData(mockFolders);
      setTreeData(treeNodes);
    } catch (error) {
      console.error('Error loading folder data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      loadFolderData();
    }
  }, [taskId]);

  const handleSelect = (selectedKeys: React.Key[]) => {
    const selectedKey = selectedKeys[0] as string;
    onFolderSelect(selectedKey === 'root' ? null : selectedKey);
  };

  const handleExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys as string[]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      </div>
    );
  }

  return (
    <div className="folder-tree">
      {/* Header with create folder button */}
      {allowCreateFolders && !compact && (
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">Carpetas</span>
          <Tooltip title="Crear carpeta">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                // Implementation for creating new folder
                const folderName = prompt('Nombre de la nueva carpeta:');
                if (folderName && onCreateFolder) {
                  onCreateFolder(selectedFolder, folderName);
                }
              }}
            />
          </Tooltip>
        </div>
      )}

      {/* Tree component */}
      <Tree
        treeData={treeData}
        selectedKeys={selectedFolder ? [selectedFolder] : ['root']}
        expandedKeys={expandedKeys}
        onSelect={handleSelect}
        onExpand={handleExpand}
        showIcon
        blockNode
        className={`
          folder-tree-content
          ${compact ? 'compact' : ''}
        `}
      />

      {/* Custom styles for the tree */}
      <style jsx>{`
        .folder-tree :global(.ant-tree-node-content-wrapper) {
          padding: 2px 8px;
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .folder-tree :global(.ant-tree-node-content-wrapper:hover) {
          background-color: #f5f5f5;
        }

        .folder-tree :global(.ant-tree-node-selected .ant-tree-node-content-wrapper) {
          background-color: #e6f7ff !important;
          border: 1px solid #91d5ff;
        }

        .folder-tree :global(.ant-tree-title) {
          width: 100%;
        }

        .folder-tree.compact :global(.ant-tree-node-content-wrapper) {
          padding: 1px 6px;
        }

        .folder-tree.compact :global(.ant-tree-title) {
          font-size: 12px;
        }

        .folder-tree :global(.ant-tree-iconEle) {
          margin-right: 6px;
        }
      `}</style>
    </div>
  );
};

export default FolderTree;