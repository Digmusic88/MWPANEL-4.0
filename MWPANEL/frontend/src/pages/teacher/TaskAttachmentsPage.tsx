import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Typography, Alert, Button, Spin, Space, List, Avatar, Tag, Breadcrumb, message } from 'antd';
import { 
  FileTextOutlined, 
  CalendarOutlined, 
  UserOutlined, 
  ArrowLeftOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import taskAttachmentsApiService from '../../services/taskAttachmentsApiService';

const { Title, Text } = Typography;

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  subject: string;
  classGroup: string;
  status: 'draft' | 'published' | 'completed';
  totalStudents: number;
  submittedCount: number;
  requiresFile?: boolean;
  allowedFileTypes?: string[];
  maxFileSizeMB?: number;
}

interface TaskAttachment {
  id: string;
  taskId: string;
  originalFileName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  isStudentSubmission: boolean;
  metadata?: {
    description?: string;
    tags?: string[];
    type?: string;
  };
}

const TaskAttachmentsPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === 'function') {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn('Navigation error:', error, 'Path:', path);
      }
    } else {
      console.warn('Navigate function not available:', path);
    }
  }, [navigate]);
  const location = useLocation();
  const { user } = useAuth();


  // State for file management
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  // File management functions
  const handleUploadFiles = (type: 'material' | 'resource' | 'general' = 'general') => {
    console.log(`🔥 Upload files triggered (${type})`);
    // Trigger file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.mov';
    input.onchange = (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files) {
        handleFileUpload(Array.from(files), type);
      }
    };
    input.click();
  };

  const handleFileUpload = async (files: File[], type: 'material' | 'resource' | 'general' = 'general') => {
    if (!taskId) {
      message.error('No se puede subir archivos sin una tarea seleccionada');
      return;
    }

    const typeLabels = {
      material: 'Material del Profesor',
      resource: 'Recursos Adicionales', 
      general: 'Archivos'
    };

    console.log(`🔥 Uploading ${type} files:`, files.map(f => f.name));
    setUploadingFiles(true);
    
    try {
      // Map frontend types to backend types
      const backendType = type === 'material' ? 'instruction' : 
                         type === 'resource' ? 'resource' : 'instruction';
                         
      const result = await taskAttachmentsApiService.uploadTaskAttachments(taskId, files, backendType);
      console.log('✅ Files uploaded successfully:', result);
      message.success(`${files.length} archivo(s) subido(s) exitosamente como ${typeLabels[type]}`);
      
      // Reload attachments
      await loadAttachments();
    } catch (error) {
      console.error('❌ Upload error:', error);
      message.error('Error al subir archivos');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDownloadFile = async (attachmentId: string, fileName: string) => {
    console.log('🔥 Download file:', fileName);
    try {
      await taskAttachmentsApiService.downloadTaskAttachment(attachmentId);
      message.success(`Descargando: ${fileName}`);
    } catch (error) {
      console.error('❌ Download error:', error);
      message.error('Error al descargar archivo');
    }
  };

  const handleDownloadSubmissionFile = async (attachmentId: string, fileName: string) => {
    console.log('🔥 Download submission file:', fileName);
    try {
      await taskAttachmentsApiService.downloadSubmissionAttachment(attachmentId);
      message.success(`Descargando: ${fileName}`);
    } catch (error) {
      console.error('❌ Download error:', error);
      message.error('Error al descargar archivo');
    }
  };

  const handleViewFile = (fileName: string) => {
    console.log('🔥 View file:', fileName);
    message.info(`Visualizando: ${fileName}`);
    // TODO: Implement file viewer modal
  };

  const handleDeleteFile = async (attachmentId: string, fileName: string) => {
    console.log('🔥 Delete file:', fileName);
    try {
      await taskAttachmentsApiService.deleteTaskAttachment(attachmentId);
      message.success(`Archivo eliminado: ${fileName}`);
      
      // Reload attachments
      await loadAttachments();
    } catch (error) {
      console.error('❌ Delete error:', error);
      message.error('Error al eliminar archivo');
    }
  };

  const handleAddMaterial = () => {
    console.log('🔥 Add MATERIAL (instructor files) triggered');
    // Trigger file picker specifically for teacher materials
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.mov';
    input.onchange = (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files) {
        handleFileUpload(Array.from(files), 'material');
      }
    };
    input.click();
  };

  const handleAddResource = () => {
    console.log('🔥 Add RESOURCE (additional resources) triggered');
    // Trigger file picker specifically for additional resources
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.mov';
    input.onchange = (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files) {
        handleFileUpload(Array.from(files), 'resource');
      }
    };
    input.click();
  };

  const handleCreateFolder = async () => {
    console.log('🔥 Create folder triggered');
    const folderName = prompt('Nombre de la nueva carpeta:');
    if (folderName && folderName.trim()) {
      if (!taskId) {
        message.error('No se puede crear carpeta sin una tarea seleccionada');
        return;
      }
      
      try {
        console.log(`📁 Creating folder: ${folderName}`);
        const result = await taskAttachmentsApiService.createFolder(taskId, folderName.trim());
        console.log('✅ Folder created:', result);
        
        message.success(`Carpeta "${folderName}" creada exitosamente`);
        
        // Reload attachments to show new folder
        await loadAttachments();
      } catch (error) {
        console.error('❌ Error creating folder:', error);
        message.error('Error al crear la carpeta. La funcionalidad estará disponible próximamente.');
      }
    }
  };

  const handleDownloadAll = async () => {
    console.log('🔥 Download all as ZIP triggered');
    
    if (attachments.length === 0) {
      message.warning('No hay archivos para descargar');
      return;
    }

    try {
      message.loading('Preparando descarga ZIP...', 0);
      
      // Import JSZip dynamically
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Download each attachment and add to ZIP
      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        try {
          console.log(`📄 Adding file ${i + 1}/${attachments.length}: ${attachment.originalFileName}`);
          
          // Get auth token
          const authData = JSON.parse(localStorage.getItem('mw-panel-auth') || '{}');
          const token = authData.state?.accessToken || authData.accessToken;
          
          if (!token) {
            throw new Error('No auth token available');
          }
          
          // Download file as blob
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://plataforma.mundoworld.school/api'
            : 'http://localhost:3000/api';
            
          const downloadUrl = attachment.isStudentSubmission 
            ? `${baseUrl}/tasks/submissions/attachments/${attachment.id}/download`
            : `${baseUrl}/tasks/attachments/${attachment.id}/download`;
            
          const response = await fetch(downloadUrl, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const blob = await response.blob();
          
          // Avoid file name conflicts in ZIP
          let fileName = attachment.originalFileName;
          if (zip.file(fileName)) {
            const ext = fileName.split('.').pop();
            const name = fileName.replace(`.${ext}`, '');
            fileName = `${name}_${i + 1}.${ext}`;
          }
          
          zip.file(fileName, blob);
          
        } catch (error) {
          console.error('Error downloading file:', attachment.originalFileName, error);
          message.warning(`Error incluyendo: ${attachment.originalFileName}`);
        }
      }

      // Generate ZIP file
      console.log('🗜️ Generating ZIP file...');
      message.loading('Generando archivo ZIP...', 0);
      
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `archivos-tarea-${taskId || 'attachments'}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.destroy(); // Remove loading message
      message.success(`Descarga ZIP completada: ${attachments.length} archivos`);
      
    } catch (error) {
      console.error('❌ Download all error:', error);
      message.destroy(); // Remove loading message
      message.error('Error al crear archivo ZIP');
    }
  };

  const handleManagePermissions = () => {
    console.log('🔥 Manage permissions triggered');
    
    message.info('Funcionalidad de gestión de permisos próximamente disponible', 3);
    
    // TODO: Implement permissions manager modal
    // This would open a modal with:
    // - Student access permissions
    // - Family visibility settings
    // - Download restrictions
    // - Expiration dates
    console.log('📋 Permissions manager would show:');
    console.log('- Student access levels');
    console.log('- Family visibility settings'); 
    console.log('- Download permissions');
    console.log('- File expiration dates');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files, 'general');
    }
  };
  
  const [task, setTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load attachments for current task
  const loadAttachments = async () => {
    if (!taskId) return;
    
    try {
      const taskAttachments = await taskAttachmentsApiService.getTaskAttachments(taskId);
      console.log('🔍 RAW ATTACHMENTS FROM BACKEND:', taskAttachments);
      console.log('🔍 ATTACHMENT TYPES DETAIL:', taskAttachments.map(att => ({
        id: att.id,
        name: att.originalFileName,
        type: att.metadata?.type,
        isStudent: att.isStudentSubmission,
        fullMetadata: att.metadata
      })));
      setAttachments(taskAttachments);
    } catch (error) {
      console.error('Error loading attachments:', error);
      message.error('Error al cargar archivos adjuntos');
    }
  };

  // Load data from real API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Check authentication state
      const tokenInfo = taskAttachmentsApiService.getTokenInfo();

      if (!taskAttachmentsApiService.isAuthenticated()) {
        const authData = tokenInfo.user ? 
          `Usuario encontrado: ${tokenInfo.user.email} (${tokenInfo.user.role})` :
          'No hay datos de usuario en el store';
        
        setError(`Problema de autenticación detectado. ${authData}. La sesión puede haber expirado.`);
        setLoading(false);
        return;
      }
      
      try {
        if (taskId) {
          console.log('📋 Loading specific task:', taskId);
          // Load specific task
          const taskData = await taskAttachmentsApiService.getTaskById(taskId);
          setTask(taskData);
          
          // Load attachments for this task
          await loadAttachments();
        } else {
          console.log('📚 Loading task list for teacher');
          // Load list of tasks for selection
          const tasksData = await taskAttachmentsApiService.getMyTasks();
          console.log('📚 Tasks loaded:', tasksData.length);
          setTasks(tasksData);
        }
      } catch (err) {
        console.error('❌ Error loading data:', err);
        if (err instanceof Error && err.message.includes('autenticación')) {
          setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
          // Try to refresh authentication first
          setTimeout(async () => {
            try {
              // Try to refresh the page to trigger auth check
              window.location.reload();
            } catch (refreshError) {
              // If that fails, redirect to login
              window.location.href = '/login';
            }
          }, 2000);
        } else {
          setError('Error al cargar los datos: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [taskId]);

  const handleGoBack = () => {
    safeNavigate('/teacher/tasks', 'Mis Tareas');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'orange';
      case 'published': return 'blue';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'published': return 'Publicada';
      case 'completed': return 'Completada';
      default: return 'Desconocido';
    }
  };

  // Helper function to categorize attachments
  const getTeacherAttachments = () => {
    // Material del Profesor = archivos tipo 'instruction', 'template', 'example' 
    const filtered = attachments.filter(att => 
      !att.isStudentSubmission && 
      (!att.metadata?.type || att.metadata.type === 'instruction' || att.metadata.type === 'template' || att.metadata.type === 'example')
    );
    console.log('🔍 TEACHER ATTACHMENTS FILTER:', {
      total: attachments.length,
      teacherFiltered: filtered.length,
      details: filtered.map(att => ({ id: att.id, name: att.originalFileName, type: att.metadata?.type, isStudent: att.isStudentSubmission }))
    });
    return filtered;
  };

  const getResourceAttachments = () => {
    // Recursos Adicionales = archivos tipo 'resource'
    const filtered = attachments.filter(att => 
      !att.isStudentSubmission && 
      att.metadata?.type === 'resource'
    );
    console.log('🔍 RESOURCE ATTACHMENTS FILTER:', {
      total: attachments.length,
      resourceFiltered: filtered.length,
      details: filtered.map(att => ({ id: att.id, name: att.originalFileName, type: att.metadata?.type, isStudent: att.isStudentSubmission }))
    });
    return filtered;
  };

  const getStudentSubmissions = () => {
    return attachments.filter(att => att.isStudentSubmission);
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to get relative time
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error de Autenticación"
        description={error}
        type="error"
        showIcon
        action={
          <Space>
            <Button size="small" onClick={() => window.location.reload()}>
              Actualizar Página
            </Button>
            <Button size="small" onClick={handleGoBack}>
              Volver
            </Button>
          </Space>
        }
      />
    );
  }

  // If no taskId, show task selection list
  if (!taskId) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <Title level={2}>Gestión de Archivos Adjuntos</Title>
          <Text type="secondary">
            Selecciona una tarea para gestionar sus archivos adjuntos
          </Text>
        </div>

        <div className="grid gap-4">
          {tasks.map((taskItem) => (
            <Card
              key={taskItem.id}
              hoverable
              onClick={() => safeNavigate(`/teacher/task-attachments/${taskItem.id}`, `Archivos - ${taskItem.title}`)}
              className="cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileTextOutlined className="text-blue-500" />
                    <Text strong className="text-lg">{taskItem.title}</Text>
                    <Text
                      className={`px-2 py-1 rounded text-xs text-white`}
                      style={{ backgroundColor: getStatusColor(taskItem.status) }}
                    >
                      {getStatusText(taskItem.status)}
                    </Text>
                  </div>
                  <Text type="secondary" className="block mb-2">
                    {taskItem.description}
                  </Text>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <CalendarOutlined />
                      {formatDate(taskItem.dueDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserOutlined />
                      {taskItem.submittedCount}/{taskItem.totalStudents} entregas
                    </span>
                    <span>{taskItem.subject} - {taskItem.classGroup}</span>
                  </div>
                </div>
                <Button 
                  type="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    safeNavigate(`/teacher/task-attachments/${taskItem.id}`);
                  }}
                >
                  Gestionar Archivos
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // If no task found
  if (!task) {
    return (
      <Alert
        message="Error"
        description="Tarea no encontrada"
        type="error"
        showIcon
        action={
          <Button size="small" onClick={handleGoBack}>
            Volver
          </Button>
        }
      />
    );
  }

  // Determine permissions based on user role
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const allowUpload = isTeacher;
  const allowDelete = isTeacher;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Breadcrumb className="mb-4">
          <Breadcrumb.Item>
            <Button 
              type="link" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleGoBack}
              className="p-0"
            >
              Mis Tareas
            </Button>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <FileTextOutlined className="mr-1" />
            Archivos Adjuntos
          </Breadcrumb.Item>
        </Breadcrumb>

        <Card className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Title level={2} className="mb-2">
                {task.title}
              </Title>
              
              <Text className="text-gray-600 block mb-4">
                {task.description}
              </Text>

              <Space size="large">
                <div className="flex items-center">
                  <CalendarOutlined className="mr-2 text-gray-400" />
                  <Text strong>Fecha límite:</Text>
                  <Text className="ml-2">{formatDate(task.dueDate)}</Text>
                </div>
                
                <div className="flex items-center">
                  <UserOutlined className="mr-2 text-gray-400" />
                  <Text strong>Clase:</Text>
                  <Text className="ml-2">{task.classGroup}</Text>
                </div>
                
                <div className="flex items-center">
                  <Text strong>Estado:</Text>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium text-${getStatusColor(task.status)}-700 bg-${getStatusColor(task.status)}-100`}>
                    {getStatusText(task.status)}
                  </span>
                </div>
              </Space>
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="bg-blue-50 p-4 rounded-lg">
                <Text className="text-2xl font-bold text-blue-600 block">
                  {task.submittedCount}/{task.totalStudents}
                </Text>
                <Text className="text-blue-600 text-sm">
                  Entregas recibidas
                </Text>
              </div>
            </div>
          </div>
        </Card>

        {/* Instructions for teachers */}
        {isTeacher && (
          <Alert
            message="Gestión de Archivos"
            description="Aquí puedes gestionar todos los archivos relacionados con esta tarea: material del profesor, entregas de estudiantes, recursos adicionales, etc. Los estudiantes pueden ver el material que compartas y subir sus entregas."
            type="info"
            showIcon
            className="mb-6"
          />
        )}
      </div>

      {/* File Explorer - Simple Implementation */}
      <Card 
        title={
          <div className="flex items-center">
            <FileTextOutlined className="mr-2" />
            Sistema de Archivos Adjuntos
          </div>
        }
        className="shadow-lg"
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              loading={uploadingFiles}
              onClick={() => handleUploadFiles('general')}
            >
              Subir Archivos
            </Button>
          </Space>
        }
      >
        <div className="p-6">
          {/* Upload Zone */}
          <div className="mb-6">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDragDrop}
              onClick={() => handleUploadFiles('general')}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <PlusOutlined className="text-2xl text-blue-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Arrastra archivos aquí o haz clic para seleccionar
                </h3>
                <p className="text-gray-500 mb-4">
                  Sube materiales para la tarea, recursos adicionales o plantillas
                </p>
                <div className="flex gap-2 text-xs text-gray-400">
                  <span>• PDF, Word, Excel, PowerPoint</span>
                  <span>• Imágenes, Videos</span>
                  <span>• Máximo 100MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* File Organization */}
          {viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Material del Profesor */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-3 flex items-center">
                  <FileTextOutlined className="mr-2" />
                  Material del Profesor
                </h4>
                <div className="space-y-2">
                  {getTeacherAttachments().length > 0 ? (
                    getTeacherAttachments().map((attachment) => (
                      <div key={attachment.id} className="bg-white rounded p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{attachment.originalFileName}</div>
                            <div className="text-xs text-gray-500">
                              {formatFileSize(attachment.fileSize)} • {getRelativeTime(attachment.uploadedAt)}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              size="small" 
                              type="text"
                              icon={<DownloadOutlined />}
                              onClick={() => handleDownloadFile(attachment.id, attachment.originalFileName)}
                            >
                              Descargar
                            </Button>
                            <Button 
                              size="small" 
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteFile(attachment.id, attachment.originalFileName)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <FileTextOutlined className="text-2xl mb-2 block" />
                      No hay material subido aún
                    </div>
                  )}
                </div>
                <Button 
                  type="dashed" 
                  size="small" 
                  icon={<PlusOutlined />} 
                  className="w-full mt-3"
                  onClick={handleAddMaterial}
                >
                  Añadir Material
                </Button>
              </div>

              {/* Entregas de Estudiantes */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-3 flex items-center">
                  <UserOutlined className="mr-2" />
                  Entregas de Estudiantes
                </h4>
                <div className="space-y-2">
                  {getStudentSubmissions().length > 0 ? (
                    getStudentSubmissions().map((submission) => (
                      <div key={submission.id} className="bg-white rounded p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{submission.originalFileName}</div>
                            <div className="text-xs text-gray-500">
                              {formatFileSize(submission.fileSize)} • {getRelativeTime(submission.uploadedAt)}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              size="small" 
                              type="text"
                              icon={<EyeOutlined />}
                              onClick={() => handleViewFile(submission.originalFileName)}
                            >
                              Ver
                            </Button>
                            <Button 
                              size="small" 
                              type="text"
                              icon={<DownloadOutlined />}
                              onClick={() => handleDownloadSubmissionFile(submission.id, submission.originalFileName)}
                            >
                              Descargar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <UserOutlined className="text-2xl mb-2 block" />
                      No hay entregas de estudiantes aún
                    </div>
                  )}
                </div>
                <div className="text-center mt-3">
                  <Text type="secondary" className="text-xs">
                    {getStudentSubmissions().length} entregas recibidas
                  </Text>
                </div>
              </div>

              {/* Recursos Adicionales */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-3 flex items-center">
                  <FileTextOutlined className="mr-2" />
                  Recursos Adicionales
                </h4>
                <div className="space-y-2">
                  {getResourceAttachments().length > 0 ? (
                    getResourceAttachments().slice(0, 2).map((attachment) => (
                      <div key={`resource-${attachment.id}`} className="bg-white rounded p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{attachment.originalFileName}</div>
                            <div className="text-xs text-gray-500">
                              {formatFileSize(attachment.fileSize)} • {getRelativeTime(attachment.uploadedAt)}
                            </div>
                          </div>
                          <Button 
                            size="small" 
                            type="text"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownloadFile(attachment.id, attachment.originalFileName)}
                          >
                            Descargar
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <FileTextOutlined className="text-2xl mb-2 block" />
                      No hay recursos adicionales
                    </div>
                  )}
                </div>
                <Button 
                  type="dashed" 
                  size="small" 
                  icon={<PlusOutlined />} 
                  className="w-full mt-3"
                  onClick={handleAddResource}
                >
                  Añadir Recurso
                </Button>
              </div>
            </div>
          ) : (
            /* LIST VIEW */
            <div className="space-y-6">
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-lg">📁 Todos los Archivos de la Tarea</h3>
                  <p className="text-sm text-gray-600">Vista de lista con detalles completos</p>
                </div>
                <div className="divide-y">
                  {/* Material del Profesor - List View */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-800 flex items-center">
                        <FileTextOutlined className="mr-2" />
                        Material del Profesor
                      </h4>
                      <Button 
                        type="dashed" 
                        size="small" 
                        icon={<PlusOutlined />}
                        onClick={handleAddMaterial}
                      >
                        Añadir Material
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {getTeacherAttachments().length > 0 ? (
                        getTeacherAttachments().map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded border-l-4 border-blue-400">
                            <div className="flex items-center space-x-4">
                              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                <FileTextOutlined className="text-blue-600 text-sm" />
                              </div>
                              <div>
                                <div className="font-medium">{attachment.originalFileName}</div>
                                <div className="text-sm text-gray-500">
                                  Material del profesor • {formatFileSize(attachment.fileSize)} • {getRelativeTime(attachment.uploadedAt)}
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                size="small" 
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownloadFile(attachment.id, attachment.originalFileName)}
                              >
                                Descargar
                              </Button>
                              <Button 
                                size="small" 
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteFile(attachment.id, attachment.originalFileName)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <FileTextOutlined className="text-3xl mb-2 block" />
                          <p>No hay material del profesor subido aún</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Entregas de Estudiantes - List View */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-green-800 flex items-center">
                        <UserOutlined className="mr-2" />
                        Entregas de Estudiantes
                      </h4>
                      <div className="text-sm text-gray-600">
                        {getStudentSubmissions().length} entregas recibidas
                      </div>
                    </div>
                    <div className="space-y-2">
                      {getStudentSubmissions().length > 0 ? (
                        getStudentSubmissions().map((submission) => (
                          <div key={submission.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded border-l-4 border-green-400">
                            <div className="flex items-center space-x-4">
                              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                                <UserOutlined className="text-green-600 text-sm" />
                              </div>
                              <div>
                                <div className="font-medium">{submission.originalFileName}</div>
                                <div className="text-sm text-gray-500">
                                  Entrega de estudiante • {formatFileSize(submission.fileSize)} • {getRelativeTime(submission.uploadedAt)}
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                size="small" 
                                icon={<EyeOutlined />}
                                onClick={() => handleViewFile(submission.originalFileName)}
                              >
                                Ver
                              </Button>
                              <Button 
                                size="small" 
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownloadSubmissionFile(submission.id, submission.originalFileName)}
                              >
                                Descargar
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <UserOutlined className="text-3xl mb-2 block" />
                          <p>No hay entregas de estudiantes aún</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recursos Adicionales - List View */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-purple-800 flex items-center">
                        <FileTextOutlined className="mr-2" />
                        Recursos Adicionales
                      </h4>
                      <Button 
                        type="dashed" 
                        size="small" 
                        icon={<PlusOutlined />}
                        onClick={handleAddResource}
                      >
                        Añadir Recurso
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded border-l-4 border-purple-400">
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                            <FileTextOutlined className="text-purple-600 text-sm" />
                          </div>
                          <div>
                            <div className="font-medium">Referencias.pdf</div>
                            <div className="text-sm text-gray-500">Recurso adicional • 5.2 MB • Hace 1 día</div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="small" 
                            onClick={() => handleDownloadFile('Referencias.pdf')}
                          >
                            Descargar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                type={viewMode === 'list' ? 'primary' : 'default'}
                onClick={() => {
                  console.log('🔥 Changing to list view');
                  setViewMode('list');
                }}
              >
                Vista en Lista
              </Button>
              <Button 
                type={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => {
                  console.log('🔥 Changing to grid view');
                  setViewMode('grid');
                }}
              >
                Vista en Grid
              </Button>
              <Button onClick={handleCreateFolder}>
                Crear Carpeta
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDownloadAll}>
                Descargar Todo
              </Button>
              <Button 
                type="primary"
                onClick={handleManagePermissions}
              >
                Gestionar Permisos
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Additional Information */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card size="small" title="Material del Profesor">
          <Text className="text-gray-600">
            Archivos que has compartido con los estudiantes para esta tarea.
          </Text>
        </Card>
        
        <Card size="small" title="Entregas de Estudiantes">
          <Text className="text-gray-600">
            Trabajos subidos por los estudiantes. Puedes descargarlos y evaluarlos.
          </Text>
        </Card>
        
        <Card size="small" title="Recursos Adicionales">
          <Text className="text-gray-600">
            Material de apoyo, referencias y otros recursos relacionados.
          </Text>
        </Card>
      </div>
    </div>
  );
};

export default TaskAttachmentsPage;