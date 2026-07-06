import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Layout,
  Breadcrumb,
  Button,
  Space,
  Input,
  Select,
  Row,
  Col,
  Tabs,
  Card,
  Empty,
  Spin,
  Modal,
  message,
  Dropdown,
  Badge,
  Typography,
  Divider,
  Tag,
  Form,
  Upload
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  AppstoreOutlined,
  BarsOutlined,
  FolderOutlined,
  FileOutlined,
  HomeOutlined,
  MoreOutlined,
  ReloadOutlined,
  SettingOutlined,
  EditOutlined,
  UploadOutlined,
  FileTextOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useLessonsWorkspace, useLessonsFolder, useLessonsResource } from '../../hooks/useLessons';
import useSubjects from '../../hooks/useSubjects';
import LessonsWorkspaceCard from '../../components/lessons/LessonsWorkspaceCard';
import LessonsFolderCard from '../../components/lessons/LessonsFolderCard';
import LessonsResourceCard from '../../components/lessons/LessonsResourceCard';
import LessonsResourceViewer from '../../components/lessons/LessonsResourceViewer';
import TsxArtifactViewer from '../../components/lessons/TsxArtifactViewer';
import SortableResourceCard from '../../components/lessons/SortableResourceCard';
import TsxTemplateHelper from '../../components/lessons/TsxTemplateHelper';
import type {
  LessonWorkspace,
  LessonFolder,
  LessonResource,
  LessonResourceType,
  LessonResourceVisibility,
  LessonsViewMode,
  LessonResourceFilters,
  CreateLessonWorkspaceRequest,
  CreateLessonFolderRequest,
  CreateLessonResourceRequest
} from '../../types/lessons';

const { Content, Sider } = Layout;
const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface NavigationState {
  currentWorkspace: LessonWorkspace | null;
  currentFolder: LessonFolder | null;
  breadcrumbs: Array<{ title: string; key: string; onClick?: () => void }>;
}

const LessonsMainPage: React.FC = () => {
  console.log('🔥 LessonsMainPage component is rendering!');
  const { user } = useAuth();
  const [navigation, setNavigation] = useState<NavigationState>({
    currentWorkspace: null,
    currentFolder: null,
    breadcrumbs: [{ title: 'Lecciones y Recursos', key: 'home' }]
  });

  const [viewMode, setViewMode] = useState<LessonsViewMode>({
    view: 'list',
    sortBy: 'orderIndex',
    sortOrder: 'asc'
  });

  const [filters, setFilters] = useState<LessonResourceFilters>({
    search: '',
    type: 'all',
    visibility: 'all',
    tags: [],
    isActive: true,
    includeShared: false,
    ownOnly: false
  });

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'workspace' | 'folder' | 'resource'>('workspace');
  const [createLoading, setCreateLoading] = useState(false);
  const [editingResource, setEditingResource] = useState<LessonResource | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTsxEditModal, setShowTsxEditModal] = useState(false);
  const [previewingResource, setPreviewingResource] = useState<LessonResource | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<string>('');
  const [uploadedTsxFile, setUploadedTsxFile] = useState<File | null>(null);
  const [showTsxTemplateHelper, setShowTsxTemplateHelper] = useState(false);
  
  // Form instances
  const [workspaceForm] = Form.useForm();
  const [folderForm] = Form.useForm();
  const [resourceForm] = Form.useForm();
  const [editResourceForm] = Form.useForm();

  // Drag and Drop sensors - simplified to avoid initialization issues
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // API Hooks
  const {
    workspaces,
    loading: workspacesLoading,
    error: workspacesError,
    createWorkspace,
    deleteWorkspace,
    archiveWorkspace,
    unarchiveWorkspace,
    cloneWorkspace,
    refetch: refetchWorkspaces
  } = useLessonsWorkspace({
    includeStats: true,
    includeFolders: false,
    // No incluir isArchived para mostrar todos los workspaces no archivados por defecto
  });

  // Debug log para workspaces
  console.log('🎯 Workspaces data:', workspaces);
  console.log('🎯 Workspaces loading:', workspacesLoading);
  console.log('🎯 Workspaces error:', workspacesError);

  const {
    folders,
    loading: foldersLoading,
    error: foldersError,
    createFolder,
    updateFolder,
    deleteFolder,
    reorderFolders,
    refetch: refetchFolders
  } = useLessonsFolder({
    workspaceId: navigation.currentWorkspace?.id,
    isActive: true,
    includeStats: true,
    sortBy: viewMode.sortBy === 'orderIndex' ? 'orderIndex' : viewMode.sortBy,
    sortOrder: viewMode.sortOrder === 'asc' ? 'ASC' : 'DESC'
  });

  const {
    resources,
    pagination,
    loading: resourcesLoading,
    error: resourcesError,
    createResource,
    updateResource,
    deleteResource,
    shareResource,
    reorderResources,
    refetch: refetchResources
  } = useLessonsResource({
    folderId: navigation.currentFolder?.id,
    search: filters.search || undefined,
    type: filters.type !== 'all' ? filters.type as LessonResourceType : undefined,
    visibility: filters.visibility !== 'all' ? filters.visibility as LessonResourceVisibility : undefined,
    isActive: filters.isActive,
    includeShared: filters.includeShared,
    ownOnly: filters.ownOnly,
    page: 1,
    limit: 20,
    sortBy: viewMode.sortBy,
    sortOrder: viewMode.sortOrder === 'asc' ? 'ASC' : 'DESC'
  });

  // Filter resources to prevent undefined errors - MOVED after resources hook
  const validResources = resources.filter(resource => resource && resource.id);

  // Subjects Hook for workspace creation
  const {
    teacherSubjects,
    loading: subjectsLoading,
    fetchTeacherSubjects
  } = useSubjects();

  // Fetch teacher subjects when user is available
  useEffect(() => {
    if (user?.teacherId) {
      fetchTeacherSubjects(user.teacherId);
    }
  }, [user?.teacherId]);

  // Navigation handlers
  const handleWorkspaceSelect = (workspace: LessonWorkspace) => {
    setNavigation({
      currentWorkspace: workspace,
      currentFolder: null,
      breadcrumbs: [
        { title: 'Lecciones y Recursos', key: 'home', onClick: () => navigateToHome() },
        { title: workspace.subject?.name || 'Workspace', key: workspace.id }
      ]
    });
    setSelectedItems(new Set());
  };

  const handleFolderSelect = (folder: LessonFolder) => {
    setNavigation(prev => ({
      ...prev,
      currentFolder: folder,
      breadcrumbs: [
        { title: 'Lecciones y Recursos', key: 'home', onClick: () => navigateToHome() },
        { 
          title: prev.currentWorkspace?.subject?.name || 'Workspace', 
          key: prev.currentWorkspace?.id || 'workspace',
          onClick: () => navigateToWorkspace()
        },
        { title: folder.name, key: folder.id }
      ]
    }));
    setSelectedItems(new Set());
  };

  const navigateToHome = () => {
    setNavigation({
      currentWorkspace: null,
      currentFolder: null,
      breadcrumbs: [{ title: 'Lecciones y Recursos', key: 'home' }]
    });
    setSelectedItems(new Set());
  };

  const navigateToWorkspace = () => {
    if (navigation.currentWorkspace) {
      setNavigation(prev => ({
        ...prev,
        currentFolder: null,
        breadcrumbs: [
          { title: 'Lecciones y Recursos', key: 'home', onClick: () => navigateToHome() },
          { title: prev.currentWorkspace?.subject?.name || 'Workspace', key: prev.currentWorkspace?.id || 'workspace' }
        ]
      }));
      setSelectedItems(new Set());
    }
  };

  // Filter handlers
  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: keyof LessonResourceFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Create handlers
  const handleCreateClick = (type: 'workspace' | 'folder' | 'resource') => {
    setCreateType(type);
    setShowCreateModal(true);
  };

  // Form submission handlers
  const handleWorkspaceSubmit = async (values: any) => {
    try {
      setCreateLoading(true);
      const workspaceData: CreateLessonWorkspaceRequest = {
        subjectAssignmentId: values.subjectAssignmentId,
        isActive: true
      };
      
      const newWorkspace = await createWorkspace(workspaceData);
      setShowCreateModal(false);
      workspaceForm.resetFields();
      refetchWorkspaces();
      
      message.success('Workspace creado exitosamente');
      
      // Navigate to the new workspace
      handleWorkspaceSelect(newWorkspace);
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      message.error('Error al crear workspace: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleFolderSubmit = async (values: any) => {
    if (!navigation.currentWorkspace) return;
    
    try {
      setCreateLoading(true);
      const folderData: CreateLessonFolderRequest = {
        name: values.name,
        description: values.description,
        isActive: true
      };
      
      const newFolder = await createFolder(navigation.currentWorkspace.id, folderData);
      setShowCreateModal(false);
      folderForm.resetFields();
      refetchFolders();
      
      message.success('Lección creada exitosamente');
    } catch (error: any) {
      console.error('Error creating folder:', error);
      message.error('Error al crear lección: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResourceSubmit = async (values: any) => {
    if (!navigation.currentFolder) return;
    
    try {
      setCreateLoading(true);
      
      // Prepare basic resource data
      const resourceData: CreateLessonResourceRequest = {
        name: values.name,
        description: values.description,
        type: values.type,
        visibility: values.visibility,
        tags: values.tags || [],
        isActive: true
      };

      // If it's a TSX resource and we have an uploaded file, read the content
      if (values.type === 'TSX_ARTIFACT' && uploadedTsxFile) {
        try {
          message.loading('🔧 Aplicando auto-correcciones y validando archivo TSX...', 0);
          const { validateTsxCode, sanitizeTsxCode } = await import('../../utils/tsxValidator');
          const { autoFixTsxCode } = await import('../../utils/tsxAutoFixer');
          
          const tsxContent = await readTsxFileContent(uploadedTsxFile);
          
          // STEP 1: Apply auto-fixes FIRST
          const autoFixResult = autoFixTsxCode(tsxContent);
          const codeToValidate = autoFixResult.wasFixed ? autoFixResult.fixedCode! : tsxContent;
          
          console.log('🔧 Auto-fixes applied in submission:', autoFixResult.fixesApplied);
          console.log('🎯 Code after auto-fix:', codeToValidate.substring(0, 200) + '...');
          
          // STEP 2: Then validate the auto-fixed code
          const validation = validateTsxCode(codeToValidate);
          if (!validation.isValid) {
            message.destroy();
            
            // Show detailed error with remaining issues after auto-fix
            const errorDetails = [
              ...validation.errors,
              ...(autoFixResult.remainingIssues || [])
            ];
            
            message.error({
              content: `TSX contiene errores que no pudieron corregirse automáticamente: ${errorDetails.slice(0, 3).join(', ')}${errorDetails.length > 3 ? ` y ${errorDetails.length - 3} más...` : ''}`,
              duration: 8
            });
            setCreateLoading(false);
            return;
          }

          // Use auto-fixed and validated code
          const finalCode = validation.sanitizedCode || sanitizeTsxCode(codeToValidate);
          
          // Store the auto-fixed and sanitized code
          resourceData.content = finalCode;
          resourceData.sourceCode = finalCode; // Backup field for compatibility
          
          message.destroy();
          
          if (autoFixResult.wasFixed) {
            message.success(`✅ TSX procesado exitosamente. ${autoFixResult.fixesApplied.length} correcciones aplicadas automáticamente.`);
          } else {
            message.success('✅ Archivo TSX validado y procesado correctamente');
          }
        } catch (tsxError: any) {
          message.destroy();
          message.error(`Error al procesar el archivo TSX: ${tsxError.message}`);
          setCreateLoading(false);
          return;
        }
      }
      
      await createResource(navigation.currentFolder.id, resourceData);
      setShowCreateModal(false);
      resourceForm.resetFields();
      setSelectedResourceType(null);
      setUploadedTsxFile(null);
      refetchResources();
      
      message.success('Recurso creado exitosamente');
    } catch (error: any) {
      console.error('Error creating resource:', error);
      message.error('Error al crear recurso: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleModalCancel = () => {
    setShowCreateModal(false);
    workspaceForm.resetFields();
    folderForm.resetFields();
    resourceForm.resetFields();
    setSelectedResourceType('');
    setUploadedTsxFile(null);
  };

  // TSX file upload handlers
  const handleTsxFileUpload = async (file: File) => {
    // Import validators and auto-fixer
    const { validateTsxFile, validateTsxCode } = await import('../../utils/tsxValidator');
    const { autoFixTsxCode } = await import('../../utils/tsxAutoFixer');
    
    // Validate file first
    const fileValidation = validateTsxFile(file);
    if (!fileValidation.isValid) {
      message.error(`Archivo no válido: ${fileValidation.errors.join(', ')}`);
      return false;
    }

    try {
      // Read file content
      const content = await readTsxFileContent(file);
      console.log('📝 Original TSX content length:', content.length);
      
      // Try to auto-fix the code
      const autoFixResult = autoFixTsxCode(content);
      
      if (autoFixResult.wasFixed) {
        console.log('🔧 Auto-fix applied:', autoFixResult.fixesApplied);
        
        // Show auto-correction confirmation modal
        Modal.confirm({
          title: '🔧 Código TSX Auto-Corregido',
          width: 900,
          content: (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Text>Se han aplicado las siguientes correcciones automáticas:</Text>
              </div>
              
              <div style={{ 
                maxHeight: 200, 
                overflowY: 'auto', 
                marginBottom: 16,
                padding: 12,
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 6
              }}>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {autoFixResult.fixesApplied.map((fix, index) => (
                    <li key={index} style={{ color: '#52c41a', marginBottom: 4 }}>
                      ✅ {fix}
                    </li>
                  ))}
                </ul>
              </div>
              
              {autoFixResult.remainingIssues.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Text type="warning" style={{ fontWeight: 'bold' }}>Problemas restantes:</Text>
                  <div style={{ 
                    maxHeight: 120, 
                    overflowY: 'auto', 
                    marginTop: 8,
                    padding: 12,
                    backgroundColor: '#fffbe6',
                    border: '1px solid #ffe58f',
                    borderRadius: 6
                  }}>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {autoFixResult.remainingIssues.map((issue, index) => (
                        <li key={index} style={{ color: '#fa8c16', marginBottom: 4 }}>
                          ⚠️ {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div style={{ 
                maxHeight: 250,
                overflow: 'auto',
                backgroundColor: '#f6f8fa', 
                padding: 12, 
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 12,
                border: '1px solid #e1e4e8'
              }}>
                <Text strong>Vista previa del código corregido:</Text>
                <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>
                  {autoFixResult.fixedCode?.substring(0, 800)}
                  {autoFixResult.fixedCode && autoFixResult.fixedCode.length > 800 && '\n\n... (código completo se usará)'}
                </pre>
              </div>
            </div>
          ),
          okText: '✅ Usar Código Corregido',
          cancelText: '📋 Ver Plantillas Seguras',
          onOk: () => {
            // Create a new file with the corrected code
            const correctedBlob = new Blob([autoFixResult.fixedCode || content], { type: 'text/plain' });
            const correctedFile = new File([correctedBlob], file.name, { type: file.type });
            setUploadedTsxFile(correctedFile);
            
            message.success(`✅ Archivo ${file.name} auto-corregido y listo para usar`);
          },
          onCancel: () => {
            // Show template helper instead
            setShowTsxTemplateHelper(true);
          }
        });
        
        return false;
      }
      
      // If no fixes were needed, validate normally
      const codeValidation = validateTsxCode(content);
      
      if (!codeValidation.isValid) {
        console.error('❌ TSX validation failed:', codeValidation.errors);
        
        // Show error with options for templates
        Modal.error({
          title: '❌ Código TSX con Problemas Críticos',
          width: 800,
          content: (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Text>Se encontraron problemas críticos que no pudieron ser corregidos automáticamente:</Text>
              </div>
              
              <div style={{ 
                maxHeight: 200, 
                overflowY: 'auto', 
                marginBottom: 16,
                padding: 12,
                backgroundColor: '#fff2f0',
                border: '1px solid #ffccc7',
                borderRadius: 6
              }}>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {codeValidation.errors.map((error, index) => (
                    <li key={index} style={{ color: '#ff4d4f', marginBottom: 4 }}>
                      ❌ {error}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div style={{ 
                padding: 16, 
                backgroundColor: '#e6f7ff', 
                border: '1px solid #91d5ff',
                borderRadius: 6,
                marginBottom: 16
              }}>
                <Text style={{ color: '#1890ff' }}>
                  💡 <strong>Opciones disponibles:</strong>
                </Text>
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  <li>✨ <strong>Ver Plantillas Seguras:</strong> Usa plantillas pre-validadas</li>
                  <li>🔧 <strong>Generar Componente Seguro:</strong> Crear componente básico con tu contenido</li>
                </ul>
              </div>
            </div>
          ),
          okText: '📋 Ver Plantillas Seguras',
          onOk: () => {
            setShowTsxTemplateHelper(true);
          }
        });
        
        return false;
      }
      
      // Show warnings if any (but allow upload)
      if (codeValidation.warnings.length > 0) {
        Modal.warning({
          title: '⚠️ Advertencias en el código TSX',
          content: (
            <div>
              <p>Se detectaron patrones que podrían mejorarse:</p>
              <ul>
                {codeValidation.warnings.map((warning, index) => (
                  <li key={index} style={{ color: '#fa8c16', marginBottom: 4 }}>
                    ⚠️ {warning}
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: 16, color: '#52c41a' }}>
                ✅ El archivo se cargará correctamente, pero considera revisar estos elementos.
              </p>
            </div>
          )
        });
      }

      setUploadedTsxFile(file);
      message.success(`✅ Archivo ${file.name} validado y cargado correctamente`);
      return false; // Prevent auto upload
      
    } catch (error: any) {
      console.error('❌ Error processing TSX file:', error);
      
      // Show error with template option
      Modal.error({
        title: '❌ Error al Procesar Archivo TSX',
        content: (
          <div>
            <p>No se pudo procesar el archivo TSX:</p>
            <p style={{ color: '#ff4d4f', fontFamily: 'monospace', backgroundColor: '#fff2f0', padding: 8, borderRadius: 4 }}>
              {error.message}
            </p>
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              backgroundColor: '#e6f7ff', 
              border: '1px solid #91d5ff',
              borderRadius: 4
            }}>
              <Text style={{ color: '#1890ff' }}>
                💡 <strong>Solución recomendada:</strong> Usa las plantillas TSX seguras para evitar errores de sintaxis y seguridad.
              </Text>
            </div>
          </div>
        ),
        okText: '📋 Ver Plantillas Seguras',
        onOk: () => {
          setShowTsxTemplateHelper(true);
        }
      });
      
      return false;
    }
  };

  const readTsxFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  };

  // Resource editing handlers
  const handleResourceEdit = (resource: LessonResource) => {
    console.log('🔧 handleResourceEdit called with resource:', resource);
    console.log('🔧 Resource type:', resource.type);
    
    // Set editing resource first
    setEditingResource(resource);
    
    // For TSX components, open code editor instead of metadata editor
    if (resource.type === 'TSX_ARTIFACT') {
      console.log('🔧 Opening TSX editor modal for resource:', resource.name);
      console.log('🔧 Setting showTsxEditModal to true');
      // Use setTimeout to ensure state is set after editingResource
      setTimeout(() => {
        setShowTsxEditModal(true);
        console.log('🔧 TSX modal should now be open');
      }, 0);
    } else {
      console.log('🔧 Opening regular edit modal');
      setShowEditModal(true);
      // Pre-fill form with resource data
      editResourceForm.setFieldsValue({
        name: resource.name,
        description: resource.description,
        type: resource.type,
        visibility: resource.visibility,
        tags: resource.tags || []
      });
    }
  };

  const handleResourceEditSubmit = async (values: any) => {
    if (!editingResource) return;
    
    try {
      setCreateLoading(true);
      const updateData = {
        name: values.name,
        description: values.description,
        visibility: values.visibility,
        tags: values.tags || []
      };
      
      await updateResource(editingResource.id, updateData);
      setShowEditModal(false);
      editResourceForm.resetFields();
      setEditingResource(null);
      refetchResources();
      
      message.success('Recurso actualizado exitosamente');
    } catch (error: any) {
      console.error('Error updating resource:', error);
      message.error('Error al actualizar recurso: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditModalCancel = () => {
    setShowEditModal(false);
    editResourceForm.resetFields();
    setEditingResource(null);
  };

  // TSX editing handlers
  const handleTsxCodeSave = async (sourceCode: string) => {
    if (!editingResource) return;
    
    console.log('🎯🎯🎯 [handleTsxCodeSave] SAVE OPERATION DEBUG SESSION START 🎯🎯🎯');
    console.log('🎯 [handleTsxCodeSave] Editing resource ID:', editingResource.id);
    console.log('🎯 [handleTsxCodeSave] Editing resource name:', editingResource.name);
    console.log('🎯 [handleTsxCodeSave] Current sourceCode in resource:', editingResource.sourceCode?.length || 'undefined');
    console.log('🎯 [handleTsxCodeSave] NEW sourceCode to save:', sourceCode);
    console.log('🎯 [handleTsxCodeSave] NEW sourceCode length:', sourceCode.length);
    console.log('🎯 [handleTsxCodeSave] NEW sourceCode content preview:', sourceCode.substring(0, 200) + '...');
    
    try {
      setCreateLoading(true);
      const updateData = {
        sourceCode: sourceCode
      };
      
      console.log('🎯 [handleTsxCodeSave] About to call updateResource with data:', updateData);
      console.log('🎯 [handleTsxCodeSave] updateResource function type:', typeof updateResource);
      
      const result = await updateResource(editingResource.id, updateData);
      
      console.log('🎯 [handleTsxCodeSave] updateResource completed successfully');
      console.log('🎯 [handleTsxCodeSave] Result received:', result);
      console.log('🎯 [handleTsxCodeSave] Result sourceCode field:', result?.sourceCode?.length || 'undefined');
      
      setShowTsxEditModal(false);
      setEditingResource(null);
      refetchResources();
      
      message.success('Código TSX actualizado exitosamente');
      console.log('🎯 [handleTsxCodeSave] Success message shown, operation completed');
    } catch (error: any) {
      console.error('❌ [handleTsxCodeSave] Error updating TSX code:', error);
      console.error('❌ [handleTsxCodeSave] Error response:', error.response);
      console.error('❌ [handleTsxCodeSave] Error data:', error.response?.data);
      message.error('Error al actualizar código TSX: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreateLoading(false);
      console.log('🎯🎯🎯 [handleTsxCodeSave] SAVE OPERATION DEBUG SESSION END 🎯🎯🎯');
    }
  };

  const handleTsxEditCancel = () => {
    setShowTsxEditModal(false);
    setEditingResource(null);
  };

  // TSX Template helper handlers
  const handleUseTemplate = (templateCode: string, filename: string) => {
    // Create a file-like object from the template
    const blob = new Blob([templateCode], { type: 'text/plain' });
    const file = new File([blob], filename, { type: 'text/plain' });
    
    setUploadedTsxFile(file);
    message.success(`Template ${filename} cargado correctamente`);
  };

  // Resource preview handlers
  const handleResourcePreview = (resource: LessonResource) => {
    setPreviewingResource(resource);
    setShowPreviewModal(true);
  };

  const handlePreviewModalClose = () => {
    setShowPreviewModal(false);
    setPreviewingResource(null);
  };

  const handleResourceDelete = async (resource: LessonResource) => {
    try {
      Modal.confirm({
        title: '¿Eliminar recurso?',
        content: `¿Estás seguro de que deseas eliminar el recurso "${resource.name}"? Esta acción no se puede deshacer.`,
        okText: 'Eliminar',
        okType: 'danger',
        cancelText: 'Cancelar',
        onOk: async () => {
          await deleteResource(resource.id);
          message.success('Recurso eliminado exitosamente');
          refetchResources();
        }
      });
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      message.error('Error al eliminar recurso: ' + (error.response?.data?.message || error.message));
    }
  };

  // Drag and Drop handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !navigation.currentFolder) return;

    if (active.id !== over.id) {
      const oldIndex = validResources.findIndex(resource => resource.id === active.id);
      const newIndex = validResources.findIndex(resource => resource.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Optimistically update the UI
        const newResources = arrayMove(validResources, oldIndex, newIndex);
        const resourceIds = newResources.map(resource => resource.id);

        try {
          await reorderResources(navigation.currentFolder.id, resourceIds);
          message.success('Orden actualizado exitosamente');
          refetchResources();
        } catch (error: any) {
          console.error('Error reordering resources:', error);
          message.error('Error al reordenar recursos: ' + (error.response?.data?.message || error.message));
          // Refetch to restore original order
          refetchResources();
        }
      }
    }
  };

  // Delete handlers
  const handleWorkspaceDelete = async (workspace: LessonWorkspace) => {
    try {
      Modal.confirm({
        title: '¿Eliminar workspace?',
        content: `¿Estás seguro de que deseas eliminar el workspace "${workspace.subject?.name} - ${workspace.classGroup?.name}"? Esta acción no se puede deshacer.`,
        okText: 'Eliminar',
        okType: 'danger',
        cancelText: 'Cancelar',
        onOk: async () => {
          await deleteWorkspace(workspace.id);
          message.success('Workspace eliminado exitosamente');
          refetchWorkspaces();
          // Clear navigation if this was the current workspace
          if (navigation.currentWorkspace?.id === workspace.id) {
            navigateToHome();
          }
        }
      });
    } catch (error: any) {
      console.error('Error deleting workspace:', error);
      message.error('Error al eliminar workspace: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleWorkspaceArchive = async (workspace: LessonWorkspace) => {
    try {
      Modal.confirm({
        title: '¿Archivar workspace?',
        content: `¿Estás seguro de que deseas archivar el workspace "${workspace.subject?.name} - ${workspace.classGroup?.name}"? Podrás restaurarlo más tarde.`,
        okText: 'Archivar',
        okType: 'primary',
        cancelText: 'Cancelar',
        onOk: async () => {
          await archiveWorkspace(workspace.id);
          message.success('Workspace archivado exitosamente');
          refetchWorkspaces();
          // Clear navigation if this was the current workspace
          if (navigation.currentWorkspace?.id === workspace.id) {
            navigateToHome();
          }
        }
      });
    } catch (error: any) {
      console.error('Error archiving workspace:', error);
      message.error('Error al archivar workspace: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleWorkspaceUnarchive = async (workspace: LessonWorkspace) => {
    try {
      Modal.confirm({
        title: '¿Restaurar workspace?',
        content: `¿Estás seguro de que deseas restaurar el workspace "${workspace.subject?.name} - ${workspace.classGroup?.name}"?`,
        okText: 'Restaurar',
        okType: 'primary',
        cancelText: 'Cancelar',
        onOk: async () => {
          await unarchiveWorkspace(workspace.id);
          message.success('Workspace restaurado exitosamente');
          refetchWorkspaces();
        }
      });
    } catch (error: any) {
      console.error('Error unarchiving workspace:', error);
      message.error('Error al restaurar workspace: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleWorkspaceClone = async (workspace: LessonWorkspace) => {
    // TODO: Add academic year selection modal
    try {
      Modal.confirm({
        title: '¿Clonar workspace?',
        content: `¿Estás seguro de que deseas clonar el workspace "${workspace.subject?.name} - ${workspace.classGroup?.name}" para el siguiente curso académico? Se creará una copia exacta con estructura vacía.`,
        okText: 'Clonar',
        okType: 'primary',
        cancelText: 'Cancelar',
        onOk: async () => {
          // For now, use a placeholder academic year ID
          // TODO: Replace with actual academic year selection
          const newAcademicYearId = 'next-year-placeholder';
          await cloneWorkspace(workspace.id, newAcademicYearId);
          message.success('Workspace clonado exitosamente para el siguiente curso');
          refetchWorkspaces();
        }
      });
    } catch (error: any) {
      console.error('Error cloning workspace:', error);
      message.error('Error al clonar workspace: ' + (error.response?.data?.message || error.message));
    }
  };

  // Selection handlers
  const handleItemSelect = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Get current view content
  const getCurrentContent = () => {
    if (!navigation.currentWorkspace) {
      // Show workspaces
      return (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <Title level={3} className="mb-2">Mis Espacios de Trabajo</Title>
              <Text type="secondary">
                Organiza tus lecciones por asignatura y clase
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleCreateClick('workspace')}
              size="large"
            >
              Nuevo Workspace
            </Button>
          </div>

          {workspacesLoading ? (
            <div className="flex justify-center py-12">
              <Spin size="large" />
            </div>
          ) : workspacesError ? (
            <div className="text-center py-12">
              <Text type="danger">{workspacesError}</Text>
              <div className="mt-4">
                <Button onClick={refetchWorkspaces} icon={<ReloadOutlined />}>
                  Reintentar
                </Button>
              </div>
            </div>
          ) : workspaces.length === 0 ? (
            <Empty
              description="No tienes espacios de trabajo creados"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleCreateClick('workspace')}
              >
                Crear primer workspace
              </Button>
            </Empty>
          ) : (
            <div className="space-y-4">
              {/* Debug logging for workspaces */}
              {console.log('🚀 LessonsMainPage rendering workspaces:', workspaces)}
              {console.log('🚀 Workspaces length:', workspaces.length)}
              {workspaces.map(workspace => (
                <LessonsWorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onSelect={handleWorkspaceSelect}
                  onEdit={() => {}} // TODO: Implementar edición de workspace
                  onDelete={handleWorkspaceDelete}
                  onArchive={handleWorkspaceArchive}
                  onUnarchive={handleWorkspaceUnarchive}
                  onClone={handleWorkspaceClone}
                  selected={selectedItems.has(workspace.id)}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (!navigation.currentFolder) {
      // Show folders
      return (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <Title level={3} className="mb-2">
                {navigation.currentWorkspace.subject?.name} - Lecciones
              </Title>
              <Text type="secondary">
                {navigation.currentWorkspace.classGroup?.name} - {navigation.currentWorkspace.teacher?.name}
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleCreateClick('folder')}
              size="large"
            >
              Nueva Lección
            </Button>
          </div>

          {foldersLoading ? (
            <div className="flex justify-center py-12">
              <Spin size="large" />
            </div>
          ) : foldersError ? (
            <div className="text-center py-12">
              <Text type="danger">{foldersError}</Text>
              <div className="mt-4">
                <Button onClick={refetchFolders} icon={<ReloadOutlined />}>
                  Reintentar
                </Button>
              </div>
            </div>
          ) : folders.length === 0 ? (
            <Empty
              description="No hay lecciones creadas en este workspace"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleCreateClick('folder')}
              >
                Crear primera lección
              </Button>
            </Empty>
          ) : (
            <div className="space-y-4">
              {folders.map(folder => (
                <LessonsFolderCard
                  key={folder.id}
                  folder={folder}
                  onSelect={handleFolderSelect}
                  selected={selectedItems.has(folder.id)}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // Show resources
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <Title level={3} className="mb-2">
              {navigation.currentFolder.name}
            </Title>
            <Text type="secondary">
              {navigation.currentFolder.description || 'Recursos de la lección'}
            </Text>
          </div>
          <Space>
            <Button
              icon={viewMode.view === 'grid' ? <BarsOutlined /> : <AppstoreOutlined />}
              onClick={() => setViewMode(prev => ({ 
                ...prev, 
                view: prev.view === 'grid' ? 'list' : 'grid' 
              }))}
            >
              {viewMode.view === 'grid' ? 'Lista' : 'Cuadrícula'}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleCreateClick('resource')}
              size="large"
            >
              Nuevo Recurso
            </Button>
          </Space>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Search
                placeholder="Buscar recursos..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onSearch={handleSearchChange}
                allowClear
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Tipo"
                value={filters.type}
                onChange={(value) => handleFilterChange('type', value)}
                className="w-full"
              >
                <Option value="all">Todos los tipos</Option>
                <Option value="FILE">Archivos</Option>
                <Option value="YOUTUBE_LINK">Videos</Option>
                <Option value="WEB_LINK">Enlaces</Option>
                <Option value="INTERNAL_DOC">Documentos</Option>
                <Option value="PRESENTATION">Presentaciones</Option>
                <Option value="TSX_ARTIFACT">Componentes</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="Visibilidad"
                value={filters.visibility}
                onChange={(value) => handleFilterChange('visibility', value)}
                className="w-full"
              >
                <Option value="all">Todas</Option>
                <Option value="PRIVATE">Privado</Option>
                <Option value="CLASS">Clase</Option>
                <Option value="SCHOOL">Escuela</Option>
                <Option value="PUBLIC">Público</Option>
              </Select>
            </Col>
            <Col xs={24} sm={24} md={8}>
              <Space wrap>
                <Button
                  type={filters.includeShared ? 'primary' : 'default'}
                  size="small"
                  onClick={() => handleFilterChange('includeShared', !filters.includeShared)}
                >
                  Compartidos conmigo
                </Button>
                <Button
                  type={filters.ownOnly ? 'primary' : 'default'}
                  size="small"
                  onClick={() => handleFilterChange('ownOnly', !filters.ownOnly)}
                >
                  Solo míos
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {resourcesLoading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" />
          </div>
        ) : resourcesError ? (
          <div className="text-center py-12">
            <Text type="danger">{resourcesError}</Text>
            <div className="mt-4">
              <Button onClick={refetchResources} icon={<ReloadOutlined />}>
                Reintentar
              </Button>
            </div>
          </div>
        ) : resources.length === 0 ? (
          <Empty
            description="No hay recursos en esta lección"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleCreateClick('resource')}
            >
              Agregar primer recurso
            </Button>
          </Empty>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={validResources.map(r => r.id)}
                strategy={viewMode.view === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
              >
                {viewMode.view === 'grid' ? (
                  <Row gutter={[16, 16]}>
                    {validResources.map(resource => (
                      <Col key={resource.id} xs={24} sm={12} md={8} lg={6}>
                        <SortableResourceCard
                          id={resource.id}
                          resource={resource}
                          selected={selectedItems.has(resource.id)}
                          viewMode="grid"
                          onPreview={handleResourcePreview}
                          onEdit={handleResourceEdit}
                          onDelete={handleResourceDelete}
                        />
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div className="space-y-2">
                    {validResources.map(resource => (
                      <SortableResourceCard
                        key={resource.id}
                        id={resource.id}
                        resource={resource}
                        selected={selectedItems.has(resource.id)}
                        viewMode="list"
                        onPreview={handleResourcePreview}
                        onEdit={handleResourceEdit}
                        onDelete={handleResourceDelete}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>
            </DndContext>

            {/* Pagination info */}
            {pagination && pagination.totalPages > 1 && (
              <div className="text-center mt-6">
                <Text type="secondary">
                  Mostrando {resources.length} de {pagination.total} recursos
                </Text>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Layout className="min-h-screen">
        <Content className="p-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <Breadcrumb className="mb-4">
              {navigation.breadcrumbs.map((crumb, index) => (
                <Breadcrumb.Item key={crumb.key}>
                  {crumb.onClick ? (
                    <Button type="link" onClick={crumb.onClick} className="p-0 h-auto">
                      {crumb.title}
                    </Button>
                  ) : (
                    <span>{crumb.title}</span>
                  )}
                </Breadcrumb.Item>
              ))}
            </Breadcrumb>

            {/* Quick stats */}
            {navigation.currentWorkspace && (
              <Row gutter={[16, 16]} className="mt-4">
                <Col span={6}>
                  <Card size="small">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {navigation.currentWorkspace.stats?.totalFolders || 0}
                      </div>
                      <div className="text-gray-500">Lecciones</div>
                    </div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {navigation.currentWorkspace.stats?.totalResources || 0}
                      </div>
                      <div className="text-gray-500">Recursos</div>
                    </div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {navigation.currentFolder?.stats?.totalViews || 0}
                      </div>
                      <div className="text-gray-500">Vistas</div>
                    </div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedItems.size}
                      </div>
                      <div className="text-gray-500">Seleccionados</div>
                    </div>
                  </Card>
                </Col>
              </Row>
            )}
          </div>

          {/* Main content */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${navigation.currentWorkspace?.id || 'home'}-${navigation.currentFolder?.id || 'workspace'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {getCurrentContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </Content>
      </Layout>

      {/* Create Modal */}
      <Modal
        title={`Crear ${createType === 'workspace' ? 'Workspace' : createType === 'folder' ? 'Lección' : 'Recurso'}`}
        open={showCreateModal}
        onCancel={handleModalCancel}
        footer={null}
        width={800}
        destroyOnClose={true}
      >
        {createType === 'workspace' && (
          <Form
            form={workspaceForm}
            layout="vertical"
            onFinish={handleWorkspaceSubmit}
            className="mt-6"
          >
            <Form.Item
              name="subjectAssignmentId"
              label="Asignatura y Clase"
              rules={[
                { required: true, message: 'Por favor selecciona una asignatura y clase' }
              ]}
            >
              <Select
                placeholder="Selecciona la asignatura y clase para este workspace"
                loading={subjectsLoading}
                optionFilterProp="children"
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {teacherSubjects.map(assignment => (
                  <Select.Option key={assignment.id} value={assignment.id}>
                    <div>
                      <strong>{assignment.subject.name}</strong>
                      <div style={{ color: '#666', fontSize: '12px' }}>
                        {assignment.classGroup.name}
                      </div>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <div className="text-right pt-4 border-t">
              <Space>
                <Button onClick={handleModalCancel}>
                  Cancelar
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={createLoading}
                  icon={<PlusOutlined />}
                >
                  Crear Workspace
                </Button>
              </Space>
            </div>
          </Form>
        )}

        {createType === 'folder' && (
          <Form
            form={folderForm}
            layout="vertical"
            onFinish={handleFolderSubmit}
            className="mt-6"
          >
            <Form.Item
              name="name"
              label="Nombre de la Lección"
              rules={[
                { required: true, message: 'Por favor ingresa el nombre de la lección' },
                { max: 100, message: 'El nombre no puede tener más de 100 caracteres' }
              ]}
            >
              <Input placeholder="Ej: Introducción a la suma" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Descripción"
              rules={[
                { max: 500, message: 'La descripción no puede tener más de 500 caracteres' }
              ]}
            >
              <Input.TextArea 
                rows={3}
                placeholder="Describe brevemente el contenido de esta lección..."
              />
            </Form.Item>

            <div className="text-right pt-4 border-t">
              <Space>
                <Button onClick={handleModalCancel}>
                  Cancelar
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={createLoading}
                  icon={<PlusOutlined />}
                >
                  Crear Lección
                </Button>
              </Space>
            </div>
          </Form>
        )}

        {createType === 'resource' && (
          <Form
            form={resourceForm}
            layout="vertical"
            onFinish={handleResourceSubmit}
            className="mt-6"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="Nombre del Recurso"
                  rules={[
                    { required: true, message: 'Por favor ingresa el nombre del recurso' },
                    { max: 200, message: 'El nombre no puede tener más de 200 caracteres' }
                  ]}
                >
                  <Input placeholder="Nombre del recurso" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label="Tipo de Recurso"
                  rules={[
                    { required: true, message: 'Por favor selecciona el tipo de recurso' }
                  ]}
                >
                  <Select 
                    placeholder="Selecciona el tipo"
                    onChange={(value) => setSelectedResourceType(value)}
                  >
                    <Select.Option value="FILE">Archivo</Select.Option>
                    <Select.Option value="YOUTUBE_LINK">Video de YouTube</Select.Option>
                    <Select.Option value="WEB_LINK">Enlace Web</Select.Option>
                    <Select.Option value="INTERNAL_DOC">Documento Interno</Select.Option>
                    <Select.Option value="PRESENTATION">Presentación</Select.Option>
                    <Select.Option value="TSX_ARTIFACT">Componente TSX</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="Descripción"
              rules={[
                { max: 1000, message: 'La descripción no puede tener más de 1000 caracteres' }
              ]}
            >
              <Input.TextArea 
                rows={3}
                placeholder="Describe el contenido del recurso..."
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="visibility"
                  label="Visibilidad"
                  rules={[
                    { required: true, message: 'Por favor selecciona la visibilidad' }
                  ]}
                  initialValue="CLASS"
                >
                  <Select placeholder="Selecciona la visibilidad">
                    <Select.Option value="PRIVATE">Privado</Select.Option>
                    <Select.Option value="CLASS">Solo esta clase</Select.Option>
                    <Select.Option value="SCHOOL">Toda la escuela</Select.Option>
                    <Select.Option value="PUBLIC">Público</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="tags"
                  label="Etiquetas"
                >
                  <Select
                    mode="tags"
                    placeholder="Añade etiquetas (opcional)"
                    tokenSeparators={[',']}
                  >
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* TSX File Upload Section - Conditional */}
            {selectedResourceType === 'TSX_ARTIFACT' && (
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <Text strong className="text-blue-600">
                        <CodeOutlined className="mr-2" />
                        Subir Archivo TSX
                      </Text>
                      <br />
                      <Text type="secondary" className="text-sm">
                        Puedes subir un archivo .tsx/.ts/.jsx existente o usar una plantilla segura.
                      </Text>
                    </div>
                    <Button 
                      type="dashed" 
                      size="small"
                      icon={<FileTextOutlined />}
                      onClick={() => setShowTsxTemplateHelper(true)}
                    >
                      Ver Plantillas
                    </Button>
                  </div>
                </div>
                
                <Space direction="vertical" className="w-full">
                  <Upload
                    accept=".tsx,.ts,.jsx"
                    beforeUpload={handleTsxFileUpload}
                    maxCount={1}
                    showUploadList={false}
                    fileList={[]}
                  >
                    <Button icon={<UploadOutlined />} className="w-full">
                      {uploadedTsxFile ? `Archivo cargado: ${uploadedTsxFile.name}` : 'Seleccionar archivo TSX'}
                    </Button>
                  </Upload>
                </Space>
                
                {uploadedTsxFile && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircleOutlined className="text-green-500 mr-2" />
                        <div>
                          <Text strong className="text-green-700">{uploadedTsxFile.name}</Text>
                          <br />
                          <Text className="text-green-600 text-xs">
                            {(uploadedTsxFile.size / 1024).toFixed(1)} KB - Listo para procesar
                          </Text>
                        </div>
                      </div>
                      <Button 
                        type="text" 
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => setUploadedTsxFile(null)}
                        className="text-red-500"
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-right pt-4 border-t">
              <Space>
                <Button onClick={handleModalCancel}>
                  Cancelar
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={createLoading}
                  icon={<PlusOutlined />}
                >
                  Crear Recurso
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Modal>

      {/* Edit Resource Modal */}
      <Modal
        title="Editar Recurso"
        open={showEditModal}
        onCancel={handleEditModalCancel}
        footer={null}
        width={800}
        destroyOnClose={true}
      >
        <Form
          form={editResourceForm}
          layout="vertical"
          onFinish={handleResourceEditSubmit}
          className="mt-6"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nombre del Recurso"
                rules={[
                  { required: true, message: 'Por favor ingresa el nombre del recurso' },
                  { max: 200, message: 'El nombre no puede tener más de 200 caracteres' }
                ]}
              >
                <Input placeholder="Nombre del recurso" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Tipo de Recurso"
              >
                <Select placeholder="Tipo de recurso" disabled>
                  <Select.Option value="FILE">Archivo</Select.Option>
                  <Select.Option value="YOUTUBE_LINK">Video de YouTube</Select.Option>
                  <Select.Option value="WEB_LINK">Enlace Web</Select.Option>
                  <Select.Option value="INTERNAL_DOC">Documento Interno</Select.Option>
                  <Select.Option value="PRESENTATION">Presentación</Select.Option>
                  <Select.Option value="TSX_ARTIFACT">Componente TSX</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Descripción"
            rules={[
              { max: 1000, message: 'La descripción no puede tener más de 1000 caracteres' }
            ]}
          >
            <Input.TextArea 
              rows={3}
              placeholder="Describe el contenido del recurso..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="visibility"
                label="Visibilidad"
                rules={[
                  { required: true, message: 'Por favor selecciona la visibilidad' }
                ]}
              >
                <Select placeholder="Selecciona la visibilidad">
                  <Select.Option value="PRIVATE">Privado</Select.Option>
                  <Select.Option value="CLASS">Solo esta clase</Select.Option>
                  <Select.Option value="SCHOOL">Toda la escuela</Select.Option>
                  <Select.Option value="PUBLIC">Público</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tags"
                label="Etiquetas"
              >
                <Select
                  mode="tags"
                  placeholder="Añade etiquetas (opcional)"
                  tokenSeparators={[',']}
                >
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className="text-right pt-4 border-t">
            <Space>
              <Button onClick={handleEditModalCancel}>
                Cancelar
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={createLoading}
                icon={<EditOutlined />}
              >
                Actualizar Recurso
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Resource Preview Modal */}
      {previewingResource && (
        <LessonsResourceViewer
          resource={previewingResource}
          visible={showPreviewModal}
          onClose={handlePreviewModalClose}
          onEdit={handleResourceEdit}
        />
      )}

      {/* TSX Code Editor Modal */}
      {(() => {
        console.log('🔧 TSX Modal render check:', {
          editingResource: !!editingResource,
          resourceType: editingResource?.type,
          showTsxEditModal: showTsxEditModal
        });
        return editingResource && editingResource.type === 'TSX_ARTIFACT' && (
          <Modal
            title={`Editar Código - ${editingResource.name}`}
            open={showTsxEditModal}
            onCancel={handleTsxEditCancel}
            width={1200}
            footer={null}
            destroyOnClose={true}
            className="tsx-editor-modal"
          >
            <TsxArtifactViewer
              resource={editingResource}
              editing={true}
              onSave={handleTsxCodeSave}
              onCancel={handleTsxEditCancel}
            />
          </Modal>
        );
      })()}

      {/* TSX Template Helper Modal */}
      <TsxTemplateHelper
        visible={showTsxTemplateHelper}
        onClose={() => setShowTsxTemplateHelper(false)}
        onUseTemplate={handleUseTemplate}
      />
    </div>
  );
};

export default LessonsMainPage;