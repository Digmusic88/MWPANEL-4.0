import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Button, 
  Input, 
  Select, 
  Switch, 
  Space,
  Typography,
  Row,
  Col,
  Spin,
  Empty,
  Pagination,
  message,
  Dropdown,
  MenuProps,
  Modal
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  AppstoreOutlined,
  BarsOutlined,
  FileTextOutlined,
  AudioOutlined,
  PictureOutlined,
  HeartOutlined,
  SettingOutlined,
  FileImageOutlined,
  BranchesOutlined,
  EditOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useStudentNotes, useNotesFilters, useNotesView } from '../../hooks/useStudentNotesReal';
import useSubjects from '../../hooks/useSubjects';
import apiClient from '@services/apiClient';
import { NoteType, StudentNote } from '../../types/student-notes';
import ApunteCard from '../../components/student-notes/ApunteCard';
import CreateNoteModal from '../../components/student-notes/CreateNoteModal';
import NotesStatistics from '../../components/student-notes/NotesStatistics';
import EditorIntegrado from '../../components/student-notes/EditorIntegrado';
import VoiceNoteModal from '../../components/student-notes/VoiceNoteModal';
import DrawingNoteModal from '../../components/student-notes/DrawingNoteModal';
import DrawingEditModal from '../../components/student-notes/DrawingEditModal';
import PresentationViewer from '../../components/student-notes/PresentationViewer';
import ShareNoteModal from '../../components/student-notes/ShareNoteModal';
import MindMapEditor from '../../components/student-notes/MindMapEditor';
import MindMapViewer from '../../components/student-notes/MindMapViewer';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const MisApuntesPageNew: React.FC = () => {
  // MisApuntesPageNew component initialized
  
  // Estados locales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StudentNote | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
  const pageSize = 12;
  
  // Estado para el modal de notas de voz
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [viewingVoiceNote, setViewingVoiceNote] = useState<StudentNote | null>(null);

  // Estado para el modal de dibujos
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [viewingDrawingNote, setViewingDrawingNote] = useState<StudentNote | null>(null);

  // Estado para el modal de edición de dibujos
  const [isDrawingEditModalOpen, setIsDrawingEditModalOpen] = useState(false);
  const [editingDrawingNote, setEditingDrawingNote] = useState<StudentNote | null>(null);

  // Estado para el modal de presentaciones
  const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);
  const [viewingPresentationNote, setViewingPresentationNote] = useState<StudentNote | null>(null);
  
  // Estado para el modal de compartir
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingNote, setSharingNote] = useState<StudentNote | null>(null);

  // Estado para el mind map
  const [isMindMapEditorOpen, setIsMindMapEditorOpen] = useState(false);
  const [editingMindMapNote, setEditingMindMapNote] = useState<StudentNote | null>(null);
  const [viewingMindMapNote, setViewingMindMapNote] = useState<StudentNote | null>(null);

  // Hooks personalizados
  const { filters, updateFilter, resetFilters, getQueryFilters } = useNotesFilters();
  const { viewMode, selectedNotes, setViewMode, selectNote, clearSelection } = useNotesView();

  // DEBUGGING useEffect para detectar cambios en viewingMindMapNote
  useEffect(() => {
    window.console.error('🚨🚨🚨 viewingMindMapNote CAMBIÓ - INDESTRUCTIBLE');
    window.console.log('💡 Nuevo valor:', viewingMindMapNote);
    window.console.log('💡 Es truthy:', !!viewingMindMapNote);
  }, [viewingMindMapNote]);
  
  // Query filters con paginación
  const queryFilters = {
    ...getQueryFilters(),
    page: currentPage,
    limit: pageSize,
    sortBy: 'createdAt' as const,
    sortOrder: 'DESC' as const,
  };

  const {
    notes,
    totalNotes,
    totalPages,
    statistics,
    isLoading,
    isLoadingStatistics,
    createNote,
    uploadFileNote,
    updateNote,
    deleteNote,
    toggleFavorite,
    refetch,
  } = useStudentNotes(queryFilters);

  // Obtener todas las asignaturas (fallback)
  const { subjects: allSubjects } = useSubjects();
  
  // Subjects data available

  // Obtener asignaturas del estudiante matriculado
  React.useEffect(() => {
    const fetchStudentSubjects = async () => {
      try {
        const response = await apiClient.get('/grades/my-grades');
        const data = response.data;
        
        // Extraer asignaturas del estudiante
        const studentSubjectsData = (data.subjectGrades || []).map((subjectGrade: any) => ({
          id: subjectGrade.subjectId,
          name: subjectGrade.subjectName,
          code: subjectGrade.subjectCode,
        }));
        
        setStudentSubjects(studentSubjectsData);
      } catch (error) {
        setStudentSubjects(allSubjects || []);
      }
    };

    fetchStudentSubjects();
  }, [allSubjects]);

  // Usar las asignaturas del estudiante o todas como fallback
  const subjects = studentSubjects.length > 0 ? studentSubjects : allSubjects;
  
  // Using available subjects

  // Handlers
  const handleSearch = (value: string) => {
    updateFilter('search', value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (value: string) => {
    updateFilter('type', value);
    setCurrentPage(1);
  };

  const handleSubjectFilter = (value: string) => {
    updateFilter('subject', value);
    setCurrentPage(1);
  };

  const handleFavoritesToggle = (checked: boolean) => {
    updateFilter('favorites', checked);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleCreateNote = () => {
    setIsCreateModalOpen(true);
  };

  const handleNoteCreated = () => {
    setIsCreateModalOpen(false);
    refetch();
    setCurrentPage(1);
  };

  const handleEditNote = (note: StudentNote) => {
    if (note.type === NoteType.TEXT) {
      // Abrir en editor ReactQuill para notas de texto
      setEditingNote(note);
      setIsEditorOpen(true);
    } else if (note.type === NoteType.VOICE) {
      // Para notas de voz, permitir editar solo metadatos (título, tags, etc.)
      setEditingNote(note);
      setIsEditorOpen(true);
    } else if (note.type === NoteType.MINDMAP) {
      // Abrir editor de mind map
      setEditingMindMapNote(note);
      setIsMindMapEditorOpen(true);
    } else {
      // TODO: Implementar modal de edición para otros tipos (drawing, mixed)
      message.info('Función de edición en desarrollo para este tipo de nota');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    // Validate noteId
    if (!noteId || typeof noteId !== 'string') {
      message.error('Error: ID de nota inválido.');
      return;
    }
    
    try {
      await deleteNote(noteId);
      message.success('Apunte eliminado correctamente');
      refetch();
    } catch (error) {
      console.error('Error deleting note:', error);
      message.error('Error al eliminar el apunte');
    }
  };

  const handleToggleFavorite = (noteId: string) => {
    toggleFavorite(noteId);
  };

  const handleViewNote = (note: StudentNote) => {
    console.log('🔍 handleViewNote llamado para nota:', note.id, 'tipo:', note.type);
    window.console.error('🚨🚨🚨 handleViewNote DEBUGGING - INDESTRUCTIBLE');
    window.console.log('💡 note.type:', note.type);
    window.console.log('💡 NoteType.MINDMAP:', NoteType.MINDMAP);
    window.console.log('💡 Comparación:', note.type === NoteType.MINDMAP);
    
    if (note.type === NoteType.TEXT) {
      // Abrir en modo solo lectura en editor
      setEditingNote(note);
      setIsEditorOpen(true);
    } else if (note.type === NoteType.VOICE) {
      // Abrir modal de nota de voz
      setViewingVoiceNote(note);
      setIsVoiceModalOpen(true);
    } else if (note.type === NoteType.DRAWING) {
      // Abrir modal de dibujo
      setViewingDrawingNote(note);
      setIsDrawingModalOpen(true);
    } else if (note.type === NoteType.PRESENTATION) {
      // Abrir modal de presentación
      setViewingPresentationNote(note);
      setIsPresentationModalOpen(true);
    } else if (note.type === NoteType.MINDMAP) {
      // Abrir visualizador de mind map - asegurar que los datos estén disponibles
      console.log('🧠 Abriendo visualizador Mind Map para nota:', note);
      console.log('🧠 Metadata de la nota:', note.metadata);
      console.log('🧠 Content de la nota:', note.content);
      
      // Si no hay mindMapData en metadata, intentar reconstruir desde content
      if (!note.metadata?.mindMapData && note.content) {
        try {
          const parsedContent = JSON.parse(note.content);
          console.log('🧠 Content parseado:', parsedContent);
          
          // Reconstruir la estructura mindMapData
          const reconstructedNote = {
            ...note,
            metadata: {
              ...note.metadata,
              mindMapData: {
                nodeData: parsedContent,
                theme: note.metadata?.theme || 'default',
                layout: note.metadata?.layout || 'default'
              }
            }
          };
          
          console.log('🧠 Nota reconstruida completa:', reconstructedNote);
          console.log('🧠 mindMapData que se pasará al viewer:', reconstructedNote.metadata.mindMapData);
          console.log('🧠 nodeData específico:', reconstructedNote.metadata.mindMapData.nodeData);
          setViewingMindMapNote(reconstructedNote);
          window.console.error('🚨🚨🚨 setViewingMindMapNote(reconstructedNote) EJECUTADO - INDESTRUCTIBLE');
          window.console.log('💡 reconstructedNote:', reconstructedNote);
        } catch (error) {
          console.error('❌ Error reconstruyendo datos de Mind Map:', error);
          message.error('Error al cargar el Mind Map');
          return;
        }
      } else {
        console.log('🧠 Usando datos existentes de metadata:', note.metadata?.mindMapData);
        setViewingMindMapNote(note);
        window.console.error('🚨🚨🚨 setViewingMindMapNote(note) EJECUTADO - INDESTRUCTIBLE');
        window.console.log('💡 note:', note);
      }
    } else {
      // TODO: Implementar visualizador para otros tipos (mixed)
      message.info('Visualizador en desarrollo para este tipo de nota');
    }
  };

  // Funciones del editor
  const handleCreateDocument = () => {
    setEditingNote(undefined);
    setIsEditorOpen(true);
  };

  const handleCreatePresentation = () => {
    updateFilter('type', 'presentation');
    handleCreateNote();
  };

  const handleEditorSave = (note: StudentNote) => {
    setIsEditorOpen(false);
    setEditingNote(undefined);
    refetch();
    message.success('Documento guardado exitosamente');
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setEditingNote(undefined);
  };

  // Funciones del modal de notas de voz
  const handleVoiceModalClose = () => {
    setIsVoiceModalOpen(false);
    setViewingVoiceNote(null);
  };

  // Funciones del modal de compartir
  const handleShareNote = (note: StudentNote) => {
    setSharingNote(note);
    setIsShareModalOpen(true);
  };

  const handleShareModalClose = () => {
    setIsShareModalOpen(false);
    setSharingNote(null);
  };

  const handleShareSuccess = () => {
    refetch(); // Actualizar la lista para mostrar el estado compartido
    message.success('Apunte compartido exitosamente');
  };

  // Funciones del mind map
  const handleMindMapSave = async (title: string, mindMapData: any) => {
    // LOGGING INDESTRUCTIBLE - APARECERAN AUNQUE HAYA ERRORES
    window.console.error('🚨🚨🚨 handleMindMapSave INICIADO - INDESTRUCTIBLE');
    window.console.log('💾💾💾 PARÁMETROS RECIBIDOS:', {
      titleType: typeof title,
      titleValue: title,
      titleLength: title?.length,
      mindMapDataType: typeof mindMapData,
      mindMapDataKeys: mindMapData ? Object.keys(mindMapData) : 'null',
      nodeData: mindMapData?.nodeData,
      nodeDataType: typeof mindMapData?.nodeData
    });
    
    console.log('🔍 DEBUGGING SAVE - Step 1: Input parameters');
    console.log('  - title:', JSON.stringify(title));
    console.log('  - mindMapData:', JSON.stringify(mindMapData, null, 2));
    
    // Validar datos de entrada básicos
    if (!title || !title.trim()) {
      message.error('El título es obligatorio');
      return;
    }
    
    if (!mindMapData || !mindMapData.nodeData) {
      message.error('Los datos del mind map son obligatorios');
      return;
    }

    // Definir noteData FUERA del try para que esté disponible en el catch
    window.console.error('🚨🚨🚨 VALIDACIÓN CRÍTICA INICIANDO - INDESTRUCTIBLE');
    console.log('🔍 VALIDACIÓN CRÍTICA antes de guardar:', {
      title: title.trim(),
      titleLength: title.trim().length,
      mindMapData: mindMapData,
      nodeData: mindMapData.nodeData,
      nodeDataString: JSON.stringify(mindMapData.nodeData),
      nodeDataStringLength: JSON.stringify(mindMapData.nodeData).length
    });
    
    // Validar contenido - PERMITIR contenido mínimo para Mind Maps
    const contentString = JSON.stringify(mindMapData.nodeData);
    if (!contentString || contentString === 'null' || contentString === 'undefined') {
      console.error('🚨 CONTENIDO COMPLETAMENTE INVÁLIDO:', {
        original: mindMapData.nodeData,
        stringified: contentString,
        length: contentString?.length
      });
      throw new Error(`Contenido del Mind Map completamente inválido: "${contentString}"`);
    }
    
    // Para Mind Maps, incluso contenido mínimo es válido
    console.log('✅ CONTENIDO VÁLIDO PARA MIND MAP:', {
      contentString,
      length: contentString.length
    });
    
    const noteData = {
      title: title.trim(),
      content: contentString,
      type: NoteType.MINDMAP,
      metadata: {
        mindMapData: mindMapData,
        theme: mindMapData.theme || 'default',
        layout: mindMapData.layout || 'default'
      },
      // Campos adicionales que podrían ser requeridos
      tags: [] as string[],
      isPrivate: true
    };
    
    console.log('🔍 EXACT DATA BEING SENT TO BACKEND:', JSON.stringify(noteData, null, 2));
    console.log('🔍 Content length:', noteData.content.length);
    console.log('🔍 Title length:', noteData.title.length);
    console.log('🔍 Type:', noteData.type);
    console.log('🔍 Metadata size:', JSON.stringify(noteData.metadata).length);
    
    try {

      if (editingMindMapNote) {
        // Actualizar mind map existente
        await updateNote(editingMindMapNote.id, noteData);
        message.success('Mind Map actualizado correctamente');
      } else {
        // Crear nuevo mind map
        await createNote(noteData);
        message.success('Mind Map creado correctamente');
      }

      setIsMindMapEditorOpen(false);
      setEditingMindMapNote(null);
      refetch();
    } catch (error: any) {
      console.log('🚨 SAVE ERROR OCCURRED');
      console.log('🚨 Request data sent:', JSON.stringify(noteData, null, 2));
      console.log('🚨 Full error object:', error);
      console.log('🚨 Error response:', error.response);
      console.log('🚨 Error response data:', error.response?.data);
      console.log('🚨 Error response status:', error.response?.status);
      console.log('🚨 Error response statusText:', error.response?.statusText);
      console.log('🚨 Error message from backend:', error.response?.data?.message);
      console.log('🚨 Error validation details:', error.response?.data?.error);
      console.log('🚨 Error stack trace:', error.stack);
      
      // También mostrar un console.table para datos estructurados
      console.table({
        'Title Length': noteData.title.length,
        'Content Length': noteData.content.length, 
        'Type': noteData.type,
        'Tags Length': noteData.tags?.length || 0,
        'Is Private': noteData.isPrivate,
        'Metadata Keys': Object.keys(noteData.metadata || {}).join(', ')
      });
      
      // Extraer mensaje de error específico
      let errorMessage = 'Error al guardar el mind map';
      if (error?.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = `Validation errors: ${error.response.data.message.join(', ')}`;
        } else {
          errorMessage = `Error: ${error.response.data.message}`;
        }
      } else if (error?.response?.data?.error) {
        errorMessage = `Error: ${error.response.data.error}`;
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      message.error(errorMessage);
    }
  };

  const handleMindMapClose = () => {
    setIsMindMapEditorOpen(false);
    setEditingMindMapNote(null);
  };

  const handleMindMapViewerClose = () => {
    setViewingMindMapNote(null);
  };

  const handleMindMapEdit = () => {
    
    if (viewingMindMapNote) {
      setEditingMindMapNote(viewingMindMapNote);
      setViewingMindMapNote(null);
      setIsMindMapEditorOpen(true);
    }
  };

  const handleVoiceNoteEdit = (note: StudentNote) => {
    // Cerrar modal de voz y abrir editor
    setIsVoiceModalOpen(false);
    setViewingVoiceNote(null);
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleDrawingModalClose = () => {
    setIsDrawingModalOpen(false);
    setViewingDrawingNote(null);
  };

  const handleDrawingNoteEdit = (note: StudentNote) => {
    // Cerrar modal de dibujo y abrir editor específico de dibujos
    setIsDrawingModalOpen(false);
    setViewingDrawingNote(null);
    setEditingDrawingNote(note);
    setIsDrawingEditModalOpen(true);
  };

  const handleDrawingEditModalClose = () => {
    setIsDrawingEditModalOpen(false);
    setEditingDrawingNote(null);
  };

  const handleDrawingEditSave = async (updatedNote: StudentNote) => {
    try {
      await updateNote(updatedNote);
      message.success('Dibujo actualizado exitosamente');
      setIsDrawingEditModalOpen(false);
      setEditingDrawingNote(null);
      refetch(); // Recargar la lista de notas
    } catch (error) {
      console.error('Error al actualizar dibujo:', error);
      message.error('Error al actualizar el dibujo');
    }
  };

  // Menú para crear diferentes tipos de notas
  const createMenuItems: MenuProps['items'] = [
    {
      key: 'document',
      icon: <FileTextOutlined />,
      label: 'Crear Documento',
      onClick: handleCreateDocument,
    },
    {
      key: 'text',
      icon: <FileTextOutlined />,
      label: 'Nota de Texto Simple',
      onClick: () => {
        updateFilter('type', 'text');
        handleCreateNote();
      },
    },
    {
      key: 'voice',
      icon: <AudioOutlined />,
      label: 'Nota de Audio',
      onClick: () => {
        updateFilter('type', 'voice');
        handleCreateNote();
      },
    },
    {
      key: 'drawing',
      icon: <PictureOutlined />,
      label: 'Dibujo/Esquema',
      onClick: () => {
        updateFilter('type', 'drawing');
        handleCreateNote();
      },
    },
    {
      key: 'presentation',
      icon: <FileImageOutlined />,
      label: 'Presentación',
      onClick: handleCreatePresentation,
    },
    {
      key: 'mindmap',
      icon: <BranchesOutlined />,
      label: 'Mind Map',
      onClick: () => {
        setEditingMindMapNote(null);
        setIsMindMapEditorOpen(true);
      },
    },
  ];

  return (
    <Layout>
      <Content className="p-6 bg-gray-50 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <Title level={2} className="mb-2">
                  📝 Mis Apuntes
                </Title>
                <Text type="secondary" className="text-base">
                  Organiza y gestiona tus apuntes personales de estudio
                </Text>
              </div>

              <Space>
                <Dropdown menu={{ items: createMenuItems }} placement="bottomRight">
                  <Button type="primary" icon={<PlusOutlined />} size="large">
                    Crear Apunte
                  </Button>
                </Dropdown>
              </Space>
            </div>

            {/* Estadísticas rápidas */}
            <NotesStatistics statistics={statistics} loading={isLoadingStatistics} />
          </div>

          {/* Filtros y controles */}
          <Card className="mb-6">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={8}>
                <Search
                  placeholder="Buscar en mis apuntes..."
                  allowClear
                  size="large"
                  onSearch={handleSearch}
                  style={{ width: '100%' }}
                />
              </Col>
              
              <Col xs={12} md={4}>
                <Select
                  placeholder="Tipo de apunte"
                  allowClear
                  size="large"
                  value={filters.type === 'all' ? undefined : filters.type}
                  onChange={handleTypeFilter}
                  style={{ width: '100%' }}
                >
                  <Option value="all">Todos los tipos</Option>
                  <Option value={NoteType.TEXT}>
                    <FileTextOutlined /> TEXTO
                  </Option>
                  <Option value={NoteType.VOICE}>
                    <AudioOutlined /> AUDIO
                  </Option>
                  <Option value={NoteType.DRAWING}>
                    <PictureOutlined /> DIBUJO
                  </Option>
                  <Option value={NoteType.MIXED}>
                    <SettingOutlined /> Mixto
                  </Option>
                </Select>
              </Col>

              <Col xs={12} md={4}>
                <Select
                  placeholder="Asignatura (Opcional)"
                  allowClear
                  size="large"
                  value={filters.subject === 'all' ? undefined : filters.subject}
                  onChange={handleSubjectFilter}
                  style={{ width: '100%' }}
                >
                  <Option value="all">Mis asignaturas</Option>
                  {subjects?.map((subject) => (
                    <Option key={subject.id} value={subject.id}>
                      {subject.name}
                    </Option>
                  ))}
                </Select>
              </Col>

              <Col xs={12} md={4}>
                <Space>
                  <Switch
                    checked={filters.favorites}
                    onChange={handleFavoritesToggle}
                    checkedChildren={<HeartOutlined />}
                    unCheckedChildren="Favoritos"
                  />
                </Space>
              </Col>

              <Col xs={12} md={4}>
                <Space className="float-right">
                  <Button.Group>
                    <Button
                      icon={<AppstoreOutlined />}
                      type={viewMode === 'grid' ? 'primary' : 'default'}
                      onClick={() => setViewMode('grid')}
                    />
                    <Button
                      icon={<BarsOutlined />}
                      type={viewMode === 'list' ? 'primary' : 'default'}
                      onClick={() => setViewMode('list')}
                    />
                  </Button.Group>
                </Space>
              </Col>
            </Row>

            {/* Indicadores de filtros activos */}
            {(filters.search || filters.type !== 'all' || filters.subject !== 'all' || filters.favorites) && (
              <div className="mt-4 pt-4 border-t">
                <Space wrap>
                  <Text type="secondary">Filtros activos:</Text>
                  {filters.search && (
                    <Button size="small" type="primary" ghost>
                      Búsqueda: "{filters.search}"
                    </Button>
                  )}
                  {filters.type !== 'all' && (
                    <Button size="small" type="primary" ghost>
                      Tipo: {filters.type}
                    </Button>
                  )}
                  {filters.subject !== 'all' && (
                    <Button size="small" type="primary" ghost>
                      Asignatura: {subjects?.find(s => s.id === filters.subject)?.name}
                    </Button>
                  )}
                  {filters.favorites && (
                    <Button size="small" type="primary" ghost icon={<HeartOutlined />}>
                      Solo favoritos
                    </Button>
                  )}
                  <Button size="small" onClick={resetFilters}>
                    Limpiar filtros
                  </Button>
                </Space>
              </div>
            )}
          </Card>

          {/* Contenido principal */}
          <Spin spinning={isLoading}>
            {notes.length === 0 ? (
              <Card>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div>
                      <p>No tienes apuntes todavía</p>
                      <p className="text-gray-500">
                        ¡Comienza creando tu primer apunte personal!
                      </p>
                    </div>
                  }
                >
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNote}>
                    Crear mi primer apunte
                  </Button>
                </Empty>
              </Card>
            ) : (
              <>
                {/* Grid/List de apuntes */}
                <div className={
                  viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6'
                    : 'space-y-4 mb-6'
                }>
                  {notes.map((note, index) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ApunteCard
                        note={note}
                        viewMode={viewMode}
                        onEdit={handleEditNote}
                        onDelete={handleDeleteNote}
                        onToggleFavorite={handleToggleFavorite}
                        onView={handleViewNote}
                        onShare={handleShareNote}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex justify-center">
                    <Pagination
                      current={currentPage}
                      total={totalNotes}
                      pageSize={pageSize}
                      showSizeChanger={false}
                      showQuickJumper
                      showTotal={(total, range) =>
                        `${range[0]}-${range[1]} de ${total} apuntes`
                      }
                      onChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </Spin>
        </motion.div>

        {/* Modal para crear/editar apunte */}
        <CreateNoteModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleNoteCreated}
          initialData={{ type: filters.type !== 'all' ? filters.type as NoteType : NoteType.TEXT }}
        />

        {/* Editor Integrado ReactQuill */}
        <EditorIntegrado
          isOpen={isEditorOpen}
          onClose={handleEditorClose}
          onSave={handleEditorSave}
          editingNote={editingNote}
          tipo={editingNote?.type || NoteType.TEXT}
        />

        {/* Modal para visualizar notas de voz */}
        <VoiceNoteModal
          note={viewingVoiceNote}
          isOpen={isVoiceModalOpen}
          onClose={handleVoiceModalClose}
          onEdit={handleVoiceNoteEdit}
          onToggleFavorite={handleToggleFavorite}
          onUpdateNote={async (updatedNote) => {
            await updateNote(updatedNote.id, { isPrivate: updatedNote.isPrivate });
            setViewingVoiceNote(updatedNote);
          }}
        />

        {/* Modal para visualizar dibujos */}
        <DrawingNoteModal
          note={viewingDrawingNote}
          isOpen={isDrawingModalOpen}
          onClose={handleDrawingModalClose}
          onEdit={handleDrawingNoteEdit}
          onToggleFavorite={handleToggleFavorite}
          onUpdateNote={async (updatedNote) => {
            await updateNote(updatedNote.id, { isPrivate: updatedNote.isPrivate });
            setViewingDrawingNote(updatedNote);
          }}
        />

        {/* Modal para editar dibujos */}
        <DrawingEditModal
          note={editingDrawingNote}
          isOpen={isDrawingEditModalOpen}
          onClose={handleDrawingEditModalClose}
          onSave={handleDrawingEditSave}
        />

        {/* Modal para visualizar presentaciones */}
        <Modal
          title={
            <div className="flex justify-between items-center" style={{ paddingRight: '40px' }}>
              <span>{viewingPresentationNote?.title || 'Presentación'}</span>
              {viewingPresentationNote && (
                <Space>
                  <Text type="secondary" style={{ fontSize: '12px', marginRight: 8 }}>
                    {viewingPresentationNote.isPrivate ? 'Privado' : 'Público'}
                  </Text>
                  <Switch
                    checked={!viewingPresentationNote.isPrivate}
                    onChange={async (checked) => {
                      try {
                        const updatedNote = {
                          ...viewingPresentationNote,
                          isPrivate: !checked
                        };
                        await updateNote(viewingPresentationNote.id, { isPrivate: !checked });
                        setViewingPresentationNote(updatedNote);
                        message.success(`Nota cambiada a ${checked ? 'pública' : 'privada'}`);
                      } catch (error) {
                        console.error('Error updating privacy:', error);
                        message.error('Error al cambiar privacidad');
                      }
                    }}
                    checkedChildren="Público"
                    unCheckedChildren="Privado"
                    size="small"
                  />
                </Space>
              )}
            </div>
          }
          open={isPresentationModalOpen}
          onCancel={() => {
            setIsPresentationModalOpen(false);
            setViewingPresentationNote(null);
          }}
          footer={null}
          width="90%"
          style={{ top: 20 }}
          bodyStyle={{ padding: '16px', height: 'calc(100vh - 100px)', overflow: 'hidden' }}
        >
          {viewingPresentationNote && (
            <PresentationViewer
              content={viewingPresentationNote.content}
              title={viewingPresentationNote.title}
              onEdit={() => {
                // Cerrar modal de visualización y abrir editor
                setIsPresentationModalOpen(false);
                setEditingNote(viewingPresentationNote);
                setIsEditorOpen(true);
                setViewingPresentationNote(null);
              }}
              onSave={async (content: string, title?: string) => {
                try {
                  const updatedNote = {
                    ...viewingPresentationNote,
                    content,
                    title: title || viewingPresentationNote.title,
                  };
                  await updateNote(updatedNote);
                  setViewingPresentationNote(updatedNote);
                  message.success('Presentación actualizada exitosamente');
                } catch (error) {
                  console.error('Error updating presentation:', error);
                  message.error('Error al actualizar la presentación');
                }
              }}
              readOnly={false}
            />
          )}
        </Modal>

        {/* Modal de compartir apuntes */}
        <ShareNoteModal
          isOpen={isShareModalOpen}
          note={sharingNote}
          onClose={handleShareModalClose}
          onSuccess={handleShareSuccess}
        />

        {/* Modal para editor de mind map */}
        <MindMapEditor
          isOpen={isMindMapEditorOpen}
          onClose={handleMindMapClose}
          onSave={handleMindMapSave}
          initialData={editingMindMapNote ? {
            title: editingMindMapNote.title,
            mindMapData: editingMindMapNote.metadata?.mindMapData || {
              nodeData: JSON.parse(editingMindMapNote.content || '{}'),
              theme: editingMindMapNote.metadata?.theme || 'default',
              layout: editingMindMapNote.metadata?.layout || 'default'
            }
          } : undefined}
          title={editingMindMapNote ? "Editar Mind Map" : "Crear Mind Map"}
        />

        {/* Modal de visualización de mind map */}
        {viewingMindMapNote && (
          <Modal
            title={`🧠 ${viewingMindMapNote.title}`}
            open={!!viewingMindMapNote}
            onCancel={handleMindMapViewerClose}
            width="90vw"
            style={{ maxWidth: '1200px' }}
            centered
            onClick={(e) => {
              window.console.error('🚨🚨🚨 MODAL CLICKED - INDESTRUCTIBLE');
              window.console.log('💥 Modal Event target:', e.target);
            }}
            footer={(() => {
              window.console.error('🚨🚨🚨 FOOTER RENDERIZÁNDOSE - INDESTRUCTIBLE');
              return [
                <Button 
                  key="edit" 
                  type="primary" 
                  onClick={handleMindMapEdit}
                  icon={<EditOutlined />}
                >
                  Editar Mind Map
                </Button>,
              <Button key="close" onClick={handleMindMapViewerClose}>
                Cerrar
              </Button>
            ];
          })()}
            bodyStyle={{ padding: '20px' }}
          >
            {viewingMindMapNote.metadata?.mindMapData ? (
              <MindMapViewer
                mindMapData={viewingMindMapNote.metadata.mindMapData}
                title={viewingMindMapNote.title}
                onEdit={handleMindMapEdit}
                showControls={false}
                readonly={true}
                height={600}
              />
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="mb-4">
                  <BranchesOutlined className="text-4xl text-gray-400 mb-2" />
                </div>
                <p className="text-lg mb-2">Este mind map no tiene datos válidos para mostrar</p>
                <p className="text-sm text-gray-400">
                  Los datos pueden haberse corrompido o no se guardaron correctamente
                </p>
                <div className="mt-4">
                  <Button type="primary" onClick={handleMindMapEdit} icon={<EditOutlined />}>
                    Editar para crear nuevo contenido
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        )}
      </Content>
    </Layout>
  );
};

export default MisApuntesPageNew;