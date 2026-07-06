import React, { useState, useEffect } from 'react';
import { Layout, Spin, message, Card, Typography, Breadcrumb } from 'antd';
import { FolderOutlined, FileOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

import { DriveToolbar } from './DriveToolbar';
import { BreadcrumbNav } from './BreadcrumbNav';
import { FolderTree } from '../FolderTree/FolderTree';
import { FileGrid } from '../FileViews/FileGrid';
import { FileList } from '../FileViews/FileList';
import { UploadZone } from '../FileUpload/UploadZone';
import { PreviewPanel } from '../FilePreview/PreviewPanel';
import { SearchBar } from '../Search/SearchBar';

import { useAttachments } from '../common/hooks';
import { AttachmentItem, FolderItem, ViewMode } from '../common/types';

const { Sider, Content } = Layout;
const { Title } = Typography;

interface DriveExplorerProps {
  taskId: string;
  mode?: 'full' | 'compact';
  allowUpload?: boolean;
  allowDelete?: boolean;
  onFileSelect?: (file: AttachmentItem) => void;
}

export const DriveExplorer: React.FC<DriveExplorerProps> = ({
  taskId,
  mode = 'full',
  allowUpload = true,
  allowDelete = true,
  onFileSelect,
}) => {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<AttachmentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [folderPath, setFolderPath] = useState<string[]>([]);

  // Custom hooks for data fetching
  const {
    attachments,
    folders,
    loading,
    error,
    uploadFile,
    deleteFiles,
    downloadFile,
    refreshAttachments,
  } = useAttachments(taskId);

  // Filter attachments based on current folder and search
  const filteredAttachments = React.useMemo(() => {
    let filtered = attachments;

    // Filter by current folder
    if (selectedFolder) {
      filtered = filtered.filter(att => att.folderId === selectedFolder);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(att => 
        att.originalFileName.toLowerCase().includes(query) ||
        att.metadata?.description?.toLowerCase().includes(query) ||
        att.metadata?.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [attachments, selectedFolder, searchQuery]);

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        await uploadFile(file, {
          taskId,
          folderId: selectedFolder,
          description: `Archivo subido: ${file.name}`,
          isStudentSubmission: true, // This would be determined by user role
        });
      }
      message.success(`${files.length} archivo(s) subido(s) exitosamente`);
      refreshAttachments();
    } catch (error) {
      message.error('Error al subir archivos');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (fileId: string, isMultiSelect = false) => {
    if (isMultiSelect) {
      setSelectedFiles(prev => 
        prev.includes(fileId) 
          ? prev.filter(id => id !== fileId)
          : [...prev, fileId]
      );
    } else {
      setSelectedFiles([fileId]);
      const file = attachments.find(att => att.id === fileId);
      if (file) {
        setPreviewFile(file);
        onFileSelect?.(file);
      }
    }
  };

  // Handle folder navigation
  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolder(folderId);
    setSelectedFiles([]);
    setPreviewFile(null);
    
    // Update breadcrumb path
    if (folderId) {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        // Build path from root to current folder
        // This is simplified - would need recursive path building
        setFolderPath([folder.name]);
      }
    } else {
      setFolderPath([]);
    }
  };

  // Handle file deletion
  const handleDeleteFiles = async (fileIds: string[]) => {
    try {
      await deleteFiles(fileIds);
      message.success(`${fileIds.length} archivo(s) eliminado(s)`);
      setSelectedFiles([]);
      setPreviewFile(null);
      refreshAttachments();
    } catch (error) {
      message.error('Error al eliminar archivos');
      console.error('Delete error:', error);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
        <span className="ml-4">Cargando archivos...</span>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className="m-4">
        <div className="text-center text-red-500">
          <FileOutlined className="text-4xl mb-4" />
          <Title level={4}>Error al cargar archivos</Title>
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  // Compact mode for embedding in other components
  if (mode === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border rounded-lg p-4"
      >
        <div className="mb-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar archivos..."
          />
        </div>
        
        {allowUpload && (
          <div className="mb-4">
            <UploadZone
              onUpload={handleFileUpload}
              isUploading={isUploading}
              multiple
              compact
            />
          </div>
        )}

        <div className="max-h-96 overflow-y-auto">
          <FileList
            files={filteredAttachments}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelect}
            onDelete={allowDelete ? handleDeleteFiles : undefined}
            compact
          />
        </div>
      </motion.div>
    );
  }

  // Full mode with sidebar and panels
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full"
    >
      <Layout className="h-full bg-white">
        {/* Sidebar with folder tree */}
        <Sider
          width={280}
          className="bg-gray-50 border-r"
          collapsible
          collapsedWidth={0}
          breakpoint="lg"
        >
          <div className="p-4">
            <Title level={5} className="mb-4 text-gray-700">
              <FolderOutlined className="mr-2" />
              Estructura de Carpetas
            </Title>
            <FolderTree
              taskId={taskId}
              selectedFolder={selectedFolder}
              onFolderSelect={handleFolderSelect}
            />
          </div>
        </Sider>

        {/* Main content area */}
        <Layout>
          {/* Toolbar and breadcrumbs */}
          <div className="bg-white border-b p-4">
            <div className="flex items-center justify-between mb-4">
              <BreadcrumbNav
                path={folderPath}
                onNavigate={handleFolderSelect}
              />
              
              <div className="flex items-center gap-4">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Buscar archivos..."
                />
                
                <DriveToolbar
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  selectedFiles={selectedFiles}
                  onDelete={allowDelete ? () => handleDeleteFiles(selectedFiles) : undefined}
                  onDownload={() => {
                    const selectedAttachments = attachments.filter(att => selectedFiles.includes(att.id));
                    selectedAttachments.forEach(att => downloadFile(att));
                  }}
                  onRefresh={refreshAttachments}
                />
              </div>
            </div>

            {/* Upload zone */}
            {allowUpload && (
              <UploadZone
                onUpload={handleFileUpload}
                isUploading={isUploading}
                multiple
                className="mb-4"
              />
            )}
          </div>

          {/* File display area */}
          <Content className="p-4 overflow-auto">
            {viewMode === 'grid' ? (
              <FileGrid
                files={filteredAttachments}
                selectedFiles={selectedFiles}
                onFileSelect={handleFileSelect}
                onDelete={allowDelete ? handleDeleteFiles : undefined}
                onPreview={setPreviewFile}
                onDownload={downloadFile}
              />
            ) : (
              <FileList
                files={filteredAttachments}
                selectedFiles={selectedFiles}
                onFileSelect={handleFileSelect}
                onDelete={allowDelete ? handleDeleteFiles : undefined}
                onPreview={setPreviewFile}
                onDownload={downloadFile}
              />
            )}
          </Content>
        </Layout>

        {/* Preview panel */}
        {previewFile && (
          <Sider
            width={400}
            className="bg-white border-l"
          >
            <PreviewPanel
              file={previewFile}
              onClose={() => setPreviewFile(null)}
              onDownload={downloadFile}
            />
          </Sider>
        )}
      </Layout>
    </motion.div>
  );
};

export default DriveExplorer;