import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Image,
  Button,
  Upload,
  Modal,
  Select,
  Input,
  Form,
  message,
  Spin,
  Empty,
  Tag,
  Typography,
  Space,
  Dropdown,
  Tooltip,
} from 'antd';
import {
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileOutlined,
  PlayCircleOutlined,
  AudioOutlined,
  MoreOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import apiClient from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export interface BlogMedia {
  id: string;
  filename: string;
  originalName: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'gallery';
  provider: 'local' | 'google_drive' | 'youtube' | 'vimeo' | 'external';
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  alt?: string;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
  createdAt: string;
  uploadedBy: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
  metadata?: {
    googleDriveId?: string;
    downloadLink?: string;
    folderId?: string;
    folderPath?: string[];
  };
}

interface MediaGalleryProps {
  postId?: string;
  showUpload?: boolean;
  selectable?: boolean;
  onSelect?: (selectedMedia: BlogMedia[]) => void;
  initialSelection?: string[];
  viewMode?: 'grid' | 'list';
  allowedTypes?: ('image' | 'video' | 'audio' | 'document')[];
}

const MediaGallery: React.FC<MediaGalleryProps> = ({
  postId,
  showUpload = false,
  selectable = false,
  onSelect,
  initialSelection = [],
  viewMode = 'grid',
  allowedTypes = ['image', 'video', 'audio', 'document'],
}) => {
  const { user } = useAuthStore();
  const [form] = Form.useForm();

  const [media, setMedia] = useState<BlogMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string[]>(initialSelection);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadQueue, setUploadQueue] = useState<{
    file: File;
    progress: number;
    status: 'waiting' | 'uploading' | 'completed' | 'error';
    speed: number;
    uploadedBytes: number;
    timeRemaining: number;
    sessionId?: string;
    uploadUrl?: string;
    fileId?: string;
    error?: string;
  }[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<BlogMedia | null>(null);

  useEffect(() => {
    fetchMedia();
  }, [postId, filterType]);

  useEffect(() => {
    if (onSelect) {
      const selected = media.filter(m => selectedMedia.includes(m.id));
      onSelect(selected);
    }
  }, [selectedMedia, media, onSelect]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (postId) {
        params.append('postId', postId);
      }
      
      if (filterType !== 'all') {
        params.append('type', filterType);
      }

      // Use different endpoint based on user role
      let endpoint = '/blog-media';
      if (user?.role === 'family') {
        endpoint = '/blog-media/family';
      } else {
        endpoint = `/blog-media?${params.toString()}`;
      }

      const response = await apiClient.get(endpoint);
      setMedia(response.data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
      message.error('Error al cargar la galería multimedia');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (fileList: File[]) => {
    // Filtrar archivos por tipos permitidos
    const validFiles = fileList.filter(file => {
      const mediaType = getMediaTypeFromFile(file);
      return allowedTypes.includes(mediaType as any);
    });
    
    if (validFiles.length !== fileList.length) {
      message.warning(`Se filtraron ${fileList.length - validFiles.length} archivos por tipo no permitido`);
    }
    
    setSelectedFiles(validFiles);
    // Crear cola de upload
    const queue = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'waiting' as const,
      speed: 0,
      uploadedBytes: 0,
      timeRemaining: 0,
    }));
    setUploadQueue(queue);
    return false; // Prevent auto upload
  };

  const uploadFileWithChunks = async (fileIndex: number) => {
    const queueItem = uploadQueue[fileIndex];
    if (!queueItem || queueItem.status !== 'waiting') return;

    const file = queueItem.file;
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    // 🐛 DEBUG: Log chunk calculation details
    console.log(`🔍 DEBUG CHUNK CALCULATION:
    - File: ${file.name}
    - File size: ${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)} MB)
    - CHUNK_SIZE: ${CHUNK_SIZE} bytes (${CHUNK_SIZE / 1024 / 1024} MB)
    - Total chunks: ${totalChunks}`);

    try {
      // Actualizar estado a uploading
      setUploadQueue(prev => prev.map((item, index) => 
        index === fileIndex 
          ? { ...item, status: 'uploading' }
          : item
      ));

      console.log(`🚀 Starting chunked upload for ${file.name} (${totalChunks} chunks)`);

      // 1. Crear sesión de upload
      const sessionResponse = await apiClient.post('/blog-media/create-upload-session', {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        mediaType: getMediaTypeFromFile(file),
      });

      const { sessionId, uploadUrl, chunkSize, fileName } = sessionResponse.data;
      
      // Actualizar queue con session info
      setUploadQueue(prev => prev.map((item, index) => 
        index === fileIndex 
          ? { ...item, sessionId, uploadUrl }
          : item
      ));

      console.log(`✅ Upload session created: ${sessionId} (${totalChunks} chunks)`);

      // 2. Subir chunks
      let uploadedBytes = 0;
      const startTime = Date.now();

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const startByte = chunkIndex * CHUNK_SIZE;
        const endByte = Math.min(startByte + CHUNK_SIZE, file.size);
        const chunk = file.slice(startByte, endByte);

        const chunkFormData = new FormData();
        chunkFormData.append('chunk', chunk);
        chunkFormData.append('uploadUrl', uploadUrl);
        chunkFormData.append('chunkIndex', chunkIndex.toString());
        chunkFormData.append('totalChunks', totalChunks.toString());
        chunkFormData.append('startByte', startByte.toString());
        chunkFormData.append('endByte', endByte.toString());
        chunkFormData.append('totalFileSize', file.size.toString());

        const chunkResponse = await apiClient.post('/blog-media/upload-chunk', chunkFormData);
        const { progress, completed, fileId } = chunkResponse.data;

        uploadedBytes = endByte;
        const elapsedTime = Date.now() - startTime;
        const speed = uploadedBytes / (elapsedTime / 1000); // bytes per second
        const remainingBytes = file.size - uploadedBytes;
        const timeRemaining = speed > 0 ? remainingBytes / speed : 0;

        // Actualizar progreso en tiempo real
        setUploadQueue(prev => prev.map((item, index) => 
          index === fileIndex 
            ? { 
                ...item, 
                progress,
                speed,
                uploadedBytes,
                timeRemaining,
                fileId: fileId || item.fileId
              }
            : item
        ));

        console.log(`📤 Chunk ${chunkIndex + 1}/${totalChunks} uploaded (${progress}%)`);

        if (completed && fileId) {
          console.log(`🎉 Upload completed! FileId: ${fileId}`);
          
          // 3. Completar upload y crear registro en BD
          const values = form.getFieldsValue();
          await apiClient.post('/blog-media/complete-upload', {
            fileId,
            fileName,
            originalFileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            mediaType: getMediaTypeFromFile(file),
            folderId: sessionResponse.data.folderId,
            folderPath: sessionResponse.data.folderPath,
            caption: values.caption,
            alt: values.alt,
          });

          // Marcar como completado
          setUploadQueue(prev => prev.map((item, index) => 
            index === fileIndex 
              ? { ...item, status: 'completed', progress: 100 }
              : item
          ));

          break;
        }
      }

    } catch (error: any) {
      console.error(`Error uploading ${file.name}:`, error);
      setUploadQueue(prev => prev.map((item, index) => 
        index === fileIndex 
          ? { 
              ...item, 
              status: 'error',
              error: error.response?.data?.message || error.message || 'Error de upload'
            }
          : item
      ));
    }
  };

  const handleManualUpload = async () => {
    if (selectedFiles.length === 0) {
      message.error('Por favor selecciona al menos un archivo');
      return;
    }

    try {
      setUploading(true);
      
      // Subir archivos secuencialmente para evitar sobrecarga
      for (let i = 0; i < uploadQueue.length; i++) {
        if (uploadQueue[i].status === 'waiting') {
          await uploadFileWithChunks(i);
        }
      }

      // Verificar si todos los uploads fueron exitosos
      const completedUploads = uploadQueue.filter(item => item.status === 'completed').length;
      const totalUploads = uploadQueue.length;

      if (completedUploads === totalUploads) {
        message.success(`${completedUploads} archivo(s) subido(s) exitosamente`);
        form.resetFields();
        setSelectedFiles([]);
        setUploadQueue([]);
        setUploadModalVisible(false);
        fetchMedia(); // Recargar galería
      } else {
        const errors = totalUploads - completedUploads;
        message.warning(`${completedUploads} archivo(s) subido(s), ${errors} error(es)`);
      }

    } catch (error: any) {
      console.error('Error in upload process:', error);
      message.error('Error general en el proceso de subida');
    } finally {
      setUploading(false);
    }
  };

  const getMediaTypeFromFile = (file: File): string => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const getAcceptString = (): string => {
    const acceptTypes = [];
    
    if (allowedTypes.includes('image')) {
      acceptTypes.push('image/*');
    }
    if (allowedTypes.includes('video')) {
      acceptTypes.push('video/*');
    }
    if (allowedTypes.includes('audio')) {
      acceptTypes.push('audio/*');
    }
    if (allowedTypes.includes('document')) {
      acceptTypes.push('.pdf,.doc,.docx,.txt,.rtf');
    }
    
    return acceptTypes.join(',');
  };

  const getMediaIcon = (type: BlogMedia['type']) => {
    switch (type) {
      case 'image': return <EyeOutlined />;
      case 'video': return <PlayCircleOutlined />;
      case 'audio': return <AudioOutlined />;
      case 'document': return <FileOutlined />;
      default: return <FileOutlined />;
    }
  };

  const getMediaTypeColor = (type: BlogMedia['type']) => {
    switch (type) {
      case 'image': return '#579172';
      case 'video': return 'purple';
      case 'audio': return 'orange';
      case 'document': return 'green';
      default: return 'default';
    }
  };

  const handleMediaSelect = (mediaItem: BlogMedia) => {
    if (!selectable) return;
    
    if (selectedMedia.includes(mediaItem.id)) {
      setSelectedMedia(selectedMedia.filter(id => id !== mediaItem.id));
    } else {
      setSelectedMedia([...selectedMedia, mediaItem.id]);
    }
  };

  const handleDeleteMedia = async (mediaItem: BlogMedia) => {
    try {
      await apiClient.delete(`/blog-media/${mediaItem.id}`);
      message.success('Archivo eliminado correctamente');
      await fetchMedia();
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Error al eliminar el archivo');
    }
  };

  const handlePreview = (mediaItem: BlogMedia) => {
    setPreviewMedia(mediaItem);
    setPreviewVisible(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return Math.round(seconds) + 's';
    if (seconds < 3600) return Math.round(seconds / 60) + 'm ' + Math.round(seconds % 60) + 's';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return hours + 'h ' + minutes + 'm';
  };

  const getAuthorName = (author: BlogMedia['uploadedBy']) => {
    if (author.profile?.firstName && author.profile?.lastName) {
      return `${author.profile.firstName} ${author.profile.lastName}`;
    }
    return author.email?.split('@')[0] || 'Usuario';
  };

  const renderMediaCard = (mediaItem: BlogMedia) => {
    const isSelected = selectedMedia.includes(mediaItem.id);
    const canEdit = user?.role === 'admin' || mediaItem.uploadedBy.id === user?.id;
    
    return (
      <Card
        key={mediaItem.id}
        hoverable
        className={`media-card ${isSelected ? 'media-selected' : ''}`}
        style={{ 
          border: isSelected ? '2px solid #579172' : '1px solid #d9d9d9',
          cursor: selectable ? 'pointer' : 'default' 
        }}
        cover={
          mediaItem.type === 'image' ? (
            <div style={{ height: '200px', overflow: 'hidden' }}>
              <img
                alt={mediaItem.alt || mediaItem.filename}
                src={`/api/blog-media/proxy/${mediaItem.id}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onClick={() => selectable ? handleMediaSelect(mediaItem) : handlePreview(mediaItem)}
                onError={(e) => {
                  // Fallback to direct URL if proxy fails
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('thumbnailUrl') && mediaItem.thumbnailUrl) {
                    target.src = mediaItem.thumbnailUrl;
                  } else if (!target.src.includes('mediaItem.url')) {
                    target.src = mediaItem.url;
                  }
                }}
              />
            </div>
          ) : mediaItem.type === 'video' ? (
            <div 
              style={{ 
                height: '200px', 
                background: '#000',
                cursor: selectable ? 'pointer' : 'default',
                position: 'relative',
              }}
              onClick={() => selectable ? handleMediaSelect(mediaItem) : handlePreview(mediaItem)}
            >
              <video 
                controls={!selectable} // Desactivar controles en modo selección
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                preload="metadata"
                onClick={(e) => selectable ? e.preventDefault() : e.stopPropagation()}
              >
                <source src={mediaItem.url} />
                Tu navegador no soporta video HTML5.
              </video>
              {selectable && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: isSelected ? 'rgba(87,145,114,0.2)' : 'rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: isSelected ? '#579172' : 'rgba(255,255,255,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: isSelected ? 'white' : '#666'
                  }}>
                    {isSelected ? '✓' : '▶'}
                  </div>
                </div>
              )}
            </div>
          ) : mediaItem.type === 'audio' ? (
            <div
              style={{
                height: '200px',
                background: `linear-gradient(135deg, #fa8c16 0%, rgba(0,0,0,0.1) 100%)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: selectable ? 'pointer' : 'default',
                padding: '20px',
              }}
              onClick={() => selectable ? handleMediaSelect(mediaItem) : handlePreview(mediaItem)}
            >
              <AudioOutlined style={{ fontSize: '48px', color: 'white', marginBottom: '16px' }} />
              <audio 
                controls
                style={{ width: '100%', maxWidth: '250px' }}
                preload="metadata"
                onClick={(e) => e.stopPropagation()}
              >
                <source src={mediaItem.url} />
                Tu navegador no soporta audio HTML5.
              </audio>
            </div>
          ) : (
            <div
              style={{
                height: '200px',
                background: `linear-gradient(135deg, #52c41a 0%, rgba(0,0,0,0.1) 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: selectable ? 'pointer' : 'default',
              }}
              onClick={() => selectable ? handleMediaSelect(mediaItem) : handlePreview(mediaItem)}
            >
              {getMediaIcon(mediaItem.type)}
              <span style={{ fontSize: '48px', color: 'white', marginLeft: '8px' }}>
                {getMediaIcon(mediaItem.type)}
              </span>
            </div>
          )
        }
        actions={[
          <Tooltip title="Ver detalles" key="preview">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(mediaItem)}
            />
          </Tooltip>,
          <Tooltip title="Descargar" key="download">
            <Button
              type="link"
              icon={<DownloadOutlined />}
              href={mediaItem.metadata?.downloadLink || mediaItem.url}
              target="_blank"
            />
          </Tooltip>,
          ...(canEdit ? [
            <Tooltip title="Eliminar" key="delete">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: '¿Eliminar archivo?',
                    content: '¿Estás seguro de que quieres eliminar este archivo? Esta acción no se puede deshacer.',
                    okText: 'Eliminar',
                    okType: 'danger',
                    cancelText: 'Cancelar',
                    onOk: () => handleDeleteMedia(mediaItem),
                  });
                }}
              />
            </Tooltip>
          ] : [])
        ]}
      >
        <Card.Meta
          title={
            <div>
              <Text ellipsis style={{ maxWidth: '200px' }}>
                {mediaItem.originalName}
              </Text>
              <div style={{ marginTop: '4px' }}>
                <Tag color={getMediaTypeColor(mediaItem.type)}>
                  {mediaItem.type.toUpperCase()}
                </Tag>
              </div>
            </div>
          }
          description={
            <div>
              {mediaItem.caption && (
                <Text type="secondary" ellipsis style={{ display: 'block', marginBottom: '4px' }}>
                  {mediaItem.caption}
                </Text>
              )}
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formatFileSize(mediaItem.fileSize)}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Por {getAuthorName(mediaItem.uploadedBy)}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {new Date(mediaItem.createdAt).toLocaleDateString()}
                </Text>
                {mediaItem.provider === 'google_drive' && (
                  <Tag icon={<FolderOutlined />} color="green" style={{ fontSize: '10px' }}>
                    Google Drive
                  </Tag>
                )}
              </Space>
            </div>
          }
        />
      </Card>
    );
  };

  const filteredMedia = media.filter(item => 
    allowedTypes.includes(item.type) && 
    (filterType === 'all' || item.type === filterType)
  );

  return (
    <div className="media-gallery">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Galería Multimedia
            {filteredMedia.length > 0 && (
              <Text type="secondary" style={{ fontSize: '14px', marginLeft: '8px' }}>
                ({filteredMedia.length} archivos)
              </Text>
            )}
          </Title>
        </div>
        
        <Space>
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: '150px' }}
          >
            <Option value="all">Todos los tipos</Option>
            {allowedTypes.includes('image') && <Option value="image">Imágenes</Option>}
            {allowedTypes.includes('video') && <Option value="video">Videos</Option>}
            {allowedTypes.includes('audio') && <Option value="audio">Audio</Option>}
            {allowedTypes.includes('document') && <Option value="document">Documentos</Option>}
          </Select>
          
          {showUpload && (
            <Button 
              type="primary" 
              icon={<UploadOutlined />} 
              onClick={() => setUploadModalVisible(true)}
            >
              Subir Archivo
            </Button>
          )}
        </Space>
      </div>

      {selectable && selectedMedia.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <Text>
            {selectedMedia.length} archivo(s) seleccionado(s)
            <Button 
              type="link" 
              onClick={() => setSelectedMedia([])}
              style={{ padding: 0, marginLeft: '8px' }}
            >
              Limpiar selección
            </Button>
          </Text>
        </div>
      )}

      <Spin spinning={loading}>
        {filteredMedia.length > 0 ? (
          <Row gutter={[16, 16]}>
            {filteredMedia.map(mediaItem => (
              <Col key={mediaItem.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                {renderMediaCard(mediaItem)}
              </Col>
            ))}
          </Row>
        ) : (
          <Empty
            description="No hay archivos multimedia"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {showUpload && (
              <Button 
                type="primary" 
                icon={<UploadOutlined />} 
                onClick={() => setUploadModalVisible(true)}
              >
                Subir primer archivo
              </Button>
            )}
          </Empty>
        )}
      </Spin>

      {/* Modal de subida */}
      <Modal
        title="Subir Archivo Multimedia"
        open={uploadModalVisible}
        onCancel={() => {
          if (!uploading) {
            setUploadModalVisible(false);
            setSelectedFiles([]);
            setUploadQueue([]);
            form.resetFields();
          }
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setUploadModalVisible(false);
              setSelectedFiles([]);
              setUploadQueue([]);
              form.resetFields();
            }}
            disabled={uploading}
          >
            Cancelar
          </Button>,
          <Button 
            key="upload" 
            type="primary" 
            onClick={handleManualUpload}
            loading={uploading}
            disabled={selectedFiles.length === 0}
            icon={<UploadOutlined />}
          >
            {uploading ? 'Subiendo...' : `Subir ${selectedFiles.length} archivo(s)`}
          </Button>
        ]}
        closable={!uploading}
        maskClosable={!uploading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Archivos"
            required
          >
            <Upload
              name="files"
              multiple
              showUploadList={false}
              accept={getAcceptString()}
              beforeUpload={(file, fileList) => {
                return handleFileSelect(fileList);
              }}
              disabled={uploading}
            >
              <Button icon={<UploadOutlined />} disabled={uploading} block>
                {selectedFiles.length === 0 
                  ? 'Seleccionar Archivos (múltiple)' 
                  : `${selectedFiles.length} archivo(s) seleccionado(s)`
                }
              </Button>
            </Upload>
            
            {selectedFiles.length > 0 && (
              <div style={{ marginTop: '8px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                <Text strong>Archivos seleccionados ({selectedFiles.length}):</Text>
                <div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {selectedFiles.map((file, index) => (
                    <div 
                      key={`${file.name}-${index}`}
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: index < selectedFiles.length - 1 ? '1px solid #e0e0e0' : 'none'
                      }}
                    >
                      <div style={{ marginRight: '8px' }}>
                        {getMediaIcon(getMediaTypeFromFile(file) as any)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text style={{ display: 'block', fontSize: '13px' }}>
                          {file.name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {formatFileSize(file.size)} • {file.type}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Tamaño total: {formatFileSize(selectedFiles.reduce((sum, file) => sum + file.size, 0))}
                  </Text>
                </div>
              </div>
            )}
            
            {uploading && uploadQueue.length > 0 && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                background: '#fafafa', 
                borderRadius: '8px',
                border: '1px solid #f0f0f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <UploadOutlined style={{ color: '#579172', marginRight: '8px' }} />
                  <Text strong>Subiendo archivos a Google Drive...</Text>
                </div>
                
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {uploadQueue.map((queueItem, index) => (
                    <div 
                      key={`upload-${index}-${queueItem.file.name}`}
                      style={{ 
                        marginBottom: '16px',
                        padding: '8px',
                        background: queueItem.status === 'completed' ? '#f6ffed' : 
                                   queueItem.status === 'error' ? '#fff2f0' : '#ffffff',
                        borderRadius: '6px',
                        border: queueItem.status === 'completed' ? '1px solid #b7eb8f' : 
                               queueItem.status === 'error' ? '1px solid #ffccc7' : '1px solid #f0f0f0'
                      }}
                    >
                      {/* Header del archivo */}
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ marginRight: '8px' }}>
                          {queueItem.status === 'completed' ? '✅' : 
                           queueItem.status === 'error' ? '❌' :
                           queueItem.status === 'uploading' ? '📤' : '⏳'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Text style={{ fontSize: '13px', fontWeight: 500 }}>
                            {queueItem.file.name}
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {formatFileSize(queueItem.file.size)} • 
                            {queueItem.status === 'waiting' && ' Esperando...'}
                            {queueItem.status === 'uploading' && ' Subiendo...'}
                            {queueItem.status === 'completed' && ' ✓ Completado'}
                            {queueItem.status === 'error' && ` ✗ Error: ${queueItem.error}`}
                          </Text>
                        </div>
                        {queueItem.status === 'uploading' && (
                          <Text style={{ fontSize: '12px', color: '#579172' }}>
                            {queueItem.progress}%
                          </Text>
                        )}
                      </div>
                      
                      {/* Barra de progreso */}
                      {(queueItem.status === 'uploading' || queueItem.status === 'completed') && (
                        <div>
                          <div style={{ 
                            width: '100%', 
                            height: '3px', 
                            background: '#e8e8e8', 
                            borderRadius: '2px', 
                            overflow: 'hidden',
                            marginBottom: '6px'
                          }}>
                            <div style={{
                              width: `${queueItem.progress}%`,
                              height: '100%',
                              background: queueItem.status === 'completed' ? '#52c41a' : '#579172',
                              borderRadius: '2px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          
                          {queueItem.status === 'uploading' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                {formatFileSize(queueItem.uploadedBytes)} de {formatFileSize(queueItem.file.size)}
                                {queueItem.speed > 0 && (
                                  <span> • {formatSpeed(queueItem.speed)}</span>
                                )}
                              </Text>
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                {queueItem.timeRemaining > 0 && queueItem.progress < 95 && (
                                  <span>{formatTime(queueItem.timeRemaining)} restante</span>
                                )}
                                {queueItem.progress >= 95 && queueItem.progress < 100 && (
                                  <span>Finalizando...</span>
                                )}
                              </Text>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Resumen general */}
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px', 
                  background: '#e6f7ff', 
                  borderRadius: '4px',
                  border: '1px solid #91d5ff'
                }}>
                  <Text style={{ fontSize: '12px', color: '#3d6b52' }}>
                    ℹ️ Upload chunked directo a Google Drive - Progreso en tiempo real
                    <br />
                    {uploadQueue.filter(item => item.status === 'completed').length} completados • 
                    {uploadQueue.filter(item => item.status === 'uploading').length} subiendo • 
                    {uploadQueue.filter(item => item.status === 'waiting').length} pendientes •
                    {uploadQueue.filter(item => item.status === 'error').length} errores
                  </Text>
                </div>
              </div>
            )}
          </Form.Item>
          
          <Form.Item name="caption" label="Leyenda (opcional)">
            <TextArea 
              rows={2} 
              placeholder="Descripción del archivo..." 
              disabled={uploading}
            />
          </Form.Item>
          
          <Form.Item name="alt" label="Texto alternativo (opcional)">
            <Input 
              placeholder="Texto alternativo para accesibilidad..." 
              disabled={uploading}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de preview */}
      <Modal
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
        title={previewMedia?.originalName}
      >
        {previewMedia && (
          <div>
            {previewMedia.type === 'image' ? (
              <img
                src={previewMedia.url}
                alt={previewMedia.alt || previewMedia.filename}
                style={{ width: '100%', maxHeight: '500px', objectFit: 'contain' }}
              />
            ) : previewMedia.type === 'video' ? (
              <video 
                controls 
                style={{ width: '100%', maxHeight: '500px' }}
                src={previewMedia.url}
              >
                Tu navegador no soporta video HTML5.
              </video>
            ) : previewMedia.type === 'audio' ? (
              <audio controls style={{ width: '100%' }}>
                <source src={previewMedia.url} />
                Tu navegador no soporta audio HTML5.
              </audio>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <FileOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
                <div style={{ marginTop: '16px' }}>
                  <Text>Archivo: {previewMedia.originalName}</Text>
                  <br />
                  <Text type="secondary">Tamaño: {formatFileSize(previewMedia.fileSize)}</Text>
                  <br />
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    href={previewMedia.metadata?.downloadLink || previewMedia.url}
                    target="_blank"
                    style={{ marginTop: '16px' }}
                  >
                    Descargar
                  </Button>
                </div>
              </div>
            )}
            
            {previewMedia.caption && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                <Text>{previewMedia.caption}</Text>
              </div>
            )}
            
            <div style={{ marginTop: '16px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text><strong>Tipo:</strong> {previewMedia.type.toUpperCase()}</Text>
                <Text><strong>Tamaño:</strong> {formatFileSize(previewMedia.fileSize)}</Text>
                <Text><strong>Subido por:</strong> {getAuthorName(previewMedia.uploadedBy)}</Text>
                <Text><strong>Fecha:</strong> {new Date(previewMedia.createdAt).toLocaleString()}</Text>
                {previewMedia.provider === 'google_drive' && (
                  <Text><strong>Almacenado en:</strong> Google Drive</Text>
                )}
              </Space>
            </div>
          </div>
        )}
      </Modal>

      <style jsx>{`
        .media-card.media-selected {
          box-shadow: 0 0 0 2px #579172;
        }
        
        .media-gallery .ant-card-meta-title {
          margin-bottom: 4px;
        }
        
        .media-gallery .ant-card-meta-description {
          height: auto;
        }
        
        .media-gallery .ant-card-cover {
          transition: transform 0.3s ease;
        }
        
        .media-gallery .ant-card:hover .ant-card-cover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
};

export default MediaGallery;